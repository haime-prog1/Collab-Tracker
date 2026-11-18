import { useMemo } from 'react';
import { useCollabs } from '@/hooks/useStore';
import { useEvents } from '@/hooks/useEvents';
import { ACTIVE_STAGES } from '@/lib/constants';
import { dueInfo } from '@/lib/format';

/** Nav badge counts: urgent deadlines, active deals, overdue calendar items, money to collect. */
export function useNavBadges(): Record<string, number> {
  const collabs = useCollabs();
  const events = useEvents();
  return useMemo(() => {
    const active = collabs.filter((c) => ACTIVE_STAGES.includes(c.stage));
    const urgent = active.filter((c) => {
      const t = dueInfo(c.deadline).tone;
      return t === 'overdue' || t === 'soon';
    }).length;
    const toCollect = collabs.filter(
      (c) => (c.stage === 'published' || c.stage === 'archived') && c.compensation.some((i) => i.status !== 'paid'),
    ).length;
    const overdue = events.filter((e) => e.status === 'overdue').length;
    return { '/': urgent, '/pipeline': active.length, '/calendar': overdue, '/finance': toCollect };
  }, [collabs, events]);
}
