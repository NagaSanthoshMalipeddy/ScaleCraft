import type { LucideIcon } from 'lucide-react';
import { Settings2, X } from 'lucide-react';
import type { SceneNode } from '../types';
import { nodeScale, roundedPath, rhombus, type Pt } from './geom';

const ISO_U = { x: 0.866, y: 0.5 };
const ISO_V = { x: -0.866, y: 0.5 };

const pts = (p: Pt[]) => p.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ');
const add = (a: Pt, b: Pt, k = 1): Pt => ({ x: a.x + b.x * k, y: a.y + b.y * k });

const charW = (size: number) => size * 0.6;

function hexPoints(s: number): Pt[] {
  return [
    { x: 0, y: -s },
    { x: 0.866 * s, y: -0.5 * s },
    { x: 0.866 * s, y: 0.5 * s },
    { x: 0, y: s },
    { x: -0.866 * s, y: 0.5 * s },
    { x: -0.866 * s, y: -0.5 * s },
  ];
}

/** Iso box: top rhombus with side faces of height h. */
function Box({ hw, hh, h, cy = 0, r = 6, className }: { hw: number; hh: number; h: number; cy?: number; r?: number; className?: string }) {
  const top = rhombus(hw, hh, 0, cy);
  const [, R, B, L] = top;
  const left = [L, B, add(B, { x: 0, y: h }), add(L, { x: 0, y: h })];
  const right = [B, R, add(R, { x: 0, y: h }), add(B, { x: 0, y: h })];
  const outline = [top[0], R, add(R, { x: 0, y: h }), add(B, { x: 0, y: h }), add(L, { x: 0, y: h }), L];
  return (
    <g className={className}>
      <path d={roundedPath(outline.map((p) => add(p, { x: 1.5, y: 3 })), r)} className="drop" />
      <polygon points={pts(left)} className="f2" />
      <polygon points={pts(right)} className="f3" />
      <polygon points={pts(top)} className="f1" />
      <path d={`M${L.x},${L.y} L${B.x},${B.y} L${R.x},${R.y} M${B.x},${B.y} L${B.x},${B.y + h}`} className="inner" />
      <path d={roundedPath(outline, r)} className="ol" />
    </g>
  );
}

function SmallCube({ s, x, y }: { s: number; x: number; y: number }) {
  const h = hexPoints(s).map((p) => ({ x: p.x + x, y: p.y + y }));
  const c = { x, y };
  return (
    <g>
      <polygon points={pts([h[0], h[1], c, h[5]])} className="f1" />
      <polygon points={pts([h[5], c, h[3], h[4]])} className="f2" />
      <polygon points={pts([c, h[1], h[2], h[3]])} className="f3" />
      <path d={roundedPath(h, 3)} className="ol thin" />
    </g>
  );
}

function Icon({ icon: I, size, x, y }: { icon?: LucideIcon; size: number; x: number; y: number }) {
  if (!I) return null;
  return (
    <g className="ico">
      <I x={x - size / 2} y={y - size / 2} width={size} height={size} strokeWidth={2.1} />
    </g>
  );
}

function Cube({ n, s }: { n: SceneNode; s: number }) {
  const S = 54 * s;
  const h = hexPoints(S);
  const c = { x: 0, y: 0 };
  const hasSub = !!n.sub;
  return (
    <g>
      <path d={roundedPath(h.map((p) => add(p, { x: 2, y: 4 })), 12 * s)} className="drop" />
      <clipPath id={`clip-${n.id}`}>
        <path d={roundedPath(h, 12 * s)} />
      </clipPath>
      <g clipPath={`url(#clip-${n.id})`}>
        <polygon points={pts([h[0], h[1], c, h[5]])} className="f1" />
        <polygon points={pts([h[5], c, h[3], h[4]])} className="f2" />
        <polygon points={pts([c, h[1], h[2], h[3]])} className="f3" />
        <polygon points={pts([h[0], h[1], c, h[5]])} className="sheen" />
        <path d={`M${h[5].x},${h[5].y} L0,0 L${h[1].x},${h[1].y} M0,0 L0,${S}`} className="inner" />
      </g>
      <path d={roundedPath(h, 12 * s)} className="ol" />
      <Icon icon={n.icon} size={26 * s} x={0} y={(hasSub ? -22 : -16) * s} />
      {n.label && (
        <text className="node-label" x={0} y={(n.icon ? (hasSub ? 10 : 16) : hasSub ? 0 : 5) * s} fontSize={15 * s}>
          {n.label}
        </text>
      )}
      {n.sub && (
        <text className="node-sub" x={0} y={(n.icon ? 27 : 18) * s} fontSize={11.5 * s}>
          {n.sub}
        </text>
      )}
    </g>
  );
}

function Db({ n, s }: { n: SceneNode; s: number }) {
  const rx = 46 * s;
  const ry = 16 * s;
  const h = 58 * s;
  const top = -h / 2 - 6 * s;
  const bot = top + h;
  const body = `M${-rx},${top} L${-rx},${bot} A${rx},${ry} 0 0 0 ${rx},${bot} L${rx},${top} Z`;
  const band = `M${-rx},${top + h * 0.42} A${rx},${ry} 0 0 0 ${rx},${top + h * 0.42}`;
  return (
    <g>
      <path d={body} transform="translate(2,4)" className="drop" />
      <ellipse cx={2} cy={top + 4} rx={rx} ry={ry} className="drop" />
      <path d={body} className="f2" />
      <path d={`M0,${top} L${rx},${top} L${rx},${bot} A${rx},${ry} 0 0 1 0,${bot + ry} Z`} className="f3" opacity={0.6} />
      <path d={band} className="inner" fill="none" />
      <path d={body} className="ol" />
      <ellipse cx={0} cy={top} rx={rx} ry={ry} className="f1 ol" />
      <Icon icon={n.icon} size={22 * s} x={0} y={top + h * 0.62} />
      {n.label && !n.icon && (
        <text className="node-label" x={0} y={top + h * 0.68} fontSize={13 * s}>
          {n.label}
        </text>
      )}
    </g>
  );
}

function Device({ s }: { s: number }) {
  const hw = 76 * s;
  const hh = hw * 0.577;
  const bx = 6 * s;
  const by = -6 * s;
  const lw = 52 * s;
  const lh = lw * 0.577;
  const L = { x: bx - lw, y: by };
  const T = { x: bx, y: by - lh };
  const up = { x: 0, y: -62 * s };
  const screen = [L, T, add(T, up), add(L, up)];
  const inset = (k: number) => [
    add(add(L, ISO_U, 4 * s), up, 0.12 + k),
    add(add(T, ISO_V, -4 * s), up, 0.12 + k),
    add(add(T, ISO_V, -4 * s), up, 0.88),
    add(add(L, ISO_U, 4 * s), up, 0.88),
  ];
  const kb = rhombus(lw - 10 * s, lh - 6 * s, bx + 2 * s, by + 2 * s);
  return (
    <g>
      <Box hw={hw} hh={hh} h={14 * s} cy={8 * s} r={8 * s} />
      <g className="tone-sand">
        <Box hw={lw} hh={lh} h={4 * s} cy={by} r={3} />
      </g>
      <polygon points={pts(kb)} className="kb" />
      <path d={roundedPath(screen, 4)} className="screen-frame" />
      <polygon points={pts(inset(0))} className="screen" />
      <polygon points={pts(inset(0.05).map((p, i) => (i > 1 ? add(p, up, -0.45) : p)))} className="screen-bar" />
    </g>
  );
}

function Phone({ s }: { s: number }) {
  const hw = 50 * s;
  const ph = (a: number, b: number) => [
    add(add({ x: 0, y: -6 * s }, ISO_U, -a / 2), ISO_V, -b / 2),
    add(add({ x: 0, y: -6 * s }, ISO_U, a / 2), ISO_V, -b / 2),
    add(add({ x: 0, y: -6 * s }, ISO_U, a / 2), ISO_V, b / 2),
    add(add({ x: 0, y: -6 * s }, ISO_U, -a / 2), ISO_V, b / 2),
  ];
  return (
    <g>
      <Box hw={hw} hh={hw * 0.577} h={12 * s} cy={8 * s} r={6 * s} />
      <path d={roundedPath(ph(34 * s, 62 * s), 6)} className="screen-frame" />
      <polygon points={pts(ph(26 * s, 50 * s))} className="screen" />
    </g>
  );
}

function Queue({ n, s }: { n: SceneNode; s: number }) {
  const a = 150 * s;
  const b = 46 * s;
  const o = { x: 0, y: 6 * s };
  const corner = (i: number, j: number) => add(add(o, ISO_U, (i * a) / 2), ISO_V, (j * b) / 2);
  const top = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
  const h = 9 * s;
  const down = { x: 0, y: h };
  const outline = [top[0], top[1], top[2], add(top[2], down), add(top[3], down), top[3]];
  const items = Math.max(0, n.items ?? 4);
  const shown = Math.min(items, 6);
  const step = (a - 26 * s) / 6;
  return (
    <g>
      <path d={roundedPath(outline.map((p) => add(p, { x: 1.5, y: 3 })), 5)} className="drop" />
      <polygon points={pts([top[1], top[2], add(top[2], down), add(top[1], down)])} className="f3" />
      <polygon points={pts([top[3], top[2], add(top[2], down), add(top[3], down)])} className="f2" />
      <polygon points={pts(top)} className="f1" />
      <path d={roundedPath(outline, 5)} className="ol" />
      <g className="tone-orange">
        {Array.from({ length: shown }).map((_, i) => {
          const p = add(o, ISO_U, a / 2 - 18 * s - i * step);
          return <SmallCube key={i} s={14 * s} x={p.x} y={p.y - 10 * s} />;
        })}
      </g>
      {items > 6 && (
        <text className="node-sub strong" x={corner(-1, 0).x - 6} y={corner(-1, 0).y - 10} fontSize={13}>
          +{items - 6}
        </text>
      )}
    </g>
  );
}

function Crowd({ n, s }: { n: SceneNode; s: number }) {
  const hw = 70 * s;
  const people = Math.min(n.items ?? 5, 7);
  const spots: Pt[] = [
    { x: 0, y: -14 },
    { x: -30, y: -2 },
    { x: 30, y: -2 },
    { x: 0, y: 12 },
    { x: -26, y: -22 },
    { x: 26, y: -22 },
    { x: 0, y: -34 },
  ]
    .slice(0, people)
    .sort((p, q) => p.y - q.y)
    .map((p) => ({ x: p.x * s, y: p.y * s }));
  return (
    <g>
      <Box hw={hw} hh={hw * 0.577} h={12 * s} cy={8 * s} r={8 * s} />
      {spots.map((p, i) => (
        <g key={i} transform={`translate(${p.x},${p.y})`} className="person">
          <path d={`M${-11 * s},0 C${-11 * s},${-18 * s} ${11 * s},${-18 * s} ${11 * s},0 Z`} className="f1 ol thin" />
          <circle cx={0} cy={-22 * s} r={7 * s} className="f1 ol thin" />
        </g>
      ))}
    </g>
  );
}

function Slab({ n, s }: { n: SceneNode; s: number }) {
  const hw = 66 * s;
  return (
    <g>
      <Box hw={hw} hh={hw * 0.577} h={16 * s} cy={4 * s} r={8 * s} />
      <ellipse cx={0} cy={4 * s} rx={26 * s} ry={15 * s} className="slab-well" />
      <Icon icon={n.icon} size={24 * s} x={0} y={0} />
    </g>
  );
}

export function NodeShape({ n }: { n: SceneNode }) {
  const s = nodeScale(n);
  switch (n.kind) {
    case 'cube':
      return <Cube n={n} s={s} />;
    case 'db':
      return <Db n={n} s={s} />;
    case 'device':
      return <Device s={s} />;
    case 'phone':
      return <Phone s={s} />;
    case 'queue':
      return <Queue n={n} s={s} />;
    case 'crowd':
      return <Crowd n={n} s={s} />;
    case 'slab':
      return <Slab n={n} s={s} />;
  }
}

export function Pill({
  x,
  y,
  text,
  icon,
  size = 12,
  tone = 'ink',
  bold = false,
}: {
  x: number;
  y: number;
  text: string;
  icon?: LucideIcon;
  size?: number;
  tone?: 'ink' | 'bad' | 'good' | 'warn';
  bold?: boolean;
}) {
  const iw = icon ? size + 6 : 0;
  const w = text.length * charW(size) + 22 + iw;
  const h = size + 13;
  const I = icon;
  return (
    <g transform={`translate(${x - w / 2},${y - h / 2})`} className={`pill pill-${tone}`}>
      <rect x={1.5} y={2.5} width={w} height={h} rx={h / 2} className="drop" />
      <rect width={w} height={h} rx={h / 2} className="pill-bg" />
      {I && (
        <g className="ico">
          <I x={11} y={(h - size - 1) / 2} width={size + 1} height={size + 1} strokeWidth={2.4} />
        </g>
      )}
      <text x={11 + iw} y={h / 2 + size * 0.36} fontSize={size} className={bold ? 'pill-text strong' : 'pill-text'}>
        {text}
      </text>
    </g>
  );
}

export function Meter({ x, y, value }: { x: number; y: number; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const w = 104;
  const h = 24;
  const cls = v >= 85 ? 'bad' : v >= 60 ? 'warn' : 'good';
  return (
    <g transform={`translate(${x - w / 2},${y - h / 2})`} className="meter">
      <rect x={1.5} y={2.5} width={w} height={h} rx={h / 2} className="drop" />
      <rect width={w} height={h} rx={h / 2} className="pill-bg" />
      <g className="ico muted">
        <Settings2 x={8} y={5} width={14} height={14} strokeWidth={2.4} />
      </g>
      <rect x={27} y={9} width={34} height={6} rx={3} className="meter-track" />
      <rect x={27} y={9} width={(34 * v) / 100} height={6} rx={3} className={`meter-fill ${cls}`} />
      <text x={w - 9} y={16.5} fontSize={11.5} textAnchor="end" className="pill-text strong">
        {Math.round(v)}%
      </text>
    </g>
  );
}

export function DownBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} className="down-badge">
      <circle r={13} cx={1.5} cy={2.5} className="drop" />
      <circle r={13} className="bad-bg" />
      <X x={-8} y={-8} width={16} height={16} strokeWidth={3} />
    </g>
  );
}
