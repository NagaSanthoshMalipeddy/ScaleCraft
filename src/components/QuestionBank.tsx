import { ArrowRight, Check, Clock, ListOrdered, Search, Target, X } from 'lucide-react';
import { forwardRef, useMemo, useState } from 'react';
import { isComplete, isStarted, LEVELS, type Level } from '../catalog';
import { questionsHref, type Progress } from '../hooks/state';
import { questions } from '../questions';
import type { Question } from '../types';

const LEVEL_NOTE: Record<Level, string> = {
  Beginner: 'One service, a database and a cache — practise the interview rhythm.',
  Intermediate: 'Real products with real traffic: fan-out, media, money and concurrency.',
  Advanced: 'Infrastructure and planet-scale systems where every trade-off matters.',
};

/** Concepts shown before "+N more" (most-used first). */
const CLOUD_LIMIT = 16;

function matches(q: Question, terms: string[]) {
  if (!terms.length) return true;
  const hay = [q.title, q.blurb, ...q.concepts, ...(q.keywords ?? [])].join(' ').toLowerCase();
  return terms.every((t) => hay.includes(t));
}

export const QuestionBank = forwardRef<
  HTMLElement,
  {
    progress: Progress;
    /** Active concept filter (from the URL). */
    concept: string | null;
    currentId?: string;
    /** `page` = the standalone #/questions page; `below` = the list under an open question. */
    variant: 'page' | 'below';
  }
>(function QuestionBank({ progress, concept, currentId, variant }, ref) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<Level | 'All'>('All');
  const [allConcepts, setAllConcepts] = useState(false);

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = useMemo(
    () => questions.filter((q) => (!concept || q.concepts.includes(concept)) && (level === 'All' || q.level === level) && matches(q, terms)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [concept, level, query],
  );

  const done = questions.filter((q) => isComplete(q, progress)).length;
  const conceptCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of questions) for (const c of q.concepts) m.set(c, (m.get(c) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, []);

  const filtered = !!concept || level !== 'All' || terms.length > 0;

  return (
    <section className={`qbank qbank-${variant}`} ref={ref} id="questions" aria-labelledby="qbank-title">
      {variant === 'page' ? (
        <div className="qbank-intro">
          <div>
            <span className="eyebrow strong">Practice</span>
            <h2 id="qbank-title">System design interview questions</h2>
            <p>
              {questions.length} questions from a URL shortener to a multi-region platform. Each one is an animated walkthrough in interview
              order — requirements, estimates, API, the high-level design, deep dives and the bottlenecks you’ll be pushed on.
            </p>
            <div className="qbank-stats">
              <span className="qstat">
                <span className="progress-ring" style={{ ['--p' as string]: `${questions.length ? (done / questions.length) * 100 : 0}%` }} />
                {done}/{questions.length} done
              </span>
              {LEVELS.map((l) => {
                const all = questions.filter((q) => q.level === l);
                const d = all.filter((q) => isComplete(q, progress)).length;
                return (
                  <span key={l} className={`qstat level-${l.toLowerCase()}`}>
                    <span className="level-dot" /> {l} {d}/{all.length}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="how card">
            <div className="eyebrow strong">
              <Target size={15} /> How to practise
            </div>
            <ol>
              <li>Read the prompt and set a 35-minute timer.</li>
              <li>Write requirements and napkin maths first.</li>
              <li>Sketch your design, then step through ours.</li>
              <li>Answer the follow-ups out loud.</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="qbank-below-head">
          <span className="eyebrow strong">Question bank</span>
          <h2 id="qbank-title">More questions to practise</h2>
        </div>
      )}

      <div className="qbank-controls">
        <label className="qsearch">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by name or concept…" aria-label="Filter questions" />
          {query && (
            <button className="qsearch-clear" onClick={() => setQuery('')} aria-label="Clear filter">
              <X size={14} />
            </button>
          )}
        </label>
        <div className="seg" role="tablist" aria-label="Difficulty">
          {(['All', ...LEVELS] as const).map((l) => (
            <button key={l} role="tab" aria-selected={level === l} className={`seg-btn${level === l ? ' on' : ''}`} onClick={() => setLevel(l)}>
              {l !== 'All' && <span className={`level-dot level-${l.toLowerCase()}`} />}
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="concept-cloud" aria-label="Filter by concept">
        {concept ? (
          <a className="concept on" href={questionsHref(null)} title="Clear concept filter">
            {concept} <X size={13} />
          </a>
        ) : (
          <>
            {(allConcepts ? conceptCounts : conceptCounts.slice(0, CLOUD_LIMIT)).map(([c, n]) => (
              <a key={c} className="concept" href={questionsHref(c)}>
                {c}
                {n > 1 && <span className="concept-n">{n}</span>}
              </a>
            ))}
            {conceptCounts.length > CLOUD_LIMIT && (
              <button className="concept more" onClick={() => setAllConcepts((v) => !v)} aria-expanded={allConcepts}>
                {allConcepts ? 'Show fewer' : `+${conceptCounts.length - CLOUD_LIMIT} more`}
              </button>
            )}
          </>
        )}
      </div>

      {visible.length === 0 && (
        <div className="qempty card">
          No questions match{concept ? ` “${concept}”` : ''}
          {terms.length ? ` and “${query}”` : ''}.{' '}
          <button
            className="linkish"
            onClick={() => {
              setQuery('');
              setLevel('All');
              if (concept) window.location.hash = questionsHref(null);
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {LEVELS.map((l) => {
        const items = visible.filter((q) => q.level === l);
        if (!items.length) return null;
        const all = questions.filter((q) => q.level === l);
        const d = all.filter((q) => isComplete(q, progress)).length;
        return (
          <section key={l} className="qlevel" aria-label={`${l} questions`}>
            <header className="qlevel-head">
              <span className={`level-badge level-${l.toLowerCase()}`}>{l}</span>
              <span className="qlevel-note">{LEVEL_NOTE[l]}</span>
              <span className="qlevel-count">
                {filtered ? `${items.length} of ${all.length}` : `${d}/${all.length} done`}
              </span>
            </header>
            <ul className="qlist card">
              {items.map((q) => {
                const complete = isComplete(q, progress);
                const started = isStarted(q, progress);
                const reached = progress[q.id] ?? -1;
                return (
                  <li key={q.id} className={`qrow${q.id === currentId ? ' current' : ''}${complete ? ' done' : ''}`}>
                    <span className="qn">{String(q.n).padStart(2, '0')}</span>
                    <div className="qmain">
                      <a className="qtitle" href={`#/${q.id}/1`}>
                        {q.title}
                      </a>
                      <span className="qblurb">{q.blurb}</span>
                    </div>
                    <div className="qconcepts">
                      {q.concepts.map((c) => (
                        <a key={c} className={`concept sm${c === concept ? ' on' : ''}`} href={questionsHref(c === concept ? null : c)}>
                          {c}
                        </a>
                      ))}
                    </div>
                    <span className="qmeta">
                      <span>
                        <Clock size={13} /> {q.minutes} min
                      </span>
                      <span>
                        <ListOrdered size={13} /> {q.steps.length}
                      </span>
                    </span>
                    <span className={`qstatus${complete ? ' done' : started ? ' started' : ''}`} aria-hidden="true">
                      {complete ? <Check size={14} strokeWidth={3} /> : started ? `${Math.round(((reached + 1) / q.steps.length) * 100)}%` : <ArrowRight size={15} />}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </section>
  );
});
