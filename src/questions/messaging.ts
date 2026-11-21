import {
  Activity,
  Ban,
  BarChart3,
  BellRing,
  CheckCheck,
  Clock,
  Copy,
  Cpu,
  Database,
  Earth,
  Eye,
  Gauge,
  Globe,
  Hash,
  Hourglass,
  Image,
  Inbox,
  KeyRound,
  Layers,
  ListOrdered,
  Lock,
  MapPin,
  Megaphone,
  MessageSquare,
  Mic,
  Moon,
  OctagonX,
  Plug,
  Radio,
  Route,
  Send,
  Server,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  User,
  Users,
  Zap,
} from 'lucide-react';
import type { Question } from '../types';
import { cast, F, L } from '../lessons/kit';

/* ------------------------------------------------------------------ */
/* Q9 · Design WhatsApp                                                */
/* ------------------------------------------------------------------ */

const wa = cast({
  alice: { kind: 'phone', at: [-7, 0], tag: 'alice', tagIcon: User },
  sys: { kind: 'cube', at: [0, 0], label: 'Backend', sub: '?', icon: Server, tone: 'gray' },
  gw1: { kind: 'cube', at: [-3.5, 0], label: 'Gateway', sub: 'socket', icon: Plug, tone: 'green' },
  router: { kind: 'cube', at: [0, 0], label: 'Router', sub: 'relay', icon: Send, tone: 'blue' },
  gw2: { kind: 'cube', at: [3.5, 0], label: 'Gateway', sub: 'socket', icon: Plug, tone: 'green' },
  bob: { kind: 'phone', at: [7, 0], tag: 'bob · phone', tagIcon: User },
  bobPc: { kind: 'device', at: [7, -3.5], tag: 'bob · laptop' },
  sessions: { kind: 'cube', at: [-3.5, -3.5], label: 'Sessions', sub: 'presence', icon: Eye, tone: 'yellow' },
  inbox: { kind: 'db', at: [0, -4.5], tag: 'device inboxes', icon: Inbox },
  keys: { kind: 'cube', at: [3.5, -3.5], label: 'Keys', sub: 'prekeys', icon: KeyRound, tone: 'yellow' },
  blob: { kind: 'slab', at: [-3.5, 3.5], tag: 'encrypted blobs', icon: Image, tone: 'violet' },
  cdn: { kind: 'slab', at: [3.5, 3.5], tag: 'CDN', icon: Globe, tone: 'teal' },
  group: { kind: 'crowd', at: [7, 3.5], tag: 'group · 1k', tagIcon: Users, items: 6 },
});

const waCore = [
  L('alice', 'gw1', { arrow: 'both' }),
  L('gw1', 'router', { arrow: 'both' }),
  L('router', 'gw2', { arrow: 'both' }),
  L('gw2', 'bob', { arrow: 'both' }),
  L('router', 'inbox', { arrow: 'both' }),
  L('router', 'sessions', { arrow: 'both' }),
];

export const qWhatsApp: Question = {
  id: 'q-whatsapp',
  n: 9,
  title: 'Design WhatsApp',
  blurb: 'Mobile-first messaging: per-device inboxes, three ticks, multi-device and end-to-end encryption.',
  minutes: 14,
  level: 'Intermediate',
  concepts: ['WebSockets', 'Queues', 'Delivery'],
  related: ['chat', 'realtime', 'encryption', 'files', 'message-queues'],
  followUps: [
    'How would you add encrypted cloud backups without the server reading them?',
    'What changes if a user links a fifth device while offline messages are pending?',
    'How would you detect spam when the server cannot read message content?',
    'How do you keep message order when a phone reconnects through a different gateway?',
  ],
  keywords: ['whatsapp', 'store and forward', 'device inbox', 'read receipts', 'ticks', 'multi-device', 'end-to-end encryption', 'prekeys', 'sender keys', 'last seen'],
  metrics: [
    { id: 'online', label: 'Online devices', icon: Smartphone },
    { id: 'msgs', label: 'Messages', icon: MessageSquare },
    { id: 'dwell', label: 'Inbox dwell', icon: Inbox },
    { id: 'sees', label: 'Server sees', icon: Lock },
  ],
  learn: [
    { text: 'Store-and-forward with a per-device inbox', at: 3 },
    { text: 'Sent, delivered and read ticks as messages', at: 4 },
    { text: 'End-to-end keys for every device', at: 5 },
    { text: 'Group messages with sender keys', at: 6 },
    { text: 'Encrypted media via object storage', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Mobile messaging for billions',
      tag: 'Requirements',
      body: [
        'Functional: 1:1 and **group chats up to ~1,000 members**, photos and video, sent / delivered / read ticks, last seen, and one phone plus up to 4 **linked devices**. Out of scope: voice and video calls, status stories, payments.',
        'Non-functional: ~2B accounts, **never lose an accepted message**, sub-second delivery when both ends are online, and **end-to-end encryption** — the servers must not be able to read content. Flaky mobile networks are the normal case.',
      ],
      callout: { kind: 'key', text: 'Two constraints shape everything: phones are often offline, and the server is not allowed to read what it relays.' },
      scene: {
        nodes: wa('alice', 'sys', 'bob'),
        links: [L('alice', 'sys', { arrow: 'both' }), L('sys', 'bob', { arrow: 'both' })],
        flows: [F(['alice', 'sys', 'bob'], { kind: 'data' }), F(['bob', 'sys', 'alice'], { kind: 'event', delay: 1.6 })],
        notes: [
          { at: [-3.5, -3.5], text: '1:1 + groups ≤ 1k', icon: Users },
          { at: [3.5, -3.5], text: 'phone + 4 linked devices', icon: Smartphone },
          { at: [-3.5, 3.5], text: 'never lose an accepted msg', tone: 'warn' },
          { at: [3.5, 3.5], text: 'server sees ciphertext', icon: Lock, tone: 'good' },
        ],
      },
      metrics: { online: '—', msgs: '—', dwell: '—', sees: 'ciphertext' },
    },
    {
      short: 'Numbers',
      title: 'Lots of messages, little storage',
      tag: 'Estimation',
      body: [
        'Assume **1B daily users × 50 messages** ≈ 50B/day ≈ **600k/s**, ~1.5M/s at peak. With ~500M devices online and ~100k mostly idle sockets per tuned gateway, that is **~5,000 gateways**. A text frame is ~1 KB of ciphertext plus headers.',
        'The surprise: the server keeps a message **only until every device has it**, so text storage is hours of backlog — a few TB — not years. Media dominates: if 5% of messages carry ~200 KB, that is **~500 TB/day** of encrypted blobs.',
      ],
      scene: {
        nodes: wa('alice', ['sys', { meter: 60 }], 'bob'),
        links: [L('alice', 'sys', { arrow: 'both' }), L('sys', 'bob', { arrow: 'both' })],
        flows: [F(['alice', 'sys', 'bob'], { kind: 'data', n: 3 })],
        notes: [
          { at: [-3.5, -3.5], text: '≈ 600k msgs/s (1.5M peak)', icon: MessageSquare },
          { at: [3.5, -3.5], text: '500M online → ~5k gateways', icon: Plug },
          { at: [-3.5, 3.5], text: 'text: a few TB, transient', icon: Inbox },
          { at: [3.5, 3.5], text: 'media ≈ 500 TB / day', icon: Image, tone: 'warn' },
        ],
      },
      metrics: { online: '500M', msgs: '600k /s' },
    },
    {
      short: 'API',
      title: 'Frames on one socket',
      tag: 'API',
      body: [
        'Each device keeps one socket and speaks in small frames: `send{to, client_id, ciphertext}` → `ack{client_id}`; the server pushes `msg{id, from, ciphertext}` and the device answers `delivered{id}`, later `read{id}`. Media goes over HTTPS: `PUT /media` returns a blob id.',
        'Server state is small: `devices(user_id → device_id, identity_key)`, `prekeys(device_id → one-time keys)`, `groups(group_id → members)` and **`inbox(device_id, seq) → envelope`**, deleted on delivery. **History lives on the devices.**',
      ],
      scene: {
        nodes: wa('alice', 'gw1', 'router', 'inbox'),
        links: [L('alice', 'gw1', { arrow: 'both', label: 'send / ack' }), L('gw1', 'router', { arrow: 'both' }), L('router', 'inbox', { arrow: 'both' })],
        flows: [F(['alice', 'gw1', 'router', 'inbox'], { kind: 'data', ret: true, retKind: 'response' })],
        notes: [
          { at: [3.5, -3.5], text: 'inbox(device_id, seq)', icon: ListOrdered },
          { at: [3.5, 2], text: 'no server-side history', tone: 'good' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'A store-and-forward relay',
      tag: 'Design',
      body: [
        'Phones hold a socket to a nearby **gateway**. The **router** looks up each recipient device in **sessions** (device → gateway), appends the envelope to that device’s **inbox**, and forwards it if online. Gateways hold no data: if one dies, phones reconnect elsewhere and drain their inbox.',
        'Compared with the course’s chat design, the twist is **no permanent message store**. Durability means “in the inbox until acknowledged”, so storage stays small however long people chat — and there is no plaintext archive to protect.',
      ],
      changes: [{ sign: '+', text: 'Gateways, router, sessions' }, { sign: '+', text: 'Per-device inboxes' }],
      scene: {
        nodes: wa('alice', 'gw1', ['router', { meter: 40 }], 'gw2', 'bob', 'sessions', 'inbox'),
        links: waCore,
        flows: [
          F(['alice', 'gw1', 'router', 'inbox'], { kind: 'data' }),
          F(['router', 'sessions'], { kind: 'request', ret: true, retKind: 'data', delay: 1 }),
          F(['router', 'gw2', 'bob'], { kind: 'data', delay: 2 }),
        ],
        notes: [{ at: [-6.5, -3.5], text: 'bob/phone → gateway 2', icon: Route }],
      },
      metrics: { online: '500M / 5k gw' },
    },
    {
      short: 'Ticks',
      title: 'One inbox per device, three ticks',
      tag: 'Deep Dive',
      body: [
        'The router appends to Bob’s inbox and only then acks: **✓ sent** means “the server holds it”. Bob’s phone stores it locally and replies `delivered`; the router **deletes the inbox entry** and relays a receipt: **✓✓ delivered**. Opening the chat sends `read` → blue ticks.',
        'Receipts are tiny messages that travel back through Alice’s inbox, so they survive her being offline too. Unclaimed entries expire after ~30 days. Offline devices get a push nudge and drain their inbox in `seq` order when they reconnect.',
      ],
      callout: { kind: 'tip', text: 'Delete-on-ack keeps the inbox tiny: most entries live for well under a second, so it behaves like a per-device queue, not a database.' },
      scene: {
        nodes: wa('alice', 'gw1', ['router', { meter: 45 }], 'gw2', 'bob', 'sessions', ['inbox', { meter: 20 }]),
        links: waCore,
        flows: [
          F(['alice', 'gw1', 'router', 'inbox'], { kind: 'data', ret: true, retKind: 'response' }),
          F(['router', 'gw2', 'bob'], { kind: 'data', delay: 1.4 }),
          F(['bob', 'gw2', 'router', 'gw1', 'alice'], { kind: 'event', delay: 2.6 }),
        ],
        notes: [
          { at: [-6.5, -3.5], text: '✓ = stored in bob’s inbox', icon: Inbox },
          { at: [3.5, 3], text: '✓✓ = delivered → deleted', icon: CheckCheck, tone: 'good' },
        ],
      },
      metrics: { dwell: '< 1 s typical' },
      hi: ['dwell'],
    },
    {
      short: 'E2E',
      title: 'End-to-end keys, per device',
      tag: 'Deep Dive',
      body: [
        'Every device makes its own **identity key** and uploads a batch of one-time **prekeys**. To start a chat, Alice fetches a bundle for **each** of Bob’s devices, runs a key agreement to derive a shared secret, and encrypts. Private keys never leave the phones.',
        'A **ratchet** then moves the keys forward with every message, so a stolen key does not unlock old chats (forward secrecy). Multi-device means Alice encrypts once per recipient device — and once per her own other devices, so her laptop shows what she sent.',
      ],
      callout: { kind: 'warn', text: 'The server still sees metadata — who, when, how big. Spam control and backups must work without plaintext: user reports, rate limits, client-encrypted backups.' },
      changes: [{ sign: '+', text: 'Key service (prekeys)' }, { sign: '+', text: 'Bob’s linked laptop' }],
      scene: {
        nodes: wa('alice', 'gw1', ['router', { meter: 45 }], 'gw2', 'bob', 'bobPc', 'sessions', ['inbox', { meter: 25 }], 'keys'),
        links: [...waCore, L('router', 'keys', { arrow: 'both' }), L('gw2', 'bobPc', { arrow: 'both' })],
        flows: [
          F(['alice', 'gw1', 'router', 'keys'], { kind: 'request', ret: true, retKind: 'data' }),
          F(['router', 'gw2', 'bob'], { kind: 'data', delay: 2 }),
          F(['router', 'gw2', 'bobPc'], { kind: 'data', delay: 2.3 }),
        ],
        notes: [
          { at: [-6.5, -3.5], text: '1 ciphertext per device', icon: Lock },
          { at: [-6.5, 3.5], text: 'server relays noise', icon: ShieldCheck, tone: 'good' },
        ],
      },
      metrics: { sees: 'ciphertext only' },
      hi: ['sees'],
    },
    {
      short: 'Groups',
      title: 'Groups of 1,000 with sender keys',
      tag: 'Deep Dive',
      body: [
        'Encrypting each group message separately for 1,000 members × 2 devices would mean ~2,000 encryptions per send. Instead each member shares a **sender key** with the group once, over the pairwise sessions, and then encrypts each group message **once**.',
        'The router fans that single ciphertext out to ~2,000 device inboxes, **batched per gateway**. When someone leaves, members rotate their sender keys so the leaver can’t read what comes next — rotation and fan-out cost are why group size is capped.',
      ],
      changes: [{ sign: '+', text: 'Group fan-out' }],
      scene: {
        nodes: wa('alice', 'gw1', ['router', { meter: 70, status: 'hot' }], 'gw2', 'bob', 'sessions', ['inbox', { meter: 45 }], 'keys', 'group'),
        links: [...waCore, L('router', 'keys', { arrow: 'both' }), L('gw2', 'group', { arrow: 'both' })],
        flows: [
          F(['alice', 'gw1', 'router', 'inbox'], { kind: 'data' }),
          F(['router', 'gw2', 'group'], { kind: 'data', n: 4, delay: 1.4 }),
          F(['router', 'gw2', 'bob'], { kind: 'data', delay: 1.8 }),
        ],
        notes: [
          { at: [-6.5, -3.5], text: 'encrypt once, deliver 2k×', tone: 'warn' },
          { at: [-3.5, 3.5], text: 'member leaves → rotate', icon: KeyRound },
        ],
      },
      metrics: { msgs: '≈ 3M deliveries/s' },
      bad: ['msgs'],
    },
    {
      short: 'Media',
      title: 'Media as encrypted blobs',
      tag: 'Deep Dive',
      body: [
        'Alice’s phone generates a random **media key**, encrypts the photo, uploads the ciphertext to **object storage**, then sends Bob a tiny message: blob id, media key and hash. The key rides inside the E2E message, so storage only ever holds noise.',
        'Bob downloads from a nearby **CDN** edge, checks the hash and decrypts. Uploads are **resumable in chunks** for flaky networks, and blobs expire once fetched or after a few weeks. Forwarding a photo can reuse the same blob and key.',
      ],
      changes: [{ sign: '+', text: 'Blob storage + CDN' }],
      scene: {
        nodes: wa('alice', 'gw1', ['router', { meter: 50 }], 'gw2', 'bob', 'sessions', ['inbox', { meter: 25 }], 'keys', 'blob', 'cdn'),
        links: [...waCore, L('router', 'keys', { arrow: 'both' }), L('alice', 'blob', { label: 'upload' }), L('blob', 'cdn'), L('cdn', 'bob', { label: 'download' })],
        flows: [
          F(['alice', 'blob'], { kind: 'data', n: 2 }),
          F(['alice', 'gw1', 'router', 'gw2', 'bob'], { kind: 'data', delay: 1.2 }),
          F(['blob', 'cdn', 'bob'], { kind: 'data', delay: 2.6 }),
        ],
        notes: [
          { at: [-6.5, -3.5], text: 'msg = blob id + key + hash', icon: KeyRound },
          { at: [0, 6], text: '≈ 500 TB / day, encrypted', icon: Image },
        ],
      },
    },
    {
      short: 'Storms',
      title: 'Presence storms, reconnect waves',
      tag: 'Bottleneck',
      body: [
        'Naive presence sends every online/offline flip to every contact: 500M devices × ~200 contacts, flapping on bad networks, is billions of events. Instead send presence **only to people with that chat open**, **debounce** flips for ~10 s, and store last seen coarsely.',
        'The other storm is a gateway or carrier outage: 100k phones reconnect at once and drain their inboxes. Clients reconnect with **jittered backoff**, gateways admit at a capped rate, and drains page in batches so the router is not flattened.',
      ],
      callout: { kind: 'tip', text: 'Presence is a “nice to have”: when it fights with delivery for capacity, shed presence first.' },
      changes: [{ sign: '~', text: 'Presence: subscribe on chat open' }],
      scene: {
        nodes: wa('alice', ['gw1', { status: 'hot' }], ['router', { meter: 60 }], 'gw2', 'bob', ['sessions', { status: 'hot' }], ['inbox', { meter: 50 }]),
        links: [...waCore, L('gw1', 'sessions', { dashed: true })],
        flows: [
          F(['gw2', 'router', 'sessions'], { kind: 'event', n: 4 }),
          F(['alice', 'gw1'], { kind: 'handshake', n: 3, delay: 0.8 }),
          F(['router', 'inbox'], { kind: 'data', ret: true, retKind: 'data', delay: 1.6 }),
        ],
        notes: [
          { at: [-6.5, -3.5], text: 'presence → open chats only', icon: Eye, tone: 'good' },
          { at: [-6.5, 3.5], text: 'reconnect w/ jitter', icon: Clock, tone: 'warn' },
          { at: [3.5, -3.5], text: 'debounce flips ~10 s', icon: Timer },
        ],
      },
      metrics: { online: '500M (±100k)' },
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Stateless **gateways**; a **router** that keeps each message in a **per-device inbox** until acked, then deletes it; ticks as tiny receipts; per-device **E2E keys** with prekeys and a ratchet; **sender keys** for groups; media as **encrypted blobs** via a CDN; scoped, debounced presence.',
        'In an interview, stress the inversion: history lives on devices, the server is a relay, and “durable” means “until delivered”.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Hold each message per device only until it is acknowledged, relay only ciphertext, and make presence the first thing you shed.' },
      scene: {
        nodes: wa('alice', 'gw1', ['router', { meter: 50 }], 'gw2', 'bob', 'bobPc', 'sessions', ['inbox', { meter: 25 }], 'keys', 'blob', 'cdn', 'group'),
        links: [...waCore, L('router', 'keys', { arrow: 'both' }), L('gw2', 'bobPc', { arrow: 'both' }), L('alice', 'blob'), L('blob', 'cdn'), L('gw2', 'group', { arrow: 'both' })],
        flows: [
          F(['alice', 'gw1', 'router', 'inbox'], { kind: 'data', ret: true }),
          F(['router', 'gw2', 'bob'], { kind: 'data', delay: 1.2 }),
          F(['router', 'gw2', 'bobPc'], { kind: 'data', delay: 1.5 }),
          F(['alice', 'blob', 'cdn'], { kind: 'data', delay: 2.2 }),
        ],
      },
      metrics: { online: '500M', msgs: '600k /s', dwell: '< 1 s typical', sees: 'ciphertext only' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Q23 · Design Discord                                                */
/* ------------------------------------------------------------------ */

const dc = cast({
  you: { kind: 'device', at: [-7, 0], tag: 'you', tagIcon: User },
  sys: { kind: 'cube', at: [0, 0], label: 'Discord', sub: '?', icon: Server, tone: 'gray' },
  gw: { kind: 'cube', at: [-3.5, 0], label: 'Gateway', sub: 'session', icon: Plug, tone: 'green' },
  guild: { kind: 'cube', at: [0, 0], label: 'Guild', sub: 'shard 12', icon: Hash, tone: 'blue' },
  gw2: { kind: 'cube', at: [3.5, 0], label: 'Gateway', sub: 'sessions', icon: Plug, tone: 'green' },
  members: { kind: 'crowd', at: [7, 0], tag: 'online members', tagIcon: Users, items: 6 },
  api: { kind: 'cube', at: [-3.5, 3.5], label: 'API', sub: 'REST', icon: Server, tone: 'blue' },
  store: { kind: 'db', at: [0, 3.5], tag: 'messages', icon: Database },
  reads: { kind: 'db', at: [-7, 3.5], tag: 'read states', icon: CheckCheck },
  relay1: { kind: 'cube', at: [3.5, -3.5], label: 'Relay', icon: Share2, tone: 'blue', size: 'sm' },
  relay2: { kind: 'cube', at: [3.5, 3.5], label: 'Relay', icon: Share2, tone: 'blue', size: 'sm' },
  voice: { kind: 'slab', at: [-3.5, -3.5], tag: 'voice servers', icon: Mic, tone: 'teal' },
});

const dcCore = [
  L('you', 'gw', { arrow: 'both' }),
  L('gw', 'guild', { arrow: 'both' }),
  L('guild', 'gw2'),
  L('gw2', 'members'),
  L('you', 'api'),
  L('api', 'store', { arrow: 'both' }),
  L('api', 'guild'),
];

export const qDiscord: Question = {
  id: 'q-discord',
  n: 23,
  title: 'Design Discord',
  blurb: 'Guilds of a million members: sharded gateways, bucketed message storage, read states and lazy fan-out.',
  minutes: 16,
  level: 'Advanced',
  concepts: ['Messaging', 'WebSockets', 'Partitioning'],
  related: ['chat', 'pubsub', 'sharding', 'storage-engines', 'unique-ids'],
  followUps: [
    'How would you implement message search across a guild’s full history?',
    'How do permission changes on a role propagate to 100k connected sessions?',
    'How would you migrate the message store to a new cluster without downtime?',
    'What happens when the process owning a 1M-member guild crashes?',
  ],
  keywords: ['discord', 'guild', 'gateway', 'shard', 'presence', 'typing indicator', 'wide-column', 'time bucket', 'snowflake', 'read state', 'unread', 'member list'],
  metrics: [
    { id: 'events', label: 'Gateway events', icon: Radio },
    { id: 'msgs', label: 'Messages', icon: MessageSquare },
    { id: 'hist', label: 'History p99', icon: Timer },
    { id: 'guild', label: 'Guild CPU', icon: Gauge },
  ],
  learn: [
    { text: 'Why presence, not messages, dominates fan-out', at: 1 },
    { text: 'Guild processes sharded by guild_id', at: 4 },
    { text: 'Partitioning messages by (channel, time bucket)', at: 5 },
    { text: 'Unread state as a high-water mark', at: 6 },
    { text: 'Lazy member lists and relay fan-out', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Communities, channels, live presence',
      tag: 'Requirements',
      body: [
        'Functional: **guilds** (servers) with text channels, roles and permissions; real-time messages, **typing** and **presence**; unread badges and mentions; history kept forever. Voice channels exist but are a separate media system. Out of scope: search, video streaming, billing.',
        'Non-functional: ~20M concurrent users, guilds from 5 friends up to **1M members**, messages visible to online members in < 500 ms, fast scroll-back through years of history. Ordering per channel; brief staleness of presence is fine.',
      ],
      scene: {
        nodes: dc('you', 'sys', 'members'),
        links: [L('you', 'sys', { arrow: 'both' }), L('sys', 'members')],
        flows: [F(['you', 'sys', 'members'], { kind: 'data' }), F(['you', 'sys'], { kind: 'event', delay: 1.5 })],
        notes: [
          { at: [-3.5, -3.5], text: '20M concurrent users', icon: Plug },
          { at: [3.5, -3.5], text: 'guilds up to 1M members', icon: Users, tone: 'warn' },
          { at: [-3.5, 3.5], text: 'history kept forever', icon: Database },
          { at: [3.5, 3.5], text: 'voice: separate system', icon: Mic },
        ],
      },
      metrics: { events: '—', msgs: '—', hist: '—', guild: '—' },
    },
    {
      short: 'Numbers',
      title: 'Fan-out, not messages, is the load',
      tag: 'Estimation',
      body: [
        'Assume **1B messages/day** ≈ 12k/s, ~40k/s at peak; at ~1 KB each that is ~1 TB/day before replication. Readers dwarf writers: one message in a guild with **100k members online** becomes 100k deliveries.',
        'Presence is worse. If each of those 100k members changes status a few times an hour and every change goes to everyone, that is 100k × 100k × 3 / 3600 ≈ **250M events/s for one guild**. Fan-out of every event to every member is **O(n²)** — it has to go.',
      ],
      callout: { kind: 'key', text: 'In big communities the cost is people × people, not messages. Every design choice below exists to break that square.' },
      scene: {
        nodes: dc('you', ['sys', { meter: 95, status: 'hot' }], 'members'),
        links: [L('you', 'sys', { arrow: 'both' }), L('sys', 'members')],
        flows: [F(['sys', 'members'], { kind: 'event', n: 5 }), F(['you', 'sys'], { kind: 'data', delay: 0.6 })],
        notes: [
          { at: [-3.5, -3.5], text: '≈ 40k msgs/s peak', icon: MessageSquare },
          { at: [3.5, -3.5], text: '1 msg → 100k deliveries', icon: Users },
          { at: [0, 3.5], text: 'presence: n² ≈ 250M ev/s', tone: 'bad' },
        ],
      },
      metrics: { events: '250M /s (naive)', msgs: '40k /s' },
      bad: ['events'],
    },
    {
      short: 'API',
      title: 'Gateway events and REST',
      tag: 'API',
      body: [
        'Writes and history go over REST: `POST /channels/{id}/messages`, `GET /channels/{id}/messages?before={msg_id}&limit=50`. Live updates arrive on one **gateway WebSocket** as events: `READY`, `MESSAGE_CREATE`, `TYPING_START`, `PRESENCE_UPDATE`.',
        'IDs are **Snowflakes** — 64-bit, time-ordered, made without coordination — so “newer than” is an integer compare. Core tables: `messages(channel_id, bucket, message_id)`, `read_states(user_id, channel_id)`, `members(guild_id, user_id → roles)`.',
      ],
      scene: {
        nodes: dc('you', 'gw', 'api', 'store'),
        links: [L('you', 'gw', { arrow: 'both', label: 'gateway WS' }), L('you', 'api', { label: 'REST' }), L('api', 'store', { arrow: 'both' })],
        flows: [F(['you', 'api', 'store'], { kind: 'request', ret: true, retKind: 'data' }), F(['gw', 'you'], { kind: 'event', n: 2, delay: 1.2 })],
        notes: [
          { at: [2.5, -2.5], text: 'MESSAGE_CREATE events', icon: Radio },
          { at: [3.5, 6], text: 'id = time | worker | seq', icon: Hash },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Gateways, guild processes, storage',
      tag: 'Design',
      body: [
        'Clients hold a **gateway** socket. A message goes `POST` → **API** → message store, then the API hands it to the **guild process** that owns the guild. That process keeps the guild’s state in memory — channels, roles, who is online — and fans events out to the gateways holding members’ sessions.',
        '**Voice** never touches this path: the gateway only tells the client which nearby **voice server** to use, and audio flows there over UDP.',
      ],
      changes: [{ sign: '+', text: 'Gateway sessions' }, { sign: '+', text: 'Guild process' }, { sign: '+', text: 'API + message store' }, { sign: '+', text: 'Voice servers' }],
      scene: {
        nodes: dc('you', 'gw', ['guild', { meter: 40 }], 'gw2', 'members', 'api', 'store', 'voice'),
        links: [...dcCore, L('you', 'voice', { dashed: true, label: 'UDP audio' })],
        flows: [
          F(['you', 'api', 'store'], { kind: 'data', ret: true }),
          F(['api', 'guild', 'gw2', 'members'], { kind: 'event', delay: 1.4 }),
          F(['you', 'voice'], { kind: 'data', delay: 2.4 }),
        ],
      },
      metrics: { guild: '40%' },
    },
    {
      short: 'Shards',
      title: 'Each guild lives on one shard',
      tag: 'Deep Dive',
      body: [
        'Guilds are split across **shards** by `hash(guild_id) % N`; each shard owns its guilds and is the **single writer** of their live state, so ordering and permission checks need no locks. A service registry maps guild → shard; rebalancing moves whole guilds.',
        'On connect, your gateway session subscribes to the shards for every guild you belong to and receives one `READY` snapshot. If a gateway drops, the client **resumes** with its session id and last event seq, so only missed events are replayed — not the whole snapshot.',
      ],
      callout: { kind: 'tip', text: 'Bots do the same in reverse: they open several gateway connections and each gets the guilds where (guild_id >> 22) % shards == its id.' },
      scene: {
        nodes: dc('you', ['gw', { sub: 'session' }], ['guild', { meter: 40 }], 'gw2', 'members', 'api', 'store'),
        links: dcCore,
        flows: [
          F(['you', 'gw', 'guild'], { kind: 'handshake', ret: true, retKind: 'data' }),
          F(['guild', 'gw2', 'members'], { kind: 'event', n: 2, delay: 1.6 }),
        ],
        notes: [
          { at: [-6.5, -3.5], text: 'guild 81… → shard 12', icon: Hash },
          { at: [3.5, -3.5], text: 'resume: session + seq', icon: ListOrdered, tone: 'good' },
        ],
      },
      metrics: { events: '1 owner / guild' },
    },
    {
      short: 'Storage',
      title: 'Messages by (channel, time bucket)',
      tag: 'Deep Dive',
      body: [
        'Almost every read is “the newest 50 in this channel” or “50 before X”. A **wide-column store** with partition key `(channel_id, bucket)` and clustering key `message_id DESC` serves both as one sequential read. The **bucket** is ~10 days of time, derived from the Snowflake.',
        'Why bucket? Partitioning by channel alone lets a busy channel grow one partition forever, hurting compaction and repairs. Partitioning by message id scatters every page across nodes. Buckets keep partitions bounded; append-heavy writes suit an **LSM** engine.',
      ],
      callout: { kind: 'warn', text: 'Quiet channels may need to walk many empty buckets to fill a page — store each channel’s last-message id to know where to start and stop.' },
      scene: {
        nodes: dc('you', 'gw', ['guild', { meter: 40 }], 'gw2', 'members', 'api', ['store', { meter: 35 }]),
        links: dcCore,
        flows: [F(['you', 'api', 'store'], { kind: 'request', ret: true, retKind: 'data', n: 2 })],
        notes: [
          { at: [-7, 6], text: 'pk (channel_id, bucket)', icon: Layers },
          { at: [3.5, 6], text: 'ck message_id DESC', icon: ListOrdered },
        ],
      },
      metrics: { msgs: '≈ 1 TB / day', hist: '40 ms' },
      hi: ['hist'],
    },
    {
      short: 'Unreads',
      title: 'Read states, not read flags',
      tag: 'Deep Dive',
      body: [
        'Per user per channel store one row: `last_read_message_id` and `mention_count`. A channel is unread when its latest message id is greater than your last-read id — an **integer compare**, no counting. Only @mentions are counted, and the count resets when you read.',
        'Acks are frequent (every channel you glance at), so clients **debounce** them and the service batches writes; a user with 200 guilds × 50 channels holds ~10k small rows, loaded once at connect.',
      ],
      changes: [{ sign: '+', text: 'Read-state store' }],
      scene: {
        nodes: dc('you', 'gw', ['guild', { meter: 40 }], 'gw2', 'members', 'api', ['store', { meter: 35 }], 'reads'),
        links: [...dcCore, L('api', 'reads', { arrow: 'both', label: 'ack' })],
        flows: [
          F(['you', 'api', 'reads'], { kind: 'data', ret: true }),
          F(['api', 'guild', 'gw2', 'members'], { kind: 'event', delay: 1.6 }),
        ],
        notes: [
          { at: [-6.5, -3.5], text: 'unread = last > last_read', icon: CheckCheck, tone: 'good' },
          { at: [-3.5, 6.5], text: 'acks debounced + batched', icon: Timer },
        ],
      },
    },
    {
      short: 'Huge guild',
      title: 'Breaking the n² in a 1M guild',
      tag: 'Deep Dive',
      body: [
        '**Lazy member lists**: big guilds don’t ship members at connect; the client subscribes to the rows it can see (say 0–99) and gets insert/update/delete ops for that window only. **Typing** goes only to sessions viewing that channel; presence only to visible list rows and friends.',
        'One guild process still fans messages to 100k sessions, so it hands batches to **relays**, each owning a slice of sessions and filtering by permission. Fan-out spreads across cores and machines; the guild stays the single ordered source.',
      ],
      callout: { kind: 'key', text: 'Send each client only what is on its screen. Visibility, not membership, decides who gets an event.' },
      changes: [{ sign: '+', text: 'Relays' }, { sign: '~', text: 'Member list by visible range' }],
      scene: {
        nodes: dc('you', 'gw', ['guild', { meter: 65, status: 'hot' }], 'gw2', ['members', { items: 7 }], 'api', 'store', 'reads', ['relay1', { meter: 60 }], ['relay2', { meter: 60 }]),
        links: [...dcCore, L('api', 'reads'), L('guild', 'relay1'), L('guild', 'relay2'), L('relay1', 'members'), L('relay2', 'members')],
        flows: [
          F(['api', 'guild', 'relay1', 'members'], { kind: 'event', n: 2 }),
          F(['guild', 'relay2', 'members'], { kind: 'event', n: 2, delay: 0.5 }),
          F(['you', 'gw', 'guild'], { kind: 'request', ret: true, retKind: 'data', delay: 1.6 }),
        ],
        notes: [
          { at: [-6.5, -3.5], text: 'subscribe rows 0–99', icon: Eye, tone: 'good' },
          { at: [0, -5], text: 'typing → viewers only', icon: MessageSquare },
        ],
      },
      metrics: { events: '≈ 2M /s', guild: '65%' },
      hi: ['events'],
    },
    {
      short: 'Hot spots',
      title: 'Announcements and restarts',
      tag: 'Bottleneck',
      body: [
        'An @everyone in a 1M guild makes ~100k clients fetch the same newest page at once — a **hot partition**. Put a data service in front of the store that **coalesces identical in-flight reads** into one query, plus a short cache for the newest page.',
        'Deploying gateways drops millions of sockets. Drain gradually, have clients **resume** rather than re-identify, and rate-limit identifies per shard with jittered backoff. If a guild process dies, a new owner rebuilds state from storage while clients see a brief “unavailable”.',
      ],
      scene: {
        nodes: dc('you', ['gw', { status: 'hot' }], ['guild', { meter: 60 }], 'gw2', 'members', ['api', { status: 'hot' }], ['store', { meter: 45 }], 'reads', 'relay1', 'relay2'),
        links: [...dcCore, L('api', 'reads'), L('guild', 'relay1'), L('guild', 'relay2'), L('relay1', 'members'), L('relay2', 'members')],
        flows: [
          F(['you', 'api'], { kind: 'request', n: 4 }),
          F(['api', 'store'], { kind: 'request', ret: true, retKind: 'data', delay: 1 }),
          F(['you', 'gw'], { kind: 'handshake', ret: true, retKind: 'handshake', delay: 1.8 }),
        ],
        notes: [
          { at: [-6.5, -3.5], text: '100k same reads → 1 query', icon: Copy, tone: 'good' },
          { at: [3.5, 6], text: 'resume, don’t re-identify', icon: Plug, tone: 'warn' },
        ],
      },
      metrics: { hist: '60 ms' },
      bad: ['hist'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Gateways hold sockets; each guild lives on **one shard** that orders its events; messages sit in a wide-column store keyed by **(channel_id, time bucket)**; **read states** are high-water marks; big guilds get **lazy member lists**, viewer-only typing and **relays**; voice runs apart.',
        'In an interview, lead with the n² estimate — it justifies every later choice.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Partition by the thing users read together, give each guild one owner, and deliver only what is on screen.' },
      scene: {
        nodes: dc('you', 'gw', ['guild', { meter: 50 }], 'gw2', 'members', 'api', ['store', { meter: 35 }], 'reads', 'relay1', 'relay2', 'voice'),
        links: [...dcCore, L('api', 'reads'), L('guild', 'relay1'), L('guild', 'relay2'), L('relay1', 'members'), L('relay2', 'members'), L('you', 'voice', { dashed: true })],
        flows: [
          F(['you', 'api', 'store'], { kind: 'data', ret: true }),
          F(['api', 'guild', 'relay1', 'members'], { kind: 'event', delay: 1.2 }),
          F(['guild', 'relay2', 'members'], { kind: 'event', delay: 1.5 }),
        ],
      },
      metrics: { events: '≈ 2M /s', msgs: '40k /s', hist: '40 ms', guild: '50%' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Q34 · Design a Global Notification Platform                         */
/* ------------------------------------------------------------------ */

const gn = cast({
  prod: { kind: 'cube', at: [-7, 0], label: 'Services', sub: 'producers', icon: Server, tone: 'blue' },
  sys: { kind: 'cube', at: [0, 0], label: 'Notify', sub: 'platform', icon: BellRing, tone: 'gray' },
  phones: { kind: 'crowd', at: [7, 4], tag: '200M devices', tagIcon: Smartphone, items: 7 },
  ingress: { kind: 'cube', at: [-3.5, 0], label: 'Ingress', sub: 'nearest', icon: Globe, tone: 'green' },
  home: { kind: 'cube', at: [-3.5, -4], label: 'Home', sub: 'user→region', icon: MapPin, tone: 'yellow' },
  remote: { kind: 'cube', at: [-7, -3.5], label: 'EU', sub: 'region', icon: Earth, tone: 'gray' },
  expander: { kind: 'cube', at: [0, 0], label: 'Expander', sub: 'segments', icon: Layers, tone: 'blue' },
  qHi: { kind: 'queue', at: [0, -3.5], tag: 'P0 · OTP lane', items: 2 },
  qLo: { kind: 'queue', at: [0, 3.5], tag: 'P2 · bulk lane', items: 6 },
  segdb: { kind: 'db', at: [-3.5, 3.5], tag: 'users · tz', icon: Database },
  senders: { kind: 'cube', at: [3.5, 0], label: 'Senders', sub: 'workers', icon: Send, tone: 'blue' },
  quota: { kind: 'cube', at: [3.5, -4], label: 'Quota', sub: 'tokens', icon: Gauge, tone: 'yellow' },
  dedupe: { kind: 'cube', at: [3.5, 4], label: 'Dedupe', sub: 'TTL keys', icon: Copy, tone: 'orange' },
  providers: { kind: 'slab', at: [7, 0], tag: 'APNs · FCM · SMS', icon: Send, tone: 'sand' },
  track: { kind: 'slab', at: [7, -4], tag: 'tracking', icon: BarChart3, tone: 'violet' },
});

const gnCore = [
  L('prod', 'ingress'),
  L('ingress', 'home', { arrow: 'both' }),
  L('ingress', 'qHi'),
  L('qHi', 'senders'),
  L('senders', 'providers'),
  L('providers', 'phones'),
];

const gnBulk = [L('ingress', 'expander'), L('expander', 'segdb', { arrow: 'both' }), L('expander', 'qLo'), L('qLo', 'senders')];

export const qGlobalNotifications: Question = {
  id: 'q-global-notifications',
  n: 34,
  title: 'Design a Global Notification Platform',
  blurb: 'Broadcast to 200M devices across regions without delaying OTPs, breaking quotas or sending twice.',
  minutes: 16,
  level: 'Advanced',
  concepts: ['Fan-out', 'Queues', 'Multi-region'],
  related: ['message-queues', 'rate-limiting', 'timeouts-retries', 'batch-stream', 'redundancy'],
  followUps: [
    'How would you cancel a broadcast that is already 40% sent?',
    'How do you A/B test notification copy without double-sending to anyone?',
    'How would you comply with data residency if a user moves countries?',
    'How do you stop one misbehaving team from exhausting the shared FCM quota?',
  ],
  keywords: ['notifications', 'push', 'apns', 'fcm', 'sms', 'broadcast', 'fan-out', 'priority queue', 'rate limit', 'quota', 'multi-region', 'dedupe', 'quiet hours', 'time zones'],
  metrics: [
    { id: 'rate', label: 'Sends', icon: Send },
    { id: 'otp', label: 'OTP p99', icon: Timer },
    { id: 'bcast', label: 'Broadcast time', icon: Megaphone },
    { id: 'dup', label: 'Duplicates', icon: Copy },
  ],
  learn: [
    { text: 'Home-region routing near users', at: 3 },
    { text: 'Broadcast fan-out via segment expansion', at: 4 },
    { text: 'Priority lanes that protect OTPs', at: 5 },
    { text: 'Living within provider quotas', at: 6 },
    { text: 'Dedupe keys across retries and regions', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Every user, every region, once',
      tag: 'Requirements',
      body: [
        'Functional: any internal service can send **transactional** notifications (OTP codes, security alerts, order updates) and **campaigns** to segments up to all **200M users**, over push (APNs/FCM), SMS and email, honouring preferences, **quiet hours** and local time.',
        'Non-functional: OTP p99 < 5 s anywhere; a 200M broadcast done within ~1 hour; **at most one** copy per user per notification; keep user data in its home region; survive a region loss. Basics — templates, per-channel workers, simple retries — are assumed.',
      ],
      callout: { kind: 'key', text: 'Two workloads share one pipe: a trickle of urgent messages and floods of bulk ones. The design is about keeping them apart.' },
      scene: {
        nodes: gn('prod', ['sys', { meter: 20 }], 'phones'),
        links: [L('prod', 'sys'), L('sys', 'phones', { elbow: false })],
        flows: [F(['prod', 'sys', 'phones'], { kind: 'event' }), F(['prod', 'sys'], { kind: 'request', n: 3, delay: 1.2 })],
        notes: [
          { at: [-3.5, -3.5], text: 'OTP p99 < 5 s', icon: ShieldCheck },
          { at: [3.5, -3.5], text: '200M broadcast < 1 h', icon: Megaphone },
          { at: [-3.5, 3.5], text: 'at most once per user', icon: Copy, tone: 'warn' },
          { at: [-6.5, -3.5], text: 'data stays in home region', icon: MapPin },
        ],
      },
      metrics: { rate: '—', otp: '< 5 s target', bcast: '< 1 h target', dup: '0 target' },
    },
    {
      short: 'Numbers',
      title: 'Trickle versus flood',
      tag: 'Estimation',
      body: [
        'Transactional: ~50M/day ≈ 600/s, ~5k/s at peak — small but latency-critical. A 200M broadcast in 1 hour needs **~55k sends/s** sustained, ~100× the transactional rate, and each send yields ~3 tracking events (sent, delivered, opened) → **~170k events/s**.',
        'Assume provider quotas we can actually use: push ~60k/s combined, SMS ~2k/s spread over local carriers. Dedupe keys: 200M × ~40 B ≈ **8 GB per campaign**, kept a few days. Segment data: 200M users × device tokens, tz, prefs ≈ a few hundred GB.',
      ],
      scene: {
        nodes: gn('prod', ['sys', { meter: 85, status: 'hot' }], 'phones'),
        links: [L('prod', 'sys'), L('sys', 'phones', { elbow: false })],
        flows: [F(['sys', 'phones'], { kind: 'event', n: 5 }), F(['prod', 'sys'], { kind: 'request', delay: 0.5 })],
        notes: [
          { at: [-3.5, -3.5], text: 'OTP ≈ 5k/s peak', icon: ShieldCheck },
          { at: [3.5, -3.5], text: 'broadcast ≈ 55k/s · 1 h', icon: Megaphone, tone: 'warn' },
          { at: [-3.5, 3.5], text: 'tracking ≈ 170k ev/s', icon: Activity },
          { at: [-6.5, -3.5], text: 'dedupe ≈ 8 GB / campaign', icon: Copy },
        ],
      },
      metrics: { rate: '55k /s peak' },
    },
    {
      short: 'API',
      title: 'Two entry points, one key',
      tag: 'API',
      body: [
        '`POST /v1/notify {user_id, template, priority, idempotency_key}` for transactional sends. `POST /v1/campaigns {segment, template, send_at, local_time: true}` returns a campaign id; the platform does the fan-out. Priority is declared by the caller and audited — not everything gets P0.',
        'Data: `users(user_id → home_region, tz, devices[], prefs)` lives in the home region; `campaigns(id, segment, state, cursor)`; `sent(dedupe_key) → ts` with a TTL. The dedupe key is `campaign_id:user_id` or the caller’s idempotency key.',
      ],
      scene: {
        nodes: gn('prod', ['ingress', { sub: 'API' }], 'home', 'segdb', 'expander'),
        links: [L('prod', 'ingress', { label: 'POST /notify' }), L('ingress', 'home', { arrow: 'both' }), L('ingress', 'expander', { label: 'campaign' }), L('expander', 'segdb', { arrow: 'both' })],
        flows: [F(['prod', 'ingress', 'home'], { kind: 'request', ret: true, retKind: 'data' }), F(['ingress', 'expander', 'segdb'], { kind: 'request', delay: 1.4 })],
        notes: [
          { at: [3.5, -3.5], text: 'key = campaign : user', icon: Copy },
          { at: [3.5, 3.5], text: 'priority: P0 · P1 · P2', icon: ListOrdered },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Regional stacks, home routing',
      tag: 'Design',
      body: [
        'Every region runs a full stack. Producers call the **nearest ingress**, which looks up the user’s **home region** in a small replicated directory and forwards there if needed; the home region owns that user’s prefs, devices and dedupe keys, so nothing needs cross-region coordination.',
        'Inside a region, requests land in **priority lanes**, **sender** workers check preferences, dedupe and quotas, call the provider, and emit results to **tracking**. Campaigns go through an **expander** instead of the API.',
      ],
      changes: [{ sign: '+', text: 'Ingress + home directory' }, { sign: '+', text: 'Lanes, senders, providers' }, { sign: '+', text: 'Tracking stream' }],
      scene: {
        nodes: gn('prod', 'ingress', 'home', 'remote', 'qHi', ['senders', { meter: 30 }], 'providers', 'phones', 'track'),
        links: [...gnCore, L('ingress', 'remote', { dashed: true, label: 'home = EU' }), L('providers', 'track')],
        flows: [
          F(['prod', 'ingress', 'home'], { kind: 'request', ret: true, retKind: 'data' }),
          F(['ingress', 'qHi', 'senders', 'providers', 'phones'], { kind: 'event', delay: 1.2 }),
          F(['ingress', 'remote'], { kind: 'request', delay: 2 }),
          F(['providers', 'track'], { kind: 'data', delay: 2.8 }),
        ],
      },
      metrics: { otp: '≈ 2 s' },
      hi: ['otp'],
    },
    {
      short: 'Broadcast',
      title: 'Fan-out by segment expansion',
      tag: 'Deep Dive',
      body: [
        'Nobody enqueues 200M messages in one request. The **expander** walks the segment in chunks of ~1,000 users, ordered by user id, writing one **batch job** per chunk to the bulk lane and **checkpointing its cursor** — a crash resumes from the last chunk; pausing just stops the cursor.',
        'For “9 am local time”, expand by **time-zone wave**: users are grouped by UTC offset and each wave starts when its clock hits 9. Pacing spreads a wave over minutes so providers and our own app servers — hit by the opens — are not stampeded.',
      ],
      callout: { kind: 'tip', text: 'Expand lazily, close to send time: prefs, tokens and unsubscribes then reflect the moment of sending, not the moment of scheduling.' },
      changes: [{ sign: '+', text: 'Segment expander' }, { sign: '+', text: 'Bulk lane' }],
      scene: {
        nodes: gn('prod', 'ingress', 'home', 'qHi', ['expander', { status: 'hot' }], ['qLo', { items: 7 }], 'segdb', ['senders', { meter: 70 }], 'providers', 'phones', 'track'),
        links: [...gnCore, ...gnBulk, L('providers', 'track')],
        flows: [
          F(['expander', 'segdb'], { kind: 'request', ret: true, retKind: 'data' }),
          F(['expander', 'qLo', 'senders', 'providers', 'phones'], { kind: 'event', n: 4, delay: 1 }),
        ],
        notes: [
          { at: [-6.5, 3.5], text: 'chunks of 1,000 + cursor', icon: Layers },
          { at: [3.5, 6.3], text: 'tz waves: 9 am local', icon: Clock },
        ],
      },
      metrics: { rate: '55k /s', bcast: '≈ 1 h, paced' },
      hi: ['bcast'],
    },
    {
      short: 'Lanes',
      title: 'OTPs never wait behind marketing',
      tag: 'Deep Dive',
      body: [
        'One queue would put an OTP behind 50M campaign messages. Use **separate lanes** — P0 (OTP, security), P1 (transactional), P2 (bulk) — with **reserved workers and quota** per lane, so a P2 flood only uses P2’s share. P0 messages carry a short TTL: an OTP older than ~5 minutes is dropped.',
        '**Quiet hours** belong here too: P1 and P2 messages for a user whose local time is 22:00–08:00 are parked in a delay queue; P0 always bypasses them.',
      ],
      callout: { kind: 'warn', text: 'Priority only works if it is enforced at every shared resource — workers, quota, provider connections — not just the queue order.' },
      scene: {
        nodes: gn('prod', 'ingress', 'home', ['qHi', { items: 1 }], 'expander', ['qLo', { items: 7 }], 'segdb', ['senders', { meter: 75 }], 'providers', 'phones'),
        links: [...gnCore, ...gnBulk],
        flows: [
          F(['prod', 'ingress', 'qHi', 'senders', 'providers', 'phones'], { kind: 'request', speed: 1.6 }),
          F(['qLo', 'senders'], { kind: 'event', n: 4, delay: 0.4 }),
        ],
        notes: [
          { at: [3.5, -6.3], text: 'P0 pool: 20% reserved', icon: ShieldCheck, tone: 'good' },
          { at: [-6.5, 3.5], text: 'quiet hours: P1/P2 wait', icon: Moon },
        ],
      },
      metrics: { otp: '≈ 2 s (under flood)' },
      hi: ['otp'],
    },
    {
      short: 'Quotas',
      title: 'Living inside provider limits',
      tag: 'Deep Dive',
      body: [
        'Providers throttle: push services push back with 429s and `Retry-After`, SMS carriers allow a fixed throughput per sender number and country. A **quota service** holds token buckets per provider, per app and per country; senders take tokens in batches before calling out.',
        'Global limits are **split across regions** by recent demand, so most sends check a local bucket. On a 429, slow the whole bucket (not just one worker) and retry with backoff; for OTP SMS keep a **second provider** to fail over to.',
      ],
      changes: [{ sign: '+', text: 'Quota service (token buckets)' }],
      scene: {
        nodes: gn('prod', 'ingress', 'home', 'qHi', 'expander', 'qLo', 'segdb', ['senders', { meter: 70 }], ['quota', { meter: 85, status: 'hot' }], ['providers', { status: 'hot' }], 'phones'),
        links: [...gnCore, ...gnBulk, L('senders', 'quota', { arrow: 'both' })],
        flows: [
          F(['senders', 'quota'], { kind: 'request', ret: true, retKind: 'data' }),
          F(['senders', 'providers'], { kind: 'request', ret: true, retKind: 'error', delay: 1.2 }),
          F(['qLo', 'senders', 'providers', 'phones'], { kind: 'event', delay: 2.4 }),
        ],
        notes: [
          { at: [7, -6.3], text: '429 → slow whole bucket', icon: Ban, tone: 'bad' },
          { at: [-5.5, -6.3], text: 'per provider · app · country', icon: Gauge },
        ],
      },
      metrics: { rate: '≤ 60k /s (quota)' },
    },
    {
      short: 'Dedupe',
      title: 'Once, across retries and regions',
      tag: 'Deep Dive',
      body: [
        'Retries happen everywhere: a producer times out, a worker crashes after calling the provider, a region fails over. Before sending, the worker does an atomic **set-if-absent** of the dedupe key in its region’s store with a TTL; if the key exists, it skips.',
        'Because each user belongs to one **home region**, their keys live in one place — no cross-region consensus. The gap between “provider accepted” and “key written” still allows rare duplicates, so also set provider **collapse ids** so devices merge repeats.',
      ],
      changes: [{ sign: '+', text: 'Dedupe store' }],
      scene: {
        nodes: gn('prod', 'ingress', 'home', 'qHi', 'expander', 'qLo', 'segdb', ['senders', { meter: 65 }], 'quota', 'dedupe', 'providers', 'phones'),
        links: [...gnCore, ...gnBulk, L('senders', 'quota'), L('senders', 'dedupe', { arrow: 'both', label: 'SETNX' })],
        flows: [
          F(['qLo', 'senders', 'dedupe'], { kind: 'request', ret: true, retKind: 'data' }),
          F(['senders', 'providers', 'phones'], { kind: 'event', delay: 1.4 }),
          F(['qLo', 'senders', 'dedupe'], { kind: 'request', ret: true, retKind: 'error', delay: 2.6 }),
        ],
        notes: [{ at: [7, -3.5], text: 'key exists → skip', icon: Copy, tone: 'good' }],
      },
      metrics: { dup: '≈ 0 (collapse ids)' },
      hi: ['dup'],
    },
    {
      short: 'Failure',
      title: 'Region loss and the tracking flood',
      tag: 'Bottleneck',
      body: [
        'If the EU region dies, ingress marks it down and **P0 traffic for EU users fails over** to a neighbour using an async replica of their device tokens and prefs — seconds stale, acceptable for an OTP. P2 campaigns simply pause at their cursor and resume when the region returns.',
        'Tracking is the other flood: ~170k events/s must not write rows into an OLTP database. Stream them, **aggregate per campaign** in near-real-time counters, and archive raw events to cheap storage for later analysis.',
      ],
      callout: { kind: 'tip', text: 'Decide failover per priority: urgent traffic moves regions, bulk traffic waits. Moving everything doubles the blast radius.' },
      scene: {
        nodes: gn('prod', ['ingress', { meter: 70 }], 'home', ['remote', { status: 'down' }], 'qHi', 'expander', ['qLo', { status: 'dim' }], 'segdb', ['senders', { meter: 60 }], 'quota', 'dedupe', 'providers', 'phones', ['track', { meter: 80 }]),
        links: [...gnCore, ...gnBulk, L('senders', 'quota'), L('senders', 'dedupe'), L('ingress', 'remote', { tone: 'bad', dashed: true }), L('providers', 'track')],
        flows: [
          F(['ingress', 'remote'], { kind: 'request', stop: true }),
          F(['prod', 'ingress', 'qHi', 'senders', 'providers', 'phones'], { kind: 'request', delay: 1 }),
          F(['providers', 'track'], { kind: 'data', n: 4, delay: 1.6 }),
        ],
        notes: [
          { at: [-6.5, 3.5], text: 'P2 paused at cursor', icon: Hourglass, tone: 'warn' },
          { at: [3.5, -6.3], text: 'aggregate, don’t insert', icon: BarChart3 },
        ],
      },
      metrics: { otp: '≈ 3 s (failover)' },
      bad: ['otp'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Nearest **ingress** with **home-region routing**; campaigns expanded into paced, checkpointed **batch jobs** in time-zone waves; **priority lanes** with reserved capacity for OTPs; **token-bucket quotas** per provider; **dedupe keys** owned by the home region; tracking aggregated.',
        'In an interview, separate urgent from bulk early and defend that split at every shared resource.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Isolate urgent from bulk end to end, expand broadcasts lazily in checkpointed batches, and let each user’s home region own their dedupe.' },
      scene: {
        nodes: gn('prod', 'ingress', 'home', 'remote', 'qHi', 'expander', 'qLo', 'segdb', ['senders', { meter: 60 }], 'quota', 'dedupe', 'providers', 'phones', 'track'),
        links: [...gnCore, ...gnBulk, L('senders', 'quota'), L('senders', 'dedupe'), L('ingress', 'remote', { dashed: true }), L('providers', 'track')],
        flows: [
          F(['prod', 'ingress', 'qHi', 'senders', 'providers', 'phones'], { kind: 'request' }),
          F(['expander', 'qLo', 'senders'], { kind: 'event', n: 3, delay: 1 }),
          F(['providers', 'track'], { kind: 'data', delay: 2 }),
        ],
      },
      metrics: { rate: '55k /s', otp: '≈ 2 s', bcast: '≈ 1 h', dup: '≈ 0' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Q39 · Design an AI Chat Platform                                    */
/* ------------------------------------------------------------------ */

const ai = cast({
  you: { kind: 'device', at: [-7, 0], tag: 'you', tagIcon: User },
  sys: { kind: 'cube', at: [0, 0], label: 'Backend', sub: '?', icon: Server, tone: 'gray' },
  gw: { kind: 'cube', at: [-3.5, 0], label: 'Gateway', sub: 'SSE · auth', icon: Plug, tone: 'green' },
  chat: { kind: 'cube', at: [0, 0], label: 'Chat', sub: 'context', icon: MessageSquare, tone: 'blue' },
  quota: { kind: 'cube', at: [-3.5, -4], label: 'Quota', sub: 'per user', icon: Gauge, tone: 'yellow' },
  hist: { kind: 'db', at: [0, 4], tag: 'conversations', icon: Database },
  qL: { kind: 'queue', at: [3.5, -3.5], tag: 'large-model queue', items: 4 },
  qS: { kind: 'queue', at: [3.5, 3.5], tag: 'small-model queue', items: 2 },
  gpuL: { kind: 'cube', at: [7, -3.5], label: 'GPU pool', sub: 'large', icon: Cpu, tone: 'sand' },
  gpuS: { kind: 'cube', at: [7, 3.5], label: 'GPU pool', sub: 'small', icon: Cpu, tone: 'sand' },
});

const aiCore = [
  L('you', 'gw', { arrow: 'both' }),
  L('gw', 'chat', { arrow: 'both' }),
  L('chat', 'hist', { arrow: 'both' }),
  L('chat', 'qL'),
  L('qL', 'gpuL'),
  L('gpuL', 'chat', { dashed: true, label: 'tokens', first: 'v' }),
];

export const qAiChat: Question = {
  id: 'q-ai-chat',
  n: 39,
  title: 'Design an AI Chat Platform',
  blurb: 'A ChatGPT-like product: stream tokens, schedule scarce GPUs, cache context and degrade gracefully.',
  minutes: 16,
  level: 'Advanced',
  concepts: ['Streaming', 'Inference', 'Queues'],
  related: ['realtime', 'message-queues', 'rate-limiting', 'caching', 'load-balancing'],
  followUps: [
    'How would you let a user resume a stream after their browser tab reloads?',
    'How would you add tool calls (web search, code execution) mid-generation?',
    'How do you roll out a new model version without hurting latency or cache hit rate?',
    'How would you bill per token fairly when a user cancels halfway?',
  ],
  keywords: ['llm', 'chatgpt', 'ai chat', 'token streaming', 'sse', 'gpu', 'inference', 'continuous batching', 'kv cache', 'prompt caching', 'model routing', 'admission control'],
  metrics: [
    { id: 'ttft', label: 'First token', icon: Timer },
    { id: 'gpu', label: 'GPU utilisation', icon: Cpu },
    { id: 'wait', label: 'Queue wait', icon: Hourglass },
    { id: 'streams', label: 'Live streams', icon: Activity },
  ],
  learn: [
    { text: 'Token streaming over SSE, with cancellation', at: 4 },
    { text: 'Continuous batching on GPU workers', at: 5 },
    { text: 'Admission control and per-user quotas', at: 6 },
    { text: 'Context assembly and prefix caching', at: 7 },
    { text: 'Model routing and graceful degradation', at: 8 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Chat with a model, live',
      tag: 'Requirements',
      body: [
        'Functional: users send a message and watch the reply **stream in token by token**; conversations persist and can be continued; a **Stop** button; a choice of fast and smart models. Out of scope: training, file uploads, tool use, image generation.',
        'Non-functional: ~20M daily users; **time to first token** under ~1 s at p50; at least ~20 tokens/s per stream; 99.9% availability. GPUs are the scarce, expensive resource — the design must keep them busy without letting queues grow unbounded.',
      ],
      callout: { kind: 'key', text: 'Unlike most web apps, the bottleneck is not the database or the network — it is a fixed pool of GPUs.' },
      scene: {
        nodes: ai('you', ['sys', { meter: 30 }]),
        links: [L('you', 'sys', { arrow: 'both' })],
        flows: [F(['you', 'sys'], { kind: 'request' }), F(['sys', 'you'], { kind: 'data', n: 5, delay: 0.8, speed: 1.4 })],
        notes: [
          { at: [-3.5, -3.5], text: 'first token < 1 s', icon: Timer },
          { at: [3.5, -3.5], text: '≥ 20 tokens / s / user', icon: Zap },
          { at: [3.5, 3.5], text: 'GPUs = the scarce resource', icon: Cpu, tone: 'warn' },
          { at: [-3.5, 3.5], text: 'Stop button', icon: OctagonX },
        ],
      },
      metrics: { ttft: '< 1 s target', gpu: '—', wait: '—', streams: '—' },
    },
    {
      short: 'Numbers',
      title: 'Tokens per second, GPUs needed',
      tag: 'Estimation',
      body: [
        '20M users × 15 messages ≈ 300M requests/day ≈ 3.5k/s, **~10k/s at peak**. Each reply averages ~400 output tokens over a ~2k-token prompt (history included), so peak generation is **~4M tokens/s**. A reply streams for ~20 s, so ~200k streams are open at once.',
        'If one large-model replica produces ~2,500 tokens/s with batching (an assumption — it varies a lot by model and hardware), peak needs **~1,600 replicas**. Text storage is minor: 300M messages × ~2 KB ≈ 600 GB/day.',
      ],
      scene: {
        nodes: ai('you', ['sys', { meter: 90, status: 'hot' }]),
        links: [L('you', 'sys', { arrow: 'both' })],
        flows: [F(['you', 'sys'], { kind: 'request', n: 3 }), F(['sys', 'you'], { kind: 'data', n: 4, delay: 1 })],
        notes: [
          { at: [-3.5, -3.5], text: '≈ 10k requests/s peak', icon: Send },
          { at: [3.5, -3.5], text: '≈ 4M output tokens/s', icon: Zap },
          { at: [3.5, 3.5], text: '≈ 1,600 GPU replicas', icon: Cpu, tone: 'warn' },
          { at: [-3.5, 3.5], text: '≈ 200k open streams', icon: Activity },
        ],
      },
      metrics: { streams: '200k', gpu: '~1,600 replicas' },
    },
    {
      short: 'API',
      title: 'A streamed response',
      tag: 'API',
      body: [
        '`POST /conversations/{id}/messages {content, model}` answers with `Content-Type: text/event-stream`: a series of `data: {"delta": "…"}` events, then a final event with usage and `message_id`. `POST /generations/{id}/cancel` stops it. Push is one-way, so **SSE** beats WebSockets here.',
        'Data: `conversations(conv_id, user_id, title, model)`, `messages(conv_id, seq, role, content, tokens)` partitioned by `conv_id`; `usage(user_id, day) → tokens` for quotas and billing.',
      ],
      scene: {
        nodes: ai('you', 'gw', 'chat', 'hist'),
        links: [L('you', 'gw', { arrow: 'both', label: 'SSE' }), L('gw', 'chat', { arrow: 'both' }), L('chat', 'hist', { arrow: 'both' })],
        flows: [F(['you', 'gw', 'chat'], { kind: 'request' }), F(['chat', 'gw', 'you'], { kind: 'data', n: 4, delay: 1 }), F(['chat', 'hist'], { kind: 'data', delay: 2.4 })],
        notes: [
          { at: [3.5, -3.5], text: 'data: {"delta":"Hel"}', icon: Radio },
          { at: [-6.5, 3.5], text: 'messages by conv_id', icon: ListOrdered },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Orchestrator in front of GPUs',
      tag: 'Design',
      body: [
        'The **gateway** authenticates, checks quota and holds the SSE stream. The **chat** service loads history, assembles the prompt, picks a model and enqueues the request. **GPU pools** pull from their model’s queue, generate, and stream tokens back via the chat service, which saves the reply.',
        '**Model routing**: a cheap classifier or rules (plan, prompt length, task type) send easy turns to a **small model** and hard ones to the **large** one — often most traffic can go small, freeing the costliest GPUs.',
      ],
      changes: [{ sign: '+', text: 'Gateway + quota' }, { sign: '+', text: 'Chat orchestrator' }, { sign: '+', text: 'Per-model queues + GPU pools' }],
      scene: {
        nodes: ai('you', 'gw', ['chat', { meter: 30 }], 'quota', 'hist', 'qL', 'qS', ['gpuL', { meter: 70 }], ['gpuS', { meter: 50 }]),
        links: [...aiCore, L('gw', 'quota', { arrow: 'both' }), L('chat', 'qS'), L('qS', 'gpuS')],
        flows: [
          F(['you', 'gw', 'chat', 'qL', 'gpuL'], { kind: 'request' }),
          F(['chat', 'qS', 'gpuS'], { kind: 'request', delay: 0.8 }),
          F(['gpuL', 'chat', 'gw', 'you'], { kind: 'data', n: 3, delay: 2 }),
        ],
        notes: [{ at: [-6.5, -3.5], text: 'easy → small model', icon: Route, tone: 'good' }],
      },
      metrics: { ttft: '≈ 700 ms', gpu: '60%' },
    },
    {
      short: 'Streaming',
      title: 'Stream every token, stop on demand',
      tag: 'Deep Dive',
      body: [
        'Tokens flow GPU → chat service → gateway → browser over an internal stream, each flushed immediately. Disable buffering on every proxy, send heartbeats so idle timeouts don’t cut long replies, and append to a buffer so the final message can be saved — or a reloaded tab can catch up.',
        '**Stop** must reach the GPU: the gateway notices the click or a closed connection, the chat service sends cancel, and the worker drops the sequence from its batch at the next step, **freeing its memory** for someone else. Bill only tokens produced.',
      ],
      callout: { kind: 'warn', text: 'A cancel that stops only the browser display still burns GPU time. Propagate cancellation to the scheduler.' },
      scene: {
        nodes: ai('you', 'gw', ['chat', { meter: 35 }], 'quota', 'hist', 'qL', ['gpuL', { meter: 70 }]),
        links: [...aiCore, L('gw', 'quota')],
        flows: [
          F(['gpuL', 'chat', 'gw', 'you'], { kind: 'data', n: 4 }),
          F(['you', 'gw', 'chat', 'qL', 'gpuL'], { kind: 'error', delay: 2.4, stop: true }),
        ],
        notes: [
          { at: [-6.5, -3.5], text: 'no proxy buffering', icon: Radio },
          { at: [7, 0], text: 'cancel → free slot', icon: OctagonX, tone: 'good' },
        ],
      },
      metrics: { streams: '200k open' },
    },
    {
      short: 'Batching',
      title: 'Continuous batching on GPUs',
      tag: 'Deep Dive',
      body: [
        'Generating a token for one sequence leaves a GPU mostly idle — it is limited by reading the model weights, not by maths. So workers run many sequences per step. **Static batching** waits for the whole batch to finish; short replies idle while long ones drag on.',
        '**Continuous batching** re-forms the batch every step: finished sequences leave, queued ones join (their prompt “prefill” is processed, then they decode with the rest). The cap is **KV-cache memory** per sequence, so the scheduler admits work by memory, not by count.',
      ],
      callout: { kind: 'key', text: 'Throughput comes from batching; latency comes from not waiting for the batch. Continuous batching gives both.' },
      scene: {
        nodes: ai('you', 'gw', ['chat', { meter: 35 }], 'hist', ['qL', { items: 6 }], ['gpuL', { meter: 90, status: 'hot' }]),
        links: aiCore,
        flows: [
          F(['chat', 'qL', 'gpuL'], { kind: 'request', n: 4 }),
          F(['gpuL', 'chat', 'gw', 'you'], { kind: 'data', n: 3, delay: 1.2 }),
        ],
        notes: [
          { at: [7, -6.5], text: 'join / leave every step', icon: Layers, tone: 'good' },
          { at: [3.5, 3.5], text: 'cap = KV-cache memory', icon: Cpu, tone: 'warn' },
        ],
      },
      metrics: { gpu: '85%', wait: '≈ 200 ms' },
      hi: ['gpu'],
    },
    {
      short: 'Admission',
      title: 'Say no early, not late',
      tag: 'Deep Dive',
      body: [
        'GPU capacity is fixed in the short term, so the queue must not grow without bound. The gateway enforces **per-user token buckets** by plan (requests/min and tokens/day); the scheduler tracks **queue wait** and, past a threshold, rejects new low-priority work with `429` and a retry hint.',
        'Order queues by plan and fairness — e.g. weighted fair queuing per user — so one heavy user can’t starve others. A fast “busy, try again” is better than a request that sits in a queue and times out after 60 s.',
      ],
      changes: [{ sign: '+', text: 'Per-user quotas' }, { sign: '+', text: 'Queue-wait shedding' }],
      scene: {
        nodes: ai('you', 'gw', ['chat', { meter: 40 }], ['quota', { meter: 80 }], 'hist', ['qL', { items: 7 }], ['gpuL', { meter: 95, status: 'hot' }]),
        links: [...aiCore, L('gw', 'quota', { arrow: 'both' })],
        flows: [
          F(['you', 'gw', 'quota'], { kind: 'request', ret: true, retKind: 'data' }),
          F(['you', 'gw'], { kind: 'request', ret: true, retKind: 'error', delay: 1.2 }),
          F(['chat', 'qL', 'gpuL'], { kind: 'request', n: 3, delay: 2 }),
        ],
        notes: [
          { at: [-6.5, -3.5], text: '429 · retry in 20 s', icon: Ban, tone: 'bad' },
          { at: [7, 0], text: 'shed if wait > 5 s', icon: Hourglass, tone: 'warn' },
        ],
      },
      metrics: { wait: '< 5 s (capped)' },
      hi: ['wait'],
    },
    {
      short: 'Context',
      title: 'Context assembly and caching',
      tag: 'Deep Dive',
      body: [
        'Each turn resends the system prompt plus history. The chat service reads the conversation, keeps the newest turns that fit the **context budget**, and replaces older ones with a stored summary. Every token of prompt costs GPU time in prefill.',
        '**Prefix caching** keeps the attention state (KV cache) of a prompt’s beginning on the GPU, so the next turn only processes new tokens. To hit it, **route a conversation to the replica that served it last** (sticky routing by `conv_id`), falling back to any replica when that one is busy.',
      ],
      callout: { kind: 'tip', text: 'Keep the shared system prompt byte-identical at the very start of every request — it is the most reusable prefix you have.' },
      scene: {
        nodes: ai('you', 'gw', ['chat', { meter: 40 }], 'quota', ['hist', { meter: 30 }], 'qL', ['gpuL', { meter: 80, sub: 'KV cache' }]),
        links: [...aiCore, L('gw', 'quota')],
        flows: [
          F(['chat', 'hist'], { kind: 'request', ret: true, retKind: 'data' }),
          F(['chat', 'qL', 'gpuL'], { kind: 'request', delay: 1.2 }),
          F(['gpuL', 'chat', 'gw', 'you'], { kind: 'data', n: 2, delay: 2.2 }),
        ],
        notes: [
          { at: [-6.5, 3.5], text: 'newest turns + summary', icon: ListOrdered },
          { at: [7, 0], text: 'sticky by conv_id', icon: Route, tone: 'good' },
        ],
      },
      metrics: { ttft: '≈ 400 ms (cache hit)' },
      hi: ['ttft'],
    },
    {
      short: 'Degrade',
      title: 'When a GPU pool goes down',
      tag: 'Bottleneck',
      body: [
        'Lose a large-model pool (bad driver rollout, region outage) and 30% of capacity vanishes mid-stream. Health checks drain it; in-flight replies **fail fast** with a “regenerate” option, since the KV state is gone. Other regions take overflow if capacity allows.',
        'Then degrade in steps: route more traffic to the **small model**, lower max output length, pause free-tier access to the large model, and shed by priority. A slightly worse answer now beats a spinner forever.',
      ],
      callout: { kind: 'key', text: 'Plan the degradation ladder in advance — which users, which models, which limits — so an outage is a config flip, not a debate.' },
      scene: {
        nodes: ai('you', 'gw', ['chat', { meter: 50 }], 'quota', 'hist', ['qL', { items: 7 }], 'qS', ['gpuL', { status: 'down' }], ['gpuS', { meter: 85, status: 'hot' }]),
        links: [...aiCore.slice(0, 4), L('qL', 'gpuL', { tone: 'bad', dashed: true }), L('gw', 'quota'), L('chat', 'qS'), L('qS', 'gpuS'), L('gpuS', 'chat', { dashed: true })],
        flows: [
          F(['chat', 'qL', 'gpuL'], { kind: 'error', stop: true }),
          F(['you', 'gw', 'chat', 'qS', 'gpuS'], { kind: 'request', delay: 1.2 }),
          F(['gpuS', 'chat', 'gw', 'you'], { kind: 'data', n: 2, delay: 2.4 }),
        ],
        notes: [
          { at: [-6.5, -3.5], text: 'fallback → small model', icon: Sparkles, tone: 'warn' },
          { at: [-6.5, 3.5], text: 'cap max tokens', icon: Gauge },
        ],
      },
      metrics: { gpu: '−30% capacity', ttft: '≈ 1.5 s' },
      bad: ['gpu', 'ttft'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'An SSE **gateway** with quotas; a **chat orchestrator** that assembles context, routes to the right **model** and propagates **cancellation**; per-model queues with **admission control**; GPUs running **continuous batching** with sticky **prefix caching**; a planned **degradation ladder**.',
        'In an interview, size GPUs from tokens per second first — it drives every other decision.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Treat GPU time as the currency: batch it, cache prompts to save it, refuse work early to protect it, and never spend it on cancelled replies.' },
      scene: {
        nodes: ai('you', 'gw', ['chat', { meter: 40 }], 'quota', 'hist', 'qL', 'qS', ['gpuL', { meter: 85 }], ['gpuS', { meter: 60 }]),
        links: [...aiCore, L('gw', 'quota'), L('chat', 'qS'), L('qS', 'gpuS'), L('gpuS', 'chat', { dashed: true })],
        flows: [
          F(['you', 'gw', 'chat', 'qL', 'gpuL'], { kind: 'request' }),
          F(['gpuL', 'chat', 'gw', 'you'], { kind: 'data', n: 3, delay: 1.6 }),
          F(['chat', 'qS', 'gpuS'], { kind: 'request', delay: 2.2 }),
        ],
      },
      metrics: { ttft: '≈ 400 ms', gpu: '85%', wait: '< 5 s', streams: '200k' },
    },
  ],
};
