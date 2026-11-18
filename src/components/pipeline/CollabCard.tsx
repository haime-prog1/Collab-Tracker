import { forwardRef, type HTMLAttributes } from 'react';
import { CalendarClock, CheckSquare, Flag, Gift } from 'lucide-react';
import type { Collab } from '@/types/models';
import { PLATFORMS, PRIORITIES, PAYMENT_STATUSES, COLLAB_KINDS } from '@/lib/constants';
import { DUE_TONE_CLASS, dueInfo, formatMoney } from '@/lib/format';
import { collabPaymentStatus, collabTotal } from '@/lib/finance';
import { useSettings, useStages } from '@/hooks/useStore';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { StageMover } from './StageMover';

interface Props extends HTMLAttributes<HTMLDivElement> {
  collab: Collab;
  showStage?: boolean;
  dragging?: boolean;
  overlay?: boolean;
}

export const CollabCard = forwardRef<HTMLDivElement, Props>(function CollabCard(
  { collab: c, showStage, dragging, overlay, className, ...rest },
  ref,
) {
  const { currency } = useSettings();
  const { labels, all } = useStages();
  const total = collabTotal(c, currency);
  const due = dueInfo(c.deadline);
  const done = c.deliverables.filter((d) => d.done).length;
  const pay = collabPaymentStatus(c);
  const stageMeta = all.find((s) => s.id === c.stage)!;
  const closed = c.stage === 'published' || c.stage === 'archived';

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={`${c.partnerName || 'Unnamed partner'}: ${c.title || 'Untitled collab'} — ${labels[c.stage]}`}
      className={cn(
        'group relative cursor-pointer select-none rounded-2xl bg-surface p-3.5 ring-1 ring-line transition',
        'hover:ring-neon/40 hover:shadow-lg hover:shadow-violet-900/10 focus-visible:ring-2 focus-visible:ring-neon',
        dragging && 'opacity-40',
        overlay && 'rotate-2 scale-105 shadow-2xl shadow-violet-900/40 ring-2 ring-neon',
        c.stage === 'published' && 'ring-emerald-500/30',
        className,
      )}
      {...rest}
    >
      {(c.priority === 'urgent' || c.priority === 'high') && (
        <span
          className={cn('absolute inset-y-3 left-0 w-1 rounded-r-full', c.priority === 'urgent' ? 'bg-rose-500' : 'bg-amber-400')}
          aria-hidden
        />
      )}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted">
            {c.partnerName || 'Unnamed partner'} · {COLLAB_KINDS[c.kind]}
          </p>
          <h3 className="mt-0.5 line-clamp-2 font-semibold leading-snug">{c.title || 'Untitled collab'}</h3>
        </div>
        {c.priority !== 'medium' && c.priority !== 'low' && (
          <Flag className={cn('mt-0.5 h-4 w-4 shrink-0 fill-current', PRIORITIES[c.priority].color)} aria-label={`${PRIORITIES[c.priority].label} priority`} />
        )}
      </div>

      {(c.platforms.length > 0 || showStage) && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {showStage && (
            <Badge className={cn('bg-elevated ring-line', stageMeta.text)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', stageMeta.dot)} />
              {labels[c.stage]}
            </Badge>
          )}
          {c.platforms.map((p) => (
            <Badge key={p} className={PLATFORMS[p].color}>
              {PLATFORMS[p].label}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {total > 0 && <span className="font-semibold text-emerald-400">{formatMoney(total, currency)}</span>}
        {pay !== 'none' && (closed || pay !== 'unpaid') && (
          <Badge className={PAYMENT_STATUSES[pay].color}>{PAYMENT_STATUSES[pay].label}</Badge>
        )}
        {c.perks.length > 0 && (
          <span className="inline-flex items-center gap-1 text-fuchsia-400" title="Perks / gifted products">
            <Gift className="h-3.5 w-3.5" />
            {c.perks.length}
          </span>
        )}
        {c.deliverables.length > 0 && (
          <span className={cn('inline-flex items-center gap-1', done === c.deliverables.length ? 'text-emerald-400' : 'text-muted')}>
            <CheckSquare className="h-3.5 w-3.5" />
            {done}/{c.deliverables.length}
          </span>
        )}
        {c.deadline && !closed && (
          <span className={cn('inline-flex items-center gap-1', DUE_TONE_CLASS[due.tone])}>
            <CalendarClock className="h-3.5 w-3.5" />
            {due.label}
          </span>
        )}
      </div>

      {c.deliverables.length > 0 && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-elevated" aria-hidden>
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${(done / c.deliverables.length) * 100}%` }}
          />
        </div>
      )}

      {!overlay && <StageMover collab={c} className="mt-3 justify-end" />}
    </div>
  );
});
