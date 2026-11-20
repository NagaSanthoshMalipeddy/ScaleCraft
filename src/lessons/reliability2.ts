import {
  Activity,
  Archive,
  ChartGantt,
  CreditCard,
  Database,
  DatabaseBackup,
  HeartPulse,
  LayoutDashboard,
  Package,
  ScrollText,
  Search,
  Server,
  ShieldCheck,
  ShoppingCart,
  Siren,
  Split,
  Tag,
  Timer,
  TriangleAlert,
  Users,
} from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* Redundancy & failover                                                */
/* ------------------------------------------------------------------ */

const rd = cast({
  users: { kind: 'crowd', at: [-6, 0], tag: 'shoppers', tagIcon: Users, items: 6 },
  lbA: { kind: 'cube', at: [-3, -2], label: 'LB', sub: 'zone A', icon: Split, tone: 'green' },
  lbB: { kind: 'cube', at: [-3, 2], label: 'LB', sub: 'zone B', icon: Split, tone: 'green' },
  appA: { kind: 'cube', at: [1, -2], label: 'App', sub: 'zone A', icon: Server, tone: 'blue' },
  appB: { kind: 'cube', at: [1, 2], label: 'App', sub: 'zone B', icon: Server, tone: 'blue' },
  dbA: { kind: 'db', at: [5, -2], tag: 'primary', icon: Database },
  dbB: { kind: 'db', at: [5, 2], tag: 'standby', icon: Database },
  backup: { kind: 'slab', at: [5, 6], tag: 'backups · other region', icon: Archive, tone: 'sand' },
});

const zones = [
  { at: [-1, -4.3] as [number, number], text: 'Zone A' },
  { at: [-1, 4.3] as [number, number], text: 'Zone B' },
];

const twoZoneLinks = [
  L('users', 'lbA', { elbow: false }),
  L('users', 'lbB', { elbow: false }),
  L('lbA', 'appA'),
  L('lbA', 'appB'),
  L('lbB', 'appA'),
  L('lbB', 'appB'),
  L('appA', 'dbA'),
  L('appB', 'dbA'),
  L('dbA', 'dbB', { dashed: true }),
];

const healthy = [
  F(['users', 'lbA', 'appA', 'dbA'], { ret: true }),
  F(['users', 'lbB', 'appB', 'dbA'], { ret: true, delay: 0.8 }),
  F(['dbA', 'dbB'], { kind: 'data', delay: 1.6 }),
];

export const redundancy: Lesson = {
  id: 'redundancy',
  title: 'Redundancy & Failover',
  blurb: 'Find every box whose death takes you down, give it a twin, and make switching over automatic.',
  minutes: 11,
  level: 'Intermediate',
  keywords: ['redundancy', 'failover', 'single point of failure', 'spof', 'n+1', 'active-passive', 'availability zone', 'rto', 'rpo', 'backup'],
  metrics: [
    { id: 'spof', label: 'Single points', icon: TriangleAlert },
    { id: 'uptime', label: 'Availability', icon: Activity },
    { id: 'rto', label: 'RTO', icon: Timer },
    { id: 'rpo', label: 'RPO', icon: DatabaseBackup },
  ],
  learn: [
    { text: 'Auditing a stack for single points of failure', at: 0 },
    { text: 'N+1 capacity', at: 1 },
    { text: 'Active-active vs. active-passive', at: 2 },
    { text: 'Health checks, automatic failover, RTO and RPO', at: 5 },
    { text: 'Why backups aren’t redundancy', at: 6 },
  ],
  steps: [
    {
      short: 'SPOFs',
      title: 'One of everything',
      tag: 'Problem',
      body: [
        'A shop runs one load balancer, one app server and one database, all in one data centre. A routine kernel patch reboots the app server and **every** shopper gets errors for 25 minutes.',
        'Audit the diagram: each box is a **single point of failure** (SPOF). So is the building they share.',
      ],
      scene: {
        nodes: rd('users', 'lbA', ['appA', { status: 'down', tone: 'rose' }], 'dbA'),
        links: [L('users', 'lbA', { elbow: false }), L('lbA', 'appA', { tone: 'bad' }), L('appA', 'dbA')],
        flows: [F(['users', 'lbA'], { ret: true, retKind: 'error', n: 3 }), F(['lbA', 'appA'], { stop: true, delay: 0.5 })],
        notes: [{ at: [3, 1.2], text: 'every box is a SPOF', tone: 'bad' }],
      },
      metrics: { spof: '4', uptime: '99.5%', rto: '2 h', rpo: '24 h' },
      bad: ['spof'],
    },
    {
      short: 'N+1',
      title: 'Always one spare: N+1',
      tag: 'Technique',
      body: [
        'If peak traffic needs **N** servers, run **N+1**, so losing any one still leaves enough capacity. Here N is 1, so we add a second app server behind the balancer.',
        'The balancer’s health checks notice App A is gone and send everything to App B. Shoppers see nothing.',
      ],
      callout: { kind: 'tip', text: 'Large fleets often run N+2: one instance can be down for a deploy while another fails unexpectedly.' },
      changes: [{ sign: '+', text: 'Second app server' }],
      scene: {
        nodes: rd('users', 'lbA', ['appA', { status: 'down', tone: 'rose' }], ['appB', { meter: 70 }], 'dbA'),
        links: [L('users', 'lbA', { elbow: false }), L('lbA', 'appA', { dashed: true, tone: 'bad' }), L('lbA', 'appB'), L('appB', 'dbA')],
        flows: [F(['users', 'lbA', 'appB', 'dbA'], { ret: true, n: 2 }), F(['lbA', 'appA'], { kind: 'handshake', stop: true, delay: 0.4 })],
      },
      metrics: { spof: '3', uptime: '99.8%' },
      hi: ['spof', 'uptime'],
    },
    {
      short: 'Act / pass.',
      title: 'Twins that work, twins that wait',
      tag: 'Trade-off',
      body: [
        '**Active-active**: both copies serve traffic, like the two app servers. All capacity is used, and a failure just means less of it — but shared state must be handled carefully.',
        '**Active-passive**: a standby mirrors the primary and waits, like this database replica and spare balancer. Simpler for stateful parts, but you pay for idle hardware and a switchover.',
      ],
      changes: [{ sign: '+', text: 'Standby balancer' }, { sign: '+', text: 'Standby database' }],
      scene: {
        nodes: rd('users', 'lbA', ['lbB', { sub: 'standby', status: 'dim' }], ['appA', { meter: 40 }], ['appB', { meter: 40 }], 'dbA', ['dbB', { status: 'dim' }]),
        links: [
          L('users', 'lbA', { elbow: false }),
          L('lbA', 'lbB', { dashed: true, arrow: 'both', label: 'heartbeat' }),
          L('lbA', 'appA'),
          L('lbA', 'appB'),
          L('appA', 'dbA'),
          L('appB', 'dbA'),
          L('dbA', 'dbB', { dashed: true }),
        ],
        flows: [
          F(['users', 'lbA', 'appA', 'dbA'], { ret: true }),
          F(['users', 'lbA', 'appB', 'dbA'], { ret: true, delay: 0.8 }),
          F(['lbA', 'lbB'], { kind: 'handshake', ret: true, retKind: 'handshake', delay: 0.3 }),
          F(['dbA', 'dbB'], { kind: 'data', delay: 1.4 }),
        ],
        notes: [{ at: [7.3, 0], text: 'replicating', tone: 'ink' }],
      },
      metrics: { spof: '1', rto: '10 min', rpo: '< 1 s' },
      hi: ['spof', 'rto', 'rpo'],
    },
    {
      short: 'Zones',
      title: 'Don’t keep both twins in one building',
      tag: 'Technique',
      body: [
        'Copies in the same rack die together when its power or switch fails. Spread them across **availability zones**: separate buildings with their own power and network, ~1–2 ms apart — close enough for synchronous replication.',
        'For disasters that take out a whole **region**, add another one hundreds of km away. Replication there is asynchronous, and costs and complexity jump.',
      ],
      changes: [{ sign: '~', text: 'Each half in its own zone' }, { sign: '~', text: 'Both balancers active' }],
      scene: {
        nodes: rd('users', 'lbA', 'lbB', ['appA', { meter: 40 }], ['appB', { meter: 40 }], 'dbA', 'dbB'),
        links: twoZoneLinks,
        flows: healthy,
        notes: zones.map((z) => ({ ...z, tone: 'ink' as const })),
      },
      metrics: { spof: '0', uptime: '99.95%' },
      hi: ['spof', 'uptime'],
    },
    {
      short: 'Failover',
      title: 'Zone A goes dark',
      tag: 'Technique',
      body: [
        'A cooling failure takes out zone A. **Health checks** fail three times in a row (~15 s), so DNS and the balancers stop sending traffic there.',
        'The database standby is **promoted** to primary, and the old primary is **fenced** off so it can never accept writes again — two primaries (split brain) would corrupt data. Shoppers see a short blip.',
      ],
      callout: { kind: 'warn', text: 'Failover you have never exercised is failover that doesn’t work. Practise it regularly in production hours.' },
      changes: [{ sign: '-', text: 'Zone A' }, { sign: '~', text: 'Standby promoted to primary' }],
      scene: {
        nodes: rd(
          'users',
          ['lbA', { status: 'down' }],
          ['lbB', { meter: 60 }],
          ['appA', { status: 'down' }],
          ['appB', { meter: 80 }],
          ['dbA', { status: 'down', tag: 'old primary' }],
          ['dbB', { tag: 'new primary' }],
        ),
        links: [L('users', 'lbA', { elbow: false, dashed: true, tone: 'bad' }), L('users', 'lbB', { elbow: false }), L('lbB', 'appB'), L('appB', 'dbB')],
        flows: [F(['users', 'lbA'], { kind: 'handshake', stop: true }), F(['users', 'lbB', 'appB', 'dbB'], { ret: true, n: 2, delay: 0.6 })],
        notes: [{ at: [-4, -4.3], text: 'health ✗ ✗ ✗ → out', icon: HeartPulse, tone: 'bad' }, ...zones.slice(1).map((z) => ({ ...z, tone: 'good' as const }))],
      },
      metrics: { rto: '40 s', rpo: '0' },
      hi: ['rto', 'rpo'],
    },
    {
      short: 'RTO & RPO',
      title: 'How long down, how much lost?',
      tag: 'Insight',
      body: [
        '**RTO** (recovery time objective): how long you may be down. **RPO** (recovery point objective): how much recent data you may lose, measured in time.',
        'Nightly backups alone mean an RPO of up to 24 h; async replicas, seconds; synchronous replicas, zero — but every write waits for the other zone. Set targets per system: payments need RPO 0, analytics can lose an hour.',
      ],
      callout: { kind: 'key', text: 'Agree RTO and RPO with the business first. They decide how much redundancy is worth paying for.' },
      scene: {
        nodes: rd('users', 'lbA', 'lbB', ['appA', { meter: 40 }], ['appB', { meter: 40 }], 'dbA', 'dbB'),
        links: twoZoneLinks,
        flows: healthy,
        notes: [
          { at: [-4, -4.3], text: 'RTO: time to recover', icon: Timer },
          { at: [-4, 4.3], text: 'RPO: data you can lose', icon: DatabaseBackup },
        ],
      },
    },
    {
      short: 'Backups',
      title: 'Replication copies mistakes too',
      tag: 'Case',
      body: [
        'A migration runs `DELETE FROM orders` with no `WHERE`. Within milliseconds, replication faithfully deletes the rows in zone B as well. Redundancy protects against dead machines, not bad writes, bugs or ransomware.',
        'Keep **backups**: snapshots plus logs for point-in-time recovery, stored in another account and region. And **test restores** on a schedule — the time a restore takes is your real RTO.',
      ],
      callout: { kind: 'warn', text: 'A backup you have never restored is a hope, not a plan.' },
      changes: [{ sign: '+', text: 'Off-site, point-in-time backups' }],
      scene: {
        nodes: rd('users', 'lbA', 'lbB', ['appA', { meter: 40 }], ['appB', { meter: 40 }], ['dbA', { status: 'hot', tone: 'rose' }], ['dbB', { status: 'hot', tone: 'rose' }], 'backup'),
        links: [...twoZoneLinks.slice(0, 8), L('dbA', 'dbB', { dashed: true, tone: 'bad' }), L('dbB', 'backup', { arrow: 'both' })],
        flows: [F(['appA', 'dbA'], { kind: 'error' }), F(['dbA', 'dbB'], { kind: 'error', delay: 0.6 }), F(['backup', 'dbB'], { kind: 'data', n: 3, delay: 1.6 })],
        notes: [
          { at: [7.5, -2], text: 'orders: 0 rows', tone: 'bad' },
          { at: [1.5, 6], text: 'restore to 14:01', icon: DatabaseBackup, tone: 'good' },
        ],
      },
    },
    {
      short: 'Recap',
      title: 'Redundancy, summed up',
      tag: 'Recap',
      body: [
        'Hunt down **single points of failure**, keep **N+1** capacity, run stateless tiers active-active and stateful ones active-passive, and spread copies across **zones**.',
        'Let **health checks** trigger failover automatically, set **RTO/RPO** targets per system, and keep tested, off-site backups for the failures replication copies.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Everything fails eventually. Design so that any one thing failing is a non-event — then prove it by breaking things on purpose.' },
      scene: {
        nodes: rd('users', 'lbA', 'lbB', ['appA', { meter: 40 }], ['appB', { meter: 40 }], 'dbA', 'dbB', 'backup'),
        links: [...twoZoneLinks, L('dbB', 'backup')],
        flows: [...healthy, F(['dbB', 'backup'], { kind: 'data', delay: 2.2 })],
        notes: zones.map((z) => ({ ...z, tone: 'ink' as const })),
      },
      metrics: { spof: '0', uptime: '99.95%', rto: '40 s', rpo: '0' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Observability                                                        */
/* ------------------------------------------------------------------ */

const ob = cast({
  users: { kind: 'crowd', at: [-6.5, 0], tag: 'shoppers', tagIcon: Users, items: 5 },
  checkout: { kind: 'cube', at: [-3, 0], label: 'Checkout', icon: ShoppingCart, tone: 'blue' },
  pay: { kind: 'cube', at: [1, -4], label: 'Payments', icon: CreditCard, tone: 'blue' },
  stock: { kind: 'cube', at: [1, 0], label: 'Stock', sub: 'inventory', icon: Package, tone: 'blue' },
  pricing: { kind: 'cube', at: [1, 4], label: 'Pricing', sub: 'promos', icon: Tag, tone: 'blue' },
  db: { kind: 'db', at: [5, 0], tag: 'stock db', icon: Database },
  obs: { kind: 'slab', at: [-3, -4.5], tag: 'dashboards', icon: LayoutDashboard, tone: 'sand' },
  oncall: { kind: 'phone', at: [-6.5, -4.5], tag: 'on-call' },
});

const obLinks = [L('users', 'checkout'), L('checkout', 'pay'), L('checkout', 'stock'), L('checkout', 'pricing'), L('stock', 'db')];
const obFlows = [
  F(['users', 'checkout', 'pay'], { ret: true }),
  F(['checkout', 'stock', 'db'], { ret: true, delay: 0.5 }),
  F(['checkout', 'pricing'], { ret: true, delay: 1 }),
];

export const observability: Lesson = {
  id: 'observability',
  title: 'Observability',
  blurb: 'Metrics, logs and traces: how to find out why production is slow without guessing.',
  minutes: 10,
  level: 'Intermediate',
  keywords: ['observability', 'monitoring', 'metrics', 'logs', 'tracing', 'p99', 'slo', 'alerting', 'red method', 'dashboard'],
  metrics: [
    { id: 'p99', label: 'Checkout p99', icon: Timer },
    { id: 'err', label: 'Errors', icon: TriangleAlert },
    { id: 'detect', label: 'Time to detect', icon: Siren },
    { id: 'cause', label: 'Time to cause', icon: Search },
  ],
  learn: [
    { text: 'RED metrics and dashboards', at: 1 },
    { text: 'Why p99 matters more than the average', at: 2 },
    { text: 'Structured logs with a request id', at: 3 },
    { text: 'Distributed tracing with spans', at: 4 },
    { text: 'Alerting on symptoms and SLOs', at: 5 },
  ],
  steps: [
    {
      short: 'Mystery',
      title: 'Checkout is slow. Whose fault?',
      tag: 'Problem',
      body: [
        'Support tickets pile up: checkout sometimes takes **4 seconds**. Checkout calls Payments, Stock and Pricing; each team checks its CPU graph and says “not us”.',
        'Nobody noticed for 3 hours, and the only clue is “sometimes”. Guessing is all anyone can do.',
      ],
      scene: {
        nodes: ob('users', ['checkout', { meter: 60, status: 'hot' }], 'pay', 'stock', 'pricing', 'db'),
        links: obLinks,
        flows: obFlows.map((f) => ({ ...f, speed: 0.5 })),
        notes: [{ at: [-3, -3.3], text: '“CPU looks fine to us”', tone: 'warn' }],
      },
      metrics: { p99: '4.2 s', err: '0.3%', detect: '3 h', cause: '—' },
      bad: ['p99', 'detect'],
    },
    {
      short: 'Metrics',
      title: 'Count everything: rate, errors, duration',
      tag: 'Technique',
      body: [
        'Every service emits cheap numeric **metrics**: requests per second (**Rate**), failures (**Errors**) and a latency histogram (**Duration**) — the **RED** method.',
        'They’re aggregated every few seconds into **dashboards**. The checkout panel says the average is a healthy **210 ms**. So why the complaints?',
      ],
      changes: [{ sign: '+', text: 'Metrics & dashboards' }],
      scene: {
        nodes: ob('users', 'checkout', 'pay', 'stock', 'pricing', 'db', 'obs'),
        links: [...obLinks, L('checkout', 'obs', { dashed: true, label: 'rate · err · dur' })],
        flows: [...obFlows, F(['checkout', 'obs'], { kind: 'data', n: 2, delay: 0.3 })],
        notes: [{ at: [5, -3.5], text: 'avg 210 ms ✓', tone: 'good' }],
      },
    },
    {
      short: 'p99',
      title: 'Averages hide the pain',
      tag: 'Insight',
      body: [
        'Plot percentiles instead. **p50** is 160 ms, but **p99** — the slowest 1% — is 4.2 s. At 3,000 checkouts a minute, that’s 30 unhappy shoppers every minute.',
        'Break p99 down per dependency and Stock stands out at 3.3 s. Metrics tell you **that** and roughly **where** — not **why**.',
      ],
      callout: { kind: 'tip', text: 'Your best customers make the most requests, so they’re the most likely to hit the tail.' },
      scene: {
        nodes: ob('users', 'checkout', 'pay', ['stock', { status: 'hot' }], 'pricing', 'db', ['obs', { tag: 'p99 by service' }]),
        links: [
          L('users', 'checkout'),
          L('checkout', 'pay', { label: 'p99 0.25 s' }),
          L('checkout', 'stock', { label: 'p99 3.3 s', tone: 'bad' }),
          L('checkout', 'pricing', { label: 'p99 0.09 s' }),
          L('stock', 'db'),
          L('checkout', 'obs', { dashed: true }),
        ],
        flows: [...obFlows, F(['checkout', 'obs'], { kind: 'data', n: 2, delay: 0.3 })],
        notes: [{ at: [5, -3.5], text: 'p50 160 ms · p99 4.2 s', tone: 'bad' }],
      },
      metrics: { detect: '2 min' },
      hi: ['detect'],
    },
    {
      short: 'Logs',
      title: 'Logs you can search by request',
      tag: 'Technique',
      body: [
        'Write **structured logs**: JSON key–value events, not prose. The edge assigns each request an id and passes it on in a header, and every service logs it.',
        'Search `req=r-7f3a` and you see that one slow checkout in all four services. Useful — but stitching timings together by hand across services is slow, and logs only hold what someone chose to print.',
      ],
      changes: [{ sign: '+', text: 'Central log search' }],
      scene: {
        nodes: ob('users', 'checkout', 'pay', ['stock', { status: 'hot' }], 'pricing', 'db', ['obs', { tag: 'log search', icon: ScrollText }]),
        links: [
          L('users', 'checkout'),
          L('checkout', 'pay'),
          L('checkout', 'stock', { label: 'req-id: r-7f3a' }),
          L('checkout', 'pricing'),
          L('stock', 'db'),
          L('checkout', 'obs', { dashed: true }),
        ],
        flows: [...obFlows, F(['checkout', 'obs'], { kind: 'data', delay: 0.3 })],
        notes: [{ at: [5, -3.5], text: '{"req":"r-7f3a","ms":3180}', icon: Search }],
      },
    },
    {
      short: 'Tracing',
      title: 'Follow one request through everything',
      tag: 'Technique',
      body: [
        '**Distributed tracing**: a trace id travels with the request, and each service records **spans** — start, duration, parent. A collector assembles them into a waterfall.',
        'One span jumps out: Stock’s `SELECT … WHERE sku IN (…)` takes 3.1 s. Last week’s migration dropped an index, so it scans the whole table. Restore the index; p99 drops to 380 ms.',
      ],
      callout: { kind: 'key', text: 'Metrics say something is wrong, traces show where the time went, logs explain the details. You want all three.' },
      changes: [{ sign: '+', text: 'Tracing' }, { sign: '~', text: 'Index restored' }],
      scene: {
        nodes: ob('users', 'checkout', 'pay', ['stock', { status: 'hot' }], 'pricing', ['db', { status: 'hot' }], ['obs', { tag: 'traces', icon: ChartGantt }]),
        links: [...obLinks.slice(0, 4), L('stock', 'db', { label: 'SELECT · 3.1 s', tone: 'bad' }), L('checkout', 'obs', { dashed: true, label: 'spans' })],
        flows: [F(['users', 'checkout', 'stock', 'db'], { ret: true, speed: 0.5 }), F(['checkout', 'obs'], { kind: 'data', delay: 1.2 })],
        notes: [
          { at: [4.6, -4.8], text: 'checkout · 3.4 s', tone: 'ink' },
          { at: [4.9, -4.05], text: '↳ stock · 3.2 s', tone: 'warn' },
          { at: [5.2, -3.3], text: '↳ SELECT stock · 3.1 s', tone: 'bad' },
        ],
      },
      metrics: { p99: '380 ms', cause: '15 min' },
      hi: ['p99', 'cause'],
    },
    {
      short: 'Alerts',
      title: 'Page on symptoms, not causes',
      tag: 'Technique',
      body: [
        'Alert on what users feel. Set a **service level objective** — 99% of checkouts under 1 s, over 28 days — and page someone when the error budget is burning fast.',
        'High CPU on one box, a restarted pod or a full queue are **causes**: show them on dashboards and in tickets, not as 3 a.m. pages.',
      ],
      callout: { kind: 'warn', text: 'If an alert doesn’t need a human to act right now, it shouldn’t wake one. Noisy pages train people to ignore them.' },
      changes: [{ sign: '+', text: 'SLO alert → on-call' }],
      scene: {
        nodes: ob('users', 'checkout', 'pay', 'stock', 'pricing', 'db', ['obs', { tag: 'SLO 99% < 1 s', icon: ShieldCheck }], 'oncall'),
        links: [...obLinks, L('checkout', 'obs', { dashed: true }), L('obs', 'oncall', { label: 'page', tone: 'bad' })],
        flows: [...obFlows, F(['checkout', 'obs'], { kind: 'data', delay: 0.3 }), F(['obs', 'oncall'], { kind: 'error', delay: 1.4 })],
        notes: [{ at: [5, -3.5], text: 'budget burn 14× → page', icon: Siren, tone: 'bad' }],
      },
      metrics: { detect: '4 min' },
    },
    {
      short: 'Cost',
      title: 'Telemetry isn’t free',
      tag: 'Trade-off',
      body: [
        'Tracing all 5,000 requests a second costs more storage than the shop itself. **Sample**: keep ~1% of normal traces plus every error and slow one.',
        'Watch metric **cardinality**: a `user_id` label turns one time series into millions. Keep high-detail fields in logs and traces, and give logs a retention period.',
      ],
      scene: {
        nodes: ob('users', 'checkout', 'pay', 'stock', 'pricing', 'db', ['obs', { tag: 'keep 1% + errors', icon: ChartGantt }], 'oncall'),
        links: [...obLinks, L('checkout', 'obs', { dashed: true, label: 'sampled' }), L('obs', 'oncall')],
        flows: [...obFlows.map((f) => ({ ...f, n: 2 })), F(['checkout', 'obs'], { kind: 'data', delay: 1.1 })],
        notes: [{ at: [5, -3.5], text: 'user_id as label ✗', tone: 'bad' }],
      },
    },
    {
      short: 'Recap',
      title: 'Observability, summed up',
      tag: 'Recap',
      body: [
        '**Metrics** (rate, errors, duration — read the p99) tell you something is wrong. **Structured logs** with a request id explain details. **Traces** show where the time went across services.',
        'Alert on user-facing **SLOs**, not every cause, and sample to keep the bill sane.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'You can’t fix what you can’t see. Instrument before the incident, so the next “it’s slow” takes minutes, not days.' },
      scene: {
        nodes: ob('users', 'checkout', 'pay', 'stock', 'pricing', 'db', ['obs', { icon: Activity }], 'oncall'),
        links: [...obLinks, L('checkout', 'obs', { dashed: true }), L('obs', 'oncall')],
        flows: [...obFlows, F(['checkout', 'obs'], { kind: 'data', delay: 0.3 })],
      },
      metrics: { p99: '380 ms', err: '0.3%', detect: '4 min', cause: '15 min' },
    },
  ],
};
