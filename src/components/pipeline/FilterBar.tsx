import type { ReactNode } from 'react';
import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { PLATFORMS, PRIORITIES, PAYMENT_STATUSES } from '@/lib/constants';
import { PLATFORM_IDS, PRIORITY_IDS, PAYMENT_STATUS_IDS } from '@/types/models';
import { activeFilterCount, type CollabFilters } from '@/lib/search';
import { ui, useUI } from '@/state/ui';
import { useStages } from '@/hooks/useStore';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { CountBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function FilterBar({ resultCount }: { resultCount: number }) {
  const filters = useUI((s) => s.filters);
  const { visible } = useStages();
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters);
  const set = (patch: Partial<CollabFilters>) => ui.setFilters(patch);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <SlidersHorizontal className="h-4 w-4" /> Filters <CountBadge count={count} />
        </Button>
        {/* Quick platform chips always visible */}
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-none">
          {PLATFORM_IDS.filter((p) => p !== 'other').map((p) => (
            <Chip key={p} active={filters.platforms.includes(p)} onClick={() => set({ platforms: toggle(filters.platforms, p) })}>
              {PLATFORMS[p].label}
            </Chip>
          ))}
        </div>
        {(count > 0 || filters.query) && (
          <span className="hidden shrink-0 text-xs text-muted sm:inline">
            {resultCount} result{resultCount === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <div className={cn('grid transition-all duration-300', open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="overflow-hidden">
          <div className="space-y-3 rounded-2xl bg-surface p-3 ring-1 ring-line">
            <Group label="Stage">
              {visible.map((s) => (
                <Chip key={s.id} active={filters.stages.includes(s.id)} onClick={() => set({ stages: toggle(filters.stages, s.id) })}>
                  <span className={cn('h-2 w-2 rounded-full', s.dot)} /> {s.short}
                </Chip>
              ))}
            </Group>
            <Group label="Priority">
              {PRIORITY_IDS.map((p) => (
                <Chip key={p} active={filters.priorities.includes(p)} onClick={() => set({ priorities: toggle(filters.priorities, p) })}>
                  {PRIORITIES[p].label}
                </Chip>
              ))}
            </Group>
            <Group label="Payment">
              {PAYMENT_STATUS_IDS.map((p) => (
                <Chip key={p} active={filters.payment.includes(p)} onClick={() => set({ payment: toggle(filters.payment, p) })}>
                  {PAYMENT_STATUSES[p].label}
                </Chip>
              ))}
            </Group>
            {count > 0 && (
              <Button size="sm" variant="ghost" onClick={ui.resetFilters}>
                <X className="h-4 w-4" /> Clear filters
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-subtle">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
