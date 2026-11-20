import { Activity, Clock, Copy, Crown, Database, Gauge, HardDrive, Hash, Layers, Route, Server, SplitSquareHorizontal } from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* Replication                                                          */
/* ------------------------------------------------------------------ */

const rp = cast({
  app: { kind: 'cube', at: [-5, 0], label: 'App', icon: Server, tone: 'blue' },
  primary: { kind: 'db', at: [-1.5, -3.5], tag: 'primary', tagIcon: Crown, icon: Database },
  r1: { kind: 'db', at: [-1.5, 3.5], tag: 'replica 1', tagIcon: Copy, icon: Database, tone: 'teal' },
  r2: { kind: 'db', at: [2, 0], tag: 'replica 2', tagIcon: Copy, icon: Database, tone: 'teal' },
});

const rpLinks = [
  L('app', 'primary', { label: 'writes' }),
  L('app', 'r1', { label: 'reads' }),
  L('app', 'r2'),
  L('primary', 'r1', { dashed: true, tone: 'ink' }),
  L('primary', 'r2', { dashed: true, tone: 'ink', label: 'change log' }),
];

export const replication: Lesson = {
  id: 'replication',
  title: 'Replication',
  blurb: 'Keep copies of the database on several machines — for more reads, and for surviving failures.',
  minutes: 10,
  level: 'Intermediate',
  keywords: ['replication', 'primary', 'replica', 'leader', 'follower', 'replication lag', 'failover', 'read your writes', 'synchronous'],
  metrics: [
    { id: 'reads', label: 'Read capacity', icon: Activity },
    { id: 'lag', label: 'Replica lag', icon: Clock },
    { id: 'load', label: 'Primary load', icon: Gauge },
  ],
  learn: [
    { text: 'Primary/replica: writes to one, reads from many', at: 1 },
    { text: 'What replication lag looks like to users', at: 2 },
    { text: 'Read-your-own-writes consistency', at: 3 },
    { text: 'Sync vs async replication trade-off', at: 4 },
    { text: 'Failover and what can be lost', at: 5 },
  ],
  steps: [
    {
      short: 'One DB',
      title: 'One database, two problems',
      tag: 'Problem',
      body: [
        'A recipe site’s single database handles everything. 90% of queries are reads (“show recipe”), and it’s at **88% CPU**.',
        'Worse: if that one machine dies, the site is down and the latest data may be gone.',
      ],
      scene: {
        nodes: rp('app', ['primary', { meter: 88, status: 'hot', tag: 'database', tagIcon: undefined }]),
        links: [L('app', 'primary', { arrow: 'both' })],
        flows: [F(['app', 'primary'], { ret: true, n: 4, speed: 0.8 })],
      },
      metrics: { reads: '1×', lag: '—', load: '88%' },
      bad: ['load'],
    },
    {
      short: 'Replicas',
      title: 'Write to one, read from many',
      tag: 'Technique',
      body: [
        'Promote the database to **primary** and add two **replicas**. The primary streams its change log to them, and they replay every change in order.',
        'The app sends writes to the primary and spreads reads across replicas. Read capacity triples.',
      ],
      changes: [{ sign: '+', text: '2 read replicas' }, { sign: '+', text: 'Change-log streaming' }],
      scene: {
        nodes: rp('app', ['primary', { meter: 35 }], ['r1', { meter: 30 }], ['r2', { meter: 30 }]),
        links: rpLinks,
        flows: [
          F(['app', 'primary'], { kind: 'data', delay: 0.2 }),
          F(['primary', 'r1'], { kind: 'event', delay: 1.0 }),
          F(['primary', 'r2'], { kind: 'event', delay: 1.0 }),
          F(['app', 'r1'], { ret: true, n: 2, delay: 0.5 }),
          F(['app', 'r2'], { ret: true, n: 2, delay: 0.9 }),
        ],
      },
      metrics: { reads: '3×', lag: '40 ms', load: '35%' },
      hi: ['reads', 'load'],
    },
    {
      short: 'Lag',
      title: '“Where did my comment go?”',
      tag: 'Problem',
      body: [
        'Replication is usually **asynchronous**: the primary confirms the write before replicas have it. Normally they’re 10–100 ms behind; under heavy load, seconds.',
        'A user posts a comment, the page reloads from a lagging replica — and the comment isn’t there yet.',
      ],
      scene: {
        nodes: rp('app', ['primary', { meter: 60 }], ['r1', { meter: 70 }], ['r2', { meter: 40 }]),
        links: rpLinks,
        flows: [F(['app', 'primary'], { kind: 'data', delay: 0.1 }), F(['primary', 'r1'], { kind: 'event', delay: 0.4, speed: 0.25 }), F(['app', 'r1'], { ret: true, delay: 0.9 })],
        notes: [{ at: [-5.2, 3.5], text: 'comment missing!', tone: 'bad' }],
      },
      metrics: { lag: '2.5 s' },
      bad: ['lag'],
    },
    {
      short: 'Your writes',
      title: 'Read your own writes',
      tag: 'Technique',
      body: [
        'Users mostly care about seeing **their own** changes. After a user writes, route that user’s reads to the primary for a few seconds — or until replicas confirm they’ve caught up to the write’s log position.',
        'Everyone else keeps reading from replicas.',
      ],
      scene: {
        nodes: rp('app', ['primary', { meter: 40 }], ['r1', { meter: 45 }], ['r2', { meter: 40 }]),
        links: [L('app', 'primary', { arrow: 'both', label: 'writes + your reads' }), L('app', 'r1'), L('app', 'r2', { label: 'everyone else' }), L('primary', 'r1', { dashed: true }), L('primary', 'r2', { dashed: true })],
        flows: [F(['app', 'primary'], { kind: 'data', delay: 0.1 }), F(['app', 'primary'], { ret: true, delay: 1.0 }), F(['app', 'r2'], { ret: true, n: 2, delay: 0.5 })],
      },
      metrics: { lag: '2.5 s' },
    },
    {
      short: 'Sync vs async',
      title: 'Wait for replicas, or don’t?',
      tag: 'Trade-off',
      body: [
        '**Synchronous**: the primary waits for a replica to confirm before acknowledging. No acknowledged write is lost if the primary dies — but every write pays an extra round trip, and a slow replica slows everyone.',
        '**Asynchronous**: fast writes, but the last moments of writes can be lost on failure. Many systems pick one sync replica and the rest async.',
      ],
      scene: {
        nodes: rp('app', ['primary', { meter: 40 }], ['r1', { meter: 30, tag: 'replica 1 · sync' }], ['r2', { meter: 30, tag: 'replica 2 · async' }]),
        links: [...rpLinks.slice(0, 3), L('primary', 'r1', { arrow: 'both', label: 'ack' }), L('primary', 'r2', { dashed: true })],
        flows: [F(['app', 'primary', 'r1'], { kind: 'data', ret: true, retKind: 'response' }), F(['primary', 'r2'], { kind: 'event', delay: 1.4 })],
      },
    },
    {
      short: 'Failover',
      title: 'The primary dies',
      tag: 'Case',
      body: [
        'At 3 a.m. the primary’s disk fails. A coordinator notices missed heartbeats, picks the most up-to-date replica and **promotes** it to primary. The app reconnects.',
        'With async replication, writes the old primary acknowledged but never shipped are lost. Fencing stops the old primary from accepting writes if it comes back.',
      ],
      callout: { kind: 'warn', text: 'Practice failovers. A failover path that has never been exercised is a theory, not a plan.' },
      changes: [{ sign: '-', text: 'Old primary' }, { sign: '~', text: 'Replica 1 → primary' }],
      scene: {
        nodes: rp('app', ['primary', { status: 'down', tag: 'old primary' }], ['r1', { tag: 'new primary', tagIcon: Crown, tone: 'violet', meter: 45 }], ['r2', { meter: 35 }]),
        links: [L('app', 'primary', { dashed: true, tone: 'bad' }), L('app', 'r1', { label: 'writes + reads' }), L('app', 'r2'), L('r1', 'r2', { dashed: true, elbow: true, first: 'v' })],
        flows: [F(['app', 'r1'], { kind: 'data', ret: true, n: 2 }), F(['app', 'r2'], { ret: true, delay: 0.7 })],
      },
      metrics: { reads: '2×', load: '45%' },
    },
    {
      short: 'Recap',
      title: 'Replication, summed up',
      tag: 'Recap',
      body: [
        'Replicas multiply **read capacity** and give you a **standby** for failover. Writes still go to one primary.',
        'The price is **lag**: design for read-your-writes where it matters, choose sync vs async deliberately, and rehearse failover.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Replication scales reads and survival — not writes. For writes, you need sharding.' },
      scene: {
        nodes: rp('app', ['primary', { meter: 35 }], ['r1', { meter: 30 }], ['r2', { meter: 30 }]),
        links: rpLinks,
        flows: [F(['app', 'primary'], { kind: 'data' }), F(['primary', 'r1'], { kind: 'event', delay: 0.8 }), F(['primary', 'r2'], { kind: 'event', delay: 0.8 }), F(['app', 'r1'], { ret: true, delay: 0.4 }), F(['app', 'r2'], { ret: true, delay: 1.0 })],
      },
      metrics: { reads: '3×', lag: '40 ms', load: '35%' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Sharding                                                             */
/* ------------------------------------------------------------------ */

const sh = cast({
  app: { kind: 'cube', at: [-5.5, 0], label: 'App', icon: Server, tone: 'blue' },
  router: { kind: 'cube', at: [-2, 0], label: 'Router', sub: 'shard map', icon: Route, tone: 'yellow' },
  s1: { kind: 'db', at: [1.5, -3.5], tag: 'shard 1', icon: Database },
  s2: { kind: 'db', at: [3.5, -1.5], tag: 'shard 2', icon: Database },
  s3: { kind: 'db', at: [5.5, 0.5], tag: 'shard 3', icon: Database },
  s4: { kind: 'db', at: [7.5, 2.5], tag: 'shard 4', icon: Database, tone: 'green' },
  big: { kind: 'db', at: [1.5, -3.5], tag: 'one big DB', icon: HardDrive, size: 'lg' },
});

const shLinks = [L('app', 'router'), L('router', 's1'), L('router', 's2'), L('router', 's3')];

export const sharding: Lesson = {
  id: 'sharding',
  title: 'Sharding',
  blurb: 'When the data or the writes outgrow one machine, split them across many.',
  minutes: 11,
  level: 'Intermediate',
  keywords: ['sharding', 'partitioning', 'shard key', 'hash', 'range', 'hot spot', 'resharding', 'consistent hashing', 'scatter gather'],
  metrics: [
    { id: 'writes', label: 'Write capacity', icon: Activity },
    { id: 'hot', label: 'Hottest shard', icon: Gauge },
    { id: 'moved', label: 'Data moved', icon: Layers },
  ],
  learn: [
    { text: 'Why replicas don’t help with writes', at: 0 },
    { text: 'Range-based sharding and hot spots', at: 2 },
    { text: 'Hash-based sharding', at: 3 },
    { text: 'The cost of cross-shard queries', at: 4 },
    { text: 'Why resharding is hard (and consistent hashing)', at: 5 },
  ],
  steps: [
    {
      short: 'Too big',
      title: 'The database won’t fit',
      tag: 'Problem',
      body: [
        'A messaging app stores 6 TB of messages and takes **40,000 writes per second**. Every write must go to the primary, and no single machine can keep up.',
        'Replicas don’t help: each replica has to apply every write too.',
      ],
      scene: {
        nodes: sh('app', ['big', { meter: 98, status: 'hot' }]),
        links: [L('app', 'big', { arrow: 'both', label: '40k writes/s' })],
        flows: [F(['app', 'big'], { kind: 'data', n: 6, speed: 0.8 })],
      },
      metrics: { writes: '1×', hot: '98%', moved: '—' },
      bad: ['hot'],
    },
    {
      short: 'Split',
      title: 'Split the data by a key',
      tag: 'Technique',
      body: [
        'Pick a **shard key** — here, `user_id` — and give each database (shard) a slice of users. Each shard is a normal database with its own replicas.',
        'A router (or the app itself) uses the shard map to send each query to the right shard. Writes spread three ways.',
      ],
      changes: [{ sign: '+', text: '3 shards' }, { sign: '+', text: 'Shard router' }],
      scene: {
        nodes: sh('app', 'router', ['s1', { meter: 33 }], ['s2', { meter: 33 }], ['s3', { meter: 33 }]),
        links: shLinks,
        flows: [F(['app', 'router', 's1'], { kind: 'data' }), F(['app', 'router', 's2'], { kind: 'data', delay: 0.7 }), F(['app', 'router', 's3'], { kind: 'data', delay: 1.4 })],
      },
      metrics: { writes: '3×', hot: '34%' },
      hi: ['writes', 'hot'],
    },
    {
      short: 'Ranges',
      title: 'Ranges are simple — and lumpy',
      tag: 'Trade-off',
      body: [
        '**Range sharding**: users 1–1M on shard 1, 1M–2M on shard 2, 2M+ on shard 3. Range scans are easy and the map is tiny.',
        'But new users get the newest IDs, and new users are the most active. Shard 3 takes most of the writes — a **hot spot**.',
      ],
      scene: {
        nodes: sh('app', 'router', ['s1', { meter: 12 }], ['s2', { meter: 25 }], ['s3', { meter: 94, status: 'hot' }]),
        links: [L('app', 'router'), L('router', 's1', { label: 'ids 1 – 1M' }), L('router', 's2', { label: '1M – 2M' }), L('router', 's3', { label: '2M +' })],
        flows: [F(['app', 'router', 's3'], { kind: 'data', n: 4 }), F(['app', 'router', 's2'], { kind: 'data', delay: 1.2 })],
      },
      metrics: { hot: '94%' },
      bad: ['hot'],
    },
    {
      short: 'Hashing',
      title: 'Hash the key to spread it',
      tag: 'Technique',
      body: [
        '**Hash sharding**: shard = `hash(user_id) mod 3`. Neighbouring IDs land on different shards, so load spreads evenly even when new users are busiest.',
        'You lose cheap range scans: “all users created this week” now touches every shard.',
      ],
      callout: { kind: 'tip', text: 'Pick a shard key that appears in almost every query and has many distinct, evenly used values.' },
      scene: {
        nodes: sh('app', ['router', { icon: Hash, sub: 'hash mod 3' }], ['s1', { meter: 34 }], ['s2', { meter: 33 }], ['s3', { meter: 35 }]),
        links: shLinks,
        flows: [F(['app', 'router', 's1'], { kind: 'data', n: 2 }), F(['app', 'router', 's2'], { kind: 'data', n: 2, delay: 0.5 }), F(['app', 'router', 's3'], { kind: 'data', n: 2, delay: 1 })],
      },
      metrics: { hot: '35%' },
      hi: ['hot'],
    },
    {
      short: 'Fan-out',
      title: 'Queries that touch every shard',
      tag: 'Trade-off',
      body: [
        '“Top 10 trending messages” isn’t keyed by user, so the router must ask **every** shard and merge the answers (scatter-gather).',
        'The query is as slow as the slowest shard, and its cost grows with the number of shards. Design hot queries around the shard key, or precompute them elsewhere.',
      ],
      scene: {
        nodes: sh('app', ['router', { icon: SplitSquareHorizontal, sub: 'scatter' }], ['s1', { meter: 50 }], ['s2', { meter: 52 }], ['s3', { meter: 80 }]),
        links: shLinks,
        flows: [F(['app', 'router', 's1'], { ret: true }), F(['app', 'router', 's2'], { ret: true }), F(['app', 'router', 's3'], { ret: true, speed: 0.6 })],
        notes: [{ at: [8.5, 0.5], text: 'slowest = 120 ms', tone: 'bad' }],
      },
    },
    {
      short: 'Resharding',
      title: 'Adding a fourth shard',
      tag: 'Case',
      body: [
        'Growth continues; time for shard 4. With `hash mod N`, changing N from 3 to 4 changes the shard for **~75% of all keys** — terabytes on the move.',
        '**Consistent hashing** (or many small virtual shards mapped to machines) means adding a machine moves only ~1/N of the data.',
      ],
      changes: [{ sign: '+', text: 'Shard 4' }, { sign: '~', text: 'Rebalancing data' }],
      scene: {
        nodes: sh('app', ['router', { icon: Hash, sub: 'ring' }], ['s1', { meter: 30 }], ['s2', { meter: 30 }], ['s3', { meter: 30 }], ['s4', { meter: 20 }]),
        links: [...shLinks, L('router', 's4'), L('s3', 's4', { dashed: true, elbow: false })],
        flows: [F(['app', 'router', 's4'], { kind: 'data', delay: 0.3 }), F(['app', 'router', 's1'], { kind: 'data', delay: 0.9 }), F(['s3', 's4'], { kind: 'event', n: 2 })],
        notes: [{ at: [-3.6, 4.5], text: 'mod N: ~75% keys move', tone: 'bad' }, { at: [-3.6, 5.5], text: 'consistent: ~25% move', tone: 'good' }],
      },
      metrics: { writes: '4×', moved: '25%' },
      hi: ['writes', 'moved'],
    },
    {
      short: 'Recap',
      title: 'Sharding, summed up',
      tag: 'Recap',
      body: [
        'Sharding splits data by a **shard key** so writes and storage scale with the number of machines.',
        'The key decides everything: range keys risk hot spots, hash keys lose range scans, cross-shard queries fan out, and resharding moves data — so plan with consistent hashing or virtual shards.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Shard late, shard on the key your queries already use, and make adding a shard boring.' },
      scene: {
        nodes: sh('app', ['router', { icon: Hash, sub: 'ring' }], ['s1', { meter: 25 }], ['s2', { meter: 25 }], ['s3', { meter: 25 }], ['s4', { meter: 25 }]),
        links: [...shLinks, L('router', 's4')],
        flows: [
          F(['app', 'router', 's1'], { kind: 'data' }),
          F(['app', 'router', 's2'], { kind: 'data', delay: 0.5 }),
          F(['app', 'router', 's3'], { kind: 'data', delay: 1 }),
          F(['app', 'router', 's4'], { kind: 'data', delay: 1.5 }),
        ],
      },
      metrics: { writes: '4×', hot: '25%', moved: '25%' },
    },
  ],
};

