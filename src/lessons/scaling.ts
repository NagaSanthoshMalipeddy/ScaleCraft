import {
  Activity,
  Clock,
  Database,
  Gauge,
  Globe,
  MapPin,
  Percent,
  Radio,
  Server,
  ShieldCheck,
  Split,
  Timer,
  TriangleAlert,
  Users,
  Zap,
} from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* Load balancing                                                       */
/* ------------------------------------------------------------------ */

const lb = cast({
  users: { kind: 'crowd', at: [-5.5, 0], tag: 'users', tagIcon: Users, items: 6 },
  lb: { kind: 'cube', at: [-1.5, 0], label: 'LB', sub: 'balancer', icon: Split, tone: 'green' },
  lb2: { kind: 'cube', at: [-1.5, 4.5], label: 'LB 2', sub: 'standby', icon: Split, tone: 'green', size: 'sm' },
  s1: { kind: 'cube', at: [2.5, -4], label: 'App 1', icon: Server, tone: 'blue' },
  s2: { kind: 'cube', at: [2.5, 0], label: 'App 2', icon: Server, tone: 'blue' },
  s3: { kind: 'cube', at: [2.5, 4], label: 'App 3', icon: Server, tone: 'blue' },
});

const lbLinks = [L('users', 'lb'), L('lb', 's1'), L('lb', 's2'), L('lb', 's3')];
const rr = [F(['users', 'lb', 's1'], { ret: true, delay: 0.2 }), F(['users', 'lb', 's2'], { ret: true, delay: 0.9 }), F(['users', 'lb', 's3'], { ret: true, delay: 1.6 })];

export const loadBalancing: Lesson = {
  id: 'load-balancing',
  title: 'Load Balancing',
  blurb: 'One front door, many servers — and the rules that decide who handles which request.',
  minutes: 9,
  level: 'Beginner',
  keywords: ['load balancer', 'round robin', 'least connections', 'health check', 'failover', 'scale out', 'horizontal'],
  metrics: [
    { id: 'rps', label: 'Traffic', icon: Activity },
    { id: 'servers', label: 'Servers', icon: Server },
    { id: 'max', label: 'Busiest', icon: Gauge },
    { id: 'errors', label: 'Errors', icon: TriangleAlert },
  ],
  learn: [
    { text: 'Why scaling out needs a single entry point', at: 1 },
    { text: 'Round robin and where it breaks', at: 3 },
    { text: 'Least-connections balancing', at: 4 },
    { text: 'Health checks and automatic removal', at: 5 },
    { text: 'Avoiding the balancer as a single point of failure', at: 6 },
  ],
  steps: [
    {
      short: 'One server',
      title: 'One server, melting',
      tag: 'Problem',
      body: [
        'A ticketing site runs on a single app server. A concert goes on sale and traffic triples: CPU pins at **96%**, requests time out, and the error rate climbs.',
        'A bigger machine buys time, but there is always a biggest machine — and it is still one machine.',
      ],
      scene: {
        nodes: lb('users', ['s2', { meter: 96, status: 'hot', label: 'App' }]),
        links: [L('users', 's2')],
        flows: [F(['users', 's2'], { ret: true, n: 5, speed: 0.7 })],
      },
      metrics: { rps: '3,000 /s', servers: '1', max: '96%', errors: '4.2%' },
      bad: ['max', 'errors'],
    },
    {
      short: 'Scale out',
      title: 'Add servers behind one front door',
      tag: 'Technique',
      body: [
        'Run three identical app servers and put a **load balancer** in front. Clients only know one address — the balancer’s — and it forwards each request to a server.',
        'This only works if the servers are interchangeable: no user sessions kept in local memory.',
      ],
      callout: { kind: 'key', text: 'Horizontal scaling turns “buy a bigger box” into “add another box” — and gives you redundancy for free.' },
      changes: [{ sign: '+', text: 'Load balancer' }, { sign: '+', text: '2 more app servers' }],
      scene: {
        nodes: lb('users', 'lb', ['s1', { meter: 33 }], ['s2', { meter: 33 }], ['s3', { meter: 33 }]),
        links: lbLinks,
        flows: rr,
      },
      metrics: { servers: '3', max: '34%', errors: '0%' },
      hi: ['servers', 'max', 'errors'],
    },
    {
      short: 'Round robin',
      title: 'Round robin: take turns',
      tag: 'Technique',
      body: [
        'The simplest rule: request 1 → App 1, request 2 → App 2, request 3 → App 3, then start over.',
        'It needs no knowledge of the servers at all, which makes it fast and predictable. When every request costs about the same, it spreads load evenly.',
      ],
      scene: {
        nodes: lb('users', 'lb', ['s1', { meter: 33 }], ['s2', { meter: 33 }], ['s3', { meter: 33 }]),
        links: [L('users', 'lb'), L('lb', 's1', { label: '1, 4, 7…' }), L('lb', 's2', { label: '2, 5, 8…' }), L('lb', 's3', { label: '3, 6, 9…' })],
        flows: rr,
      },
    },
    {
      short: 'Uneven work',
      title: 'Not all requests are equal',
      tag: 'Problem',
      body: [
        'Some requests are cheap (“show seat map”), some are expensive (“generate PDF ticket”, 2 s). Round robin doesn’t care, so a few unlucky heavy requests stack up on **App 1**.',
        'App 1 is at 91% while the others idle — and its users see slow pages.',
      ],
      scene: {
        nodes: lb('users', 'lb', ['s1', { meter: 91, status: 'hot' }], ['s2', { meter: 22 }], ['s3', { meter: 25 }]),
        links: lbLinks,
        flows: [F(['users', 'lb', 's1'], { ret: true, n: 3, speed: 0.5 }), F(['users', 'lb', 's2'], { ret: true, delay: 0.9 }), F(['users', 'lb', 's3'], { ret: true, delay: 1.6 })],
        notes: [{ at: [5.6, -4], text: 'PDF · 2 s', tone: 'bad' }],
      },
      metrics: { max: '91%' },
      bad: ['max'],
    },
    {
      short: 'Least conn.',
      title: 'Send work to the least busy',
      tag: 'Technique',
      body: [
        '**Least connections**: the balancer tracks how many requests each server is currently handling and picks the one with the fewest.',
        'Slow requests naturally steer new work elsewhere. Variants weigh servers by capacity or use measured response times.',
      ],
      callout: { kind: 'tip', text: '“Power of two choices”: pick two servers at random and use the less-loaded one. Nearly as good as checking all, far cheaper at scale.' },
      scene: {
        nodes: lb('users', 'lb', ['s1', { meter: 48 }], ['s2', { meter: 46 }], ['s3', { meter: 45 }]),
        links: [L('users', 'lb'), L('lb', 's1', { label: '3 active' }), L('lb', 's2', { label: '1 active' }), L('lb', 's3', { label: '1 active' })],
        flows: [F(['users', 'lb', 's1'], { ret: true, speed: 0.5 }), F(['users', 'lb', 's2'], { ret: true, n: 2, delay: 0.5 }), F(['users', 'lb', 's3'], { ret: true, n: 2, delay: 1.1 })],
      },
      metrics: { max: '48%' },
      hi: ['max'],
    },
    {
      short: 'Health checks',
      title: 'A server dies — nobody notices',
      tag: 'Technique',
      body: [
        'App 3 crashes. The balancer pings every server with `GET /health` every few seconds; after two failures it pulls App 3 out of rotation.',
        'Traffic flows to the two healthy servers. When App 3 comes back and passes checks, it is added again automatically.',
      ],
      callout: { kind: 'warn', text: 'Make health checks meaningful (can it reach the database?) but cheap — and don’t let one slow dependency fail every server at once.' },
      changes: [{ sign: '-', text: 'App 3 removed from rotation' }],
      scene: {
        nodes: lb('users', 'lb', ['s1', { meter: 52 }], ['s2', { meter: 50 }], ['s3', { status: 'down' }]),
        links: [L('users', 'lb'), L('lb', 's1'), L('lb', 's2'), L('lb', 's3', { dashed: true, tone: 'bad', label: 'GET /health ✗' })],
        flows: [F(['users', 'lb', 's1'], { ret: true, n: 2 }), F(['users', 'lb', 's2'], { ret: true, n: 2, delay: 0.7 }), F(['lb', 's3'], { kind: 'handshake', stop: true, delay: 0.4 })],
      },
      metrics: { servers: '2 / 3', max: '52%', errors: '0%' },
      hi: ['errors'],
    },
    {
      short: 'Redundant LB',
      title: 'Who balances the balancer?',
      tag: 'Trade-off',
      body: [
        'Now the balancer is the single point of failure. Run **two**: an active one and a standby that watches its heartbeat.',
        'If the active one stops responding, the standby takes over its virtual IP within seconds. Cloud load balancers do this for you behind a DNS name.',
      ],
      changes: [{ sign: '+', text: 'Standby balancer' }],
      scene: {
        nodes: lb('users', 'lb', 'lb2', ['s1', { meter: 34 }], ['s2', { meter: 33 }], ['s3', { meter: 33 }]),
        links: [...lbLinks, L('lb', 'lb2', { dashed: true, arrow: 'both', label: 'heartbeat' })],
        flows: [...rr, F(['lb', 'lb2'], { kind: 'handshake', ret: true, retKind: 'handshake', delay: 0.4 })],
      },
      metrics: { servers: '3', max: '34%' },
    },
    {
      short: 'Recap',
      title: 'Load balancing, summed up',
      tag: 'Recap',
      body: [
        'A load balancer gives many servers **one address**, spreads requests with a policy (round robin, least connections, hashing), and removes unhealthy servers using **health checks**.',
        'It only works with stateless app servers, and it must be redundant itself.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Scale out behind a balancer, keep servers stateless, and let health checks do the 3 a.m. work for you.' },
      scene: {
        nodes: lb('users', 'lb', 'lb2', ['s1', { meter: 34 }], ['s2', { meter: 33 }], ['s3', { meter: 33 }]),
        links: [...lbLinks, L('lb', 'lb2', { dashed: true, arrow: 'both' })],
        flows: rr.map((f) => ({ ...f, n: 2 })),
      },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Caching                                                              */
/* ------------------------------------------------------------------ */

const ca = cast({
  users: { kind: 'crowd', at: [-5.5, 0], tag: 'shoppers', tagIcon: Users, items: 5 },
  app: { kind: 'cube', at: [-1.5, 0], label: 'App', icon: Server, tone: 'blue' },
  cache: { kind: 'cube', at: [2, -3.5], label: 'Cache', sub: 'in-memory', icon: Zap, tone: 'orange' },
  db: { kind: 'db', at: [2, 3.5], label: 'database', icon: Database },
});

export const caching: Lesson = {
  id: 'caching',
  title: 'Caching',
  blurb: 'Keep the answers people ask for most somewhere much faster than the database.',
  minutes: 10,
  level: 'Beginner',
  keywords: ['cache', 'cache-aside', 'hit ratio', 'ttl', 'invalidation', 'stampede', 'redis', 'memcached'],
  metrics: [
    { id: 'lat', label: 'Avg latency', icon: Timer },
    { id: 'hit', label: 'Hit ratio', icon: Percent },
    { id: 'db', label: 'DB load', icon: Database },
  ],
  learn: [
    { text: 'The cache-aside pattern (miss → load → store)', at: 1 },
    { text: 'Why hits are ~40× cheaper than misses', at: 2 },
    { text: 'Doing the hit-ratio math', at: 3 },
    { text: 'TTLs, invalidation and stale data', at: 4 },
    { text: 'Preventing a cache stampede', at: 5 },
  ],
  steps: [
    {
      short: 'Slow DB',
      title: 'The same query, a million times',
      tag: 'Problem',
      body: [
        'A shop’s product page runs a 40 ms query joining prices, stock and reviews. The bestsellers get viewed thousands of times a minute — **the same query, the same answer**.',
        'The database sits at 85% CPU doing repeated work.',
      ],
      scene: {
        nodes: ca('users', 'app', ['db', { meter: 85 }]),
        links: [L('users', 'app'), L('app', 'db', { label: 'SELECT … 40 ms', arrow: 'both' })],
        flows: [F(['users', 'app', 'db'], { ret: true, n: 3, speed: 0.8 })],
      },
      metrics: { lat: '42 ms', hit: '—', db: '85%' },
      bad: ['db'],
    },
    {
      short: 'Cache miss',
      title: 'Check the cache first',
      tag: 'Technique',
      body: [
        '**Cache-aside**: the app asks the cache for `product:42`. Not there (a **miss**) → read the database → store the result in the cache with a time-to-live → return it.',
        'The first request is slightly slower than before. Every one after it is not.',
      ],
      changes: [{ sign: '+', text: 'In-memory cache' }],
      scene: {
        nodes: ca('users', 'app', 'cache', ['db', { meter: 60 }]),
        links: [L('users', 'app'), L('app', 'cache', { label: 'GET product:42', arrow: 'both' }), L('app', 'db', { arrow: 'both' })],
        flows: [F(['app', 'cache'], { ret: true, retKind: 'error', delay: 0.2 }), F(['app', 'db'], { ret: true, delay: 1.4 })],
        notes: [{ at: [5.3, -3.5], text: 'MISS', tone: 'bad' }],
      },
    },
    {
      short: 'Cache hit',
      title: 'A hit costs about a millisecond',
      tag: 'Technique',
      body: [
        'The next shopper asks for the same product. The cache answers from RAM in **~1 ms** and the database is never touched.',
        'That is the whole trick: memory is fast, and popular data is asked for again and again.',
      ],
      scene: {
        nodes: ca('users', 'app', ['cache', { meter: 20 }], ['db', { meter: 15 }]),
        links: [L('users', 'app'), L('app', 'cache', { arrow: 'both', label: '1 ms' }), L('app', 'db', { arrow: 'both', dashed: true })],
        flows: [F(['users', 'app', 'cache'], { ret: true, n: 4, speed: 1.4 })],
        notes: [{ at: [5.3, -3.5], text: 'HIT', tone: 'good' }],
      },
      metrics: { lat: '3 ms', hit: '—', db: '15%' },
      hi: ['lat'],
    },
    {
      short: 'Hit ratio',
      title: 'Do the hit-ratio math',
      tag: 'Insight',
      body: [
        'With a **95% hit ratio**: average latency ≈ 0.95 × 1 ms + 0.05 × 41 ms ≈ **3 ms**. The database only sees 1 request in 20.',
        'Popularity is usually skewed — a few products get most views — so even a small cache can achieve a high hit ratio.',
      ],
      scene: {
        nodes: ca('users', 'app', ['cache', { meter: 30 }], ['db', { meter: 12 }]),
        links: [L('users', 'app'), L('app', 'cache', { arrow: 'both', label: '95%' }), L('app', 'db', { arrow: 'both', label: '5%' })],
        flows: [F(['users', 'app', 'cache'], { ret: true, n: 5, speed: 1.3 }), F(['app', 'db'], { ret: true, delay: 1.2, speed: 0.8 })],
      },
      metrics: { lat: '3 ms', hit: '95%', db: '12%' },
      hi: ['lat', 'hit', 'db'],
    },
    {
      short: 'Stale data',
      title: 'The cache can lie',
      tag: 'Trade-off',
      body: [
        'A price changes from $24 to $19 in the database, but the cache still holds $24 until its TTL expires. Shoppers see the old price.',
        'Options: short TTLs (simple, some staleness), **delete the key on write** (fresher, more moving parts), or both.',
      ],
      callout: { kind: 'warn', text: 'Decide per data type how stale is acceptable. A product description can be minutes old; an account balance cannot.' },
      scene: {
        nodes: ca('users', 'app', ['cache', { meter: 30 }], ['db', { meter: 12 }]),
        links: [L('users', 'app'), L('app', 'cache', { arrow: 'both' }), L('app', 'db', { arrow: 'both', label: 'UPDATE price' })],
        flows: [F(['app', 'db'], { kind: 'data', delay: 0.2 }), F(['users', 'app', 'cache'], { ret: true, n: 2, delay: 0.8 })],
        notes: [
          { at: [5.6, -3.5], text: 'price: $24 (stale)', tone: 'bad' },
          { at: [5.4, 3.5], text: 'price: $19', tone: 'good' },
        ],
      },
    },
    {
      short: 'Stampede',
      title: 'When a hot key expires',
      tag: 'Case',
      body: [
        'The homepage key expires at 12:00:00. In that instant 2,000 requests miss together and **all** run the expensive query. The database falls over.',
        'Fixes: let one request rebuild while others wait or get the old value (**request coalescing**, stale-while-revalidate), and add random jitter to TTLs.',
      ],
      scene: {
        nodes: ca('users', 'app', ['cache', { meter: 10 }], ['db', { meter: 100, status: 'hot' }]),
        links: [L('users', 'app'), L('app', 'cache', { arrow: 'both' }), L('app', 'db', { arrow: 'both', tone: 'bad', label: '× 2,000' })],
        flows: [F(['users', 'app', 'db'], { n: 8, speed: 0.9 })],
        notes: [{ at: [5.3, -3.5], text: 'EXPIRED', tone: 'bad' }],
      },
      metrics: { lat: '1.8 s', hit: '0%', db: '100%' },
      bad: ['lat', 'hit', 'db'],
    },
    {
      short: 'Recap',
      title: 'Caching, summed up',
      tag: 'Recap',
      body: [
        'Put a fast store in front of a slow one. Read through it with **cache-aside**, measure your **hit ratio**, pick TTLs per data type, and invalidate on writes when freshness matters.',
        'Protect hot keys from stampedes, and remember: the cache is a copy — the database is the truth.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'The two hard parts of caching are deciding what may be stale, and what happens when the cache is empty.' },
      scene: {
        nodes: ca('users', 'app', ['cache', { meter: 30 }], ['db', { meter: 12 }]),
        links: [L('users', 'app'), L('app', 'cache', { arrow: 'both' }), L('app', 'db', { arrow: 'both' })],
        flows: [F(['users', 'app', 'cache'], { ret: true, n: 4, speed: 1.3 }), F(['app', 'db'], { ret: true, delay: 1.2 })],
      },
      metrics: { lat: '3 ms', hit: '95%', db: '12%' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* CDN                                                                  */
/* ------------------------------------------------------------------ */

const cd = cast({
  you: { kind: 'device', at: [-6, 0], tag: 'you · Sydney', tagIcon: MapPin },
  edge: { kind: 'cube', at: [-2, 0], label: 'Edge', sub: 'Sydney', icon: Radio, tone: 'teal' },
  shield: { kind: 'cube', at: [2, 0], label: 'Shield', sub: 'mid-tier', icon: ShieldCheck, tone: 'violet', size: 'sm' },
  origin: { kind: 'cube', at: [5.5, 0], label: 'Origin', sub: 'Virginia', icon: Server, tone: 'blue' },
  tokyo: { kind: 'crowd', at: [-6, -4], tag: 'Tokyo', items: 3 },
  e2: { kind: 'cube', at: [-2, -4], label: 'Edge', sub: 'Tokyo', icon: Radio, tone: 'teal', size: 'sm' },
  sao: { kind: 'crowd', at: [-6, 4], tag: 'São Paulo', items: 3 },
  e3: { kind: 'cube', at: [-2, 4], label: 'Edge', sub: 'São Paulo', icon: Radio, tone: 'teal', size: 'sm' },
});

export const cdn: Lesson = {
  id: 'cdn',
  title: 'Content Delivery',
  blurb: 'Copy what everyone downloads to servers near your users — and stop fighting the speed of light.',
  minutes: 8,
  level: 'Beginner',
  keywords: ['cdn', 'edge', 'pop', 'origin', 'cache-control', 'latency', 'static assets', 'origin shield'],
  metrics: [
    { id: 'rtt', label: 'Round trip', icon: Clock },
    { id: 'load', label: 'Page load', icon: Timer },
    { id: 'origin', label: 'Origin traffic', icon: Globe },
  ],
  learn: [
    { text: 'Why distance sets a floor on latency', at: 1 },
    { text: 'How an edge cache fills on a miss', at: 2 },
    { text: 'What to cache at the edge (and what not to)', at: 4 },
    { text: 'Origin shields', at: 5 },
  ],
  steps: [
    {
      short: 'Far away',
      title: 'Every byte crosses an ocean',
      tag: 'Problem',
      body: [
        'A photo-sharing site runs in Virginia. Users in Sydney wait ~3 s for the feed: the page needs 60 images, scripts and fonts, and every request travels **16,000 km** each way.',
      ],
      scene: {
        nodes: cd('you', 'origin'),
        links: [L('you', 'origin', { arrow: 'both', label: '≈ 16,000 km', tone: 'bad' })],
        flows: [F(['you', 'origin'], { ret: true, n: 2, speed: 0.5 })],
      },
      metrics: { rtt: '210 ms', load: '3.1 s', origin: '100%' },
      bad: ['rtt', 'load'],
    },
    {
      short: 'Physics',
      title: 'You can’t buy a faster speed of light',
      tag: 'Insight',
      body: [
        'Light in fibre covers ~200 km per millisecond. Sydney → Virginia and back is at least **160 ms** before any routing detours — no server upgrade can fix that.',
        'The only fix is to make the trip shorter: put the content closer to the user.',
      ],
      callout: { kind: 'key', text: 'Latency has a physical floor set by distance. Bandwidth can grow; the speed of light can’t.' },
      scene: {
        nodes: cd('you', 'origin'),
        links: [L('you', 'origin', { arrow: 'both', label: '≥ 160 ms round trip', tone: 'bad' })],
        flows: [F(['you', 'origin'], { ret: true, speed: 0.4 })],
      },
    },
    {
      short: 'Edge miss',
      title: 'An edge server nearby',
      tag: 'Technique',
      body: [
        'A **CDN** runs hundreds of edge locations (PoPs). DNS sends the Sydney user to the Sydney edge, ~10 ms away.',
        'The first request for `cat.jpg` is a **miss**: the edge fetches it from the origin once, stores it, and serves it.',
      ],
      changes: [{ sign: '+', text: 'Edge PoP in Sydney' }],
      scene: {
        nodes: cd('you', 'edge', 'origin'),
        links: [L('you', 'edge', { arrow: 'both', label: '10 ms' }), L('edge', 'origin', { arrow: 'both', label: 'miss → fetch' })],
        flows: [F(['you', 'edge', 'origin'], { ret: true, speed: 0.8 })],
        notes: [{ at: [-2, -3], text: 'MISS', tone: 'bad' }],
      },
    },
    {
      short: 'Edge hit',
      title: 'Everyone after that: 10 ms',
      tag: 'Technique',
      body: [
        'Every later request for that image from Australia is a **hit** at the edge. The round trip drops from 210 ms to ~10 ms and the origin never hears about it.',
        'The page loads in under a second, and origin traffic falls by 90%.',
      ],
      scene: {
        nodes: cd(['you', { kind: 'crowd', tag: 'Sydney users', items: 5 }], 'edge', 'origin'),
        links: [L('you', 'edge', { arrow: 'both', label: '10 ms' }), L('edge', 'origin', { arrow: 'both', dashed: true })],
        flows: [F(['you', 'edge'], { ret: true, n: 4, speed: 1.2 })],
        notes: [{ at: [-2, -3], text: 'HIT', tone: 'good' }],
      },
      metrics: { rtt: '11 ms', load: '0.8 s', origin: '10%' },
      hi: ['rtt', 'load', 'origin'],
    },
    {
      short: 'What to cache',
      title: 'Cache the right things',
      tag: 'Trade-off',
      body: [
        'Static files with **content-hashed names** (`app.3f9a.js`) never change, so they can be cached for a year. When you deploy, the name changes.',
        'Personal pages (`/cart`, `/inbox`) must not be shared between users: mark them `Cache-Control: private` or `no-store`.',
      ],
      callout: { kind: 'warn', text: 'A wrong cache header can show one user’s page to another. Default to private; opt in to public caching.' },
      scene: {
        nodes: cd(['you', { kind: 'crowd', tag: 'Sydney users', items: 5 }], 'edge', 'origin'),
        links: [L('you', 'edge', { arrow: 'both' }), L('edge', 'origin', { arrow: 'both', label: '/cart → origin' })],
        flows: [F(['you', 'edge'], { ret: true, n: 3, speed: 1.2 }), F(['you', 'edge', 'origin'], { ret: true, kind: 'data', retKind: 'data', delay: 1, speed: 0.8 })],
        notes: [
          { at: [-2, -3.4], text: 'app.3f9a.js · max-age=1y', tone: 'good' },
          { at: [3.5, -2.4], text: '/cart · private', tone: 'warn' },
        ],
      },
    },
    {
      short: 'Shield',
      title: 'Hundreds of edges, one origin',
      tag: 'Technique',
      body: [
        'Each edge misses independently. With 300 PoPs, a new file could hit your origin 300 times.',
        'An **origin shield** is a middle cache layer: edges miss to the shield, and only the shield talks to the origin.',
      ],
      changes: [{ sign: '+', text: 'Tokyo & São Paulo edges' }, { sign: '+', text: 'Origin shield' }],
      scene: {
        nodes: cd(['you', { kind: 'crowd', tag: 'Sydney', items: 3 }], 'edge', 'tokyo', 'e2', 'sao', 'e3', 'shield', ['origin', { meter: 8 }]),
        links: [L('you', 'edge'), L('tokyo', 'e2'), L('sao', 'e3'), L('edge', 'shield'), L('e2', 'shield'), L('e3', 'shield'), L('shield', 'origin', { label: '1 fetch' })],
        flows: [
          F(['you', 'edge'], { ret: true, n: 2 }),
          F(['tokyo', 'e2'], { ret: true, n: 2, delay: 0.5 }),
          F(['sao', 'e3'], { ret: true, n: 2, delay: 0.9 }),
          F(['e2', 'shield', 'origin'], { ret: true, kind: 'data', retKind: 'data', delay: 1.4, speed: 0.8 }),
        ],
      },
      metrics: { origin: '2%' },
      hi: ['origin'],
    },
    {
      short: 'Recap',
      title: 'CDNs, summed up',
      tag: 'Recap',
      body: [
        'Distance sets a minimum latency. A CDN beats it by **caching copies at the edge**, close to users, and fetching from the origin only on a miss.',
        'Cache static, fingerprinted assets aggressively; keep personal responses private; shield the origin from the herd.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'The fastest request is the one that never leaves the user’s city.' },
      scene: {
        nodes: cd(['you', { kind: 'crowd', tag: 'Sydney', items: 3 }], 'edge', 'tokyo', 'e2', 'sao', 'e3', 'shield', ['origin', { meter: 8 }]),
        links: [L('you', 'edge'), L('tokyo', 'e2'), L('sao', 'e3'), L('edge', 'shield'), L('e2', 'shield'), L('e3', 'shield'), L('shield', 'origin')],
        flows: [F(['you', 'edge'], { ret: true, n: 2 }), F(['tokyo', 'e2'], { ret: true, n: 2, delay: 0.5 }), F(['sao', 'e3'], { ret: true, n: 2, delay: 0.9 })],
      },
      metrics: { rtt: '11 ms', load: '0.8 s', origin: '2%' },
    },
  ],
};
