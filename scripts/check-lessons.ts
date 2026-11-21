/**
 * Static layout checker for lesson and question scenes.
 *
 *   npx tsx scripts/check-lessons.ts                       # every lesson and question wired into the indexes
 *   npx tsx scripts/check-lessons.ts src/questions/foo.ts  # every Lesson/Question exported by the given file(s)
 *
 * Reports overlapping nodes/labels, links that cut through other nodes, dangling ids and over-long text.
 * Exits with code 1 when any error is found.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Lesson, Question, Scene, SceneNode } from '../src/types';
import { nodeRadius, nodeScale, pointAt, polyLength, routeLink, toScreen, trim, type Pt } from '../src/scene/geom';
import { sceneBounds, TAG_OFFSET, TOP_OFFSET } from '../src/scene/layout';

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  what: string;
  owner: string;
}

/** [half-width, top, bottom] of each node drawing at scale 1, slightly inset. */
const BODY: Record<SceneNode['kind'], [number, number, number]> = {
  cube: [45, 52, 54],
  db: [44, 49, 41],
  device: [72, 100, 60],
  phone: [48, 30, 46],
  queue: [80, 52, 60],
  crowd: [66, 66, 56],
  slab: [62, 32, 54],
};

const isLesson = (v: unknown): v is Lesson =>
  !!v && typeof v === 'object' && 'steps' in v && 'id' in v && Array.isArray((v as Lesson).steps);

const overlap = (a: Box, b: Box, pad = 2) => a.x1 < b.x2 - pad && b.x1 < a.x2 - pad && a.y1 < b.y2 - pad && b.y1 < a.y2 - pad;
const inside = (p: Pt, b: Box) => p.x > b.x1 && p.x < b.x2 && p.y > b.y1 && p.y < b.y2;
const fmt = (b: Box) => `${b.what}`;

function pillBox(cx: number, cy: number, text: string, size: number, icon: boolean, what: string, owner: string): Box {
  const w = text.length * size * 0.6 + 22 + (icon ? size + 6 : 0);
  const h = size + 13;
  return { x1: cx - w / 2, x2: cx + w / 2, y1: cy - h / 2, y2: cy + h / 2, what, owner };
}

function bodyBox(n: SceneNode): Box {
  const p = toScreen(n.at);
  const s = nodeScale(n);
  const [hw, top, bottom] = BODY[n.kind];
  return { x1: p.x - hw * s, x2: p.x + hw * s, y1: p.y - top * s, y2: p.y + bottom * s, what: `node "${n.id}"`, owner: n.id };
}

function checkScene(scene: Scene, where: string, errors: string[], warns: string[]) {
  const ids = new Set(scene.nodes.map((n) => n.id));
  const dup = scene.nodes.map((n) => n.id).filter((id, i, a) => a.indexOf(id) !== i);
  if (dup.length) errors.push(`${where}: duplicate node ids ${dup.join(', ')}`);
  const map = new Map(scene.nodes.map((n) => [n.id, n]));
  const links = scene.links ?? [];

  for (const l of links) {
    if (!ids.has(l.from) || !ids.has(l.to)) errors.push(`${where}: link ${l.from}→${l.to} references a node that is not in this step`);
  }
  for (const f of scene.flows ?? []) {
    for (const id of f.path) if (!ids.has(id)) errors.push(`${where}: flow [${f.path.join(',')}] references missing node "${id}"`);
    for (let i = 0; i < f.path.length - 1; i++) {
      const a = f.path[i];
      const b = f.path[i + 1];
      if (!links.some((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a)))
        warns.push(`${where}: flow hop ${a}→${b} has no link (packet will fly in a straight line)`);
    }
  }

  const bodies = scene.nodes.map(bodyBox);
  const labels: Box[] = [];
  for (const n of scene.nodes) {
    const p = toScreen(n.at);
    const s = nodeScale(n);
    const tag = n.tag ?? (n.kind !== 'cube' ? n.label : undefined);
    if (tag) labels.push(pillBox(p.x, p.y + TAG_OFFSET[n.kind] * s, tag, 12.5, !!n.tagIcon, `tag "${tag}" of ${n.id}`, n.id));
    if (n.meter !== undefined) {
      const y = p.y - TOP_OFFSET[n.kind] * s - 8;
      labels.push({ x1: p.x - 52, x2: p.x + 52, y1: y - 12, y2: y + 12, what: `meter of ${n.id}`, owner: n.id });
    }
    if (n.kind === 'cube' && n.label) {
      const max = n.size === 'sm' ? 6 : n.size === 'lg' ? 10 : 8;
      if (n.label.length > max) warns.push(`${where}: cube "${n.id}" label "${n.label}" is long (>${max} chars) and may overflow`);
      if (n.sub && n.sub.length > max + 3) warns.push(`${where}: cube "${n.id}" sub "${n.sub}" is long (>${max + 3} chars)`);
    }
  }
  for (const note of scene.notes ?? []) {
    const p = toScreen(note.at);
    labels.push(pillBox(p.x, p.y, note.text, 12, !!note.icon, `note "${note.text}"`, `note:${note.text}`));
  }

  const paths: { key: string; pts: Pt[]; from: string; to: string }[] = [];
  for (const l of links) {
    const A = map.get(l.from);
    const B = map.get(l.to);
    if (!A || !B) continue;
    const pts = trim(routeLink(A.at, B.at, l).map(toScreen), nodeRadius(A) + 4, nodeRadius(B) + 8);
    paths.push({ key: `${l.from}→${l.to}`, pts, from: l.from, to: l.to });
    if (l.label) {
      const mid = pointAt(pts, polyLength(pts) / 2);
      labels.push(pillBox(mid.x, mid.y, l.label, 11.5, false, `link label "${l.label}"`, `link:${l.from}>${l.to}`));
    }
  }

  // node vs node
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++) if (overlap(bodies[i], bodies[j], 4)) errors.push(`${where}: ${fmt(bodies[i])} overlaps ${fmt(bodies[j])}`);

  // label vs node, label vs label
  for (const lb of labels) {
    for (const b of bodies) if (b.owner !== lb.owner && overlap(lb, b, 3)) errors.push(`${where}: ${fmt(lb)} overlaps ${fmt(b)}`);
  }
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++) if (overlap(labels[i], labels[j], 1)) errors.push(`${where}: ${fmt(labels[i])} overlaps ${fmt(labels[j])}`);

  // links cutting through other nodes
  for (const p of paths) {
    const len = polyLength(p.pts);
    for (const b of bodies) {
      if (b.owner === p.from || b.owner === p.to) continue;
      const shrunk = { ...b, x1: b.x1 + 8, x2: b.x2 - 8, y1: b.y1 + 8, y2: b.y2 - 8 };
      for (let d = 0; d <= len; d += 6) {
        if (inside(pointAt(p.pts, d), shrunk)) {
          errors.push(`${where}: link ${p.key} passes through ${fmt(b)}`);
          break;
        }
      }
    }
  }
}

function checkLesson(l: Lesson, errors: string[], warns: string[]) {
  const ids = new Set(l.metrics.map((m) => m.id));
  if (l.steps.length < 4) warns.push(`${l.id}: only ${l.steps.length} steps`);
  if (l.steps[0]?.tag !== 'Problem' && l.steps[0]?.tag !== 'Requirements') warns.push(`${l.id}: first step should be tagged Problem or Requirements`);
  if (l.steps[l.steps.length - 1]?.tag !== 'Recap') warns.push(`${l.id}: last step should be tagged Recap`);
  for (const it of l.learn) if (it.at >= l.steps.length) errors.push(`${l.id}: learn item "${it.text}" has at=${it.at} beyond last step`);
  l.steps.forEach((s, i) => {
    const where = `${l.id} step ${i + 1} (${s.short})`;
    if (s.short.length > 13) warns.push(`${where}: short label "${s.short}" > 13 chars`);
    if (s.title.length > 44) warns.push(`${where}: title is ${s.title.length} chars (keep ≤ 44)`);
    s.body.forEach((p, k) => p.length > 340 && warns.push(`${where}: paragraph ${k + 1} is ${p.length} chars (keep ≤ 340)`));
    for (const k of Object.keys(s.metrics ?? {})) if (!ids.has(k)) errors.push(`${where}: metric "${k}" is not defined on the lesson`);
    for (const k of [...(s.hi ?? []), ...(s.bad ?? [])]) if (!ids.has(k)) errors.push(`${where}: hi/bad metric "${k}" is not defined`);
    checkScene(s.scene, where, errors, warns);
  });
  if (l.steps[0] && Object.keys(l.steps[0].metrics ?? {}).length !== ids.size) warns.push(`${l.id}: step 1 should set every metric (use '—' for unknown)`);
  const b = sceneBounds(l.steps.map((s) => s.scene));
  if (b.w > 1300) warns.push(`${l.id}: scene is ${Math.round(b.w)} units wide (> 1300) — diagram will render small; tighten the layout`);
  if (b.h > 760) warns.push(`${l.id}: scene is ${Math.round(b.h)} units tall (> 760) — diagram will render small; tighten the layout`);
}

const isQuestion = (l: Lesson): l is Question => 'n' in l && 'concepts' in l;

function checkQuestion(q: Question, lessonIds: Set<string>, errors: string[], warns: string[]) {
  if (!q.id.startsWith('q-')) errors.push(`${q.id}: question ids must start with "q-"`);
  if (!Number.isInteger(q.n) || q.n < 1) errors.push(`${q.id}: n must be a positive integer`);
  if (!q.concepts?.length) errors.push(`${q.id}: concepts must not be empty`);
  if (!q.followUps || q.followUps.length < 3 || q.followUps.length > 5) errors.push(`${q.id}: followUps should have 3–5 items`);
  q.followUps?.forEach((f) => f.length > 110 && warns.push(`${q.id}: follow-up is ${f.length} chars (keep ≤ 110): "${f.slice(0, 40)}…"`));
  if (!q.related?.length) warns.push(`${q.id}: no related lessons`);
  for (const r of q.related ?? []) if (!lessonIds.has(r)) errors.push(`${q.id}: related lesson "${r}" does not exist`);
}

async function main() {
  const args = process.argv.slice(2);
  const lessons: Lesson[] = [];
  const course = await import(pathToFileURL(path.resolve('src/lessons/index.ts')).href);
  const lessonIds = new Set<string>(course.modules.flatMap((m: { lessons: Lesson[] }) => m.lessons.map((l) => l.id)));
  if (args.length === 0) {
    for (const m of course.modules) lessons.push(...m.lessons);
    const bank = await import(pathToFileURL(path.resolve('src/questions/index.ts')).href);
    lessons.push(...bank.questions);
    const nums = bank.questions.map((q: Question) => q.n);
    const dupN = nums.filter((n: number, i: number) => nums.indexOf(n) !== i);
    if (dupN.length) console.log(`✗ duplicate question numbers: ${dupN.join(', ')}`);
  } else {
    for (const a of args) {
      const mod = await import(pathToFileURL(path.resolve(a)).href);
      lessons.push(...Object.values(mod).filter(isLesson));
    }
  }
  const seen = new Set<string>();
  let errorCount = 0;
  for (const l of lessons) {
    if (seen.has(l.id)) console.log(`✗ duplicate lesson id ${l.id}`);
    seen.add(l.id);
    const errors: string[] = [];
    const warns: string[] = [];
    checkLesson(l, errors, warns);
    if (isQuestion(l)) checkQuestion(l, lessonIds, errors, warns);
    errorCount += errors.length;
    const b = sceneBounds(l.steps.map((s) => s.scene));
    console.log(`${errors.length ? '✗' : '✓'} ${l.id} — ${l.steps.length} steps, scene ${Math.round(b.w)}×${Math.round(b.h)}`);
    for (const e of errors) console.log(`   ERROR ${e}`);
    for (const w of warns) console.log(`   warn  ${w}`);
  }
  const qCount = lessons.filter(isQuestion).length;
  console.log(`\n${lessons.length - qCount} lessons, ${qCount} questions, ${errorCount} errors`);
  process.exit(errorCount ? 1 : 0);
}

main();
