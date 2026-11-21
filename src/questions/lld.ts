import {
  Activity,
  Barcode,
  Bell,
  BookOpen,
  Boxes,
  Calculator,
  Car,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Crosshair,
  Database,
  DoorOpen,
  Hourglass,
  Layers,
  Library,
  Mail,
  MemoryStick,
  MessageSquare,
  Search,
  Send,
  Server,
  Settings2,
  ShieldCheck,
  Smartphone,
  SquareParking,
  Table2,
  Target,
  Ticket,
  Timer,
  TriangleAlert,
  Truck,
  UserRound,
  Users,
  Webhook,
  Zap,
} from 'lucide-react';
import type { Question } from '../types';
import { cast, F, L } from '../lessons/kit';

/* ------------------------------------------------------------------ */
/* Q4 · Design a Parking Lot                                            */
/* ------------------------------------------------------------------ */

const pk = cast({
  drivers: { kind: 'crowd', at: [-7, -3.5], tag: 'drivers', tagIcon: Users, items: 4 },
  gate: { kind: 'cube', at: [-3.5, 0], label: 'Gate', sub: 'entry·exit', icon: DoorOpen, tone: 'green' },
  gate2: { kind: 'cube', at: [-3.5, -3.5], label: 'Gate', sub: 'entry B', icon: DoorOpen, tone: 'green' },
  lot: { kind: 'cube', at: [0, 0], label: 'Lot', sub: 'ParkingLot', icon: SquareParking, tone: 'blue' },
  finder: { kind: 'cube', at: [0, -4], label: 'Finder', sub: 'strategy', icon: Crosshair, tone: 'yellow' },
  level: { kind: 'cube', at: [3.5, -3.5], label: 'Level', sub: '3 floors', icon: Layers, tone: 'blue' },
  spot: { kind: 'cube', at: [7, 0], label: 'Spot', sub: '4 types', icon: SquareParking, tone: 'blue' },
  vehicle: { kind: 'cube', at: [3.5, 3.5], label: 'Vehicle', sub: 'abstract', icon: Car, tone: 'blue' },
  ticket: { kind: 'cube', at: [0, 3.5], label: 'Ticket', sub: 'id·entry', icon: Ticket, tone: 'blue' },
  payment: { kind: 'cube', at: [-3.5, 3.5], label: 'Payment', sub: 'status', icon: CreditCard, tone: 'blue' },
  pricing: { kind: 'cube', at: [-7, 3.5], label: 'Pricing', sub: 'strategy', icon: Calculator, tone: 'yellow' },
  db: { kind: 'db', at: [7, -3.5], tag: 'spot state', icon: Database },
});

const pkCore = [
  L('lot', 'level', { label: 'has 1..*' }),
  L('level', 'spot', { label: 'has 1..*' }),
  L('spot', 'vehicle', { label: 'holds 0..1' }),
  L('ticket', 'vehicle', { label: 'for 1' }),
  L('lot', 'ticket', { label: 'issues' }),
];

const pkPlain = [L('lot', 'level'), L('level', 'spot'), L('spot', 'vehicle'), L('ticket', 'vehicle'), L('lot', 'ticket')];

export const qParkingLot: Question = {
  id: 'q-parking-lot',
  n: 4,
  title: 'Design a Parking Lot',
  blurb: 'A classic object-oriented design: clean classes, pluggable policies and no two cars in one spot.',
  minutes: 12,
  level: 'Beginner',
  concepts: ['OOP', 'Class Design'],
  related: ['hld-lld', 'transactions', 'sql-nosql'],
  followUps: [
    'How would you add reservations for a time slot without blocking walk-ins?',
    'How would you keep the free-spot boards at each entrance accurate?',
    'How would you handle a lost ticket at the exit?',
    'Where does EV charging billing belong in this class model?',
  ],
  keywords: ['parking lot', 'object oriented design', 'ood', 'low level design', 'class diagram', 'strategy pattern', 'open closed', 'concurrency'],
  metrics: [
    { id: 'free', label: 'Free spots', icon: SquareParking },
    { id: 'classes', label: 'Classes', icon: Boxes },
    { id: 'assign', label: 'Assign time', icon: Timer },
    { id: 'dbl', label: 'Double-books', icon: TriangleAlert },
  ],
  learn: [
    { text: 'Turning the brief into classes and relationships', at: 1 },
    { text: 'Spot assignment as a Strategy', at: 4 },
    { text: 'Pricing rules as a second Strategy', at: 5 },
    { text: 'Claiming the last spot atomically', at: 6 },
    { text: 'Adding vehicle types without edits', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Clarify the garage',
      tag: 'Requirements',
      body: [
        'Brief: “Design the software for a parking garage.” Ask first. Assume **one garage, 3 levels, 500 spots** of four types — compact, large, EV and handicapped — and vehicles that are motorcycles, cars or vans.',
        'Functional: ticket at entry, assign a fitting spot, charge at exit, show free counts per type. Non-functional: a gate decision in **under a second** and **never two cars in one spot**. Out of scope: reservations, valet, card processing.',
      ],
      callout: { kind: 'tip', text: 'In OOD rounds the scale is small. You are graded on clear responsibilities, easy extension and correctness when two things happen at once.' },
      scene: {
        nodes: pk('drivers', 'gate', ['lot', { tone: 'gray', sub: '?' }]),
        links: [L('drivers', 'gate'), L('gate', 'lot', { arrow: 'both' })],
        flows: [F(['drivers', 'gate', 'lot'], { ret: true })],
        notes: [
          { at: [4.5, -3], text: '500 spots · 3 levels', icon: SquareParking },
          { at: [4.5, -2], text: '4 spot types · 3 vehicles', icon: Car },
          { at: [4.5, 2], text: 'gate decision < 1 s', icon: Timer },
          { at: [4.5, 3], text: 'never double-book a spot', tone: 'warn' },
        ],
      },
      metrics: { free: '500', classes: '—', assign: '—', dbl: '—' },
    },
    {
      short: 'Classes',
      title: 'Find the nouns, give them jobs',
      tag: 'Data Model',
      body: [
        'Nouns become classes. A `ParkingLot` **has** many `Level`s, a `Level` has many `ParkingSpot`s, and a spot **holds** at most one `Vehicle`. A `Ticket` records which vehicle took which spot, and when.',
        'One job each: `Level` tracks its free spots, `ParkingSpot` knows its type and occupant, `Vehicle` knows its size. The lot stays thin — it coordinates; it doesn’t own every rule.',
      ],
      changes: [{ sign: '+', text: 'Lot, Level, Spot, Vehicle, Ticket' }],
      scene: {
        nodes: pk('lot', 'level', 'spot', 'vehicle', 'ticket'),
        links: pkCore,
        flows: [F(['lot', 'level', 'spot', 'vehicle'], { kind: 'data' }), F(['lot', 'ticket', 'vehicle'], { kind: 'data', delay: 1 })],
      },
      metrics: { classes: '5' },
    },
    {
      short: 'API',
      title: 'The public methods',
      tag: 'API',
      body: [
        'Sketch signatures before code: `ParkingLot.park(vehicle) → Ticket`, `ParkingLot.unpark(ticket) → Receipt`, `Level.freeCount(SpotType) → int`. Enums `SpotType` and `VehicleType` keep the vocabulary closed and typo-proof.',
        'The **Gate** is the caller: it reads a plate or a button press, calls `park`, prints the ticket. Hardware stays outside the domain model, so you can unit-test the lot without a barrier arm.',
      ],
      changes: [{ sign: '+', text: 'Gate calls the lot' }],
      scene: {
        nodes: pk('drivers', 'gate', 'lot', 'level', 'spot', 'vehicle', 'ticket'),
        links: [L('drivers', 'gate'), L('gate', 'lot', { arrow: 'both', label: 'park(vehicle)' }), ...pkPlain],
        flows: [F(['drivers', 'gate', 'lot'], { ret: true }), F(['lot', 'ticket'], { kind: 'data', delay: 1.2 })],
      },
    },
    {
      short: 'Park flow',
      title: 'Walk through park()',
      tag: 'Design',
      body: [
        '`park(v)`: the lot asks each level for a free spot that **fits** `v`; the level pops one from its free list for that type, marks it taken, and the lot returns `Ticket(id, plate, spotId, entryTime)`.',
        'Fit rules live on the vehicle: a motorcycle fits any spot, a car fits compact or large, a van needs large. Per-type **free lists** make lookup O(1) instead of scanning 500 spots, and keep the display counts exact.',
      ],
      scene: {
        nodes: pk('drivers', 'gate', 'lot', 'level', ['spot', { meter: 38 }], 'vehicle', 'ticket'),
        links: [L('drivers', 'gate'), L('gate', 'lot', { label: 'park(vehicle)' }), ...pkPlain],
        flows: [F(['drivers', 'gate', 'lot', 'level', 'spot'], { n: 2 }), F(['lot', 'ticket'], { kind: 'data', delay: 1.4 })],
      },
      metrics: { free: '311', assign: '5 ms' },
      hi: ['assign'],
    },
    {
      short: 'Strategy',
      title: 'Pluggable spot assignment',
      tag: 'Deep Dive',
      body: [
        'Which free spot? Nearest the entrance, lowest level first, or keep EV spots for EVs. Owners will change their minds, so hide the choice behind an interface, `SpotFinder.find(levels, vehicle)` — the **Strategy pattern**.',
        '`NearestFirst`, `LowestLevelFirst` and `EvPriority` implement it; the lot is built with one and never contains `if (mode == …)`. Swapping policy is a config change, and each strategy is tested alone.',
      ],
      callout: { kind: 'tip', text: 'Name the pattern after showing the need: “this policy varies, so it sits behind an interface” is the sentence interviewers listen for.' },
      changes: [{ sign: '+', text: 'SpotFinder strategy' }],
      scene: {
        nodes: pk('drivers', 'gate', 'lot', 'finder', 'level', ['spot', { meter: 38 }], 'vehicle', 'ticket'),
        links: [L('drivers', 'gate'), L('gate', 'lot'), L('lot', 'finder', { arrow: 'both', label: 'uses' }), ...pkPlain],
        flows: [F(['lot', 'finder'], { kind: 'data', ret: true, retKind: 'data' }), F(['drivers', 'gate', 'lot', 'level', 'spot'], { delay: 0.8 })],
      },
      metrics: { classes: '6' },
    },
    {
      short: 'Pricing',
      title: 'Unpark and pay at the exit',
      tag: 'Deep Dive',
      body: [
        '`unpark(ticket)`: find the spot, compute the fee, take **payment**, then free the spot and push it back on its level’s free list. A declined card must not mark the spot free while the car still sits in it.',
        'Fees are a second Strategy: `PricingRule.fee(ticket, now)` with `Hourly`, `FlatNight` and an `EvCharging` add-on. `Payment` records amount, method and status, so a retried swipe never charges twice.',
      ],
      changes: [{ sign: '+', text: 'Payment' }, { sign: '+', text: 'PricingRule strategy' }],
      scene: {
        nodes: pk('drivers', 'gate', 'lot', 'finder', 'level', ['spot', { meter: 36 }], 'vehicle', 'ticket', 'payment', 'pricing'),
        links: [
          L('drivers', 'gate'),
          L('gate', 'lot'),
          L('lot', 'finder'),
          ...pkPlain,
          L('gate', 'payment', { label: 'unpark()' }),
          L('payment', 'ticket', { label: 'reads' }),
          L('payment', 'pricing', { arrow: 'both', label: 'fee()' }),
        ],
        flows: [
          F(['drivers', 'gate', 'payment', 'pricing'], { ret: true }),
          F(['payment', 'ticket'], { kind: 'data', delay: 0.6 }),
          F(['gate', 'lot', 'level', 'spot'], { kind: 'data', delay: 1.6 }),
        ],
      },
      metrics: { free: '312', classes: '8' },
    },
    {
      short: 'Last spot',
      title: 'Two cars, one free spot',
      tag: 'Deep Dive',
      body: [
        'Gates A and B both see `freeCount(LARGE) == 1` and both call `park`. If “is it free?” and “mark taken” are separate steps, both succeed and two vans head for one spot — a **check-then-act race**.',
        'Make the claim **atomic**: pop from the level’s free list under a per-level lock, or `spot.tryOccupy(v)` via compare-and-set. In a database: `UPDATE spot SET vehicle=? WHERE id=? AND vehicle IS NULL`; 0 rows means try another.',
      ],
      callout: { kind: 'warn', text: 'One lock around the whole lot works but serialises every gate. Lock per level, or per spot with CAS, so gates on different floors never wait.' },
      changes: [{ sign: '+', text: 'Gate B' }, { sign: '~', text: 'Spot claim is atomic' }],
      scene: {
        nodes: pk('drivers', 'gate', 'gate2', 'lot', 'finder', 'level', ['spot', { status: 'hot', tag: 'last LARGE' }], 'vehicle', 'ticket'),
        links: [L('drivers', 'gate'), L('drivers', 'gate2'), L('gate', 'lot'), L('gate2', 'lot'), L('lot', 'finder'), ...pkPlain],
        flows: [
          F(['drivers', 'gate', 'lot', 'level', 'spot']),
          F(['drivers', 'gate2', 'lot', 'level'], { kind: 'error', stop: true, delay: 0.3 }),
        ],
        notes: [
          { at: [6.2, -2.2], text: 'CAS null → van #42', tone: 'good' },
          { at: [-6.3, 1.7], text: 'B: 0 rows → next spot', tone: 'bad' },
        ],
      },
      metrics: { free: '0', dbl: '0' },
      hi: ['dbl'],
    },
    {
      short: 'Extend',
      title: 'Adding a new vehicle type',
      tag: 'Deep Dive',
      body: [
        'Next year brings e-bikes and a **truck** bay. With `Vehicle` abstract and each subclass answering `canFitIn(SpotType)`, a new type is one new class plus a spot type — **open for extension, closed for modification**.',
        'Finder, pricing and gate code don’t change. Compare a `switch(vehicleType)` copied into five methods: every new type becomes a hunt for missed branches. Likewise a `ChargingSpot` can add `startCharge()` alone.',
      ],
      changes: [{ sign: '+', text: 'Truck, EBike subclasses' }, { sign: '~', text: 'No existing class edited' }],
      scene: {
        nodes: pk('drivers', 'gate', 'lot', 'finder', 'level', 'spot', ['vehicle', { sub: '+ Truck', icon: Truck }], 'ticket'),
        links: [L('drivers', 'gate'), L('gate', 'lot'), L('lot', 'finder'), ...pkPlain],
        flows: [F(['drivers', 'gate', 'lot', 'level', 'spot']), F(['spot', 'vehicle'], { kind: 'data', ret: true, retKind: 'data', delay: 1.2 })],
        notes: [{ at: [6.6, 3.2], text: 'Truck.canFitIn(LARGE)', tone: 'good' }],
      },
      metrics: { classes: '10' },
    },
    {
      short: 'Failures',
      title: 'Restarts, outages and 100 garages',
      tag: 'Bottleneck',
      body: [
        'In-memory state dies with the process. Write spot and ticket changes **through to a database** on every park and unpark, so a restart rebuilds the free lists — and the conditional update guards the race across gate controllers.',
        'At 100 garages, run one service per garage (it owns its spots; no cross-site locks) and aggregate counts centrally. A gate that loses the network prints offline tickets with a local timestamp and syncs later.',
      ],
      callout: { kind: 'warn', text: 'Whatever fails, the barrier must never trap a car. Design the exit path to degrade to “open and record”.' },
      changes: [{ sign: '+', text: 'Spot-state database' }, { sign: '~', text: 'Gate B offline mode' }],
      scene: {
        nodes: pk('drivers', 'gate', ['gate2', { status: 'down', sub: 'offline' }], 'lot', 'finder', 'level', 'spot', 'vehicle', 'ticket', 'db'),
        links: [
          L('drivers', 'gate'),
          L('drivers', 'gate2', { arrow: 'both' }),
          L('gate', 'lot'),
          L('gate2', 'lot', { dashed: true, tone: 'bad' }),
          L('lot', 'finder'),
          ...pkPlain,
          L('level', 'db', { label: 'write-through' }),
        ],
        flows: [F(['drivers', 'gate', 'lot', 'level', 'db'], { kind: 'data' }), F(['drivers', 'gate2'], { ret: true, delay: 0.8 })],
        notes: [{ at: [-6.3, 1.7], text: 'offline ticket → sync later', tone: 'warn' }],
      },
    },
    {
      short: 'Recap',
      title: 'The whole model',
      tag: 'Recap',
      body: [
        'Clarify spot and vehicle types, then model **Lot → Level → Spot**, `Vehicle` and `Ticket`, each with one job. Pull changing policy into **strategies** (spot finding, pricing), make the last-spot claim **atomic**, and add vehicle types by subclassing.',
        'Persist state so restarts are boring, and make every gate fail safe.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Good OOD is about where rules live: each rule on the class that owns the data, each changeable policy behind an interface.' },
      scene: {
        nodes: pk('drivers', 'gate', 'lot', 'finder', 'level', 'spot', 'vehicle', 'ticket', 'payment', 'pricing', 'db'),
        links: [L('drivers', 'gate'), L('gate', 'lot'), L('lot', 'finder'), ...pkPlain, L('gate', 'payment'), L('payment', 'ticket'), L('payment', 'pricing'), L('level', 'db')],
        flows: [
          F(['drivers', 'gate', 'lot', 'level', 'spot']),
          F(['gate', 'payment', 'pricing'], { ret: true, delay: 0.8 }),
          F(['level', 'db'], { kind: 'data', delay: 1.4 }),
        ],
      },
      metrics: { free: '300', classes: '10', assign: '5 ms', dbl: '0' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Q5 · Design a Library Management System                              */
/* ------------------------------------------------------------------ */

const lb = cast({
  members: { kind: 'crowd', at: [-7, 0], tag: 'members', tagIcon: Users, items: 4 },
  lib: { kind: 'cube', at: [-3.5, 0], label: 'Library', sub: 'service', icon: Library, tone: 'blue' },
  db: { kind: 'db', at: [-3.5, -3.5], tag: 'library db', icon: Database },
  search: { kind: 'cube', at: [-3.5, 3.5], label: 'Search', sub: 'full-text', icon: Search, tone: 'orange' },
  book: { kind: 'cube', at: [0, -3.5], label: 'Book', sub: 'title·ISBN', icon: BookOpen, tone: 'blue' },
  hold: { kind: 'cube', at: [3.5, -3.5], label: 'Hold', sub: 'per ISBN', icon: Clock, tone: 'blue' },
  copy: { kind: 'cube', at: [3.5, 0], label: 'Copy', sub: 'BookCopy', icon: Barcode, tone: 'blue' },
  member: { kind: 'cube', at: [0, 3.5], label: 'Member', sub: 'card', icon: UserRound, tone: 'blue' },
  loan: { kind: 'cube', at: [3.5, 3.5], label: 'Loan', sub: 'due_at', icon: Ticket, tone: 'blue' },
  fine: { kind: 'cube', at: [7, 3.5], label: 'Fine', sub: 'per loan', icon: Coins, tone: 'blue' },
  job: { kind: 'cube', at: [7, 0], label: 'Nightly', sub: 'fines job', icon: Clock, tone: 'yellow' },
});

const table = (tag: string) => ({ kind: 'slab' as const, tag, icon: Table2, tone: 'violet' as const });

const lbModel = [L('book', 'copy'), L('copy', 'loan'), L('member', 'loan')];
const lbDesk = [L('members', 'lib'), L('lib', 'db', { arrow: 'both' }), L('lib', 'book'), L('lib', 'copy'), L('lib', 'member')];

export const qLibrary: Question = {
  id: 'q-library',
  n: 5,
  title: 'Design a Library Management System',
  blurb: 'Books versus copies, loans and holds: an object model and a schema that never lends one copy twice.',
  minutes: 12,
  level: 'Beginner',
  concepts: ['OOP', 'Data Modeling'],
  related: ['hld-lld', 'transactions', 'indexes', 'sql-nosql'],
  followUps: [
    'How would you move a copy between branches to fill a hold?',
    'How would you model e-books with a limit on concurrent loans?',
    'How do renewals work, and when must you refuse one?',
    'How would you audit who waived a fine and why?',
  ],
  keywords: ['library management', 'object oriented design', 'data modeling', 'schema', 'book copy', 'holds queue', 'fines', 'partial unique index'],
  metrics: [
    { id: 'copies', label: 'Copies', icon: Barcode },
    { id: 'loans', label: 'Loans / day', icon: BookOpen },
    { id: 'search', label: 'Search p95', icon: Search },
    { id: 'tables', label: 'Tables', icon: Table2 },
  ],
  learn: [
    { text: 'Separating a title (Book) from a physical copy', at: 1 },
    { text: 'A schema with keys and a partial unique index', at: 2 },
    { text: 'A fair holds queue per title', at: 5 },
    { text: 'Idempotent nightly fine jobs', at: 6 },
    { text: 'Never lending one copy twice', at: 8 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Clarify the library',
      tag: 'Requirements',
      body: [
        'Brief: “A system for a city library.” Assume **40k titles, 120k copies, 25k members** and ~3,000 checkouts a day across 6 branches. Members search, borrow, return and **place holds**; librarians add stock.',
        'Rules: at most **5 loans** each, 14-day loans, a $0.25/day overdue fine, borrowing blocked above $10 owed. Non-functional: a copy is never lent twice; search under 200 ms. Out of scope: e-books, card payments, recommendations.',
      ],
      callout: { kind: 'tip', text: 'Write the business rules down as numbers. Each one becomes a check in code or a constraint in the schema.' },
      scene: {
        nodes: lb('members', ['lib', { tone: 'gray', sub: '?' }]),
        links: [L('members', 'lib', { arrow: 'both' })],
        flows: [F(['members', 'lib'], { ret: true, n: 2 })],
        notes: [
          { at: [2.5, -3], text: '120k copies · 40k titles', icon: BookOpen },
          { at: [2.5, -2], text: '≈ 3,000 checkouts / day', icon: Activity },
          { at: [2.5, 2], text: 'max 5 loans · 14 days', icon: Clock },
          { at: [2.5, 3], text: 'never lend a copy twice', tone: 'warn' },
        ],
      },
      metrics: { copies: '120k', loans: '3k', search: '—', tables: '—' },
    },
    {
      short: 'Book vs copy',
      title: 'A title is not a thing on a shelf',
      tag: 'Data Model',
      body: [
        'The key modelling move: a `Book` is the **title** (ISBN, title, authors); a `BookCopy` is the **physical item** (barcode, branch, status). One book has many copies. You lend copies, but people search and reserve books.',
        'A `Member` has 0..5 open `Loan`s; each `Loan` joins one copy to one member with `due_at` and `returned_at`. Merging title and copy into one class is the classic mistake — you can’t say “3 of 4 copies are out”.',
      ],
      changes: [{ sign: '+', text: 'Book, BookCopy, Member, Loan' }],
      scene: {
        nodes: lb('book', 'copy', 'member', 'loan'),
        links: [L('book', 'copy', { label: 'has 1..*' }), L('copy', 'loan', { label: '0..1 open' }), L('member', 'loan', { label: 'has 0..5' })],
        flows: [F(['book', 'copy', 'loan'], { kind: 'data' }), F(['member', 'loan'], { kind: 'data', delay: 0.8 })],
      },
      metrics: { tables: '4' },
    },
    {
      short: 'Schema',
      title: 'Tables, keys and one crucial index',
      tag: 'Data Model',
      body: [
        '`books(isbn PK, title, author)`, `copies(id PK, isbn FK, branch, status)`, `members(id PK)`, `loans(id PK, copy_id FK, member_id FK, due_at, returned_at)`, `holds(id PK, isbn FK, member_id FK, created_at)`, `fines(loan_id FK, amount, paid)`.',
        'The guard rail lives in the database: a **partial unique index** `UNIQUE(copy_id) WHERE returned_at IS NULL` makes two open loans for one copy impossible, whatever the code does. Loans are never deleted — they are history.',
      ],
      callout: { kind: 'tip', text: 'Let the schema enforce the rules that must never break. Code has bugs; a unique index does not forget.' },
      changes: [{ sign: '~', text: 'Classes → tables' }, { sign: '+', text: 'holds, fines' }],
      scene: {
        nodes: lb(['book', table('books')], ['copy', table('copies')], ['member', table('members')], ['loan', table('loans')], ['hold', table('holds')], ['fine', table('fines')]),
        links: [L('book', 'copy', { label: 'isbn' }), L('copy', 'loan'), L('member', 'loan', { label: 'member_id' }), L('hold', 'book', { label: 'isbn' }), L('loan', 'fine', { label: 'loan_id' })],
        flows: [F(['hold', 'book', 'copy', 'loan', 'fine'], { kind: 'data' }), F(['member', 'loan'], { kind: 'data', delay: 1 })],
        notes: [{ at: [6.6, 1.2], text: 'UNIQUE open loan per copy', tone: 'good' }],
      },
      metrics: { tables: '6' },
    },
    {
      short: 'API',
      title: 'Four operations at the desk',
      tag: 'API',
      body: [
        '`search(q) → Book[]` with available counts, `checkout(memberId, barcode) → Loan`, `return(barcode) → Fine?`, `reserve(memberId, isbn) → Hold`. A `LibraryService` facade exposes them and owns transactions; entities stay plain.',
        'Note the arguments: you **check out a copy** (the barcode in your hand) but **reserve a book** (any copy will do). Getting that asymmetry right is most of the design.',
      ],
      changes: [{ sign: '+', text: 'LibraryService facade' }, { sign: '+', text: 'Library database' }],
      scene: {
        nodes: lb('members', 'lib', 'db', 'book', 'copy', 'member', 'loan'),
        links: [...lbDesk.slice(0, 3), L('lib', 'copy', { label: 'checkout()' }), L('lib', 'member'), ...lbModel],
        flows: [F(['members', 'lib', 'copy'], { ret: true }), F(['lib', 'db'], { kind: 'data', ret: true, retKind: 'data', delay: 0.8 })],
      },
    },
    {
      short: 'Checkout',
      title: 'Checkout and return, step by step',
      tag: 'Design',
      body: [
        '**Checkout**, in one transaction: verify the copy is available (or on the hold shelf for *this* member), the member has < 5 open loans and owes ≤ $10, insert the `Loan` with `due_at = now + 14d`, set the copy to `ON_LOAN`.',
        '**Return**: set `returned_at`, compute any fine from days late, then route the copy — if its book has holds it goes to the hold shelf for the next member, otherwise back to `AVAILABLE`.',
      ],
      changes: [{ sign: '+', text: 'Fine' }],
      scene: {
        nodes: lb('members', 'lib', 'db', 'book', 'copy', 'member', 'loan', 'fine'),
        links: [...lbDesk, ...lbModel, L('loan', 'fine', { label: 'if late' })],
        flows: [
          F(['members', 'lib', 'copy', 'loan']),
          F(['lib', 'db'], { kind: 'data', ret: true, retKind: 'data', delay: 0.6 }),
          F(['loan', 'fine'], { kind: 'data', delay: 1.6 }),
        ],
      },
    },
    {
      short: 'Holds',
      title: 'A fair queue for popular books',
      tag: 'Deep Dive',
      body: [
        'Holds queue **per title, not per copy**: whichever copy comes back first serves the oldest hold. Order by `created_at` (FIFO); on return, the head of the queue becomes `READY` with a 3-day pickup window and is notified.',
        'If they don’t collect it, a job expires the hold and the copy passes to the next person. Cap holds per member (say 10) and refuse a hold on a book the member already has out.',
      ],
      changes: [{ sign: '+', text: 'Holds queue per ISBN' }],
      scene: {
        nodes: lb('members', 'lib', 'db', 'book', ['hold', { kind: 'queue', tag: 'holds · FIFO', items: 3 }], 'copy', 'member', 'loan'),
        links: [...lbDesk, ...lbModel, L('book', 'hold', { label: 'reserve' })],
        flows: [F(['members', 'lib', 'book', 'hold'], { kind: 'request' }), F(['members', 'lib', 'copy'], { kind: 'data', delay: 1.2 })],
        notes: [{ at: [6.6, -1.6], text: 'return → head is READY', tone: 'good' }],
      },
    },
    {
      short: 'Fines',
      title: 'Overdue fines with a nightly job',
      tag: 'Deep Dive',
      body: [
        'Fines are driven by time, not by a request. A **nightly job** queries `loans WHERE returned_at IS NULL AND due_at < now()` — an index on `due_at` makes it a quick range scan — then sends reminders and updates fines.',
        'Make it **idempotent**: set `fine = days_late × rate` from the dates instead of adding $0.25 per run, so a rerun or a missed night can’t double-charge. On return, the same formula settles the final amount.',
      ],
      changes: [{ sign: '+', text: 'Nightly fines job' }],
      scene: {
        nodes: lb('members', 'lib', 'db', 'book', 'copy', 'member', 'loan', 'fine', 'job'),
        links: [...lbDesk, ...lbModel, L('loan', 'fine'), L('job', 'loan', { label: 'due_at < now' }), L('job', 'fine', { label: 'upsert' })],
        flows: [F(['job', 'loan'], { kind: 'data', ret: true, retKind: 'data' }), F(['job', 'fine'], { kind: 'data', delay: 1.2 })],
      },
    },
    {
      short: 'Search',
      title: 'Search by title and author',
      tag: 'Deep Dive',
      body: [
        'A B-tree index on `title` serves exact and prefix matches (`LIKE \'dune%\'`) but not words in the middle or typos. Use a **full-text index** — an inverted index from word → books, e.g. Postgres `tsvector` + GIN — over title and author.',
        'At 40k titles the whole index fits in memory, so p95 stays far below 200 ms. Add available-copy counts per branch at query time, or keep an `available_count` updated inside the checkout transaction.',
      ],
      changes: [{ sign: '+', text: 'Full-text search index' }],
      scene: {
        nodes: lb('members', 'lib', 'db', 'search', 'book', 'copy', 'member', 'loan'),
        links: [...lbDesk, ...lbModel, L('lib', 'search', { arrow: 'both', label: 'title · author' })],
        flows: [F(['members', 'lib', 'search'], { ret: true, n: 2 }), F(['lib', 'book'], { kind: 'data', delay: 1 })],
      },
      metrics: { search: '40 ms' },
      hi: ['search'],
    },
    {
      short: 'Last copy',
      title: 'Two members, one copy',
      tag: 'Bottleneck',
      body: [
        'Exam week: one copy of a set text left and two members grab it in the same second. Code that reads `AVAILABLE` and then writes lends it twice. Do it in one statement: `UPDATE copies SET status=\'ON_LOAN\' WHERE id=? AND status=\'AVAILABLE\'`.',
        '1 row updated wins; 0 rows loses and is offered a hold. The partial unique index is the backstop. On return, pop the hold queue head with `SELECT … FOR UPDATE SKIP LOCKED`, so two returns never serve one hold.',
      ],
      callout: { kind: 'warn', text: 'Checking availability in code and writing later is a race at any scale. Push the check into the write itself.' },
      changes: [{ sign: '~', text: 'Conditional update claims the copy' }],
      scene: {
        nodes: lb('members', 'lib', 'db', 'book', ['copy', { status: 'hot', tag: 'last copy' }], 'member', 'loan', 'hold'),
        links: [...lbDesk, L('book', 'copy'), L('member', 'loan'), L('book', 'hold')],
        flows: [F(['members', 'lib', 'copy']), F(['members', 'lib', 'book', 'hold'], { kind: 'error', delay: 0.4 })],
        notes: [
          { at: [6.6, -1.4], text: '1 row → loan created', tone: 'good' },
          { at: [-6.2, -2.4], text: '0 rows → join the queue', tone: 'bad' },
        ],
      },
    },
    {
      short: 'Recap',
      title: 'The whole system',
      tag: 'Recap',
      body: [
        'Split **Book** (title) from **BookCopy** (item); loans join copies to members, holds join members to books. Enforce rules in a **transactional** service and in the schema — a **partial unique index** stops double loans.',
        'Holds are a FIFO per title, fines come from an idempotent nightly job, and search uses a full-text index.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Model the real world precisely — title vs copy — and let the database enforce the invariants that must never break.' },
      scene: {
        nodes: lb('members', 'lib', 'db', 'search', 'book', 'hold', 'copy', 'member', 'loan', 'fine', 'job'),
        links: [...lbDesk, ...lbModel, L('lib', 'search'), L('book', 'hold'), L('loan', 'fine'), L('job', 'loan'), L('job', 'fine')],
        flows: [
          F(['members', 'lib', 'copy', 'loan']),
          F(['members', 'lib', 'search'], { ret: true, delay: 0.8 }),
          F(['job', 'fine'], { kind: 'data', delay: 1.4 }),
        ],
      },
      metrics: { copies: '120k', loans: '3k', search: '40 ms', tables: '6' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Q6 · Design a Rate Limiter                                           */
/* ------------------------------------------------------------------ */

const rl = cast({
  clients: { kind: 'crowd', at: [-7, 0], tag: 'API clients', tagIcon: Users, items: 5 },
  gw: { kind: 'cube', at: [-3.5, 0], label: 'Gateway', sub: 'limiter mw', icon: ShieldCheck, tone: 'green' },
  leak: { kind: 'queue', at: [0, 0], tag: 'leaky bucket', items: 4 },
  svc: { kind: 'cube', at: [3.5, 0], label: 'API', sub: 'services', icon: Server, tone: 'blue' },
  redis: { kind: 'cube', at: [0, -3.5], label: 'Redis', sub: 'counters', icon: Zap, tone: 'orange' },
  rules: { kind: 'slab', at: [-3.5, 3.5], tag: 'rules config', icon: Settings2, tone: 'yellow' },
  redisEU: { kind: 'cube', at: [3.5, -3.5], label: 'Redis', sub: 'eu-west', icon: Zap, tone: 'orange' },
  gwEU: { kind: 'cube', at: [7, 0], label: 'Gateway', sub: 'eu-west', icon: ShieldCheck, tone: 'green' },
  clientsEU: { kind: 'crowd', at: [7, 3.5], tag: 'EU clients', tagIcon: Users, items: 3 },
});

const rlBase = [L('clients', 'gw', { arrow: 'both' }), L('gw', 'svc'), L('gw', 'redis', { arrow: 'both' })];

export const qRateLimiter: Question = {
  id: 'q-rate-limiter',
  n: 6,
  title: 'Design a Rate Limiter',
  blurb: 'Pick the right algorithm, make it atomic in Redis, and decide what happens when Redis is gone.',
  minutes: 12,
  level: 'Beginner',
  concepts: ['Algorithms', 'Redis'],
  related: ['rate-limiting', 'caching', 'timeouts-retries', 'replication'],
  followUps: [
    'How would you give one enterprise customer a higher limit without a deploy?',
    'How would you limit anonymous users who share one office IP?',
    'How would you test that the limiter is accurate under concurrent load?',
    'How would you limit by cost (expensive queries) instead of request count?',
  ],
  keywords: ['rate limiter', 'fixed window', 'sliding window', 'token bucket', 'leaky bucket', 'redis', 'lua script', 'fail open', '429'],
  metrics: [
    { id: 'rps', label: 'Peak traffic', icon: Activity },
    { id: 'mem', label: 'Redis memory', icon: MemoryStick },
    { id: 'acc', label: 'Accuracy', icon: Target },
    { id: 'p99', label: 'Added p99', icon: Timer },
  ],
  learn: [
    { text: 'Sizing memory per algorithm', at: 1 },
    { text: 'Choosing where the limiter runs', at: 3 },
    { text: 'The fixed-window boundary burst', at: 4 },
    { text: 'Sliding windows, token and leaky buckets', at: 6 },
    { text: 'Atomic checks with a Lua script', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Clarify the limiter',
      tag: 'Requirements',
      body: [
        'Brief: “Rate-limit our public API.” Assume **50k req/s at peak**, 1M active API keys and 20 gateway nodes. Rules per key and endpoint — free tier 100 req/min, `/search` 10 req/s. Over the limit: `429` with `Retry-After`.',
        'Non-functional: add **< 2 ms** to p99, one budget per key across all nodes, a few percent error is fine. Out of scope: network-level DDoS (CDN/WAF) and monthly billing quotas. The basics are in the Rate Limiting lesson; here we choose.',
      ],
      scene: {
        nodes: rl('clients', ['gw', { label: 'Limiter', tone: 'gray', sub: '?' }], 'svc'),
        links: [L('clients', 'gw', { arrow: 'both' }), L('gw', 'svc')],
        flows: [F(['clients', 'gw', 'svc'], { ret: true, n: 2 }), F(['clients', 'gw'], { kind: 'error', stop: true, delay: 1 })],
        notes: [
          { at: [1.5, -3], text: '50k req/s peak · 20 nodes', icon: Activity },
          { at: [1.5, -2], text: '1M keys · per-key rules', icon: Users },
          { at: [1.5, 2.5], text: '< 2 ms added at p99', icon: Timer },
          { at: [1.5, 3.5], text: '429 + Retry-After', tone: 'warn' },
        ],
      },
      metrics: { rps: '50k /s', mem: '—', acc: '—', p99: '—' },
    },
    {
      short: 'Numbers',
      title: 'Store load and memory',
      tag: 'Estimation',
      body: [
        'Every request needs a check, so the shared store sees **50k ops/s**. One Redis node handles roughly 100k simple ops/s; plan 3 shards for headroom, with keys spread by API key.',
        'Memory depends on the algorithm. A counter is ~100 B per key with overhead, so **1M keys ≈ 100 MB**. A log of every request at 100/min is ~100 entries × ~64 B ≈ 6 KB per key, **≈ 6 GB**. That gap drives the choice.',
      ],
      changes: [{ sign: '+', text: 'Shared counter store' }],
      scene: {
        nodes: rl('clients', 'gw', 'svc', 'redis'),
        links: [L('clients', 'gw', { arrow: 'both' }), L('gw', 'svc'), L('gw', 'redis', { arrow: 'both', label: 'check' })],
        flows: [F(['clients', 'gw', 'redis'], { ret: true, n: 2 }), F(['gw', 'svc'], { delay: 1 })],
        notes: [
          { at: [4.3, -3.6], text: 'counter: 1M × 100 B = 100 MB', tone: 'good' },
          { at: [4.3, -2.5], text: 'log: 1M × 6 KB ≈ 6 GB', tone: 'bad' },
          { at: [0.5, 3], text: '50k checks/s → 3 shards', icon: Zap },
        ],
      },
      metrics: { mem: '0.1–6 GB' },
    },
    {
      short: 'Rules · API',
      title: 'Rules as config, one check call',
      tag: 'API',
      body: [
        'Rules are data, not code: `{match: {tier: "free", path: "/search"}, limit: 10, per: "1s"}` in a config store, pushed to gateways and cached in memory, so changing a limit needs no deploy.',
        'The hot call is `allow(key, rule) → {ok, remaining, resetAt}`. The gateway maps it to `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers and, on rejection, `429` + `Retry-After`, so good clients can pace themselves.',
      ],
      changes: [{ sign: '+', text: 'Rules config store' }],
      scene: {
        nodes: rl('clients', 'gw', 'svc', 'redis', 'rules'),
        links: [...rlBase, L('rules', 'gw', { dashed: true, label: 'push on change' })],
        flows: [F(['rules', 'gw'], { kind: 'data' }), F(['clients', 'gw', 'redis'], { ret: true, delay: 0.8 }), F(['gw', 'svc'], { delay: 1.6 })],
      },
    },
    {
      short: 'Placement',
      title: 'Where the limiter lives',
      tag: 'Design',
      body: [
        'Options: a library **inside each service** (no extra hop, but every team re-implements it), a **sidecar** per pod (language-neutral, more moving parts), or **middleware in the API gateway** (one place, rejects before any service work).',
        'Pick the gateway for the public API: one choke point, cheap rejections, and services stay simple. Keep an in-service limiter only for special cases, like an expensive export endpoint.',
      ],
      callout: { kind: 'tip', text: 'Say the alternatives out loud, then commit. Interviewers want a reasoned choice, not a survey.' },
      scene: {
        nodes: rl('clients', 'gw', ['svc', { meter: 45 }], 'redis', 'rules'),
        links: [...rlBase, L('rules', 'gw', { dashed: true })],
        flows: [F(['clients', 'gw', 'svc'], { ret: true, n: 2 }), F(['clients', 'gw'], { kind: 'error', stop: true, delay: 0.7 }), F(['gw', 'redis'], { kind: 'data', ret: true, retKind: 'data', delay: 0.3 })],
      },
      metrics: { p99: '1.2 ms' },
    },
    {
      short: 'Fixed window',
      title: 'Fixed window and the boundary burst',
      tag: 'Deep Dive',
      body: [
        'Simplest: one counter per key per minute — `INCR rl:{key}:1201`, expire after 60 s. One small key per client and trivial to explain.',
        'Flaw: windows reset on the clock. A client sends 100 at 12:00:59 and 100 more at 12:01:00 — **200 requests in 2 seconds** under a 100/min rule. Fine for coarse quotas, poor for protecting a fragile endpoint.',
      ],
      scene: {
        nodes: rl('clients', 'gw', ['svc', { meter: 85, status: 'hot' }], ['redis', { sub: 'INCR · TTL' }]),
        links: rlBase,
        flows: [F(['clients', 'gw', 'svc'], { n: 5, speed: 1.4 }), F(['gw', 'redis'], { kind: 'data', ret: true, retKind: 'data', n: 2 })],
        notes: [
          { at: [4.5, -3.8], text: '12:00:59 → 100 allowed' },
          { at: [4.5, -2.75], text: '12:01:00 → 100 allowed' },
          { at: [0.5, 3], text: '200 in 2 s under 100/min', tone: 'bad' },
        ],
      },
      metrics: { mem: '100 MB', acc: '2× burst' },
      bad: ['acc'],
    },
    {
      short: 'Sliding',
      title: 'Sliding log vs sliding counter',
      tag: 'Deep Dive',
      body: [
        '**Sliding log**: a sorted set of timestamps per key — `ZREMRANGEBYSCORE` anything older than 60 s, `ZCARD`, then `ZADD now`. Exact, but memory grows with the limit: the ~6 GB from our estimate.',
        '**Sliding window counter**: keep this and last minute’s counts and weight them, `prev × (1 − elapsed/60) + curr`. Two integers per key, no boundary burst; it assumes even traffic last minute — a small error.',
      ],
      callout: { kind: 'key', text: 'Default answer: a sliding window counter for “N per window” rules, a token bucket when you want controlled bursts.' },
      scene: {
        nodes: rl('clients', 'gw', ['svc', { meter: 45 }], ['redis', { sub: '2 counters' }]),
        links: rlBase,
        flows: [F(['clients', 'gw', 'svc'], { ret: true, n: 2 }), F(['gw', 'redis'], { kind: 'data', ret: true, retKind: 'data', delay: 0.5 }), F(['clients', 'gw'], { kind: 'error', stop: true, delay: 1.2 })],
        notes: [
          { at: [4.5, -3.8], text: 'log: exact · 6 GB', tone: 'warn' },
          { at: [4.5, -2.75], text: 'counter: ~1% off · 200 MB', tone: 'good' },
        ],
      },
      metrics: { mem: '200 MB', acc: '≈ 99%' },
      hi: ['acc'],
    },
    {
      short: 'Buckets',
      title: 'Token bucket vs leaky bucket',
      tag: 'Deep Dive',
      body: [
        '**Token bucket** stores `(tokens, last_refill)` per key and refills lazily on each call: bursts up to the bucket size, a capped average. A great fit for APIs, because real clients are bursty.',
        '**Leaky bucket** queues requests and drains them at a fixed rate: perfectly smooth output, but callers wait and the queue needs a bound. Use it in front of a fragile downstream, like an SMS provider, not for user reads.',
      ],
      changes: [{ sign: '+', text: 'Leaky-bucket queue (for comparison)' }],
      scene: {
        nodes: rl('clients', 'gw', 'leak', ['svc', { meter: 40 }], ['redis', { sub: 'tokens·ts' }]),
        links: [L('clients', 'gw', { arrow: 'both' }), L('gw', 'leak'), L('leak', 'svc', { label: '10 /s' }), L('gw', 'redis', { arrow: 'both' })],
        flows: [F(['clients', 'gw', 'leak'], { n: 4, speed: 1.3 }), F(['leak', 'svc'], { speed: 0.6, delay: 0.5 }), F(['gw', 'redis'], { kind: 'data', ret: true, retKind: 'data', delay: 1 })],
        notes: [{ at: [0, 3], text: 'smooth out · callers wait', tone: 'warn' }],
      },
    },
    {
      short: 'Atomic',
      title: 'Make check-and-update atomic',
      tag: 'Deep Dive',
      body: [
        'Two gateways read `count = 99`, both allow, both write 100 — the limit leaks under load. `INCR` is atomic, but `INCR` then `EXPIRE` is two calls: crash between them and the key never expires, locking the client out.',
        'Run the whole algorithm as a **Lua script** (`EVALSHA`): Redis executes it atomically in one round trip — read, refill, decide, write, set TTL. Use a hash tag like `rl:{key}` so a key’s fields share one cluster shard.',
      ],
      callout: { kind: 'warn', text: 'Never read-modify-write from the gateway. Use one atomic command or one script.' },
      changes: [{ sign: '~', text: 'One Lua script per check' }],
      scene: {
        nodes: rl('clients', ['gw', { sub: '× 20' }], 'svc', ['redis', { sub: 'Lua script' }]),
        links: rlBase,
        flows: [F(['gw', 'redis'], { kind: 'data', ret: true, retKind: 'data', n: 3 }), F(['clients', 'gw', 'svc'], { ret: true, delay: 0.6 })],
        notes: [
          { at: [4.5, -3.2], text: 'GET 99 · GET 99 → 101 pass', tone: 'bad' },
          { at: [4.5, -2.2], text: 'EVALSHA: 1 atomic hop', tone: 'good' },
        ],
      },
      metrics: { acc: '≈ 99%', p99: '0.8 ms' },
      hi: ['p99'],
    },
    {
      short: 'Failures',
      title: 'A second region, and Redis down',
      tag: 'Bottleneck',
      body: [
        'Add an EU region: a global counter costs a ~80 ms cross-region hop per request. Instead **count locally and sync** totals every second, or split the budget 70/30. A client spraying both regions overshoots briefly; most APIs accept that.',
        'If Redis times out (budget 5 ms): **fail-open** keeps the API up but unprotected; **fail-closed** turns a cache outage into a full outage. Usually fail open to an **in-memory limiter** at `limit ÷ 20` per gateway — but fail closed on login.',
      ],
      changes: [{ sign: '+', text: 'EU gateway and Redis' }, { sign: '~', text: 'Local fallback limiter' }],
      scene: {
        nodes: rl('clients', ['gw', { sub: 'local mode' }], 'svc', ['redis', { status: 'down' }], 'rules', 'redisEU', 'gwEU', 'clientsEU'),
        links: [
          L('clients', 'gw', { arrow: 'both' }),
          L('gw', 'svc'),
          L('gw', 'redis', { tone: 'bad', dashed: true }),
          L('rules', 'gw', { dashed: true }),
          L('redis', 'redisEU', { dashed: true, arrow: 'both', label: 'sync 1 s' }),
          L('redisEU', 'gwEU', { arrow: 'both' }),
          L('clientsEU', 'gwEU', { arrow: 'both' }),
          L('gwEU', 'svc'),
        ],
        flows: [
          F(['gw', 'redis'], { kind: 'error', stop: true }),
          F(['clients', 'gw', 'svc'], { ret: true, delay: 0.5 }),
          F(['clientsEU', 'gwEU', 'redisEU'], { ret: true, delay: 0.3 }),
        ],
        notes: [
          { at: [-5.8, -3], text: 'cross-region call ≈ 80 ms', tone: 'bad' },
          { at: [-6, 2.6], text: 'fail open → local limit', tone: 'warn' },
        ],
      },
      metrics: { acc: '≈ 95%' },
      bad: ['acc'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Clarify limits and the latency budget, size memory per algorithm, keep rules as config, and enforce in **gateway middleware** against Redis. Prefer a **sliding window counter** or **token bucket**, run as one atomic **Lua script**.',
        'Sync regions asynchronously, give Redis a tight timeout, and fail open to a local limiter.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'The formula is the easy part. Atomicity, placement and the failure mode are what make a rate limiter production-ready.' },
      scene: {
        nodes: rl('clients', 'gw', 'svc', 'redis', 'rules', 'redisEU', 'gwEU', 'clientsEU'),
        links: [
          ...rlBase,
          L('rules', 'gw', { dashed: true }),
          L('redis', 'redisEU', { dashed: true, arrow: 'both' }),
          L('redisEU', 'gwEU', { arrow: 'both' }),
          L('clientsEU', 'gwEU', { arrow: 'both' }),
          L('gwEU', 'svc'),
        ],
        flows: [
          F(['clients', 'gw', 'redis'], { ret: true }),
          F(['gw', 'svc'], { delay: 0.6 }),
          F(['clientsEU', 'gwEU', 'svc'], { delay: 1 }),
          F(['redis', 'redisEU'], { kind: 'data', delay: 1.4 }),
        ],
      },
      metrics: { rps: '50k /s', mem: '200 MB', acc: '≈ 99%', p99: '0.8 ms' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Q7 · Design a Notification System                                    */
/* ------------------------------------------------------------------ */

const nt = cast({
  callers: { kind: 'cube', at: [-7, 0], label: 'Services', sub: 'orders·auth', icon: Server, tone: 'blue' },
  api: { kind: 'cube', at: [-3.5, 0], label: 'Notify', sub: 'API', icon: Bell, tone: 'blue' },
  db: { kind: 'db', at: [-3.5, -3.5], tag: 'notif db', icon: Database },
  qEmail: { kind: 'queue', at: [0, -3.5], tag: 'email q', items: 3 },
  qSms: { kind: 'queue', at: [0, 0], tag: 'sms q', items: 2 },
  qPush: { kind: 'queue', at: [0, 3.5], tag: 'push q', items: 3 },
  wEmail: { kind: 'cube', at: [3.5, -3.5], label: 'Workers', sub: 'email', icon: Send, tone: 'blue' },
  wSms: { kind: 'cube', at: [3.5, 0], label: 'Workers', sub: 'sms', icon: Send, tone: 'blue' },
  wPush: { kind: 'cube', at: [3.5, 3.5], label: 'Workers', sub: 'push', icon: Send, tone: 'blue' },
  pEmail: { kind: 'slab', at: [7, -3.5], tag: 'email ESP', icon: Mail, tone: 'teal' },
  pSms: { kind: 'slab', at: [7, 0], tag: 'SMS gateway', icon: MessageSquare, tone: 'teal' },
  pPush: { kind: 'slab', at: [7, 3.5], tag: 'APNs · FCM', icon: Smartphone, tone: 'teal' },
  dlq: { kind: 'queue', at: [0, 7], tag: 'dead letters', items: 2, tone: 'rose' },
  log: { kind: 'db', at: [3.5, 7], tag: 'delivery log', icon: Database },
  hook: { kind: 'cube', at: [7, 7], label: 'Webhook', sub: 'status', icon: Webhook, tone: 'blue' },
});

const ntPipe = [
  L('callers', 'api', { arrow: 'both' }),
  L('api', 'db', { arrow: 'both' }),
  L('api', 'qEmail'),
  L('api', 'qSms'),
  L('api', 'qPush'),
  L('qEmail', 'wEmail'),
  L('qSms', 'wSms'),
  L('qPush', 'wPush'),
  L('wEmail', 'pEmail'),
  L('wSms', 'pSms'),
  L('wPush', 'pPush'),
];
const ntAll = ['callers', 'api', 'db', 'qEmail', 'qSms', 'qPush', 'wEmail', 'wSms', 'wPush', 'pEmail', 'pSms', 'pPush'] as const;

export const qNotifications: Question = {
  id: 'q-notifications',
  n: 7,
  title: 'Design a Notification System',
  blurb: 'One API for email, SMS and push: queues per channel, worker pools, retries, dedupe and tracking.',
  minutes: 12,
  level: 'Beginner',
  concepts: ['Queues', 'Workers'],
  related: ['message-queues', 'timeouts-retries', 'rate-limiting', 'apis'],
  followUps: [
    'How would you support quiet hours in each user’s time zone?',
    'How would you send one daily digest instead of twenty separate emails?',
    'How do you stop an OTP from waiting behind a marketing batch?',
    'How would you A/B test two versions of a template?',
  ],
  keywords: ['notification system', 'email', 'sms', 'push', 'message queue', 'worker pool', 'retry', 'dead letter queue', 'idempotency key'],
  metrics: [
    { id: 'day', label: 'Sends / day', icon: Send },
    { id: 'peak', label: 'Peak', icon: Activity },
    { id: 'lag', label: 'Queue lag', icon: Hourglass },
    { id: 'dupes', label: 'Duplicates', icon: Copy },
  ],
  learn: [
    { text: 'One async API that answers 202', at: 2 },
    { text: 'A queue and worker pool per channel', at: 5 },
    { text: 'Retries with backoff and a dead-letter queue', at: 6 },
    { text: 'Idempotency keys and delivery tracking', at: 7 },
    { text: 'Circuit breakers and provider failover', at: 8 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Clarify the notification service',
      tag: 'Requirements',
      body: [
        'Brief: “Orders, auth and marketing need to notify users.” One **Notification API** for all of them, delivering by **email, SMS and push** through third-party providers. 10M users, ~20M notifications a day, one region.',
        'Must have: templates, **preferences and opt-out**, retries, delivery tracking. Non-functional: OTPs land in seconds, a slow provider never blocks callers, at-least-once without visible duplicates. Out of scope: mass fan-out, multi-region, an in-app inbox.',
      ],
      scene: {
        nodes: nt('callers', ['api', { tone: 'gray', sub: '?' }]),
        links: [L('callers', 'api', { arrow: 'both' })],
        flows: [F(['callers', 'api'], { ret: true, n: 2 })],
        notes: [
          { at: [2.5, -3], text: 'email · SMS · push', icon: Mail },
          { at: [2.5, -2], text: '10M users · 20M sends/day', icon: Users },
          { at: [2.5, 2], text: 'OTP delivered in seconds', icon: Timer },
          { at: [2.5, 3], text: 'honour opt-outs', tone: 'warn' },
        ],
      },
      metrics: { day: '20M', peak: '—', lag: '—', dupes: '—' },
    },
    {
      short: 'Numbers',
      title: 'Napkin maths',
      tag: 'Estimation',
      body: [
        '20M a day ÷ 86,400 ≈ **230/s** on average; evenings and campaigns push peaks to ~5×, **~1,200/s**. Mix: 60% email, 35% push, 5% SMS — the smallest stream, but each SMS costs real money, so duplicates hurt.',
        'A log row per notification (~1 KB with status history) is ~20 GB a day; 90 days ≈ **1.8 TB**. Providers impose limits too — say 100 SMS/s on our plan — so we must pace sends, not just make them.',
      ],
      scene: {
        nodes: nt('callers', ['api', { tone: 'gray', sub: '?' }]),
        links: [L('callers', 'api', { arrow: 'both' })],
        flows: [F(['callers', 'api'], { ret: true, n: 3, speed: 1.3 })],
        notes: [
          { at: [2.5, -3], text: '≈ 230/s avg · 1,200/s peak', icon: Activity },
          { at: [2.5, -2], text: '60/35/5% email/push/SMS' },
          { at: [2.5, 2], text: '90 d × 20 GB ≈ 1.8 TB', icon: Database },
          { at: [2.5, 3], text: 'SMS quota: 100 / s', tone: 'warn' },
        ],
      },
      metrics: { peak: '1,200 /s' },
    },
    {
      short: 'API',
      title: 'One endpoint: accepted, not sent',
      tag: 'API',
      body: [
        '`POST /v1/notifications {user_id, template: "order_shipped", data, idempotency_key}` → `202 Accepted {id}`. The caller doesn’t wait for delivery; it can poll `GET /v1/notifications/{id}` or ignore it.',
        'Callers send **intent** (template + data), never raw HTML or phone numbers. The service looks up contact details and preferences itself, so opt-outs are enforced in one place, not in every team’s code.',
      ],
      scene: {
        nodes: nt('callers', 'api'),
        links: [L('callers', 'api', { arrow: 'both', label: 'POST · 202' })],
        flows: [F(['callers', 'api'], { ret: true, n: 2 })],
        notes: [{ at: [2, -2], text: 'template + data, not HTML', icon: Mail }],
      },
    },
    {
      short: 'Data',
      title: 'Templates, preferences, a send log',
      tag: 'Data Model',
      body: [
        '`templates(name, channel, locale, version, body)`; `preferences(user_id, category, channel, opted_in)` with categories like `security` and `marketing`; `notifications(id PK, idempotency_key UNIQUE, user_id, template, status, attempts)`.',
        'Security messages (password reset, OTP) ignore marketing opt-outs; marketing must honour them, by law in most places. Store the template version used, so you can show exactly what a user received.',
      ],
      changes: [{ sign: '+', text: 'Notification database' }],
      scene: {
        nodes: nt('callers', 'api', 'db'),
        links: [L('callers', 'api', { arrow: 'both' }), L('api', 'db', { arrow: 'both' })],
        flows: [F(['callers', 'api', 'db'], { ret: true }), F(['api', 'db'], { kind: 'data', ret: true, retKind: 'data', delay: 1 })],
      },
    },
    {
      short: 'Design',
      title: 'API, queues, workers, providers',
      tag: 'Design',
      body: [
        'The API validates, checks preferences, renders the template, writes the row as `QUEUED` and enqueues a message per channel. A **queue per channel** feeds a **worker pool** per channel, which calls its provider and records the result.',
        'Queues absorb bursts: a 300k-email campaign becomes backlog that workers drain at the provider’s pace, while the API keeps answering `202` in ~20 ms.',
      ],
      changes: [{ sign: '+', text: 'Email, SMS and push queues' }, { sign: '+', text: 'Worker pools and providers' }],
      scene: {
        nodes: nt(...ntAll),
        links: ntPipe,
        flows: [
          F(['callers', 'api', 'qEmail', 'wEmail', 'pEmail']),
          F(['api', 'qSms', 'wSms', 'pSms'], { delay: 0.6 }),
          F(['api', 'qPush', 'wPush', 'pPush'], { delay: 1.2 }),
          F(['api', 'db'], { kind: 'data', delay: 0.3 }),
        ],
      },
      metrics: { lag: '< 1 s' },
      hi: ['lag'],
    },
    {
      short: 'Isolation',
      title: 'Why one queue per channel',
      tag: 'Deep Dive',
      body: [
        'With one shared queue, a slow SMS provider (2 s per call) ties up workers that push messages needed — **head-of-line blocking**. Separate queues isolate failures and let each pool scale on its own backlog.',
        'Each pool also respects its provider’s quota with a local rate limiter: SMS workers stop at 100/s however deep the queue. Workers are stateless — pull, send, ack — so add them when lag grows and remove them when it’s near zero.',
      ],
      callout: { kind: 'tip', text: 'Scale workers on queue lag (age of the oldest message), not CPU. Lag is what users feel.' },
      scene: {
        nodes: nt(...ntAll.filter((id) => id !== 'qSms' && id !== 'wSms'), ['qSms', { items: 6 }], ['wSms', { sub: '100 /s cap', status: 'hot' }]),
        links: ntPipe,
        flows: [
          F(['wSms', 'pSms'], { ret: true, speed: 0.5 }),
          F(['api', 'qPush', 'wPush', 'pPush'], { n: 3, speed: 1.3 }),
          F(['api', 'qEmail', 'wEmail', 'pEmail'], { n: 2, delay: 0.4 }),
        ],
      },
    },
    {
      short: 'Retries',
      title: 'Retries, backoff and a dead-letter queue',
      tag: 'Deep Dive',
      body: [
        'Classify failures. **Transient** (timeout, 5xx, provider 429): retry with exponential backoff and jitter — 2 s, 8 s, 30 s, 2 min, 10 min. **Permanent** (bad number, unregistered push token): don’t retry; mark failed and clean up.',
        'After 5 attempts the message moves to a **dead-letter queue** with its last error. Alert on DLQ growth; a replay tool re-enqueues after a fix. Retries go back via a delayed queue, so no worker sleeps holding a message.',
      ],
      changes: [{ sign: '+', text: 'Dead-letter queue' }],
      scene: {
        nodes: nt(...ntAll, 'dlq'),
        links: [...ntPipe, L('wPush', 'dlq', { tone: 'bad', label: 'after 5 tries' })],
        flows: [
          F(['wPush', 'pPush'], { ret: true, retKind: 'error' }),
          F(['qPush', 'wPush'], { kind: 'event', delay: 0.8 }),
          F(['wPush', 'dlq'], { kind: 'error', delay: 1.6 }),
          F(['api', 'qEmail', 'wEmail', 'pEmail'], { delay: 0.4 }),
        ],
      },
    },
    {
      short: 'Dedupe',
      title: 'Dedupe and delivery tracking',
      tag: 'Deep Dive',
      body: [
        'Callers retry too. The unique `idempotency_key` turns a repeated `POST` into the same `202 {id}`, not a second message. Workers skip rows already `SENT`; a crash between send and ack can still repeat one, so pass our id to providers that dedupe.',
        'Tracking: workers append `SENT` + the provider’s message id to a **delivery log**; providers later call a **webhook** with delivered, bounced or opened. Hard bounces feed back into preferences so we stop mailing dead addresses.',
      ],
      changes: [{ sign: '+', text: 'Webhook receiver' }, { sign: '+', text: 'Delivery log' }],
      scene: {
        nodes: nt(...ntAll, 'log', 'hook'),
        links: [...ntPipe, L('wPush', 'log', { label: 'SENT' }),         L('pPush', 'hook'), L('hook', 'log', { label: 'delivered' })],
        flows: [
          F(['api', 'qPush', 'wPush', 'pPush']),
          F(['wPush', 'log'], { kind: 'data', delay: 0.8 }),
          F(['pPush', 'hook', 'log'], { kind: 'event', delay: 1.4 }),
          F(['callers', 'api', 'db'], { ret: true, delay: 0.4 }),
        ],
        notes: [{ at: [-5.5, -2.8], text: 'same key → same 202 {id}', tone: 'good' }],
      },
      metrics: { dupes: '≈ 0' },
      hi: ['dupes'],
    },
    {
      short: 'Outage',
      title: 'A provider goes down',
      tag: 'Bottleneck',
      body: [
        'The SMS provider returns 503 for 20 minutes. Retries pile load on a dead service and the SMS queue backs up — OTPs arrive after they expire. Add a **circuit breaker** per provider: after a burst of failures, stop calling and fail fast.',
        'Keep a **secondary provider** per channel and fail over when the breaker opens. Drop OTPs older than their 5-minute validity rather than sending them late, autoscale on lag, and alert when lag passes a minute.',
      ],
      callout: { kind: 'warn', text: 'Retries without a breaker turn a provider blip into a backlog storm the moment it recovers.' },
      changes: [{ sign: '+', text: 'Circuit breaker per provider' }, { sign: '+', text: 'Secondary SMS provider' }],
      scene: {
        nodes: nt(...ntAll.filter((id) => id !== 'qSms' && id !== 'pSms'), ['qSms', { items: 7 }], ['pSms', { status: 'down', tag: 'SMS #1 · 503' }], 'dlq'),
        links: [...ntPipe.filter((l) => l.from !== 'wSms'), L('wSms', 'pSms', { tone: 'bad', dashed: true }), L('wPush', 'dlq')],
        flows: [F(['api', 'qSms', 'wSms', 'pSms'], { kind: 'error', stop: true }), F(['api', 'qEmail', 'wEmail', 'pEmail'], { delay: 0.6 })],
        notes: [
          { at: [-5.5, 3.2], text: 'breaker open → fail fast', tone: 'bad' },
          { at: [-5.5, 4.2], text: 'fail over to SMS #2', tone: 'good' },
        ],
      },
      metrics: { lag: '4 min' },
      bad: ['lag'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'One **async API** answers `202`, checks preferences and renders templates. A **queue and worker pool per channel** isolate providers and pace sends. Retries back off with jitter and end in a **dead-letter queue**.',
        '**Idempotency keys** stop duplicates, webhooks track delivery, and circuit breakers with backup providers ride out outages.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Accept fast, deliver asynchronously, and treat every provider as unreliable: queues, retries, dedupe and a DLQ are the core.' },
      scene: {
        nodes: nt(...ntAll, 'dlq', 'log', 'hook'),
        links: [...ntPipe, L('wPush', 'dlq'), L('wPush', 'log'), L('pPush', 'hook'), L('hook', 'log')],
        flows: [
          F(['callers', 'api', 'qEmail', 'wEmail', 'pEmail']),
          F(['api', 'qSms', 'wSms', 'pSms'], { delay: 0.5 }),
          F(['api', 'qPush', 'wPush', 'pPush'], { delay: 1 }),
          F(['pPush', 'hook', 'log'], { kind: 'event', delay: 1.6 }),
        ],
      },
      metrics: { day: '20M', peak: '1,200 /s', lag: '< 1 s', dupes: '≈ 0' },
    },
  ],
};
