import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { AlertTriangle, CalendarCheck2, CalendarDays, ChevronLeft, ChevronRight, ListChecks, Wallet } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useSettings } from '@/hooks/useStore';
import { EVENT_GROUP, groupByDate, progressFor, type CalEvent } from '@/lib/calendar';
import { formatMoney, parseDate, toISODate } from '@/lib/format';
import { Card, PageHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EventRow } from '@/components/calendar/EventRow';
import { KIND_META } from '@/components/calendar/eventStyle';
import { cn } from '@/lib/cn';

type Filter = 'all' | 'work' | 'money' | 'published';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'work', label: 'Deliverables' },
  { id: 'money', label: 'Payments' },
  { id: 'published', label: 'Published' },
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const all = useEvents();
  const { currency } = useSettings();
  const [params, setParams] = useSearchParams();
  const today = toISODate(new Date());
  const selected = params.get('date') && parseDate(params.get('date')!) ? params.get('date')! : today;
  const [month, setMonth] = useState(() => startOfMonth(parseDate(selected)!));
  const [filter, setFilter] = useState<Filter>('all');

  const select = (d: string) => setParams({ date: d }, { replace: true });
  const events = useMemo(() => (filter === 'all' ? all : all.filter((e) => EVENT_GROUP[e.kind] === filter)), [all, filter]);
  const byDate = useMemo(() => groupByDate(events), [events]);

  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  const monthStart = toISODate(startOfMonth(month));
  const monthEnd = toISODate(endOfMonth(month));
  const progress = useMemo(() => progressFor(all, monthStart, monthEnd, currency), [all, monthStart, monthEnd, currency]);
  const overdue = useMemo(() => all.filter((e) => e.status === 'overdue'), [all]);
  const dayEvents = byDate.get(selected) ?? [];
  const upcoming = useMemo(() => events.filter((e) => e.date > selected && e.status !== 'done').slice(0, 6), [events, selected]);

  const go = (m: Date) => setMonth(startOfMonth(m));

  return (
    <div className="space-y-5">
      <PageHeader title="Calendar" subtitle="Deadlines, payments and launches at a glance" />

      {/* Progress tracker for the visible month */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ProgressCard
          icon={ListChecks}
          tone="violet"
          label={`Deliverables · ${format(month, 'MMMM')}`}
          value={`${progress.deliverables.done}/${progress.deliverables.total} done`}
          pct={progress.deliverables.total ? progress.deliverables.done / progress.deliverables.total : 0}
          foot={progress.deliverables.overdue ? `${progress.deliverables.overdue} overdue` : progress.deliverables.total ? 'On track' : 'Nothing due'}
          alert={progress.deliverables.overdue > 0}
        />
        <ProgressCard
          icon={Wallet}
          tone="emerald"
          label={`Payments · ${format(month, 'MMMM')}`}
          value={`${formatMoney(progress.payments.paidAmount, currency)} of ${formatMoney(progress.payments.totalAmount, currency)}`}
          pct={progress.payments.totalAmount ? progress.payments.paidAmount / progress.payments.totalAmount : 0}
          foot={`${progress.payments.paidCount}/${progress.payments.total} paid${progress.payments.overdue ? ` · ${progress.payments.overdue} overdue` : ''}`}
          alert={progress.payments.overdue > 0}
        />
        <Card className="flex items-center gap-3 p-4">
          <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', overdue.length ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/15 text-emerald-500')}>
            {overdue.length ? <AlertTriangle className="h-5 w-5" /> : <CalendarCheck2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Overdue (all time)</p>
            <p className="text-lg font-bold">{overdue.length ? `${overdue.length} item${overdue.length > 1 ? 's' : ''}` : 'All clear'}</p>
            {overdue.length > 0 && (
              <button type="button" onClick={() => { go(parseDate(overdue[0].date)!); select(overdue[0].date); }} className="text-xs font-medium text-neon">
                Jump to oldest →
              </button>
            )}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex w-full items-center gap-1 sm:w-auto">
          <Button size="icon" variant="ghost" aria-label="Previous month" onClick={() => go(subMonths(month, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="min-w-0 flex-1 text-center text-base font-semibold sm:min-w-40 sm:flex-none sm:text-lg" aria-live="polite">{format(month, 'MMMM yyyy')}</h2>
          <Button size="icon" variant="ghost" aria-label="Next month" onClick={() => go(addMonths(month, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button size="sm" onClick={() => { go(new Date()); select(today); }}>Today</Button>
        </div>
        <div className="-mx-4 flex w-[calc(100%+2rem)] min-w-0 gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:w-auto sm:flex-1 sm:justify-end sm:px-0">
          {FILTERS.map((f) => (
            <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <Card className="min-w-0 overflow-hidden p-2 md:p-3">
          <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-subtle">
            {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div role="grid" aria-label={format(month, 'MMMM yyyy')} className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1">
            {days.map((d) => {
              const iso = toISODate(d);
              const list = byDate.get(iso) ?? [];
              const inMonth = isSameMonth(d, month);
              const isSel = iso === selected;
              const hasOverdue = list.some((e) => e.status === 'overdue');
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  aria-selected={isSel}
                  aria-label={`${format(d, 'EEEE, MMMM d')}: ${list.length ? `${list.length} item${list.length > 1 ? 's' : ''}` : 'nothing scheduled'}`}
                  onClick={() => { select(iso); if (!inMonth) go(d); }}
                  className={cn(
                    'flex min-h-14 flex-col items-stretch rounded-xl p-1 text-left transition md:min-h-24 md:p-1.5',
                    inMonth ? 'bg-elevated/40 hover:bg-elevated' : 'opacity-40 hover:opacity-70',
                    isSel && 'bg-neon/10 ring-2 ring-neon',
                  )}
                >
                  <span
                    className={cn(
                      'mx-auto grid h-7 w-7 place-items-center rounded-full text-sm md:mx-0',
                      iso === today && 'bg-neon font-bold text-white',
                      hasOverdue && iso !== today && 'text-rose-500 font-semibold',
                    )}
                  >
                    {format(d, 'd')}
                  </span>
                  {/* Phones: dots. Larger screens: chips with the brand name. */}
                  {list.length > 0 && (
                    <>
                      <span className="mt-1 flex flex-wrap justify-center gap-0.5 md:hidden" aria-hidden>
                        {list.slice(0, 4).map((e) => <span key={e.id} className={cn('h-1.5 w-1.5 rounded-full', KIND_META[e.kind].dot)} />)}
                      </span>
                      <span className="mt-1 hidden flex-col gap-0.5 md:flex" aria-hidden>
                        {list.slice(0, 2).map((e) => (
                          <span key={e.id} className={cn('truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium', KIND_META[e.kind].chip, e.status === 'overdue' && 'ring-1 ring-rose-500/60')}>
                            {e.brandName}
                          </span>
                        ))}
                        {list.length > 2 && <span className="px-1 text-[10px] text-subtle">+{list.length - 2} more</span>}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <Legend />
        </Card>

        <div className="space-y-5">
          <Card className="p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarDays className="h-5 w-5 text-neon" />
              {selected === today ? 'Today' : format(parseDate(selected)!, 'EEEE, MMM d')}
            </h2>
            {dayEvents.length === 0 ? (
              <p className="py-6 text-sm text-muted">Nothing scheduled{filter !== 'all' ? ' for this filter' : ''}.</p>
            ) : (
              <div className="divide-y divide-line">{dayEvents.map((e) => <EventRow key={e.id} event={e} />)}</div>
            )}
          </Card>
          {upcoming.length > 0 && (
            <Card className="p-4">
              <h2 className="font-semibold">Coming up after this day</h2>
              <div className="divide-y divide-line">{upcoming.map((e: CalEvent) => <EventRow key={e.id} event={e} showDate />)}</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted">
      {Object.values(KIND_META).map((m) => (
        <li key={m.label} className="inline-flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', m.dot)} /> {m.label}
        </li>
      ))}
    </ul>
  );
}

function ProgressCard({
  icon: Icon,
  label,
  value,
  pct,
  foot,
  tone,
  alert,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  pct: number;
  foot: string;
  tone: 'violet' | 'emerald';
  alert?: boolean;
}) {
  const bar = tone === 'violet' ? 'from-violet-500 to-fuchsia-500' : 'from-emerald-600 to-emerald-400';
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        <Icon className="h-4 w-4" /> {label}
      </p>
      <p className="mt-1 truncate text-lg font-bold">{value}</p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-elevated"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct * 100)}
        aria-label={label}
      >
        <div className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', bar)} style={{ width: `${Math.round(pct * 100)}%` }} />
      </div>
      <p className={cn('mt-1.5 text-xs', alert ? 'font-semibold text-rose-500' : 'text-subtle')}>
        {Math.round(pct * 100)}% · {foot}
      </p>
    </Card>
  );
}
