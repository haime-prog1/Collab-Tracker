import { useMemo, useSyncExternalStore } from 'react';
import { store, type Snapshot } from '@/db/store';
import { STAGES, type StageMeta } from '@/lib/constants';
import type { StageId } from '@/types/models';

export function useSnapshot(): Snapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export const useCollabs = () => useSnapshot().collabs;
export const useBrands = () => useSnapshot().brands;
export const useSettings = () => useSnapshot().settings;

export function useCollab(id?: string) {
  const collabs = useCollabs();
  return useMemo(() => collabs.find((c) => c.id === id), [collabs, id]);
}

export function useBrand(id?: string) {
  const brands = useBrands();
  return useMemo(() => brands.find((b) => b.id === id), [brands, id]);
}

/** Stage metadata with the user's custom labels / visibility applied. */
export function useStages(): { all: StageMeta[]; visible: StageMeta[]; labels: Record<StageId, string> } {
  const { stageOverrides } = useSettings();
  return useMemo(() => {
    const all = STAGES.map((s) => ({ ...s, label: stageOverrides[s.id]?.label?.trim() || s.label }));
    const labels = Object.fromEntries(all.map((s) => [s.id, s.label])) as Record<StageId, string>;
    return { all, visible: all.filter((s) => !stageOverrides[s.id]?.hidden), labels };
  }, [stageOverrides]);
}
