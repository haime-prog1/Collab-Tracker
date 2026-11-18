import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Clock, Gift, Sparkles, TrendingUp } from 'lucide-react';
import { useCollabs, useSettings } from '@/hooks/useStore';
import { bucketOthers, bucketPrimary, summarize, type Period } from '@/lib/finance';
import { formatMoney } from '@/lib/format';
import { Segmented } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

export function EarningsSummary({ className }: { className?: string }) {
  const collabs = useCollabs();
  const { currency } = useSettings();
  const [period, setPeriod] = useState<Period>('month');
  const s = useMemo(() => summarize(collabs, period), [collabs, period]);
  const earned = bucketPrimary(s.earned, currency);
  const pending = bucketPrimary(s.pending, currency);
  const max = Math.max(earned + pending, 1);
  const rangeLabel = period === 'month' ? format(s.range.start, 'MMMM yyyy') : `Q${Math.floor(s.range.start.getMonth() / 3) + 1} ${format(s.range.start, 'yyyy')}`;

  return (
    <Card className={cn('relative overflow-hidden p-5', className)}>
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">Earnings</p>
          <p className="text-xs text-subtle">{rangeLabel}</p>
        </div>
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'month', label: 'Month' },
            { value: 'quarter', label: 'Quarter' },
          ]}
        />
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-4">
        <Stat icon={TrendingUp} label="Earned" tone="text-emerald-400" value={earned} currency={currency} others={bucketOthers(s.earned, currency)} />
        <Stat icon={Clock} label="Pending" tone="text-amber-300" value={pending} currency={currency} others={bucketOthers(s.pending, currency)} />
      </div>

      <div className="relative mt-4 flex h-2.5 overflow-hidden rounded-full bg-elevated" aria-hidden>
        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700" style={{ width: `${(earned / max) * 100}%` }} />
        <div className="h-full bg-gradient-to-r from-amber-400/80 to-amber-300/60 transition-all duration-700" style={{ width: `${(pending / max) * 100}%` }} />
      </div>

      <div className="relative mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <span>
          Invoiced <b className="text-fg">{formatMoney(bucketPrimary(s.invoiced, currency), currency)}</b>
        </span>
        <span>
          Unpaid <b className="text-fg">{formatMoney(bucketPrimary(s.unpaid, currency), currency)}</b>
        </span>
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" /> Pipeline <b className="text-fg">{formatMoney(bucketPrimary(s.potential, currency), currency)}</b>
        </span>
        {s.perksValue > 0 && (
          <span className="inline-flex items-center gap-1">
            <Gift className="h-3.5 w-3.5 text-fuchsia-400" /> Perks <b className="text-fg">{formatMoney(s.perksValue, currency)}</b>
          </span>
        )}
        {s.overdueInvoices > 0 && <span className="font-semibold text-rose-400">{s.overdueInvoices} overdue invoice{s.overdueInvoices > 1 ? 's' : ''}</span>}
      </div>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  currency,
  tone,
  others,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number;
  currency: string;
  tone: string;
  others: [string, number][];
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        <Icon className={cn('h-4 w-4', tone)} /> {label}
      </p>
      <p key={value} className={cn('mt-1 animate-fade-up text-2xl font-bold tabular-nums md:text-3xl', tone)}>
        {formatMoney(value, currency)}
      </p>
      {others.length > 0 && (
        <p className="mt-0.5 text-xs text-subtle">+ {others.map(([c, v]: [string, number]) => formatMoney(v, c)).join(' · ')}</p>
      )}
    </div>
  );
}

