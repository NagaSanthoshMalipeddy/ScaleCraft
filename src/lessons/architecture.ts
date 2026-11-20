import {
  Activity,
  BookOpen,
  BookUser,
  Bomb,
  Boxes,
  ChartLine,
  Clock,
  Code,
  Cpu,
  CreditCard,
  Database,
  DoorOpen,
  FileSpreadsheet,
  Files,
  Globe,
  HardDrive,
  Hourglass,
  Laptop,
  Lock,
  MailX,
  Moon,
  Package,
  Rocket,
  Route,
  Send,
  Shield,
  ShoppingCart,
  Sigma,
  Smartphone,
  Split,
  Star,
  Timer,
  TriangleAlert,
  Truck,
  Users,
  Waves,
  Wrench,
} from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* Monolith vs microservices                                            */
/* ------------------------------------------------------------------ */

const ms = cast({
  users: { kind: 'crowd', at: [-6.5, 0], tag: 'shoppers', tagIcon: Users, items: 5 },
  devs: { kind: 'crowd', at: [-3, -4], tag: '60 engineers', tagIcon: Code, items: 6 },
  mono: { kind: 'cube', at: [1, 0], label: 'Monolith', icon: Boxes, tone: 'blue', size: 'lg' },
  monodb: { kind: 'db', at: [4.5, 0], tag: 'one DB', icon: Database },
  gw: { kind: 'cube', at: [-3, 0], label: 'Gateway', icon: Route, tone: 'green' },
  catalog: { kind: 'cube', at: [1, -4], label: 'Catalog', sub: 'team A', icon: BookOpen, tone: 'blue' },
  orders: { kind: 'cube', at: [1, 0], label: 'Orders', sub: 'team B', icon: ShoppingCart, tone: 'blue' },
  reviews: { kind: 'cube', at: [1, 4], label: 'Reviews', sub: 'team C', icon: Star, tone: 'blue' },
  cdb: { kind: 'db', at: [4.5, -4], tag: 'catalog db', icon: Database },
  odb: { kind: 'db', at: [4.5, 0], tag: 'orders db', icon: Database },
  rdb: { kind: 'db', at: [4.5, 4], tag: 'reviews db', icon: Database },
});

const msSplit = [L('users', 'gw'), L('gw', 'catalog'), L('gw', 'orders'), L('gw', 'reviews')];
const msData = [L('catalog', 'cdb'), L('orders', 'odb'), L('reviews', 'rdb')];

export const microservices: Lesson = {
  id: 'microservices',
  title: 'Monolith vs Microservices',
  blurb: 'When one codebase stops scaling with the team — and what splitting it into services really costs.',
  minutes: 11,
  level: 'Intermediate',
  keywords: ['microservices', 'monolith', 'bounded context', 'database per service', 'strangler fig', 'modular monolith', 'distributed monolith', 'domain-driven design'],
  metrics: [
    { id: 'deploys', label: 'Deploys', icon: Rocket },
    { id: 'blast', label: 'Bug blast radius', icon: Bomb },
    { id: 'latency', label: 'Page latency', icon: Clock },
    { id: 'parts', label: 'Moving parts', icon: Boxes },
  ],
  learn: [
    { text: 'When one deployable starts to hurt', at: 0 },
    { text: 'Splitting by business capability', at: 2 },
    { text: 'Why each service owns its data', at: 3 },
    { text: 'What the network costs you', at: 4 },
    { text: 'Migrating with the strangler fig', at: 5 },
  ],
  steps: [
    {
      short: 'Growing',
      title: 'Sixty engineers, one deployable',
      tag: 'Problem',
      body: [
        'Three years ago, 8 engineers built the shop as one **monolith**: one codebase, one database, five deploys a day. Now 60 engineers in 7 teams share it. Builds take 40 minutes and changes ship in one risky **weekly release train**.',
        'Last Tuesday a memory leak in the reviews code crashed the whole process — and took checkout down with it for 25 minutes.',
      ],
      scene: {
        nodes: ms('users', 'devs', ['mono', { meter: 95, status: 'hot' }], 'monodb'),
        links: [L('users', 'mono'), L('devs', 'mono', { dashed: true, label: 'weekly train' }), L('mono', 'monodb')],
        flows: [F(['users', 'mono'], { ret: true, retKind: 'error', n: 3 }), F(['devs', 'mono'], { kind: 'event', n: 3, delay: 0.4 })],
        notes: [{ at: [4.5, -4], text: '1 bug = full outage', icon: Bomb, tone: 'bad' }],
      },
      metrics: { deploys: '1 / week', blast: '100%', latency: '120 ms', parts: '1 app' },
      bad: ['deploys', 'blast'],
    },
    {
      short: 'Why mono',
      title: 'The monolith got a lot right',
      tag: 'Insight',
      body: [
        'Calls between modules are plain **function calls** — well under a microsecond, and they never time out. One **ACID transaction** can update orders and stock together. One build, one deploy, one stack trace.',
        'For a small team that is the fastest way to ship. The pain at 60 engineers is mostly **organisational coupling**: everyone shares one release, one test suite and one failure domain.',
      ],
      callout: { kind: 'tip', text: 'Start with a monolith unless you know otherwise. Early boundaries are guesses, and guesses are cheap to move inside one codebase.' },
      scene: {
        nodes: ms('users', 'devs', ['mono', { meter: 40 }], 'monodb'),
        links: [L('users', 'mono'), L('devs', 'mono', { dashed: true }), L('mono', 'monodb')],
        flows: [F(['users', 'mono', 'monodb'], { ret: true, n: 2 })],
        notes: [{ at: [4.5, -4], text: 'in-process call < 1 µs', tone: 'good' }],
      },
    },
    {
      short: 'Split',
      title: 'Split by business capability',
      tag: 'Technique',
      body: [
        'Carve the system along **bounded contexts** — areas with their own language and rules, like Catalog, Orders and Reviews. Each becomes a **service** owned end-to-end by one team.',
        'A **gateway** routes outside requests to the right service. Teams build, test and deploy on their own schedule: the reviews team ships four times a day without waiting for anyone.',
      ],
      changes: [
        { sign: '-', text: 'Monolith' },
        { sign: '+', text: 'Catalog, Orders, Reviews services' },
        { sign: '+', text: 'Gateway in front' },
      ],
      scene: {
        nodes: ms('users', 'gw', 'catalog', 'orders', 'reviews'),
        links: msSplit,
        flows: [
          F(['users', 'gw', 'catalog'], { ret: true }),
          F(['users', 'gw', 'orders'], { ret: true, delay: 0.6 }),
          F(['users', 'gw', 'reviews'], { ret: true, delay: 1.2 }),
        ],
      },
      metrics: { deploys: '15 / day', parts: '4 services' },
      hi: ['deploys'],
    },
    {
      short: 'Own data',
      title: 'Each service owns its data',
      tag: 'Technique',
      body: [
        'Every service keeps **its own database**, and nobody else touches it. When Orders needs a product name, it asks Catalog’s API — or keeps a local copy fed by Catalog’s events.',
        'One shared database quietly re-couples everyone: a column rename in Catalog breaks Orders’ queries. That is a **distributed monolith** — all the costs of services, none of the independence.',
      ],
      callout: { kind: 'warn', text: 'If two services must always deploy together, they are really one service. Fix the boundary instead of coordinating releases.' },
      changes: [{ sign: '+', text: 'A database per service' }],
      scene: {
        nodes: ms('users', 'gw', 'catalog', 'orders', 'reviews', 'cdb', 'odb', 'rdb'),
        links: [...msSplit, ...msData],
        flows: [
          F(['users', 'gw', 'orders', 'odb'], { ret: true }),
          F(['catalog', 'cdb'], { kind: 'data', ret: true, retKind: 'data', delay: 0.5 }),
          F(['reviews', 'rdb'], { kind: 'data', ret: true, retKind: 'data', delay: 1 }),
        ],
      },
      metrics: { blast: '~25%' },
      hi: ['blast'],
    },
    {
      short: 'Costs',
      title: 'Function calls become network calls',
      tag: 'Trade-off',
      body: [
        'Showing an order now calls Catalog and Reviews. Each hop adds **1–5 ms** plus serialisation, and each can fail or hang on its own — **partial failure** that a function call never had.',
        'No transaction spans two databases, so consistency needs sagas and events. And 4 services means 4 pipelines, dashboards and on-call rotations, plus **distributed tracing** to follow one request.',
      ],
      scene: {
        nodes: ms('users', 'gw', 'catalog', ['orders', { meter: 45 }], ['reviews', { status: 'down', tone: 'rose' }], 'cdb', 'odb', 'rdb'),
        links: [L('users', 'gw'), L('gw', 'orders'), L('orders', 'catalog'), L('orders', 'reviews', { dashed: true, tone: 'bad' }), ...msData],
        flows: [
          F(['users', 'gw', 'orders', 'catalog'], { ret: true }),
          F(['orders', 'reviews'], { kind: 'request', stop: true, delay: 0.9 }),
        ],
        notes: [
          { at: [-3, -4], text: '+3 ms per hop', icon: Clock, tone: 'warn' },
          { at: [-3, 4], text: 'reviews down: hide stars', tone: 'bad' },
        ],
      },
      metrics: { latency: '165 ms', parts: '4 svc + 4 DBs' },
      bad: ['latency', 'parts'],
    },
    {
      short: 'Strangler',
      title: 'Strangle it, don’t rewrite it',
      tag: 'Technique',
      body: [
        'Big-bang rewrites stall for years. Instead, put a **routing layer** in front of the monolith and move one capability at a time — the **strangler-fig pattern**.',
        'Catalog moved last quarter; this sprint `/reviews/*` switches to the new service behind a flag you can flip back. The monolith shrinks until it can be retired, or is small enough to keep.',
      ],
      changes: [
        { sign: '+', text: 'Routes in the gateway' },
        { sign: '~', text: 'Monolith shrinks, piece by piece' },
      ],
      scene: {
        nodes: ms('users', 'gw', 'catalog', ['mono', { sub: 'shrinking', meter: 50 }], 'reviews', 'cdb', 'monodb', 'rdb'),
        links: [
          L('users', 'gw'),
          L('gw', 'catalog'),
          L('gw', 'mono', { label: '/orders/*' }),
          L('gw', 'reviews', { label: '/reviews/*', tone: 'good' }),
          L('catalog', 'cdb'),
          L('mono', 'monodb'),
          L('reviews', 'rdb'),
        ],
        flows: [
          F(['users', 'gw', 'mono'], { ret: true }),
          F(['users', 'gw', 'reviews'], { ret: true, delay: 0.7 }),
          F(['users', 'gw', 'catalog'], { ret: true, delay: 1.4 }),
        ],
      },
    },
    {
      short: 'Modular',
      title: 'The modular monolith',
      tag: 'Insight',
      body: [
        'Many teams never need the network. A **modular monolith** is one deployable whose modules have strict boundaries: public interfaces only, no reaching into another module’s tables, enforced by build checks.',
        'You keep in-process calls and simple deploys, and get most of the ownership benefits. Extract a module later, when it truly needs its own **scaling, release cadence or failure isolation**.',
      ],
      callout: { kind: 'key', text: 'Microservices solve an organisational scaling problem. If you don’t have that problem yet, the network is pure cost.' },
      scene: {
        nodes: ms('users', 'devs', ['mono', { label: 'Modular', sub: '4 modules', meter: 35 }], ['monodb', { tag: '4 schemas' }]),
        links: [L('users', 'mono'), L('devs', 'mono', { dashed: true, label: 'merge queue' }), L('mono', 'monodb')],
        flows: [F(['users', 'mono', 'monodb'], { ret: true, n: 2 }), F(['devs', 'mono'], { kind: 'event', n: 2, delay: 0.5 })],
      },
      metrics: { deploys: '6 / day', blast: '100%', latency: '120 ms', parts: '1 app' },
      hi: ['deploys', 'latency', 'parts'],
      bad: ['blast'],
    },
    {
      short: 'Recap',
      title: 'Monolith vs microservices, summed up',
      tag: 'Recap',
      body: [
        'A monolith is simple and fast to change while the team is small. Split by **business capability**, give each service **its own data**, and you gain independent deploys and smaller failures.',
        'You pay in **network latency, partial failure, consistency work and operations**. Migrate gradually with the **strangler fig**, and consider a modular monolith first.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Draw boundaries around business capabilities and data ownership. Whether they become separate processes is a later, reversible choice.' },
      scene: {
        nodes: ms('users', 'gw', 'catalog', 'orders', 'reviews', 'cdb', 'odb', 'rdb'),
        links: [...msSplit, ...msData],
        flows: [F(['users', 'gw', 'orders', 'odb'], { ret: true }), F(['users', 'gw', 'catalog'], { ret: true, delay: 0.6 }), F(['users', 'gw', 'reviews'], { ret: true, delay: 1.2 })],
      },
      metrics: { deploys: '15 / day', blast: '~25%', latency: '165 ms', parts: '4 svc + 4 DBs' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Service discovery                                                    */
/* ------------------------------------------------------------------ */

const sd = cast({
  users: { kind: 'crowd', at: [-7, 4], tag: 'outside users', tagIcon: Users, items: 5 },
  catalog: { kind: 'cube', at: [-7, 0], label: 'Catalog', icon: BookOpen, tone: 'blue' },
  gw: { kind: 'cube', at: [-3, 4], label: 'Gateway', icon: DoorOpen, tone: 'green' },
  orders: { kind: 'cube', at: [-3, 0], label: 'Orders', icon: ShoppingCart, tone: 'blue' },
  lb: { kind: 'cube', at: [1, 0], label: 'Router', icon: Split, tone: 'green' },
  reg: { kind: 'cube', at: [1, -4], label: 'Registry', icon: BookUser, tone: 'yellow' },
  dns: { kind: 'slab', at: [1, -4], tag: 'DNS', icon: Globe, tone: 'yellow' },
  p1: { kind: 'cube', at: [5, 0], label: 'Payments', sub: '10.0.7.8', icon: CreditCard, tone: 'blue' },
  p2: { kind: 'cube', at: [1, 4], label: 'Payments', sub: '10.0.5.42', icon: CreditCard, tone: 'blue' },
  os: { kind: 'cube', at: [-1.5, -1.5], label: 'Proxy', icon: Shield, tone: 'teal', size: 'sm' },
  ps1: { kind: 'cube', at: [3.5, -1.5], label: 'Proxy', icon: Shield, tone: 'teal', size: 'sm' },
  ps2: { kind: 'cube', at: [2.5, 2.5], label: 'Proxy', icon: Shield, tone: 'teal', size: 'sm' },
});

export const serviceDiscovery: Lesson = {
  id: 'service-discovery',
  title: 'Service Discovery',
  blurb: 'Instances come and go all day. How services find each other — and how outside traffic finds them.',
  minutes: 10,
  level: 'Intermediate',
  keywords: ['service discovery', 'service registry', 'heartbeat', 'dns ttl', 'api gateway', 'service mesh', 'sidecar', 'mtls', 'client-side load balancing'],
  metrics: [
    { id: 'fail', label: 'Failed calls', icon: TriangleAlert },
    { id: 'lag', label: 'Change → seen', icon: Timer },
    { id: 'hops', label: 'Hops per call', icon: Route },
    { id: 'toil', label: 'Manual config', icon: Wrench },
  ],
  learn: [
    { text: 'Why hard-coded addresses break', at: 0 },
    { text: 'Registries and heartbeats', at: 1 },
    { text: 'Client-side vs server-side discovery', at: 3 },
    { text: 'DNS discovery and its TTL trap', at: 4 },
    { text: 'Gateways at the edge, meshes inside', at: 6 },
  ],
  steps: [
    {
      short: 'Hard-coded',
      title: 'An IP address in a config file',
      tag: 'Problem',
      body: [
        'Orders calls Payments at `10.0.3.17:8080`, written in a config file. At 02:10 the autoscaler replaced that instance after a failed health check; the new one came up at `10.0.5.42`.',
        'Nobody updated the config. For 40 minutes every payment call went to a dead address — **100% of checkouts failed** while a healthy instance sat idle.',
      ],
      scene: {
        nodes: sd('orders', ['p1', { sub: '10.0.3.17', status: 'down' }], ['p2', { status: 'dim' }]),
        links: [L('orders', 'p1', { label: 'hard-coded IP', tone: 'bad' })],
        flows: [F(['orders', 'p1'], { n: 3, stop: true })],
        notes: [{ at: [5, 3.5], text: 'healthy, but unknown', tone: 'warn' }],
      },
      metrics: { fail: '100%', lag: 'never', hops: '1', toil: 'every change' },
      bad: ['fail', 'lag', 'toil'],
    },
    {
      short: 'Registry',
      title: 'Instances announce themselves',
      tag: 'Technique',
      body: [
        'Add a **service registry**. On startup each instance registers its name, address and port, then sends a **heartbeat** every 10 s. Miss three and the registry evicts it.',
        'The registry becomes the source of truth for “where is Payments right now?”, so it must be highly available itself — typically 3 or 5 nodes agreeing via a consensus protocol.',
      ],
      changes: [{ sign: '+', text: 'Service registry' }],
      scene: {
        nodes: sd('orders', 'reg', 'p1', 'p2'),
        links: [L('p1', 'reg', { dashed: true, label: 'heartbeat' }), L('p2', 'reg', { dashed: true })],
        flows: [F(['p1', 'reg'], { kind: 'event', n: 2 }), F(['p2', 'reg'], { kind: 'event', n: 2, delay: 0.6 })],
        notes: [{ at: [-3, -4], text: 'payments: 2 healthy', icon: BookUser, tone: 'good' }],
      },
      metrics: { lag: '30 s', toil: 'none' },
      hi: ['lag', 'toil'],
    },
    {
      short: 'Client-side',
      title: 'Client-side discovery',
      tag: 'Technique',
      body: [
        'With **client-side discovery**, Orders asks the registry for Payments’ live instances, caches the list for a few seconds, and picks one itself — round robin or least-loaded.',
        'No extra hop and smart balancing. But every service needs a **discovery library**, in every language you use, kept up to date.',
      ],
      scene: {
        nodes: sd('orders', 'reg', 'p1', 'p2'),
        links: [L('orders', 'reg', { label: 'lookup', arrow: 'both' }), L('orders', 'p1'), L('orders', 'p2')],
        flows: [
          F(['orders', 'reg'], { kind: 'data', ret: true, retKind: 'data' }),
          F(['orders', 'p1'], { ret: true, delay: 0.8 }),
          F(['orders', 'p2'], { ret: true, delay: 1.5 }),
        ],
      },
      metrics: { fail: '0%' },
      hi: ['fail'],
    },
    {
      short: 'Server-side',
      title: 'Server-side discovery',
      tag: 'Trade-off',
      body: [
        'Or callers hit one stable address — a **router or load balancer** — and it does the lookup. Clients stay simple: any language, plain HTTP. Kubernetes Services and cloud load balancers work this way.',
        'The price is an **extra hop** (often under a millisecond) and one more component to scale and keep highly available.',
      ],
      changes: [{ sign: '+', text: 'Router between caller and instances' }],
      scene: {
        nodes: sd('orders', ['lb', { meter: 30 }], 'reg', 'p1', 'p2'),
        links: [L('orders', 'lb', { label: 'payments.svc' }), L('lb', 'reg', { arrow: 'both' }), L('lb', 'p1'), L('lb', 'p2')],
        flows: [
          F(['orders', 'lb', 'p1'], { ret: true }),
          F(['orders', 'lb', 'p2'], { ret: true, delay: 0.9 }),
          F(['lb', 'reg'], { kind: 'data', ret: true, retKind: 'data', delay: 1.6 }),
        ],
      },
      metrics: { hops: '2' },
      bad: ['hops'],
    },
    {
      short: 'DNS',
      title: 'DNS: universal, but cached',
      tag: 'Trade-off',
      body: [
        'The simplest registry is **DNS**: `payments.internal` resolves to the IPs of healthy instances. Every language and tool already speaks it, with no library to install.',
        'The catch is **caching**. Resolvers and clients keep answers for the record’s **TTL** — say 60 s — and some runtimes and connection pools hold on far longer, so traffic keeps flowing to a box that is gone.',
      ],
      callout: { kind: 'tip', text: 'Use short TTLs (5–30 s), re-resolve on connection errors, and drain an instance before removing its record.' },
      scene: {
        nodes: sd('orders', 'dns', ['p1', { sub: 'old IP', status: 'down' }], 'p2'),
        links: [L('orders', 'dns', { label: 'TTL 60 s', arrow: 'both' }), L('orders', 'p1', { dashed: true, tone: 'bad' }), L('orders', 'p2')],
        flows: [
          F(['orders', 'dns'], { kind: 'data', ret: true, retKind: 'data' }),
          F(['orders', 'p1'], { stop: true, delay: 0.7 }),
          F(['orders', 'p2'], { ret: true, delay: 1.4 }),
        ],
      },
      metrics: { fail: '3%', lag: '60 s+', hops: '1' },
      bad: ['fail', 'lag'],
    },
    {
      short: 'Gateway',
      title: 'One front door for outside traffic',
      tag: 'Technique',
      body: [
        'Outside clients shouldn’t know your internal services exist. An **API gateway** is the single public entry: it terminates TLS, checks auth tokens, applies **rate limits** and routes `/orders` and `/catalog`.',
        'Internal service-to-service calls skip it and use discovery directly. Keep the gateway thin — routing and policy, never business logic.',
      ],
      changes: [{ sign: '+', text: 'API gateway at the edge' }],
      scene: {
        nodes: sd('users', 'gw', 'catalog', 'orders', 'reg', 'p1', 'p2'),
        links: [
          L('users', 'gw'),
          L('gw', 'orders', { label: '/orders' }),
          L('gw', 'catalog', { label: '/catalog' }),
          L('orders', 'reg', { arrow: 'both' }),
          L('orders', 'p1'),
          L('orders', 'p2'),
        ],
        flows: [
          F(['users', 'gw', 'orders', 'p1'], { ret: true }),
          F(['users', 'gw', 'catalog'], { ret: true, delay: 0.8 }),
          F(['orders', 'reg'], { kind: 'data', ret: true, retKind: 'data', delay: 1.5 }),
        ],
      },
      metrics: { fail: '0%', lag: '30 s' },
      hi: ['fail', 'lag'],
    },
    {
      short: 'Mesh',
      title: 'A sidecar beside every service',
      tag: 'Insight',
      body: [
        'A **service mesh** puts a small proxy — a **sidecar** — next to every instance. Services talk to localhost; the proxies handle discovery, load balancing, retries, timeouts and **mutual TLS**, and emit uniform metrics.',
        'Policies change in one control plane instead of every codebase. The costs: two extra proxy hops per call, more memory, and a complex system your team must debug when it breaks.',
      ],
      changes: [
        { sign: '+', text: 'Sidecar proxies' },
        { sign: '~', text: 'Registry becomes the control plane' },
      ],
      scene: {
        nodes: sd('orders', 'os', 'ps1', 'ps2', 'p1', 'p2', ['reg', { sub: 'control' }]),
        links: [
          L('orders', 'os'),
          L('os', 'ps1', { label: 'mTLS' }),
          L('os', 'ps2'),
          L('ps1', 'p1'),
          L('ps2', 'p2'),
          L('reg', 'os', { dashed: true }),
          L('reg', 'ps1', { dashed: true }),
        ],
        flows: [
          F(['orders', 'os', 'ps1', 'p1'], { ret: true }),
          F(['orders', 'os', 'ps2', 'p2'], { ret: true, delay: 1 }),
          F(['reg', 'os'], { kind: 'event', delay: 0.4 }),
          F(['reg', 'ps1'], { kind: 'event', delay: 0.4 }),
        ],
      },
      metrics: { hops: '1 + 2 proxies' },
      bad: ['hops'],
    },
    {
      short: 'Recap',
      title: 'Service discovery, summed up',
      tag: 'Recap',
      body: [
        'Instances come and go, so never hard-code addresses. A **registry** with heartbeats tracks who is alive; callers look it up themselves or go through a **router**; **DNS** works everywhere but caches.',
        'Put an **API gateway** at the edge for outside traffic, and reach for a **service mesh** when mTLS, retries and metrics outgrow your libraries.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Address services by name, never by machine — and let something that watches health decide which machine answers.' },
      scene: {
        nodes: sd('users', 'gw', 'catalog', 'orders', ['lb', { meter: 30 }], 'reg', 'p1', 'p2'),
        links: [L('users', 'gw'), L('gw', 'orders'), L('gw', 'catalog'), L('orders', 'lb'), L('lb', 'reg', { arrow: 'both' }), L('lb', 'p1'), L('lb', 'p2')],
        flows: [
          F(['users', 'gw', 'orders', 'lb', 'p1'], { ret: true }),
          F(['users', 'gw', 'catalog'], { ret: true, delay: 0.8 }),
          F(['lb', 'p2'], { ret: true, delay: 1.6 }),
        ],
      },
      metrics: { fail: '0%', lag: '30 s', hops: '2', toil: 'none' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Sagas & distributed transactions                                     */
/* ------------------------------------------------------------------ */

const sg = cast({
  shopper: { kind: 'device', at: [-7.5, 0], tag: 'shopper', tagIcon: Laptop },
  orders: { kind: 'cube', at: [-4, 0], label: 'Orders', icon: ShoppingCart, tone: 'blue' },
  odb: { kind: 'db', at: [-4, -4], tag: 'orders db', icon: Database },
  pay: { kind: 'cube', at: [0, -4], label: 'Payment', icon: CreditCard, tone: 'blue' },
  inv: { kind: 'cube', at: [0, 0], label: 'Stock', sub: 'inventory', icon: Package, tone: 'blue' },
  ship: { kind: 'cube', at: [0, 4], label: 'Shipping', icon: Truck, tone: 'blue' },
  pdb: { kind: 'db', at: [4, -4], tag: 'payments db', icon: Database },
  idb: { kind: 'db', at: [4, 0], tag: 'stock db', icon: Database },
  sdb: { kind: 'db', at: [4, 4], tag: 'shipping db', icon: Database },
  relay: { kind: 'cube', at: [0, 0], label: 'Relay', icon: Send, tone: 'yellow', size: 'sm' },
  bus: { kind: 'queue', at: [-4, 4], tag: 'event broker', items: 3 },
});

const sgCalls = [L('orders', 'pay'), L('orders', 'inv'), L('orders', 'ship')];
const sgData = [L('pay', 'pdb'), L('inv', 'idb'), L('ship', 'sdb')];

export const sagas: Lesson = {
  id: 'sagas',
  title: 'Sagas & Distributed Tx',
  blurb: 'Keeping checkout consistent across four services and four databases — without one big transaction.',
  minutes: 13,
  level: 'Advanced',
  keywords: ['saga', 'two-phase commit', '2pc', 'compensating transaction', 'orchestration', 'choreography', 'transactional outbox', 'idempotency', 'distributed transaction', 'eventual consistency'],
  metrics: [
    { id: 'broken', label: 'Broken orders', icon: TriangleAlert },
    { id: 'locks', label: 'Locks held', icon: Lock },
    { id: 'p99', label: 'Checkout p99', icon: Clock },
    { id: 'lost', label: 'Lost events', icon: MailX },
  ],
  learn: [
    { text: 'Why one transaction no longer fits', at: 0 },
    { text: 'Two-phase commit and why it blocks', at: 1 },
    { text: 'Sagas and compensating actions', at: 2 },
    { text: 'Orchestration vs choreography', at: 4 },
    { text: 'Outbox and idempotent steps', at: 6 },
  ],
  steps: [
    {
      short: 'Checkout',
      title: 'One click, four databases',
      tag: 'Problem',
      body: [
        'Checkout must create the order, charge the card, reserve stock and book a courier. Each lives in its **own service with its own database**, and the shop takes 50,000 orders a day.',
        'Yesterday a card was charged, then Stock found the item sold out and the request failed. With no transaction across databases, about **0.3%** of orders — 150 customers a day — paid for nothing.',
      ],
      scene: {
        nodes: sg('shopper', 'orders', 'odb', 'pay', ['inv', { status: 'hot', tone: 'rose' }], ['ship', { status: 'dim' }], 'pdb', 'idb', 'sdb'),
        links: [L('shopper', 'orders'), L('orders', 'odb'), ...sgCalls, ...sgData],
        flows: [
          F(['shopper', 'orders', 'pay', 'pdb'], { ret: true }),
          F(['orders', 'inv'], { ret: true, retKind: 'error', delay: 1.2 }),
        ],
        notes: [{ at: [-7.5, -4], text: 'charged, but no item', icon: CreditCard, tone: 'bad' }],
      },
      metrics: { broken: '150 / day', locks: '—', p99: '450 ms', lost: '—' },
      bad: ['broken'],
    },
    {
      short: '2PC',
      title: 'Two-phase commit, and why it blocks',
      tag: 'Trade-off',
      body: [
        'The classic answer is **two-phase commit**. A coordinator asks every database to **prepare** — lock the rows and promise it can commit — and only when all vote yes does it send **commit**.',
        'It is atomic, but every participant holds locks until the slowest answers. If the coordinator crashes between phases, they hold them **indefinitely**, unable to decide alone. Many brokers and NoSQL stores don’t support it at all.',
      ],
      scene: {
        nodes: sg(
          'shopper',
          ['orders', { sub: 'coord.', status: 'down', tone: 'rose' }],
          ['pay', { tag: 'locked', tagIcon: Lock, status: 'hot' }],
          ['inv', { tag: 'locked', tagIcon: Lock, status: 'hot' }],
          ['ship', { tag: 'locked', tagIcon: Lock, status: 'hot' }],
          'pdb',
          'idb',
          'sdb',
        ),
        links: [L('shopper', 'orders'), L('orders', 'pay', { label: 'PREPARE' }), L('orders', 'inv'), L('orders', 'ship'), ...sgData],
        flows: [
          F(['orders', 'pay'], { kind: 'handshake', ret: true, retKind: 'handshake' }),
          F(['orders', 'inv'], { kind: 'handshake', ret: true, retKind: 'handshake', delay: 0.3 }),
          F(['orders', 'ship'], { kind: 'handshake', ret: true, retKind: 'handshake', delay: 0.6 }),
          F(['shopper', 'orders'], { stop: true, delay: 1.5 }),
        ],
        notes: [{ at: [-7.5, -4], text: 'coordinator crashed', tone: 'bad' }],
      },
      metrics: { broken: '0', locks: '∞ on crash', p99: '1.2 s' },
      hi: ['broken'],
      bad: ['locks', 'p99'],
    },
    {
      short: 'Saga',
      title: 'A saga: local steps, undo on failure',
      tag: 'Technique',
      body: [
        'A **saga** splits checkout into local transactions that each commit at once: create order → charge card → reserve stock → book courier. No locks are held between steps.',
        'If a step fails, the saga runs **compensating actions** for the steps already done, in reverse: **refund** the card, cancel the order. The system ends consistent — just not instantly.',
      ],
      callout: { kind: 'warn', text: 'Compensation is a business action, not a rollback. A refund shows on the statement; an email already sent stays sent.' },
      scene: {
        nodes: sg('shopper', ['orders', { sub: 'saga' }], 'odb', 'pay', ['inv', { status: 'hot', tone: 'rose' }], ['ship', { status: 'dim' }], 'pdb', 'idb', 'sdb'),
        links: [
          L('shopper', 'orders'),
          L('orders', 'odb'),
          L('orders', 'pay', { label: 'charge → refund', arrow: 'both' }),
          L('orders', 'inv', { label: 'sold out', tone: 'bad' }),
          L('orders', 'ship', { dashed: true, tone: 'muted' }),
          ...sgData,
        ],
        flows: [
          F(['orders', 'pay'], { ret: true }),
          F(['orders', 'inv'], { ret: true, retKind: 'error', delay: 0.9 }),
          F(['orders', 'pay'], { kind: 'event', delay: 2 }),
        ],
        notes: [{ at: [-7.5, -4], text: 'refund issued ✓', tone: 'good' }],
      },
      metrics: { broken: '0', locks: '0', p99: '450 ms' },
      hi: ['broken', 'locks', 'p99'],
    },
    {
      short: 'Orchestrate',
      title: 'Orchestration: one conductor',
      tag: 'Technique',
      body: [
        'In **orchestration**, a saga orchestrator — here inside Orders — tells each service what to do next and records progress in its own database: `PAYMENT_DONE`, `STOCK_RESERVED`…',
        'The flow lives in one place, so it is easy to read, test and ask “where is order 8812?”. The risk: the orchestrator grows into a **god service** that knows too much about everyone.',
      ],
      changes: [{ sign: '~', text: 'Orders stores saga state' }],
      scene: {
        nodes: sg('shopper', ['orders', { sub: 'orchestr.' }], ['odb', { tag: 'saga state' }], 'pay', 'inv', 'ship', 'pdb', 'idb', 'sdb'),
        links: [L('shopper', 'orders'), L('orders', 'odb'), ...sgCalls, ...sgData],
        flows: [
          F(['orders', 'pay'], { ret: true }),
          F(['orders', 'inv'], { ret: true, delay: 0.8 }),
          F(['orders', 'ship'], { ret: true, delay: 1.6 }),
          F(['orders', 'odb'], { kind: 'data', n: 2, delay: 0.4 }),
        ],
      },
    },
    {
      short: 'Choreography',
      title: 'Choreography: services react to events',
      tag: 'Trade-off',
      body: [
        'In **choreography** there is no conductor. Orders publishes `OrderCreated`; Payment reacts and publishes `PaymentDone`; Stock reacts to that, and so on. An `OutOfStock` event makes Payment refund on its own.',
        'Services stay loosely coupled and new listeners plug in freely. But the flow exists only implicitly, spread across codebases — hard to see, debug and change, and event cycles creep in.',
      ],
      callout: { kind: 'tip', text: 'In practice the events travel through a message broker; the arrows here show who reacts to whom.' },
      scene: {
        nodes: sg('shopper', 'orders', 'pay', 'inv', 'ship', 'pdb', 'idb', 'sdb'),
        links: [
          L('shopper', 'orders'),
          L('orders', 'pay', { dashed: true, label: 'OrderCreated' }),
          L('pay', 'inv', { dashed: true, label: 'PaymentDone' }),
          L('inv', 'ship', { dashed: true, label: 'StockReserved' }),
          ...sgData,
        ],
        flows: [F(['orders', 'pay', 'inv', 'ship'], { kind: 'event', n: 2 })],
      },
    },
    {
      short: 'Outbox',
      title: 'The transactional outbox',
      tag: 'Technique',
      body: [
        'Each step writes its database **and** publishes an event. Done separately, a crash in between leaves them disagreeing: the card is charged but `PaymentDone` is never sent, and the saga stalls.',
        'Fix: in the **same local transaction**, insert the payment row and an **outbox** row. A relay reads new outbox rows and publishes them, retrying until the broker acknowledges. Nothing is lost — but an event may go out twice.',
      ],
      changes: [
        { sign: '+', text: 'Outbox table in the payments db' },
        { sign: '+', text: 'Relay that publishes it' },
      ],
      scene: {
        nodes: sg('pay', ['pdb', { tag: 'payments + outbox' }], 'relay', 'bus', 'ship'),
        links: [L('pay', 'pdb', { label: 'one tx' }), L('pdb', 'relay', { label: 'poll' }), L('relay', 'bus'), L('bus', 'ship')],
        flows: [
          F(['pay', 'pdb'], { kind: 'data' }),
          F(['pdb', 'relay', 'bus', 'ship'], { kind: 'event', n: 2, delay: 0.8 }),
        ],
      },
      metrics: { lost: '0' },
      hi: ['lost'],
    },
    {
      short: 'Idempotent',
      title: 'Every step must survive a repeat',
      tag: 'Insight',
      body: [
        'Outboxes and retries deliver **at least once**, so Payment will sometimes see `ChargeCard` twice. Each step records the saga IDs it has processed and turns a duplicate into a no-op — it is **idempotent**.',
        'Compensations need the same care: a refund retried after a timeout must not refund twice. Other readers also see in-between states, so show the order as “pending” until the saga finishes.',
      ],
      callout: { kind: 'key', text: 'In a saga, every action and every compensation must be safe to run twice.' },
      scene: {
        nodes: sg('shopper', ['orders', { sub: 'orchestr.' }], ['odb', { tag: 'saga state' }], 'pay', 'inv', 'ship', ['pdb', { tag: 'processed IDs' }], 'idb', 'sdb'),
        links: [L('shopper', 'orders'), L('orders', 'odb'), L('orders', 'pay', { label: 'saga 8812 × 2' }), L('orders', 'inv'), L('orders', 'ship'), ...sgData],
        flows: [
          F(['orders', 'pay', 'pdb'], { ret: true }),
          F(['orders', 'pay'], { ret: true, delay: 1.3 }),
          F(['orders', 'inv'], { ret: true, delay: 2 }),
        ],
        notes: [{ at: [-7.5, -4], text: '8812 already done ✓', tone: 'good' }],
      },
    },
    {
      short: 'Recap',
      title: 'Sagas, summed up',
      tag: 'Recap',
      body: [
        'Across services, **2PC** buys atomicity with blocking locks. A **saga** chains local transactions and undoes completed ones with **compensating actions**.',
        'Coordinate with an **orchestrator** for visibility or **choreography** for loose coupling; publish reliably with a **transactional outbox**; and make every step **idempotent**.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Distributed transactions trade instant atomicity for availability. Design the undo path as carefully as the happy path.' },
      scene: {
        nodes: sg('shopper', ['orders', { sub: 'orchestr.' }], ['odb', { tag: 'saga state' }], 'pay', 'inv', 'ship', 'pdb', 'idb', 'sdb'),
        links: [L('shopper', 'orders'), L('orders', 'odb'), ...sgCalls, ...sgData],
        flows: [F(['shopper', 'orders', 'pay'], { ret: true }), F(['orders', 'inv'], { ret: true, delay: 0.8 }), F(['orders', 'ship'], { ret: true, delay: 1.6 })],
      },
      metrics: { broken: '0', locks: '0', p99: '450 ms', lost: '0' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Batch & stream processing                                            */
/* ------------------------------------------------------------------ */

const bs = cast({
  users: { kind: 'crowd', at: [-7, 0], tag: 'app users', tagIcon: Users, items: 6 },
  files: { kind: 'slab', at: [-3, 0], tag: 'click files', icon: Files, tone: 'sand' },
  log: { kind: 'queue', at: [-3, 0], tag: 'click log', items: 4 },
  job: { kind: 'cube', at: [1, 0], label: 'Job', sub: 'one box', icon: Cpu, tone: 'blue' },
  m1: { kind: 'cube', at: [1, -4], label: 'Map', sub: '× 200', icon: Split, tone: 'blue' },
  m2: { kind: 'cube', at: [1, 0], label: 'Map', sub: '× 200', icon: Split, tone: 'blue' },
  m3: { kind: 'cube', at: [1, 4], label: 'Map', sub: '× 200', icon: Split, tone: 'blue' },
  reduce: { kind: 'cube', at: [5, 0], label: 'Reduce', sub: '× 20', icon: Sigma, tone: 'blue' },
  report: { kind: 'slab', at: [5, -4], tag: 'revenue report', icon: FileSpreadsheet, tone: 'violet' },
  proc: { kind: 'cube', at: [1, 0], label: 'Stream', sub: 'processor', icon: Waves, tone: 'blue' },
  dash: { kind: 'slab', at: [5, 4], tag: 'live dashboard', icon: ChartLine, tone: 'teal' },
  late: { kind: 'phone', at: [-3, 4], tag: 'offline phone', tagIcon: Smartphone, tone: 'gray' },
  ckpt: { kind: 'slab', at: [1, 4], tag: 'checkpoints', icon: HardDrive, tone: 'yellow' },
  batch: { kind: 'cube', at: [1, -4], label: 'Batch', sub: 'nightly', icon: Moon, tone: 'blue' },
});

export const batchStream: Lesson = {
  id: 'batch-stream',
  title: 'Batch & Stream Processing',
  blurb: 'Crunching billions of events: big nightly jobs for complete answers, streams for answers right now.',
  minutes: 13,
  level: 'Advanced',
  keywords: ['batch processing', 'stream processing', 'mapreduce', 'windowing', 'watermark', 'event time', 'checkpoint', 'exactly-once', 'late events', 'lambda architecture'],
  metrics: [
    { id: 'vol', label: 'Events / day', icon: Activity },
    { id: 'fresh', label: 'Answer age', icon: Hourglass },
    { id: 'runtime', label: 'Job runtime', icon: Clock },
    { id: 'workers', label: 'Machines', icon: Cpu },
  ],
  learn: [
    { text: 'Splitting a big job into map tasks', at: 1 },
    { text: 'Shuffle, reduce and batch latency', at: 2 },
    { text: 'Windowed aggregates over a stream', at: 3 },
    { text: 'Event time, late data and watermarks', at: 4 },
    { text: 'Checkpoints for exactly-once state', at: 5 },
  ],
  steps: [
    {
      short: 'Report',
      title: 'Revenue over three billion clicks',
      tag: 'Problem',
      body: [
        'The shopping app logs every click and purchase: **3 billion events a day**, about 2 TB. Finance wants revenue per campaign every morning; marketing wants to know which campaign is working today.',
        'One machine scanning 2 TB at 200 MB/s needs about **3 hours just to read** the data, before doing any work — and volume doubles every year.',
      ],
      scene: {
        nodes: bs('users', 'files', ['job', { meter: 100, status: 'hot' }], ['report', { status: 'dim' }]),
        links: [L('users', 'files'), L('files', 'job'), L('job', 'report', { dashed: true })],
        flows: [F(['users', 'files'], { kind: 'event', n: 4 }), F(['files', 'job'], { kind: 'data', n: 2, speed: 0.4 }), F(['job', 'report'], { kind: 'data', speed: 0.3, delay: 2 })],
        notes: [{ at: [-3, -4], text: '2 TB ÷ 200 MB/s ≈ 3 h', icon: Clock, tone: 'bad' }],
      },
      metrics: { vol: '3 B', fresh: '1 day+', runtime: '5 h', workers: '1' },
      bad: ['runtime'],
    },
    {
      short: 'Map',
      title: 'Split the work: map',
      tag: 'Technique',
      body: [
        'Store events as many files — say 500 hourly chunks of 4 GB. A **batch** framework hands each chunk to one of **200 workers**, scheduled close to where the data sits.',
        'Each **map** task reads its chunk, keeps only purchases and emits small pairs like `(campaign_42, 19.99)`. 2 TB shrinks to a few GB of pairs, read in parallel in minutes.',
      ],
      changes: [
        { sign: '-', text: 'The single job' },
        { sign: '+', text: '200 map workers' },
      ],
      scene: {
        nodes: bs('users', 'files', ['m1', { meter: 70 }], ['m2', { meter: 75 }], ['m3', { meter: 65 }]),
        links: [L('users', 'files'), L('files', 'm1'), L('files', 'm2'), L('files', 'm3')],
        flows: [
          F(['users', 'files'], { kind: 'event', n: 3 }),
          F(['files', 'm1'], { kind: 'data', n: 2 }),
          F(['files', 'm2'], { kind: 'data', n: 2, delay: 0.3 }),
          F(['files', 'm3'], { kind: 'data', n: 2, delay: 0.6 }),
        ],
      },
      metrics: { runtime: '25 min', workers: '200' },
      hi: ['runtime'],
    },
    {
      short: 'Reduce',
      title: 'Group by key: reduce',
      tag: 'Technique',
      body: [
        'The framework **shuffles** the pairs so every value for one campaign lands on the same **reduce** worker, which sums them and writes one row of the report.',
        'Inputs are immutable files, so a crashed task just reruns, and a bug fix means re-running the job. It runs 01:00–01:40 each night, so the morning report always describes **yesterday**.',
      ],
      callout: { kind: 'tip', text: 'Batch optimises for throughput and completeness: read everything, as cheaply as possible, and get the exact answer.' },
      changes: [
        { sign: '+', text: '20 reduce workers' },
        { sign: '+', text: 'Revenue report' },
      ],
      scene: {
        nodes: bs('users', 'files', ['m1', { meter: 40 }], ['m2', { meter: 40 }], ['m3', { meter: 40 }], 'reduce', 'report'),
        links: [L('users', 'files'), L('files', 'm1'), L('files', 'm2'), L('files', 'm3'), L('m1', 'reduce'), L('m2', 'reduce', { label: 'shuffle by key' }), L('m3', 'reduce'), L('reduce', 'report')],
        flows: [
          F(['files', 'm1', 'reduce'], { kind: 'data' }),
          F(['files', 'm2', 'reduce'], { kind: 'data', delay: 0.4 }),
          F(['files', 'm3', 'reduce'], { kind: 'data', delay: 0.8 }),
          F(['reduce', 'report'], { kind: 'data', delay: 1.8 }),
        ],
        notes: [{ at: [-3, -4], text: 'runs nightly at 01:00', icon: Moon }],
      },
      metrics: { fresh: 'up to 33 h', runtime: '40 min', workers: '220' },
      bad: ['fresh'],
    },
    {
      short: 'Stream',
      title: 'Process events as they arrive',
      tag: 'Technique',
      body: [
        'For “how is today going?”, use **stream processing**. Apps publish each click to a partitioned **log**; a stream processor reads it continuously and keeps running totals in memory.',
        'It groups events into one-minute **tumbling windows**: revenue per campaign for 12:03–12:04 is emitted seconds after 12:04 ends. Answer age drops from a day to under a minute.',
      ],
      changes: [
        { sign: '+', text: 'Event log' },
        { sign: '+', text: 'Stream processor' },
        { sign: '+', text: 'Live dashboard' },
      ],
      scene: {
        nodes: bs('users', 'log', ['proc', { meter: 55 }], 'dash'),
        links: [L('users', 'log'), L('log', 'proc'), L('proc', 'dash', { label: '1-min windows' })],
        flows: [F(['users', 'log'], { kind: 'event', n: 4 }), F(['log', 'proc'], { kind: 'event', n: 3, delay: 0.3 }), F(['proc', 'dash'], { kind: 'data', delay: 1.2 })],
      },
      metrics: { fresh: '< 1 min', runtime: 'always on', workers: '24' },
      hi: ['fresh'],
    },
    {
      short: 'Late data',
      title: 'Late events and watermarks',
      tag: 'Trade-off',
      body: [
        'A phone in a tunnel sends clicks from 12:03 at 12:11. Window by **event time** — when it happened — not arrival time, or those sales land in the wrong minute.',
        'But when is 12:03 “done”? A **watermark** tracks event-time progress: “nothing older than 12:02 is still expected”. Windows close when it passes them; stragglers beyond an allowed lateness go out as corrections.',
      ],
      callout: { kind: 'warn', text: 'Waiting longer for late data makes results more complete but slower. No setting gives you both.' },
      changes: [{ sign: '+', text: 'Late-arriving events' }],
      scene: {
        nodes: bs('users', 'log', ['proc', { meter: 55 }], 'dash', 'late'),
        links: [L('users', 'log'), L('late', 'log', { dashed: true, label: '8 min late' }), L('log', 'proc'), L('proc', 'dash')],
        flows: [
          F(['users', 'log', 'proc'], { kind: 'event', n: 3 }),
          F(['late', 'log', 'proc'], { kind: 'event', delay: 1.4, speed: 0.6 }),
          F(['proc', 'dash'], { kind: 'data', delay: 1 }),
        ],
        notes: [{ at: [1, -4], text: 'watermark: 12:02', icon: Timer, tone: 'warn' }],
      },
      metrics: { fresh: '1–2 min' },
      bad: ['fresh'],
    },
    {
      short: 'Checkpoint',
      title: 'Crash without double counting',
      tag: 'Technique',
      body: [
        'The processor holds window totals in memory. If it crashes, restarting at the newest events loses those totals; replaying from the start counts sales twice.',
        'Every 30 s it takes a **checkpoint**: a consistent snapshot of its state **plus the log offsets** it had read. After a crash it restores both and replays from there, so each event affects state **exactly once**. Outputs need idempotent or transactional writes to match.',
      ],
      changes: [{ sign: '+', text: 'Checkpoint store' }],
      scene: {
        nodes: bs('users', 'log', ['proc', { sub: 'restarted', meter: 30 }], 'dash', 'ckpt'),
        links: [L('users', 'log'), L('log', 'proc', { label: 'replay offset' }), L('proc', 'dash'), L('proc', 'ckpt', { arrow: 'both', label: 'state + offsets' })],
        flows: [
          F(['ckpt', 'proc'], { kind: 'data' }),
          F(['log', 'proc'], { kind: 'event', n: 3, delay: 0.8 }),
          F(['proc', 'dash'], { kind: 'data', delay: 1.8 }),
          F(['users', 'log'], { kind: 'event', n: 2 }),
        ],
      },
      metrics: { fresh: '1–2 min' },
    },
    {
      short: 'Which one?',
      title: 'Batch, stream — or both',
      tag: 'Insight',
      body: [
        '**Batch** suits complete, cheap, easily re-run answers where hours are fine: billing, monthly reports, model training. **Stream** suits answers that lose value by the minute: fraud checks, alerts, live dashboards.',
        'Many teams run both: the stream gives fast provisional numbers, and a nightly batch over the archived log produces the official ones. Others replay one stream engine over history to keep a single codebase.',
      ],
      changes: [{ sign: '+', text: 'Nightly batch over the archived log' }],
      scene: {
        nodes: bs('users', 'log', ['proc', { meter: 50 }], 'dash', 'batch', 'report'),
        links: [L('users', 'log'), L('log', 'proc'), L('proc', 'dash', { label: 'fast, provisional' }), L('log', 'batch', { label: 'archive' }), L('batch', 'report', { label: 'official' })],
        flows: [
          F(['users', 'log', 'proc', 'dash'], { kind: 'event', n: 2 }),
          F(['log', 'batch', 'report'], { kind: 'data', delay: 1, speed: 0.6 }),
        ],
      },
    },
    {
      short: 'Recap',
      title: 'Batch & stream, summed up',
      tag: 'Recap',
      body: [
        '**Batch** splits a large, finished dataset into **map** tasks, groups by key and **reduces** — simple, complete and cheap, but hours behind.',
        '**Stream** processing updates **windowed** results as events arrive, uses **watermarks** for late data and **checkpoints** for exactly-once state. Choose by how fast the answer loses value — often both.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Ask how stale an answer may be. Hours: batch. Seconds: stream. Both: stream for speed, batch for the books.' },
      scene: {
        nodes: bs('users', 'log', ['proc', { meter: 50 }], 'dash', 'batch', 'report', 'ckpt'),
        links: [L('users', 'log'), L('log', 'proc'), L('proc', 'dash'), L('proc', 'ckpt', { arrow: 'both' }), L('log', 'batch'), L('batch', 'report')],
        flows: [
          F(['users', 'log', 'proc', 'dash'], { kind: 'event', n: 2 }),
          F(['proc', 'ckpt'], { kind: 'data', delay: 1.2 }),
          F(['log', 'batch', 'report'], { kind: 'data', delay: 0.8, speed: 0.6 }),
        ],
      },
      metrics: { vol: '3 B', fresh: '< 1 min', runtime: '40 min', workers: '244' },
    },
  ],
};
