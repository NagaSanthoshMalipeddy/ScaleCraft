import { BookOpenText, Menu, Moon, Sparkles, Search, Sun } from 'lucide-react';
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
      <div className="topbar-spacer" />
      <button className="search-btn" onClick={onSearch} aria-label="Search the course">
        <Search size={17} />
        <span className="search-ph">Search lessons & concepts…</span>
        <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <div className="progress-pill" title="Lessons completed">
        <span className="progress-ring" style={{ ['--p' as string]: `${total ? (done / total) * 100 : 0}%` }} />
        <span>
          {done}/{total}
        </span>
      </div>
      <button className="icon-btn outline-btn" onClick={onOutline} aria-label="Course outline" title="Course outline">
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
