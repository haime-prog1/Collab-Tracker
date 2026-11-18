import { BadgeCheck, CheckSquare, Flag, Rocket, Wallet, type LucideIcon } from 'lucide-react';
import type { CalEvent, CalEventKind } from '@/lib/calendar';

export const KIND_META: Record<CalEventKind, { label: string; icon: LucideIcon; dot: string; chip: string; text: string }> = {
  deliverable: { label: 'Deliverable due', icon: CheckSquare, dot: 'bg-violet-400', chip: 'bg-violet-500/15 text-violet-600 dark:text-violet-300', text: 'text-violet-500 dark:text-violet-400' },
  deadline: { label: 'Collab deadline', icon: Flag, dot: 'bg-sky-400', chip: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', text: 'text-sky-600 dark:text-sky-400' },
  payment_due: { label: 'Payment due', icon: Wallet, dot: 'bg-amber-400', chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', text: 'text-amber-600 dark:text-amber-400' },
  payment_paid: { label: 'Payment received', icon: BadgeCheck, dot: 'bg-emerald-400', chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', text: 'text-emerald-600 dark:text-emerald-400' },
  published: { label: 'Published', icon: Rocket, dot: 'bg-fuchsia-400', chip: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300', text: 'text-fuchsia-600 dark:text-fuchsia-400' },
};

/** Human status label + classes; status is always spelled out, never colour alone. */
export function statusBadge(e: CalEvent): { label: string; className: string } {
  if (e.status === 'overdue') return { label: 'Overdue', className: 'bg-rose-500/15 text-rose-600 ring-rose-500/30 dark:text-rose-400' };
  switch (e.kind) {
    case 'payment_paid':
      return { label: 'Paid', className: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400' };
    case 'payment_due':
      return e.paymentStatus === 'invoiced'
        ? { label: 'Invoiced', className: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300' }
        : { label: 'Unpaid', className: 'bg-zinc-500/15 text-muted ring-line' };
    case 'published':
      return { label: 'Live', className: 'bg-fuchsia-500/15 text-fuchsia-700 ring-fuchsia-500/30 dark:text-fuchsia-300' };
    default:
      return e.status === 'done'
        ? { label: 'Done', className: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400' }
        : { label: 'To do', className: 'bg-elevated text-muted ring-line' };
  }
}
