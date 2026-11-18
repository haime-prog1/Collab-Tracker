import { useMemo } from 'react';
import { useCollabs } from '@/hooks/useStore';
import { ACTIVE_STAGES } from '@/lib/constants';
import { dueInfo } from '@/lib/format';

/** Badge counts for nav: active deals, and money items needing attention (unpaid on published/archived). */
export function useNavBadges(): Record<string, number> {
  const collabs = useCollabs();
  return useMemo(() => {
    const active = collabs.filter((c) => ACTIVE_STAGES.includes(c.stage));
    const urgent = active.filter((c) => {
      const t = dueInfo(c.deadline).tone;
      return t === 'overdue' || t === 'soon';
    }).length;
    const toCollect = collabs.filter(
      (c) => (c.stage === 'published' || c.stage === 'archived') && c.compensation.some((i) => i.status !== 'paid'),
    ).length;
    return { '/': urgent, '/pipeline': active.length, '/finance': toCollect };
  }, [collabs]);
}
