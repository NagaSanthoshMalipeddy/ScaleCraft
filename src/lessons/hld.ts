import {
  Bell,
  Bike,
  BookOpen,
  Boxes,
  Braces,
  ChefHat,
  CircleX,
  ClipboardList,
  Cog,
  Database,
  MapPin,
  Network,
  PackageCheck,
  Receipt,
  Send,
  ShoppingBag,
  Store,
  Table2,
  ZoomIn,
} from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* HLD & LLD                                                            */
/* ------------------------------------------------------------------ */

const fd = cast({
  /* High-level view */
  tablet: { kind: 'device', at: [-7, -4], tag: 'restaurant', tagIcon: Store },
  cust: { kind: 'phone', at: [-7, 0], tag: 'customer app' },
  rider: { kind: 'phone', at: [-7, 4], tag: 'courier app' },
  box: { kind: 'cube', at: [-3, 0], label: 'System', sub: '?', icon: Boxes, tone: 'gray' },
  gw: { kind: 'cube', at: [-3, 0], label: 'Gateway', sub: 'auth·route', icon: Network, tone: 'green' },
  menus: { kind: 'cube', at: [1, -4], label: 'Menus', sub: 'restaurants', icon: ChefHat, tone: 'blue' },
  orders: { kind: 'cube', at: [1, 0], label: 'Orders', sub: 'lifecycle', icon: Receipt, tone: 'blue' },
  couriers: { kind: 'cube', at: [1, 4], label: 'Couriers', sub: 'dispatch', icon: Bike, tone: 'blue' },
  menudb: { kind: 'db', at: [-3, -4], tag: 'menus db', icon: BookOpen },
  ordersdb: { kind: 'db', at: [5, -4], tag: 'orders (SQL)', icon: Database },
  geo: { kind: 'cube', at: [-3, 4], label: 'Geo', sub: 'live GPS', icon: MapPin, tone: 'orange' },
  bus: { kind: 'queue', at: [5, 0], tag: 'order events', items: 3 },
  notify: { kind: 'cube', at: [5, 4], label: 'Notify', sub: 'push · SMS', icon: Bell, tone: 'blue' },
  /* Low-level view: inside Orders */
  api: { kind: 'cube', at: [1, 0], label: 'Handlers', sub: 'HTTP API', icon: Braces, tone: 'blue' },
  domain: { kind: 'cube', at: [5, 0], label: 'Domain', sub: 'rules', icon: Cog, tone: 'blue' },
  repo: { kind: 'cube', at: [5, 4], label: 'Repo', sub: 'SQL', icon: Database, tone: 'blue' },
  odb: { kind: 'db', at: [1, 4], tag: 'orders db', icon: Database },
  outbox: { kind: 'cube', at: [5, -4], label: 'Outbox', sub: 'publisher', icon: Send, tone: 'blue' },
  events: { kind: 'queue', at: [1, -4], tag: 'order events', items: 2 },
  tItems: { kind: 'slab', at: [-3, 0], tag: 'order_items', icon: Table2, tone: 'violet' },
  tOrders: { kind: 'slab', at: [1, 0], tag: 'orders', icon: Table2, tone: 'violet' },
  tHist: { kind: 'slab', at: [5, 0], tag: 'status_history', icon: Table2, tone: 'violet' },
  /* Order state machine */
  placed: { kind: 'slab', at: [-6, 0], tag: 'placed', icon: ClipboardList, tone: 'blue' },
  accepted: { kind: 'slab', at: [-2, 0], tag: 'accepted', icon: ChefHat, tone: 'teal' },
  picked: { kind: 'slab', at: [2, 0], tag: 'picked_up', icon: Bike, tone: 'orange' },
  delivered: { kind: 'slab', at: [6, 0], tag: 'delivered', icon: PackageCheck, tone: 'green' },
  cancelled: { kind: 'slab', at: [-2, 4], tag: 'cancelled', icon: CircleX, tone: 'rose' },
});

const clientLinks = [L('tablet', 'gw'), L('cust', 'gw'), L('rider', 'gw')];
const serviceLinks = [L('gw', 'menus'), L('gw', 'orders'), L('gw', 'couriers')];
const dataLinks = [
  L('menus', 'menudb'),
  L('orders', 'ordersdb'),
  L('orders', 'bus', { label: 'OrderPlaced' }),
  L('bus', 'couriers'),
  L('bus', 'notify'),
  L('couriers', 'geo'),
];
const hldNodes = ['tablet', 'cust', 'rider', 'gw', 'menus', 'orders', 'couriers', 'menudb', 'ordersdb', 'geo', 'bus', 'notify'] as const;

export const hldLld: Lesson = {
  id: 'hld-lld',
  title: 'HLD & LLD',
  blurb: 'One food-delivery app at two zoom levels: the boxes and arrows, then the inside of one box.',
  minutes: 12,
  level: 'Intermediate',
  keywords: ['high-level design', 'low-level design', 'architecture diagram', 'api design', 'data model', 'state machine', 'system design interview', 'food delivery', 'microservices'],
  metrics: [
    { id: 'zoom', label: 'Zoom level', icon: ZoomIn },
    { id: 'parts', label: 'Parts drawn', icon: Boxes },
    { id: 'peak', label: 'Peak orders', icon: ShoppingBag },
    { id: 'gps', label: 'GPS writes', icon: MapPin },
  ],
  learn: [
    { text: 'What HLD and LLD each answer', at: 0 },
    { text: 'Splitting a system by responsibility', at: 1 },
    { text: 'Picking stores and events for data flow', at: 2 },
    { text: 'API, modules and tables for one service', at: 4 },
    { text: 'Modelling order status as a state machine', at: 5 },
  ],
  steps: [
    {
      short: 'Brief',
      title: 'One brief, two zoom levels',
      tag: 'Problem',
      body: [
        'Brief: customers order from nearby restaurants, couriers deliver, everyone sees live status. Say **2M orders a day** — 23/s on average, ~120/s at dinner. 100k couriers sending GPS every 4 s is **25k writes/s**: the heaviest load isn’t orders.',
        'You can describe this at two zooms. **HLD** (high-level design): which boxes exist and how data flows. **LLD** (low-level design): inside one box — endpoints, tables, modules, states.',
      ],
      scene: {
        nodes: fd('tablet', 'cust', 'rider', 'box'),
        links: [L('tablet', 'box'), L('cust', 'box'), L('rider', 'box')],
        flows: [F(['cust', 'box'], { ret: true }), F(['tablet', 'box'], { ret: true, delay: 0.7 }), F(['rider', 'box'], { kind: 'data', n: 3, delay: 0.3 })],
        notes: [
          { at: [2.5, -1], text: '2M orders/day · peak 120/s', icon: ShoppingBag },
          { at: [2.5, 0], text: '100k couriers · GPS every 4s', icon: Bike },
          { at: [2.5, 1], text: '≈ 25k location writes/s', icon: MapPin, tone: 'warn' },
        ],
      },
      metrics: { zoom: 'System', parts: '1 box', peak: '120 /s', gps: '25k /s' },
    },
    {
      short: 'Services',
      title: 'Boxes with one job each',
      tag: 'Technique',
      body: [
        'Split the black box by **responsibility**. A **gateway** handles auth, routing and rate limits. **Menus** owns restaurants, dishes and opening hours. **Orders** owns the order lifecycle and payment. **Couriers** owns dispatch and live location.',
        'Write one sentence per box saying what it owns. If you can’t, the boundary is in the wrong place.',
      ],
      callout: { kind: 'tip', text: 'Split by what changes together and who owns it — not by technical layer like “the database service”.' },
      changes: [
        { sign: '+', text: 'API gateway' },
        { sign: '+', text: 'Menus, Orders, Couriers services' },
      ],
      scene: {
        nodes: fd('tablet', 'cust', 'rider', 'gw', 'menus', 'orders', 'couriers'),
        links: [...clientLinks, ...serviceLinks],
        flows: [
          F(['cust', 'gw', 'orders'], { ret: true }),
          F(['tablet', 'gw', 'menus'], { ret: true, delay: 0.7 }),
          F(['rider', 'gw', 'couriers'], { kind: 'data', n: 2, delay: 0.3 }),
        ],
      },
      metrics: { parts: '4 boxes' },
    },
    {
      short: 'Data flow',
      title: 'Stores and events',
      tag: 'Technique',
      body: [
        'Each service owns a **data store** fitted to its access pattern: orders in a relational DB (transactions, money); menus in a read-heavy, cache-friendly store; courier GPS in an **in-memory geo index** that absorbs 25k writes/s and answers “couriers within 3 km”.',
        'Orders doesn’t call Couriers or Notify directly. It publishes `OrderPlaced` to an **event bus**; each consumer reacts at its own pace, so a slow SMS provider can’t stall checkout.',
      ],
      changes: [
        { sign: '+', text: 'One store per service' },
        { sign: '+', text: 'Event bus + notifications' },
      ],
      scene: {
        nodes: fd(...hldNodes),
        links: [...clientLinks, ...serviceLinks, ...dataLinks],
        flows: [
          F(['cust', 'gw', 'orders', 'ordersdb'], { kind: 'data', ret: true }),
          F(['orders', 'bus', 'notify'], { kind: 'event', delay: 1.4 }),
          F(['bus', 'couriers'], { kind: 'event', delay: 2.2 }),
          F(['rider', 'gw', 'couriers', 'geo'], { kind: 'data', n: 3, delay: 0.4 }),
        ],
      },
      metrics: { parts: '11 boxes' },
    },
    {
      short: 'Zoom in',
      title: 'Inside the Orders service',
      tag: 'Technique',
      body: [
        'LLD answers “how, exactly?”. Start with the public **API**: `POST /orders`, `GET /orders/{id}`, `POST /orders/{id}/accept` — with request and response shapes, status codes, and an idempotency key on create.',
        'Inside, modules depend one way: **handlers** validate input → **domain** enforces the rules → **repository** speaks SQL. An **outbox** row, written in the same transaction, makes sure every change is published.',
      ],
      changes: [
        { sign: '~', text: 'Zoom: system → one service' },
        { sign: '+', text: 'Handlers, domain, repository, outbox' },
      ],
      scene: {
        nodes: fd('gw', 'api', 'domain', 'repo', 'odb', 'outbox', 'events'),
        links: [
          L('gw', 'api', { label: 'POST /orders' }),
          L('api', 'domain'),
          L('domain', 'repo'),
          L('repo', 'odb', { arrow: 'both' }),
          L('domain', 'outbox'),
          L('outbox', 'events'),
        ],
        flows: [
          F(['gw', 'api', 'domain', 'repo', 'odb'], { ret: true }),
          F(['domain', 'outbox', 'events'], { kind: 'event', delay: 2.2 }),
        ],
        notes: [
          { at: [-6, -3], text: 'POST /orders' },
          { at: [-6, -2], text: 'GET /orders/{id}' },
          { at: [-6, -1], text: 'POST /orders/{id}/accept' },
        ],
      },
      metrics: { zoom: 'Service', parts: '5 modules' },
    },
    {
      short: 'Tables',
      title: 'Model the data first',
      tag: 'Technique',
      body: [
        '`orders` holds one row per order: customer, restaurant, `status`, total in integer cents, and a `version` for optimistic locking. `order_items` holds dishes and quantities; `status_history` appends a row per change — an audit trail for support.',
        'Then index for the API’s queries: `(customer_id, created_at)` for “my orders”, `(restaurant_id, status)` for the kitchen screen.',
      ],
      callout: { kind: 'tip', text: 'Store money as integer cents and timestamps in UTC. Both mistakes are painful to undo once data exists.' },
      scene: {
        nodes: fd('tItems', 'tOrders', 'tHist', 'repo'),
        links: [
          L('tItems', 'tOrders', { label: 'order_id' }),
          L('tHist', 'tOrders', { label: 'order_id' }),
          L('repo', 'tOrders', { arrow: 'both' }),
        ],
        flows: [
          F(['repo', 'tOrders', 'tItems'], { kind: 'data', ret: true, retKind: 'data' }),
          F(['repo', 'tOrders', 'tHist'], { kind: 'data', delay: 1.2 }),
        ],
        notes: [
          { at: [-3, -2.5], text: 'order_id, dish, qty' },
          { at: [1, -3.5], text: 'id, status, total, version' },
          { at: [5, -2.5], text: 'order_id, from, to, at' },
        ],
      },
      metrics: { zoom: 'Data', parts: '3 tables' },
    },
    {
      short: 'States',
      title: 'Order status as a state machine',
      tag: 'Insight',
      body: [
        'The heart of Orders: `placed → accepted → picked_up → delivered`, plus `cancelled` from the first two only. Each transition is one method that checks the current state, so “deliver an order nobody picked up” is impossible.',
        'Restaurant and customer may act at once. Update `WHERE id = ? AND status = ? AND version = ?`; if no row changes, someone else won — reload and decide.',
      ],
      callout: { kind: 'key', text: 'Draw the states and legal arrows before writing code. Most order bugs are illegal transitions.' },
      scene: {
        nodes: fd('placed', 'accepted', 'picked', 'delivered', 'cancelled'),
        links: [
          L('placed', 'accepted', { label: 'restaurant OK' }),
          L('accepted', 'picked', { label: 'courier pickup' }),
          L('picked', 'delivered', { label: 'drop-off' }),
          L('placed', 'cancelled', { dashed: true, tone: 'bad', label: 'reject / timeout' }),
          L('accepted', 'cancelled', { dashed: true, tone: 'bad' }),
        ],
        flows: [
          F(['placed', 'accepted', 'picked', 'delivered'], { kind: 'event', n: 2, speed: 0.8 }),
          F(['placed', 'cancelled'], { kind: 'error', stop: true, delay: 1.5 }),
        ],
        notes: [{ at: [2, -3], text: 'each arrow emits an event', icon: Send }],
      },
      metrics: { zoom: 'Logic', parts: '5 states' },
    },
    {
      short: 'Interviews',
      title: 'Wide first, then deep',
      tag: 'Insight',
      body: [
        'Design interviews usually go **wide** first: clarify requirements, do napkin maths, draw the HLD, and trace one request end to end. Then the interviewer picks a box — often the riskiest — and asks you to go **deep**: API, schema, states, concurrency, failures.',
        'Common misses: tables before any boxes exist, or twenty boxes with no data flow. Name your trade-offs out loud.',
      ],
      scene: {
        nodes: fd(
          'tablet',
          'cust',
          'rider',
          'gw',
          'menus',
          ['orders', { status: 'hot', tag: 'go deep here', tagIcon: ZoomIn }],
          'couriers',
          'menudb',
          'ordersdb',
          'geo',
          'bus',
          'notify',
        ),
        links: [...clientLinks, ...serviceLinks, ...dataLinks],
        flows: [F(['cust', 'gw', 'orders'], { ret: true }), F(['orders', 'bus', 'couriers'], { kind: 'event', delay: 1.2 })],
        notes: [
          { at: [3, -4], text: 'HLD · ~25 min' },
          { at: [3, 4], text: 'LLD · ~15 min' },
        ],
      },
      metrics: { zoom: 'Both', parts: '11 + 1' },
    },
    {
      short: 'Recap',
      title: 'HLD & LLD, summed up',
      tag: 'Recap',
      body: [
        '**HLD** names the boxes, what each owns, where data lives and how it flows — synchronous calls for answers, events for everything else.',
        '**LLD** zooms into one box: its API, modules, tables and indexes, and the state machine that keeps its data legal under concurrency.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'HLD decides which boxes exist and how data moves; LLD proves one box can really work. Go wide first, then deep.' },
      scene: {
        nodes: fd(...hldNodes),
        links: [...clientLinks, ...serviceLinks, ...dataLinks],
        flows: [
          F(['cust', 'gw', 'orders', 'ordersdb'], { kind: 'data', ret: true }),
          F(['orders', 'bus', 'notify'], { kind: 'event', delay: 1.4 }),
          F(['rider', 'gw', 'couriers', 'geo'], { kind: 'data', n: 2, delay: 0.6 }),
        ],
      },
      metrics: { zoom: 'System', parts: '11 boxes' },
    },
  ],
};
