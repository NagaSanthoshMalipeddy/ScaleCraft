import {
  Activity,
  Bot,
  Bug,
  CircleCheck,
  CreditCard,
  Database,
  Dices,
  FlaskConical,
  Handshake,
  ListChecks,
  MonitorPlay,
  Package,
  Container,
  RotateCcw,
  Server,
  ShoppingCart,
  Split,
  Timer,
  ToggleRight,
  TriangleAlert,
  User,
  Users,
  Workflow,
} from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* Testing                                                              */
/* ------------------------------------------------------------------ */

const ts = cast({
  dev: { kind: 'device', at: [-6, 0], tag: 'developer', tagIcon: User },
  prod: { kind: 'cube', at: [4.5, 0], label: 'Checkout', sub: 'prod', icon: ShoppingCart, tone: 'blue' },
  shoppers: { kind: 'crowd', at: [4.5, -4.5], tag: 'shoppers', tagIcon: Users, items: 5 },
  ci: { kind: 'cube', at: [-2.5, 0], label: 'CI', sub: 'runner', icon: Workflow, tone: 'green' },
  unit: { kind: 'slab', at: [1, 3.5], tag: 'unit · 1,800', icon: FlaskConical, tone: 'blue', size: 'lg' },
  integ: { kind: 'slab', at: [1, 0], tag: 'integration · 240', icon: Container, tone: 'violet' },
  e2e: { kind: 'slab', at: [1, -3.5], tag: 'e2e · 12', icon: MonitorPlay, tone: 'orange', size: 'sm' },
  pg: { kind: 'db', at: [4.5, 0], tag: 'postgres (docker)', icon: Database },
  art: { kind: 'slab', at: [4.5, 0], tag: 'build #812', icon: Package, tone: 'teal' },
  pact: { kind: 'slab', at: [-2.5, -4], tag: 'contracts', icon: Handshake, tone: 'yellow' },
  pay: { kind: 'cube', at: [-6, -4], label: 'Payments', sub: 'other team', icon: CreditCard, tone: 'blue' },
  stage: { kind: 'cube', at: [4.5, 4.5], label: 'Staging', sub: 'prod-size', icon: Server, tone: 'blue' },
  load: { kind: 'crowd', at: [1, 4.5], tag: 'k6 · 5k users', tagIcon: Bot, items: 7, tone: 'gray' },
});

const pyramidLinks = [L('dev', 'ci', { label: 'pull request' }), L('ci', 'unit'), L('ci', 'integ'), L('ci', 'e2e')];
const toArtifact = [L('unit', 'art'), L('integ', 'art'), L('e2e', 'art')];

export const testing: Lesson = {
  id: 'testing',
  title: 'Testing',
  blurb: 'Catch the one-line bug before your customers do: a pyramid of fast, focused, trustworthy tests.',
  minutes: 10,
  level: 'Beginner',
  keywords: ['unit test', 'integration test', 'end-to-end', 'test pyramid', 'flaky test', 'contract test', 'continuous integration', 'load test', 'testcontainers', 'regression'],
  metrics: [
    { id: 'escaped', label: 'Bugs in prod', icon: Bug },
    { id: 'ci', label: 'CI time', icon: Timer },
    { id: 'flaky', label: 'Flaky runs', icon: Dices },
    { id: 'tests', label: 'Tests', icon: ListChecks },
  ],
  learn: [
    { text: 'Why untested changes reach customers', at: 0 },
    { text: 'The test pyramid: unit, integration, E2E', at: 3 },
    { text: 'Why flaky tests are so corrosive', at: 4 },
    { text: 'Contract tests between services', at: 5 },
    { text: 'When load tests earn their cost', at: 6 },
  ],
  steps: [
    {
      short: 'One line',
      title: 'A one-line change breaks checkout',
      tag: 'Problem',
      body: [
        'A developer tweaks the rounding in `cart.total()` so prices show neatly. It looks harmless, so it ships straight to production on Tuesday afternoon.',
        'Carts with a discount now total **negative**, and the payment provider rejects them. Customers find out first: two hours and **3,100 failed orders** later, someone rolls back.',
      ],
      scene: {
        nodes: ts('dev', ['prod', { status: 'hot', tone: 'rose' }], 'shoppers'),
        links: [L('dev', 'prod', { label: 'straight to prod', tone: 'bad' }), L('shoppers', 'prod')],
        flows: [F(['dev', 'prod'], { kind: 'event' }), F(['shoppers', 'prod'], { ret: true, retKind: 'error', n: 3, delay: 0.6 })],
        notes: [
          { at: [-2.5, -3], text: 'cart.total(): 1 line changed', icon: ShoppingCart, tone: 'warn' },
          { at: [-1, 3], text: 'tests run: 0', icon: TriangleAlert, tone: 'bad' },
        ],
      },
      metrics: { escaped: '9 / month', ci: '—', flaky: '—', tests: '0' },
      bad: ['escaped'],
    },
    {
      short: 'Unit',
      title: 'Many small, fast unit tests',
      tag: 'Technique',
      body: [
        'A **unit test** checks one function in isolation, entirely in memory: `total([item(9.99, 2)], discount(10%))` should equal `17.98`. Each runs in about a millisecond.',
        'Every pull request now triggers a **CI runner** that runs all 1,800 of them in 40 s. A red result blocks the merge — the rounding bug would have failed four tests.',
      ],
      callout: { kind: 'tip', text: 'Write a failing test that reproduces each bug before fixing it. That bug can never quietly return.' },
      changes: [
        { sign: '+', text: 'CI runner on every pull request' },
        { sign: '+', text: 'Unit tests' },
      ],
      scene: {
        nodes: ts('dev', 'ci', 'unit'),
        links: [L('dev', 'ci', { label: 'pull request' }), L('ci', 'unit')],
        flows: [F(['dev', 'ci', 'unit'], { ret: true, n: 3, speed: 1.4 })],
        notes: [{ at: [-2.5, 3.5], text: '1,800 tests · 40 s', icon: Timer, tone: 'good' }],
      },
      metrics: { escaped: '5 / month', ci: '40 s', tests: '1,800' },
      hi: ['escaped'],
    },
    {
      short: 'Integration',
      title: 'Test against a real database',
      tag: 'Technique',
      body: [
        'Unit tests fake the database, so a typo in a SQL query or a missing migration sails through. **Integration tests** exercise the real thing.',
        'CI starts a throwaway **Postgres in a container**, applies the migrations, and runs the repository code against it. About 0.5 s each, so you write fewer: 240 tests covering every query and boundary.',
      ],
      callout: { kind: 'tip', text: 'Mock what you own; test what you don’t (databases, queues, HTTP clients) against real instances.' },
      changes: [{ sign: '+', text: 'Integration tests + containerised DB' }],
      scene: {
        nodes: ts('dev', 'ci', 'unit', 'integ', 'pg'),
        links: [L('dev', 'ci', { label: 'pull request' }), L('ci', 'unit'), L('ci', 'integ'), L('integ', 'pg', { arrow: 'both' })],
        flows: [F(['dev', 'ci', 'unit'], { ret: true }), F(['ci', 'integ', 'pg'], { kind: 'data', ret: true, retKind: 'data', delay: 0.7 })],
      },
      metrics: { escaped: '3 / month', ci: '4 min', tests: '2,040' },
      hi: ['escaped'],
    },
    {
      short: 'End-to-end',
      title: 'A few tests that click through',
      tag: 'Trade-off',
      body: [
        'An **end-to-end test** drives a real browser against the whole stack: sign in, add to cart, pay with a test card. It catches wiring mistakes nothing else can.',
        'But each takes ~40 s and breaks on harmless UI changes. Keep **a dozen**, only for money paths. The result is a **pyramid**: 1,800 unit, 240 integration, 12 E2E. All green → CI builds an artifact.',
      ],
      callout: { kind: 'key', text: 'Push each check to the lowest, fastest layer that can catch it. E2E tests are a safety net, not the plan.' },
      changes: [
        { sign: '+', text: 'E2E tests' },
        { sign: '+', text: 'Build artifact when all layers pass' },
      ],
      scene: {
        nodes: ts('dev', 'ci', 'unit', 'integ', 'e2e', 'art'),
        links: [...pyramidLinks, ...toArtifact],
        flows: [
          F(['ci', 'unit', 'art'], { n: 3, speed: 1.4 }),
          F(['ci', 'integ', 'art'], { n: 2, delay: 0.4 }),
          F(['ci', 'e2e', 'art'], { speed: 0.5, delay: 0.8 }),
        ],
      },
      metrics: { escaped: '1 / month', ci: '12 min', tests: '2,052' },
      hi: ['escaped'],
      bad: ['ci'],
    },
    {
      short: 'Flaky',
      title: 'Tests that cry wolf',
      tag: 'Insight',
      body: [
        'One E2E test clicks “Pay” before the card form has loaded, so it fails about **1 run in 12**. People learn to hit re-run. One day a real failure gets re-run until it passes — and ships.',
        'Fix: wait for conditions, never fixed sleeps; give each test its own data; **quarantine** a flaky test with an owner and a deadline; track flake rate like any other bug.',
      ],
      callout: { kind: 'warn', text: 'A test that fails at random trains the team to ignore red builds. That costs more than having no test.' },
      scene: {
        nodes: ts('dev', 'ci', 'unit', 'integ', ['e2e', { status: 'hot', tone: 'rose' }], ['art', { status: 'dim' }]),
        links: [...pyramidLinks.slice(0, 3), L('ci', 'e2e', { tone: 'bad' }), ...toArtifact],
        flows: [F(['ci', 'e2e'], { kind: 'error', stop: true, n: 2 }), F(['ci', 'unit', 'art'], { delay: 0.5 }), F(['ci', 'integ', 'art'], { delay: 0.9 })],
        notes: [{ at: [-2.5, -3.5], text: 'fails 1 run in 12 ↻', icon: Dices, tone: 'bad' }],
      },
      metrics: { flaky: '8%' },
      bad: ['flaky'],
    },
    {
      short: 'Contracts',
      title: 'Contracts between services',
      tag: 'Technique',
      body: [
        'Checkout calls the Payments service, owned by another team. E2E tests across both are slow and fragile. Instead, Checkout publishes a **contract**: “I send `amount_cents` and `currency`; I need `id` and `status` back.”',
        'Payments’ CI **verifies** every build against all consumer contracts. When they rename a field, their pipeline goes red — before anything deploys.',
      ],
      changes: [
        { sign: '+', text: 'Contract store shared by both pipelines' },
        { sign: '-', text: '4 cross-service E2E tests' },
      ],
      scene: {
        nodes: ts('dev', 'ci', 'unit', 'integ', 'e2e', 'art', 'pact', 'pay'),
        links: [...pyramidLinks, ...toArtifact, L('ci', 'pact'), L('pay', 'pact', { label: 'verify', arrow: 'both' })],
        flows: [F(['ci', 'pact'], { kind: 'data' }), F(['pay', 'pact'], { kind: 'data', ret: true, retKind: 'data', delay: 0.8 }), F(['ci', 'unit', 'art'], { delay: 1.4 })],
      },
      metrics: { escaped: '0.5 / month', ci: '9 min', tests: '2,060' },
      hi: ['escaped', 'ci'],
    },
    {
      short: 'Load',
      title: 'Load test before the big day',
      tag: 'Case',
      body: [
        'Black Friday is in three weeks. Deploy the release candidate to a **production-sized staging** environment and replay **3× last year’s peak** with a load tool.',
        'At 2.5× a missing index pushes p99 to 4 s and the DB pool runs dry. Cheap to fix now. Load tests are too slow for every PR — run them before launches and on a schedule.',
      ],
      callout: { kind: 'tip', text: 'Test with realistic data volumes and traffic mixes. 5,000 users hitting one product page proves very little.' },
      changes: [
        { sign: '+', text: 'Staging environment' },
        { sign: '+', text: 'Load generator' },
      ],
      scene: {
        nodes: ts('dev', 'ci', 'art', ['stage', { meter: 88, status: 'hot' }], 'load'),
        links: [L('dev', 'ci'), L('ci', 'art', { label: 'all green' }), L('art', 'stage'), L('load', 'stage', { tone: 'bad' })],
        flows: [F(['ci', 'art', 'stage'], { kind: 'event' }), F(['load', 'stage'], { n: 6, speed: 1.3, ret: true })],
        notes: [{ at: [-2.5, 3.5], text: 'p99 4 s at 2.5× peak', icon: Activity, tone: 'bad' }],
      },
    },
    {
      short: 'Recap',
      title: 'Testing, summed up',
      tag: 'Recap',
      body: [
        'Run everything in **CI on every pull request**. Build a pyramid: many fast **unit** tests, fewer **integration** tests against real dependencies, a handful of **E2E** tests for critical journeys.',
        'Keep the suite trustworthy — no tolerated flakes. Use **contracts** between teams, and **load tests** before big launches.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Tests are a feedback loop. Fast, reliable feedback on every change beats a huge, slow suite nobody trusts.' },
      scene: {
        nodes: ts('dev', 'ci', 'unit', 'integ', 'e2e', 'art'),
        links: [...pyramidLinks, ...toArtifact],
        flows: [F(['dev', 'ci'], { kind: 'event' }), F(['ci', 'unit', 'art'], { n: 2, delay: 0.5 }), F(['ci', 'integ', 'art'], { delay: 0.9 }), F(['ci', 'e2e', 'art'], { delay: 1.3 })],
      },
      metrics: { escaped: '0.5 / month', ci: '9 min', flaky: '< 0.5%', tests: '2,060' },
      hi: ['flaky'],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* CI/CD & deployments                                                  */
/* ------------------------------------------------------------------ */

const cd = cast({
  dev: { kind: 'device', at: [-7, -4], tag: 'engineer', tagIcon: User },
  ci: { kind: 'cube', at: [-3, -4], label: 'CI', sub: 'build+test', icon: Workflow, tone: 'green' },
  art: { kind: 'slab', at: [1, -4], tag: 'shop:2.15.0', icon: Package, tone: 'teal' },
  stage: { kind: 'cube', at: [5, -4], label: 'Staging', sub: 'smoke', icon: FlaskConical, tone: 'blue' },
  s1: { kind: 'cube', at: [-3, 0], label: 'Web 1', icon: Server, tone: 'blue' },
  s2: { kind: 'cube', at: [1, 0], label: 'Web 2', icon: Server, tone: 'blue' },
  s3: { kind: 'cube', at: [5, 0], label: 'Web 3', icon: Server, tone: 'blue' },
  blue: { kind: 'cube', at: [-3, 0], label: 'Blue', sub: 'v2.14', icon: Server, tone: 'blue' },
  green: { kind: 'cube', at: [5, 0], label: 'Green', sub: 'v2.15', icon: Server, tone: 'green' },
  lb: { kind: 'cube', at: [1, 4], label: 'LB', icon: Split, tone: 'green', size: 'sm' },
  users: { kind: 'crowd', at: [-3, 4], tag: 'users', tagIcon: Users, items: 5 },
  mon: { kind: 'slab', at: [5, 4], tag: 'error rate', icon: Activity, tone: 'sand' },
  flags: { kind: 'slab', at: [1, -4], tag: 'new_checkout: 1%', icon: ToggleRight, tone: 'yellow' },
  db: { kind: 'db', at: [1, -4], tag: 'orders db', icon: Database },
});

const prodLinks = [L('users', 'lb'), L('lb', 's1'), L('lb', 's2'), L('lb', 's3')];
const deployLinks = [L('art', 's1', { dashed: true }), L('art', 's2', { dashed: true }), L('art', 's3', { dashed: true })];

export const cicd: Lesson = {
  id: 'cicd',
  title: 'CI/CD & Deployments',
  blurb: 'Make shipping boring: one pipeline, one artifact, and deploys that limit damage and undo in seconds.',
  minutes: 13,
  level: 'Intermediate',
  keywords: ['continuous integration', 'continuous delivery', 'pipeline', 'artifact', 'rolling deploy', 'blue-green', 'canary', 'rollback', 'feature flag', 'schema migration'],
  metrics: [
    { id: 'deploy', label: 'Deploy time', icon: Timer },
    { id: 'fail', label: 'Failed deploys', icon: TriangleAlert },
    { id: 'mttr', label: 'Time to undo', icon: RotateCcw },
    { id: 'blast', label: 'Users exposed', icon: Users },
  ],
  learn: [
    { text: 'Why manual deploys go wrong', at: 0 },
    { text: 'Build once, promote one artifact', at: 1 },
    { text: 'Rolling vs blue-green deploys', at: 3 },
    { text: 'Canaries with automatic rollback', at: 4 },
    { text: 'Feature flags and safe schema changes', at: 6 },
  ],
  steps: [
    {
      short: 'Friday',
      title: 'A manual deploy at 18:40 on Friday',
      tag: 'Problem',
      body: [
        'An engineer SSHes into three web servers, pulls the latest code, edits a config file and restarts each one — a 90-minute checklist done from memory before the weekend.',
        'Web 3 never gets the new environment variable. Every request it serves crashes, and a third of users see errors. Nobody knows exactly what changed, so recovery takes **47 minutes**.',
      ],
      scene: {
        nodes: cd('dev', 's1', 's2', ['s3', { status: 'down', tone: 'rose' }], 'lb', 'users'),
        links: [
          L('dev', 's1', { dashed: true, label: 'ssh + edit' }),
          L('dev', 's2', { dashed: true, elbow: false }),
          L('dev', 's3', { dashed: true, elbow: false }),
          ...prodLinks.slice(0, 3),
          L('lb', 's3', { tone: 'bad' }),
        ],
        flows: [
          F(['dev', 's1'], { kind: 'event' }),
          F(['dev', 's2'], { kind: 'event', delay: 0.6 }),
          F(['dev', 's3'], { kind: 'event', delay: 1.2 }),
          F(['users', 'lb', 's3'], { kind: 'request', ret: true, retKind: 'error', delay: 0.4 }),
          F(['users', 'lb', 's1'], { ret: true, delay: 1.0 }),
        ],
        notes: [{ at: [5, -3], text: 'Web 3: missing env var', icon: TriangleAlert, tone: 'bad' }],
      },
      metrics: { deploy: '90 min', fail: '1 in 5', mttr: '47 min', blast: '100%' },
      bad: ['fail', 'mttr'],
    },
    {
      short: 'Pipeline',
      title: 'Build once, promote the artifact',
      tag: 'Technique',
      body: [
        'Every merge to `main` triggers **CI**: compile, run the tests, then package a **versioned artifact** — a container image `shop:2.15.0`. It is built once and never rebuilt, so staging and production run identical bytes.',
        '**CD** deploys it to staging, runs smoke tests, then promotes the same image to production. Config per environment lives in the repo. No SSH; every step is logged.',
      ],
      callout: { kind: 'tip', text: 'Rollback becomes “deploy the previous version” — an artifact you already have and already trust.' },
      changes: [
        { sign: '+', text: 'CI pipeline + artifact registry' },
        { sign: '+', text: 'Staging environment' },
        { sign: '-', text: 'Manual SSH steps' },
      ],
      scene: {
        nodes: cd('dev', 'ci', 'art', 'stage', 's1', 's2', 's3', 'lb', 'users'),
        links: [L('dev', 'ci', { label: 'merge' }), L('ci', 'art'), L('art', 'stage', { label: 'smoke ✓' }), ...deployLinks, ...prodLinks],
        flows: [
          F(['dev', 'ci', 'art', 'stage'], { kind: 'event' }),
          F(['art', 's1'], { kind: 'data', delay: 2.0 }),
          F(['art', 's2'], { kind: 'data', delay: 2.0 }),
          F(['art', 's3'], { kind: 'data', delay: 2.0 }),
          F(['users', 'lb', 's2'], { ret: true, delay: 0.5 }),
        ],
      },
      metrics: { deploy: '15 min', fail: '1 in 15', mttr: '15 min' },
      hi: ['deploy', 'fail', 'mttr'],
    },
    {
      short: 'Rolling',
      title: 'Replace servers one at a time',
      tag: 'Technique',
      body: [
        'A **rolling deploy** updates a few servers at a time. Web 2 is taken out of the load balancer, finishes in-flight requests (**draining**), starts v2.15, passes health checks and rejoins. Then the next.',
        'No spare machines and no downtime. But for several minutes **two versions serve side by side**, and undoing it means another full roll.',
      ],
      changes: [{ sign: '~', text: 'Web 2 drained and upgraded; Web 1 already done' }],
      scene: {
        nodes: cd(
          'art',
          ['s1', { tag: 'v2.15', tagIcon: CircleCheck }],
          ['s2', { status: 'dim', tag: 'draining…' }],
          ['s3', { tag: 'v2.14' }],
          'lb',
          'users',
        ),
        links: [L('art', 's2', { dashed: true }), L('users', 'lb'), L('lb', 's1'), L('lb', 's2', { dashed: true, tone: 'muted' }), L('lb', 's3')],
        flows: [F(['art', 's2'], { kind: 'data', n: 2 }), F(['users', 'lb', 's1'], { ret: true }), F(['users', 'lb', 's3'], { ret: true, delay: 0.8 })],
      },
      metrics: { mttr: '10 min' },
      hi: ['mttr'],
    },
    {
      short: 'Blue-green',
      title: 'Two environments, one switch',
      tag: 'Trade-off',
      body: [
        '**Blue-green** keeps two full environments. Blue serves v2.14; v2.15 goes to idle Green and is tested with production config. Then the balancer flips: all traffic moves in a second.',
        'Bad release? Flip back — Blue is still running and warm. The cost: double capacity during releases, and both colours share one database, so its schema must suit both versions.',
      ],
      changes: [
        { sign: '+', text: 'Second full environment (Green)' },
        { sign: '~', text: 'Release = switch the balancer' },
      ],
      scene: {
        nodes: cd(['art', { tag: 'shop:2.15.0' }], ['blue', { sub: 'standby' }], 'green', 'lb', 'users'),
        links: [L('art', 'green', { dashed: true }), L('users', 'lb'), L('lb', 'green', { tone: 'good', label: 'live' }), L('lb', 'blue', { dashed: true, tone: 'muted', label: 'flip back' })],
        flows: [F(['art', 'green'], { kind: 'data' }), F(['users', 'lb', 'green'], { ret: true, n: 3, delay: 0.5 })],
      },
      metrics: { mttr: '< 1 min' },
      hi: ['mttr'],
    },
    {
      short: 'Canary',
      title: 'Try it on 5% first',
      tag: 'Technique',
      body: [
        'A **canary** release sends v2.15 to **5%** of traffic. The pipeline compares it with the old version on error rate, p99 latency and orders per minute.',
        'Here canary errors hit 2.1% against a 0.3% baseline, so the pipeline **rolls back automatically** — nobody is paged. Healthy canaries widen to 25%, 50%, then 100%.',
      ],
      callout: { kind: 'key', text: 'Canaries turn “everyone gets the bug” into “1 in 20 users, for a few minutes”.' },
      changes: [
        { sign: '+', text: 'Metrics comparison + automatic rollback' },
        { sign: '~', text: 'Web 3 runs the canary' },
      ],
      scene: {
        nodes: cd(
          ['s1', { tag: 'v2.14' }],
          ['s2', { tag: 'v2.14' }],
          ['s3', { tag: 'v2.15 canary', status: 'hot', tone: 'rose' }],
          'lb',
          'users',
          ['mon', { status: 'hot' }],
        ),
        links: [L('users', 'lb'), L('lb', 's1'), L('lb', 's2'), L('lb', 's3', { label: '5%', tone: 'bad' }), L('s3', 'mon')],
        flows: [
          F(['users', 'lb', 's1'], { ret: true, n: 2 }),
          F(['users', 'lb', 's3'], { ret: true, retKind: 'error', delay: 0.8 }),
          F(['s3', 'mon'], { kind: 'event', n: 2, delay: 1.2 }),
        ],
        notes: [
          { at: [5, -3], text: 'canary 2.1% vs base 0.3%', icon: Activity, tone: 'bad' },
          { at: [1, -3], text: 'auto-rollback', icon: RotateCcw, tone: 'good' },
        ],
      },
      metrics: { mttr: '3 min', blast: '5%' },
      hi: ['mttr', 'blast'],
    },
    {
      short: 'Flags',
      title: 'Deploy is not release',
      tag: 'Technique',
      body: [
        'Ship the new checkout **dark**, behind a flag `new_checkout`. Deploying it changes nothing for users. Then enable it for staff, 1%, 10%, 100% — no deploy needed. If something breaks, switch it off in seconds.',
        '**Deploy** (moving code to servers) and **release** (exposing behaviour to users) are now separate, independent decisions.',
      ],
      callout: { kind: 'warn', text: 'Every flag is a branch in your code. Delete it once fully rolled out, or flags pile up into untested combinations.' },
      changes: [{ sign: '+', text: 'Feature flag service' }],
      scene: {
        nodes: cd(['s1', { tag: 'v2.15' }], ['s2', { tag: 'v2.15' }], ['s3', { tag: 'v2.15' }], 'lb', 'users', 'flags'),
        links: [...prodLinks, L('flags', 's1', { dashed: true }), L('flags', 's2', { dashed: true }), L('flags', 's3', { dashed: true })],
        flows: [
          F(['flags', 's1'], { kind: 'data' }),
          F(['flags', 's2'], { kind: 'data' }),
          F(['flags', 's3'], { kind: 'data' }),
          F(['users', 'lb', 's2'], { ret: true, n: 2, delay: 0.6 }),
        ],
      },
      metrics: { mttr: '5 s', blast: '1%' },
      hi: ['mttr', 'blast'],
    },
    {
      short: 'Migrations',
      title: 'Schema changes in three moves',
      tag: 'Case',
      body: [
        'Renaming `phone` to `contact_phone` in one go breaks whichever version isn’t expecting it — and during a rolling or canary deploy, **both versions are live**.',
        'Use **expand → migrate → contract**: add the new column and write both; backfill old rows and switch reads; once no running version reads the old column, drop it. Each move is its own safe deploy.',
      ],
      callout: { kind: 'tip', text: 'Every schema change must work with the code running now and the code about to run.' },
      scene: {
        nodes: cd(['s1', { tag: 'v2.14' }], ['s2', { tag: 'v2.15' }], ['s3', { tag: 'v2.15' }], 'lb', 'users', 'db'),
        links: [...prodLinks, L('s1', 'db', { arrow: 'both' }), L('s2', 'db', { arrow: 'both' }), L('s3', 'db', { arrow: 'both' })],
        flows: [
          F(['s1', 'db'], { kind: 'data', ret: true, retKind: 'data' }),
          F(['s3', 'db'], { kind: 'data', ret: true, retKind: 'data', delay: 0.7 }),
          F(['users', 'lb', 's2'], { ret: true, delay: 0.3 }),
        ],
        notes: [
          { at: [-5.5, -4.5], text: '1 · expand: add column' },
          { at: [-5.5, -3.5], text: '2 · migrate: backfill' },
          { at: [-5.5, -2.5], text: '3 · contract: drop old' },
        ],
      },
      metrics: { fail: '1 in 40' },
      hi: ['fail'],
    },
    {
      short: 'Recap',
      title: 'CI/CD, summed up',
      tag: 'Recap',
      body: [
        '**CI** builds and tests every change into one versioned artifact; **CD** promotes that artifact through staging to production, with no hand-run steps.',
        'Limit the blast radius with **rolling**, **blue-green** or **canary** releases; decouple release with **feature flags**; change schemas with **expand → migrate → contract**.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Deploy small changes often, and make undo faster than diagnosis. Then Friday deploys stop being scary.' },
      scene: {
        nodes: cd('dev', 'ci', 'art', ['s1', { tag: 'v2.14' }], ['s2', { tag: 'v2.14' }], ['s3', { tag: 'canary' }], 'lb', 'users', 'mon'),
        links: [L('dev', 'ci'), L('ci', 'art'), ...deployLinks, ...prodLinks, L('s3', 'mon')],
        flows: [
          F(['dev', 'ci', 'art', 's3'], { kind: 'event' }),
          F(['users', 'lb', 's1'], { ret: true, delay: 0.5 }),
          F(['users', 'lb', 's3'], { ret: true, delay: 1.1 }),
          F(['s3', 'mon'], { kind: 'event', delay: 1.6 }),
        ],
      },
      metrics: { deploy: '15 min', fail: '1 in 40', mttr: '5 s', blast: '1–5%' },
    },
  ],
};
