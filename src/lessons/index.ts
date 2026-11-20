import type { Lesson, Module } from '../types';
import { apis } from './apis';
import { batchStream, microservices, sagas, serviceDiscovery } from './architecture';
import { messageQueues } from './communication';
import { replication, sharding } from './data';
import { filesMedia, transactions } from './data2';
import { cap, consensus, consistentHashing, uniqueIds } from './distributed';
import { pubsub, realtime } from './events';
import { latencyThroughput, requestJourney } from './foundations';
import { napkinMath } from './foundations2';
import { hldLld } from './hld';
import { rateLimiting, timeoutsRetries } from './reliability';
import { observability, redundancy } from './reliability2';
import { caching, cdn, loadBalancing } from './scaling';
import { statelessServices, verticalHorizontal } from './scaling2';
import { authentication, authorization, encryption } from './security';
import { cicd, testing } from './shipping';
import { indexes, sqlNosql, storageEngines } from './storage';
import { urlShortener } from './systems';
import { chatSystem, newsFeed } from './systems2';

export const modules: Module[] = [
  { id: 'foundations', title: 'Foundations', lessons: [requestJourney, latencyThroughput, napkinMath] },
  { id: 'scaling', title: 'Scaling', lessons: [verticalHorizontal, loadBalancing, statelessServices, caching, cdn] },
  {
    id: 'data',
    title: 'Data & Storage',
    lessons: [sqlNosql, indexes, storageEngines, replication, sharding, consistentHashing, uniqueIds, cap, consensus, transactions, filesMedia],
  },
  { id: 'communication', title: 'Communication', lessons: [apis, messageQueues, pubsub, realtime] },
  { id: 'reliability', title: 'Reliability', lessons: [redundancy, rateLimiting, timeoutsRetries, observability] },
  { id: 'architecture', title: 'Architecture', lessons: [microservices, serviceDiscovery, sagas, batchStream] },
  { id: 'security', title: 'Security', lessons: [authentication, authorization, encryption] },
  { id: 'shipping', title: 'Shipping', lessons: [testing, cicd] },
  { id: 'systems', title: 'Whole Systems', lessons: [hldLld, urlShortener, newsFeed, chatSystem] },
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
