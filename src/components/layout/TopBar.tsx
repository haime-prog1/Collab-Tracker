import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Search, Settings, X } from 'lucide-react';
import { ui, useUI } from '@/state/ui';
import { Logo } from './Logo';
import { OfflineBadge } from '@/components/pwa/OfflineBadge';

/** Sticky top bar with the global search. Typing anywhere jumps to the pipeline with results. */
export function TopBar() {
  const query = useUI((s) => s.filters.query);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" or Cmd/Ctrl+K focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.closest('input,textarea,select,[contenteditable=true]');
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 pt-safe backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 md:px-6">
        <div className="md:hidden">
          <Logo compact />
        </div>
        <label className="relative flex h-11 flex-1 items-center md:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-subtle" />
          <span className="sr-only">Search collabs</span>
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={query}
            placeholder="Search brands, platforms, stages…"
            onChange={(e) => {
              ui.setQuery(e.target.value);
              if (pathname !== '/pipeline' && e.target.value) navigate('/pipeline');
            }}
            className="h-11 w-full rounded-xl bg-elevated pl-10 pr-10 text-fg ring-1 ring-line placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-neon/70 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => ui.setQuery('')}
              className="absolute right-1 grid h-9 w-9 place-items-center rounded-lg text-subtle hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <OfflineBadge />
        <Link
          to="/settings"
          aria-label="Settings"
          className="grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-elevated hover:text-fg md:hidden"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
