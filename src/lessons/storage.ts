import {
  Activity,
  BookOpen,
  Braces,
  ClipboardList,
  Columns3,
  Copy,
  Database,
  Funnel,
  HardDrive,
  KeyRound,
  Layers,
  ListTree,
  Lock,
  MemoryStick,
  PenLine,
  PowerOff,
  Rows3,
  ScrollText,
  Search,
  Server,
  ShieldCheck,
  Table2,
  Timer,
  Users,
} from 'lucide-react';
import type { Lesson, SceneNode } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* SQL vs NoSQL                                                         */
/* ------------------------------------------------------------------ */

const sn = cast({
  users: { kind: 'crowd', at: [-4.5, 0], tag: 'diners', tagIcon: Users, items: 5 },
  app: { kind: 'cube', at: [0, 0], label: 'App', sub: 'delivery', icon: Server, tone: 'blue' },
  rel: { kind: 'db', at: [-4, -4], tag: 'relational', icon: Table2 },
  doc: { kind: 'db', at: [4, -4], tag: 'document', icon: Braces, tone: 'sand' },
  kv: { kind: 'slab', at: [4, 4], tag: 'key-value', icon: KeyRound, tone: 'orange' },
  wide: { kind: 'slab', at: [-4, 4], tag: 'wide-column', icon: Columns3, tone: 'yellow' },
});

const snLinks = (focus?: Store) => [
  L('users', 'app'),
  ...(['rel', 'doc', 'kv', 'wide'] as const).map((id) => L('app', id, { arrow: 'both', dashed: !!focus && focus !== id, tone: focus && focus !== id ? 'muted' : 'ink' })),
];

type Store = 'rel' | 'doc' | 'kv' | 'wide';
const dimExcept = (focus: Store, over: Partial<SceneNode> = {}) =>
  sn('users', 'app', ...(['rel', 'doc', 'kv', 'wide'] as const).map((id): [Store, Partial<SceneNode>] => [id, id === focus ? over : { status: 'dim' }]));

export const sqlNosql: Lesson = {
  id: 'sql-nosql',
  title: 'SQL vs NoSQL',
  blurb: 'Tables, documents, keys and columns — four data models, and how to pick one by the queries you’ll run.',
  minutes: 10,
  level: 'Beginner',
  keywords: ['sql', 'nosql', 'relational', 'document store', 'key-value', 'wide-column', 'schema', 'acid', 'joins', 'data model'],
  metrics: [
    { id: 'model', label: 'Model', icon: Database },
    { id: 'query', label: 'Queries', icon: Search },
    { id: 'txn', label: 'Transactions', icon: ShieldCheck },
    { id: 'scale', label: 'Write scale', icon: Activity },
  ],
  learn: [
    { text: 'What tables, schemas, joins and transactions buy you', at: 1 },
    { text: 'When a nested document fits better', at: 2 },
    { text: 'Key-value stores for single-key lookups', at: 3 },
    { text: 'Wide-column stores and query-first modelling', at: 4 },
    { text: 'Choosing by access pattern, not hype', at: 5 },
  ],
  steps: [
    {
      short: 'Four kinds',
      title: 'One app, four kinds of data',
      tag: 'Problem',
      body: [
        'A food-delivery app launches in five cities. It must store **orders and payments** (20k a day, real money), **restaurant menus** (each shaped differently), **login sessions** (30k lookups a second) and **courier GPS pings** (50k writes a second).',
        'The team argues “just use Postgres” versus “NoSQL scales”. Both camps skip the real question: how will each kind of data be **read and written**?',
      ],
      scene: {
        nodes: sn(
          'users',
          'app',
          ['rel', { tag: 'orders · 20k/day' }],
          ['doc', { tag: 'menus · varied' }],
          ['kv', { tag: 'sessions · 30k/s' }],
          ['wide', { tag: 'GPS · 50k/s' }],
        ),
        links: [L('users', 'app'), ...(['rel', 'doc', 'kv', 'wide'] as const).map((id) => L('app', id, { dashed: true }))],
        flows: [
          F(['users', 'app'], { ret: true, n: 3 }),
          F(['app', 'rel'], { kind: 'data', delay: 0.3 }),
          F(['app', 'doc'], { kind: 'data', delay: 0.8 }),
          F(['app', 'kv'], { kind: 'data', delay: 1.3 }),
          F(['app', 'wide'], { kind: 'data', delay: 1.8 }),
        ],
      },
      metrics: { model: '—', query: '—', txn: '—', scale: '—' },
    },
    {
      short: 'Relational',
      title: 'Relational: tables, schema, joins',
      tag: 'Technique',
      body: [
        'A **relational** database stores rows in tables with a fixed **schema**, like `orders(id, user_id, total, status)`. Related data lives in separate tables and is combined at query time with a **join**, so an address is stored once, not copied into every order.',
        '**Transactions** make several changes all-or-nothing: charge the card, insert the order, use up the voucher — all commit or none do. For money, that guarantee is worth a lot.',
      ],
      callout: { kind: 'tip', text: 'SQL answers questions you didn’t plan for. A new report next quarter is a new query, not a new data model.' },
      scene: {
        nodes: dimExcept('rel'),
        links: [L('users', 'app'), ...snLinks('rel').slice(1).map((l) => (l.to === 'rel' ? { ...l, label: 'JOIN users' } : l))],
        flows: [F(['users', 'app', 'rel'], { ret: true, n: 2 }), F(['app', 'rel'], { kind: 'data', delay: 1.2 })],
        notes: [
          { at: [0, -4.3], text: 'orders · 81 | u42 | $23.50' },
          { at: [0, -3.1], text: 'BEGIN … COMMIT', icon: Lock, tone: 'good' },
        ],
      },
      metrics: { model: 'Relational', query: 'SQL + joins', txn: 'Multi-row ACID', scale: 'One primary' },
      hi: ['query', 'txn'],
    },
    {
      short: 'Document',
      title: 'Document: one record, nested',
      tag: 'Technique',
      body: [
        'A **document store** keeps each record as a nested JSON-like document. A whole menu — sections, dishes, options — is one document, so the menu page loads with **one read** and no joins. Fields can differ: a sushi bar and a pizzeria need different attributes.',
        'The cost: data gets **duplicated** (a restaurant’s name inside every order), joins across documents are weak, and transactions are strongest inside a single document. Documents shard neatly by id.',
      ],
      callout: { kind: 'warn', text: '“Schemaless” means the schema lives in your code. Old documents keep their old shape, so every reader must handle them.' },
      scene: {
        nodes: dimExcept('doc'),
        links: snLinks('doc'),
        flows: [F(['users', 'app', 'doc'], { ret: true, n: 2 })],
        notes: [
          { at: [0, -4.3], text: '{ name: "Pho 88", menu: [' },
          { at: [0, -3.1], text: '{ dish, price, opts }, … ] }' },
        ],
      },
      metrics: { model: 'Document', query: 'By id or field', txn: 'Per document', scale: 'Shards by id' },
      hi: ['scale'],
      bad: ['txn'],
    },
    {
      short: 'Key-value',
      title: 'Key-value: get and put, nothing more',
      tag: 'Technique',
      body: [
        'A **key-value store** is a giant distributed hash map: `GET session:9f2c` returns an opaque value and `SET` overwrites it, often with an expiry. It never parses or joins anything, so lookups take **under a millisecond** and keys spread evenly across nodes.',
        'The catch is in the name: you can only ask by key. “All sessions for user 42” is impossible unless you maintain a second key that lists them yourself.',
      ],
      scene: {
        nodes: dimExcept('kv'),
        links: snLinks('kv').map((l) => (l.to === 'kv' ? { ...l, label: '0.4 ms' } : l)),
        flows: [F(['users', 'app', 'kv'], { ret: true, n: 4, speed: 1.4 })],
        notes: [
          { at: [0, 3.1], text: 'session:9f2c → { user: 42 }' },
          { at: [0, 4.3], text: 'expires in 30 min', icon: Timer },
        ],
      },
      metrics: { model: 'Key-value', query: 'By key only', txn: 'Per key', scale: 'Near-linear' },
      hi: ['scale'],
      bad: ['query'],
    },
    {
      short: 'Wide-col',
      title: 'Wide-column: built for write floods',
      tag: 'Technique',
      body: [
        'A **wide-column store** groups rows into partitions by a **partition key** and sorts rows inside each by a **clustering key**. With `(courier_id, ts)`, each courier’s pings sit together in time order, and new writes are cheap appends spread over many nodes.',
        'You model **query-first**: one table per question (“last 10 pings for courier 7”), duplicating data across tables if needed. A query that ignores the partition key has to scan the whole cluster.',
      ],
      callout: { kind: 'tip', text: 'Choose a partition key with many values and even traffic. One famous key — a big city, a celebrity — becomes a hot partition.' },
      scene: {
        nodes: dimExcept('wide', { meter: 55 }),
        links: snLinks('wide'),
        flows: [F(['users', 'app', 'wide'], { kind: 'data', n: 5, speed: 1.3 })],
        notes: [
          { at: [0, 3.1], text: 'c7 → 12:01 · 12:02 · 12:03' },
          { at: [0, 4.3], text: 'KEY ((courier_id), ts DESC)' },
        ],
      },
      metrics: { model: 'Wide-column', query: 'By partition', txn: 'Per row', scale: '50k+ writes/s' },
      hi: ['scale'],
      bad: ['query'],
    },
    {
      short: 'Pick by need',
      title: 'Choose by access pattern, not hype',
      tag: 'Insight',
      body: [
        'For each kind of data ask: **how will it be read?** Which keys, filters and sort order? **What must change together** atomically? How many writes per second, and how often will the shape change? The answers point to a model; the product name comes last.',
        'Here: orders need multi-row transactions → relational. Menus are read whole → document. Sessions are one key → key-value. GPS is a write flood read per courier → wide-column.',
      ],
      scene: {
        nodes: sn(
          'users',
          'app',
          ['rel', { tag: 'orders · ACID' }],
          ['doc', { tag: 'menus · nested' }],
          ['kv', { tag: 'sessions · by key' }],
          ['wide', { tag: 'GPS · appends', meter: 55 }],
        ),
        links: snLinks(),
        flows: [
          F(['users', 'app', 'rel'], { ret: true }),
          F(['users', 'app', 'doc'], { ret: true, delay: 0.6 }),
          F(['users', 'app', 'kv'], { ret: true, delay: 1.2 }),
          F(['app', 'wide'], { kind: 'data', n: 3, delay: 0.3 }),
        ],
      },
      metrics: { model: 'One per job', query: 'Fits each', txn: 'Where needed', scale: 'Where needed' },
      hi: ['query'],
    },
    {
      short: 'Polyglot',
      title: 'Four databases, four on-call jobs',
      tag: 'Trade-off',
      body: [
        'Every extra database brings backups, upgrades, monitoring, access control and new failure modes — plus code to keep copies in sync. That **operational cost** is real and often outweighs a modest speed win.',
        'Many teams start with one relational database: a `jsonb` column handles flexible menus, and it copes with thousands of writes a second. Add a key-value store for hot sessions, and a wide-column store only when GPS volume truly demands it.',
      ],
      callout: { kind: 'key', text: 'Default to a relational database. Add a specialised store when a measured access pattern outgrows it — not before.' },
      changes: [
        { sign: '-', text: 'Document store (jsonb instead)' },
        { sign: '~', text: 'Wide-column deferred until needed' },
      ],
      scene: {
        nodes: sn('users', 'app', ['rel', { tag: 'orders + menus' }], ['kv', { tag: 'sessions' }], ['wide', { tag: 'GPS · later', status: 'dim' }]),
        links: [L('users', 'app'), L('app', 'rel', { arrow: 'both', label: 'jsonb menus' }), L('app', 'kv', { arrow: 'both' }), L('app', 'wide', { dashed: true, tone: 'muted' })],
        flows: [F(['users', 'app', 'rel'], { ret: true, n: 2 }), F(['users', 'app', 'kv'], { ret: true, n: 2, delay: 0.6, speed: 1.4 })],
      },
      metrics: { model: 'SQL + KV', query: 'SQL + by key', txn: 'Multi-row ACID', scale: 'Enough for now' },
    },
    {
      short: 'Recap',
      title: 'SQL vs NoSQL, summed up',
      tag: 'Recap',
      body: [
        'Relational databases give you **schemas, joins and transactions**. Document stores keep nested records together; key-value stores do one lookup extremely fast; wide-column stores absorb huge write volumes when tables are modelled around queries.',
        '“NoSQL” isn’t one thing, and “SQL doesn’t scale” isn’t true. Start from **access patterns** and **consistency needs**.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Write down your queries first. The right data model answers them simply — and is one your team can run at 3 a.m.' },
      scene: {
        nodes: sn('users', 'app', 'rel', 'doc', 'kv', ['wide', { meter: 55 }]),
        links: snLinks(),
        flows: [
          F(['users', 'app', 'rel'], { ret: true }),
          F(['users', 'app', 'doc'], { ret: true, delay: 0.6 }),
          F(['users', 'app', 'kv'], { ret: true, delay: 1.2 }),
          F(['app', 'wide'], { kind: 'data', n: 3, delay: 0.3 }),
        ],
      },
      metrics: { model: 'Fit per job', query: 'Fits each', txn: 'Where needed', scale: 'Where needed' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Indexes                                                              */
/* ------------------------------------------------------------------ */

const ix = cast({
  app: { kind: 'cube', at: [-6, 0.5], label: 'App', sub: 'orders API', icon: Server, tone: 'blue' },
  plan: { kind: 'slab', at: [-6, -4], tag: 'EXPLAIN', icon: ClipboardList, tone: 'yellow' },
  root: { kind: 'cube', at: [-1.5, -4], label: 'Root', icon: ListTree, tone: 'teal', size: 'sm' },
  branch: { kind: 'cube', at: [2, -4], label: 'Branch', icon: ListTree, tone: 'teal', size: 'sm' },
  leaf: { kind: 'cube', at: [5.5, -4], label: 'Leaf', icon: ListTree, tone: 'teal', size: 'sm' },
  table: { kind: 'slab', at: [5.5, 0.5], tag: 'orders · 50M rows', icon: Rows3, tone: 'violet' },
  ix2: { kind: 'slab', at: [2, 4], tag: 'idx status', icon: ListTree, tone: 'teal' },
  ix3: { kind: 'slab', at: [5.5, 5], tag: 'idx placed_at', icon: ListTree, tone: 'teal' },
});

const treeLinks = [L('app', 'root'), L('root', 'branch'), L('branch', 'leaf'), L('leaf', 'table', { label: 'row pointer' })];
const lookup = F(['app', 'root', 'branch', 'leaf', 'table'], { ret: true });

export const indexes: Lesson = {
  id: 'indexes',
  title: 'Indexes',
  blurb: 'Turn a two-second scan of 50 million rows into a handful of page reads — and know what it costs.',
  minutes: 10,
  level: 'Intermediate',
  keywords: ['index', 'b-tree', 'full table scan', 'composite index', 'leftmost prefix', 'covering index', 'explain', 'query plan'],
  metrics: [
    { id: 'lat', label: 'Query time', icon: Timer },
    { id: 'pages', label: 'Pages read', icon: BookOpen },
    { id: 'writes', label: 'Writes / insert', icon: PenLine },
    { id: 'disk', label: 'Storage', icon: HardDrive },
  ],
  learn: [
    { text: 'How a B-tree finds one row in ~4 reads', at: 1 },
    { text: 'Composite indexes and the leftmost-prefix rule', at: 3 },
    { text: 'Covering, index-only scans', at: 4 },
    { text: 'What indexes cost every write', at: 5 },
    { text: 'Verifying plans with EXPLAIN', at: 6 },
  ],
  steps: [
    {
      short: 'Full scan',
      title: 'One query, 50 million rows',
      tag: 'Problem',
      body: [
        'An order-history page runs `SELECT * FROM orders WHERE user_id = 42`. The table holds **50M rows** and the database has no idea where user 42’s orders are, so it reads every page from first to last: a **full table scan**.',
        'That is ~500k pages and about **2 seconds** per call. A few hundred users opening the page together saturate the disk, and every other query slows down too.',
      ],
      scene: {
        nodes: ix('app', ['table', { meter: 95, status: 'hot' }]),
        links: [L('app', 'table', { arrow: 'both', label: 'scan 50M rows', tone: 'bad' })],
        flows: [F(['app', 'table'], { ret: true, n: 6, speed: 0.5 })],
        notes: [{ at: [1.5, -1.5], text: 'WHERE user_id = 42', icon: Search }],
      },
      metrics: { lat: '2.1 s', pages: '~500k', writes: '1', disk: '24 GB' },
      bad: ['lat', 'pages'],
    },
    {
      short: 'B-tree',
      title: 'A B-tree: the table’s phone book',
      tag: 'Technique',
      body: [
        '`CREATE INDEX ON orders (user_id)` builds a **B-tree**: a sorted, balanced tree of pages. The root says which branch covers which key range, branches point to leaves, and leaves list every `user_id` in order with a pointer to its row.',
        'Finding user 42 means walking root → branch → leaf → row: about **4 page reads** instead of 500k. Because leaves are sorted, ranges and `ORDER BY` come almost free.',
      ],
      changes: [{ sign: '+', text: 'B-tree index on user_id' }],
      scene: {
        nodes: ix('app', 'root', 'branch', 'leaf', ['table', { meter: 8 }]),
        links: treeLinks,
        flows: [lookup, F(['app', 'root', 'branch', 'leaf', 'table'], { ret: true, delay: 1.6 })],
        notes: [{ at: [1.5, -1.5], text: 'WHERE user_id = 42', icon: Search }],
      },
      metrics: { lat: '3 ms', pages: '4', writes: '2', disk: '25 GB' },
      hi: ['lat', 'pages'],
    },
    {
      short: 'Fan-out',
      title: 'Why the tree is so shallow',
      tag: 'Insight',
      body: [
        'Each 8 KB index page holds **hundreds of keys**, so every level multiplies the reach: ~400 → 160,000 → 64 million. Three levels cover 50M rows, where a binary tree would need about 26.',
        'The root and branch pages are touched by every lookup, so they stay **cached in memory**. In practice a lookup costs one or two real disk reads — often none.',
      ],
      scene: {
        nodes: ix('app', ['root', { tag: 'in RAM' }], ['branch', { tag: 'in RAM' }], 'leaf', ['table', { meter: 6 }]),
        links: [L('app', 'root'), L('root', 'branch', { label: '1 of 400' }), L('branch', 'leaf', { label: '1 of 400' }), L('leaf', 'table')],
        flows: [lookup, F(['app', 'root', 'branch', 'leaf', 'table'], { ret: true, delay: 1.2, speed: 1.3 })],
        notes: [{ at: [1.5, -1.5], text: '400 × 400 × 400 ≈ 64M keys' }],
      },
      metrics: { lat: '1 ms' },
      hi: ['lat'],
    },
    {
      short: 'Composite',
      title: 'Composite indexes: leftmost first',
      tag: 'Technique',
      body: [
        'The page really filters by status and sorts by date: `WHERE user_id = 42 AND status = \'paid\' ORDER BY placed_at`. A **composite index** on `(user_id, status, placed_at)` finds matching entries already in order — no separate sort step.',
        'It is sorted like a phone book (surname, then first name), so it only helps queries using a **leftmost prefix**: `user_id`, or `user_id` plus `status`. A query on `status` alone can’t use it.',
      ],
      callout: { kind: 'tip', text: 'Order matters: equality filters first, then the range or sort column. The column order decides which queries benefit.' },
      changes: [{ sign: '~', text: 'Index widened to 3 columns' }],
      scene: {
        nodes: ix('app', 'root', 'branch', ['leaf', { tag: '42 · paid · date' }], ['table', { meter: 30 }]),
        links: [...treeLinks, L('app', 'table', { dashed: true, tone: 'bad', label: 'status only → scan' })],
        flows: [lookup, F(['app', 'table'], { kind: 'error', stop: true, delay: 1, speed: 0.6 })],
        notes: [{ at: [1.5, -1.5], text: '(user_id, status, placed_at)' }],
      },
    },
    {
      short: 'Covering',
      title: 'Covering index: skip the table',
      tag: 'Technique',
      body: [
        'The list only shows each order’s total. Add it to the index — `INCLUDE (total)` or as a trailing column — and the leaf already holds every column the query needs. The database answers from the index alone: an **index-only scan**.',
        'No hop to the table means one fewer random read per matching row. For a customer with 300 orders, that is 300 fewer reads.',
      ],
      changes: [{ sign: '+', text: 'total stored in the index' }],
      scene: {
        nodes: ix('app', 'root', 'branch', ['leaf', { tag: '42 · paid · $23.50' }], ['table', { status: 'dim', meter: 2 }]),
        links: [...treeLinks.slice(0, 3), L('leaf', 'table', { dashed: true, tone: 'muted' })],
        flows: [F(['app', 'root', 'branch', 'leaf'], { ret: true, n: 2, speed: 1.3 })],
        notes: [{ at: [1.5, -1.5], text: 'leaf has total → done', tone: 'good' }],
      },
      metrics: { lat: '0.4 ms', pages: '3' },
      hi: ['lat', 'pages'],
    },
    {
      short: 'Write cost',
      title: 'Every index taxes every write',
      tag: 'Trade-off',
      body: [
        'Indexes aren’t free. Each `INSERT` must add an entry to **every** index, each update of an indexed column moves entries, and each index needs disk and memory. With three indexes, one new order means four writes instead of one.',
        'Insert latency climbs from 0.3 ms to ~0.9 ms and indexes use a fifth of the storage. Index the queries that matter, and drop indexes nobody reads — most databases report usage.',
      ],
      changes: [{ sign: '+', text: 'Indexes on status and placed_at' }],
      scene: {
        nodes: ix('app', 'root', 'branch', 'leaf', ['table', { meter: 60 }], 'ix2', 'ix3'),
        links: [...treeLinks.slice(0, 3), L('leaf', 'table'), L('app', 'table', { label: 'INSERT' }), L('table', 'ix2'), L('table', 'ix3')],
        flows: [
          F(['app', 'table', 'ix2'], { kind: 'data' }),
          F(['app', 'table', 'ix3'], { kind: 'data', delay: 0.5 }),
          F(['app', 'root', 'branch', 'leaf'], { kind: 'data', delay: 1 }),
        ],
      },
      metrics: { writes: '4', disk: '31 GB' },
      bad: ['writes', 'disk'],
    },
    {
      short: 'EXPLAIN',
      title: 'Trust EXPLAIN, not hope',
      tag: 'Technique',
      body: [
        'The query planner decides whether to use an index, and sometimes it says no: the filter matches too many rows, the column is wrapped in a function (`WHERE lower(email) = …`), or the types don’t match. The index sits unused while writes still pay for it.',
        'Run `EXPLAIN ANALYZE` on important queries. Expect **Index Scan** or **Index Only Scan**, and treat a **Seq Scan** on a big table as a bug to investigate.',
      ],
      callout: { kind: 'warn', text: 'Plans change as data grows. A query that used the index on 10k rows may switch to a scan at 10M — re-check after big data changes.' },
      scene: {
        nodes: ix('app', 'plan', 'root', 'branch', 'leaf', ['table', { meter: 10 }]),
        links: [L('app', 'plan', { arrow: 'both', label: 'EXPLAIN ANALYZE' }), ...treeLinks],
        flows: [F(['app', 'plan'], { ret: true, kind: 'handshake', retKind: 'data' }), F(['app', 'root', 'branch', 'leaf', 'table'], { ret: true, delay: 1.2 })],
        notes: [
          { at: [-6, -6.4], text: 'Index Only Scan · 0.4 ms', tone: 'good' },
          { at: [1.5, -1.5], text: 'lower(email) → Seq Scan', tone: 'bad' },
        ],
      },
    },
    {
      short: 'Recap',
      title: 'Indexes, summed up',
      tag: 'Recap',
      body: [
        'An index is a sorted copy of some columns that turns a full scan into a **few page reads**. Composite indexes follow the **leftmost-prefix** rule; covering indexes answer from the index alone.',
        'Every index slows writes and uses storage, and the planner may ignore it — so index for your real queries and check with `EXPLAIN`.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Index the queries you run most, verify each with EXPLAIN, and delete the indexes nobody reads.' },
      scene: {
        nodes: ix('app', 'plan', 'root', 'branch', 'leaf', ['table', { meter: 10 }], 'ix2', 'ix3'),
        links: [L('app', 'plan', { arrow: 'both' }), ...treeLinks.slice(0, 3), L('leaf', 'table'), L('app', 'table'), L('table', 'ix2'), L('table', 'ix3')],
        flows: [F(['app', 'root', 'branch', 'leaf'], { ret: true, n: 2 }), F(['app', 'table', 'ix2'], { kind: 'data', delay: 0.8 }), F(['app', 'table', 'ix3'], { kind: 'data', delay: 1.4 })],
      },
      metrics: { lat: '0.4 ms', pages: '3', writes: '4', disk: '31 GB' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Storage engines                                                      */
/* ------------------------------------------------------------------ */

const se = cast({
  app: { kind: 'cube', at: [-5.5, 0], label: 'App', sub: 'metrics', icon: Server, tone: 'blue' },
  wal: { kind: 'queue', at: [-2, 3.5], tag: 'write-ahead log', tagIcon: ScrollText, items: 3 },
  pages: { kind: 'slab', at: [1.5, 0], tag: 'B-tree pages', icon: HardDrive, tone: 'violet' },
  mem: { kind: 'cube', at: [-2, -3.5], label: 'Memtable', sub: 'sorted RAM', icon: MemoryStick, tone: 'orange' },
  s1: { kind: 'db', at: [1.5, -3.5], tag: 'SST 2 · new', icon: Layers, size: 'sm' },
  s2: { kind: 'db', at: [5, -3.5], tag: 'SST 1 · old', icon: Layers, size: 'sm' },
  s3: { kind: 'db', at: [5, 0], tag: 'L1 · merged', icon: Layers },
  bloom: { kind: 'cube', at: [1.5, 0], label: 'Bloom', sub: 'per SST', icon: Funnel, tone: 'yellow', size: 'sm' },
});

const lsmLinks = [L('app', 'wal', { label: 'append' }), L('app', 'mem'), L('mem', 's1', { label: 'flush' })];

export const storageEngines: Lesson = {
  id: 'storage-engines',
  title: 'Storage Engines',
  blurb: 'What really happens to a write: logs, B-trees, LSM trees, compaction and the costs each one hides.',
  minutes: 12,
  level: 'Advanced',
  keywords: ['storage engine', 'write-ahead log', 'wal', 'b-tree', 'lsm tree', 'memtable', 'sstable', 'compaction', 'bloom filter', 'amplification'],
  metrics: [
    { id: 'rate', label: 'Ingest', icon: Activity },
    { id: 'read', label: 'Lookup cost', icon: Search },
    { id: 'wamp', label: 'Write amp', icon: Copy },
    { id: 'safe', label: 'Durability', icon: ShieldCheck },
  ],
  learn: [
    { text: 'Why a write-ahead log makes writes durable', at: 1 },
    { text: 'How B-tree engines update pages in place', at: 2 },
    { text: 'Memtables, SSTables and flushing', at: 3 },
    { text: 'Compaction and bloom filters', at: 5 },
    { text: 'Read, write and space amplification', at: 6 },
  ],
  steps: [
    {
      short: 'Power cut',
      title: '“Saved” — then the power went out',
      tag: 'Problem',
      body: [
        'A metrics service ingests **150k points a second**. To be fast, its home-grown store updates the data file’s pages in memory and replies “OK” at once, leaving the OS to flush to disk later.',
        'A power cut wipes the last ~3 seconds of memory: about **450k acknowledged writes are gone**, and half-written pages corrupt the file. A real storage engine has to be fast **and** durable.',
      ],
      scene: {
        nodes: se('app', ['pages', { tag: 'data file', status: 'down', tone: 'rose' }]),
        links: [L('app', 'pages', { arrow: 'both', label: 'update in RAM', tone: 'bad' })],
        flows: [F(['app', 'pages'], { ret: true, n: 3 }), F(['app', 'pages'], { kind: 'error', stop: true, delay: 1.4 })],
        notes: [{ at: [1.5, -2.6], text: 'power cut · 3 s lost', icon: PowerOff, tone: 'bad' }],
      },
      metrics: { rate: '150k/s', read: '—', wamp: '—', safe: 'Lost on crash' },
      bad: ['safe'],
    },
    {
      short: 'WAL',
      title: 'Write it down first: the WAL',
      tag: 'Technique',
      body: [
        'Before touching any data page, the engine appends the change to a **write-ahead log** and forces it to disk with `fsync`. Only then does it reply “OK”. After a crash it replays the log, redoing every acknowledged write.',
        'Appending to one file is **sequential I/O**, the fastest thing a disk does. **Group commit** shares one `fsync` among many writes, so durability costs microseconds per write.',
      ],
      callout: { kind: 'key', text: 'Durability comes from the log, not the data files. Pages can be written lazily because the log can always rebuild them.' },
      changes: [{ sign: '+', text: 'Write-ahead log' }],
      scene: {
        nodes: se('app', ['wal', { items: 4 }], 'pages'),
        links: [L('app', 'wal', { label: 'append + fsync' }), L('app', 'pages', { dashed: true, label: 'apply later' })],
        flows: [F(['app', 'wal'], { kind: 'data', n: 3 }), F(['app', 'pages'], { kind: 'data', delay: 1.2, speed: 0.6 })],
      },
      metrics: { safe: 'WAL + fsync' },
      hi: ['safe'],
    },
    {
      short: 'B-tree',
      title: 'B-tree engines: update in place',
      tag: 'Technique',
      body: [
        'Most relational databases use a **B-tree engine**: data lives in fixed 8–16 KB pages, and a write finds its leaf page and **modifies it in place** (in a memory buffer, flushed later). Reads are great — any key is 3–4 page hops away, and each row has exactly one copy.',
        'But scattered keys dirty **random pages** all over the disk, and changing a 100-byte row can rewrite a whole 8 KB page. Asked for 150k writes a second, the disks max out near 40k.',
      ],
      scene: {
        nodes: se('app', ['wal', { items: 4 }], ['pages', { meter: 95, status: 'hot' }]),
        links: [L('app', 'wal', { label: 'append' }), L('app', 'pages', { label: 'random pages', tone: 'bad' })],
        flows: [F(['app', 'wal'], { kind: 'data', n: 2 }), F(['app', 'pages'], { kind: 'data', n: 5, speed: 0.6, delay: 0.3 })],
        notes: [{ at: [1.5, -2.6], text: 'pages 8812 · 104 · 55190 …', tone: 'warn' }],
      },
      metrics: { rate: '40k/s', read: '3–4 pages', wamp: 'up to 80×' },
      hi: ['read'],
      bad: ['rate', 'wamp'],
    },
    {
      short: 'LSM',
      title: 'LSM trees: buffer, sort, flush',
      tag: 'Technique',
      body: [
        'An **LSM-tree** engine never edits data in place. Each write goes to the WAL and into a **memtable** — a sorted structure in RAM — and is acknowledged. When the memtable reaches ~64 MB it is written out in one sequential pass as an immutable sorted file: an **SSTable**.',
        'Writes are always appends, so ingestion jumps to **180k/s**. Updates and deletes are just newer entries (a delete writes a **tombstone**); old versions linger in older files.',
      ],
      changes: [
        { sign: '+', text: 'Memtable and SSTables' },
        { sign: '-', text: 'In-place page updates' },
      ],
      scene: {
        nodes: se('app', ['wal', { items: 4 }], ['mem', { meter: 70 }], 's1', 's2'),
        links: [...lsmLinks, L('s1', 's2', { dashed: true, tone: 'muted', arrow: 'none' })],
        flows: [F(['app', 'wal'], { kind: 'data', n: 2 }), F(['app', 'mem'], { kind: 'data', n: 3, delay: 0.3 }), F(['mem', 's1'], { kind: 'data', delay: 1.5, speed: 0.7 })],
      },
      metrics: { rate: '180k/s', read: '1 + every SST', wamp: '2× (so far)' },
      hi: ['rate', 'wamp'],
      bad: ['read'],
    },
    {
      short: 'Compaction',
      title: 'Compaction keeps reads sane',
      tag: 'Technique',
      body: [
        'Flushes pile up files, and a read may have to check each one. **Compaction** runs in the background: it merge-sorts several SSTables into one, keeps only the newest version of each key and drops tombstones once they are safe to forget.',
        '**Leveled** compaction keeps levels ~10× apart in size, so a lookup touches **at most one file per level**. The price: data is rewritten again and again — often **10–30×** over its life — eating disk bandwidth.',
      ],
      changes: [{ sign: '+', text: 'Background compaction' }],
      scene: {
        nodes: se('app', ['wal', { items: 4 }], ['mem', { meter: 40 }], 's1', 's2', 's3'),
        links: [...lsmLinks, L('s1', 's3', { label: 'merge' }), L('s2', 's3')],
        flows: [F(['s1', 's3'], { kind: 'data' }), F(['s2', 's3'], { kind: 'data', delay: 0.4 }), F(['app', 'mem'], { kind: 'data', n: 2, delay: 0.8 })],
      },
      metrics: { read: '1 per level', wamp: '10–30×' },
      hi: ['read'],
      bad: ['wamp'],
    },
    {
      short: 'Bloom',
      title: 'Bloom filters skip useless files',
      tag: 'Technique',
      body: [
        'A lookup checks the memtable, then SSTables from newest to oldest. Most files don’t hold the key, but proving it by reading them is expensive. So each SSTable carries a **bloom filter**: a small bit array that answers “definitely not here” or “maybe here”.',
        'At ~10 bits per key it is wrong only ~**1%** of the time, so nearly every pointless read is skipped and a lookup usually costs **one** disk read. Bloom filters can’t help range scans.',
      ],
      changes: [{ sign: '+', text: 'Bloom filter per SSTable' }],
      scene: {
        nodes: se('app', ['wal', { items: 4 }], 'mem', ['s1', { status: 'dim' }], 's2', 'bloom'),
        links: [
          L('app', 'wal'),
          L('app', 'mem', { arrow: 'both', label: 'miss' }),
          L('app', 'bloom'),
          L('bloom', 's1', { dashed: true, tone: 'bad', label: 'no' }),
          L('bloom', 's2', { label: 'maybe' }),
        ],
        flows: [
          F(['app', 'mem'], { ret: true, retKind: 'error' }),
          F(['bloom', 's1'], { kind: 'handshake', stop: true, delay: 0.8 }),
          F(['app', 'bloom', 's2'], { ret: true, delay: 1.2 }),
        ],
      },
      metrics: { read: '~1 file' },
      hi: ['read'],
    },
    {
      short: 'Amplify',
      title: 'Read, write, space: pick two',
      tag: 'Trade-off',
      body: [
        'Every engine juggles three costs: **read amplification** (pages touched per lookup), **write amplification** (bytes hitting disk per byte you write) and **space amplification** (disk used vs live data). Improving one usually worsens another.',
        'B-trees: cheap reads, costly random writes, some space lost in half-full pages. LSM: cheap ingestion, but compaction rewrites data and stale versions use space until merged. Tiered compaction cuts write amp but raises space and read amp.',
      ],
      callout: { kind: 'tip', text: 'Read-heavy, transactional, point lookups? A B-tree is a safe default. Write-heavy logs, metrics or events? Consider an LSM engine.' },
      scene: {
        nodes: se('app', ['wal', { items: 4 }], ['pages', { meter: 60 }], ['mem', { meter: 40 }], 's1', 's2', 's3'),
        links: [L('app', 'wal'), L('app', 'pages', { label: 'B-tree' }), L('app', 'mem', { label: 'LSM' }), L('mem', 's1'), L('s1', 's3'), L('s2', 's3')],
        flows: [
          F(['app', 'pages'], { kind: 'data', speed: 0.6 }),
          F(['app', 'mem', 's1'], { kind: 'data', delay: 0.5 }),
          F(['s1', 's3'], { kind: 'data', delay: 1.4 }),
        ],
        notes: [
          { at: [3.5, 3], text: 'B-tree: cheap reads', tone: 'good' },
          { at: [3.5, 4.2], text: 'LSM: cheap writes', tone: 'good' },
          { at: [3.5, 5.4], text: 'both pay somewhere', tone: 'warn' },
        ],
      },
    },
    {
      short: 'Recap',
      title: 'Storage engines, summed up',
      tag: 'Recap',
      body: [
        'Every engine starts with a **write-ahead log** so acknowledged writes survive crashes. **B-trees** then update pages in place: great reads, costly random writes. **LSM trees** buffer in a memtable, flush sorted SSTables and compact later, with **bloom filters** keeping reads fast.',
        'Neither wins everywhere. Pick by your read/write mix, and measure amplification on real data.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'The log makes writes durable. After that, B-trees pay at write time; LSM trees pay later, in compaction and reads.' },
      scene: {
        nodes: se('app', ['wal', { items: 4 }], ['mem', { meter: 40 }], 's1', 's2', 's3'),
        links: [...lsmLinks, L('s1', 's3'), L('s2', 's3')],
        flows: [F(['app', 'wal'], { kind: 'data', n: 2 }), F(['app', 'mem', 's1'], { kind: 'data', delay: 0.4 }), F(['s2', 's3'], { kind: 'data', delay: 1.3 })],
      },
      metrics: { rate: '180k/s', read: '~1 file', wamp: '10–30×', safe: 'WAL + fsync' },
    },
  ],
};
