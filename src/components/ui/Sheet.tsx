import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Modal built on native <dialog> (focus trap, Esc, top layer for free).
 * Mobile: bottom sheet. Desktop: right-hand drawer (or centered when `center`).
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  center,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  center?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = 'hidden';
    } else if (!open && d.open) {
      d.close();
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'm-0 max-h-none max-w-none bg-transparent p-0 text-fg backdrop:bg-black/60',
        'fixed inset-x-0 bottom-0 top-auto w-full',
        center
          ? 'md:inset-0 md:m-auto md:h-fit md:w-[min(32rem,calc(100vw-2rem))]'
          : 'md:inset-y-0 md:left-auto md:right-0 md:top-0 md:h-full md:w-[min(36rem,100vw)]',
      )}
    >
      <div
        className={cn(
          'flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-surface ring-1 ring-line animate-sheet-up',
          center ? 'md:rounded-3xl md:animate-pop' : 'md:h-full md:max-h-none md:rounded-none md:animate-sheet-left',
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line md:hidden" aria-hidden />
        <header className="flex items-center gap-3 border-b border-line px-5 py-3">
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-elevated hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <footer className="flex gap-2 border-t border-line px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>}
      </div>
    </dialog>
  );
}
