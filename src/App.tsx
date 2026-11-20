import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { LessonView } from './components/LessonView';
import { Outline } from './components/Outline';
import { SearchModal } from './components/SearchModal';
import { Sidebar } from './components/Sidebar';
import { lastVisited, rememberLast, useHashRoute, useProgress, useTheme } from './hooks/state';
import { allLessons, findLesson } from './lessons';

export default function App() {
  const [route, go] = useHashRoute();
  const [theme, toggleTheme] = useTheme();
  const [progress, mark, resetProgress] = useProgress();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const outlineRef = useRef<HTMLElement>(null);

  const routed = route.lessonId ? findLesson(route.lessonId) : undefined;
  const fallback = lastVisited();
  const resumed = !routed && fallback ? findLesson(fallback.lessonId) : undefined;
  const lref = routed ?? resumed ?? allLessons[0];
  const wanted = routed ? route.step : resumed ? fallback!.step : 1;
  const stepIndex = Math.max(0, Math.min(lref.lesson.steps.length - 1, wanted - 1));

  useEffect(() => {
    mark(lref.lesson.id, stepIndex);
    rememberLast(lref.lesson.id, stepIndex + 1);
    document.title = `${lref.lesson.title} · Scalecraft`;
  }, [lref.lesson.id, lref.lesson.title, stepIndex, mark]);

  useEffect(() => {
    if (route.lessonId) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [route.lessonId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      } else if (e.key === '/' && !searchOpen && (e.target as HTMLElement)?.tagName !== 'INPUT') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  const showOutline = useCallback(() => {
    outlineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const done = allLessons.filter((r) => (progress[r.lesson.id] ?? -1) >= r.lesson.steps.length - 1).length;

  return (
    <div className="app">
      <Header
        theme={theme}
        onTheme={toggleTheme}
        onMenu={() => setMenuOpen((o) => !o)}
        menuOpen={menuOpen}
        onSearch={() => setSearchOpen(true)}
        onOutline={showOutline}
        done={done}
        total={allLessons.length}
      />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} currentId={lref.lesson.id} progress={progress} onReset={resetProgress} />
      <LessonView lref={lref} stepIndex={stepIndex} go={go} blocked={searchOpen || menuOpen} />
      <Outline ref={outlineRef} progress={progress} currentId={lref.lesson.id} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} onGo={go} />
    </div>
  );
}
