import type { SyntheticEvent } from 'react';
import { ChevronLeft, ChevronRight, Rocket } from 'lucide-react';
import { moveCollab } from '@/db/store';
import { useStages } from '@/hooks/useStore';
import type { Collab } from '@/types/models';
import { cn } from '@/lib/cn';

/** One-tap stage transitions: reliable on touch where drag is fiddly. Skips stages the user hid. */
export function StageMover({ collab, className }: { collab: Collab; className?: string }) {
  const { visible } = useStages();
  const idx = visible.findIndex((s) => s.id === collab.stage);
  const prev = idx > 0 ? visible[idx - 1] : undefined;
  const next = idx >= 0 && idx < visible.length - 1 ? visible[idx + 1] : undefined;
  const stop = (e: SyntheticEvent) => e.stopPropagation();

  return (
    <div className={cn('flex items-center gap-1', className)} onClick={stop} onPointerDown={stop} onKeyDown={stop}>
      <button
        type="button"
        disabled={!prev}
        aria-label={prev ? `Move back to ${prev.label}` : 'No previous stage'}
        title={prev ? `← ${prev.label}` : undefined}
        onClick={() => prev && void moveCollab(collab.id, prev.id)}
        className="grid h-9 w-9 place-items-center rounded-lg text-subtle ring-1 ring-line transition hover:text-fg active:scale-90 disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {next && (
        <button
          type="button"
          aria-label={`Move to ${next.label}`}
          onClick={() => void moveCollab(collab.id, next.id)}
          className={cn(
            'inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold ring-1 transition active:scale-95',
            next.id === 'published'
              ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/40 hover:bg-emerald-500/25'
              : 'text-muted ring-line hover:text-fg',
          )}
        >
          {next.id === 'published' && <Rocket className="h-3.5 w-3.5" />}
          <span className="max-w-24 truncate">{next.short === next.label || next.id === 'published' ? next.label : next.short}</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
