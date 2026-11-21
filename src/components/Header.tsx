import { BookOpenText, GraduationCap, Menu, Moon, Sparkles, Search, Sun, Target } from 'lucide-react';
import { Logo } from './Logo';

export function Header({
  theme,
  onTheme,
  motion,
  onMotion,
  onMenu,
  menuOpen,
  onSearch,
  onOutline,
  section,
  courseHref,
  done,
  total,
}: {
  theme: 'light' | 'dark';
  onTheme: () => void;
  motion: 'full' | 'reduce';
  onMotion: () => void;
  onMenu: () => void;
  menuOpen: boolean;
  onSearch: () => void;
  onOutline: () => void;
  section: 'course' | 'questions';
  courseHref: string;
  /** Completed / total for the active section. */
  done: number;
  total: number;
}) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onMenu} aria-label="Open the course menu" aria-expanded={menuOpen}>
        <Menu size={20} />
      </button>
      <a className="brand" href="#/" aria-label="Scalecraft — home">
        <Logo />
        <h1>
          Scale<span className="hl">craft</span>
        </h1>
      </a>
      <nav className="top-tabs" aria-label="Sections">
        <a href={courseHref} className={`top-tab${section === 'course' ? ' on' : ''}`} aria-current={section === 'course' ? 'page' : undefined}>
          <GraduationCap size={16} />
          <span>Course</span>
        </a>
        <a href="#/questions" className={`top-tab${section === 'questions' ? ' on' : ''}`} aria-current={section === 'questions' ? 'page' : undefined}>
          <Target size={16} />
          <span>Questions</span>
          <span className="new-badge" aria-label="new">New</span>
        </a>
      </nav>
      <div className="topbar-spacer" />
      <button className="search-btn" onClick={onSearch} aria-label="Search lessons and questions">
        <Search size={17} />
        <span className="search-ph">Search lessons & questions…</span>
        <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <div className="progress-pill" title={section === 'questions' ? 'Questions completed' : 'Lessons completed'}>
        <span className="progress-ring" style={{ ['--p' as string]: `${total ? (done / total) * 100 : 0}%` }} />
        <span>
          {done}/{total}
        </span>
      </div>
      <button
        className="icon-btn outline-btn"
        onClick={onOutline}
        aria-label={section === 'questions' ? 'Question list' : 'Course outline'}
        title={section === 'questions' ? 'Question list' : 'Course outline'}
      >
        <BookOpenText size={18} />
      </button>
      <button
        className={`icon-btn motion-btn${motion === 'reduce' ? ' off' : ''}`}
        onClick={onMotion}
        aria-pressed={motion === 'full'}
        aria-label={motion === 'full' ? 'Reduce motion' : 'Turn animations on'}
        title={motion === 'full' ? 'Animations on — click to reduce motion' : 'Animations reduced — click to turn on'}
      >
        <Sparkles size={18} />
      </button>
      <button className="icon-btn" onClick={onTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}
