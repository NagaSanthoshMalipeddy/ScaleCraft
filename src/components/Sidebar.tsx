import { Check, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isComplete, isStarted, questionsByLevel } from '../catalog';
import type { Progress } from '../hooks/state';
import { modules } from '../lessons';
import type { Lesson } from '../types';

function Item({ l, label, currentId, progress, onClose }: { l: Lesson; label: string; currentId: string; progress: Progress; onClose: () => void }) {
  const reached = progress[l.id] ?? -1;
  const complete = isComplete(l, progress);
  const started = isStarted(l, progress);
  return (
    <li>
      <a href={`#/${l.id}/1`} onClick={onClose} className={`side-lesson${l.id === currentId ? ' current' : ''}${complete ? ' done' : ''}`}>
        <span className={`side-dot${complete ? ' done' : started ? ' started' : ''}`}>{complete ? <Check size={12} strokeWidth={3} /> : label}</span>
        <span className="side-title">{l.title}</span>
        {started && <span className="side-pct">{Math.round(((reached + 1) / l.steps.length) * 100)}%</span>}
      </a>
    </li>
  );
}

function Group({ head, num, items, progress, children }: { head: string; num?: string; items: Lesson[]; progress: Progress; children: React.ReactNode }) {
  const done = items.filter((l) => isComplete(l, progress)).length;
  return (
    <section className="side-module">
      <div className="side-module-head">
        {num && <span className="mod-num">{num}</span>}
        <span className="mod-title">{head}</span>
        <span className="mod-count">
          {done}/{items.length}
        </span>
      </div>
      <div className="mod-bar">
        <span style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
      </div>
      <ul>{children}</ul>
    </section>
  );
}

export function Sidebar({
  open,
  onClose,
  currentId,
  section,
  progress,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  currentId: string;
  section: 'course' | 'questions';
  progress: Progress;
  onReset: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [tab, setTab] = useState(section);
  const [wasOpen, setWasOpen] = useState(open);
  // Each time the drawer opens, show the tab for the section you're in.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTab(section);
  }

  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>('.side-lesson.current')?.scrollIntoView({ block: 'center' });
  }, [open, tab]);

  const offsets = modules.map((_, i) => modules.slice(0, i).reduce((a, m) => a + m.lessons.length, 0));
  return (
    <>
      <div className={`scrim${open ? ' show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside ref={ref} className={`sidebar${open ? ' open' : ''}`} aria-label="Navigation" aria-hidden={!open} inert={!open}>
        <div className="side-head">
          <div className="seg side-tabs" role="tablist" aria-label="Section">
            <button role="tab" aria-selected={tab === 'course'} className={`seg-btn${tab === 'course' ? ' on' : ''}`} onClick={() => setTab('course')}>
              Course
            </button>
            <button role="tab" aria-selected={tab === 'questions'} className={`seg-btn${tab === 'questions' ? ' on' : ''}`} onClick={() => setTab('questions')}>
              Questions
            </button>
          </div>
          <button className="icon-btn sm" onClick={onClose} aria-label="Close menu">
            <X size={16} />
          </button>
        </div>
        <nav className="side-nav" key={tab}>
          {tab === 'course'
            ? modules.map((m, mi) => (
                <Group key={m.id} head={m.title} num={`${String(mi + 1).padStart(2, '0')}.`} items={m.lessons} progress={progress}>
                  {m.lessons.map((l, li) => (
                    <Item key={l.id} l={l} label={String(offsets[mi] + li + 1)} currentId={currentId} progress={progress} onClose={onClose} />
                  ))}
                </Group>
              ))
            : questionsByLevel.map(({ level, items }) => (
                <Group key={level} head={level} items={items} progress={progress}>
                  {items.map((q) => (
                    <Item key={q.id} l={q} label={String(q.n)} currentId={currentId} progress={progress} onClose={onClose} />
                  ))}
                </Group>
              ))}
          {tab === 'questions' && (
            <a className="side-all" href="#/questions" onClick={onClose}>
              Browse all questions →
            </a>
          )}
        </nav>
        <button className="ghost-btn side-reset" onClick={onReset}>
          <RotateCcw size={14} /> Reset progress
        </button>
      </aside>
    </>
  );
}
