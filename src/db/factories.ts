import type { Brand, Collab, Settings } from '@/types/models';
import { nowISO, uid } from '@/lib/id';

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  currency: 'PHP',
  theme: 'dark',
  view: 'kanban',
  stageOverrides: {},
  onboarded: false,
  updatedAt: new Date(0).toISOString(),
};

export function newCollab(partial: Partial<Collab> = {}): Collab {
  const now = nowISO();
  const stage = partial.stage ?? 'inbox';
  return {
    id: uid(),
    title: '',
    kind: 'sponsorship',
    partnerName: '',
    platforms: [],
    stage,
    stageOrder: Date.now(),
    priority: 'medium',
    deliverables: [],
    compensation: [],
    perks: [],
    tags: [],
    stageHistory: [{ stage, at: now }],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function newBrand(partial: Partial<Brand> = {}): Brand {
  const now = nowISO();
  return {
    id: uid(),
    name: '',
    kind: 'brand',
    contacts: [],
    socials: {},
    nicheTags: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}
