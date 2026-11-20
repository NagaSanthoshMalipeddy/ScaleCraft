import {
  Activity,
  ArrowDownUp,
  Binary,
  Clock,
  Copy,
  Crown,
  Database,
  GitMerge,
  Gauge,
  Hash,
  Hourglass,
  KeyRound,
  Laptop,
  Lock,
  Percent,
  Scale,
  Server,
  ShieldCheck,
  Shuffle,
  Ticket,
  Timer,
  Unplug,
  Users,
  Vote,
  Zap,
} from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* Consistent hashing                                                   */
/* ------------------------------------------------------------------ */

const ch = cast({
  app: { kind: 'cube', at: [0, 0], label: 'App', sub: 'hash(key)', icon: Hash, tone: 'blue' },
  a: { kind: 'cube', at: [4, -4], label: 'Cache A', icon: Zap, tone: 'orange' },
  e: { kind: 'cube', at: [4, 0], label: 'Cache E', icon: Zap, tone: 'green' },
  b: { kind: 'cube', at: [4, 4], label: 'Cache B', icon: Zap, tone: 'orange' },
  c: { kind: 'cube', at: [-4, 4], label: 'Cache C', icon: Zap, tone: 'orange' },
  d: { kind: 'cube', at: [-4, -4], label: 'Cache D', icon: Zap, tone: 'orange' },
  db: { kind: 'db', at: [-6.5, 0], tag: 'database', icon: Database, size: 'sm' },
});

const ring = { dashed: true, tone: 'muted' as const };
const ring4 = [L('a', 'b', ring), L('b', 'c', ring), L('c', 'd', ring), L('d', 'a', ring)];
const ring5 = [L('a', 'e', ring), L('e', 'b', ring), L('b', 'c', ring), L('c', 'd', ring), L('d', 'a', ring)];
const spokes4 = [L('app', 'a'), L('app', 'b'), L('app', 'c'), L('app', 'd')];
const spokes5 = [...spokes4, L('app', 'e')];
const spread5 = [
  F(['app', 'a'], { ret: true }),
  F(['app', 'e'], { ret: true, delay: 0.4 }),
  F(['app', 'b'], { ret: true, delay: 0.8 }),
  F(['app', 'c'], { ret: true, delay: 1.2 }),
  F(['app', 'd'], { ret: true, delay: 1.6 }),
];

export const consistentHashing: Lesson = {
  id: 'consistent-hashing',
  title: 'Consistent Hashing',
  blurb: 'Spread keys over a changing set of servers so that adding or losing one moves only a sliver of data.',
  minutes: 11,
  level: 'Intermediate',
  keywords: ['consistent hashing', 'hash ring', 'virtual nodes', 'vnodes', 'rebalancing', 'cache cluster', 'mod n', 'partitioning', 'dynamo'],
  metrics: [
    { id: 'hit', label: 'Cache hits', icon: Percent },
    { id: 'moved', label: 'Keys moved', icon: Shuffle },
    { id: 'db', label: 'DB load', icon: Database },
    { id: 'max', label: 'Busiest node', icon: Gauge },
  ],
  learn: [
    { text: 'Why hash mod N reshuffles almost everything', at: 0 },
    { text: 'How the hash ring assigns keys clockwise', at: 1 },
    { text: 'Adding a node moves only its neighbour’s slice', at: 2 },
    { text: 'Virtual nodes for even load', at: 4 },
    { text: 'Replicating to the next nodes on the ring', at: 5 },
  ],
  steps: [
    {
      short: 'mod N',
      title: 'Add one cache, lose most hits',
      tag: 'Problem',
      body: [
        'A shop caches product pages on 4 cache servers, picking one with `hash(key) mod 4`. Hit rate is **96%** and the database idles at 20%.',
        'Before a big sale the team adds a fifth server, so the formula becomes `mod 5`. A key keeps its server only if both formulas agree — about **1 in 5**. Hit rate crashes to ~20% and every miss lands on the database.',
      ],
      callout: { kind: 'warn', text: 'With mod N, changing N by one remaps roughly N/(N+1) of all keys — the bigger the cluster, the worse it gets.' },
      changes: [{ sign: '+', text: 'Cache E' }, { sign: '~', text: 'mod 4 → mod 5' }],
      scene: {
        nodes: ch(['app', { sub: 'mod 5' }], 'a', ['e', { sub: 'new' }], 'b', 'c', 'd', ['db', { meter: 100, status: 'hot' }]),
        links: [...spokes5, L('app', 'db', { tone: 'bad', label: 'misses' })],
        flows: [F(['app', 'db'], { kind: 'request', ret: true, n: 5, speed: 0.6 }), F(['app', 'a'], { ret: true, delay: 0.5 }), F(['app', 'e'], { ret: true, delay: 1.3 })],
        notes: [{ at: [0, -2.1], text: 'mod 4 → mod 5', icon: Hash, tone: 'warn' }, { at: [0, 2.2], text: '80% of keys now miss', tone: 'bad' }],
      },
      metrics: { hit: '20%', moved: '80%', db: '100%', max: '—' },
      bad: ['hit', 'moved', 'db'],
    },
    {
      short: 'The ring',
      title: 'Put servers and keys on a circle',
      tag: 'Technique',
      body: [
        'Imagine the hash output bent into a **ring** (here 0–99; really 0 to 2³²−1). Hash each server’s name to place it on the ring: A at 12, B at 37, C at 62, D at 87.',
        'To find a key’s home, hash the key and walk **clockwise** to the first server. `cart:42` hashes to 30, so it belongs to B. Each server owns the arc just before it.',
      ],
      changes: [{ sign: '-', text: 'Cache E (for now)' }, { sign: '+', text: 'Hash ring' }],
      scene: {
        nodes: ch(
          ['app', { sub: 'ring walk' }],
          ['a', { sub: 'owns 88–12' }],
          ['b', { sub: 'owns 13–37' }],
          ['c', { sub: 'owns 38–62' }],
          ['d', { sub: 'owns 63–87' }],
        ),
        links: [...spokes4, ...ring4],
        flows: [F(['a', 'b'], { kind: 'event', delay: 0.2, speed: 0.7 }), F(['app', 'b'], { ret: true, delay: 0.8 }), F(['app', 'd'], { ret: true, delay: 1.5 })],
        notes: [{ at: [0, -2.1], text: 'hash(cart:42) = 30', icon: Hash }, { at: [0, 2.2], text: '30 → clockwise → B', tone: 'good' }],
      },
      metrics: { hit: '96%', moved: '0%', db: '20%', max: '25%' },
      hi: ['hit', 'db'],
    },
    {
      short: 'Add a node',
      title: 'A new server takes one slice',
      tag: 'Technique',
      body: [
        'Cache E joins and hashes to position 25. Keys from 13 to 25 used to walk on to B; now they stop at E. **Only those keys move** — A, C and D don’t notice anything.',
        'About 12% of keys miss once and warm up on E. Removing a server works the same way in reverse: its arc simply falls to the next server clockwise.',
      ],
      callout: { kind: 'key', text: 'Membership changes only touch the arc next to the server that joined or left.' },
      changes: [{ sign: '+', text: 'Cache E at 25' }, { sign: '~', text: 'B’s arc shrinks' }],
      scene: {
        nodes: ch(
          ['app', { sub: 'ring walk' }],
          ['a', { sub: 'owns 88–12' }],
          ['e', { sub: 'owns 13–25' }],
          ['b', { sub: 'owns 26–37' }],
          ['c', { sub: 'owns 38–62' }],
          ['d', { sub: 'owns 63–87' }],
          ['db', { meter: 30 }],
        ),
        links: [...spokes5, ...ring5, L('app', 'db', { dashed: true })],
        flows: [F(['b', 'e'], { kind: 'data', n: 2, speed: 0.7 }), F(['app', 'e'], { ret: true, delay: 0.6 }), F(['app', 'db'], { kind: 'request', ret: true, delay: 1.2 }), F(['app', 'c'], { ret: true, delay: 1.6 })],
        notes: [{ at: [0, 2.2], text: 'only 13–25 moved', tone: 'good' }],
      },
      metrics: { hit: '88%', moved: '12%', db: '30%' },
      hi: ['hit', 'moved', 'db'],
    },
    {
      short: 'Lumpy',
      title: 'Random positions, uneven arcs',
      tag: 'Trade-off',
      body: [
        'Real hashes don’t land evenly spaced. With one point per server, arcs vary wildly: here C owns **41%** of the ring while A owns 9%. C runs hot while A idles.',
        'And when E joined it only relieved B. If C crashes, its whole 41% falls on D alone — a cascade waiting to happen.',
      ],
      scene: {
        nodes: ch(
          'app',
          ['a', { sub: 'owns 9%', meter: 18 }],
          ['e', { sub: 'owns 14%', meter: 28 }],
          ['b', { sub: 'owns 11%', meter: 22 }],
          ['c', { sub: 'owns 41%', meter: 92, status: 'hot' }],
          ['d', { sub: 'owns 25%', meter: 50 }],
        ),
        links: [...spokes5, ...ring5],
        flows: [F(['app', 'c'], { ret: true, n: 4, speed: 0.6 }), F(['app', 'd'], { ret: true, delay: 0.7 }), F(['app', 'a'], { ret: true, delay: 1.4 })],
        notes: [{ at: [0, 2.2], text: 'C carries 4× A’s load', tone: 'bad' }],
      },
      metrics: { max: '92%' },
      bad: ['max'],
    },
    {
      short: 'Vnodes',
      title: 'Many small points per server',
      tag: 'Technique',
      body: [
        'Give every server ~**128 virtual nodes**: hash `C#1`, `C#2`… and place each on the ring. Each server now owns many small arcs scattered everywhere, and the sizes average out to within a few percent.',
        'A new server steals a sliver from **every** other server — about 1/N of all keys in total — and a dead server’s load spreads across all survivors.',
      ],
      callout: { kind: 'tip', text: 'Give bigger machines more virtual nodes to weight them by capacity. More vnodes = smoother balance, bigger routing table.' },
      changes: [{ sign: '~', text: '1 point → 128 vnodes per server' }],
      scene: {
        nodes: ch(
          'app',
          ['a', { sub: '128 vnodes', meter: 40 }],
          ['e', { sub: '128 vnodes', meter: 41 }],
          ['b', { sub: '128 vnodes', meter: 39 }],
          ['c', { sub: '128 vnodes', meter: 42 }],
          ['d', { sub: '128 vnodes', meter: 40 }],
        ),
        links: [...spokes5, ...ring5],
        flows: spread5,
        notes: [{ at: [0, 2.2], text: 'each owns ≈ 20%', tone: 'good' }],
      },
      metrics: { moved: '20%', max: '42%' },
      hi: ['max'],
    },
    {
      short: 'Replicas',
      title: 'Copies on the next servers',
      tag: 'Technique',
      body: [
        'The ring also tells you where to keep **replicas**: store each key on its owner plus the next 2 distinct servers clockwise (skipping extra vnodes of the same machine).',
        '`cart:42` lives on B, C and D. If B dies, the next server on the ring already holds a copy, so reads keep working while the data re-replicates.',
      ],
      callout: { kind: 'tip', text: 'Distributed key-value stores in the Dynamo family use exactly this “preference list” for placement and failover.' },
      changes: [{ sign: '+', text: 'Replication factor 3' }],
      scene: {
        nodes: ch('app', ['a', { meter: 40 }], ['e', { meter: 41 }], ['b', { meter: 45, tag: 'owner' }], ['c', { meter: 46, tag: 'replica', tagIcon: Copy }], ['d', { meter: 44 }]),
        links: [L('app', 'b', { label: 'put cart:42' }), L('app', 'a'), L('app', 'c'), L('app', 'd'), L('app', 'e'), L('a', 'e', ring), L('e', 'b', ring), L('b', 'c', { tone: 'ink', label: 'copy 2' }), L('c', 'd', { tone: 'ink', label: 'copy 3' }), L('d', 'a', ring)],
        flows: [F(['app', 'b'], { kind: 'data' }), F(['b', 'c'], { kind: 'event', delay: 0.8 }), F(['c', 'd'], { kind: 'event', delay: 1.6 })],
        notes: [{ at: [0, -2.1], text: 'N = 3: B, C, D', icon: Copy }],
      },
    },
    {
      short: 'Recap',
      title: 'Consistent hashing, summed up',
      tag: 'Recap',
      body: [
        '`hash mod N` reshuffles nearly every key when N changes. A **hash ring** assigns each key to the next server clockwise, so a join or leave only moves one arc.',
        '**Virtual nodes** even out the arcs and spread churn across all servers; walking further clockwise gives natural **replica** placement.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Use consistent hashing whenever the set of servers changes over time — scaling and failures should move ~1/N of keys, not all of them.' },
      scene: {
        nodes: ch('app', ['a', { meter: 40 }], ['e', { meter: 41 }], ['b', { meter: 40 }], ['c', { meter: 42 }], ['d', { meter: 40 }], ['db', { meter: 20 }]),
        links: [...spokes5, ...ring5, L('app', 'db', { dashed: true })],
        flows: spread5,
      },
      metrics: { hit: '96%', moved: '20%', db: '20%', max: '42%' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Unique IDs at scale                                                  */
/* ------------------------------------------------------------------ */

const id = cast({
  s1: { kind: 'cube', at: [0, -4], label: 'App 1', icon: Server, tone: 'blue' },
  s2: { kind: 'cube', at: [0, 0], label: 'App 2', icon: Server, tone: 'blue' },
  s3: { kind: 'cube', at: [0, 4], label: 'App 3', icon: Server, tone: 'blue' },
  orders: { kind: 'db', at: [4, 0], tag: 'orders', icon: Database },
  counter: { kind: 'db', at: [-4, 0], tag: 'ID counter', icon: Hash, tone: 'violet' },
  coord: { kind: 'cube', at: [-4, 0], label: 'Coord', sub: 'worker ids', icon: KeyRound, tone: 'yellow' },
  ntp: { kind: 'slab', at: [4, -4], label: 'time sync', icon: Clock, tone: 'gray' },
});

const toOrders = [L('s1', 'orders'), L('s2', 'orders'), L('s3', 'orders')];
const localWrites = [
  F(['s1', 'orders'], { kind: 'data' }),
  F(['s2', 'orders'], { kind: 'data', delay: 0.5 }),
  F(['s3', 'orders'], { kind: 'data', delay: 1 }),
];

export const uniqueIds: Lesson = {
  id: 'unique-ids',
  title: 'Unique IDs at Scale',
  blurb: 'Hand out billions of unique, preferably sortable IDs without one counter that everyone waits on.',
  minutes: 10,
  level: 'Intermediate',
  keywords: ['unique id', 'auto increment', 'uuid', 'uuidv7', 'ulid', 'snowflake', 'clock skew', 'id generation', 'primary key'],
  metrics: [
    { id: 'cost', label: 'Cost per ID', icon: Timer },
    { id: 'size', label: 'ID size', icon: Binary },
    { id: 'sort', label: 'Time-ordered', icon: ArrowDownUp },
    { id: 'db', label: 'Insert load', icon: Gauge },
  ],
  learn: [
    { text: 'Why one central counter becomes a bottleneck', at: 0 },
    { text: 'Random UUIDs and index fragmentation', at: 2 },
    { text: 'Timestamp + machine + sequence IDs', at: 3 },
    { text: 'What clock skew does to generated IDs', at: 4 },
    { text: 'Leasing ID ranges to servers', at: 6 },
  ],
  steps: [
    {
      short: 'One counter',
      title: 'Everyone waits on one counter',
      tag: 'Problem',
      body: [
        'An order service runs on many app servers. Every new order asks a single **ID database** for the next `AUTO_INCREMENT` value, then writes the order.',
        'At 12,000 orders/s the counter is pinned at 95% — every ID costs a round trip and a durable write. When that one machine restarts, **nobody can create orders**.',
      ],
      callout: { kind: 'warn', text: 'A central counter is both a throughput ceiling and a single point of failure.' },
      scene: {
        nodes: id('s1', 's2', 's3', ['counter', { meter: 95, status: 'hot' }], ['orders', { meter: 35 }]),
        links: [L('s1', 'counter'), L('s2', 'counter', { label: 'next id?' }), L('s3', 'counter'), ...toOrders],
        flows: [
          F(['s1', 'counter'], { ret: true, n: 2, speed: 0.7 }),
          F(['s2', 'counter'], { ret: true, n: 2, speed: 0.7, delay: 0.4 }),
          F(['s3', 'counter'], { ret: true, n: 2, speed: 0.7, delay: 0.8 }),
          F(['s2', 'orders'], { kind: 'data', delay: 1.4 }),
        ],
      },
      metrics: { cost: '3 ms', size: '64 bit', sort: 'yes', db: '35%' },
      bad: ['cost'],
    },
    {
      short: 'UUIDv4',
      title: 'Random IDs need no one',
      tag: 'Technique',
      body: [
        'A **UUIDv4** is 122 random bits (plus version bits). Each server generates its own in under a microsecond — no network, no coordination, no single point of failure.',
        'Collisions are practically impossible: you would need around 10¹⁸ IDs for even odds of a single duplicate.',
      ],
      changes: [{ sign: '-', text: 'ID counter' }, { sign: '~', text: 'IDs generated locally' }],
      scene: {
        nodes: id(['s1', { sub: 'uuid v4' }], ['s2', { sub: 'uuid v4' }], ['s3', { sub: 'uuid v4' }], ['orders', { meter: 40 }]),
        links: toOrders,
        flows: localWrites,
        notes: [{ at: [-4, 0], text: '9f1c…e27a', icon: Hash }],
      },
      metrics: { cost: '< 1 µs', size: '128 bit', sort: 'no' },
      hi: ['cost'],
      bad: ['size', 'sort'],
    },
    {
      short: 'Fragmenting',
      title: 'Random keys scatter the index',
      tag: 'Trade-off',
      body: [
        'The primary key index is a **B-tree** kept in order. Sequential IDs append to its right edge; random UUIDs land on a random page every time.',
        'Pages split and sit half-empty, the index grows ~2× and stops fitting in memory, and inserts start reading from disk. Keys are also twice as wide in every secondary index.',
      ],
      scene: {
        nodes: id(['s1', { sub: 'uuid v4' }], ['s2', { sub: 'uuid v4' }], ['s3', { sub: 'uuid v4' }], ['orders', { meter: 88, status: 'hot', tag: 'page splits' }]),
        links: toOrders,
        flows: [F(['s1', 'orders'], { kind: 'data', n: 2, speed: 0.6 }), F(['s2', 'orders'], { kind: 'data', n: 2, speed: 0.6, delay: 0.5 }), F(['s3', 'orders'], { kind: 'data', n: 2, speed: 0.6, delay: 1 })],
        notes: [{ at: [4, 3.4], text: 'random page per insert', tone: 'bad' }],
      },
      metrics: { db: '88%' },
      bad: ['db'],
    },
    {
      short: 'Snowflake',
      title: 'Time + machine + sequence',
      tag: 'Technique',
      body: [
        'Pack a 64-bit ID as **41 bits of milliseconds** since a custom epoch (~69 years), **10 bits of worker id** (1,024 workers) and a **12-bit sequence** (4,096 IDs per ms per worker).',
        'Each server generates IDs from its own clock — no round trips. Worker ids are handed out once at startup, and IDs come out roughly in time order, so inserts append again.',
      ],
      changes: [{ sign: '+', text: 'Coordinator for worker ids' }, { sign: '~', text: '64-bit time-ordered IDs' }],
      scene: {
        nodes: id(['s1', { sub: 'worker 1' }], ['s2', { sub: 'worker 2' }], ['s3', { sub: 'worker 3' }], 'coord', ['orders', { meter: 40 }]),
        links: [L('coord', 's1', { dashed: true }), L('coord', 's2', { dashed: true, label: 'once, at boot' }), L('coord', 's3', { dashed: true }), ...toOrders],
        flows: [F(['coord', 's2'], { kind: 'handshake' }), ...localWrites],
        notes: [{ at: [4, 3.4], text: 'time 41 · node 10 · seq 12', icon: Binary }],
      },
      metrics: { cost: '< 1 µs', size: '64 bit', sort: 'roughly', db: '40%' },
      hi: ['size', 'sort', 'db'],
    },
    {
      short: 'Clock skew',
      title: 'When the clock runs backwards',
      tag: 'Trade-off',
      body: [
        'Time sync nudges App 2’s clock **back 30 ms**. If it kept generating, it could reuse a timestamp it already issued and produce **duplicate IDs**.',
        'Generators remember the last timestamp and refuse or wait while `now < last`. Even with correct clocks, servers drift by a few ms, so IDs are only *roughly* sorted across machines.',
      ],
      callout: { kind: 'warn', text: 'Never use these IDs to decide which of two events truly happened first on different machines.' },
      scene: {
        nodes: id(['s1', { sub: 'worker 1' }], ['s2', { sub: 'clock −30ms', status: 'hot' }], ['s3', { sub: 'worker 3' }], 'ntp', ['orders', { meter: 38 }]),
        links: [L('ntp', 's2', { tone: 'bad', label: 'step back 30 ms' }), L('ntp', 's1', { dashed: true }), ...toOrders],
        flows: [F(['ntp', 's2'], { kind: 'event' }), F(['s2', 'orders'], { kind: 'data', stop: true, delay: 0.6 }), F(['s1', 'orders'], { kind: 'data', delay: 0.3 }), F(['s3', 'orders'], { kind: 'data', delay: 1 })],
        notes: [{ at: [-3.6, 2.2], text: 'now < last → wait', icon: Hourglass, tone: 'warn' }],
      },
      metrics: { cost: 'stalls 30 ms' },
      bad: ['cost'],
    },
    {
      short: 'UUIDv7',
      title: 'Sortable without coordination',
      tag: 'Technique',
      body: [
        '**UUIDv7** keeps the 128-bit UUID format but starts with a 48-bit millisecond timestamp, followed by random bits. **ULID** is the same idea encoded as 26 sortable characters.',
        'No worker ids to assign, and inserts append to the index again. The cost: 16 bytes per key instead of 8.',
      ],
      callout: { kind: 'tip', text: 'Need a UUID-shaped key? Default to v7 over v4 for anything stored in an ordered index.' },
      changes: [{ sign: '-', text: 'Worker-id coordinator' }],
      scene: {
        nodes: id(['s1', { sub: 'uuid v7' }], ['s2', { sub: 'uuid v7' }], ['s3', { sub: 'uuid v7' }], ['orders', { meter: 42 }]),
        links: toOrders,
        flows: localWrites,
        notes: [{ at: [4, 3.4], text: 'time 48 · random 74', icon: Binary, tone: 'good' }],
      },
      metrics: { cost: '< 1 µs', size: '128 bit', sort: 'yes', db: '42%' },
      hi: ['cost', 'sort'],
    },
    {
      short: 'Ranges',
      title: 'Lease a block of IDs',
      tag: 'Technique',
      body: [
        'Want short, dense integers? A coordinator hands each server a **range** — say 1,000 IDs — and the server counts through it in memory, asking again only when it runs out.',
        'One round trip per thousand IDs instead of per ID. Crashed servers leave **gaps**, and IDs from different servers interleave instead of following time.',
      ],
      changes: [{ sign: '+', text: 'Range coordinator' }],
      scene: {
        nodes: id(['s1', { sub: '57000…' }], ['s2', { sub: '58000…' }], ['s3', { sub: '59000…' }], ['coord', { label: 'Ranges', sub: 'next block', icon: Ticket }], ['orders', { meter: 36 }]),
        links: [L('coord', 's1', { label: '57000–57999' }), L('coord', 's2', { label: '58000–58999' }), L('coord', 's3', { label: '59000–59999' }), ...toOrders],
        flows: [F(['coord', 's3'], { kind: 'data', delay: 0.2 }), F(['s1', 'orders'], { kind: 'data', n: 2 }), F(['s2', 'orders'], { kind: 'data', n: 2, delay: 0.5 }), F(['s3', 'orders'], { kind: 'data', n: 2, delay: 1 })],
      },
      metrics: { cost: '~0 (batched)', size: '64 bit', sort: 'no', db: '36%' },
    },
    {
      short: 'Recap',
      title: 'Unique IDs, summed up',
      tag: 'Recap',
      body: [
        'A single **auto-increment counter** is simple but caps throughput and fails as one. **UUIDv4** needs no coordination but scatters indexes.',
        'Time-prefixed IDs — **64-bit timestamp + worker + sequence**, or **UUIDv7/ULID** — are generated locally and stay sortable; watch for clock skew. Leased ranges give compact integers.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Generate IDs where the data is created, and put time at the front so your indexes stay happy.' },
      scene: {
        nodes: id(['s1', { sub: 'uuid v7' }], ['s2', { sub: 'uuid v7' }], ['s3', { sub: 'uuid v7' }], ['orders', { meter: 40 }]),
        links: toOrders,
        flows: localWrites,
      },
      metrics: { cost: '< 1 µs', size: '64–128 bit', sort: 'yes', db: '40%' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* CAP & consistency                                                    */
/* ------------------------------------------------------------------ */

const cp = cast({
  wu: { kind: 'device', at: [-6, 0], tag: 'west users', tagIcon: Laptop },
  w1: { kind: 'db', at: [-2, 0], tag: 'west-1', icon: Database },
  e1: { kind: 'db', at: [2, -4], tag: 'east-1', icon: Database },
  e2: { kind: 'db', at: [2, 4], tag: 'east-2', icon: Database },
  eu: { kind: 'crowd', at: [6, 0], tag: 'east users', tagIcon: Users, items: 5 },
});

const cutOpt = { dashed: true, tone: 'bad' as const };
const healthy = [L('wu', 'w1'), L('w1', 'e1', { dashed: true }), L('w1', 'e2', { dashed: true }), L('e1', 'e2', { dashed: true }), L('e1', 'eu'), L('e2', 'eu')];
const cut = [L('wu', 'w1'), L('w1', 'e1', { ...cutOpt, label: 'partition' }), L('w1', 'e2', cutOpt), L('e1', 'e2', { dashed: true }), L('e1', 'eu'), L('e2', 'eu')];
const dcNotes = [
  { at: [-2.6, -3.5] as [number, number], text: 'DC West · 1 replica' },
  { at: [5.4, -3.5] as [number, number], text: 'DC East · 2 replicas' },
];

export const cap: Lesson = {
  id: 'cap',
  title: 'CAP & Consistency',
  blurb: 'When the network between data centres breaks, you must pick: refuse requests or risk stale data.',
  minutes: 13,
  level: 'Advanced',
  keywords: ['cap theorem', 'partition', 'consistency', 'availability', 'quorum', 'eventual consistency', 'pacelc', 'crdt', 'version vector'],
  metrics: [
    { id: 'avail', label: 'West writes', icon: Activity },
    { id: 'cons', label: 'Consistency', icon: Scale },
    { id: 'lat', label: 'Write latency', icon: Timer },
    { id: 'conf', label: 'Conflicts', icon: GitMerge },
  ],
  learn: [
    { text: 'What a network partition forces you to choose', at: 1 },
    { text: 'Consistent (CP) vs available (AP) behaviour', at: 3 },
    { text: 'Quorums: why R + W > N gives fresh reads', at: 4 },
    { text: 'Resolving conflicts: LWW, version vectors, CRDTs', at: 5 },
    { text: 'PACELC: latency vs consistency without failures', at: 6 },
  ],
  steps: [
    {
      short: 'Partition',
      title: 'The link between DCs breaks',
      tag: 'Problem',
      body: [
        'An account service keeps **3 replicas**: one in a western data centre, two in an eastern one, ~90 ms apart. Every write is copied to all three.',
        'Then the inter-DC link fails for 4 minutes. Both sides are healthy and still serving users — they just **can’t talk to each other**. A west user changes their email. What should west-1 do?',
      ],
      scene: {
        nodes: cp('wu', 'w1', 'e1', 'e2', 'eu'),
        links: cut,
        flows: [F(['wu', 'w1'], { kind: 'data' }), F(['w1', 'e1'], { kind: 'event', stop: true, delay: 0.6 }), F(['w1', 'e2'], { kind: 'event', stop: true, delay: 0.6 }), F(['eu', 'e1'], { ret: true, delay: 1 })],
        notes: dcNotes,
      },
      metrics: { avail: '?', cons: '?', lat: '92 ms', conf: '0' },
    },
    {
      short: 'CAP',
      title: 'Consistent or available: pick one',
      tag: 'Insight',
      body: [
        'During a partition a replicated system can offer **Consistency** (every read sees the latest acknowledged write) or **Availability** (every live replica answers), but not both.',
        'Partitions aren’t optional across a WAN — cables, routers and configs fail. So the real question is what each side does **while** cut off.',
      ],
      callout: { kind: 'key', text: 'CAP is a choice made per operation during a partition — not a label you stick on a database forever.' },
      scene: {
        nodes: cp('wu', ['w1', { status: 'hot' }], 'e1', 'e2', 'eu'),
        links: cut,
        flows: [F(['wu', 'w1'], { kind: 'data', n: 2 }), F(['eu', 'e2'], { kind: 'data', n: 2, delay: 0.5 })],
        notes: [...dcNotes, { at: [-2.6, 3.4], text: 'refuse… or accept?', tone: 'warn' }],
      },
    },
    {
      short: 'Choose C',
      title: 'Minority side says no',
      tag: 'Technique',
      body: [
        'A **CP** system only accepts writes where a majority of replicas is reachable. East has 2 of 3, so it carries on. West-1 is alone, so it **rejects** writes (and fresh reads) with an error.',
        'No one ever sees two versions of the account. The price: west users are down until the link heals.',
      ],
      scene: {
        nodes: cp('wu', ['w1', { status: 'dim', tag: 'read-only' }], 'e1', 'e2', 'eu'),
        links: cut,
        flows: [F(['wu', 'w1'], { ret: true, retKind: 'error', n: 2 }), F(['eu', 'e1', 'e2'], { kind: 'data', delay: 0.4 })],
        notes: dcNotes,
      },
      metrics: { avail: '0%', cons: 'strong' },
      hi: ['cons'],
      bad: ['avail'],
    },
    {
      short: 'Choose A',
      title: 'Both sides keep writing',
      tag: 'Trade-off',
      body: [
        'An **AP** system lets every replica accept writes. West users stay happy; so do east users. But now the two sides **diverge**: they may hold different values for the same key.',
        'When the link heals, replicas exchange what they missed and must **reconcile** any key written on both sides.',
      ],
      scene: {
        nodes: cp('wu', ['w1', { tag: 'email = a@…' }], ['e1', { tag: 'email = b@…' }], 'e2', 'eu'),
        links: cut,
        flows: [F(['wu', 'w1'], { kind: 'data', ret: true }), F(['eu', 'e1'], { kind: 'data', ret: true, delay: 0.4 }), F(['e1', 'e2'], { kind: 'event', delay: 1 })],
        notes: dcNotes,
      },
      metrics: { avail: '100%', cons: 'eventual', conf: 'possible' },
      hi: ['avail'],
      bad: ['cons', 'conf'],
    },
    {
      short: 'Quorums',
      title: 'Overlapping reads and writes',
      tag: 'Technique',
      body: [
        'With **N** replicas, wait for **W** to confirm a write and ask **R** on a read. If **R + W > N**, every read set overlaps every write set, so at least one replica returns the newest version.',
        'N=3, W=2, R=2 tolerates one slow or dead replica. W=1, R=1 is fast and always available — and may read stale data.',
      ],
      callout: { kind: 'tip', text: 'Many stores let you choose R and W per request, so one system can be strict for payments and loose for view counts.' },
      changes: [{ sign: '~', text: 'Network healed' }],
      scene: {
        nodes: cp('wu', 'w1', ['e1', { tag: 'east-1 ✓' }], ['e2', { tag: 'east-2 ✓' }], 'eu'),
        links: [L('wu', 'w1'), L('w1', 'e1', { dashed: true }), L('w1', 'e2', { dashed: true }), L('e1', 'e2', { label: 'ack' }), L('e1', 'eu', { label: 'W = 2' }), L('e2', 'eu')],
        flows: [F(['eu', 'e1', 'e2'], { kind: 'data', ret: true }), F(['e1', 'w1'], { kind: 'event', delay: 0.9 }), F(['wu', 'w1'], { ret: true, delay: 1.4 })],
        notes: [{ at: [-2.6, -3.5], text: 'N=3 · W=2 · R=2', icon: Vote, tone: 'good' }],
      },
      metrics: { avail: '100%', cons: 'R+W>N', lat: '92 ms' },
      hi: ['cons'],
    },
    {
      short: 'Conflicts',
      title: 'Merging divergent writes',
      tag: 'Trade-off',
      body: [
        'In AP mode a shopper adds socks to their cart in the west and shoes in the east. **Last-write-wins** keeps whichever timestamp is later — the socks silently vanish, and skewed clocks can pick the wrong one.',
        '**Version vectors** detect that both writes were concurrent and keep both for the app to merge. **CRDTs** (sets, counters) merge automatically.',
      ],
      callout: { kind: 'warn', text: 'Last-write-wins is fine for “latest profile photo”, dangerous for carts, counters or balances.' },
      scene: {
        nodes: cp('wu', ['w1', { tag: '+ socks' }], ['e1', { tag: '+ shoes' }], ['e2', { tag: 'socks + shoes' }], 'eu'),
        links: [L('wu', 'w1'), L('w1', 'e1', { arrow: 'both', label: 'merge' }), L('w1', 'e2', { dashed: true }), L('e1', 'e2', { dashed: true }), L('e1', 'eu'), L('e2', 'eu')],
        flows: [F(['w1', 'e1'], { kind: 'event', ret: true, retKind: 'event' }), F(['e1', 'e2'], { kind: 'event', delay: 1 }), F(['eu', 'e2'], { ret: true, delay: 1.5 })],
        notes: [
          { at: [-2.6, -3.5], text: 'LWW: socks lost', tone: 'bad' },
          { at: [-2.6, 3.4], text: 'CRDT: socks + shoes', icon: GitMerge, tone: 'good' },
        ],
      },
      metrics: { conf: '1 merged' },
      hi: ['conf'],
    },
    {
      short: 'PACELC',
      title: 'No partition? Still a trade-off',
      tag: 'Insight',
      body: [
        '**PACELC**: if Partitioned, choose A or C; **Else**, choose **Latency** or **Consistency**. Waiting for a cross-ocean replica before acknowledging costs ~90 ms on every write — even on a perfect day.',
        'Acknowledging after the local copy takes ~3 ms, but a remote read may briefly be stale.',
      ],
      scene: {
        nodes: cp('wu', 'w1', 'e1', 'e2', 'eu'),
        links: [L('wu', 'w1', { label: '3 ms local' }), L('w1', 'e1', { label: '+90 ms' }), L('w1', 'e2', { dashed: true }), L('e1', 'e2', { dashed: true }), L('e1', 'eu'), L('e2', 'eu')],
        flows: [F(['wu', 'w1', 'e1'], { kind: 'data', ret: true, speed: 0.6 }), F(['w1', 'e2'], { kind: 'event', delay: 1.2 }), F(['eu', 'e2'], { ret: true, delay: 0.5 })],
        notes: dcNotes,
      },
      metrics: { lat: '92 vs 3 ms' },
    },
    {
      short: 'Recap',
      title: 'CAP & consistency, summed up',
      tag: 'Recap',
      body: [
        'During a partition, replicas either **refuse** requests to stay consistent or **accept** them and reconcile later. **Quorums** with R + W > N keep reads fresh while tolerating failed replicas.',
        'Eventual consistency needs a real **conflict** strategy — version vectors or CRDTs, not blind last-write-wins. And per **PACELC**, strong consistency costs latency every day.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Decide per operation what matters more when things break — correctness or answering — and make that choice explicit.' },
      scene: {
        nodes: cp('wu', 'w1', 'e1', 'e2', 'eu'),
        links: healthy,
        flows: [F(['wu', 'w1'], { kind: 'data', ret: true }), F(['w1', 'e1'], { kind: 'event', delay: 0.7 }), F(['w1', 'e2'], { kind: 'event', delay: 0.7 }), F(['eu', 'e1'], { ret: true, delay: 1.2 })],
        notes: dcNotes,
      },
      metrics: { avail: 'your call', cons: 'your call', lat: '3–92 ms', conf: 'merged' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Consensus & leaders                                                  */
/* ------------------------------------------------------------------ */

const cs = cast({
  client: { kind: 'device', at: [-4, -4], tag: 'client', tagIcon: Laptop },
  a: { kind: 'cube', at: [0, -4], label: 'Node A', sub: 'follower', icon: Server, tone: 'blue' },
  b: { kind: 'cube', at: [4, -4], label: 'Node B', sub: 'follower', icon: Server, tone: 'blue' },
  c: { kind: 'cube', at: [4, 0], label: 'Node C', sub: 'follower', icon: Server, tone: 'blue' },
  d: { kind: 'cube', at: [0, 4], label: 'Node D', sub: 'follower', icon: Server, tone: 'blue' },
  e: { kind: 'cube', at: [-4, 0], label: 'Node E', sub: 'follower', icon: Server, tone: 'blue' },
});

const leaderA = { sub: 'leader', icon: Crown, tone: 'yellow' as const };
const fromA = [L('a', 'b'), L('a', 'c'), L('a', 'd'), L('a', 'e')];
const beatsA = [
  F(['a', 'b'], { kind: 'handshake', ret: true }),
  F(['a', 'c'], { kind: 'handshake', ret: true, delay: 0.2 }),
  F(['a', 'd'], { kind: 'handshake', ret: true, delay: 0.4 }),
  F(['a', 'e'], { kind: 'handshake', ret: true, delay: 0.6 }),
];

export const consensus: Lesson = {
  id: 'consensus',
  title: 'Consensus & Leaders',
  blurb: 'Get a group of machines to agree on one leader and one history, even while some of them fail.',
  minutes: 13,
  level: 'Advanced',
  keywords: ['consensus', 'raft', 'leader election', 'split brain', 'quorum', 'majority', 'etcd', 'zookeeper', 'log replication'],
  metrics: [
    { id: 'leaders', label: 'Leaders', icon: Crown },
    { id: 'term', label: 'Term', icon: Hash },
    { id: 'commit', label: 'Commit time', icon: Timer },
    { id: 'lose', label: 'Can lose', icon: ShieldCheck },
  ],
  learn: [
    { text: 'Why two leaders (split brain) is dangerous', at: 0 },
    { text: 'Terms and majority-vote elections', at: 1 },
    { text: 'Committing log entries on a majority', at: 3 },
    { text: 'How many failures a cluster survives', at: 5 },
    { text: 'Using etcd/ZooKeeper instead of rolling your own', at: 6 },
  ],
  steps: [
    {
      short: 'Split brain',
      title: 'Two nodes think they’re in charge',
      tag: 'Problem',
      body: [
        'A billing scheduler runs on 5 nodes; exactly one should start the nightly charge run. The naive rule: “if I can’t reach the leader for 2 s, I become leader”.',
        'A network blip cuts A off from C. Now **both** believe they lead, both start the run, and 40,000 customers are **charged twice**. This is **split brain**.',
      ],
      scene: {
        nodes: cs('client', ['a', leaderA], 'b', ['c', { sub: 'leader?!', icon: Crown, tone: 'rose', status: 'hot' }], 'd', 'e'),
        links: [L('client', 'a'), L('a', 'b'), L('a', 'e'), L('a', 'c', { dashed: true, tone: 'bad', label: 'lost contact' }), L('c', 'd'), L('c', 'b')],
        flows: [F(['client', 'a'], { kind: 'data' }), F(['a', 'b'], { kind: 'event', delay: 0.4 }), F(['c', 'd'], { kind: 'event', delay: 0.6 }), F(['a', 'c'], { kind: 'handshake', stop: true, delay: 1 })],
        notes: [{ at: [4, 3.4], text: 'charged twice', tone: 'bad' }],
      },
      metrics: { leaders: '2', term: '—', commit: '—', lose: '—' },
      bad: ['leaders'],
    },
    {
      short: 'Election',
      title: 'Win a majority vote',
      tag: 'Technique',
      body: [
        'In **Raft**, time is divided into numbered **terms**. Each follower waits a random 150–300 ms; the first to time out becomes a candidate, bumps the term to 4, votes for itself and asks the others.',
        'Each node grants **one vote per term**. Whoever collects a **majority** (3 of 5) wins — two majorities always overlap, so a term can never have two leaders.',
      ],
      callout: { kind: 'key', text: 'Majorities overlap. That single fact is what makes “at most one leader per term” possible.' },
      changes: [{ sign: '~', text: 'Leadership decided by votes' }],
      scene: {
        nodes: cs('client', ['a', { sub: 'candidate', icon: Vote, tone: 'yellow' }], 'b', 'c', 'd', 'e'),
        links: [L('client', 'a', { dashed: true }), ...fromA],
        flows: [
          F(['a', 'b'], { kind: 'handshake', ret: true }),
          F(['a', 'c'], { kind: 'handshake', ret: true }),
          F(['a', 'd'], { kind: 'handshake', ret: true }),
          F(['a', 'e'], { kind: 'handshake', ret: true }),
        ],
        notes: [{ at: [4, 3.4], text: 'term 4 · votes 5/5', icon: Vote, tone: 'good' }],
      },
      metrics: { leaders: '1', term: '4' },
      hi: ['leaders'],
    },
    {
      short: 'Heartbeats',
      title: 'Heartbeats keep the peace',
      tag: 'Technique',
      body: [
        'The new leader sends a **heartbeat** to every follower about every 50 ms. Each heartbeat resets the follower’s election timer, so no one starts a rival election.',
        'If heartbeats stop arriving for longer than the timeout, followers assume the leader is gone and an election begins.',
      ],
      scene: {
        nodes: cs('client', ['a', leaderA], 'b', 'c', 'd', 'e'),
        links: [L('client', 'a'), L('a', 'b', { label: 'every 50 ms' }), L('a', 'c'), L('a', 'd'), L('a', 'e')],
        flows: beatsA,
      },
    },
    {
      short: 'Log',
      title: 'Commit once a majority has it',
      tag: 'Technique',
      body: [
        'The client sends `SET limit=500`. The leader appends it to its **log** at index 7 and sends it to the followers. As soon as **3 of 5** nodes (leader included) have stored it, the entry is **committed**.',
        'Only then is it applied and the client gets an OK. A slow follower — E here — catches up later without blocking anyone.',
      ],
      callout: { kind: 'tip', text: 'Commit latency is set by the median follower, not the slowest one — a big reason majorities are used.' },
      scene: {
        nodes: cs('client', ['a', { ...leaderA, tag: 'idx 7 ✓' }], ['b', { tag: 'idx 7 ✓' }], ['c', { tag: 'idx 7 ✓' }], 'd', ['e', { status: 'dim', tag: 'idx 5…' }]),
        links: [L('client', 'a', { label: 'SET limit=500' }), ...fromA],
        flows: [F(['client', 'a'], { kind: 'data', ret: true, speed: 0.7 }), F(['a', 'b'], { kind: 'data', ret: true, delay: 0.5 }), F(['a', 'c'], { kind: 'data', ret: true, delay: 0.5 }), F(['a', 'd'], { kind: 'data', delay: 0.5, speed: 0.5 }), F(['a', 'e'], { kind: 'data', delay: 0.5, speed: 0.3 })],
        notes: [{ at: [4, 3.4], text: 'committed: 3 of 5', tone: 'good' }],
      },
      metrics: { commit: '4 ms', lose: '2 nodes' },
      hi: ['commit', 'lose'],
    },
    {
      short: 'Partition',
      title: 'Old leader cut off, new one chosen',
      tag: 'Case',
      body: [
        'The network splits {A, B} from {C, D, E}. A still thinks it leads, but it can only reach 2 of 5 nodes, so **none of its new writes commit** — the client times out.',
        'On the other side C times out, starts **term 5** and wins 3 votes. When the network heals, A sees the higher term, **steps down** and drops its uncommitted entries.',
      ],
      callout: { kind: 'warn', text: 'A stale leader can exist for a moment, but without a majority it cannot change anything.' },
      changes: [{ sign: '~', text: 'Leader A → C (term 5)' }],
      scene: {
        nodes: cs('client', ['a', { sub: 'stale', icon: Crown, tone: 'gray', status: 'dim' }], 'b', ['c', { sub: 'leader', icon: Crown, tone: 'yellow' }], 'd', 'e'),
        links: [L('client', 'a'), L('a', 'b'), L('a', 'c', cutOpt), L('a', 'd', cutOpt), L('a', 'e', cutOpt), L('c', 'b', cutOpt), L('c', 'd'), L('c', 'e')],
        flows: [F(['client', 'a', 'b'], { kind: 'data' }), F(['a', 'd'], { kind: 'data', stop: true, delay: 0.7 }), F(['c', 'd'], { kind: 'handshake', ret: true, delay: 0.3 }), F(['c', 'e'], { kind: 'handshake', ret: true, delay: 0.5 })],
        notes: [{ at: [4, 3.4], text: 'term 5 · 3 votes', icon: Vote, tone: 'good' }, { at: [-4, 3.4], text: 'A: can’t commit', icon: Unplug, tone: 'bad' }],
      },
      metrics: { leaders: '1', term: '5', commit: '~300 ms gap' },
      bad: ['commit'],
    },
    {
      short: 'Failures',
      title: 'Five nodes survive two failures',
      tag: 'Insight',
      body: [
        'A cluster of **2f + 1** nodes tolerates **f** failures: 3 nodes survive 1, 5 survive 2, 7 survive 3. Here A and B are down; C, D and E still form a majority and keep committing.',
        'Lose a third node and no majority exists: the cluster **stops accepting writes** rather than risk disagreeing. Even sizes don’t help — 4 nodes still only survive 1.',
      ],
      changes: [{ sign: '-', text: 'Nodes A and B' }],
      scene: {
        nodes: cs(['client', { tag: 'client' }], ['a', { status: 'down', sub: 'down', icon: Server }], ['b', { status: 'down', sub: 'down' }], ['c', { sub: 'leader', icon: Crown, tone: 'yellow' }], 'd', 'e'),
        links: [L('c', 'b', cutOpt), L('c', 'd'), L('c', 'e', { label: 'heartbeat' })],
        flows: [F(['c', 'd'], { kind: 'data', ret: true }), F(['c', 'e'], { kind: 'data', ret: true, delay: 0.4 }), F(['c', 'b'], { kind: 'handshake', stop: true, delay: 0.8 })],
        notes: [{ at: [4, 3.4], text: '3 of 5 alive = majority', tone: 'good' }],
      },
      metrics: { commit: '4 ms', lose: '0 more' },
      hi: ['commit'],
      bad: ['lose'],
    },
    {
      short: 'In practice',
      title: 'Borrow consensus, don’t build it',
      tag: 'Case',
      body: [
        'Correct consensus is notoriously hard to implement. Most teams run a small **coordination service** — etcd, ZooKeeper or Consul — and use its leases, locks and watches.',
        'Pair a lease with a **fencing token**: an ever-increasing number the storage layer checks, so a leader that wakes from a long pause can’t write with an old token.',
      ],
      callout: { kind: 'tip', text: 'Keep the coordination cluster small (3 or 5 nodes) and store only metadata in it — it is slow by design.' },
      changes: [{ sign: '~', text: 'Nodes now an etcd-style cluster' }],
      scene: {
        nodes: cs(
          ['client', { tag: 'scheduler', tagIcon: Lock }],
          ['a', { ...leaderA, label: 'etcd 1' }],
          ['b', { label: 'etcd 2' }],
          ['c', { label: 'etcd 3' }],
          ['d', { label: 'etcd 4' }],
          ['e', { label: 'etcd 5' }],
        ),
        links: [L('client', 'a', { label: 'lease · token 42' }), ...fromA],
        flows: [F(['client', 'a'], { kind: 'request', ret: true }), F(['a', 'b'], { kind: 'data', delay: 0.6 }), F(['a', 'c'], { kind: 'data', delay: 0.6 }), F(['a', 'd'], { kind: 'data', delay: 0.6 }), F(['a', 'e'], { kind: 'data', delay: 0.6 })],
      },
      metrics: { leaders: '1', commit: '4 ms', lose: '2 nodes' },
      hi: ['lose'],
    },
    {
      short: 'Recap',
      title: 'Consensus, summed up',
      tag: 'Recap',
      body: [
        'Leaders are elected per **term** by **majority vote**, and **heartbeats** keep them in place. A log entry is **committed** once a majority stores it, so it survives any later election.',
        'With 2f + 1 nodes you survive f failures; without a majority the cluster pauses instead of diverging. In practice, lean on etcd or ZooKeeper.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Overlapping majorities give you one leader and one history. Never let a node lead just because it can’t see the old leader.' },
      scene: {
        nodes: cs('client', ['a', leaderA], 'b', 'c', 'd', 'e'),
        links: [L('client', 'a'), ...fromA],
        flows: [F(['client', 'a'], { kind: 'data', ret: true }), ...beatsA],
      },
      metrics: { leaders: '1', term: '4', commit: '4 ms', lose: '2 nodes' },
    },
  ],
};

