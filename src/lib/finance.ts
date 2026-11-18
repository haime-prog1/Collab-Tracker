import { endOfMonth, endOfQuarter, startOfMonth, startOfQuarter } from 'date-fns';
import type { Collab, CompensationItem, StageId } from '@/types/models';
import { parseDate } from './format';

export type Period = 'month' | 'quarter';

/** Stages where money is committed (a signed deal). Earlier stages are "potential". */
export const COMMITTED_STAGES: StageId[] = ['confirmed', 'production', 'approval', 'published', 'archived'];
export const POTENTIAL_STAGES: StageId[] = ['inbox', 'negotiating'];

export interface MoneyBucket {
  [currency: string]: number;
}

export interface EarningsSummary {
  period: Period;
  range: { start: Date; end: Date };
  earned: MoneyBucket; // paid within the period
  pending: MoneyBucket; // unpaid + invoiced on committed deals (all time)
  invoiced: MoneyBucket;
  unpaid: MoneyBucket;
  potential: MoneyBucket; // value of deals still in inbox / negotiating
  lifetimeEarned: MoneyBucket;
  perksValue: number; // estimated value of received perks in the period (display currency)
  overdueInvoices: number;
}

const add = (b: MoneyBucket, cur: string, amt: number) => {
  if (!Number.isFinite(amt) || amt === 0) return;
  b[cur] = (b[cur] ?? 0) + amt;
};

export function periodRange(period: Period, now = new Date()) {
  return period === 'month'
    ? { start: startOfMonth(now), end: endOfMonth(now) }
    : { start: startOfQuarter(now), end: endOfQuarter(now) };
}

const within = (d: Date | undefined, r: { start: Date; end: Date }) => !!d && d >= r.start && d <= r.end;

export function summarize(collabs: Collab[], period: Period, now = new Date()): EarningsSummary {
  const range = periodRange(period, now);
  const s: EarningsSummary = {
    period,
    range,
    earned: {},
    pending: {},
    invoiced: {},
    unpaid: {},
    potential: {},
    lifetimeEarned: {},
    perksValue: 0,
    overdueInvoices: 0,
  };
  for (const c of collabs) {
    const committed = COMMITTED_STAGES.includes(c.stage);
    for (const item of c.compensation) {
      const cur = item.currency || 'PHP';
      if (item.status === 'paid') {
        add(s.lifetimeEarned, cur, item.amount);
        if (within(parseDate(item.paidAt) ?? parseDate(c.updatedAt), range)) add(s.earned, cur, item.amount);
      } else if (committed) {
        add(s.pending, cur, item.amount);
        add(item.status === 'invoiced' ? s.invoiced : s.unpaid, cur, item.amount);
        const due = parseDate(item.dueDate);
        if (item.status === 'invoiced' && due && due < now) s.overdueInvoices++;
      } else {
        add(s.potential, cur, item.amount);
      }
    }
    for (const p of c.perks) {
      if (p.received && p.estimatedValue && within(parseDate(p.receivedAt) ?? parseDate(c.updatedAt), range)) {
        s.perksValue += p.estimatedValue;
      }
    }
  }
  return s;
}

/** Sum of a collab's monetary compensation in a given currency (other currencies ignored). */
export function collabTotal(c: Collab, currency: string): number {
  return c.compensation.reduce((sum, i) => (i.currency === currency ? sum + i.amount : sum), 0);
}

/** Overall payment status for a collab: paid only if every item is paid. */
export function collabPaymentStatus(c: Collab): CompensationItem['status'] | 'none' {
  if (c.compensation.length === 0) return 'none';
  if (c.compensation.every((i) => i.status === 'paid')) return 'paid';
  if (c.compensation.some((i) => i.status === 'invoiced' || i.status === 'paid')) return 'invoiced';
  return 'unpaid';
}

export const bucketPrimary = (b: MoneyBucket, currency: string) => b[currency] ?? 0;
export const bucketOthers = (b: MoneyBucket, currency: string) =>
  Object.entries(b).filter(([c, v]) => c !== currency && v !== 0);
