import { useCallback, useEffect, useState } from 'react';

export interface Route {
  lessonId: string | null;
  step: number;
  /** Raw second segment (e.g. the concept filter in `#/questions/Caching`). */
  arg?: string;
}

function parseHash(): Route {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const step = Math.max(1, parseInt(parts[1] ?? '1', 10) || 1);
  let arg: string | undefined;
  try {
    arg = parts[1] !== undefined ? decodeURIComponent(parts[1]) : undefined;
  } catch {
    arg = parts[1];
  }
  return { lessonId: parts[0] ?? null, step, arg };
}

export const questionsHref = (concept?: string | null) => (concept ? `#/questions/${encodeURIComponent(concept)}` : '#/questions');

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

export type Motion = 'full' | 'reduce';

export function useMotion(): [Motion, () => void] {
  const [motion, setMotion] = useState<Motion>(() => (document.documentElement.dataset.motion === 'reduce' ? 'reduce' : 'full'));
  useEffect(() => {
    document.documentElement.dataset.motion = motion;
    try {
      localStorage.setItem('scalecraft.motion', motion);
    } catch {
      /* storage unavailable */
    }
  }, [motion]);
  return [motion, () => setMotion((m) => (m === 'reduce' ? 'full' : 'reduce'))];
}

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
    // The "Course" tab resumes the last lesson, not the last question.
    if (!lessonId.startsWith('q-')) localStorage.setItem(LAST_KEY + '.lesson', JSON.stringify({ lessonId, step }));
  } catch {
    /* storage unavailable */
  }
}

export function lastVisited(kind: 'any' | 'lesson' = 'any'): { lessonId: string; step: number } | null {
  try {
    return JSON.parse(localStorage.getItem(kind === 'lesson' ? LAST_KEY + '.lesson' : LAST_KEY) ?? 'null');
  } catch {
    return null;
  }
}
