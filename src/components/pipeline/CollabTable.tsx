import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { Collab } from '@/types/models';
import { PLATFORMS, PRIORITIES, PAYMENT_STATUSES, STAGES } from '@/lib/constants';
import { DUE_TONE_CLASS, dueInfo, formatMoney } from '@/lib/format';
import { collabPaymentStatus, collabTotal } from '@/lib/finance';
import { useSettings, useStages } from '@/hooks/useStore';
import { ui } from '@/state/ui';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { CollabCard } from './CollabCard';
import { StageMover } from './StageMover';

type SortKey = 'partner' | 'stage' | 'payout' | 'deadline' | 'priority';
const stageIndex = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));

export function CollabTable({ collabs }: { collabs: Collab[] }) {
  const { currency } = useSettings();
  const { all, labels } = useStages();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'deadline', dir: 1 });

  const rows = useMemo(() => {
    const val = (c: Collab): string | number => {
      switch (sort.key) {
        case 'partner':
          return c.partnerName.toLowerCase();
        case 'stage':
          return stageIndex[c.stage];
        case 'payout':
          return collabTotal(c, currency);
        case 'deadline':
          return c.deadline ?? '9999';
        case 'priority':
          return PRIORITIES[c.priority].weight;
      }
    };
    return [...collabs].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [collabs, sort, currency]);

  const th = (key: SortKey, label: string, className?: string) => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
    return (
      <th className={cn('px-3 py-2 font-medium', className)} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button
          type="button"
          className={cn('inline-flex items-center gap-1 hover:text-fg', active && 'text-fg')}
          onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : 1 }))}
        >
          {label}
          <Icon className="h-3.5 w-3.5" />
        </button>
      </th>
    );
  };

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((c) => (
          <CollabCard key={c.id} collab={c} showStage onClick={() => ui.openEditor(c.id)} />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-2xl ring-1 ring-line md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-elevated/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              {th('partner', 'Partner / collab')}
              <th className="px-3 py-2 font-medium">Platforms</th>
              {th('stage', 'Stage')}
              {th('payout', 'Payout', 'text-right')}
              <th className="px-3 py-2 font-medium">Payment</th>
              {th('deadline', 'Deadline')}
              {th('priority', 'Priority')}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {rows.map((c) => {
              const meta = all.find((s) => s.id === c.stage)!;
              const pay = collabPaymentStatus(c);
              const due = dueInfo(c.deadline);
              return (
                <tr key={c.id} className="cursor-pointer transition hover:bg-elevated/50" onClick={() => ui.openEditor(c.id)}>
                  <td className="max-w-72 px-3 py-2.5">
                    <p className="truncate font-semibold">{c.partnerName || '—'}</p>
                    <p className="truncate text-xs text-muted">{c.title}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {c.platforms.map((p) => (
                        <Badge key={p} className={PLATFORMS[p].color}>
                          {PLATFORMS[p].label}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', meta.text)}>
                      <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
                      {labels[c.stage]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-400">
                    {collabTotal(c, currency) ? formatMoney(collabTotal(c, currency), currency) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {pay !== 'none' ? <Badge className={PAYMENT_STATUSES[pay].color}>{PAYMENT_STATUSES[pay].label}</Badge> : '—'}
                  </td>
                  <td className={cn('px-3 py-2.5 text-xs', DUE_TONE_CLASS[due.tone])}>{c.deadline ? due.label : '—'}</td>
                  <td className={cn('px-3 py-2.5 text-xs font-medium', PRIORITIES[c.priority].color)}>{PRIORITIES[c.priority].label}</td>
                  <td className="px-3 py-1.5">
                    <StageMover collab={c} className="justify-end" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
