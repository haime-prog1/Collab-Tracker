import { describe, expect, it } from 'vitest';
import { newBrand, newCollab } from '@/db/factories';
import { buildEvents, progressFor } from '@/lib/calendar';
import { buildReport, csvCell, ledgerCSV } from '@/lib/report';
import { globalSearch } from '@/lib/globalSearch';
import type { CompensationItem } from '@/types/models';

const pay = (amount: number, status: CompensationItem['status'], extra: Partial<CompensationItem> = {}): CompensationItem => ({
  id: Math.random().toString(36).slice(2), type: 'flat_fee', amount, currency: 'USD', status, ...extra,
});

const brand = newBrand({ name: 'Nova Audio', contacts: [{ id: 'p1', name: 'Priya Shah', email: 'priya@example.com', role: 'Partnerships' }] });
const live = newCollab({
  title: 'Launch video', brandId: brand.id, partnerName: brand.name, stage: 'published', platforms: ['youtube'],
  createdAt: '2026-05-01T10:00:00.000Z', publishedAt: '2026-05-10T10:00:00.000Z',
  deliverables: [{ id: 'd1', title: 'Script', dueDate: '2026-05-03', done: true }, { id: 'd2', title: 'Reel', dueDate: '2026-05-20', done: false }],
  compensation: [pay(1000, 'paid', { paidAt: '2026-05-15' }), pay(400, 'invoiced', { dueDate: '2026-05-12' })],
});
const pitch = newCollab({ title: 'Pitch', partnerName: 'Brewline', stage: 'inbox', platforms: ['tiktok'], createdAt: '2026-04-01T00:00:00.000Z', compensation: [pay(900, 'unpaid', { dueDate: '2026-05-30' })] });

describe('calendar events', () => {
  const events = buildEvents([live, pitch], [brand], '2026-05-18');

  it('includes deliverables, payments due/paid and publish date with brand + contact', () => {
    const kinds = events.map((e) => `${e.date}:${e.kind}:${e.status}`);
    expect(kinds).toEqual(expect.arrayContaining([
      '2026-05-03:deliverable:done',
      '2026-05-20:deliverable:pending',
      '2026-05-15:payment_paid:done',
      '2026-05-12:payment_due:overdue',
      '2026-05-30:payment_due:pending',
    ]));
    const paid = events.find((e) => e.kind === 'payment_paid')!;
    expect(paid.brandName).toBe('Nova Audio');
    expect(paid.contact?.name).toBe('Priya Shah');
    expect(events.find((e) => e.collabId === pitch.id)!.contact).toBeUndefined();
  });

  it('computes month progress', () => {
    const p = progressFor(events, '2026-05-01', '2026-05-31', 'USD');
    expect(p.deliverables).toEqual({ done: 1, total: 2, overdue: 0 });
    expect(p.payments).toMatchObject({ paidCount: 1, total: 3, paidAmount: 1000, totalAmount: 2300, overdue: 1 });
  });
});

describe('report', () => {
  const r = buildReport([live, pitch], [brand], { start: '2026-05-01', end: '2026-05-31', currency: 'USD' }, new Date('2026-05-18T12:00:00'));

  it('totals the period and outstanding money', () => {
    expect(r.totals.earned).toBe(1000);
    expect(r.totals.outstanding).toBe(400); // inbox deal isn't committed yet
    expect(r.totals.overdueCount).toBe(1);
    expect(r.totals.dealsPublished).toBe(1);
    expect(r.totals.deliverablesTotal).toBe(2);
    expect(r.monthly.at(-1)).toMatchObject({ key: '2026-05', earned: 1000 });
    expect(r.monthly).toHaveLength(6);
  });

  it('breaks down by brand with the contact person', () => {
    expect(r.byBrand[0]).toMatchObject({ brandName: 'Nova Audio', earned: 1000, outstanding: 400 });
    expect(r.byBrand[0].contact?.name).toBe('Priya Shah');
  });

  it('filters by brand and platform', () => {
    const tiktok = buildReport([live, pitch], [brand], { start: '2026-05-01', end: '2026-05-31', currency: 'USD', platform: 'tiktok' });
    expect(tiktok.totals.earned).toBe(0);
    expect(tiktok.ledger.map((l) => l.brandName)).toEqual(['Brewline']);
  });

  it('exports a CSV ledger', () => {
    const csv = ledgerCSV(r);
    expect(csv.split('\r\n')[0]).toContain('Date,Brand,Contact');
    expect(csv).toContain('Priya Shah');
  });
});

describe('csvCell', () => {
  it('quotes and neutralises formula injection', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell(-5)).toBe('-5');
  });
});

describe('globalSearch', () => {
  it('finds collabs, brands and contact people', () => {
    const r = globalSearch('priya', [live, pitch], [brand]);
    expect(r.contacts.map((c) => c.contact.name)).toEqual(['Priya Shah']);
    expect(globalSearch('nova', [live, pitch], [brand]).brands).toHaveLength(1);
    expect(globalSearch('tiktok', [live, pitch], [brand]).collabs.map((c) => c.title)).toEqual(['Pitch']);
    expect(globalSearch('', [live], [brand]).totalCollabs).toBe(0);
  });
});
