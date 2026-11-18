import { PlusSquare, Share } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';

export function IOSInstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet
      center
      open={open}
      onClose={onClose}
      title="Install Collab Tracker"
      footer={
        <Button variant="primary" className="flex-1" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <ol className="space-y-4 text-sm">
        <li className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-elevated ring-1 ring-line">
            <Share className="h-5 w-5 text-sky-400" />
          </span>
          <span>
            Tap the <b>Share</b> button in Safari's toolbar.
          </span>
        </li>
        <li className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-elevated ring-1 ring-line">
            <PlusSquare className="h-5 w-5 text-neon" />
          </span>
          <span>
            Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.
          </span>
        </li>
      </ol>
      <p className="mt-5 rounded-xl bg-elevated p-3 text-xs text-muted ring-1 ring-line">
        Installed apps get their own icon, open full-screen, and iOS keeps their data stored more reliably. Keep making
        JSON backups from Settings either way.
      </p>
    </Sheet>
  );
}
