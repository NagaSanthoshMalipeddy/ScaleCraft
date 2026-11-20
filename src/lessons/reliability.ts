import { Activity, Bot, CircleSlash, Clock, CreditCard, Gauge, KeyRound, Landmark, Repeat, Server, ShoppingCart, Smartphone, TriangleAlert, Users, Zap } from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* Rate limiting                                                        */
/* ------------------------------------------------------------------ */

const rl = cast({
  app: { kind: 'device', at: [-5.5, -3.5], tag: 'mobile app', tagIcon: Smartphone },
  script: { kind: 'cube', at: [-5.5, 3.5], label: 'Script', sub: 'runaway', icon: Bot, tone: 'rose' },
  limiter: { kind: 'cube', at: [-2, 0], label: 'Limiter', icon: Gauge, tone: 'green' },
  api: { kind: 'cube', at: [2, 0], label: 'API', icon: Server, tone: 'blue' },
  store: { kind: 'cube', at: [1.5, -3.5], label: 'Store', sub: 'counters', icon: Zap, tone: 'orange', size: 'sm' },
});

export const rateLimiting: Lesson = {
  id: 'rate-limiting',
  title: 'Rate Limiting',
  blurb: 'Give every client a fair budget, so one runaway script can’t take everyone down.',
  minutes: 8,
  level: 'Intermediate',
  keywords: ['rate limit', 'token bucket', '429', 'throttle', 'quota', 'retry-after', 'fairness', 'abuse'],
  metrics: [
    { id: 'in', label: 'Incoming', icon: Activity },
    { id: 'api', label: 'API load', icon: Gauge },
    { id: 'errors', label: 'App errors', icon: TriangleAlert },
  ],
  learn: [
    { text: 'Why one client can hurt everyone', at: 0 },
    { text: 'How a token bucket works', at: 1 },
    { text: 'Rejecting politely with 429 + Retry-After', at: 2 },
    { text: 'Per-key fairness', at: 3 },
    { text: 'Rate limiting across many servers', at: 4 },
  ],
  steps: [
    {
      short: 'Runaway',
      title: 'One script, everyone suffers',
      tag: 'Problem',
      body: [
        'A partner’s sync script has a bug: it retries in a tight loop, sending **2,000 requests per second**. The API pins at 100% CPU.',
        'Ordinary mobile users — who did nothing wrong — start seeing timeouts and errors.',
      ],
      scene: {
        nodes: rl('app', 'script', ['api', { meter: 100, status: 'hot' }]),
        links: [L('app', 'api', { elbow: false }), L('script', 'api', { tone: 'bad', label: '2,000 req/s', elbow: false })],
        flows: [F(['script', 'api'], { kind: 'request', n: 8, speed: 1.3 }), F(['app', 'api'], { ret: true, retKind: 'error', delay: 0.5, speed: 0.6 })],
      },
      metrics: { in: '2,050 /s', api: '100%', errors: '18%' },
      bad: ['api', 'errors'],
    },
    {
      short: 'Token bucket',
      title: 'A bucket of tokens per client',
      tag: 'Technique',
      body: [
        'Put a **limiter** in front. Each API key gets a bucket that holds up to 20 tokens and refills at 10 tokens per second. Every request spends one token.',
        'Bursts up to 20 are fine; sustained traffic is capped at 10/s. An empty bucket means: not right now.',
      ],
      callout: { kind: 'tip', text: 'Token buckets allow short bursts (good for real users) while enforcing a long-run average (good for your servers).' },
      changes: [{ sign: '+', text: 'Rate limiter' }],
      scene: {
        nodes: rl('app', 'script', 'limiter', ['api', { meter: 35 }]),
        links: [L('app', 'limiter'), L('script', 'limiter', { tone: 'bad' }), L('limiter', 'api')],
        flows: [F(['app', 'limiter', 'api'], { ret: true }), F(['script', 'limiter'], { kind: 'request', n: 6, stop: true, speed: 1.3 }), F(['script', 'limiter', 'api'], { delay: 1.1 })],
        notes: [{ at: [-2, -3.2], text: '20 tokens · +10/s', icon: KeyRound }],
      },
      metrics: { in: '2,050 /s', api: '35%', errors: '0%' },
      hi: ['api', 'errors'],
    },
    {
      short: '429',
      title: 'Say no — clearly',
      tag: 'Technique',
      body: [
        'Rejected requests get `429 Too Many Requests` with a `Retry-After` header, and usually headers showing the remaining budget.',
        'Rejecting at the edge is cheap: no database work, no app code. Well-behaved clients back off and retry later.',
      ],
      scene: {
        nodes: rl('app', 'script', 'limiter', ['api', { meter: 35 }]),
        links: [L('app', 'limiter'), L('script', 'limiter', { tone: 'bad', arrow: 'both', label: '429 · Retry-After: 2' }), L('limiter', 'api')],
        flows: [F(['script', 'limiter'], { ret: true, retKind: 'error', n: 4 }), F(['app', 'limiter', 'api'], { ret: true, delay: 0.6 })],
      },
    },
    {
      short: 'Fairness',
      title: 'Budgets per key, not per server',
      tag: 'Trade-off',
      body: [
        'Limit by **who** is calling — API key, user ID, or IP for anonymous traffic — so one client’s excess never eats another’s budget.',
        'Add a global limit too, as a last line of defence. IP limits are blunt: many users can share one office or mobile carrier IP.',
      ],
      scene: {
        nodes: rl(['app', { kind: 'crowd', tag: 'app users', tagIcon: Users, items: 5 }], 'script', 'limiter', ['api', { meter: 40 }]),
        links: [L('app', 'limiter', { label: 'key A · 3/20 used' }), L('script', 'limiter', { tone: 'bad', label: 'key B · 20/20' }), L('limiter', 'api')],
        flows: [F(['app', 'limiter', 'api'], { ret: true, n: 3 }), F(['script', 'limiter'], { ret: true, retKind: 'error', n: 3, delay: 0.3 })],
      },
    },
    {
      short: 'Many servers',
      title: 'Ten limiters, one budget',
      tag: 'Technique',
      body: [
        'You run many limiter instances behind a load balancer. If each counts alone, a client gets 10× its budget.',
        'Share counters in a fast **in-memory store** using atomic increment-with-expiry. Or keep local counters and sync them periodically — slightly less precise, much cheaper.',
      ],
      changes: [{ sign: '+', text: 'Shared counter store' }],
      scene: {
        nodes: rl(['app', { kind: 'crowd', tag: 'app users', tagIcon: Users, items: 5 }], 'script', ['limiter', { label: 'Limiter', sub: '× 10' }], ['api', { meter: 40 }], 'store'),
        links: [L('app', 'limiter'), L('script', 'limiter', { tone: 'bad' }), L('limiter', 'api'), L('limiter', 'store', { arrow: 'both', label: 'INCR key:B' })],
        flows: [F(['limiter', 'store'], { kind: 'data', ret: true, retKind: 'data', n: 2 }), F(['app', 'limiter', 'api'], { ret: true, delay: 0.8 }), F(['script', 'limiter'], { ret: true, retKind: 'error', delay: 0.4 })],
      },
    },
    {
      short: 'Recap',
      title: 'Rate limiting, summed up',
      tag: 'Recap',
      body: [
        'Rate limits protect shared capacity and keep things fair. A **token bucket** per client allows bursts and caps the average.',
        'Reject early with **429 + Retry-After**, limit per key (plus a global cap), and share counters when you have many limiter instances.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Every public API needs limits before it needs them. Add them on day one.' },
      scene: {
        nodes: rl(['app', { kind: 'crowd', tag: 'app users', tagIcon: Users, items: 5 }], 'script', ['limiter', { sub: '× 10' }], ['api', { meter: 40 }], 'store'),
        links: [L('app', 'limiter'), L('script', 'limiter', { tone: 'bad' }), L('limiter', 'api'), L('limiter', 'store', { arrow: 'both' })],
        flows: [F(['app', 'limiter', 'api'], { ret: true, n: 2 }), F(['script', 'limiter'], { ret: true, retKind: 'error', n: 2, delay: 0.4 })],
      },
      metrics: { in: '2,050 /s', api: '40%', errors: '0%' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Timeouts & retries                                                   */
/* ------------------------------------------------------------------ */

const tr = cast({
  users: { kind: 'crowd', at: [-6.5, 0], tag: 'shoppers', tagIcon: Users, items: 5 },
  checkout: { kind: 'cube', at: [-2.5, 0], label: 'Checkout', icon: ShoppingCart, tone: 'blue' },
  payments: { kind: 'cube', at: [1.5, 0], label: 'Payments', icon: CreditCard, tone: 'yellow' },
  bank: { kind: 'cube', at: [5.5, 0], label: 'Bank', sub: 'network', icon: Landmark, tone: 'violet' },
});

const trLinks = [L('users', 'checkout'), L('checkout', 'payments'), L('payments', 'bank')];

export const timeoutsRetries: Lesson = {
  id: 'timeouts-retries',
  title: 'Timeouts & Retries',
  blurb: 'Calling a struggling service safely: give up in time, retry carefully, and know when to stop.',
  minutes: 11,
  level: 'Intermediate',
  keywords: ['timeout', 'retry', 'backoff', 'jitter', 'circuit breaker', 'idempotency key', 'cascading failure', 'retry storm'],
  metrics: [
    { id: 'p99', label: 'Checkout p99', icon: Clock },
    { id: 'load', label: 'Load on bank', icon: Activity },
    { id: 'ok', label: 'Success rate', icon: Repeat },
  ],
  learn: [
    { text: 'How one slow dependency cascades', at: 0 },
    { text: 'Timeouts as a safety valve', at: 1 },
    { text: 'When a retry helps', at: 2 },
    { text: 'Retry storms, backoff and jitter', at: 4 },
    { text: 'Circuit breakers and idempotency keys', at: 6 },
  ],
  steps: [
    {
      short: 'Hang',
      title: 'The bank slows down; you go down',
      tag: 'Problem',
      body: [
        'The card network starts answering in 30 s instead of 300 ms. Payments has no timeout, so every request just **waits**, holding a thread.',
        'Soon all of Payments’ threads are stuck — then all of Checkout’s. A slowdown in someone else’s system has become **your** outage.',
      ],
      scene: {
        nodes: tr('users', ['checkout', { meter: 100, status: 'hot' }], ['payments', { meter: 100, status: 'hot' }], ['bank', { status: 'hot', tone: 'rose' }]),
        links: trLinks,
        flows: [F(['users', 'checkout', 'payments', 'bank'], { n: 6, speed: 0.6, stop: true })],
        notes: [{ at: [5.5, -3.2], text: '30 s per call', tone: 'bad' }],
      },
      metrics: { p99: '30 s+', load: '1×', ok: '12%' },
      bad: ['p99', 'ok'],
    },
    {
      short: 'Timeout',
      title: 'Give up in time',
      tag: 'Technique',
      body: [
        'Set a **timeout** on every network call. If the bank hasn’t answered in 800 ms, Payments stops waiting, frees the thread, and returns an error.',
        'Checkout shows “please try again” instead of a spinner forever. Failure is fast and contained.',
      ],
      callout: { kind: 'tip', text: 'Base timeouts on the dependency’s real p99.9, and keep the total budget of nested calls below what the caller allows.' },
      scene: {
        nodes: tr('users', ['checkout', { meter: 30 }], ['payments', { meter: 35 }], ['bank', { status: 'hot', tone: 'rose' }]),
        links: [...trLinks.slice(0, 2), L('payments', 'bank', { label: 'timeout 800 ms', tone: 'bad' })],
        flows: [F(['users', 'checkout', 'payments'], { ret: true, retKind: 'error', n: 2 }), F(['payments', 'bank'], { stop: true, delay: 0.4 })],
      },
      metrics: { p99: '0.9 s', ok: '40%' },
      hi: ['p99'],
    },
    {
      short: 'Retry',
      title: 'Most blips are brief — try again',
      tag: 'Technique',
      body: [
        'Many failures are transient: a dropped packet, a restarting instance. **Retrying once** after a short pause often succeeds.',
        'Only retry what is safe to repeat, and only for errors that might go away (timeouts, 503) — not for “card declined”.',
      ],
      scene: {
        nodes: tr('users', ['checkout', { meter: 25 }], ['payments', { meter: 30 }], 'bank'),
        links: trLinks,
        flows: [F(['payments', 'bank'], { stop: true, delay: 0.2 }), F(['payments', 'bank'], { ret: true, delay: 2.0 })],
        notes: [{ at: [3.5, -2.6], text: 'try 1 ✗ · try 2 ✓', icon: Repeat }],
      },
      metrics: { p99: '0.7 s', ok: '99.5%' },
      hi: ['ok'],
    },
    {
      short: 'Storm',
      title: 'Retries multiply',
      tag: 'Problem',
      body: [
        'Checkout retries Payments 3×, and Payments retries the bank 3×. When the bank struggles, it gets **9×** the traffic — exactly when it can least handle it. Add the mobile app retrying too: 27×.',
        'Retries turned a slowdown into a full outage that can’t recover on its own.',
      ],
      callout: { kind: 'warn', text: 'Retry at one layer only — usually the one closest to the user — or use retry budgets.' },
      scene: {
        nodes: tr('users', ['checkout', { meter: 70 }], ['payments', { meter: 95, status: 'hot' }], ['bank', { status: 'hot', tone: 'rose' }]),
        links: [L('users', 'checkout', { label: '× 3' }), L('checkout', 'payments', { label: '× 3' }), L('payments', 'bank', { label: '× 9', tone: 'bad' })],
        flows: [F(['users', 'checkout'], { n: 3 }), F(['checkout', 'payments'], { n: 5, delay: 0.3 }), F(['payments', 'bank'], { n: 9, delay: 0.5, speed: 1.2 })],
      },
      metrics: { load: '9×', ok: '3%' },
      bad: ['load', 'ok'],
    },
    {
      short: 'Backoff',
      title: 'Back off, with jitter',
      tag: 'Technique',
      body: [
        '**Exponential backoff**: wait 100 ms, then 200, 400, 800 — giving the dependency room to recover. Cap the number of attempts.',
        'Add **jitter** (randomise each wait) so thousands of clients don’t retry in synchronized waves.',
      ],
      scene: {
        nodes: tr('users', ['checkout', { meter: 35 }], ['payments', { meter: 40 }], ['bank', { meter: 60 }]),
        links: trLinks,
        flows: [F(['payments', 'bank'], { ret: true, delay: 0.2 }), F(['payments', 'bank'], { ret: true, delay: 0.9 }), F(['payments', 'bank'], { ret: true, delay: 2.1 })],
        notes: [
          { at: [3.5, -3.6], text: '100 ms ± rand' },
          { at: [3.5, -2.6], text: '200 ms ± rand' },
          { at: [3.5, 2.6], text: '400 ms ± rand' },
        ],
      },
      metrics: { load: '1.3×', ok: '97%' },
      hi: ['load', 'ok'],
    },
    {
      short: 'Breaker',
      title: 'Stop calling a dead service',
      tag: 'Technique',
      body: [
        'A **circuit breaker** counts failures. When most recent calls failed, it **opens**: calls fail instantly for 30 s without touching the bank.',
        'Then it lets one trial request through (**half-open**). Success closes the circuit; failure opens it again. The bank gets breathing room; users get a fast, honest error or a fallback.',
      ],
      changes: [{ sign: '+', text: 'Circuit breaker in Payments' }],
      scene: {
        nodes: tr('users', ['checkout', { meter: 20 }], ['payments', { meter: 15, tag: 'breaker: OPEN', tagIcon: CircleSlash }], ['bank', { status: 'hot', tone: 'rose' }]),
        links: [...trLinks.slice(0, 2), L('payments', 'bank', { dashed: true, tone: 'bad' })],
        flows: [F(['users', 'checkout', 'payments'], { ret: true, retKind: 'error', n: 3, speed: 1.4 }), F(['payments', 'bank'], { kind: 'handshake', stop: true, delay: 2.5 })],
      },
      metrics: { p99: '60 ms', load: '0.01×' },
      hi: ['p99', 'load'],
    },
    {
      short: 'Idempotency',
      title: 'Don’t charge twice',
      tag: 'Case',
      body: [
        'A charge request times out — but did the bank actually charge the card? Retrying blindly could charge it **twice**.',
        'Send an **idempotency key** with the request. The server stores the result per key; a retry with the same key returns the stored result instead of charging again.',
      ],
      callout: { kind: 'key', text: 'Retries are only safe when the operation is idempotent. Make it so with keys.' },
      scene: {
        nodes: tr('users', 'checkout', 'payments', 'bank'),
        links: [...trLinks.slice(0, 2), L('payments', 'bank', { label: 'Idempotency-Key: 7f3a', arrow: 'both' })],
        flows: [F(['payments', 'bank'], { stop: true, delay: 0.2 }), F(['payments', 'bank'], { ret: true, delay: 1.9 })],
        notes: [{ at: [5.5, -3.2], text: '7f3a → already charged ✓', tone: 'good' }],
      },
      metrics: { p99: '0.7 s', load: '1×', ok: '99.5%' },
    },
    {
      short: 'Recap',
      title: 'Timeouts & retries, summed up',
      tag: 'Recap',
      body: [
        'Every remote call needs a **timeout**. Retry only transient, idempotent operations, with **exponential backoff and jitter**, at one layer.',
        'Use **circuit breakers** to fail fast when a dependency is down, and **idempotency keys** to make retries safe.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'A dependency will be slow someday. Decide now how long you’ll wait and what you’ll do instead.' },
      scene: {
        nodes: tr('users', ['checkout', { meter: 30 }], ['payments', { meter: 30 }], ['bank', { meter: 40 }]),
        links: trLinks,
        flows: [F(['users', 'checkout', 'payments', 'bank'], { ret: true, n: 2 })],
      },
    },
  ],
};
