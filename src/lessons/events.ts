import {
  Activity,
  ArrowLeftRight,
  Braces,
  Cable,
  ChartColumn,
  FileCode,
  Gift,
  ListOrdered,
  Mail,
  Network,
  Package,
  Percent,
  Plug,
  Radio,
  RefreshCw,
  Rewind,
  Server,
  ShieldBan,
  ShoppingCart,
  Smartphone,
  Timer,
  TriangleAlert,
  Trophy,
  Truck,
  Users,
} from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* Pub/Sub & events                                                     */
/* ------------------------------------------------------------------ */

const ps = cast({
  orders: { kind: 'cube', at: [-5.5, 0], label: 'Orders', sub: 'checkout', icon: ShoppingCart, tone: 'blue' },
  topic: { kind: 'queue', at: [-1.5, 0], tag: 'order-events', tagIcon: Radio, items: 3 },
  email: { kind: 'cube', at: [-1.5, -4], label: 'Email', sub: 'receipts', icon: Mail, tone: 'blue' },
  stock: { kind: 'cube', at: [2.5, -4], label: 'Stock', sub: 'inventory', icon: Package, tone: 'blue' },
  ship: { kind: 'cube', at: [2.5, 0], label: 'Shipping', icon: Truck, tone: 'blue' },
  rewards: { kind: 'cube', at: [2.5, 4], label: 'Rewards', sub: 'loyalty', icon: Gift, tone: 'blue' },
  stats: { kind: 'cube', at: [-1.5, 4], label: 'Stats', sub: 'analytics', icon: ChartColumn, tone: 'blue' },
  fraud: { kind: 'cube', at: [-6, 4.5], label: 'Fraud', sub: 'new team', icon: ShieldBan, tone: 'blue' },
  registry: { kind: 'cube', at: [-5.5, -4], label: 'Schema', sub: 'registry', icon: FileCode, tone: 'yellow', size: 'sm' },
});

const subs = ['email', 'stock', 'ship', 'rewards', 'stats'] as const;
const psLinks = [L('orders', 'topic', { label: 'OrderPlaced' }), ...subs.map((s) => L('topic', s))];
const fanOut = (delay = 0.9) => subs.map((s, i) => F(['topic', s], { kind: 'event', delay: delay + i * 0.12 }));

export const pubsub: Lesson = {
  id: 'pubsub',
  title: 'Pub/Sub & Events',
  blurb: 'Announce what happened once, and let every interested service react in its own time.',
  minutes: 11,
  level: 'Intermediate',
  keywords: ['pub/sub', 'publish subscribe', 'event', 'topic', 'fan-out', 'event log', 'kafka', 'offset', 'replay', 'schema'],
  metrics: [
    { id: 'lat', label: 'Order latency', icon: Timer },
    { id: 'fail', label: 'Failed orders', icon: TriangleAlert },
    { id: 'deps', label: 'Orders calls', icon: Network },
    { id: 'replay', label: 'Replay window', icon: Rewind },
  ],
  learn: [
    { text: 'Why direct calls couple services together', at: 0 },
    { text: 'Publishing events to a topic', at: 1 },
    { text: 'Fan-out vs. a work queue', at: 2 },
    { text: 'Durable logs, offsets and replay', at: 4 },
    { text: 'Ordering by key and evolving schemas', at: 6 },
  ],
  steps: [
    {
      short: 'Five calls',
      title: 'One order, five phone calls',
      tag: 'Problem',
      body: [
        'When an order is placed, the Orders service calls Email, Stock, Shipping, Rewards and Stats — one after another — before replying. That is **620 ms** of waiting, and Orders must know all five addresses.',
        'Today Rewards is down, so 2.8% of checkouts fail. The loyalty points were never the point of the purchase.',
      ],
      scene: {
        nodes: ps(['orders', { meter: 85, status: 'hot' }], 'email', 'stock', 'ship', ['rewards', { status: 'down', tone: 'rose' }], 'stats'),
        links: [
          L('orders', 'email'),
          L('orders', 'stock', { elbow: false }),
          L('orders', 'ship'),
          L('orders', 'rewards', { elbow: false, tone: 'bad' }),
          L('orders', 'stats'),
        ],
        flows: [
          F(['orders', 'email'], { ret: true, speed: 0.7 }),
          F(['orders', 'stock'], { ret: true, delay: 0.5, speed: 0.7 }),
          F(['orders', 'ship'], { ret: true, delay: 1, speed: 0.7 }),
          F(['orders', 'rewards'], { stop: true, delay: 1.5, speed: 0.7 }),
          F(['orders', 'stats'], { ret: true, delay: 2, speed: 0.7 }),
        ],
        notes: [{ at: [6, 4], text: 'down → order fails', tone: 'bad' }],
      },
      metrics: { lat: '620 ms', fail: '2.8%', deps: '5 services', replay: '—' },
      bad: ['lat', 'fail'],
    },
    {
      short: 'Publish',
      title: 'Announce it once: OrderPlaced',
      tag: 'Technique',
      body: [
        'Orders now saves the order and **publishes** one event — `OrderPlaced {orderId, items, total}` — to a **topic**, then replies. It no longer knows or cares who is listening.',
        'Each downstream service **subscribes** to the topic and reacts on its own schedule.',
      ],
      callout: { kind: 'key', text: 'A command says “do this”. An event says “this happened”. Events let the producer stay ignorant of its consumers.' },
      changes: [{ sign: '+', text: 'Topic: order-events' }, { sign: '-', text: '5 direct calls' }],
      scene: {
        nodes: ps(['orders', { meter: 20 }], 'topic', 'email', 'stock', 'ship', 'rewards', 'stats'),
        links: psLinks,
        flows: [F(['orders', 'topic'], { kind: 'event' }), ...fanOut()],
      },
      metrics: { lat: '40 ms', fail: '0.01%', deps: '1 topic' },
      hi: ['lat', 'fail', 'deps'],
    },
    {
      short: 'Fan-out',
      title: 'Every subscriber gets its own copy',
      tag: 'Insight',
      body: [
        'In a **work queue**, each message goes to exactly one worker — that is how you share a job. In **pub/sub**, every subscription receives every event: one `OrderPlaced` becomes five deliveries.',
        'Rewards is down again, but only its copy waits. Orders, Email and Shipping carry on.',
      ],
      callout: { kind: 'tip', text: 'You can combine both: each subscriber gets every event, and inside a subscriber several instances split that stream like a work queue.' },
      scene: {
        nodes: ps(['orders', { meter: 20 }], ['topic', { items: 5 }], 'email', 'stock', 'ship', ['rewards', { status: 'down', tone: 'rose' }], 'stats'),
        links: [...psLinks.filter((l) => l.to !== 'rewards'), L('topic', 'rewards', { dashed: true, tone: 'bad' })],
        flows: [
          F(['orders', 'topic'], { kind: 'event' }),
          ...subs.filter((s) => s !== 'rewards').map((s) => F(['topic', s], { kind: 'event', delay: 0.9 })),
          F(['topic', 'rewards'], { kind: 'event', stop: true, delay: 0.9 }),
        ],
        notes: [{ at: [6, 4], text: 'its copies wait', tone: 'warn' }],
      },
    },
    {
      short: 'New team',
      title: 'Add a consumer, touch nothing',
      tag: 'Technique',
      body: [
        'The fraud team wants to score every order. They create a new subscription and deploy — **zero changes** to Orders, no meeting with the checkout team.',
        'Rewards is back too, and works through the events that piled up while it was offline.',
      ],
      changes: [{ sign: '+', text: 'Fraud subscriber' }],
      scene: {
        nodes: ps(['orders', { meter: 20 }], 'topic', 'email', 'stock', 'ship', ['rewards', { meter: 80, tag: 'catching up' }], 'stats', 'fraud'),
        links: [...psLinks, L('topic', 'fraud', { tone: 'good' })],
        flows: [
          F(['orders', 'topic'], { kind: 'event' }),
          ...fanOut(),
          F(['topic', 'fraud'], { kind: 'event', delay: 1.4 }),
          F(['topic', 'rewards'], { kind: 'event', n: 4, speed: 1.4, delay: 0.3 }),
        ],
        notes: [{ at: [-5.5, -2.8], text: 'Orders: 0 lines changed', tone: 'good' }],
      },
      metrics: { deps: '1 topic' },
    },
    {
      short: 'Event log',
      title: 'Keep the events, not just deliver them',
      tag: 'Technique',
      body: [
        'Log-based brokers append each event to a **durable log** and keep it for a **retention** period, say 7 days. Nothing is deleted on read.',
        'Each subscriber just remembers its own **offset** — how far it has read. Stats shipped a bug yesterday, so it rewinds its offset and **replays** the week to rebuild its numbers.',
      ],
      callout: { kind: 'tip', text: 'Replay is also how a brand-new consumer back-fills history instead of starting from today.' },
      changes: [{ sign: '~', text: 'Topic becomes a 7-day log' }],
      scene: {
        nodes: ps(['topic', { items: 7, tag: 'log · 7 days' }], 'orders', 'email', 'stock', 'ship', 'rewards', ['stats', { sub: 'replaying', status: 'hot' }]),
        links: [...psLinks.filter((l) => l.to !== 'stats'), L('topic', 'stats', { label: 'rewind → day 0' })],
        flows: [F(['orders', 'topic'], { kind: 'event' }), ...fanOut().filter((f) => f.path[1] !== 'stats'), F(['topic', 'stats'], { kind: 'data', n: 5, speed: 1.5 })],
        notes: [
          { at: [6, -4], text: 'Stock @ offset 88,412', icon: ListOrdered },
          { at: [6, 4], text: 'Rewards @ offset 88,409', icon: ListOrdered },
        ],
      },
      metrics: { replay: '7 days' },
      hi: ['replay'],
    },
    {
      short: 'Ordering',
      title: 'Order is only kept per key',
      tag: 'Trade-off',
      body: [
        'To scale, a topic is split into **partitions** consumed in parallel. Events are ordered **within** a partition only — there is no global order across the topic.',
        'So pick a **partition key**: with `orderId`, Placed → Paid → Cancelled for one order always arrive in sequence, while different orders flow in parallel.',
      ],
      callout: { kind: 'warn', text: 'Key by the thing whose history must stay in order. A random or missing key can deliver “Cancelled” before “Placed”.' },
      scene: {
        nodes: ps(['topic', { items: 7, tag: 'key = orderId' }], 'orders', 'email', 'stock', 'ship', 'rewards', 'stats'),
        links: [...psLinks.filter((l) => l.to !== 'ship'), L('topic', 'ship', { label: 'partition 3' })],
        flows: [F(['orders', 'topic'], { kind: 'event', n: 3 }), F(['topic', 'ship'], { kind: 'event', n: 3, delay: 0.9 }), ...fanOut(1.6).filter((f) => f.path[1] !== 'ship')],
        notes: [
          { at: [6.3, -1.4], text: 'placed → paid → cancelled', tone: 'good' },
          { at: [6.3, 1.4], text: 'no order across keys', tone: 'warn' },
        ],
      },
    },
    {
      short: 'Schemas',
      title: 'Events are a public contract',
      tag: 'Insight',
      body: [
        'Six teams now parse `OrderPlaced`. Rename `total` to `amount` and several break overnight — and with replay, old events in the old shape live on for days.',
        'Evolve **compatibly**: only add optional fields, never remove or repurpose one. A **schema registry** rejects incompatible versions before Orders can publish them.',
      ],
      changes: [{ sign: '+', text: 'Schema registry' }],
      scene: {
        nodes: ps('registry', 'orders', 'topic', 'email', 'stock', 'ship', 'rewards', 'stats', 'fraud'),
        links: [...psLinks, L('topic', 'fraud'), L('orders', 'registry', { arrow: 'both', label: 'v3 compatible?' })],
        flows: [
          F(['orders', 'registry'], { kind: 'handshake', ret: true, retKind: 'handshake' }),
          F(['orders', 'topic'], { kind: 'event', delay: 1.2 }),
          ...fanOut(2),
          F(['topic', 'fraud'], { kind: 'event', delay: 2.3 }),
        ],
        notes: [{ at: [6.3, -1.4], text: 'v3: + giftWrap (optional)', icon: Braces, tone: 'good' }],
      },
    },
    {
      short: 'Recap',
      title: 'Pub/Sub, summed up',
      tag: 'Recap',
      body: [
        'Publish **events** about facts that happened; let any number of subscribers react independently. Producers stay fast and ignorant of consumers, and a broken consumer only delays itself.',
        'A durable **log** adds retention, per-consumer offsets and replay. Order holds only per key, and schemas must evolve compatibly.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Publish what happened, not who should act on it — and treat every event shape as an API you can’t take back.' },
      scene: {
        nodes: ps(['orders', { meter: 20 }], ['topic', { tag: 'log · 7 days', items: 5 }], 'email', 'stock', 'ship', 'rewards', 'stats', 'fraud'),
        links: [...psLinks, L('topic', 'fraud')],
        flows: [F(['orders', 'topic'], { kind: 'event', n: 2 }), ...fanOut(), F(['topic', 'fraud'], { kind: 'event', delay: 1.5 })],
      },
      metrics: { lat: '40 ms', fail: '0.01%', deps: '1 topic', replay: '7 days' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Real-time updates                                                    */
/* ------------------------------------------------------------------ */

const rt = cast({
  fans: { kind: 'crowd', at: [-5.5, 0], tag: 'fans', tagIcon: Users, items: 6 },
  phone: { kind: 'phone', at: [-5.5, 4], tag: 'fan on a train', tagIcon: Smartphone },
  api: { kind: 'cube', at: [-1.5, 0], label: 'API', sub: 'scores', icon: Server, tone: 'blue' },
  scorer: { kind: 'cube', at: [2.5, -4], label: 'Scorer', sub: 'match feed', icon: Trophy, tone: 'blue' },
  c1: { kind: 'cube', at: [-1.5, -4], label: 'Conn 1', sub: 'sockets', icon: Cable, tone: 'green' },
  c2: { kind: 'cube', at: [-1.5, 0], label: 'Conn 2', sub: 'sockets', icon: Cable, tone: 'green' },
  c3: { kind: 'cube', at: [-1.5, 4], label: 'Conn 3', sub: 'sockets', icon: Cable, tone: 'green' },
  bus: { kind: 'slab', at: [2.5, 0], tag: 'pub/sub', tagIcon: Radio, icon: Radio, tone: 'teal' },
});

const conns = ['c1', 'c2', 'c3'] as const;
const busLinks = [L('scorer', 'bus', { label: 'publish once' }), ...conns.map((c) => L('bus', c)), ...conns.map((c) => L(c, 'fans'))];
const busFan = (delay = 0) => conns.map((c, i) => F(['scorer', 'bus', c, 'fans'], { kind: 'event', delay: delay + i * 0.25 }));

export const realtime: Lesson = {
  id: 'realtime',
  title: 'Real-time Updates',
  blurb: 'Stop asking “anything new?” — keep a line open and push updates the moment they happen.',
  minutes: 11,
  level: 'Intermediate',
  keywords: ['polling', 'long polling', 'server-sent events', 'sse', 'websocket', 'push', 'live updates', 'fan-out', 'reconnect'],
  metrics: [
    { id: 'req', label: 'Requests', icon: Activity },
    { id: 'useful', label: 'Useful replies', icon: Percent },
    { id: 'delay', label: 'Update delay', icon: Timer },
    { id: 'conns', label: 'Open conns', icon: Plug },
  ],
  learn: [
    { text: 'Why short polling wastes almost every request', at: 0 },
    { text: 'Long polling and Server-Sent Events', at: 2 },
    { text: 'When you need two-way WebSockets', at: 3 },
    { text: 'Scaling connections with a pub/sub backplane', at: 5 },
    { text: 'Reconnecting without missing updates', at: 6 },
  ],
  steps: [
    {
      short: 'Polling',
      title: '“Any goals yet?” — every 2 seconds',
      tag: 'Problem',
      body: [
        'A sports app shows live scores to **1 million** fans during a big match. Each app asks `GET /score` every 2 s: **500,000 requests per second**.',
        'The score changes every few minutes, so about **99%** of replies say “nothing new” — and a goal still shows up to 2 s late.',
      ],
      scene: {
        nodes: rt('fans', ['api', { meter: 95, status: 'hot' }], 'scorer'),
        links: [L('fans', 'api', { arrow: 'both', label: 'every 2 s' }), L('api', 'scorer')],
        flows: [F(['fans', 'api'], { ret: true, n: 6, speed: 1.4 }), F(['api', 'scorer'], { ret: true, kind: 'data', retKind: 'data', delay: 0.6 })],
        notes: [{ at: [-4.5, -3.2], text: '“no change” × 99', tone: 'bad' }],
      },
      metrics: { req: '500k /s', useful: '1%', delay: '~1 s', conns: '—' },
      bad: ['req', 'useful'],
    },
    {
      short: 'Long poll',
      title: 'Hold the request until there’s news',
      tag: 'Technique',
      body: [
        '**Long polling**: the server doesn’t answer straight away. It holds the request open until the score changes — or ~30 s pass — then replies, and the app immediately asks again.',
        'Goals arrive almost instantly and empty replies drop sharply. But every fan now ties up an open request on the server.',
      ],
      scene: {
        nodes: rt('fans', ['api', { meter: 45 }], 'scorer'),
        links: [L('fans', 'api', { arrow: 'both', label: 'held ≤ 30 s' }), L('api', 'scorer')],
        flows: [F(['fans', 'api'], { n: 3, speed: 0.35 }), F(['scorer', 'api', 'fans'], { kind: 'event', delay: 1.5 })],
      },
      metrics: { req: '40k /s', useful: '15%', delay: '< 0.2 s', conns: '1M held' },
      hi: ['req', 'useful', 'delay'],
    },
    {
      short: 'SSE',
      title: 'One response that never ends',
      tag: 'Technique',
      body: [
        '**Server-Sent Events**: the app opens one HTTP request and the server keeps the response streaming, writing `event: goal` lines whenever something happens.',
        'It is plain HTTP, works through most proxies, and the browser’s `EventSource` reconnects by itself. The catch: it is **one-way**, server → client only.',
      ],
      callout: { kind: 'tip', text: 'Most “live” features — scores, feeds, notifications, progress bars — only need server → client. SSE is often enough.' },
      scene: {
        nodes: rt('fans', ['api', { meter: 30 }], 'scorer'),
        links: [L('api', 'fans', { label: 'event-stream' }), L('api', 'scorer')],
        flows: [F(['scorer', 'api', 'fans'], { kind: 'event', n: 2 })],
        notes: [{ at: [-3.5, -3.2], text: 'one-way: server → fan', icon: Radio }],
      },
      metrics: { req: '~1k /s', useful: '100%', conns: '1M' },
      hi: ['req', 'useful'],
    },
    {
      short: 'WebSocket',
      title: 'Two-way: WebSockets',
      tag: 'Trade-off',
      body: [
        'The app adds live chat and emoji reactions, so fans need to send too. A **WebSocket** starts as HTTP, **upgrades**, and becomes a long-lived two-way channel with tiny frames.',
        'The price: it is its own protocol, so load balancers, proxies and auth must handle hours-long connections, and you write heartbeats and reconnect logic yourself.',
      ],
      scene: {
        nodes: rt('fans', ['api', { meter: 35 }], 'scorer'),
        links: [L('fans', 'api', { arrow: 'both', label: 'ws · two-way' }), L('api', 'scorer')],
        flows: [
          F(['fans', 'api'], { kind: 'handshake', ret: true, retKind: 'handshake' }),
          F(['scorer', 'api', 'fans'], { kind: 'event', delay: 1 }),
          F(['fans', 'api'], { kind: 'data', n: 2, delay: 1.8 }),
        ],
        notes: [{ at: [-3.5, -3.2], text: 'GET + Upgrade → 101', icon: ArrowLeftRight }],
      },
    },
    {
      short: 'Conn tier',
      title: 'A million open sockets',
      tag: 'Technique',
      body: [
        'Each open connection is mostly idle but costs memory and a file descriptor. Run dedicated **connection servers** — say 20, each holding ~50k sockets — separate from the API, so deploys don’t drop everyone.',
        'New problem: a goal arrives at **Conn 1**. Fans connected to Conn 2 and 3 never hear about it.',
      ],
      changes: [{ sign: '+', text: 'Connection servers × 20' }, { sign: '-', text: 'Single API box' }],
      scene: {
        nodes: rt('fans', 'scorer', ['c1', { meter: 50 }], ['c2', { meter: 50, status: 'dim' }], ['c3', { meter: 50, status: 'dim' }]),
        links: [L('scorer', 'c1'), ...conns.map((c) => L(c, 'fans'))],
        flows: [F(['scorer', 'c1', 'fans'], { kind: 'event' }), F(['c2', 'fans'], { kind: 'handshake', delay: 0.6 }), F(['c3', 'fans'], { kind: 'handshake', delay: 1 })],
        notes: [{ at: [2.5, 3], text: 'Conn 2 & 3: silence', tone: 'bad' }],
      },
      metrics: { conns: '1M / 20' },
    },
    {
      short: 'Backplane',
      title: 'A backplane fans out every update',
      tag: 'Technique',
      body: [
        'Add a **pub/sub backplane**. The scorer publishes `goal` once; every connection server subscribes and pushes it to **its own** local fans.',
        'Connection servers stay simple and interchangeable: add more as the crowd grows. The backplane only carries one copy per server, not per fan.',
      ],
      callout: { kind: 'key', text: 'Separate holding connections from producing updates. The backplane turns one publish into a million pushes.' },
      changes: [{ sign: '+', text: 'Pub/sub backplane' }],
      scene: {
        nodes: rt('fans', 'scorer', 'bus', ['c1', { meter: 50 }], ['c2', { meter: 50 }], ['c3', { meter: 50 }]),
        links: busLinks,
        flows: busFan(),
      },
      metrics: { delay: '~150 ms' },
    },
    {
      short: 'Reconnect',
      title: 'Back from the tunnel, nothing missed',
      tag: 'Case',
      body: [
        'A fan’s train enters a tunnel for 40 s. On reconnect the app sends the id of the **last event it saw** (`Last-Event-ID: 4812`), and the server replays 4813–4815 from a short buffer.',
        'If the gap is older than the buffer, the app fetches a fresh snapshot instead. Reconnect with **backoff and jitter**, or a server restart triggers a million reconnects at once.',
      ],
      callout: { kind: 'warn', text: 'A live stream is never the source of truth. Always be able to rebuild state from a snapshot plus newer events.' },
      changes: [{ sign: '+', text: '5-minute replay buffer' }],
      scene: {
        nodes: rt('fans', 'phone', 'scorer', ['bus', { tag: 'keeps last 5 min' }], ['c1', { meter: 50 }], ['c2', { meter: 50 }], ['c3', { meter: 50 }]),
        links: [...busLinks, L('phone', 'c3', { arrow: 'both', label: 'Last-Event-ID 4812' })],
        flows: [
          F(['phone', 'c3'], { kind: 'handshake' }),
          F(['bus', 'c3', 'phone'], { kind: 'data', n: 3, delay: 0.9 }),
          F(['scorer', 'bus', 'c1', 'fans'], { kind: 'event', delay: 2 }),
        ],
        notes: [{ at: [2.5, 3], text: 'resent 4813–4815', icon: RefreshCw, tone: 'good' }],
      },
    },
    {
      short: 'Recap',
      title: 'Real-time updates, summed up',
      tag: 'Recap',
      body: [
        'Short polling is simple but wasteful. **Long polling** and **SSE** push server → client over HTTP; **WebSockets** add two-way traffic at the cost of more plumbing.',
        'At scale, hold sockets on dedicated **connection servers**, fan out through a **pub/sub backplane**, and resume from the last-seen id.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Pick the simplest channel that fits the direction of traffic, and design reconnects before you design the happy path.' },
      scene: {
        nodes: rt('fans', 'phone', 'scorer', 'bus', ['c1', { meter: 50 }], ['c2', { meter: 50 }], ['c3', { meter: 50 }]),
        links: [...busLinks, L('phone', 'c3', { arrow: 'both' })],
        flows: [...busFan(), F(['c3', 'phone'], { kind: 'event', delay: 0.6 })],
      },
      metrics: { req: '~1k /s', useful: '100%', delay: '~150 ms', conns: '1M / 20' },
    },
  ],
};
