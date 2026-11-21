import {
  Activity,
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Box,
  Car,
  Coins,
  Copy,
  CreditCard,
  Cpu,
  Database,
  FileText,
  Hourglass,
  KeyRound,
  Landmark,
  ListOrdered,
  Lock,
  MapPin,
  MemoryStick,
  Plug,
  Radar,
  Radio,
  RefreshCw,
  Route,
  Scale,
  ShieldCheck,
  Sigma,
  Store,
  Timer,
  TrendingUp,
  User,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import type { Question } from '../types';
import { cast, F, L } from '../lessons/kit';

/* ------------------------------------------------------------------ */
/* 13 · Design Uber                                                    */
/* ------------------------------------------------------------------ */

const ub = cast({
  rider: { kind: 'phone', at: [-7, -3.5], tag: 'rider', tagIcon: User },
  drivers: { kind: 'crowd', at: [-7, 3.5], tag: 'drivers', items: 5 },
  gw: { kind: 'cube', at: [-3.5, 0], label: 'Gateway', sub: 'WebSocket', icon: Radio, tone: 'green' },
  match: { kind: 'cube', at: [0, -3.5], label: 'Dispatch', sub: 'matching', icon: Radar, tone: 'blue' },
  loc: { kind: 'cube', at: [0, 3.5], label: 'Location', sub: 'geo index', icon: MapPin, tone: 'orange' },
  eta: { kind: 'cube', at: [3.5, -3.5], label: 'ETA', sub: 'road map', icon: Route, tone: 'blue', size: 'sm' },
  trip: { kind: 'cube', at: [3.5, 0], label: 'Trips', sub: 'state mach', icon: Car, tone: 'blue' },
  tripdb: { kind: 'db', at: [7, 0], tag: 'trips db', icon: Database },
  stream: { kind: 'queue', at: [3.5, 3.5], tag: 'location stream', items: 3 },
  price: { kind: 'cube', at: [7, 3.5], label: 'Price', sub: 'surge', icon: TrendingUp, tone: 'blue', size: 'sm' },
  loc2: { kind: 'cube', at: [-3.5, 4.5], label: 'Loc #2', sub: 'NYC', icon: MapPin, tone: 'orange', size: 'sm' },
});

const ubLinks = [
  L('rider', 'gw', { arrow: 'both' }),
  L('drivers', 'gw', { arrow: 'both' }),
  L('gw', 'loc'),
  L('gw', 'match', { arrow: 'both' }),
  L('match', 'loc', { arrow: 'both' }),
  L('match', 'eta', { arrow: 'both' }),
  L('match', 'trip'),
  L('trip', 'tripdb'),
  L('loc', 'stream'),
  L('stream', 'price'),
  L('price', 'trip', { dashed: true }),
];

export const qUber: Question = {
  id: 'q-uber',
  n: 13,
  title: 'Design Uber',
  blurb: 'Track a million moving cars in memory and match each rider to the right driver within seconds.',
  minutes: 14,
  level: 'Intermediate',
  concepts: ['Geospatial Indexing', 'Real-time'],
  related: ['realtime', 'sharding', 'indexes', 'pubsub'],
  followUps: [
    'How would you match riders who want to share a car (pooling)?',
    'How do you stop two dispatchers offering the same driver at once?',
    'How would you compute surge pricing per area every minute?',
    'What happens to an in-progress trip if its region fails?',
  ],
  keywords: ['uber', 'ride hailing', 'geohash', 'h3', 's2', 'driver location', 'dispatch', 'surge pricing', 'websocket', 'nearby search'],
  metrics: [
    { id: 'gps', label: 'GPS writes', icon: MapPin },
    { id: 'match', label: 'Time to match', icon: Timer },
    { id: 'lag', label: 'Map lag', icon: Radio },
    { id: 'mem', label: 'Index RAM', icon: MemoryStick },
  ],
  learn: [
    { text: 'Sizing a write-heavy location stream', at: 1 },
    { text: 'Geospatial indexing with geohash, S2 and H3 cells', at: 4 },
    { text: 'Dispatch: offer, time out, offer the next driver', at: 5 },
    { text: 'A trip state machine with conditional writes', at: 6 },
    { text: 'Partitioning by city and surviving hot cells', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Riders, drivers and a map',
      tag: 'Requirements',
      body: [
        'Scope it out loud: riders **request a ride** and see nearby cars; drivers go online and **stream GPS**; the system **matches** a driver, tracks the trip live and prices it. Assume **20M rides/day** and **1M drivers online** at peak across 600 cities.',
        'Non-functional: match within **10 s**, the car on the rider’s map lagging only **1–2 s**, and high availability. Positions may be slightly stale; trip state and fares must be **strongly consistent**. Out of scope: payments, ratings, driver onboarding.',
      ],
      scene: {
        nodes: ub('rider', 'drivers', ['gw', { label: 'Uber', sub: 'black box', tone: 'gray', icon: Box }]),
        links: [L('rider', 'gw', { arrow: 'both', label: 'request ride' }), L('drivers', 'gw', { arrow: 'both', label: 'GPS' })],
        flows: [F(['rider', 'gw'], { ret: true }), F(['drivers', 'gw'], { kind: 'data', n: 3, delay: 0.4 })],
        notes: [
          { at: [2.5, -3], text: 'Match a driver in < 10 s', icon: Timer },
          { at: [2.5, -1], text: 'Car on map lags ~1–2 s', icon: Radio },
          { at: [2.5, 1], text: 'Trips: strongly consistent', icon: Car },
          { at: [2.5, 3], text: 'Out: payments, ratings', tone: 'warn' },
        ],
      },
      metrics: { gps: '—', match: '—', lag: '—', mem: '—' },
    },
    {
      short: 'Numbers',
      title: 'The load is location pings',
      tag: 'Estimation',
      body: [
        '**GPS writes:** 1M drivers × one ping every 4 s = **250k writes/s**, ~100 bytes each. That dwarfs ride requests: 20M/day ≈ 230/s, maybe **2k/s** at a Friday-night peak.',
        '**Reads:** riders with the app open refresh nearby cars every few seconds — say **300k reads/s**. Latest positions: 1M × ~100 B ≈ **100 MB** of RAM. Ping history for disputes and ETA training: 250k/s × 100 B ≈ **2 TB/day**, written to cheap storage off the hot path.',
      ],
      callout: { kind: 'key', text: 'The write path is pings, not rides. Keep the latest position in memory and never touch a database per ping.' },
      scene: {
        nodes: ub('rider', 'drivers', ['gw', { label: 'Uber', sub: 'black box', tone: 'gray', icon: Box, meter: 70 }]),
        links: [L('rider', 'gw', { arrow: 'both' }), L('drivers', 'gw', { arrow: 'both' })],
        flows: [F(['drivers', 'gw'], { kind: 'data', n: 5, speed: 1.4 }), F(['rider', 'gw'], { ret: true, delay: 0.6 })],
        notes: [
          { at: [2.5, -3], text: '1M × 1 ping / 4 s = 250k/s', icon: MapPin },
          { at: [2.5, -1], text: 'Ride requests ≈ 2k/s peak', icon: Car },
          { at: [2.5, 1], text: 'Nearby reads ≈ 300k/s', icon: Radar },
          { at: [2.5, 3], text: 'Live positions ≈ 100 MB', icon: MemoryStick, tone: 'good' },
        ],
      },
      metrics: { gps: '250k /s', mem: '100 MB' },
    },
    {
      short: 'API',
      title: 'Sockets for pings, events for riders',
      tag: 'API',
      body: [
        'Drivers keep a **WebSocket** open and send `loc {lat, lng, heading, ts}` every 4 s. Riders call `POST /rides {pickup, dropoff}` → `{ride_id, fare_quote}`, then receive pushed events: `driver_assigned`, `driver_location`, `arrived`, `trip_ended`.',
        'Drivers answer offers with `offer_accept {offer_id}` or let them expire. Core state: in-memory `driver → (lat, lng, status, ts)` and `cell → {driver_ids}`; durable `trips(trip_id PK, rider_id, driver_id, state, fare, version)`, sharded by city.',
      ],
      changes: [{ sign: '~', text: 'Black box → WebSocket gateway' }],
      scene: {
        nodes: ub('rider', 'drivers', 'gw'),
        links: [L('rider', 'gw', { arrow: 'both', label: 'POST /rides' }), L('drivers', 'gw', { arrow: 'both', label: 'loc every 4 s' })],
        flows: [F(['rider', 'gw'], { ret: true, retKind: 'event' }), F(['drivers', 'gw'], { kind: 'data', n: 3, delay: 0.5 })],
        notes: [
          { at: [2.5, -3], text: '→ driver_assigned', icon: Car },
          { at: [2.5, -1], text: '→ driver_location (1/s)', icon: MapPin },
          { at: [2.5, 1], text: '← offer_accept {offer_id}', icon: User },
          { at: [2.5, 3], text: 'trips: PK trip_id, by city', icon: Database },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Location, dispatch and trips',
      tag: 'Design',
      body: [
        'Both apps connect through a **gateway** that holds the WebSockets. Pings go to the **location service**, which keeps every online driver in memory and also appends them to a **location stream** for history, ETA training and pricing.',
        'A ride request goes to **dispatch**: ask location for nearby idle drivers, rank them by **ETA** on the road graph (not straight-line distance), offer the ride, and hand the accepted match to the **trip service**, which persists every state change. **Pricing** reads the stream to set surge per area.',
      ],
      changes: [
        { sign: '+', text: 'Location service + stream' },
        { sign: '+', text: 'Dispatch and ETA' },
        { sign: '+', text: 'Trip service + store, pricing' },
      ],
      scene: {
        nodes: ub('rider', 'drivers', 'gw', ['match', { meter: 30 }], ['loc', { meter: 45 }], 'eta', 'trip', 'tripdb', 'stream', 'price'),
        links: ubLinks,
        flows: [
          F(['drivers', 'gw', 'loc', 'stream'], { kind: 'data', n: 3 }),
          F(['rider', 'gw', 'match', 'loc'], { ret: true, retKind: 'data', delay: 0.6 }),
          F(['match', 'eta'], { ret: true, delay: 1.4 }),
          F(['match', 'trip', 'tripdb'], { kind: 'data', delay: 2 }),
        ],
      },
      metrics: { match: '≈ 8 s' },
    },
    {
      short: 'Geo index',
      title: 'Finding drivers near a point',
      tag: 'Deep Dive',
      body: [
        'Scanning 1M drivers per request is hopeless, and a B-tree on lat or lng narrows only one axis. Cut the map into **cells** — geohash, Google **S2** or Uber’s hexagonal **H3** — and keep `cell → set of driver ids` in memory. A ping that crosses a border moves one id between two sets.',
        'To search, take the rider’s cell plus its **ring of neighbours** (a point near an edge has close drivers next door), filter candidates by exact distance and status, and widen the ring if too few. H3 resolution 8 gives cells of ~0.7 km², a handful of drivers each.',
      ],
      callout: { kind: 'tip', text: 'Shard the index by city or region: a query never needs drivers 500 km away, so each shard serves one area from RAM.' },
      scene: {
        nodes: ub('rider', 'drivers', 'gw', 'match', ['loc', { meter: 45 }]),
        links: [L('rider', 'gw', { arrow: 'both' }), L('drivers', 'gw'), L('gw', 'loc', { label: 'move cell' }), L('gw', 'match'), L('match', 'loc', { arrow: 'both', label: 'cell + ring' })],
        flows: [
          F(['drivers', 'gw', 'loc'], { kind: 'data', n: 4 }),
          F(['rider', 'gw', 'match', 'loc'], { ret: true, retKind: 'data', delay: 0.8 }),
        ],
        notes: [
          { at: [4, -1], text: 'cell 88a2… → {d17, d42}', icon: MapPin },
          { at: [4, 1], text: 'search = cell + 6 neighbours', icon: Radar },
          { at: [4, 3], text: 'move = remove + add, O(1)', tone: 'good' },
        ],
      },
    },
    {
      short: 'Matching',
      title: 'Offer, wait, offer the next',
      tag: 'Deep Dive',
      body: [
        'Dispatch ranks the ~10 nearest idle drivers by **ETA**, acceptance rate and heading, then **offers** the ride to the best one with a **15 s timeout**. Declined or expired? Offer the next. Meanwhile the driver is marked `offered`, so two riders can’t claim the same car.',
        'That reservation is a **conditional update** — `status = offered if status = idle` — on the one location shard that owns the driver, so it’s atomic without a distributed lock. Batching requests over 1–2 s lets dispatch solve a small **assignment problem** instead of greedy first-come matching.',
      ],
      scene: {
        nodes: ub('rider', ['drivers', { items: 4 }], 'gw', ['match', { meter: 50 }], 'loc', 'eta'),
        links: [
          L('rider', 'gw', { arrow: 'both' }),
          L('drivers', 'gw', { arrow: 'both' }),
          L('gw', 'match', { arrow: 'both', label: 'offer' }),
          L('match', 'loc', { arrow: 'both', label: 'idle → offered' }),
          L('match', 'eta', { arrow: 'both' }),
        ],
        flows: [
          F(['match', 'eta'], { ret: true, retKind: 'data' }),
          F(['match', 'gw', 'drivers'], { stop: true, delay: 0.8 }),
          F(['match', 'gw', 'drivers'], { ret: true, retKind: 'response', delay: 2.4 }),
          F(['gw', 'rider'], { kind: 'event', delay: 3.6 }),
        ],
        notes: [
          { at: [4, 0.5], text: 'offer #1 → expired (15 s)', tone: 'bad' },
          { at: [4, 2], text: 'offer #2 → accepted', tone: 'good' },
        ],
      },
      metrics: { match: '≈ 6 s' },
      hi: ['match'],
    },
    {
      short: 'Trip + live',
      title: 'Trip state and live updates',
      tag: 'Deep Dive',
      body: [
        'A trip moves through `requested → matched → arriving → in_progress → completed`, with `cancelled` reachable early. Each transition is a **conditional write** on the trip row (expected state + version), so a late retry can never drag a finished trip backwards.',
        'Riders see the car move because the gateway **pushes** each ping from the matched driver to the rider over the same WebSocket — a subscription keyed by `trip_id`, no polling. When the app is in the background, state changes fall back to **mobile push** (APNs/FCM).',
      ],
      scene: {
        nodes: ub('rider', 'drivers', 'gw', 'loc', ['trip', { meter: 35 }], 'tripdb'),
        links: [
          L('rider', 'gw', { arrow: 'both' }),
          L('drivers', 'gw', { arrow: 'both' }),
          L('gw', 'loc'),
          L('gw', 'trip', { arrow: 'both', label: 'state change' }),
          L('trip', 'tripdb', { label: 'if version = 7' }),
        ],
        flows: [
          F(['drivers', 'gw', 'rider'], { kind: 'data', n: 3 }),
          F(['gw', 'trip', 'tripdb'], { kind: 'request', ret: true, delay: 1 }),
          F(['gw', 'loc'], { kind: 'data', delay: 0.4 }),
        ],
        notes: [
          { at: [3.5, -3.5], text: 'matched → arriving → …', icon: Car },
          { at: [2.5, 3.5], text: 'push by trip_id, no polling', tone: 'good' },
        ],
      },
      metrics: { lag: '≈ 1 s' },
      hi: ['lag'],
    },
    {
      short: 'Bottleneck',
      title: 'Hot cells and lost shards',
      tag: 'Bottleneck',
      body: [
        'At 10×, a concert ending puts **thousands of riders and drivers in one cell**; that shard runs hot while others idle. Shard hot cities across several location nodes by finer cells, and let pricing’s **surge multiplier** damp demand and pull drivers in from nearby areas.',
        'Losing a location shard drops positions, but they’re **soft state**: drivers re-send within 4 s, so a replacement rebuilds from the next pings. Trips are the hard state — replicate them across zones and fail a city’s dispatch over to a nearby region.',
      ],
      changes: [{ sign: '+', text: 'Second location shard' }, { sign: '~', text: 'Shard by city and cell' }],
      scene: {
        nodes: ub(
          'rider',
          ['drivers', { items: 7 }],
          ['gw', { meter: 70 }],
          'match',
          ['loc', { meter: 95, status: 'hot', sub: 'SF' }],
          ['loc2', { meter: 25 }],
          'trip',
          'tripdb',
          'stream',
          ['price', { sub: 'surge×1.8' }],
        ),
        links: [
          L('rider', 'gw', { arrow: 'both' }),
          L('drivers', 'gw', { arrow: 'both' }),
          L('gw', 'loc', { tone: 'bad' }),
          L('gw', 'loc2'),
          L('gw', 'match', { arrow: 'both' }),
          L('match', 'loc', { arrow: 'both' }),
          L('match', 'trip'),
          L('trip', 'tripdb'),
          L('loc', 'stream'),
          L('stream', 'price'),
          L('price', 'trip', { dashed: true }),
        ],
        flows: [
          F(['drivers', 'gw', 'loc'], { kind: 'data', n: 5, speed: 1.4 }),
          F(['drivers', 'gw', 'loc2'], { kind: 'data', delay: 0.5 }),
          F(['loc', 'stream', 'price'], { kind: 'event', delay: 1 }),
        ],
        notes: [{ at: [4, -3.5], text: 'stadium: 1 cell, 8k pings/s', tone: 'bad' }],
      },
      metrics: { gps: '2.5M /s', mem: '1 GB' },
      bad: ['gps'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Name the dominant load (**250k GPS writes/s**) and keep it in memory, indexed by **geo cells**. Dispatch searches the rider’s cell and its neighbours, ranks by ETA, and **offers one driver at a time** with a timeout and an atomic reservation.',
        'Trips are a durable **state machine**; live positions flow back over **WebSockets**; a location stream feeds history, ETA and surge. Partition everything by city so each region scales and fails on its own.',
      ],
      callout: {
        kind: 'key',
        title: 'Takeaway',
        text: 'Separate soft, high-churn state (positions in RAM) from hard state (trips in a database), then scale and recover each its own way.',
      },
      scene: {
        nodes: ub('rider', 'drivers', 'gw', ['match', { meter: 40 }], ['loc', { meter: 50 }], 'eta', 'trip', 'tripdb', 'stream', 'price'),
        links: ubLinks,
        flows: [
          F(['drivers', 'gw', 'loc', 'stream', 'price'], { kind: 'data', n: 2 }),
          F(['rider', 'gw', 'match', 'loc'], { ret: true, retKind: 'data', delay: 0.6 }),
          F(['match', 'trip', 'tripdb'], { kind: 'data', delay: 1.6 }),
        ],
      },
      metrics: { gps: '250k /s', match: '≈ 6 s', lag: '≈ 1 s', mem: '100 MB' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 27 · Design a Payment System                                        */
/* ------------------------------------------------------------------ */

const pm = cast({
  buyer: { kind: 'device', at: [-7, 0], tag: 'shopper', tagIcon: User },
  merch: { kind: 'cube', at: [-3.5, 0], label: 'Merchant', sub: 'checkout', icon: Store, tone: 'sand' },
  vault: { kind: 'cube', at: [-3.5, -3.5], label: 'Vault', sub: 'tokenize', icon: KeyRound, tone: 'yellow', size: 'sm' },
  pay: { kind: 'cube', at: [0, 0], label: 'Payments', sub: 'service', icon: CreditCard, tone: 'blue' },
  paydb: { kind: 'db', at: [0, -4], tag: 'payments db', icon: Database },
  psp: { kind: 'cube', at: [3.5, 0], label: 'PSP', sub: 'acquirer', icon: Banknote, tone: 'gray' },
  psp2: { kind: 'cube', at: [3.5, -3.5], label: 'PSP #2', sub: 'fallback', icon: Banknote, tone: 'gray', size: 'sm' },
  net: { kind: 'slab', at: [7, -3.5], tag: 'card network', icon: Landmark, tone: 'gray' },
  ledger: { kind: 'db', at: [-3.5, 3.5], tag: 'ledger', icon: BookOpen },
  recon: { kind: 'cube', at: [3.5, 3.5], label: 'Recon', sub: 'daily job', icon: Scale, tone: 'blue' },
  stl: { kind: 'slab', at: [7, 3.5], tag: 'settlement file', icon: FileText, tone: 'gray' },
});

const pmCore = [
  L('buyer', 'vault', { label: 'card → tok_…' }),
  L('buyer', 'merch', { arrow: 'both' }),
  L('merch', 'pay', { arrow: 'both' }),
  L('pay', 'paydb', { arrow: 'both' }),
  L('pay', 'psp', { arrow: 'both' }),
  L('psp', 'net', { arrow: 'both' }),
  L('pay', 'ledger'),
];

export const qPayments: Question = {
  id: 'q-payments',
  n: 27,
  title: 'Design a Payment System',
  blurb: 'Charge cards through a PSP without ever double-charging, and prove every cent with a ledger.',
  minutes: 15,
  level: 'Advanced',
  concepts: ['Idempotency', 'Transactions'],
  related: ['transactions', 'timeouts-retries', 'message-queues', 'encryption'],
  followUps: [
    'How do you handle a chargeback that arrives weeks after capture?',
    'How do you deliver webhooks reliably to slow or failing merchants?',
    'How long do you keep idempotency keys, and where do you store them?',
    'What changes if you route payments across several PSPs?',
    'How would you add multi-currency payments with FX conversion?',
  ],
  keywords: ['payment system', 'idempotency key', 'psp', 'double-entry ledger', 'reconciliation', 'webhooks', 'pci', 'tokenization', 'exactly once', 'payment state machine'],
  metrics: [
    { id: 'tps', label: 'Payments', icon: CreditCard },
    { id: 'pending', label: 'Unknown outcomes', icon: Hourglass },
    { id: 'dup', label: 'Double charges', icon: Copy },
    { id: 'drift', label: 'Ledger drift', icon: Scale },
  ],
  learn: [
    { text: 'A double-entry ledger as the source of truth', at: 3 },
    { text: 'Tokenization to shrink PCI scope', at: 4 },
    { text: 'Idempotency keys from merchant to PSP', at: 5 },
    { text: 'Treating timeouts as unknown, not failed', at: 6 },
    { text: 'Daily reconciliation against settlement files', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Take money, exactly once',
      tag: 'Requirements',
      body: [
        'Merchants send us card payments; we charge them through an external **payment service provider (PSP)** and report the outcome. Functional: **authorize, capture, refund**, payment status and merchant webhooks. Assume **50M payments/day** across thousands of merchants.',
        'Correctness beats everything: **never charge twice**, never lose a payment, and keep an auditable record of every cent. Latency is dominated by the PSP (0.3–2 s) anyway. Out of scope: fraud models, merchant payouts, currency conversion.',
      ],
      scene: {
        nodes: pm('buyer', 'merch', ['pay', { sub: 'black box', tone: 'gray', icon: Box }]),
        links: [L('buyer', 'merch', { arrow: 'both' }), L('merch', 'pay', { arrow: 'both', label: 'charge $42' })],
        flows: [F(['buyer', 'merch', 'pay'], { ret: true })],
        notes: [
          { at: [4, -3], text: 'Authorize, capture, refund', icon: CreditCard },
          { at: [4, -1.5], text: 'Never charge twice', tone: 'warn' },
          { at: [4, 1.5], text: 'Every cent accounted for', icon: Scale },
          { at: [4, 3], text: 'Out: fraud ML, payouts', tone: 'warn' },
        ],
      },
      metrics: { tps: '—', pending: '—', dup: '—', drift: '—' },
    },
    {
      short: 'Numbers',
      title: 'Modest traffic, sharp edges',
      tag: 'Estimation',
      body: [
        '50M payments/day ÷ 86,400 ≈ **600/s** on average; holiday peaks run 5–10×, so plan for **5k/s**. A payment row plus its ledger entries and events is ~3 KB, so ~150 GB/day and **50 TB/year**, kept 7+ years for audits.',
        'PSP calls take 300 ms to 2 s, and a small fraction — say **0.1%** — time out with no answer. At 5k/s that is **5 payments every second** whose outcome we don’t know. That number, not raw throughput, shapes the design.',
      ],
      callout: { kind: 'key', text: 'Throughput is modest. The hard part is staying correct when a third party doesn’t answer.' },
      scene: {
        nodes: pm('buyer', 'merch', ['pay', { sub: 'black box', tone: 'gray', icon: Box, meter: 35 }]),
        links: [L('buyer', 'merch', { arrow: 'both' }), L('merch', 'pay', { arrow: 'both' })],
        flows: [F(['buyer', 'merch', 'pay'], { ret: true, n: 2 })],
        notes: [
          { at: [4, -3], text: '600/s avg · 5k/s peak', icon: CreditCard },
          { at: [4, -1.5], text: '~3 KB each → 50 TB/yr', icon: Database },
          { at: [4, 1.5], text: '0.1% PSP timeouts', icon: Hourglass, tone: 'bad' },
          { at: [4, 3], text: '= 5 unknown outcomes/s', tone: 'bad' },
        ],
      },
      metrics: { tps: '5k /s peak', pending: '5 /s' },
      bad: ['pending'],
    },
    {
      short: 'API',
      title: 'Every write carries a key',
      tag: 'API',
      body: [
        '`POST /payments` with header `Idempotency-Key: ord_981` and body `{amount: 4200, currency: "USD", payment_method: "tok_…", capture: false}` → `{id: "pay_7Hq", status: "authorized"}`. Amounts are **integer minor units** — never floats.',
        'Then `POST /payments/{id}/capture` and `POST /payments/{id}/refunds`, each with its own key, plus `GET /payments/{id}`. Outcomes also reach merchants as signed **webhooks** (`payment.captured`), retried with backoff until acknowledged.',
      ],
      scene: {
        nodes: pm('buyer', 'merch', 'pay'),
        links: [L('buyer', 'merch', { arrow: 'both' }), L('merch', 'pay', { arrow: 'both', label: 'POST /payments' })],
        flows: [F(['merch', 'pay'], { ret: true }), F(['pay', 'merch'], { kind: 'event', delay: 1.6 })],
        notes: [
          { at: [-3.5, -3], text: 'Idempotency-Key: ord_981', icon: KeyRound },
          { at: [4, -1.5], text: 'amount: 4200 (cents)', icon: Coins },
          { at: [4, 1.5], text: 'webhook: payment.captured', icon: Zap },
        ],
      },
    },
    {
      short: 'Data',
      title: 'State machine plus a ledger',
      tag: 'Data Model',
      body: [
        '`payments(id PK, merchant_id, idem_key, amount, currency, status, psp_ref, version)` with **UNIQUE(merchant_id, idem_key)**. Status follows a strict machine: `created → authorized → captured → refunded`, or `failed`, plus `unknown` while the PSP is silent. Illegal moves are rejected.',
        'Money lives in a **double-entry ledger**: `entries(txn_id, account, amount)` where each transaction’s entries **sum to zero** — debit `customer_receivable` 42.00, credit `merchant_payable` 41.00 and `fee_revenue` 1.00. Entries are append-only; corrections are new entries.',
      ],
      changes: [{ sign: '+', text: 'Payments table' }, { sign: '+', text: 'Double-entry ledger' }],
      scene: {
        nodes: pm('buyer', 'merch', 'pay', 'paydb', 'ledger'),
        links: [L('buyer', 'merch', { arrow: 'both' }), L('merch', 'pay', { arrow: 'both' }), L('pay', 'paydb', { arrow: 'both' }), L('pay', 'ledger', { label: 'post entries' })],
        flows: [F(['merch', 'pay', 'paydb'], { kind: 'data', ret: true }), F(['pay', 'ledger'], { kind: 'data', delay: 1 })],
        notes: [
          { at: [4, -4], text: 'created → authorized', icon: ListOrdered },
          { at: [4, -3], text: '→ captured → refunded' },
          { at: [4, 2.5], text: '−42.00 +41.00 +1.00 = 0', icon: Sigma, tone: 'good' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'The happy path, end to end',
      tag: 'Design',
      body: [
        'The shopper’s browser sends the card number straight to a **vault** (or PSP-hosted fields) and gets back a token, so our servers never see raw card data — that shrinks **PCI scope** to one hardened component. The merchant posts the token to the **payments service**.',
        'Payments writes the `created` row and calls the **PSP**, which asks the **card network** and the issuing bank to authorize. On success it records `authorized`, appends ledger entries and answers the merchant. Capture and refund follow the same path later.',
      ],
      changes: [{ sign: '+', text: 'Token vault' }, { sign: '+', text: 'PSP and card network' }],
      scene: {
        nodes: pm('buyer', 'merch', 'vault', ['pay', { meter: 30 }], 'paydb', 'psp', 'net', 'ledger'),
        links: pmCore,
        flows: [
          F(['buyer', 'vault'], { kind: 'data', ret: true, retKind: 'data' }),
          F(['buyer', 'merch', 'pay', 'psp', 'net'], { ret: true, delay: 1 }),
          F(['pay', 'paydb'], { kind: 'data', delay: 1.6 }),
          F(['pay', 'ledger'], { kind: 'data', delay: 3 }),
        ],
      },
    },
    {
      short: 'Idempotency',
      title: 'Idempotency keys, end to end',
      tag: 'Deep Dive',
      body: [
        'Networks drop responses, so merchants **retry**. The first request inserts the row under `UNIQUE(merchant_id, idem_key)` and stores the eventual response; a retry hits the constraint and gets the **saved response** instead of a second charge. Same key, different body → `422`.',
        'Pass it on: call the PSP with **our own key** derived from the payment (`pay_7Hq-auth-1`), so our retries are safe too. Write the state change, ledger entries and an **outbox** event in one transaction — exactly-once effects built from at-least-once delivery.',
      ],
      callout: { kind: 'warn', text: 'A key only helps if it is checked atomically with the write. “Read, then insert” races when two retries arrive together.' },
      scene: {
        nodes: pm('merch', 'pay', ['paydb', { meter: 30 }], 'psp', 'ledger'),
        links: [
          L('merch', 'pay', { arrow: 'both' }),
          L('pay', 'paydb', { arrow: 'both', label: 'UNIQUE key' }),
          L('pay', 'psp', { arrow: 'both' }),
          L('pay', 'ledger'),
        ],
        flows: [
          F(['merch', 'pay', 'paydb'], { ret: true }),
          F(['pay', 'psp'], { ret: true, delay: 1 }),
          F(['merch', 'pay'], { ret: true, delay: 2.4 }),
        ],
        notes: [
          { at: [-3.5, -3], text: 'retry → same response', tone: 'good' },
          { at: [4, -3], text: 'key: pay_7Hq-auth-1', icon: KeyRound },
          { at: [3.5, 3], text: 'row + entries + outbox: 1 tx', icon: Database },
        ],
      },
      metrics: { dup: '0' },
      hi: ['dup'],
    },
    {
      short: 'Unknown',
      title: 'When the PSP doesn’t answer',
      tag: 'Deep Dive',
      body: [
        'A timeout is not a failure — the card may have been charged. Mark the payment `unknown`, never `failed`, and tell the merchant `pending`. A **resolver** job asks the PSP for the charge by idempotency key and, if absent, retries with the **same key**, which the PSP de-duplicates.',
        'Many outcomes arrive asynchronously anyway: 3-D Secure, bank debits and disputes come as **PSP webhooks**. Verify the signature, store the raw event, ack fast, then apply it through the same state machine — duplicates and out-of-order events become no-ops.',
      ],
      scene: {
        nodes: pm('merch', ['pay', { status: 'hot', meter: 45 }], 'paydb', ['psp', { status: 'hot' }], 'ledger'),
        links: [
          L('merch', 'pay', { arrow: 'both' }),
          L('pay', 'paydb', { arrow: 'both' }),
          L('pay', 'psp', { arrow: 'both', label: 'status? same key' }),
          L('pay', 'ledger'),
        ],
        flows: [
          F(['pay', 'psp'], { stop: true }),
          F(['pay', 'psp'], { ret: true, retKind: 'data', delay: 1.4 }),
          F(['psp', 'pay', 'merch'], { kind: 'event', delay: 2.6 }),
        ],
        notes: [
          { at: [-3.5, -3], text: 'timeout ≠ failed', tone: 'bad' },
          { at: [4, -3], text: 'state: unknown → captured', icon: Hourglass },
          { at: [3.5, 3], text: 'webhook: verify, store, ack', icon: Zap },
        ],
      },
      metrics: { pending: 'resolved < 1 min' },
      hi: ['pending'],
    },
    {
      short: 'Reconcile',
      title: 'Daily reconciliation',
      tag: 'Deep Dive',
      body: [
        'Our ledger is the source of truth, but it must agree with the outside world. Each day the PSP publishes a **settlement file** listing every capture, refund, fee and chargeback. A **reconciliation job** matches each line to our records by `psp_ref` and amount.',
        'Mismatches land in buckets: missing on our side (a lost webhook — apply it), missing on theirs (investigate), or amount and fee differences. Each fix is a new, explained **ledger entry**; nothing is edited in place, so the books always show what happened and why.',
      ],
      callout: { kind: 'tip', text: 'Reconcile internally too: payments rows, ledger balances and outbox events should agree before you compare with the PSP.' },
      changes: [{ sign: '+', text: 'Settlement file' }, { sign: '+', text: 'Reconciliation job' }],
      scene: {
        nodes: pm('merch', 'pay', 'paydb', 'psp', 'net', 'ledger', 'recon', 'stl'),
        links: [
          L('merch', 'pay', { arrow: 'both' }),
          L('pay', 'paydb', { arrow: 'both' }),
          L('pay', 'psp', { arrow: 'both' }),
          L('psp', 'net', { arrow: 'both' }),
          L('pay', 'ledger'),
          L('psp', 'stl', { label: 'daily' }),
          L('stl', 'recon'),
          L('ledger', 'recon', { label: 'match psp_ref' }),
        ],
        flows: [
          F(['psp', 'stl', 'recon'], { kind: 'data' }),
          F(['ledger', 'recon'], { kind: 'data', delay: 0.6 }),
          F(['pay', 'ledger'], { kind: 'data', delay: 1.4 }),
        ],
        notes: [
          { at: [-6.5, -2.5], text: '99.98% matched', tone: 'good' },
          { at: [-6.5, -1.5], text: '3 lines → review', tone: 'warn' },
        ],
      },
      metrics: { drift: '0 ¢' },
      hi: ['drift'],
    },
    {
      short: 'Bottleneck',
      title: 'Peaks, PSP outages, hot shards',
      tag: 'Bottleneck',
      body: [
        'At 10× (a flash sale) the database holding payments and ledger is the limit. **Shard by merchant_id** so a payment, its key and its entries share one shard and one local transaction; split platform accounts like fees into per-shard sub-accounts summed later.',
        'A PSP outage is the bigger risk: **time out and circuit-break**, route new payments to a **second PSP**, but never retry a timed-out charge on a different PSP — that is exactly how customers get charged twice. Queue merchant webhooks so a slow merchant can’t stall workers.',
      ],
      changes: [{ sign: '+', text: 'Fallback PSP' }, { sign: '~', text: 'Shard by merchant_id' }],
      scene: {
        nodes: pm(
          'merch',
          ['pay', { meter: 80 }],
          ['paydb', { meter: 85, status: 'hot' }],
          ['psp', { status: 'down' }],
          'psp2',
          'net',
          ['ledger', { meter: 75 }],
        ),
        links: [
          L('merch', 'pay', { arrow: 'both' }),
          L('pay', 'paydb', { arrow: 'both' }),
          L('pay', 'psp', { tone: 'bad', dashed: true }),
          L('pay', 'psp2', { arrow: 'both' }),
          L('psp2', 'net', { arrow: 'both' }),
          L('pay', 'ledger'),
        ],
        flows: [
          F(['merch', 'pay', 'psp'], { kind: 'error', stop: true }),
          F(['merch', 'pay', 'psp2', 'net'], { ret: true, delay: 1 }),
          F(['pay', 'paydb'], { kind: 'data', n: 3, delay: 0.4 }),
        ],
        notes: [{ at: [5.5, 1.5], text: 'never re-route a timeout', tone: 'bad' }],
      },
      metrics: { tps: '50k /s' },
      bad: ['tps'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Tokenize cards at the edge to shrink PCI scope. Make every call **idempotent** — merchant to us, us to PSP — and drive each payment through an explicit **state machine** that treats timeouts as `unknown`, resolved by status queries, same-key retries and webhooks.',
        'Record money in an append-only **double-entry ledger**, written in the same transaction as the state change, and **reconcile** it daily against the PSP’s settlement files. Correctness first; throughput is the easy part.',
      ],
      callout: {
        kind: 'key',
        title: 'Takeaway',
        text: 'Payments are a correctness problem: idempotency for retries, a state machine for uncertainty, a ledger for truth, reconciliation for proof.',
      },
      scene: {
        nodes: pm('buyer', 'merch', 'vault', ['pay', { meter: 35 }], 'paydb', 'psp', 'net', 'ledger', 'recon', 'stl'),
        links: [...pmCore, L('psp', 'stl'), L('stl', 'recon'), L('ledger', 'recon')],
        flows: [
          F(['buyer', 'merch', 'pay', 'psp', 'net'], { ret: true }),
          F(['pay', 'ledger', 'recon'], { kind: 'data', delay: 1 }),
          F(['psp', 'stl', 'recon'], { kind: 'data', delay: 1.8 }),
        ],
      },
      metrics: { tps: '5k /s peak', pending: 'resolved < 1 min', dup: '0', drift: '0 ¢' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 28 · Design a Stock Trading System                                  */
/* ------------------------------------------------------------------ */

const tr = cast({
  traders: { kind: 'crowd', at: [-7, 0], tag: 'brokers', items: 5 },
  gw: { kind: 'cube', at: [-3.5, 0], label: 'Gateway', sub: 'FIX/binary', icon: Plug, tone: 'green' },
  risk: { kind: 'cube', at: [-3.5, -4], label: 'Risk', sub: 'limits', icon: ShieldCheck, tone: 'yellow', size: 'sm' },
  seq: { kind: 'cube', at: [0, 0], label: 'Sequencer', sub: 'total order', icon: ListOrdered, tone: 'yellow', size: 'lg' },
  journal: { kind: 'db', at: [0, 4], tag: 'journal', icon: Database },
  standby: { kind: 'cube', at: [-3.5, 4], label: 'Standby', sub: 'replays', icon: Copy, tone: 'blue' },
  engA: { kind: 'cube', at: [3.5, -3.5], label: 'Engine', sub: 'AAPL·MSFT', icon: Cpu, tone: 'blue' },
  engB: { kind: 'cube', at: [3.5, 3.5], label: 'Engine', sub: 'TSLA·NVDA', icon: Cpu, tone: 'blue' },
  md: { kind: 'cube', at: [7, 0], label: 'Mkt data', sub: 'multicast', icon: Radio, tone: 'teal' },
});

const trLinks = [
  L('traders', 'gw', { arrow: 'both' }),
  L('gw', 'risk', { arrow: 'both' }),
  L('gw', 'seq'),
  L('seq', 'journal'),
  L('journal', 'standby', { dashed: true }),
  L('seq', 'engA'),
  L('seq', 'engB'),
  L('engA', 'md'),
  L('engB', 'md'),
];

export const qTrading: Question = {
  id: 'q-trading',
  n: 28,
  title: 'Design a Stock Trading System',
  blurb: 'Match a million orders a second fairly, in microseconds, and recover without losing a single fill.',
  minutes: 15,
  level: 'Advanced',
  concepts: ['Ordering', 'Consistency', 'Latency'],
  related: ['latency-throughput', 'sharding', 'replication', 'pubsub'],
  followUps: [
    'How would you run an opening auction instead of continuous matching?',
    'How do you make the sequencer itself highly available?',
    'How would you add stop orders or iceberg orders to the book?',
    'How do you give every broker fair, equal-latency access?',
  ],
  keywords: ['stock exchange', 'matching engine', 'order book', 'sequencer', 'price-time priority', 'event sourcing', 'market data', 'low latency', 'lmax disruptor', 'fix protocol'],
  metrics: [
    { id: 'rate', label: 'Orders in', icon: Activity },
    { id: 'lat', label: 'Match p99', icon: Timer },
    { id: 'fail', label: 'Failover', icon: RefreshCw },
    { id: 'loss', label: 'Lost orders', icon: Lock },
  ],
  learn: [
    { text: 'A sequencer for one total order', at: 4 },
    { text: 'Price-time priority in a single-threaded book', at: 5 },
    { text: 'Microsecond techniques: no locks, batching, pinning', at: 6 },
    { text: 'Event sourcing and deterministic replay', at: 7 },
    { text: 'Partitioning by symbol; multicast market data', at: 8 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'An exchange in one paragraph',
      tag: 'Requirements',
      body: [
        'Brokers send **limit and market orders** and cancels for listed stocks; the exchange matches buyers with sellers, confirms fills to both sides and publishes **market data** — trades and the order book — to everyone. Assume **10k symbols** and a few hundred connected brokers.',
        'Non-functional: **fairness** (strict arrival order), **determinism** (same inputs, same trades), **latency** of tens of microseconds inside the matcher, and no lost or duplicated orders. Out of scope: clearing, settlement and the brokers’ own systems.',
      ],
      scene: {
        nodes: tr('traders', ['seq', { label: 'Exchange', sub: 'black box', tone: 'gray', icon: Landmark }]),
        links: [L('traders', 'seq', { arrow: 'both', label: 'orders · fills' })],
        flows: [F(['traders', 'seq'], { ret: true, n: 2 })],
        notes: [
          { at: [4.5, -3], text: 'Limit + market orders', icon: ListOrdered },
          { at: [4.5, -1.5], text: 'First come, first filled', icon: Users },
          { at: [4.5, 1.5], text: 'Match in microseconds', icon: Timer },
          { at: [4.5, 3], text: 'Out: clearing, settlement', tone: 'warn' },
        ],
      },
      metrics: { rate: '—', lat: '—', fail: '—', loss: '—' },
    },
    {
      short: 'Numbers',
      title: 'A million messages a second',
      tag: 'Estimation',
      body: [
        'Peak inflow ≈ **1M messages/s** across the exchange — mostly new orders and cancels; only a few percent ever trade. Activity is skewed: the hottest symbol sees **~50k/s** around the open while thousands of names see a handful.',
        'Journal: 1M/s × ~100 B ≈ **100 MB/s**, a few hundred GB per trading day — easy as sequential writes. Latency budget: **under 100 µs** gateway to ack, so one fsync or one extra network round trip per order already blows it.',
      ],
      callout: { kind: 'key', text: 'At microsecond budgets every lock, allocation and syscall shows up. The architecture is shaped around avoiding them.' },
      scene: {
        nodes: tr('traders', ['seq', { label: 'Exchange', sub: 'black box', tone: 'gray', icon: Landmark, meter: 70 }]),
        links: [L('traders', 'seq', { arrow: 'both' })],
        flows: [F(['traders', 'seq'], { ret: true, n: 5, speed: 1.6 })],
        notes: [
          { at: [4.5, -3], text: 'Peak 1M msgs/s', icon: Activity },
          { at: [4.5, -1.5], text: 'Hottest symbol ~50k/s', tone: 'warn' },
          { at: [4.5, 1.5], text: 'Journal ≈ 100 MB/s', icon: Database },
          { at: [4.5, 3], text: 'Budget: < 100 µs', icon: Timer },
        ],
      },
      metrics: { rate: '1M /s', lat: 'goal 100 µs' },
    },
    {
      short: 'API',
      title: 'Orders in, executions out',
      tag: 'API',
      body: [
        'Brokers speak **FIX** or a compact binary protocol over long-lived TCP sessions: `NewOrder{clOrdId, symbol, side, qty, price, type, tif}`, `Cancel{origClOrdId}`, `Replace{…}`. Every reply is an `ExecReport`: `ack`, `partial_fill`, `fill`, `cancelled` or `rejected`.',
        'Each session message carries a **sequence number**, so a reconnecting broker can say “resend from 4,812” and nothing is lost or doubled. Market data goes out separately as `Trade` and `BookUpdate{symbol, side, price, size}`, with its own feed sequence numbers.',
      ],
      changes: [{ sign: '+', text: 'Order gateway' }],
      scene: {
        nodes: tr('traders', 'gw', ['seq', { label: 'Exchange', sub: 'core', tone: 'gray', icon: Landmark }]),
        links: [L('traders', 'gw', { arrow: 'both', label: 'NewOrder' }), L('gw', 'seq', { arrow: 'both' })],
        flows: [F(['traders', 'gw', 'seq'], { ret: true, retKind: 'response' }), F(['traders', 'gw'], { kind: 'request', delay: 1.2, ret: true })],
        notes: [
          { at: [4.5, -3], text: 'ExecReport: fill 300 @ 100.03', icon: Zap },
          { at: [4.5, -1.5], text: 'session seq: 4,812', icon: ListOrdered },
          { at: [4.5, 1.5], text: 'BookUpdate · Trade', icon: Radio },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Gateway → sequencer → engines',
      tag: 'Design',
      body: [
        '**Gateways** terminate sessions and run cheap **pre-trade risk checks** — credit limits, fat-finger price bands — against an in-memory risk cache. Accepted orders go to the **sequencer**, which stamps each with a global sequence number and appends it to a replicated **journal**.',
        'The sequenced stream feeds **matching engines**, each owning a set of symbols. Engines send executions back through the gateways and book changes to the **market-data** publisher, which multicasts them. A **standby** replays the same journal to stay warm.',
      ],
      changes: [
        { sign: '+', text: 'Risk checks' },
        { sign: '+', text: 'Sequencer + journal' },
        { sign: '+', text: 'Engines, market data, standby' },
      ],
      scene: {
        nodes: tr('traders', 'gw', 'risk', ['seq', { meter: 40 }], 'journal', 'standby', 'engA', 'engB', 'md'),
        links: trLinks,
        flows: [
          F(['traders', 'gw', 'risk'], { ret: true }),
          F(['gw', 'seq', 'engA', 'md'], { kind: 'request', delay: 0.8 }),
          F(['seq', 'journal', 'standby'], { kind: 'data', delay: 1.2 }),
          F(['seq', 'engB', 'md'], { kind: 'event', delay: 1.8 }),
        ],
      },
    },
    {
      short: 'Sequencer',
      title: 'One total order for every order',
      tag: 'Deep Dive',
      body: [
        'Fairness needs one answer to “who was first?”. The **sequencer** is a single writer: it gives every inbound message a monotonically increasing number and persists it to the **journal**, replicated to a second machine, before anything downstream acts.',
        'Every component then processes the stream in sequence order, so the whole system is a **pure function of the journal**. Ordering, replication and recovery become “replay a log”. The sequencer is the throughput ceiling, so it does nothing else — no parsing, no business logic.',
      ],
      callout: { kind: 'tip', text: 'Batch journal writes: group a few microseconds of messages into one replicated write instead of syncing each order.' },
      scene: {
        nodes: tr('traders', 'gw', ['seq', { meter: 55 }], 'journal', 'engA', 'engB'),
        links: [
          L('traders', 'gw', { arrow: 'both' }),
          L('gw', 'seq'),
          L('seq', 'journal', { label: 'append' }),
          L('seq', 'engA'),
          L('seq', 'engB'),
        ],
        flows: [
          F(['traders', 'gw', 'seq', 'journal'], { kind: 'data', n: 3 }),
          F(['seq', 'engA'], { kind: 'event', delay: 0.8 }),
          F(['seq', 'engB'], { kind: 'event', delay: 1.2 }),
        ],
        notes: [
          { at: [-4.5, -3.5], text: '#1,048,576 BUY AAPL', icon: ListOrdered },
          { at: [-4.5, -2.5], text: '#1,048,577 SELL TSLA' },
          { at: [6, 0], text: 'state = f(journal)', tone: 'good' },
        ],
      },
    },
    {
      short: 'Matching',
      title: 'Price-time priority in one thread',
      tag: 'Deep Dive',
      body: [
        'Each symbol has an **order book**: bids sorted high→low, asks low→high, each price level a FIFO queue. A buy at 100.03 fills against the best asks while their price ≤ 100.03, oldest first (**price-time priority**); any remainder rests. A map from order id gives O(1) cancels.',
        'The engine is **single-threaded** and fully in memory: no locks, no contention, deterministic output. Scale by **partitioning by symbol** — orders for different stocks never interact, so AAPL’s book never needs to see TSLA’s orders.',
      ],
      callout: { kind: 'key', text: 'Partition by the unit that never needs cross-talk. For an exchange that is the symbol: each book is a perfect single-writer shard.' },
      scene: {
        nodes: tr('gw', 'seq', ['engA', { meter: 40 }], ['engB', { meter: 25 }], 'md'),
        links: [L('gw', 'seq'), L('seq', 'engA', { label: 'AAPL orders' }), L('seq', 'engB'), L('engA', 'md', { label: 'trade' }), L('engB', 'md')],
        flows: [
          F(['gw', 'seq', 'engA', 'md'], { kind: 'request' }),
          F(['seq', 'engB', 'md'], { kind: 'event', delay: 1 }),
        ],
        notes: [
          { at: [7.2, -5], text: 'ask 100.04 × 300', tone: 'bad' },
          { at: [7.2, -4], text: 'ask 100.03 × 500', tone: 'bad' },
          { at: [7.2, -3], text: 'bid 100.01 × 800', tone: 'good' },
          { at: [-3.5, 3], text: 'BUY 300 @ 100.03 → fill', icon: Zap },
        ],
      },
    },
    {
      short: 'Latency',
      title: 'Shaving microseconds',
      tag: 'Deep Dive',
      body: [
        'Keep everything **in memory** and keep locks, allocations and syscalls off the hot path. Stages pass messages through **lock-free ring buffers** (the LMAX Disruptor pattern), each thread **pinned to a core**, with object pools instead of garbage-collected allocations.',
        '**Batch** where it’s free: the journal flushes groups of messages, market data packs several updates per packet. At the edge, **kernel-bypass** NICs and UDP multicast cut more. Watch p99 and p99.9, not averages — one GC pause is a fairness bug.',
      ],
      scene: {
        nodes: tr('traders', 'gw', 'risk', ['seq', { meter: 45 }], 'journal', ['engA', { meter: 40 }], ['engB', { meter: 25 }], 'md'),
        links: trLinks.filter((l) => l.to !== 'standby'),
        flows: [
          F(['traders', 'gw', 'seq', 'engA', 'md'], { n: 4, speed: 2 }),
          F(['seq', 'journal'], { kind: 'data', n: 2, speed: 2, delay: 0.3 }),
          F(['seq', 'engB', 'md'], { kind: 'event', n: 2, speed: 2, delay: 0.6 }),
        ],
        notes: [
          { at: [-3.5, 3], text: 'ring buffer · no locks', icon: Cpu, tone: 'good' },
          { at: [7, -3], text: 'p99 ≈ 40 µs', icon: Timer, tone: 'good' },
        ],
      },
      metrics: { lat: '≈ 40 µs' },
      hi: ['lat'],
    },
    {
      short: 'Recovery',
      title: 'Replay the journal, fail over fast',
      tag: 'Deep Dive',
      body: [
        'Engines are deterministic and the journal holds every input in order, so the books are **event-sourced**: replaying from the start rebuilds exactly the same state. Periodic **snapshots** (“book as of #9,000,000”) bound replay time to seconds.',
        'A **hot standby** consumes the same journal in lockstep and holds identical books. If the primary dies, the standby applies the last few sequence numbers and takes over in **milliseconds**; brokers resend anything unacknowledged by session sequence number. Nothing is lost or matched twice.',
      ],
      callout: { kind: 'warn', text: 'Determinism is fragile: no wall-clock reads, random numbers or hash-map iteration order in matching — take time from the sequenced message.' },
      changes: [{ sign: '~', text: 'Standby takes over engine A' }],
      scene: {
        nodes: tr('gw', 'seq', 'journal', ['standby', { meter: 40, status: 'hot' }], ['engA', { status: 'down' }], 'engB', 'md'),
        links: [
          L('gw', 'seq'),
          L('seq', 'journal'),
          L('journal', 'standby', { label: 'replay' }),
          L('seq', 'engA', { tone: 'bad', dashed: true }),
          L('seq', 'engB'),
          L('engB', 'md'),
        ],
        flows: [
          F(['seq', 'journal', 'standby'], { kind: 'data', n: 3 }),
          F(['seq', 'engA'], { kind: 'error', stop: true, delay: 0.6 }),
          F(['seq', 'engB', 'md'], { kind: 'event', delay: 1.2 }),
        ],
        notes: [{ at: [-6, -3], text: 'snapshot @ #9,000,000', icon: Database }],
      },
      metrics: { fail: '≈ 5 ms', loss: '0' },
      hi: ['fail', 'loss'],
    },
    {
      short: 'Bottleneck',
      title: 'Opening bell and feed storms',
      tag: 'Bottleneck',
      body: [
        'At 10×, the busiest symbols at the **open** saturate their engine while others idle — move hot symbols onto dedicated engines and cores. If one global sequencer tops out, run a **sequencer per symbol partition**: order is then total per partition, which is all fairness needs.',
        'Market data is the other cliff: one order can trigger many book updates to thousands of subscribers. **Multicast** with per-feed sequence numbers lets clients detect gaps and fetch a **snapshot** from a recovery service instead of asking the publisher to resend to each.',
      ],
      scene: {
        nodes: tr(
          'traders',
          ['gw', { meter: 75 }],
          'risk',
          ['seq', { meter: 90, status: 'hot' }],
          'journal',
          'standby',
          ['engA', { meter: 95, status: 'hot', sub: 'AAPL only' }],
          ['engB', { meter: 30 }],
          ['md', { meter: 85 }],
        ),
        links: trLinks,
        flows: [
          F(['traders', 'gw', 'seq', 'engA', 'md'], { n: 5, speed: 1.6 }),
          F(['seq', 'journal', 'standby'], { kind: 'data', delay: 0.5 }),
          F(['seq', 'engB', 'md'], { kind: 'event', delay: 1 }),
        ],
      },
      metrics: { rate: '10M /s' },
      bad: ['rate'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Gateways check risk; a **single sequencer** places every order in one total order and a replicated **journal** records it. **Single-threaded, in-memory matching engines**, partitioned by symbol, apply price-time priority with no locks.',
        'Because engines are deterministic, the journal is the system: **replay** rebuilds state, a **hot standby** stays in lockstep, and multicast market data with sequence numbers lets anyone recover from gaps.',
      ],
      callout: {
        kind: 'key',
        title: 'Takeaway',
        text: 'Make the system a deterministic function of an ordered log; ordering, replication and recovery then reduce to writing and replaying it.',
      },
      scene: {
        nodes: tr('traders', 'gw', 'risk', ['seq', { meter: 45 }], 'journal', 'standby', ['engA', { meter: 40 }], ['engB', { meter: 30 }], 'md'),
        links: trLinks,
        flows: [
          F(['traders', 'gw', 'seq', 'engA', 'md'], { n: 2 }),
          F(['seq', 'journal', 'standby'], { kind: 'data', delay: 0.6 }),
          F(['seq', 'engB', 'md'], { kind: 'event', delay: 1.2 }),
        ],
      },
      metrics: { rate: '1M /s', lat: '≈ 40 µs', fail: '≈ 5 ms', loss: '0' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 37 · Design a Distributed Wallet                                    */
/* ------------------------------------------------------------------ */

const wl = cast({
  alice: { kind: 'phone', at: [-7, -3.5], tag: 'Alice', tagIcon: User },
  bob: { kind: 'phone', at: [-7, 3.5], tag: 'Bob', tagIcon: User },
  api: { kind: 'cube', at: [-3.5, 0], label: 'Wallet', sub: 'API', icon: Wallet, tone: 'green' },
  psp: { kind: 'cube', at: [-3.5, -4], label: 'PSP', sub: 'top-ups', icon: Banknote, tone: 'gray', size: 'sm' },
  xfer: { kind: 'cube', at: [0, 0], label: 'Transfer', sub: 'state mach', icon: ArrowLeftRight, tone: 'blue' },
  xferdb: { kind: 'db', at: [0, -4], tag: 'transfers', icon: Database },
  shardA: { kind: 'db', at: [3.5, -3.5], tag: 'ledger A', icon: BookOpen },
  shardB: { kind: 'db', at: [3.5, 3.5], tag: 'ledger B', icon: BookOpen },
  audit: { kind: 'cube', at: [3.5, 0], label: 'Audit', sub: 'Σ = 0', icon: Sigma, tone: 'yellow' },
  events: { kind: 'queue', at: [7, 0], tag: 'ledger events', items: 3 },
});

const wlLinks = [
  L('alice', 'api', { arrow: 'both' }),
  L('bob', 'api', { arrow: 'both' }),
  L('api', 'psp', { arrow: 'both' }),
  L('api', 'xfer', { arrow: 'both' }),
  L('xfer', 'xferdb', { arrow: 'both' }),
  L('xfer', 'shardA', { arrow: 'both' }),
  L('xfer', 'shardB', { arrow: 'both' }),
  L('shardA', 'events'),
  L('shardB', 'events'),
];

export const qWallet: Question = {
  id: 'q-wallet',
  n: 37,
  title: 'Design a Distributed Wallet',
  blurb: 'Move money between 100M accounts atomically, never overdraw, and prove the books always balance.',
  minutes: 15,
  level: 'Advanced',
  concepts: ['Atomicity', 'Ledger', 'Consistency'],
  related: ['transactions', 'sagas', 'sharding', 'replication'],
  followUps: [
    'How would you support several currencies in one wallet?',
    'How do you show consistent history while transfers are in flight?',
    'How would you move an account to another shard without downtime?',
    'How would you add scheduled or recurring transfers?',
  ],
  keywords: ['wallet', 'ledger', 'double-entry', 'balance', 'p2p transfer', 'saga', 'overdraft', 'idempotency', 'hot account', 'invariant'],
  metrics: [
    { id: 'tps', label: 'Transfers', icon: ArrowLeftRight },
    { id: 'p99', label: 'Transfer p99', icon: Timer },
    { id: 'over', label: 'Overdrafts', icon: Lock },
    { id: 'drift', label: 'Σ entries', icon: Sigma },
  ],
  learn: [
    { text: 'Deriving balances from a double-entry ledger', at: 2 },
    { text: 'Overdraft-proof conditional debits', at: 4 },
    { text: 'Cross-shard transfers as a saga with reservations', at: 5 },
    { text: 'Idempotent steps from client to ledger', at: 6 },
    { text: 'Continuous invariant checks for auditability', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Balances inside a payments app',
      tag: 'Requirements',
      body: [
        'An in-app wallet: users **top up** from a card or bank, **send money** to each other instantly, and see their **balance and history**. This is the internal ledger and balance store — the card side (PSPs, settlement) is the Payment System question. Assume **100M accounts**.',
        'Non-functional: a transfer is **atomic** — both sides move or neither does; **no overdrafts**, even under concurrent spends; retries never double-send; every balance is **explainable** from history. A correct “try again” beats a wrong balance. Out of scope: FX, card rails, KYC.',
      ],
      scene: {
        nodes: wl('alice', 'bob', ['api', { sub: 'black box', tone: 'gray', icon: Box }]),
        links: [L('alice', 'api', { arrow: 'both', label: 'send $50' }), L('bob', 'api', { arrow: 'both' })],
        flows: [F(['alice', 'api', 'bob'], { kind: 'request' }), F(['bob', 'api'], { ret: true, delay: 1.4 })],
        notes: [
          { at: [3, -3], text: 'Top up · send · balance', icon: Wallet },
          { at: [3, -1], text: 'Both sides move, or neither', icon: ArrowLeftRight },
          { at: [3, 1], text: 'No overdraft, ever', tone: 'warn' },
          { at: [3, 3], text: 'Out: FX, card rails, KYC', tone: 'warn' },
        ],
      },
      metrics: { tps: '—', p99: '—', over: '—', drift: '—' },
    },
    {
      short: 'Numbers',
      title: 'Small volume, sharp skew',
      tag: 'Estimation',
      body: [
        '100M accounts and 20M transfers/day ≈ **230/s**, with payday and festival peaks around **3k/s**. Balance and history reads run ~10× higher, **30k/s**, served from replicas or a cache where a slightly stale view is fine.',
        'Each transfer writes one transfer row and **two ledger entries** (more with fees) — ~500 B, so ~10 GB/day and ~4 TB/year, kept forever. Skew matters more than volume: a big merchant may receive **thousands of credits per second** into one account.',
      ],
      callout: { kind: 'key', text: 'Volume is modest. The hard problems are atomicity across accounts and accounts that are far hotter than the rest.' },
      scene: {
        nodes: wl('alice', 'bob', ['api', { sub: 'black box', tone: 'gray', icon: Box, meter: 30 }]),
        links: [L('alice', 'api', { arrow: 'both' }), L('bob', 'api', { arrow: 'both' })],
        flows: [F(['alice', 'api', 'bob'], { kind: 'request', n: 2 }), F(['bob', 'api'], { ret: true, n: 2, delay: 0.6 })],
        notes: [
          { at: [3, -3], text: '230/s avg · 3k/s peak', icon: ArrowLeftRight },
          { at: [3, -1], text: 'Reads ≈ 30k/s', icon: Wallet },
          { at: [3, 1], text: '2 entries × 20M/day', icon: BookOpen },
          { at: [3, 3], text: 'Hot merchant: 1k+ credits/s', tone: 'bad' },
        ],
      },
      metrics: { tps: '3k /s peak' },
    },
    {
      short: 'Data',
      title: 'Accounts, entries, transfers',
      tag: 'Data Model',
      body: [
        '`entries(entry_id, txn_id, account_id, amount, created_at)` is the append-only **double-entry ledger**: a transfer posts −50 to Alice and +50 to Bob, and every `txn_id` sums to zero. `accounts(id, balance, version)` caches the running sum, updated in the **same transaction** as the entries.',
        '`transfers(id, idem_key UNIQUE, from, to, amount, state)` tracks the operation. API: `POST /transfers {idempotency_key, to, amount}` → `{transfer_id, state}`, `GET /accounts/{id}/balance`, `GET /accounts/{id}/entries?cursor=`.',
      ],
      changes: [{ sign: '+', text: 'Transfer service + table' }, { sign: '+', text: 'Ledger store' }],
      scene: {
        nodes: wl('alice', 'bob', 'api', 'xfer', 'xferdb', ['shardA', { tag: 'ledger' }]),
        links: [
          L('alice', 'api', { arrow: 'both', label: 'POST /transfers' }),
          L('bob', 'api', { arrow: 'both' }),
          L('api', 'xfer', { arrow: 'both' }),
          L('xfer', 'xferdb', { arrow: 'both' }),
          L('xfer', 'shardA', { arrow: 'both' }),
        ],
        flows: [
          F(['alice', 'api', 'xfer', 'xferdb'], { ret: true }),
          F(['xfer', 'shardA'], { kind: 'data', ret: true, delay: 1.2 }),
        ],
        notes: [
          { at: [5.5, 0], text: 'Alice −50 · Bob +50 = 0', icon: Sigma, tone: 'good' },
          { at: [3, 3], text: 'balance = Σ entries', icon: BookOpen },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Ledger shards behind transfers',
      tag: 'Design',
      body: [
        'The **wallet API** authenticates and forwards to the **transfer service**, which records the transfer and posts entries to the **ledger**. The ledger is **sharded by account_id**: each shard holds its accounts’ balances and entries, so one account’s history lives in one place.',
        'Top-ups arrive from the **PSP** as confirmed payments and post `+amount` against a `psp_clearing` account. Every committed entry is also published to a **ledger events** stream (via an outbox) for history views, notifications and audits.',
      ],
      changes: [{ sign: '+', text: 'Ledger shards A and B' }, { sign: '+', text: 'PSP top-ups' }, { sign: '+', text: 'Ledger event stream' }],
      scene: {
        nodes: wl('alice', 'bob', 'api', 'psp', ['xfer', { meter: 30 }], 'xferdb', 'shardA', 'shardB', 'events'),
        links: wlLinks,
        flows: [
          F(['alice', 'api', 'xfer', 'shardA', 'events'], { kind: 'request' }),
          F(['xfer', 'shardB', 'events'], { kind: 'data', delay: 1 }),
          F(['api', 'psp'], { ret: true, retKind: 'data', delay: 1.8 }),
        ],
      },
    },
    {
      short: 'One shard',
      title: 'Same shard: one transaction',
      tag: 'Deep Dive',
      body: [
        'If Alice and Bob share a shard, a transfer is one ACID transaction: insert both entries and `UPDATE accounts SET balance = balance − 50, version = version + 1 WHERE id = alice AND balance >= 50`. Zero rows updated means **insufficient funds** — roll back.',
        'That **conditional update** is the overdraft guard: two concurrent spends may both pass an app-level check, but only one can satisfy `balance >= 50` at commit. An optimistic `version` check works too; never “read balance, decide, write” without one.',
      ],
      callout: { kind: 'warn', text: 'Check-then-act across two statements is a race. Put the check inside the write — a condition, a version or a row lock.' },
      scene: {
        nodes: wl('alice', 'bob', 'api', ['xfer', { meter: 35 }], ['shardA', { meter: 40, tag: 'ledger A: both' }]),
        links: [
          L('alice', 'api', { arrow: 'both' }),
          L('bob', 'api', { arrow: 'both' }),
          L('api', 'xfer', { arrow: 'both' }),
          L('xfer', 'shardA', { arrow: 'both', label: 'one tx' }),
        ],
        flows: [
          F(['alice', 'api', 'xfer', 'shardA'], { ret: true }),
          F(['xfer', 'shardA'], { kind: 'error', stop: true, delay: 1.2 }),
        ],
        notes: [
          { at: [6.5, -1.5], text: 'WHERE balance >= 50', icon: Lock },
          { at: [3, 2.5], text: '2nd spend → 0 rows', tone: 'bad' },
        ],
      },
      metrics: { over: '0' },
      hi: ['over'],
    },
    {
      short: 'Two shards',
      title: 'Across shards: reserve, then credit',
      tag: 'Deep Dive',
      body: [
        'Alice on shard A, Bob on B: no local transaction spans both. Model the transfer as a **state machine**: `created → debited → credited → completed`. Step 1 on A moves 50 from Alice into an **in-flight account** — a reservation she can no longer spend. Step 2 on B credits Bob from in-flight.',
        'Each step is a local, balanced transaction, keyed by `transfer_id`, and the state is saved before moving on, so a crash resumes where it stopped. If step 2 can’t succeed, **compensate** by returning the reservation. That is a **saga**; 2PC would hold locks on both shards across round trips.',
      ],
      scene: {
        nodes: wl('api', ['xfer', { meter: 45 }], 'xferdb', 'shardA', 'shardB'),
        links: [
          L('api', 'xfer', { arrow: 'both' }),
          L('xfer', 'xferdb', { arrow: 'both' }),
          L('xfer', 'shardA', { arrow: 'both', label: '1 · debit' }),
          L('xfer', 'shardB', { arrow: 'both', label: '2 · credit' }),
        ],
        flows: [
          F(['api', 'xfer', 'shardA'], { kind: 'request', ret: true }),
          F(['xfer', 'xferdb'], { kind: 'data', delay: 1.2 }),
          F(['xfer', 'shardB'], { kind: 'request', ret: true, delay: 1.8 }),
        ],
        notes: [
          { at: [6.5, -3.5], text: 'A: Alice −50, in-flight +50', icon: BookOpen },
          { at: [6.5, 3.5], text: 'B: in-flight −50, Bob +50', icon: BookOpen },
          { at: [-4, 3], text: 'fail → refund the hold', tone: 'warn' },
        ],
      },
      metrics: { p99: '≈ 40 ms' },
    },
    {
      short: 'Idempotency',
      title: 'Retries without double-sends',
      tag: 'Deep Dive',
      body: [
        'Phones retry on flaky networks. `POST /transfers` takes a client-generated **idempotency key**; the transfer row is inserted under `UNIQUE(idem_key)` and the first response saved. A retry finds the row and gets the same answer — `pending` or `completed` — instead of sending twice.',
        'Inside, the idea repeats: ledger entries carry `(transfer_id, step)` under a **unique constraint**, so a resumed saga re-posting step 1 is a no-op. Outbox events are delivered at least once and consumers dedupe by `entry_id` — exactly-once **effects** from at-least-once delivery.',
      ],
      scene: {
        nodes: wl('alice', 'api', 'xfer', ['xferdb', { meter: 30 }], 'shardA', 'shardB'),
        links: [
          L('alice', 'api', { arrow: 'both' }),
          L('api', 'xfer', { arrow: 'both' }),
          L('xfer', 'xferdb', { arrow: 'both', label: 'UNIQUE key' }),
          L('xfer', 'shardA', { arrow: 'both' }),
          L('xfer', 'shardB', { arrow: 'both' }),
        ],
        flows: [
          F(['alice', 'api', 'xfer', 'xferdb'], { ret: true }),
          F(['alice', 'api', 'xfer', 'xferdb'], { ret: true, delay: 1.6 }),
          F(['xfer', 'shardA'], { kind: 'data', ret: true, delay: 0.8 }),
        ],
        notes: [
          { at: [-3.5, 3], text: 'retry → same transfer_id', tone: 'good' },
          { at: [6.5, -1.5], text: 'UNIQUE(transfer_id, step)', icon: KeyRound },
        ],
      },
      metrics: { over: '0' },
    },
    {
      short: 'Audit',
      title: 'Proving the books balance',
      tag: 'Deep Dive',
      body: [
        'Money is never created inside the wallet, so invariants hold: **Σ all entries = 0**, and customer balances equal funds held at the bank. An **audit** consumer folds the ledger event stream and checks this continuously, per shard and globally.',
        'It also recomputes each balance from its entries, compares with the cached `balance`, and flags transfers stuck in `debited`. Because entries are **append-only** and never edited, any discrepancy traces back to the exact transaction that caused it — that is **auditability**.',
      ],
      callout: { kind: 'tip', text: 'Mid-saga money sits in in-flight accounts, so the global sum balances at every instant, not just at night.' },
      changes: [{ sign: '+', text: 'Audit consumer' }],
      scene: {
        nodes: wl('api', 'xfer', 'xferdb', 'shardA', 'shardB', ['audit', { tone: 'green' }], 'events'),
        links: [
          L('api', 'xfer', { arrow: 'both' }),
          L('xfer', 'xferdb', { arrow: 'both' }),
          L('xfer', 'shardA', { arrow: 'both' }),
          L('xfer', 'shardB', { arrow: 'both' }),
          L('shardA', 'events'),
          L('shardB', 'events'),
          L('events', 'audit', { label: 'fold' }),
        ],
        flows: [
          F(['shardA', 'events', 'audit'], { kind: 'data', n: 2 }),
          F(['shardB', 'events', 'audit'], { kind: 'data', delay: 0.8 }),
          F(['api', 'xfer', 'shardA'], { kind: 'request', delay: 1.4 }),
        ],
        notes: [
          { at: [7, -3], text: 'Σ entries = 0 ✓', tone: 'good' },
          { at: [7, 3], text: 'stuck in debited: 0', icon: Hourglass },
        ],
      },
      metrics: { drift: '0' },
      hi: ['drift'],
    },
    {
      short: 'Bottleneck',
      title: 'Hot accounts and shard loss',
      tag: 'Bottleneck',
      body: [
        'At 10×, a popular merchant receiving **5k credits/s** turns its row into a lock hotspot. Split it into **N sub-accounts** (credit a random one, sum on read), or append credits without touching the balance row and **batch-apply** them every few hundred ms. Debits stay strict; credits can be lazy.',
        'A shard failover must not lose committed entries: use **synchronous replication** or consensus inside each shard, and let sagas pause and resume while a shard is down. Never fix a stuck transfer by editing balances — post a compensating entry.',
      ],
      changes: [{ sign: '~', text: 'Hot account → sub-accounts' }],
      scene: {
        nodes: wl(
          'alice',
          'bob',
          ['api', { meter: 70 }],
          'psp',
          ['xfer', { meter: 75 }],
          'xferdb',
          ['shardA', { meter: 95, status: 'hot', tag: 'merchant: hot' }],
          ['shardB', { meter: 30 }],
          'audit',
          'events',
        ),
        links: [...wlLinks, L('events', 'audit')],
        flows: [
          F(['alice', 'api', 'xfer', 'shardA'], { n: 5, speed: 1.5 }),
          F(['bob', 'api', 'xfer', 'shardB'], { delay: 0.6 }),
          F(['shardA', 'events', 'audit'], { kind: 'data', delay: 1 }),
        ],
      },
      metrics: { tps: '30k /s', p99: '≈ 300 ms' },
      bad: ['tps', 'p99'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Balances are derived from an append-only **double-entry ledger** and cached in a row updated in the same transaction. Same-shard transfers are one ACID transaction with a **conditional debit**; cross-shard transfers are a **saga** with a reservation and a compensation.',
        '**Idempotency keys** and unique step ids make every retry harmless, and a continuous **audit** proves Σ entries = 0. Unlike the payment system, nothing here talks to card networks — it is about keeping internal money exact.',
      ],
      callout: {
        kind: 'key',
        title: 'Takeaway',
        text: 'Never store a balance you can’t re-derive. The ledger is the truth; balances, events and audits are views of it.',
      },
      scene: {
        nodes: wl('alice', 'bob', 'api', 'psp', ['xfer', { meter: 35 }], 'xferdb', 'shardA', 'shardB', 'audit', 'events'),
        links: [...wlLinks, L('events', 'audit')],
        flows: [
          F(['alice', 'api', 'xfer', 'shardA', 'events', 'audit'], { kind: 'request' }),
          F(['xfer', 'shardB', 'events'], { kind: 'data', delay: 1 }),
          F(['api', 'xfer', 'xferdb'], { ret: true, delay: 1.8 }),
        ],
      },
      metrics: { tps: '3k /s peak', p99: '≈ 40 ms', over: '0', drift: '0' },
    },
  ],
};
