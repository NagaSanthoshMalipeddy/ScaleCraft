import { useEffect, useRef, type RefObject } from 'react';
import type { Bounds } from './layout';

type Box = [number, number, number, number];

const toBox = (b: Bounds): Box => [b.x, b.y, b.w, b.h];

/** Blend between two boxes; both contain the step's content, so any blend does too. */
export function blendBounds(a: Bounds, b: Bounds, t: number): Bounds {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t };
}

/**
 * Drives an SVG viewBox towards `target` with a critically damped spring: it starts from rest, eases in,
 * eases out with no overshoot, and keeps its velocity if the target changes mid-move (no jolts on fast clicks).
 */
export function useCamera(svgRef: RefObject<SVGSVGElement | null>, target: Bounds, omega = 5.2) {
  const cur = useRef<Box>(toBox(target));
  const vel = useRef<Box>([0, 0, 0, 0]);
  const [tx, ty, tw, th] = toBox(target);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const goal: Box = [tx, ty, tw, th];
    const write = () => svg.setAttribute('viewBox', cur.current.map((v) => v.toFixed(2)).join(' '));

    if (document.documentElement.dataset.motion === 'reduce') {
      cur.current = goal;
      vel.current = [0, 0, 0, 0];
      write();
      return;
    }

    let raf = 0;
    let last = -1;
    const tick = (now: number) => {
      // rAF timestamps can predate the effect, so the first frame uses a nominal step.
      const dt = last < 0 ? 1 / 60 : Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      // Sub-step for stability at low frame rates.
      const steps = 4;
      const h = dt / steps;
      let settled = true;
      for (let i = 0; i < 4; i++) {
        let x = cur.current[i];
        let v = vel.current[i];
        for (let s = 0; s < steps; s++) {
          const a = -2 * omega * v - omega * omega * (x - goal[i]);
          v += a * h;
          x += v * h;
        }
        cur.current[i] = x;
        vel.current[i] = v;
        if (Math.abs(x - goal[i]) > 0.05 || Math.abs(v) > 0.05) settled = false;
      }
      if (settled) {
        cur.current = [...goal];
        vel.current = [0, 0, 0, 0];
      }
      write();
      if (!settled) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [svgRef, tx, ty, tw, th, omega]);

  return cur;
}
