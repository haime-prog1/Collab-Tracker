import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowRight, Building2, KanbanSquare, Search, UserRound, X } from 'lucide-react';
import { useSnapshot, useStages } from '@/hooks/useStore';
import { globalSearch } from '@/lib/globalSearch';
import { ui, useUI } from '@/state/ui';
import { cn } from '@/lib/cn';

interface Item {
  key: string;
  group: 'Collabs' | 'Brands' | 'Contacts' | '';
  icon: typeof Search;
  primary: string;
  secondary: string;
  run: () => void;
}

/**
 * One search box for the whole app.
 * - On the Pipeline page it filters the board live.
 * - Everywhere else it shows a results panel: collabs, brands and contact people.
 * Shortcuts: "/" or Ctrl/⌘+K to focus, ↑/↓ to move, Enter to open, Esc to close.
 */
export function GlobalSearch() {
  const query = useUI((s) => s.filters.query);
  const { collabs, brands } = useSnapshot();
  const { labels } = useStages();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const onPipeline = pathname === '/pipeline';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]');
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => globalSearch(query, collabs, brands, labels), [query, collabs, brands, labels]);

  const items: Item[] = useMemo(() => {
    const finish = () => {
      setOpen(false);
      inputRef.current?.blur();
    };
    const list: Item[] = [
      ...results.collabs.map<Item>((c) => ({
        key: `c${c.id}`, group: 'Collabs', icon: KanbanSquare, primary: c.title || 'Untitled collab',
        secondary: `${c.partnerName} · ${labels[c.stage]}`,
        run: () => { finish(); ui.setQuery(''); ui.openEditor(c.id); },
      })),
      ...results.brands.map<Item>((b) => ({
        key: `b${b.id}`, group: 'Brands', icon: Building2, primary: b.name,
        secondary: `${b.contacts[0]?.name ?? 'No contact'}${b.nicheTags.length ? ` · #${b.nicheTags.join(' #')}` : ''}`,
        run: () => { finish(); ui.setQuery(''); navigate(`/brands/${b.id}`); },
      })),
      ...results.contacts.map<Item>(({ contact, brand }) => ({
        key: `p${contact.id}`, group: 'Contacts', icon: UserRound, primary: contact.name,
        secondary: [contact.role, brand.name, contact.email].filter(Boolean).join(' · '),
        run: () => { finish(); ui.setQuery(''); navigate(`/brands/${brand.id}`); },
      })),
    ];
    if (results.totalCollabs > 0) {
      list.push({
        key: 'all', group: '', icon: ArrowRight, primary: `Show all ${results.totalCollabs} matching collab${results.totalCollabs > 1 ? 's' : ''} on the board`,
        secondary: '', run: () => { finish(); navigate('/pipeline'); },
      });
    }
    return list;
  }, [results, labels, navigate]);

  const showPanel = open && !onPipeline && query.trim().length > 0;
  const activeIdx = Math.min(active, Math.max(items.length - 1, 0));

  return (
    <div className="relative flex-1 md:max-w-lg">
      <label className="relative flex h-11 items-center">
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-subtle" />
        <span className="sr-only">Search collabs, brands and contacts</span>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-activedescendant={showPanel && items[activeIdx] ? `${listId}-${items[activeIdx].key}` : undefined}
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          placeholder="Search collabs, brands, contacts…"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            ui.setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!showPanel) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); items[activeIdx]?.run(); }
            else if (e.key === 'Escape') setOpen(false);
          }}
          className="h-11 w-full rounded-xl bg-elevated pl-10 pr-10 text-fg ring-1 ring-line placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-neon/70 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => { ui.setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-1 grid h-9 w-9 place-items-center rounded-lg text-subtle hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className="fixed inset-x-3 top-[calc(4.25rem+env(safe-area-inset-top))] z-50 max-h-[70dvh] animate-fade-up overflow-y-auto rounded-2xl bg-surface p-2 shadow-2xl ring-1 ring-line md:absolute md:inset-x-0 md:top-12"
          onMouseDown={(e) => e.preventDefault() /* keep input focused while clicking */}
        >
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">No collabs, brands or contacts match “{query}”.</p>
          ) : (
            items.map((it, i) => {
              const Icon = it.icon;
              const header = it.group && it.group !== items[i - 1]?.group;
              return (
                <div key={it.key}>
                  {header && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">{it.group}</p>}
                  <button
                    id={`${listId}-${it.key}`}
                    type="button"
                    role="option"
                    aria-selected={i === activeIdx}
                    onMouseEnter={() => setActive(i)}
                    onClick={it.run}
                    className={cn(
                      'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition',
                      i === activeIdx ? 'bg-neon/10' : 'hover:bg-elevated',
                      it.key === 'all' && 'mt-1 border-t border-line text-neon',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', it.key === 'all' ? 'text-neon' : 'text-subtle')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{it.primary}</span>
                      {it.secondary && <span className="block truncate text-xs text-muted">{it.secondary}</span>}
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
