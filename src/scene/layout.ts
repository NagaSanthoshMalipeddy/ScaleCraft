import type { FlowKind, Scene, SceneNode } from '../types';
import { nodeScale, toScreen } from './geom';

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Distance from a node's centre to its tag pill. */
export const TAG_OFFSET: Record<SceneNode['kind'], number> = {
  cube: 80,
  db: 58,
  device: 74,
  phone: 58,
  queue: 64,
  crowd: 66,
  slab: 66,
};

/** Distance from a node's centre to the top of its drawing. */
export const TOP_OFFSET: Record<SceneNode['kind'], number> = {
  cube: 78,
  db: 66,
  device: 104,
  phone: 62,
  queue: 52,
  crowd: 70,
  slab: 56,
};

/** One stable camera for every step of a lesson. */
export function sceneBounds(scenes: Scene[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const sc of scenes) {
    for (const n of sc.nodes) {
      const p = toScreen(n.at);
      const s = nodeScale(n);
      minX = Math.min(minX, p.x - 110 * s);
      maxX = Math.max(maxX, p.x + 110 * s);
      minY = Math.min(minY, p.y - (TOP_OFFSET[n.kind] + (n.meter !== undefined ? 30 : 12)) * s);
      maxY = Math.max(maxY, p.y + (TAG_OFFSET[n.kind] + 22) * s);
    }
    for (const note of sc.notes ?? []) {
      const p = toScreen(note.at);
      const w = note.text.length * 7.2 + 50;
      minX = Math.min(minX, p.x - w / 2 - 10);
      maxX = Math.max(maxX, p.x + w / 2 + 10);
      minY = Math.min(minY, p.y - 26);
      maxY = Math.max(maxY, p.y + 26);
    }
  }
  if (!isFinite(minX)) return { x: -400, y: -250, w: 800, h: 500 };
  const pad = 24;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // Keep small scenes from being blown up too much.
  const w = Math.max(maxX - minX + pad * 2, 720);
  const h = Math.max(maxY - minY + pad * 2, 400);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export function usedFlowKinds(scene: Scene): FlowKind[] {
  const set = new Set<FlowKind>();
  for (const f of scene.flows ?? []) {
    set.add(f.kind ?? 'request');
    if (f.ret) set.add(f.retKind ?? 'response');
  }
  return [...set];
}
