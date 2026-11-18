import { useState } from 'react';
import { Download } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import { IOSInstallSheet } from './IOSInstallSheet';
import { cn } from '@/lib/cn';

export function InstallButton({ className, block }: { className?: string; block?: boolean }) {
  const { canPrompt, iosManual, install } = useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);
  if (!canPrompt && !iosManual) return null;
  return (
    <>
      <Button
        variant="secondary"
        className={cn(block !== false && 'w-full', className)}
        onClick={async () => {
          if (iosManual) return setIosOpen(true);
          const outcome = await install();
          if (outcome === 'accepted') toast('Installed! Find Collab Tracker on your home screen.', { tone: 'success' });
        }}
      >
        <Download className="h-4 w-4 text-emerald-400" /> Install app
      </Button>
      <IOSInstallSheet open={iosOpen} onClose={() => setIosOpen(false)} />
    </>
  );
}
