import type { LucideIcon } from 'lucide-react';

export type Tone =
  | 'sand'
  | 'yellow'
  | 'blue'
  | 'violet'
  | 'green'
  | 'orange'
  | 'rose'
  | 'teal'
  | 'gray';

export type NodeKind = 'cube' | 'db' | 'device' | 'phone' | 'queue' | 'crowd' | 'slab';

export type NodeStatus = 'ok' | 'down' | 'hot' | 'dim';

/** Positions use a 2D "iso grid": +1 col = 86.6px right, +1 row = 50px down. Diagonal moves follow iso axes. */
export type Pos = [number, number];

export interface SceneNode {
  id: string;
  kind: NodeKind;
  at: Pos;
  label?: string;
  sub?: string;
  tone?: Tone;
  icon?: LucideIcon;
  /** Pill shown under the node */
  tag?: string;
  tagIcon?: LucideIcon;
  /** 0..100 load meter shown above the node */
  meter?: number;
  status?: NodeStatus;
  size?: 'sm' | 'md' | 'lg';
  /** Number of items (queue) or people (crowd) */
  items?: number;
}

export interface SceneLink {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  /** Route along iso axes with one bend (default true) */
  elbow?: boolean;
  /** Which iso axis to travel first when elbowing */
  first?: 'u' | 'v';
  arrow?: 'end' | 'both' | 'none';
  tone?: 'ink' | 'muted' | 'bad' | 'good';
}

export type FlowKind = 'request' | 'response' | 'handshake' | 'event' | 'error' | 'data';

export interface Flow {
  path: string[];
  kind?: FlowKind;
  /** Return to the start after reaching the end (as a response) */
  ret?: boolean;
  /** Color for the return trip */
  retKind?: FlowKind;
  /** Number of packets in flight at once */
  n?: number;
  /** Speed multiplier */
  speed?: number;
  /** Seconds to wait before the first packet */
  delay?: number;
  /** Packet stops at the end and blinks (e.g. rejected / timed out) */
  stop?: boolean;
}

export interface SceneNote {
  at: Pos;
  text: string;
  icon?: LucideIcon;
  tone?: 'ink' | 'bad' | 'good' | 'warn';
}

export interface Scene {
  nodes: SceneNode[];
  links?: SceneLink[];
  flows?: Flow[];
  notes?: SceneNote[];
}

export type StepTag =
  | 'Problem'
  | 'Technique'
  | 'Trade-off'
  | 'Case'
  | 'Insight'
  | 'Recap'
  // Interview-style question walkthroughs
  | 'Requirements'
  | 'Estimation'
  | 'API'
  | 'Data Model'
  | 'Design'
  | 'Deep Dive'
  | 'Bottleneck';

export interface Callout {
  kind: 'key' | 'tip' | 'warn';
  title?: string;
  text: string;
}

export interface Change {
  sign: '+' | '-' | '~';
  text: string;
}

export interface Step {
  short: string;
  title: string;
  tag: StepTag;
  body: string[];
  callout?: Callout;
  changes?: Change[];
  scene: Scene;
  metrics?: Record<string, string>;
  hi?: string[];
  bad?: string[];
}

export interface MetricDef {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface LearnItem {
  text: string;
  /** 0-based step index at which this item is considered learned */
  at: number;
}

export interface Lesson {
  id: string;
  title: string;
  blurb: string;
  minutes: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  learn: LearnItem[];
  metrics: MetricDef[];
  steps: Step[];
  keywords?: string[];
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

/** An interview-style design walkthrough in the question bank. Rendered with the same player as lessons. */
export interface Question extends Lesson {
  /** Position in the question bank (1-based). */
  n: number;
  /** Concepts the question exercises, shown as filterable chips. */
  concepts: string[];
  /** Ids of course lessons that teach the building blocks. */
  related: string[];
  /** Follow-ups an interviewer is likely to ask. */
  followUps: string[];
}
