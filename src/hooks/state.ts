import { useCallback, useEffect, useState } from 'react';

export interface Route {
  lessonId: string | null;
  step: number;
}

function parseHash(): Route {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const step = Math.max(1, parseInt(parts[1] ?? '1', 10) || 1);
  return { lessonId: parts[0] ?? null, step };
}

export function useHashRoute(): [Route, (lessonId: string, step?: number) => void] {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((lessonId: string, step = 1) => {
    const next = `#/${lessonId}/${step}`;
    if (window.location.hash !== next) window.location.hash = next;
  }, []);
  return [route, go];
}

type Theme = 'light' | 'dark';

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('scalecraft.theme', theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

/** lessonId -> furthest step index reached (0-based) */
export type Progress = Record<string, number>;

const PROGRESS_KEY = 'scalecraft.progress';
const LAST_KEY = 'scalecraft.last';

export function useProgress(): [Progress, (lessonId: string, stepIndex: number) => void, () => void] {
  const [progress, setProgress] = useState<Progress>(() => {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}');
    } catch {
      return {};
    }
  });
  const mark = useCallback((lessonId: string, stepIndex: number) => {
    setProgress((p) => {
      if ((p[lessonId] ?? -1) >= stepIndex) return p;
      const next = { ...p, [lessonId]: stepIndex };
      try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);
  const reset = useCallback(() => {
    setProgress({});
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);
  return [progress, mark, reset];
}

export function rememberLast(lessonId: string, step: number) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ lessonId, step }));
  } catch {
    /* storage unavailable */
  }
}

export function lastVisited(): { lessonId: string; step: number } | null {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null');
  } catch {
    return null;
  }
}
