import { useMemo } from 'react';
import { filterCollabs } from '@/lib/search';
import { useUI } from '@/state/ui';
import { useCollabs, useStages } from './useStore';

export function useFilteredCollabs() {
  const collabs = useCollabs();
  const filters = useUI((s) => s.filters);
  const { labels } = useStages();
  return useMemo(() => filterCollabs(collabs, filters, labels), [collabs, filters, labels]);
}
