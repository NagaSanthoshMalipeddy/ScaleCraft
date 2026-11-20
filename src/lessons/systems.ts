import { BarChart3, Database, Gauge, HardDrive, Hash, Link2, Server, Split, Timer, User, Zap } from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

const us = cast({
  you: { kind: 'device', at: [-7, 0], tag: 'you', tagIcon: User },
  lb: { kind: 'cube', at: [-3.5, 0], label: 'LB', icon: Split, tone: 'green', size: 'sm' },
  app: { kind: 'cube', at: [0, 0], label: 'App', sub: 'stateless', icon: Server, tone: 'blue' },
  app2: { kind: 'cube', at: [0, 3.5], label: 'App', sub: '#2', icon: Server, tone: 'blue', size: 'sm' },
  ids: { kind: 'cube', at: [0, -4], label: 'IDs', sub: 'ranges', icon: Hash, tone: 'yellow', size: 'sm' },
  cache: { kind: 'cube', at: [3.5, -3.5], label: 'Cache', sub: 'hot codes', icon: Zap, tone: 'orange' },
  db: { kind: 'db', at: [3.5, 3.5], tag: 'links db', icon: Database },
  queue: { kind: 'queue', at: [7, 0], tag: 'click events', items: 3 },
  stats: { kind: 'slab', at: [7, 4.2], tag: 'analytics', icon: BarChart3, tone: 'violet' },
});

export const urlShortener: Lesson = {
  id: 'url-shortener',
  title: 'Design a URL Shortener',
  blurb: 'A first end-to-end design: from a one-line brief to a system serving billions of redirects.',
  minutes: 14,
  level: 'Advanced',
  keywords: ['system design interview', 'url shortener', 'base62', 'id generation', 'redirect', '301', '302', 'napkin math', 'capacity'],
  metrics: [
    { id: 'reads', label: 'Redirects', icon: Link2 },
    { id: 'writes', label: 'New links', icon: HardDrive },
    { id: 'p50', label: 'Redirect p50', icon: Timer },
    { id: 'db', label: 'DB load', icon: Gauge },
  ],
  learn: [
    { text: 'Turning a brief into numbers (napkin math)', at: 0 },
    { text: 'A minimal API', at: 1 },
    { text: 'Generating short codes without collisions', at: 2 },
    { text: 'Separate fast read and write paths', at: 4 },
    { text: 'Taking analytics off the hot path', at: 6 },
  ],
  steps: [
    {
      short: 'Brief',
      title: 'Start with the numbers',
      tag: 'Problem',
      body: [
        'Brief: “Turn long URLs into short ones, and redirect.” Assume **100M new links a month** and 10 reads per write.',
        'Napkin math: 100M / 2.6M seconds ≈ **40 writes/s**, ~400 redirects/s on average, maybe 4,000/s at peak. Five years × 500 bytes per link ≈ **3 TB**. Read-heavy, small records, modest storage.',
      ],
      callout: { kind: 'key', text: 'Napkin math tells you which problems are real. Here: reads dominate, so optimise the redirect path.' },
      scene: {
        nodes: us('you', 'app'),
        links: [L('you', 'app', { arrow: 'both' })],
        flows: [F(['you', 'app'], { ret: true })],
        notes: [
          { at: [-3.5, -4.2], text: '≈ 40 writes / s', icon: HardDrive },
          { at: [-3.5, -3.2], text: '≈ 400 reads / s (peak 4k)', icon: Link2 },
          { at: [-3.5, 3.4], text: '5 yrs × 500 B ≈ 3 TB', icon: Database },
        ],
      },
      metrics: { reads: '400 /s', writes: '40 /s', p50: '—', db: '—' },
    },
    {
      short: 'API',
      title: 'Two endpoints',
      tag: 'Technique',
      body: [
        '`POST /links {url}` → `{code: "aZ3kP9q"}` creates a link.',
        '`GET /aZ3kP9q` → `302 Found` with a `Location` header pointing at the long URL. The browser follows it.',
      ],
      scene: {
        nodes: us('you', 'app'),
        links: [L('you', 'app', { arrow: 'both', label: 'GET /aZ3kP9q' })],
        flows: [F(['you', 'app'], { ret: true })],
        notes: [{ at: [-3.5, 2.8], text: '302 → Location: https://…', tone: 'good' }],
      },
    },
    {
      short: 'Short codes',
      title: 'Seven characters, no collisions',
      tag: 'Technique',
      body: [
        'Use **base62** (a–z, A–Z, 0–9): 7 characters give 62⁷ ≈ **3.5 trillion** codes — centuries of headroom.',
        'Hashing the URL risks collisions. Instead, encode a unique number: each app server leases a block of 1,000 IDs from an **ID service**, then hands them out locally with no coordination.',
      ],
      callout: { kind: 'tip', text: 'Sequential codes are guessable. If that matters, shuffle the ID with a reversible permutation before encoding.' },
      changes: [{ sign: '+', text: 'ID range service' }],
      scene: {
        nodes: us('you', 'app', 'ids'),
        links: [L('you', 'app', { arrow: 'both' }), L('app', 'ids', { arrow: 'both', label: 'lease 1000' })],
        flows: [F(['app', 'ids'], { kind: 'data', ret: true, retKind: 'data' }), F(['you', 'app'], { ret: true, delay: 1.2 })],
        notes: [{ at: [4.2, 0], text: '125,000,017 → aZ3kP9q' }],
      },
    },
    {
      short: 'Write path',
      title: 'Store code → URL',
      tag: 'Technique',
      body: [
        'Creating a link: take an ID, encode it, and insert `(code, long_url, created_at)` into the database. Code is the primary key.',
        'At 40 writes/s, one well-indexed database (with a replica for safety) is plenty. A key-value store works just as well.',
      ],
      changes: [{ sign: '+', text: 'Links database' }],
      scene: {
        nodes: us('you', 'app', 'ids', ['db', { meter: 20 }]),
        links: [L('you', 'app', { arrow: 'both', label: 'POST /links' }), L('app', 'ids', { arrow: 'both' }), L('app', 'db', { label: 'INSERT' })],
        flows: [F(['you', 'app', 'db'], { kind: 'data', ret: true })],
      },
      metrics: { db: '20%' },
    },
    {
      short: 'Read path',
      title: 'Redirects from memory',
      tag: 'Technique',
      body: [
        'Redirects are 10× more frequent and follow a power law — a few links get most clicks. Put a **cache** in front: look up the code there first, fall back to the database on a miss.',
        'With a 98% hit ratio the database barely notices the read traffic, and a redirect takes a couple of milliseconds.',
      ],
      changes: [{ sign: '+', text: 'Cache for hot codes' }],
      scene: {
        nodes: us('you', 'app', 'ids', ['cache', { meter: 30 }], ['db', { meter: 12 }]),
        links: [L('you', 'app', { arrow: 'both', label: 'GET /aZ3kP9q' }), L('app', 'ids'), L('app', 'cache', { arrow: 'both', label: '98% hit' }), L('app', 'db', { arrow: 'both' })],
        flows: [F(['you', 'app', 'cache'], { ret: true, n: 3 }), F(['app', 'db'], { ret: true, delay: 1.6 })],
      },
      metrics: { p50: '4 ms', db: '12%' },
      hi: ['p50', 'db'],
    },
    {
      short: 'Scale out',
      title: 'More app servers, same design',
      tag: 'Technique',
      body: [
        'App servers hold no state — codes live in the database, hot ones in the cache, ID blocks are leased — so you can add servers behind a **load balancer** freely.',
        'A viral link at 50,000 clicks/s is just cache hits spread across servers.',
      ],
      changes: [{ sign: '+', text: 'Load balancer' }, { sign: '+', text: 'App #2' }],
      scene: {
        nodes: us('you', 'lb', ['app', { meter: 45 }], ['app2', { meter: 45 }], 'ids', ['cache', { meter: 55 }], ['db', { meter: 15 }]),
        links: [L('you', 'lb', { arrow: 'both' }), L('lb', 'app'), L('lb', 'app2'), L('app', 'ids'), L('app', 'cache', { arrow: 'both' }), L('app', 'db', { arrow: 'both' }), L('app2', 'db')],
        flows: [F(['you', 'lb', 'app', 'cache'], { ret: true, n: 2 }), F(['you', 'lb', 'app2'], { ret: true, n: 2, delay: 0.6 })],
      },
      metrics: { reads: '50k /s', p50: '4 ms' },
      hi: ['reads'],
    },
    {
      short: 'Analytics',
      title: 'Count clicks without slowing redirects',
      tag: 'Trade-off',
      body: [
        'Users want click stats. Writing a row per click on the redirect path would make redirects slower and hammer the database.',
        'Instead, publish a tiny **click event** to a queue and redirect immediately; consumers aggregate counts in an analytics store. Use `302`, not `301`: browsers cache 301s and you’d never see repeat clicks.',
      ],
      changes: [{ sign: '+', text: 'Click-event queue' }, { sign: '+', text: 'Analytics store' }],
      scene: {
        nodes: us('you', 'lb', ['app', { meter: 45 }], ['app2', { meter: 45 }], 'ids', ['cache', { meter: 55 }], ['db', { meter: 15 }], 'queue', 'stats'),
        links: [
          L('you', 'lb', { arrow: 'both' }),
          L('lb', 'app'),
          L('lb', 'app2'),
          L('app', 'ids'),
          L('app', 'cache', { arrow: 'both' }),
          L('app', 'db', { arrow: 'both' }),
          L('app2', 'db'),
          L('app', 'queue', { label: 'click' }),
          L('queue', 'stats'),
        ],
        flows: [F(['you', 'lb', 'app', 'cache'], { ret: true }), F(['app', 'queue', 'stats'], { kind: 'event', n: 2, delay: 0.8 })],
      },
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Numbers first: read-heavy, small, modest storage. Two endpoints. **Base62 codes** from leased ID ranges. A simple write path, a **cached** read path, stateless servers behind a balancer, and analytics pushed **off the hot path** through a queue.',
        'In an interview, explain each choice and what you would change if the numbers were 100× bigger.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Good designs follow the numbers: find the dominant path, make it fast, and move everything else out of its way.' },
      scene: {
        nodes: us('you', 'lb', ['app', { meter: 40 }], ['app2', { meter: 40 }], 'ids', ['cache', { meter: 50 }], ['db', { meter: 15 }], 'queue', 'stats'),
        links: [L('you', 'lb', { arrow: 'both' }), L('lb', 'app'), L('lb', 'app2'), L('app', 'ids'), L('app', 'cache', { arrow: 'both' }), L('app', 'db', { arrow: 'both' }), L('app2', 'db'), L('app', 'queue'), L('queue', 'stats')],
        flows: [F(['you', 'lb', 'app', 'cache'], { ret: true }), F(['you', 'lb', 'app2', 'db'], { kind: 'data', ret: true, delay: 0.8 }), F(['app', 'queue', 'stats'], { kind: 'event', delay: 1.4 })],
      },
      metrics: { reads: '50k /s', writes: '40 /s', p50: '4 ms', db: '15%' },
    },
  ],
};
