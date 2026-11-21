import { ArrowRight, ArrowUpRight, Check, Target } from 'lucide-react';
import { forwardRef } from 'react';
import type { Progress } from '../hooks/state';
import { allLessons, modules } from '../lessons';
import { questions } from '../questions';

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
      {questions.length > 0 && (
        <a className="practice-cta card" href="#/questions">
          <span className="practice-icon">
            <Target size={22} />
          </span>
          <span className="practice-text">
            <span className="eyebrow strong">Ready to practise?</span>
            <span className="practice-title">{questions.length} system design interview questions</span>
            <span className="muted">From a URL shortener to a multi-region platform — each one an animated, step-by-step walkthrough.</span>
          </span>
          <ArrowRight size={20} className="practice-arrow" />
        </a>
      )}
    </section>
  );
});
