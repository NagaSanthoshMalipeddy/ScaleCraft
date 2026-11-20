import {
  BadgeCheck,
  Bot,
  Cookie,
  Cpu,
  Database,
  FileExclamationPoint,
  FileText,
  GitBranch,
  HardDrive,
  Headset,
  IdCard,
  KeyRound,
  ListChecks,
  Lock,
  LockOpen,
  LogOut,
  Network,
  Receipt,
  Scale,
  Server,
  ShieldCheck,
  Skull,
  Target,
  Timer,
  User,
  UserX,
  Vault,
  Wifi,
} from 'lucide-react';
import type { Lesson } from '../types';
import { cast, F, L } from './kit';

/* ------------------------------------------------------------------ */
/* Authentication                                                       */
/* ------------------------------------------------------------------ */

const au = cast({
  user: { kind: 'device', at: [-6, 0], tag: 'you', tagIcon: User },
  bots: { kind: 'cube', at: [-6, -4], label: 'Bots', sub: '40k IPs', icon: Bot, tone: 'rose' },
  idp: { kind: 'cube', at: [-2, -4], label: 'IdP', sub: 'OIDC', icon: BadgeCheck, tone: 'yellow' },
  app: { kind: 'cube', at: [-2, 0], label: 'App', sub: 'login', icon: Server, tone: 'blue' },
  db: { kind: 'db', at: [2, 0], tag: 'users · SHA-256', icon: Database },
  sessions: { kind: 'cube', at: [1.5, -3.5], label: 'Sessions', sub: 'sid → user', icon: Cookie, tone: 'orange' },
  attacker: { kind: 'cube', at: [5.5, -3.5], label: 'Attacker', sub: 'GPU rig', icon: Skull, tone: 'rose' },
  phone: { kind: 'phone', at: [-5.5, 3.5], tag: 'authenticator', tagIcon: ShieldCheck },
});

export const authentication: Lesson = {
  id: 'authentication',
  title: 'Authentication',
  blurb: 'Prove who someone is: store passwords safely, keep them logged in, and stop stolen credentials.',
  minutes: 12,
  level: 'Intermediate',
  keywords: ['authentication', 'password hashing', 'argon2', 'bcrypt', 'session', 'jwt', 'refresh token', 'mfa', 'oauth', 'openid connect'],
  metrics: [
    { id: 'cracked', label: 'Cracked in 24 h', icon: LockOpen },
    { id: 'cpu', label: 'Login CPU', icon: Cpu },
    { id: 'revoke', label: 'Logout takes effect', icon: LogOut },
    { id: 'takeover', label: 'Takeovers / day', icon: UserX },
  ],
  learn: [
    { text: 'Why fast hashes fail after a breach', at: 0 },
    { text: 'Salted, slow, memory-hard password hashing', at: 1 },
    { text: 'Sessions vs signed tokens, and revocation', at: 3 },
    { text: 'Stopping credential stuffing with limits and MFA', at: 5 },
    { text: 'Delegating login with OpenID Connect', at: 6 },
  ],
  steps: [
    {
      short: 'Breach',
      title: 'The password table leaks',
      tag: 'Problem',
      body: [
        'An injection bug lets an attacker download the `users` table: **1.2 million** emails with unsalted SHA-256 password hashes. One gaming GPU tries about **20 billion** SHA-256 guesses per second.',
        'Within a day, 61% of passwords are cracked. People reuse passwords, so the attacker now logs in as your users — here and on other sites.',
      ],
      scene: {
        nodes: au('user', 'app', ['db', { status: 'hot' }], 'attacker'),
        links: [L('user', 'app'), L('app', 'db'), L('db', 'attacker', { tone: 'bad', label: 'dump 1.2M rows' })],
        flows: [F(['user', 'app', 'db'], { ret: true }), F(['db', 'attacker'], { kind: 'data', n: 4, delay: 0.4 })],
        notes: [{ at: [5.5, 0], text: '20 B guesses / s', icon: Cpu, tone: 'bad' }],
      },
      metrics: { cracked: '61%', cpu: '4%', revoke: '—', takeover: '410' },
      bad: ['cracked', 'takeover'],
    },
    {
      short: 'Slow hash',
      title: 'Hash slowly, salt every row',
      tag: 'Technique',
      body: [
        'Store passwords with a hash designed to be **slow**: bcrypt, scrypt or **Argon2id**. Each user gets a random **salt**, so identical passwords hash differently and precomputed tables are useless.',
        'Argon2id is also **memory-hard**: every guess needs ~64 MiB of RAM, which wrecks cheap GPU parallelism. Guessing drops from billions per second to around a thousand.',
      ],
      callout: { kind: 'tip', text: 'Tune the cost so one hash takes ~250 ms on your servers. Store the parameters with each hash and re-hash on login when you raise them.' },
      changes: [{ sign: '~', text: 'SHA-256 → salted Argon2id' }],
      scene: {
        nodes: au('user', ['app', { meter: 22 }], ['db', { tag: 'users · argon2id' }], ['attacker', { status: 'dim' }]),
        links: [L('user', 'app'), L('app', 'db'), L('db', 'attacker', { tone: 'bad', dashed: true })],
        flows: [F(['user', 'app', 'db'], { ret: true }), F(['db', 'attacker'], { kind: 'data', stop: true, delay: 0.6 })],
        notes: [
          { at: [5.5, 0], text: '~1 k guesses / s', icon: Cpu, tone: 'good' },
          { at: [-2, -3.6], text: 'argon2id · 64 MiB · 250 ms', icon: Timer },
        ],
      },
      metrics: { cracked: '< 0.1%', cpu: '22%' },
      hi: ['cracked'],
      bad: ['cpu'],
    },
    {
      short: 'Sessions',
      title: 'Remembering who you are',
      tag: 'Trade-off',
      body: [
        'After login the app creates a **session**: a random 128-bit ID kept in a server-side store and sent back in an `HttpOnly; Secure` cookie. Each request looks it up; logging out or banning someone just deletes the row.',
        'A **signed token** such as a JWT carries the user ID and expiry inside it. Any service can verify the signature with no lookup — but a stolen token stays valid until it expires, because there is nothing to delete.',
      ],
      callout: { kind: 'key', text: 'Sessions give instant revocation at the cost of a lookup. Tokens skip the lookup at the cost of revocation.' },
      changes: [{ sign: '+', text: 'Session store' }],
      scene: {
        nodes: au('user', ['app', { meter: 22 }], ['db', { tag: 'users · argon2id' }], 'sessions'),
        links: [L('user', 'app', { label: 'cookie: sid' }), L('app', 'sessions', { arrow: 'both' }), L('app', 'db')],
        flows: [F(['user', 'app', 'sessions'], { ret: true, n: 2 })],
        notes: [{ at: [5.5, 0], text: 'logout = delete row', icon: LogOut, tone: 'good' }],
      },
      metrics: { revoke: 'instant' },
      hi: ['revoke'],
    },
    {
      short: 'Tokens',
      title: 'Short access, long refresh',
      tag: 'Technique',
      body: [
        'Combine the two. Issue a signed **access token** that lives 15 minutes — services verify it locally — plus a **refresh token** that lives 30 days and is stored server-side.',
        'When the access token expires, the client trades the refresh token for a new pair. Revoke the refresh token and the user is out within 15 minutes. **Rotate** refresh tokens on every use so reuse of a stolen one is detected.',
      ],
      callout: { kind: 'tip', text: 'In browsers keep tokens out of `localStorage`; an `HttpOnly` cookie is much harder for an injected script to steal.' },
      changes: [
        { sign: '+', text: 'Signed 15-minute access tokens' },
        { sign: '~', text: 'Store keeps only refresh tokens' },
      ],
      scene: {
        nodes: au('user', ['app', { meter: 22 }], ['db', { tag: 'users · argon2id' }], ['sessions', { label: 'Tokens', sub: 'refresh' }]),
        links: [L('user', 'app', { label: 'access · 15 min' }), L('app', 'sessions', { arrow: 'both', dashed: true, label: 'refresh · 30 d' }), L('app', 'db')],
        flows: [F(['user', 'app'], { ret: true, n: 3 }), F(['user', 'app', 'sessions'], { kind: 'handshake', ret: true, delay: 2 })],
      },
      metrics: { revoke: '≤ 15 min' },
      bad: ['revoke'],
    },
    {
      short: 'Stuffing',
      title: 'Bots replay leaked passwords',
      tag: 'Case',
      body: [
        '**Credential stuffing**: bots replay millions of email/password pairs leaked from other sites, spread across 40,000 IPs. A small fraction match, and every attempt costs you a 250 ms hash.',
        'Throttle failures **per account** and **per IP**, add growing delays, and require a CAPTCHA or email link after repeated misses. Reject new passwords that appear in known breach lists.',
      ],
      callout: { kind: 'warn', text: 'Hard lockouts let attackers lock real users out on purpose. Prefer growing delays and step-up challenges over permanent locks.' },
      changes: [{ sign: '+', text: 'Per-account and per-IP throttling' }],
      scene: {
        nodes: au('user', 'bots', ['app', { meter: 25, tag: '5 fails → slow down' }], ['db', { tag: 'users · argon2id' }]),
        links: [L('bots', 'app', { tone: 'bad', label: '429 · try later' }), L('user', 'app'), L('app', 'db')],
        flows: [F(['bots', 'app'], { n: 5, stop: true, speed: 1.3 }), F(['user', 'app', 'db'], { ret: true, delay: 0.6 })],
      },
      metrics: { takeover: '45' },
      hi: ['takeover'],
    },
    {
      short: 'MFA',
      title: 'A password is not enough',
      tag: 'Technique',
      body: [
        '**Multi-factor authentication** asks for something you have as well as something you know: a 6-digit TOTP code, a push approval, or a **passkey** on your device.',
        'A leaked password alone no longer logs anyone in. SMS codes beat nothing but fall to SIM swaps; phishing-resistant **WebAuthn** passkeys are the strongest option.',
      ],
      callout: { kind: 'tip', text: 'Require MFA for admins and risky actions — new device, changed payout details — even if it is optional for everyone else.' },
      changes: [{ sign: '+', text: 'Second factor' }],
      scene: {
        nodes: au('user', 'bots', ['app', { meter: 22 }], ['db', { tag: 'users · argon2id' }], 'phone'),
        links: [L('user', 'app'), L('bots', 'app', { tone: 'bad' }), L('app', 'db'), L('app', 'phone', { dashed: true, label: 'push / code' })],
        flows: [
          F(['user', 'app', 'phone'], { kind: 'handshake', ret: true }),
          F(['bots', 'app'], { n: 3, stop: true, delay: 0.5 }),
        ],
      },
      metrics: { takeover: '2' },
      hi: ['takeover'],
    },
    {
      short: 'IdP',
      title: 'Let an identity provider do it',
      tag: 'Insight',
      body: [
        'Each piece above is easy to get subtly wrong. Many teams **delegate login** to an identity provider — Entra ID, Okta, Auth0, Google or a self-hosted Keycloak — using **OpenID Connect**, an identity layer on top of **OAuth 2.0**.',
        'The app redirects you to the IdP, which handles passwords, MFA and lockouts, then returns a one-time code. The app swaps it for a signed **ID token** and starts its own session. No password touches your servers.',
      ],
      callout: { kind: 'tip', text: 'Use the authorization-code flow with PKCE, and validate the ID token’s signature, issuer, audience and expiry.' },
      changes: [
        { sign: '+', text: 'Identity provider (OIDC)' },
        { sign: '-', text: 'Password hashes in your DB' },
      ],
      scene: {
        nodes: au('user', 'idp', 'app', ['db', { tag: 'profiles only' }]),
        links: [L('user', 'idp', { label: 'login + MFA' }), L('idp', 'app', { arrow: 'both', label: 'code → ID token' }), L('user', 'app'), L('app', 'db')],
        flows: [
          F(['user', 'idp'], { kind: 'handshake', ret: true }),
          F(['idp', 'app'], { kind: 'data', ret: true, retKind: 'data', delay: 1 }),
          F(['user', 'app', 'db'], { ret: true, delay: 2 }),
        ],
      },
      metrics: { cpu: '3%' },
      hi: ['cpu'],
    },
    {
      short: 'Recap',
      title: 'Authentication, summed up',
      tag: 'Recap',
      body: [
        'Assume your database will leak: hash passwords with salted **Argon2id** or bcrypt. Choose **sessions** for instant revocation or **signed tokens** for lookup-free checks — or short access plus refresh tokens for both.',
        'Throttle **credential stuffing**, add **MFA**, and consider delegating the whole job to an identity provider via **OpenID Connect**.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Authentication is a chain: storage, sessions, throttling and MFA. Attackers pick the weakest link, so build or buy all of it.' },
      scene: {
        nodes: au('user', 'idp', 'app', ['db', { tag: 'profiles only' }], ['sessions', { label: 'Tokens', sub: 'refresh' }]),
        links: [L('user', 'idp'), L('idp', 'app', { arrow: 'both' }), L('user', 'app'), L('app', 'db'), L('app', 'sessions', { arrow: 'both', dashed: true })],
        flows: [F(['user', 'idp'], { kind: 'handshake', ret: true }), F(['user', 'app', 'sessions'], { ret: true, delay: 1.2 })],
      },
      metrics: { cracked: '< 0.1%', cpu: '3%', revoke: '≤ 15 min', takeover: '2' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Authorization                                                        */
/* ------------------------------------------------------------------ */

const az = cast({
  alice: { kind: 'device', at: [-5.5, 3.5], tag: 'Alice · customer', tagIcon: User },
  agent: { kind: 'device', at: [-5.5, -3.5], tag: 'Sam · support', tagIcon: Headset },
  api: { kind: 'cube', at: [-2, 0], label: 'Invoices', sub: 'API', icon: Receipt, tone: 'blue' },
  db: { kind: 'db', at: [2, 0], tag: 'invoices db', icon: Database },
  usersdb: { kind: 'db', at: [-2, -4.5], tag: 'users db', icon: Database, tone: 'gray' },
  rules: { kind: 'slab', at: [1.5, 3.5], tag: 'roles', icon: IdCard, tone: 'yellow' },
  policy: { kind: 'cube', at: [1.5, -3.5], label: 'Policy', sub: 'decisions', icon: Scale, tone: 'yellow' },
  billing: { kind: 'cube', at: [5, -3.5], label: 'Billing', icon: Server, tone: 'blue' },
});

export const authorization: Lesson = {
  id: 'authorization',
  title: 'Authorization',
  blurb: 'Logged in is not the same as allowed: check every request against who owns what.',
  minutes: 11,
  level: 'Intermediate',
  keywords: ['authorization', 'idor', 'access control', 'rbac', 'abac', 'rebac', 'permissions', 'policy engine', 'least privilege'],
  metrics: [
    { id: 'exposed', label: 'Invoices exposed', icon: FileExclamationPoint },
    { id: 'coverage', label: 'Endpoints checked', icon: ListChecks },
    { id: 'rules', label: 'Policy lives', icon: Scale },
    { id: 'blast', label: 'Blast radius', icon: Target },
  ],
  learn: [
    { text: 'How an insecure direct object reference leaks data', at: 0 },
    { text: 'Server-side ownership checks and deny by default', at: 2 },
    { text: 'Roles, attributes and relationships', at: 4 },
    { text: 'Central policy service vs in-process library', at: 5 },
    { text: 'Least privilege for services and machines', at: 6 },
  ],
  steps: [
    {
      short: 'IDOR',
      title: 'Logged in, reading Bob’s bills',
      tag: 'Problem',
      body: [
        'Alice signs in and opens `/invoices/1041` — her invoice. Out of curiosity she types `/invoices/1042` and sees **Bob’s** name, address and amount. The API checked that she was logged in, never that the invoice was hers.',
        'IDs are sequential, so a ten-line script can walk all **2.3 million** invoices. This is an **insecure direct object reference** (IDOR), one of the most common API bugs.',
      ],
      scene: {
        nodes: az('alice', 'api', 'db'),
        links: [L('alice', 'api'), L('api', 'db')],
        flows: [F(['alice', 'api', 'db'], { ret: true, n: 2 })],
        notes: [
          { at: [-5.5, -2], text: 'GET /invoices/1042' },
          { at: [5.5, 0], text: 'invoice 1042 · Bob', icon: FileText, tone: 'bad' },
        ],
      },
      metrics: { exposed: '2.3M', coverage: '31 / 48', rules: 'nowhere', blast: 'whole DB' },
      bad: ['exposed'],
    },
    {
      short: 'Ownership',
      title: 'Check the owner, every time',
      tag: 'Technique',
      body: [
        '**Authentication** says who you are; **authorization** says what you may do. On every request, load the invoice and compare `invoice.ownerId` with the user ID from the verified session — never with anything the client sends.',
        'Mismatch? Return `404`, so outsiders can’t even learn which IDs exist. Random IDs (UUIDs) make guessing harder, but they hide the hole rather than close it.',
      ],
      callout: { kind: 'warn', text: 'Never trust user IDs, roles or prices from the request body or URL. Derive identity from the verified token on the server.' },
      changes: [{ sign: '+', text: 'Ownership check in the handler' }],
      scene: {
        nodes: az('alice', ['api', { tag: 'owner == caller?' }], 'db'),
        links: [L('alice', 'api'), L('api', 'db')],
        flows: [F(['api', 'db'], { kind: 'data', ret: true, retKind: 'data' }), F(['alice', 'api'], { ret: true, retKind: 'error', delay: 0.8 })],
        notes: [
          { at: [-5.5, -2], text: 'GET /invoices/1042' },
          { at: [5.5, 0], text: '404 · not yours', icon: Lock, tone: 'good' },
        ],
      },
      metrics: { exposed: '0' },
      hi: ['exposed'],
    },
    {
      short: 'Default deny',
      title: 'Forget a check, leak a table',
      tag: 'Insight',
      body: [
        'An audit finds 17 of 48 endpoints with no check at all — added in a hurry, each one an IDOR waiting to happen. Checks sprinkled by hand get forgotten.',
        'Flip the default: middleware **denies every route** unless it declares a policy. A new endpoint without one fails in tests with `403`, instead of quietly serving data in production.',
      ],
      callout: { kind: 'tip', text: 'Add a test that lists all routes and fails if any route has no authorization rule attached.' },
      scene: {
        nodes: az('alice', ['api', { tag: 'no rule → 403' }], 'db'),
        links: [L('alice', 'api'), L('api', 'db', { dashed: true })],
        flows: [F(['alice', 'api'], { ret: true, retKind: 'error', n: 2 })],
        notes: [
          { at: [-5.5, -2], text: 'GET /admin/export' },
          { at: [5.5, 0], text: 'deny by default', icon: ShieldCheck, tone: 'good' },
        ],
      },
      metrics: { coverage: '48 / 48' },
      hi: ['coverage'],
    },
    {
      short: 'Roles',
      title: 'Group permissions into roles',
      tag: 'Technique',
      body: [
        'Support agents need to read any customer’s invoices; customers only their own. Rather than granting permissions user by user, use **role-based access control** (RBAC): give users roles, and give roles permissions.',
        '`customer` → read own invoices. `support` → read all invoices. `admin` → also issue refunds. Onboarding Sam means assigning one role, not 30 permissions.',
      ],
      changes: [
        { sign: '+', text: 'Support agent' },
        { sign: '+', text: 'Role → permission table' },
      ],
      scene: {
        nodes: az('alice', 'agent', 'api', 'db', 'rules'),
        links: [L('alice', 'api', { label: 'role: customer' }), L('agent', 'api', { label: 'role: support' }), L('api', 'db'), L('api', 'rules', { arrow: 'both' })],
        flows: [F(['agent', 'api', 'db'], { ret: true }), F(['alice', 'api', 'db'], { ret: true, delay: 1 }), F(['api', 'rules'], { kind: 'data', ret: true, retKind: 'data', delay: 0.4 })],
      },
    },
    {
      short: 'Attributes',
      title: 'When roles are too coarse',
      tag: 'Trade-off',
      body: [
        'Rules grow: support may read invoices only in **their region** and only while a **ticket is open**. Roles alone explode into `support-eu-open-ticket`. **Attribute-based** policies decide using properties of the user, resource and context.',
        '**Relationship-based** access (ReBAC) asks “is Alice a member of the org that owns this invoice?” over a graph of relations — the model behind Google Zanzibar. More expressive, but harder to reason about and audit.',
      ],
      changes: [{ sign: '~', text: 'Roles → roles + attributes + relations' }],
      scene: {
        nodes: az('alice', 'agent', 'api', 'db', ['rules', { tag: 'user · org · invoice', icon: Network }]),
        links: [L('alice', 'api', { label: 'org: acme' }), L('agent', 'api', { label: 'region: EU' }), L('api', 'db'), L('api', 'rules', { arrow: 'both' })],
        flows: [F(['agent', 'api', 'rules'], { ret: true, retKind: 'data' }), F(['alice', 'api', 'db'], { ret: true, delay: 1.2 })],
      },
    },
    {
      short: 'Central',
      title: 'One policy service, or a library?',
      tag: 'Trade-off',
      body: [
        'With many services, rules drift apart. A **central policy service** answers “may X do Y on Z?” for everyone: one place to change and audit rules. The cost is a network hop (1–5 ms) per check and a dependency that must stay up.',
        'The middle ground: write policies once, centrally, and ship them to an **in-process engine** or sidecar (e.g. OPA) that evaluates locally with no hop.',
      ],
      callout: { kind: 'tip', text: 'Log every decision with the inputs used. When someone asks “why could Sam see this?”, you need an answer.' },
      changes: [
        { sign: '+', text: 'Policy service' },
        { sign: '+', text: 'Billing service' },
      ],
      scene: {
        nodes: az('alice', 'agent', 'api', 'db', 'policy', 'billing'),
        links: [L('alice', 'api'), L('agent', 'api'), L('api', 'db'), L('api', 'policy', { arrow: 'both', label: 'allow?' }), L('billing', 'policy', { arrow: 'both' })],
        flows: [
          F(['agent', 'api', 'policy'], { ret: true, retKind: 'data' }),
          F(['billing', 'policy'], { kind: 'request', ret: true, retKind: 'data', delay: 0.7 }),
          F(['alice', 'api', 'db'], { ret: true, delay: 1.5 }),
        ],
      },
      metrics: { rules: 'one place' },
      hi: ['rules'],
    },
    {
      short: 'Least priv.',
      title: 'Services need limits too',
      tag: 'Technique',
      body: [
        'Authorization isn’t only for people. If the invoices API is compromised, what can the attacker reach? With a shared admin DB login: **everything**, including the users table.',
        'Apply **least privilege**: the API’s DB account can read and write `invoices`, nothing else; its cloud role reads one bucket prefix; credentials are short-lived. A breach stays a small one.',
      ],
      callout: { kind: 'key', text: 'Give each service, job and machine its own identity with only the permissions it needs today.' },
      changes: [{ sign: '~', text: 'Shared admin login → per-service account' }],
      scene: {
        nodes: az('alice', ['api', { status: 'hot', tone: 'rose' }], ['db', { tag: 'invoices: rw' }], 'usersdb'),
        links: [L('alice', 'api'), L('api', 'db'), L('api', 'usersdb', { dashed: true, tone: 'bad', label: 'no grant' })],
        flows: [F(['api', 'usersdb'], { kind: 'error', stop: true, n: 2 }), F(['api', 'db'], { ret: true, delay: 0.8 })],
      },
      metrics: { blast: '1 table' },
      hi: ['blast'],
    },
    {
      short: 'Recap',
      title: 'Authorization, summed up',
      tag: 'Recap',
      body: [
        'Logged in is not allowed. Check **ownership on the server** on every request and **deny by default**. Use **roles** for broad strokes, attributes and relationships for finer rules.',
        'Keep policy in one place — a service or a shared engine — and apply **least privilege** to services and machines as well as people.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Every request should answer two questions: who is this, and may they do this to that? Skip the second and IDs become keys.' },
      scene: {
        nodes: az('alice', 'agent', 'api', ['db', { tag: 'invoices: rw' }], 'policy', 'billing'),
        links: [L('alice', 'api'), L('agent', 'api'), L('api', 'db'), L('api', 'policy', { arrow: 'both' }), L('billing', 'policy', { arrow: 'both' })],
        flows: [F(['alice', 'api', 'policy'], { ret: true, retKind: 'data' }), F(['agent', 'api', 'db'], { ret: true, delay: 1 })],
      },
      metrics: { exposed: '0', coverage: '48 / 48', rules: 'one place', blast: '1 table' },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Encryption & secrets                                                 */
/* ------------------------------------------------------------------ */

const en = cast({
  you: { kind: 'device', at: [-6, 0], tag: 'you · café', tagIcon: User },
  wifi: { kind: 'cube', at: [-2.5, 0], label: 'Wi-Fi', sub: 'café', icon: Wifi, tone: 'gray', size: 'sm' },
  eve: { kind: 'cube', at: [-2.5, -3.5], label: 'Sniffer', sub: 'same Wi-Fi', icon: Skull, tone: 'rose' },
  thief: { kind: 'cube', at: [-2.5, 0], label: 'Attacker', icon: Skull, tone: 'rose' },
  repo: { kind: 'slab', at: [-2.5, 3.5], tag: 'public repo', icon: GitBranch, tone: 'rose' },
  gw: { kind: 'cube', at: [1, 0], label: 'Gateway', sub: 'TLS ends', icon: ShieldCheck, tone: 'green' },
  orders: { kind: 'cube', at: [4.5, 0], label: 'Orders', icon: Server, tone: 'blue' },
  db: { kind: 'db', at: [4.5, 3.5], tag: 'orders db', icon: Database },
  backup: { kind: 'slab', at: [1, 3.5], tag: 'backups', icon: HardDrive, tone: 'violet' },
  kms: { kind: 'cube', at: [1, -3.5], label: 'KMS', sub: 'master key', icon: KeyRound, tone: 'yellow' },
  vault: { kind: 'cube', at: [4.5, -3.5], label: 'Secrets', sub: 'manager', icon: Vault, tone: 'yellow' },
});

export const encryption: Lesson = {
  id: 'encryption',
  title: 'Encryption & Secrets',
  blurb: 'Encrypt data on the wire and on disk, keep keys in a KMS, and keep secrets out of your code.',
  minutes: 12,
  level: 'Intermediate',
  keywords: ['encryption', 'tls', 'https', 'mtls', 'certificate', 'encryption at rest', 'kms', 'envelope encryption', 'secrets manager', 'key rotation'],
  metrics: [
    { id: 'transit', label: 'In transit', icon: Wifi },
    { id: 'rest', label: 'At rest', icon: HardDrive },
    { id: 'keys', label: 'Master key', icon: KeyRound },
    { id: 'secrets', label: 'Secret lifetime', icon: Timer },
  ],
  learn: [
    { text: 'What TLS protects, and how the handshake works', at: 1 },
    { text: 'Mutual TLS between internal services', at: 2 },
    { text: 'Encryption at rest and what it does not stop', at: 3 },
    { text: 'Envelope encryption with a KMS', at: 4 },
    { text: 'Secrets managers, runtime injection and rotation', at: 6 },
  ],
  steps: [
    {
      short: 'Café',
      title: 'Your password, in plain sight',
      tag: 'Problem',
      body: [
        'You order coffee beans on café Wi-Fi. The shop still serves plain `http://`, so your password and card number cross the air as **readable text**. Anyone on the network — or the router itself — can read them.',
        'A laptop running a packet sniffer collects 40 logins in an afternoon. Worse, it can **modify** pages in flight, injecting a fake payment form.',
      ],
      scene: {
        nodes: en('you', 'wifi', 'eve', 'gw'),
        links: [L('you', 'wifi'), L('wifi', 'gw', { label: 'http://' }), L('wifi', 'eve', { dashed: true, tone: 'bad' })],
        flows: [F(['you', 'wifi', 'gw'], { ret: true }), F(['wifi', 'eve'], { kind: 'data', n: 3, delay: 0.5 })],
        notes: [{ at: [-6, -3.5], text: 'password=hunter2', icon: Wifi, tone: 'bad' }],
      },
      metrics: { transit: 'plaintext', rest: 'plaintext', keys: '—', secrets: 'forever' },
      bad: ['transit'],
    },
    {
      short: 'TLS',
      title: 'Encrypt every connection',
      tag: 'Technique',
      body: [
        '**TLS** wraps the connection. In the **handshake**, the server presents a **certificate**, signed by a CA your browser trusts, proving it owns `shop.example`. Both sides derive fresh session keys; after that, every byte is encrypted and tamper-evident.',
        'TLS 1.3 needs just one round-trip. Serve **HTTPS everywhere**, redirect plain HTTP, and send `Strict-Transport-Security` so browsers never try plaintext again.',
      ],
      callout: { kind: 'tip', text: 'Automate certificates with ACME (e.g. Let’s Encrypt) and alert weeks before expiry — expired certs are a classic outage.' },
      changes: [{ sign: '~', text: 'http:// → https:// with TLS 1.3' }],
      scene: {
        nodes: en('you', 'wifi', ['eve', { status: 'dim' }], 'gw'),
        links: [L('you', 'wifi'), L('wifi', 'gw', { label: 'TLS 1.3', tone: 'good' }), L('wifi', 'eve', { dashed: true, tone: 'muted' })],
        flows: [
          F(['you', 'wifi', 'gw'], { kind: 'handshake', ret: true, retKind: 'handshake' }),
          F(['you', 'wifi', 'gw'], { ret: true, delay: 1.6 }),
          F(['wifi', 'eve'], { kind: 'data', stop: true, delay: 0.8 }),
        ],
        notes: [{ at: [-6, -3.5], text: 'sees only ciphertext', icon: Lock, tone: 'good' }],
      },
      metrics: { transit: 'TLS 1.3' },
      hi: ['transit'],
    },
    {
      short: 'mTLS',
      title: 'Inside the walls, too',
      tag: 'Technique',
      body: [
        'Often TLS ends at the gateway and traffic to internal services travels in plaintext, on the theory that the private network is safe. One compromised host there can **sniff** or **impersonate** any service.',
        'With **mutual TLS**, both sides present certificates: Orders knows the caller really is the gateway, and vice versa. A service mesh or internal CA issues short-lived certs and rotates them automatically.',
      ],
      changes: [{ sign: '+', text: 'mTLS between internal services' }],
      scene: {
        nodes: en('you', 'wifi', 'gw', 'orders', 'db'),
        links: [L('you', 'wifi'), L('wifi', 'gw', { tone: 'good' }), L('gw', 'orders', { arrow: 'both', label: 'mTLS', tone: 'good' }), L('orders', 'db', { label: 'TLS' })],
        flows: [
          F(['gw', 'orders'], { kind: 'handshake', ret: true, retKind: 'handshake' }),
          F(['you', 'wifi', 'gw', 'orders', 'db'], { ret: true, delay: 1.2 }),
        ],
        notes: [{ at: [4.5, -3.5], text: 'certs rotate every 24 h', icon: BadgeCheck }],
      },
      metrics: { transit: 'TLS + mTLS' },
      hi: ['transit'],
    },
    {
      short: 'At rest',
      title: 'Encrypt the disks and backups',
      tag: 'Technique',
      body: [
        'TLS protects data that moves. **Encryption at rest** protects data that sits: database files, snapshots, backups. A stolen backup or a recycled drive should be useless noise.',
        'Most databases and cloud disks offer transparent AES-256 with one setting. It stops lost media — **not** an attacker who comes in through the app with valid credentials; they see plaintext like any client.',
      ],
      callout: { kind: 'tip', text: 'For the most sensitive fields, such as card numbers, add app-level encryption so even a DB admin sees ciphertext.' },
      changes: [
        { sign: '+', text: 'Backups' },
        { sign: '~', text: 'Disks and backups encrypted (AES-256)' },
      ],
      scene: {
        nodes: en('gw', 'orders', ['db', { tag: 'AES-256 at rest' }], ['backup', { tag: 'encrypted backups' }], 'thief'),
        links: [L('gw', 'orders'), L('orders', 'db'), L('db', 'backup'), L('thief', 'backup', { tone: 'bad', dashed: true })],
        flows: [
          F(['gw', 'orders', 'db'], { ret: true }),
          F(['db', 'backup'], { kind: 'data', delay: 0.6 }),
          F(['thief', 'backup'], { kind: 'request', stop: true, delay: 1.2 }),
        ],
        notes: [{ at: [-2.5, -3.5], text: 'stolen disk = noise', icon: Lock, tone: 'good' }],
      },
      metrics: { rest: 'AES-256' },
      hi: ['rest'],
    },
    {
      short: 'Envelope',
      title: 'Keep the key away from the data',
      tag: 'Technique',
      body: [
        'With **envelope encryption**, each table or file gets its own **data key**, which encrypts the data. A **master key** inside the **KMS** encrypts the data key, and only that wrapped copy is stored next to the data.',
        'To read, a service asks the KMS to unwrap the data key — a permission-checked, audited call. The master key never leaves the KMS, and rotating it means re-wrapping small keys, not re-encrypting terabytes.',
      ],
      callout: { kind: 'key', text: 'Encryption is only as strong as key storage. A key sitting beside the data it protects is decoration.' },
      changes: [{ sign: '+', text: 'Key management service' }],
      scene: {
        nodes: en('gw', 'orders', ['db', { tag: 'AES-256 at rest' }], ['backup', { tag: 'encrypted backups' }], 'kms'),
        links: [L('gw', 'orders'), L('orders', 'db'), L('db', 'backup'), L('orders', 'kms', { arrow: 'both', label: 'unwrap data key' })],
        flows: [
          F(['orders', 'kms'], { kind: 'handshake', ret: true, retKind: 'data' }),
          F(['gw', 'orders', 'db'], { ret: true, delay: 1.2 }),
        ],
        notes: [{ at: [-2.5, -3.5], text: 'master key never leaves', icon: KeyRound, tone: 'good' }],
      },
      metrics: { keys: 'KMS only' },
      hi: ['keys'],
    },
    {
      short: 'Leaked key',
      title: 'A secret pushed to git',
      tag: 'Case',
      body: [
        'A developer commits `config.yaml` with a cloud access key to a public repo. Bots scan new commits and find leaked keys within **minutes**. Deleting the file later doesn’t help: it lives on in git history.',
        'With that key the attacker downloads the backups. Storage decrypts transparently for any **authorised** caller, so encryption at rest offers no protection here.',
      ],
      scene: {
        nodes: en('gw', 'orders', ['db', { tag: 'AES-256 at rest' }], ['backup', { tag: 'encrypted backups', status: 'hot' }], 'kms', 'repo', 'thief'),
        links: [
          L('gw', 'orders'),
          L('orders', 'db'),
          L('db', 'backup'),
          L('orders', 'kms', { arrow: 'both' }),
          L('repo', 'thief', { tone: 'bad', label: 'key in history' }),
          L('thief', 'backup', { tone: 'bad' }),
        ],
        flows: [F(['repo', 'thief'], { kind: 'data' }), F(['thief', 'backup'], { ret: true, retKind: 'data', delay: 0.9, n: 2 })],
      },
      metrics: { secrets: 'forever' },
      bad: ['secrets'],
    },
    {
      short: 'Secrets',
      title: 'Fetch secrets at runtime, rotate them',
      tag: 'Technique',
      body: [
        'Keep secrets out of code and images. Store them in a **secrets manager** (Vault, AWS Secrets Manager, Azure Key Vault) and let services fetch them at startup using their own workload identity.',
        '**Rotate** automatically: database credentials that expire after 24 h, or are issued per service, shrink the window if one leaks. Scan commits in CI and pre-commit hooks to catch keys before they land.',
      ],
      callout: { kind: 'warn', text: 'Once a key is public, rewriting git history is not enough. Revoke and rotate it first, then clean up.' },
      changes: [
        { sign: '+', text: 'Secrets manager' },
        { sign: '-', text: 'Keys in config files' },
      ],
      scene: {
        nodes: en('gw', 'orders', ['db', { tag: 'AES-256 at rest' }], ['backup', { tag: 'encrypted backups' }], 'kms', 'vault'),
        links: [
          L('gw', 'orders'),
          L('orders', 'db', { label: 'creds · 24 h' }),
          L('db', 'backup'),
          L('orders', 'kms', { arrow: 'both' }),
          L('orders', 'vault', { arrow: 'both', label: 'fetch at start' }),
          L('vault', 'kms', { dashed: true }),
        ],
        flows: [
          F(['orders', 'vault'], { kind: 'handshake', ret: true, retKind: 'data' }),
          F(['vault', 'kms'], { kind: 'data', ret: true, retKind: 'data', delay: 0.6 }),
          F(['gw', 'orders', 'db'], { ret: true, delay: 1.4 }),
        ],
      },
      metrics: { secrets: '24 h' },
      hi: ['secrets'],
    },
    {
      short: 'Recap',
      title: 'Encryption & secrets, summed up',
      tag: 'Recap',
      body: [
        'Use **TLS** on every connection and **mTLS** between services. Encrypt **at rest**, and keep keys in a **KMS** with envelope encryption so the master key never sits beside the data.',
        'Treat secrets as short-lived: store them in a **secrets manager**, inject them at runtime, rotate them, and scan commits for leaks.',
      ],
      callout: { kind: 'key', title: 'Takeaway', text: 'Encryption moves the problem to the keys. Protect, audit and rotate the keys, and keep every secret out of git.' },
      scene: {
        nodes: en('you', 'wifi', 'gw', 'orders', ['db', { tag: 'AES-256 at rest' }], ['backup', { tag: 'encrypted backups' }], 'kms', 'vault'),
        links: [
          L('you', 'wifi'),
          L('wifi', 'gw', { tone: 'good' }),
          L('gw', 'orders', { arrow: 'both', tone: 'good' }),
          L('orders', 'db'),
          L('db', 'backup'),
          L('orders', 'kms', { arrow: 'both' }),
          L('orders', 'vault', { arrow: 'both' }),
          L('vault', 'kms', { dashed: true }),
        ],
        flows: [
          F(['you', 'wifi', 'gw', 'orders', 'db'], { ret: true }),
          F(['orders', 'kms'], { kind: 'handshake', ret: true, retKind: 'data', delay: 1 }),
          F(['orders', 'vault'], { kind: 'handshake', ret: true, retKind: 'data', delay: 2 }),
        ],
      },
      metrics: { transit: 'TLS + mTLS', rest: 'AES-256', keys: 'KMS only', secrets: '24 h' },
    },
  ],
};
