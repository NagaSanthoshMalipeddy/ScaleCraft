import {
  Activity,
  Archive,
  Backpack,
  BellRing,
  Boxes,
  Clock,
  Cpu,
  Database,
  DollarSign,
  Download,
  Flame,
  Funnel,
  Gamepad2,
  Gauge,
  Globe,
  HardDrive,
  Hourglass,
  Landmark,
  LayoutDashboard,
  Layers,
  Minimize2,
  Network,
  ScrollText,
  Search,
  Server,
  ShieldCheck,
  Sigma,
  Siren,
  Skull,
  Swords,
  Timer,
  Trophy,
  Upload,
  User,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';
import type { Question } from '../types';
import { cast, F, L } from '../lessons/kit';

/* ------------------------------------------------------------------ */
/* Design a Logging Platform                                           */
/* ------------------------------------------------------------------ */

const lg = cast({
  hosts: { kind: 'slab', at: [-7, -4], tag: '50k hosts', icon: Server, tone: 'gray' },
  noisy: { kind: 'slab', at: [-7, -0.5], tag: 'noisy tenant', icon: Flame, tone: 'rose' },
  sys: { kind: 'cube', at: [0, -4], label: 'Logging', sub: 'black box', icon: ScrollText, tone: 'gray' },
  ingest: { kind: 'cube', at: [-3.5, -4], label: 'Ingest', sub: 'gateway', icon: Network, tone: 'green' },
  bus: { kind: 'queue', at: [0, -4], tag: 'durable log', items: 4 },
  parser: { kind: 'cube', at: [3, -4], label: 'Parser', sub: 'enrich', icon: Funnel, tone: 'blue' },
  hot: { kind: 'db', at: [7, 0], tag: 'hot · SSD', icon: Zap },
  cold: { kind: 'slab', at: [3.5, 3.5], tag: 'object store', icon: Archive, tone: 'violet' },
  query: { kind: 'cube', at: [0, 0], label: 'Query', sub: 'fan-out', icon: Search, tone: 'blue' },
  eng: { kind: 'device', at: [-3.5, 3.5], tag: 'engineer', tagIcon: User },
});

const lgLinks = [
  L('hosts', 'ingest'),
  L('ingest', 'bus'),
  L('bus', 'parser'),
  L('parser', 'hot'),
  L('hot', 'cold'),
  L('query', 'hot', { arrow: 'both' }),
  L('query', 'cold', { arrow: 'both' }),
  L('eng', 'query', { arrow: 'both' }),
];

export const qLogging: Question = {
  id: 'q-logging',
  n: 30,
  title: 'Design a Logging Platform',
  blurb: 'Ingest 5 GB/s of logs from 50k hosts, keep them a year, and still search in seconds.',
  minutes: 14,
  level: 'Advanced',
  concepts: ['Ingestion', 'Indexing', 'Storage'],
  related: ['observability', 'message-queues', 'indexes', 'storage-engines', 'sharding'],
  followUps: [
    'How would you support live tail with sub-second latency?',
    'How do you avoid losing logs if a host dies before its agent ships them?',
    'How would you redact PII such as emails before logs are stored?',
    'How would you make trace_id lookups fast across a year of data?',
  ],
  keywords: ['logging', 'log aggregation', 'elk', 'loki', 'inverted index', 'log retention', 'backpressure', 'object storage', 'multi-tenant quotas'],
  metrics: [
    { id: 'rate', label: 'Ingest', icon: Gauge },
    { id: 'store', label: 'Disk / day', icon: HardDrive },
    { id: 'p95', label: 'Search p95', icon: Timer },
    { id: 'cost', label: 'Cost / month', icon: DollarSign },
  ],
  learn: [
    { text: 'Sizing 5 GB/s of log ingestion', at: 1 },
    { text: 'Absorbing spikes with a durable log', at: 4 },
    { text: 'Inverted index vs labels + brute-force scan', at: 5 },
    { text: 'Hot/cold tiers and query fan-out', at: 6 },
    { text: 'Quotas and sampling to bound cost', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Logs from 50k hosts',
      tag: 'Requirements',
      body: [
        'Brief: collect application and system logs from **50,000 hosts** (~5 GB/s), let engineers **search and tail** them within seconds of being written, and keep them a year for audits. Many teams share the platform, so it is **multi-tenant**.',
        'Non-functional: shipping logs must **never slow the apps** and must not lose data in spikes; search over 7 days in **< 2 s**; written-to-searchable lag **< 30 s**. Out of scope: metrics, tracing and alert rules — they deserve their own systems.',
      ],
      callout: { kind: 'tip', text: 'Logs are written always and read rarely — most bytes are never searched. That one fact drives every cost decision below.' },
      scene: {
        nodes: lg('hosts', 'sys', 'eng'),
        links: [L('hosts', 'sys', { label: '5 GB/s' }), L('eng', 'sys', { arrow: 'both', label: 'search' })],
        flows: [F(['hosts', 'sys'], { kind: 'data', n: 4 }), F(['eng', 'sys'], { ret: true, delay: 0.8 })],
        notes: [
          { at: [5, -1.5], text: 'Search 7 days in < 2 s', icon: Search },
          { at: [5, 0], text: 'Keep 1 year, cheaply', icon: Archive },
          { at: [5, 1.5], text: 'Never drop on spikes', icon: ShieldCheck },
          { at: [5, 3], text: 'Out: metrics, traces', tone: 'warn' },
        ],
      },
      metrics: { rate: '5 GB/s', store: '—', p95: '—', cost: '—' },
    },
    {
      short: 'Numbers',
      title: 'Napkin maths',
      tag: 'Estimation',
      body: [
        '5 GB/s of ~500-byte lines is **10M lines/s**, about 100 KB/s per host; plan for **2× peaks** during incidents. Per day that is **432 TB raw**. Log text compresses ~10× with zstd, so ~45 TB/day actually lands on disk.',
        'Seven days hot with 2 copies ≈ **600 TB of SSD**; a year in object storage ≈ **16 PB**. Searches are few (hundreds per minute) but each may scan terabytes, so the read path is about **scan efficiency**, not QPS.',
      ],
      scene: {
        nodes: lg('hosts', 'sys', 'eng'),
        links: [L('hosts', 'sys'), L('eng', 'sys', { arrow: 'both' })],
        flows: [F(['hosts', 'sys'], { kind: 'data', n: 5, speed: 1.4 }), F(['eng', 'sys'], { ret: true, delay: 1 })],
        notes: [
          { at: [5, -1.5], text: '≈ 10M lines / s', icon: Activity },
          { at: [5, 0], text: '432 TB/day → 45 TB zstd', icon: HardDrive },
          { at: [5, 1.5], text: 'Hot 7d × 2 ≈ 600 TB SSD', icon: Zap },
          { at: [5, 3], text: '1 year cold ≈ 16 PB', icon: Archive },
        ],
      },
      metrics: { store: '45 TB', cost: '≈ $500k' },
      bad: ['cost'],
    },
    {
      short: 'API',
      title: 'Ingest and search APIs',
      tag: 'API',
      body: [
        'Agents call `POST /v1/logs` with a compressed batch; each event is `{ts, tenant, service, host, level, msg, attrs}`. The ack comes only once the batch is **durable**, so the agent knows when it may delete its local copy.',
        'Engineers call `GET /search?q=&from=&to=` and `GET /tail` (a stream). Storage is organised in **chunks**: compressed blocks of lines keyed by `(tenant, labels, time window)` — the unit we write, index, tier and scan.',
      ],
      scene: {
        nodes: lg('hosts', 'ingest', 'query', 'eng'),
        links: [L('hosts', 'ingest', { label: 'POST /v1/logs' }), L('eng', 'query', { arrow: 'both', label: 'GET /search' })],
        flows: [F(['hosts', 'ingest'], { kind: 'data', ret: true, retKind: 'response', n: 2 }), F(['eng', 'query'], { ret: true, retKind: 'data', delay: 0.8 })],
        notes: [
          { at: [4.5, -1.5], text: 'chunk = tenant+labels+time', icon: Layers },
          { at: [4.5, 1.5], text: 'ack only when durable', icon: ShieldCheck, tone: 'good' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'The pipeline',
      tag: 'Design',
      body: [
        '**Agents** on every host tail files, batch and compress. A stateless **ingest tier** authenticates tenants and appends batches to a **durable log** (Kafka-style, 3 replicas). **Parsers** consume it, extract fields, add metadata (pod, region) and build chunks.',
        'Fresh chunks go to a **hot store** on SSD with an index; older chunks move to **object storage**. A **query service** splits each search by time and shard, runs the pieces in parallel and merges results by timestamp.',
      ],
      changes: [
        { sign: '+', text: 'Durable log between ingest and parsing' },
        { sign: '+', text: 'Hot store + object storage' },
        { sign: '+', text: 'Query service' },
      ],
      scene: {
        nodes: lg('hosts', ['ingest', { meter: 40 }], 'bus', ['parser', { meter: 50 }], 'hot', 'cold', 'query', 'eng'),
        links: lgLinks,
        flows: [
          F(['hosts', 'ingest', 'bus', 'parser', 'hot'], { kind: 'data', n: 3 }),
          F(['hot', 'cold'], { kind: 'data', delay: 1.5 }),
          F(['eng', 'query', 'hot'], { ret: true, retKind: 'data', delay: 0.8 }),
        ],
      },
      metrics: { p95: '≈ 1.5 s' },
    },
    {
      short: 'Backpressure',
      title: 'Spikes without losing logs',
      tag: 'Deep Dive',
      body: [
        'Agents send batches of **1 MB or 1 s**, whichever comes first, compressed ~10×, and spool to local disk (say 1 GB) when ingest is slow, retrying with backoff and jitter. An agent must cap its own CPU and memory — it lives on production hosts.',
        'The **durable log** is the shock absorber: ingest acks once data is replicated, so a parser slowdown only grows **consumer lag** instead of pushing back on apps. With 24 h of log retention, parsers can fall hours behind and still catch up.',
      ],
      callout: { kind: 'key', text: 'Decouple accepting a log from processing it. The durable log buys hours; agent spooling buys more.' },
      changes: [{ sign: '~', text: 'Parsers fall behind; the log buffers' }],
      scene: {
        nodes: lg('hosts', ['ingest', { meter: 70 }], ['bus', { items: 12, tag: 'lag 20 min' }], ['parser', { meter: 98, status: 'hot' }], 'hot', 'query', 'eng'),
        links: [L('hosts', 'ingest', { label: '1 MB batches' }), L('ingest', 'bus'), L('bus', 'parser'), L('parser', 'hot'), L('query', 'hot', { arrow: 'both' }), L('eng', 'query', { arrow: 'both' })],
        flows: [
          F(['hosts', 'ingest', 'bus'], { kind: 'data', n: 5, speed: 1.5 }),
          F(['bus', 'parser', 'hot'], { kind: 'data', speed: 0.6, delay: 1 }),
          F(['eng', 'query', 'hot'], { ret: true, retKind: 'data', delay: 1.5 }),
        ],
        notes: [
          { at: [-5.5, -1.8], text: 'agent spools to disk', icon: HardDrive },
          { at: [4.5, -1.5], text: 'ack after 3 replicas', icon: ShieldCheck, tone: 'good' },
        ],
      },
    },
    {
      short: 'Indexing',
      title: 'Index every word, or only labels?',
      tag: 'Trade-off',
      body: [
        'Option A: a full **inverted index** (Elasticsearch-style) maps every term to the lines that contain it. Needle searches are instant, but the index can be as large as the data and indexing 10M lines/s burns a lot of CPU.',
        'Option B (Loki-style): index only a few **labels** (tenant, service, level) and **brute-force scan** matching chunks in parallel. Writes are cheap and storage small; free text costs CPU at query time. I\'d pick B plus per-chunk **bloom filters** for ids like `trace_id`.',
      ],
      callout: { kind: 'tip', text: 'Logs are written once and rarely read, so pay at query time rather than on every write.' },
      scene: {
        nodes: lg('bus', ['parser', { meter: 45 }], ['hot', { tag: 'labels + chunks' }], 'query', 'eng'),
        links: [L('bus', 'parser'), L('parser', 'hot', { label: 'labels only' }), L('query', 'hot', { arrow: 'both', label: 'scan chunks' }), L('eng', 'query', { arrow: 'both' })],
        flows: [F(['bus', 'parser', 'hot'], { kind: 'data', n: 2 }), F(['eng', 'query', 'hot'], { ret: true, retKind: 'data', n: 2, delay: 0.8 })],
        notes: [
          { at: [-5, -1.5], text: 'A: full index ≈ 1× data', tone: 'bad' },
          { at: [-5, 0], text: 'B: label index < 1%', tone: 'good' },
          { at: [4.5, 3.5], text: 'bloom filter per chunk', icon: Search },
        ],
      },
      metrics: { store: '46 TB', p95: '≈ 2 s' },
    },
    {
      short: 'Tiers',
      title: 'Hot, cold and query fan-out',
      tag: 'Deep Dive',
      body: [
        '**Hot** (0–7 days): SSD nodes with 2 replicas, where ~90% of searches land. **Cold** (7 days–1 year): chunks compacted into larger files in **object storage** at ~$20/TB-month, with only the small label index kept on fast disk.',
        'A search like `service=checkout level=error` over 3 days is split into **time × shard** pieces; the index prunes to chunks that can match and hundreds of workers scan them in parallel. Results stream back merged by time, with a limit so the query can stop early.',
      ],
      changes: [{ sign: '+', text: 'Age-based tiering to object storage' }, { sign: '~', text: 'Query fans out per time range and shard' }],
      scene: {
        nodes: lg('parser', ['hot', { tag: '64 hot shards', meter: 55 }], ['cold', { tag: 'cold · 1 year' }], ['query', { meter: 60 }], 'eng'),
        links: [L('parser', 'hot'), L('hot', 'cold'), L('query', 'hot', { arrow: 'both' }), L('query', 'cold', { arrow: 'both' }), L('eng', 'query', { arrow: 'both' })],
        flows: [
          F(['eng', 'query'], { delay: 0 }),
          F(['query', 'hot'], { ret: true, retKind: 'data', n: 4, speed: 1.3, delay: 0.6 }),
          F(['query', 'cold'], { ret: true, retKind: 'data', n: 2, speed: 0.8, delay: 0.9 }),
          F(['hot', 'cold'], { kind: 'data', delay: 1.8 }),
        ],
      },
      metrics: { p95: '≈ 1.2 s', cost: '≈ $350k' },
      hi: ['p95', 'cost'],
    },
    {
      short: 'Cost',
      title: 'Quotas, sampling, noisy tenants',
      tag: 'Deep Dive',
      body: [
        'One team ships a debug build and triples its volume. Each tenant gets an ingest **quota** (a token bucket in bytes/s) at the edge; over quota we return **429** and the agent spools, so one tenant can\'t starve the others or blow the budget.',
        'Cost levers: **sample** DEBUG/INFO at the agent (keep 10%, always keep WARN+), set retention per tenant, and charge teams back for their bytes. Show sampling in the UI so engineers know a missing line may have been sampled out.',
      ],
      changes: [{ sign: '+', text: 'Per-tenant quotas at ingest' }, { sign: '+', text: 'Agent-side sampling' }],
      scene: {
        nodes: lg('hosts', 'noisy', ['ingest', { tag: 'quota / tenant', meter: 55 }], 'bus', 'parser'),
        links: [L('hosts', 'ingest'), L('noisy', 'ingest', { tone: 'bad', dashed: true }), L('ingest', 'bus'), L('bus', 'parser')],
        flows: [
          F(['hosts', 'ingest', 'bus', 'parser'], { kind: 'data', n: 2 }),
          F(['noisy', 'ingest'], { kind: 'error', n: 3, speed: 1.5, stop: true, delay: 0.5 }),
        ],
        notes: [
          { at: [-3.5, 1.5], text: '429 over quota → spool', tone: 'bad' },
          { at: [4, -1.5], text: 'sample DEBUG to 10%', icon: Funnel, tone: 'good' },
        ],
      },
      metrics: { rate: '≈ 3.5 GB/s', store: '≈ 32 TB', cost: '≈ $250k' },
      hi: ['store', 'cost'],
    },
    {
      short: 'Incident',
      title: 'Incident day: 10× logs and searches',
      tag: 'Bottleneck',
      body: [
        'During an outage every service logs errors at once **and** every engineer searches at once. Volume spikes 3–10×, parser lag grows, and broad regex queries over 30 days can saturate the scan workers just when people need answers.',
        'Fixes: autoscale parsers on **consumer lag**; process WARN+ first; separate **read and write** capacity so searches can\'t slow ingestion; and add query guardrails — max bytes scanned, timeouts, and a nudge to narrow the time range.',
      ],
      callout: { kind: 'warn', text: 'Your logging system is most loaded exactly when production is broken. Size it for the incident, not the average day.' },
      scene: {
        nodes: lg('hosts', ['ingest', { meter: 90, status: 'hot' }], ['bus', { items: 14 }], ['parser', { meter: 95, status: 'hot' }], ['hot', { meter: 85 }], 'cold', ['query', { status: 'hot' }], ['eng', { tag: '200 engineers' }]),
        links: lgLinks,
        flows: [
          F(['hosts', 'ingest', 'bus', 'parser', 'hot'], { kind: 'data', n: 6, speed: 1.6 }),
          F(['eng', 'query', 'hot'], { ret: true, retKind: 'data', n: 3, delay: 0.5 }),
          F(['query', 'cold'], { kind: 'error', stop: true, delay: 1.5 }),
        ],
        notes: [{ at: [-5.5, -1.8], text: 'max bytes scanned / query', icon: Gauge, tone: 'warn' }],
      },
      metrics: { rate: '25 GB/s', p95: '8 s' },
      bad: ['rate', 'p95'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Agents batch and spool, a **durable log** absorbs spikes, parsers enrich and build compressed chunks, a **label index + parallel scan** keeps writes cheap, and **tiers** move old chunks to object storage. Queries fan out by time and shard.',
        'In an interview, lead with the write-heavy, read-rarely asymmetry, justify the indexing choice with numbers, and show how quotas and sampling keep the bill bounded.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Make writes cheap and durable, push cost to query time, tier by age, and cap every tenant.' },
      scene: {
        nodes: lg('hosts', ['ingest', { meter: 45 }], 'bus', ['parser', { meter: 55 }], ['hot', { meter: 50 }], 'cold', 'query', 'eng'),
        links: lgLinks,
        flows: [
          F(['hosts', 'ingest', 'bus', 'parser', 'hot'], { kind: 'data', n: 3 }),
          F(['hot', 'cold'], { kind: 'data', delay: 1.4 }),
          F(['eng', 'query', 'hot'], { ret: true, retKind: 'data', delay: 0.6 }),
          F(['query', 'cold'], { ret: true, retKind: 'data', delay: 1.2 }),
        ],
      },
      metrics: { rate: '≈ 3.5 GB/s', p95: '≈ 1.2 s' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Design a Metrics Monitoring System                                  */
/* ------------------------------------------------------------------ */

const mt = cast({
  svcs: { kind: 'slab', at: [-7, -4], tag: '25k targets', icon: Server, tone: 'gray' },
  sys: { kind: 'cube', at: [3, 0], label: 'Metrics', sub: 'black box', icon: Activity, tone: 'gray' },
  scraper: { kind: 'cube', at: [-3.5, -4], label: 'Scraper', sub: 'pull 15 s', icon: Download, tone: 'blue' },
  scrB: { kind: 'cube', at: [-3.5, -0.5], label: 'Scraper', sub: 'replica B', icon: Download, tone: 'blue' },
  jobs: { kind: 'cube', at: [-4, 0], label: 'Jobs', sub: 'batch', icon: Upload, tone: 'gray', size: 'sm' },
  ingest: { kind: 'cube', at: [0, -4], label: 'Ingester', sub: 'WAL + head', icon: Layers, tone: 'blue' },
  tsdb: { kind: 'db', at: [3, -4], tag: 'TSDB', icon: Database },
  obj: { kind: 'slab', at: [7, 0], tag: 'object store', icon: Archive, tone: 'violet' },
  rollup: { kind: 'cube', at: [7, 4], label: 'Rollup', sub: 'downsample', icon: Minimize2, tone: 'blue' },
  query: { kind: 'cube', at: [3, 0], label: 'Query', sub: 'PromQL', icon: Search, tone: 'blue' },
  rules: { kind: 'cube', at: [-0.5, 0], label: 'Rules', sub: 'every 30 s', icon: Sigma, tone: 'yellow' },
  alerts: { kind: 'cube', at: [-4, 0], label: 'Alerts', sub: 'route', icon: BellRing, tone: 'teal' },
  pager: { kind: 'phone', at: [-7, 0], tag: 'on-call', tagIcon: Siren },
  dash: { kind: 'device', at: [-1, 4], tag: 'dashboards', tagIcon: LayoutDashboard },
});

const mtCore = [
  L('svcs', 'scraper'),
  L('scraper', 'ingest'),
  L('ingest', 'tsdb'),
  L('tsdb', 'obj'),
  L('query', 'tsdb', { arrow: 'both' }),
  L('query', 'obj', { arrow: 'both' }),
  L('dash', 'query', { arrow: 'both' }),
];
const mtAlert = [L('rules', 'query', { arrow: 'both' }), L('rules', 'alerts'), L('alerts', 'pager')];

export const qMetrics: Question = {
  id: 'q-metrics',
  n: 31,
  title: 'Design a Metrics Monitoring System',
  blurb: 'Collect 670k samples/s, keep 13 months of history, and page the right person within a minute.',
  minutes: 14,
  level: 'Advanced',
  concepts: ['Time-series DB', 'Aggregation'],
  related: ['observability', 'storage-engines', 'sharding', 'replication', 'batch-stream'],
  followUps: [
    'How would you compute accurate p99 latency across 1,000 hosts?',
    'How would you offer this as a hosted, multi-tenant service?',
    'How do you handle late or out-of-order samples?',
    'How would you alert on a metric that has stopped reporting?',
  ],
  keywords: ['metrics', 'monitoring', 'time series database', 'tsdb', 'prometheus', 'cardinality', 'downsampling', 'alerting', 'gorilla compression'],
  metrics: [
    { id: 'series', label: 'Active series', icon: Layers },
    { id: 'samples', label: 'Samples / s', icon: Activity },
    { id: 'p95', label: 'Query p95', icon: Timer },
    { id: 'disk', label: 'Disk / day', icon: HardDrive },
  ],
  learn: [
    { text: 'The series data model and cardinality', at: 2 },
    { text: 'Pull vs push collection', at: 4 },
    { text: 'TSDB chunks: delta-of-delta and XOR', at: 5 },
    { text: 'Rollups for long retention', at: 6 },
    { text: 'Alert evaluation and routing', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Metrics for 25k targets',
      tag: 'Requirements',
      body: [
        'Brief: collect numeric metrics (CPU, request rates, latencies, queue depths) from **25,000 targets** every 15 s, power **dashboards**, and fire **alerts** within a minute of trouble. Keep raw data 15 days and summaries **13 months** for capacity planning.',
        'Non-functional: dashboard queries **< 1 s**; alerting keeps working when parts of the system fail; losing a node loses no data. Out of scope: logs and traces. The observability lesson covers *what* to measure — here we build the engine.',
      ],
      scene: {
        nodes: mt('svcs', 'sys', 'pager', 'dash'),
        links: [L('svcs', 'sys', { elbow: false }), L('sys', 'pager', { label: 'alerts' }), L('dash', 'sys', { arrow: 'both' })],
        flows: [F(['svcs', 'sys'], { kind: 'data', n: 4 }), F(['dash', 'sys'], { ret: true, retKind: 'data', delay: 0.6 }), F(['sys', 'pager'], { kind: 'event', delay: 1.6 })],
        notes: [
          { at: [-1.5, -4], text: 'alert within 1 min', icon: BellRing },
          { at: [-1.5, -2.5], text: 'dashboards < 1 s', icon: Timer },
          { at: [5, -4], text: 'raw 15 d · rollups 13 mo', icon: Archive },
          { at: [5, -2.5], text: 'Out: logs, traces', tone: 'warn' },
        ],
      },
      metrics: { series: '—', samples: '—', p95: '—', disk: '—' },
    },
    {
      short: 'Numbers',
      title: 'Napkin maths',
      tag: 'Estimation',
      body: [
        '25k targets × ~400 series each ≈ **10M active series**. One sample per series every 15 s gives 10M / 15 ≈ **670k samples/s**. A naive sample is 16 bytes (int64 time + float64 value), so ~0.9 TB/day uncompressed.',
        'Good TSDB compression gets **~1.4 bytes/sample**: ~80 GB/day, ~1.2 TB for 15 days raw. Memory is the tighter limit: each active series costs a few KB in the in-memory head, so 10M series ≈ **30–50 GB of RAM** across ingesters.',
      ],
      scene: {
        nodes: mt('svcs', 'sys', 'pager', 'dash'),
        links: [L('svcs', 'sys', { elbow: false }), L('sys', 'pager'), L('dash', 'sys', { arrow: 'both' })],
        flows: [F(['svcs', 'sys'], { kind: 'data', n: 5, speed: 1.4 }), F(['dash', 'sys'], { ret: true, retKind: 'data', delay: 0.8 })],
        notes: [
          { at: [-1.5, -4], text: '10M series ÷ 15 s', icon: Layers },
          { at: [-1.5, -2.5], text: '≈ 670k samples / s', icon: Activity },
          { at: [5, -4], text: '16 B → 1.4 B / sample', icon: Minimize2, tone: 'good' },
          { at: [5, -2.5], text: 'head RAM ≈ 40 GB', icon: Cpu, tone: 'warn' },
        ],
      },
      metrics: { series: '10M', samples: '670k', disk: '80 GB' },
    },
    {
      short: 'Model',
      title: 'Series, labels and samples',
      tag: 'Data Model',
      body: [
        'A **series** is a metric name plus a sorted label set: `http_requests_total{service="cart",code="500"}`; its id is a hash of that set. Each series is a stream of `(timestamp, float)` **samples**. An **inverted index** maps each `label=value` to series ids.',
        'Every distinct label combination is a new series, so **cardinality** is the product of label values. Add `user_id` with 1M values and one metric becomes 1M series. Labels are for bounded dimensions; ids belong in logs and traces.',
      ],
      callout: { kind: 'warn', text: 'Cardinality, not sample rate, is what kills a TSDB. Budget series per team the way you budget money.' },
      scene: {
        nodes: mt('svcs', 'scraper', 'ingest', 'tsdb'),
        links: [L('svcs', 'scraper'), L('scraper', 'ingest'), L('ingest', 'tsdb')],
        flows: [F(['svcs', 'scraper', 'ingest', 'tsdb'], { kind: 'data', n: 3 })],
        notes: [
          { at: [-2, -1], text: 'name + labels → series id', icon: Layers },
          { at: [-2, 0.5], text: 'label=value → series ids', icon: Search },
          { at: [-2, 2], text: 'user_id label = 1M series', icon: Flame, tone: 'bad' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Collect, store, query, alert',
      tag: 'Design',
      body: [
        '**Scrapers** pull `/metrics` from targets found via service discovery and forward samples to **ingesters**, which append to a WAL and an in-memory **head block**. Every 2 h the head becomes an immutable **block**, shipped to **object storage**.',
        'A **query** engine answers PromQL-style queries for **dashboards** over head and blocks. A **rule evaluator** runs alert expressions every 30 s and sends firing alerts to an **Alertmanager**, which pages the right team.',
      ],
      changes: [
        { sign: '+', text: 'Scrapers and ingesters' },
        { sign: '+', text: 'TSDB + object storage' },
        { sign: '+', text: 'Query, rules and alert routing' },
      ],
      scene: {
        nodes: mt('svcs', ['scraper', { meter: 40 }], ['ingest', { meter: 50 }], 'tsdb', 'obj', 'query', 'rules', 'alerts', 'pager', 'dash'),
        links: [...mtCore, ...mtAlert],
        flows: [
          F(['svcs', 'scraper', 'ingest', 'tsdb'], { kind: 'data', n: 3 }),
          F(['dash', 'query', 'tsdb'], { ret: true, retKind: 'data', delay: 0.8 }),
          F(['rules', 'alerts', 'pager'], { kind: 'event', delay: 1.6 }),
        ],
      },
      metrics: { p95: '≈ 300 ms' },
    },
    {
      short: 'Collection',
      title: 'Pull vs push collection',
      tag: 'Deep Dive',
      body: [
        '**Pull**: the scraper controls the rate, a missing target shows up as `up == 0`, and you can curl `/metrics` to debug. **Push** suits short-lived batch jobs that finish before a scrape arrives, and clients behind NAT. I\'d pull by default and give jobs a push endpoint.',
        'The cost of push: you can\'t tell "dead" from "quiet" without heartbeats, and a buggy client can flood you, so push endpoints need per-tenant **rate limits**. Either way, the ingest path and storage are identical.',
      ],
      changes: [{ sign: '+', text: 'Push endpoint for batch jobs' }],
      scene: {
        nodes: mt('svcs', ['scraper', { meter: 45 }], 'jobs', ['ingest', { meter: 55 }], 'tsdb'),
        links: [L('svcs', 'scraper', { label: 'GET /metrics', arrow: 'both' }), L('scraper', 'ingest'), L('jobs', 'ingest', { label: 'push' }), L('ingest', 'tsdb')],
        flows: [
          F(['scraper', 'svcs'], { ret: true, retKind: 'data', n: 2 }),
          F(['scraper', 'ingest', 'tsdb'], { kind: 'data', delay: 0.8 }),
          F(['jobs', 'ingest'], { kind: 'data', delay: 1.4 }),
        ],
        notes: [
          { at: [-7, -1.5], text: 'up == 0 → target down', tone: 'good' },
          { at: [3, -1.5], text: 'push: rate-limit it', tone: 'warn' },
        ],
      },
    },
    {
      short: 'Storage',
      title: 'Inside a TSDB chunk',
      tag: 'Deep Dive',
      body: [
        'Samples are packed per series into **chunks** of ~120 points. Timestamps arrive at steady intervals, so store **delta-of-delta**: 15 s, 15 s, 15 s becomes 0, 0, 0 — about one bit each. Values change little, so **XOR** each float with the previous one and store only the differing bits.',
        'Together that is ~1.4 bytes/sample instead of 16. New samples hit a **WAL** for crash safety and the in-memory head; every 2 h the head is flushed as an immutable block with its own index, later **compacted** into bigger blocks.',
      ],
      callout: { kind: 'tip', text: 'Compression works because metrics are regular. Jittery scrape intervals or noisy values compress worse.' },
      scene: {
        nodes: mt('scraper', ['ingest', { meter: 60, tag: 'head (2 h)' }], ['tsdb', { tag: 'blocks' }], 'obj'),
        links: [L('scraper', 'ingest'), L('ingest', 'tsdb', { label: 'flush' }), L('tsdb', 'obj', { label: 'ship' })],
        flows: [F(['scraper', 'ingest'], { kind: 'data', n: 3 }), F(['ingest', 'tsdb', 'obj'], { kind: 'data', delay: 1.2 })],
        notes: [
          { at: [-3, 0], text: 'ts: 15,15,15 → 0,0,0', icon: Timer },
          { at: [-3, 1.5], text: 'value: XOR with previous', icon: Sigma },
          { at: [-3, 3], text: '16 B → ~1.4 B / sample', tone: 'good' },
        ],
      },
      metrics: { disk: '80 GB' },
      hi: ['disk'],
    },
    {
      short: 'Rollups',
      title: 'Downsampling and aggregation',
      tag: 'Deep Dive',
      body: [
        'A 13-month graph at 15 s resolution is 2.3M points per series — nobody needs that. A **rollup** job rewrites old blocks at **5 min** and **1 h** resolution, keeping `min`, `max`, `sum` and `count` per window so averages and peaks stay correct.',
        'A query like `sum by (region)(rate(http_requests_total[5m]))` finds series via the index, decodes only chunks in range and aggregates in parallel. The query layer picks raw or rolled-up data by range, and caches results for dashboard refreshes.',
      ],
      changes: [{ sign: '+', text: 'Rollup / compaction job' }],
      scene: {
        nodes: mt('tsdb', ['obj', { tag: 'raw + 5m + 1h' }], 'rollup', ['query', { meter: 45 }], 'dash'),
        links: [L('tsdb', 'obj'), L('obj', 'rollup', { arrow: 'both' }), L('query', 'tsdb', { arrow: 'both' }), L('query', 'obj', { arrow: 'both' }), L('dash', 'query', { arrow: 'both' })],
        flows: [
          F(['obj', 'rollup'], { kind: 'data', ret: true, retKind: 'data' }),
          F(['dash', 'query', 'obj'], { ret: true, retKind: 'data', delay: 0.8 }),
          F(['query', 'tsdb'], { ret: true, retKind: 'data', delay: 1.4 }),
        ],
        notes: [{ at: [-3, -1.5], text: '13 mo @1h = 9.5k pts', icon: Minimize2, tone: 'good' }],
      },
      metrics: { p95: '≈ 400 ms' },
    },
    {
      short: 'Alerting',
      title: 'Rules, routing and paging',
      tag: 'Deep Dive',
      body: [
        'The rule evaluator runs each expression every 30 s, e.g. error rate > 2% `for: 5m`; the `for` clause stops flapping. **Alertmanager** **groups** related alerts, **dedupes** repeats from HA pairs, silences planned work and routes by `team` label.',
        'Alerting must be the most reliable path: evaluate rules close to fresh data, not via long-term storage, and run a **dead man\'s switch** — an always-firing alert whose silence at an external service means monitoring itself is down.',
      ],
      callout: { kind: 'warn', text: 'Who monitors the monitor? Something outside the system must notice when alerts stop flowing.' },
      scene: {
        nodes: mt('ingest', 'tsdb', ['query', { meter: 40 }], ['rules', { meter: 35 }], 'alerts', ['pager', { tag: 'payments on-call' }]),
        links: [L('ingest', 'tsdb'), L('query', 'tsdb', { arrow: 'both' }), ...mtAlert],
        flows: [
          F(['rules', 'query', 'tsdb'], { ret: true, retKind: 'data' }),
          F(['rules', 'alerts', 'pager'], { kind: 'event', delay: 1.4 }),
        ],
        notes: [
          { at: [-5.5, -2], text: 'group · dedupe · route', icon: BellRing },
          { at: [-0.5, 2.5], text: 'error rate > 2% for 5m', icon: Sigma },
        ],
      },
    },
    {
      short: 'Cardinality',
      title: 'Series explosion and lost nodes',
      tag: 'Bottleneck',
      body: [
        'A deploy adds a `request_id` label: series jump from 10M to **200M** in minutes, ingester memory blows up and OOM kills cascade. Fix: per-tenant **series limits** enforced at ingest, relabel rules that drop bad labels, and an alert on series growth.',
        'Losing an ingester must not lose data: spread series over ingesters with a **hash ring** and write every sample to **3 replicas**; queries dedupe. Run scrapers as **HA pairs** too, so one crash leaves the other still pulling every target.',
      ],
      changes: [{ sign: '+', text: 'Scraper replica B' }, { sign: '+', text: 'Series limits at ingest' }],
      scene: {
        nodes: mt('svcs', 'scraper', 'scrB', ['ingest', { meter: 97, status: 'hot', tag: '× 3 replicas' }], 'tsdb'),
        links: [L('svcs', 'scraper'), L('svcs', 'scrB'), L('scraper', 'ingest'), L('scrB', 'ingest'), L('ingest', 'tsdb')],
        flows: [
          F(['svcs', 'scraper', 'ingest'], { kind: 'data', n: 4, speed: 1.5 }),
          F(['svcs', 'scrB', 'ingest'], { kind: 'data', n: 2, delay: 0.5 }),
          F(['ingest', 'tsdb'], { kind: 'error', stop: true, delay: 1.4 }),
        ],
        notes: [
          { at: [3, -1.5], text: '+request_id → 200M series', tone: 'bad' },
          { at: [3, 0], text: 'limit: 1M series / team', tone: 'good' },
        ],
      },
      metrics: { series: '200M', p95: '6 s' },
      bad: ['series', 'p95'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Scrapers pull (jobs push) into replicated **ingesters** with a WAL and head block; compressed blocks go to object storage and get **rolled up** for long retention; a query layer aggregates over them. Rules run near fresh data and **Alertmanager** routes pages.',
        'In an interview, define the series model early, flag **cardinality** as the main risk, and show why compression and rollups make 13 months of history affordable.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'A metrics system is a cardinality-bound, append-only store: cap series, compress regular samples, roll up old data.' },
      scene: {
        nodes: mt('svcs', ['scraper', { meter: 40 }], ['ingest', { meter: 50 }], 'tsdb', 'obj', 'rollup', 'query', 'rules', 'alerts', 'pager', 'dash'),
        links: [...mtCore, L('obj', 'rollup', { arrow: 'both' }), ...mtAlert],
        flows: [
          F(['svcs', 'scraper', 'ingest', 'tsdb', 'obj'], { kind: 'data', n: 2 }),
          F(['dash', 'query', 'obj'], { ret: true, retKind: 'data', delay: 0.8 }),
          F(['rules', 'alerts', 'pager'], { kind: 'event', delay: 1.6 }),
        ],
      },
      metrics: { series: '10M', p95: '≈ 400 ms' },
    },
  ],
};
/* ------------------------------------------------------------------ */
/* Design a Multi-Region System                                        */
/* ------------------------------------------------------------------ */

const mr = cast({
  eu: { kind: 'crowd', at: [-7, -3.5], tag: 'EU users', tagIcon: Users, items: 5 },
  us: { kind: 'crowd', at: [-7, 3.5], tag: 'US users', tagIcon: Users, items: 5 },
  dns: { kind: 'cube', at: [-3.5, 0], label: 'GeoDNS', sub: 'anycast', icon: Globe, tone: 'teal' },
  appEU: { kind: 'cube', at: [0, -3.5], label: 'EU app', sub: 'eu-west', icon: Server, tone: 'blue' },
  appUS: { kind: 'cube', at: [0, 3.5], label: 'US app', sub: 'us-east', icon: Server, tone: 'blue' },
  dbEU: { kind: 'db', at: [3.5, -3.5], tag: 'EU data', icon: Database },
  dbUS: { kind: 'db', at: [3.5, 3.5], tag: 'US data', icon: Database },
  global: { kind: 'db', at: [7, 0], tag: 'quorum store', icon: Landmark, tone: 'yellow' },
});

const mrRoute = [
  L('eu', 'dns'),
  L('us', 'dns'),
  L('dns', 'appEU'),
  L('dns', 'appUS'),
  L('appEU', 'dbEU', { arrow: 'both' }),
  L('appUS', 'dbUS', { arrow: 'both' }),
];

export const qMultiRegion: Question = {
  id: 'q-multi-region',
  n: 35,
  title: 'Design a Multi-Region System',
  blurb: 'Take a single-region app global: local latency everywhere, and a region can vanish without an outage.',
  minutes: 14,
  level: 'Advanced',
  concepts: ['Failover', 'Replication', 'Consistency'],
  related: ['redundancy', 'replication', 'cap', 'consensus', 'load-balancing'],
  followUps: [
    'How would you keep EU users\' data inside the EU for compliance?',
    'How would you move a user\'s home region when they relocate?',
    'How do you invalidate caches in every region after a write?',
    'How would you roll out a schema migration across all regions safely?',
  ],
  keywords: ['multi-region', 'geo dns', 'anycast', 'active-active', 'active-passive', 'failover', 'rpo', 'rto', 'conflict resolution', 'disaster recovery'],
  metrics: [
    { id: 'lat', label: 'EU page p95', icon: Timer },
    { id: 'rpo', label: 'RPO', icon: Hourglass },
    { id: 'rto', label: 'RTO', icon: Clock },
    { id: 'cost', label: 'Infra cost', icon: DollarSign },
  ],
  learn: [
    { text: 'Classifying data by consistency need', at: 2 },
    { text: 'Active-passive vs active-active', at: 4 },
    { text: 'Home regions and conflict resolution', at: 5 },
    { text: 'Quorum stores for global invariants', at: 6 },
    { text: 'Failover, fencing, RPO and RTO', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Taking a US app global',
      tag: 'Requirements',
      body: [
        'Brief: a shopping app runs in one US region. Half of its **20M daily users** are now in Europe and see slow pages, and last year a region outage took the business down for 6 hours. Goal: serve users from a **nearby region** and **survive losing a region**.',
        'Targets: EU page p95 **< 150 ms**; RTO **< 5 min**; RPO **< 5 s** for most data and **zero** for payments; usernames and emails stay **globally unique**. Out of scope: residency law details and rewriting the app.',
      ],
      scene: {
        nodes: mr('eu', 'us', ['appUS', { label: 'App', tag: 'us-east only', meter: 60 }], 'dbUS'),
        links: [L('eu', 'appUS', { label: '≈ 90 ms RTT', tone: 'bad' }), L('us', 'appUS'), L('appUS', 'dbUS', { arrow: 'both' })],
        flows: [F(['eu', 'appUS'], { ret: true, speed: 0.6 }), F(['us', 'appUS', 'dbUS'], { ret: true, delay: 0.8 })],
        notes: [
          { at: [3.5, -3.5], text: 'EU p95 < 150 ms', icon: Timer },
          { at: [3.5, -2], text: 'RTO < 5 min · RPO < 5 s', icon: Clock },
          { at: [3.5, -0.5], text: 'payments: RPO = 0', icon: DollarSign, tone: 'warn' },
        ],
      },
      metrics: { lat: '650 ms', rpo: 'hours', rto: '6 h', cost: '1×' },
      bad: ['lat', 'rto'],
    },
    {
      short: 'Numbers',
      title: 'Where the time and money go',
      tag: 'Estimation',
      body: [
        'Frankfurt ↔ Virginia is **~90 ms** round trip. A page with TLS setup plus 4 sequential backend calls pays that 6–7 times: **~600 ms** before any real work. No server tuning beats the speed of light — the data has to move closer.',
        'Writes are **~5k/s** × 1 KB ≈ 5 MB/s to replicate across the ocean (~13 TB/month — cheap). The real cost is capacity: each region must absorb the other\'s load in a failover, so two regions need **~2×** today\'s fleet, not 1.5×.',
      ],
      scene: {
        nodes: mr('eu', 'us', ['appUS', { label: 'App', tag: 'us-east only', meter: 60 }], 'dbUS'),
        links: [L('eu', 'appUS', { tone: 'bad' }), L('us', 'appUS'), L('appUS', 'dbUS', { arrow: 'both' })],
        flows: [F(['eu', 'appUS'], { ret: true, n: 3, speed: 0.6 }), F(['us', 'appUS'], { ret: true, delay: 0.8 })],
        notes: [
          { at: [3.5, -3.5], text: '7 RTTs × 90 ms ≈ 630 ms', icon: Timer, tone: 'bad' },
          { at: [3.5, -2], text: 'repl ≈ 5 MB/s · 13 TB/mo', icon: Wifi },
          { at: [3.5, -0.5], text: 'failover headroom → 2×', icon: DollarSign, tone: 'warn' },
        ],
      },
      metrics: { cost: '≈ 2× (plan)' },
    },
    {
      short: 'Data',
      title: 'Classify the data first',
      tag: 'Data Model',
      body: [
        'Not all data needs the same guarantees. **Catalog and prices**: read-mostly, replicate everywhere. **Profiles, carts, orders**: owned by one user — give each user a **home region** (`users.home_region`) and write there. **Sessions**: regional and rebuildable.',
        '**Global invariants** — unique usernames/emails, the payment ledger, stock counts — need **strong consistency** across regions. Keep this set as small as possible: every strongly consistent write pays a cross-region round trip.',
      ],
      callout: { kind: 'key', text: 'Decide consistency per data type, not per system. Most data can be eventual; a few invariants cannot.' },
      scene: {
        nodes: mr('eu', 'us', 'appEU', 'appUS', 'dbEU', 'dbUS'),
        links: [L('eu', 'appEU', { arrow: 'both' }), L('us', 'appUS', { arrow: 'both' }), L('appEU', 'dbEU', { arrow: 'both' }), L('appUS', 'dbUS', { arrow: 'both' })],
        flows: [F(['eu', 'appEU', 'dbEU'], { ret: true, retKind: 'data' }), F(['us', 'appUS', 'dbUS'], { ret: true, retKind: 'data', delay: 0.8 })],
        notes: [
          { at: [-3, -1.2], text: 'catalog → everywhere', icon: Globe, tone: 'good' },
          { at: [-3, 0], text: 'cart, orders → home region', icon: User },
          { at: [-3, 1.2], text: 'sessions → regional', icon: Clock },
          { at: [5, 0], text: 'unique ids, money → strong', icon: Landmark, tone: 'warn' },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Route to the nearest region',
      tag: 'Design',
      body: [
        '**GeoDNS** (or an **anycast** IP on a global load balancer) sends each user to the closest healthy region. Each region runs the full stateless stack plus its own copy of the data, so reads are local and a page needs **no ocean crossings**.',
        'Start **active-passive**: the US primary takes writes and the EU holds an async **replica** that serves reads. EU users read locally but their writes cross the ocean — acceptable for a shop where reads outnumber writes ~20:1.',
      ],
      changes: [
        { sign: '+', text: 'GeoDNS / anycast routing' },
        { sign: '+', text: 'EU region with read replica' },
      ],
      scene: {
        nodes: mr('eu', 'us', 'dns', ['appEU', { meter: 45 }], ['appUS', { meter: 50 }], ['dbEU', { tag: 'EU replica' }], ['dbUS', { tag: 'US primary' }]),
        links: [...mrRoute, L('dbUS', 'dbEU', { label: 'async repl', dashed: true })],
        flows: [
          F(['eu', 'dns', 'appEU', 'dbEU'], { ret: true, retKind: 'data' }),
          F(['us', 'dns', 'appUS', 'dbUS'], { ret: true, retKind: 'data', delay: 0.7 }),
          F(['dbUS', 'dbEU'], { kind: 'data', delay: 1.6 }),
        ],
      },
      metrics: { lat: '120 ms', rpo: '≈ 1 s', rto: '≈ 15 min', cost: '≈ 2×' },
      hi: ['lat', 'rpo', 'rto'],
      bad: ['cost'],
    },
    {
      short: 'Act-act',
      title: 'Active-passive vs active-active',
      tag: 'Trade-off',
      body: [
        '**Active-passive**: one writable region. Simple and conflict-free, but remote users pay latency on every write, and failover means **promoting** a replica — minutes without writes and possibly lost async writes.',
        '**Active-active**: every region takes writes. Writes are local and failover is just rerouting, but two regions can change the same row at once, so you need **conflict handling**. My pick: active-active with **home-region ownership**, so each row still has one writer.',
      ],
      changes: [{ sign: '~', text: 'Both regions accept writes' }],
      scene: {
        nodes: mr('eu', 'us', 'dns', ['appEU', { meter: 50 }], ['appUS', { meter: 50 }], ['dbEU', { tag: 'EU primary' }], ['dbUS', { tag: 'US primary' }]),
        links: [...mrRoute, L('dbUS', 'dbEU', { label: 'async, both ways', dashed: true, arrow: 'both' })],
        flows: [
          F(['eu', 'dns', 'appEU', 'dbEU'], { kind: 'data', ret: true }),
          F(['us', 'dns', 'appUS', 'dbUS'], { kind: 'data', ret: true, delay: 0.7 }),
          F(['dbEU', 'dbUS'], { kind: 'data', delay: 1.4 }),
          F(['dbUS', 'dbEU'], { kind: 'data', delay: 2 }),
        ],
      },
      metrics: { lat: '90 ms', rto: '≈ 2 min' },
      hi: ['lat', 'rto'],
    },
    {
      short: 'Replication',
      title: 'Home regions and conflicts',
      tag: 'Deep Dive',
      body: [
        'With **home regions**, a user\'s rows are written only in their home region and replicated async to the others. A request landing elsewhere (travel, failover) **forwards** its writes home. One writer per row means no conflicts in the normal case.',
        'Where multi-writer is unavoidable (a cart edited from two devices during a failover), resolve deterministically: **last-writer-wins** with hybrid clocks for simple fields, **CRDTs** or merge rules (union of cart items) for collections. Never LWW a balance.',
      ],
      callout: { kind: 'warn', text: 'Last-writer-wins silently drops updates. Fine for a display name; wrong for anything an auditor might ask about.' },
      scene: {
        nodes: mr(['eu', { tag: 'US user in Paris' }], 'us', 'dns', 'appEU', 'appUS', ['dbEU', { tag: 'EU homes' }], ['dbUS', { tag: 'US homes' }]),
        links: [...mrRoute, L('appEU', 'dbUS', { label: 'forward write', dashed: true }), L('dbUS', 'dbEU', { dashed: true })],
        flows: [
          F(['eu', 'dns', 'appEU', 'dbEU'], { ret: true, retKind: 'data' }),
          F(['appEU', 'dbUS'], { kind: 'data', delay: 1 }),
          F(['dbUS', 'dbEU'], { kind: 'data', delay: 1.8 }),
        ],
        notes: [{ at: [6, -2], text: 'cart: merge, not LWW', icon: Layers, tone: 'good' }],
      },
    },
    {
      short: 'Strong',
      title: 'The few things that must agree',
      tag: 'Deep Dive',
      body: [
        'Usernames, emails, the ledger and stock counts live in a **globally consistent store**: consensus-replicated (Spanner/CockroachDB-style) with replicas in **3 regions**, so a quorum survives losing one. Per CAP, a partitioned minority refuses these writes.',
        'The price is latency: each such write waits for a cross-region quorum (**~70–100 ms**). Keep it off the hot path — checkout and sign-up can afford it; browsing and cart edits stay on local, eventually consistent data.',
      ],
      changes: [{ sign: '+', text: 'Quorum store across 3 regions' }],
      scene: {
        nodes: mr('eu', 'us', 'dns', 'appEU', 'appUS', 'dbEU', 'dbUS', ['global', { tag: 'quorum · 3 regions' }]),
        links: [...mrRoute, L('appEU', 'global', { first: 'u', arrow: 'both' }), L('appUS', 'global', { first: 'v', arrow: 'both' })],
        flows: [
          F(['eu', 'dns', 'appEU', 'global'], { ret: true, retKind: 'response' }),
          F(['us', 'dns', 'appUS', 'global'], { ret: true, retKind: 'response', delay: 0.9 }),
          F(['appEU', 'dbEU'], { ret: true, retKind: 'data', delay: 1.8 }),
        ],
        notes: [{ at: [6.5, -2.5], text: 'checkout: +80 ms', icon: Timer, tone: 'warn' }],
      },
      metrics: { rpo: '0 for money' },
      hi: ['rpo'],
    },
    {
      short: 'Failover',
      title: 'Evacuating a region',
      tag: 'Deep Dive',
      body: [
        'EU health checks fail, so **GeoDNS/anycast** stops sending traffic there (low DNS TTL, ~30–60 s). EU users\' rows fail over to their US replicas; async writes not yet replicated (~1 s worth) are the **RPO**, reconciled when EU returns.',
        '**Fence** the old region so it cannot take writes if it half-recovers (split brain). And practise: run regular **evacuation drills** — drain a healthy region on purpose — so failover is a routine button, not a 3 a.m. experiment.',
      ],
      changes: [{ sign: '-', text: 'EU region (down)' }, { sign: '~', text: 'All traffic to US' }],
      scene: {
        nodes: mr('eu', 'us', 'dns', ['appEU', { status: 'down' }], ['appUS', { meter: 85 }], ['dbEU', { status: 'down', tag: 'fenced' }], ['dbUS', { tag: 'now primary' }]),
        links: [
          L('eu', 'dns'),
          L('us', 'dns'),
          L('dns', 'appEU', { tone: 'bad', dashed: true }),
          L('dns', 'appUS'),
          L('appUS', 'dbUS', { arrow: 'both' }),
          L('dbUS', 'dbEU', { tone: 'bad', dashed: true }),
        ],
        flows: [
          F(['dns', 'appEU'], { kind: 'error', stop: true }),
          F(['eu', 'dns', 'appUS', 'dbUS'], { ret: true, delay: 0.6 }),
          F(['us', 'dns', 'appUS'], { ret: true, delay: 1.2 }),
        ],
        notes: [{ at: [-7, 0], text: 'DNS TTL 30 s', icon: Clock }],
      },
      metrics: { lat: '120 ms', rpo: '≈ 1 s', rto: '≈ 2 min' },
    },
    {
      short: 'Surge',
      title: 'The surviving region melts',
      tag: 'Bottleneck',
      body: [
        'After failover the US region suddenly carries **2× traffic** with cold caches for EU users, while every client retries at once. Sized at 70% utilisation, it now needs 140% — and the outage spreads to the region that was meant to save you.',
        'Fixes: keep **headroom** (with N regions, run each below (N−1)/N) or autoscale with pre-warmed capacity; **shed** low-priority traffic; jitter client retries; warm caches gradually. Three regions at ≤ 66% is often cheaper than two at ≤ 50%.',
      ],
      callout: { kind: 'tip', text: 'Failover capacity is part of the design, not an afterthought. Test it by actually draining a region.' },
      scene: {
        nodes: mr(['eu', { items: 7 }], ['us', { items: 7 }], ['dns', { meter: 70 }], ['appEU', { status: 'down' }], ['appUS', { meter: 100, status: 'hot' }], ['dbEU', { status: 'down' }], ['dbUS', { meter: 90, status: 'hot' }]),
        links: [L('eu', 'dns'), L('us', 'dns'), L('dns', 'appUS'), L('appUS', 'dbUS', { arrow: 'both' })],
        flows: [
          F(['eu', 'dns', 'appUS'], { n: 3, speed: 1.4 }),
          F(['us', 'dns', 'appUS'], { n: 3, speed: 1.4, delay: 0.4 }),
          F(['appUS', 'dbUS'], { kind: 'error', stop: true, delay: 1.2 }),
        ],
        notes: [{ at: [4, 0], text: '70% × 2 = 140% load', tone: 'bad' }],
      },
      metrics: { lat: '900 ms', rto: '∞ (cascade)' },
      bad: ['lat', 'rto'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Route users to the **nearest region**, keep the stack stateless, give each user a **home region** for writes with async replication elsewhere, and put the few global invariants in a **quorum store** across 3 regions. Drill failover and keep headroom.',
        'In an interview, classify data by consistency need before drawing boxes, state RPO/RTO targets, and be honest about the bill: going multi-region roughly doubles infrastructure cost.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Local reads, single-owner writes, strong consistency only for invariants — and rehearse losing a region.' },
      scene: {
        nodes: mr('eu', 'us', 'dns', ['appEU', { meter: 45 }], ['appUS', { meter: 45 }], 'dbEU', 'dbUS', 'global'),
        links: [...mrRoute, L('dbUS', 'dbEU', { dashed: true, arrow: 'both' }), L('appEU', 'global', { first: 'u', arrow: 'both' }), L('appUS', 'global', { first: 'v', arrow: 'both' })],
        flows: [
          F(['eu', 'dns', 'appEU', 'dbEU'], { ret: true, retKind: 'data' }),
          F(['us', 'dns', 'appUS', 'dbUS'], { ret: true, retKind: 'data', delay: 0.7 }),
          F(['appUS', 'global'], { ret: true, delay: 1.5 }),
        ],
      },
      metrics: { lat: '90 ms', rpo: '≈ 1 s', rto: '≈ 2 min', cost: '≈ 2×' },
    },
  ],
};
/* ------------------------------------------------------------------ */
/* Design an Online Gaming Backend                                     */
/* ------------------------------------------------------------------ */

const gm = cast({
  players: { kind: 'crowd', at: [-7, 0], tag: 'players', tagIcon: Users, items: 6 },
  sys: { kind: 'cube', at: [0, 0], label: 'Backend', sub: 'black box', icon: Gamepad2, tone: 'gray' },
  lobby: { kind: 'cube', at: [-3.5, -3.5], label: 'Lobby', sub: 'HTTPS API', icon: Gamepad2, tone: 'green' },
  mm: { kind: 'cube', at: [0, -3.5], label: 'Match', sub: 'matchmaker', icon: Swords, tone: 'blue' },
  fleet: { kind: 'cube', at: [3.5, -3.5], label: 'Fleet', sub: 'allocator', icon: Boxes, tone: 'yellow' },
  pool: { kind: 'slab', at: [7, 0], tag: 'warm servers', icon: Server, tone: 'gray' },
  game: { kind: 'cube', at: [0, 0], label: 'Game srv', sub: '60 Hz tick', icon: Cpu, tone: 'blue' },
  profile: { kind: 'db', at: [-3.5, 3.5], tag: 'player data', icon: Backpack },
  board: { kind: 'cube', at: [3.5, 3.5], label: 'Leaders', sub: 'sorted set', icon: Trophy, tone: 'orange' },
  cheat: { kind: 'device', at: [-3.5, 3.5], tag: 'cheater', tagIcon: Skull },
});

const gmLinks = [
  L('players', 'lobby', { arrow: 'both' }),
  L('lobby', 'mm'),
  L('mm', 'fleet'),
  L('fleet', 'game', { label: 'allocate' }),
  L('players', 'game', { arrow: 'both', label: 'UDP' }),
  L('lobby', 'profile', { arrow: 'both' }),
  L('game', 'profile', { label: 'results' }),
  L('game', 'board'),
];

export const qGaming: Question = {
  id: 'q-gaming',
  n: 36,
  title: 'Design an Online Gaming Backend',
  blurb: 'Matchmake 2M players into fair 10-player matches on authoritative servers that feel lag-free.',
  minutes: 15,
  level: 'Advanced',
  concepts: ['Real-time', 'State Synchronization'],
  related: ['realtime', 'stateless', 'load-balancing', 'caching', 'sharding'],
  followUps: [
    'How would a player reconnect to a match after a disconnect?',
    'How would you matchmake a party of 3 with very different skill ratings?',
    'How would you scale this to a 100-player battle royale?',
    'How would you detect a game server reporting fake results?',
  ],
  keywords: ['online gaming', 'multiplayer', 'matchmaking', 'game server', 'tick rate', 'client-side prediction', 'lag compensation', 'udp', 'leaderboard', 'anti-cheat'],
  metrics: [
    { id: 'ccu', label: 'Players online', icon: Users },
    { id: 'wait', label: 'Time to match', icon: Hourglass },
    { id: 'tick', label: 'Server tick', icon: Timer },
    { id: 'lag', label: 'Felt input lag', icon: Gauge },
  ],
  learn: [
    { text: 'Matchmaking on skill, region and ping', at: 4 },
    { text: 'Authoritative servers and fixed ticks over UDP', at: 5 },
    { text: 'Prediction, reconciliation, lag compensation', at: 6 },
    { text: 'Anti-cheat: never trust the client', at: 7 },
    { text: 'Persisting results and sharding leaderboards', at: 8 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'A 10-player online shooter',
      tag: 'Requirements',
      body: [
        'Brief: the backend for a fast shooter with **10-player matches** (5v5, ~20 min). Players log in, queue, get a **fair match** with similar skill and low ping, play, then see XP, rewards and a **leaderboard**. Target: **2M concurrent** players worldwide.',
        'Non-functional: play must feel instant (round trip to the server **< 80 ms**), cheating must be hard, and a crashed server must never wipe an inventory. Out of scope: the store and payments, voice chat, replays and the game client itself.',
      ],
      scene: {
        nodes: gm('players', 'sys'),
        links: [L('players', 'sys', { arrow: 'both', label: 'play' })],
        flows: [F(['players', 'sys'], { ret: true, n: 3 })],
        notes: [
          { at: [-2, -3], text: 'fair: skill + ping', icon: Swords },
          { at: [-2, 3], text: 'RTT < 80 ms', icon: Timer },
          { at: [4, -1.5], text: '2M players online', icon: Users },
          { at: [4, 1.5], text: 'Out: store, voice, replays', tone: 'warn' },
        ],
      },
      metrics: { ccu: '2M', wait: '—', tick: '—', lag: '—' },
    },
    {
      short: 'Numbers',
      title: 'Napkin maths',
      tag: 'Estimation',
      body: [
        '2M players / 10 per match = **200k live matches**. A match process needs ~1 core at 60 Hz, so ~200k cores ≈ **6k 32-core servers** across ~8 regions. With 20-min matches, ~**1,700 players/s** enter matchmaking.',
        'Each client sends inputs at 60 Hz (~50 B each, **3 KB/s** up) and gets delta snapshots at ~30 Hz (~1 KB each, **30 KB/s** down). Across 2M players that is ~**60 GB/s** of egress — a big bill, so snapshot size matters.',
      ],
      scene: {
        nodes: gm('players', 'sys'),
        links: [L('players', 'sys', { arrow: 'both' })],
        flows: [F(['players', 'sys'], { ret: true, n: 4, speed: 1.4 })],
        notes: [
          { at: [-2, -3], text: '200k matches · 6k servers', icon: Server },
          { at: [-2, 3], text: '≈ 1,700 joins / s', icon: Swords },
          { at: [4, -1.5], text: 'up 3 KB/s · down 30 KB/s', icon: Wifi },
          { at: [4, 1.5], text: 'egress ≈ 60 GB/s', icon: DollarSign, tone: 'warn' },
        ],
      },
      metrics: { tick: '60 Hz' },
    },
    {
      short: 'API',
      title: 'Lobby API and game protocol',
      tag: 'API',
      body: [
        'Lobby (HTTPS): `POST /matchmaking/tickets {mode, party}` returns a ticket id; the client waits on a push channel for `{server_ip, port, join_token}`. `GET /players/me` returns profile, inventory and rank from an ordinary database.',
        'Game protocol (UDP): client → server `Input{seq, tick, move, aim, buttons}`; server → client `Snapshot{tick, last_input_seq, deltas}`. The `join_token` is signed, so only the matched players can join that server.',
      ],
      scene: {
        nodes: gm('players', 'lobby', 'game'),
        links: [L('players', 'lobby', { arrow: 'both', label: 'HTTPS' }), L('players', 'game', { arrow: 'both', label: 'UDP' })],
        flows: [
          F(['players', 'lobby'], { ret: true }),
          F(['players', 'game'], { kind: 'event', ret: true, retKind: 'data', n: 3, speed: 1.5, delay: 0.8 }),
        ],
        notes: [
          { at: [4, -1.5], text: 'Input{seq, tick, aim}', icon: Gamepad2 },
          { at: [4, 1.5], text: 'Snapshot{tick, deltas}', icon: Layers },
        ],
      },
    },
    {
      short: 'Design',
      title: 'Lobby, matchmaker, fleet, servers',
      tag: 'Design',
      body: [
        'Players hit a stateless **lobby** that reads **player data** (inventory, progress) from a database. Queueing creates a ticket for the **matchmaker**; when a match forms, the **fleet allocator** hands out a ready **dedicated game server** in the right region.',
        'Players then talk UDP **directly** to that server for the whole match. At the end it reports results, which update XP, inventory and **leaderboards** (sorted sets: `ZINCRBY` to add score, `ZREVRANGE` for the top 100). Match state and persistent state never mix.',
      ],
      changes: [
        { sign: '+', text: 'Lobby, matchmaker, fleet allocator' },
        { sign: '+', text: 'Dedicated game servers' },
        { sign: '+', text: 'Player data + leaderboards' },
      ],
      scene: {
        nodes: gm('players', 'lobby', 'mm', 'fleet', 'game', 'profile', 'board'),
        links: gmLinks,
        flows: [
          F(['players', 'lobby', 'mm', 'fleet', 'game'], { kind: 'request' }),
          F(['players', 'game'], { kind: 'event', ret: true, retKind: 'data', n: 3, speed: 1.5, delay: 1.2 }),
          F(['game', 'board'], { kind: 'data', delay: 2 }),
          F(['game', 'profile'], { kind: 'data', delay: 2.2 }),
        ],
      },
      metrics: { wait: '≈ 45 s', lag: '≈ 80 ms' },
    },
    {
      short: 'Matching',
      title: 'Matchmaking and allocation',
      tag: 'Deep Dive',
      body: [
        'Tickets sit in pools per **region + mode**. Players ping regional beacons at login, so we only match in regions under 80 ms. Within a pool, match on **skill rating** (MMR) inside a window that **widens** every ~10 s: fair first, fast eventually.',
        'When 10 tickets fit, the allocator takes a **warm** server from that region\'s pool (process booted, map loaded) and marks it allocated, Agones-style. Keep ~10% spare per region so allocation takes **milliseconds**, not a VM boot.',
      ],
      changes: [{ sign: '+', text: 'Warm server pool per region' }],
      scene: {
        nodes: gm('players', 'lobby', ['mm', { meter: 55, tag: 'eu · ranked' }], ['fleet', { meter: 40 }], 'pool', ['game', { tag: 'match #4812' }]),
        links: [L('players', 'lobby', { arrow: 'both' }), L('lobby', 'mm'), L('mm', 'fleet'), L('fleet', 'pool', { arrow: 'both' }), L('pool', 'game', { label: 'ready server' }), L('players', 'game', { arrow: 'both' })],
        flows: [
          F(['players', 'lobby', 'mm'], { n: 4, speed: 1.3 }),
          F(['mm', 'fleet', 'pool', 'game'], { kind: 'handshake', delay: 1.2 }),
          F(['players', 'game'], { kind: 'event', ret: true, retKind: 'data', delay: 2.4 }),
        ],
        notes: [{ at: [-3.5, 1.5], text: 'MMR window widens / 10 s', icon: Swords }],
      },
      metrics: { wait: '≈ 30 s' },
      hi: ['wait'],
    },
    {
      short: 'Tick',
      title: 'Authoritative server over UDP',
      tag: 'Deep Dive',
      body: [
        'The game server is the **single source of truth**. A fixed **60 Hz tick**: read queued inputs, simulate movement and shots, send snapshots. Clients send only *intentions* (keys, aim), never positions or "I hit him".',
        'Use **UDP**: a lost packet should be skipped, not resent — by the time TCP retransmits, the data is stale and head-of-line blocking stalls everything behind it. Snapshots are **deltas** against the last state the client acked, quantised and limited to what is near that player.',
      ],
      callout: { kind: 'key', text: 'In real-time sync, fresh beats complete: the next snapshot makes a lost one irrelevant.' },
      scene: {
        nodes: gm('players', ['game', { meter: 65, tag: 'tick 16.6 ms' }]),
        links: [L('players', 'game', { arrow: 'both', label: 'UDP' })],
        flows: [
          F(['players', 'game'], { kind: 'event', n: 4, speed: 1.6 }),
          F(['game', 'players'], { kind: 'data', n: 2, speed: 1.2, delay: 0.4 }),
        ],
        notes: [
          { at: [-3.5, -3], text: 'inputs: keys + aim only', icon: Gamepad2 },
          { at: [-3.5, 3], text: 'delta vs last acked tick', icon: Layers, tone: 'good' },
          { at: [4.5, 0], text: 'read → simulate → send', icon: Cpu },
        ],
      },
      metrics: { tick: '60 Hz' },
    },
    {
      short: 'Prediction',
      title: 'Hiding lag from players',
      tag: 'Deep Dive',
      body: [
        'With 80 ms of round trip, waiting for the server would feel sluggish. **Client-side prediction**: apply your own input at once and keep the inputs not yet acknowledged. Other players are drawn ~100 ms in the past, **interpolating** between snapshots.',
        '**Reconciliation**: when a snapshot says "state after your input #812", the client snaps to it and replays inputs #813+ on top — usually invisible. **Lag compensation**: to judge a shot, the server rewinds hitboxes to what the shooter saw, capped at ~200 ms.',
      ],
      scene: {
        nodes: gm(['players', { tag: 'predicting' }], ['game', { meter: 65 }]),
        links: [L('players', 'game', { arrow: 'both' })],
        flows: [
          F(['players', 'game'], { kind: 'event', n: 3, speed: 1.4 }),
          F(['game', 'players'], { kind: 'data', n: 2, delay: 0.6 }),
        ],
        notes: [
          { at: [-3.5, -3], text: 'move now, confirm later', icon: Zap, tone: 'good' },
          { at: [-3.5, 3], text: 'ack #812 → replay #813+', icon: Layers },
          { at: [4.5, 0], text: 'rewind hitboxes ≤ 200 ms', icon: Clock },
        ],
      },
      metrics: { lag: '≈ 0 (felt)' },
      hi: ['lag'],
    },
    {
      short: 'Anti-cheat',
      title: 'Never trust the client',
      tag: 'Deep Dive',
      body: [
        'Because the server is authoritative, classic hacks fail: a client claiming "I am at X" or "I hit him" is ignored. The server **validates every input** — max speed, fire rate, turn rate — and drops or flags the impossible ones.',
        'Don\'t send what a player shouldn\'t know: enemies behind walls are left out of their snapshots, which defeats most **wallhacks**. Aimbots send valid-looking input, so add client anti-tamper plus server-side **statistical detection** and player reports.',
      ],
      callout: { kind: 'warn', text: 'Anything the client computes, a cheater can change. Anything you send to the client, a cheater can read.' },
      scene: {
        nodes: gm('players', ['game', { meter: 60, tag: 'validates input' }], 'cheat'),
        links: [L('players', 'game', { arrow: 'both' }), L('cheat', 'game', { tone: 'bad', dashed: true })],
        flows: [
          F(['players', 'game'], { kind: 'event', ret: true, retKind: 'data', n: 2 }),
          F(['cheat', 'game'], { kind: 'error', stop: true, delay: 0.8 }),
        ],
        notes: [
          { at: [3.5, 2], text: '"teleported 40 m" → reject', tone: 'bad' },
          { at: [4.5, -1.5], text: 'hidden enemies not sent', icon: ShieldCheck, tone: 'good' },
        ],
      },
    },
    {
      short: 'Launch day',
      title: 'Launch night, crashes, hot boards',
      tag: 'Bottleneck',
      body: [
        'Launch night: queue joins spike 10× and a region runs out of warm servers, so tickets pile up. Fix: scale the fleet ahead of known peaks, let tickets **spill** to a neighbour region if ping stays acceptable, and show honest queue times.',
        'A crash ends a match, so persist only **results**, idempotently keyed by `match_id`, never mid-match state. One global sorted set for 50M players is a hot key: shard boards by **region and season** and cache the top 100.',
      ],
      scene: {
        nodes: gm(['players', { items: 7 }], ['lobby', { meter: 85 }], ['mm', { meter: 95, status: 'hot' }], ['fleet', { meter: 100, status: 'hot' }], ['pool', { tag: '0 warm left' }], ['game', { status: 'down', tag: 'crashed' }], 'profile', ['board', { meter: 95, status: 'hot' }]),
        links: [
          L('players', 'lobby', { arrow: 'both' }),
          L('lobby', 'mm'),
          L('mm', 'fleet'),
          L('fleet', 'pool', { tone: 'bad' }),
          L('lobby', 'profile', { arrow: 'both' }),
          L('game', 'profile', { dashed: true }),
          L('game', 'board'),
        ],
        flows: [
          F(['players', 'lobby', 'mm', 'fleet'], { n: 4, speed: 1.5 }),
          F(['fleet', 'pool'], { kind: 'error', stop: true, delay: 1.2 }),
          F(['game', 'board'], { kind: 'data', n: 3, delay: 0.6 }),
        ],
      },
      metrics: { ccu: '4M', wait: '6 min' },
      bad: ['wait'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'A stateless **lobby** and **matchmaker** (skill + region + ping) feed a **fleet allocator** that hands out warm dedicated servers. Each server is **authoritative** at a fixed tick over UDP; clients predict, reconcile and interpolate. Results flow to player data and sharded leaderboards.',
        'In an interview, split the real-time match plane from the persistent meta-game plane early — they have opposite requirements.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'One authoritative server per match owns real-time state; persistent data lives elsewhere. Trust the server, predict on the client.' },
      scene: {
        nodes: gm('players', 'lobby', ['mm', { meter: 45 }], ['fleet', { meter: 40 }], 'pool', 'game', 'profile', 'board'),
        links: [...gmLinks.filter((l) => l.from !== 'fleet'), L('fleet', 'pool', { arrow: 'both' }), L('pool', 'game')],
        flows: [
          F(['players', 'lobby', 'mm', 'fleet', 'pool', 'game'], { kind: 'request' }),
          F(['players', 'game'], { kind: 'event', ret: true, retKind: 'data', n: 3, speed: 1.5, delay: 1.4 }),
          F(['game', 'board'], { kind: 'data', delay: 2.2 }),
        ],
      },
      metrics: { ccu: '2M', wait: '≈ 30 s', lag: '≈ 0 (felt)' },
    },
  ],
};