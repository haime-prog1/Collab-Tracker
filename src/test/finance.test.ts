import { describe, expect, it } from 'vitest';
import { newCollab } from '@/db/factories';
import { collabPaymentStatus, summarize } from '@/lib/finance';
import type { CompensationItem } from '@/types/models';

const item = (amount: number, status: CompensationItem['status'], extra: Partial<CompensationItem> = {}): CompensationItem => ({
  id: Math.random().toString(),
  type: 'flat_fee',
  amount,
  currency: 'USD',
  status,
  ...extra,
});

const NOW = new Date('2026-05-15T12:00:00Z');

describe('summarize', () => {
  const collabs = [
    newCollab({ stage: 'published', compensation: [item(1000, 'paid', { paidAt: '2026-05-02' })] }),
    newCollab({ stage: 'archived', compensation: [item(500, 'paid', { paidAt: '2026-04-10' })] }), // same quarter, prior month
    newCollab({ stage: 'archived', compensation: [item(700, 'paid', { paidAt: '2026-01-10' })] }), // prior quarter
    newCollab({ stage: 'production', compensation: [item(2000, 'unpaid'), item(300, 'invoiced', { dueDate: '2026-05-01' })] }),
    newCollab({ stage: 'negotiating', compensation: [item(900, 'unpaid')] }),
    newCollab({ stage: 'confirmed', compensation: [item(100, 'unpaid', { currency: 'EUR' })] }),
  ];

  it('counts earned within the month', () => {
    const s = summarize(collabs, 'month', NOW);
    expect(s.earned).toEqual({ USD: 1000 });
  });

  it('counts earned within the quarter', () => {
    expect(summarize(collabs, 'quarter', NOW).earned).toEqual({ USD: 1500 });
  });

  it('only committed deals count as pending; earlier stages are potential', () => {
    const s = summarize(collabs, 'month', NOW);
    expect(s.pending).toEqual({ USD: 2300, EUR: 100 });
    expect(s.invoiced).toEqual({ USD: 300 });
    expect(s.potential).toEqual({ USD: 900 });
    expect(s.lifetimeEarned).toEqual({ USD: 2200 });
  });

  it('flags overdue invoices', () => {
    expect(summarize(collabs, 'month', NOW).overdueInvoices).toBe(1);
  });
});

describe('collabPaymentStatus', () => {
  it('derives an overall status', () => {
    expect(collabPaymentStatus(newCollab())).toBe('none');
    expect(collabPaymentStatus(newCollab({ compensation: [item(1, 'unpaid')] }))).toBe('unpaid');
    expect(collabPaymentStatus(newCollab({ compensation: [item(1, 'paid'), item(1, 'unpaid')] }))).toBe('invoiced');
    expect(collabPaymentStatus(newCollab({ compensation: [item(1, 'paid')] }))).toBe('paid');
  });
});
