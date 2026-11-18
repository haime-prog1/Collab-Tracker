import { Check, ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';
import type { Deliverable, Platform } from '@/types/models';
import { PLATFORM_IDS } from '@/types/models';
import { DELIVERABLE_PRESETS, PLATFORMS } from '@/lib/constants';
import { DUE_TONE_CLASS, dueInfo } from '@/lib/format';
import { uid } from '@/lib/id';
import { Input, Select } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/cn';

export function DeliverablesEditor({
  items,
  onChange,
}: {
  items: Deliverable[];
  onChange: (items: Deliverable[]) => void;
}) {
  const update = (id: string, patch: Partial<Deliverable>) =>
    onChange(items.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const add = (title = '') => onChange([...items, { id: uid(), title, done: false }]);
  const done = items.filter((d) => d.done).length;

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${(done / items.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium tabular-nums text-muted">
            {done}/{items.length} done
          </span>
        </div>
      )}

      <ul className="space-y-2">
        {items.map((d) => {
          const due = dueInfo(d.dueDate);
          return (
            <li key={d.id} className={cn('rounded-2xl bg-elevated/60 p-3 ring-1 ring-line transition', d.done && 'opacity-70')}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={d.done}
                  aria-label={`Mark "${d.title || 'deliverable'}" ${d.done ? 'not done' : 'done'}`}
                  onClick={() => update(d.id, { done: !d.done })}
                  className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 transition active:scale-90',
                    d.done ? 'bg-emerald-500 text-white ring-emerald-500' : 'bg-surface ring-line',
                  )}
                >
                  {d.done && <Check className="h-5 w-5 animate-pop" />}
                </button>
                <Input
                  value={d.title}
                  placeholder="Deliverable"
                  aria-label="Deliverable title"
                  onChange={(e) => update(d.id, { title: e.target.value })}
                  className={cn('h-10 flex-1 bg-surface', d.done && 'line-through')}
                />
                <button
                  type="button"
                  aria-label="Remove deliverable"
                  onClick={() => onChange(items.filter((x) => x.id !== d.id))}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-subtle hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 pl-10">
                <label className="flex flex-col gap-1 text-xs text-subtle">
                  Due
                  <Input type="date" value={d.dueDate ?? ''} onChange={(e) => update(d.id, { dueDate: e.target.value || undefined })} className="h-10 bg-surface" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-subtle">
                  Platform
                  <Select
                    value={d.platform ?? ''}
                    onChange={(e) => update(d.id, { platform: (e.target.value || undefined) as Platform | undefined })}
                    className="h-10 bg-surface"
                  >
                    <option value="">—</option>
                    {PLATFORM_IDS.map((p) => (
                      <option key={p} value={p}>
                        {PLATFORMS[p].label}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="col-span-2 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                    <Input
                      type="url"
                      inputMode="url"
                      placeholder="Submission / draft link"
                      aria-label="Submission link"
                      value={d.link ?? ''}
                      onChange={(e) => update(d.id, { link: e.target.value || undefined })}
                      className="h-10 bg-surface pl-9"
                    />
                  </div>
                  {d.link && /^https?:\/\//i.test(d.link) && (
                    <a href={d.link} target="_blank" rel="noreferrer noopener" aria-label="Open link" className="grid h-10 w-10 place-items-center rounded-lg text-neon hover:bg-surface">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {d.dueDate && !d.done && <p className={cn('col-span-2 text-xs', DUE_TONE_CLASS[due.tone])}>{due.label}</p>}
              </div>
            </li>
          );
        })}
      </ul>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Quick add</p>
        <div className="flex flex-wrap gap-2">
          {DELIVERABLE_PRESETS.map((p) => (
            <Chip key={p} onClick={() => add(p)}>
              <Plus className="h-3.5 w-3.5" /> {p}
            </Chip>
          ))}
          <Chip onClick={() => add()} className="text-neon">
            <Plus className="h-3.5 w-3.5" /> Custom
          </Chip>
        </div>
      </div>
    </div>
  );
}
