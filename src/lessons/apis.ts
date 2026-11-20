import { ArrowLeftRight, Braces, Database, Network, Package, Radio, ShoppingBag, Signal, Smartphone, Tag, Timer, User } from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* REST, RPC & GraphQL                                                  */
/* ------------------------------------------------------------------ */

const ap = cast({
  phone: { kind: 'phone', at: [-6, 0], tag: 'app · 4G', tagIcon: Signal },
  old: { kind: 'phone', at: [-6, -4], tag: 'app v1', tagIcon: Smartphone },
  edge: { kind: 'cube', at: [-2, -4], label: 'Edge', sub: 'HTTP cache', icon: Radio, tone: 'teal' },
  api: { kind: 'cube', at: [-2, 0], label: 'API', sub: 'REST', icon: Network, tone: 'green' },
  users: { kind: 'cube', at: [2, -4], label: 'Users', icon: User, tone: 'blue' },
  orders: { kind: 'cube', at: [2, 0], label: 'Orders', icon: Package, tone: 'blue' },
  catalog: { kind: 'cube', at: [2, 4], label: 'Catalog', icon: ShoppingBag, tone: 'blue' },
  pricing: { kind: 'cube', at: [6, 0], label: 'Pricing', icon: Tag, tone: 'blue' },
});

const gql = ['api', { label: 'GraphQL', sub: 'BFF' }] as const;
const fan = [L('api', 'users'), L('api', 'orders'), L('api', 'catalog')];
const fanFlows = (d = 0.6) => [
  F(['api', 'users'], { ret: true, delay: d, speed: 1.6 }),
  F(['api', 'orders'], { ret: true, delay: d, speed: 1.6 }),
  F(['api', 'catalog'], { ret: true, delay: d, speed: 1.6 }),
];

export const apis: Lesson = {
  id: 'apis',
  title: 'REST, RPC & GraphQL',
  blurb: 'Three ways to shape an API — and why the right one depends on who is calling and over what network.',
  minutes: 12,
  level: 'Intermediate',
  keywords: ['rest', 'graphql', 'grpc', 'rpc', 'protobuf', 'http caching', 'over-fetching', 'bff', 'pagination', 'api versioning'],
  metrics: [
    { id: 'trips', label: 'Round trips', icon: ArrowLeftRight },
    { id: 'load', label: 'Screen load', icon: Timer },
    { id: 'bytes', label: 'Payload', icon: Database },
    { id: 'cache', label: 'HTTP caching', icon: Braces },
  ],
  learn: [
    { text: 'REST resources and HTTP caching semantics', at: 1 },
    { text: 'Over-fetching vs under-fetching', at: 2 },
    { text: 'GraphQL: one query, and its hidden costs', at: 4 },
    { text: 'gRPC for typed, fast service-to-service calls', at: 5 },
    { text: 'Versioning and cursor pagination', at: 6 },
  ],
  steps: [
    {
      short: '6 trips',
      title: 'One screen, six round trips',
      tag: 'Problem',
      body: [
        'The “My orders” screen calls `GET /me`, then `/users/42/orders`, then `/orders/{id}/items` for three orders, then `/products?ids=…`. Each call depends on the last, so they run in **four waves** over a 4G link with ~150 ms per round trip.',
        'The screen takes **1.4 s** to render and downloads 220 KB, most of it fields it never shows.',
      ],
      scene: {
        nodes: ap('phone', ['api', { meter: 45 }], 'users', 'orders', 'catalog'),
        links: [L('phone', 'api', { arrow: 'both', tone: 'bad', label: 'GET × 6' }), ...fan],
        flows: [
          F(['phone', 'api', 'users'], { ret: true, speed: 0.6 }),
          F(['phone', 'api', 'orders'], { ret: true, delay: 1.2, speed: 0.6 }),
          F(['phone', 'api', 'catalog'], { ret: true, delay: 2.4, speed: 0.6 }),
        ],
        notes: [{ at: [-6, 4], text: '4 waves × ~150 ms RTT', icon: Signal, tone: 'bad' }],
      },
      metrics: { trips: '6', load: '1.4 s', bytes: '220 KB', cache: 'Easy' },
      bad: ['trips', 'load', 'bytes'],
    },
    {
      short: 'REST',
      title: 'Resources, verbs and HTTP caching',
      tag: 'Technique',
      body: [
        '**REST** models data as resources with URLs (`/products/42`) and standard verbs. `GET` is safe and cacheable, `PUT` and `DELETE` are idempotent, `POST` is neither — so every proxy, CDN and retry library knows how to treat each call.',
        '`Cache-Control: max-age=300` lets an edge answer for five minutes; an `ETag` turns a re-check into a tiny `304 Not Modified`.',
      ],
      callout: { kind: 'tip', text: 'Cacheability is REST’s superpower: a GET with good headers can be answered without your servers doing any work.' },
      changes: [{ sign: '+', text: 'Edge HTTP cache' }],
      scene: {
        nodes: ap('phone', 'edge', ['api', { meter: 30 }], 'users', 'orders', 'catalog'),
        links: [L('phone', 'edge', { arrow: 'both', label: '304 · 0 bytes' }), L('edge', 'api'), L('phone', 'api', { arrow: 'both' }), ...fan],
        flows: [F(['phone', 'edge'], { ret: true, n: 2 }), F(['edge', 'api', 'catalog'], { ret: true, delay: 1.2 }), F(['phone', 'api', 'orders'], { ret: true, delay: 0.6 })],
        notes: [{ at: [6, -4], text: 'max-age=300 · ETag "v9"', tone: 'good' }],
      },
    },
    {
      short: 'Over/under',
      title: 'Too much data, and too little',
      tag: 'Insight',
      body: [
        '**Over-fetching**: `/users/42` returns 40 fields when the screen needs a name and an avatar. **Under-fetching**: no single endpoint has everything a screen needs, so the client chains requests — the N+1 problem, paid in mobile round trips.',
        'REST can patch this with `?fields=` and `?include=` parameters, or with endpoints shaped per screen.',
      ],
      scene: {
        nodes: ap('phone', ['api', { meter: 45 }], 'users', 'orders', 'catalog'),
        links: [L('phone', 'api', { arrow: 'both', tone: 'bad' }), ...fan],
        flows: [F(['phone', 'api', 'users'], { ret: true, retKind: 'data', speed: 0.6 }), F(['phone', 'api', 'orders'], { ret: true, n: 3, delay: 1, speed: 0.6 })],
        notes: [
          { at: [6, -4], text: 'needs 2 fields, gets 40', tone: 'bad' },
          { at: [6, 4], text: '1 + N calls for items', tone: 'bad' },
        ],
      },
    },
    {
      short: 'GraphQL',
      title: 'Ask for exactly what the screen needs',
      tag: 'Technique',
      body: [
        'With **GraphQL** the app sends one query naming the fields it wants: `me { name orders(first: 3) { total items { title thumb } } }`. The server returns exactly that shape, typed by a **schema**.',
        'Resolvers fan out to Users, Orders and Catalog over the datacenter network, where a hop costs ~1 ms instead of 150.',
      ],
      callout: { kind: 'key', text: 'Aggregating on the server moves the chattiness from the slow network (phone ↔ API) to the fast one (API ↔ services).' },
      changes: [{ sign: '~', text: 'REST API → GraphQL BFF' }, { sign: '~', text: '6 requests → 1 query' }],
      scene: {
        nodes: ap('phone', [gql[0], { ...gql[1], meter: 35 }], 'users', 'orders', 'catalog'),
        links: [L('phone', 'api', { arrow: 'both', label: '1 query · 18 KB' }), L('api', 'users', { label: '1 ms' }), L('api', 'orders'), L('api', 'catalog')],
        flows: [F(['phone', 'api'], { ret: true, speed: 0.7 }), ...fanFlows(0.6)],
      },
      metrics: { trips: '1', load: '380 ms', bytes: '18 KB' },
      hi: ['trips', 'load', 'bytes'],
    },
    {
      short: 'GQL costs',
      title: 'Flexible queries, harder operations',
      tag: 'Trade-off',
      body: [
        'Queries usually travel as `POST /graphql`, so URL-keyed HTTP caches and CDNs see nothing to cache. Teams add **persisted queries** (send a hash via GET) or cache inside the server.',
        'Clients can also write a deeply nested query that explodes into thousands of resolver calls. Enforce **depth and cost limits** before executing, and batch lookups to avoid N+1 in resolvers.',
      ],
      callout: { kind: 'warn', text: 'Score every query before running it and reject the expensive ones. A public GraphQL endpoint without cost limits is a denial-of-service button.' },
      scene: {
        nodes: ap('phone', [gql[0], { ...gql[1], meter: 96, status: 'hot' }], 'users', ['orders', { status: 'hot' }], ['catalog', { status: 'hot' }]),
        links: [L('phone', 'api', { arrow: 'both', tone: 'bad', label: 'depth 9 query' }), ...fan],
        flows: [F(['phone', 'api'], { kind: 'error', speed: 0.8 }), F(['api', 'orders'], { n: 5, delay: 0.5, speed: 1.4 }), F(['api', 'catalog'], { n: 6, delay: 0.7, speed: 1.4 })],
        notes: [{ at: [6, -4], text: 'cost 48,000 > limit 5,000', tone: 'bad' }],
      },
      metrics: { cache: 'Hard' },
      bad: ['cache'],
    },
    {
      short: 'gRPC',
      title: 'gRPC between services',
      tag: 'Technique',
      body: [
        'Inside the datacenter, services call each other with **gRPC**: contracts in `.proto` files generate typed clients, payloads are binary **protobuf** (several times smaller and faster to parse than JSON), and calls share **HTTP/2** connections with deadlines and **streaming**.',
        'The catch: browsers can’t call it directly, and binary traffic is harder to inspect by hand.',
      ],
      callout: { kind: 'tip', text: 'A common split: JSON (REST or GraphQL) at the public edge, gRPC for the many internal hops behind it.' },
      changes: [{ sign: '+', text: 'Pricing service' }, { sign: '~', text: 'Internal calls use gRPC' }],
      scene: {
        nodes: ap('phone', [gql[0], { ...gql[1], meter: 30 }], 'users', 'orders', 'catalog', 'pricing'),
        links: [L('phone', 'api', { arrow: 'both' }), ...fan, L('orders', 'users', { arrow: 'both' }), L('orders', 'pricing', { label: 'gRPC stream' })],
        flows: [F(['phone', 'api'], { ret: true, speed: 0.7 }), ...fanFlows(0.6), F(['orders', 'pricing'], { kind: 'data', n: 4, delay: 1, speed: 1.3 }), F(['orders', 'users'], { ret: true, delay: 1.4 })],
        notes: [{ at: [6, -4], text: 'protobuf · HTTP/2 · typed', tone: 'good' }],
      },
      metrics: { load: '350 ms' },
      hi: ['load'],
    },
    {
      short: 'Evolve',
      title: 'Change the API without breaking apps',
      tag: 'Case',
      body: [
        'Phones keep old app versions for years, so prefer **additive changes**: new optional fields, nothing renamed or removed. When you must break, run `/v1` and `/v2` side by side. GraphQL deprecates fields instead; protobuf never reuses field numbers.',
        'Paginate lists with an opaque **cursor** (`?after=c91&limit=20`), not `offset`: deep offsets are slow and skip rows when new ones arrive.',
      ],
      changes: [{ sign: '+', text: 'Old app version still calling' }],
      scene: {
        nodes: ap('phone', 'old', [gql[0], { ...gql[1], meter: 30 }], 'users', 'orders', 'catalog', 'pricing'),
        links: [L('phone', 'api', { arrow: 'both', label: 'after: "c91"' }), L('old', 'api', { arrow: 'both', dashed: true, label: '/v1 still works' }), ...fan, L('orders', 'pricing')],
        flows: [F(['phone', 'api', 'orders'], { ret: true }), F(['old', 'api', 'users'], { ret: true, delay: 0.8 }), F(['orders', 'pricing'], { kind: 'data', n: 2, delay: 1.2 })],
        notes: [
          { at: [6, -4], text: 'field “sku” @deprecated', tone: 'warn' },
          { at: [6, 4], text: 'page 2 · limit 20', icon: ArrowLeftRight },
        ],
      },
    },
    {
      short: 'Recap',
      title: 'APIs, summed up',
      tag: 'Recap',
      body: [
        '**REST** fits public, resource-shaped APIs and gets HTTP caching for free. **GraphQL** (or a per-screen BFF) fits clients that need varied data in one trip, if you control query cost. **gRPC** fits typed, high-volume service-to-service calls.',
        'Whatever you choose, evolve additively and paginate with cursors.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Pick the API style per boundary: who calls it, over which network, and how often it must change.' },
      scene: {
        nodes: ap('phone', 'edge', [gql[0], { ...gql[1], meter: 30 }], 'users', 'orders', 'catalog', 'pricing'),
        links: [L('phone', 'edge', { arrow: 'both' }), L('edge', 'api'), L('phone', 'api', { arrow: 'both' }), ...fan, L('orders', 'users', { arrow: 'both' }), L('orders', 'pricing')],
        flows: [F(['phone', 'edge'], { ret: true }), F(['phone', 'api'], { ret: true, delay: 0.5 }), ...fanFlows(1), F(['orders', 'pricing'], { kind: 'data', n: 3, delay: 1.5 })],
      },
      metrics: { trips: '1', load: '350 ms', bytes: '18 KB', cache: 'Hard' },
    },
  ],
};
