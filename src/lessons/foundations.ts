import { Activity, Clock, Gauge, Globe, Hourglass, Layers, MapPin, Network, Server, Timer, User, Users, Zap } from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

const rq = cast({
  you: { kind: 'device', at: [-4.5, 1.5], tag: 'you', tagIcon: User },
  dns: { kind: 'cube', at: [-1, -2], label: 'DNS', sub: 'resolver', icon: Globe, tone: 'yellow' },
  server: { kind: 'cube', at: [2, 1.5], label: 'Server', sub: 'web app', icon: Server, tone: 'blue' },
  db: { kind: 'db', at: [5.5, -2], label: 'database', icon: Layers },
});

const url = { at: [-4.5, -1.9] as [number, number], text: 'https://bakery.example', icon: Globe };

export const requestJourney: Lesson = {
  id: 'request-journey',
  title: 'How a Request Travels',
  blurb: 'Press Enter on a URL and follow every hop — then find out where the milliseconds actually go.',
  minutes: 9,
  level: 'Beginner',
  keywords: ['dns', 'tcp', 'tls', 'http', 'round trip', 'rtt', 'page load'],
  metrics: [
    { id: 'dns', label: 'DNS', icon: Globe },
    { id: 'connect', label: 'Connect', icon: Network },
    { id: 'server', label: 'Server', icon: Server },
    { id: 'download', label: 'Download', icon: Activity },
    { id: 'total', label: 'Total', icon: Timer },
  ],
  learn: [
    { text: 'What a DNS lookup does and why it is cached', at: 1 },
    { text: 'Why a fresh connection costs round trips', at: 2 },
    { text: 'The path: browser → server → database → back', at: 4 },
    { text: 'Why a page is really dozens of requests', at: 6 },
    { text: 'Why distance beats bandwidth for latency', at: 7 },
  ],
  steps: [
    {
      short: 'Press Enter',
      title: 'The bakery site feels slow',
      tag: 'Problem',
      body: [
        'Customers say the online bakery is "a bit sluggish". Before you can speed anything up, you need to know **where the time goes**.',
        'So let’s follow one single page load. You type `bakery.example`, hit Enter, and roughly a fifth of a second later the menu appears.',
      ],
      callout: { kind: 'key', title: 'Key idea', text: 'A page load is a chain of conversations between machines. Every link in the chain costs time, and the costs add up.' },
      scene: { nodes: rq('you'), notes: [url] },
      metrics: { dns: '—', connect: '—', server: '—', download: '—', total: '—' },
    },
    {
      short: 'Find address',
      title: 'First, turn the name into an address',
      tag: 'Technique',
      body: [
        'Computers route by IP address, not by name. Your browser asks a **DNS resolver**: “what’s the address of `bakery.example`?”',
        'The resolver may need to ask other DNS servers, but the answer comes with a time-to-live, so the next lookup is served from a cache in a millisecond or two.',
      ],
      callout: { kind: 'tip', title: 'Good to know', text: 'Your laptop, your router and your ISP all cache DNS answers. That is why the very first visit is the slowest.' },
      changes: [{ sign: '+', text: 'DNS resolver' }, { sign: '+', text: 'Lookup: 24 ms' }],
      scene: {
        nodes: rq('you', 'dns'),
        links: [L('you', 'dns', { dashed: true, arrow: 'both', label: 'lookup' })],
        flows: [F(['you', 'dns'], { ret: true })],
        notes: [url],
      },
      metrics: { dns: '24 ms', total: '24 ms' },
      hi: ['dns'],
    },
    {
      short: 'Connect',
      title: 'Shake hands before talking',
      tag: 'Technique',
      body: [
        'Now the browser opens a connection to the server. TCP needs one round trip to set up, and TLS (the “S” in HTTPS) needs one more to agree on encryption keys.',
        'With a 25 ms round trip that is about **50 ms** before a single byte of the page is requested.',
      ],
      callout: { kind: 'key', title: 'Key idea', text: 'Round trips, not bytes, dominate small requests. Reusing an open connection skips this whole step.' },
      changes: [{ sign: '+', text: 'Web server' }, { sign: '+', text: 'TCP + TLS: 2 round trips' }],
      scene: {
        nodes: rq('you', 'dns', 'server'),
        links: [L('you', 'dns', { dashed: true, arrow: 'both' }), L('you', 'server', { label: 'TCP + TLS' })],
        flows: [F(['you', 'server'], { kind: 'handshake', ret: true, retKind: 'handshake', n: 2 })],
        notes: [url, { at: [-0.8, 0], text: 'cached · 5 min', icon: Clock }],
      },
      metrics: { connect: '50 ms', total: '74 ms' },
      hi: ['connect'],
    },
    {
      short: 'Request',
      title: 'Ask for the page',
      tag: 'Technique',
      body: [
        'The browser sends `GET /menu`. The server parses it, runs the app code, renders HTML — about 12 ms of work here.',
        'Add one more round trip for the request to travel there and the first byte to come back.',
      ],
      changes: [{ sign: '+', text: 'Request: 1 round trip + 12 ms' }],
      scene: {
        nodes: rq('you', 'dns', ['server', { meter: 25 }]),
        links: [L('you', 'dns', { dashed: true, arrow: 'both' }), L('you', 'server', { label: 'GET /menu' })],
        flows: [F(['you', 'server'], { ret: true })],
        notes: [url],
      },
      metrics: { server: '37 ms', total: '111 ms' },
      hi: ['server'],
    },
    {
      short: 'Query data',
      title: 'The server asks the database',
      tag: 'Technique',
      body: [
        'Today’s menu doesn’t live in the web server — it lives in a **database**. The server sends a query and waits for rows to come back.',
        'Watch a request go all the way in, and the response come all the way out.',
      ],
      callout: { kind: 'tip', title: 'Good to know', text: 'Keeping data out of the web server (making it stateless) is exactly what lets you run many web servers later.' },
      changes: [{ sign: '+', text: 'Database' }, { sign: '+', text: 'Query: 18 ms' }],
      scene: {
        nodes: rq('you', 'dns', ['server', { meter: 30 }], 'db'),
        links: [
          L('you', 'dns', { dashed: true, arrow: 'both' }),
          L('you', 'server', { label: 'GET /menu' }),
          L('server', 'db', { label: 'SELECT … FROM menu', arrow: 'both' }),
        ],
        flows: [F(['you', 'server', 'db'], { ret: true })],
        notes: [url],
      },
      metrics: { server: '55 ms', total: '129 ms' },
      hi: ['server'],
    },
    {
      short: 'Response',
      title: 'Bytes flow back',
      tag: 'Technique',
      body: [
        'The HTML is ~120 KB. A new connection starts slowly (TCP slow start) and ramps up, so even on fast broadband the body takes a few round trips to arrive.',
        'Our first full response lands after about **160 ms**.',
      ],
      changes: [{ sign: '+', text: 'Download: 30 ms' }],
      scene: {
        nodes: rq('you', 'dns', ['server', { meter: 30 }], 'db'),
        links: [
          L('you', 'dns', { dashed: true, arrow: 'both' }),
          L('server', 'you', { label: '200 OK · 120 KB' }),
          L('server', 'db', { arrow: 'both' }),
        ],
        flows: [F(['server', 'you'], { kind: 'response', n: 4 })],
        notes: [url],
      },
      metrics: { download: '30 ms', total: '159 ms' },
      hi: ['download', 'total'],
    },
    {
      short: 'More files',
      title: 'A page is really forty requests',
      tag: 'Case',
      body: [
        'The HTML references stylesheets, scripts, fonts and photos of pastries — **38 more files**. Each one is another request.',
        'Browsers fetch several in parallel over the same connection, but big images and render-blocking scripts still stretch the load to ~420 ms.',
      ],
      callout: { kind: 'warn', title: 'Watch out', text: 'One slow script in the <head> blocks everything below it. Defer what isn’t needed for the first paint.' },
      changes: [{ sign: '+', text: '38 assets' }, { sign: '~', text: 'Download: 30 → 290 ms' }],
      scene: {
        nodes: rq('you', 'dns', ['server', { meter: 55 }], 'db'),
        links: [L('you', 'dns', { dashed: true, arrow: 'both' }), L('you', 'server', { arrow: 'both', label: '+ 38 files' }), L('server', 'db', { arrow: 'both' })],
        flows: [F(['you', 'server'], { ret: true, n: 5, speed: 1.2 })],
        notes: [url],
      },
      metrics: { download: '290 ms', total: '419 ms' },
      bad: ['download'],
    },
    {
      short: 'Far away',
      title: 'A customer in Sydney',
      tag: 'Case',
      body: [
        'The server sits in Virginia. From Sydney the round trip is ~**200 ms** instead of 25 ms — light in fibre is fast, but 16,000 km is far.',
        'Every round trip in the chain gets 8× more expensive: the handshake alone now costs 400 ms. The page takes well over a second.',
      ],
      callout: { kind: 'key', title: 'Key idea', text: 'More bandwidth won’t fix this. Only fewer round trips — or moving content closer — will.' },
      scene: {
        nodes: rq(['you', { tag: 'you · Sydney', tagIcon: MapPin }], 'dns', ['server', { sub: 'Virginia' }], 'db'),
        links: [L('you', 'dns', { dashed: true, arrow: 'both' }), L('you', 'server', { label: '≈ 16,000 km', tone: 'bad', arrow: 'both' }), L('server', 'db', { arrow: 'both' })],
        flows: [F(['you', 'server'], { ret: true, n: 2, speed: 0.45 })],
        notes: [url],
      },
      metrics: { connect: '400 ms', server: '230 ms', download: '780 ms', total: '1.4 s' },
      bad: ['connect', 'download', 'total'],
    },
    {
      short: 'Recap',
      title: 'Where the time goes',
      tag: 'Recap',
      body: [
        'A page load = **DNS** + **connection setup** + **server work** (including the database) + **download** of the page and all its assets.',
        'The cheap wins: cache DNS, reuse connections, ship fewer and smaller files, and serve static content close to users with a CDN.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Measure first. Most slow pages are slow because of round trips and assets, not because the server is slow.' },
      scene: {
        nodes: rq('you', 'dns', ['server', { meter: 30 }], 'db'),
        links: [L('you', 'dns', { dashed: true, arrow: 'both' }), L('you', 'server', { arrow: 'both' }), L('server', 'db', { arrow: 'both' })],
        flows: [F(['you', 'dns'], { ret: true, kind: 'handshake', retKind: 'handshake' }), F(['you', 'server', 'db'], { ret: true, delay: 0.6 })],
        notes: [url],
      },
      metrics: { dns: '24 ms', connect: '50 ms', server: '55 ms', download: '290 ms', total: '419 ms' },
    },
  ],
};

const lt = cast({
  users: { kind: 'crowd', at: [-5, -1.5], tag: 'lunch crowd', tagIcon: Users },
  queue: { kind: 'queue', at: [-1.5, 2], tag: 'waiting line', items: 0 },
  server: { kind: 'cube', at: [2, -1.5], label: 'Server', sub: '1 worker', icon: Server, tone: 'blue' },
  w2: { kind: 'cube', at: [3.5, 2], label: 'W2', icon: Server, tone: 'green', size: 'sm' },
  w3: { kind: 'cube', at: [2, 5.5], label: 'W3', icon: Server, tone: 'green', size: 'sm' },
});

const ltLinks = [L('users', 'queue'), L('queue', 'server')];
const ltLinksMany = [...ltLinks, L('queue', 'w2'), L('queue', 'w3')];

export const latencyThroughput: Lesson = {
  id: 'latency-throughput',
  title: 'Latency & Throughput',
  blurb: 'Two different questions about speed — and why a busy server gets slow long before it is full.',
  minutes: 8,
  level: 'Beginner',
  keywords: ['latency', 'throughput', 'utilization', 'queueing', 'p99', 'percentile'],
  metrics: [
    { id: 'p50', label: 'Latency p50', icon: Clock },
    { id: 'p99', label: 'Latency p99', icon: Hourglass },
    { id: 'rps', label: 'Throughput', icon: Zap },
    { id: 'util', label: 'Utilization', icon: Gauge },
  ],
  learn: [
    { text: 'Latency: how long one request takes', at: 1 },
    { text: 'Throughput: how many requests per second', at: 2 },
    { text: 'Why queues form well before 100% busy', at: 3 },
    { text: 'How parallelism raises throughput', at: 4 },
    { text: 'The ~70% utilization rule of thumb', at: 5 },
  ],
  steps: [
    {
      short: 'Lunch rush',
      title: 'Fast at 10am, slow at noon',
      tag: 'Problem',
      body: [
        'A food-ordering API answers in 20 ms when it’s quiet. At lunchtime users report multi-second waits — yet the server never hits 100% CPU.',
        'To understand why, we need two different words for “speed”.',
      ],
      scene: {
        nodes: lt('users', ['server', { meter: 20 }]),
        links: [L('users', 'server')],
        flows: [F(['users', 'server'], { ret: true })],
      },
      metrics: { p50: '20 ms', p99: '24 ms', rps: '10 /s', util: '20%' },
    },
    {
      short: 'Latency',
      title: 'Latency: how long does one take?',
      tag: 'Technique',
      body: [
        '**Latency** is the time from sending a request to receiving the answer. Watch one request: it goes in, the worker spends 20 ms on it, it comes back.',
        'Report it as percentiles, not averages. **p99** = 99% of requests were faster than this. The unlucky 1% is often your most active users.',
      ],
      callout: { kind: 'tip', title: 'Good to know', text: 'A page that makes 50 backend calls hits the p99 of at least one of them on ~40% of loads.' },
      scene: {
        nodes: lt('users', ['server', { meter: 20 }]),
        links: [L('users', 'server', { label: '20 ms each' })],
        flows: [F(['users', 'server'], { ret: true })],
      },
      hi: ['p50', 'p99'],
    },
    {
      short: 'Throughput',
      title: 'Throughput: how many per second?',
      tag: 'Technique',
      body: [
        '**Throughput** is how much work gets done per unit of time. One worker taking 20 ms per request can finish at most **50 requests per second**.',
        'At 25 req/s it is busy half the time — 50% utilization — and requests rarely have to wait.',
      ],
      scene: {
        nodes: lt('users', 'queue', ['server', { meter: 50 }]),
        links: ltLinks,
        flows: [F(['users', 'queue', 'server'], { n: 4 })],
      },
      metrics: { rps: '25 /s', util: '50%', p99: '45 ms' },
      hi: ['rps', 'util'],
    },
    {
      short: 'Queueing',
      title: 'At 90% busy, the line explodes',
      tag: 'Problem',
      body: [
        'Requests don’t arrive evenly — they come in bursts. When a burst lands on a busy worker, the extras wait in line.',
        'At 45 req/s (90% busy) the average wait is **9× the work itself**. The p99 balloons to half a second, even though the server is “only” 90% used.',
      ],
      callout: { kind: 'key', title: 'Key idea', text: 'Latency = waiting + working. Near full utilization, waiting dominates — and it grows non-linearly.' },
      changes: [{ sign: '~', text: 'Traffic: 25 → 45 req/s' }],
      scene: {
        nodes: lt('users', ['queue', { items: 9 }], ['server', { meter: 90, status: 'hot' }]),
        links: ltLinks,
        flows: [F(['users', 'queue', 'server'], { n: 8, speed: 0.8 })],
      },
      metrics: { p50: '180 ms', p99: '520 ms', rps: '45 /s', util: '90%' },
      bad: ['p50', 'p99', 'util'],
    },
    {
      short: 'Parallel',
      title: 'Add workers, multiply throughput',
      tag: 'Technique',
      body: [
        'Run three workers pulling from the same line. Capacity jumps to **150 req/s**; at 45 req/s each worker is only ~30% busy.',
        'The queue drains, and latency drops back to roughly the 20 ms of actual work.',
      ],
      changes: [{ sign: '+', text: '2 more workers' }, { sign: '~', text: 'Capacity: 50 → 150 req/s' }],
      scene: {
        nodes: lt('users', ['queue', { items: 1 }], ['server', { meter: 30, sub: 'W1' }], ['w2', { meter: 30 }], ['w3', { meter: 30 }]),
        links: ltLinksMany,
        flows: [
          F(['users', 'queue', 'server'], { n: 2 }),
          F(['users', 'queue', 'w2'], { n: 2, delay: 0.5 }),
          F(['users', 'queue', 'w3'], { n: 2, delay: 0.9 }),
        ],
      },
      metrics: { p50: '22 ms', p99: '36 ms', rps: '45 /s', util: '30%' },
      hi: ['p50', 'p99', 'util'],
    },
    {
      short: 'Headroom',
      title: 'Leave headroom on purpose',
      tag: 'Insight',
      body: [
        'For a simple queue, expected wait ≈ work × u / (1 − u). At 50% busy you wait 1× the work; at 80%, 4×; at 95%, **19×**.',
        'That’s why teams plan capacity to keep busy resources around 60–70%: it absorbs bursts without wrecking tail latency.',
      ],
      scene: {
        nodes: lt('users', ['queue', { items: 2 }], ['server', { meter: 65, sub: 'W1' }], ['w2', { meter: 62 }], ['w3', { meter: 68 }]),
        links: ltLinksMany,
        flows: [
          F(['users', 'queue', 'server'], { n: 3 }),
          F(['users', 'queue', 'w2'], { n: 3, delay: 0.4 }),
          F(['users', 'queue', 'w3'], { n: 3, delay: 0.8 }),
        ],
        notes: [
          { at: [-5, 3.2], text: '50% busy → wait 1×', tone: 'good' },
          { at: [-5, 4.0], text: '80% busy → wait 4×', tone: 'warn' },
          { at: [-5, 4.8], text: '95% busy → wait 19×', tone: 'bad' },
        ],
      },
      metrics: { p50: '28 ms', p99: '70 ms', rps: '100 /s', util: '67%' },
      hi: ['util'],
    },
    {
      short: 'Recap',
      title: 'Two questions, one curve',
      tag: 'Recap',
      body: [
        '**Latency** asks “how long for one?” **Throughput** asks “how many per second?” You can improve one while hurting the other — batching is the classic example.',
        'Queues make latency explode as utilization nears 100%. Add parallelism and keep headroom.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Watch p99 and utilization together. When utilization creeps past ~70%, scale before the tail blows up.' },
      scene: {
        nodes: lt('users', ['queue', { items: 1 }], ['server', { meter: 40, sub: 'W1' }], ['w2', { meter: 40 }], ['w3', { meter: 40 }]),
        links: ltLinksMany,
        flows: [
          F(['users', 'queue', 'server'], { n: 2, ret: true }),
          F(['users', 'queue', 'w2'], { n: 2, delay: 0.5, ret: true }),
          F(['users', 'queue', 'w3'], { n: 2, delay: 0.9, ret: true }),
        ],
      },
      metrics: { p50: '21 ms', p99: '38 ms', rps: '60 /s', util: '40%' },
    },
  ],
};
