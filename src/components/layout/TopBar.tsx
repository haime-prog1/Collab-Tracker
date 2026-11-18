import { Link } from 'react-router';
import { BarChart3, Settings } from 'lucide-react';
import { Logo } from './Logo';
import { GlobalSearch } from './GlobalSearch';
import { OfflineBadge } from '@/components/pwa/OfflineBadge';

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 pt-safe backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-4 md:gap-3 md:px-6">
        <div className="md:hidden">
          <Logo compact />
        </div>
        <GlobalSearch />
        <OfflineBadge />
        <Link to="/reports" aria-label="Reports" className="grid h-11 w-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-elevated hover:text-fg md:hidden">
          <BarChart3 className="h-5 w-5" />
        </Link>
        <Link to="/settings" aria-label="Settings" className="grid h-11 w-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-elevated hover:text-fg md:hidden">
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
