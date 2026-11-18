import { Gift, Plus, Trash2 } from 'lucide-react';
import type { CompensationItem, CompensationType, PaymentStatus, Perk } from '@/types/models';
import { COMPENSATION_TYPE_IDS, PAYMENT_STATUS_IDS } from '@/types/models';
import { COMPENSATION_TYPES, CURRENCIES, PAYMENT_STATUSES } from '@/lib/constants';
import { formatMoney, toISODate } from '@/lib/format';
import { uid } from '@/lib/id';
import { Input, Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export function MoneyEditor({
  compensation,
  perks,
  currency,
  onChange,
}: {
  compensation: CompensationItem[];
  perks: Perk[];
  currency: string;
  onChange: (patch: { compensation?: CompensationItem[]; perks?: Perk[] }) => void;
}) {
  const today = toISODate(new Date());
  const updC = (id: string, patch: Partial<CompensationItem>) =>
    onChange({ compensation: compensation.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const updP = (id: string, patch: Partial<Perk>) => onChange({ perks: perks.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const setStatus = (c: CompensationItem, status: PaymentStatus) =>
    updC(c.id, {
      status,
      invoicedAt: status !== 'unpaid' ? (c.invoicedAt ?? today) : undefined,
      paidAt: status === 'paid' ? (c.paidAt ?? today) : undefined,
    });

  const total = compensation.filter((c) => c.currency === currency).reduce((s, c) => s + c.amount, 0);
  const perkValue = perks.reduce((s, p) => s + (p.estimatedValue ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-transparent p-3 ring-1 ring-emerald-500/30">
          <p className="text-xs text-muted">Cash value</p>
          <p className="text-xl font-bold text-emerald-400">{formatMoney(total, currency)}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500/15 to-transparent p-3 ring-1 ring-fuchsia-500/30">
          <p className="text-xs text-muted">Perks value</p>
          <p className="text-xl font-bold text-fuchsia-400">{formatMoney(perkValue, currency)}</p>
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Compensation</h3>
        <ul className="space-y-2">
          {compensation.map((c) => (
            <li key={c.id} className="space-y-2 rounded-2xl bg-elevated/60 p-3 ring-1 ring-line">
              <div className="flex gap-2">
                <Select
                  aria-label="Compensation type"
                  value={c.type}
                  onChange={(e) => updC(c.id, { type: e.target.value as CompensationType })}
                  className="h-10 flex-1 bg-surface"
                >
                  {COMPENSATION_TYPE_IDS.map((t) => (
                    <option key={t} value={t}>
                      {COMPENSATION_TYPES[t]}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  aria-label="Remove payment"
                  onClick={() => onChange({ compensation: compensation.filter((x) => x.id !== c.id) })}
                  className="grid h-10 w-10 place-items-center rounded-lg text-subtle hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  aria-label="Amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={Number.isFinite(c.amount) && c.amount !== 0 ? c.amount : ''}
                  placeholder="0"
                  onChange={(e) => updC(c.id, { amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="h-10 flex-1 bg-surface"
                />
                <Select aria-label="Currency" value={c.currency} onChange={(e) => updC(c.id, { currency: e.target.value })} className="h-10 w-24 bg-surface">
                  {[...new Set([c.currency, ...CURRENCIES])].map((cur) => (
                    <option key={cur}>{cur}</option>
                  ))}
                </Select>
              </div>
              <div role="radiogroup" aria-label="Payment status" className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1 ring-1 ring-line">
                {PAYMENT_STATUS_IDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={c.status === s}
                    onClick={() => setStatus(c, s)}
                    className={cn(
                      'h-9 rounded-lg text-xs font-semibold transition',
                      c.status === s ? cn('ring-1', PAYMENT_STATUSES[s].color) : 'text-muted hover:text-fg',
                    )}
                  >
                    {PAYMENT_STATUSES[s].label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-subtle">
                  Payment due
                  <Input type="date" value={c.dueDate ?? ''} onChange={(e) => updC(c.id, { dueDate: e.target.value || undefined })} className="h-10 bg-surface" />
                </label>
                {c.status === 'paid' ? (
                  <label className="flex flex-col gap-1 text-xs text-subtle">
                    Paid on
                    <Input type="date" value={c.paidAt ?? ''} onChange={(e) => updC(c.id, { paidAt: e.target.value || undefined })} className="h-10 bg-surface" />
                  </label>
                ) : c.status === 'invoiced' ? (
                  <label className="flex flex-col gap-1 text-xs text-subtle">
                    Invoiced on
                    <Input type="date" value={c.invoicedAt ?? ''} onChange={(e) => updC(c.id, { invoicedAt: e.target.value || undefined })} className="h-10 bg-surface" />
                  </label>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['flat_fee', 'usage_rights'] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              onClick={() =>
                onChange({ compensation: [...compensation, { id: uid(), type: t, amount: 0, currency, status: 'unpaid' }] })
              }
            >
              <Plus className="h-4 w-4" /> {COMPENSATION_TYPES[t]}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ compensation: [...compensation, { id: uid(), type: 'other', amount: 0, currency, status: 'unpaid' }] })}
          >
            <Plus className="h-4 w-4" /> Other
          </Button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Gift className="h-4 w-4 text-fuchsia-400" /> PR packages & gifted products
        </h3>
        <ul className="space-y-2">
          {perks.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-elevated/60 p-3 ring-1 ring-line">
              <Input
                aria-label="Perk description"
                value={p.description}
                placeholder="e.g. Product bundle, event tickets"
                onChange={(e) => updP(p.id, { description: e.target.value })}
                className="h-10 min-w-0 flex-[2_1_12rem] bg-surface"
              />
              <Input
                aria-label="Estimated value"
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="Value"
                value={p.estimatedValue ?? ''}
                onChange={(e) => updP(p.id, { estimatedValue: e.target.value === '' ? undefined : Number(e.target.value) })}
                className="h-10 w-24 flex-1 bg-surface"
              />
              <button
                type="button"
                aria-pressed={p.received}
                onClick={() => updP(p.id, { received: !p.received, receivedAt: !p.received ? today : undefined })}
                className={cn(
                  'h-10 rounded-lg px-3 text-xs font-semibold ring-1 transition',
                  p.received ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30' : 'text-muted ring-line',
                )}
              >
                {p.received ? 'Received' : 'Pending'}
              </button>
              <button
                type="button"
                aria-label="Remove perk"
                onClick={() => onChange({ perks: perks.filter((x) => x.id !== p.id) })}
                className="grid h-10 w-10 place-items-center rounded-lg text-subtle hover:bg-rose-500/10 hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <Button size="sm" className="mt-2" onClick={() => onChange({ perks: [...perks, { id: uid(), description: '', received: false }] })}>
          <Plus className="h-4 w-4" /> Add perk
        </Button>
      </section>
    </div>
  );
}
