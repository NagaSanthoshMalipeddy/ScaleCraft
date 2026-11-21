import {
  Activity,
  Archive,
  Ban,
  CircleCheck,
  Clock,
  Cog,
  Database,
  Eye,
  FileText,
  Gauge,
  Globe,
  HardDrive,
  Hash,
  Inbox,
  KeyRound,
  Laptop,
  Link2,
  Lock,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Smartphone,
  Split,
  Timer,
  Trash,
  User,
  Users,
  Zap,
} from 'lucide-react';
import type { Question } from '../types';
import { cast, F, L } from '../lessons/kit';

/* ------------------------------------------------------------------ */
/* 1 · URL shortener                                                     */
/* ------------------------------------------------------------------ */

const us = cast({
  you: { kind: 'device', at: [-7, 0], tag: 'you', tagIcon: User },
  crowd: { kind: 'crowd', at: [-7, 0], tag: 'viral clicks', tagIcon: Users, items: 7, tone: 'rose' },
  lb: { kind: 'cube', at: [-3.5, 0], label: 'GW', sub: 'gateway', icon: Split, tone: 'green', size: 'sm' },
  app: { kind: 'cube', at: [0, 0], label: 'App', sub: 'stateless', icon: Server, tone: 'blue' },
  ids: { kind: 'cube', at: [0, -4], label: 'IDs', sub: 'ranges', icon: Hash, tone: 'yellow', size: 'sm' },
  cache: { kind: 'cube', at: [3.5, -3.5], label: 'Cache', sub: 'code→url', icon: Zap, tone: 'orange' },
  db: { kind: 'db', at: [3.5, 3.5], tag: 'links db', icon: Database },
  sweep: { kind: 'cube', at: [7, 0], label: 'Sweep', sub: 'expired', icon: Clock, tone: 'gray', size: 'sm' },
  safe: { kind: 'cube', at: [0, 4], label: 'Safety', sub: 'URL scan', icon: ShieldCheck, tone: 'rose', size: 'sm' },
});

const usCore = [
  L('you', 'lb', { arrow: 'both' }),
  L('lb', 'app', { arrow: 'both' }),
  L('app', 'cache', { arrow: 'both' }),
  L('app', 'db', { arrow: 'both' }),
];

export const qUrlShortener: Question = {
  id: 'q-url-shortener',
  n: 1,
  title: 'Design a URL Shortener',
  blurb: 'The classic warm-up, interview style: aliases, expiry, hash vs counter codes, 302s, hot keys and abuse.',
  minutes: 12,
  level: 'Beginner',
  concepts: ['Hashing', 'Databases', 'Caching'],
  related: ['url-shortener', 'unique-ids', 'caching', 'rate-limiting'],
  followUps: [
    'How would you add per-link click analytics without slowing redirects?',
    'How do you shard the links table once it outgrows a single node?',
    'What changes if users may edit where a short link points?',
    'How would you stop attackers enumerating short codes?',
  ],
  keywords: ['url shortener', 'tinyurl', 'bitly', 'base62', 'md5', 'custom alias', 'link expiry', '301 vs 302', 'hot keys'],
  metrics: [
    { id: 'reads', label: 'Redirects', icon: Link2 },
    { id: 'writes', label: 'New links', icon: HardDrive },
    { id: 'p99', label: 'Redirect p99', icon: Timer },
    { id: 'db', label: 'DB load', icon: Gauge },
  ],
  learn: [
    { text: 'Scoping custom aliases and expiry up front', at: 0 },
    { text: 'Hash-based vs counter-based short codes', at: 4 },
    { text: 'Conditional inserts for custom aliases', at: 4 },
    { text: '301 vs 302, and caching hot codes', at: 5 },
    { text: 'Lazy expiry checks plus a background sweeper', at: 6 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Pin down what “shortener” means',
      tag: 'Requirements',
      body: [
        'Functional: `shorten(url)` returns a 7-char code; `GET /{code}` redirects. Users may pick a **custom alias** (`/spring-sale`) and an **expiry** date, after which the link stops working. Click stats are nice-to-have, so park them.',
        'Non-functional: redirects are the product — **p99 < 50 ms**, **99.99%** available. Creating links may be slower and briefly unavailable. Out of scope: changing a link’s target, account UI, analytics dashboards.',
      ],
      callout: { kind: 'tip', text: 'Say out loud which path matters most. Here it is the redirect: every later choice is judged by its latency and availability.' },
      scene: {
        nodes: us('you', ['app', { label: 'Service', sub: 'shortener' }]),
        links: [L('you', 'app', { arrow: 'both' })],
        flows: [F(['you', 'app'], { ret: true })],
        notes: [
          { at: [-3.5, -4.5], text: 'shorten → 7-char code', icon: Link2 },
          { at: [-3.5, -3.5], text: 'custom alias (optional)', tone: 'good' },
          { at: [-3.5, -2.5], text: 'expiry date (optional)', icon: Clock, tone: 'good' },
          { at: [3.8, -3], text: 'redirect p99 < 50 ms', icon: Timer, tone: 'warn' },
          { at: [3.8, -2], text: '99.99% for redirects', tone: 'warn' },
          { at: [-3.5, 3], text: 'out: edits, dashboards', icon: Ban, tone: 'bad' },
        ],
      },
      metrics: { reads: '—', writes: '—', p99: '—', db: '—' },
    },
    {
      short: 'Numbers',
      title: 'Napkin maths for links',
      tag: 'Estimation',
      body: [
        'Assume **200M new links a month**: 200M ÷ 2.6M s ≈ **77 writes/s**, peaking near 400/s. At 100 reads per write, redirects average **7,700/s** and spike past 40k/s when a link goes viral.',
        'Storage: 2.4B links a year × 5 years × ~500 B ≈ **6 TB**. 12B codes would fit in 62⁶ ≈ 57B, but **7 chars** (62⁷ ≈ 3.5T) keeps the space sparse, so guesses and collisions stay rare.',
      ],
      scene: {
        nodes: us('you', ['app', { label: 'Service', sub: 'shortener' }]),
        links: [L('you', 'app', { arrow: 'both' })],
        flows: [F(['you', 'app'], { ret: true, n: 3 })],
        notes: [
          { at: [-3.5, -4.5], text: '≈ 77 writes/s (peak 400)', icon: HardDrive },
          { at: [-3.5, -3.5], text: '≈ 7.7k reads/s (peak 40k)', icon: Link2 },
          { at: [-3.5, -2.5], text: 'read : write = 100 : 1' },
          { at: [3.8, -3], text: '5 yrs × 500 B ≈ 6 TB', icon: Database },
          { at: [3.8, -2], text: '62⁷ ≈ 3.5 trillion codes', icon: Hash },
        ],
      },
      metrics: { reads: '7.7k /s', writes: '77 /s' },
    },
    {
      short: 'API + data',
      title: 'Three endpoints, one table',
      tag: 'API',
      body: [
        '`POST /links {url, alias?, expires_at?}` → `201 {code}`. `GET /{code}` → `302` with a `Location` header, `404` if unknown, `410 Gone` if expired. `DELETE /links/{code}` for the owner. Writes need auth; redirects are anonymous.',
        'Table `links(code PK, long_url, owner_id, created_at, expires_at, is_custom)`. Every redirect is a point lookup by `code`, so a **key-value store** or Postgres keyed on `code` both work. Index `expires_at` for cleanup.',
      ],
      changes: [{ sign: '+', text: 'Links table keyed by code' }],
      scene: {
        nodes: us('you', ['app', { label: 'Service', sub: 'shortener' }], 'db'),
        links: [L('you', 'app', { arrow: 'both', label: 'GET /aZ3kP9q' }), L('app', 'db', { arrow: 'both', label: 'by code' })],
        flows: [F(['you', 'app', 'db'], { ret: true })],
        notes: [
          { at: [-3.5, -4.5], text: 'POST /links → 201 {code}', tone: 'good' },
          { at: [-3.5, -3.5], text: 'GET /{code} → 302', tone: 'good' },
          { at: [-3.5, -2.5], text: 'expired → 410 Gone', tone: 'warn' },
          { at: [4.2, -2], text: 'code PK · expires_at idx', icon: KeyRound },
        ],
      },
    },
    {
      short: 'Design',
      title: 'A fast read path, a simple write path',
      tag: 'Design',
      body: [
        '**Write path**: gateway → app → allocate a code → conditional insert. **Read path**: gateway → app → **cache** → DB on a miss → `302`. App servers keep no state, so they scale out behind the gateway.',
        'At 7.7k reads/s with a 95%+ hit ratio, the DB sees ~400 reads/s plus 77 writes/s — easy. The real interview is in how codes are made, how redirects stay fast, and what happens when links expire or get abused.',
      ],
      changes: [{ sign: '+', text: 'Gateway' }, { sign: '+', text: 'Cache in front of the DB' }],
      scene: {
        nodes: us('you', 'lb', ['app', { meter: 30 }], ['cache', { meter: 35 }], ['db', { meter: 15 }]),
        links: usCore,
        flows: [F(['you', 'lb', 'app', 'cache'], { ret: true, n: 2 }), F(['app', 'db'], { kind: 'data', ret: true, delay: 1.4 })],
        notes: [{ at: [-3.5, 3.2], text: 'stateless → add more apps', tone: 'good' }],
      },
      metrics: { p99: '9 ms', db: '15%' },
      hi: ['p99', 'db'],
    },
    {
      short: 'Codes',
      title: 'Hash, counter, or custom alias?',
      tag: 'Deep Dive',
      body: [
        '**Hash**: base62 of 42 bits of `MD5(url)` — no coordination, but a birthday problem: with billions stored, new codes collide and need `IF NOT EXISTS` plus a salted re-hash. **Counter**: apps lease 10k-ID blocks from an **ID range service**: no collisions. Pick the counter, scrambled to hide order.',
        'A **custom alias** is a chosen code in the same table, claimed by a **conditional insert**: of two users racing for `/spring-sale`, one wins and the other gets `409 Conflict`. Keep shapes apart (generated codes exactly 7 chars; aliases 8+ or with a `-`) so the counter never mints a taken alias.',
      ],
      callout: { kind: 'key', text: 'Uniqueness belongs to the database (conditional insert), not to “check, then insert” in app code — two requests can both pass the check.' },
      changes: [{ sign: '+', text: 'ID range service' }],
      scene: {
        nodes: us('you', 'lb', 'app', 'ids', ['cache', { meter: 35 }], ['db', { meter: 15, tag: 'code = PK' }]),
        links: [...usCore, L('app', 'ids', { arrow: 'both', label: 'lease 10k' })],
        flows: [
          F(['app', 'ids'], { kind: 'data', ret: true, retKind: 'data' }),
          F(['you', 'lb', 'app', 'db'], { kind: 'data', ret: true, delay: 1 }),
          F(['you', 'lb', 'app'], { kind: 'error', stop: true, delay: 2.2 }),
        ],
        notes: [
          { at: [-4, -4.5], text: 'md5: collide → re-hash', icon: Hash, tone: 'bad' },
          { at: [-4, -3.5], text: 'counter: 0 collisions', tone: 'good' },
          { at: [-4, 3.2], text: 'alias race → 1 wins, 409', icon: KeyRound },
        ],
      },
    },
    {
      short: '302 + cache',
      title: 'Redirect status and the hot path',
      tag: 'Deep Dive',
      body: [
        '`301` lets browsers cache the redirect forever: less load, but you can never expire the link and repeat clicks vanish. `302` hits you on every click. Expiry is a requirement, so use **302** with a short `Cache-Control: max-age`.',
        'Clicks follow a power law, so a **read-through cache** of `code → url` (TTL capped at `expires_at`) hits 95–99%. Also cache **misses** briefly: scanners probing random codes would otherwise fall straight through to the DB.',
      ],
      scene: {
        nodes: us('you', 'lb', ['app', { meter: 30 }], 'ids', ['cache', { meter: 45, tag: '98% hit' }], ['db', { meter: 8 }]),
        links: [...usCore, L('app', 'ids', { arrow: 'both' })],
        flows: [F(['you', 'lb', 'app', 'cache'], { ret: true, n: 3 }), F(['app', 'db'], { ret: true, delay: 1.8 })],
        notes: [
          { at: [-4, -4.5], text: '301: cached forever', tone: 'bad' },
          { at: [-4, -3.5], text: '302: every click seen', tone: 'good' },
          { at: [-4, 3.2], text: 'cache 404s for 60 s', icon: Zap },
        ],
      },
      metrics: { p99: '6 ms', db: '8%' },
      hi: ['p99', 'db'],
    },
    {
      short: 'Expiry',
      title: 'Expiry: check on read, clean up later',
      tag: 'Deep Dive',
      body: [
        'Correctness lives on the read path: if `now > expires_at`, return `410 Gone` even if the row still exists, and never cache past the expiry. That turns deletion into a **storage** chore, not a correctness problem.',
        'A background **sweeper** walks the `expires_at` index in batches of 1,000 and deletes expired rows off-peak (or use the store’s native TTL). Never recycle expired codes: old tweets and printed flyers still point at them.',
      ],
      changes: [{ sign: '+', text: 'Expiry sweeper' }],
      scene: {
        nodes: us('you', 'lb', ['app', { meter: 30 }], 'ids', ['cache', { meter: 45 }], ['db', { meter: 12 }], ['sweep', { meter: 40 }]),
        links: [...usCore, L('app', 'ids', { arrow: 'both' }), L('sweep', 'db', { label: 'DELETE batch' })],
        flows: [F(['you', 'lb', 'app', 'cache'], { ret: true, retKind: 'error' }), F(['sweep', 'db'], { kind: 'data', n: 2, delay: 0.8 })],
        notes: [
          { at: [-4, -4.5], text: 'expired → 410 Gone', icon: Clock, tone: 'warn' },
          { at: [5.6, -3], text: 'codes never reused', tone: 'good' },
        ],
      },
    },
    {
      short: 'Abuse',
      title: 'Stopping spam and phishing',
      tag: 'Deep Dive',
      body: [
        'Short links hide their destination, which phishers love. On create: **rate-limit** per API key and IP at the gateway (say 100 links/hour anonymous), and check the URL against a blocklist / Safe Browsing feed before issuing a code.',
        'Sites turn bad later, so a **safety** worker rescans links asynchronously and can flip one to `disabled`; its redirect then shows a warning page instead of a `302`. Requiring sign-in for custom aliases makes abuse traceable.',
      ],
      changes: [{ sign: '+', text: 'Rate limits at the gateway' }, { sign: '+', text: 'URL safety scanner' }],
      scene: {
        nodes: us('you', ['lb', { sub: 'rate lim', meter: 40 }], ['app', { meter: 30 }], 'ids', ['cache', { meter: 45 }], ['db', { meter: 12 }], 'sweep', ['safe', { meter: 30 }]),
        links: [...usCore, L('app', 'ids', { arrow: 'both' }), L('sweep', 'db'), L('app', 'safe', { arrow: 'both' })],
        flows: [F(['you', 'lb', 'app', 'safe'], { ret: true }), F(['you', 'lb'], { kind: 'error', stop: true, delay: 1.2 })],
        notes: [
          { at: [-4, -4.5], text: '101st link/hour → 429', tone: 'bad' },
          { at: [-4, 3.2], text: 'flagged → warning page', icon: Shield, tone: 'warn' },
        ],
      },
    },
    {
      short: 'Hot keys',
      title: 'A viral link and a lost region',
      tag: 'Bottleneck',
      body: [
        'A celebrity tweets a link: **200k clicks/s**, all on one cache key, so one cache shard melts. Fix: a tiny **in-process LRU** on each app server (5 s TTL) absorbs the hottest codes; the cache can also replicate known-hot keys.',
        'For region loss, run read-only redirect stacks in 2–3 regions over replicated links data behind latency-based DNS. Writes can stay in one region: “can’t create links for a few minutes” is acceptable, failing redirects are not.',
      ],
      changes: [{ sign: '+', text: 'Local LRU on each app' }, { sign: '~', text: 'Multi-region read path' }],
      scene: {
        nodes: us('crowd', ['lb', { meter: 70 }], ['app', { meter: 65, tag: 'local LRU' }], 'ids', ['cache', { meter: 50 }], ['db', { meter: 10 }], 'sweep', 'safe'),
        links: [
          L('crowd', 'lb', { arrow: 'both' }),
          L('lb', 'app', { arrow: 'both' }),
          L('app', 'cache', { arrow: 'both' }),
          L('app', 'db', { arrow: 'both' }),
          L('app', 'ids', { arrow: 'both' }),
          L('sweep', 'db'),
          L('app', 'safe'),
        ],
        flows: [F(['crowd', 'lb', 'app'], { ret: true, n: 4, speed: 1.4 }), F(['app', 'cache'], { ret: true, delay: 1.5 })],
        notes: [
          { at: [-4, -4.5], text: '200k/s on one code', icon: Zap, tone: 'bad' },
          { at: [5.6, -3], text: 'LRU absorbs ~90%', tone: 'good' },
        ],
      },
      metrics: { reads: '200k /s', p99: '9 ms' },
    },
    {
      short: 'Recap',
      title: 'The interview answer',
      tag: 'Recap',
      body: [
        '**Redirects** are the product, so they get the cache, a `302` with bounded caching, a lazy expiry check and multi-region reads. **Writes** get counter-based codes, conditional inserts for aliases, rate limits and URL scanning.',
        'Expiry is enforced on read and cleaned up later; hot keys are absorbed in layers — local LRU, shared cache, then the database.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Clarify aliases and expiry first: they decide the code scheme (counter + conditional insert), the status code (302) and cleanup.' },
      scene: {
        nodes: us('you', 'lb', ['app', { meter: 35 }], 'ids', ['cache', { meter: 45 }], ['db', { meter: 10 }], 'sweep', 'safe'),
        links: [...usCore, L('app', 'ids', { arrow: 'both' }), L('sweep', 'db'), L('app', 'safe')],
        flows: [
          F(['you', 'lb', 'app', 'cache'], { ret: true }),
          F(['app', 'db'], { kind: 'data', ret: true, delay: 0.8 }),
          F(['sweep', 'db'], { kind: 'data', delay: 1.6 }),
        ],
      },
      metrics: { reads: '7.7k /s', writes: '77 /s', p99: '6 ms', db: '10%' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 2 · Pastebin                                                          */
/* ------------------------------------------------------------------ */

const pb = cast({
  author: { kind: 'device', at: [-7, 3.5], tag: 'author', tagIcon: User },
  readers: { kind: 'crowd', at: [-7, -3.5], tag: 'readers', tagIcon: Users, items: 5 },
  bots: { kind: 'crowd', at: [-3.5, 4], tag: 'spam bots', items: 4, tone: 'rose' },
  cdn: { kind: 'cube', at: [-3.5, -3.5], label: 'CDN', sub: 'edge', icon: Radio, tone: 'teal' },
  lb: { kind: 'cube', at: [-3.5, 0], label: 'API GW', icon: Split, tone: 'green', size: 'sm' },
  app: { kind: 'cube', at: [0, 0], label: 'Paste', sub: 'stateless', icon: Server, tone: 'blue' },
  keys: { kind: 'cube', at: [0, -4], label: 'KGS', sub: 'key pool', icon: KeyRound, tone: 'yellow', size: 'sm' },
  meta: { kind: 'db', at: [3.5, -3.5], tag: 'metadata', icon: Database },
  blob: { kind: 'slab', at: [3.5, 3.5], tag: 'paste bodies', icon: Archive, tone: 'teal' },
  sweep: { kind: 'cube', at: [7, 0], label: 'Sweep', sub: 'expired', icon: Clock, tone: 'gray', size: 'sm' },
});

const pbCore = [
  L('author', 'lb', { arrow: 'both' }),
  L('lb', 'app', { arrow: 'both' }),
  L('app', 'meta', { arrow: 'both' }),
  L('app', 'blob', { arrow: 'both' }),
];

export const qPastebin: Question = {
  id: 'q-pastebin',
  n: 2,
  title: 'Design Pastebin',
  blurb: 'Share text by link: metadata vs object storage, unguessable keys, TTL expiry and CDN-cached reads.',
  minutes: 12,
  level: 'Beginner',
  concepts: ['Storage', 'Expiration', 'APIs'],
  related: ['files', 'cdn', 'rate-limiting', 'unique-ids', 'indexes'],
  followUps: [
    'How would you add full-text search over public pastes?',
    'How would you support editing a paste while keeping its history?',
    'What changes if private pastes must be encrypted end-to-end?',
    'How would you detect and remove leaked credentials quickly?',
  ],
  keywords: ['pastebin', 'gist', 'object storage', 'ttl', 'expiry', 'unlisted', 'random keys', 'cdn', 'lifecycle rules', 'rate limiting'],
  metrics: [
    { id: 'writes', label: 'New pastes', icon: FileText },
    { id: 'reads', label: 'Reads', icon: Eye },
    { id: 'store', label: 'Body storage', icon: HardDrive },
    { id: 'origin', label: 'Origin load', icon: Gauge },
  ],
  learn: [
    { text: 'Separating paste metadata from paste bodies', at: 2 },
    { text: 'Random keys sized against guessing', at: 4 },
    { text: 'Lazy expiry plus TTL indexes and lifecycle rules', at: 5 },
    { text: 'CDN caching rules per visibility', at: 6 },
    { text: 'Rate limiting anonymous writes', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'What is a paste, exactly?',
      tag: 'Requirements',
      body: [
        'Functional: create a text paste up to **10 MB** and get a link; choose **public**, **unlisted** (anyone with the link) or **private** (owner only); pick an expiry from 10 minutes to never. Anonymous users can paste; signed-in users can list and delete theirs.',
        'Non-functional: pastes are never lost or leaked; reads p99 < 200 ms; 99.9% available. **Syntax highlighting** runs in the browser, so the server only stores a language tag. Out of scope: editing, comments, search.',
      ],
      callout: { kind: 'tip', text: 'Unlisted is not private: it is protected only by an unguessable link. That single fact will decide how keys are generated.' },
      scene: {
        nodes: pbStart(),
        links: [L('author', 'app', { label: 'create' }), L('readers', 'app', { first: 'v' })],
        flows: [F(['author', 'app'], { kind: 'data' }), F(['readers', 'app'], { ret: true, delay: 1 })],
        notes: [
          { at: [4, -4], text: 'text ≤ 10 MB', icon: FileText },
          { at: [4, -3], text: 'public · unlisted · private', icon: Lock },
          { at: [4, -2], text: 'TTL: 10 min … never', icon: Clock },
          { at: [4, 2.5], text: 'highlighting: client-side', tone: 'good' },
          { at: [4, 3.5], text: 'out: edits, search', icon: Ban, tone: 'bad' },
        ],
      },
      metrics: { writes: '—', reads: '—', store: '—', origin: '—' },
    },
    {
      short: 'Numbers',
      title: 'Few requests, lots of bytes',
      tag: 'Estimation',
      body: [
        'Assume **1M new pastes/day** ≈ 12 writes/s (peak ~60/s) and 10 reads per paste ≈ **120 reads/s**, peaking near 1,000/s. Small request rates — the interesting part is bytes, not QPS.',
        'Average paste ~10 KB (the 10 MB cap is rare): **10 GB/day ≈ 3.6 TB/year** of bodies, but only ~300 MB/day of metadata rows. Read bandwidth ≈ 1.2 MB/s on average — tiny, until one paste goes viral.',
      ],
      scene: {
        nodes: pbStart(),
        links: [L('author', 'app'), L('readers', 'app', { first: 'v' })],
        flows: [F(['author', 'app'], { kind: 'data' }), F(['readers', 'app'], { ret: true, n: 3, delay: 0.6 })],
        notes: [
          { at: [4, -4], text: '≈ 12 writes/s (peak 60)', icon: FileText },
          { at: [4, -3], text: '≈ 120 reads/s (peak 1k)', icon: Eye },
          { at: [4, -2], text: '10 KB avg → 10 GB/day', icon: HardDrive },
          { at: [4, 2.5], text: 'metadata ≈ 300 MB/day', icon: Database },
        ],
      },
      metrics: { writes: '12 /s', reads: '120 /s', store: '3.6 TB/yr' },
    },
    {
      short: 'API + data',
      title: 'Endpoints and the two stores',
      tag: 'API',
      body: [
        '`POST /pastes {content, syntax, visibility, ttl}` → `201 {key, url}`. `GET /pastes/{key}` returns metadata + content; `GET /raw/{key}` returns `text/plain`. `DELETE /pastes/{key}` needs the owner or the delete token issued at creation.',
        'Row: `pastes(key PK, owner_id, visibility, syntax, size, body_key, created_at, expires_at)`, indexed on `expires_at` and `(owner_id, created_at)`. The body sits in **object storage** at `body_key`: 10 MB values bloat DB pages, backups and replicas.',
      ],
      changes: [{ sign: '+', text: 'Metadata DB' }, { sign: '+', text: 'Object storage for bodies' }],
      scene: {
        nodes: pb('author', 'app', 'meta', 'blob'),
        links: [L('author', 'app', { label: 'POST /pastes' }), L('app', 'meta', { label: 'row' }), L('app', 'blob', { label: 'body' })],
        flows: [F(['author', 'app', 'blob'], { kind: 'data' }), F(['app', 'meta'], { kind: 'data', delay: 1.2 })],
        notes: [
          { at: [-3.5, -4.5], text: 'key PK · expires_at idx', icon: KeyRound },
          { at: [-3.5, -3.5], text: 'body_key → bucket object', icon: Archive },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Write the body, then the row',
      tag: 'Design',
      body: [
        'Create: pick a key, PUT the gzipped body (text compresses ~4×) to the bucket, then insert the metadata row. Body first: a crash leaves at worst an orphan object, never a row pointing at nothing.',
        'Read: fetch the row, check `expires_at` and visibility, then stream the body — or, for big pastes, return a short-lived **signed URL** so the bucket serves the bytes. The service stays stateless behind a gateway.',
      ],
      callout: { kind: 'tip', text: 'Small pastes (< 4 KB) could live inline in the row to skip a hop. Mention it as an optimisation, but start with one code path.' },
      changes: [{ sign: '+', text: 'API gateway' }],
      scene: {
        nodes: pb('author', 'lb', ['app', { meter: 25 }], ['meta', { meter: 20 }], 'blob'),
        links: pbCore,
        flows: [F(['author', 'lb', 'app', 'blob'], { kind: 'data' }), F(['app', 'meta'], { kind: 'data', delay: 1.4 }), F(['author', 'lb', 'app', 'meta'], { ret: true, delay: 2.4 })],
        notes: [
          { at: [-3.5, -3.5], text: '1. PUT body (gzip)', icon: Archive },
          { at: [-3.5, -2.5], text: '2. INSERT row', icon: Database },
        ],
      },
      metrics: { origin: '25%' },
    },
    {
      short: 'Keys',
      title: 'Keys that can’t be guessed',
      tag: 'Deep Dive',
      body: [
        'A counter lets anyone walk `…/aZ3k1`, `…/aZ3k2` and read every **unlisted** paste. Use **random keys** from a CSPRNG, sized against guessing: with 1.8B pastes, 8 chars gives a hit every ~120k guesses; **10 chars** (62¹⁰ ≈ 8×10¹⁷) needs ~470M.',
        'At that size collisions are vanishingly rare: insert with `IF NOT EXISTS`, retry on conflict. A **key-generation service** pre-minting keys is overkill at 12 writes/s — one more component to run for no gain.',
      ],
      callout: { kind: 'warn', text: 'Size an unguessable ID by the attacker’s odds (stored items ÷ key space), not just by uniqueness.' },
      scene: {
        nodes: pb('author', 'lb', ['app', { meter: 25 }], ['meta', { meter: 20 }], 'blob', ['keys', { status: 'dim' }]),
        links: [...pbCore, L('app', 'keys', { dashed: true, tone: 'muted' })],
        flows: [F(['author', 'lb', 'app', 'meta'], { kind: 'data', ret: true })],
        notes: [
          { at: [-3.5, -4.5], text: 'KGS: not needed at 12/s', tone: 'warn' },
          { at: [-3.5, -3.5], text: '10 random base62 chars', icon: KeyRound, tone: 'good' },
          { at: [-3.5, -2.5], text: 'sequential = enumerable', tone: 'bad' },
        ],
      },
    },
    {
      short: 'Expiry',
      title: 'Expiry without a midnight cron',
      tag: 'Deep Dive',
      body: [
        'Reads are the source of truth: if `expires_at < now`, return `404` even if the row still exists (**lazy deletion**). Physical cleanup can then be slow and cheap — a TTL index (DynamoDB / Mongo TTL) or a **sweeper** walking the `expires_at` index in batches.',
        'Bodies need deleting too. Write them under prefixes like `ttl/1d/…` and `ttl/1w/…` so **bucket lifecycle rules** expire whole prefixes for free; the sweeper only handles odd TTLs and user deletes. “Never” pastes go under `keep/`.',
      ],
      callout: { kind: 'tip', text: 'Lifecycle rules run in whole days, so a 10-minute paste’s bytes may linger a day — fine, the read path already treats it as gone.' },
      changes: [{ sign: '+', text: 'Expiry sweeper' }],
      scene: {
        nodes: pb('author', 'lb', ['app', { meter: 25 }], ['meta', { meter: 20 }], 'blob', ['sweep', { meter: 35 }]),
        links: [...pbCore, L('sweep', 'meta', { label: 'expired rows' }), L('sweep', 'blob', { label: 'odd TTLs' })],
        flows: [F(['author', 'lb', 'app', 'meta'], { ret: true, retKind: 'error' }), F(['sweep', 'meta'], { kind: 'data', delay: 0.8 }), F(['sweep', 'blob'], { kind: 'data', delay: 1.6 })],
        notes: [
          { at: [-3.5, -3.5], text: 'expired → 404 at once', icon: Clock, tone: 'warn' },
          { at: [-3.5, -2.5], text: 'bytes: lifecycle rules', icon: Trash, tone: 'good' },
        ],
      },
    },
    {
      short: 'CDN',
      title: 'Let the edge serve public pastes',
      tag: 'Deep Dive',
      body: [
        'Pastes are **immutable** — the perfect cache object. Serve public and unlisted reads via a **CDN** with `Cache-Control: public, max-age` = min(1 day, time left before expiry), so no edge copy outlives its paste. Deletes trigger a purge.',
        'Private pastes need an auth check on every request, so they bypass shared caches with `Cache-Control: private, no-store`. Unlisted pages add `noindex` so search engines don’t publish the link.',
      ],
      changes: [{ sign: '+', text: 'CDN in front of reads' }],
      scene: {
        nodes: pb('readers', 'author', ['cdn', { meter: 40, tag: '92% hit' }], 'lb', ['app', { meter: 8 }], ['meta', { meter: 10 }], 'blob', 'sweep'),
        links: [L('readers', 'cdn', { arrow: 'both' }), L('cdn', 'lb', { arrow: 'both' }), ...pbCore, L('sweep', 'meta'), L('sweep', 'blob')],
        flows: [F(['readers', 'cdn'], { ret: true, n: 3 }), F(['cdn', 'lb', 'app', 'blob'], { kind: 'data', ret: true, delay: 1.5 })],
        notes: [
          { at: [-0.5, -6], text: 'max-age ≤ time to expiry', icon: Globe, tone: 'good' },
          { at: [3.8, 0], text: 'private: no-store', icon: Lock, tone: 'warn' },
        ],
      },
      metrics: { reads: '1k /s', origin: '8%' },
      hi: ['origin'],
    },
    {
      short: 'Rate limits',
      title: 'Anonymous writes invite abuse',
      tag: 'Deep Dive',
      body: [
        'Anonymous `POST`s attract spam, malware drops and people using you as free storage. At the gateway, **token-bucket** limits per IP: ~10 pastes/hour anonymous, 200 signed-in. Reject oversized bodies from `Content-Length` with `413` before reading them.',
        'Over-limit clients get `429` with `Retry-After`. Behind the gateway an async scanner flags credential dumps and malware for takedown. Show a captcha only after repeated 429s, so normal users never see friction.',
      ],
      changes: [{ sign: '+', text: 'Per-IP token buckets' }],
      scene: {
        nodes: pb('readers', 'author', 'bots', 'cdn', ['lb', { meter: 55, sub: 'limits' }], ['app', { meter: 10 }], ['meta', { meter: 10 }], 'blob', 'sweep'),
        links: [L('readers', 'cdn', { arrow: 'both' }), L('cdn', 'lb', { arrow: 'both' }), ...pbCore, L('bots', 'lb', { tone: 'bad' }), L('sweep', 'meta'), L('sweep', 'blob')],
        flows: [F(['bots', 'lb'], { kind: 'error', stop: true, n: 3 }), F(['author', 'lb', 'app', 'blob'], { kind: 'data', delay: 1 })],
        notes: [
          { at: [-0.2, 3.8], text: '429 · Retry-After', icon: Ban, tone: 'bad' },
          { at: [-0.2, 4.8], text: '> 10 MB → 413', tone: 'bad' },
        ],
      },
    },
    {
      short: 'Viral paste',
      title: 'A paste hits the front page',
      tag: 'Bottleneck',
      body: [
        'One paste goes viral: 50k reads/s on one key. The CDN absorbs it — until the edge copy expires and thousands of misses hit the origin at once. **Request collapsing** at an origin shield sends one fetch upstream while the rest wait.',
        'Metadata grows ~365M rows (~110 GB) a year: one Postgres plus a replica copes for years; after that, shard by `hash(key)`, since every lookup is by key. Bodies scale with the bucket; cold ones move to a cheaper storage tier.',
      ],
      scene: {
        nodes: pb(['readers', { items: 7 }], 'author', ['cdn', { meter: 85, status: 'hot', sub: 'shield' }], 'lb', ['app', { meter: 12 }], ['meta', { meter: 15 }], 'blob', 'sweep'),
        links: [L('readers', 'cdn', { arrow: 'both' }), L('cdn', 'lb', { arrow: 'both', label: '1 fetch' }), ...pbCore, L('sweep', 'meta'), L('sweep', 'blob')],
        flows: [F(['readers', 'cdn'], { ret: true, n: 5, speed: 1.4 }), F(['cdn', 'lb', 'app', 'blob'], { kind: 'data', ret: true, delay: 1.2 })],
        notes: [
          { at: [-0.5, -6], text: '50k reads/s on one key', icon: Users, tone: 'bad' },
          { at: [3.8, 0], text: 'shard by hash(key)', icon: Hash },
        ],
      },
      metrics: { reads: '50k /s', origin: '12%' },
    },
    {
      short: 'Recap',
      title: 'Pastebin in one breath',
      tag: 'Recap',
      body: [
        'Small rows in a **database**, big bodies in **object storage**, written body-first. **Random 10-char keys** because unlisted links are secrets. Expiry enforced on read, cleaned by TTL indexes, lifecycle rules and a sweeper.',
        'Public reads come from a **CDN** with max-age bounded by expiry; anonymous writes are rate-limited and size-capped at the gateway.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Split metadata from bytes, make the read path decide expiry, and let cheap background jobs handle physical deletion.' },
      scene: {
        nodes: pb('readers', 'author', ['cdn', { meter: 40 }], 'lb', ['app', { meter: 10 }], ['meta', { meter: 12 }], 'blob', 'sweep'),
        links: [L('readers', 'cdn', { arrow: 'both' }), L('cdn', 'lb', { arrow: 'both' }), ...pbCore, L('sweep', 'meta'), L('sweep', 'blob')],
        flows: [
          F(['readers', 'cdn'], { ret: true, n: 2 }),
          F(['author', 'lb', 'app', 'blob'], { kind: 'data', delay: 0.8 }),
          F(['sweep', 'blob'], { kind: 'data', delay: 1.6 }),
        ],
      },
      metrics: { writes: '12 /s', reads: '1k /s', store: '3.6 TB/yr', origin: '8%' },
    },
  ],
};

function pbStart() {
  return pb('author', 'readers', ['app', { label: 'Pastebin', sub: '?' }]);
}

/* ------------------------------------------------------------------ */
/* 3 · File upload service                                               */
/* ------------------------------------------------------------------ */

const fu = cast({
  phone: { kind: 'phone', at: [-7, 0], tag: 'mobile', tagIcon: Smartphone },
  api: { kind: 'cube', at: [-3.5, -3.5], label: 'Upload', sub: 'API', icon: Server, tone: 'blue' },
  db: { kind: 'db', at: [0, -3.5], tag: 'uploads', icon: Database },
  bucket: { kind: 'slab', at: [-3.5, 3.5], tag: 'bucket', icon: Archive, tone: 'teal' },
  queue: { kind: 'queue', at: [0, 3.5], tag: 'completed', tagIcon: Inbox, items: 3 },
  scan: { kind: 'cube', at: [3.5, 0], label: 'Scanner', sub: 'AV + hash', icon: ShieldCheck, tone: 'green' },
  reaper: { kind: 'cube', at: [0, 0], label: 'Reaper', sub: 'stale', icon: Trash, tone: 'gray', size: 'sm' },
});

const fuCtl = [L('phone', 'api', { arrow: 'both' }), L('api', 'db', { arrow: 'both' })];
const fuAll = [
  ...fuCtl,
  L('api', 'bucket', { dashed: true, label: 'initiate' }),
  L('phone', 'bucket', { label: 'PUT parts' }),
  L('bucket', 'queue', { label: 'event' }),
  L('queue', 'scan'),
  L('scan', 'db', { label: 'ready' }),
];

export const qFileUpload: Question = {
  id: 'q-file-upload',
  n: 3,
  title: 'Design a File Upload Service',
  blurb: 'Get 5 GB files from flaky phones into storage: presigned multipart parts, resume, verify, scan, clean up.',
  minutes: 12,
  level: 'Beginner',
  concepts: ['Object Storage', 'Multipart Upload'],
  related: ['files', 'message-queues', 'timeouts-retries', 'transactions'],
  followUps: [
    'How would you deduplicate identical files across users?',
    'How do you show accurate upload progress across devices?',
    'How would you handle uploads from users in another continent?',
    'What changes if files must be encrypted with per-user keys?',
  ],
  keywords: ['file upload', 'multipart upload', 'resumable upload', 'presigned url', 's3', 'chunked upload', 'checksum', 'virus scan', 'quota'],
  metrics: [
    { id: 'api', label: 'API traffic', icon: Server },
    { id: 'ok', label: 'Upload success', icon: CircleCheck },
    { id: 'resend', label: 'Re-sent on drop', icon: RefreshCw },
    { id: 'orphan', label: 'Orphan parts', icon: Trash },
  ],
  learn: [
    { text: 'Why one big PUT fails on mobile networks', at: 1 },
    { text: 'Control plane vs data plane with presigned URLs', at: 3 },
    { text: 'Parallel multipart parts with per-part retries', at: 4 },
    { text: 'Resuming from server-side part state', at: 5 },
    { text: 'Checksums, scanning, cleanup and quota reservations', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Big files, bad networks',
      tag: 'Requirements',
      body: [
        'Functional: users upload files up to **5 GB** from phones; uploads survive dropped connections and app restarts and show progress; a file becomes available only after a **virus scan**. Each user has a storage **quota**.',
        'Non-functional: file bytes must not flow through our app servers; files are durable once acknowledged; >99% of uploads eventually succeed on patchy 3G/4G. Out of scope: downloads, sharing, previews, desktop sync.',
      ],
      scene: {
        nodes: fu('phone', ['api', { label: 'Service', sub: '?' }]),
        links: [L('phone', 'api', { label: 'upload' })],
        flows: [F(['phone', 'api'], { kind: 'data', speed: 0.6 })],
        notes: [
          { at: [3.5, -4], text: 'files up to 5 GB', icon: HardDrive },
          { at: [3.5, -3], text: 'resume after drops', icon: RefreshCw },
          { at: [3.5, -2], text: 'scan before available', icon: ShieldCheck },
          { at: [3.5, 2], text: 'bytes bypass app servers', tone: 'warn' },
          { at: [3.5, 3], text: 'out: downloads, sharing', icon: Ban, tone: 'bad' },
        ],
      },
      metrics: { api: '—', ok: '—', resend: '—', orphan: '—' },
    },
    {
      short: 'Numbers',
      title: 'Why one big PUT fails',
      tag: 'Estimation',
      body: [
        'Assume **2M uploads/day**, 20 MB on average: ~23 uploads/s and **40 TB/day** of ingress — ~3.7 Gbit/s average, ~15 Gbit/s at peak. Proxying that through app servers means a fleet that does nothing but shovel bytes.',
        'Worse, a 5 GB file on a 5 Mbit/s uplink takes **~2.2 hours**. Phones drop connections every few minutes; with a single PUT, any drop restarts from byte zero, so big uploads practically never finish.',
      ],
      scene: {
        nodes: fu('phone', ['api', { label: 'Service', sub: 'proxy', meter: 95, status: 'hot' }]),
        links: [L('phone', 'api', { label: '5 GB PUT', tone: 'bad' })],
        flows: [F(['phone', 'api'], { kind: 'data', speed: 0.4, n: 2 }), F(['phone', 'api'], { kind: 'error', stop: true, delay: 1.6 })],
        notes: [
          { at: [3.5, -4], text: '40 TB/day ≈ 3.7 Gbit/s', icon: Activity },
          { at: [3.5, -3], text: '5 GB @ 5 Mbit/s ≈ 2.2 h', icon: Timer, tone: 'bad' },
          { at: [3.5, -2], text: 'drop → start from 0', tone: 'bad' },
        ],
      },
      metrics: { api: '15 Gbit/s', ok: '61%', resend: '100%' },
      bad: ['api', 'ok', 'resend'],
    },
    {
      short: 'API + data',
      title: 'An API that never sees bytes',
      tag: 'API',
      body: [
        '`POST /uploads {name, size, sha256}` → `{upload_id, part_size, part_urls[]}`. `GET /uploads/{id}` → parts already stored. `POST /uploads/{id}/complete {parts:[{n, etag}]}`; `DELETE /uploads/{id}` aborts. No endpoint receives file bytes.',
        'Table `uploads(id PK, user_id, object_key, size, part_size, storage_upload_id, sha256, status, created_at)`; `status` goes `initiated → uploading → scanning → ready | rejected`. Index `(status, created_at)` so cleanup finds stale rows.',
      ],
      changes: [{ sign: '+', text: 'Uploads table' }],
      scene: {
        nodes: fu('phone', 'api', 'db'),
        links: [L('phone', 'api', { arrow: 'both', label: 'POST /uploads' }), L('api', 'db', { label: 'INSERT' })],
        flows: [F(['phone', 'api', 'db'], { ret: true })],
        notes: [
          { at: [3.5, -1.5], text: 'status state machine', icon: Cog },
          { at: [-4, 2.5], text: '→ upload_id + part URLs', tone: 'good' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Control plane vs data plane',
      tag: 'Design',
      body: [
        'The API is the **control plane**: it checks auth and quota, starts a multipart upload in object storage and returns **presigned URLs**, one per part. The phone PUTs bytes straight to the bucket — the **data plane** — so app servers move kilobytes, not gigabytes.',
        'On `complete`, storage assembles the object and emits an event onto a **queue**; a scanner verifies and virus-scans it, then marks the row `ready`. How presigning works is covered in the Files lesson.',
      ],
      changes: [{ sign: '+', text: 'Bucket + presigned part URLs' }, { sign: '+', text: 'Queue + scanner' }],
      scene: {
        nodes: fu('phone', ['api', { meter: 12 }], 'db', 'bucket', 'queue', ['scan', { meter: 30 }]),
        links: fuAll,
        flows: [
          F(['phone', 'api'], { ret: true }),
          F(['phone', 'bucket'], { kind: 'data', n: 3, delay: 0.8 }),
          F(['bucket', 'queue', 'scan', 'db'], { kind: 'event', delay: 2 }),
        ],
      },
      metrics: { api: '40 Mbit/s' },
      hi: ['api'],
    },
    {
      short: 'Multipart',
      title: 'Chunks in parallel',
      tag: 'Deep Dive',
      body: [
        'Split the file into **parts** of 8–16 MB (S3 allows 5 MB–5 GB per part, up to 10,000 parts). A 5 GB file at 8 MB is 640 parts. The phone uploads **3–4 parts in parallel**: enough to fill a mobile uplink without starving other apps.',
        'Each part is its own request with its own retries and exponential backoff. A drop now costs only the parts in flight, ~32 MB, not the whole file. Smaller parts waste less on failure; larger ones mean fewer requests.',
      ],
      callout: { kind: 'tip', text: 'Pick part size from the file size: ≥ size ÷ 10,000, rounded up to a few MB. Fixed 8 MB parts would cap files at ~80 GB.' },
      scene: {
        nodes: fu('phone', ['api', { meter: 12 }], 'db', ['bucket', { tag: 'parts 1…640' }], 'queue', 'scan'),
        links: fuAll,
        flows: [F(['phone', 'bucket'], { kind: 'data', n: 4, speed: 1.2 }), F(['phone', 'bucket'], { kind: 'error', stop: true, delay: 1.4 })],
        notes: [
          { at: [-7, -3.5], text: '4 parts in flight', icon: Activity },
          { at: [3.5, 4.6], text: 'retry 1 part, not 5 GB', icon: RefreshCw, tone: 'good' },
        ],
      },
      metrics: { ok: '97%', resend: '< 1%' },
      hi: ['ok', 'resend'],
    },
    {
      short: 'Resume',
      title: 'Resume after a crash',
      tag: 'Deep Dive',
      body: [
        'The phone persists `upload_id` and the file path. After a drop or app kill it calls `GET /uploads/{id}`; the API asks storage which parts exist (`ListParts`) and returns them plus fresh presigned URLs for the rest. Only missing parts are sent.',
        'The server, not the phone’s memory, is the source of truth for progress, so resume works even after the app is killed. Presigned URLs expire (~1 h), which is why resuming always mints new ones.',
      ],
      callout: { kind: 'key', text: 'Resumability = durable server-side state + idempotent, independently retryable chunks.' },
      scene: {
        nodes: fu('phone', ['api', { meter: 14 }], 'db', ['bucket', { tag: '212 / 640 parts' }], 'queue', 'scan'),
        links: [...fuAll.filter((l) => l.from !== 'api' || l.to !== 'bucket'), L('api', 'bucket', { dashed: true, label: 'ListParts' })],
        flows: [F(['phone', 'api', 'bucket'], { ret: true }), F(['phone', 'bucket'], { kind: 'data', n: 3, delay: 1.6 })],
        notes: [
          { at: [-7, -3.5], text: 'saved: upload_id', icon: Smartphone },
          { at: [3.5, 4.6], text: 'send parts 213…640 only', tone: 'good' },
        ],
      },
      metrics: { ok: '99.4%' },
      hi: ['ok'],
    },
    {
      short: 'Complete',
      title: 'Complete, verify, scan',
      tag: 'Deep Dive',
      body: [
        '`complete` sends part numbers with their **ETags**; storage stitches them into one object atomically. Each part carried a checksum header, so corrupt parts were rejected on arrival; the scanner then recomputes the whole-file **SHA-256** and compares it with the one declared at create.',
        'The row moves to `scanning`; the scanner runs **antivirus** and file-type sniffing. Clean → `ready`, infected → `rejected` and deleted. Make `complete` idempotent: a retry on a finished upload just returns the same result.',
      ],
      scene: {
        nodes: fu('phone', ['api', { meter: 12 }], 'db', 'bucket', ['queue', { items: 4 }], ['scan', { meter: 55 }]),
        links: fuAll,
        flows: [
          F(['phone', 'api', 'bucket'], { ret: true }),
          F(['bucket', 'queue', 'scan'], { kind: 'event', delay: 1.2 }),
          F(['scan', 'db'], { kind: 'data', delay: 2.4 }),
        ],
        notes: [
          { at: [5.6, -3], text: 'sha256 matches ✓', icon: ShieldCheck, tone: 'good' },
          { at: [5.2, 2.5], text: 'infected → rejected', tone: 'bad' },
        ],
      },
    },
    {
      short: 'Cleanup',
      title: 'Abandoned uploads and quotas',
      tag: 'Deep Dive',
      body: [
        'Many uploads are never completed, and their parts are **billed but invisible** — they are not listed as objects. A bucket lifecycle rule aborts incomplete multipart uploads after 7 days; a **reaper** expires stale `initiated` rows and calls abort.',
        'Quotas: at create, atomically **reserve** the declared size (`used + reserved + size ≤ quota` in one conditional update). Complete turns the reservation into usage; abort or expiry releases it. Otherwise ten parallel uploads could all pass the check.',
      ],
      changes: [{ sign: '+', text: 'Reaper + lifecycle rule' }, { sign: '~', text: 'Quota reserved at create' }],
      scene: {
        nodes: fu('phone', ['api', { meter: 12 }], 'db', 'bucket', 'queue', 'scan', 'reaper'),
        links: [...fuAll, L('reaper', 'db', { arrow: 'both' }), L('reaper', 'bucket', { label: 'abort' })],
        flows: [F(['reaper', 'db'], { ret: true }), F(['reaper', 'bucket'], { kind: 'error', delay: 1.2 }), F(['phone', 'api', 'db'], { ret: true, delay: 2 })],
        notes: [
          { at: [-7, -3.5], text: 'reserve 5 GB of quota', icon: Lock },
          { at: [3.5, 4.6], text: 'abort after 7 days', icon: Clock, tone: 'good' },
        ],
      },
      metrics: { orphan: '≈ 0' },
      hi: ['orphan'],
    },
    {
      short: 'Spikes',
      title: 'Spikes, scans and hot prefixes',
      tag: 'Bottleneck',
      body: [
        'After a big event uploads triple and the **scan queue** backs up: files sit in `scanning` for hours. Autoscale scanners on queue depth and stream large files through the scanner in chunks. The queue absorbs the spike, so uploads never slow down.',
        'Object stores partition by key prefix (S3: ~3,500 writes/s per prefix). Keys like `2026/11/21/…` funnel a whole day into one hot prefix; lead with a hash, `ab12/{upload_id}`, to spread the load.',
      ],
      scene: {
        nodes: fu('phone', ['api', { meter: 30 }], 'db', ['bucket', { tag: 'ab12/…  f3e9/…' }], ['queue', { items: 7, tag: 'backlog' }], ['scan', { meter: 90, status: 'hot', sub: '× 12' }], 'reaper'),
        links: [...fuAll, L('reaper', 'db'), L('reaper', 'bucket')],
        flows: [F(['phone', 'bucket'], { kind: 'data', n: 4 }), F(['bucket', 'queue', 'scan'], { kind: 'event', n: 3, delay: 0.8 })],
        notes: [
          { at: [5.6, -3], text: 'scale on queue depth', icon: Activity, tone: 'good' },
          { at: [-7, -3.5], text: 'hash-prefixed keys', icon: Hash },
        ],
      },
      metrics: { api: '120 Mbit/s' },
    },
    {
      short: 'Recap',
      title: 'Uploads that survive bad networks',
      tag: 'Recap',
      body: [
        'A thin **control plane** issues presigned part URLs and tracks state; bytes go straight to the bucket as **parallel parts**, each retried alone. Resume asks storage which parts exist. Completion is verified by checksum, scanned via a queue, then marked ready.',
        'Lifecycle rules and a reaper clear abandoned parts; quotas are reserved up front so concurrent uploads can’t overshoot.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Make big transfers small: independent, retryable chunks plus server-side progress turn a 2-hour gamble into a resumable job.' },
      scene: {
        nodes: fu('phone', ['api', { meter: 12 }], 'db', 'bucket', 'queue', ['scan', { meter: 40 }], 'reaper'),
        links: [...fuAll, L('reaper', 'db'), L('reaper', 'bucket')],
        flows: [
          F(['phone', 'api'], { ret: true }),
          F(['phone', 'bucket'], { kind: 'data', n: 3, delay: 0.6 }),
          F(['bucket', 'queue', 'scan', 'db'], { kind: 'event', delay: 1.8 }),
        ],
      },
      metrics: { api: '40 Mbit/s', ok: '99.4%', resend: '< 1%', orphan: '≈ 0' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 8 · REST API for a todo app                                            */
/* ------------------------------------------------------------------ */

const td = cast({
  phone: { kind: 'phone', at: [-7, -3.5], tag: 'phone', tagIcon: Smartphone },
  laptop: { kind: 'device', at: [-7, 3.5], tag: 'laptop', tagIcon: Laptop },
  auth: { kind: 'cube', at: [-3.5, -3.5], label: 'IdP', sub: 'login', icon: KeyRound, tone: 'yellow', size: 'sm' },
  lb: { kind: 'cube', at: [-3.5, 0], label: 'LB', icon: Split, tone: 'green', size: 'sm' },
  api: { kind: 'cube', at: [0, 0], label: 'API', sub: 'stateless', icon: Server, tone: 'blue' },
  db: { kind: 'db', at: [3.5, -3.5], tag: 'primary', icon: Database },
  replica: { kind: 'db', at: [3.5, 3.5], tag: 'replica', icon: Database, tone: 'gray' },
});

const tdCore = [
  L('phone', 'lb', { arrow: 'both' }),
  L('laptop', 'lb', { arrow: 'both' }),
  L('lb', 'api', { arrow: 'both' }),
  L('api', 'db', { arrow: 'both' }),
];

export const qTodoApi: Question = {
  id: 'q-todo-api',
  n: 8,
  title: 'Design a REST API for a Todo App',
  blurb: 'Resources, verbs and status codes done right: auth scoping, cursors, ETags and idempotent creates.',
  minutes: 11,
  level: 'Beginner',
  concepts: ['APIs', 'CRUD', 'Database'],
  related: ['apis', 'indexes', 'authentication', 'replication', 'timeouts-retries'],
  followUps: [
    'How would you let users reorder items by drag and drop?',
    'How would you add shared lists with different permissions?',
    'How would you sync changes to an offline-first mobile app?',
    'How would you version this API without breaking old clients?',
  ],
  keywords: ['rest api', 'crud', 'todo', 'http verbs', 'status codes', 'cursor pagination', 'etag', 'if-match', 'idempotency key', 'patch'],
  metrics: [
    { id: 'rps', label: 'Requests', icon: Activity },
    { id: 'p99', label: 'p99 latency', icon: Timer },
    { id: 'db', label: 'DB load', icon: Gauge },
    { id: 'lost', label: 'Lost edits', icon: RefreshCw },
  ],
  learn: [
    { text: 'Modelling resources with correct verbs and status codes', at: 2 },
    { text: 'Schema and indexes driven by the queries', at: 3 },
    { text: 'Scoping every query to the authenticated user', at: 4 },
    { text: 'Cursor pagination and ETag concurrency control', at: 6 },
    { text: 'Idempotency keys for safe retries', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'A todo app, precisely',
      tag: 'Requirements',
      body: [
        'Functional: a user has **lists**; a list has **items** with a title, notes, due date and done flag. Users create, read, update and delete both, filter items by done / not done, and use the app from a phone and a laptop at the same time.',
        'Non-functional: users only ever see **their own** todos; p99 < 200 ms; no silently lost edits when two devices race; retries never create duplicates. Out of scope: shared lists, real-time sync, reminders, search.',
      ],
      scene: {
        nodes: td('phone', 'laptop', ['api', { sub: 'todo API' }]),
        links: [L('phone', 'api', { arrow: 'both' }), L('laptop', 'api', { arrow: 'both', first: 'v' })],
        flows: [F(['phone', 'api'], { ret: true }), F(['laptop', 'api'], { ret: true, delay: 1 })],
        notes: [
          { at: [3.8, -4], text: 'lists → items (CRUD)', icon: FileText },
          { at: [3.8, -3], text: 'only my todos', icon: Lock, tone: 'warn' },
          { at: [3.8, -2], text: 'no lost edits, no dupes', tone: 'warn' },
          { at: [3.8, 2.5], text: 'out: sharing, realtime', icon: Ban, tone: 'bad' },
        ],
      },
      metrics: { rps: '—', p99: '—', db: '—', lost: '—' },
    },
    {
      short: 'Numbers',
      title: 'Small numbers, one database',
      tag: 'Estimation',
      body: [
        '**1M daily users** × ~20 requests a day = 20M requests/day ≈ **230 req/s**, maybe 1,000/s at peak, ~80% reads. One stateless API tier handles that comfortably.',
        'Storage: 1M users × 500 items × ~300 B ≈ **150 GB** with indexes — one PostgreSQL primary. Saying so is part of the answer: no sharding, no queues, no cache needed yet. Spend the effort on API correctness.',
      ],
      scene: {
        nodes: td('phone', 'laptop', ['api', { sub: 'todo API' }]),
        links: [L('phone', 'api', { arrow: 'both' }), L('laptop', 'api', { arrow: 'both', first: 'v' })],
        flows: [F(['phone', 'api'], { ret: true, n: 2 }), F(['laptop', 'api'], { ret: true, delay: 0.8 })],
        notes: [
          { at: [3.8, -4], text: '20M req/day ≈ 230/s', icon: Activity },
          { at: [3.8, -3], text: 'peak ≈ 1k/s, 80% reads' },
          { at: [3.8, -2], text: '1M × 500 × 300 B ≈ 150 GB', icon: Database },
        ],
      },
      metrics: { rps: '230 /s' },
    },
    {
      short: 'API',
      title: 'Resources, verbs, status codes',
      tag: 'API',
      body: [
        'Nouns as resources: `GET/POST /lists`, `GET/POST /lists/{id}/items`, `GET/PATCH/DELETE /items/{id}`. Creates return `201 Created` with a `Location` header; deletes return `204 No Content`; reads return `200`. No verbs in URLs: `PATCH {done: true}` completes an item.',
        'Errors are part of the contract: `400` invalid input, `401` missing or expired token, `404` not found **or not yours**, `409` conflict, `412` stale version, `429` slow down.',
      ],
      scene: {
        nodes: td('phone', 'laptop', ['api', { sub: 'todo API' }]),
        links: [L('phone', 'api', { arrow: 'both', label: 'POST /items' }), L('laptop', 'api', { arrow: 'both', first: 'v' })],
        flows: [F(['phone', 'api'], { kind: 'data', ret: true }), F(['laptop', 'api'], { ret: true, retKind: 'error', delay: 1.2 })],
        notes: [
          { at: [3.8, -4], text: 'POST → 201 + Location', tone: 'good' },
          { at: [3.8, -3], text: 'DELETE → 204', tone: 'good' },
          { at: [3.8, -2], text: 'not yours → 404', tone: 'warn' },
          { at: [3.8, 2.5], text: '/completeItem ✗', tone: 'bad' },
        ],
      },
    },
    {
      short: 'Schema',
      title: 'Tables and the indexes they need',
      tag: 'Data Model',
      body: [
        '`lists(id, user_id, title, created_at)` and `items(id, list_id, user_id, title, notes, due_at, done, version, created_at, updated_at)`. Copying `user_id` onto items lets every query filter by owner without a join.',
        'Index what the API asks for: `items(list_id, done, created_at, id)` serves “open items in this list, oldest first” and its pagination; `lists(user_id, created_at)` serves the home screen. `version` powers concurrency control later.',
      ],
      changes: [{ sign: '+', text: 'PostgreSQL primary' }],
      scene: {
        nodes: td('phone', 'laptop', ['api', { meter: 20 }], ['db', { meter: 15 }]),
        links: [L('phone', 'api', { arrow: 'both' }), L('laptop', 'api', { arrow: 'both', first: 'v' }), L('api', 'db', { arrow: 'both', label: 'index seek' })],
        flows: [F(['phone', 'api', 'db'], { ret: true })],
        notes: [
          { at: [-3.5, -5], text: 'items(list_id, done, …)', icon: KeyRound },
          { at: [6.2, 0], text: 'user_id on every row', icon: User },
        ],
      },
      metrics: { db: '15%', p99: '25 ms' },
    },
    {
      short: 'Design',
      title: 'Stateless API, scoped by user',
      tag: 'Design',
      body: [
        'Clients log in with an identity provider and send `Authorization: Bearer <JWT>`. Each API server verifies the signature with cached public keys — no session store — and takes `user_id` from the token, **never from the request**.',
        'Every query includes `WHERE user_id = $me`, so another user’s item id returns `404` — not `403`, which would confirm it exists. Servers hold no state, so the load balancer can send any request to any instance.',
      ],
      callout: { kind: 'warn', text: 'The classic bug is `GET /items/{id}` without the owner filter: anyone can read anyone’s todos by counting ids (IDOR).' },
      changes: [{ sign: '+', text: 'Identity provider (JWT)' }, { sign: '+', text: 'Load balancer' }],
      scene: {
        nodes: td('phone', 'laptop', 'auth', 'lb', ['api', { meter: 20 }], ['db', { meter: 15 }]),
        links: [...tdCore, L('phone', 'auth', { label: 'login' }), L('auth', 'api', { dashed: true, tone: 'muted', label: 'public keys' })],
        flows: [F(['phone', 'auth'], { kind: 'handshake', ret: true }), F(['phone', 'lb', 'api', 'db'], { ret: true, delay: 1.4 })],
        notes: [{ at: [-1, 3.6], text: 'WHERE user_id = $me', icon: Lock, tone: 'good' }],
      },
    },
    {
      short: 'Pagination',
      title: 'Cursors, not offsets',
      tag: 'Deep Dive',
      body: [
        '`OFFSET 10000 LIMIT 50` makes the database walk and discard 10,000 rows, and items added meanwhile shift pages so users see duplicates or gaps. Instead return an opaque **cursor** encoding the last row’s `(created_at, id)`.',
        'The next page is `WHERE (created_at, id) > ($t, $id) ORDER BY created_at, id LIMIT 50` — an index seek, as fast on page 500 as on page 1. Response: `{items, next_cursor}`; no `next_cursor` means the end.',
      ],
      scene: {
        nodes: td('phone', 'laptop', 'auth', 'lb', ['api', { meter: 20 }], ['db', { meter: 12 }]),
        links: [...tdCore, L('phone', 'auth'), L('auth', 'api', { dashed: true, tone: 'muted' })],
        flows: [F(['phone', 'lb', 'api', 'db'], { ret: true, retKind: 'data' }), F(['phone', 'lb', 'api', 'db'], { ret: true, retKind: 'data', delay: 1.5 })],
        notes: [
          { at: [-1, 3.6], text: '?limit=50&cursor=eyJ0…', icon: Link2 },
          { at: [6.2, 0], text: 'OFFSET scans; cursor seeks', tone: 'good' },
        ],
      },
      metrics: { db: '12%' },
      hi: ['db'],
    },
    {
      short: 'ETags',
      title: 'PATCH without lost updates',
      tag: 'Deep Dive',
      body: [
        '`PATCH /items/42 {title}` changes only the fields sent; `PUT` replaces the whole item and can wipe fields. But devices still race: the phone renames an item to “Buy milk” while the laptop, holding a stale copy, renames it “Buy oat milk”. Last write silently wins.',
        'Responses carry `ETag: "7"` (the `version`). Updates send `If-Match: "7"` and run `UPDATE … SET …, version = version + 1 WHERE id = $1 AND version = 7`. Zero rows → `412 Precondition Failed`; the client refetches and retries or asks the user.',
      ],
      callout: { kind: 'key', text: 'Optimistic concurrency: no locks held between requests — just refuse writes based on a version the client never saw.' },
      scene: {
        nodes: td('phone', 'laptop', 'auth', 'lb', ['api', { meter: 20 }], ['db', { meter: 12 }]),
        links: [...tdCore, L('phone', 'auth'), L('auth', 'api', { dashed: true, tone: 'muted' })],
        flows: [F(['phone', 'lb', 'api', 'db'], { kind: 'data', ret: true }), F(['laptop', 'lb', 'api'], { kind: 'error', stop: true, delay: 1.3 })],
        notes: [
          { at: [-1, 3.6], text: 'If-Match "6" → 412', icon: Ban, tone: 'bad' },
          { at: [6.2, 0], text: 'version 7 → 8', tone: 'good' },
        ],
      },
      metrics: { lost: '0' },
      hi: ['lost'],
    },
    {
      short: 'Retries',
      title: 'Safe retries and clear errors',
      tag: 'Deep Dive',
      body: [
        'A phone on a train sends `POST /lists/1/items`; the response is lost; it retries — two identical todos. Fix: the client sends `Idempotency-Key: <uuid>`. The server stores key → response for 24 h under a unique constraint and replays the stored `201` on a retry.',
        '`GET`, `PUT` and `DELETE` are idempotent by definition; `POST` is the one that needs a key. Validate early — title 1–200 chars, `due_at` in ISO-8601 — and return one error shape: `400 {error: {code, message, field}}`.',
      ],
      scene: {
        nodes: td('phone', 'laptop', 'auth', 'lb', ['api', { meter: 20 }], ['db', { meter: 12, tag: 'idempotency keys' }]),
        links: [...tdCore, L('phone', 'auth'), L('auth', 'api', { dashed: true, tone: 'muted' })],
        flows: [F(['phone', 'lb'], { kind: 'error', stop: true }), F(['phone', 'lb', 'api', 'db'], { kind: 'data', ret: true, delay: 1 })],
        notes: [
          { at: [-1, 3.6], text: 'same key → same 201', icon: RefreshCw, tone: 'good' },
          { at: [6.2, 0], text: '400 {code, field}', tone: 'warn' },
        ],
      },
    },
    {
      short: 'Deploy',
      title: 'Deploy simply, scale reads later',
      tag: 'Bottleneck',
      body: [
        'Run 3 API instances behind the load balancer, one Postgres **primary** with a **replica** for failover and backups, and a connection pooler: 3 instances × 100 connections each would otherwise exhaust the database.',
        'If reads grow 10×, serve them from the replica — but replicas lag, so a user who just added an item might not see it. Route a user’s reads to the primary for a few seconds after they write (**read-your-writes**).',
      ],
      changes: [{ sign: '+', text: 'Read replica' }, { sign: '~', text: 'API × 3 behind the LB' }],
      scene: {
        nodes: td('phone', 'laptop', 'auth', 'lb', ['api', { meter: 45, sub: '× 3' }], ['db', { meter: 35 }], ['replica', { meter: 40 }]),
        links: [...tdCore, L('phone', 'auth'), L('auth', 'api', { dashed: true, tone: 'muted' }), L('db', 'replica', { dashed: true, label: 'replicate' }), L('api', 'replica', { arrow: 'both', label: 'reads' })],
        flows: [
          F(['laptop', 'lb', 'api', 'replica'], { ret: true, n: 2 }),
          F(['phone', 'lb', 'api', 'db'], { kind: 'data', ret: true, delay: 1 }),
          F(['db', 'replica'], { kind: 'data', delay: 1.8 }),
        ],
        notes: [{ at: [6.2, 0], text: 'lag: read-your-writes', icon: Timer, tone: 'warn' }],
      },
      metrics: { rps: '2.3k /s', p99: '40 ms', db: '35%' },
    },
    {
      short: 'Recap',
      title: 'A small API, done precisely',
      tag: 'Recap',
      body: [
        'Resources with the right **verbs and status codes**; a schema whose **indexes** match the queries; JWT auth with every query scoped to the user; **cursor** pagination; **ETag/If-Match** against lost updates; **idempotency keys** for retried creates.',
        'Deployment stays boring on purpose: a stateless API tier, one primary, one replica.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'At small scale the design is the contract: correct verbs, codes, ownership checks, pagination and concurrency rules.' },
      scene: {
        nodes: td('phone', 'laptop', 'auth', 'lb', ['api', { meter: 30 }], ['db', { meter: 20 }], ['replica', { meter: 20 }]),
        links: [...tdCore, L('phone', 'auth'), L('auth', 'api', { dashed: true, tone: 'muted' }), L('db', 'replica', { dashed: true }), L('api', 'replica', { arrow: 'both' })],
        flows: [F(['phone', 'lb', 'api', 'db'], { kind: 'data', ret: true }), F(['laptop', 'lb', 'api', 'replica'], { ret: true, delay: 1 })],
      },
      metrics: { rps: '230 /s', p99: '25 ms', db: '20%', lost: '0' },
    },
  ],
};
