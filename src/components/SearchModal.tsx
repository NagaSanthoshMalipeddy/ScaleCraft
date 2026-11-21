import { BookOpen, CornerDownLeft, Footprints, Search, Target } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { allLessons } from '../lessons';
import { questions } from '../questions';
import { plain } from '../text';
import type { Lesson } from '../types';

interface Entry {
  kind: 'lesson' | 'question' | 'step';
  title: string;
  context: string;
  haystack: string;
  lessonId: string;
  step: number;
}

const stepEntries = (lesson: Lesson, label: string): Entry[] =>
  lesson.steps.map((s, i) => ({
    kind: 'step' as const,
    title: s.title,
    context: `${label} · Step ${i + 1} · ${s.tag}`,
    haystack: [s.title, s.short, ...s.body.map(plain), s.callout?.text ?? ''].join(' ').toLowerCase(),
    lessonId: lesson.id,
    step: i + 1,
  }));

const entries: Entry[] = [
  ...allLessons.flatMap(({ lesson, module, moduleIndex }) => [
    {
      kind: 'lesson' as const,
      title: lesson.title,
      context: `${String(moduleIndex + 1).padStart(2, '0')}. ${module.title} · ${lesson.blurb}`,
      haystack: [lesson.title, lesson.blurb, module.title, ...(lesson.keywords ?? [])].join(' ').toLowerCase(),
      lessonId: lesson.id,
      step: 1,
    },
    ...stepEntries(lesson, lesson.title),
  ]),
  ...questions.flatMap((q) => [
    {
      kind: 'question' as const,
      title: q.title,
      context: `Question ${q.n} · ${q.level} · ${q.concepts.join(', ')}`,
      haystack: [q.title, q.blurb, q.level, 'question interview', ...q.concepts, ...q.followUps, ...(q.keywords ?? [])].join(' ').toLowerCase(),
      lessonId: q.id,
      step: 1,
    },
    ...stepEntries(q, `Q${q.n} ${q.title}`),
  ]),
];

function score(e: Entry, terms: string[]): number {
  let total = 0;
  const t = e.title.toLowerCase();
  for (const term of terms) {
    const stem = term.length > 4 ? term.slice(0, -1) : term;
    if (t.includes(term)) total += t.startsWith(term) ? 6 : 4;
    else if (t.includes(stem)) total += t.startsWith(stem) ? 5 : 3;
    else if (e.haystack.includes(term) || e.haystack.includes(stem)) total += 1;
    else return 0;
  }
  return total + (e.kind === 'step' ? 0 : 1.5);
}

export function SearchModal({ open, onClose, onGo }: { open: boolean; onClose: () => void; onGo: (lessonId: string, step: number) => void }) {
  // Mounting fresh on every open resets the query and selection.
  return open ? <SearchDialog onClose={onClose} onGo={onGo} /> : null;
}

function SearchDialog({ onClose, onGo }: { onClose: () => void; onGo: (lessonId: string, step: number) => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const list = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return entries.filter((e) => e.kind !== 'step');
    return entries
      .map((e) => ({ e, s: score(e, terms) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30)
      .map((r) => r.e);
  }, [q]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const pick = (e: Entry) => {
    onGo(e.lessonId, e.step);
    onClose();
  };

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="search-modal" role="dialog" aria-label="Search the course" onMouseDown={(e) => e.stopPropagation()}>
        <div className="search-input">
          <Search size={18} />
          <input
            autoFocus
            value={q}
            placeholder="Search lessons, questions & concepts…"
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(results.length - 1, s + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              } else if (e.key === 'Enter' && results[sel]) {
                pick(results[sel]);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            aria-label="Search query"
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="search-results" ref={list} role="listbox">
          {results.length === 0 && <li className="search-empty">No matches for “{q}”. Try “cache”, “queue” or “p99”.</li>}
          {results.map((e, i) => (
            <li
              key={`${e.lessonId}-${e.kind}-${e.step}`}
              role="option"
              aria-selected={i === sel}
              className={i === sel ? 'sel' : ''}
              onMouseEnter={() => setSel(i)}
              onClick={() => pick(e)}
            >
              <span className={`sr-icon ${e.kind}`}>
                {e.kind === 'lesson' ? <BookOpen size={15} /> : e.kind === 'question' ? <Target size={15} /> : <Footprints size={15} />}
              </span>
              <span className="sr-text">
                <span className="sr-title">{e.title}</span>
                <span className="sr-ctx">{e.context}</span>
              </span>
              {i === sel && <CornerDownLeft size={15} className="sr-enter" />}
            </li>
          ))}
        </ul>
        <div className="search-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
