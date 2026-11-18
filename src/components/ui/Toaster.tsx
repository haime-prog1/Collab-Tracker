import { CheckCircle2, AlertTriangle, PartyPopper, Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import { dismissToast, useToasts, type ToastTone } from './toast';

const icons: Record<ToastTone, typeof Info> = {
  default: Info,
  success: CheckCircle2,
  error: AlertTriangle,
  celebrate: PartyPopper,
};
const tones: Record<ToastTone, string> = {
  default: 'text-sky-400',
  success: 'text-emerald-400',
  error: 'text-rose-400',
  celebrate: 'text-fuchsia-400',
};

export function Toaster() {
  const toasts = useToasts();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:items-end"
    >
      {toasts.map((t) => {
        const Icon = icons[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-fade-up items-center gap-3 rounded-2xl bg-surface/95 px-4 py-3 text-sm shadow-2xl ring-1 ring-line backdrop-blur',
              t.tone === 'celebrate' && 'ring-fuchsia-500/40',
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0', tones[t.tone])} />
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                className="rounded-lg px-2 py-1 font-semibold text-neon hover:bg-elevated"
                onClick={() => {
                  t.action!.onClick();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
