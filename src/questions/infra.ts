import {
  Activity,
  CalendarClock,
  ClipboardList,
  Copy,
  Cpu,
  Crown,
  Database,
  Download,
  Gauge,
  HardDrive,
  Hourglass,
  KeyRound,
  Lock,
  MemoryStick,
  Network,
  Search,
  Send,
  Server,
  ShoppingCart,
  SlidersHorizontal,
  Split,
  Target,
  Timer,
  User,
} from 'lucide-react';
import type { Question } from '../types';
import { cast, F, L } from '../lessons/kit';

/* ------------------------------------------------------------------ */
/* 17 · Design an API Gateway                                          */
/* ------------------------------------------------------------------ */

const ag = cast({
  clients: { kind: 'crowd', at: [-7, 0], tag: 'clients', items: 5 },
  lb: { kind: 'cube', at: [-4, 0], label: 'L4 LB', icon: Split, tone: 'green', size: 'sm' },
  gw: { kind: 'cube', at: [0, 0], label: 'Gateway', sub: 'node 1', icon: Network, tone: 'green' },
  gw2: { kind: 'cube', at: [0, 4], label: 'GW 2', sub: 'node 2', icon: Network, tone: 'green', size: 'sm' },
  ctrl: { kind: 'cube', at: [0, -4.5], label: 'Control', sub: 'routes', icon: SlidersHorizontal, tone: 'yellow' },
  idp: { kind: 'cube', at: [-4, -4], label: 'IdP', sub: 'JWKS', icon: KeyRound, tone: 'yellow', size: 'sm' },
  rl: { kind: 'cube', at: [-4, 4], label: 'Limits', sub: 'counters', icon: Gauge, tone: 'orange' },
  users: { kind: 'cube', at: [4, -4], label: 'Users', sub: 'service', icon: User, tone: 'blue' },
  orders: { kind: 'cube', at: [4, 0], label: 'Orders', sub: 'service', icon: ShoppingCart, tone: 'blue' },
  search: { kind: 'cube', at: [4, 4], label: 'Search', sub: 'service', icon: Search, tone: 'blue' },
});

/** Gateway → upstream links shared by the later steps. */
const agUp = [L('gw', 'users'), L('gw', 'orders'), L('gw', 'search')];

export const qApiGateway: Question = {
  id: 'q-api-gateway',
  n: 17,
  title: 'Design an API Gateway',
  blurb: 'One front door for 80 services: routing, auth, per-key limits and resilience in a few milliseconds.',
  minutes: 14,
  level: 'Intermediate',
  concepts: ['Routing', 'Rate Limiting'],
  related: ['service-discovery', 'rate-limiting', 'load-balancing', 'authentication', 'timeouts-retries'],
  followUps: [
    'How would you roll out a new route config safely to 200 gateway nodes?',
    'How do you rate-limit a tenant fairly when its traffic hits several regions?',
    'Where would you aggregate responses for the mobile app, and why not in the gateway?',
    'How do WebSockets and other long-lived connections change the design?',
    'How would you revoke a leaked JWT before it expires?',
  ],
  keywords: ['api gateway', 'reverse proxy', 'routing', 'rate limiting', 'jwt', 'jwks', 'circuit breaker', 'control plane', 'envoy', 'kong'],
  metrics: [
    { id: 'rps', label: 'Peak traffic', icon: Gauge },
    { id: 'p99', label: 'Added p99', icon: Timer },
    { id: 'keys', label: 'API keys', icon: KeyRound },
    { id: 'nodes', label: 'GW nodes', icon: Server },
  ],
  learn: [
    { text: 'Scoping a gateway to cross-cutting concerns', at: 0 },
    { text: 'Route tables and hot reload via a control plane', at: 4 },
    { text: 'Local JWT validation with cached JWKS', at: 5 },
    { text: 'Per-key rate limits across many nodes', at: 6 },
    { text: 'Timeouts, retries and circuit breakers to upstreams', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'One front door for 80 services',
      tag: 'Requirements',
      body: [
        'Brief: a public API platform. **Web, mobile and partner** clients call ~300 routes served by ~80 internal services. The gateway must **route** requests, **authenticate** callers, enforce **per-key rate limits and quotas**, and add very little latency.',
        'Non-functional: **200k req/s** at peak, **≤ 5 ms** added p99, **99.99%** availability — every request passes through it. Out of scope: business logic, response aggregation (that is a BFF’s job) and the services themselves.',
      ],
      callout: { kind: 'tip', text: 'Say early that the gateway stays thin: cross-cutting concerns only. That one sentence frames every later decision.' },
      scene: {
        nodes: ag('clients', ['gw', { sub: 'front door' }]),
        links: [L('clients', 'gw', { arrow: 'both' })],
        flows: [F(['clients', 'gw'], { ret: true, n: 2 })],
        notes: [
          { at: [4, -2.5], text: 'Route by host/path/header' },
          { at: [4, -1.5], text: 'Auth + per-key limits' },
          { at: [4, 1.5], text: '≤ 5 ms added p99', icon: Timer },
          { at: [4, 2.5], text: 'Out: business logic', tone: 'bad' },
        ],
      },
      metrics: { rps: '—', p99: '—', keys: '—', nodes: '—' },
    },
    {
      short: 'Numbers',
      title: 'Napkin maths for the edge',
      tag: 'Estimation',
      body: [
        'Peak **200k req/s** (average ~60k). Request plus response average ~4 KB, so ~**800 MB/s ≈ 6.4 Gbps** crosses the fleet. A node doing TLS, token checks and proxying handles ~15k req/s, so ~14 nodes — run **16+** for N+2 headroom.',
        '**1M API keys** × ~100 B of plan data ≈ 100 MB: it fits in every node’s memory. The real constraint is the latency budget — no synchronous network call per request except the one to the upstream.',
      ],
      callout: { kind: 'key', text: 'A 5 ms budget rules out calling an auth service or a database on every request. Everything per-request must be local or cached.' },
      scene: {
        nodes: ag('clients', ['gw', { meter: 70 }]),
        links: [L('clients', 'gw', { arrow: 'both' })],
        flows: [F(['clients', 'gw'], { ret: true, n: 3 })],
        notes: [
          { at: [4, -2.5], text: '200k req/s ≈ 6.4 Gbps', icon: Gauge },
          { at: [4, -1.5], text: '~15k req/s per node → 16' },
          { at: [4, 1.5], text: '1M keys ≈ 100 MB in RAM', icon: KeyRound },
        ],
      },
      metrics: { rps: '200k /s', p99: '≤ 5 ms', keys: '1M', nodes: '16' },
    },
    {
      short: 'Routes',
      title: 'A route table, not code',
      tag: 'Data Model',
      body: [
        'The gateway’s core data is a **route table**: match host, path prefix, method and headers → an **upstream cluster** plus a policy chain. Example: `api.shop.com /v1/orders/*` → `orders`, timeout 2 s, 1 retry, plugins `[jwt, ratelimit]`.',
        'Routes live in git or a config store and are served by a **control plane** with an admin API (`PUT /routes/{id}`). Keys live in `api_keys(key_hash PK, tenant, plan, rps, monthly_quota)` — plans, not code, decide limits.',
      ],
      changes: [{ sign: '+', text: 'Control plane holding routes and keys' }],
      scene: {
        nodes: ag('clients', 'gw', 'ctrl'),
        links: [L('clients', 'gw', { arrow: 'both' }), L('ctrl', 'gw')],
        flows: [F(['ctrl', 'gw'], { kind: 'data' }), F(['clients', 'gw'], { ret: true, delay: 0.8 })],
        notes: [
          { at: [-4.5, -4], text: 'host api.shop.com' },
          { at: [-4.5, -3], text: '/v1/orders/* → orders' },
          { at: [-4.5, -2], text: 'timeout 2 s · 1 retry' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Data plane and control plane',
      tag: 'Design',
      body: [
        'Every request runs a fixed **filter chain**: terminate TLS → authenticate → rate-limit → match route → transform headers → proxy to an upstream instance → log. Gateway nodes hold **no session state**, so any node can serve any request.',
        'The **control plane** compiles routes, keys and service endpoints into a versioned snapshot and pushes it to every node. The data plane never waits on it: if the control plane is down, nodes keep serving the last good snapshot.',
      ],
      changes: [{ sign: '+', text: 'Upstream services' }, { sign: '~', text: 'Gateway runs a filter chain' }],
      scene: {
        nodes: ag('clients', ['gw', { meter: 45 }], 'ctrl', 'users', 'orders', 'search'),
        links: [L('clients', 'gw', { arrow: 'both' }), L('ctrl', 'gw'), ...agUp],
        flows: [
          F(['clients', 'gw', 'orders'], { ret: true }),
          F(['clients', 'gw', 'users'], { ret: true, delay: 0.8 }),
          F(['ctrl', 'gw'], { kind: 'data', delay: 1.6 }),
        ],
        notes: [{ at: [-4, -3], text: 'TLS→auth→limit→route→proxy' }],
      },
      metrics: { p99: '3 ms' },
    },
    {
      short: 'Hot reload',
      title: 'Changing routes without restarts',
      tag: 'Deep Dive',
      body: [
        'Routes compile into a **radix tree** keyed by host, then path segments, so matching costs O(path length) whether there are 300 routes or 30,000. Regex routes are rare and checked last.',
        'On a change the control plane validates the config, then streams **snapshot v43**. Each node builds the new tree on the side and **atomically swaps** a pointer; in-flight requests finish on v42. Push to a canary node first and keep v42 for instant rollback.',
      ],
      callout: { kind: 'warn', text: 'A bad route push is the classic gateway outage: it hits 100% of traffic at once. Validate, canary, and roll back automatically on error spikes.' },
      scene: {
        nodes: ag('clients', ['gw', { meter: 45, sub: 'routes v43' }], 'ctrl', 'users', 'orders', 'search'),
        links: [L('clients', 'gw', { arrow: 'both' }), L('ctrl', 'gw'), ...agUp],
        flows: [F(['ctrl', 'gw'], { kind: 'data', n: 2 }), F(['clients', 'gw', 'search'], { ret: true, delay: 0.6 })],
        notes: [
          { at: [-4, -3], text: 'radix tree: O(path length)' },
          { at: [-4, -2], text: 'atomic swap v42 → v43', tone: 'good' },
        ],
      },
    },
    {
      short: 'Auth',
      title: 'Auth without a network hop',
      tag: 'Deep Dive',
      body: [
        'For user tokens, validate **JWTs locally**: signature, `exp`, `aud` and scopes, using the IdP’s public keys. Fetch the **JWKS** at startup, cache it, refresh hourly — and on an unknown `kid`, refetch once (rate-limited) to follow key rotation.',
        'Partner **API keys** are hashed and looked up in the in-memory key snapshot. The gateway forwards verified identity headers (`X-User-Id`, `X-Scopes`) and strips any client-supplied copies. Fine-grained authorization stays in the services.',
      ],
      changes: [{ sign: '+', text: 'IdP keys (JWKS), cached on every node' }],
      scene: {
        nodes: ag('clients', ['gw', { meter: 45 }], 'ctrl', 'idp', 'users', 'orders', 'search'),
        links: [L('clients', 'gw', { arrow: 'both' }), L('ctrl', 'gw'), L('gw', 'idp', { dashed: true, label: 'JWKS hourly' }), ...agUp],
        flows: [F(['clients', 'gw', 'orders'], { ret: true }), F(['gw', 'idp'], { kind: 'data', ret: true, retKind: 'data', delay: 1.2 })],
        notes: [
          { at: [-7, -4], text: 'unknown kid → refetch once' },
          { at: [-7, -3], text: 'JWT check ≈ 50 µs, no hop', tone: 'good' },
        ],
      },
      metrics: { p99: '2 ms' },
      hi: ['p99'],
    },
    {
      short: 'Limits',
      title: 'Per-key rate limits and quotas',
      tag: 'Deep Dive',
      body: [
        'Each key gets a **token bucket** (say 100 req/s, burst 200). Purely local buckets are wrong with 16 nodes — each would allow 100/s. Shared counters in **Redis** (`rl:{key}:{second}`) are exact but add a hop to every request.',
        'Middle ground: nodes keep local buckets and **sync deltas** to Redis every ~100 ms, accepting slight overshoot. Over the limit → `429` with `Retry-After`. Monthly **quotas** are counted asynchronously from logs. If Redis is down, **fail open** on local limits.',
      ],
      callout: { kind: 'tip', text: 'The rate-limiting lesson covers the algorithms. Here, focus on where the counters live and what happens when that store fails.' },
      changes: [{ sign: '+', text: 'Shared limit counters' }],
      scene: {
        nodes: ag('clients', ['gw', { meter: 50 }], 'ctrl', 'idp', ['rl', { meter: 40 }], 'users', 'orders', 'search'),
        links: [
          L('clients', 'gw', { arrow: 'both' }),
          L('ctrl', 'gw'),
          L('gw', 'idp', { dashed: true }),
          L('gw', 'rl', { arrow: 'both', label: 'sync deltas' }),
          ...agUp,
        ],
        flows: [
          F(['clients', 'gw', 'orders'], { ret: true }),
          F(['gw', 'rl'], { kind: 'data', ret: true, retKind: 'data', delay: 0.6 }),
          F(['clients', 'gw'], { kind: 'error', stop: true, delay: 1.4 }),
        ],
        notes: [
          { at: [-7, 3], text: 'over limit → 429 Retry-After', tone: 'bad' },
          { at: [-7, 4], text: 'Redis down → fail open', tone: 'warn' },
        ],
      },
    },
    {
      short: 'Upstreams',
      title: 'Protecting upstreams (and yourself)',
      tag: 'Deep Dive',
      body: [
        'The gateway learns healthy instances from **service discovery** (pushed by the control plane), balances across them and ejects outliers that keep failing. Every route has a **timeout**; retries happen only for idempotent methods, within a **retry budget** of ~10%.',
        'When `orders` starts timing out, its **circuit breaker** opens: calls fail fast with `503` instead of piling up and holding gateway connections and memory. A half-open probe lets traffic back once it recovers.',
      ],
      callout: { kind: 'warn', text: 'Without timeouts and breakers, one slow upstream exhausts gateway connections and drags every other route down with it.' },
      changes: [{ sign: '~', text: 'Breaker opens for a failing upstream' }],
      scene: {
        nodes: ag('clients', ['gw', { meter: 50 }], 'ctrl', 'idp', ['rl', { meter: 40 }], 'users', ['orders', { status: 'hot', meter: 98 }], 'search'),
        links: [
          L('clients', 'gw', { arrow: 'both' }),
          L('ctrl', 'gw'),
          L('gw', 'idp', { dashed: true }),
          L('gw', 'rl', { arrow: 'both' }),
          L('gw', 'users'),
          L('gw', 'orders', { tone: 'bad', dashed: true, label: 'circuit open' }),
          L('gw', 'search'),
        ],
        flows: [
          F(['gw', 'orders'], { kind: 'error', stop: true }),
          F(['clients', 'gw', 'users'], { ret: true, delay: 0.5 }),
          F(['clients', 'gw', 'search'], { ret: true, delay: 1.1 }),
        ],
        notes: [
          { at: [-7, -3], text: 'timeout + 10% retry budget' },
          { at: [-7, 3], text: 'breaker open → fast 503', tone: 'warn' },
        ],
      },
    },
    {
      short: 'Scale',
      title: 'Scaling out — and staying thin',
      tag: 'Bottleneck',
      body: [
        'Nodes are stateless, so scale **horizontally** behind an L4 balancer (anycast/DNS across regions) and autoscale on CPU — TLS handshakes dominate. At 10× the shared **limit store** becomes the hot spot: shard it by key and keep counting local-first.',
        'The quieter failure is **scope creep**: teams add per-endpoint business rules, response stitching and DB calls until the gateway is a monolith everyone must deploy. Move that into services or a **BFF**; keep the gateway config-driven.',
      ],
      changes: [{ sign: '+', text: 'L4 load balancer' }, { sign: '+', text: 'More gateway nodes' }],
      scene: {
        nodes: ag('clients', 'lb', ['gw', { meter: 55 }], ['gw2', { meter: 55 }], 'ctrl', 'idp', ['rl', { meter: 70 }], 'users', 'orders', 'search'),
        links: [
          L('clients', 'lb', { arrow: 'both' }),
          L('lb', 'gw'),
          L('lb', 'gw2'),
          L('ctrl', 'gw'),
          L('gw', 'idp', { dashed: true }),
          L('gw', 'rl', { arrow: 'both' }),
          L('gw2', 'rl', { arrow: 'both' }),
          ...agUp,
          L('gw2', 'search'),
          L('gw2', 'orders'),
        ],
        flows: [
          F(['clients', 'lb', 'gw', 'orders'], { ret: true }),
          F(['clients', 'lb', 'gw2', 'search'], { ret: true, delay: 0.7 }),
          F(['gw2', 'rl'], { kind: 'data', delay: 1.3 }),
        ],
        notes: [
          { at: [-7, -3], text: 'TLS handshakes dominate CPU' },
          { at: [-7, 3], text: 'No business logic here', tone: 'bad' },
        ],
      },
      metrics: { rps: '2M /s', nodes: '160' },
      hi: ['rps'],
    },
    {
      short: 'Recap',
      title: 'The gateway as a product',
      tag: 'Recap',
      body: [
        'A stateless **filter chain** on every node; routes, keys and endpoints compiled by a **control plane** and hot-swapped; **JWTs checked locally** with cached JWKS; **local-first rate limits** synced to a shared store; strict **timeouts, retry budgets and breakers** toward upstreams.',
        'In the interview, keep returning to two numbers — the 5 ms budget and 99.99% availability — and to one rule: no business logic in the gateway.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'A great gateway is a fast, config-driven pipeline of cross-cutting concerns: local auth, local-first limits, strict timeouts — and nothing else.' },
      scene: {
        nodes: ag('clients', 'lb', ['gw', { meter: 45 }], ['gw2', { meter: 45 }], 'ctrl', 'idp', ['rl', { meter: 40 }], 'users', 'orders', 'search'),
        links: [
          L('clients', 'lb', { arrow: 'both' }),
          L('lb', 'gw'),
          L('lb', 'gw2'),
          L('ctrl', 'gw'),
          L('gw', 'idp', { dashed: true }),
          L('gw', 'rl', { arrow: 'both' }),
          L('gw2', 'rl', { arrow: 'both' }),
          ...agUp,
          L('gw2', 'search'),
        ],
        flows: [
          F(['clients', 'lb', 'gw', 'users'], { ret: true }),
          F(['clients', 'lb', 'gw2', 'search'], { ret: true, delay: 0.8 }),
          F(['ctrl', 'gw'], { kind: 'data', delay: 1.5 }),
        ],
      },
      metrics: { rps: '200k /s', p99: '2 ms', keys: '1M', nodes: '16' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 25 · Design a Distributed Cache                                     */
/* ------------------------------------------------------------------ */

const dc = cast({
  app: { kind: 'cube', at: [-4, 0], label: 'App', sub: 'client lib', icon: Server, tone: 'blue' },
  cfg: { kind: 'cube', at: [-4, -4], label: 'Config', sub: 'ring v7', icon: SlidersHorizontal, tone: 'yellow', size: 'sm' },
  db: { kind: 'db', at: [-4, 4], tag: 'source DB', icon: Database },
  a: { kind: 'cube', at: [0, -4], label: 'Node A', sub: 'primary', icon: MemoryStick, tone: 'orange' },
  b: { kind: 'cube', at: [0, 0], label: 'Node B', sub: 'primary', icon: MemoryStick, tone: 'orange' },
  c: { kind: 'cube', at: [0, 4], label: 'Node C', sub: 'primary', icon: MemoryStick, tone: 'orange' },
  ra: { kind: 'cube', at: [4, -4], label: 'Rep A', sub: 'replica', icon: Copy, tone: 'orange', size: 'sm' },
  rb: { kind: 'cube', at: [4, 0], label: 'Rep B', sub: 'replica', icon: Copy, tone: 'orange', size: 'sm' },
  rc: { kind: 'cube', at: [4, 4], label: 'Rep C', sub: 'replica', icon: Copy, tone: 'orange', size: 'sm' },
});

/** Client → shard and shard → replica links used once the cluster exists. */
const dcShards = [L('app', 'a', { arrow: 'both' }), L('app', 'b', { arrow: 'both' }), L('app', 'c', { arrow: 'both' })];
const dcReps = [L('a', 'ra'), L('b', 'rb'), L('c', 'rc')];

export const qDistributedCache: Question = {
  id: 'q-distributed-cache',
  n: 25,
  title: 'Design a Distributed Cache',
  blurb: 'Build the cache service itself: in-memory shards, eviction, consistent hashing, replicas and hot keys.',
  minutes: 15,
  level: 'Advanced',
  concepts: ['Consistent Hashing', 'Replication'],
  related: ['caching', 'consistent-hashing', 'replication', 'sharding', 'cap'],
  followUps: [
    'How would you grow the cluster from 40 to 60 nodes without a hit-ratio dip?',
    'Would you pick LRU or LFU for a session cache, and why?',
    'How do you stop a stampede when a very popular key expires?',
    'What changes if teams need the cache to survive a full cluster restart?',
    'How would you isolate one noisy tenant from everyone else?',
  ],
  keywords: ['distributed cache', 'redis cluster', 'memcached', 'lru', 'lfu', 'eviction', 'consistent hashing', 'hot key', 'cache-aside', 'failover'],
  metrics: [
    { id: 'ops', label: 'Throughput', icon: Activity },
    { id: 'hit', label: 'Hit ratio', icon: Target },
    { id: 'p99', label: 'p99 get', icon: Timer },
    { id: 'mem', label: 'Mem / node', icon: MemoryStick },
  ],
  learn: [
    { text: 'Sizing a cache cluster by memory', at: 1 },
    { text: 'Hash table + approximate LRU/LFU eviction', at: 4 },
    { text: 'Consistent hashing and client-side routing', at: 5 },
    { text: 'Async replicas and quorum-based failover', at: 6 },
    { text: 'Cache-aside races and hot-key fixes', at: 8 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'A cache service for every team',
      tag: 'Requirements',
      body: [
        'Build the shared in-memory cache that product teams put in front of their databases: `get`, `set` with a TTL, `delete` and atomic `incr`. Think of a Redis or Memcached cluster offered as a platform service.',
        'Targets: **1M ops/s**, **p99 < 1 ms** inside the data centre, ~**2 TB** of hot data, and survive a node loss without a cold-cache meltdown. Seconds of staleness are fine and durability is not required — the DB is the source of truth. Out of scope: cross-region replication.',
      ],
      scene: {
        nodes: dc('app', ['b', { label: 'Cache', sub: '?' }], 'db'),
        links: [L('app', 'b', { arrow: 'both' }), L('app', 'db', { arrow: 'both', dashed: true })],
        flows: [F(['app', 'b'], { ret: true, n: 2 }), F(['app', 'db'], { kind: 'data', ret: true, retKind: 'data', delay: 1.2 })],
        notes: [
          { at: [-7, -3], text: 'get · set+TTL · del · incr' },
          { at: [-7, -2], text: '1M ops/s, p99 < 1 ms', icon: Timer },
          { at: [-7, 2], text: 'DB stays source of truth', tone: 'good' },
        ],
      },
      metrics: { ops: '—', hit: '—', p99: '—', mem: '—' },
    },
    {
      short: 'Numbers',
      title: 'How many nodes?',
      tag: 'Estimation',
      body: [
        '1M ops/s, 90% reads, ~1 KB values → ~**1 GB/s** of network. 2 TB of data plus ~30% overhead (keys, pointers, fragmentation) ≈ 2.6 TB. At ~64 GB usable RAM per node that is **~40 primaries**, each serving ~25k ops/s — far below the 100k+ a node can do.',
        'Add one replica each → **~80 nodes**. Memory, not CPU or network, sets the cluster size, so eviction policy and per-entry overhead matter more than raw speed. Keep nodes ≤ 70% full so failover and resharding have room.',
      ],
      callout: { kind: 'key', text: 'Say what sizes the system. Here it is RAM: 40 nodes for capacity, ×2 for availability.' },
      scene: {
        nodes: dc('app', ['b', { label: 'Cache', sub: '×40', meter: 70 }], 'db'),
        links: [L('app', 'b', { arrow: 'both' }), L('app', 'db', { arrow: 'both', dashed: true })],
        flows: [F(['app', 'b'], { ret: true, n: 3 })],
        notes: [
          { at: [-7, -3], text: '2.6 TB ÷ 64 GB ≈ 40 nodes', icon: MemoryStick },
          { at: [-7, -2], text: '+1 replica each → 80' },
          { at: [-7, 2], text: '~25k ops/s per node', icon: Activity },
        ],
      },
      metrics: { ops: '1M /s', mem: '45 GB' },
    },
    {
      short: 'API',
      title: 'Commands and the in-node layout',
      tag: 'API',
      body: [
        'Wire protocol: `GET k`, `SET k v EX 300`, `DEL k`, `INCR k`, plus batched `MGET` to cut round trips. Keys ≤ 250 B, values ≤ 1 MB — bigger blobs belong in object storage.',
        'Inside a node: one large **hash table** `key → entry`, where each entry holds the value, `expires_at` and links for the eviction policy. Memory comes from a **slab allocator** with size classes (64 B, 128 B, …) so churn doesn’t shred the heap.',
      ],
      scene: {
        nodes: dc('app', ['b', { meter: 45 }], 'db'),
        links: [L('app', 'b', { arrow: 'both', label: 'SET k v EX 300' }), L('app', 'db', { arrow: 'both', dashed: true })],
        flows: [F(['app', 'b'], { kind: 'data', ret: true })],
        notes: [
          { at: [3.5, -2], text: 'key → value · ttl · lru ptrs' },
          { at: [3.5, 2], text: 'slab classes 64 B…1 MB' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Shards, replicas and a smart client',
      tag: 'Design',
      body: [
        'Keys are spread over **primaries** A, B, C… by consistent hashing, and each primary streams its writes to a **replica**. A small **config service** (a Raft group) owns the authoritative shard map, `ring v7`, and pushes it to clients.',
        'The app’s **client library** hashes the key, picks the owner from its cached map and talks to it directly — one hop, no proxy. On a miss the app reads the DB and fills the cache (**cache-aside**).',
      ],
      changes: [{ sign: '+', text: 'Shards A–C with replicas' }, { sign: '+', text: 'Config service with the ring' }],
      scene: {
        nodes: dc('app', 'cfg', 'db', ['a', { meter: 45 }], ['b', { meter: 45 }], ['c', { meter: 45 }], 'ra', 'rb', 'rc'),
        links: [L('cfg', 'app'), ...dcShards, ...dcReps, L('app', 'db', { arrow: 'both', dashed: true })],
        flows: [
          F(['app', 'b'], { ret: true }),
          F(['app', 'a'], { ret: true, delay: 0.5 }),
          F(['app', 'c', 'rc'], { kind: 'data', delay: 1 }),
          F(['cfg', 'app'], { kind: 'data', delay: 1.6 }),
        ],
      },
      metrics: { hit: '95%', p99: '0.8 ms' },
    },
    {
      short: 'Eviction',
      title: 'One node: memory and eviction',
      tag: 'Deep Dive',
      body: [
        'At the memory limit something must go. Exact **LRU** moves an entry in a linked list on every read — a contention hotspot. Redis-style **sampled LRU** (evict the oldest of ~5 random keys) is nearly as good and almost free. **LFU** wins when a stable set of keys stays hot.',
        'Expiry is lazy (check `expires_at` on read) plus a background sweeper that samples keys with TTLs, so dead keys don’t squat memory. Watch **fragmentation**: resident memory can reach 1.5× the data; slab classes or active defrag keep it near 1.1×.',
      ],
      callout: { kind: 'tip', text: 'Mention the policy knob: allkeys-lru for a pure cache, volatile-ttl when some keys must never be evicted.' },
      scene: {
        nodes: dc('app', ['a', { meter: 60 }], ['b', { meter: 92, sub: 'evicting' }], ['c', { meter: 60 }], 'db'),
        links: [...dcShards, L('app', 'db', { arrow: 'both', dashed: true })],
        flows: [F(['app', 'b'], { ret: true, n: 3 }), F(['app', 'c'], { ret: true, delay: 0.9 })],
        notes: [
          { at: [3.5, -1.5], text: '5-key sample ≈ true LRU', tone: 'good' },
          { at: [3.5, 1.5], text: 'RSS ÷ data ≈ 1.1–1.5', tone: 'warn' },
        ],
      },
      metrics: { mem: '58 GB' },
      bad: ['mem'],
    },
    {
      short: 'Sharding',
      title: 'Consistent hashing and routing',
      tag: 'Deep Dive',
      body: [
        'Hash keys onto a ring with **~200 virtual nodes** per server, so adding a node moves only ~1/N of keys and load stays even (see the consistent hashing lesson). Redis Cluster uses a fixed **16,384 hash slots** mapped to nodes instead — moving slots is explicit and easy to reason about.',
        '**Client-side routing** saves a hop but every client library must track the map. A **proxy tier** (mcrouter, twemproxy) keeps clients simple for ~0.2 ms and another fleet. A node that gets a key it no longer owns replies `MOVED`, and the client refreshes its map.',
      ],
      scene: {
        nodes: dc('app', 'cfg', ['a', { meter: 45 }], ['b', { meter: 45 }], ['c', { meter: 45 }], 'db'),
        links: [L('cfg', 'app', { label: 'ring v7' }), ...dcShards],
        flows: [F(['cfg', 'app'], { kind: 'data' }), F(['app', 'a'], { ret: true, delay: 0.6 }), F(['app', 'c'], { ret: true, delay: 1.2 })],
        notes: [
          { at: [3.5, -1.5], text: '~200 vnodes per server' },
          { at: [3.5, 1.5], text: 'wrong owner → MOVED', tone: 'warn' },
        ],
      },
    },
    {
      short: 'Failover',
      title: 'Replicas and failover',
      tag: 'Deep Dive',
      body: [
        'Each primary replicates **asynchronously** — synchronous replication would double write latency for data we can always rebuild. If node A dies, a few milliseconds of writes vanish; fine for a cache, not for a database.',
        'Nodes gossip heartbeats and the config service declares A dead only when a **majority** agrees (no split brain). It **promotes Rep A**, publishes `ring v8`, and clients reroute within seconds. Without replicas, all of A’s keys would miss at once and hammer the DB.',
      ],
      callout: { kind: 'warn', text: 'Losing one of 40 nodes means 2.5% of keys miss at once — a burst of DB reads. Replicas exist to protect the DB, not the data.' },
      changes: [{ sign: '-', text: 'Node A crashed' }, { sign: '~', text: 'Rep A promoted to primary' }],
      scene: {
        nodes: dc('app', ['cfg', { sub: 'ring v8' }], ['a', { status: 'down', tone: 'rose' }], ['b', { meter: 45 }], ['c', { meter: 45 }], ['ra', { sub: 'primary', meter: 50 }], 'rb', 'rc', 'db'),
        links: [
          L('cfg', 'app'),
          L('cfg', 'a', { dashed: true, tone: 'bad' }),
          L('app', 'b', { arrow: 'both' }),
          L('app', 'c', { arrow: 'both' }),
          L('a', 'ra', { dashed: true, tone: 'bad' }),
          L('b', 'rb'),
          L('c', 'rc'),
          L('app', 'db', { arrow: 'both', dashed: true }),
        ],
        flows: [
          F(['cfg', 'a'], { kind: 'error', stop: true }),
          F(['cfg', 'app'], { kind: 'data', delay: 1 }),
          F(['app', 'b'], { ret: true, delay: 1.6 }),
        ],
        notes: [
          { at: [-7, -3], text: 'majority says A is dead', tone: 'warn' },
          { at: [6.5, -2], text: 'Rep A → primary', tone: 'good' },
        ],
      },
      metrics: { hit: '93%' },
      bad: ['hit'],
    },
    {
      short: 'Freshness',
      title: 'Staying consistent with the DB',
      tag: 'Deep Dive',
      body: [
        'Cache-aside: read cache → on miss read DB → `SET` with a TTL. On writes, update the DB then **delete** the key — don’t set it, or two concurrent writers can leave the older value cached. A **TTL** (say 5 min) bounds any staleness that slips through.',
        'One race remains: a slow reader fetches an old row, a writer deletes the key, then the reader’s `SET` resurrects stale data. Fix it with **leases** — a token issued on the miss that a later delete invalidates, so the stale `SET` is rejected — or with versioned values.',
      ],
      callout: { kind: 'tip', text: 'On a hot key’s miss, coalesce: one request refills while the rest wait briefly or get the old value. No stampede on the DB.' },
      scene: {
        nodes: dc('app', 'cfg', ['a', { meter: 45 }], ['b', { meter: 45 }], ['c', { meter: 45 }], 'db'),
        links: [L('app', 'a', { arrow: 'both' }), L('app', 'b', { arrow: 'both', label: 'DEL after write' }), L('app', 'c', { arrow: 'both' }), L('app', 'db', { arrow: 'both' })],
        flows: [F(['app', 'db'], { kind: 'data', ret: true, retKind: 'data' }), F(['app', 'b'], { kind: 'event', delay: 1 })],
        notes: [
          { at: [3.5, -1.5], text: 'TTL bounds staleness' },
          { at: [3.5, 1.5], text: 'lease token blocks stale SET', tone: 'good' },
        ],
      },
    },
    {
      short: 'Hot keys',
      title: 'One key, one melting node',
      tag: 'Bottleneck',
      body: [
        'A celebrity profile or flash-sale item can pull **300k reads/s** to one key, and hashing puts it on one node: its NIC and CPU saturate while the rest idle. Adding nodes doesn’t help — the ring cannot split a single key.',
        'Fixes: a tiny **near-cache** in the client (1–5 s TTL) absorbs most reads; **key splitting** stores copies as `k#1…k#8` and readers pick one at random; or serve reads from **replicas**. Find hot keys with sampled per-key counters on each node.',
      ],
      changes: [{ sign: '+', text: 'Near-cache in the client library' }],
      scene: {
        nodes: dc(['app', { sub: 'near-cache' }], 'cfg', ['a', { meter: 30 }], ['b', { meter: 98, status: 'hot' }], ['c', { meter: 30 }], 'ra', ['rb', { meter: 60 }], 'rc', 'db'),
        links: [...dcShards, ...dcReps, L('app', 'db', { arrow: 'both', dashed: true })],
        flows: [F(['app', 'b'], { ret: true, n: 4, speed: 1.5 }), F(['b', 'rb'], { kind: 'data', delay: 0.8 })],
        notes: [
          { at: [-7, -3], text: '300k reads/s on one key', tone: 'bad' },
          { at: [-7, 2], text: 'near-cache: 1–5 s TTL', tone: 'good' },
          { at: [-7, 3], text: 'k#1…k#8 spread the load', tone: 'good' },
        ],
      },
      metrics: { ops: '1.3M /s', p99: '12 ms' },
      bad: ['p99'],
    },
    {
      short: 'Recap',
      title: 'The whole cache',
      tag: 'Recap',
      body: [
        'Size by **memory** (~40 primaries). Each node is a **hash table with sampled LRU/LFU**, lazy + active expiry and a slab allocator. **Consistent hashing** and a pushed shard map let smart clients go straight to the owner. **Async replicas** plus majority-voted failover protect the DB.',
        'Around it: **cache-aside** with delete-on-write, TTLs and leases for freshness, and near-caches or key splitting for **hot keys**.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'A distributed cache is many simple in-memory hash tables plus a shard map. The hard parts are failover, hot keys and staying honest with the DB.' },
      scene: {
        nodes: dc('app', 'cfg', ['a', { meter: 45 }], ['b', { meter: 50 }], ['c', { meter: 45 }], 'ra', 'rb', 'rc', 'db'),
        links: [L('cfg', 'app'), ...dcShards, ...dcReps, L('app', 'db', { arrow: 'both', dashed: true })],
        flows: [
          F(['app', 'b'], { ret: true }),
          F(['app', 'a', 'ra'], { kind: 'data', delay: 0.7 }),
          F(['app', 'c'], { ret: true, delay: 1.2 }),
          F(['app', 'db'], { kind: 'data', ret: true, retKind: 'data', delay: 1.8 }),
        ],
      },
      metrics: { ops: '1M /s', hit: '95%', p99: '0.8 ms', mem: '45 GB' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 26 · Design a Distributed Message Broker                            */
/* ------------------------------------------------------------------ */

const mb = cast({
  prod: { kind: 'cube', at: [-4, 0], label: 'Producer', sub: 'key=order', icon: Send, tone: 'blue' },
  ctrl: { kind: 'cube', at: [-4, -4], label: 'Control', sub: 'Raft ×3', icon: Crown, tone: 'yellow' },
  disk: { kind: 'slab', at: [-4, 4], tag: 'segment files', icon: HardDrive, tone: 'violet' },
  p0: { kind: 'queue', at: [0, -4], tag: 'P0', items: 4 },
  p1: { kind: 'queue', at: [0, 0], tag: 'P1', items: 6 },
  p2: { kind: 'queue', at: [0, 4], tag: 'P2', items: 3 },
  b1: { kind: 'cube', at: [0, -4], label: 'Broker 1', sub: 'leads P0', icon: Server, tone: 'blue' },
  b2: { kind: 'cube', at: [0, 0], label: 'Broker 2', sub: 'leads P1', icon: Server, tone: 'blue' },
  b3: { kind: 'cube', at: [0, 4], label: 'Broker 3', sub: 'leads P2', icon: Server, tone: 'blue' },
  c1: { kind: 'cube', at: [4, -4], label: 'Consumer', sub: 'group A', icon: Download, tone: 'blue' },
  c2: { kind: 'cube', at: [4, 0], label: 'Consumer', sub: 'group A', icon: Download, tone: 'blue' },
  c3: { kind: 'cube', at: [4, 4], label: 'Consumer', sub: 'joined', icon: Download, tone: 'green' },
});

/** Producer → leaders and P1 leader → followers. */
const mbProduce = [L('prod', 'b1'), L('prod', 'b2'), L('prod', 'b3')];
const mbRepl = [L('b2', 'b1', { dashed: true }), L('b2', 'b3', { dashed: true })];

export const qMessageBroker: Question = {
  id: 'q-message-broker',
  n: 26,
  title: 'Design a Distributed Message Broker',
  blurb: 'A Kafka-style log: partitions, append-only segments, in-sync replicas, consumer groups and offsets.',
  minutes: 16,
  level: 'Advanced',
  concepts: ['Partitioning', 'Ordering', 'Durability'],
  related: ['message-queues', 'pubsub', 'consensus', 'replication', 'sharding'],
  followUps: [
    'How would you add exactly-once processing to a consume-transform-produce pipeline?',
    'How do you add partitions to a topic without breaking per-key ordering?',
    'Why pull-based consumers instead of the broker pushing messages?',
    'How would you tier old segments to object storage to cut disk cost?',
    'What do producers and consumers experience during a controller failover?',
  ],
  keywords: ['message broker', 'kafka', 'partition', 'offset', 'consumer group', 'isr', 'acks=all', 'log compaction', 'retention', 'kraft'],
  metrics: [
    { id: 'in', label: 'Ingest', icon: Download },
    { id: 'lat', label: 'p99 end-to-end', icon: Timer },
    { id: 'store', label: 'Retained', icon: HardDrive },
    { id: 'lag', label: 'Consumer lag', icon: Hourglass },
  ],
  learn: [
    { text: 'Topics, partitions and per-key ordering', at: 2 },
    { text: 'Append-only segments, retention and compaction', at: 4 },
    { text: 'Durability with ISR and acks=all', at: 5 },
    { text: 'Consumer groups, offsets and rebalancing', at: 6 },
    { text: 'Controller quorum and leader epochs', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'A durable, replayable event log',
      tag: 'Requirements',
      body: [
        'Brief: a company-wide event backbone (orders, clicks, DB change streams). Producers **publish** keyed events; many independent teams **consume at their own pace** and can **replay** history. Events for the same key — one order — must be processed **in order**.',
        'Targets: **1M msgs/s** of ~1 KB, **7-day retention**, p99 end-to-end < 100 ms, **no acknowledged message lost** if a broker dies, at-least-once delivery. Out of scope: cross-region mirroring and exactly-once into external systems.',
      ],
      scene: {
        nodes: mb('prod', ['b2', { label: 'Broker', sub: '?' }], ['c2', { sub: 'many teams' }]),
        links: [L('prod', 'b2'), L('b2', 'c2')],
        flows: [F(['prod', 'b2', 'c2'], { kind: 'event', n: 2 })],
        notes: [
          { at: [-7, -3], text: '1M msgs/s × 1 KB', icon: Activity },
          { at: [-7, -2], text: 'ordered per key' },
          { at: [-7, 2], text: '7-day replay', icon: Hourglass },
          { at: [-7, 3], text: 'no acked loss on 1 failure', tone: 'good' },
        ],
      },
      metrics: { in: '—', lat: '—', store: '—', lag: '—' },
    },
    {
      short: 'Numbers',
      title: 'Disk and network, not CPU',
      tag: 'Estimation',
      body: [
        '1M × 1 KB = **1 GB/s in**. With replication factor 3, disks absorb **3 GB/s** of writes, and three consumer groups read **3 GB/s out**. Batching plus compression (~4×) shrinks this a lot, but size for raw numbers.',
        'Retention: 1 GB/s × 604,800 s ≈ **605 TB**, ×3 replicas ≈ **1.8 PB**. At ~40 TB of disk per broker that is **~45 brokers** — the cluster is sized by storage, and each broker then writes a comfortable ~70 MB/s.',
      ],
      callout: { kind: 'key', text: 'Storage, not throughput, decides the broker count. That is why tiering old segments to object storage is such a big lever.' },
      scene: {
        nodes: mb('prod', ['b2', { label: 'Brokers', sub: '×45', meter: 60 }], ['c2', { sub: '3 groups' }]),
        links: [L('prod', 'b2'), L('b2', 'c2')],
        flows: [F(['prod', 'b2', 'c2'], { kind: 'event', n: 3 })],
        notes: [
          { at: [-7, -3], text: '3 GB/s of disk writes', icon: HardDrive },
          { at: [-7, 2], text: '1.8 PB → ~45 brokers' },
        ],
      },
      metrics: { in: '1 GB/s', store: '1.8 PB' },
    },
    {
      short: 'Model',
      title: 'Topics, partitions, offsets',
      tag: 'Data Model',
      body: [
        'A **topic** (`orders`) is split into **partitions**; each is an append-only log where every message gets an increasing **offset**. The producer picks `hash(key) % partitions`, so one key always lands in one log — that is the only place ordering exists.',
        'API: `produce(topic, key, value) → (partition, offset)`, `fetch(topic, partition, offset, max_bytes)` and `commit(group, partition, offset)`. Brokers don’t track what each consumer has read; consumers own their position.',
      ],
      scene: {
        nodes: mb('prod', 'p0', 'p1', 'p2', ['c2', { sub: 'reads P1' }]),
        links: [L('prod', 'p0'), L('prod', 'p1', { label: 'key=42' }), L('prod', 'p2'), L('p1', 'c2', { label: 'from 1041' })],
        flows: [
          F(['prod', 'p1'], { kind: 'event', n: 2 }),
          F(['prod', 'p0'], { kind: 'event', delay: 0.6 }),
          F(['p1', 'c2'], { kind: 'event', delay: 1.2 }),
        ],
        notes: [
          { at: [-7, -3], text: 'hash(42) % 3 → P1' },
          { at: [4, -2], text: 'offsets 0, 1, 2… per log' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Brokers hold partition replicas',
      tag: 'Design',
      body: [
        'Each partition has **3 replicas** on different brokers: one **leader** serves all reads and writes for it, the others follow. Leadership is spread so every broker leads about the same number of partitions.',
        'Clients fetch **metadata** (who leads what) and talk straight to leaders. Consumers **pull** in batches, so they set their own pace: a slow consumer just falls behind instead of overloading the broker.',
      ],
      changes: [{ sign: '+', text: 'Brokers with leader and follower replicas' }],
      scene: {
        nodes: mb('prod', ['b1', { meter: 40 }], ['b2', { meter: 40 }], ['b3', { meter: 40 }], 'c1', 'c2'),
        links: [...mbProduce, ...mbRepl, L('b1', 'c1'), L('b2', 'c1'), L('b3', 'c2')],
        flows: [
          F(['prod', 'b2'], { kind: 'event' }),
          F(['prod', 'b1'], { kind: 'event', delay: 0.5 }),
          F(['b2', 'b1'], { kind: 'data', delay: 0.9 }),
          F(['b2', 'c1'], { kind: 'event', delay: 1.2 }),
          F(['b3', 'c2'], { kind: 'event', delay: 1.5 }),
        ],
        notes: [{ at: [-7, -3], text: 'P1: lead B2, follow B1+B3' }],
      },
      metrics: { lat: '40 ms' },
    },
    {
      short: 'Storage',
      title: 'Append-only segments on disk',
      tag: 'Deep Dive',
      body: [
        'A partition is a directory of **segment files** (~1 GB each): `…000123.log` holds message batches and a sparse `.index` maps offset → byte position every ~4 KB. Writes are pure **sequential appends**, which even spinning disks do at hundreds of MB/s.',
        'Recent reads come from the OS **page cache** and go to the socket with **zero-copy** `sendfile`. **Retention** deletes whole old segments — never single messages. For changelog topics, **compaction** keeps only the latest value per key.',
      ],
      changes: [{ sign: '+', text: 'Segment files behind each partition' }],
      scene: {
        nodes: mb('prod', ['b2', { meter: 40 }], 'disk', 'c1'),
        links: [L('prod', 'b2'), L('b2', 'disk', { label: 'append' }), L('b2', 'c1')],
        flows: [F(['prod', 'b2', 'disk'], { kind: 'data', n: 2 }), F(['b2', 'c1'], { kind: 'event', delay: 1 })],
        notes: [
          { at: [4, 1], text: 'page cache + sendfile' },
          { at: [4, 2], text: 'retention = delete segments' },
          { at: [4, 3], text: 'compaction: last value/key' },
        ],
      },
    },
    {
      short: 'Durability',
      title: 'acks=all and in-sync replicas',
      tag: 'Deep Dive',
      body: [
        'Followers continuously fetch from the leader; those caught up within ~10 s form the **in-sync replica set (ISR)**. With `acks=all` the leader acknowledges only once every ISR member has the batch, and `min.insync.replicas=2` makes it refuse writes rather than keep just one copy.',
        'Consumers only see messages below the **high watermark** — the offset the whole ISR holds — so they never read data a failover could erase. Producer retries can duplicate; an **idempotent producer** (producer id + sequence) lets the leader drop repeats.',
      ],
      callout: { kind: 'tip', text: 'acks=1 is faster but loses acknowledged writes if the leader dies before followers fetch. Say which you pick, per topic, and why.' },
      scene: {
        nodes: mb('prod', ['b1', { sub: 'P1 follower' }], ['b2', { sub: 'P1 leader', meter: 50 }], ['b3', { sub: 'P1 follower' }]),
        links: [L('prod', 'b2', { arrow: 'both', label: 'acks=all' }), L('b2', 'b1', { arrow: 'both' }), L('b2', 'b3', { arrow: 'both' })],
        flows: [
          F(['prod', 'b2'], { kind: 'event' }),
          F(['b2', 'b1'], { kind: 'data', ret: true, retKind: 'response', delay: 0.6 }),
          F(['b2', 'b3'], { kind: 'data', ret: true, retKind: 'response', delay: 0.6 }),
          F(['b2', 'prod'], { kind: 'response', delay: 1.8 }),
        ],
        notes: [
          { at: [4, -2], text: 'ISR = {B1, B2, B3}' },
          { at: [4, -1], text: 'min.insync.replicas = 2' },
          { at: [4, 2], text: 'high watermark = safe read', tone: 'good' },
        ],
      },
      metrics: { lat: '25 ms' },
      hi: ['lat'],
    },
    {
      short: 'Consumers',
      title: 'Consumer groups and offsets',
      tag: 'Deep Dive',
      body: [
        'A **consumer group** shares a topic’s partitions: each partition goes to exactly one member, so the group works in parallel while every partition stays ordered. With two members one owned two partitions; a third joined, so each now owns one. Max parallelism = partition count.',
        'Members **commit offsets** to an internal compacted topic. Process then commit → **at-least-once**: a crash replays a few messages, so handlers must be idempotent. A join or leave triggers a **rebalance**; cooperative rebalancing moves only partitions that change owner.',
      ],
      changes: [{ sign: '+', text: 'Third consumer joins the group' }],
      scene: {
        nodes: mb(['b1', { meter: 40 }], ['b2', { meter: 40 }], ['b3', { meter: 40 }], ['c1', { sub: 'owns P0' }], ['c2', { sub: 'owns P1' }], ['c3', { sub: 'owns P2' }]),
        links: [L('b1', 'c1', { arrow: 'both' }), L('b2', 'c2', { arrow: 'both', label: 'commit 1042' }), L('b3', 'c3', { arrow: 'both' })],
        flows: [
          F(['b1', 'c1'], { kind: 'event' }),
          F(['b2', 'c2'], { kind: 'event', delay: 0.4 }),
          F(['b3', 'c3'], { kind: 'event', delay: 0.8 }),
          F(['c2', 'b2'], { kind: 'data', delay: 1.6 }),
        ],
        notes: [
          { at: [-4, -2], text: '1 partition → 1 member' },
          { at: [-4, 2], text: 'process, then commit' },
        ],
      },
      metrics: { lag: '2 s' },
    },
    {
      short: 'Controller',
      title: 'Metadata via consensus',
      tag: 'Deep Dive',
      body: [
        'Something must decide which replica leads each partition. A **controller quorum** — 3 nodes running Raft (Kafka’s KRaft; formerly ZooKeeper) — keeps the metadata log: topics, replica assignments, ISR changes and leaders.',
        'When Broker 2 stops heartbeating, the controller picks a new P1 leader **from the ISR** (Broker 1), bumps the **leader epoch** and broadcasts metadata. The epoch fences the old leader: if it returns, its stale writes are rejected and it truncates to rejoin as a follower.',
      ],
      callout: { kind: 'warn', text: 'Electing an out-of-sync replica (unclean election) restores availability but silently drops acknowledged messages. Keep it off for durable topics.' },
      changes: [{ sign: '+', text: 'Controller quorum' }, { sign: '~', text: 'Broker 1 now leads P1' }],
      scene: {
        nodes: mb('prod', 'ctrl', ['b1', { sub: 'leads P1', meter: 55 }], ['b2', { status: 'down', tone: 'rose' }], 'b3', 'c1'),
        links: [L('ctrl', 'b1', { label: 'epoch 8' }), L('prod', 'b2', { tone: 'bad', dashed: true }), L('prod', 'b1'), L('b1', 'c1')],
        flows: [
          F(['prod', 'b2'], { kind: 'error', stop: true }),
          F(['ctrl', 'b1'], { kind: 'data', delay: 0.8 }),
          F(['prod', 'b1'], { kind: 'event', delay: 1.4 }),
          F(['b1', 'c1'], { kind: 'event', delay: 1.9 }),
        ],
        notes: [
          { at: [4, 1], text: 'leader from ISR only', tone: 'good' },
          { at: [4, 2], text: 'old epoch → rejected' },
        ],
      },
      metrics: { lat: '400 ms' },
      bad: ['lat'],
    },
    {
      short: 'Hot spots',
      title: 'Hot partitions and rebalance storms',
      tag: 'Bottleneck',
      body: [
        'Ordering by key means one huge key (a viral seller) pins **one partition**: its leader’s disk and NIC saturate while others idle, and its consumer lags. Use a finer key where order only matters per sub-entity (`seller:42:order:981`), or salt keys that need no ordering.',
        'Adding partitions remaps `hash(key) % n` and breaks per-key order, so **over-provision** up front (e.g. 64 per topic). Track **lag per partition**, place replicas **rack-aware**, and use static membership so rolling deploys don’t set off rebalance storms.',
      ],
      scene: {
        nodes: mb('prod', ['b1', { meter: 25 }], ['b2', { meter: 97, status: 'hot' }], ['b3', { meter: 25 }], 'c1', ['c2', { status: 'hot', sub: 'lagging' }], 'c3'),
        links: [...mbProduce, ...mbRepl, L('b1', 'c1'), L('b2', 'c2'), L('b3', 'c3')],
        flows: [
          F(['prod', 'b2'], { kind: 'event', n: 4, speed: 1.5 }),
          F(['b2', 'c2'], { kind: 'event', n: 2, delay: 0.6 }),
          F(['prod', 'b3'], { kind: 'event', delay: 1.2 }),
        ],
        notes: [
          { at: [-7, -3], text: '1 hot key → 1 partition', tone: 'bad' },
          { at: [-7, 2], text: 'over-provision partitions', tone: 'good' },
        ],
      },
      metrics: { lag: '4 min' },
      bad: ['lag'],
    },
    {
      short: 'Recap',
      title: 'The log, end to end',
      tag: 'Recap',
      body: [
        'Topics split into **partitions** chosen by key; each is an **append-only log** of segments with sparse indexes, retention by segment and optional compaction. **Leaders and ISR** with `acks=all` give durability; a **Raft controller** handles leadership with epochs.',
        '**Consumer groups** split partitions and own their **offsets**, giving at-least-once, ordered-per-partition processing that scales with partition count.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Ordering lives only inside a partition, durability comes from the in-sync replica set, and scale comes from adding partitions and brokers.' },
      scene: {
        nodes: mb('prod', 'ctrl', ['b1', { meter: 45 }], ['b2', { meter: 45 }], ['b3', { meter: 45 }], 'c1', 'c2', 'c3'),
        links: [...mbProduce, ...mbRepl, L('ctrl', 'b1'), L('b1', 'c1'), L('b2', 'c2'), L('b3', 'c3')],
        flows: [
          F(['prod', 'b2', 'c2'], { kind: 'event' }),
          F(['b2', 'b3'], { kind: 'data', delay: 0.6 }),
          F(['prod', 'b1', 'c1'], { kind: 'event', delay: 1 }),
          F(['ctrl', 'b1'], { kind: 'data', delay: 1.8 }),
        ],
      },
      metrics: { in: '1 GB/s', lat: '25 ms', store: '1.8 PB', lag: '2 s' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 29 · Design a Distributed Job Scheduler                             */
/* ------------------------------------------------------------------ */

const js = cast({
  client: { kind: 'device', at: [-7.5, -4], tag: 'teams', tagIcon: User },
  api: { kind: 'cube', at: [-4, -4], label: 'Job API', icon: Server, tone: 'blue' },
  store: { kind: 'db', at: [-4, 0], tag: 'jobs', icon: Database },
  coord: { kind: 'cube', at: [-4, 4], label: 'Coord', sub: 'etcd', icon: Lock, tone: 'yellow', size: 'sm' },
  s1: { kind: 'cube', at: [0, -4], label: 'Sched 1', sub: 'shards A', icon: CalendarClock, tone: 'blue' },
  s2: { kind: 'cube', at: [0, 4], label: 'Sched 2', sub: 'shards B', icon: CalendarClock, tone: 'blue' },
  q: { kind: 'queue', at: [0, 0], tag: 'ready runs', items: 3 },
  w1: { kind: 'cube', at: [4, -4], label: 'Worker', sub: 'pool', icon: Cpu, tone: 'blue' },
  w2: { kind: 'cube', at: [4, 4], label: 'Worker', sub: 'pool', icon: Cpu, tone: 'blue' },
  runs: { kind: 'db', at: [4, 0], tag: 'runs + leases', icon: ClipboardList },
});

/** The full pipeline: API → store ← schedulers → queue → workers → runs. */
const jsAll = [
  L('client', 'api', { arrow: 'both' }),
  L('api', 'store'),
  L('s1', 'store', { arrow: 'both' }),
  L('s2', 'store', { arrow: 'both' }),
  L('s1', 'q'),
  L('s2', 'q'),
  L('q', 'w1'),
  L('q', 'w2'),
  L('w1', 'runs'),
  L('w2', 'runs'),
];

export const qJobScheduler: Question = {
  id: 'q-job-scheduler',
  n: 29,
  title: 'Design a Distributed Job Scheduler',
  blurb: 'Fire millions of cron and delayed jobs on time: due-job indexes, leases, retries and the hourly herd.',
  minutes: 15,
  level: 'Advanced',
  concepts: ['Scheduling', 'Workers', 'Retries'],
  related: ['message-queues', 'consensus', 'timeouts-retries', 'sharding', 'observability'],
  followUps: [
    'What happens when a run takes longer than its cron interval?',
    'How do you make sure a daylight-saving change neither skips nor doubles a run?',
    'How would you let a tenant pause, backfill or rerun a day of missed jobs?',
    'Would you use Redis sorted sets instead of SQL for due jobs? What breaks?',
    'How do you stop one tenant’s million jobs from starving everyone else?',
  ],
  keywords: ['job scheduler', 'cron', 'delayed jobs', 'skip locked', 'lease', 'heartbeat', 'at-least-once', 'backoff', 'jitter', 'thundering herd'],
  metrics: [
    { id: 'jobs', label: 'Runs / day', icon: CalendarClock },
    { id: 'peak', label: 'Peak dispatch', icon: Gauge },
    { id: 'late', label: 'p99 lateness', icon: Timer },
    { id: 'conc', label: 'Concurrent', icon: Cpu },
  ],
  learn: [
    { text: 'Separating “when” from “do” with a ready queue', at: 3 },
    { text: 'Claiming due jobs with a sharded index', at: 4 },
    { text: 'Leases and heartbeats for crashed workers', at: 5 },
    { text: 'Retries with backoff, dead letters and DAGs', at: 6 },
    { text: 'Taming the top-of-the-hour herd with jitter', at: 8 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Run millions of jobs on time',
      tag: 'Requirements',
      body: [
        'Teams register **cron jobs** (`0 * * * *` in a time zone) and **one-off delayed jobs** (“send this reminder at 09:00”). The system triggers each run on time, executes it on a worker pool, retries failures and keeps run history.',
        'Targets: **10M registered jobs**, **50M runs/day**, start within **~5 s** of the scheduled time, **at-least-once** execution (never silently skipped) and highly available scheduling. Out of scope: sandboxing job code and sub-second precision.',
      ],
      scene: {
        nodes: js('client', ['api', { label: 'Jobs', sub: '?' }]),
        links: [L('client', 'api', { arrow: 'both' })],
        flows: [F(['client', 'api'], { ret: true, n: 2 })],
        notes: [
          { at: [0, -1], text: 'cron + one-off delayed jobs' },
          { at: [0, 0], text: '50M runs/day', icon: CalendarClock },
          { at: [0, 1], text: 'start within ~5 s', icon: Timer },
          { at: [0, 2], text: 'at-least-once, never skipped', tone: 'good' },
        ],
      },
      metrics: { jobs: '—', peak: '—', late: '—', conc: '—' },
    },
    {
      short: 'Numbers',
      title: 'Averages lie: the top of the hour',
      tag: 'Estimation',
      body: [
        '50M runs/day ÷ 86,400 s ≈ **580 runs/s** on average. But people love round times: if 20% of runs are hourly crons firing at `:00`, ~**400k runs** come due in the same second every hour — a spike hundreds of times the average.',
        'Storage is small: 10M jobs × ~1 KB = **10 GB**; run history 50M × 300 B ≈ 15 GB/day, ~**450 GB** for 30 days. If a run averages 20 s, steady state needs 580 × 20 ≈ **12k concurrent worker slots**.',
      ],
      callout: { kind: 'key', text: 'Design for the spike, not the average. The hourly burst, not 580/s, shapes the scheduler, queue and worker fleet.' },
      scene: {
        nodes: js('client', ['api', { label: 'Jobs', sub: '?', meter: 85 }]),
        links: [L('client', 'api', { arrow: 'both' })],
        flows: [F(['client', 'api'], { ret: true, n: 3 })],
        notes: [
          { at: [0, -1], text: '≈ 580 runs/s average' },
          { at: [0, 0], text: '~400k due at :00', tone: 'bad' },
          { at: [0, 1], text: '580 × 20 s ≈ 12k slots', icon: Cpu },
          { at: [0, 2], text: 'jobs 10 GB · runs 450 GB' },
        ],
      },
      metrics: { jobs: '50M', peak: '400k due', conc: '12k' },
    },
    {
      short: 'Model',
      title: 'Jobs, runs and the due index',
      tag: 'Data Model',
      body: [
        'API: `POST /jobs {cron | run_at, tz, target, payload, retry: {max: 5}}` → `job_id`; `DELETE /jobs/{id}`; `GET /jobs/{id}/runs`. A job is a definition; every execution is a separate **run** with its own status.',
        '`jobs(job_id PK, shard, cron, tz, next_run_at, enabled)` with an index on **`(shard, next_run_at)`** — the scheduler’s one hot query is “what is due in my shards?”. `runs(run_id PK, job_id, scheduled_at, attempt, status, lease_until, worker)`.',
      ],
      changes: [{ sign: '+', text: 'Job store with a due index' }],
      scene: {
        nodes: js('client', 'api', 'store'),
        links: [L('client', 'api', { arrow: 'both' }), L('api', 'store', { label: 'INSERT job' })],
        flows: [F(['client', 'api', 'store'], { kind: 'data', ret: true })],
        notes: [
          { at: [0.5, -1.5], text: 'index (shard, next_run_at)' },
          { at: [0.5, 1.5], text: 'cron + tz → next_run_at' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Schedulers, a queue, workers',
      tag: 'Design',
      body: [
        'The **API** writes job rows. **Schedulers** poll the store for due jobs and, in one transaction, insert a run row and advance `next_run_at`, then push the `run_id` onto a **ready queue**. **Workers** pull runs, execute them and record the outcome.',
        'Splitting “decide when” (schedulers) from “do the work” (workers) lets each scale on its own: a few schedulers can dispatch thousands of runs/s, while the worker pool grows and shrinks with queue depth.',
      ],
      changes: [{ sign: '+', text: 'Schedulers, ready queue, workers, run history' }],
      scene: {
        nodes: js('client', 'api', 'store', ['s1', { meter: 30 }], 's2', 'q', ['w1', { meter: 50 }], 'w2', 'runs'),
        links: jsAll,
        flows: [
          F(['s1', 'store'], { kind: 'data', ret: true, retKind: 'data' }),
          F(['s1', 'q', 'w1'], { kind: 'event', delay: 0.8 }),
          F(['w1', 'runs'], { kind: 'data', delay: 1.6 }),
          F(['client', 'api', 'store'], { kind: 'data', delay: 2 }),
        ],
      },
      metrics: { peak: '2k /s', late: '2 s' },
    },
    {
      short: 'Due jobs',
      title: 'Finding due jobs without double-firing',
      tag: 'Deep Dive',
      body: [
        'Hash `job_id` into **1,024 shards**; each scheduler leases a subset from etcd. Every second it runs `SELECT … WHERE shard IN (mine) AND next_run_at <= now() LIMIT 500 FOR UPDATE SKIP LOCKED`, inserts the runs, computes the next fire time and commits.',
        'Claiming and advancing `next_run_at` in one transaction means a job fires once per slot even if two schedulers briefly overlap. A single **leader-elected** scheduler is simpler but caps throughput. For tighter timing, preload the next minute into an in-memory **timing wheel**.',
      ],
      changes: [{ sign: '+', text: 'Coordinator handing out shard leases' }],
      scene: {
        nodes: js('store', 'coord', ['s1', { meter: 40 }], 's2', 'q', 'w1', 'w2', 'runs'),
        links: [
          L('coord', 's2', { label: 'shard leases' }),
          L('s1', 'store', { arrow: 'both' }),
          L('s2', 'store', { arrow: 'both' }),
          L('s1', 'q'),
          L('s2', 'q'),
          L('q', 'w1'),
          L('q', 'w2'),
        ],
        flows: [
          F(['coord', 's2'], { kind: 'data' }),
          F(['s1', 'store'], { kind: 'data', ret: true, retKind: 'data', delay: 0.4 }),
          F(['s2', 'store'], { kind: 'data', ret: true, retKind: 'data', delay: 1 }),
          F(['s1', 'q'], { kind: 'event', delay: 1.4 }),
        ],
        notes: [
          { at: [-7, -1], text: 'FOR UPDATE SKIP LOCKED' },
          { at: [-7, 2], text: 'claim + advance in 1 txn', tone: 'good' },
        ],
      },
    },
    {
      short: 'Leases',
      title: 'Leases: surviving crashed workers',
      tag: 'Deep Dive',
      body: [
        'A worker that takes a run sets `status=running, lease_until=now()+60s` and **heartbeats** every 20 s to extend it. If the worker dies, the heartbeats stop; a **reaper** in the scheduler finds expired leases and re-enqueues the run with `attempt+1`.',
        'So a run can execute twice — the “dead” worker may only have been slow. That is **at-least-once**: jobs must be **idempotent**, keyed by `run_id` (“already charged for run 981?”). The `attempt` number doubles as a fencing token for late writes.',
      ],
      callout: { kind: 'warn', text: 'Exactly-once execution of arbitrary side effects can’t be guaranteed. Promise at-least-once plus idempotency keys, and say so.' },
      changes: [{ sign: '-', text: 'A worker crashed mid-run' }, { sign: '+', text: 'Reaper re-enqueues expired leases' }],
      scene: {
        nodes: js('store', ['s1', { meter: 40 }], 'q', ['w1', { status: 'down', tone: 'rose' }], ['w2', { meter: 60 }], 'runs'),
        links: [
          L('s1', 'store', { arrow: 'both' }),
          L('s1', 'runs', { label: 'expired lease?' }),
          L('s1', 'q'),
          L('q', 'w2'),
          L('w1', 'runs', { dashed: true, tone: 'bad' }),
          L('w2', 'runs'),
        ],
        flows: [
          F(['w1', 'runs'], { kind: 'error', stop: true }),
          F(['s1', 'runs'], { kind: 'data', ret: true, retKind: 'data', delay: 0.6 }),
          F(['s1', 'q', 'w2'], { kind: 'event', delay: 1.4 }),
          F(['w2', 'runs'], { kind: 'data', delay: 2.2 }),
        ],
        notes: [
          { at: [-7, -1], text: 'heartbeat every 20 s' },
          { at: [-7, 2], text: 'idempotent by run_id', tone: 'good' },
        ],
      },
    },
    {
      short: 'Retries',
      title: 'Retries, backoff and dependencies',
      tag: 'Deep Dive',
      body: [
        'Failed runs retry with **exponential backoff plus jitter** (30 s, 1 m, 2 m… ±20%) up to `max` attempts, by setting a `next_attempt_at` — the same due-index machinery. Non-retryable errors and exhausted runs go to a **dead-letter** list that alerts the owner.',
        '**DAGs** (“run `report` after `extract` and `clean` succeed”) add a dependency table: a run starts `waiting` with a count of unfinished parents; each parent’s success decrements it, and at zero the run is enqueued. Airflow and similar engines build on this idea.',
      ],
      scene: {
        nodes: js('store', ['s1', { meter: 40 }], 's2', 'q', ['w1', { meter: 50 }], ['w2', { meter: 50 }], 'runs'),
        links: [
          L('s1', 'store', { arrow: 'both' }),
          L('s2', 'store', { arrow: 'both' }),
          L('s1', 'q'),
          L('s2', 'q'),
          L('q', 'w1'),
          L('q', 'w2'),
          L('w1', 'runs'),
          L('w2', 'runs', { tone: 'bad' }),
        ],
        flows: [
          F(['q', 'w2'], { kind: 'event' }),
          F(['w2', 'runs'], { kind: 'error', stop: true, delay: 0.7 }),
          F(['s1', 'q'], { kind: 'event', delay: 1.6 }),
          F(['q', 'w1'], { kind: 'event', delay: 2.1 }),
        ],
        notes: [
          { at: [-7, -1], text: 'retry 30 s · 1 m · 2 m ±20%' },
          { at: [-7, 2], text: 'max attempts → dead letter', tone: 'warn' },
        ],
      },
    },
    {
      short: 'Failover',
      title: 'Scheduler failover and late jobs',
      tag: 'Deep Dive',
      body: [
        'If Scheduler 1 dies, its **shard leases** in etcd expire within ~10 s and Scheduler 2 takes them. It simply queries those shards where `next_run_at` left off, so nothing is skipped — runs fire a few seconds late instead. The lease revision fences a stale owner.',
        'Measure what users feel: **lateness** = actual start − scheduled time, per shard and per tenant, plus queue depth and the oldest unclaimed due job. Alerting on p99 lateness > 30 s catches dead schedulers, slow queries and starved workers alike.',
      ],
      changes: [{ sign: '-', text: 'Scheduler 1 down' }, { sign: '~', text: 'Scheduler 2 owns all shards' }],
      scene: {
        nodes: js('store', 'coord', ['s1', { status: 'down', tone: 'rose' }], ['s2', { sub: 'shards A+B' }], 'q', 'w2', 'runs'),
        links: [
          L('coord', 's2', { label: 'shard leases' }),
          L('s1', 'store', { dashed: true, tone: 'bad' }),
          L('s2', 'store', { arrow: 'both' }),
          L('s2', 'q'),
          L('q', 'w2'),
          L('w2', 'runs'),
        ],
        flows: [
          F(['coord', 's2'], { kind: 'data' }),
          F(['s2', 'store'], { kind: 'data', ret: true, retKind: 'data', delay: 0.6 }),
          F(['s2', 'q', 'w2'], { kind: 'event', delay: 1.3 }),
          F(['w2', 'runs'], { kind: 'data', delay: 2 }),
        ],
        notes: [
          { at: [-7, -1], text: 'lateness = start − scheduled' },
          { at: [4, -2], text: 'alert: p99 late > 30 s', tone: 'warn' },
        ],
      },
      metrics: { late: '12 s' },
      bad: ['late'],
    },
    {
      short: 'Herd',
      title: 'The top-of-the-hour thundering herd',
      tag: 'Bottleneck',
      body: [
        'At `00:00` ~400k runs come due at once: the due query returns huge batches, the queue spikes, workers saturate, and downstream targets get hammered by thousands of identical jobs. p99 lateness jumps to minutes.',
        'Fixes: default to deterministic **jitter** — `0 * * * *` fires at `:00 + hash(job_id) % 60 s` unless a job opts into strict timing; **pre-fetch** the next minute’s due jobs; cap dispatch per tenant and target; **autoscale workers** ahead of the hour on queue depth.',
      ],
      callout: { kind: 'tip', text: 'Most hourly jobs don’t care whether they run at :00:00 or :00:37. Default jitter flattens the spike ~60× for free.' },
      scene: {
        nodes: js('client', 'api', 'store', ['s1', { meter: 85, status: 'hot' }], 's2', ['q', { items: 7 }], ['w1', { meter: 98, status: 'hot' }], ['w2', { meter: 95, status: 'hot' }], 'runs'),
        links: jsAll,
        flows: [
          F(['s1', 'q'], { kind: 'event', n: 4, speed: 1.6 }),
          F(['q', 'w1'], { kind: 'event', n: 3, delay: 0.4 }),
          F(['q', 'w2'], { kind: 'event', n: 3, delay: 0.6 }),
        ],
        notes: [
          { at: [-7, 1], text: '400k due at 00:00:00', tone: 'bad' },
          { at: [-7, 2], text: ':00 + hash(id) % 60 s', tone: 'good' },
        ],
      },
      metrics: { peak: '400k /s', late: '3 min' },
      bad: ['peak', 'late'],
    },
    {
      short: 'Recap',
      title: 'The whole scheduler',
      tag: 'Recap',
      body: [
        'Jobs live in a store with a **`(shard, next_run_at)` index**. **Sharded schedulers** claim due rows with `SKIP LOCKED`, create runs and feed a **ready queue**. Workers hold **leases** with heartbeats; a reaper retries the dead with **backoff**, so execution is at-least-once and jobs are idempotent.',
        'Jitter by default tames the hourly herd, and **p99 lateness** is the number you alert on.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'A scheduler is an index of due times plus leases. Claim atomically, run at-least-once, retry with jitter, and watch lateness.' },
      scene: {
        nodes: js('client', 'api', 'store', 'coord', ['s1', { meter: 40 }], 's2', 'q', ['w1', { meter: 55 }], 'w2', 'runs'),
        links: [...jsAll, L('coord', 's2')],
        flows: [
          F(['client', 'api', 'store'], { kind: 'data' }),
          F(['s1', 'q', 'w1'], { kind: 'event', delay: 0.7 }),
          F(['w1', 'runs'], { kind: 'data', delay: 1.5 }),
          F(['s2', 'q', 'w2'], { kind: 'event', delay: 1.9 }),
        ],
      },
      metrics: { jobs: '50M', peak: '7k /s', late: '4 s', conc: '12k' },
      hi: ['peak', 'late'],
    },
  ],
};
