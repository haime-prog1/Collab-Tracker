import type { Collab, Platform, Priority, PaymentStatus, StageId } from '@/types/models';
import { PLATFORMS, STAGE_BY_ID } from './constants';
import { collabPaymentStatus } from './finance';

export interface CollabFilters {
  query: string;
  platforms: Platform[];
  stages: StageId[];
  priorities: Priority[];
  payment: PaymentStatus[];
}

export const EMPTY_FILTERS: CollabFilters = { query: '', platforms: [], stages: [], priorities: [], payment: [] };

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Text that a collab is searchable by: partner, title, platforms, stage, tags, deliverables. */
export function haystack(c: Collab, stageLabels?: Partial<Record<StageId, string>>): string {
  return normalize(
    [
      c.partnerName,
      c.title,
      ...c.platforms.map((p) => PLATFORMS[p].label),
      stageLabels?.[c.stage] ?? STAGE_BY_ID[c.stage].label,
      c.stage,
      ...c.tags,
      ...c.deliverables.map((d) => d.title),
    ].join(' '),
  );
}

export function matchesQuery(c: Collab, query: string, stageLabels?: Partial<Record<StageId, string>>): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const h = haystack(c, stageLabels);
  return terms.every((t) => h.includes(t));
}

export function filterCollabs(
  collabs: Collab[],
  f: CollabFilters,
  stageLabels?: Partial<Record<StageId, string>>,
): Collab[] {
  return collabs.filter((c) => {
    if (f.stages.length && !f.stages.includes(c.stage)) return false;
    if (f.platforms.length && !c.platforms.some((p) => f.platforms.includes(p))) return false;
    if (f.priorities.length && !f.priorities.includes(c.priority)) return false;
    if (f.payment.length) {
      const ps = collabPaymentStatus(c);
      if (ps === 'none' || !f.payment.includes(ps)) return false;
    }
    return matchesQuery(c, f.query, stageLabels);
  });
}

export const activeFilterCount = (f: CollabFilters) =>
  f.platforms.length + f.stages.length + f.priorities.length + f.payment.length;
