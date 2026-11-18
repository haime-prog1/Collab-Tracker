import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useSettings } from '@/hooks/useStore';
import { updateSettings } from '@/db/store';
import { nowISO } from '@/lib/id';
import { Button } from '@/components/ui/Button';
import { IOSInstallSheet } from './IOSInstallSheet';

const SNOOZE_DAYS = 14;

/** Gentle, dismissible install nudge shown on mobile until installed or snoozed. */
export function InstallBanner() {
  const { canPrompt, iosManual, install } = useInstallPrompt();
  const { installDismissedAt } = useSettings();
  const [iosOpen, setIosOpen] = useState(false);
  const snoozed =
    installDismissedAt && Date.now() - new Date(installDismissedAt).getTime() < SNOOZE_DAYS * 864e5;
  if ((!canPrompt && !iosManual) || snoozed) return null;

  return (
    <>
      <div className="mb-4 flex animate-fade-up items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600/15 to-emerald-500/10 p-3 ring-1 ring-neon/30 md:hidden">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface ring-1 ring-line">
          <Download className="h-5 w-5 text-neon" />
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">Install Collab Tracker</p>
          <p className="text-xs text-muted">Home-screen app, full offline access.</p>
        </div>
        <Button size="sm" variant="primary" onClick={() => (iosManual ? setIosOpen(true) : void install())}>
          Install
        </Button>
        <button
          aria-label="Dismiss"
          className="grid h-9 w-9 place-items-center rounded-lg text-subtle hover:text-fg"
          onClick={() => void updateSettings({ installDismissedAt: nowISO() })}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <IOSInstallSheet open={iosOpen} onClose={() => setIosOpen(false)} />
    </>
  );
}
