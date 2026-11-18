import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex animate-fade-up flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-line px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-emerald-500/20 ring-1 ring-line">
        <Icon className="h-7 w-7 text-neon" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
      {action}
    </div>
  );
}
