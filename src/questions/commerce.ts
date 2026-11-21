import {
  Activity,
  Bot,
  BrainCircuit,
  Clock,
  Cpu,
  CreditCard,
  Database,
  DollarSign,
  Eye,
  FlaskConical,
  Gauge,
  Globe,
  HardDrive,
  Hourglass,
  Layers,
  LayoutGrid,
  Lock,
  Mail,
  MousePointerClick,
  Network,
  Package,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Split,
  Star,
  Store,
  Ticket,
  Timer,
  TriangleAlert,
  User,
  Users,
  Warehouse,
  Webhook,
  Zap,
} from 'lucide-react';
import type { Question } from '../types';
import { cast, F, L } from '../lessons/kit';

/* ------------------------------------------------------------------ */
/* 14 · Design an E-commerce System                                    */
/* ------------------------------------------------------------------ */

const ec = cast({
  you: { kind: 'device', at: [-7, 0], tag: 'shopper', tagIcon: User },
  crowd: { kind: 'crowd', at: [-7, 0], tag: 'flash sale', items: 7 },
  store: { kind: 'cube', at: [0, 0], label: 'Store', sub: '?', icon: Store, tone: 'gray' },
  gw: { kind: 'cube', at: [-3.5, 0], label: 'Gateway', sub: 'auth, LB', icon: Split, tone: 'green' },
  catalog: { kind: 'cube', at: [-3.5, -4], label: 'Catalog', sub: 'cached', icon: Package, tone: 'blue' },
  cart: { kind: 'cube', at: [-3.5, 4], label: 'Cart', sub: 'per user', icon: ShoppingCart, tone: 'blue' },
  order: { kind: 'cube', at: [0, 0], label: 'Orders', sub: 'checkout', icon: Receipt, tone: 'blue' },
  ordersDb: { kind: 'db', at: [0, 4.5], tag: 'orders', icon: Database },
  inv: { kind: 'cube', at: [3.5, -3.5], label: 'Stock', sub: 'inventory', icon: Warehouse, tone: 'blue' },
  stockDb: { kind: 'db', at: [7, -3.5], tag: 'stock + holds', icon: Database },
  pay: { kind: 'cube', at: [3.5, 3.5], label: 'Payments', sub: 'idempotent', icon: CreditCard, tone: 'blue' },
  psp: { kind: 'slab', at: [7, 3.5], tag: 'card provider', icon: CreditCard, tone: 'gray' },
  queue: { kind: 'queue', at: [3.5, 0], tag: 'order events', items: 3 },
  email: { kind: 'cube', at: [7, 0], label: 'Email', sub: 'sender', icon: Mail, tone: 'blue', size: 'sm' },
});

const ecLinks = [
  L('gw', 'catalog', { arrow: 'both' }),
  L('gw', 'cart', { arrow: 'both' }),
  L('gw', 'order', { arrow: 'both' }),
  L('order', 'ordersDb', { arrow: 'both' }),
  L('order', 'inv', { arrow: 'both', label: 'reserve' }),
  L('inv', 'stockDb', { arrow: 'both' }),
  L('order', 'pay', { arrow: 'both', label: 'charge' }),
  L('pay', 'psp', { arrow: 'both' }),
  L('order', 'queue'),
  L('queue', 'email'),
];

export const qEcommerce: Question = {
  id: 'q-ecommerce',
  n: 14,
  title: 'Design an E-commerce System',
  blurb: 'A single online store: catalog, cart and a checkout that never oversells or charges twice.',
  minutes: 14,
  level: 'Intermediate',
  concepts: ['Orders', 'Inventory', 'Payments'],
  related: ['transactions', 'sagas', 'message-queues', 'caching'],
  followUps: [
    'How would you handle a payment webhook that arrives after the stock hold expired?',
    'How do you show an accurate “only 3 left” without hammering the stock table?',
    'How would you support coupons and price changes in the middle of checkout?',
    'What changes when stock is split across two warehouses?',
  ],
  keywords: ['e-commerce', 'checkout', 'inventory reservation', 'overselling', 'order state machine', 'payment webhook', 'idempotency key', 'saga', 'flash sale'],
  metrics: [
    { id: 'orders', label: 'Orders', icon: Receipt },
    { id: 'p99', label: 'Checkout p99', icon: Timer },
    { id: 'oversold', label: 'Oversold', icon: TriangleAlert },
    { id: 'stock', label: 'Stock DB load', icon: Gauge },
  ],
  learn: [
    { text: 'Splitting browse availability from checkout correctness', at: 0 },
    { text: 'Reserving stock with an atomic update and a TTL hold', at: 4 },
    { text: 'Modelling orders as a forward-only state machine', at: 5 },
    { text: 'Idempotent payments confirmed by webhooks', at: 6 },
    { text: 'Tying services together with a saga', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'One store, a checkout you can trust',
      tag: 'Requirements',
      body: [
        'Brief: an online shop with ~**50k products** and ~**1M daily visitors**. Shoppers browse a catalog, fill a cart and pay by card; staff manage products and stock. The two promises that matter: **never oversell** and **never charge twice**.',
        'Non-functional: browsing p99 < 300 ms and highly available; checkout may take ~2 s but must be **correct**. Out of scope: search ranking, recommendations, shipping and returns — name them, then park them.',
      ],
      callout: { kind: 'tip', text: 'Say out loud which paths need availability (browsing) and which need correctness (stock, money). That split drives every later choice.' },
      scene: {
        nodes: ec('you', 'store'),
        links: [L('you', 'store', { arrow: 'both' })],
        flows: [F(['you', 'store'], { ret: true, n: 2 })],
        notes: [
          { at: [-3.5, -3], text: 'browse p99 < 300 ms', icon: Timer, tone: 'good' },
          { at: [-3.5, 3], text: 'checkout: correct > fast', tone: 'warn' },
          { at: [4, -2], text: 'never oversell', icon: Warehouse, tone: 'bad' },
          { at: [4, 2], text: 'never charge twice', icon: CreditCard, tone: 'bad' },
        ],
      },
      metrics: { orders: '—', p99: '—', oversold: '—', stock: '—' },
    },
    {
      short: 'Numbers',
      title: 'Browsing dwarfs buying',
      tag: 'Estimation',
      body: [
        '1M visitors × 30 page views ≈ 30M views/day ≈ **350 reads/s**, ~3.5k/s at the evening peak. At 2% conversion that is **20k orders/day** — under one order per second on average. A flash sale can spike to **~1k checkouts/s** on a few SKUs.',
        'Storage is tiny: 50k products × 5 KB ≈ 250 MB of catalog; orders at ~2 KB ≈ 40 MB/day, ~15 GB/year. Browse:buy is ~1,500:1, so cache the catalog hard and spend the design effort on the write path.',
      ],
      scene: {
        nodes: ec('you', ['store', { meter: 30 }]),
        links: [L('you', 'store', { arrow: 'both' })],
        flows: [F(['you', 'store'], { ret: true, n: 3 })],
        notes: [
          { at: [-3.5, -3], text: '≈ 3.5k page views/s peak', icon: Eye },
          { at: [-3.5, 3], text: '≈ 20k orders / day', icon: Receipt },
          { at: [4, -2], text: 'flash sale: 1k checkouts/s', tone: 'warn' },
          { at: [4, 2], text: '~15 GB orders / year', icon: Database },
        ],
      },
      metrics: { orders: '20k /day' },
    },
    {
      short: 'API + data',
      title: 'Endpoints and the tables behind them',
      tag: 'API',
      body: [
        '`GET /products/{id}`, `POST /cart/items`, `POST /checkout` → `{order_id}`, and `POST /payments/webhook` for the provider. Checkout carries an **Idempotency-Key**, so a double-clicked button creates one order, not two.',
        'Tables: `stock(sku PK, on_hand, reserved)`, `holds(hold_id PK, order_id, sku, qty, expires_at)`, `orders(order_id PK, user_id, status, total, idem_key UNIQUE)` and `order_items(order_id, sku, qty, unit_price)` — price copied at purchase time.',
      ],
      scene: {
        nodes: ec('you', 'gw', 'order', 'ordersDb', 'inv', 'stockDb'),
        links: [
          L('you', 'gw', { arrow: 'both', label: 'checkout' }),
          L('gw', 'order', { arrow: 'both' }),
          L('order', 'ordersDb', { arrow: 'both' }),
          L('order', 'inv', { arrow: 'both' }),
          L('inv', 'stockDb', { arrow: 'both' }),
        ],
        flows: [F(['you', 'gw', 'order', 'ordersDb'], { kind: 'data', ret: true }), F(['order', 'inv', 'stockDb'], { ret: true, delay: 1.2 })],
        notes: [
          { at: [4, 3], text: 'idem_key UNIQUE', icon: ShieldCheck, tone: 'good' },
          { at: [-3.5, -3.5], text: 'price copied into order', tone: 'ink' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Services around the checkout path',
      tag: 'Design',
      body: [
        'The **gateway** routes to small services. **Catalog** is read-mostly, behind a cache and CDN. **Cart** is per-user state in a key-value store. **Orders** owns checkout and calls **Stock** and **Payments**, each owning its own data.',
        'Anything slow or optional — confirmation emails, analytics, telling the warehouse — goes onto an **order events** queue, so checkout never waits on it.',
      ],
      changes: [
        { sign: '+', text: 'Catalog, Cart, Stock, Payments' },
        { sign: '+', text: 'Order events queue + email' },
      ],
      scene: {
        nodes: ec('you', ['gw', { meter: 30 }], 'catalog', 'cart', ['order', { meter: 25 }], 'ordersDb', 'inv', ['stockDb', { meter: 15 }], 'pay', 'psp', 'queue', 'email'),
        links: [L('you', 'gw', { arrow: 'both' }), ...ecLinks],
        flows: [
          F(['you', 'gw', 'catalog'], { ret: true, n: 2 }),
          F(['gw', 'cart'], { kind: 'data', ret: true, delay: 0.6 }),
          F(['gw', 'order', 'inv'], { ret: true, delay: 1.2 }),
          F(['order', 'queue', 'email'], { kind: 'event', delay: 2 }),
        ],
      },
      metrics: { p99: '1.2 s', stock: '15%' },
    },
    {
      short: 'Reserve',
      title: 'Hold stock, or decrement at payment?',
      tag: 'Deep Dive',
      body: [
        'Option A, **decrement at payment**: nothing is held while the shopper types card details, so two people can pay for the last unit and one needs a refund. Option B, **reserve at checkout** with a **TTL hold** (~15 min): stock is promised before money moves. Pick B.',
        'Reserve atomically: `UPDATE stock SET reserved = reserved + :q WHERE sku = :s AND on_hand - reserved >= :q`. Zero rows updated means sold out — no read-then-write race. A sweeper releases holds whose `expires_at` has passed.',
      ],
      callout: { kind: 'warn', text: 'Never SELECT the count and then UPDATE it in app code: two requests both read “1 left” and both sell it.' },
      scene: {
        nodes: ec('you', 'gw', ['order', { meter: 30 }], 'ordersDb', ['inv', { meter: 40 }], ['stockDb', { meter: 35 }]),
        links: [L('you', 'gw', { arrow: 'both' }), L('gw', 'order', { arrow: 'both' }), L('order', 'ordersDb'), L('order', 'inv', { arrow: 'both', label: 'reserve' }), L('inv', 'stockDb', { arrow: 'both' })],
        flows: [
          F(['you', 'gw', 'order', 'inv', 'stockDb'], { ret: true }),
          F(['order', 'inv', 'stockDb'], { kind: 'error', stop: true, delay: 1.4 }),
        ],
        notes: [
          { at: [4, 0], text: '15 min hold, then release', icon: Clock, tone: 'warn' },
          { at: [7, -0.5], text: '0 rows → sold out', tone: 'bad' },
        ],
      },
      metrics: { oversold: '0', stock: '35%' },
      hi: ['oversold'],
    },
    {
      short: 'States',
      title: 'An explicit order state machine',
      tag: 'Deep Dive',
      body: [
        'Orders move through `PENDING → RESERVED → PAID → SHIPPED`, with `CANCELLED` and `EXPIRED` exits. Each transition is a conditional write — `UPDATE orders SET status=PAID WHERE id=? AND status=RESERVED` — so a late or duplicate event can never move an order backwards.',
        'Write each transition to an `order_events` table **in the same transaction** (an outbox); a relay publishes those rows to the queue. Support gets a full history, and no event is lost if the app crashes mid-write.',
      ],
      scene: {
        nodes: ec('you', 'gw', ['order', { meter: 25 }], 'ordersDb', ['queue', { items: 4 }], 'email'),
        links: [L('you', 'gw', { arrow: 'both' }), L('gw', 'order', { arrow: 'both' }), L('order', 'ordersDb', { arrow: 'both', label: 'status + outbox' }), L('order', 'queue'), L('queue', 'email')],
        flows: [F(['gw', 'order', 'ordersDb'], { kind: 'data', ret: true }), F(['order', 'queue', 'email'], { kind: 'event', n: 2, delay: 1 })],
        notes: [
          { at: [4, -4], text: 'PENDING → RESERVED', tone: 'ink' },
          { at: [4, -3], text: 'RESERVED → PAID', tone: 'good' },
          { at: [4, -2], text: 'PAID → SHIPPED', tone: 'good' },
          { at: [4, 3], text: 'RESERVED → EXPIRED', tone: 'bad' },
        ],
      },
    },
    {
      short: 'Payments',
      title: 'Charge via a provider, trust webhooks',
      tag: 'Deep Dive',
      body: [
        'Orders asks **Payments** to create a charge, passing the order id as the provider’s **idempotency key**, so a retry never double-charges. Card details go from the browser straight to the provider as a token, keeping your servers out of most card-data compliance scope.',
        'The result arrives by **webhook** — late, twice or out of order. Verify the signature, dedupe on the event id, then apply the state transition. A nightly **reconciliation** against the provider’s report catches anything a lost webhook missed.',
      ],
      scene: {
        nodes: ec('you', 'gw', ['order', { meter: 25 }], 'ordersDb', ['pay', { tag: 'dedupe by event id', tagIcon: Webhook }], 'psp'),
        links: [L('you', 'gw', { arrow: 'both' }), L('gw', 'order', { arrow: 'both' }), L('order', 'ordersDb'), L('order', 'pay', { arrow: 'both', label: 'charge' }), L('pay', 'psp', { arrow: 'both' })],
        flows: [
          F(['order', 'pay', 'psp'], { kind: 'request' }),
          F(['psp', 'pay', 'order', 'ordersDb'], { kind: 'event', delay: 1.4 }),
        ],
        notes: [
          { at: [-3.5, 3.5], text: 'key = order_id', icon: ShieldCheck, tone: 'good' },
          { at: [6, 0.5], text: 'webhook: paid', icon: Webhook, tone: 'ink' },
        ],
      },
      metrics: { p99: '1.8 s' },
    },
    {
      short: 'Saga',
      title: 'A saga across order, stock and payment',
      tag: 'Deep Dive',
      body: [
        'No single transaction spans three services, so checkout runs as a **saga**: reserve stock → charge → confirm. Each step has a **compensation**: payment declined or hold expired → release the hold and mark the order `CANCELLED`; stock lost after charging → refund.',
        'An orchestrator in Orders persists its progress, so a crash resumes instead of leaving stock held forever. Once `PAID`, an event triggers the **confirmation email** — delivered at least once, so dedupe on the order id.',
      ],
      callout: { kind: 'tip', text: 'The Sagas lesson covers orchestration vs choreography; in the interview just name each step and its compensation.' },
      scene: {
        nodes: ec('you', ['gw', { meter: 30 }], 'catalog', 'cart', ['order', { meter: 35 }], 'ordersDb', ['inv', { meter: 30 }], ['stockDb', { meter: 25 }], 'pay', 'psp', 'queue', 'email'),
        links: [L('you', 'gw', { arrow: 'both' }), ...ecLinks],
        flows: [
          F(['order', 'inv', 'stockDb'], { ret: true }),
          F(['order', 'pay', 'psp'], { ret: true, retKind: 'event', delay: 0.8 }),
          F(['order', 'inv'], { kind: 'error', delay: 2.2 }),
          F(['order', 'queue', 'email'], { kind: 'event', delay: 2.8 }),
        ],
        notes: [{ at: [0, -3.5], text: 'declined → release hold', tone: 'warn' }],
      },
    },
    {
      short: 'Flash sale',
      title: 'Flash sale: one red-hot row',
      tag: 'Bottleneck',
      body: [
        'A limited drop at 10:00 sends **1k checkouts/s at one SKU**. Every reservation needs the same row lock, so requests queue, time out and retry — a retry storm. The stock DB pegs at 100% and the whole store slows with it.',
        'Fixes: split the SKU’s stock across **N bucket rows** and reserve from a random one; or keep the counter in memory (an atomic decrement) and persist asynchronously; put a **rate-limited queue** in front of checkout for drops; keep pages cached so browsing is unaffected.',
      ],
      scene: {
        nodes: ec('crowd', ['gw', { meter: 85, status: 'hot' }], 'catalog', 'cart', ['order', { meter: 90, status: 'hot' }], 'ordersDb', ['inv', { meter: 95, status: 'hot' }], ['stockDb', { meter: 99, status: 'hot' }], 'pay', 'psp', 'queue', 'email'),
        links: [L('crowd', 'gw', { arrow: 'both' }), ...ecLinks],
        flows: [
          F(['crowd', 'gw', 'order', 'inv', 'stockDb'], { n: 4, speed: 1.4 }),
          F(['order', 'inv'], { kind: 'error', stop: true, n: 2, delay: 1 }),
          F(['crowd', 'gw', 'catalog'], { ret: true, delay: 0.5 }),
        ],
        notes: [
          { at: [-5.5, -2.5], text: 'one SKU row: 1k locks/s', tone: 'bad' },
          { at: [0, -3.5], text: 'fix: 10 bucket rows', tone: 'good' },
        ],
      },
      metrics: { orders: '1k /s', p99: '9 s', stock: '99%' },
      bad: ['p99', 'stock'],
    },
    {
      short: 'Recap',
      title: 'The whole store',
      tag: 'Recap',
      body: [
        'Browsing must be fast; checkout must be correct. A cached **catalog** and per-user **cart**; an **Orders** service that reserves stock with an atomic conditional update and a TTL hold, charges with an idempotency key, confirms by webhook and moves a forward-only **state machine**.',
        'A **saga** with compensations ties the services together, side effects ride a queue, and hot drops get bucketed counters and metered traffic.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'E-commerce correctness lives in three places: atomic stock reservation, idempotent payments and a state machine that only moves forward.' },
      scene: {
        nodes: ec('you', ['gw', { meter: 40 }], 'catalog', 'cart', ['order', { meter: 40 }], 'ordersDb', ['inv', { meter: 40 }], ['stockDb', { meter: 45 }], 'pay', 'psp', 'queue', 'email'),
        links: [L('you', 'gw', { arrow: 'both' }), ...ecLinks],
        flows: [
          F(['you', 'gw', 'catalog'], { ret: true }),
          F(['you', 'gw', 'order', 'inv', 'stockDb'], { ret: true, delay: 0.6 }),
          F(['order', 'pay', 'psp'], { ret: true, retKind: 'event', delay: 1.4 }),
          F(['order', 'queue', 'email'], { kind: 'event', delay: 2.2 }),
        ],
      },
      metrics: { orders: '1k /s', p99: '1.5 s', oversold: '0', stock: '45%' },
      hi: ['p99', 'stock'],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 15 · Design Amazon                                                  */
/* ------------------------------------------------------------------ */

const az = cast({
  you: { kind: 'device', at: [-7, 0], tag: 'shopper', tagIcon: User },
  crowd: { kind: 'crowd', at: [-7, 0], tag: 'sale day', items: 7 },
  site: { kind: 'cube', at: [0, 0], label: 'Market', sub: '?', icon: Store, tone: 'gray' },
  edge: { kind: 'cube', at: [-3.5, 0], label: 'Edge', sub: 'CDN + LB', icon: Globe, tone: 'teal' },
  search: { kind: 'cube', at: [-3.5, -4.5], label: 'Search', sub: 'scatter', icon: Search, tone: 'blue' },
  index: { kind: 'slab', at: [0, -4.5], tag: 'search index', icon: Layers, tone: 'violet' },
  catalog: { kind: 'cube', at: [4.5, -4.5], label: 'Catalog', sub: '500M items', icon: Package, tone: 'blue' },
  seller: { kind: 'phone', at: [7, -2], tag: 'sellers', tagIcon: Store },
  page: { kind: 'cube', at: [0, 0], label: 'Page', sub: 'aggregator', icon: LayoutGrid, tone: 'blue' },
  price: { kind: 'cube', at: [4, 0], label: 'Price', icon: DollarSign, tone: 'blue', size: 'sm' },
  stock: { kind: 'cube', at: [3.5, 3.5], label: 'Stock', icon: Warehouse, tone: 'blue', size: 'sm' },
  review: { kind: 'cube', at: [0, 4], label: 'Review', icon: Star, tone: 'blue', size: 'sm' },
  recs: { kind: 'cube', at: [-3.5, 3.5], label: 'Recs', icon: Sparkles, tone: 'blue', size: 'sm' },
  cart: { kind: 'cube', at: [-3.5, 4.5], label: 'Cart', sub: 'always on', icon: ShoppingCart, tone: 'blue' },
  cartDb: { kind: 'db', at: [-7, 4.5], tag: 'cart KV', icon: Database },
  orders: { kind: 'cube', at: [0, 4.5], label: 'Orders', sub: 'sharded', icon: Receipt, tone: 'blue' },
  shardA: { kind: 'db', at: [3.5, 1], tag: 'shard 1', icon: Database },
  shardB: { kind: 'db', at: [7, 4.5], tag: 'shard 64', icon: Database },
  region: { kind: 'cube', at: [7, -2], label: 'Region B', sub: 'full copy', icon: Globe, tone: 'gray' },
});

const azLinks = [
  L('edge', 'search', { arrow: 'both' }),
  L('search', 'index', { arrow: 'both' }),
  L('catalog', 'index', { label: 'change stream' }),
  L('edge', 'page', { arrow: 'both' }),
  L('page', 'catalog', { arrow: 'both' }),
  L('edge', 'cart', { arrow: 'both' }),
  L('cart', 'cartDb', { arrow: 'both' }),
  L('cart', 'orders', { label: 'checkout' }),
  L('orders', 'shardA'),
  L('orders', 'shardB'),
];

export const qAmazon: Question = {
  id: 'q-amazon',
  n: 15,
  title: 'Design Amazon',
  blurb: 'A marketplace for 500M products from millions of sellers, built to survive its biggest sale day.',
  minutes: 15,
  level: 'Intermediate',
  concepts: ['Catalog', 'Cart', 'Orders', 'Scaling'],
  related: ['microservices', 'sharding', 'timeouts-retries', 'cap', 'cdn'],
  followUps: [
    'How would you pick which seller’s offer is shown as the default “buy” option?',
    'How do you keep the price in search results consistent with the product page?',
    'How would you move orders onto more shards without downtime?',
    'What happens to in-flight orders if a whole region goes down?',
  ],
  keywords: ['amazon', 'marketplace', 'product catalog', 'search index', 'aggregator', 'fan-out', 'shopping cart', 'sharding', 'prime day', 'multi-region'],
  metrics: [
    { id: 'views', label: 'Page views', icon: Eye },
    { id: 'p99', label: 'Page p99', icon: Timer },
    { id: 'orders', label: 'Orders', icon: Receipt },
    { id: 'avail', label: 'Availability', icon: ShieldCheck },
  ],
  learn: [
    { text: 'Sizing a read-heavy marketplace, including internal fan-out', at: 1 },
    { text: 'Feeding a search index from the catalog’s change stream', at: 4 },
    { text: 'Assembling pages within a latency budget, with fallbacks', at: 5 },
    { text: 'An always-writable cart that merges conflicts', at: 6 },
    { text: 'Pre-scaling and regions for peak days', at: 8 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'A marketplace, not a shop',
      tag: 'Requirements',
      body: [
        'Brief: a marketplace where **millions of sellers** list **hundreds of millions of products**. Shoppers search, open product pages, keep a cart and place orders. Many sellers can offer the same product at different prices.',
        'Non-functional: product pages p99 < 200 ms worldwide; browsing and cart **always available** — downtime costs real money per minute; orders durable and never duplicated. Out of scope: warehouses, delivery routing, ads and seller payouts.',
      ],
      callout: { kind: 'key', text: 'Compared with a single shop, the hard parts here are scale, fan-out and surviving peak days — not the checkout logic itself.' },
      scene: {
        nodes: az('you', 'site'),
        links: [L('you', 'site', { arrow: 'both' })],
        flows: [F(['you', 'site'], { ret: true, n: 3 })],
        notes: [
          { at: [-3.5, -3], text: 'search · page · cart · order', icon: ShoppingCart },
          { at: [-3.5, 3], text: 'page p99 < 200 ms', icon: Timer, tone: 'good' },
          { at: [4, -2], text: 'millions of sellers', icon: Store },
          { at: [4, 2], text: 'cart always writable', icon: ShieldCheck, tone: 'warn' },
        ],
      },
      metrics: { views: '—', p99: '—', orders: '—', avail: '—' },
    },
    {
      short: 'Numbers',
      title: 'Billions of views, millions of orders',
      tag: 'Estimation',
      body: [
        'Assume **100M daily shoppers** × 20 page views = 2B views/day ≈ **23k/s**, ~70k/s at the daily peak and **3–5× that on a big sale day**. Each page fans out to ~10 internal calls, so services see closer to **1M requests/s** at peak.',
        'Orders: 10M/day ≈ 115/s, a few thousand/s on sale days. Catalog: 500M items × ~10 KB ≈ **5 TB** of structured data; images live in object storage behind the CDN. Reads outnumber order writes ~200:1.',
      ],
      scene: {
        nodes: az('you', ['site', { meter: 45 }]),
        links: [L('you', 'site', { arrow: 'both' })],
        flows: [F(['you', 'site'], { ret: true, n: 4 })],
        notes: [
          { at: [-3.5, -3], text: '2B views/day ≈ 23k/s', icon: Eye },
          { at: [-3.5, 3], text: 'sale day: 3–5× peak', tone: 'warn' },
          { at: [4, -2], text: '× 10 internal fan-out', icon: Network },
          { at: [4, 2], text: '500M items ≈ 5 TB', icon: Database },
        ],
      },
      metrics: { views: '70k /s', orders: '115 /s' },
    },
    {
      short: 'API + data',
      title: 'Products, offers, carts and orders',
      tag: 'API',
      body: [
        '`GET /search?q=`, `GET /dp/{asin}` for a product page, `POST /cart/items`, and `POST /orders` with an **idempotency key**. A product (`asin`) is the shared listing; an **offer** `(asin, seller_id, price, qty, condition)` is one seller’s stake in it.',
        'Each store follows its access pattern: catalog and offers in key-value stores keyed by `asin`; carts keyed by `customer_id`; orders **sharded by `customer_id`**, so “your orders” reads a single shard.',
      ],
      scene: {
        nodes: az('you', 'edge', 'search', 'page', 'cart'),
        links: [
          L('you', 'edge', { arrow: 'both' }),
          L('edge', 'search', { arrow: 'both', label: 'GET /search' }),
          L('edge', 'page', { arrow: 'both', label: 'GET /dp/{asin}' }),
          L('edge', 'cart', { arrow: 'both', label: 'POST /cart/items' }),
        ],
        flows: [F(['you', 'edge', 'page'], { ret: true }), F(['you', 'edge', 'search'], { ret: true, delay: 0.8 }), F(['you', 'edge', 'cart'], { kind: 'data', ret: true, delay: 1.6 })],
        notes: [
          { at: [4, -3], text: 'offer: asin + seller + price', icon: Store },
          { at: [4, 3], text: 'orders by customer_id', icon: Receipt },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Independent services behind the edge',
      tag: 'Design',
      body: [
        'The **edge** (CDN + load balancers) serves images and static assets and routes API calls. **Search** queries a sharded **search index**; the **page aggregator** builds product pages; **Cart** and **Orders** own their stores. Each service scales — and fails — on its own.',
        'The **catalog** is the source of truth for listings; the index is a derived, eventually consistent copy fed by the catalog’s change stream.',
      ],
      changes: [
        { sign: '+', text: 'Search + index, Catalog' },
        { sign: '+', text: 'Page aggregator, Cart, Orders' },
      ],
      scene: {
        nodes: az('you', ['edge', { meter: 35 }], 'search', 'index', 'catalog', ['page', { meter: 40 }], 'cart', 'cartDb', 'orders', 'shardA', 'shardB'),
        links: [L('you', 'edge', { arrow: 'both' }), ...azLinks],
        flows: [
          F(['you', 'edge', 'page', 'catalog'], { ret: true, n: 2 }),
          F(['edge', 'search', 'index'], { ret: true, delay: 0.7 }),
          F(['edge', 'cart', 'orders', 'shardA'], { kind: 'data', delay: 1.4 }),
          F(['catalog', 'index'], { kind: 'event', delay: 2 }),
        ],
      },
      metrics: { p99: '180 ms', avail: '99.9%' },
    },
    {
      short: 'Catalog',
      title: '500M items, searchable',
      tag: 'Deep Dive',
      body: [
        'Sellers upload listings in bulk. Catalog **matches** each one to an existing `asin` (by barcode, brand, title) or creates a new one, and stores it in a KV store sharded by `asin`. Every change is published on a **change stream** (CDC).',
        'Indexers consume the stream and update the **search index**, sharded by document: a query fans out to every shard, each returns its top hits, and Search merges them. Index freshness is seconds to minutes — fine for titles, not for price or stock, which pages fetch live.',
      ],
      changes: [{ sign: '+', text: 'Seller bulk feeds' }],
      scene: {
        nodes: az('you', 'edge', 'search', ['index', { meter: 50 }], ['catalog', { meter: 40 }], 'seller'),
        links: [
          L('you', 'edge', { arrow: 'both' }),
          L('edge', 'search', { arrow: 'both' }),
          L('search', 'index', { arrow: 'both', label: 'scatter-gather' }),
          L('catalog', 'index', { label: 'CDC' }),
          L('seller', 'catalog', { label: 'bulk upload' }),
        ],
        flows: [
          F(['seller', 'catalog', 'index'], { kind: 'data', n: 2 }),
          F(['you', 'edge', 'search', 'index'], { ret: true, delay: 0.9 }),
        ],
        notes: [{ at: [1.5, -1.5], text: 'index lags by seconds', icon: Clock, tone: 'warn' }],
      },
    },
    {
      short: 'Product page',
      title: 'One page, many services, one budget',
      tag: 'Deep Dive',
      body: [
        'A product page needs catalog data, **price**, **stock**, **reviews** and **recommendations**, each owned by a different team. The aggregator calls them **in parallel** within a ~150 ms budget, so page latency tracks the slowest call, not the sum.',
        'Split calls by importance: **critical** ones (catalog, price) must succeed or the page errors; **optional** ones (reviews, recs) get tight timeouts and a **fallback** — cached data, a generic best-seller row, or simply hiding the widget.',
      ],
      callout: { kind: 'tip', text: 'Fan-out multiplies tail latency: if each of 10 calls is slow 1% of the time, ~10% of pages hit at least one slow call.' },
      scene: {
        nodes: az('you', 'edge', ['page', { meter: 55 }], 'catalog', 'price', 'stock', 'review', ['recs', { status: 'dim' }]),
        links: [
          L('you', 'edge', { arrow: 'both' }),
          L('edge', 'page', { arrow: 'both' }),
          L('page', 'catalog', { arrow: 'both' }),
          L('page', 'price', { arrow: 'both' }),
          L('page', 'stock', { arrow: 'both' }),
          L('page', 'review', { arrow: 'both' }),
          L('page', 'recs', { tone: 'bad', dashed: true }),
        ],
        flows: [
          F(['you', 'edge', 'page'], { ret: true }),
          F(['page', 'catalog'], { ret: true, retKind: 'data', delay: 0.6 }),
          F(['page', 'price'], { ret: true, retKind: 'data', delay: 0.6 }),
          F(['page', 'stock'], { ret: true, retKind: 'data', delay: 0.6 }),
          F(['page', 'review'], { ret: true, retKind: 'data', delay: 0.6 }),
          F(['page', 'recs'], { kind: 'error', stop: true, delay: 0.6 }),
        ],
        notes: [
          { at: [-1.5, -3], text: 'budget ≈ 150 ms', icon: Timer },
          { at: [-6.5, 2.5], text: 'recs timeout → fallback', tone: 'warn' },
        ],
      },
      metrics: { p99: '160 ms' },
      hi: ['p99'],
    },
    {
      short: 'Cart',
      title: 'A cart that always accepts writes',
      tag: 'Deep Dive',
      body: [
        'A lost “add to cart” is a lost sale, so the cart favours **availability over consistency** (AP in CAP terms). Keep it in a replicated key-value store that accepts writes on any replica, even during a network partition.',
        'Replicas can diverge; on read, **merge** the versions — union of items, highest quantity. The price: a removed item can reappear unless deletes are kept as tombstones. A guest cart merges into the account cart on sign-in the same way.',
      ],
      scene: {
        nodes: az('you', ['edge', { meter: 35 }], ['cart', { meter: 40 }], ['cartDb', { meter: 35 }]),
        links: [L('you', 'edge', { arrow: 'both' }), L('edge', 'cart', { arrow: 'both' }), L('cart', 'cartDb', { arrow: 'both' })],
        flows: [F(['you', 'edge', 'cart', 'cartDb'], { kind: 'data', ret: true, n: 2 })],
        notes: [
          { at: [0.5, 2], text: 'v1 ∪ v2 → merged cart', icon: ShoppingCart, tone: 'good' },
          { at: [0.5, -2.5], text: 'writes never refused', icon: ShieldCheck, tone: 'good' },
        ],
      },
      metrics: { avail: '99.99%' },
      hi: ['avail'],
    },
    {
      short: 'Orders',
      title: 'Sharded orders, async fulfilment',
      tag: 'Deep Dive',
      body: [
        '`POST /orders` re-checks price and offer availability, writes the order to one shard (by `customer_id`) together with its **idempotency key**, and returns. A retried click finds the key and returns the same order instead of a duplicate.',
        'Everything after — payment capture, choosing a warehouse, emails, seller notifications — runs **asynchronously** from order events. 64 shards at a few hundred writes/s each leave ample headroom; grow by splitting shards.',
      ],
      scene: {
        nodes: az('you', 'edge', 'cart', 'cartDb', ['orders', { meter: 45 }], ['shardA', { meter: 30 }], ['shardB', { meter: 30 }]),
        links: [
          L('you', 'edge', { arrow: 'both' }),
          L('edge', 'cart', { arrow: 'both' }),
          L('cart', 'cartDb'),
          L('cart', 'orders', { label: 'checkout' }),
          L('orders', 'shardA'),
          L('orders', 'shardB', { label: 'hash(customer)' }),
        ],
        flows: [F(['you', 'edge', 'cart', 'orders', 'shardA'], { kind: 'data' }), F(['orders', 'shardB'], { kind: 'data', delay: 1.2 })],
        notes: [
          { at: [3.5, -2], text: 'idempotency key per order', icon: ShieldCheck, tone: 'good' },
          { at: [-0.5, -3.5], text: '64 shards, split to grow', icon: Database },
        ],
      },
      metrics: { orders: '2k /s' },
    },
    {
      short: 'Sale day',
      title: 'Sale-day spikes and regions',
      tag: 'Bottleneck',
      body: [
        'A sale day brings 3–5× traffic within minutes — faster than autoscaling can boot servers and warm caches. **Pre-scale** from the forecast, load-test at 2× it, pre-warm caches for deal items, and freeze risky deploys.',
        'Run several **regions**, each a full copy of the stack serving nearby shoppers: catalog data replicates everywhere; each order lives in one home region. Under overload, **shed optional work first** (recs, reviews) to keep search, cart and checkout up.',
      ],
      changes: [{ sign: '+', text: 'Second region' }],
      scene: {
        nodes: az('crowd', ['edge', { meter: 85, status: 'hot' }], 'search', 'index', 'catalog', ['page', { meter: 80, status: 'hot' }], 'cart', 'cartDb', ['orders', { meter: 70 }], 'shardA', 'shardB', 'region'),
        links: [L('crowd', 'edge', { arrow: 'both' }), ...azLinks, L('catalog', 'region', { dashed: true, label: 'replicate' })],
        flows: [
          F(['crowd', 'edge', 'page', 'catalog'], { ret: true, n: 4, speed: 1.3 }),
          F(['crowd', 'edge', 'cart', 'orders', 'shardB'], { kind: 'data', n: 2, delay: 0.6 }),
          F(['catalog', 'region'], { kind: 'data', delay: 1.4 }),
        ],
        notes: [
          { at: [-5.5, -3], text: 'pre-scaled to 2× forecast', tone: 'good' },
          { at: [3.5, -2], text: 'shed recs, reviews first', tone: 'warn' },
        ],
      },
      metrics: { views: '300k /s', p99: '240 ms', orders: '8k /s' },
      bad: ['p99'],
    },
    {
      short: 'Recap',
      title: 'The marketplace',
      tag: 'Recap',
      body: [
        'Independent services behind an edge: a catalog feeding a sharded **search index**, a **page aggregator** that fans out with timeouts and fallbacks, an always-writable **cart** that merges conflicts, and **sharded orders** that hand off to async pipelines.',
        'Peak days are planned, not hoped for: pre-scale, run multiple regions, and degrade gracefully.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'At marketplace scale, design for partial failure: every dependency can be slow or down, so decide in advance what the page does without it.' },
      scene: {
        nodes: az('you', ['edge', { meter: 45 }], 'search', 'index', 'catalog', ['page', { meter: 50 }], 'cart', 'cartDb', ['orders', { meter: 40 }], 'shardA', 'shardB', 'region'),
        links: [L('you', 'edge', { arrow: 'both' }), ...azLinks, L('catalog', 'region', { dashed: true })],
        flows: [
          F(['you', 'edge', 'page', 'catalog'], { ret: true }),
          F(['edge', 'search', 'index'], { ret: true, delay: 0.6 }),
          F(['edge', 'cart', 'orders', 'shardA'], { kind: 'data', delay: 1.2 }),
          F(['catalog', 'region'], { kind: 'data', delay: 1.8 }),
        ],
      },
      metrics: { views: '300k /s', p99: '190 ms', orders: '8k /s', avail: '99.99%' },
      hi: ['p99'],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 16 · Design a Ticket Booking System                                 */
/* ------------------------------------------------------------------ */

const tb = cast({
  crowd: { kind: 'crowd', at: [-7, 0], tag: '100k fans', items: 7 },
  bots: { kind: 'phone', at: [-7, -3.5], tag: 'bots', tagIcon: Bot, tone: 'rose' },
  site: { kind: 'cube', at: [0, 0], label: 'Tickets', sub: '?', icon: Ticket, tone: 'gray' },
  wait: { kind: 'cube', at: [-3.5, 0], label: 'Waiting', sub: 'room', icon: Hourglass, tone: 'teal' },
  line: { kind: 'queue', at: [-3.5, -4.5], tag: 'fan queue', items: 5 },
  booking: { kind: 'cube', at: [0, 0], label: 'Booking', sub: 'holds', icon: Ticket, tone: 'blue' },
  seatmap: { kind: 'cube', at: [0, -4], label: 'SeatMap', sub: 'cache 1 s', icon: LayoutGrid, tone: 'orange' },
  seatsDb: { kind: 'db', at: [4, 0], tag: 'seats', icon: Database },
  reaper: { kind: 'cube', at: [4, -4], label: 'Reaper', sub: 'expiry', icon: Timer, tone: 'blue', size: 'sm' },
  lock: { kind: 'cube', at: [0, 4], label: 'Lock', sub: 'dist lock', icon: Lock, tone: 'yellow', size: 'sm' },
  pay: { kind: 'cube', at: [4, 4], label: 'Payments', sub: 'idempotent', icon: CreditCard, tone: 'blue' },
  psp: { kind: 'slab', at: [7, 4], tag: 'card provider', icon: CreditCard, tone: 'gray' },
});

const tbLinks = [
  L('wait', 'line', { arrow: 'both' }),
  L('wait', 'booking', { label: 'admitted' }),
  L('booking', 'seatmap', { arrow: 'both' }),
  L('booking', 'seatsDb', { arrow: 'both' }),
  L('seatsDb', 'reaper', { arrow: 'both' }),
  L('reaper', 'seatmap', { label: 'refresh' }),
  L('booking', 'pay', { arrow: 'both' }),
  L('pay', 'psp', { arrow: 'both' }),
];

export const qTicketBooking: Question = {
  id: 'q-ticket-booking',
  n: 16,
  title: 'Design a Ticket Booking System',
  blurb: '100k fans, 20k seats, sale opens at 10:00: admit fairly, hold seats safely, never sell one twice.',
  minutes: 14,
  level: 'Intermediate',
  concepts: ['Concurrency', 'Locking'],
  related: ['transactions', 'rate-limiting', 'caching', 'cdn'],
  followUps: [
    'How would you let a group of friends book adjacent seats together?',
    'How would you add general-admission tickets with no seat numbers?',
    'What if one venue’s seats had to be split across several database shards?',
    'How do you keep queue positions fair across multiple devices and refreshes?',
  ],
  keywords: ['ticket booking', 'ticketmaster', 'seat hold', 'waiting room', 'double booking', 'optimistic locking', 'select for update', 'distributed lock', 'flash crowd', 'bots'],
  metrics: [
    { id: 'arrivals', label: 'Arrivals', icon: Users },
    { id: 'admitted', label: 'Admit rate', icon: Hourglass },
    { id: 'double', label: 'Double-booked', icon: TriangleAlert },
    { id: 'db', label: 'Seats DB load', icon: Gauge },
  ],
  learn: [
    { text: 'Sizing a spike: small total work, huge concurrency', at: 1 },
    { text: 'Admitting users through a virtual waiting room', at: 4 },
    { text: 'Expiring seat holds with one conditional update', at: 5 },
    { text: 'Row locks vs optimistic versions vs distributed locks', at: 6 },
    { text: 'Defending against bots and refresh storms', at: 8 },
  ],
  steps: [
    {
      short: 'Scope',
      title: '100k fans, 20k seats, 10:00 sharp',
      tag: 'Requirements',
      body: [
        'Brief: a stadium show with **20k seats** goes on sale at **10:00** and **~100k fans** are waiting. Users see a seat map, pick seats, get them **held for 10 minutes** while they pay, then receive tickets. Unpaid holds go back on sale.',
        'Non-functional: **never sell a seat twice**; stay up through a 100× spike; be **fair** — roughly first come, first served — and resist bots. Out of scope: resale and transfers, venue setup tools, dynamic pricing.',
      ],
      callout: { kind: 'tip', text: 'Ask how many seats vs how many buyers. A 5:1 demand ratio tells you most users will leave empty-handed — so fairness and clear feedback matter.' },
      scene: {
        nodes: tb('crowd', 'site'),
        links: [L('crowd', 'site', { arrow: 'both' })],
        flows: [F(['crowd', 'site'], { ret: true, n: 4, speed: 1.3 })],
        notes: [
          { at: [-3.5, -3], text: '20k seats · 100k fans', icon: Users },
          { at: [-3.5, 3], text: 'hold 10 min while paying', icon: Clock, tone: 'warn' },
          { at: [4, -2], text: 'never double-book', icon: Ticket, tone: 'bad' },
          { at: [4, 2], text: 'first come, first served', tone: 'good' },
        ],
      },
      metrics: { arrivals: '—', admitted: '—', double: '—', db: '—' },
    },
    {
      short: 'Numbers',
      title: 'A minute-long stampede',
      tag: 'Estimation',
      body: [
        '100k fans arrive within ~60 s and refresh constantly: **2k–10k req/s** just for pages, plus seat-map polling. At ~4 tickets per order, 20k seats is only **~5k orders** — the sale is over in minutes. The total work is small; the **concurrency** is the problem.',
        'If a buyer needs ~3 minutes to pick and pay, a few thousand buyers in the flow at once is enough to sell out fast. So booking handles a few hundred hold attempts/s — but thousands of them aim at the **same best seats**.',
      ],
      scene: {
        nodes: tb('crowd', ['site', { meter: 95, status: 'hot' }]),
        links: [L('crowd', 'site', { arrow: 'both' })],
        flows: [F(['crowd', 'site'], { ret: true, n: 6, speed: 1.5 })],
        notes: [
          { at: [-3.5, -3], text: '100k arrivals in ~60 s', icon: Users, tone: 'warn' },
          { at: [-3.5, 3], text: '20k seats ≈ 5k orders', icon: Ticket },
          { at: [4, -2], text: '~10k req/s of refreshes', tone: 'bad' },
          { at: [4, 2], text: 'hot seats: front rows', tone: 'bad' },
        ],
      },
      metrics: { arrivals: '100k /min', db: '95%' },
      bad: ['db'],
    },
    {
      short: 'API + data',
      title: 'Seats, holds and orders',
      tag: 'Data Model',
      body: [
        '`GET /events/{id}/seats` → seat map; `POST /holds {seat_ids}` → `{hold_id, expires_at}` or `409`; `POST /orders {hold_id}` → pay; `DELETE /holds/{id}` when a user gives up. Every call except the map needs an **admission token**.',
        '`seats(event_id, seat_id, status, hold_id, hold_expires_at, version)`, PK `(event_id, seat_id)`, status `FREE | HELD | SOLD`. Plus `holds(hold_id, user_id, expires_at)` and `orders(order_id, hold_id UNIQUE, status, payment_ref)`.',
      ],
      scene: {
        nodes: tb('crowd', 'wait', 'booking', 'seatsDb'),
        links: [L('crowd', 'wait', { arrow: 'both' }), L('wait', 'booking', { arrow: 'both', label: 'POST /holds' }), L('booking', 'seatsDb', { arrow: 'both' })],
        flows: [F(['crowd', 'wait', 'booking', 'seatsDb'], { kind: 'data', ret: true })],
        notes: [
          { at: [2, -3], text: 'FREE → HELD → SOLD', icon: Ticket, tone: 'good' },
          { at: [2, 3], text: 'PK (event_id, seat_id)', icon: Database },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Gate the crowd, then book',
      tag: 'Design',
      body: [
        'A **waiting room** at the edge absorbs the crowd and admits users at a controlled rate. Admitted users read the **seat map** from a cache, create a **hold** through Booking, then pay via **Payments**. One relational **seats** table is the single source of truth.',
        'A **reaper** job releases expired holds and refreshes the cached map, so abandoned seats come back on sale.',
      ],
      changes: [
        { sign: '+', text: 'Waiting room + fan queue' },
        { sign: '+', text: 'Seat-map cache, reaper, payments' },
      ],
      scene: {
        nodes: tb('crowd', ['wait', { meter: 60 }], 'line', ['booking', { meter: 40 }], 'seatmap', ['seatsDb', { meter: 30 }], 'reaper', 'pay', 'psp'),
        links: [L('crowd', 'wait', { arrow: 'both' }), ...tbLinks],
        flows: [
          F(['crowd', 'wait', 'line'], { kind: 'event', n: 3 }),
          F(['wait', 'booking', 'seatsDb'], { ret: true, delay: 0.8 }),
          F(['booking', 'pay', 'psp'], { ret: true, delay: 1.6 }),
          F(['seatsDb', 'reaper', 'seatmap'], { kind: 'event', delay: 2.4 }),
        ],
      },
      metrics: { admitted: '2k /min', db: '30%' },
      hi: ['db'],
    },
    {
      short: 'Waiting room',
      title: 'A virtual waiting room',
      tag: 'Deep Dive',
      body: [
        'Everyone who arrives before 10:00 gets a **random position**, so opening ten tabs early gains nothing; later arrivals join the back. The waiting page is static, served from the CDN, and polls a cheap status endpoint — 100k pollers never touch the seats DB.',
        'An admission controller lets in **~2k users/min**, tuned to what Booking handles, issuing a **signed, short-lived token** bound to the account. Booking rejects calls without one. As buyers finish or time out, more are admitted — a closed loop.',
      ],
      callout: { kind: 'key', text: 'A waiting room turns an uncontrolled spike into a steady, measured flow: rate limiting with a polite UI and a fair order.' },
      scene: {
        nodes: tb('crowd', ['wait', { meter: 70 }], ['line', { items: 7 }], ['booking', { meter: 40 }], ['seatsDb', { meter: 30 }]),
        links: [
          L('crowd', 'wait', { arrow: 'both', label: 'position?' }),
          L('wait', 'line', { arrow: 'both' }),
          L('wait', 'booking', { label: 'token' }),
          L('booking', 'seatsDb', { arrow: 'both' }),
        ],
        flows: [
          F(['crowd', 'wait', 'line'], { kind: 'event', n: 4, speed: 1.3 }),
          F(['crowd', 'wait'], { ret: true, n: 2, delay: 0.5 }),
          F(['wait', 'booking', 'seatsDb'], { ret: true, delay: 1.4 }),
        ],
        notes: [
          { at: [0, -3], text: 'admit ~2k users / min', icon: Hourglass, tone: 'good' },
          { at: [-1.5, 3], text: 'static page on the CDN', icon: Globe },
        ],
      },
    },
    {
      short: 'Holds',
      title: 'Temporary holds that expire',
      tag: 'Deep Dive',
      body: [
        'Place a hold with one statement: `UPDATE seats SET status=HELD, hold_id=:h, hold_expires_at=now()+10m WHERE event_id=:e AND seat_id IN (:s) AND (status=FREE OR (status=HELD AND hold_expires_at < now()))`. If fewer rows change than requested, roll back: `409`.',
        'Expiry is **lazy**: an expired hold counts as free in that condition, so seats free up on time even if the reaper lags. The **reaper** sweeps every few seconds to mark them `FREE` and refresh the map; the client counts down from `expires_at`.',
      ],
      scene: {
        nodes: tb('crowd', 'wait', ['booking', { meter: 45 }], 'seatmap', ['seatsDb', { meter: 40 }], ['reaper', { meter: 20 }]),
        links: [
          L('crowd', 'wait', { arrow: 'both' }),
          L('wait', 'booking'),
          L('booking', 'seatmap', { arrow: 'both' }),
          L('booking', 'seatsDb', { arrow: 'both', label: 'hold 4 seats' }),
          L('seatsDb', 'reaper', { arrow: 'both' }),
          L('reaper', 'seatmap', { label: 'refresh' }),
        ],
        flows: [
          F(['wait', 'booking', 'seatsDb'], { ret: true }),
          F(['booking', 'seatsDb'], { kind: 'error', stop: true, delay: 1.2 }),
          F(['seatsDb', 'reaper', 'seatmap'], { kind: 'event', delay: 2 }),
        ],
        notes: [
          { at: [4.5, 2.5], text: 'rows < 4 → roll back, 409', tone: 'bad' },
          { at: [-3.5, -3], text: 'all-or-nothing per hold', tone: 'good' },
        ],
      },
    },
    {
      short: 'No doubles',
      title: 'Preventing double-booking',
      tag: 'Deep Dive',
      body: [
        'Options: a **pessimistic lock** (`SELECT … FOR UPDATE`, then write) — correct, but holds locks across round trips; a **conditional update** — one atomic statement; an **optimistic version** (`… WHERE version=:v`) — cheap, retry on conflict. All lean on the DB’s row-level atomicity.',
        'A **distributed lock** in a separate store adds a system that can lose a lock on failover, or let a paused holder write after expiry — you still need the DB condition as a fence. Choose the conditional update and keep one event’s seats on one partition.',
      ],
      callout: { kind: 'key', text: 'The database row is the lock. An extra lock service adds failure modes without removing the need for an atomic write.' },
      scene: {
        nodes: tb('crowd', 'wait', ['booking', { meter: 45 }], ['seatsDb', { meter: 40 }], ['lock', { status: 'dim' }]),
        links: [
          L('crowd', 'wait', { arrow: 'both' }),
          L('wait', 'booking'),
          L('booking', 'seatsDb', { arrow: 'both', label: 'compare-and-set' }),
          L('booking', 'lock', { dashed: true, tone: 'muted' }),
        ],
        flows: [
          F(['wait', 'booking', 'seatsDb'], { ret: true, n: 3 }),
          F(['booking', 'seatsDb'], { kind: 'error', stop: true, delay: 1.1 }),
          F(['booking', 'lock'], { kind: 'handshake', stop: true, delay: 2 }),
        ],
        notes: [
          { at: [4, -3], text: 'version 7 → 8: one winner', icon: ShieldCheck, tone: 'good' },
          { at: [3.5, 3], text: 'lock lost on failover?', tone: 'warn' },
        ],
      },
      metrics: { double: '0' },
      hi: ['double'],
    },
    {
      short: 'Pay in time',
      title: 'Paying inside the hold window',
      tag: 'Deep Dive',
      body: [
        '`POST /orders` creates a `PENDING` order linked to the hold and charges via the provider with the order id as **idempotency key**. On success, one statement flips the seats `HELD → SOLD` **only if the hold is still ours**: `WHERE hold_id=:h`.',
        'Close the payment form a minute before `expires_at` so in-flight charges finish inside the window. If a charge still lands late and the seats were re-held by someone else, zero rows change — **refund automatically**. Never sell first and fix later.',
      ],
      scene: {
        nodes: tb('crowd', 'wait', ['booking', { meter: 40 }], ['seatsDb', { meter: 35 }], 'pay', 'psp'),
        links: [
          L('crowd', 'wait', { arrow: 'both' }),
          L('wait', 'booking'),
          L('booking', 'seatsDb', { arrow: 'both', label: 'HELD → SOLD' }),
          L('booking', 'pay', { arrow: 'both', label: 'charge' }),
          L('pay', 'psp', { arrow: 'both' }),
        ],
        flows: [
          F(['booking', 'pay', 'psp'], { ret: true, retKind: 'event' }),
          F(['booking', 'seatsDb'], { kind: 'data', ret: true, delay: 1.6 }),
        ],
        notes: [
          { at: [-3.5, 3], text: 'late + seats gone → refund', tone: 'warn' },
          { at: [4, -3], text: 'key = order_id', icon: ShieldCheck, tone: 'good' },
        ],
      },
    },
    {
      short: 'Bots + load',
      title: 'Bots, hot seats and refresh storms',
      tag: 'Bottleneck',
      body: [
        '**Bots** grab queue spots and holds to resell. Defences: a CAPTCHA or proof-of-work to join the queue, one queue spot per verified account and card, per-user seat limits (e.g. 6), and pre-registration for the biggest shows.',
        'Everyone polls the seat map: serve it from cache with **1–2 s staleness** and push deltas, accepting that a seat shown free may be gone (the hold returns `409`). If the seats DB still runs hot, partition seats by section across shards.',
      ],
      scene: {
        nodes: tb('crowd', 'bots', ['wait', { meter: 90, status: 'hot' }], ['line', { items: 7 }], ['booking', { meter: 70 }], ['seatmap', { meter: 90, status: 'hot' }], ['seatsDb', { meter: 75 }], 'reaper'),
        links: [
          L('crowd', 'wait', { arrow: 'both' }),
          L('bots', 'wait', { tone: 'bad' }),
          L('wait', 'line', { arrow: 'both' }),
          L('wait', 'booking'),
          L('booking', 'seatmap', { arrow: 'both' }),
          L('booking', 'seatsDb', { arrow: 'both' }),
          L('seatsDb', 'reaper', { arrow: 'both' }),
          L('reaper', 'seatmap'),
        ],
        flows: [
          F(['bots', 'wait'], { kind: 'error', stop: true, n: 3, speed: 1.5 }),
          F(['crowd', 'wait', 'booking', 'seatmap'], { ret: true, n: 3, delay: 0.5 }),
          F(['booking', 'seatsDb'], { ret: true, delay: 1.2 }),
        ],
        notes: [
          { at: [-1.5, 3], text: 'CAPTCHA + 1 spot / account', icon: Bot, tone: 'good' },
          { at: [4, 2.5], text: 'map stale ≤ 2 s is fine', tone: 'warn' },
        ],
      },
      metrics: { db: '75%' },
      bad: ['db'],
    },
    {
      short: 'Recap',
      title: 'The booking flow',
      tag: 'Recap',
      body: [
        'A **waiting room** turns 100k simultaneous fans into a steady trickle; a cached **seat map** soaks up reads; a **hold** is one conditional update with a 10-minute expiry, released lazily and by a reaper; payment lands inside the hold window, with idempotency keys and auto-refunds as backstop.',
        'The seats table stays the single source of truth — no separate lock service needed.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Control admission, make the hold one atomic write, and let time-based expiry return seats. Fairness and correctness follow.' },
      scene: {
        nodes: tb('crowd', ['wait', { meter: 60 }], 'line', ['booking', { meter: 45 }], 'seatmap', ['seatsDb', { meter: 45 }], 'reaper', 'pay', 'psp'),
        links: [L('crowd', 'wait', { arrow: 'both' }), ...tbLinks],
        flows: [
          F(['crowd', 'wait', 'line'], { kind: 'event', n: 2 }),
          F(['wait', 'booking', 'seatsDb'], { ret: true, delay: 0.6 }),
          F(['booking', 'pay', 'psp'], { ret: true, delay: 1.4 }),
          F(['seatsDb', 'reaper', 'seatmap'], { kind: 'event', delay: 2.2 }),
        ],
      },
      metrics: { arrivals: '100k /min', admitted: '2k /min', double: '0', db: '45%' },
      hi: ['db'],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 32 · Design a Recommendation System                                 */
/* ------------------------------------------------------------------ */

const rc = cast({
  you: { kind: 'device', at: [-7, 0], tag: 'shopper', tagIcon: User },
  site: { kind: 'cube', at: [0, 0], label: 'Recs', sub: '?', icon: Sparkles, tone: 'gray' },
  cache: { kind: 'cube', at: [-7, -3.5], label: 'Cache', icon: Zap, tone: 'orange', size: 'sm' },
  recs: { kind: 'cube', at: [-3.5, -3.5], label: 'Recs', sub: 'serving', icon: Sparkles, tone: 'blue' },
  cand: { kind: 'cube', at: [0, -3.5], label: 'Retrieve', sub: 'candidates', icon: Network, tone: 'blue' },
  rank: { kind: 'cube', at: [3.5, -3.5], label: 'Ranker', sub: 'model', icon: BrainCircuit, tone: 'blue' },
  features: { kind: 'db', at: [7, 0], tag: 'feature store', icon: Database },
  ab: { kind: 'cube', at: [-3.5, 0], label: 'A/B', sub: 'buckets', icon: FlaskConical, tone: 'yellow', size: 'sm' },
  events: { kind: 'queue', at: [-3.5, 3.5], tag: 'event stream', items: 4 },
  stream: { kind: 'cube', at: [0, 0], label: 'Stream', sub: 'processor', icon: Activity, tone: 'blue', size: 'sm' },
  lake: { kind: 'slab', at: [0, 3.5], tag: 'data lake', icon: HardDrive, tone: 'violet' },
  train: { kind: 'cube', at: [3.5, 3.5], label: 'Train', sub: 'daily batch', icon: Cpu, tone: 'blue' },
});

const rcServe = [
  L('you', 'recs', { arrow: 'both' }),
  L('recs', 'cache', { arrow: 'both' }),
  L('recs', 'cand', { arrow: 'both' }),
  L('cand', 'rank', { arrow: 'both' }),
  L('rank', 'features', { arrow: 'both' }),
];
const rcOffline = [
  L('you', 'events', { label: 'events' }),
  L('events', 'lake'),
  L('lake', 'train'),
  L('train', 'cand', { elbow: false, dashed: true, label: 'embeddings' }),
  L('train', 'rank', { dashed: true, label: 'model' }),
];

export const qRecommendations: Question = {
  id: 'q-recommendations',
  n: 32,
  title: 'Design a Recommendation System',
  blurb: '“Customers also bought” and “For you”: event streams, batch training and a 50 ms serving path.',
  minutes: 16,
  level: 'Advanced',
  concepts: ['Event Streams', 'ML', 'Data Pipelines'],
  related: ['batch-stream', 'message-queues', 'caching', 'timeouts-retries'],
  followUps: [
    'How would you stop recommending items that are out of stock or already bought?',
    'How would you prove that recommendations actually increase revenue?',
    'How do you safely roll out — and roll back — a new ranking model?',
    'How would you handle a shopper buying gifts that skew their history?',
  ],
  keywords: ['recommendation system', 'customers also bought', 'collaborative filtering', 'embeddings', 'approximate nearest neighbour', 'feature store', 'candidate generation', 'ranking', 'cold start', 'a/b testing'],
  metrics: [
    { id: 'qps', label: 'Rec requests', icon: Activity },
    { id: 'p99', label: 'Recs p99', icon: Timer },
    { id: 'fresh', label: 'Action → effect', icon: Clock },
    { id: 'ctr', label: 'Click-through', icon: MousePointerClick },
  ],
  learn: [
    { text: 'Sizing event volume and serving load', at: 1 },
    { text: 'Two-stage serving: retrieval, then ranking', at: 4 },
    { text: 'Feature stores and training/serving skew', at: 5 },
    { text: 'Near-real-time features and cold start', at: 6 },
    { text: 'A/B tests and the feedback loop', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: '“Also bought” and “For you”',
      tag: 'Requirements',
      body: [
        'Brief: on a large online store, show **“customers also bought”** on product pages and a personalised **“recommended for you”** row on the home page. Signals: views, clicks, add-to-carts and purchases. Assume **50M users** and **10M items**.',
        'Non-functional: add **< 50 ms** to page p99; reflect what a shopper did this session within **minutes**; degrade to something sensible (best-sellers), never an empty box. Out of scope: detailed model architecture and ads.',
      ],
      callout: { kind: 'tip', text: 'Interviewers want the data system around the model: where events go, how models are built and served, and how you know it works.' },
      scene: {
        nodes: rc('you', 'site'),
        links: [L('you', 'site', { arrow: 'both' })],
        flows: [F(['you', 'site'], { ret: true, n: 2 }), F(['you', 'site'], { kind: 'event', delay: 1 })],
        notes: [
          { at: [-3.5, -3], text: '“also bought” per item', icon: ShoppingCart },
          { at: [-3.5, 3], text: '“for you” per user', icon: User },
          { at: [4, -2], text: '+ < 50 ms to page p99', icon: Timer, tone: 'warn' },
          { at: [4, 2], text: 'react within minutes', icon: Clock, tone: 'good' },
        ],
      },
      metrics: { qps: '—', p99: '—', fresh: '—', ctr: '—' },
    },
    {
      short: 'Numbers',
      title: 'Events in, recommendations out',
      tag: 'Estimation',
      body: [
        '20M daily users × ~50 events ≈ **1B events/day ≈ 12k/s**, ~40k/s at peak; at ~200 B each that is **~200 GB/day** of raw logs. Serving: ~300M page views/day × 3 widgets ≈ 10k rec requests/s, **~30k/s** at peak.',
        'Scoring all 10M items per request is impossible in 50 ms, so serving is **two-stage**: cheaply retrieve ~500 candidates, then rank only those with a heavier model. Learning from months of history is a **batch** job; reacting to this session is a **stream** job.',
      ],
      scene: {
        nodes: rc('you', ['site', { meter: 40 }]),
        links: [L('you', 'site', { arrow: 'both' })],
        flows: [F(['you', 'site'], { ret: true, n: 3 }), F(['you', 'site'], { kind: 'event', n: 3, delay: 0.6 })],
        notes: [
          { at: [-3.5, -3], text: '1B events/day ≈ 12k/s', icon: Activity },
          { at: [-3.5, 3], text: '~200 GB of logs / day', icon: HardDrive },
          { at: [4, -2], text: '~30k rec requests/s peak', icon: Sparkles },
          { at: [4, 2], text: '10M items → 500 → 20', tone: 'good' },
        ],
      },
      metrics: { qps: '30k /s' },
    },
    {
      short: 'API + data',
      title: 'Events, embeddings and features',
      tag: 'Data Model',
      body: [
        '`GET /recs?user=…&context=home|item:{id}&n=20` → ranked item ids plus a `rec_id` for attribution. Clients emit `{user_id, item_id, action, ts, rec_id}` — view, click, cart, purchase — to a collector that appends them to the **event stream**.',
        'Offline outputs: item **embeddings** (vectors where similar items sit close together), **co-occurrence** lists (item → items bought with it) and a ranking model. Online **features** — recent items, popularity, price band — are keyed by user or item.',
      ],
      scene: {
        nodes: rc('you', 'recs', 'events', 'lake'),
        links: [L('you', 'recs', { arrow: 'both', label: 'GET /recs' }), L('you', 'events', { label: 'events' }), L('events', 'lake')],
        flows: [F(['you', 'recs'], { ret: true, retKind: 'data' }), F(['you', 'events', 'lake'], { kind: 'event', n: 3, delay: 0.8 })],
        notes: [
          { at: [2, -2], text: 'rec_id ties clicks to recs', icon: MousePointerClick, tone: 'good' },
          { at: [4, 1.5], text: 'item → vector (embedding)', icon: Network },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Offline training, online serving',
      tag: 'Design',
      body: [
        '**Offline**: events land in a **data lake**; a daily **training** job builds embeddings, co-occurrence lists and a ranking model, and publishes them to serving. **Online**: Recs asks **Retrieve** for candidates, the **Ranker** scores them using the **feature store**, and results are cached briefly.',
        'The two halves share only published artefacts and features, so a slow training run never slows a page.',
      ],
      changes: [
        { sign: '+', text: 'Data lake + daily training' },
        { sign: '+', text: 'Retrieve → Ranker, feature store, cache' },
      ],
      scene: {
        nodes: rc('you', 'cache', ['recs', { meter: 40 }], 'cand', 'rank', 'features', 'events', 'lake', 'train'),
        links: [...rcServe, ...rcOffline],
        flows: [
          F(['you', 'recs', 'cand', 'rank'], { ret: true }),
          F(['rank', 'features'], { kind: 'data', ret: true, delay: 1 }),
          F(['you', 'events', 'lake', 'train'], { kind: 'event', delay: 0.5 }),
          F(['train', 'rank'], { kind: 'data', delay: 2 }),
        ],
      },
      metrics: { p99: '45 ms', fresh: '24 h', ctr: '3.0%' },
    },
    {
      short: 'Retrieval',
      title: 'Candidates: cheap and broad',
      tag: 'Deep Dive',
      body: [
        'Merge several cheap sources: **co-occurrence** (“bought together” counts, normalised so best-sellers don’t win everything), **nearest neighbours** in embedding space of items the user recently viewed, and popular-in-category as a safety net.',
        'Exact nearest-neighbour search over 10M vectors is too slow, so use an **approximate nearest-neighbour (ANN)** index — it gives up a little recall for millisecond lookups. Each source returns 100–200 items; dedupe to ~500.',
      ],
      scene: {
        nodes: rc('you', 'cache', 'recs', ['cand', { meter: 55 }], 'rank', 'lake', 'train'),
        links: [
          L('you', 'recs', { arrow: 'both' }),
          L('recs', 'cache', { arrow: 'both' }),
          L('recs', 'cand', { arrow: 'both' }),
          L('cand', 'rank', { arrow: 'both' }),
          L('lake', 'train'),
          L('train', 'cand', { elbow: false, dashed: true, label: 'embeddings' }),
        ],
        flows: [
          F(['you', 'recs', 'cand'], { ret: true, retKind: 'data' }),
          F(['lake', 'train', 'cand'], { kind: 'data', delay: 1.2 }),
        ],
        notes: [
          { at: [-1.5, -0.5], text: 'ANN: ~5 ms for top 200', icon: Zap, tone: 'good' },
          { at: [4, -0.5], text: 'co-buy + similar + popular', tone: 'ink' },
        ],
      },
    },
    {
      short: 'Ranking',
      title: 'Ranking with a feature store',
      tag: 'Deep Dive',
      body: [
        'The **Ranker** estimates each candidate’s chance of a click or purchase from user, item and context features — recent categories, price band, popularity, time of day. A gradient-boosted tree model or small neural net can score 500 items in ~10–20 ms.',
        'The **feature store** serves the same feature definitions offline (training) and online (serving), avoiding **training/serving skew** — a model learning on values computed one way and served values computed another. Then apply rules: in stock, no repeats, some diversity.',
      ],
      scene: {
        nodes: rc('you', 'recs', 'cand', ['rank', { meter: 55 }], ['features', { meter: 45 }], 'lake', 'train'),
        links: [
          L('you', 'recs', { arrow: 'both' }),
          L('recs', 'cand', { arrow: 'both' }),
          L('cand', 'rank', { arrow: 'both', label: '500 items' }),
          L('rank', 'features', { arrow: 'both' }),
          L('lake', 'train'),
          L('train', 'rank', { dashed: true, label: 'model' }),
          L('lake', 'features', { elbow: false, dashed: true, label: 'same features' }),
        ],
        flows: [
          F(['you', 'recs', 'cand', 'rank'], { ret: true }),
          F(['rank', 'features'], { kind: 'data', ret: true, delay: 0.9 }),
          F(['lake', 'train', 'rank'], { kind: 'data', delay: 1.8 }),
        ],
        notes: [{ at: [-3.5, 1.5], text: 'filter: in stock, no repeats', tone: 'ink' }],
      },
      metrics: { ctr: '3.4%' },
      hi: ['ctr'],
    },
    {
      short: 'Real time',
      title: 'Fresh sessions and cold starts',
      tag: 'Deep Dive',
      body: [
        'A nightly model doesn’t know the shopper just viewed three tents. A **stream processor** consumes events and updates session features — last 50 items, current categories — in the feature store within **seconds**, so retrieval and ranking react without retraining.',
        '**Cold start** uses the same path: a new user sees popular items for their context, then personalised ones after a few clicks. A new item has no co-purchases, so place it by **content features** (title, category, attributes) until behaviour data arrives.',
      ],
      changes: [{ sign: '+', text: 'Stream processor → feature store' }],
      scene: {
        nodes: rc('you', 'cache', 'recs', 'cand', 'rank', ['features', { meter: 50 }], 'events', ['stream', { meter: 45 }], 'lake', 'train'),
        links: [...rcServe, ...rcOffline, L('events', 'stream'), L('stream', 'features')],
        flows: [
          F(['you', 'events', 'stream', 'features'], { kind: 'event', n: 2 }),
          F(['you', 'recs', 'cand', 'rank', 'features'], { ret: true, delay: 1 }),
          F(['events', 'lake', 'train'], { kind: 'data', delay: 1.8 }),
        ],
      },
      metrics: { fresh: '~10 s', ctr: '3.7%' },
      hi: ['fresh', 'ctr'],
    },
    {
      short: 'A/B tests',
      title: 'A/B tests and the feedback loop',
      tag: 'Deep Dive',
      body: [
        'Every change ships behind an **A/B test**: users are hashed into buckets, each served by a different model or setting, and the `rec_id` on events attributes clicks and purchases back to the variant. Judge on conversion or revenue over weeks, not CTR alone.',
        'Watch the **feedback loop**: the model only learns from what it chose to show, so popular items get ever more popular. Reserve a small slice of traffic for exploration, and log what was shown — not just what was clicked.',
      ],
      changes: [{ sign: '+', text: 'Experiment buckets' }],
      scene: {
        nodes: rc('you', 'cache', ['recs', { meter: 40 }], 'cand', 'rank', 'features', 'ab', 'events', 'stream', 'lake', 'train'),
        links: [
          ...rcServe,
          ...rcOffline,
          L('events', 'stream'),
          L('stream', 'features'),
          L('recs', 'ab', { arrow: 'both', label: 'variant' }),
          L('events', 'ab', { label: 'outcomes' }),
        ],
        flows: [
          F(['you', 'recs', 'ab'], { ret: true }),
          F(['you', 'events', 'ab'], { kind: 'event', n: 2, delay: 0.8 }),
          F(['events', 'lake', 'train', 'rank'], { kind: 'data', delay: 1.6 }),
        ],
        notes: [{ at: [5.5, 2.25], text: '5% traffic explores', icon: FlaskConical, tone: 'good' }],
      },
      metrics: { ctr: '3.9%' },
      hi: ['ctr'],
    },
    {
      short: 'Hot path',
      title: 'Feature fan-out and the budget',
      tag: 'Bottleneck',
      body: [
        'At 30k requests/s × 500 candidates, naively fetching item features means **15M feature reads/s**: the store melts and p99 blows the 50 ms budget. Fix: keep item features (small, slow-changing) in Ranker memory, fetch only user features per request, and batch reads.',
        'Cache “also bought” lists per item and home rows per user for a few minutes — most traffic hits a small set of popular items. If the Ranker misses its deadline, return the retrieval order or a cached list: **never block the page** on recommendations.',
      ],
      scene: {
        nodes: rc('you', ['cache', { meter: 60 }], ['recs', { meter: 80 }], 'cand', ['rank', { meter: 85, status: 'hot' }], ['features', { meter: 98, status: 'hot' }], 'ab', 'events', 'stream', 'lake', 'train'),
        links: [...rcServe, ...rcOffline, L('events', 'stream'), L('stream', 'features'), L('recs', 'ab', { arrow: 'both' }), L('events', 'ab')],
        flows: [
          F(['rank', 'features'], { ret: true, n: 4, speed: 1.6 }),
          F(['you', 'recs', 'cand', 'rank'], { kind: 'error', stop: true, delay: 0.8 }),
          F(['you', 'recs', 'cache'], { ret: true, delay: 1.4 }),
        ],
        notes: [
          { at: [5.5, -2.5], text: '15M feature reads / s', tone: 'bad' },
          { at: [1.75, -1.5], text: 'fallback: cached list', tone: 'good' },
        ],
      },
      metrics: { p99: '120 ms' },
      bad: ['p99'],
    },
    {
      short: 'Recap',
      title: 'The recommender',
      tag: 'Recap',
      body: [
        'Events flow into a stream; a **batch** path trains embeddings, co-occurrence lists and a ranking model; a **stream** path keeps session features fresh. Serving is **two-stage** — broad, cheap retrieval with ANN and co-occurrence, then a ranker fed by a feature store — behind caches and fallbacks.',
        '**A/B tests** with attributed events close the loop, and a slice of exploration keeps it honest.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Recommenders are data systems first: get events, features and the batch/stream split right, and models become swappable parts.' },
      scene: {
        nodes: rc('you', ['cache', { meter: 50 }], ['recs', { meter: 45 }], 'cand', ['rank', { meter: 50 }], ['features', { meter: 45 }], 'ab', 'events', 'stream', 'lake', 'train'),
        links: [...rcServe, ...rcOffline, L('events', 'stream'), L('stream', 'features'), L('recs', 'ab', { arrow: 'both' }), L('events', 'ab')],
        flows: [
          F(['you', 'recs', 'cand', 'rank'], { ret: true }),
          F(['you', 'events', 'stream', 'features'], { kind: 'event', delay: 0.8 }),
          F(['events', 'lake', 'train', 'cand'], { kind: 'data', delay: 1.6 }),
        ],
      },
      metrics: { qps: '30k /s', p99: '40 ms', fresh: '~10 s', ctr: '3.9%' },
      hi: ['p99'],
    },
  ],
};
