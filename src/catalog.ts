import { allLessons } from './lessons';
import { questions } from './questions';
import type { Lesson, Question } from './types';

export type Level = Lesson['level'];
export const LEVELS: Level[] = ['Beginner', 'Intermediate', 'Advanced'];

/** Anything the player can open: a course lesson or a question walkthrough. */
export interface Entry {
  kind: 'lesson' | 'question';
  lesson: Lesson;
  question?: Question;
  /** Breadcrumb segments shown above the title. */
  crumbs: string[];
  next?: { id: string; title: string };
}

const lessonEntries: Entry[] = allLessons.map((r, i) => {
  const n = allLessons[i + 1];
  return {
    kind: 'lesson',
    lesson: r.lesson,
    crumbs: [`${String(r.moduleIndex + 1).padStart(2, '0')}. ${r.module.title}`, `Lesson ${r.indexInModule + 1} of ${r.module.lessons.length}`],
    next: n && { id: n.lesson.id, title: n.lesson.title },
  };
});

const questionEntries: Entry[] = questions.map((q, i) => {
  const n = questions[i + 1];
  return {
    kind: 'question',
    lesson: q,
    question: q,
    crumbs: ['Questions', q.level, `Question ${q.n} of ${questions.length}`],
    next: n && { id: n.id, title: n.title },
  };
});

const byId = new Map<string, Entry>([...lessonEntries, ...questionEntries].map((e) => [e.lesson.id, e]));

export const findEntry = (id: string) => byId.get(id);
export const firstLesson = lessonEntries[0];

export const lessonById = (id: string) => allLessons.find((r) => r.lesson.id === id)?.lesson;

export const isComplete = (l: Lesson, progress: Record<string, number>) => (progress[l.id] ?? -1) >= l.steps.length - 1;
export const isStarted = (l: Lesson, progress: Record<string, number>) => (progress[l.id] ?? -1) >= 0 && !isComplete(l, progress);

export const questionsByLevel = LEVELS.map((level) => ({ level, items: questions.filter((q) => q.level === level) }));
