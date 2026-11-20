import { useEffect, useState } from 'react';

export interface Presence<T> {
  key: string;
  item: T;
  exiting: boolean;
  /** Position among items that entered together — used to stagger enter animations. */
  order: number;
}

interface State<T> {
  src: readonly T[];
  list: Presence<T>[];
}

function merge<T>(prev: Presence<T>[], next: readonly T[], keyOf: (t: T) => string): Presence<T>[] {
  const prevByKey = new Map(prev.map((e) => [e.key, e]));
  let entering = 0;
  const out: Presence<T>[] = next.map((item) => {
    const key = keyOf(item);
    const old = prevByKey.get(key);
    if (old && !old.exiting) return { key, item, exiting: false, order: old.order };
    return { key, item, exiting: false, order: entering++ };
  });
  const live = new Set(out.map((e) => e.key));
  // Keep removed items around (in roughly their old paint order) so they can animate out.
  prev.forEach((e, i) => {
    if (live.has(e.key)) return;
    out.splice(Math.min(i, out.length), 0, { ...e, exiting: true });
  });
  return out;
}

/**
 * Tracks keyed items across renders so removed ones linger with `exiting: true` for `exitMs`.
 * `items` must be referentially stable between renders (memoize it).
 */
export function usePresence<T>(items: readonly T[], keyOf: (t: T) => string, exitMs = 420): Presence<T>[] {
  const [state, setState] = useState<State<T>>(() => ({
    src: items,
    list: items.map((item, i) => ({ key: keyOf(item), item, exiting: false, order: i })),
  }));

  let current = state;
  if (state.src !== items) {
    current = { src: items, list: merge(state.list, items, keyOf) };
    setState(current);
  }

  const hasExiting = current.list.some((e) => e.exiting);
  useEffect(() => {
    if (!hasExiting) return;
    const t = setTimeout(() => setState((s) => ({ ...s, list: s.list.filter((e) => !e.exiting) })), exitMs);
    return () => clearTimeout(t);
  }, [hasExiting, current.src, exitMs]);

  return current.list;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Smoothly animates a number towards `target`. */
export function useTween(target: number, ms = 950, delayMs = 250): number {
  const [state, setState] = useState({ from: target, to: target, value: target });
  if (state.to !== target) setState({ from: state.value, to: target, value: state.value });

  useEffect(() => {
    if (state.value === state.to) return;
    if (document.documentElement.dataset.motion === 'reduce') {
      const to = state.to;
      const raf = requestAnimationFrame(() => setState((s) => (s.to === to ? { ...s, value: to } : s)));
      return () => cancelAnimationFrame(raf);
    }
    const start = performance.now() + delayMs;
    const from = state.from;
    const to = state.to;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / ms));
      setState((s) => (s.to === to ? { ...s, value: from + (to - from) * easeInOut(t) } : s));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.to, state.from, ms, delayMs]);

  return state.value;
}
