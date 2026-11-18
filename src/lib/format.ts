import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';

const fmtCache = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency = 'USD', compact = false): string {
  const key = `${currency}-${compact}`;
  let f = fmtCache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: compact ? 1 : 2,
        minimumFractionDigits: 0,
        notation: compact ? 'compact' : 'standard',
      });
    } catch {
      f = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    }
    fmtCache.set(key, f);
  }
  return f.format(amount);
}

export function parseDate(d?: string): Date | undefined {
  if (!d) return undefined;
  const p = parseISO(d);
  return isValid(p) ? p : undefined;
}

export function formatDate(d?: string, pattern = 'MMM d, yyyy'): string {
  const p = parseDate(d);
  return p ? format(p, pattern) : '—';
}

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export type DueTone = 'overdue' | 'soon' | 'later' | 'none';

export function dueInfo(d?: string, now = new Date()): { label: string; tone: DueTone; days?: number } {
  const p = parseDate(d);
  if (!p) return { label: 'No deadline', tone: 'none' };
  const days = differenceInCalendarDays(p, now);
  if (days < 0) return { label: `${-days}d overdue`, tone: 'overdue', days };
  if (days === 0) return { label: 'Due today', tone: 'soon', days };
  if (days === 1) return { label: 'Due tomorrow', tone: 'soon', days };
  if (days <= 7) return { label: `Due in ${days}d`, tone: 'soon', days };
  return { label: format(p, 'MMM d'), tone: 'later', days };
}

export const DUE_TONE_CLASS: Record<DueTone, string> = {
  overdue: 'text-rose-400',
  soon: 'text-amber-300',
  later: 'text-zinc-400',
  none: 'text-zinc-500',
};
