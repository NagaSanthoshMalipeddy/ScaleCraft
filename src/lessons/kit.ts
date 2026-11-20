import type { Flow, SceneLink, SceneNode } from '../types';

type NodeDef = Omit<SceneNode, 'id'>;

export const L = (from: string, to: string, o: Partial<SceneLink> = {}): SceneLink => ({ from, to, ...o });

export const F = (path: string[], o: Partial<Flow> = {}): Flow => ({ path, ...o });

/** Define a lesson's cast of nodes once, then pick (and tweak) them per step. */
export function cast<K extends string>(defs: Record<K, NodeDef>) {
  return (...items: (K | [K, Partial<NodeDef>])[]): SceneNode[] =>
    items.map((it) => {
      const [id, over] = Array.isArray(it) ? it : [it, {}];
      return { id, ...defs[id], ...over } as SceneNode;
    });
}
