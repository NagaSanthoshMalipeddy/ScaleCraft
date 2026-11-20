import { Activity, Archive, Cookie, Database, Gauge, HardDrive, HeartPulse, KeyRound, Laptop, LogOut, Scale, Server, Split, Timer, Users, Wallet, Zap } from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* Vertical vs horizontal scaling                                       */
/* ------------------------------------------------------------------ */

const vh = cast({
  users: { kind: 'crowd', at: [-5.5, 0], tag: 'customers', tagIcon: Users, items: 6 },
  lb: { kind: 'cube', at: [-1.5, 0], label: 'LB', sub: 'balancer', icon: Split, tone: 'green' },
  a1: { kind: 'cube', at: [2.5, -4], label: 'App 1', sub: '8 vCPU', icon: Server, tone: 'blue' },
  a2: { kind: 'cube', at: [2.5, 0], label: 'App', sub: '8 vCPU', icon: Server, tone: 'blue' },
  a3: { kind: 'cube', at: [2.5, 4], label: 'App 3', sub: '8 vCPU', icon: Server, tone: 'blue' },
  db: { kind: 'db', at: [6.5, 0], tag: 'database', icon: Database },
});

const outLinks = [L('users', 'lb'), L('lb', 'a1'), L('lb', 'a2'), L('lb', 'a3'), L('a1', 'db'), L('a2', 'db'), L('a3', 'db')];
const outApps: Parameters<typeof vh> = [['a1', { meter: 32 }], ['a2', { label: 'App 2', meter: 32 }], ['a3', { meter: 32 }]];
const outFlows = [
  F(['users', 'lb', 'a1', 'db'], { ret: true, delay: 0.2 }),
  F(['users', 'lb', 'a2', 'db'], { ret: true, delay: 0.9 }),
  F(['users', 'lb', 'a3', 'db'], { ret: true, delay: 1.6 }),
];

export const verticalHorizontal: Lesson = {
  id: 'vertical-horizontal',
  title: 'Vertical vs Horizontal',
  blurb: 'Buy a bigger machine or add more machines? The two ways to grow, and what each really costs.',
  minutes: 9,
  level: 'Beginner',
  keywords: ['scale up', 'scale out', 'vertical scaling', 'horizontal scaling', 'capacity', 'single point of failure', 'instance size', 'cost', 'database scaling'],
  metrics: [
    { id: 'cpu', label: 'Busiest CPU', icon: Gauge },
    { id: 'cap', label: 'Capacity', icon: Activity },
    { id: 'cost', label: 'App tier / mo', icon: Wallet },
    { id: 'fail', label: 'If a box dies', icon: HeartPulse },
  ],
  learn: [
    { text: 'What scaling up buys, and what it costs', at: 1 },
    { text: 'Why a bigger box is still one box', at: 3 },
    { text: 'Scaling out behind a load balancer', at: 4 },
    { text: 'Why databases resist scaling out', at: 5 },
    { text: 'Choosing between up and out', at: 6 },
  ],
  steps: [
    {
      short: 'Melting',
      title: 'An invoicing app hits the wall',
      tag: 'Problem',
      body: [
        '**Billfold** runs its web app on a single 8-vCPU server. At month-end every customer sends invoices at once and traffic reaches **2,000 req/s**. CPU sits at 95% and p99 latency jumps from 120 ms to 3 s.',
        'Traffic grows about 10% a month, so next month-end will be worse. There are two directions to grow in.',
      ],
      scene: {
        nodes: vh('users', ['a2', { meter: 95, status: 'hot' }], 'db'),
        links: [L('users', 'a2'), L('a2', 'db', { arrow: 'both' })],
        flows: [F(['users', 'a2', 'db'], { ret: true, n: 4, speed: 0.6 })],
      },
      metrics: { cpu: '95%', cap: '2,100 /s', cost: '$280', fail: 'full outage' },
      bad: ['cpu'],
    },
    {
      short: 'Scale up',
      title: 'Scale up: buy a bigger box',
      tag: 'Technique',
      body: [
        '**Vertical scaling** means moving to a larger machine: 8 → 32 vCPUs, 32 → 128 GB of RAM. In the cloud it is a resize and a restart; on your own hardware, a new server.',
        'Not a line of code changes — no new moving parts, no network hops. Capacity rises to ~7,500 req/s: not quite 4×, because locks and memory bandwidth get busier too.',
      ],
      callout: { kind: 'tip', text: 'Scaling up is often the right first move. It costs almost no engineering time, and modern machines are enormous.' },
      changes: [{ sign: '~', text: 'App: 8 → 32 vCPU' }],
      scene: {
        nodes: vh('users', ['a2', { size: 'lg', sub: '32 vCPU', meter: 27 }], 'db'),
        links: [L('users', 'a2'), L('a2', 'db', { arrow: 'both' })],
        flows: [F(['users', 'a2', 'db'], { ret: true, n: 4, speed: 1.1 })],
      },
      metrics: { cpu: '27%', cap: '7,500 /s', cost: '$1,120' },
      hi: ['cpu', 'cap'],
      bad: ['cost'],
    },
    {
      short: 'Ceiling',
      title: 'The ceiling and the price tag',
      tag: 'Trade-off',
      body: [
        'Every ladder has a top rung. The largest cloud VMs stop at a few hundred vCPUs, and the climb gets pricier per unit of work: top-end sizes carry premiums, and extra cores rarely add **linear** throughput.',
        'At 10% growth a month, 32 vCPUs lasts Billfold about a year. Then 96. Then there is nothing bigger to buy.',
      ],
      scene: {
        nodes: vh('users', ['a2', { size: 'lg', sub: '32 vCPU', meter: 27 }], 'db'),
        links: [L('users', 'a2'), L('a2', 'db', { arrow: 'both' })],
        flows: [F(['users', 'a2', 'db'], { ret: true, n: 3, speed: 1.1 })],
        notes: [
          { at: [-2, -4.5], text: '8 vCPU · $280/mo', icon: Wallet },
          { at: [-2, -3.3], text: '32 vCPU · $1,120/mo', icon: Wallet },
          { at: [-2, -2.1], text: '96 vCPU · $3,400/mo', icon: Wallet, tone: 'warn' },
          { at: [6.5, -3.5], text: 'ceiling: a few hundred vCPU', tone: 'bad' },
        ],
      },
    },
    {
      short: 'One box',
      title: 'Bigger, but still just one',
      tag: 'Case',
      body: [
        'Each resize means a restart: **about 5 minutes of downtime** at every step up. And a big box is still one box. When its host fails or a bad deploy crashes it, every customer is down.',
        'Vertical scaling buys capacity, not **availability**. For that you need more than one machine.',
      ],
      scene: {
        nodes: vh('users', ['a2', { size: 'lg', sub: '32 vCPU', status: 'down' }], 'db'),
        links: [L('users', 'a2', { tone: 'bad', dashed: true }), L('a2', 'db', { arrow: 'both', dashed: true })],
        flows: [F(['users', 'a2'], { kind: 'request', n: 3, stop: true })],
        notes: [
          { at: [-1.5, -3], text: 'resize = restart · ~5 min', tone: 'warn' },
          { at: [6.5, -3.5], text: 'host dies = full outage', tone: 'bad' },
        ],
      },
      metrics: { cpu: '—', cap: '0 /s' },
      bad: ['cap', 'fail'],
    },
    {
      short: 'Scale out',
      title: 'Scale out: more boxes, one front door',
      tag: 'Technique',
      body: [
        '**Horizontal scaling** runs several ordinary machines behind a **load balancer**. Three 8-vCPU servers give ~6,300 req/s for $860 a month — and if one dies, the other two carry on at about 50%.',
        'Need more? Add a fourth. There is no hardware ceiling, and capacity can follow traffic up and down through the day.',
      ],
      callout: { kind: 'warn', text: 'Only works if any server can handle any request: no sessions in memory, no files on local disk. That’s what “stateless” means.' },
      changes: [{ sign: '+', text: 'Load balancer' }, { sign: '+', text: '2 more servers' }, { sign: '~', text: 'Back to 8-vCPU boxes' }],
      scene: {
        nodes: vh('users', 'lb', ...outApps, 'db'),
        links: outLinks,
        flows: outFlows,
      },
      metrics: { cpu: '32%', cap: '6,300 /s', cost: '$860', fail: 'lose 1/3' },
      hi: ['cap', 'cost', 'fail'],
    },
    {
      short: 'Database',
      title: 'The database won’t clone so easily',
      tag: 'Insight',
      body: [
        'App servers scaled out easily because they hold no data. The **database** is different: every server reads and writes the same records, and all copies must agree. A second database is not a balancer tweak.',
        'So teams usually **scale the database up** first, add caches and read replicas next, and split the data only when writes outgrow the biggest box.',
      ],
      callout: { kind: 'tip', text: 'A common, healthy shape: many small stateless app servers in front of one large, well-tuned database.' },
      scene: {
        nodes: vh('users', 'lb', ...outApps, ['db', { meter: 88, status: 'hot' }]),
        links: outLinks,
        flows: [...outFlows, F(['a2', 'db'], { kind: 'data', n: 3, delay: 0.4 })],
        notes: [{ at: [6.5, -3.5], text: 'every write hits one DB', tone: 'bad' }],
      },
      metrics: { cpu: '88% (DB)' },
      bad: ['cpu'],
    },
    {
      short: 'Choosing',
      title: 'Which one, when?',
      tag: 'Trade-off',
      body: [
        'Per unit of capacity the bills are close: one 32-vCPU box ≈ $1,120 a month, four 8-vCPU boxes plus a balancer ≈ $1,140. The real differences lie elsewhere.',
        '**Scale up** for stateful parts like databases, small teams, or when you are far from the ceiling. **Scale out** for stateless tiers, high availability and spiky traffic — idle boxes can be switched off at night.',
      ],
      changes: [{ sign: '~', text: 'Database scaled up to 64 vCPU' }],
      scene: {
        nodes: vh('users', 'lb', ...outApps, ['db', { size: 'lg', tag: 'db · 64 vCPU', meter: 45 }]),
        links: outLinks,
        flows: outFlows,
        notes: [
          { at: [-4.5, -4], text: 'up: 1 × 32 vCPU ≈ $1,120', icon: Wallet },
          { at: [-4.5, -2.8], text: 'out: 4 × 8 vCPU ≈ $1,140', icon: Wallet },
        ],
      },
      metrics: { cpu: '45%' },
      hi: ['cpu'],
    },
    {
      short: 'Recap',
      title: 'Up vs out, summed up',
      tag: 'Recap',
      body: [
        '**Scale up** is the easy first step: no code changes, but a hard ceiling, rising prices at the top, restart downtime, and still a single point of failure.',
        '**Scale out** adds boxes behind a balancer: no ceiling and built-in redundancy, as long as servers are stateless. Databases resist scaling out, so they usually grow up first.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Scale stateless tiers out and stateful tiers up — until the stateful tier forces you to split it.' },
      scene: {
        nodes: vh('users', 'lb', ...outApps, ['db', { size: 'lg', tag: 'db · 64 vCPU', meter: 45 }]),
        links: outLinks,
        flows: outFlows,
      },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Stateless services                                                   */
/* ------------------------------------------------------------------ */

const st = cast({
  user: { kind: 'device', at: [-5.5, 0], tag: 'Maya', tagIcon: Laptop },
  lb: { kind: 'cube', at: [-1.5, 0], label: 'LB', sub: 'balancer', icon: Split, tone: 'green' },
  a1: { kind: 'cube', at: [2.5, -4], label: 'App 1', icon: Server, tone: 'blue' },
  a2: { kind: 'cube', at: [2.5, 0], label: 'App 2', icon: Server, tone: 'blue' },
  a3: { kind: 'cube', at: [2.5, 4], label: 'App 3', icon: Server, tone: 'blue' },
  sess: { kind: 'cube', at: [6.5, 0], label: 'Sessions', sub: 'in-memory', icon: Zap, tone: 'orange' },
  key: { kind: 'slab', at: [6.5, 0], tag: 'signing key', icon: KeyRound, tone: 'yellow' },
  obj: { kind: 'slab', at: [-1.5, 4], tag: 'object store', icon: Archive, tone: 'sand' },
});

const stBase = [L('user', 'lb'), L('lb', 'a1'), L('lb', 'a2'), L('lb', 'a3')];
const sessLinks = [L('a1', 'sess', { arrow: 'both' }), L('a2', 'sess', { arrow: 'both' }), L('a3', 'sess', { arrow: 'both' })];
const objLinks = [L('a3', 'obj', { label: 'PUT' }), L('user', 'obj', { label: 'GET image' })];

export const statelessServices: Lesson = {
  id: 'stateless',
  title: 'Stateless Services',
  blurb: 'Keep sessions and files off your app servers, so any box can serve any request — and vanish safely.',
  minutes: 9,
  level: 'Beginner',
  keywords: ['stateless', 'session', 'sticky sessions', 'session affinity', 'signed cookie', 'jwt', 'session store', 'object storage', 'autoscaling', 'rolling deploy'],
  metrics: [
    { id: 'logout', label: 'Surprise logouts', icon: LogOut },
    { id: 'local', label: 'State on servers', icon: HardDrive },
    { id: 'spread', label: 'Load spread', icon: Scale },
    { id: 'scale', label: 'Add a server', icon: Timer },
  ],
  learn: [
    { text: 'Why in-memory sessions break behind a balancer', at: 0 },
    { text: 'Sticky sessions and their hidden costs', at: 1 },
    { text: 'Shared session stores vs signed tokens', at: 3 },
    { text: 'Moving uploads to object storage', at: 5 },
    { text: 'How statelessness makes scaling and deploys routine', at: 6 },
  ],
  steps: [
    {
      short: 'Logged out',
      title: 'Logged out halfway through checkout',
      tag: 'Problem',
      body: [
        'A shop runs three app servers behind a load balancer. When Maya logs in, **App 1** keeps her session — user ID, cart — in its own memory and gives her a cookie with the session ID.',
        'Her next click lands on **App 2**, which has never seen that ID, so Maya is bounced to the login page. With round robin, 2 of every 3 requests do this.',
      ],
      scene: {
        nodes: st('user', 'lb', 'a1', 'a2', 'a3'),
        links: stBase,
        flows: [F(['user', 'lb', 'a1'], { ret: true }), F(['user', 'lb', 'a2'], { ret: true, retKind: 'error', delay: 1.2 })],
        notes: [
          { at: [6.5, -4], text: 'session lives in App 1 RAM', tone: 'warn' },
          { at: [6.5, 0], text: 'App 2: unknown session', tone: 'bad' },
        ],
      },
      metrics: { logout: '2 in 3 clicks', local: 'sessions, files', spread: 'even', scale: '—' },
      bad: ['logout'],
    },
    {
      short: 'Sticky',
      title: 'Sticky sessions: a quick patch',
      tag: 'Trade-off',
      body: [
        'The balancer can pin each user to one server with **session affinity**, usually via its own cookie naming the server. Maya always reaches App 1 and the logouts stop.',
        'But load turns **uneven**: heavy or long-lived users stay stuck on one box, and new servers only get new users. And when App 1 crashes or is redeployed, every session on it is **gone**.',
      ],
      callout: { kind: 'warn', text: 'Sticky sessions hide state instead of removing it. Use them as a stopgap, not a design.' },
      changes: [{ sign: '+', text: 'Affinity cookie on the balancer' }],
      scene: {
        nodes: st('user', 'lb', ['a1', { meter: 88, status: 'hot' }], ['a2', { meter: 35 }], ['a3', { meter: 30 }]),
        links: [L('user', 'lb'), L('lb', 'a1', { label: 'pinned: App 1' }), L('lb', 'a2'), L('lb', 'a3')],
        flows: [F(['user', 'lb', 'a1'], { ret: true, n: 3 }), F(['lb', 'a3'], { ret: true, delay: 1.4 })],
        notes: [{ at: [6.5, -4], text: 'redeploy = logged out', tone: 'warn' }],
      },
      metrics: { logout: 'on crash/deploy', spread: 'uneven' },
      hi: ['logout'],
      bad: ['spread'],
    },
    {
      short: 'Shared store',
      title: 'Move sessions to a shared store',
      tag: 'Technique',
      body: [
        'Take the session out of the server. Keep it in a fast **shared session store** — an in-memory key-value database — keyed by the ID in the cookie. Any server can fetch it in under a millisecond.',
        'Now App 2 knows Maya too. The balancer can spread load freely again, and a crashed server loses nothing.',
      ],
      callout: { kind: 'tip', text: 'The session store is now critical: replicate it, and give sessions a TTL so abandoned ones expire on their own.' },
      changes: [{ sign: '+', text: 'Shared session store' }, { sign: '-', text: 'Sticky routing' }],
      scene: {
        nodes: st('user', 'lb', 'a1', 'a2', 'a3', 'sess'),
        links: [...stBase, ...sessLinks],
        flows: [F(['user', 'lb', 'a2', 'sess'], { ret: true }), F(['user', 'lb', 'a3', 'sess'], { ret: true, delay: 1.2 }), F(['user', 'lb', 'a1', 'sess'], { ret: true, delay: 2.4 })],
      },
      metrics: { logout: '0', local: 'files', spread: 'even' },
      hi: ['logout', 'local', 'spread'],
    },
    {
      short: 'Tokens',
      title: 'Or carry the session in the cookie',
      tag: 'Trade-off',
      body: [
        'Another option: put the session data itself in the cookie, **signed** with a secret key every server shares. Each server checks the signature — no lookup, no store to run. JSON Web Tokens work this way.',
        'The catch: a token can’t easily be **revoked** before it expires, cookies are capped at ~4 KB, and signed is not encrypted. Keep tokens small and short-lived, and refresh them.',
      ],
      changes: [{ sign: '~', text: 'Session data moves into a signed cookie' }, { sign: '-', text: 'Session store' }],
      scene: {
        nodes: st(['user', { tag: 'cookie: signed', tagIcon: Cookie }], 'lb', 'a1', 'a2', 'a3', 'key'),
        links: [...stBase, L('key', 'a1', { dashed: true, arrow: 'none' }), L('key', 'a2', { dashed: true, arrow: 'none', label: 'shared key' }), L('key', 'a3', { dashed: true, arrow: 'none' })],
        flows: [F(['user', 'lb', 'a2'], { ret: true }), F(['user', 'lb', 'a3'], { ret: true, delay: 1.1 }), F(['user', 'lb', 'a1'], { ret: true, delay: 2.2 })],
        notes: [{ at: [-5, -3.8], text: 'no lookup per request', tone: 'good' }],
      },
    },
    {
      short: 'Uploads',
      title: 'The avatar that vanished',
      tag: 'Case',
      body: [
        'Sessions are fixed, then Maya uploads a profile photo. App 1 saves it to its **local disk** at `/uploads/maya.jpg`. The next page load goes to App 3, which has no such file: broken image.',
        'Local disk is state too — and so are in-memory caches you rely on, or cron jobs that run on “the” server. Each one quietly ties requests to one machine.',
      ],
      scene: {
        nodes: st('user', 'lb', ['a1', { tag: 'maya.jpg', tagIcon: HardDrive }], 'a2', 'a3', 'sess'),
        links: [...stBase, ...sessLinks],
        flows: [F(['user', 'lb', 'a1'], { kind: 'data' }), F(['user', 'lb', 'a3'], { stop: true, delay: 1.3 })],
        notes: [{ at: [6.5, 4], text: '404 /uploads/maya.jpg', tone: 'bad' }],
      },
      metrics: { local: 'files' },
      bad: ['local'],
    },
    {
      short: 'Object store',
      title: 'Files go to object storage',
      tag: 'Technique',
      body: [
        'Write uploads to **object storage** — a shared, replicated blob service — instead of local disk. The database keeps only the object’s key, like `avatars/maya.jpg`.',
        'Browsers fetch images straight from storage (often through a CDN), so app servers never touch those bytes, and every server sees the same files.',
      ],
      changes: [{ sign: '+', text: 'Object storage' }, { sign: '-', text: 'Local uploads folder' }],
      scene: {
        nodes: st('user', 'lb', 'a1', 'a2', 'a3', 'sess', 'obj'),
        links: [...stBase, ...sessLinks, ...objLinks],
        flows: [F(['user', 'lb', 'a3', 'obj'], { kind: 'data' }), F(['user', 'obj'], { ret: true, retKind: 'data', delay: 1.4 })],
      },
      metrics: { local: 'none' },
      hi: ['local'],
    },
    {
      short: 'Payoff',
      title: 'Servers become disposable',
      tag: 'Insight',
      body: [
        'With nothing important on the box, every server is interchangeable. **Autoscaling** adds a copy in a couple of minutes when CPU climbs and removes it at night — nobody notices either way.',
        'Deploys become **rolling**: drain one server, replace it with the new version, repeat. A crashed server is simply replaced, not nursed back to health.',
      ],
      callout: { kind: 'key', text: 'Stateless servers turn scaling, deploys and crash recovery from events into routine.' },
      changes: [{ sign: '~', text: 'App 1 draining for a rolling deploy' }],
      scene: {
        nodes: st('user', 'lb', ['a1', { status: 'dim', sub: 'draining' }], ['a2', { sub: 'v2' }], ['a3', { sub: 'v2' }], 'sess', 'obj'),
        links: [L('user', 'lb'), L('lb', 'a1', { dashed: true, tone: 'muted' }), L('lb', 'a2'), L('lb', 'a3'), ...sessLinks, ...objLinks],
        flows: [F(['user', 'lb', 'a2', 'sess'], { ret: true, n: 2 }), F(['user', 'lb', 'a3'], { ret: true, n: 2, delay: 0.7 })],
        notes: [
          { at: [6.5, -4], text: '+1 server in ~2 min', tone: 'good' },
          { at: [6.5, 4], text: 'deploy: one box at a time', tone: 'good' },
        ],
      },
      metrics: { scale: '~2 min' },
      hi: ['scale'],
    },
    {
      short: 'Recap',
      title: 'Stateless services, summed up',
      tag: 'Recap',
      body: [
        'Make every request independent of which server handles it. Sticky sessions only hide the problem: keep sessions in a **shared store** or a **signed cookie**, and files in **object storage**.',
        'Once servers hold nothing that matters, autoscaling, rolling deploys and crash recovery all become routine.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'If you could delete any app server right now and nobody would notice, your service is stateless.' },
      scene: {
        nodes: st('user', 'lb', 'a1', 'a2', 'a3', 'sess', 'obj'),
        links: [...stBase, ...sessLinks, ...objLinks],
        flows: [
          F(['user', 'lb', 'a1', 'sess'], { ret: true, delay: 0.2 }),
          F(['user', 'lb', 'a2', 'sess'], { ret: true, delay: 0.9 }),
          F(['user', 'lb', 'a3', 'obj'], { kind: 'data', delay: 1.6 }),
          F(['user', 'obj'], { ret: true, retKind: 'data', delay: 2.2 }),
        ],
      },
    },
  ],
};
