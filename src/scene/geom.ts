import type { NodeKind, Pos, SceneLink, SceneNode } from '../types';

export const UNIT = 84;
export const COL = UNIT * 0.866;
export const ROW = UNIT * 0.5;

export type Pt = { x: number; y: number };

export const toScreen = ([c, r]: Pos): Pt => ({ x: c * COL, y: r * ROW });

export function nodeRadius(n: Pick<SceneNode, 'kind' | 'size'>): number {
  const k: Record<NodeKind, number> = {
    cube: 64,
    db: 58,
    device: 78,
    phone: 50,
    queue: 76,
    crowd: 70,
    slab: 64,
  };
  const s = n.size === 'sm' ? 0.75 : n.size === 'lg' ? 1.2 : 1;
  return k[n.kind] * s;
}

export function nodeScale(n: Pick<SceneNode, 'size'>): number {
  return n.size === 'sm' ? 0.75 : n.size === 'lg' ? 1.2 : 1;
}

/** Route between two grid points along iso axes (one bend). */
export function routeLink(a: Pos, b: Pos, link: Pick<SceneLink, 'elbow' | 'first'>): Pos[] {
  const dc = b[0] - a[0];
  const dr = b[1] - a[1];
  if (link.elbow === false || dc === 0 || dr === 0 || Math.abs(dc) === Math.abs(dr)) return [a, b];
  // Decompose into u=(1,1) and v=(1,-1): dc = p+q, dr = p-q
  const p = (dc + dr) / 2;
  const q = (dc - dr) / 2;
  const mid: Pos = link.first === 'v' ? [a[0] + q, a[1] - q] : [a[0] + p, a[1] + p];
  return [a, mid, b];
}

export function polyLength(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return l;
}

export function pointAt(pts: Pt[], d: number): Pt {
  if (pts.length === 1) return pts[0];
  let rest = Math.max(0, d);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (rest <= seg || i === pts.length - 1) {
      const t = seg === 0 ? 0 : Math.min(1, rest / seg);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    rest -= seg;
  }
  return pts[pts.length - 1];
}

/** Shorten a polyline from the start by `s` and from the end by `e`. */
export function trim(pts: Pt[], s: number, e: number): Pt[] {
  const total = polyLength(pts);
  if (total <= s + e + 4) return pts;
  const out: Pt[] = [pointAt(pts, s)];
  let acc = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (acc > s && acc < total - e) out.push(pts[i]);
  }
  out.push(pointAt(pts, total - e));
  return out;
}

export function roundedPath(pts: Pt[], r: number): string {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const v1 = { x: p0.x - p1.x, y: p0.y - p1.y };
    const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const l1 = Math.hypot(v1.x, v1.y);
    const l2 = Math.hypot(v2.x, v2.y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = { x: p1.x + (v1.x / l1) * rr, y: p1.y + (v1.y / l1) * rr };
    const b = { x: p1.x + (v2.x / l2) * rr, y: p1.y + (v2.y / l2) * rr };
    d += `${i === 0 ? 'M' : 'L'}${a.x.toFixed(2)},${a.y.toFixed(2)} Q${p1.x.toFixed(2)},${p1.y.toFixed(2)} ${b.x.toFixed(2)},${b.y.toFixed(2)} `;
  }
  return d + 'Z';
}

export function polyD(pts: Pt[], r = 14): string {
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const l1 = Math.hypot(p0.x - p1.x, p0.y - p1.y);
    const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = { x: p1.x + ((p0.x - p1.x) / l1) * rr, y: p1.y + ((p0.y - p1.y) / l1) * rr };
    const b = { x: p1.x + ((p2.x - p1.x) / l2) * rr, y: p1.y + ((p2.y - p1.y) / l2) * rr };
    d += ` L${a.x.toFixed(2)},${a.y.toFixed(2)} Q${p1.x.toFixed(2)},${p1.y.toFixed(2)} ${b.x.toFixed(2)},${b.y.toFixed(2)}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L${last.x.toFixed(2)},${last.y.toFixed(2)}`;
}

/** Iso rhombus (top face of a slab) centred at origin. */
export function rhombus(hw: number, hh: number, cx = 0, cy = 0): Pt[] {
  return [
    { x: cx, y: cy - hh },
    { x: cx + hw, y: cy },
    { x: cx, y: cy + hh },
    { x: cx - hw, y: cy },
  ];
}
