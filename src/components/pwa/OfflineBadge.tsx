import { CloudOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBadge() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <span
      title="You're offline — everything still works and is saved on this device."
      className="inline-flex h-8 shrink-0 animate-pop items-center gap-1.5 rounded-full bg-amber-500/15 px-3 text-xs font-medium text-amber-500 ring-1 ring-amber-500/30"
    >
      <CloudOff className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Offline</span>
    </span>
  );
}
