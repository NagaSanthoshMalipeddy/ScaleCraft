import { useEffect, useMemo, useRef } from 'react';
import type { Flow, FlowKind, Scene as SceneT, SceneLink, SceneNode } from '../types';
import { TAG_OFFSET, TOP_OFFSET, type Bounds } from './layout';
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
    elapsed.current = 0;
  }, [resetKey]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
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

  return (
    <svg
      className="scene"
      viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
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
        {links.map(({ key, link, d }) => {
          const tone = link.tone ?? (link.dashed ? 'muted' : 'ink');
          const arrow = link.arrow ?? 'end';
          return (
            <path
              key={key}
              d={d}
              pathLength={link.dashed ? undefined : 1}
              className={`link link-${tone}${link.dashed ? ' dashed' : ' draw'}`}
              markerEnd={arrow !== 'none' ? `url(#arrow-${tone})` : undefined}
              markerStart={arrow === 'both' ? `url(#arrow-${tone})` : undefined}
            />
          );
        })}
      </g>

      <Packets flows={flows} paused={paused} resetKey={resetKey} />

      <g className="nodes">
        {sorted.map((n) => {
          const p = toScreen(n.at);
          const tone = n.status === 'down' ? 'gray' : n.tone ?? defaultTone(n);
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`}>
              <g className={`node pop tone-${tone} status-${n.status ?? 'ok'}`}>
                <ellipse className="ground" cx={0} cy={TAG_OFFSET[n.kind] * 0.55 * nodeScale(n)} rx={70 * nodeScale(n)} ry={18 * nodeScale(n)} />
                {n.status === 'hot' && (
                  <ellipse className="hot-ring" cx={0} cy={TAG_OFFSET[n.kind] * 0.45 * nodeScale(n)} rx={78 * nodeScale(n)} ry={34 * nodeScale(n)} />
                )}
                <NodeShape n={n} />
              </g>
            </g>
          );
        })}
      </g>

      <g className="labels">
        {links
          .filter((l) => l.link.label)
          .map(({ key, link, mid }) => (
            <g key={key} className="fade-in">
              <Pill x={mid.x} y={mid.y} text={link.label!} size={11.5} tone={link.tone === 'bad' ? 'bad' : 'ink'} />
            </g>
          ))}
        {scene.nodes.map((n) => {
          const p = toScreen(n.at);
          const s = nodeScale(n);
          const tag = n.tag ?? (n.kind !== 'cube' ? n.label : undefined);
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`} className={`fade-in${n.status === 'dim' ? ' dim' : ''}`}>
              {tag && <Pill x={0} y={TAG_OFFSET[n.kind] * s} text={tag} icon={n.tagIcon} size={12.5} bold />}
              {n.meter !== undefined && <Meter x={0} y={-TOP_OFFSET[n.kind] * s - 8} value={n.meter} />}
              {n.status === 'down' && <DownBadge x={52 * s} y={-44 * s} />}
            </g>
          );
        })}
        {(scene.notes ?? []).map((note, i) => {
          const p = toScreen(note.at);
          return (
            <g key={`${note.text}-${i}`} className="fade-in">
              <Pill x={p.x} y={p.y} text={note.text} icon={note.icon} size={12} tone={note.tone ?? 'ink'} />
            </g>
          );
        })}
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
