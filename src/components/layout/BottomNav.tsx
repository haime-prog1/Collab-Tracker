import { NavLink } from 'react-router';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ui } from '@/state/ui';
import { CountBadge } from '@/components/ui/Badge';
import { NAV } from './nav';
import { useNavBadges } from './useNavBadges';

/** Mobile tab bar: 4 destinations + a central floating "new collab" button. Settings lives in the top bar. */
export function BottomNav() {
  const badges = useNavBadges();
  const items = NAV.filter((n) => n.to !== '/settings');
  const left = items.slice(0, 2);
  const right = items.slice(2);

  const renderItem = ({ to, label, icon: Icon }: (typeof NAV)[number]) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition active:scale-95',
          isActive ? 'text-fg' : 'text-subtle',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <Icon className={cn('h-6 w-6 transition', isActive && 'text-neon drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]')} />
            <CountBadge count={badges[to] ?? 0} className="absolute -right-2.5 -top-1.5" />
          </span>
          {label}
        </>
      )}
    </NavLink>
  );

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/85 pb-safe pl-safe pr-safe backdrop-blur-xl md:hidden"
    >
      <div className="flex items-center">
        {left.map(renderItem)}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            aria-label="New collab"
            onClick={() => ui.openEditor()}
            className="-mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-xl shadow-violet-600/40 ring-4 ring-bg transition active:scale-90"
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>
        {right.map(renderItem)}
      </div>
    </nav>
  );
}
