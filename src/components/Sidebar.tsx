import { Check, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { modules } from '../lessons';
import type { Progress } from '../hooks/state';

export function Sidebar({
  open,
  onClose,
  currentId,
  progress,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  currentId: string;
  progress: Progress;
  onReset: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>('.side-lesson.current')?.scrollIntoView({ block: 'center' });
  }, [open]);

  const offsets = modules.map((_, i) => modules.slice(0, i).reduce((a, m) => a + m.lessons.length, 0));
  return (
    <>
      <div className={`scrim${open ? ' show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside ref={ref} className={`sidebar${open ? ' open' : ''}`} aria-label="Course" aria-hidden={!open} inert={!open}>
        <div className="side-head">
          <span className="eyebrow">Course</span>
          <button className="icon-btn sm" onClick={onClose} aria-label="Close menu">
            <X size={16} />
          </button>
        </div>
        <nav className="side-nav">
          {modules.map((m, mi) => {
            const done = m.lessons.filter((l) => (progress[l.id] ?? -1) >= l.steps.length - 1).length;
            return (
              <section key={m.id} className="side-module">
                <div className="side-module-head">
                  <span className="mod-num">{String(mi + 1).padStart(2, '0')}.</span>
                  <span className="mod-title">{m.title}</span>
                  <span className="mod-count">
                    {done}/{m.lessons.length}
                  </span>
                </div>
                <div className="mod-bar">
                  <span style={{ width: `${(done / m.lessons.length) * 100}%` }} />
                </div>
                <ul>
                  {m.lessons.map((l, li) => {
                    const n = offsets[mi] + li + 1;
                    const reached = progress[l.id] ?? -1;
                    const complete = reached >= l.steps.length - 1;
                    const started = reached >= 0 && !complete;
                    return (
                      <li key={l.id}>
                        <a
                          href={`#/${l.id}/1`}
                          onClick={onClose}
                          className={`side-lesson${l.id === currentId ? ' current' : ''}${complete ? ' done' : ''}`}
                        >
                          <span className={`side-dot${complete ? ' done' : started ? ' started' : ''}`}>
                            {complete ? <Check size={12} strokeWidth={3} /> : n}
                          </span>
                          <span className="side-title">{l.title}</span>
                          {started && <span className="side-pct">{Math.round(((reached + 1) / l.steps.length) * 100)}%</span>}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </nav>
        <button className="ghost-btn side-reset" onClick={onReset}>
          <RotateCcw size={14} /> Reset progress
        </button>
      </aside>
    </>
  );
}
