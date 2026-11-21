import { useCallback, useEffect, useRef, useState } from 'react';
import { findEntry, firstLesson, isComplete } from './catalog';
import { Header } from './components/Header';
import { LessonView } from './components/LessonView';
import { Outline } from './components/Outline';
import { QuestionBank } from './components/QuestionBank';
import { SearchModal } from './components/SearchModal';
import { Sidebar } from './components/Sidebar';
import { lastVisited, questionsHref, rememberLast, useHashRoute, useMotion, useProgress, useTheme } from './hooks/state';
import { allLessons } from './lessons';
import { questions } from './questions';

export default function App() {
  const [route, go] = useHashRoute();
  const [theme, toggleTheme] = useTheme();
  const [motion, toggleMotion] = useMotion();
  const [progress, mark, resetProgress] = useProgress();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const belowRef = useRef<HTMLElement>(null);

  const onBankPage = route.lessonId === 'questions';
  const concept = onBankPage && route.arg ? route.arg : null;

  const routed = route.lessonId && !onBankPage ? findEntry(route.lessonId) : undefined;
  const fallback = lastVisited();
  const resumed = !routed && !onBankPage && fallback ? findEntry(fallback.lessonId) : undefined;
  const entry = routed ?? resumed ?? firstLesson;
  const wanted = routed ? route.step : resumed ? fallback!.step : 1;
  const stepIndex = Math.max(0, Math.min(entry.lesson.steps.length - 1, wanted - 1));
  const section = onBankPage || entry.kind === 'question' ? 'questions' : 'course';

  const lastLesson = lastVisited('lesson');
  const courseHref = lastLesson && findEntry(lastLesson.lessonId) ? `#/${lastLesson.lessonId}/${lastLesson.step}` : `#/${firstLesson.lesson.id}/1`;

  useEffect(() => {
    if (onBankPage) {
      document.title = `${concept ? `${concept} · ` : ''}System Design Questions · Scalecraft`;
      return;
    }
    mark(entry.lesson.id, stepIndex);
    rememberLast(entry.lesson.id, stepIndex + 1);
    document.title = `${entry.question ? `Q${entry.question.n}: ` : ''}${entry.lesson.title} · Scalecraft`;
  }, [onBankPage, concept, entry.lesson.id, entry.lesson.title, entry.question, stepIndex, mark]);

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

  const showBelow = useCallback(() => {
    belowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const pool = section === 'questions' ? questions : allLessons.map((r) => r.lesson);
  const done = pool.filter((l) => isComplete(l, progress)).length;

  return (
    <div className="app">
      <Header
        theme={theme}
        onTheme={toggleTheme}
        motion={motion}
        onMotion={toggleMotion}
        onMenu={() => setMenuOpen((o) => !o)}
        menuOpen={menuOpen}
        onSearch={() => setSearchOpen(true)}
        onOutline={showBelow}
        section={section}
        courseHref={courseHref}
        done={done}
        total={pool.length}
      />
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        currentId={onBankPage ? '' : entry.lesson.id}
        section={section}
        progress={progress}
        onReset={resetProgress}
      />
      {onBankPage ? (
        <QuestionBank ref={belowRef} variant="page" progress={progress} concept={concept} />
      ) : (
        <>
          <LessonView
            entry={entry}
            stepIndex={stepIndex}
            go={go}
            blocked={searchOpen || menuOpen}
            onConcept={(c) => (window.location.hash = questionsHref(c))}
          />
          {entry.kind === 'question' ? (
            <QuestionBank ref={belowRef} variant="below" progress={progress} concept={null} currentId={entry.lesson.id} />
          ) : (
            <Outline ref={belowRef} progress={progress} currentId={entry.lesson.id} />
          )}
        </>
      )}
      <footer className="site-foot">
        <span>Scalecraft · built locally with React + SVG</span>
        <span className="muted">Diagrams and timings are teaching examples — measure your own systems.</span>
      </footer>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} onGo={go} />
    </div>
  );
}
