import { NavLink } from 'react-router';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ui } from '@/state/ui';
import { Button } from '@/components/ui/Button';
import { CountBadge } from '@/components/ui/Badge';
import { NAV } from './nav';
import { useNavBadges } from './useNavBadges';
import { Logo } from './Logo';
import { InstallButton } from '@/components/pwa/InstallButton';

export function Sidebar() {
  const badges = useNavBadges();
  return (
    <aside className="sticky top-0 hidden print:hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-line bg-surface/60 p-4 pt-[max(1rem,env(safe-area-inset-top))] md:flex">
      <div className="mb-4 px-2">
        <Logo />
      </div>
      <Button variant="primary" className="mb-4" onClick={() => ui.openEditor()}>
        <Plus className="h-4 w-4" /> New collab
      </Button>
      <nav className="flex flex-col gap-1" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition',
                isActive ? 'bg-neon/12 text-fg ring-1 ring-neon/30' : 'text-muted hover:bg-elevated hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5', isActive && 'text-neon')} />
                <span className="flex-1">{label}</span>
                <CountBadge count={badges[to] ?? 0} className={cn(!isActive && 'bg-elevated text-muted ring-1 ring-line')} />
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto">
        <InstallButton />
      </div>
    </aside>
  );
}
