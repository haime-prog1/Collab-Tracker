import { useMemo } from 'react';
import { buildEvents } from '@/lib/calendar';
import { useSnapshot } from './useStore';

export function useEvents() {
  const { collabs, brands } = useSnapshot();
  return useMemo(() => buildEvents(collabs, brands), [collabs, brands]);
}
