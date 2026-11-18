import { useMemo, useState } from 'react';
import { Gift, Wallet } from 'lucide-react';
import { useCollabs, useSettings } from '@/hooks/useStore';
import { saveCollab } from '@/db/store';
import { COMPENSATION_TYPES, PAYMENT_STATUSES } from '@/lib/constants';
import { DUE_TONE_CLASS, dueInfo, formatDate, formatMoney, toISODate } from '@/lib/format';
import { PAYMENT_STATUS_IDS, type Collab, type CompensationItem, type PaymentStatus } from '@/types/models';
import { ui } from '@/state/ui';
import { PageHeader, Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { EarningsSummary } from '@/components/finance/EarningsSummary';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

interface Row {
  collab: Collab;
  item: CompensationItem;
}

const NEXT: Record<PaymentStatus, PaymentStatus> = { unpaid: 'invoiced', invoiced: 'paid', paid: 'unpaid' };

export default function Finance() {
  const collabs = useCollabs();
  const { currency } = useSettings();
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all');

  const rows = useMemo<Row[]>(
    () =>
      collabs
        .flatMap((collab) => collab.compensation.map((item) => ({ collab, item })))
        .filter((r) => status === 'all' || r.item.status === status)
        .sort((a, b) => {
          const order = { invoiced: 0, unpaid: 1, paid: 2 } as const;
          return order[a.item.status] - order[b.item.status] || (a.item.dueDate ?? '9').localeCompare(b.item.dueDate ?? '9');
        }),
    [collabs, status],
  );

  const perks = useMemo(() => collabs.flatMap((c) => c.perks.map((p) => ({ c, p }))), [collabs]);

  const advance = async ({ collab, item }: Row) => {
    const next = NEXT[item.status];
    const today = toISODate(new Date());
    await saveCollab({
      ...collab,
      compensation: collab.compensation.map((i) =>
        i.id === item.id
          ? { ...i, status: next, invoicedAt: next !== 'unpaid' ? (i.invoicedAt ?? today) : undefined, paidAt: next === 'paid' ? today : undefined }
          : i,
      ),
    });
    if (next === 'paid') toast(`💸 ${formatMoney(item.amount, item.currency)} from ${collab.partnerName} marked paid`, { tone: 'success' });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Money" subtitle="Payments, invoices & perks" />
      <EarningsSummary />

      <section>
        <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-none">
          <Chip active={status === 'all'} onClick={() => setStatus('all')}>All</Chip>
          {PAYMENT_STATUS_IDS.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {PAYMENT_STATUSES[s].label}
            </Chip>
          ))}
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Wallet} title="No payments here">
            Add compensation in a collab's “Money & perks” tab.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line">
            {rows.map((r) => {
              const due = dueInfo(r.item.dueDate);
              return (
                <div key={r.item.id} className="flex items-center gap-3 p-3">
                  <button type="button" onClick={() => ui.openEditor(r.collab.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate font-medium">{r.collab.partnerName}</p>
                    <p className="truncate text-xs text-muted">
                      {r.item.label || COMPENSATION_TYPES[r.item.type]} · {r.collab.title}
                    </p>
                    <p className={cn('text-xs', r.item.status === 'paid' ? 'text-subtle' : DUE_TONE_CLASS[due.tone])}>
                      {r.item.status === 'paid' ? `Paid ${formatDate(r.item.paidAt)}` : r.item.dueDate ? `Payment ${due.label.toLowerCase()}` : 'No due date'}
                    </p>
                  </button>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={cn('font-semibold tabular-nums', r.item.status === 'paid' ? 'text-emerald-400' : 'text-fg')}>
                      {formatMoney(r.item.amount, r.item.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void advance(r)}
                      title={`Tap to mark ${PAYMENT_STATUSES[NEXT[r.item.status]].label.toLowerCase()}`}
                      className="active:scale-95"
                    >
                      <Badge className={cn('h-7 px-2.5', PAYMENT_STATUSES[r.item.status].color)}>{PAYMENT_STATUSES[r.item.status].label} →</Badge>
                    </button>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </section>

      {perks.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Gift className="h-5 w-5 text-fuchsia-400" /> PR packages & gifted products
          </h2>
          <Card className="divide-y divide-line">
            {perks.map(({ c, p }) => (
              <button key={p.id} type="button" onClick={() => ui.openEditor(c.id)} className="flex w-full items-center gap-3 p-3 text-left">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.description}</p>
                  <p className="truncate text-xs text-muted">{c.partnerName}</p>
                </div>
                {p.estimatedValue ? <span className="text-sm tabular-nums text-fuchsia-400">{formatMoney(p.estimatedValue, currency)}</span> : null}
                <Badge className={p.received ? PAYMENT_STATUSES.paid.color : 'bg-elevated text-muted ring-line'}>{p.received ? 'Received' : 'Pending'}</Badge>
              </button>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
