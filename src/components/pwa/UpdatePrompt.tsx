import { useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/Button';

export function UpdatePrompt() {
  const { needRefresh, offlineReady, update, dismiss } = useServiceWorker();

  useEffect(() => {
    if (offlineReady) {
      toast('Ready to work offline ✨', { tone: 'success' });
      dismiss();
    }
  }, [offlineReady, dismiss]);

  if (!needRefresh) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-50 mx-auto flex max-w-md animate-fade-up items-center gap-3 rounded-2xl bg-surface p-3 shadow-2xl ring-1 ring-neon/40"
    >
      <RefreshCw className="h-5 w-5 shrink-0 text-neon" />
      <p className="flex-1 text-sm">A new version of Collab Tracker is ready.</p>
      <Button size="sm" variant="primary" onClick={() => void update()}>
        Reload
      </Button>
      <button aria-label="Later" onClick={dismiss} className="grid h-9 w-9 place-items-center rounded-lg text-subtle hover:text-fg">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
