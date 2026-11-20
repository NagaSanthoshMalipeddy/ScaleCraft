import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Flow, FlowKind, Scene as SceneT, SceneLink, SceneNode } from '../types';
import { blendBounds, useCamera } from './camera';
import { sceneBounds, TAG_OFFSET, TOP_OFFSET, type Bounds } from './layout';
import { usePresence } from './presence';
import { DownBadge, Meter, NodeShape, Pill } from './shapes';
import { nodeRadius, nodeScale, pointAt, polyD, polyLength, routeLink, toScreen, trim, type Pt } from './geom';

interface BuiltLink {
  key: string;
  link: SceneLink;
  pts: Pt[];
  d: string;
  mid: Pt;
}

interface BuiltFlow {
  flow: Flow;
  pts: Pt[];
  len: number;
}

function findRoute(a: string, b: string, map: Map<string, SceneNode>, links: SceneLink[]): Pt[] {
  const A = map.get(a);
  const B = map.get(b);
  if (!A || !B) return [];
  const fwd = links.find((l) => l.from === a && l.to === b);
  if (fwd) return routeLink(A.at, B.at, fwd).map(toScreen);
  const rev = links.find((l) => l.from === b && l.to === a);
  if (rev) return routeLink(B.at, A.at, rev).map(toScreen).reverse();
  return [toScreen(A.at), toScreen(B.at)];
}

const SPEED = 230;

function flowTiming(f: BuiltFlow) {
  const v = SPEED * (f.flow.speed ?? 1);
  const travel = f.len / v;
  const total = f.flow.ret ? travel * 2 : travel;
  const rest = f.flow.stop ? 1.1 : 0.45;
  return { v, travel, cycle: total + rest };
}

function Packets({ flows, paused, resetKey }: { flows: BuiltFlow[]; paused: boolean; resetKey: string }) {
  const refs = useRef<(SVGCircleElement | null)[][]>([]);
  const elapsed = useRef(0);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    // Hold traffic briefly so packets start once the new layout has settled.
    elapsed.current = -0.9;
  }, [resetKey]);

  useEffect(() => {
    let raf = 0;
    let last = -1;
    const tick = (now: number) => {
      const dt = last < 0 ? 0 : Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      if (!pausedRef.current) elapsed.current += dt;
      const t = elapsed.current;
      flows.forEach((f, fi) => {
        const { v, travel, cycle } = flowTiming(f);
        const n = f.flow.n ?? 1;
        const delay = f.flow.delay ?? 0.25;
        for (let k = 0; k < n; k++) {
          const el = refs.current[fi]?.[k];
          if (!el) continue;
          const local = t - delay - (k * cycle) / n;
          if (local < 0) {
            el.style.opacity = '0';
            continue;
          }
          const tau = local % cycle;
          let d: number;
          let kind: FlowKind = f.flow.kind ?? 'request';
          let opacity = 1;
          let blocked = false;
          if (tau <= travel) {
            d = tau * v;
          } else if (f.flow.ret && tau <= travel * 2) {
            d = f.len - (tau - travel) * v;
            kind = f.flow.retKind ?? 'response';
          } else if (f.flow.stop) {
            d = f.len;
            blocked = true;
            opacity = 0.35 + 0.65 * Math.abs(Math.cos((tau - travel) * 9));
          } else {
            d = f.flow.ret ? 0 : f.len;
            opacity = 0;
          }
          const p = pointAt(f.pts, d);
          if (local < 0.35) opacity *= local / 0.35;
          el.setAttribute('cx', p.x.toFixed(1));
          el.setAttribute('cy', p.y.toFixed(1));
          el.setAttribute('class', `pk pk-${kind}${blocked ? ' pk-blocked' : ''}`);
          el.style.opacity = String(opacity);
        }
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [flows]);

  return (
    <g className="packets">
      {flows.map((f, fi) =>
        Array.from({ length: f.flow.n ?? 1 }).map((_, k) => (
          <circle
            key={`${fi}-${k}`}
            r={7}
            style={{ opacity: 0 }}
            ref={(el) => {
              refs.current[fi] ??= [];
              refs.current[fi][k] = el;
            }}
          />
        )),
      )}
    </g>
  );
}

type Vars = CSSProperties & Record<`--${string}`, string>;

const at = (p: Pt): Vars => ({ transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)` });
/** Fraction of the way the camera leans from the whole-lesson framing towards the current step's content. */
const CAMERA_FOCUS = 0.3;

/**
 * Enter delay for an element: a base offset for its layer (nodes → links → labels) plus a left-to-right sweep,
 * so new parts of the system appear in the direction traffic flows. Depends only on position, so it never
 * changes for an element that persists between steps.
 */
const sweep = (x: number, b: Bounds, base: number, spread = 360): Vars => ({
  '--d': `${Math.round(base + Math.max(0, Math.min(1, (x - b.x) / b.w)) * spread)}ms`,
});

interface LinkLabel {
  key: string;
  text: string;
  mid: Pt;
  bad: boolean;
}

type Overlay =
  | { key: string; kind: 'tag'; p: Pt; y: number; text: string; icon?: SceneNode['tagIcon']; dim: boolean }
  | { key: string; kind: 'meter'; p: Pt; y: number; value: number }
  | { key: string; kind: 'down'; p: Pt; x: number; y: number };

const nodeKey = (n: SceneNode) => `${n.id}|${n.kind}|${n.size ?? 'md'}`;

export function SceneView({
  scene,
  bounds,
  paused,
  resetKey,
  label,
}: {
  scene: SceneT;
  bounds: Bounds;
  paused: boolean;
  resetKey: string;
  label: string;
}) {
  const nodeMap = useMemo(() => new Map(scene.nodes.map((n) => [n.id, n])), [scene]);

  const links = useMemo<BuiltLink[]>(() => {
    return (scene.links ?? []).flatMap((l) => {
      const A = nodeMap.get(l.from);
      const B = nodeMap.get(l.to);
      if (!A || !B) return [];
      const raw = routeLink(A.at, B.at, l).map(toScreen);
      const pts = trim(raw, nodeRadius(A) + 4, nodeRadius(B) + 8);
      const len = polyLength(pts);
      return [{ key: `${l.from}>${l.to}`, link: l, pts, d: polyD(pts), mid: pointAt(pts, len / 2) }];
    });
  }, [scene, nodeMap]);

  const flows = useMemo<BuiltFlow[]>(() => {
    const ls = scene.links ?? [];
    return (scene.flows ?? []).flatMap((flow) => {
      const pts: Pt[] = [];
      for (let i = 0; i < flow.path.length - 1; i++) {
        const seg = findRoute(flow.path[i], flow.path[i + 1], nodeMap, ls);
        pts.push(...(i === 0 ? seg : seg.slice(1)));
      }
      if (pts.length < 2) return [];
      let final = pts;
      if (flow.stop) {
        const last = nodeMap.get(flow.path[flow.path.length - 1]);
        if (last) final = trim(pts, 0, nodeRadius(last) + 16);
      }
      return [{ flow, pts: final, len: polyLength(final) }];
    });
  }, [scene, nodeMap]);

  const sorted = useMemo(
    () => [...scene.nodes].sort((a, b) => toScreen(a.at).y - toScreen(b.at).y || toScreen(a.at).x - toScreen(b.at).x),
    [scene],
  );

  const linkLabels = useMemo<LinkLabel[]>(
    () =>
      links
        .filter((l) => l.link.label)
        .map((l) => ({ key: `${l.key}:${l.link.label}`, text: l.link.label!, mid: l.mid, bad: l.link.tone === 'bad' })),
    [links],
  );

  const overlays = useMemo<Overlay[]>(() => {
    const out: Overlay[] = [];
    for (const n of scene.nodes) {
      const p = toScreen(n.at);
      const s = nodeScale(n);
      const tag = n.tag ?? (n.kind !== 'cube' ? n.label : undefined);
      if (tag) out.push({ key: `tag:${n.id}:${tag}`, kind: 'tag', p, y: TAG_OFFSET[n.kind] * s, text: tag, icon: n.tagIcon, dim: n.status === 'dim' });
      if (n.meter !== undefined) out.push({ key: `meter:${n.id}`, kind: 'meter', p, y: -TOP_OFFSET[n.kind] * s - 8, value: n.meter });
      if (n.status === 'down') out.push({ key: `down:${n.id}`, kind: 'down', p, x: 52 * s, y: -44 * s });
    }
    return out;
  }, [scene]);

  const notes = useMemo(() => scene.notes ?? [], [scene]);

  const nodeP = usePresence(sorted, nodeKey);
  const linkP = usePresence(links, (l) => l.key);
  const labelP = usePresence(linkLabels, (l) => l.key);
  const overlayP = usePresence(overlays, (o) => o.key);
  const noteP = usePresence(notes, (n) => `note:${n.text}:${n.at.join(',')}`);

  const camera = useMemo(() => blendBounds(bounds, sceneBounds([scene]), CAMERA_FOCUS), [bounds, scene]);
  const svgRef = useRef<SVGSVGElement>(null);
  useCamera(svgRef, camera);
  // The camera hook owns the viewBox after mount; React only sets the initial value.
  const [initialViewBox] = useState(() => `${camera.x} ${camera.y} ${camera.w} ${camera.h}`);

  return (
    <svg
      ref={svgRef}
      className="scene"
      viewBox={initialViewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      <defs>
        {(['ink', 'muted', 'bad', 'good'] as const).map((t) => (
          <marker
            key={t}
            id={`arrow-${t}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
            className={`arrow arrow-${t}`}
          >
            <path d="M0,0 L10,5 L0,10 L2.5,5 Z" />
          </marker>
        ))}
      </defs>

      <g className="links">
        {linkP.map(({ key, item: { link, d, mid }, exiting }) => {
          const tone = link.tone ?? (link.dashed ? 'muted' : 'ink');
          const arrow = link.arrow ?? 'end';
          return (
            <path
              key={key}
              d={d}
              pathLength={link.dashed ? undefined : 1}
              style={sweep(mid.x, bounds, 280)}
              className={`link link-${tone}${link.dashed ? ' dashed' : ' draw'}${exiting ? ' out' : ''}`}
              markerEnd={arrow !== 'none' ? `url(#arrow-${tone})` : undefined}
              markerStart={arrow === 'both' ? `url(#arrow-${tone})` : undefined}
            />
          );
        })}
      </g>

      <Packets flows={flows} paused={paused} resetKey={resetKey} />

      <g className="nodes">
        {nodeP.map(({ key, item: n, exiting }) => {
          const tone = n.status === 'down' ? 'gray' : n.tone ?? defaultTone(n);
          const s = nodeScale(n);
          const p = toScreen(n.at);
          return (
            <g key={key} className="slide" style={at(p)}>
              <g className={`node tone-${tone} status-${n.status ?? 'ok'} ${exiting ? 'out' : 'pop'}`} style={sweep(p.x, bounds, 60)}>
                <ellipse className="ground" cx={0} cy={TAG_OFFSET[n.kind] * 0.55 * s} rx={70 * s} ry={18 * s} />
                {n.status === 'hot' && <ellipse className="hot-ring" cx={0} cy={TAG_OFFSET[n.kind] * 0.45 * s} rx={78 * s} ry={34 * s} />}
                <NodeShape n={n} />
              </g>
            </g>
          );
        })}
      </g>

      <g className="labels">
        {labelP.map(({ key, item, exiting }) => (
          <g key={key} className="slide" style={at(item.mid)}>
            <g className={exiting ? 'out' : 'fade-in'} style={sweep(item.mid.x, bounds, 560)}>
              <Pill x={0} y={0} text={item.text} size={11.5} tone={item.bad ? 'bad' : 'ink'} />
            </g>
          </g>
        ))}
        {overlayP.map(({ key, item: o, exiting }) => (
          <g key={key} className="slide" style={at(o.p)}>
            <g
              className={`${exiting ? 'out' : o.kind === 'down' ? 'pop' : 'fade-in'}${o.kind === 'tag' && o.dim ? ' dim' : ''}`}
              style={sweep(o.p.x, bounds, 440)}
            >
              {o.kind === 'tag' && <Pill x={0} y={o.y} text={o.text} icon={o.icon} size={12.5} bold />}
              {o.kind === 'meter' && <Meter x={0} y={o.y} value={o.value} />}
              {o.kind === 'down' && <DownBadge x={o.x} y={o.y} />}
            </g>
          </g>
        ))}
        {noteP.map(({ key, item: note, exiting }) => (
          <g key={key} className={exiting ? 'out' : 'fade-in'} style={sweep(toScreen(note.at).x, bounds, 660, 300)}>
            <Pill x={toScreen(note.at).x} y={toScreen(note.at).y} text={note.text} icon={note.icon} size={12} tone={note.tone ?? 'ink'} />
          </g>
        ))}
      </g>
    </svg>
  );
}

function defaultTone(n: SceneNode) {
  switch (n.kind) {
    case 'db':
      return 'violet';
    case 'queue':
      return 'sand';
    case 'crowd':
    case 'device':
    case 'phone':
      return 'sand';
    default:
      return 'blue';
  }
}
