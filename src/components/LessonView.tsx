import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  Keyboard,
  Lightbulb,
  BookOpen,
  ListOrdered,
  MessageCircleQuestion,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { lessonById, type Entry } from '../catalog';
import { sceneBounds, usedFlowKinds } from '../scene/layout';
import { SceneView } from '../scene/Scene';
import type { Callout, FlowKind } from '../types';
import { Rich } from './Rich';

const FLOW_LABEL: Record<FlowKind, string> = {
  request: 'request',
  response: 'response',
  handshake: 'handshake',
  event: 'event',
  error: 'rejected',
  data: 'data',
};

const CALLOUT_ICON = { key: Sparkles, tip: Lightbulb, warn: TriangleAlert };
const CALLOUT_TITLE = { key: 'Key idea', tip: 'Good to know', warn: 'Watch out' };

function CalloutBox({ c }: { c: Callout }) {
  const I = CALLOUT_ICON[c.kind];
  return (
    <div className={`callout callout-${c.kind}`}>
      <span className="callout-icon">
        <I size={18} />
      </span>
      <div>
        <div className="eyebrow">{c.title ?? CALLOUT_TITLE[c.kind]}</div>
        <p>{c.text}</p>
      </div>
    </div>
  );
}

export function LessonView({
  entry,
  stepIndex,
  go,
  blocked,
  onConcept,
}: {
  entry: Entry;
  stepIndex: number;
  go: (lessonId: string, step?: number) => void;
  blocked: boolean;
  /** Open the question bank filtered to a concept. */
  onConcept?: (concept: string) => void;
}) {
  const { lesson, question, next } = entry;
  const isQuestion = entry.kind === 'question';
  const step = lesson.steps[stepIndex];
  const total = lesson.steps.length;
  const stepKey = `${lesson.id}-${stepIndex}`;
  // Pausing applies to the current step only; moving to another step resumes traffic.
  const [pausedAt, setPausedAt] = useState<string | null>(null);
  const paused = pausedAt === stepKey;
  const togglePause = () => setPausedAt((p) => (p === stepKey ? null : stepKey));
  const [replay, setReplay] = useState(0);

  const bounds = useMemo(() => sceneBounds(lesson.steps.map((s) => s.scene)), [lesson]);

  const metrics = useMemo(() => {
    const merged: Record<string, string> = {};
    for (let i = 0; i <= stepIndex; i++) Object.assign(merged, lesson.steps[i].metrics ?? {});
    return merged;
  }, [lesson, stepIndex]);

  const goStep = (i: number) => go(lesson.id, Math.max(1, Math.min(total, i + 1)));
  const onNext = () => {
    if (stepIndex < total - 1) goStep(stepIndex + 1);
    else if (next) go(next.id, 1);
  };
  const onBack = () => stepIndex > 0 && goStep(stepIndex - 1);

  useEffect(() => {
    if (blocked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onBack();
      } else if (e.key === 'r' || e.key === 'R') {
        setReplay((r) => r + 1);
      } else if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'A') {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const kinds = usedFlowKinds(step.scene);
  const nextLabel =
    stepIndex < total - 1
      ? `Next: ${lesson.steps[stepIndex + 1].short}`
      : next
        ? `${isQuestion ? 'Next question' : 'Next lesson'}: ${next.title}`
        : isQuestion
          ? 'All questions done'
          : 'Course complete';
  const related = (question?.related ?? []).map((id) => ({ id, lesson: lessonById(id) })).filter((r) => r.lesson);

  return (
    <div className="lesson-layout">
      <main className="lesson-main card">
        <div className="lesson-head">
          <div className="crumbs">
            {entry.crumbs.map((c, i) => (
              <span key={i} className="crumb">
                {i > 0 && <span className="sep">/</span>}
                {isQuestion && i === 0 ? <a href="#/questions">{c}</a> : c}
              </span>
            ))}
          </div>
          <div className="title-row">
            <h2>
              {question && <span className="q-num">#{question.n}</span>}
              {lesson.title}
            </h2>
            <div className="chips">
              <span className="chip chip-sand">
                <Clock size={15} /> {lesson.minutes} min
              </span>
              <span className={`chip ${isQuestion ? `chip-level level-${lesson.level.toLowerCase()}` : 'chip-green'}`}>
                <BarChart3 size={15} /> {lesson.level}
              </span>
              <span className="chip chip-violet">
                <ListOrdered size={15} /> {total} steps
              </span>
            </div>
          </div>
          <p className="blurb">{lesson.blurb}</p>
          {question && (
            <div className="concept-row" aria-label="Key concepts">
              <span className="eyebrow">Key concepts</span>
              {question.concepts.map((c) => (
                <button key={c} className="concept" onClick={() => onConcept?.(c)} title={`Questions that exercise ${c}`}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="stage" aria-label="Animated diagram">
          <div className="metrics">
            {lesson.metrics.map((m) => {
              const I = m.icon;
              const v = metrics[m.id] ?? '—';
              const cls = step.bad?.includes(m.id) ? ' bad' : step.hi?.includes(m.id) ? ' hi' : '';
              return (
                <div key={m.id} className={`metric${cls}`}>
                  <span className="metric-label">
                    <I size={13} /> {m.label}
                  </span>
                  <span className="metric-value" key={v}>
                    {v}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="scene-wrap">
            <SceneView
              key={lesson.id}
              scene={step.scene}
              bounds={bounds}
              paused={paused}
              resetKey={`${stepKey}-${replay}`}
              label={`${lesson.title} — ${step.title}`}
            />
          </div>
          <div className="stage-foot">
            <div className="legend">
              {kinds.map((k) => (
                <span key={k} className="legend-item">
                  <span className={`legend-dot pk-${k}`} /> {FLOW_LABEL[k]}
                </span>
              ))}
            </div>
            <div className="stage-controls">
              <button className="icon-btn pop" onClick={() => setReplay((r) => r + 1)} aria-label="Replay this step (R)" title="Replay (R)">
                <RotateCcw size={18} />
              </button>
              <button
                className="icon-btn pop"
                onClick={togglePause}
                aria-label={paused ? 'Resume traffic (Space)' : 'Pause traffic (Space)'}
                title={paused ? 'Resume (Space)' : 'Pause (Space)'}
              >
                {paused ? <Play size={18} /> : <Pause size={18} />}
              </button>
            </div>
          </div>
        </section>

        <section className="stepper card-inner" aria-label={isQuestion ? 'Steps in this walkthrough' : 'Steps in this lesson'}>
          <div className="stepper-head">
            <span className="eyebrow strong">{isQuestion ? 'Walkthrough' : 'In this lesson'}</span>
            <span className="muted">
              Step {stepIndex + 1} of {total}
            </span>
          </div>
          <ol className="steps" style={{ ['--n' as string]: total }}>
            <span className="steps-track" />
            <span className="steps-fill" style={{ width: `calc((100% - 100% / var(--n)) * ${stepIndex / Math.max(1, total - 1)})` }} />
            {lesson.steps.map((s, i) => (
              <li key={i}>
                <button
                  className={`step-dot${i < stepIndex ? ' past' : ''}${i === stepIndex ? ' current' : ''}`}
                  onClick={() => goStep(i)}
                  aria-current={i === stepIndex ? 'step' : undefined}
                >
                  <span className="dot">{i + 1}</span>
                  <span className="step-name">{s.short}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <aside className="lesson-aside">
        <div className="card step-card">
          <div className="step-top">
            <span className="eyebrow strong">
              Step {stepIndex + 1} / {total}
            </span>
            <span className={`tag tag-${step.tag.toLowerCase().replace(/[^a-z]/g, '')}`}>{step.tag}</span>
          </div>
          <div className="step-body" key={stepKey}>
            <h3>{step.title}</h3>
            {step.body.map((p, i) => (
              <p key={i}>
                <Rich text={p} />
              </p>
            ))}
            {step.callout && <CalloutBox c={step.callout} />}
            {step.changes && step.changes.length > 0 && (
              <div className="changes">
                <div className="eyebrow">What changed</div>
                <ul>
                  {step.changes.map((c, i) => (
                    <li key={i}>
                      <span className={`chg chg-${c.sign === '+' ? 'add' : c.sign === '-' ? 'del' : 'mod'}`}>{c.sign}</span>
                      <span>{c.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="step-nav">
            <button className="btn" onClick={onBack} disabled={stepIndex === 0}>
              <ArrowLeft size={17} /> Back
            </button>
            <button className="btn btn-primary" onClick={onNext} disabled={stepIndex === total - 1 && !next}>
              <span>{nextLabel}</span>
              <ArrowRight size={17} />
            </button>
          </div>
          <div className="kbd-hint">
            <Keyboard size={14} />
            <kbd>←</kbd>
            <kbd>→</kbd> step · <kbd>R</kbd> replay · <kbd>Space</kbd> pause
          </div>
        </div>

        <div className="card learn-card">
          <div className="eyebrow strong">You’ll learn</div>
          <ul>
            {lesson.learn.map((l, i) => {
              const got = stepIndex >= l.at;
              return (
                <li key={i} className={got ? 'got' : ''}>
                  <span className="check">{got && <Check size={13} strokeWidth={3} />}</span>
                  <span>{l.text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {question && question.followUps.length > 0 && (
          <div className="card learn-card followups-card">
            <div className="eyebrow strong">
              <MessageCircleQuestion size={15} /> Interviewers often ask
            </div>
            <ol>
              {question.followUps.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ol>
          </div>
        )}

        {related.length > 0 && (
          <div className="card learn-card related-card">
            <div className="eyebrow strong">
              <BookOpen size={15} /> Brush up first
            </div>
            <ul>
              {related.map((r) => (
                <li key={r.id}>
                  <a href={`#/${r.id}/1`}>
                    <span>{r.lesson!.title}</span>
                    <ArrowRight size={14} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
