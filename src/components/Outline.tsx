import { ArrowUpRight, Check } from 'lucide-react';
import { forwardRef } from 'react';
import type { Progress } from '../hooks/state';
import { allLessons, modules } from '../lessons';

export const Outline = forwardRef<HTMLElement, { progress: Progress; currentId: string }>(function Outline({ progress, currentId }, ref) {
  const totalSteps = allLessons.reduce((a, r) => a + r.lesson.steps.length, 0);
  return (
    <section className="outline" ref={ref} id="outline" aria-labelledby="outline-title">
      <div className="outline-intro">
        <div>
          <span className="eyebrow strong">Course outline</span>
          <h2 id="outline-title">System design, one animated step at a time</h2>
          <p>
            {allLessons.length} lessons · {modules.length} modules · {totalSteps} animated steps. Each lesson starts with a real problem, then adds
            one idea at a time so you can watch the architecture — and the numbers — change.
          </p>
        </div>
        <div className="how card">
          <div className="eyebrow strong">How it works</div>
          <ol>
            <li>Pick a lesson, or press <kbd>Ctrl</kbd> <kbd>K</kbd> to search.</li>
            <li>
              Step through with <kbd>←</kbd> <kbd>→</kbd> and watch the traffic.
            </li>
            <li>
              Replay with <kbd>R</kbd>, pause with <kbd>Space</kbd>.
            </li>
            <li>Progress is saved in this browser — nothing leaves your machine.</li>
          </ol>
        </div>
      </div>
      <div className="outline-grid">
        {modules.map((m, mi) => (
          <div key={m.id} className="card outline-module">
            <div className="om-head">
              <span className="om-num">{String(mi + 1).padStart(2, '0')}</span>
              <h3>{m.title}</h3>
            </div>
            <ul>
              {m.lessons.map((l) => {
                const complete = (progress[l.id] ?? -1) >= l.steps.length - 1;
                return (
                  <li key={l.id} className={l.id === currentId ? 'current' : ''}>
                    <a href={`#/${l.id}/1`}>
                      <span className="om-title">
                        {complete && (
                          <span className="om-done">
                            <Check size={11} strokeWidth={3.2} />
                          </span>
                        )}
                        {l.title}
                        <ArrowUpRight size={14} className="om-arrow" />
                      </span>
                      <span className="om-blurb">{l.blurb}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <footer className="site-foot">
        <span>Scalecraft · built locally with React + SVG</span>
        <span className="muted">Diagrams and timings are teaching examples — measure your own systems.</span>
      </footer>
    </section>
  );
});
