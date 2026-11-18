import { Mail, UserRound } from 'lucide-react';
import type { CalEvent } from '@/lib/calendar';
import { formatMoney } from '@/lib/format';
import { setPaymentStatus } from '@/db/actions';
import { ui } from '@/state/ui';
import { toast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { KIND_META, statusBadge } from './eventStyle';

/** One agenda line: what, which brand, who to contact, how much, and its status. */
export function EventRow({ event: e, showDate }: { event: CalEvent; showDate?: boolean }) {
  const meta = KIND_META[e.kind];
  const Icon = meta.icon;
  const badge = statusBadge(e);
  return (
    <div className="flex items-start gap-3 py-3">
      <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', meta.chip)}>
        <Icon className="h-5 w-5" />
      </div>
      <button type="button" onClick={() => ui.openEditor(e.collabId)} className="min-w-0 flex-1 text-left">
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
          <span className="truncate">{e.brandName || 'Unnamed partner'}</span>
          <span className={cn('text-xs font-medium', meta.text)}>{meta.label}</span>
        </p>
        <p className="truncate text-sm text-muted">
          {e.title}
          {e.title !== e.collabTitle && <span className="text-subtle"> · {e.collabTitle}</span>}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-subtle">
          {showDate && <span>{new Date(e.date + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
          {e.contact ? (
            <span className="inline-flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5" /> {e.contact.name}
              {e.contact.role && <span className="hidden sm:inline">({e.contact.role})</span>}
            </span>
          ) : (
            <span className="italic">No contact saved</span>
          )}
        </p>
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {e.amount !== undefined && (
          <span className={cn('text-sm font-semibold tabular-nums', e.kind === 'payment_paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-fg')}>
            {formatMoney(e.amount, e.currency)}
          </span>
        )}
        <Badge className={badge.className}>{badge.label}</Badge>
        <div className="flex gap-1 print:hidden">
          {e.contact?.email && (
            <a
              href={`mailto:${e.contact.email}`}
              aria-label={`Email ${e.contact.name}`}
              className="grid h-9 w-9 place-items-center rounded-lg text-subtle ring-1 ring-line hover:text-fg"
            >
              <Mail className="h-4 w-4" />
            </a>
          )}
          {e.kind === 'payment_due' && e.itemId && (
            <button
              type="button"
              onClick={async () => {
                await setPaymentStatus(e.collabId, e.itemId!, 'paid');
                toast(`💸 ${formatMoney(e.amount ?? 0, e.currency)} from ${e.brandName} marked paid`, { tone: 'success' });
              }}
              className="h-9 rounded-lg bg-emerald-500/15 px-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/25 active:scale-95 dark:text-emerald-400"
            >
              Mark paid
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
