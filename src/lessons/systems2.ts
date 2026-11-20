import {
  BellRing,
  CheckCheck,
  Database,
  Globe,
  Hourglass,
  Image,
  KeyRound,
  ListOrdered,
  MessageSquare,
  Network,
  Newspaper,
  PenLine,
  Plug,
  Server,
  Share2,
  ShieldCheck,
  Sparkles,
  Timer,
  User,
  Users,
  Zap,
} from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* Design a News Feed                                                  */
/* ------------------------------------------------------------------ */

const nf = cast({
  author: { kind: 'phone', at: [-3.5, -3.5], tag: 'author', tagIcon: PenLine },
  reader: { kind: 'device', at: [-3.5, 3.5], tag: 'reader', tagIcon: User },
  post: { kind: 'cube', at: [0, -3.5], label: 'Post', sub: 'write API', icon: PenLine, tone: 'blue' },
  feed: { kind: 'cube', at: [0, 3.5], label: 'Feed', sub: 'read API', icon: Newspaper, tone: 'blue' },
  posts: { kind: 'db', at: [0, 0], tag: 'posts', icon: Database },
  queue: { kind: 'queue', at: [3.5, -3.5], tag: 'new posts', items: 2 },
  fanout: { kind: 'cube', at: [7, -3.5], label: 'Fan-out', sub: 'workers', icon: Share2, tone: 'blue' },
  graph: { kind: 'db', at: [3.5, 0], tag: 'social graph', icon: Network },
  cache: { kind: 'cube', at: [7, 3.5], label: 'Feeds', sub: 'ids/user', icon: Zap, tone: 'orange' },
  ranker: { kind: 'cube', at: [3.5, 3.5], label: 'Ranker', sub: 'model', icon: Sparkles, tone: 'blue', size: 'sm' },
  blobs: { kind: 'slab', at: [-7, 0], tag: 'media store', icon: Image, tone: 'violet' },
  cdn: { kind: 'cube', at: [-7, 3.5], label: 'CDN', sub: 'edge', icon: Globe, tone: 'teal', size: 'sm' },
});

/** Links of the push pipeline, shared by the later steps. */
const pushLinks = [
  L('author', 'post', { arrow: 'both' }),
  L('post', 'posts'),
  L('post', 'queue'),
  L('queue', 'fanout'),
  L('fanout', 'graph', { arrow: 'both' }),
  L('fanout', 'cache'),
  L('reader', 'feed', { arrow: 'both' }),
  L('feed', 'posts', { arrow: 'both' }),
];

export const newsFeed: Lesson = {
  id: 'news-feed',
  title: 'Design a News Feed',
  blurb: 'Precompute feeds for 300M people without drowning when a celebrity with 50M followers posts.',
  minutes: 15,
  level: 'Advanced',
  keywords: ['news feed', 'timeline', 'fan-out on write', 'fan-out on read', 'celebrity problem', 'hybrid fan-out', 'feed ranking', 'cursor pagination', 'system design interview'],
  metrics: [
    { id: 'reads', label: 'Feed loads', icon: Newspaper },
    { id: 'p99', label: 'Feed p99', icon: Timer },
    { id: 'fanout', label: 'Writes per post', icon: Share2 },
    { id: 'lag', label: 'Post → feeds', icon: Hourglass },
  ],
  learn: [
    { text: 'Sizing a read-dominated system', at: 0 },
    { text: 'Fan-out on read vs fan-out on write', at: 2 },
    { text: 'Hybrid fan-out for celebrity accounts', at: 4 },
    { text: 'Splitting ids, posts and media across stores', at: 5 },
    { text: 'Cursor pagination over a live, ranked feed', at: 7 },
  ],
  steps: [
    {
      short: 'Brief',
      title: 'A feed for 300M people',
      tag: 'Problem',
      body: [
        'Brief: show each user recent posts from the accounts they follow. Assume **300M daily users** with ~10 feed loads each, **200 follows** on average, and a few accounts with **50M followers**. A page must load in **under 200 ms**.',
        'Napkin math: 3B loads/day ≈ **35k reads/s**, ~100k/s at peak. If one user in ten posts daily, that is ~30M posts/day ≈ **350 writes/s**. Reads outnumber writes about 100 to 1, so the read path is where the design lives.',
      ],
      callout: { kind: 'key', text: 'Feeds are read-dominated: any work you can move from read time to write time is worth a look.' },
      scene: {
        nodes: nf('author', 'reader', 'post', 'feed'),
        links: [L('author', 'post', { arrow: 'both', label: 'POST /posts' }), L('reader', 'feed', { arrow: 'both', label: 'GET /feed' })],
        flows: [F(['author', 'post'], { kind: 'data', ret: true }), F(['reader', 'feed'], { ret: true, n: 3, delay: 0.5 })],
        notes: [
          { at: [4, -3.5], text: '≈ 350 posts / s', icon: PenLine },
          { at: [4, 3.5], text: '≈ 100k feed loads / s', icon: Newspaper },
          { at: [4, 0], text: '200 follows · max 50M fans', icon: Users },
        ],
      },
      metrics: { reads: '100k /s', p99: '—', fanout: '—', lag: '—' },
    },
    {
      short: 'Pull',
      title: 'Fan-out on read',
      tag: 'Technique',
      body: [
        'Simplest design: store each post once. To build a feed, ask the **social graph** who the reader follows, fetch the latest posts of all 200 accounts, merge by time and return the top 20. This is **fan-out on read** (pull).',
        'Writes are trivial, but every load fires ~200 lookups across many shards and waits for the slowest. At 100k loads/s that is **20M lookups/s**, and the tail latency of 200 parallel calls blows straight through the 200 ms budget.',
      ],
      changes: [{ sign: '+', text: 'Post store' }, { sign: '+', text: 'Social graph' }],
      scene: {
        nodes: nf('author', 'reader', 'post', 'feed', ['posts', { meter: 92, status: 'hot' }], 'graph'),
        links: [
          L('author', 'post', { arrow: 'both' }),
          L('post', 'posts'),
          L('reader', 'feed', { arrow: 'both' }),
          L('feed', 'graph', { arrow: 'both', label: 'who I follow' }),
          L('feed', 'posts', { arrow: 'both' }),
        ],
        flows: [
          F(['reader', 'feed', 'graph'], { kind: 'request', ret: true, retKind: 'data' }),
          F(['feed', 'posts'], { ret: true, retKind: 'data', n: 5, speed: 1.4, delay: 0.8 }),
          F(['author', 'post', 'posts'], { kind: 'data', delay: 1.6 }),
        ],
        notes: [{ at: [-3.5, 0], text: '200 lookups per load', tone: 'bad' }],
      },
      metrics: { p99: '900 ms', fanout: '1', lag: 'instant' },
      bad: ['p99'],
    },
    {
      short: 'Push',
      title: 'Fan-out on write',
      tag: 'Technique',
      body: [
        'Flip the work. When someone posts, put an event on a **queue**; **fan-out workers** read the author’s follower list and prepend the post id to each follower’s **feed cache** — a capped, in-memory list of ~500 ids per user.',
        'A feed load is now one list fetch plus a batch lookup of 20 posts: **one round trip** instead of 200. With 200 followers on average, 350 posts/s become ~70k tiny list inserts/s — routine for an in-memory cluster.',
      ],
      changes: [{ sign: '+', text: 'Post queue' }, { sign: '+', text: 'Fan-out workers' }, { sign: '+', text: 'Per-user feed cache' }],
      scene: {
        nodes: nf('author', 'reader', 'post', 'feed', ['posts', { meter: 30 }], 'graph', 'queue', ['fanout', { meter: 40 }], ['cache', { meter: 45 }]),
        links: [...pushLinks, L('feed', 'cache', { arrow: 'both', label: 'my 500 ids' })],
        flows: [
          F(['author', 'post', 'queue', 'fanout'], { kind: 'event' }),
          F(['fanout', 'graph'], { kind: 'request', ret: true, retKind: 'data', delay: 1.4 }),
          F(['fanout', 'cache'], { kind: 'data', n: 3, delay: 2 }),
          F(['reader', 'feed', 'cache'], { ret: true, delay: 0.6 }),
          F(['feed', 'posts'], { ret: true, retKind: 'data', delay: 1.4 }),
        ],
        notes: [{ at: [-3.5, 0], text: '1 list read + 20 posts', tone: 'good' }],
      },
      metrics: { p99: '60 ms', fanout: '≈ 200', lag: '≈ 2 s' },
      hi: ['p99'],
      bad: ['fanout', 'lag'],
    },
    {
      short: 'Celebrity',
      title: 'The 50M-follower problem',
      tag: 'Trade-off',
      body: [
        'Now a pop star with **50M followers** posts. Fan-out on write means 50M list inserts for a single post. Even at 1M inserts/s across the cluster that takes most of a minute, and a few such posts together back up the queue for everyone.',
        'Much of that work is wasted: many followers won’t open the app before the post goes stale. Pure push keeps reads cheap but makes write cost proportional to **follower count** — and follower counts are wildly uneven.',
      ],
      callout: { kind: 'warn', text: 'Skewed data breaks averages. Design for the biggest account on the platform, not the typical one.' },
      scene: {
        nodes: nf(
          ['author', { tag: 'star · 50M fans' }],
          'reader',
          'post',
          'feed',
          ['posts', { meter: 30 }],
          'graph',
          ['queue', { items: 7, tone: 'rose' }],
          ['fanout', { meter: 100, status: 'hot' }],
          ['cache', { meter: 96, status: 'hot' }],
        ),
        links: [...pushLinks, L('feed', 'cache', { arrow: 'both' })],
        flows: [
          F(['author', 'post', 'queue', 'fanout'], { kind: 'event', n: 2 }),
          F(['fanout', 'cache'], { kind: 'data', n: 7, speed: 2 }),
          F(['reader', 'feed', 'cache'], { ret: true, retKind: 'error', delay: 1 }),
        ],
        notes: [{ at: [-3.5, 0], text: '1 post → 50M inserts', tone: 'bad' }],
      },
      metrics: { p99: '350 ms', fanout: '50M', lag: '≈ 1 min' },
      bad: ['p99', 'fanout', 'lag'],
    },
    {
      short: 'Hybrid',
      title: 'Push for most, pull for stars',
      tag: 'Technique',
      body: [
        'Use both. Accounts under a threshold (say **100k followers**) are pushed as before. Posts from bigger accounts are **not fanned out**: they stay in the post store, where a small hot cache keeps each star’s recent posts.',
        'At read time the feed service takes the precomputed list and **merges in** recent posts from the few stars this reader follows — a handful of extra lookups, not 200. Many systems also skip pushing to users idle for weeks and rebuild their feed when they return.',
      ],
      changes: [{ sign: '~', text: 'Fan-out skips big accounts' }, { sign: '+', text: 'Merge star posts at read time' }],
      scene: {
        nodes: nf(
          ['author', { tag: 'star · 50M fans' }],
          'reader',
          'post',
          'feed',
          ['posts', { meter: 40 }],
          'graph',
          'queue',
          ['fanout', { meter: 35 }],
          ['cache', { meter: 50 }],
        ),
        links: [...pushLinks, L('feed', 'cache', { arrow: 'both' })],
        flows: [
          F(['author', 'post', 'posts'], { kind: 'data' }),
          F(['post', 'queue', 'fanout', 'cache'], { kind: 'event', delay: 1.6 }),
          F(['reader', 'feed', 'cache'], { ret: true, delay: 0.4 }),
          F(['feed', 'posts'], { ret: true, retKind: 'data', delay: 1.2 }),
        ],
        notes: [
          { at: [4, -6], text: '< 100k fans → push', tone: 'good' },
          { at: [-3.5, 0], text: 'stars → pull + merge', tone: 'good' },
        ],
      },
      metrics: { p99: '90 ms', fanout: '≤ 100k', lag: '≈ 2 s' },
      hi: ['p99', 'fanout', 'lag'],
    },
    {
      short: 'Storage',
      title: 'Four stores, four shapes',
      tag: 'Insight',
      body: [
        'Give each kind of data the store that fits it. **Posts**: text and metadata keyed by a time-sortable 64-bit id. **Graph**: follower and following lists per user. **Feed cache**: ids only — 500 × 8 B per user, so 300M users fit in a few TB of RAM.',
        'Photos and video are most of the bytes, so they skip all of that: the app uploads them straight to **object storage** with a pre-signed URL, the post keeps only the URL, and readers fetch them from a nearby **CDN** edge.',
      ],
      callout: { kind: 'tip', text: 'Feed lists hold ids, never full posts. An edit or delete then changes one row, not 50M cached copies.' },
      changes: [{ sign: '+', text: 'Object storage for media' }, { sign: '+', text: 'CDN in front of media' }],
      scene: {
        nodes: nf('author', 'reader', 'post', 'feed', ['posts', { meter: 40 }], 'graph', 'queue', ['fanout', { meter: 35 }], ['cache', { meter: 50 }], 'blobs', 'cdn'),
        links: [
          ...pushLinks,
          L('feed', 'cache', { arrow: 'both' }),
          L('author', 'blobs', { label: 'upload' }),
          L('blobs', 'cdn'),
          L('cdn', 'reader'),
        ],
        flows: [
          F(['author', 'blobs'], { kind: 'data' }),
          F(['blobs', 'cdn', 'reader'], { kind: 'data', delay: 1 }),
          F(['reader', 'feed', 'cache'], { ret: true, delay: 0.5 }),
          F(['author', 'post', 'queue', 'fanout', 'cache'], { kind: 'event', delay: 1.8 }),
        ],
      },
    },
    {
      short: 'Ranking',
      title: 'Rank, don’t just sort',
      tag: 'Technique',
      body: [
        'Newest-first is easy but rarely what people want. A **ranker** takes ~500 candidate ids from the feed cache (plus merged star posts), scores each with a light model — affinity to the author, early engagement, recency — and keeps the top 50.',
        'Scoring must fit the budget: batch the feature lookups and cap the model at ~30 ms; heavier models run offline and precompute features. Ranking costs latency and makes order shift between requests, which matters for paging.',
      ],
      changes: [{ sign: '+', text: 'Ranker between feed and cache' }],
      scene: {
        nodes: nf('author', 'reader', 'post', 'feed', ['posts', { meter: 40 }], 'graph', 'queue', ['fanout', { meter: 35 }], ['cache', { meter: 50 }], 'blobs', 'cdn', 'ranker'),
        links: [...pushLinks, L('feed', 'ranker', { arrow: 'both' }), L('ranker', 'cache', { arrow: 'both' }), L('author', 'blobs'), L('blobs', 'cdn'), L('cdn', 'reader')],
        flows: [
          F(['reader', 'feed', 'ranker', 'cache'], { ret: true }),
          F(['feed', 'posts'], { ret: true, retKind: 'data', delay: 1.4 }),
          F(['blobs', 'cdn', 'reader'], { kind: 'data', delay: 2 }),
        ],
        notes: [{ at: [-3.5, 0], text: '500 candidates → top 50', icon: Sparkles }],
      },
      metrics: { p99: '120 ms' },
      bad: ['p99'],
    },
    {
      short: 'Paging',
      title: 'Cursors, not page numbers',
      tag: 'Technique',
      body: [
        '`?page=2` breaks on a live feed: new posts land at the top, everything shifts, and users see repeats or miss items. Return an opaque **cursor** with each page instead: `GET /feed?cursor=…&limit=20`.',
        'For a time-ordered feed the cursor is the last post id seen (“older than X”), and time-sortable ids make that a cheap range read. For a ranked feed, keep the ranked list briefly as a **session snapshot** and let the cursor be a position in it.',
      ],
      scene: {
        nodes: nf('author', 'reader', 'post', 'feed', ['posts', { meter: 40 }], 'graph', 'queue', ['fanout', { meter: 35 }], ['cache', { meter: 50 }], 'blobs', 'cdn', 'ranker'),
        links: [
          ...pushLinks,
          L('feed', 'ranker', { arrow: 'both' }),
          L('ranker', 'cache', { arrow: 'both' }),
          L('author', 'blobs'),
          L('blobs', 'cdn'),
          L('cdn', 'reader'),
        ],
        flows: [F(['reader', 'feed', 'ranker'], { ret: true, n: 3 }), F(['author', 'post', 'queue', 'fanout'], { kind: 'event', delay: 1.2 })],
        notes: [{ at: [-3.5, 0], text: 'next: cursor=7f3a…', icon: KeyRound, tone: 'good' }],
      },
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Reads beat writes 100 to 1, so **fan-out on write** precomputes per-user lists of post ids, while **pull-and-merge** handles accounts with huge followings. Each data shape has its own store, media rides **object storage + CDN**, a ranker orders candidates and **cursors** page through them.',
        'In an interview, raise the celebrity problem before you are asked, and say where you would set the push/pull threshold and why.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'When reads dominate, move work to write time — but cap that work, because follower counts are wildly skewed.' },
      scene: {
        nodes: nf('author', 'reader', 'post', 'feed', ['posts', { meter: 40 }], 'graph', 'queue', ['fanout', { meter: 35 }], ['cache', { meter: 50 }], 'blobs', 'cdn', 'ranker'),
        links: [
          ...pushLinks,
          L('feed', 'ranker', { arrow: 'both' }),
          L('ranker', 'cache', { arrow: 'both' }),
          L('author', 'blobs'),
          L('blobs', 'cdn'),
          L('cdn', 'reader'),
        ],
        flows: [
          F(['author', 'post', 'queue', 'fanout', 'cache'], { kind: 'event' }),
          F(['reader', 'feed', 'ranker', 'cache'], { ret: true, delay: 0.8 }),
          F(['blobs', 'cdn', 'reader'], { kind: 'data', delay: 1.6 }),
        ],
      },
      metrics: { reads: '100k /s', p99: '120 ms', fanout: '≤ 100k', lag: '≈ 2 s' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Design a Chat System                                                */
/* ------------------------------------------------------------------ */

const ch = cast({
  alice: { kind: 'phone', at: [-7, 0], tag: 'alice', tagIcon: User },
  ws1: { kind: 'cube', at: [-3.5, 0], label: 'Conn', sub: 'ws-1', icon: Plug, tone: 'green' },
  chat: { kind: 'cube', at: [0, 0], label: 'Chat', sub: 'service', icon: MessageSquare, tone: 'blue' },
  ws2: { kind: 'cube', at: [3.5, 0], label: 'Conn', sub: 'ws-2', icon: Plug, tone: 'green' },
  bob: { kind: 'phone', at: [7, 0], tag: 'bob', tagIcon: User },
  registry: { kind: 'cube', at: [0, -4], label: 'Sessions', sub: 'registry', icon: Server, tone: 'yellow' },
  store: { kind: 'db', at: [0, 4], tag: 'messages', icon: Database },
  push: { kind: 'slab', at: [3.5, 3.5], tag: 'push (APNs/FCM)', icon: BellRing, tone: 'sand' },
  group: { kind: 'crowd', at: [7, -3.5], tag: 'group · 200', tagIcon: Users, items: 5 },
});

/** The core message path, shared by the later steps. */
const core = [
  L('alice', 'ws1', { arrow: 'both' }),
  L('ws1', 'chat', { arrow: 'both' }),
  L('chat', 'ws2', { arrow: 'both' }),
  L('ws2', 'bob', { arrow: 'both' }),
  L('chat', 'store', { arrow: 'both' }),
  L('chat', 'registry', { arrow: 'both' }),
];

export const chatSystem: Lesson = {
  id: 'chat',
  title: 'Design a Chat System',
  blurb: 'Route messages across 20M live sockets — in order, never lost, never shown twice.',
  minutes: 15,
  level: 'Advanced',
  keywords: ['chat system', 'messaging', 'websocket', 'presence', 'session registry', 'message ordering', 'sequence number', 'idempotency', 'push notifications', 'group chat'],
  metrics: [
    { id: 'conns', label: 'Live sockets', icon: Plug },
    { id: 'rate', label: 'Messages', icon: MessageSquare },
    { id: 'lat', label: 'Delivery p99', icon: Timer },
    { id: 'safety', label: 'Guarantee', icon: ShieldCheck },
  ],
  learn: [
    { text: 'Sizing a connection-heavy system', at: 0 },
    { text: 'Persistent WebSockets on connection servers', at: 1 },
    { text: 'Ordering with per-conversation sequence numbers', at: 2 },
    { text: 'Routing through a session registry', at: 3 },
    { text: 'Idempotent retries with client message ids', at: 5 },
  ],
  steps: [
    {
      short: 'Brief',
      title: 'Messages for 50M people',
      tag: 'Problem',
      body: [
        'Brief: one-to-one and group chat for a mobile app. Assume **50M daily users**, up to **20M online at once**, ~40 messages each per day. Messages must arrive **in order**, must never vanish, and must never appear twice.',
        'Napkin math: 2B messages/day ≈ **23k/s**, ~70k/s at peak. At ~200 B each that is 400 GB/day, about **150 TB a year**. Storage is routine; the hard part is holding 20M live connections and finding the right one for every message.',
      ],
      callout: { kind: 'key', text: 'Chat is a routing problem: each message must find the one socket its recipient holds right now.' },
      scene: {
        nodes: ch('alice', 'chat', 'bob'),
        links: [L('alice', 'chat', { arrow: 'both' }), L('chat', 'bob', { arrow: 'both' })],
        flows: [F(['alice', 'chat', 'bob'], { kind: 'data' }), F(['bob', 'chat', 'alice'], { kind: 'data', delay: 1.5 })],
        notes: [
          { at: [-3.5, -3.5], text: '20M online at once', icon: Plug },
          { at: [3.5, -3.5], text: '≈ 70k msgs / s peak', icon: MessageSquare },
          { at: [0, 3.5], text: '≈ 150 TB / year', icon: Database },
        ],
      },
      metrics: { conns: '20M', rate: '70k /s', lat: '—', safety: '—' },
    },
    {
      short: 'Sockets',
      title: 'Keep a socket open',
      tag: 'Technique',
      body: [
        'Polling every few seconds would mean millions of empty requests. Instead each app opens one **WebSocket** and keeps it: either side can send at any moment, and a tiny heartbeat every ~30 s detects dead links.',
        'Sockets end on **connection servers** that only hold sockets and forward frames. At ~50k sockets per box, 20M users need about **400 servers**. If one dies, its clients reconnect through the balancer to another — no data lives there.',
      ],
      changes: [{ sign: '+', text: 'Connection servers ws-1, ws-2' }],
      scene: {
        nodes: ch('alice', ['ws1', { meter: 50 }], 'chat', ['ws2', { meter: 50 }], 'bob'),
        links: [L('alice', 'ws1', { arrow: 'both', label: 'WebSocket' }), L('ws1', 'chat', { arrow: 'both' }), L('chat', 'ws2', { arrow: 'both' }), L('ws2', 'bob', { arrow: 'both', label: 'WebSocket' })],
        flows: [
          F(['alice', 'ws1'], { kind: 'handshake', ret: true, retKind: 'handshake' }),
          F(['bob', 'ws2'], { kind: 'handshake', ret: true, retKind: 'handshake', delay: 0.7 }),
          F(['alice', 'ws1', 'chat'], { kind: 'data', delay: 1.6 }),
        ],
        notes: [{ at: [0, -3.5], text: '≈ 50k sockets per box', icon: Server }],
      },
      metrics: { conns: '20M / 400 boxes' },
    },
    {
      short: 'Persist',
      title: 'Store first, then deliver',
      tag: 'Technique',
      body: [
        'Alice’s frame goes ws-1 → **chat service**, which writes it to the message store before doing anything else. Only after that write succeeds does Alice see her ✓. A crash after this point can no longer lose the message.',
        'The store is partitioned by `conversation_id`, so a conversation lives on one partition, and that partition assigns a **sequence number** per conversation (41, 42, 43…). Clients order by it — no trust in device clocks needed.',
      ],
      callout: { kind: 'tip', text: 'A wide-column store fits: partition key = conversation, clustering key = seq. “Messages after 41” is one sequential read.' },
      changes: [{ sign: '+', text: 'Message store (by conversation)' }],
      scene: {
        nodes: ch('alice', ['ws1', { meter: 50 }], ['chat', { meter: 35 }], ['ws2', { meter: 50 }], 'bob', ['store', { meter: 30 }]),
        links: [L('alice', 'ws1', { arrow: 'both' }), L('ws1', 'chat', { arrow: 'both' }), L('chat', 'ws2', { arrow: 'both' }), L('ws2', 'bob', { arrow: 'both' }), L('chat', 'store', { arrow: 'both' })],
        flows: [F(['alice', 'ws1', 'chat', 'store'], { kind: 'data', ret: true, retKind: 'response' })],
        notes: [
          { at: [-3.5, 3.5], text: 'stored → ✓ to alice', tone: 'good' },
          { at: [3.5, 4], text: 'conv 9f1c · seq 42', icon: ListOrdered },
        ],
      },
      metrics: { safety: 'durable' },
      hi: ['safety'],
    },
    {
      short: 'Route',
      title: 'Which server holds Bob?',
      tag: 'Technique',
      body: [
        'Bob’s socket sits on one of 400 servers. A **session registry** maps `user_id → server` (bob → ws-2). Connection servers write the entry when a socket opens and refresh it with a short TTL, so entries of crashed servers expire on their own.',
        'The chat service looks Bob up and forwards the message to ws-2, which pushes it down Bob’s open socket. End to end that is one durable write plus a few in-datacenter hops — comfortably under 200 ms.',
      ],
      changes: [{ sign: '+', text: 'Session registry' }],
      scene: {
        nodes: ch('alice', ['ws1', { meter: 50 }], ['chat', { meter: 35 }], ['ws2', { meter: 50 }], 'bob', ['store', { meter: 30 }], 'registry'),
        links: [...core.slice(0, 5), L('chat', 'registry', { arrow: 'both' })],
        notes: [{ at: [3.5, -4], text: 'bob → ws-2', icon: Server }],
        flows: [
          F(['alice', 'ws1', 'chat', 'store'], { kind: 'data' }),
          F(['chat', 'registry'], { kind: 'request', ret: true, retKind: 'data', delay: 1 }),
          F(['chat', 'ws2', 'bob'], { kind: 'data', delay: 2 }),
        ],
      },
      metrics: { lat: '150 ms' },
      hi: ['lat'],
    },
    {
      short: 'Offline',
      title: 'Bob is offline',
      tag: 'Case',
      body: [
        'Bob’s phone is in a tunnel, so the registry has no entry for him. The message is already stored, so nothing is lost: the chat service asks a **push service** (APNs / FCM) to wake his phone with a notification.',
        'When Bob reconnects, his app says “my last seq in this conversation is 41”. The server reads everything after 41 from the store and streams it down. The **last-seen sequence** makes catch-up cheap and gap-free.',
      ],
      changes: [{ sign: '+', text: 'Push notifications' }, { sign: '+', text: 'Sync from last-seen seq' }],
      scene: {
        nodes: ch('alice', ['ws1', { meter: 50 }], ['chat', { meter: 35 }], ['ws2', { meter: 50 }], 'bob', ['store', { meter: 30 }], 'registry', 'push'),
        links: [...core, L('chat', 'push'), L('push', 'bob', { dashed: true })],
        flows: [
          F(['chat', 'registry'], { kind: 'request', ret: true, retKind: 'error' }),
          F(['chat', 'push', 'bob'], { kind: 'event', delay: 1.2 }),
          F(['bob', 'ws2', 'chat', 'store'], { kind: 'request', ret: true, retKind: 'data', delay: 2.6 }),
        ],
        notes: [
          { at: [0, -6.5], text: 'bob: no session', tone: 'warn' },
          { at: [7, 3.5], text: 'sync: after seq 41', icon: ListOrdered, tone: 'good' },
        ],
      },
      metrics: { lat: 'push ≈ 2 s' },
    },
    {
      short: 'Retries',
      title: 'Exactly once, as users see it',
      tag: 'Trade-off',
      body: [
        'Networks drop acks. If Alice never gets her ✓ the app must resend — yet the first copy may already be stored. True exactly-once delivery is impossible over a lossy network, so aim for **at-least-once delivery plus dedup**.',
        'The app tags each message with a **client-generated id** (a UUID) and reuses it on every retry. The store keeps `(conversation_id, client_msg_id)` unique, so a repeat returns the original seq instead of inserting a second copy.',
      ],
      callout: { kind: 'key', text: 'Retries make delivery reliable; idempotency keys make retries harmless. You need both.' },
      scene: {
        nodes: ch('alice', ['ws1', { meter: 50 }], ['chat', { meter: 35 }], ['ws2', { meter: 50 }], 'bob', ['store', { meter: 30 }], 'registry'),
        links: core,
        flows: [
          F(['alice', 'ws1', 'chat', 'store'], { kind: 'data', ret: true, retKind: 'error' }),
          F(['alice', 'ws1', 'chat', 'store'], { kind: 'data', ret: true, delay: 2.4 }),
        ],
        notes: [
          { at: [-3.5, -3.5], text: 'ack lost → retry id a1f9', tone: 'warn' },
          { at: [-3.5, 3.5], text: 'a1f9 seen → seq 42 again', tone: 'good' },
        ],
      },
      metrics: { safety: 'no dupes' },
      hi: ['safety'],
    },
    {
      short: 'Receipts',
      title: 'Delivered ✓✓ and read',
      tag: 'Technique',
      body: [
        'Receipts are tiny messages flowing the other way. When Bob’s app receives seq 42 it sends `delivered(42)`; when he opens the chat, `read(42)`. They follow the same route back to Alice’s socket — and roughly triple frame traffic.',
        'Store them as a per-member **high-water mark** — “Bob has read up to 42” — not as a flag on every message. One small row per member per conversation covers everything, and unread counts become a subtraction.',
      ],
      scene: {
        nodes: ch('alice', ['ws1', { meter: 55 }], ['chat', { meter: 45 }], ['ws2', { meter: 55 }], 'bob', ['store', { meter: 35 }], 'registry'),
        links: core,
        flows: [
          F(['alice', 'ws1', 'chat', 'ws2', 'bob'], { kind: 'data' }),
          F(['bob', 'ws2', 'chat', 'ws1', 'alice'], { kind: 'event', delay: 2.2 }),
          F(['chat', 'store'], { kind: 'data', delay: 2.8 }),
        ],
        notes: [{ at: [-3.5, 3.5], text: 'bob read up to 42', icon: CheckCheck, tone: 'good' }],
      },
      metrics: { rate: '≈ 200k frames/s' },
      bad: ['rate'],
    },
    {
      short: 'Groups',
      title: 'Group chat fan-out',
      tag: 'Trade-off',
      body: [
        'A message to a 200-member group is stored **once** (in the group’s partition, with one seq) but delivered 200 times: the chat service looks up every member in the registry, groups them by connection server, and sends one batch per server.',
        'Cost grows with group size, so apps cap groups (often around 1,000 members). Huge broadcast channels switch to **pull**: members fetch new messages when they open the channel — the same trick as celebrity posts in a news feed.',
      ],
      changes: [{ sign: '+', text: 'Group members on ws-2' }],
      scene: {
        nodes: ch('alice', ['ws1', { meter: 55 }], ['chat', { meter: 70 }], ['ws2', { meter: 75 }], 'bob', ['store', { meter: 35 }], 'registry', 'group'),
        links: [...core, L('ws2', 'group', { arrow: 'both' })],
        flows: [
          F(['alice', 'ws1', 'chat', 'store'], { kind: 'data' }),
          F(['chat', 'registry'], { kind: 'request', ret: true, retKind: 'data', delay: 1 }),
          F(['chat', 'ws2', 'group'], { kind: 'data', n: 4, delay: 2 }),
        ],
        notes: [{ at: [-3.5, 3.5], text: 'store once, deliver 200×', tone: 'warn' }],
      },
      metrics: { lat: '250 ms' },
      bad: ['lat'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Persistent **WebSockets** on thin connection servers; a chat service that **stores first** and stamps a per-conversation **sequence number**; a **session registry** to find the recipient’s server; push plus seq-based sync when offline; **client ids** for safe retries; receipts as high-water marks.',
        'In an interview, walk one message end to end, then break it: lost ack, offline recipient, dead connection server, giant group.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Persist before you deliver, order by sequence not clock, and make every retry idempotent — then routing is just a lookup.' },
      scene: {
        nodes: ch('alice', ['ws1', { meter: 50 }], ['chat', { meter: 45 }], ['ws2', { meter: 55 }], 'bob', ['store', { meter: 35 }], 'registry', 'push', 'group'),
        links: [...core, L('chat', 'push'), L('push', 'bob', { dashed: true }), L('ws2', 'group', { arrow: 'both' })],
        flows: [
          F(['alice', 'ws1', 'chat', 'store'], { kind: 'data', ret: true }),
          F(['chat', 'registry'], { kind: 'request', ret: true, retKind: 'data', delay: 1 }),
          F(['chat', 'ws2', 'bob'], { kind: 'data', delay: 1.8 }),
          F(['chat', 'ws2', 'group'], { kind: 'data', n: 2, delay: 2.4 }),
        ],
      },
      metrics: { conns: '20M', rate: '70k /s', lat: '150 ms', safety: 'no dupes' },
    },
  ],
};
