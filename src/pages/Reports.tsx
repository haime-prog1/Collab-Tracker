import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { BarChart3, Download, FileSpreadsheet, Printer, Table2, UserRound } from 'lucide-react';
import { useSnapshot, useStages } from '@/hooks/useStore';
import { PLATFORMS, PAYMENT_STATUSES } from '@/lib/constants';
import { formatDate, formatMoney, parseDate, toISODate } from '@/lib/format';
import { PLATFORM_IDS, type Platform } from '@/types/models';
import {
  PRESETS,
  brandsCSV,
  buildReport,
  downloadText,
  earliestDate,
  ledgerCSV,
  presetRange,
  type PresetId,
} from '@/lib/report';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip, Segmented } from '@/components/ui/Chip';
import { Input, Select } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart, HBar } from '@/components/reports/BarChart';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

export default function Reports() {
  const { collabs, brands, settings } = useSnapshot();
  const { all: stages } = useStages();
  const currency = settings.currency;
  const [preset, setPreset] = useState<PresetId>('this_month');
  const [custom, setCustom] = useState(() => presetRange('this_month'));
  const [brandId, setBrandId] = useState('');
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [chartView, setChartView] = useState<'chart' | 'table'>('chart');

  const range = preset === 'custom' ? custom : presetRange(preset, new Date(), earliestDate(collabs));
  const validRange = !!parseDate(range.start) && !!parseDate(range.end) && range.start <= range.end;

  const report = useMemo(
    () => (validRange ? buildReport(collabs, brands, { ...range, currency, brandId: brandId || undefined, platform: platform || undefined }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collabs, brands, range.start, range.end, currency, brandId, platform, validRange],
  );

  const rangeLabel = validRange ? `${formatDate(range.start)} – ${formatDate(range.end)}` : 'Invalid range';
  const brandName = brands.find((b) => b.id === brandId)?.name;
  const fileStem = `collab-tracker-report-${range.start}_to_${range.end}`;

  if (collabs.length === 0) {
    return (
      <EmptyState icon={BarChart3} title="Nothing to report yet">
        Add a few collabs and payments, then come back to generate earnings and deliverables reports.
      </EmptyState>
    );
  }

  const t = report?.totals;
  const maxBrand = Math.max(...(report?.byBrand.map((b) => b.earned) ?? [0]), 0);
  const maxPlatform = Math.max(...(report?.byPlatform.map((p) => p.deals) ?? [0]), 0);

  return (
    <div className="space-y-5">
      {/* Controls (not printed) */}
      <div className="space-y-3 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Reports</h1>
            <p className="text-sm text-muted">Generated on this device — nothing is uploaded.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => window.print()} disabled={!report}>
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
            <Button
              variant="primary"
              disabled={!report}
              onClick={() => {
                downloadText(`${fileStem}-payments.csv`, ledgerCSV(report!));
                toast('Payments CSV downloaded', { tone: 'success' });
              }}
            >
              <Download className="h-4 w-4" /> Payments CSV
            </Button>
            <Button
              disabled={!report}
              onClick={() => {
                downloadText(`${fileStem}-brands.csv`, brandsCSV(report!));
                toast('Brands CSV downloaded', { tone: 'success' });
              }}
            >
              <FileSpreadsheet className="h-4 w-4" /> Brands CSV
            </Button>
          </div>
        </div>
        <Card className="space-y-3 p-3">
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 scrollbar-none md:flex-wrap">
            {PRESETS.map((p) => (
              <Chip key={p.id} active={preset === p.id} onClick={() => { if (p.id === 'custom') setCustom(range); setPreset(p.id); }}>
                {p.label}
              </Chip>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {preset === 'custom' && (
              <>
                <label className="flex flex-col gap-1 text-xs text-subtle">
                  From
                  <Input type="date" value={custom.start} max={custom.end} onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-subtle">
                  To
                  <Input type="date" value={custom.end} min={custom.start} onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))} />
                </label>
              </>
            )}
            <label className="flex flex-col gap-1 text-xs text-subtle">
              Brand
              <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">All brands</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-subtle">
              Platform
              <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform | '')}>
                <option value="">All platforms</option>
                {PLATFORM_IDS.map((p) => <option key={p} value={p}>{PLATFORMS[p].label}</option>)}
              </Select>
            </label>
          </div>
        </Card>
      </div>

      {!report || !t ? (
        <p className="rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-500 ring-1 ring-rose-500/30">Pick a start date that's before the end date.</p>
      ) : (
        <article className="space-y-5" aria-label="Report">
          <header className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Collab report</p>
              <h2 className="text-xl font-bold">{rangeLabel}</h2>
              <p className="text-sm text-muted">
                {brandName ?? 'All brands'} · {platform ? PLATFORMS[platform].label : 'All platforms'} · amounts in {currency}
              </p>
            </div>
            <p className="text-xs text-subtle">Generated {format(new Date(report.generatedAt), 'MMM d, yyyy h:mm a')}</p>
          </header>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:grid-cols-4">
            <Kpi label="Earned in period" value={formatMoney(t.earned, currency)} tone="text-emerald-600 dark:text-emerald-400"
              sub={report.otherCurrencyEarned.length ? `+ ${report.otherCurrencyEarned.map(([c, v]) => formatMoney(v, c)).join(', ')}` : `${t.dealsPaid} paying deal${t.dealsPaid === 1 ? '' : 's'}`} />
            <Kpi label="Outstanding now" value={formatMoney(t.outstanding, currency)} tone="text-amber-600 dark:text-amber-300"
              sub={t.overdueCount ? `${formatMoney(t.overdue, currency)} overdue (${t.overdueCount})` : 'Nothing overdue'} alert={t.overdueCount > 0} />
            <Kpi label="Avg paid deal" value={formatMoney(t.avgDeal, currency)} sub={t.perksValue ? `+ ${formatMoney(t.perksValue, currency)} in perks` : 'Cash only'} />
            <Kpi label="Deals" value={`${t.dealsNew} new · ${t.dealsPublished} live`}
              sub={t.deliverablesTotal ? `${t.deliverablesDone}/${t.deliverablesTotal} deliverables done` : 'No deliverables due'} />
          </div>

          <Card className="p-4 break-inside-avoid">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-semibold">Earned per month ({currency})</h3>
              <Segmented<'chart' | 'table'>
                className="print:hidden"
                value={chartView}
                onChange={setChartView}
                options={[
                  { value: 'chart', label: <BarChart3 className="h-4 w-4" />, title: 'Chart' },
                  { value: 'table', label: <Table2 className="h-4 w-4" />, title: 'Table' },
                ]}
              />
            </div>
            {chartView === 'chart' ? (
              <BarChart bars={report.monthly.map((m) => ({ key: m.key, label: m.label, value: m.earned }))} currency={currency} />
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted"><tr><th className="py-1 font-medium">Month</th><th className="py-1 text-right font-medium">Earned</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {report.monthly.map((m) => (
                    <tr key={m.key}><td className="py-1.5">{format(parseDate(m.key + '-01')!, 'MMMM yyyy')}</td><td className="py-1.5 text-right tabular-nums">{formatMoney(m.earned, currency)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-4 break-inside-avoid">
              <h3 className="mb-3 font-semibold">By brand</h3>
              {report.byBrand.length === 0 ? <p className="text-sm text-muted">No brand activity in this period.</p> : (
                <ul className="space-y-3">
                  {report.byBrand.map((b) => (
                    <li key={b.brandId ?? b.brandName}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium">{b.brandName}</p>
                        <p className="shrink-0 text-sm font-semibold tabular-nums">{formatMoney(b.earned, currency)}</p>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <HBar value={b.earned} max={maxBrand} />
                      </div>
                      <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-subtle">
                        <span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" />{b.contact ? `${b.contact.name}${b.contact.email ? ` · ${b.contact.email}` : ''}` : 'No contact'}</span>
                        <span>{b.deals} deal{b.deals === 1 ? '' : 's'}</span>
                        {b.outstanding > 0 && <span className="text-amber-600 dark:text-amber-300">{formatMoney(b.outstanding, currency)} outstanding</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="space-y-5">
              <Card className="p-4 break-inside-avoid">
                <h3 className="mb-3 font-semibold">By platform</h3>
                {report.byPlatform.length === 0 ? <p className="text-sm text-muted">No platform activity in this period.</p> : (
                  <ul className="space-y-2.5">
                    {report.byPlatform.map((p) => (
                      <li key={p.platform} className="flex items-center gap-3 text-sm">
                        <span className="w-20 shrink-0">{p.label}</span>
                        <HBar value={p.deals} max={maxPlatform} />
                        <span className="w-28 shrink-0 text-right text-xs text-muted tabular-nums">{p.deals} deal{p.deals === 1 ? '' : 's'} · {formatMoney(p.earned, currency, true)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[11px] text-subtle">Multi-platform deals count toward each of their platforms.</p>
              </Card>
              <Card className="p-4 break-inside-avoid">
                <h3 className="mb-2 font-semibold">Pipeline snapshot (today)</h3>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {report.byStage.map((s) => {
                    const meta = stages.find((x) => x.id === s.stage)!;
                    return (
                      <li key={s.stage} className="flex items-center justify-between gap-2">
                        <span className="inline-flex min-w-0 items-center gap-1.5 truncate"><span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />{meta.label}</span>
                        <span className="font-semibold tabular-nums">{s.count}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          </div>

          <Card className="p-4">
            <h3 className="mb-2 font-semibold">Payments in period</h3>
            {report.ledger.length === 0 ? <p className="text-sm text-muted">No payments paid or due in this period.</p> : (
              <>
                <ul className="divide-y divide-line md:hidden print:hidden">
                  {report.ledger.map((l, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{l.brandName}</p>
                        <p className="truncate text-xs text-muted">{l.type} · {l.collabTitle}</p>
                        <p className="text-xs text-subtle">{l.contactName || 'No contact'} · {formatDate(l.date, 'MMM d')}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-semibold tabular-nums">{formatMoney(l.amount, l.currency)}</span>
                        <Badge className={l.overdue ? 'bg-rose-500/15 text-rose-500 ring-rose-500/30' : PAYMENT_STATUSES[l.status].color}>{l.overdue ? 'Overdue' : PAYMENT_STATUSES[l.status].label}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block print:block">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="py-2 pr-3 font-medium">Date</th><th className="py-2 pr-3 font-medium">Brand</th><th className="py-2 pr-3 font-medium">Contact</th>
                        <th className="py-2 pr-3 font-medium">Collab · type</th><th className="py-2 pr-3 text-right font-medium">Amount</th><th className="py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {report.ledger.map((l, i) => (
                        <tr key={i} className="break-inside-avoid">
                          <td className="py-2 pr-3 whitespace-nowrap">{formatDate(l.date, 'MMM d, yyyy')}</td>
                          <td className="py-2 pr-3 font-medium">{l.brandName}</td>
                          <td className="py-2 pr-3 text-muted">{l.contactName || '—'}{l.contactEmail && <span className="block text-xs text-subtle">{l.contactEmail}</span>}</td>
                          <td className="py-2 pr-3 text-muted">{l.collabTitle} · {l.type}</td>
                          <td className="py-2 pr-3 text-right font-semibold tabular-nums">{formatMoney(l.amount, l.currency)}</td>
                          <td className="py-2"><Badge className={l.overdue ? 'bg-rose-500/15 text-rose-500 ring-rose-500/30' : PAYMENT_STATUSES[l.status].color}>{l.overdue ? 'Overdue' : PAYMENT_STATUSES[l.status].label}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
          <p className="hidden text-center text-xs text-subtle print:block">Generated with Collab Tracker on {toISODate(new Date())}. Confidential.</p>
        </article>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, tone, alert }: { label: string; value: string; sub?: string; tone?: string; alert?: boolean }) {
  return (
    <Card className="p-3.5 break-inside-avoid">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn('mt-1 truncate text-xl font-bold tabular-nums md:text-2xl', tone)}>{value}</p>
      {sub && <p className={cn('mt-0.5 truncate text-xs', alert ? 'font-semibold text-rose-500' : 'text-subtle')}>{sub}</p>}
    </Card>
  );
}
