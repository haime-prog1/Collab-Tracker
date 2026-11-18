import type { Brand, Collab, Contact, PaymentStatus } from '@/types/models';
import { COMPENSATION_TYPES } from './constants';
import { toISODate } from './format';

export type CalEventKind = 'deliverable' | 'deadline' | 'payment_due' | 'payment_paid' | 'published';
export type CalEventStatus = 'done' | 'pending' | 'overdue';

export interface CalEvent {
  id: string;
  date: string; // yyyy-MM-dd
  kind: CalEventKind;
  collabId: string;
  /** What is happening, e.g. "Instagram Reel" or "Flat fee". */
  title: string;
  collabTitle: string;
  brandName: string;
  brandId?: string;
  contact?: Contact;
  amount?: number;
  currency?: string;
  paymentStatus?: PaymentStatus;
  /** For payment events: the compensation item id (lets the UI mark it paid). */
  itemId?: string;
  status: CalEventStatus;
}

export const EVENT_GROUP: Record<CalEventKind, 'work' | 'money' | 'published'> = {
  deliverable: 'work',
  deadline: 'work',
  payment_due: 'money',
  payment_paid: 'money',
  published: 'published',
};

/** `yyyy-MM-dd` of an ISO date or datetime string (datetimes are converted to the local day). */
const day = (s: string) => (s.length === 10 ? s : toISODate(new Date(s)));

/**
 * Flattens every dated thing in the data into calendar events:
 * deliverable due dates, collab deadlines, payment due dates (unpaid / invoiced),
 * payments received, and publish dates — each with the brand and its primary contact.
 */
export function buildEvents(collabs: Collab[], brands: Brand[], today = toISODate(new Date())): CalEvent[] {
  const brandById = new Map(brands.map((b) => [b.id, b]));
  const out: CalEvent[] = [];
  for (const c of collabs) {
    const brand = c.brandId ? brandById.get(c.brandId) : undefined;
    const base = {
      collabId: c.id,
      collabTitle: c.title,
      brandName: brand?.name ?? c.partnerName,
      brandId: brand?.id,
      contact: brand?.contacts[0],
    };
    const closed = c.stage === 'published' || c.stage === 'archived';
    const status = (done: boolean, date: string): CalEventStatus => (done ? 'done' : date < today ? 'overdue' : 'pending');

    for (const d of c.deliverables) {
      if (!d.dueDate) continue;
      out.push({ ...base, id: `d:${d.id}`, date: d.dueDate, kind: 'deliverable', title: d.title || 'Deliverable', status: status(d.done, d.dueDate) });
    }
    if (c.deadline && !c.deliverables.some((d) => d.dueDate === c.deadline)) {
      out.push({ ...base, id: `dl:${c.id}`, date: c.deadline, kind: 'deadline', title: 'Final deadline', status: status(closed, c.deadline) });
    }
    for (const i of c.compensation) {
      const pay = { amount: i.amount, currency: i.currency, paymentStatus: i.status, itemId: i.id, title: i.label || COMPENSATION_TYPES[i.type] };
      if (i.status === 'paid') {
        if (i.paidAt) out.push({ ...base, ...pay, id: `pp:${i.id}`, date: day(i.paidAt), kind: 'payment_paid', status: 'done' });
      } else if (i.dueDate) {
        out.push({ ...base, ...pay, id: `pd:${i.id}`, date: i.dueDate, kind: 'payment_due', status: status(false, i.dueDate) });
      }
    }
    if (c.publishedAt) {
      out.push({ ...base, id: `pub:${c.id}`, date: day(c.publishedAt), kind: 'published', title: 'Went live', status: 'done' });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}

export function groupByDate(events: CalEvent[]): Map<string, CalEvent[]> {
  const m = new Map<string, CalEvent[]>();
  for (const e of events) {
    const list = m.get(e.date);
    if (list) list.push(e);
    else m.set(e.date, [e]);
  }
  return m;
}

export interface MonthProgress {
  deliverables: { done: number; total: number; overdue: number };
  payments: { paidCount: number; total: number; paidAmount: number; totalAmount: number; overdue: number };
}

/** Progress for events in [start, end] (inclusive yyyy-MM-dd), money counted in `currency`. */
export function progressFor(events: CalEvent[], start: string, end: string, currency: string): MonthProgress {
  const p: MonthProgress = {
    deliverables: { done: 0, total: 0, overdue: 0 },
    payments: { paidCount: 0, total: 0, paidAmount: 0, totalAmount: 0, overdue: 0 },
  };
  for (const e of events) {
    if (e.date < start || e.date > end) continue;
    if (e.kind === 'deliverable' || e.kind === 'deadline') {
      p.deliverables.total++;
      if (e.status === 'done') p.deliverables.done++;
      if (e.status === 'overdue') p.deliverables.overdue++;
    } else if (e.kind === 'payment_due' || e.kind === 'payment_paid') {
      p.payments.total++;
      const amt = e.currency === currency ? (e.amount ?? 0) : 0;
      p.payments.totalAmount += amt;
      if (e.kind === 'payment_paid') {
        p.payments.paidCount++;
        p.payments.paidAmount += amt;
      }
      if (e.status === 'overdue') p.payments.overdue++;
    }
  }
  return p;
}
