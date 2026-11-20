import type { Lesson, Module } from '../types';
import { messageQueues } from './communication';
import { replication, sharding } from './data';
import { latencyThroughput, requestJourney } from './foundations';
import { rateLimiting, timeoutsRetries } from './reliability';
import { caching, cdn, loadBalancing } from './scaling';
import { urlShortener } from './systems';

export const modules: Module[] = [
  { id: 'foundations', title: 'Foundations', lessons: [requestJourney, latencyThroughput] },
  { id: 'scaling', title: 'Scaling', lessons: [loadBalancing, caching, cdn] },
  { id: 'data', title: 'Data & Storage', lessons: [replication, sharding] },
  { id: 'communication', title: 'Communication', lessons: [messageQueues] },
  { id: 'reliability', title: 'Reliability', lessons: [rateLimiting, timeoutsRetries] },
  { id: 'systems', title: 'Whole Systems', lessons: [urlShortener] },
];

export interface LessonRef {
  lesson: Lesson;
  module: Module;
  moduleIndex: number;
  indexInModule: number;
  globalIndex: number;
}

export const allLessons: LessonRef[] = modules.flatMap((module, moduleIndex) =>
  module.lessons.map((lesson, indexInModule) => ({ lesson, module, moduleIndex, indexInModule, globalIndex: 0 })),
).map((r, i) => ({ ...r, globalIndex: i }));

export const findLesson = (id: string) => allLessons.find((r) => r.lesson.id === id);
