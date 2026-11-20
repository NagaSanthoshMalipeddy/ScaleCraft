import {
  Activity,
  Archive,
  Coins,
  Cog,
  Database,
  Gauge,
  Images,
  Inbox,
  Layers,
  Lock,
  Radio,
  RotateCcw,
  ScrollText,
  Server,
  Smartphone,
  Snowflake,
  Ticket,
  Timer,
  User,
  Users,
} from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* Transactions & isolation                                             */
/* ------------------------------------------------------------------ */

const tx = cast({
  pa: { kind: 'phone', at: [-5.5, -3.5], tag: 'Ana', tagIcon: User },
  pb: { kind: 'phone', at: [-5.5, 3.5], tag: 'Ben', tagIcon: User },
  ta: { kind: 'cube', at: [-2, -3.5], label: 'Booking', sub: 'tx A', icon: Ticket, tone: 'blue' },
  tb: { kind: 'cube', at: [-2, 3.5], label: 'Booking', sub: 'tx B', icon: Ticket, tone: 'blue' },
  db: { kind: 'db', at: [1.5, 0], label: 'seats', icon: Database },
  wal: { kind: 'slab', at: [5, 0], tag: 'commit log', icon: ScrollText, tone: 'yellow' },
});

const txLinks = [L('pa', 'ta'), L('pb', 'tb'), L('ta', 'db', { arrow: 'both' }), L('tb', 'db', { arrow: 'both' })];
const both = [F(['pa', 'ta', 'db'], { ret: true }), F(['pb', 'tb', 'db'], { ret: true, delay: 0.15 })];

export const transactions: Lesson = {
  id: 'transactions',
  title: 'Transactions & Isolation',
  blurb: 'Two buyers, one seat: how databases keep concurrent writes from corrupting each other.',
  minutes: 13,
  level: 'Advanced',
  keywords: ['transaction', 'acid', 'isolation level', 'serializable', 'snapshot', 'lost update', 'select for update', 'optimistic locking', 'mvcc', 'write skew'],
  metrics: [
    { id: 'tickets', label: 'Tickets for 14C', icon: Ticket },
    { id: 'iso', label: 'Isolation', icon: Layers },
    { id: 'tps', label: 'Throughput', icon: Activity },
    { id: 'retry', label: 'Aborted txs', icon: RotateCcw },
  ],
  learn: [
    { text: 'What each letter of ACID guarantees', at: 1 },
    { text: 'Dirty reads, phantoms and lost updates', at: 2 },
    { text: 'What each isolation level prevents — and costs', at: 4 },
    { text: 'Pessimistic locking with SELECT … FOR UPDATE', at: 5 },
    { text: 'Optimistic concurrency with a version column', at: 6 },
  ],
  steps: [
    {
      short: 'Last seat',
      title: 'Two buyers, one seat',
      tag: 'Problem',
      body: [
        'Seat 14C is the last one left. Ana and Ben tap **Buy** within the same millisecond. Each request reads the seat (`status = free`), then writes `status = sold` and inserts a ticket.',
        'Both reads happen before either write. Both checks pass, the second write overwrites the first, and the venue now has **two tickets for one seat** — at the default isolation level.',
      ],
      scene: {
        nodes: tx('pa', 'pb', 'ta', 'tb', 'db'),
        links: txLinks,
        flows: both,
        notes: [
          { at: [5, -3.5], text: 'A: 14C free → sell', tone: 'bad' },
          { at: [5, 3.5], text: 'B: 14C free → sell', tone: 'bad' },
          { at: [5, 0], text: '2 tickets, 1 seat', icon: Ticket, tone: 'bad' },
        ],
      },
      metrics: { tickets: '2', iso: 'Read committed', tps: '4,000 tx/s', retry: '0%' },
      bad: ['tickets'],
    },
    {
      short: 'ACID',
      title: 'A transaction is all or nothing',
      tag: 'Technique',
      body: [
        'Wrap the steps in `BEGIN … COMMIT`. **Atomic**: every statement lands, or none does. **Consistent**: constraints still hold afterwards. **Durable**: once committed, the change is in the log and survives a crash.',
        '**Isolated** is the subtle one: concurrent transactions shouldn’t see each other’s half-finished work. How strictly that is enforced is a setting.',
      ],
      callout: { kind: 'key', text: 'Isolation is a dial, not a switch. Stronger settings prevent more anomalies and cost more coordination.' },
      changes: [{ sign: '+', text: 'Commit log (write-ahead log)' }],
      scene: {
        nodes: tx('pa', 'pb', 'ta', 'tb', 'db', 'wal'),
        links: [...txLinks, L('db', 'wal', { label: 'COMMIT → fsync' })],
        flows: [F(['pa', 'ta', 'db', 'wal'], { ret: true }), F(['pb', 'tb', 'db'], { ret: true, delay: 1.2 })],
        notes: [
          { at: [5, -3.5], text: 'all statements or none', tone: 'good' },
          { at: [5, 3.5], text: 'committed = survives crash', tone: 'good' },
        ],
      },
    },
    {
      short: 'Anomalies',
      title: 'Four ways concurrency goes wrong',
      tag: 'Insight',
      body: [
        '**Dirty read**: you see a change that is later rolled back. **Non-repeatable read**: the same row reads differently twice in one transaction. **Phantom**: re-running `WHERE row = 14` returns rows that weren’t there before.',
        '**Lost update**: two transactions read the same value and both write; one write silently erases the other. That is our double booking.',
      ],
      scene: {
        nodes: tx('pa', 'pb', ['ta', { tag: 'rolls back' }], 'tb', 'db'),
        links: [L('pa', 'ta'), L('pb', 'tb'), L('ta', 'db', { arrow: 'both', label: 'uncommitted' }), L('tb', 'db', { arrow: 'both', tone: 'bad' })],
        flows: [F(['ta', 'db'], { kind: 'data' }), F(['db', 'tb'], { kind: 'error', delay: 0.8 }), F(['db', 'ta'], { kind: 'error', delay: 1.6 })],
        notes: [
          { at: [5, -3], text: 'dirty read', tone: 'bad' },
          { at: [5, -1], text: 'non-repeatable read', tone: 'bad' },
          { at: [5, 1], text: 'phantom row', tone: 'bad' },
          { at: [5, 3], text: 'lost update', tone: 'bad' },
        ],
      },
    },
    {
      short: 'Snapshot',
      title: 'Each transaction reads a snapshot',
      tag: 'Technique',
      body: [
        '**Read committed** (the default in PostgreSQL and SQL Server) only hides uncommitted data; rows can change between two reads. **Repeatable read / snapshot** gives each transaction a frozen view, kept cheap by **MVCC** (old row versions).',
        'In PostgreSQL, when two snapshot transactions update the same row, the second is aborted with a serialization error. Ben’s booking fails cleanly.',
      ],
      callout: { kind: 'warn', text: 'Names lie: MySQL’s repeatable read still lets a plain read-then-write lose an update. Test your engine, don’t trust the label.' },
      scene: {
        nodes: tx('pa', 'pb', 'ta', 'tb', ['db', { tag: 'seats · v7' }]),
        links: [L('pa', 'ta'), L('pb', 'tb'), L('ta', 'db', { arrow: 'both' }), L('tb', 'db', { arrow: 'both', tone: 'bad', label: 'aborted' })],
        flows: [F(['pa', 'ta', 'db'], { ret: true }), F(['pb', 'tb', 'db'], { ret: true, retKind: 'error', delay: 0.3 })],
        notes: [
          { at: [5, -3.5], text: 'A sees snapshot v7', tone: 'good' },
          { at: [5, 3.5], text: 'B: concurrent update ✗', tone: 'warn' },
        ],
      },
      metrics: { tickets: '1', iso: 'Snapshot', tps: '3,800 tx/s', retry: '1%' },
      hi: ['tickets'],
    },
    {
      short: 'Serializable',
      title: 'Serializable: correct, not free',
      tag: 'Trade-off',
      body: [
        'Snapshot still misses **write skew**. If booking runs `SELECT count(*) FROM tickets WHERE seat = ’14C’` and then INSERTs a new row, both transactions count 0 and insert different rows — no shared row, no conflict, two tickets.',
        '**Serializable** guarantees the result of some one-at-a-time order, so one transaction is aborted and must retry. Under contention that means more aborts and less throughput.',
      ],
      callout: { kind: 'tip', text: 'Often the cheapest fix is a constraint: UNIQUE (event_id, seat) makes the database reject a second ticket at any isolation level.' },
      scene: {
        nodes: tx('pa', 'pb', ['ta', { meter: 60 }], ['tb', { meter: 60 }], ['db', { meter: 75 }]),
        links: [L('pa', 'ta'), L('pb', 'tb'), L('ta', 'db', { arrow: 'both' }), L('tb', 'db', { arrow: 'both', tone: 'bad', label: 'retry' })],
        flows: [F(['pa', 'ta', 'db'], { ret: true }), F(['pb', 'tb', 'db'], { ret: true, retKind: 'error', delay: 0.2 }), F(['tb', 'db'], { ret: true, delay: 2 })],
        notes: [
          { at: [5, -3.5], text: 'A commits first', tone: 'good' },
          { at: [5, 3.5], text: 'B: could not serialize', tone: 'warn' },
        ],
      },
      metrics: { iso: 'Serializable', tps: '2,900 tx/s', retry: '6%' },
      bad: ['tps', 'retry'],
    },
    {
      short: 'FOR UPDATE',
      title: 'Lock the row before you read it',
      tag: 'Technique',
      body: [
        '**Pessimistic locking**: `SELECT * FROM seats WHERE id = ’14C’ FOR UPDATE` takes a row lock. Ben’s identical query **waits** until Ana commits, then reads `sold` and fails with a friendly message.',
        'It works even at read committed and never needs a retry loop. The cost: requests queue up behind hot rows, and two transactions locking rows in opposite order can **deadlock**.',
      ],
      callout: { kind: 'warn', text: 'Keep locked sections tiny. Never call a payment provider while holding a row lock, and always lock rows in a fixed order.' },
      scene: {
        nodes: tx('pa', 'pb', 'ta', ['tb', { status: 'dim' }], ['db', { tag: 'row 14C locked', tagIcon: Lock }]),
        links: [L('pa', 'ta'), L('pb', 'tb'), L('ta', 'db', { arrow: 'both', label: 'FOR UPDATE' }), L('tb', 'db', { dashed: true, label: 'waiting' })],
        flows: [F(['pa', 'ta', 'db'], { ret: true }), F(['pb', 'tb', 'db'], { stop: true, delay: 0.3, speed: 0.6 })],
        notes: [
          { at: [5, -3.5], text: 'A holds lock · 12 ms', icon: Lock },
          { at: [5, 3.5], text: 'B waits, then sees sold', tone: 'warn' },
        ],
      },
      metrics: { iso: 'Read committed', tps: '3,400 tx/s', retry: '0%' },
      hi: ['retry'],
    },
    {
      short: 'Version',
      title: 'Optimistic: check a version on write',
      tag: 'Technique',
      body: [
        'Give each row a `version`. Read the seat (version 7), then `UPDATE seats SET status = ’sold’, version = 8 WHERE id = ’14C’ AND version = 7`. If it reports **0 rows updated**, someone got there first.',
        '**Optimistic concurrency** holds no locks, so it shines when conflicts are rare (editing a profile). When everyone fights over one hot row, most attempts are wasted retries.',
      ],
      callout: { kind: 'tip', text: 'HTTP has the same idea built in: send the ETag back in If-Match, and the server answers 412 if the resource changed meanwhile.' },
      scene: {
        nodes: tx('pa', 'pb', 'ta', 'tb', ['db', { tag: 'seats · v8' }]),
        links: [L('pa', 'ta'), L('pb', 'tb'), L('ta', 'db', { arrow: 'both', label: 'AND version = 7' }), L('tb', 'db', { arrow: 'both', tone: 'bad', label: '0 rows' })],
        flows: [F(['pa', 'ta', 'db'], { ret: true }), F(['pb', 'tb', 'db'], { ret: true, retKind: 'error', delay: 0.4 })],
        notes: [
          { at: [5, -3.5], text: 'A: 1 row updated ✓', tone: 'good' },
          { at: [5, 3.5], text: 'B: re-read, seat is sold', tone: 'warn' },
        ],
      },
      metrics: { tps: '3,900 tx/s', retry: '2%' },
      hi: ['tps'],
    },
    {
      short: 'Recap',
      title: 'Transactions, summed up',
      tag: 'Recap',
      body: [
        'Transactions make multi-step changes **atomic and durable**; the isolation level decides which **anomalies** concurrent transactions can still cause. Stronger levels cost throughput and need retry loops.',
        'For hot read-then-write paths, pick a tool on purpose: **row locks**, a **version check**, or a **unique constraint**.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Know your default isolation level, and never assume a read-then-write is safe just because it runs inside a transaction.' },
      scene: {
        nodes: tx('pa', 'pb', 'ta', 'tb', ['db', { tag: 'seats · v8' }], 'wal'),
        links: [...txLinks, L('db', 'wal')],
        flows: [F(['pa', 'ta', 'db', 'wal'], { ret: true }), F(['pb', 'tb', 'db'], { ret: true, retKind: 'error', delay: 0.6 })],
      },
      metrics: { tickets: '1', iso: 'Read committed', tps: '3,900 tx/s', retry: '2%' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Files & media                                                        */
/* ------------------------------------------------------------------ */

const fm = cast({
  you: { kind: 'phone', at: [-6.5, -4], tag: 'seller', tagIcon: Smartphone },
  api: { kind: 'cube', at: [-2.5, -4], label: 'API', icon: Server, tone: 'blue' },
  db: { kind: 'db', at: [1, -4], label: 'metadata', icon: Database },
  bucket: { kind: 'slab', at: [-2.5, 0], tag: 'originals', icon: Archive, tone: 'teal' },
  queue: { kind: 'queue', at: [1, 0], tag: 'jobs', tagIcon: Inbox, items: 3 },
  worker: { kind: 'cube', at: [5, 0], label: 'Workers', sub: 'resize', icon: Cog, tone: 'green' },
  thumbs: { kind: 'slab', at: [1, 4], tag: 'renditions', icon: Images, tone: 'teal' },
  cdn: { kind: 'cube', at: [-2.5, 4], label: 'CDN', sub: 'edge', icon: Radio, tone: 'teal' },
  viewers: { kind: 'crowd', at: [-6.5, 4], tag: 'buyers', tagIcon: Users, items: 5 },
  archive: { kind: 'slab', at: [-6.5, 0], tag: 'cold tier', icon: Snowflake, tone: 'gray' },
});

const presign = [L('you', 'api', { arrow: 'both' }), L('api', 'db'), L('you', 'bucket', { label: 'PUT bytes' })];
const pipeline = [L('bucket', 'queue', { label: 'event' }), L('queue', 'worker'), L('worker', 'thumbs'), L('worker', 'db')];

export const filesMedia: Lesson = {
  id: 'files',
  title: 'Files & Media',
  blurb: 'Keep photos and videos out of the database: buckets, direct uploads, processing pipelines, CDNs.',
  minutes: 10,
  level: 'Intermediate',
  keywords: ['object storage', 'blob', 'bucket', 's3', 'presigned url', 'thumbnail', 'transcoding', 'lifecycle', 'storage tier', 'media'],
  metrics: [
    { id: 'db', label: 'DB size', icon: Database },
    { id: 'api', label: 'API load', icon: Gauge },
    { id: 'img', label: 'Photo load', icon: Timer },
    { id: 'cost', label: 'Storage cost', icon: Coins },
  ],
  learn: [
    { text: 'Why large blobs don’t belong in the database', at: 0 },
    { text: 'Object storage: bucket + key, metadata in the DB', at: 1 },
    { text: 'Direct uploads with presigned URLs', at: 2 },
    { text: 'Async pipelines for thumbnails and transcoding', at: 3 },
    { text: 'CDN delivery and lifecycle storage tiers', at: 5 },
  ],
  steps: [
    {
      short: 'Blobs in DB',
      title: 'The database ate the photos',
      tag: 'Problem',
      body: [
        'A marketplace stores listing photos (~3 MB) and short videos as **blob columns**. 1.4 million uploads later the database is **4.1 TB**: nightly backups take 9 hours, replicas lag, and image bytes push hot rows out of memory.',
        'Every upload also streams through the API, pinning a server thread for the 20 s a slow phone needs.',
      ],
      scene: {
        nodes: fm('you', ['api', { meter: 88, status: 'hot' }], ['db', { meter: 92, status: 'hot', tag: 'db · 4.1 TB' }]),
        links: [L('you', 'api', { label: 'upload 3 MB' }), L('api', 'db', { label: 'INSERT blob' })],
        flows: [F(['you', 'api', 'db'], { kind: 'data', n: 3, speed: 0.5 })],
      },
      metrics: { db: '4.1 TB', api: '88%', img: '1.9 s', cost: '$1,800 /mo' },
      bad: ['db', 'api', 'img'],
    },
    {
      short: 'Bucket',
      title: 'Bytes in a bucket, facts in the DB',
      tag: 'Technique',
      body: [
        '**Object storage** keeps files as objects in a **bucket**, each under a **key** like `listings/8812/a1f3.jpg`. It is replicated across zones, scales without capacity planning, and costs ~$0.02 per GB-month.',
        'The database keeps only a small row: key, size, content type, owner, status. 4.1 TB of blobs shrinks to a 38 GB database that backs up in minutes.',
      ],
      callout: { kind: 'key', text: 'Store large, immutable bytes in object storage; store the pointer (bucket + key) and the facts about it in your database.' },
      changes: [{ sign: '+', text: 'Object storage bucket' }, { sign: '~', text: 'DB stores keys, not bytes' }],
      scene: {
        nodes: fm('you', ['api', { meter: 80, status: 'hot' }], ['db', { meter: 25, tag: 'db · 38 GB' }], 'bucket'),
        links: [L('you', 'api', { label: 'upload 3 MB' }), L('api', 'db', { label: 'key + size' }), L('api', 'bucket')],
        flows: [F(['you', 'api', 'bucket'], { kind: 'data', n: 2, speed: 0.6 }), F(['api', 'db'], { delay: 1.2 })],
      },
      metrics: { db: '38 GB', api: '80%', cost: '$140 /mo' },
      hi: ['db', 'cost'],
    },
    {
      short: 'Presigned',
      title: 'Let the phone upload directly',
      tag: 'Technique',
      body: [
        'The API checks the user may upload, inserts a `pending` row, and returns a **presigned URL**: permission to PUT one specific key, signed with the server’s credentials and valid for ~10 minutes.',
        'The phone sends the bytes straight to the bucket. Signing is local maths, not a network call, so the API handles a 1 KB request instead of a 3 MB stream.',
      ],
      callout: { kind: 'warn', text: 'Treat uploads as untrusted: cap size in the signed policy, verify the real file type after it lands, and expire URLs quickly.' },
      changes: [{ sign: '-', text: 'Bytes no longer pass through the API' }, { sign: '+', text: 'Presigned upload URL' }],
      scene: {
        nodes: fm('you', ['api', { meter: 14 }], ['db', { meter: 20, tag: 'db · 38 GB' }], 'bucket'),
        links: [L('you', 'api', { arrow: 'both', label: 'get URL' }), L('api', 'db', { label: 'status: pending' }), L('you', 'bucket', { label: 'PUT bytes' })],
        flows: [F(['you', 'api', 'db'], { ret: true }), F(['you', 'bucket'], { kind: 'data', delay: 1.4, speed: 0.6 })],
      },
      metrics: { api: '14%' },
      hi: ['api'],
    },
    {
      short: 'Processing',
      title: 'Thumbnails and transcoding, later',
      tag: 'Technique',
      body: [
        'When an object lands, the bucket emits an **event** onto a **queue**. Workers resize photos into three sizes, strip GPS metadata, and **transcode** videos into 1080p/720p/480p streams, writing results to a renditions bucket.',
        'Finally the worker flips the row to `ready`. A 2-minute video transcode never blocks a request; the app shows “processing…”.',
      ],
      callout: { kind: 'tip', text: 'Make jobs idempotent: derive output keys from the input key, so a retried job overwrites its own files instead of duplicating them.' },
      changes: [{ sign: '+', text: 'Jobs queue + workers' }, { sign: '+', text: 'Renditions bucket' }],
      scene: {
        nodes: fm('you', ['api', { meter: 14 }], ['db', { tag: 'db · 38 GB' }], 'bucket', 'queue', ['worker', { meter: 70 }], 'thumbs'),
        links: [...presign, L('bucket', 'queue', { label: 'event' }), L('queue', 'worker'), L('worker', 'thumbs', { label: 'renditions' }), L('worker', 'db', { label: 'status: ready' })],
        flows: [
          F(['you', 'bucket'], { kind: 'data', speed: 0.7 }),
          F(['bucket', 'queue', 'worker'], { kind: 'event', delay: 0.8 }),
          F(['worker', 'thumbs'], { kind: 'data', n: 3, delay: 1.6 }),
          F(['worker', 'db'], { delay: 2.4 }),
        ],
      },
    },
    {
      short: 'CDN',
      title: 'Serve media from the edge',
      tag: 'Technique',
      body: [
        'Buyers load images through a **CDN** that pulls from the renditions bucket only on a miss. A new upload always gets a new key, so objects never change and can be cached for a year with `immutable`.',
        'Hit ratios above 95% are normal for media. Photo load time drops from 1.9 s to **180 ms**, and the bucket serves a trickle.',
      ],
      callout: { kind: 'tip', text: 'For private media (receipts, ID scans) use short-lived signed CDN URLs instead of public objects.' },
      changes: [{ sign: '+', text: 'CDN in front of renditions' }],
      scene: {
        nodes: fm('you', 'api', ['db', { tag: 'db · 38 GB' }], 'bucket', ['queue', { items: 1 }], ['worker', { meter: 30 }], 'thumbs', 'cdn', 'viewers'),
        links: [...presign, ...pipeline, L('viewers', 'cdn', { arrow: 'both' }), L('cdn', 'thumbs', { label: 'miss → origin' })],
        flows: [F(['viewers', 'cdn'], { ret: true, n: 4, speed: 1.2 }), F(['cdn', 'thumbs'], { kind: 'data', ret: true, retKind: 'data', delay: 1.4 }), F(['bucket', 'queue', 'worker', 'thumbs'], { kind: 'event', delay: 0.5 })],
      },
      metrics: { img: '180 ms' },
      hi: ['img'],
    },
    {
      short: 'Lifecycle',
      title: 'Old media, cheaper shelves',
      tag: 'Trade-off',
      body: [
        'Reads fade fast: most views hit listings under 30 days old. A **lifecycle rule** moves originals to an infrequent-access tier after 30 days and an **archive tier** after 180, at a fraction of the price. Abandoned `pending` uploads are deleted after a day.',
        'The catch: colder tiers charge per retrieval, and archived objects can take hours to restore.',
      ],
      callout: { kind: 'warn', text: 'Never archive anything a page renders. Tier the originals; keep the renditions people actually view in standard storage.' },
      changes: [{ sign: '+', text: 'Cold storage tier' }],
      scene: {
        nodes: fm('you', 'api', ['db', { tag: 'db · 38 GB' }], 'bucket', ['queue', { items: 1 }], ['worker', { meter: 30 }], 'thumbs', 'cdn', 'viewers', 'archive'),
        links: [...presign, ...pipeline, L('viewers', 'cdn', { arrow: 'both' }), L('cdn', 'thumbs'), L('bucket', 'archive', { dashed: true, label: '> 180 days' })],
        flows: [F(['bucket', 'archive'], { kind: 'data', n: 2, speed: 0.4 }), F(['viewers', 'cdn'], { ret: true, n: 3, delay: 0.6 })],
      },
      metrics: { cost: '$60 /mo' },
      hi: ['cost'],
    },
    {
      short: 'Recap',
      title: 'Files & media, summed up',
      tag: 'Recap',
      body: [
        'Put bytes in **object storage** and pointers in the database. Let clients upload directly with **presigned URLs**, process media **asynchronously** through a queue, and serve it through a **CDN**.',
        'Lifecycle rules quietly move old originals to cheaper tiers.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Your database should know about every file and contain none of them.' },
      scene: {
        nodes: fm('you', 'api', ['db', { tag: 'db · 38 GB' }], 'bucket', ['queue', { items: 1 }], ['worker', { meter: 30 }], 'thumbs', 'cdn', 'viewers', 'archive'),
        links: [...presign, ...pipeline, L('viewers', 'cdn', { arrow: 'both' }), L('cdn', 'thumbs'), L('bucket', 'archive', { dashed: true })],
        flows: [
          F(['you', 'bucket'], { kind: 'data', speed: 0.7 }),
          F(['bucket', 'queue', 'worker', 'thumbs'], { kind: 'event', delay: 0.8 }),
          F(['viewers', 'cdn'], { ret: true, n: 3, delay: 0.3 }),
        ],
      },
      metrics: { db: '38 GB', api: '14%', img: '180 ms', cost: '$60 /mo' },
    },
  ],
};
