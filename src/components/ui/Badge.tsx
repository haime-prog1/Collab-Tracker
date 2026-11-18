import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', className)}>
      {children}
    </span>
  );
}

export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      key={count}
      className={cn(
        'inline-flex min-w-5 animate-pop items-center justify-center rounded-full bg-neon px-1.5 text-[10px] font-bold leading-5 text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
