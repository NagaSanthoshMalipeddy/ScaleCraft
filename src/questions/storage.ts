import {
  Activity,
  Bell,
  Bot,
  Boxes,
  Camera,
  CircleCheck,
  Cloud,
  Coins,
  Copy,
  Cpu,
  Database,
  FileText,
  Flame,
  FolderTree,
  GitMerge,
  Globe,
  HardDrive,
  Hash,
  Layers,
  Lock,
  MousePointer2,
  RefreshCw,
  Route,
  ScrollText,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
  Split,
  Timer,
  Upload,
  User,
  Users,
  WifiOff,
  Wrench,
  Zap,
} from 'lucide-react';
import type { Question } from '../types';
import { cast, F, L } from '../lessons/kit';

/* ------------------------------------------------------------------ */
/* 18 · Design a Search Engine                                         */
/* ------------------------------------------------------------------ */

const se = cast({
  user: { kind: 'device', at: [-7, 0], tag: 'searcher', tagIcon: User },
  front: { kind: 'cube', at: [-3.5, 0], label: 'Front', sub: 'LB', icon: Split, tone: 'green', size: 'sm' },
  agg: { kind: 'cube', at: [0, 0], label: 'Query', sub: 'scatter', icon: Search, tone: 'blue' },
  cache: { kind: 'cube', at: [0, 3.5], label: 'Cache', sub: 'results', icon: Zap, tone: 'orange', size: 'sm' },
  s1: { kind: 'db', at: [3.5, -3.5], tag: 'shard 1', icon: Layers },
  s2: { kind: 'db', at: [3.5, 0], tag: 'shard 2', icon: Layers },
  s3: { kind: 'db', at: [3.5, 3.5], tag: 'shard 3', icon: Layers },
  indexer: { kind: 'cube', at: [7, 0], label: 'Indexer', sub: 'batch', icon: Cpu, tone: 'blue' },
  pages: { kind: 'db', at: [7, -3.5], tag: 'page store', icon: FileText },
  crawler: { kind: 'cube', at: [3.5, -7], label: 'Crawler', sub: 'fetchers', icon: Bot, tone: 'blue' },
  frontier: { kind: 'queue', at: [7, -7], tag: 'frontier', items: 4 },
  web: { kind: 'slab', at: [0, -7], tag: 'the web', icon: Globe, tone: 'teal' },
});

const seServeLinks = [
  L('user', 'front', { arrow: 'both' }),
  L('front', 'agg', { arrow: 'both' }),
  L('agg', 's1', { arrow: 'both' }),
  L('agg', 's2', { arrow: 'both' }),
  L('agg', 's3', { arrow: 'both' }),
];
const seBuildLinks = [
  L('frontier', 'crawler', { arrow: 'both' }),
  L('crawler', 'web', { arrow: 'both' }),
  L('crawler', 'pages'),
  L('pages', 'indexer'),
  L('indexer', 's1'),
  L('indexer', 's2'),
  L('indexer', 's3'),
];

export const qSearchEngine: Question = {
  id: 'q-search-engine',
  n: 18,
  title: 'Design a Search Engine',
  blurb: 'Crawl the web, build an inverted index, and answer any query from billions of pages in a blink.',
  minutes: 14,
  level: 'Intermediate',
  concepts: ['Indexing', 'Distributed Search'],
  related: ['sharding', 'batch-stream', 'caching', 'indexes', 'replication'],
  followUps: [
    'How would you add autocomplete suggestions as the user types?',
    'How do you detect and demote spam pages and link farms?',
    'How would you support exact phrase queries like "new york"?',
    'How would you roll out a new ranking model safely?',
  ],
  keywords: ['search engine', 'web crawler', 'inverted index', 'postings', 'scatter gather', 'top-k', 'bm25', 'pagerank', 'frontier'],
  metrics: [
    { id: 'qps', label: 'Queries', icon: Search },
    { id: 'index', label: 'Index size', icon: Database },
    { id: 'p99', label: 'Query p99', icon: Timer },
    { id: 'fresh', label: 'Freshness', icon: RefreshCw },
  ],
  learn: [
    { text: 'Splitting search into offline indexing and online serving', at: 3 },
    { text: 'Crawling politely and dropping duplicates', at: 4 },
    { text: 'Batch-built inverted indexes plus delta updates', at: 5 },
    { text: 'Document sharding with scatter-gather top-k merge', at: 6 },
    { text: 'Taming tail latency with hedging and caching', at: 8 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Clarify what “search” means',
      tag: 'Requirements',
      body: [
        'Functional: a user types a query and gets the **10 most relevant web pages** with title and snippet. Behind that we must **crawl** the public web, **index** what we fetch and keep it reasonably fresh.',
        'Non-functional: ~**10B pages**, peak ~**150k queries/s**, **p99 under 200 ms**, highly available (stale beats down). Out of scope: ads, image search, personalisation and spelling correction.',
      ],
      callout: { kind: 'tip', text: 'Say early that search is two systems: an offline pipeline that builds the index and an online path that serves it.' },
      scene: {
        nodes: se('user', ['agg', { label: 'Search', sub: '?' }]),
        links: [L('user', 'agg', { arrow: 'both', label: 'q=raft consensus' })],
        flows: [F(['user', 'agg'], { ret: true, n: 2 })],
        notes: [
          { at: [-3.5, -3.5], text: '10B pages, web scale', icon: Globe },
          { at: [-3.5, -2.5], text: 'p99 < 200 ms per query', icon: Timer, tone: 'good' },
          { at: [-3.5, 3], text: 'new pages findable < 1 day', icon: RefreshCw },
          { at: [3.5, 3], text: 'out: ads, images, personal', tone: 'warn' },
        ],
      },
      metrics: { qps: '—', index: '—', p99: '< 200 ms', fresh: '< 1 day' },
    },
    {
      short: 'Numbers',
      title: 'Napkin maths for the web',
      tag: 'Estimation',
      body: [
        '**5B queries/day** ÷ 86,400 s ≈ **58k QPS** on average, ~150k at peak. Every query consults the whole index, so serving cost is QPS × index size — that product drives the design.',
        'Index: 10B pages × ~10 KB of extracted text ≈ **100 TB**; compressed postings ≈ **25 TB**. Re-crawling 1B pages a day ≈ 12k fetches/s × 100 KB ≈ **1.2 GB/s** of inbound HTML.',
      ],
      scene: {
        nodes: se('user', ['agg', { label: 'Search', sub: '?' }], 'crawler', 'web'),
        links: [L('user', 'agg', { arrow: 'both' }), L('crawler', 'web', { arrow: 'both' })],
        flows: [F(['user', 'agg'], { ret: true, n: 3, speed: 1.4 }), F(['crawler', 'web'], { ret: true, retKind: 'data', n: 2, delay: 0.8 })],
        notes: [
          { at: [-3.5, -3.5], text: '5B / day ≈ 58k QPS', icon: Search },
          { at: [-3.5, -2.5], text: 'peak ≈ 150k QPS', tone: 'warn' },
          { at: [-3.5, 2.5], text: '10B × 10 KB ≈ 100 TB text', icon: FileText },
          { at: [-3.5, 3.5], text: 'postings ≈ 25 TB compressed', icon: Database },
          { at: [5, -4], text: '12k fetch/s ≈ 1.2 GB/s in', icon: Bot },
        ],
      },
      metrics: { qps: '58k /s', index: '25 TB' },
    },
    {
      short: 'API & data',
      title: 'One endpoint, one giant map',
      tag: 'Data Model',
      body: [
        '`GET /search?q=raft+consensus&page=1` → `{results: [{url, title, snippet}], took_ms}`. Internally each shard answers `topK(terms, k)` with `(docId, score)` pairs.',
        'The core structure is an **inverted index**: `term → postings` of `(docId, tf, positions)`, sorted by docId and delta-compressed. A **doc store** maps `docId → url, title, text` for snippets.',
      ],
      callout: { kind: 'key', text: 'An AND query is a merge of sorted postings lists — linear in their length, which is why compact, sorted lists matter.' },
      scene: {
        nodes: se('user', 'agg', ['s2', { tag: 'inverted index' }], ['pages', { tag: 'doc store' }]),
        links: [L('user', 'agg', { arrow: 'both', label: 'GET /search' }), L('agg', 's2', { arrow: 'both' }), L('s2', 'pages', { arrow: 'both' })],
        flows: [F(['user', 'agg', 's2', 'pages'], { ret: true, retKind: 'data' })],
        notes: [
          { at: [-3.5, -3.5], text: '"raft" → 12, 907, 4410, …', icon: Hash },
          { at: [-3.5, -2.5], text: '"consensus" → 907, 1203, …', icon: Hash },
          { at: [-3.5, 3], text: 'AND → doc 907 matches', tone: 'good' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Offline builds it, online serves it',
      tag: 'Design',
      body: [
        'Offline: the **crawler** pulls URLs from a **frontier**, fetches pages and stores them; the **indexer** turns stored pages into index segments and ships them to the shards.',
        'Online: a stateless **front** accepts the query; the **query service** sends it to every index shard in parallel and merges their best hits. The two halves only meet at the shards.',
      ],
      changes: [
        { sign: '+', text: 'Frontier + crawler' },
        { sign: '+', text: 'Page store + indexer' },
        { sign: '+', text: 'Index shards' },
        { sign: '+', text: 'Front + query service' },
      ],
      scene: {
        nodes: se('user', 'front', ['agg', { meter: 40 }], 's1', 's2', 's3', 'indexer', 'pages', 'crawler', 'frontier', 'web'),
        links: [...seServeLinks, ...seBuildLinks],
        flows: [
          F(['frontier', 'crawler', 'web'], { ret: true, retKind: 'data' }),
          F(['crawler', 'pages', 'indexer'], { kind: 'data', delay: 1.2 }),
          F(['indexer', 's1'], { kind: 'data', delay: 2 }),
          F(['user', 'front', 'agg', 's2'], { ret: true, delay: 0.4 }),
        ],
        notes: [
          { at: [-4.5, -6.5], text: 'offline: crawl → index', icon: Cpu },
          { at: [-4, 3.5], text: 'online: query → shards', icon: Search },
        ],
      },
      metrics: { p99: '180 ms' },
    },
    {
      short: 'Crawler',
      title: 'A polite, deduplicating crawler',
      tag: 'Deep Dive',
      body: [
        'The **frontier** is not one FIFO but per-host queues ordered by priority (PageRank, change rate). **Politeness**: obey `robots.txt` and fetch ~1 page/s per host, so millions of hosts are crawled in parallel without hammering any.',
        '**Dedupe** twice: a URL-seen set (a Bloom filter over normalised URLs) stops re-queuing, and a content fingerprint (**SimHash**) drops mirrors and near-copies — a large slice of the web.',
      ],
      callout: { kind: 'warn', text: 'Crawler traps — endless calendars, session ids in URLs — can eat the whole budget. Cap depth and pages per host.' },
      scene: {
        nodes: se(['crawler', { meter: 70 }], ['frontier', { items: 6 }], 'web', 'pages'),
        links: [L('frontier', 'crawler', { arrow: 'both', label: 'next URL' }), L('crawler', 'web', { arrow: 'both' }), L('crawler', 'pages', { label: 'new content' })],
        flows: [
          F(['frontier', 'crawler', 'web'], { ret: true, retKind: 'data', n: 2 }),
          F(['crawler', 'pages'], { kind: 'data', delay: 1.2 }),
          F(['crawler', 'frontier'], { kind: 'event', delay: 1.8 }),
        ],
        notes: [
          { at: [-4.5, -7], text: 'per-host queues · 1 req/s', icon: Timer },
          { at: [-4.5, -6], text: 'Bloom filter: URL seen?', icon: Hash },
          { at: [-4.5, -5], text: 'SimHash: near-duplicate?', icon: Copy },
          { at: [-4.5, -4], text: 'drop ≈ 30% as dupes', tone: 'good' },
        ],
      },
      metrics: { fresh: '~1 day' },
    },
    {
      short: 'Indexing',
      title: 'Build in batch, patch with deltas',
      tag: 'Deep Dive',
      body: [
        'The **indexer** is a MapReduce-style batch job: map emits `(term, docId, tf)` per page, the shuffle groups by term, reduce writes sorted, compressed **postings**. Output is immutable segments, one set per shard.',
        '**Freshness**: a full rebuild takes hours, so new or changed pages go into a small in-memory **delta index** on each shard, searched alongside the base and merged into it nightly — much like an LSM tree.',
      ],
      scene: {
        nodes: se('pages', ['indexer', { status: 'hot', sub: 'map/reduce' }], 's1', 's2', 's3', 'crawler'),
        links: [L('crawler', 'pages'), L('pages', 'indexer'), L('indexer', 's1', { label: 'segments' }), L('indexer', 's2'), L('indexer', 's3')],
        flows: [
          F(['crawler', 'pages', 'indexer'], { kind: 'data' }),
          F(['indexer', 's1'], { kind: 'data', delay: 1 }),
          F(['indexer', 's2'], { kind: 'data', delay: 1.2 }),
          F(['indexer', 's3'], { kind: 'data', delay: 1.4 }),
        ],
        notes: [
          { at: [-1, -3.5], text: 'base: rebuilt daily', icon: Layers },
          { at: [-1, -2.5], text: 'delta: minutes old', icon: RefreshCw, tone: 'good' },
          { at: [-1, 2.5], text: 'query = base ∪ delta', tone: 'ink' },
        ],
      },
      metrics: { fresh: 'minutes' },
      hi: ['fresh'],
    },
    {
      short: 'Sharding',
      title: 'Shard by document, scatter-gather',
      tag: 'Trade-off',
      body: [
        'Shard **by document**: each shard indexes ~1/N of the pages, so every query fans out to all shards; each returns its local **top-k** and the query service merges them. Sharding by term sends fewer requests, but hot terms melt one shard and AND-joins ship huge lists.',
        'Each shard is **replicated** (say ×3) and the query service picks the least-loaded replica, buying QPS and surviving node loss. 25 TB over ~1,000 shards is ~25 GB each — small enough to keep hot in RAM.',
      ],
      callout: { kind: 'key', text: 'Document sharding trades more fan-out for balanced load and graceful degradation: a lost shard costs a few results, not the query.' },
      scene: {
        nodes: se('user', 'front', ['agg', { meter: 60 }], ['s1', { tag: 'shard 1 ×3' }], ['s2', { tag: 'shard 2 ×3' }], ['s3', { tag: 'shard 3 ×3' }]),
        links: seServeLinks,
        flows: [
          F(['user', 'front', 'agg'], { ret: true }),
          F(['agg', 's1'], { ret: true, retKind: 'data', delay: 0.8 }),
          F(['agg', 's2'], { ret: true, retKind: 'data', delay: 0.8 }),
          F(['agg', 's3'], { ret: true, retKind: 'data', delay: 0.8 }),
        ],
        notes: [
          { at: [6.5, -2], text: 'each shard: local top 10', icon: Layers },
          { at: [6.5, 2], text: 'merge 3 × 10 → top 10', tone: 'good' },
          { at: [-4, -3], text: 'term sharding: hot shards', tone: 'bad' },
        ],
      },
      metrics: { qps: '150k /s', p99: '150 ms' },
      hi: ['qps', 'p99'],
    },
    {
      short: 'Rank + cache',
      title: 'Rank cheaply, then cache',
      tag: 'Deep Dive',
      body: [
        'Rank in two phases. Each shard scores matches with cheap signals — **BM25** term relevance, PageRank, freshness — and keeps its best few hundred; the query service re-ranks the merged set with a heavier ML model.',
        'Queries follow a power law: the head repeats constantly. A **result cache** keyed by normalised query, with a TTL of a few minutes, answers ~30–40% of traffic without touching a shard.',
      ],
      changes: [{ sign: '+', text: 'Result cache' }],
      scene: {
        nodes: se('user', 'front', ['agg', { meter: 45 }], ['cache', { meter: 55 }], 's1', 's2', 's3'),
        links: [...seServeLinks, L('agg', 'cache', { arrow: 'both' })],
        flows: [
          F(['user', 'front', 'agg', 'cache'], { ret: true, n: 2 }),
          F(['agg', 's1'], { ret: true, retKind: 'data', delay: 1.4 }),
          F(['agg', 's3'], { ret: true, retKind: 'data', delay: 1.4 }),
        ],
        notes: [
          { at: [6.5, -2], text: 'phase 1: BM25 + PageRank', icon: Hash },
          { at: [6.5, 2], text: 'phase 2: ML re-rank top 200', icon: Cpu },
          { at: [-3.5, 3.5], text: 'cache hit ≈ 35% of queries', icon: Zap, tone: 'good' },
        ],
      },
      metrics: { p99: '120 ms' },
      hi: ['p99'],
    },
    {
      short: 'Bottleneck',
      title: 'Tail latency and stampedes',
      tag: 'Bottleneck',
      body: [
        'With 1,000 shards the slowest one sets the response time: if each has a 1% chance of a 100 ms hiccup, nearly every query hits one. Fix: **hedged requests** to a second replica after ~p95, and **partial results** after a deadline.',
        'A breaking-news query misses the cache everywhere at once and stampedes all shards. **Request coalescing** (one in-flight fetch per query) plus short TTLs for trending queries absorbs it.',
      ],
      callout: { kind: 'warn', text: 'Fan-out multiplies tail latency. At high fan-out, design for the p99 of the slowest shard, not the average.' },
      scene: {
        nodes: se('user', 'front', ['agg', { meter: 80, status: 'hot' }], 'cache', 's1', 's2', ['s3', { status: 'hot', tag: 'slow replica' }]),
        links: [...seServeLinks.slice(0, 4), L('agg', 's3', { tone: 'bad' }), L('agg', 'cache', { arrow: 'both' })],
        flows: [
          F(['user', 'front', 'agg'], { n: 3, speed: 1.5 }),
          F(['agg', 's3'], { kind: 'error', stop: true, delay: 0.6 }),
          F(['agg', 's1'], { ret: true, retKind: 'data', delay: 1 }),
          F(['agg', 's2'], { ret: true, retKind: 'data', delay: 1.6 }),
        ],
        notes: [
          { at: [6.5, -2], text: 'hedge after p95 → replica', icon: Timer, tone: 'good' },
          { at: [6.5, 2], text: '1% × 1,000 shards ≈ always', tone: 'bad' },
          { at: [-4, -3], text: 'trending miss → stampede', icon: Flame, tone: 'bad' },
        ],
      },
      metrics: { qps: '1.5M /s', p99: '450 ms' },
      bad: ['p99'],
    },
    {
      short: 'Recap',
      title: 'The whole search engine',
      tag: 'Recap',
      body: [
        'A polite **crawler** feeds a page store; a batch **indexer** builds compressed **inverted index** segments, with deltas for freshness. Queries **scatter** to every document shard, each returns its top-k, and the merge re-ranks.',
        'Replicas carry QPS, a **result cache** absorbs the head, and hedging tames the tail.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Do the heavy work offline, shard by document so every query is a parallel scatter-gather, and spend the online budget on ranking.' },
      scene: {
        nodes: se('user', 'front', ['agg', { meter: 45 }], 'cache', 's1', 's2', 's3', 'indexer', 'pages', 'crawler', 'frontier', 'web'),
        links: [...seServeLinks, ...seBuildLinks, L('agg', 'cache', { arrow: 'both' })],
        flows: [
          F(['frontier', 'crawler', 'web'], { ret: true, retKind: 'data' }),
          F(['crawler', 'pages', 'indexer', 's1'], { kind: 'data', delay: 1 }),
          F(['user', 'front', 'agg', 'cache'], { ret: true, delay: 0.4 }),
          F(['agg', 's3'], { ret: true, retKind: 'data', delay: 1.6 }),
        ],
      },
      metrics: { qps: '150k /s', index: '25 TB', p99: '120 ms', fresh: 'minutes' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 19 · Design Google Drive                                            */
/* ------------------------------------------------------------------ */

const dr = cast({
  laptop: { kind: 'device', at: [-7, -3.5], tag: 'laptop', tagIcon: User },
  phone: { kind: 'phone', at: [-7, 3.5], tag: 'phone', tagIcon: Smartphone },
  api: { kind: 'cube', at: [-3.5, 0], label: 'API', sub: 'gateway', icon: Split, tone: 'green' },
  meta: { kind: 'cube', at: [0, -3.5], label: 'Meta', sub: 'tree · ver', icon: FolderTree, tone: 'blue' },
  metadb: { kind: 'db', at: [3.5, -3.5], tag: 'metadata', icon: Database },
  block: { kind: 'cube', at: [0, 3.5], label: 'Blocks', sub: 'chunks', icon: Boxes, tone: 'blue' },
  blobs: { kind: 'slab', at: [3.5, 3.5], tag: 'block store', icon: HardDrive, tone: 'violet' },
  notify: { kind: 'cube', at: [3.5, 0], label: 'Notify', sub: 'long poll', icon: Bell, tone: 'blue' },
});

const drLinks = [
  L('laptop', 'api', { arrow: 'both' }),
  L('phone', 'api', { arrow: 'both' }),
  L('api', 'meta', { arrow: 'both' }),
  L('meta', 'metadb', { arrow: 'both' }),
  L('api', 'block', { arrow: 'both' }),
  L('block', 'blobs', { arrow: 'both' }),
  L('meta', 'notify', { label: 'changed' }),
  L('notify', 'api', { dashed: true }),
];

const placeholder = { label: 'Drive', sub: '?', icon: Cloud, tone: 'blue' } as const;

export const qDrive: Question = {
  id: 'q-drive',
  n: 19,
  title: 'Design Google Drive',
  blurb: 'Keep every file in sync across laptops and phones — uploading only what changed, and never losing an edit.',
  minutes: 13,
  level: 'Intermediate',
  concepts: ['Files', 'Sync', 'Metadata'],
  related: ['files', 'transactions', 'realtime', 'sharding', 'authorization'],
  followUps: [
    'How would you support resumable uploads of a 50 GB file over a flaky link?',
    'How would you implement restoring a file to a version from last month?',
    'How do you garbage-collect chunks no version references any more?',
    'How would you add full-text search over users’ documents?',
  ],
  keywords: ['google drive', 'dropbox', 'file sync', 'chunking', 'deduplication', 'content addressed', 'conflicted copy', 'long polling'],
  metrics: [
    { id: 'up', label: 'Upload / edit', icon: Upload },
    { id: 'sync', label: 'Sync delay', icon: RefreshCw },
    { id: 'store', label: 'Stored', icon: HardDrive },
    { id: 'meta', label: 'Meta QPS', icon: Database },
  ],
  learn: [
    { text: 'Separating file metadata from file bytes', at: 3 },
    { text: 'Content-addressed chunks: dedupe and delta upload', at: 4 },
    { text: 'Atomic commits and sharing in the metadata store', at: 5 },
    { text: 'Push a nudge, pull the changes', at: 6 },
    { text: 'Resolving offline conflicts without losing data', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'What does “sync” promise?',
      tag: 'Requirements',
      body: [
        'Functional: upload and download files, **sync** a folder across all of a user’s devices, keep **version history**, and **share** files or folders with other people.',
        'Non-functional: 500M users, files up to 50 GB, **never lose data**, other devices see a change within seconds, and metadata is **strongly consistent**. Out of scope: real-time co-editing (that’s Docs) and search inside files.',
      ],
      callout: { kind: 'tip', text: 'Durability outranks latency here. Users forgive a slow sync; they never forgive a lost file.' },
      scene: {
        nodes: dr('laptop', 'phone', ['api', placeholder]),
        links: [L('laptop', 'api', { arrow: 'both' }), L('phone', 'api', { arrow: 'both' })],
        flows: [F(['laptop', 'api', 'phone'], { kind: 'data' }), F(['phone', 'api'], { ret: true, delay: 1.2 })],
        notes: [
          { at: [1.5, -3], text: 'sync all devices in seconds', icon: RefreshCw },
          { at: [1.5, -2], text: 'versions + sharing', icon: Users },
          { at: [1.5, 2], text: 'zero data loss', icon: ShieldCheck, tone: 'good' },
          { at: [1.5, 3], text: 'out: co-editing, search', tone: 'warn' },
        ],
      },
      metrics: { up: '—', sync: '< 10 s', store: '—', meta: '—' },
    },
    {
      short: 'Numbers',
      title: 'Bytes are big, metadata is busy',
      tag: 'Estimation',
      body: [
        '50M DAU × ~10 edits a day = **500M commits/day** ≈ 6k/s, ~15k at peak. At ~1 MB of changed data each that is **500 TB/day** of uploads before dedupe.',
        'Storage: 500M users × ~2 GB ≈ **1 EB**. Metadata is the busy part: every device polls “anything new?”, so reads run at **~100k QPS** — metadata is tiny but hot, bytes are huge but cold.',
      ],
      scene: {
        nodes: dr('laptop', 'phone', ['api', placeholder]),
        links: [L('laptop', 'api', { arrow: 'both' }), L('phone', 'api', { arrow: 'both' })],
        flows: [F(['laptop', 'api'], { kind: 'data', n: 3 }), F(['phone', 'api'], { ret: true, n: 2, delay: 0.6 })],
        notes: [
          { at: [1.5, -3], text: '500M commits/day ≈ 6k/s', icon: Upload },
          { at: [1.5, -2], text: '× 1 MB ≈ 500 TB/day', icon: HardDrive },
          { at: [1.5, 2], text: '500M × 2 GB ≈ 1 EB', icon: Database },
          { at: [1.5, 3], text: 'change polls ≈ 100k QPS', icon: RefreshCw, tone: 'warn' },
        ],
      },
      metrics: { up: '1 MB', store: '1 EB', meta: '100k /s' },
    },
    {
      short: 'API & data',
      title: 'Files are lists of chunk hashes',
      tag: 'Data Model',
      body: [
        '`POST /blocks/missing {hashes}` → which chunks the server lacks; `PUT /blocks/{sha256}` uploads one; `POST /files/{id}/commit {chunks, baseVersion}` creates a version; `GET /changes?cursor=812` lists what changed.',
        'Tables: `files(file_id, parent_id, name, owner, head_ver)`, `versions(file_id, ver, chunk_hashes[])`, `acl(file_id, principal, role)`. Chunks are stored by hash — a file is just an ordered list of them.',
      ],
      scene: {
        nodes: dr('laptop', 'api', 'meta', 'metadb', 'block', 'blobs'),
        links: [L('laptop', 'api', { arrow: 'both' }), L('api', 'meta', { arrow: 'both', label: 'commit' }), L('meta', 'metadb'), L('api', 'block', { label: 'PUT /blocks' }), L('block', 'blobs')],
        flows: [F(['laptop', 'api', 'block', 'blobs'], { kind: 'data' }), F(['api', 'meta', 'metadb'], { kind: 'data', delay: 1.4 })],
        notes: [
          { at: [6, -1.5], text: 'report.pdf v8 = [a1, 9f, c3]', icon: FileText },
          { at: [6.5, 1.5], text: 'chunk id = sha256(bytes)', icon: Hash },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Metadata here, bytes there',
      tag: 'Design',
      body: [
        'Clients talk to an **API gateway**. File bytes go to a **block service** backed by a cheap, durable object store; the file tree, versions and ACLs live in a **metadata service** on a strongly consistent database.',
        'After a commit, a **notification service** nudges the user’s other devices, which then pull the change. Each part scales on its own axis: bytes, transactions, open connections.',
      ],
      changes: [
        { sign: '+', text: 'Block service + store' },
        { sign: '+', text: 'Metadata service + DB' },
        { sign: '+', text: 'Notification service' },
      ],
      scene: {
        nodes: dr('laptop', 'phone', ['api', { meter: 35 }], 'meta', 'metadb', 'block', 'blobs', 'notify'),
        links: drLinks,
        flows: [
          F(['laptop', 'api', 'block', 'blobs'], { kind: 'data' }),
          F(['laptop', 'api', 'meta', 'metadb'], { kind: 'data', delay: 1.2 }),
          F(['meta', 'notify', 'api', 'phone'], { kind: 'event', delay: 2.2 }),
        ],
      },
      metrics: { sync: '5 s' },
    },
    {
      short: 'Chunks',
      title: 'Upload only what changed',
      tag: 'Deep Dive',
      body: [
        'The client splits files into ~4 MB **chunks** named by their SHA-256. Before uploading it asks which hashes are missing: edit one page of a 200 MB deck and only **one chunk** goes up. Identical chunks across files or users are stored once (**dedupe**).',
        'Fixed-size chunks shift when you insert bytes near the start, so every later chunk looks new. **Content-defined chunking** (cut where a rolling hash matches) keeps boundaries stable.',
      ],
      callout: { kind: 'warn', text: 'Cross-user dedupe leaks “someone already has this file”. Scope dedupe per user or per org if that matters.' },
      scene: {
        nodes: dr('laptop', ['api', { meter: 30 }], 'meta', ['block', { meter: 25 }], 'blobs'),
        links: [L('laptop', 'api', { arrow: 'both' }), L('api', 'meta', { arrow: 'both', label: 'missing?' }), L('api', 'block', { label: '1 of 50 chunks' }), L('block', 'blobs')],
        flows: [F(['laptop', 'api', 'meta'], { ret: true }), F(['laptop', 'api', 'block', 'blobs'], { kind: 'data', delay: 1.4 })],
        notes: [
          { at: [-5.5, 0.5], text: '200 MB → 50 chunks', icon: Boxes },
          { at: [-5.5, 1.5], text: 'changed: 1 → upload 4 MB', tone: 'good' },
          { at: [5.5, 0], text: 'dedupe ≈ 50% saved', icon: Copy, tone: 'good' },
        ],
      },
      metrics: { up: '4 MB', store: '0.5 EB' },
      hi: ['up', 'store'],
    },
    {
      short: 'Metadata',
      title: 'Atomic commits and sharing',
      tag: 'Deep Dive',
      body: [
        'A commit is one **transaction**: check `head_ver == baseVersion`, insert the new version row, bump the head. Chunks are uploaded first, so a version never points at missing bytes. Shard by **namespace** (a user’s tree) so moves and renames stay single-shard.',
        '**Sharing**: an `acl` row grants a principal a role on a file or folder; children inherit it. A shared folder is its own namespace mounted into each member’s tree, checked on every request.',
      ],
      scene: {
        nodes: dr('laptop', 'api', ['meta', { meter: 50 }], ['metadb', { tag: 'metadata · tx' }]),
        links: [L('laptop', 'api', { arrow: 'both' }), L('api', 'meta', { arrow: 'both', label: 'commit v8' }), L('meta', 'metadb', { arrow: 'both' })],
        flows: [F(['laptop', 'api', 'meta', 'metadb'], { ret: true })],
        notes: [
          { at: [5, -6], text: 'if head = 7 → insert v8', icon: Database, tone: 'good' },
          { at: [5.5, -1], text: 'acl: bob → editor', icon: Lock },
          { at: [5.5, 0], text: 'shard key = namespace id', icon: Split },
        ],
      },
      metrics: { meta: '120k /s' },
    },
    {
      short: 'Notify',
      title: 'Push a nudge, pull the change',
      tag: 'Deep Dive',
      body: [
        'Each online device holds a **long poll** or **WebSocket** to the notification service. When namespace 42 commits, meta publishes “ns 42 → cursor 813”; devices receive just that nudge, then call `GET /changes?cursor=812` and fetch any missing chunks.',
        'The nudge carries no data, so a lost one is harmless: devices also poll every few minutes, and an offline device simply catches up from its stored **cursor**.',
      ],
      scene: {
        nodes: dr('laptop', 'phone', 'api', 'meta', 'metadb', 'block', 'blobs', ['notify', { status: 'hot' }]),
        links: drLinks,
        flows: [
          F(['laptop', 'api', 'meta'], { kind: 'data' }),
          F(['meta', 'notify', 'api', 'phone'], { kind: 'event', delay: 1 }),
          F(['phone', 'api', 'block', 'blobs'], { ret: true, retKind: 'data', delay: 2.4 }),
        ],
        notes: [
          { at: [-4, -6], text: 'nudge: ns 42 → cursor 813', icon: Bell },
          { at: [-4, 6], text: 'pull: GET /changes?cur=812', tone: 'good' },
        ],
      },
      metrics: { sync: '2 s' },
      hi: ['sync'],
    },
    {
      short: 'Conflicts',
      title: 'Two devices, one file, offline',
      tag: 'Trade-off',
      body: [
        'Laptop and phone both edit v7 offline. The laptop reconnects first and commits **v8**. The phone’s commit says `baseVersion: 7`, the check fails, and nothing is overwritten.',
        'Options: **last writer wins** silently drops the laptop’s work; auto-merge only works for structured formats. Drive-style sync keeps both — the phone saves **“report (phone’s conflicted copy)”** and the user decides.',
      ],
      callout: { kind: 'key', text: 'Optimistic concurrency on a version number turns a silent overwrite into a visible conflict. Never pick a loser silently.' },
      scene: {
        nodes: dr(['laptop', { tag: 'v7 → v8 ✓' }], ['phone', { tag: 'v7 → ?' }], 'api', 'meta', 'metadb'),
        links: [L('laptop', 'api', { arrow: 'both' }), L('phone', 'api', { arrow: 'both', tone: 'bad' }), L('api', 'meta', { arrow: 'both' }), L('meta', 'metadb')],
        flows: [
          F(['laptop', 'api', 'meta', 'metadb'], { kind: 'data' }),
          F(['phone', 'api', 'meta'], { kind: 'error', ret: true, retKind: 'error', delay: 1.6 }),
        ],
        notes: [
          { at: [3, 1.5], text: 'base 7 ≠ head 8 → 409', icon: GitMerge, tone: 'bad' },
          { at: [3, 2.5], text: 'save conflicted copy', icon: Copy, tone: 'good' },
        ],
      },
    },
    {
      short: 'Bottleneck',
      title: 'The company-wide folder',
      tag: 'Bottleneck',
      body: [
        'A shared folder with **100k members** makes one namespace a hot shard, and every commit triggers 100k nudges that all pull at once. Fix: **coalesce** nudges (one per device per few seconds), add jitter to pulls, and cache ACLs and change lists for hot namespaces.',
        'Large uploads over flaky links need **resumable** sessions: chunk-level retries mean a dropped connection costs one 4 MB chunk, not 50 GB.',
      ],
      callout: { kind: 'warn', text: 'Fan-out is proportional to membership. Design notifications for the largest share, not the typical one.' },
      scene: {
        nodes: dr('laptop', 'phone', ['api', { meter: 85, status: 'hot' }], ['meta', { meter: 90, status: 'hot' }], 'metadb', 'block', 'blobs', ['notify', { status: 'hot' }]),
        links: drLinks,
        flows: [
          F(['laptop', 'api', 'meta'], { kind: 'data' }),
          F(['meta', 'notify', 'api', 'phone'], { kind: 'event', n: 5, speed: 1.6, delay: 0.6 }),
          F(['phone', 'api', 'meta'], { n: 4, speed: 1.6, delay: 1.6 }),
        ],
        notes: [
          { at: [-4, -6], text: '1 commit × 100k members', icon: Users, tone: 'bad' },
          { at: [-4, 6], text: 'coalesce + jitter pulls', tone: 'good' },
        ],
      },
      metrics: { meta: '2M /s', sync: '30 s' },
      bad: ['meta', 'sync'],
    },
    {
      short: 'Recap',
      title: 'The whole Drive',
      tag: 'Recap',
      body: [
        'Files become **content-addressed chunks**, so uploads carry only changes and identical bytes are stored once. A strongly consistent **metadata** store commits versions atomically and holds ACLs.',
        'A **nudge-then-pull** notifier keeps devices in sync, and version checks turn offline edits into **conflicted copies** instead of lost work.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Split bytes from metadata: bytes are big, immutable and deduped; metadata is small, transactional and the source of truth.' },
      scene: {
        nodes: dr('laptop', 'phone', ['api', { meter: 35 }], ['meta', { meter: 45 }], 'metadb', 'block', 'blobs', 'notify'),
        links: drLinks,
        flows: [
          F(['laptop', 'api', 'block', 'blobs'], { kind: 'data' }),
          F(['laptop', 'api', 'meta', 'metadb'], { kind: 'data', delay: 1 }),
          F(['meta', 'notify', 'api', 'phone'], { kind: 'event', delay: 2 }),
        ],
      },
      metrics: { up: '4 MB', sync: '2 s', store: '0.5 EB', meta: '120k /s' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 40 · Design a Cloud Storage System (S3-like)                        */
/* ------------------------------------------------------------------ */

const cs = cast({
  client: { kind: 'device', at: [-7, 0], tag: 'client', tagIcon: User },
  sys: { kind: 'cube', at: [0, 0], label: 'Store', sub: '?', icon: Cloud, tone: 'blue' },
  fe: { kind: 'cube', at: [-3.5, 0], label: 'Front', sub: 'auth·route', icon: Split, tone: 'green' },
  meta: { kind: 'cube', at: [-3.5, -3.5], label: 'Meta', sub: 'key index', icon: Database, tone: 'blue' },
  m1: { kind: 'db', at: [-7, -7], tag: 'keys a–m', icon: Database },
  m2: { kind: 'db', at: [-3.5, -7], tag: 'keys n–z', icon: Database },
  z1: { kind: 'cube', at: [0, -3.5], label: 'Node', sub: 'zone A', icon: HardDrive, tone: 'violet' },
  z2: { kind: 'cube', at: [0, 0], label: 'Node', sub: 'zone B', icon: HardDrive, tone: 'violet' },
  z3: { kind: 'cube', at: [0, 3.5], label: 'Node', sub: 'zone C', icon: HardDrive, tone: 'violet' },
  repair: { kind: 'cube', at: [3.5, 0], label: 'Repair', sub: 'scrubber', icon: Wrench, tone: 'yellow' },
});

const csLinks = [
  L('client', 'fe', { arrow: 'both' }),
  L('fe', 'meta', { arrow: 'both' }),
  L('meta', 'm1', { arrow: 'both' }),
  L('meta', 'm2', { arrow: 'both' }),
  L('fe', 'z1', { arrow: 'both' }),
  L('fe', 'z2', { arrow: 'both' }),
  L('fe', 'z3', { arrow: 'both' }),
];
const csRepair = [L('repair', 'z1', { arrow: 'both' }), L('repair', 'z2', { arrow: 'both' }), L('repair', 'z3', { arrow: 'both' })];

export const qCloudStorage: Question = {
  id: 'q-cloud-storage',
  n: 40,
  title: 'Design a Cloud Storage System',
  blurb: 'Build an S3-like object store: trillions of objects, eleven nines of durability, and disks failing every day.',
  minutes: 15,
  level: 'Advanced',
  concepts: ['Replication', 'Durability', 'Metadata'],
  related: ['replication', 'sharding', 'redundancy', 'files', 'consensus'],
  followUps: [
    'How would you implement object versioning and lifecycle rules?',
    'How do you serve a LIST over a prefix with billions of keys?',
    'How would you add cross-region replication, and what does it cost?',
    'How would you encrypt objects at rest with per-customer keys?',
  ],
  keywords: ['object storage', 's3', 'erasure coding', 'replication', 'durability', 'quorum', 'multipart upload', 'scrubbing', 'read-after-write'],
  metrics: [
    { id: 'dur', label: 'Durability', icon: ShieldCheck },
    { id: 'cost', label: 'Raw / logical', icon: Coins },
    { id: 'put', label: 'PUT p99', icon: Timer },
    { id: 'objs', label: 'Objects', icon: Boxes },
  ],
  learn: [
    { text: 'Separating the metadata plane from the data plane', at: 3 },
    { text: 'Quorum writes and read-after-write consistency', at: 4 },
    { text: 'Replication vs erasure coding: durability per dollar', at: 5 },
    { text: 'Scrubbing and fast parallel repair', at: 6 },
    { text: 'Multipart uploads for huge objects', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'An object store, not a file system',
      tag: 'Requirements',
      body: [
        'Functional: `PUT`, `GET`, `DELETE` and `LIST` objects by **bucket + key**; objects from 1 byte to 5 TB; immutable once written (overwrite = new version).',
        'Non-functional: **11 nines of durability**, 99.99% availability, **read-after-write consistency**, survive the loss of a whole availability zone. Out of scope: billing, IAM details and static website hosting.',
      ],
      callout: { kind: 'tip', text: 'Durability (never lose bytes) and availability (can I read them now?) are different promises. Size the design for both separately.' },
      scene: {
        nodes: cs('client', 'sys'),
        links: [L('client', 'sys', { arrow: 'both', label: 'PUT /photos/cat' })],
        flows: [F(['client', 'sys'], { kind: 'data', ret: true, retKind: 'response' })],
        notes: [
          { at: [-4.5, -4], text: '11 nines durability', icon: ShieldCheck, tone: 'good' },
          { at: [-4.5, -3], text: 'survive a zone loss', icon: Cloud },
          { at: [-4.5, 3], text: 'read-after-write', icon: CircleCheck },
          { at: [3.5, 3], text: 'out: billing, IAM, web', tone: 'warn' },
        ],
      },
      metrics: { dur: '11 nines', cost: '—', put: '—', objs: '—' },
    },
    {
      short: 'Numbers',
      title: 'Disks die every day at this size',
      tag: 'Estimation',
      body: [
        '**1 trillion objects**, ~1 MB average ≈ **1 EB** logical. Traffic ≈ 1M requests/s at peak, ~90% GETs; ~100k PUT/s. Metadata: 1T rows × ~300 B ≈ **300 TB** — far too big for one database.',
        'Stored 3× that is 3 EB raw ≈ 150k 20 TB drives. At ~1% annual failure rate, **~4 drives die every day**. Failure is not an incident here, it is the steady state.',
      ],
      scene: {
        nodes: cs('client', 'sys'),
        links: [L('client', 'sys', { arrow: 'both' })],
        flows: [F(['client', 'sys'], { ret: true, retKind: 'data', n: 3, speed: 1.4 }), F(['client', 'sys'], { kind: 'data', delay: 0.7 })],
        notes: [
          { at: [-4.5, -4], text: '1T × 1 MB ≈ 1 EB', icon: Boxes },
          { at: [-4.5, -3], text: '1M req/s · 90% GET', icon: Activity },
          { at: [-4.5, 3], text: 'meta ≈ 300 TB', icon: Database, tone: 'warn' },
          { at: [3.5, 3], text: '150k disks · ~4 die / day', icon: HardDrive, tone: 'bad' },
        ],
      },
      metrics: { objs: '1T', cost: '3×' },
    },
    {
      short: 'API & data',
      title: 'Keys point at placements',
      tag: 'API',
      body: [
        '`PUT /{bucket}/{key}`, `GET /{bucket}/{key}` (with `Range`), `GET /{bucket}?prefix=logs/2026/`. Multipart: `POST ?uploads` → uploadId, `PUT ?partNumber=3&uploadId=…`, then `POST ?uploadId=…` to complete.',
        'Metadata row: `(bucket, key, version) → size, etag, placement[]`, where placement lists which nodes hold each chunk. It is **range-sharded** by `(bucket, key)` so a prefix `LIST` is a range scan.',
      ],
      scene: {
        nodes: cs('client', 'fe', 'meta', 'm1', 'm2'),
        links: [L('client', 'fe', { arrow: 'both' }), L('fe', 'meta', { arrow: 'both', label: 'lookup' }), L('meta', 'm1', { arrow: 'both' }), L('meta', 'm2', { arrow: 'both' })],
        flows: [F(['client', 'fe', 'meta', 'm2'], { ret: true, retKind: 'data' })],
        notes: [
          { at: [2.5, -6], text: 'photos/cat.jpg v3 →', icon: Hash },
          { at: [2.5, -5], text: '2.1 MB · [A7, B2, C9]', tone: 'good' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'A metadata plane and a data plane',
      tag: 'Design',
      body: [
        'A stateless **front end** authenticates and routes. A **metadata service**, range-sharded across many partitions, maps keys to placements. **Storage nodes** in three zones hold the bytes as large append-only files.',
        'The two planes scale independently: metadata by row count and request rate, storage by bytes. Bytes never flow through the metadata service.',
      ],
      changes: [
        { sign: '+', text: 'Front end' },
        { sign: '+', text: 'Sharded metadata' },
        { sign: '+', text: 'Storage nodes × 3 zones' },
      ],
      scene: {
        nodes: cs('client', 'fe', 'meta', 'm1', 'm2', 'z1', 'z2', 'z3'),
        links: csLinks,
        flows: [
          F(['client', 'fe', 'meta', 'm2'], { ret: true, retKind: 'data' }),
          F(['fe', 'z2'], { ret: true, retKind: 'data', delay: 1.4 }),
        ],
        notes: [{ at: [3.5, -5], text: 'bytes skip the meta plane', tone: 'good' }],
      },
      metrics: { put: '60 ms' },
    },
    {
      short: 'Write path',
      title: 'Quorum writes, then commit',
      tag: 'Deep Dive',
      body: [
        'The front end streams the object to **3 nodes in 3 zones** in parallel; each writes, checksums and fsyncs. It proceeds once **2 of 3** are durable (W = 2) — a slow node can’t stall the PUT, and repair finishes the third copy.',
        'Only then is the metadata row committed: data first, pointer last, so a key never points at missing bytes. That commit is the **linearisation point**: once `200 OK` returns, every GET sees the new version — read-after-write.',
      ],
      callout: { kind: 'tip', text: 'A crash between data and metadata leaves orphan bytes, never a broken key. A background sweeper collects orphans.' },
      scene: {
        nodes: cs('client', 'fe', 'meta', 'm1', 'm2', 'z1', 'z2', ['z3', { status: 'hot' }]),
        links: csLinks,
        flows: [
          F(['client', 'fe'], { kind: 'data' }),
          F(['fe', 'z1'], { kind: 'data', ret: true, retKind: 'response', delay: 0.8 }),
          F(['fe', 'z2'], { kind: 'data', ret: true, retKind: 'response', delay: 0.8 }),
          F(['fe', 'z3'], { kind: 'data', delay: 0.8, speed: 0.5 }),
          F(['fe', 'meta', 'm2'], { kind: 'data', delay: 2.4 }),
        ],
        notes: [
          { at: [3.5, -3.5], text: 'ack 2 of 3 → continue', icon: CircleCheck, tone: 'good' },
          { at: [3.5, 3.5], text: 'slow zone C: repaired later', tone: 'warn' },
          { at: [-6.5, 3.5], text: 'commit meta → 200 OK', icon: Database },
        ],
      },
      metrics: { put: '45 ms' },
      hi: ['put'],
    },
    {
      short: 'Copies vs EC',
      title: 'Replication vs erasure coding',
      tag: 'Trade-off',
      body: [
        '**3× replication**: 200% overhead, survives 2 losses, reads hit one node and repair is a plain copy. **Erasure coding 6+3**: split into 6 data + 3 parity fragments, any 6 rebuild the object — **1.5×** overhead, survives 3 losses.',
        'Put 3 fragments in each zone and a whole zone can vanish. The price: reads touch 6 nodes (worse tail), repair reads 6 fragments to rebuild 1, plus CPU. Common split: replicate small and hot objects, erasure-code large and cold ones.',
      ],
      callout: { kind: 'key', text: 'EC halves the disk bill at equal or better durability. At exabyte scale that is tens of thousands of drives.' },
      scene: {
        nodes: cs('client', 'fe', 'meta', 'm1', 'm2', ['z1', { sub: 'd1 d2 d3' }], ['z2', { sub: 'd4 d5 d6' }], ['z3', { sub: 'p1 p2 p3' }]),
        links: csLinks,
        flows: [
          F(['client', 'fe'], { kind: 'data' }),
          F(['fe', 'z1'], { kind: 'data', n: 3, delay: 0.8 }),
          F(['fe', 'z2'], { kind: 'data', n: 3, delay: 0.8 }),
          F(['fe', 'z3'], { kind: 'event', n: 3, delay: 0.8 }),
        ],
        notes: [
          { at: [3.5, -3.5], text: '3 copies: 3.0× raw', icon: Copy, tone: 'bad' },
          { at: [3.5, -2.5], text: 'EC 6+3: 1.5× raw', icon: Coins, tone: 'good' },
          { at: [3.5, 3.5], text: 'any 6 of 9 → object', tone: 'good' },
        ],
      },
      metrics: { cost: '1.5×' },
      hi: ['cost'],
    },
    {
      short: 'Repair',
      title: 'Scrub constantly, repair in parallel',
      tag: 'Deep Dive',
      body: [
        'Disks rot silently, so a **scrubber** re-reads every fragment every couple of weeks and verifies checksums. When a disk dies, metadata knows exactly which fragments it held; **repair** rebuilds them onto other nodes.',
        'Durability is a race: data is lost only if 4 of 9 fragments vanish before repair finishes. Spreading one dead 20 TB disk’s fragments over ~1,000 peers rebuilds it in **minutes**, not a day — fast repair is the real durability lever.',
      ],
      changes: [{ sign: '+', text: 'Scrubber / repair service' }],
      scene: {
        nodes: cs('client', 'fe', 'meta', 'm1', 'm2', 'z1', ['z2', { status: 'down', sub: 'disk dead' }], 'z3', 'repair'),
        links: [...csLinks.slice(0, 4), L('fe', 'z1', { arrow: 'both' }), L('fe', 'z2', { arrow: 'both', tone: 'bad', dashed: true }), L('fe', 'z3', { arrow: 'both' }), ...csRepair.slice(0, 1), L('repair', 'z2', { tone: 'bad', dashed: true }), csRepair[2]],
        flows: [
          F(['repair', 'z1'], { ret: true, retKind: 'data' }),
          F(['repair', 'z3'], { ret: true, retKind: 'data', delay: 0.6 }),
          F(['repair', 'z2'], { kind: 'error', stop: true, delay: 1.2 }),
        ],
        notes: [
          { at: [5, -3.5], text: 'checksum every fragment', icon: ShieldCheck },
          { at: [5, 3.5], text: '1,000 peers → minutes', icon: Wrench, tone: 'good' },
        ],
      },
      metrics: { dur: '11 nines' },
    },
    {
      short: 'Multipart',
      title: 'Huge objects in parallel parts',
      tag: 'Deep Dive',
      body: [
        'A 50 GB video as one stream would fail on any blip. **Multipart upload**: initiate to get an `uploadId`, upload 5–100 MB parts **in parallel** and retry any part on its own, then complete with the list of part ETags.',
        'Completion commits a **manifest** row pointing at all parts atomically — the object appears whole or not at all. A lifecycle rule garbage-collects parts of uploads that were never completed.',
      ],
      scene: {
        nodes: cs('client', 'fe', 'meta', 'm1', 'm2', 'z1', 'z2', 'z3'),
        links: csLinks,
        flows: [
          F(['client', 'fe'], { kind: 'data', n: 4, speed: 1.4 }),
          F(['fe', 'z1'], { kind: 'data', n: 2, delay: 0.6 }),
          F(['fe', 'z2'], { kind: 'data', n: 2, delay: 0.8 }),
          F(['fe', 'z3'], { kind: 'data', n: 2, delay: 1 }),
          F(['fe', 'meta', 'm2'], { kind: 'data', delay: 2.6 }),
        ],
        notes: [
          { at: [-6.5, 2.5], text: '50 GB → 500 × 100 MB', icon: Upload },
          { at: [-6.5, 3.5], text: 'retry one part, not all', tone: 'good' },
          { at: [3, -5.5], text: 'complete = 1 manifest row', icon: ScrollText },
        ],
      },
      metrics: { put: '45 ms' },
    },
    {
      short: 'Bottleneck',
      title: 'Hot prefixes and a lost zone',
      tag: 'Bottleneck',
      body: [
        'Keys like `logs/2026-11-21/…` all land in one metadata range, so a busy writer melts one partition. Fix: **split ranges automatically** on load (not just size) and move them; advise random prefixes for extreme cases.',
        'Losing zone B with EC means every read must **reconstruct** from 6 of the remaining fragments: more CPU and latency, but no data loss. Keep spare capacity so repair can re-protect quickly.',
      ],
      callout: { kind: 'warn', text: 'Range sharding gives cheap LIST but invites hot spots on sequential keys. Load-based splitting is not optional.' },
      scene: {
        nodes: cs('client', 'fe', ['meta', { status: 'hot' }], 'm1', ['m2', { status: 'hot', tag: 'logs/2026-11-*' }], 'z1', ['z2', { status: 'down', sub: 'zone lost' }], 'z3', 'repair'),
        links: [...csLinks.slice(0, 4), L('fe', 'z1', { arrow: 'both' }), L('fe', 'z2', { tone: 'bad', dashed: true }), L('fe', 'z3', { arrow: 'both' }), csRepair[0], csRepair[2]],
        flows: [
          F(['client', 'fe', 'meta', 'm2'], { kind: 'data', n: 4, speed: 1.6 }),
          F(['fe', 'z2'], { kind: 'error', stop: true, delay: 0.8 }),
          F(['fe', 'z1'], { ret: true, retKind: 'data', delay: 1.2 }),
          F(['fe', 'z3'], { ret: true, retKind: 'data', delay: 1.2 }),
        ],
        notes: [
          { at: [2.5, -6], text: 'one range takes all writes', icon: Flame, tone: 'bad' },
          { at: [5, 3.5], text: 'degraded read: decode 6/9', tone: 'warn' },
        ],
      },
      metrics: { put: '120 ms' },
      bad: ['put'],
    },
    {
      short: 'Recap',
      title: 'The whole object store',
      tag: 'Recap',
      body: [
        'A **sharded metadata plane** maps keys to placements; a **data plane** spreads bytes across zones. PUTs wait for a **write quorum**, then commit metadata for read-after-write. **Erasure coding** cuts cost at equal durability.',
        'Constant scrubbing and massively parallel repair keep ahead of failing disks, and multipart uploads make huge objects routine.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Durability is a race between failure and repair. Spread data widely, detect loss early and rebuild in parallel to stay ahead.' },
      scene: {
        nodes: cs('client', 'fe', 'meta', 'm1', 'm2', 'z1', 'z2', 'z3', 'repair'),
        links: [...csLinks, ...csRepair],
        flows: [
          F(['client', 'fe', 'z1'], { kind: 'data' }),
          F(['fe', 'z3'], { kind: 'data', delay: 0.8 }),
          F(['fe', 'meta', 'm2'], { kind: 'data', delay: 1.6 }),
          F(['repair', 'z2'], { ret: true, retKind: 'data', delay: 2 }),
        ],
      },
      metrics: { dur: '11 nines', cost: '1.5×', put: '45 ms', objs: '1T' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 22 · Design Google Docs                                             */
/* ------------------------------------------------------------------ */

const gd = cast({
  alice: { kind: 'device', at: [-7, -3.5], tag: 'alice', tagIcon: User },
  bob: { kind: 'device', at: [-7, 3.5], tag: 'bob', tagIcon: User },
  gw: { kind: 'cube', at: [-3.5, 0], label: 'Gateway', sub: 'WebSocket', icon: Split, tone: 'green' },
  router: { kind: 'cube', at: [-3.5, -4], label: 'Router', sub: 'doc → srv', icon: Route, tone: 'yellow', size: 'sm' },
  collab: { kind: 'cube', at: [0, 0], label: 'Collab', sub: 'doc 42', icon: Server, tone: 'blue' },
  collab2: { kind: 'cube', at: [0, -3.5], label: 'Collab', sub: 'doc 77', icon: Server, tone: 'blue', size: 'sm' },
  oplog: { kind: 'db', at: [3.5, -3.5], tag: 'op log', icon: ScrollText },
  snaps: { kind: 'slab', at: [3.5, 3.5], tag: 'snapshots', icon: Camera, tone: 'violet' },
});

const gdLinks = [
  L('alice', 'gw', { arrow: 'both' }),
  L('bob', 'gw', { arrow: 'both' }),
  L('gw', 'router', { arrow: 'both' }),
  L('gw', 'collab', { arrow: 'both' }),
  L('collab', 'oplog', { label: 'append' }),
  L('collab', 'snaps'),
];

export const qDocs: Question = {
  id: 'q-docs',
  n: 22,
  title: 'Design Google Docs',
  blurb: 'Let many people type into the same document at once and always end up with the same text.',
  minutes: 15,
  level: 'Advanced',
  concepts: ['Collaborative Editing', 'CRDT/OT'],
  related: ['realtime', 'consistent-hashing', 'storage-engines', 'cap', 'chat'],
  followUps: [
    'How would you implement undo when other people edit in between?',
    'How would you support comments anchored to text that keeps moving?',
    'What changes if a document has 1,000 simultaneous viewers?',
    'How would you show the history and restore an older version?',
  ],
  keywords: ['google docs', 'collaborative editing', 'operational transformation', 'ot', 'crdt', 'websocket', 'presence', 'cursor', 'snapshot'],
  metrics: [
    { id: 'echo', label: 'Peer sees edit', icon: Timer },
    { id: 'ops', label: 'Ops / s', icon: Activity },
    { id: 'docs', label: 'Open docs', icon: FileText },
    { id: 'agree', label: 'Copies agree', icon: CircleCheck },
  ],
  learn: [
    { text: 'One owner per document: route by doc id', at: 3 },
    { text: 'Operational Transformation with a concrete example', at: 4 },
    { text: 'CRDTs and when to prefer them', at: 5 },
    { text: 'Op log, snapshots and ephemeral presence', at: 6 },
    { text: 'Offline edits and failover', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Many cursors, one document',
      tag: 'Requirements',
      body: [
        'Functional: several people edit the same document **at the same time**, see each other’s changes and **cursors** live, keep editing **offline**, and browse version history.',
        'Non-functional: a peer sees an edit in **< 200 ms**, up to ~100 simultaneous editors per doc, millions of open docs, no lost keystrokes, and every copy **converges** to the same text. Out of scope: comments, permissions, formatting details.',
      ],
      callout: { kind: 'tip', text: 'Name the hard part early: concurrent edits to the same text. Everything else is a fairly standard real-time service.' },
      scene: {
        nodes: gd('alice', 'bob', ['gw', { label: 'Docs', sub: '?', icon: FileText, tone: 'blue' }]),
        links: [L('alice', 'gw', { arrow: 'both' }), L('bob', 'gw', { arrow: 'both' })],
        flows: [F(['alice', 'gw', 'bob'], { kind: 'event' }), F(['bob', 'gw', 'alice'], { kind: 'event', delay: 1.2 })],
        notes: [
          { at: [1.5, -3], text: 'edits visible < 200 ms', icon: Timer },
          { at: [1.5, -2], text: 'all copies converge', icon: CircleCheck, tone: 'good' },
          { at: [1.5, 2], text: 'works offline', icon: WifiOff },
          { at: [1.5, 3], text: 'out: comments, perms', tone: 'warn' },
        ],
      },
      metrics: { echo: '< 200 ms', ops: '—', docs: '—', agree: '—' },
    },
    {
      short: 'Numbers',
      title: 'Big in total, small per doc',
      tag: 'Estimation',
      body: [
        '~**5M docs open** at peak with ~2M people actively typing. Clients batch keystrokes into an op every ~250 ms, so ≈ **4–8M ops/s** overall; at ~100 B each that is under 1 GB/s.',
        'Per document it is tiny: 100 editors × 4 ops/s = **400 ops/s**, easy for one process. So the problem is spreading millions of small, stateful docs — not making one doc fast.',
      ],
      scene: {
        nodes: gd('alice', 'bob', ['gw', { label: 'Docs', sub: '?', icon: FileText, tone: 'blue' }]),
        links: [L('alice', 'gw', { arrow: 'both' }), L('bob', 'gw', { arrow: 'both' })],
        flows: [F(['alice', 'gw'], { kind: 'event', n: 3, speed: 1.4 }), F(['bob', 'gw'], { kind: 'event', n: 3, speed: 1.4, delay: 0.4 })],
        notes: [
          { at: [1.5, -3], text: '5M open docs', icon: FileText },
          { at: [1.5, -2], text: '2M typists × 4 ops/s', icon: Activity },
          { at: [1.5, 2], text: '≈ 8M ops/s total', tone: 'warn' },
          { at: [1.5, 3], text: '≤ 400 ops/s per doc', tone: 'good' },
        ],
      },
      metrics: { ops: '8M /s', docs: '5M' },
    },
    {
      short: 'API & data',
      title: 'Operations over a WebSocket',
      tag: 'API',
      body: [
        'Client → server: `{type: "op", doc: 42, rev: 118, op: [retain 5, insert "x"]}`. Server → author: `{ack, rev: 119}`; to everyone else: the op with its new rev. Cursors travel as `{type: "cursor", pos: 37}`.',
        'Storage: `ops(doc_id, rev, user_id, op, ts)` keyed by `(doc_id, rev)` — an append-only log — plus `snapshots(doc_id, rev, content)` so loading never replays the whole history.',
      ],
      scene: {
        nodes: gd('alice', 'gw', 'collab', 'oplog'),
        links: [L('alice', 'gw', { arrow: 'both', label: 'op rev 118' }), L('gw', 'collab', { arrow: 'both' }), L('collab', 'oplog', { label: 'append' })],
        flows: [F(['alice', 'gw', 'collab'], { kind: 'event', ret: true }), F(['collab', 'oplog'], { kind: 'data', delay: 1.2 })],
        notes: [
          { at: [4, 2.5], text: '(42, 119) insert "x" @5', icon: ScrollText },
          { at: [-5, 2.5], text: 'ack rev 119', tone: 'good' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'One owner per document',
      tag: 'Design',
      body: [
        'Clients hold a **WebSocket** to a gateway. A **router** (consistent hashing plus a lease) maps each doc id to exactly one **collaboration server**, which keeps the live doc in memory and orders every op for it.',
        'The collab server appends each op to the **op log** before acking and periodically writes **snapshots**. Other docs live on other servers, so capacity grows by adding servers.',
      ],
      changes: [
        { sign: '+', text: 'Gateway + router' },
        { sign: '+', text: 'Collab servers' },
        { sign: '+', text: 'Op log + snapshots' },
      ],
      scene: {
        nodes: gd('alice', 'bob', 'gw', 'router', ['collab', { meter: 35 }], 'collab2', 'oplog', 'snaps'),
        links: [...gdLinks, L('gw', 'collab2'), L('collab2', 'oplog')],
        flows: [
          F(['alice', 'gw', 'router'], { ret: true }),
          F(['alice', 'gw', 'collab'], { kind: 'event', delay: 1 }),
          F(['collab', 'gw', 'bob'], { kind: 'event', delay: 1.8 }),
          F(['collab', 'oplog'], { kind: 'data', delay: 1.8 }),
        ],
      },
      metrics: { echo: '80 ms' },
    },
    {
      short: 'OT',
      title: 'Transform concurrent operations',
      tag: 'Deep Dive',
      body: [
        'Doc is “Hi”. Alice inserts “!” at 2 → “Hi!”. At the same moment Bob inserts “Oh, ” at 0 → “Oh, Hi”. Applying Alice’s op unchanged on Bob’s copy gives “Oh!, Hi” — the copies **diverge**.',
        '**Operational Transformation**: the server gives ops a total order. Alice’s op was based on rev 1 but Bob’s became rev 2, so the server **shifts** it past Bob’s 4 inserted characters: insert “!” at 6 → “Oh, Hi!” everywhere.',
      ],
      callout: { kind: 'key', text: 'OT needs one place to define the order. That is exactly what the per-document collab server gives you.' },
      scene: {
        nodes: gd(['alice', { tag: 'Hi!' }], ['bob', { tag: 'Oh, Hi' }], 'gw', ['collab', { meter: 40, sub: 'rev 2' }]),
        links: [L('alice', 'gw', { arrow: 'both' }), L('bob', 'gw', { arrow: 'both' }), L('gw', 'collab', { arrow: 'both' })],
        flows: [
          F(['bob', 'gw', 'collab'], { kind: 'event' }),
          F(['alice', 'gw', 'collab'], { kind: 'event', delay: 0.4 }),
          F(['collab', 'gw', 'bob'], { kind: 'data', delay: 1.8 }),
          F(['collab', 'gw', 'alice'], { kind: 'data', delay: 1.8 }),
        ],
        notes: [
          { at: [3.5, -3], text: 'naive: “Oh!, Hi” ✗', tone: 'bad' },
          { at: [3.5, -2], text: 'ins(2,"!") → ins(6,"!")', icon: GitMerge },
          { at: [3.5, 2.5], text: 'both: “Oh, Hi!” ✓', tone: 'good' },
        ],
      },
      metrics: { agree: 'Yes' },
      hi: ['agree'],
    },
    {
      short: 'CRDT',
      title: 'CRDTs: merge in any order',
      tag: 'Trade-off',
      body: [
        'A **CRDT** gives every character a unique, ordered id like `(counter, siteId)` and inserts relative to neighbours’ ids, not indexes. Concurrent inserts **commute**, so any replica applying the same set of ops in any order converges — no central server needed.',
        'That suits offline-first and peer-to-peer apps. Costs: per-character ids and tombstones bloat memory, and concurrent runs can interleave oddly. With a server already ordering ops, OT is lean; pick CRDTs when offline is the norm.',
      ],
      scene: {
        nodes: gd(['alice', { tag: 'Oh, Hi!' }], ['bob', { tag: 'Oh, Hi!' }], 'gw', 'collab'),
        links: [L('alice', 'gw', { arrow: 'both' }), L('bob', 'gw', { arrow: 'both' }), L('gw', 'collab', { arrow: 'both' })],
        flows: [
          F(['alice', 'gw', 'bob'], { kind: 'event' }),
          F(['bob', 'gw', 'alice'], { kind: 'event', delay: 0.6 }),
          F(['gw', 'collab'], { kind: 'data', delay: 1.4 }),
        ],
        notes: [
          { at: [3.5, -3], text: '"!" after id (1, alice)', icon: Hash },
          { at: [3.5, -2], text: 'any order → same text', tone: 'good' },
          { at: [3.5, 2.5], text: 'cost: ids + tombstones', tone: 'warn' },
        ],
      },
    },
    {
      short: 'Log + cursor',
      title: 'Durable ops, ephemeral presence',
      tag: 'Deep Dive',
      body: [
        'Each op is appended to the **op log** before it is acked, so an ack means durable. Every ~1,000 ops the collab server writes a **snapshot**; opening a doc = latest snapshot + replay of the short tail. The log doubles as version history.',
        '**Cursors and presence** are ephemeral: broadcast through the same collab server, throttled to ~10/s, shifted by incoming ops like any position, and never persisted.',
      ],
      scene: {
        nodes: gd('alice', 'bob', 'gw', 'router', ['collab', { meter: 45 }], 'oplog', 'snaps'),
        links: gdLinks,
        flows: [
          F(['alice', 'gw', 'collab', 'oplog'], { kind: 'data' }),
          F(['collab', 'snaps'], { kind: 'data', delay: 1.6 }),
          F(['bob', 'gw', 'alice'], { kind: 'event', n: 2, delay: 0.8 }),
        ],
        notes: [
          { at: [6.5, -2], text: 'snapshot every 1,000 ops', icon: Camera },
          { at: [6.5, 0], text: 'load = snap + tail', tone: 'good' },
          { at: [6.5, 2], text: 'cursor @37 · not stored', icon: MousePointer2 },
        ],
      },
      metrics: { echo: '80 ms' },
    },
    {
      short: 'Offline',
      title: 'Edit offline, catch up later',
      tag: 'Deep Dive',
      body: [
        'Bob loses Wi-Fi at rev 118 and keeps typing; his client stores pending ops locally (e.g. IndexedDB). On reconnect it sends them with **base rev 118**; the server transforms them against revs 119–240 from others, and Bob transforms those against his own.',
        'Long divergence means big transforms and surprising merges, so clients show “reconnecting” and cap offline time — or a CRDT doc model makes this the easy case.',
      ],
      scene: {
        nodes: gd('alice', ['bob', { status: 'dim', tag: 'bob · offline' }], 'gw', 'router', ['collab', { meter: 45 }], 'oplog', 'snaps'),
        links: [gdLinks[0], L('bob', 'gw', { arrow: 'both', dashed: true }), ...gdLinks.slice(2)],
        flows: [
          F(['alice', 'gw', 'collab', 'oplog'], { kind: 'data', n: 2 }),
          F(['bob', 'gw', 'collab'], { kind: 'event', n: 3, delay: 1.6 }),
          F(['collab', 'gw', 'bob'], { kind: 'data', delay: 2.6 }),
        ],
        notes: [
          { at: [-4, 6], text: '12 local ops @ base 118', icon: WifiOff },
          { at: [3, -6], text: 'transform vs 119–240', icon: GitMerge, tone: 'good' },
        ],
      },
    },
    {
      short: 'Bottleneck',
      title: 'A collab server dies',
      tag: 'Bottleneck',
      body: [
        'The server owning doc 42 crashes. Its **lease** in the router expires, another server claims the doc, loads snapshot + log, and clients reconnect and resend unacked ops. Nothing acked is lost, because acked means logged.',
        'A doc with **10k viewers** overloads one owner with fan-out. Keep the owner for the few editors and push ops to viewers through a separate **broadcast tier**.',
      ],
      callout: { kind: 'warn', text: 'Two servers believing they own one doc would fork it. Use leases with fencing tokens so a stale owner’s writes are rejected.' },
      scene: {
        nodes: gd('alice', 'bob', 'gw', ['router', { status: 'hot' }], ['collab', { status: 'down' }], ['collab2', { sub: 'now 42', meter: 50 }], 'oplog', 'snaps'),
        links: [gdLinks[0], gdLinks[1], gdLinks[2], L('gw', 'collab', { tone: 'bad', dashed: true }), L('gw', 'collab2', { arrow: 'both', tone: 'good' }), L('collab2', 'oplog', { arrow: 'both', label: 'replay' })],
        flows: [
          F(['alice', 'gw', 'collab'], { kind: 'error', stop: true }),
          F(['gw', 'router'], { ret: true, delay: 0.8 }),
          F(['oplog', 'collab2'], { kind: 'data', delay: 1.2 }),
          F(['bob', 'gw', 'collab2'], { kind: 'event', delay: 2 }),
        ],
        notes: [
          { at: [5.5, 0], text: 'lease expired → reassign', icon: Route, tone: 'warn' },
          { at: [-4, 6], text: 'resend unacked ops', tone: 'good' },
        ],
      },
      metrics: { echo: '2 s' },
      bad: ['echo'],
    },
    {
      short: 'Recap',
      title: 'The whole collaborative editor',
      tag: 'Recap',
      body: [
        'Route every editor of a doc to **one collab server** over WebSockets. It orders ops, **transforms** concurrent ones (OT) and broadcasts them; **CRDTs** are the alternative when offline is the norm.',
        'Ops are logged before acking and **snapshotted** for fast loads; presence is ephemeral; leases move docs when servers fail.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Give each document a single ordering point. Convergence then becomes a property of the algorithm, not luck in timing.' },
      scene: {
        nodes: gd('alice', 'bob', 'gw', 'router', ['collab', { meter: 40 }], 'collab2', 'oplog', 'snaps'),
        links: [...gdLinks, L('gw', 'collab2'), L('collab2', 'oplog')],
        flows: [
          F(['alice', 'gw', 'collab'], { kind: 'event' }),
          F(['collab', 'gw', 'bob'], { kind: 'event', delay: 0.9 }),
          F(['collab', 'oplog'], { kind: 'data', delay: 0.9 }),
          F(['collab', 'snaps'], { kind: 'data', delay: 2 }),
        ],
      },
      metrics: { echo: '80 ms', ops: '8M /s', docs: '5M', agree: 'Yes' },
    },
  ],
};
