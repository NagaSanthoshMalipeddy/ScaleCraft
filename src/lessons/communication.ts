import { Activity, Inbox, Mail, Server, Skull, Timer, TriangleAlert, User, Users } from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

const mq = cast({
  you: { kind: 'device', at: [-6, 0], tag: 'new user', tagIcon: User },
  api: { kind: 'cube', at: [-2.5, 0], label: 'API', sub: 'signup', icon: Server, tone: 'blue' },
  usersdb: { kind: 'db', at: [-2.5, 4.5], tag: 'users db', icon: Users },
  queue: { kind: 'queue', at: [1, -3.5], tag: 'jobs', tagIcon: Inbox, items: 2 },
  w1: { kind: 'cube', at: [5, -3.5], label: 'Worker', sub: '#1', icon: Activity, tone: 'green' },
  w2: { kind: 'cube', at: [5, 0.5], label: 'Worker', sub: '#2', icon: Activity, tone: 'green' },
  email: { kind: 'cube', at: [8.5, -2], label: 'Email', sub: 'provider', icon: Mail, tone: 'yellow', size: 'sm' },
  dlq: { kind: 'queue', at: [1, 2.5], tag: 'dead letters', tagIcon: Skull, tone: 'rose', items: 0 },
});

const base = [L('you', 'api', { arrow: 'both' }), L('api', 'usersdb'), L('api', 'queue', { label: 'enqueue' })];

export const messageQueues: Lesson = {
  id: 'message-queues',
  title: 'Message Queues',
  blurb: 'Answer right away, do the slow work later — and never lose a job along the way.',
  minutes: 10,
  level: 'Intermediate',
  keywords: ['queue', 'async', 'worker', 'background job', 'ack', 'retry', 'dead letter', 'idempotent', 'at least once', 'backpressure'],
  metrics: [
    { id: 'lat', label: 'Signup time', icon: Timer },
    { id: 'depth', label: 'Queue depth', icon: Inbox },
    { id: 'lost', label: 'Lost jobs', icon: TriangleAlert },
  ],
  learn: [
    { text: 'Decoupling slow work from the request', at: 1 },
    { text: 'Workers that pull at their own pace', at: 2 },
    { text: 'Absorbing traffic spikes with a buffer', at: 3 },
    { text: 'Acks, redelivery and idempotency', at: 4 },
    { text: 'Dead-letter queues for poison messages', at: 5 },
  ],
  steps: [
    {
      short: 'All at once',
      title: 'Signup takes 2.4 seconds',
      tag: 'Problem',
      body: [
        'The signup handler saves the user, then — while the user waits — sends a welcome email, resizes the avatar and syncs the CRM. **2.4 s** per signup.',
        'Worse: when the email provider has an outage, signups fail, even though the account itself was fine.',
      ],
      scene: {
        nodes: mq('you', ['api', { meter: 80, status: 'hot' }], 'usersdb', ['email', { at: [3, 0] }]),
        links: [L('you', 'api', { arrow: 'both' }), L('api', 'usersdb'), L('api', 'email', { label: 'send · 2 s', arrow: 'both' })],
        flows: [F(['you', 'api', 'email'], { ret: true, speed: 0.45 })],
      },
      metrics: { lat: '2.4 s', depth: '—', lost: '—' },
      bad: ['lat'],
    },
    {
      short: 'Enqueue',
      title: 'Write a note, reply immediately',
      tag: 'Technique',
      body: [
        'Instead, the API saves the user and drops a small message — `{"job":"welcome","user":812}` — onto a **queue**. Then it replies right away.',
        'The queue stores messages durably until someone processes them. Signup now takes **45 ms**.',
      ],
      callout: { kind: 'key', text: 'A queue separates “accepting work” from “doing work”, so each can run at its own speed.' },
      changes: [{ sign: '+', text: 'Jobs queue' }, { sign: '~', text: 'Signup: 2.4 s → 45 ms' }],
      scene: {
        nodes: mq('you', 'api', 'usersdb', 'queue'),
        links: base,
        flows: [F(['you', 'api'], { ret: true }), F(['api', 'queue'], { kind: 'event', delay: 0.9 })],
      },
      metrics: { lat: '45 ms', depth: '2' },
      hi: ['lat'],
    },
    {
      short: 'Workers',
      title: 'Workers pull at their own pace',
      tag: 'Technique',
      body: [
        'A **worker** process takes the next message, sends the email, and then **acknowledges** it. Only then does the queue delete the message.',
        'If the email provider is down, jobs just wait in the queue. Signups keep working.',
      ],
      changes: [{ sign: '+', text: 'Worker' }],
      scene: {
        nodes: mq('you', 'api', 'usersdb', ['queue', { items: 1 }], 'w1', 'email'),
        links: [...base, L('queue', 'w1', { label: 'pull' }), L('w1', 'email')],
        flows: [F(['you', 'api'], { ret: true }), F(['api', 'queue'], { kind: 'event', delay: 0.8 }), F(['queue', 'w1', 'email'], { kind: 'event', delay: 1.4, ret: true })],
      },
      metrics: { depth: '1', lost: '0' },
    },
    {
      short: 'Spike',
      title: 'A traffic spike becomes a backlog',
      tag: 'Case',
      body: [
        'A TV ad airs; signups jump 10×. The API stays fast because it only enqueues. The queue absorbs the burst: **depth climbs to 3,200**.',
        'Autoscale workers on queue depth (or age of the oldest message). As workers are added, the backlog drains.',
      ],
      callout: { kind: 'tip', text: 'Alert on the age of the oldest message, not just depth. Age tells you how late your work is.' },
      changes: [{ sign: '+', text: 'Worker #2 (autoscaled)' }],
      scene: {
        nodes: mq(['you', { kind: 'crowd', tag: 'signups × 10', items: 6 }], ['api', { meter: 40 }], 'usersdb', ['queue', { items: 14 }], ['w1', { meter: 90 }], ['w2', { meter: 85 }], 'email'),
        links: [...base, L('queue', 'w1'), L('queue', 'w2'), L('w1', 'email'), L('w2', 'email')],
        flows: [
          F(['you', 'api', 'queue'], { kind: 'event', n: 5 }),
          F(['queue', 'w1', 'email'], { kind: 'event', n: 2, delay: 1 }),
          F(['queue', 'w2', 'email'], { kind: 'event', n: 2, delay: 1.4 }),
        ],
      },
      metrics: { lat: '48 ms', depth: '3,200' },
      bad: ['depth'],
      hi: ['lat'],
    },
    {
      short: 'Crash',
      title: 'A worker dies mid-job',
      tag: 'Technique',
      body: [
        'Worker #1 crashes after taking a job but before acknowledging it. After a **visibility timeout**, the queue makes the message available again and worker #2 picks it up.',
        'Nothing is lost — but the email might be sent **twice**. Queues give *at-least-once* delivery, so handlers must be **idempotent** (e.g. record “welcome sent for user 812” and skip repeats).',
      ],
      callout: { kind: 'warn', text: 'Exactly-once delivery is (almost always) a myth. Exactly-once *effects* come from idempotent handlers.' },
      scene: {
        nodes: mq('you', 'api', 'usersdb', ['queue', { items: 3 }], ['w1', { status: 'down' }], ['w2', { meter: 60 }], 'email'),
        links: [...base, L('queue', 'w1', { dashed: true, tone: 'bad', label: 'no ack' }), L('queue', 'w2', { label: 'redeliver' }), L('w2', 'email')],
        flows: [F(['queue', 'w1'], { kind: 'event', stop: true }), F(['queue', 'w2', 'email'], { kind: 'event', delay: 1.3, ret: true })],
      },
      metrics: { depth: '3', lost: '0' },
      hi: ['lost'],
    },
    {
      short: 'Poison',
      title: 'The message that always fails',
      tag: 'Technique',
      body: [
        'One job has a malformed email address. It fails, gets retried, fails again… forever, wasting worker time.',
        'After N attempts (say 5), move it to a **dead-letter queue**. Alert on it, inspect it, fix the bug, and replay it.',
      ],
      changes: [{ sign: '+', text: 'Dead-letter queue' }],
      scene: {
        nodes: mq('you', 'api', 'usersdb', ['queue', { items: 2 }], ['w1', { meter: 40 }], ['w2', { meter: 40 }], 'email', ['dlq', { items: 1 }]),
        links: [...base, L('queue', 'w1'), L('queue', 'w2'), L('w1', 'email'), L('w2', 'email'), L('queue', 'dlq', { tone: 'bad', label: 'after 5 tries' })],
        flows: [F(['queue', 'w1', 'email'], { kind: 'event', ret: true }), F(['queue', 'w2'], { kind: 'error', ret: true, retKind: 'error', delay: 0.6 }), F(['queue', 'dlq'], { kind: 'error', delay: 2.2 })],
      },
    },
    {
      short: 'Recap',
      title: 'Queues, summed up',
      tag: 'Recap',
      body: [
        'A queue lets the request path **accept** work quickly while workers **do** it later, at their own pace. It buffers spikes and isolates you from slow or failing dependencies.',
        'Acknowledge after success, make handlers idempotent, cap retries with a dead-letter queue, and scale workers on backlog age.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'If the user doesn’t need the result to continue, it probably belongs on a queue.' },
      scene: {
        nodes: mq('you', 'api', 'usersdb', ['queue', { items: 2 }], ['w1', { meter: 40 }], ['w2', { meter: 40 }], 'email', 'dlq'),
        links: [...base, L('queue', 'w1'), L('queue', 'w2'), L('w1', 'email'), L('w2', 'email'), L('queue', 'dlq', { dashed: true })],
        flows: [F(['you', 'api'], { ret: true }), F(['api', 'queue'], { kind: 'event', delay: 0.6 }), F(['queue', 'w1', 'email'], { kind: 'event', delay: 1.2 }), F(['queue', 'w2', 'email'], { kind: 'event', delay: 1.8 })],
      },
      metrics: { lat: '45 ms', depth: '2', lost: '0' },
    },
  ],
};
