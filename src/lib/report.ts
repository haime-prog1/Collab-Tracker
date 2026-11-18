import {
  eachMonthOfInterval,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
} from 'date-fns';
import type { Brand, Collab, Contact, PaymentStatus, Platform, StageId } from '@/types/models';
import { PLATFORM_IDS, STAGE_IDS } from '@/types/models';
import { COMMITTED_STAGES } from './finance';
import { COMPENSATION_TYPES, PLATFORMS } from './constants';
import { parseDate, toISODate } from './format';

export type PresetId = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'last_12' | 'all' | 'custom';

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'this_quarter', label: 'This quarter' },
  { id: 'this_year', label: 'This year' },
  { id: 'last_12', label: 'Last 12 months' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];

export function presetRange(id: Exclude<PresetId, 'custom'>, now = new Date(), earliest?: string) {
  const r = (s: Date, e: Date) => ({ start: toISODate(s), end: toISODate(e) });
  switch (id) {
    case 'this_month':
      return r(startOfMonth(now), endOfMonth(now));
    case 'last_month': {
      const m = subMonths(now, 1);
      return r(startOfMonth(m), endOfMonth(m));
    }
    case 'this_quarter':
      return r(startOfQuarter(now), endOfQuarter(now));
    case 'this_year':
      return r(startOfYear(now), endOfYear(now));
    case 'last_12':
      return r(startOfMonth(subMonths(now, 11)), endOfMonth(now));
    case 'all':
      return { start: earliest ?? toISODate(startOfYear(now)), end: toISODate(endOfMonth(now)) };
  }
}

export interface ReportOptions {
  start: string; // yyyy-MM-dd inclusive
  end: string;
  currency: string;
  brandId?: string;
  platform?: Platform;
}

export interface LedgerRow {
  date: string;
  brandName: string;
  contactName: string;
  contactEmail: string;
  collabTitle: string;
  type: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  dueDate: string;
  paidAt: string;
  overdue: boolean;
}

export interface Report {
  options: ReportOptions;
  generatedAt: string;
  totals: {
    earned: number;
    outstanding: number;
    overdue: number;
    overdueCount: number;
    perksValue: number;
    dealsNew: number;
    dealsPublished: number;
    dealsPaid: number;
    avgDeal: number;
    deliverablesDone: number;
    deliverablesTotal: number;
  };
  otherCurrencyEarned: [string, number][];
  monthly: { key: string; label: string; earned: number }[];
  byBrand: { brandId?: string; brandName: string; contact?: Contact; deals: number; earned: number; outstanding: number }[];
  byPlatform: { platform: Platform; label: string; deals: number; earned: number }[];
  byStage: { stage: StageId; count: number }[];
  ledger: LedgerRow[];
}

const inRange = (d: string | undefined, o: ReportOptions) => !!d && d.slice(0, 10) >= o.start && d.slice(0, 10) <= o.end;
const localDay = (s?: string) => (!s ? undefined : s.length === 10 ? s : toISODate(new Date(s)));

/** Earliest date anywhere in the data — the start of "All time". */
export function earliestDate(collabs: Collab[]): string | undefined {
  let min: string | undefined;
  for (const c of collabs) {
    const d = localDay(c.createdAt);
    if (d && (!min || d < min)) min = d;
    for (const i of c.compensation) if (i.paidAt && i.paidAt < (min ?? '9')) min = i.paidAt;
  }
  return min && toISODate(startOfMonth(parseDate(min)!));
}

export function buildReport(collabs: Collab[], brands: Brand[], o: ReportOptions, now = new Date()): Report {
  const today = toISODate(now);
  const brandById = new Map(brands.map((b) => [b.id, b]));
  const scope = collabs.filter((c) => (!o.brandId || c.brandId === o.brandId) && (!o.platform || c.platforms.includes(o.platform)));

  const totals: Report['totals'] = {
    earned: 0, outstanding: 0, overdue: 0, overdueCount: 0, perksValue: 0, dealsNew: 0, dealsPublished: 0,
    dealsPaid: 0, avgDeal: 0, deliverablesDone: 0, deliverablesTotal: 0,
  };
  const other = new Map<string, number>();
  const monthly = new Map<string, number>();
  const brandRows = new Map<string, Report['byBrand'][number]>();
  const platformRows = new Map<Platform, { deals: number; earned: number }>();
  const ledger: LedgerRow[] = [];

  for (const c of scope) {
    const brand = c.brandId ? brandById.get(c.brandId) : undefined;
    const brandKey = brand?.id ?? `name:${c.partnerName.toLowerCase()}`;
    const row = brandRows.get(brandKey) ?? { brandId: brand?.id, brandName: brand?.name ?? (c.partnerName || 'Unnamed partner'), contact: brand?.contacts[0], deals: 0, earned: 0, outstanding: 0 };
    let touched = false;
    let earnedHere = 0;

    if (inRange(localDay(c.createdAt), o)) {
      totals.dealsNew++;
      touched = true;
    }
    if (inRange(localDay(c.publishedAt), o)) {
      totals.dealsPublished++;
      touched = true;
    }

    for (const d of c.deliverables) {
      if (inRange(d.dueDate, o)) {
        totals.deliverablesTotal++;
        if (d.done) totals.deliverablesDone++;
      }
    }

    for (const i of c.compensation) {
      const paidDay = localDay(i.paidAt);
      const isPrimary = i.currency === o.currency;
      if (i.status === 'paid' && inRange(paidDay, o)) {
        touched = true;
        if (isPrimary) {
          totals.earned += i.amount;
          earnedHere += i.amount;
          const key = paidDay!.slice(0, 7);
          monthly.set(key, (monthly.get(key) ?? 0) + i.amount);
        } else other.set(i.currency, (other.get(i.currency) ?? 0) + i.amount);
      }
      const outstanding = i.status !== 'paid' && COMMITTED_STAGES.includes(c.stage);
      const overdue = outstanding && !!i.dueDate && i.dueDate < today;
      if (outstanding && isPrimary) {
        totals.outstanding += i.amount;
        row.outstanding += i.amount;
        if (overdue) totals.overdue += i.amount;
      }
      if (overdue) totals.overdueCount++;
      if ((i.status === 'paid' && inRange(paidDay, o)) || (i.status !== 'paid' && inRange(i.dueDate, o))) {
        ledger.push({
          date: (i.status === 'paid' ? paidDay : i.dueDate) ?? '',
          brandName: row.brandName,
          contactName: row.contact?.name ?? '',
          contactEmail: row.contact?.email ?? '',
          collabTitle: c.title,
          type: i.label || COMPENSATION_TYPES[i.type],
          amount: i.amount,
          currency: i.currency,
          status: i.status,
          dueDate: i.dueDate ?? '',
          paidAt: paidDay ?? '',
          overdue,
        });
      }
    }
    for (const p of c.perks) if (p.received && inRange(p.receivedAt, o)) totals.perksValue += p.estimatedValue ?? 0;

    if (earnedHere > 0) totals.dealsPaid++;
    if (touched || row.outstanding > 0) {
      row.deals++;
      row.earned += earnedHere;
      brandRows.set(brandKey, row);
      for (const p of c.platforms) {
        const pr = platformRows.get(p) ?? { deals: 0, earned: 0 };
        pr.deals++;
        pr.earned += earnedHere;
        platformRows.set(p, pr);
      }
    }
  }
  totals.avgDeal = totals.dealsPaid ? totals.earned / totals.dealsPaid : 0;

  // Monthly series covers the range (at least 6 months for context, at most 24).
  const end = parseDate(o.end)!;
  let start = parseDate(o.start)!;
  if (start > subMonths(end, 5)) start = subMonths(end, 5);
  if (start < subMonths(end, 23)) start = subMonths(end, 23);
  // Context months outside the range still show what was earned then.
  for (const c of scope)
    for (const i of c.compensation) {
      const d = localDay(i.paidAt);
      if (i.status === 'paid' && d && i.currency === o.currency && !inRange(d, o) && d >= toISODate(startOfMonth(start)) && d <= o.end) {
        monthly.set(d.slice(0, 7), (monthly.get(d.slice(0, 7)) ?? 0) + i.amount);
      }
    }
  const months = eachMonthOfInterval({ start: startOfMonth(start), end: startOfMonth(end) }).map((m) => {
    const key = format(m, 'yyyy-MM');
    return { key, label: format(m, 'MMM yy'), earned: monthly.get(key) ?? 0 };
  });

  const stageCounts = new Map<StageId, number>();
  for (const c of scope) stageCounts.set(c.stage, (stageCounts.get(c.stage) ?? 0) + 1);

  return {
    options: o,
    generatedAt: now.toISOString(),
    totals,
    otherCurrencyEarned: [...other.entries()],
    monthly: months,
    byBrand: [...brandRows.values()].sort((a, b) => b.earned - a.earned || b.outstanding - a.outstanding || a.brandName.localeCompare(b.brandName)),
    byPlatform: PLATFORM_IDS.filter((p) => platformRows.has(p)).map((p) => ({ platform: p, label: PLATFORMS[p].label, ...platformRows.get(p)! })).sort((a, b) => b.earned - a.earned || b.deals - a.deals),
    byStage: STAGE_IDS.map((s) => ({ stage: s, count: stageCounts.get(s) ?? 0 })),
    ledger: ledger.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/* ------------------------------------------------------------------ CSV */

/** Quote a CSV cell and neutralise spreadsheet formula injection (=, +, -, @ at the start). */
export function csvCell(v: string | number): string {
  let s = String(v ?? '');
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: (string | number)[][]): string {
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export function ledgerCSV(r: Report): string {
  return toCSV([
    ['Date', 'Brand', 'Contact', 'Contact email', 'Collab', 'Type', 'Amount', 'Currency', 'Status', 'Due date', 'Paid on', 'Overdue'],
    ...r.ledger.map((l) => [l.date, l.brandName, l.contactName, l.contactEmail, l.collabTitle, l.type, l.amount, l.currency, l.status, l.dueDate, l.paidAt, l.overdue ? 'yes' : '']),
  ]);
}

export function brandsCSV(r: Report): string {
  return toCSV([
    ['Brand', 'Contact', 'Contact email', 'Deals', `Earned (${r.options.currency})`, `Outstanding (${r.options.currency})`],
    ...r.byBrand.map((b) => [b.brandName, b.contact?.name ?? '', b.contact?.email ?? '', b.deals, b.earned, b.outstanding]),
  ]);
}

export function downloadText(name: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
