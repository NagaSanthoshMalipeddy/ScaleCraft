import {
  Activity,
  Antenna,
  Archive,
  Calculator,
  Clapperboard,
  Cloud,
  CloudUpload,
  Coins,
  Cpu,
  Database,
  Film,
  Gauge,
  Globe,
  HardDrive,
  Headphones,
  Hourglass,
  KeyRound,
  Layers,
  ListMusic,
  MessageSquare,
  Network,
  Percent,
  Play,
  Radio,
  Route,
  Rows3,
  Search,
  Server,
  Sparkles,
  Split,
  Timer,
  Tv,
  User,
  Users,
  Video,
  Wifi,
  Zap,
} from 'lucide-react';
import type { Question } from '../types';
import { cast, F, L } from '../lessons/kit';

/* ------------------------------------------------------------------ */
/* Q12 · Design YouTube                                                */
/* ------------------------------------------------------------------ */

const yt = cast({
  creator: { kind: 'device', at: [-7, -3.5], tag: 'creator', tagIcon: User },
  upload: { kind: 'cube', at: [-3.5, -3.5], label: 'Upload', sub: 'resumable', icon: CloudUpload, tone: 'blue' },
  raw: { kind: 'slab', at: [0, -3.5], tag: 'raw uploads', icon: Archive, tone: 'violet' },
  jobs: { kind: 'queue', at: [3.5, -3.5], tag: 'chunk jobs', items: 4 },
  enc: { kind: 'cube', at: [7, -3.5], label: 'Encoders', sub: 'workers', icon: Cpu, tone: 'blue' },
  sys: { kind: 'cube', at: [-3.5, 0], label: 'YouTube', sub: '?', icon: Server, tone: 'gray' },
  meta: { kind: 'db', at: [-7, 0], tag: 'video meta', icon: Database },
  api: { kind: 'cube', at: [-3.5, 0], label: 'Watch', sub: 'API', icon: Server, tone: 'blue' },
  comments: { kind: 'db', at: [0, 0], tag: 'comments', icon: MessageSquare },
  segs: { kind: 'slab', at: [3.5, 0], tag: 'HLS / DASH', icon: Film, tone: 'violet' },
  shield: { kind: 'cube', at: [7, 0], label: 'Shield', sub: 'mid-tier', icon: Layers, tone: 'teal', size: 'sm' },
  viewsQ: { kind: 'queue', at: [-3.5, 3.5], tag: 'view events', items: 3 },
  agg: { kind: 'cube', at: [-7, 3.5], label: 'Counter', sub: 'batch +N', icon: Calculator, tone: 'blue' },
  viewer: { kind: 'device', at: [0, 3.5], tag: 'viewer', tagIcon: User },
  cdn: { kind: 'cube', at: [7, 3.5], label: 'CDN', sub: 'edge PoPs', icon: Globe, tone: 'teal' },
});

const ytWrite = [
  L('creator', 'upload', { arrow: 'both' }),
  L('upload', 'raw'),
  L('upload', 'meta'),
  L('raw', 'jobs', { label: 'split' }),
  L('jobs', 'enc'),
  L('enc', 'segs'),
];

const ytRead = [L('api', 'meta', { arrow: 'both' }), L('viewer', 'api', { arrow: 'both' }), L('viewer', 'cdn', { arrow: 'both' })];

export const qYouTube: Question = {
  id: 'q-youtube',
  n: 12,
  title: 'Design YouTube',
  blurb: 'Take raw uploads from millions of creators, transcode them in parallel and stream them through a CDN.',
  minutes: 14,
  level: 'Intermediate',
  concepts: ['CDN', 'Transcoding', 'Object Storage'],
  related: ['cdn', 'files', 'message-queues', 'batch-stream', 'caching'],
  followUps: [
    'How would you detect re-uploads of copyrighted videos?',
    'How would you generate thumbnails and seek-preview sprites?',
    'How do you take a video down everywhere within minutes?',
    'How would you make view counts resistant to bots?',
  ],
  keywords: ['youtube', 'video upload', 'transcoding', 'hls', 'dash', 'adaptive bitrate', 'cdn', 'view count', 'object storage', 'resumable upload'],
  metrics: [
    { id: 'upl', label: 'Uploads', icon: CloudUpload },
    { id: 'plays', label: 'Plays', icon: Play },
    { id: 'egress', label: 'Egress', icon: Wifi },
    { id: 'ready', label: 'Upload → ready', icon: Hourglass },
  ],
  learn: [
    { text: 'Sizing storage and egress for user-generated video', at: 1 },
    { text: 'Resumable, chunked uploads into object storage', at: 4 },
    { text: 'Parallel chunked transcoding into an ABR ladder', at: 5 },
    { text: 'Edge, shield and origin for popular vs long-tail videos', at: 6 },
    { text: 'Approximate, batched view counters', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Uploads in, smooth playback out',
      tag: 'Requirements',
      body: [
        'Functional: creators **upload** videos of any length; viewers **watch** them on any device and network and see the title, **view count** and **comments**. Out of scope: live streaming, ads, recommendations and monetisation.',
        'Non-functional: playback starts in **under 2 s** and rarely stalls; uploads survive flaky connections; a new video is watchable within minutes. View counts can be **eventually consistent**, but losing an uploaded video is never acceptable.',
      ],
      callout: { kind: 'tip', text: 'Say early that uploads and playback are two systems with opposite shapes: rare and heavy writes vs constant, cacheable reads.' },
      scene: {
        nodes: yt('creator', 'viewer', 'sys'),
        links: [L('creator', 'sys', { arrow: 'both' }), L('viewer', 'sys', { arrow: 'both' })],
        flows: [F(['creator', 'sys'], { kind: 'data' }), F(['viewer', 'sys'], { ret: true, retKind: 'data', delay: 0.8 })],
        notes: [
          { at: [4.2, -3.2], text: 'upload: any size, resumable', icon: CloudUpload },
          { at: [4.2, -2], text: 'play starts < 2 s', icon: Timer, tone: 'good' },
          { at: [4.2, -0.8], text: 'counts may lag a little', tone: 'warn' },
        ],
      },
      metrics: { upl: '—', plays: '—', egress: '—', ready: '—' },
    },
    {
      short: 'Numbers',
      title: 'Storage grows, egress dominates',
      tag: 'Estimation',
      body: [
        'Assume **500 hours uploaded per minute** ≈ 720k hours a day. Raw files at ~2 GB/hour ≈ **1.4 PB/day**, and the encoded ladder adds about as much again. Petabytes a day means cheap, durable **object storage** is the only sane home.',
        'Playback: ~5B plays/day ≈ **60k starts/s** (150k peak) and ~40M concurrent streams × 2.5 Mbps ≈ **100 Tbps** of egress. Watch hours outnumber upload hours ~1,000 : 1. No origin can serve that — a **CDN** must.',
      ],
      scene: {
        nodes: yt('creator', 'viewer', 'sys'),
        links: [L('creator', 'sys', { arrow: 'both' }), L('viewer', 'sys', { arrow: 'both' })],
        flows: [F(['creator', 'sys'], { kind: 'data' }), F(['viewer', 'sys'], { ret: true, retKind: 'data', n: 3, delay: 0.5 })],
        notes: [
          { at: [4.2, -3.2], text: '≈ 1.4 PB raw / day', icon: Archive },
          { at: [4.2, -2], text: '≈ 60k plays/s · 150k peak', icon: Play },
          { at: [4.2, -0.8], text: '40M streams ≈ 100 Tbps', icon: Wifi },
          { at: [4.2, 0.4], text: 'watch : upload ≈ 1000 : 1' },
        ],
      },
      metrics: { upl: '500 h/min', plays: '60k /s', egress: '100 Tbps' },
    },
    {
      short: 'API & data',
      title: 'Upload sessions and video rows',
      tag: 'API',
      body: [
        '`POST /uploads {title, size}` → `upload_id` and a session URL; `PUT /uploads/{id}` with `Content-Range` sends 8 MB chunks. `GET /videos/{id}` returns metadata plus a manifest URL; `GET /videos/{id}/comments?cursor=` pages comments.',
        '`videos(video_id PK, owner_id, title, status, duration, renditions, view_count)` lives in a sharded SQL or KV store. `comments(video_id, comment_id, author, text)` is partitioned by `video_id`, so one thread is a single range scan.',
      ],
      changes: [
        { sign: '+', text: 'Upload service and raw store' },
        { sign: '+', text: 'Video metadata DB' },
        { sign: '+', text: 'Comments store' },
      ],
      scene: {
        nodes: yt('creator', 'upload', 'raw', 'meta', 'api', 'comments'),
        links: [
          L('creator', 'upload', { arrow: 'both', label: 'PUT chunk' }),
          L('upload', 'raw'),
          L('upload', 'meta'),
          L('api', 'meta', { arrow: 'both' }),
          L('api', 'comments', { arrow: 'both' }),
        ],
        flows: [
          F(['creator', 'upload', 'raw'], { kind: 'data', n: 2 }),
          F(['upload', 'meta'], { kind: 'event', delay: 1 }),
          F(['api', 'comments'], { ret: true, retKind: 'data', delay: 1.6 }),
        ],
      },
    },
    {
      short: 'Design',
      title: 'Two pipelines that meet at storage',
      tag: 'Design',
      body: [
        'Write side: **Upload** lands raw bytes in object storage and creates a `videos` row with `status=processing`. A splitter cuts the file into chunks and queues **transcode jobs**; encoders write **HLS/DASH segments** and manifests back to storage.',
        'Read side: the player asks the **Watch API** for metadata and a manifest URL, then pulls segments from the **CDN**, which goes to storage only on a miss. The two sides share nothing but storage and the metadata row.',
      ],
      changes: [
        { sign: '+', text: 'Transcode queue and encoders' },
        { sign: '+', text: 'Segment store' },
        { sign: '+', text: 'Watch API and CDN' },
        { sign: '-', text: 'Comments (unchanged, hidden)' },
      ],
      scene: {
        nodes: yt('creator', 'upload', 'raw', 'jobs', ['enc', { meter: 50 }], 'meta', 'api', 'segs', 'viewer', 'cdn'),
        links: [...ytWrite, ...ytRead, L('segs', 'cdn', { label: 'miss' })],
        flows: [
          F(['creator', 'upload', 'raw'], { kind: 'data' }),
          F(['raw', 'jobs', 'enc', 'segs'], { kind: 'event', delay: 0.8 }),
          F(['viewer', 'api'], { ret: true, delay: 0.4 }),
          F(['viewer', 'cdn'], { ret: true, retKind: 'data', n: 3, delay: 1.2 }),
        ],
      },
    },
    {
      short: 'Resumable',
      title: 'Uploads that survive bad Wi-Fi',
      tag: 'Deep Dive',
      body: [
        'A 4 GB upload over hotel Wi-Fi will drop. The client opens an **upload session**, then sends **8 MB chunks** with byte offsets. After a failure it asks `HEAD /uploads/{id}` for the committed offset and resumes there instead of starting over.',
        'Upload servers stay thin and stateless: each chunk is streamed into object storage as one part of a **multipart object** and acknowledged, so any server can take the next chunk. A per-chunk checksum catches corruption; stale sessions expire after a few days.',
      ],
      callout: { kind: 'warn', text: 'Flip the row to `processing` only after the final checksum matches; a partial file must never reach the encoders.' },
      scene: {
        nodes: yt('creator', ['upload', { meter: 35 }], 'raw', 'meta'),
        links: [L('creator', 'upload', { arrow: 'both', label: 'PUT chunk' }), L('upload', 'raw', { label: 'part 37' }), L('upload', 'meta')],
        flows: [
          F(['creator', 'upload'], { kind: 'data', n: 3 }),
          F(['creator', 'upload'], { kind: 'error', stop: true, delay: 1.2 }),
          F(['upload', 'raw'], { kind: 'data', n: 2, delay: 0.5 }),
          F(['upload', 'meta'], { kind: 'event', delay: 2 }),
        ],
        notes: [
          { at: [0, -0.6], text: 'resume at offset 296 MB', icon: Timer, tone: 'good' },
          { at: [0, 0.6], text: 'parts → one object', icon: Archive },
        ],
      },
    },
    {
      short: 'Transcode',
      title: 'Split, encode in parallel, stitch',
      tag: 'Deep Dive',
      body: [
        'Encoding a 2-hour 4K file on one machine takes hours. Instead, split it at **keyframes** into ~10 s chunks and queue one job per chunk × rendition. Hundreds of **workers** encode in parallel, so a 10-minute video is ready in about a minute.',
        'Each video gets a **ladder** from 144p to 2160p: H.264 for reach, VP9/AV1 for savings. Outputs are 2–6 s **segments** plus HLS/DASH manifests that list every rendition. When the last job finishes, the row flips to `status=ready`.',
      ],
      callout: { kind: 'key', text: 'Chunk-level parallelism turns encoding latency into a throughput problem: add workers to cut the wait, not faster CPUs.' },
      scene: {
        nodes: yt('creator', 'upload', 'raw', ['jobs', { items: 6 }], ['enc', { meter: 85 }], 'segs'),
        links: ytWrite.filter((l) => l.to !== 'meta'),
        flows: [
          F(['creator', 'upload', 'raw'], { kind: 'data' }),
          F(['raw', 'jobs', 'enc'], { kind: 'event', n: 3, delay: 0.4 }),
          F(['enc', 'segs'], { kind: 'data', n: 3, delay: 1 }),
        ],
        notes: [
          { at: [0, -0.8], text: 'job = chunk × rendition', icon: Cpu },
          { at: [0, 0.4], text: '144p … 2160p, 3 codecs', icon: Film },
          { at: [0, 1.6], text: '10 min video → ~1 min', icon: Hourglass, tone: 'good' },
        ],
      },
      metrics: { ready: '~1 min' },
      hi: ['ready'],
    },
    {
      short: 'Long tail',
      title: 'Popular vs long-tail videos',
      tag: 'Trade-off',
      body: [
        'Views follow a power law: a few percent of videos earn most watch time while millions get a handful of plays. Hot segments live in **edge caches** at >95% hit; a long-tail miss goes to a regional **shield**, so origin sees one fetch per region, not per PoP.',
        'Spend effort where the views are: encode new uploads with a cheap baseline ladder and **re-encode** videos that turn popular into AV1 — extra compute that pays back in bandwidth. Rarely watched files can move to colder, cheaper storage classes.',
      ],
      callout: { kind: 'tip', text: 'Measure hit ratio in bytes, not requests: one long-tail 4K miss can cost more than a thousand thumbnail hits.' },
      changes: [{ sign: '+', text: 'Mid-tier shield between edges and origin' }],
      scene: {
        nodes: yt('raw', 'jobs', 'enc', 'segs', 'shield', 'viewer', 'cdn'),
        links: [
          L('raw', 'jobs'),
          L('jobs', 'enc'),
          L('enc', 'segs'),
          L('viewer', 'cdn', { arrow: 'both', label: '97% hit' }),
          L('cdn', 'shield', { label: 'miss' }),
          L('shield', 'segs', { label: 'miss' }),
        ],
        flows: [
          F(['viewer', 'cdn'], { ret: true, retKind: 'data', n: 3 }),
          F(['cdn', 'shield', 'segs'], { ret: true, retKind: 'data', delay: 1.2 }),
          F(['jobs', 'enc', 'segs'], { kind: 'event', delay: 2 }),
        ],
        notes: [
          { at: [0, -1], text: 'popular → AV1 re-encode', icon: Cpu },
          { at: [0, 0.4], text: 'top 5% videos ≈ 80% views', icon: Zap },
        ],
      },
    },
    {
      short: 'View counts',
      title: 'Counting billions of views cheaply',
      tag: 'Deep Dive',
      body: [
        '`UPDATE videos SET views = views + 1` at 60k plays/s, piled onto a few viral videos, would melt the hottest rows. Instead the player sends a **view event** once playback passes ~30 s; the Watch API appends it to a **queue** and returns at once.',
        'A **stream counter** sums events per video per 10 s window and applies one batched `+N`. The displayed count is **approximate** and seconds-to-minutes stale — fine for a popularity signal. Fraud filtering runs later and can correct totals.',
      ],
      callout: { kind: 'key', text: 'Turn one hot-row write per view into one write per video per window: batching is how counters scale.' },
      changes: [
        { sign: '+', text: 'View-event queue' },
        { sign: '+', text: 'Stream counter' },
      ],
      scene: {
        nodes: yt('meta', 'api', ['viewsQ', { items: 5 }], 'agg', 'viewer'),
        links: [
          L('viewer', 'api', { arrow: 'both', label: 'view @ 30 s' }),
          L('api', 'meta', { arrow: 'both' }),
          L('api', 'viewsQ'),
          L('viewsQ', 'agg'),
          L('agg', 'meta'),
        ],
        flows: [
          F(['viewer', 'api', 'viewsQ', 'agg'], { kind: 'event', n: 3 }),
          F(['agg', 'meta'], { kind: 'data', delay: 1.6 }),
        ],
        notes: [
          { at: [-7, -2], text: '1 write / video / 10 s', icon: Calculator, tone: 'good' },
          { at: [3, 0], text: '60k events/s, no hot rows', icon: Activity },
        ],
      },
    },
    {
      short: 'Bottleneck',
      title: 'A viral premiere hits cold caches',
      tag: 'Bottleneck',
      body: [
        'A huge channel publishes and 2M people press play within a minute. Every edge misses at once and stampedes the origin for the same segments — a **thundering herd**. Encoders also back up when a burst of long uploads lands together.',
        'Fixes: edges and shields **coalesce** concurrent misses into one upstream fetch; **pre-warm** the first segments of big channels’ videos at publish time; give the transcode queue **priority lanes** so short and in-demand videos jump ahead of a 10-hour upload.',
      ],
      changes: [
        { sign: '~', text: 'Request coalescing at edge and shield' },
        { sign: '~', text: 'Priority lanes in the transcode queue' },
      ],
      scene: {
        nodes: yt(
          'creator',
          'upload',
          'raw',
          ['jobs', { items: 7 }],
          ['enc', { meter: 95, status: 'hot' }],
          'meta',
          'api',
          'segs',
          'shield',
          'viewer',
          ['cdn', { status: 'hot' }],
        ),
        links: [...ytWrite, ...ytRead, L('cdn', 'shield', { label: '1 fetch' }), L('shield', 'segs')],
        flows: [
          F(['viewer', 'cdn'], { ret: true, retKind: 'data', n: 5, speed: 1.4 }),
          F(['cdn', 'shield', 'segs'], { ret: true, retKind: 'data', delay: 0.8 }),
          F(['raw', 'jobs', 'enc'], { kind: 'event', n: 3, delay: 0.4 }),
        ],
        notes: [{ at: [3.5, 2.3], text: 'coalesce misses', icon: Layers, tone: 'good' }],
      },
      metrics: { plays: '150k /s' },
      bad: ['plays'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Uploads: **resumable chunks** into object storage, then a **parallel, chunked transcode** into a ladder of HLS/DASH renditions. Playback: a thin Watch API for metadata and a **CDN** with a mid-tier shield for the segments.',
        'Counts and other side effects flow through a **queue** and are applied in batches. Effort follows popularity: edge caching and AV1 for hot videos, baseline encodes and cheaper storage for the long tail.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'A video platform is two systems joined by storage: a pipeline that prepares files and a CDN that serves them. Keep the origin out of the hot path.' },
      scene: {
        nodes: yt('creator', 'upload', 'raw', 'jobs', ['enc', { meter: 60 }], 'meta', 'api', 'segs', 'shield', 'viewsQ', 'agg', 'viewer', 'cdn'),
        links: [...ytWrite, ...ytRead, L('cdn', 'shield'), L('shield', 'segs'), L('api', 'viewsQ'), L('viewsQ', 'agg'), L('agg', 'meta')],
        flows: [
          F(['creator', 'upload', 'raw', 'jobs', 'enc', 'segs'], { kind: 'data' }),
          F(['viewer', 'cdn'], { ret: true, retKind: 'data', n: 2, delay: 0.6 }),
          F(['viewer', 'api', 'viewsQ', 'agg', 'meta'], { kind: 'event', delay: 1.4 }),
        ],
      },
      metrics: { upl: '500 h/min', plays: '60k /s', egress: '100 Tbps', ready: '~1 min' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Q20 · Design a Video Streaming Platform (live)                      */
/* ------------------------------------------------------------------ */

const ls = cast({
  streamer: { kind: 'device', at: [-7, -3.5], tag: 'streamer', tagIcon: Video },
  ctl: { kind: 'cube', at: [-7, 0], label: 'Control', sub: 'stream keys', icon: KeyRound, tone: 'yellow' },
  ingest: { kind: 'cube', at: [-3.5, -3.5], label: 'Ingest', sub: 'RTMP · SRT', icon: Antenna, tone: 'green' },
  ingestB: { kind: 'cube', at: [-3.5, 0], label: 'Ingest', sub: 'backup', icon: Antenna, tone: 'green' },
  sys: { kind: 'cube', at: [-3.5, 0], label: 'Live', sub: '?', icon: Radio, tone: 'gray' },
  chat: { kind: 'cube', at: [-3.5, 0], label: 'Chat', sub: 'pub/sub', icon: MessageSquare, tone: 'blue' },
  enc: { kind: 'cube', at: [0, -3.5], label: 'Encode', sub: 'ABR ladder', icon: Cpu, tone: 'blue' },
  origin: { kind: 'cube', at: [3.5, -3.5], label: 'Origin', sub: 'packager', icon: Server, tone: 'blue' },
  vod: { kind: 'slab', at: [7, -3.5], tag: 'VOD archive', icon: Archive, tone: 'violet' },
  shield: { kind: 'cube', at: [7, 0], label: 'Shield', sub: 'mid-tier', icon: Layers, tone: 'teal' },
  edge: { kind: 'cube', at: [3.5, 3.5], label: 'Edge', sub: '×300 PoPs', icon: Globe, tone: 'teal' },
  viewers: { kind: 'crowd', at: [0, 3.5], tag: '1M viewers', items: 6 },
});

const lsPipe = [
  L('streamer', 'ingest', { label: 'RTMP push' }),
  L('ctl', 'ingest', { arrow: 'both' }),
  L('ingest', 'enc'),
  L('enc', 'origin'),
  L('origin', 'shield'),
  L('shield', 'edge'),
  L('edge', 'viewers', { arrow: 'both' }),
];

export const qLiveStreaming: Question = {
  id: 'q-live-streaming',
  n: 20,
  title: 'Design a Video Streaming Platform',
  blurb: 'Broadcast one live stream to a million viewers a few seconds behind, Twitch-style, with chat and replays.',
  minutes: 14,
  level: 'Intermediate',
  concepts: ['CDN', 'Encoding', 'Streaming'],
  related: ['cdn', 'realtime', 'pubsub', 'redundancy', 'load-balancing'],
  followUps: [
    'How would you offer sub-second latency for interactive streams?',
    'How do you insert ads into a live stream without rebuffering?',
    'How would you let viewers clip the last 30 seconds?',
    'How do you detect and cut a stream that breaks content rules?',
  ],
  keywords: ['live streaming', 'twitch', 'rtmp', 'srt', 'll-hls', 'abr ladder', 'ingest', 'real-time transcoding', 'cdn fan-out', 'latency'],
  metrics: [
    { id: 'viewers', label: 'Viewers', icon: Users },
    { id: 'egress', label: 'Egress', icon: Wifi },
    { id: 'latency', label: 'Glass-to-glass', icon: Timer },
    { id: 'rebuf', label: 'Rebuffering', icon: Gauge },
  ],
  learn: [
    { text: 'Why fan-out, not ingest, drives a live design', at: 1 },
    { text: 'Real-time transcoding pinned per stream', at: 4 },
    { text: 'Segment length and LL-HLS: latency vs stability', at: 5 },
    { text: 'Request collapsing in a CDN tree', at: 6 },
    { text: 'Failover for ingest and encoders', at: 8 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'One streamer, a million viewers',
      tag: 'Requirements',
      body: [
        'Functional: a streamer broadcasts from OBS or a phone; viewers watch **live** on any device at a quality their network can sustain; **chat** runs alongside; streams are **recorded** for replay. Out of scope: payments, clips, discovery and recommendations.',
        'Non-functional: **glass-to-glass latency** of a few seconds so chat can react; smooth playback on shaky mobile networks; one channel can draw **1M concurrent viewers**. A dropped stream must recover within seconds.',
      ],
      callout: { kind: 'tip', text: 'Contrast with on-demand video: there is no time to pre-encode or pre-position. Every second of video is made and delivered within seconds.' },
      scene: {
        nodes: ls('streamer', 'sys', 'viewers'),
        links: [L('streamer', 'sys'), L('viewers', 'sys', { arrow: 'both' })],
        flows: [F(['streamer', 'sys'], { kind: 'data', n: 3 }), F(['viewers', 'sys'], { ret: true, retKind: 'data', n: 2, delay: 0.8 })],
        notes: [
          { at: [4.2, -3.2], text: '100k live channels', icon: Radio },
          { at: [4.2, -2], text: '1 stream → 1M viewers', icon: Users },
          { at: [4.2, -0.8], text: 'latency target ≈ 3–5 s', icon: Timer, tone: 'warn' },
        ],
      },
      metrics: { viewers: '—', egress: '—', latency: '—', rebuf: '—' },
    },
    {
      short: 'Numbers',
      title: 'Ingest is small, fan-out is huge',
      tag: 'Estimation',
      body: [
        'Ingest: each streamer sends one ~6 Mbps feed; 100k concurrent channels ≈ **600 Gbps** in, easily spread across regional ingest PoPs. Transcoding each into five renditions in real time needs roughly **one GPU slot per channel**.',
        'Egress: a 1M-viewer stream at ~3 Mbps is **3 Tbps** for one channel, and every player fetches a new 2 s segment plus a playlist every couple of seconds — **~1M requests/s** for a single stream. Fan-out, not ingest, shapes the design.',
      ],
      scene: {
        nodes: ls('streamer', 'sys', 'viewers'),
        links: [L('streamer', 'sys'), L('viewers', 'sys', { arrow: 'both' })],
        flows: [F(['streamer', 'sys'], { kind: 'data' }), F(['viewers', 'sys'], { ret: true, retKind: 'data', n: 4, delay: 0.4 })],
        notes: [
          { at: [4.2, -3.2], text: '100k × 6 Mbps ≈ 600 Gbps in', icon: Antenna },
          { at: [4.2, -2], text: '1M × 3 Mbps ≈ 3 Tbps out', icon: Wifi, tone: 'warn' },
          { at: [4.2, -0.8], text: '≈ 1M segment GETs/s', icon: Users },
        ],
      },
      metrics: { viewers: '1M', egress: '3 Tbps' },
    },
    {
      short: 'API & data',
      title: 'Stream keys, RTMP and playlists',
      tag: 'API',
      body: [
        '`POST /streams` → `stream_key` and the nearest ingest URL; the encoder pushes to `rtmp://ingest/live/{key}` (or SRT). Viewers `GET /live/{channel}/master.m3u8`, then rendition playlists and segments. Chat is a WebSocket on `/chat/{channel}`.',
        '`streams(stream_id PK, channel_id, status, ingest_node, encoder_node, started_at)` records where each live stream is pinned; `recordings(stream_id, manifest_url, duration)` points at archived segments. Segments are files, never DB rows.',
      ],
      changes: [
        { sign: '+', text: 'Control plane (keys, routing)' },
        { sign: '+', text: 'Ingest' },
        { sign: '+', text: 'Chat' },
      ],
      scene: {
        nodes: ls('streamer', 'ctl', 'ingest', 'chat', 'viewers'),
        links: [
          L('streamer', 'ctl', { arrow: 'both' }),
          L('ctl', 'ingest', { arrow: 'both', label: 'check key' }),
          L('streamer', 'ingest', { label: 'RTMP push' }),
          L('viewers', 'chat', { arrow: 'both', label: 'WebSocket' }),
        ],
        flows: [
          F(['streamer', 'ctl'], { ret: true }),
          F(['streamer', 'ingest'], { kind: 'data', n: 3, delay: 0.8 }),
          F(['ingest', 'ctl'], { kind: 'handshake', ret: true, retKind: 'handshake', delay: 1.4 }),
          F(['viewers', 'chat'], { kind: 'event', ret: true, retKind: 'event', delay: 0.4 }),
        ],
      },
    },
    {
      short: 'Design',
      title: 'Ingest → transcode → origin → CDN',
      tag: 'Design',
      body: [
        'The feed lands on the nearest **ingest** server, which checks the key with the control plane and forwards it to a **real-time transcoder** that emits the ABR ladder. A **packager/origin** cuts each rendition into short segments and keeps a rolling playlist.',
        'Viewers never touch the origin: a **CDN** tree — a mid-tier shield, then edge PoPs — caches each segment once per region and serves millions. Chat is a separate system that shares only the channel id.',
      ],
      changes: [
        { sign: '+', text: 'Real-time transcoder' },
        { sign: '+', text: 'Origin / packager' },
        { sign: '+', text: 'CDN shield and edges' },
      ],
      scene: {
        nodes: ls('streamer', 'ctl', 'ingest', ['enc', { meter: 55 }], 'origin', 'shield', 'edge', 'viewers', 'chat'),
        links: [...lsPipe, L('viewers', 'chat', { arrow: 'both' })],
        flows: [
          F(['streamer', 'ingest', 'enc', 'origin'], { kind: 'data', n: 3 }),
          F(['viewers', 'edge', 'shield', 'origin'], { ret: true, retKind: 'data', delay: 1 }),
          F(['viewers', 'chat'], { kind: 'event', ret: true, retKind: 'event', delay: 1.8 }),
        ],
      },
      metrics: { latency: '~20 s', rebuf: '0.3%' },
    },
    {
      short: 'Ingest',
      title: 'Real-time transcoding, pinned per stream',
      tag: 'Deep Dive',
      body: [
        'Streamers reach the nearest ingest PoP via anycast or GeoDNS. **RTMP** over TCP is universal but stalls on packet loss; **SRT** over UDP retransmits within a latency budget and copes better with mobile uplinks. Ingest only relays bytes — keep it thin.',
        'Transcoding must keep pace with the wall clock, so each stream is **pinned** to one encoder slot that decodes once and emits 1080p60 down to 160p. Small channels can skip it: pass the source rendition through and save most of the compute.',
      ],
      callout: { kind: 'warn', text: 'An encoder that falls behind real time never catches up — latency grows until players stall. Alert on encode speed < 1.0× and re-pin early.' },
      scene: {
        nodes: ls('streamer', 'ctl', 'ingest', ['enc', { meter: 80 }], 'origin'),
        links: lsPipe.slice(0, 4),
        flows: [
          F(['streamer', 'ingest', 'enc'], { kind: 'data', n: 3 }),
          F(['enc', 'origin'], { kind: 'data', n: 3, delay: 0.6 }),
          F(['ingest', 'ctl'], { kind: 'handshake', ret: true, retKind: 'handshake', delay: 1.2 }),
        ],
        notes: [
          { at: [0, -0.6], text: '1080p60 → 160p, 5 rungs', icon: Cpu },
          { at: [0, 0.6], text: 'encode speed ≥ 1.0×', icon: Timer, tone: 'warn' },
        ],
      },
    },
    {
      short: 'Latency',
      title: 'Latency vs stability',
      tag: 'Trade-off',
      body: [
        'Latency ≈ encode + segment length × segments buffered + delivery. Classic HLS with 6 s segments and a 3-segment buffer runs ~20 s behind — stable, but chat jokes land late. **2 s segments** get to ~6–8 s with more requests and less buffer.',
        '**Low-latency HLS/DASH** publishes ~300 ms **partial segments** and lets players block until the next playlist update, reaching **2–4 s**. Sub-second needs WebRTC, which gives up CDN caching. Offer low latency per channel; let players widen the buffer if they stall.',
      ],
      callout: { kind: 'key', text: 'Every second of buffer you remove is a second of network jitter you can no longer absorb. Choose latency per use case.' },
      changes: [{ sign: '~', text: '6 s segments → 2 s segments + 300 ms parts' }],
      scene: {
        nodes: ls('enc', 'origin', 'shield', 'edge', 'viewers'),
        links: lsPipe.slice(3),
        flows: [F(['enc', 'origin', 'shield', 'edge', 'viewers'], { kind: 'data', n: 5, speed: 1.6 })],
        notes: [
          { at: [-4.5, -0.8], text: '6 s × 3 ≈ 20 s', icon: Timer, tone: 'bad' },
          { at: [-4.5, 0.4], text: '2 s × 3 ≈ 7 s', icon: Timer, tone: 'warn' },
          { at: [-4.5, 1.6], text: 'LL-HLS parts ≈ 3 s', icon: Timer, tone: 'good' },
        ],
      },
      metrics: { latency: '≈ 3 s', rebuf: '0.6%' },
      hi: ['latency'],
      bad: ['rebuf'],
    },
    {
      short: 'Fan-out',
      title: 'One origin, a million players',
      tag: 'Deep Dive',
      body: [
        'With 1M players polling the playlist every 2 s and fetching each new segment, the origin would see **~1M requests/s** for one channel. Instead every edge **collapses** concurrent misses: the first request goes upstream, the rest wait for its response.',
        'Edges fill from a regional **shield**, so the origin serves each new segment a few dozen times, not a million. Playlists get a TTL shorter than one segment; segments are immutable and cache forever. Huge events can be pre-assigned extra CDN capacity.',
      ],
      callout: { kind: 'tip', text: 'Name segments by sequence number (`seg_48213.m4s`) so they are immutable; only the tiny playlist ever changes.' },
      scene: {
        nodes: ls('enc', 'origin', 'shield', ['edge', { meter: 85 }], ['viewers', { items: 7 }]),
        links: lsPipe.slice(3),
        flows: [
          F(['viewers', 'edge'], { ret: true, retKind: 'data', n: 5, speed: 1.4 }),
          F(['edge', 'shield', 'origin'], { ret: true, retKind: 'data', delay: 0.8 }),
          F(['enc', 'origin'], { kind: 'data', delay: 1.6 }),
        ],
        notes: [
          { at: [0, 0.2], text: '1M req/s → ~50 at origin', icon: Layers, tone: 'good' },
          { at: [7, 2], text: 'collapse misses', icon: Zap },
        ],
      },
      metrics: { egress: '3 Tbps' },
    },
    {
      short: 'Chat & VOD',
      title: 'Chat and recording on the side',
      tag: 'Deep Dive',
      body: [
        '**Chat** uses WebSocket gateways subscribed to a per-channel pub/sub topic. A 1M-viewer channel can produce thousands of messages a second, so servers **sample** what each client sees and apply slow mode — nobody can read 50k lines a second anyway.',
        '**Recording** is almost free: the origin already has every segment, so it copies the top renditions to object storage as they are produced. When the stream ends, a VOD manifest stitches them together — no re-encode needed to publish the replay.',
      ],
      changes: [{ sign: '+', text: 'VOD archive in object storage' }],
      scene: {
        nodes: ls('streamer', 'ingest', 'enc', 'origin', 'vod', 'shield', 'edge', 'viewers', 'chat'),
        links: [...lsPipe.filter((l) => l.from !== 'ctl'), L('origin', 'vod', { label: 'copy segments' }), L('viewers', 'chat', { arrow: 'both' })],
        flows: [
          F(['viewers', 'chat'], { kind: 'event', n: 4, ret: true, retKind: 'event' }),
          F(['origin', 'vod'], { kind: 'data', n: 2, delay: 0.5 }),
          F(['streamer', 'ingest', 'enc', 'origin'], { kind: 'data', delay: 1 }),
        ],
        notes: [{ at: [-7, 2], text: '~20 msgs/s per client', icon: MessageSquare }],
      },
    },
    {
      short: 'Bottleneck',
      title: 'Ingest dies mid-stream; a raid arrives',
      tag: 'Bottleneck',
      body: [
        'If the ingest or encoder box dies, the stream freezes for 1M people. Run them as **pools**: the streaming software reconnects to a backup ingest URL, the control plane **re-pins** the stream to a fresh encoder, and players ride out the gap on their buffer.',
        'Derive segment numbers from stream time so a replacement origin continues the same sequence and edges never serve a broken playlist. For predictable spikes — a raid, a final match — pre-scale encoders and warm edges before the start.',
      ],
      changes: [
        { sign: '~', text: 'Primary ingest down' },
        { sign: '+', text: 'Backup ingest, stream re-pinned' },
      ],
      scene: {
        nodes: ls('streamer', 'ctl', ['ingest', { status: 'down' }], 'ingestB', 'enc', 'origin', 'shield', 'edge', 'viewers'),
        links: [
          L('streamer', 'ingest', { tone: 'bad', dashed: true }),
          L('streamer', 'ingestB'),
          L('ctl', 'ingestB', { arrow: 'both' }),
          L('ingest', 'enc', { tone: 'muted', dashed: true }),
          L('ingestB', 'enc'),
          ...lsPipe.slice(3),
        ],
        flows: [
          F(['streamer', 'ingest'], { kind: 'error', stop: true }),
          F(['ctl', 'ingestB'], { kind: 'handshake', delay: 0.4 }),
          F(['streamer', 'ingestB', 'enc', 'origin'], { kind: 'data', n: 2, delay: 0.8 }),
          F(['origin', 'shield', 'edge', 'viewers'], { kind: 'data', n: 3, delay: 1.2 }),
        ],
        notes: [{ at: [-1.6, -1.5], text: 'reconnect < 5 s', icon: Timer, tone: 'good' }],
      },
      metrics: { rebuf: '1.5%' },
      bad: ['rebuf'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Thin **ingest** near the streamer, a **real-time transcoder** pinned per stream, an origin that packages short immutable segments, and a **CDN tree** with request collapsing so one origin can feed a million players.',
        'Latency is a dial: segment length and buffer depth trade delay for stability, with LL-HLS partial segments in the middle. Chat and recording hang off the side and never slow the video path.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Live video is a real-time pipeline feeding a fan-out tree. Keep every stage faster than real time and let caches absorb the crowd.' },
      scene: {
        nodes: ls('streamer', 'ctl', 'ingest', ['enc', { meter: 60 }], 'origin', 'vod', 'shield', 'edge', 'viewers', 'chat'),
        links: [...lsPipe, L('origin', 'vod'), L('viewers', 'chat', { arrow: 'both' })],
        flows: [
          F(['streamer', 'ingest', 'enc', 'origin', 'shield', 'edge', 'viewers'], { kind: 'data', n: 2 }),
          F(['origin', 'vod'], { kind: 'data', delay: 1 }),
          F(['viewers', 'chat'], { kind: 'event', ret: true, retKind: 'event', delay: 1.6 }),
        ],
      },
      metrics: { viewers: '1M', egress: '3 Tbps', latency: '≈ 3 s', rebuf: '0.4%' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Q21 · Design Netflix                                                */
/* ------------------------------------------------------------------ */

const nx = cast({
  member: { kind: 'device', at: [-7, 0], tag: 'member', tagIcon: Tv },
  sys: { kind: 'cube', at: [-3.5, 0], label: 'Netflix', sub: '?', icon: Tv, tone: 'gray' },
  gw: { kind: 'cube', at: [-3.5, 0], label: 'Gateway', sub: 'region A', icon: Split, tone: 'green' },
  gwB: { kind: 'cube', at: [-3.5, -3.5], label: 'Region B', sub: 'active', icon: Cloud, tone: 'green' },
  play: { kind: 'cube', at: [0, -3.5], label: 'Playback', sub: 'steering', icon: Route, tone: 'blue' },
  home: { kind: 'cube', at: [0, 0], label: 'Home', sub: 'rows', icon: Rows3, tone: 'blue' },
  rows: { kind: 'cube', at: [3.5, 0], label: 'Rows', sub: 'per profile', icon: Zap, tone: 'orange' },
  events: { kind: 'queue', at: [3.5, -3.5], tag: 'play events', items: 3 },
  recs: { kind: 'cube', at: [7, 0], label: 'Recs', sub: 'batch + NRT', icon: Sparkles, tone: 'blue' },
  masters: { kind: 'slab', at: [7, 3.5], tag: 'studio masters', icon: Clapperboard, tone: 'violet' },
  encoder: { kind: 'cube', at: [3.5, 3.5], label: 'Encode', sub: 'per-title', icon: Cpu, tone: 'blue' },
  encodes: { kind: 'slab', at: [0, 3.5], tag: 'encode store', icon: Archive, tone: 'violet' },
  ixp: { kind: 'cube', at: [-3.5, 3.5], label: 'OCA', sub: 'at IXP', icon: HardDrive, tone: 'teal' },
  oca: { kind: 'cube', at: [-7, 3.5], label: 'OCA', sub: 'in your ISP', icon: HardDrive, tone: 'teal' },
});

const nxControl = [
  L('member', 'gw', { arrow: 'both' }),
  L('gw', 'play', { arrow: 'both' }),
  L('gw', 'home', { arrow: 'both' }),
  L('home', 'rows', { arrow: 'both' }),
  L('play', 'events'),
];

const nxData = [L('member', 'oca', { arrow: 'both' }), L('oca', 'ixp', { dashed: true, label: 'fill' }), L('ixp', 'encodes', { dashed: true, label: 'fill' })];

export const qNetflix: Question = {
  id: 'q-netflix',
  n: 21,
  title: 'Design Netflix',
  blurb: 'Stream a licensed catalog to 260M members by encoding ahead of time and placing files inside ISPs.',
  minutes: 15,
  level: 'Advanced',
  concepts: ['CDN', 'Recommendation', 'Streaming'],
  related: ['cdn', 'microservices', 'batch-stream', 'redundancy', 'caching'],
  followUps: [
    'How would you forecast which titles each edge appliance should hold?',
    'How do you keep “continue watching” in sync across devices?',
    'How would you A/B test a new recommendation model safely?',
    'What changes if you add a live event like a boxing match?',
  ],
  keywords: ['netflix', 'video on demand', 'open connect', 'pre-positioning', 'adaptive bitrate', 'per-title encoding', 'recommendations', 'control plane', 'data plane', 'cdn'],
  metrics: [
    { id: 'egress', label: 'Peak egress', icon: Wifi },
    { id: 'local', label: 'Bytes in-ISP', icon: Network },
    { id: 'start', label: 'Play start', icon: Timer },
    { id: 'rebuf', label: 'Rebuffers', icon: Gauge },
  ],
  learn: [
    { text: 'Exploiting a known catalog with offline per-title encoding', at: 4 },
    { text: 'Push pre-positioning vs pull caching', at: 5 },
    { text: 'Playback steering and client adaptive bitrate', at: 6 },
    { text: 'Batch + near-real-time personalised rows', at: 7 },
    { text: 'Control plane vs data plane under region loss', at: 8 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'A licensed catalog, played instantly',
      tag: 'Requirements',
      body: [
        'Functional: members browse a **personalised home page** of rows, press play and watch films and series in up to 4K HDR on TVs, phones and laptops, resuming across devices. Out of scope: billing, sign-up, studio tooling and ads.',
        'Non-functional: play starts in **~1–2 s** with almost no rebuffering, in 190 countries, at evening peaks. Unlike user uploads, the catalog is **known in advance** and changes slowly — a fact the whole design exploits.',
      ],
      callout: { kind: 'key', text: 'Ask “who creates the content?” early. A curated catalog lets you do the expensive work long before anyone presses play.' },
      scene: {
        nodes: nx('member', 'sys'),
        links: [L('member', 'sys', { arrow: 'both' })],
        flows: [F(['member', 'sys'], { ret: true, retKind: 'data', n: 2 })],
        notes: [
          { at: [3.2, -2.4], text: 'catalog ≈ 20k titles', icon: Clapperboard },
          { at: [3.2, -1.2], text: 'start < 2 s, ~0 rebuffers', icon: Timer, tone: 'good' },
          { at: [3.2, 0], text: '4K HDR · 190 countries', icon: Tv },
        ],
      },
      metrics: { egress: '—', local: '—', start: '—', rebuf: '—' },
    },
    {
      short: 'Numbers',
      title: 'Egress in hundreds of Tbps',
      tag: 'Estimation',
      body: [
        'Assume **260M members** with ~15% streaming at the evening peak ≈ **40M streams** at ~5 Mbps ⇒ **~200 Tbps**. Buying that from transit providers would be ruinous, and a handful of central data centres could not push it anyway.',
        'Catalog: ~20k titles × ~120 files each (resolutions, codecs, audio, subtitles) ≈ a few **petabytes** — small enough that a large slice fits on servers placed **inside ISPs**. Control traffic (home page, play clicks) is only ~100k req/s.',
      ],
      scene: {
        nodes: nx('member', 'sys'),
        links: [L('member', 'sys', { arrow: 'both' })],
        flows: [F(['member', 'sys'], { ret: true, retKind: 'data', n: 4 })],
        notes: [
          { at: [3.2, -2.4], text: '40M × 5 Mbps ≈ 200 Tbps', icon: Wifi, tone: 'warn' },
          { at: [3.2, -1.2], text: '20k titles × 120 files', icon: Archive },
          { at: [3.2, 0], text: 'control ≈ 100k req/s', icon: Split },
        ],
      },
      metrics: { egress: '200 Tbps' },
    },
    {
      short: 'API & data',
      title: 'Play requests return URLs, not bytes',
      tag: 'API',
      body: [
        '`GET /home?profile=` returns rows of title ids with artwork. `POST /playback/{titleId}` returns a **manifest** of encodes, a ranked list of **edge URLs** and a DRM license URL. `POST /events` sends heartbeats so “continue watching” stays in sync.',
        '`titles(title_id, metadata)`, `encodes(title_id, profile, bitrate, file_id)`, `viewing(profile_id, title_id, position, updated_at)` in a wide-column store partitioned by profile, and `rows(profile_id → [row, titles])` precomputed per profile.',
      ],
      changes: [
        { sign: '+', text: 'Gateway, Home and Playback services' },
        { sign: '+', text: 'Precomputed rows cache' },
      ],
      scene: {
        nodes: nx('member', 'gw', 'play', 'home', 'rows', 'events'),
        links: [
          L('member', 'gw', { arrow: 'both' }),
          L('gw', 'play', { arrow: 'both', label: 'POST /playback' }),
          L('gw', 'home', { arrow: 'both', label: 'GET /home' }),
          L('home', 'rows', { arrow: 'both' }),
          L('play', 'events'),
        ],
        flows: [
          F(['member', 'gw', 'home', 'rows'], { ret: true }),
          F(['member', 'gw', 'play'], { ret: true, delay: 1 }),
          F(['play', 'events'], { kind: 'event', delay: 2 }),
        ],
      },
    },
    {
      short: 'Design',
      title: 'Control plane in the cloud, data in ISPs',
      tag: 'Design',
      body: [
        'Split the system in two. The **control plane** — gateway, home page, playback steering, events, recommendations — runs as microservices in a few cloud regions and handles every click. It never sends a video byte.',
        'The **data plane** is a fleet of storage-heavy edge appliances (**OCAs**) inside ISPs and at internet exchanges, each holding ~300 TB and serving ~100 Gbps. Files flow from the encode store out to them; members stream from the nearest one.',
      ],
      changes: [
        { sign: '+', text: 'Recommendations pipeline' },
        { sign: '+', text: 'OCA fleet (IXP and in-ISP)' },
        { sign: '+', text: 'Encode store' },
      ],
      scene: {
        nodes: nx('member', 'gw', 'play', 'home', 'rows', 'events', 'recs', 'encodes', 'ixp', 'oca'),
        links: [...nxControl, L('events', 'recs'), L('recs', 'rows'), ...nxData],
        flows: [
          F(['member', 'gw', 'play'], { ret: true }),
          F(['member', 'oca'], { ret: true, retKind: 'data', n: 3, delay: 0.8 }),
          F(['encodes', 'ixp', 'oca'], { kind: 'data', delay: 1.4 }),
          F(['play', 'events', 'recs', 'rows'], { kind: 'event', delay: 2 }),
        ],
        notes: [
          { at: [5.25, -1.75], text: 'control plane', icon: Cloud },
          { at: [-5.25, 5.3], text: 'data plane', icon: HardDrive },
        ],
      },
      metrics: { start: '2.5 s', rebuf: '0.5%' },
    },
    {
      short: 'Encoding',
      title: 'Encode once, offline, very well',
      tag: 'Deep Dive',
      body: [
        'Each studio master is cut into shots or chunks and encoded in parallel into **~120 files**: H.264/HEVC/AV1, SD to 4K HDR, many audio tracks. There is no deadline pressure, so spend compute on quality: a **per-title ladder** picks bitrates from measured visual quality.',
        'A cartoon can look perfect at 1.5 Mbps where an action film needs 8; per-title and per-shot encoding cut bandwidth ~20–30% at equal quality. Every encode is validated before it is published to the **encode store** in object storage.',
      ],
      callout: { kind: 'tip', text: 'Offline encoding turns compute into bandwidth savings: you pay once per title and save on every one of millions of plays.' },
      changes: [{ sign: '+', text: 'Studio masters and per-title encoder' }],
      scene: {
        nodes: nx('member', 'masters', ['encoder', { meter: 75 }], 'encodes', 'ixp', 'oca'),
        links: [L('masters', 'encoder'), L('encoder', 'encodes'), ...nxData],
        flows: [F(['masters', 'encoder', 'encodes'], { kind: 'data', n: 3 }), F(['member', 'oca'], { ret: true, retKind: 'data', delay: 1.4 })],
        notes: [
          { at: [3.5, -0.6], text: 'per-title bitrate ladder', icon: Sparkles },
          { at: [3.5, 0.6], text: '~120 files per title', icon: Archive },
        ],
      },
    },
    {
      short: 'Push vs pull',
      title: 'Pre-position files before demand',
      tag: 'Trade-off',
      body: [
        'A **pull** CDN caches on first request, so early viewers in each ISP miss and haul bytes across the backbone at peak. The catalog is predictable, so **push** instead: in a nightly off-peak **fill window**, appliances download what the forecast says their members will watch.',
        'IXP appliances fill from the encode store; ISP appliances fill from their IXP peers, so the backbone carries each file once per region. Result: **~95% of bytes** never leave the member’s ISP, and a new season is in place before its midnight release.',
      ],
      callout: { kind: 'key', text: 'Pull caching optimises for the unknown, pre-positioning for the known. Keep pull only as the fallback for forecast misses.' },
      scene: {
        nodes: nx('member', 'oca', 'ixp', 'encodes', 'encoder', 'masters'),
        links: [L('masters', 'encoder'), L('encoder', 'encodes'), ...nxData],
        flows: [
          F(['encodes', 'ixp', 'oca'], { kind: 'data', n: 3 }),
          F(['member', 'oca'], { ret: true, retKind: 'data', n: 2, delay: 1.5 }),
        ],
        notes: [
          { at: [-3.5, 1.7], text: 'fill window 2–8 am', icon: Timer },
          { at: [1, 1.5], text: '≈ 95% bytes in-ISP', icon: Network, tone: 'good' },
        ],
      },
      metrics: { local: '95%' },
      hi: ['local'],
    },
    {
      short: 'Steering',
      title: 'Pick the edge, then adapt the bitrate',
      tag: 'Deep Dive',
      body: [
        'On play, **Playback** looks up which appliances hold the title’s encodes, keeps those that are healthy and reachable on the member’s ISP route, and returns a **ranked list** of URLs. If one fails mid-stream, the client simply moves to the next.',
        'The client then runs **adaptive bitrate**: it measures throughput and buffer level and picks each next chunk’s encode, starting low for a fast start and climbing. The DRM license comes in the same call, so pressing play is one control-plane round trip.',
      ],
      scene: {
        nodes: nx('member', 'gw', 'play', 'events', 'oca', 'ixp'),
        links: [
          L('member', 'gw', { arrow: 'both' }),
          L('gw', 'play', { arrow: 'both' }),
          L('play', 'events'),
          L('member', 'oca', { arrow: 'both' }),
          L('member', 'ixp', { arrow: 'both', dashed: true, label: 'fallback' }),
        ],
        flows: [
          F(['member', 'gw', 'play'], { ret: true }),
          F(['member', 'oca'], { ret: true, retKind: 'data', n: 3, delay: 1 }),
          F(['member', 'ixp'], { ret: true, retKind: 'data', delay: 2.2 }),
          F(['play', 'events'], { kind: 'event', delay: 1.6 }),
        ],
        notes: [{ at: [1.5, -1.1], text: 'ranked: ISP → IXP → …', icon: Route }],
      },
      metrics: { start: '1.2 s', rebuf: '0.1%' },
      hi: ['start', 'rebuf'],
    },
    {
      short: 'Home rows',
      title: 'Personalised rows, precomputed',
      tag: 'Deep Dive',
      body: [
        'Play and browse **events** stream into a log. Large models train offline in **batch** on viewing history and produce candidate rows per profile, written to a **rows cache**. The home service reads them in one lookup and re-ranks with fresh **near-real-time** signals.',
        'Just finished a series? “Continue watching” and “Because you watched” update within minutes. Even **artwork** is personalised: a bandit picks which image of a title each profile sees, learning from what gets clicked.',
      ],
      callout: { kind: 'tip', text: 'Precompute the expensive part, personalise the cheap part at request time: the home page stays both fast and fresh.' },
      scene: {
        nodes: nx('member', 'gw', 'play', 'home', 'rows', 'events', ['recs', { meter: 70 }]),
        links: [...nxControl, L('events', 'recs'), L('recs', 'rows', { label: 'nightly' })],
        flows: [
          F(['play', 'events', 'recs', 'rows'], { kind: 'event', n: 2 }),
          F(['member', 'gw', 'home', 'rows'], { ret: true, delay: 1 }),
        ],
        notes: [{ at: [6.5, -3.3], text: 'batch daily + NRT minutes', icon: Sparkles }],
      },
    },
    {
      short: 'Bottleneck',
      title: 'A whole region goes dark',
      tag: 'Bottleneck',
      body: [
        'If region A fails, every home-page load and play click routed there fails. Run the control plane **active-active in three regions** with replicated member data; on failure, DNS and edge routing **shift traffic** to the survivors, which must keep headroom to absorb it.',
        'The data plane barely notices: streams already playing keep fetching from OCAs, which don’t depend on any region. If recommendations degrade, the home service falls back to **non-personalised** popular rows rather than an error page.',
      ],
      changes: [
        { sign: '~', text: 'Region A down' },
        { sign: '+', text: 'Traffic shifted to region B' },
      ],
      scene: {
        nodes: nx('member', ['gw', { status: 'down' }], ['gwB', { meter: 80 }], 'play', 'home', 'rows', 'oca', 'ixp'),
        links: [
          L('member', 'gw', { tone: 'bad', dashed: true }),
          L('member', 'gwB', { arrow: 'both' }),
          L('gwB', 'play', { arrow: 'both' }),
          L('gw', 'home', { tone: 'muted', dashed: true }),
          L('home', 'rows'),
          ...nxData.slice(0, 2),
        ],
        flows: [
          F(['member', 'gw'], { kind: 'error', stop: true }),
          F(['member', 'gwB', 'play'], { ret: true, delay: 0.6 }),
          F(['member', 'oca'], { ret: true, retKind: 'data', n: 3, delay: 1.2 }),
        ],
        notes: [{ at: [-3.5, 1.7], text: 'streams keep playing', icon: Play, tone: 'good' }],
      },
      metrics: { start: '1.6 s' },
      bad: ['start'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Control plane in the cloud, **data plane inside ISPs**. Encode each title offline into a per-title ladder, **pre-position** files on appliances during off-peak fill windows, and let playback steering hand clients a ranked list of nearby edges.',
        'Clients adapt bitrate chunk by chunk; recommendations are batch-trained, cached per profile and re-ranked with fresh signals. Region loss moves the control plane; video keeps flowing from the edges.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'When content is known in advance, move work earlier: encode before release, place files before demand, compute rows before the visit.' },
      scene: {
        nodes: nx('member', 'gw', 'play', 'home', 'rows', 'events', 'recs', 'masters', 'encoder', 'encodes', 'ixp', 'oca'),
        links: [...nxControl, L('events', 'recs'), L('recs', 'rows'), L('masters', 'encoder'), L('encoder', 'encodes'), ...nxData],
        flows: [
          F(['masters', 'encoder', 'encodes', 'ixp', 'oca'], { kind: 'data' }),
          F(['member', 'oca'], { ret: true, retKind: 'data', n: 2, delay: 0.8 }),
          F(['member', 'gw', 'home', 'rows'], { ret: true, delay: 1.6 }),
        ],
      },
      metrics: { egress: '200 Tbps', local: '95%', start: '1.2 s', rebuf: '0.1%' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Q24 · Design Spotify                                                */
/* ------------------------------------------------------------------ */

const sp = cast({
  phone: { kind: 'phone', at: [-7, 0], tag: 'listener', tagIcon: Headphones },
  cache: { kind: 'slab', at: [-7, 3.5], tag: 'device cache', icon: HardDrive, tone: 'orange' },
  sys: { kind: 'cube', at: [-3.5, 0], label: 'Spotify', sub: '?', icon: Headphones, tone: 'gray' },
  gw: { kind: 'cube', at: [-3.5, 0], label: 'Gateway', sub: 'API', icon: Split, tone: 'green' },
  search: { kind: 'cube', at: [-7, -3.5], label: 'Search', sub: 'typeahead', icon: Search, tone: 'blue' },
  license: { kind: 'cube', at: [-3.5, -3.5], label: 'License', sub: 'DRM keys', icon: KeyRound, tone: 'yellow' },
  library: { kind: 'cube', at: [0, -3.5], label: 'Library', sub: 'playlists', icon: ListMusic, tone: 'blue' },
  playlists: { kind: 'db', at: [3.5, -3.5], tag: 'playlists', icon: Database },
  events: { kind: 'queue', at: [0, 0], tag: 'play events', items: 3 },
  batch: { kind: 'cube', at: [3.5, 0], label: 'Batch', sub: 'data lake', icon: Sparkles, tone: 'blue' },
  royalty: { kind: 'db', at: [7, 0], tag: 'royalty ledger', icon: Coins },
  cdn: { kind: 'cube', at: [-3.5, 3.5], label: 'CDN', sub: 'hot tracks', icon: Globe, tone: 'teal' },
  origin: { kind: 'slab', at: [0, 3.5], tag: 'audio origin', icon: Archive, tone: 'violet' },
});

const spCore = [
  L('phone', 'gw', { arrow: 'both' }),
  L('gw', 'search', { arrow: 'both' }),
  L('gw', 'license', { arrow: 'both' }),
  L('gw', 'library', { arrow: 'both' }),
  L('library', 'playlists', { arrow: 'both' }),
  L('gw', 'events'),
  L('phone', 'cdn', { arrow: 'both' }),
  L('cdn', 'origin', { label: 'miss' }),
  L('phone', 'cache', { arrow: 'both' }),
];

export const qSpotify: Question = {
  id: 'q-spotify',
  n: 24,
  title: 'Design Spotify',
  blurb: 'Start any of 100M tracks in a blink, play offline, and count every stream exactly once for royalties.',
  minutes: 14,
  level: 'Advanced',
  concepts: ['Streaming', 'Caching', 'Recommendations'],
  related: ['caching', 'cdn', 'batch-stream', 'encryption', 'message-queues'],
  followUps: [
    'How would you implement shuffle so it feels random to people?',
    'How do you hand playback off from a phone to a smart speaker?',
    'How do you handle a label pulling a track in one country?',
    'How would you support real-time collaborative playlist editing?',
  ],
  keywords: ['spotify', 'music streaming', 'prefetch', 'client cache', 'offline downloads', 'drm', 'playlists', 'play events', 'royalties', 'search'],
  metrics: [
    { id: 'start', label: 'Play start', icon: Timer },
    { id: 'hit', label: 'CDN byte hit', icon: Percent },
    { id: 'egress', label: 'Egress', icon: Wifi },
    { id: 'events', label: 'Play events', icon: Activity },
  ],
  learn: [
    { text: 'Playlist data model with position keys and snapshots', at: 2 },
    { text: 'Instant play-start with device cache and prefetch', at: 4 },
    { text: 'CDN for hot tracks, origin for the long tail', at: 5 },
    { text: 'Offline downloads with device-bound DRM licenses', at: 6 },
    { text: 'One event log for royalties and recommendations', at: 7 },
  ],
  steps: [
    {
      short: 'Scope',
      title: 'Any song, instantly, even offline',
      tag: 'Requirements',
      body: [
        'Functional: search ~100M tracks, **play instantly**, build and share **playlists**, save a library, and **download** music for offline listening on premium. Out of scope: podcasts, social features, payments and artist tools.',
        'Non-functional: play starts in **< 300 ms** — people skip constantly, so start time is the product. Playback should survive a subway tunnel. Every play must be **counted accurately**, because royalties are paid on it.',
      ],
      callout: { kind: 'tip', text: 'Unlike video, bandwidth is cheap here — a track is ~4 MB. The hard parts are perceived latency, offline rights and exact counting.' },
      scene: {
        nodes: sp('phone', 'sys'),
        links: [L('phone', 'sys', { arrow: 'both' })],
        flows: [F(['phone', 'sys'], { ret: true, retKind: 'data', n: 2 })],
        notes: [
          { at: [2.8, -2.4], text: '600M users · 100M tracks', icon: Users },
          { at: [2.8, -1.2], text: 'play start < 300 ms', icon: Timer, tone: 'good' },
          { at: [2.8, 0], text: 'every play → royalties', icon: Coins, tone: 'warn' },
        ],
      },
      metrics: { start: '—', hit: '—', egress: '—', events: '—' },
    },
    {
      short: 'Numbers',
      title: 'Small files, huge counts',
      tag: 'Estimation',
      body: [
        'A 3.5-minute track at 160 kbps is **~4 MB**. With ~30M concurrent listeners at peak, egress is **~5 Tbps** — large, but a fraction of video. Catalog: 100M tracks × ~4 encodings × 4 MB ≈ **1.6 PB**, cheap in object storage.',
        '~3B plays a day ≈ **35k plays/s** (~100k at peak), each emitting start, progress and end events: **~500k events/s** at peak. Plays are concentrated — the top ~1% of tracks draw most streams while a vast **long tail** is played a few times a month.',
      ],
      scene: {
        nodes: sp('phone', 'sys'),
        links: [L('phone', 'sys', { arrow: 'both' })],
        flows: [F(['phone', 'sys'], { ret: true, retKind: 'data', n: 4 })],
        notes: [
          { at: [2.8, -2.4], text: '30M × 160 kbps ≈ 5 Tbps', icon: Wifi },
          { at: [2.8, -1.2], text: '100M × 4 × 4 MB ≈ 1.6 PB', icon: Archive },
          { at: [2.8, 0], text: '≈ 500k events/s peak', icon: Activity, tone: 'warn' },
        ],
      },
      metrics: { egress: '5 Tbps', events: '500k /s' },
    },
    {
      short: 'Data model',
      title: 'Playlists, library and tracks',
      tag: 'Data Model',
      body: [
        '`playlists(playlist_id, owner, name, snapshot_id)` with `playlist_items(playlist_id, position_key, track_id, added_by)`: a fractional **position key** inserts or moves a track without renumbering 5,000 rows. `library(user_id, item_id, added_at)` is partitioned by user.',
        'API: `GET /tracks/{id}/stream` → file ids per bitrate and CDN URLs; `POST /playlists/{id}/items` carries the last `snapshot_id` for **optimistic concurrency** on shared playlists; `GET /search?q=` powers typeahead.',
      ],
      changes: [
        { sign: '+', text: 'Gateway and Library service' },
        { sign: '+', text: 'Playlist store' },
        { sign: '+', text: 'Search' },
      ],
      scene: {
        nodes: sp('phone', 'gw', 'search', 'library', 'playlists'),
        links: [
          L('phone', 'gw', { arrow: 'both' }),
          L('gw', 'search', { arrow: 'both' }),
          L('gw', 'library', { arrow: 'both' }),
          L('library', 'playlists', { arrow: 'both' }),
        ],
        flows: [
          F(['phone', 'gw', 'library', 'playlists'], { ret: true }),
          F(['phone', 'gw', 'search'], { ret: true, delay: 1.2 }),
        ],
        notes: [{ at: [3.5, -1.2], text: 'snapshot_id = version', icon: ListMusic }],
      },
    },
    {
      short: 'Design',
      title: 'Metadata via API, audio via CDN',
      tag: 'Design',
      body: [
        'Control traffic — search, library, playlists, licenses — goes through the **gateway** to small services. Audio bypasses them: the client fetches encrypted files from a **CDN**, which falls back to the **origin** object store for anything not cached.',
        'Search is a sharded inverted index over track, artist and album names, ranked by popularity so “tay” finds the right artist in a few keystrokes. Every client also emits **play events** into a log that feeds royalties and recommendations.',
      ],
      changes: [
        { sign: '+', text: 'CDN and audio origin' },
        { sign: '+', text: 'License service' },
        { sign: '+', text: 'Play-event log and device cache' },
      ],
      scene: {
        nodes: sp('phone', 'cache', 'gw', 'search', 'license', 'library', 'playlists', 'events', 'cdn', 'origin'),
        links: spCore,
        flows: [
          F(['phone', 'gw', 'library', 'playlists'], { ret: true }),
          F(['phone', 'cdn', 'origin'], { ret: true, retKind: 'data', delay: 0.8 }),
          F(['phone', 'gw', 'events'], { kind: 'event', delay: 1.6 }),
        ],
      },
      metrics: { start: '450 ms', hit: '85%' },
    },
    {
      short: 'Play start',
      title: 'Hide the network: cache and prefetch',
      tag: 'Deep Dive',
      body: [
        'The fastest request is the one never made. The client keeps a multi-GB **on-device cache** of recently played tracks (LRU, encrypted), so repeat plays start from disk. While a track plays, it **prefetches** the start of the next track in the queue.',
        'For a cold play, the client range-requests the first ~**256 KB** from the CDN in parallel with the metadata lookup and starts once a few seconds are decoded — low bitrate first, upgrade after. Goal: most plays need **zero** network round trips.',
      ],
      callout: { kind: 'key', text: 'Perceived latency is a client problem: predict the next action and do the work before the tap.' },
      scene: {
        nodes: sp('phone', ['cache', { status: 'hot' }], 'gw', 'cdn', 'origin'),
        links: [
          L('phone', 'gw', { arrow: 'both' }),
          L('phone', 'cache', { arrow: 'both' }),
          L('phone', 'cdn', { arrow: 'both', label: 'prefetch next' }),
          L('cdn', 'origin'),
        ],
        flows: [
          F(['phone', 'cache'], { ret: true, retKind: 'data', n: 2 }),
          F(['phone', 'cdn'], { ret: true, retKind: 'data', delay: 0.8 }),
          F(['phone', 'gw'], { ret: true, delay: 1.6 }),
        ],
        notes: [
          { at: [0, 0], text: 'repeat play: 0 RTT', icon: HardDrive, tone: 'good' },
          { at: [0, 1.2], text: 'first 256 KB in parallel', icon: Zap },
        ],
      },
      metrics: { start: '120 ms' },
      hi: ['start'],
    },
    {
      short: 'Long tail',
      title: 'CDN for hits, origin for the long tail',
      tag: 'Trade-off',
      body: [
        'Popular tracks — a few percent of the catalog — sit in **CDN edges** and serve ~95% of bytes. The other tens of millions are played so rarely that caching them everywhere wastes edge space; misses go to a regional **origin** backed by object storage.',
        'A long-tail miss adds maybe 100 ms, which prefetch and the device cache usually hide. Early desktop clients also used **peer-to-peer** to offload servers; as CDN bandwidth got cheaper, central delivery won on simplicity and mobile battery life.',
      ],
      callout: { kind: 'tip', text: 'Read the hit-ratio curve: going from 90% to 95% byte hit can need 2× the edge storage. Check whether prefetch already hides those misses.' },
      scene: {
        nodes: sp('phone', 'cache', ['cdn', { meter: 70 }], 'origin'),
        links: [L('phone', 'cache', { arrow: 'both' }), L('phone', 'cdn', { arrow: 'both' }), L('cdn', 'origin', { label: 'miss' })],
        flows: [
          F(['phone', 'cdn'], { ret: true, retKind: 'data', n: 3 }),
          F(['cdn', 'origin'], { ret: true, retKind: 'data', delay: 1.2 }),
        ],
        notes: [
          { at: [0, 0], text: 'tail miss ≈ +100 ms', icon: Timer, tone: 'warn' },
          { at: [0, 1.2], text: 'top ~3% tracks ≈ 95% bytes', icon: Zap, tone: 'good' },
        ],
      },
      metrics: { hit: '95%' },
      hi: ['hit'],
    },
    {
      short: 'Offline',
      title: 'Offline downloads with DRM',
      tag: 'Deep Dive',
      body: [
        'Downloads are the same **encrypted** files, kept on the device. Playing them needs a key from the **license** service, bound to the device and account, with an expiry: the app must come online every ~30 days to renew, or downloads stop playing.',
        'Limits — say 10k tracks on up to 5 devices — are enforced when licenses are issued. If a subscription lapses or a label pulls a track, the next renewal fails and the key is gone. Plays made offline are buffered and uploaded later for royalties.',
      ],
      callout: { kind: 'warn', text: 'Never write plaintext audio to disk: the file must be useless without a short-lived, device-bound key.' },
      scene: {
        nodes: sp('phone', ['cache', { tag: 'downloads' }], 'gw', 'license', 'events'),
        links: [
          L('phone', 'gw', { arrow: 'both' }),
          L('gw', 'license', { arrow: 'both' }),
          L('phone', 'cache', { arrow: 'both' }),
          L('gw', 'events'),
        ],
        flows: [
          F(['phone', 'gw', 'license'], { kind: 'handshake', ret: true, retKind: 'handshake' }),
          F(['phone', 'cache'], { ret: true, retKind: 'data', delay: 1 }),
          F(['phone', 'gw', 'events'], { kind: 'event', delay: 1.8 }),
        ],
        notes: [{ at: [0, -1.7], text: 'key expires in 30 days', icon: KeyRound, tone: 'warn' }],
      },
    },
    {
      short: 'Play events',
      title: 'Play events pay artists and pick songs',
      tag: 'Deep Dive',
      body: [
        'Each play emits events (`track_id`, `ms_played`, context, device) with a client-made **event id**, into a durable log and then a **data lake**. Jobs dedupe by event id and count streams over ~30 s into a **royalty ledger** — it is money, so the path is idempotent.',
        'The same data trains recommendations. Weekly, a **batch** job blends each user’s listening with similar users’ (collaborative filtering) and audio features, and writes a **personalised playlist** per user — an ordinary playlist row, served like any other.',
      ],
      callout: { kind: 'key', text: 'Write once, read many: one event log feeds royalties (exact, batch) and recommendations (approximate, ML) independently.' },
      changes: [
        { sign: '+', text: 'Batch jobs over the data lake' },
        { sign: '+', text: 'Royalty ledger' },
      ],
      scene: {
        nodes: sp('phone', 'gw', 'library', 'playlists', ['events', { items: 5 }], 'batch', 'royalty'),
        links: [
          L('phone', 'gw', { arrow: 'both' }),
          L('gw', 'library', { arrow: 'both' }),
          L('library', 'playlists', { arrow: 'both' }),
          L('gw', 'events'),
          L('events', 'batch'),
          L('batch', 'royalty'),
          L('batch', 'playlists'),
        ],
        flows: [
          F(['phone', 'gw', 'events', 'batch'], { kind: 'event', n: 3 }),
          F(['batch', 'royalty'], { kind: 'data', delay: 1 }),
          F(['batch', 'playlists'], { kind: 'data', delay: 1.6 }),
        ],
        notes: [
          { at: [6.5, -3.2], text: 'Mondays: 1 mix per user', icon: Sparkles },
          { at: [6.5, -1.7], text: 'count if ≥ 30 s played', icon: Coins },
        ],
      },
    },
    {
      short: 'Bottleneck',
      title: 'Midnight album drop',
      tag: 'Bottleneck',
      body: [
        'A superstar releases an album at midnight: tens of millions search the same name and play the same 12 tracks within minutes. Cold edges would stampede the origin, and the artist page and album playlist become **hot keys**.',
        'Fixes: **pre-warm** CDN edges with the encrypted files before release — keys are only issued after the embargo; cache typeahead results for hot prefixes; serve the hot playlist from a cache keyed by `snapshot_id`; let the event log absorb the burst.',
      ],
      changes: [
        { sign: '~', text: 'Edges pre-warmed before release' },
        { sign: '~', text: 'Hot prefixes and playlists cached' },
      ],
      scene: {
        nodes: sp('phone', 'cache', 'gw', ['search', { status: 'hot' }], 'license', 'library', 'playlists', ['events', { items: 7 }], ['cdn', { status: 'hot' }], 'origin'),
        links: spCore,
        flows: [
          F(['origin', 'cdn'], { kind: 'data', n: 2 }),
          F(['phone', 'gw', 'search'], { ret: true, n: 3, delay: 0.8 }),
          F(['phone', 'cdn'], { ret: true, retKind: 'data', n: 3, delay: 1.2 }),
          F(['phone', 'gw', 'events'], { kind: 'event', n: 2, delay: 1.6 }),
        ],
        notes: [{ at: [2.4, 1.9], text: 'pre-warm before 00:00', icon: Timer, tone: 'good' }],
      },
      metrics: { start: '250 ms', events: '2M /s' },
      bad: ['start', 'events'],
    },
    {
      short: 'Recap',
      title: 'The whole design',
      tag: 'Recap',
      body: [
        'Audio is small, so optimise **perceived latency**: device cache, prefetch of the next track, small first requests, then a **CDN** for hits and origin for the long tail. Offline play is encrypted files plus short-lived, device-bound **licenses**.',
        'Playlists are rows with position keys and snapshot ids; one **play-event log** feeds exact royalties and weekly personalised playlists. Spikes are met by pre-warming edges and caching hot keys.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'For small media the network is not the bottleneck — waiting is. Predict, prefetch and cache on the client, and count every play exactly once.' },
      scene: {
        nodes: sp('phone', 'cache', 'gw', 'search', 'license', 'library', 'playlists', 'events', 'batch', 'royalty', 'cdn', 'origin'),
        links: [...spCore, L('events', 'batch'), L('batch', 'royalty'), L('batch', 'playlists')],
        flows: [
          F(['phone', 'cache'], { ret: true, retKind: 'data' }),
          F(['phone', 'cdn', 'origin'], { ret: true, retKind: 'data', delay: 0.8 }),
          F(['phone', 'gw', 'events', 'batch', 'royalty'], { kind: 'event', delay: 1.6 }),
        ],
      },
      metrics: { start: '120 ms', hit: '95%', egress: '5 Tbps', events: '500k /s' },
    },
  ],
};
