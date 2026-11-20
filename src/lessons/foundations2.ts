import { Activity, Calculator, Database, Divide, Equal, Globe, HardDrive, Images, MemoryStick, Network, Radio, Server, TrendingUp, Upload, Users, Zap } from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* Napkin math                                                          */
/* ------------------------------------------------------------------ */

const nm = cast({
  users: { kind: 'crowd', at: [-5.5, 0], tag: '10M daily users', tagIcon: Users, items: 7 },
  phone: { kind: 'phone', at: [-5.5, 4], tag: 'uploaders', tagIcon: Upload },
  app: { kind: 'cube', at: [-1.5, 0], label: 'App', sub: '?', icon: Server, tone: 'blue' },
  edge: { kind: 'cube', at: [-1.5, -4], label: 'CDN', sub: 'edge', icon: Radio, tone: 'teal' },
  store: { kind: 'slab', at: [2.5, -4], tag: 'photos · 3 copies', icon: Images, tone: 'sand' },
  db: { kind: 'db', at: [2.5, 4], tag: 'metadata', icon: Database },
  cache: { kind: 'cube', at: [2.5, 0], label: 'Cache', sub: 'RAM', icon: MemoryStick, tone: 'orange' },
  far: { kind: 'cube', at: [2.5, -4], label: 'Europe', sub: 'region', icon: Globe, tone: 'gray' },
});

const fullLinks = [
  L('users', 'edge', { label: 'images' }),
  L('edge', 'store'),
  L('users', 'app', { label: 'API' }),
  L('phone', 'app'),
  L('app', 'store'),
  L('app', 'db', { arrow: 'both' }),
];

export const napkinMath: Lesson = {
  id: 'napkin-math',
  title: 'Napkin Math',
  blurb: 'Turn “10 million users” into servers, disks and bandwidth with five minutes of arithmetic.',
  minutes: 10,
  level: 'Beginner',
  keywords: ['back of the envelope', 'estimation', 'capacity planning', 'requests per second', 'qps', 'storage', 'bandwidth', 'peak traffic', 'latency numbers'],
  metrics: [
    { id: 'rps', label: 'Traffic', icon: Activity },
    { id: 'storage', label: 'Storage / yr', icon: HardDrive },
    { id: 'bw', label: 'Egress', icon: Network },
    { id: 'servers', label: 'App servers', icon: Server },
  ],
  learn: [
    { text: 'Turning daily totals into requests per second', at: 1 },
    { text: 'Sizing for the peak and the read/write mix', at: 2 },
    { text: 'Estimating storage, replicas included', at: 3 },
    { text: 'Bandwidth and server count with headroom', at: 5 },
    { text: 'A latency ladder from RAM to other continents', at: 6 },
  ],
  steps: [
    {
      short: 'The pitch',
      title: 'Ten million people. How many boxes?',
      tag: 'Problem',
      body: [
        'Your team pitches **Snapshot**, a photo-sharing app. Marketing expects **10 million daily users** within a year. Finance wants a hardware budget by Friday — and nobody has written a line of code yet.',
        'You don’t need precision. You need the right **order of magnitude**: is this 3 servers or 300? Terabytes or petabytes? A few minutes of arithmetic answers that.',
      ],
      callout: { kind: 'tip', text: 'Aim for the right power of ten, not the right digit. Off by 2× is fine; off by 100× means a different architecture.' },
      scene: {
        nodes: nm('users', 'app'),
        links: [L('users', 'app')],
        flows: [F(['users', 'app'], { ret: true, n: 3 })],
        notes: [
          { at: [3, -2], text: 'how many servers?', icon: Server, tone: 'warn' },
          { at: [3, 0], text: 'how much disk?', icon: HardDrive, tone: 'warn' },
          { at: [3, 2], text: 'how much bandwidth?', icon: Network, tone: 'warn' },
        ],
      },
      metrics: { rps: '—', storage: '—', bw: '—', servers: '—' },
    },
    {
      short: 'Per second',
      title: 'From per day to per second',
      tag: 'Technique',
      body: [
        'Start with what people do. Assume each user scrolls past **50 photos a day**: 10M × 50 = **500M views per day**.',
        'A day has 86,400 seconds — call it **100,000** so the maths stays easy. 500M ÷ 100k = **5,000 requests per second** on average. Rounding hides about 15%, which the peak factor in the next step easily swamps.',
      ],
      callout: { kind: 'key', text: 'Handy rule: 1 million a day ≈ 12 per second. 1 billion a day ≈ 12,000 per second.' },
      scene: {
        nodes: nm('users', 'app'),
        links: [L('users', 'app')],
        flows: [F(['users', 'app'], { ret: true, n: 4, speed: 1.1 })],
        notes: [
          { at: [3.5, -3], text: '10M users × 50 views', icon: Calculator },
          { at: [3.5, -1.5], text: '= 500M views / day', icon: Equal },
          { at: [3.5, 0], text: '÷ 100k seconds / day', icon: Divide },
          { at: [3.5, 1.5], text: '≈ 5,000 req/s average', tone: 'good' },
        ],
      },
      metrics: { rps: '5k /s avg' },
    },
    {
      short: 'Peaks',
      title: 'Plan for the peak, not the average',
      tag: 'Insight',
      body: [
        'Traffic isn’t flat. Evenings, weekends and a viral post push it to **2–3× the average**. Size for the peak: 5,000 × 3 = **15,000 views per second**.',
        'Uploads are rarer. If 1 in 5 users posts a photo a day, that’s 2M uploads ≈ 20/s, or 60/s at peak. Reads outnumber writes **250 to 1** — a loud hint to optimise the read path first.',
      ],
      changes: [{ sign: '+', text: 'Uploaders (the write path)' }],
      scene: {
        nodes: nm('users', 'phone', ['app', { meter: 70 }]),
        links: [L('users', 'app', { label: 'views' }), L('phone', 'app', { label: 'uploads' })],
        flows: [F(['users', 'app'], { ret: true, n: 6, speed: 1.3 }), F(['phone', 'app'], { kind: 'data', delay: 0.8, speed: 0.7 })],
        notes: [
          { at: [3.5, -3], text: 'peak ≈ 3 × average', icon: TrendingUp, tone: 'warn' },
          { at: [3.5, -1.5], text: '15,000 views/s' },
          { at: [3.5, 0], text: '60 uploads/s' },
          { at: [3.5, 1.5], text: 'reads : writes ≈ 250 : 1', tone: 'good' },
        ],
      },
      metrics: { rps: '15k /s peak' },
      bad: ['rps'],
    },
    {
      short: 'Storage',
      title: 'How much disk per year?',
      tag: 'Technique',
      body: [
        'A compressed phone photo is about **2 MB**; add a few resized versions and call it 2.5 MB. 2M uploads × 2.5 MB = **5 TB per day**, or roughly **1.8 PB per year**.',
        'Storage systems keep **3 copies** for durability, so budget ~5.5 PB of raw disk a year. The metadata — owner, caption, time, ~1 KB per photo — is only 2 GB a day: a rounding error next to the images.',
      ],
      callout: { kind: 'tip', text: 'Separate big blobs from small records early. They grow at wildly different rates and belong in different kinds of storage.' },
      changes: [{ sign: '+', text: 'Object storage for photos' }, { sign: '+', text: 'Database for metadata' }],
      scene: {
        nodes: nm('users', 'phone', ['app', { meter: 70 }], 'store', 'db'),
        links: [L('users', 'app'), L('phone', 'app'), L('app', 'store', { label: '5 TB / day' }), L('app', 'db', { label: '2 GB / day' })],
        flows: [F(['phone', 'app', 'store'], { kind: 'data', n: 2 }), F(['phone', 'app', 'db'], { kind: 'data', delay: 0.9 }), F(['users', 'app'], { ret: true, delay: 0.4 })],
        notes: [
          { at: [6.5, -4], text: '2M × 2.5 MB = 5 TB/day', icon: Calculator },
          { at: [6.5, -2.5], text: '× 365 ≈ 1.8 PB / year' },
          { at: [6.5, -1], text: '× 3 copies ≈ 5.5 PB', tone: 'warn' },
        ],
      },
      metrics: { storage: '5.5 PB' },
    },
    {
      short: 'Bandwidth',
      title: 'Bytes leaving the building',
      tag: 'Technique',
      body: [
        'Viewers don’t download originals; the feed shows a ~**200 KB** version. At peak: 15,000/s × 200 KB = 3 GB/s ≈ **24 Gbit/s** out. Uploads add 60/s × 2.5 MB = 150 MB/s ≈ **1.2 Gbit/s** in.',
        '24 Gbit/s would saturate a stack of server network cards, and cloud egress is billed per GB. So images are served from a **CDN** in front of storage — the app servers never touch those bytes.',
      ],
      changes: [{ sign: '+', text: 'CDN serves images' }, { sign: '~', text: 'App only handles API calls' }],
      scene: {
        nodes: nm('users', 'phone', 'edge', ['app', { meter: 55 }], 'store', 'db'),
        links: fullLinks,
        flows: [F(['store', 'edge', 'users'], { kind: 'data', n: 3, speed: 1.2 }), F(['users', 'app'], { ret: true, delay: 0.5 }), F(['phone', 'app', 'store'], { kind: 'data', delay: 1.2 })],
        notes: [
          { at: [6.5, -2.5], text: '15k/s × 200 KB = 3 GB/s', icon: Calculator },
          { at: [6.5, -1], text: '≈ 24 Gbit/s out', tone: 'warn' },
          { at: [6.5, 2], text: '150 MB/s ≈ 1.2 Gbit/s in' },
        ],
      },
      metrics: { bw: '24 Gbit/s' },
    },
    {
      short: 'Servers',
      title: 'Count servers, keep headroom',
      tag: 'Technique',
      body: [
        'With images offloaded, app servers handle the 15,000/s of feed and metadata calls. A load test shows one box serves about **1,000 req/s** before latency starts to climb.',
        'Never plan to run hot — queues explode near 100% busy. Target **~60%**: 15,000 ÷ (1,000 × 0.6) = **25 servers**. Spread them over zones, with enough spare that losing one zone is survivable.',
      ],
      callout: { kind: 'warn', text: 'Per-server capacity is the one number to measure, not guess. It can swing 10× between a cached lookup and a heavy query.' },
      changes: [{ sign: '~', text: 'App: 25 servers at ~60%' }],
      scene: {
        nodes: nm('users', 'phone', 'edge', ['app', { sub: '× 25', meter: 60 }], 'store', 'db'),
        links: fullLinks,
        flows: [F(['users', 'app', 'db'], { ret: true, n: 4 }), F(['store', 'edge', 'users'], { kind: 'data', n: 2, delay: 0.6 })],
        notes: [
          { at: [6.5, -2.5], text: '1 box ≈ 1,000 req/s', icon: Server },
          { at: [6.5, -1], text: 'run at 60% → 600 each' },
          { at: [6.5, 0.5], text: '15,000 ÷ 600 = 25', icon: Equal, tone: 'good' },
        ],
      },
      metrics: { servers: '25' },
    },
    {
      short: 'Latency',
      title: 'A latency cheat sheet',
      tag: 'Insight',
      body: [
        'A few timings are worth memorising: reading RAM takes ~**100 ns**, a random SSD read ~**100 µs**, a round trip inside one data centre ~**0.5 ms**, and a round trip to another continent ~**150 ms**.',
        'Stretch a RAM read to 1 second and an SSD read becomes 17 minutes, a same-DC hop 1.4 hours, and an intercontinental trip **17 days**. Five of those in a row can’t make a fast page.',
      ],
      callout: { kind: 'key', text: 'Each rung down the ladder is 10–1,000× slower. Design so the slow rungs happen rarely, in parallel, or not at all.' },
      scene: {
        nodes: nm('users', ['app', { sub: '× 25' }], 'cache', ['db', { tag: 'db · SSD' }], 'far'),
        links: [
          L('users', 'app'),
          L('app', 'cache', { arrow: 'both', label: '0.5 ms' }),
          L('app', 'db', { arrow: 'both', label: '~1 ms' }),
          L('app', 'far', { arrow: 'both', label: '150 ms', tone: 'bad', dashed: true }),
        ],
        flows: [
          F(['app', 'cache'], { ret: true, n: 3, speed: 1.6 }),
          F(['app', 'db'], { ret: true, delay: 0.5 }),
          F(['app', 'far'], { ret: true, speed: 0.35, delay: 0.9 }),
        ],
        notes: [
          { at: [6.5, -4], text: 'RAM read · 100 ns', icon: Zap, tone: 'good' },
          { at: [6.5, -2], text: 'SSD read · 100 µs', tone: 'good' },
          { at: [6.5, 0], text: 'same-DC trip · 0.5 ms' },
          { at: [6.5, 2], text: 'disk seek · 10 ms', tone: 'warn' },
          { at: [6.5, 4], text: 'other continent · 150 ms', tone: 'bad' },
        ],
      },
    },
    {
      short: 'Recap',
      title: 'Napkin math, summed up',
      tag: 'Recap',
      body: [
        'Daily actions ÷ **100k** gives per-second load; multiply by **2–3×** for the peak. Size × count × days × **3 copies** gives storage. Peak rate × object size gives bandwidth.',
        'Divide peak load by **measured** per-server capacity at ~60% busy to count servers, and keep the latency ladder in your head while sketching.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Five minutes of arithmetic turns a vague idea into a shopping list — and shows which part of the system will hurt first.' },
      scene: {
        nodes: nm('users', 'phone', 'edge', ['app', { sub: '× 25', meter: 60 }], 'store', 'db'),
        links: fullLinks,
        flows: [F(['store', 'edge', 'users'], { kind: 'data', n: 2 }), F(['users', 'app', 'db'], { ret: true, n: 2, delay: 0.4 }), F(['phone', 'app', 'store'], { kind: 'data', delay: 1.1 })],
        notes: [
          { at: [6.5, -3], text: '15k req/s peak', icon: Activity },
          { at: [6.5, -1.5], text: '5.5 PB / year', icon: HardDrive },
          { at: [6.5, 0], text: '24 Gbit/s out', icon: Network },
          { at: [6.5, 1.5], text: '25 app servers', icon: Server, tone: 'good' },
        ],
      },
      metrics: { rps: '15k /s peak', storage: '5.5 PB', bw: '24 Gbit/s', servers: '25' },
    },
  ],
};
