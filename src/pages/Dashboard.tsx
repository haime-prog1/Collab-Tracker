import { useMemo } from 'react';
import { Link } from 'react-router';
import { addDays, format, startOfMonth } from 'date-fns';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  DatabaseBackup,
  KanbanSquare,
  Plus,
  Rocket,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useCollabs, useSettings, useStages } from '@/hooks/useStore';
import { useEvents } from '@/hooks/useEvents';
import { ACTIVE_STAGES } from '@/lib/constants';
import { formatMoney, toISODate } from '@/lib/format';
import { COMMITTED_STAGES } from '@/lib/finance';
import { EVENT_GROUP, groupByDate } from '@/lib/calendar';
import { loadSampleData } from '@/db/seed';
import { ui } from '@/state/ui';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { EarningsSummary } from '@/components/finance/EarningsSummary';
import { InstallBanner } from '@/components/pwa/InstallBanner';
import { BackupReminder } from '@/components/BackupReminder';
import { EventRow } from '@/components/calendar/EventRow';
import { KIND_META } from '@/components/calendar/eventStyle';
import { cn } from '@/lib/cn';

export default function Dashboard() {
  const collabs = useCollabs();
  const events = useEvents();
  const { currency } = useSettings();
  const { visible } = useStages();
  const today = toISODate(new Date());
  const weekEnd = toISODate(addDays(new Date(), 6));

  const kpis = useMemo(() => {
    const active = collabs.filter((c) => ACTIVE_STAGES.includes(c.stage)).length;
    const dueSoon = events.filter((e) => EVENT_GROUP[e.kind] === 'work' && e.status !== 'done' && e.date <= weekEnd).length;
    let owed = 0;
    let owedCount = 0;
    for (const c of collabs) {
      if (!COMMITTED_STAGES.includes(c.stage)) continue;
      for (const i of c.compensation) if (i.status !== 'paid' && i.currency === currency) { owed += i.amount; owedCount++; }
    }
    const monthStart = startOfMonth(new Date()).toISOString();
    const publishedThisMonth = collabs.filter((c) => c.publishedAt && c.publishedAt >= monthStart).length;
    return { active, dueSoon, owed, owedCount, publishedThisMonth };
  }, [collabs, events, currency, weekEnd]);

  const byDate = useMemo(() => groupByDate(events), [events]);
  const week = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  const workNext = useMemo(
    () => events.filter((e) => EVENT_GROUP[e.kind] === 'work' && e.status !== 'done').slice(0, 5),
    [events],
  );
  const toChase = useMemo(
    () => events.filter((e) => e.kind === 'payment_due').sort((a, b) => Number(b.status === 'overdue') - Number(a.status === 'overdue') || a.date.localeCompare(b.date)).slice(0, 5),
    [events],
  );
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    collabs.forEach((c) => m.set(c.stage, (m.get(c.stage) ?? 0) + 1));
    return m;
  }, [collabs]);
  const recentlyPublished = useMemo(
    () => collabs.filter((c) => c.publishedAt).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')).slice(0, 3),
    [collabs],
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-5">
      <InstallBanner />
      <div>
        <p className="text-sm text-muted">{format(new Date(), 'EEEE, MMMM d')}</p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{greeting} ✨</h1>
        {collabs.length > 0 && (
          <p className="mt-1 text-sm text-muted">
            {kpis.dueSoon ? `${kpis.dueSoon} thing${kpis.dueSoon > 1 ? 's' : ''} due this week` : 'Nothing due this week'}
            {kpis.owedCount ? ` · ${formatMoney(kpis.owed, currency)} waiting to be paid` : ''}.
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:px-0">
        <Button variant="primary" onClick={() => ui.openEditor()}>
          <Plus className="h-4 w-4" /> New collab
        </Button>
        <QuickLink to="/calendar" icon={CalendarDays} label="Calendar" />
        <QuickLink to="/reports" icon={BarChart3} label="Generate report" />
        <QuickLink to="/settings#backup" icon={DatabaseBackup} label="Back up" />
      </div>

      <BackupReminder />

      {collabs.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Welcome to Collab Tracker"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={() => ui.openEditor()}>
                <Plus className="h-4 w-4" /> Add a collab
              </Button>
              <Button onClick={() => void loadSampleData()}>Explore with sample data</Button>
            </div>
          }
        >
          Your brand deals, sponsorships and creator collabs — all in one place, stored privately on this device and
          fully usable offline.
        </EmptyState>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi to="/pipeline" icon={KanbanSquare} tone="text-violet-500 dark:text-violet-400" label="Active deals" value={String(kpis.active)} hint="In the pipeline" />
            <Kpi to={`/calendar?date=${today}`} icon={Clock} tone="text-amber-600 dark:text-amber-300" label="Due in 7 days" value={String(kpis.dueSoon)} hint="Deliverables & deadlines" />
            <Kpi to="/finance" icon={Wallet} tone="text-emerald-600 dark:text-emerald-400" label="Awaiting payment" value={formatMoney(kpis.owed, currency, true)} hint={`${kpis.owedCount} open payment${kpis.owedCount === 1 ? '' : 's'}`} />
            <Kpi to="/reports" icon={Rocket} tone="text-fuchsia-600 dark:text-fuchsia-400" label="Published" value={String(kpis.publishedThisMonth)} hint="This month" />
          </div>

          {/* This week strip */}
          <Card className="p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">Next 7 days</h2>
              <Link to="/calendar" className="inline-flex items-center gap-1 text-sm font-medium text-neon">
                Calendar <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {week.map((d) => {
                const iso = toISODate(d);
                const list = byDate.get(iso) ?? [];
                return (
                  <Link
                    key={iso}
                    to={`/calendar?date=${iso}`}
                    aria-label={`${format(d, 'EEEE')}: ${list.length} item${list.length === 1 ? '' : 's'}`}
                    className={cn(
                      'flex min-h-20 flex-col items-center gap-1 rounded-xl py-2 transition hover:bg-elevated active:scale-95',
                      iso === today && 'bg-neon/10 ring-1 ring-neon/40',
                    )}
                  >
                    <span className="text-[11px] uppercase text-subtle">{format(d, 'EEE')}</span>
                    <span className={cn('text-lg font-bold', iso === today && 'text-neon')}>{format(d, 'd')}</span>
                    <span className="flex flex-wrap justify-center gap-0.5" aria-hidden>
                      {list.slice(0, 3).map((e) => <span key={e.id} className={cn('h-1.5 w-1.5 rounded-full', KIND_META[e.kind].dot, e.status === 'overdue' && 'bg-rose-500')} />)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 [&>*]:min-w-0">
            <EarningsSummary />
            <Card className="p-4">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Wallet className="h-5 w-5 text-amber-500" /> Payments to chase
                </h2>
                <Link to="/finance" className="text-sm font-medium text-neon">All payments</Link>
              </div>
              {toChase.length === 0 ? (
                <p className="flex items-center gap-2 py-6 text-sm text-muted">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> No payment due dates pending.
                </p>
              ) : (
                <div className="divide-y divide-line">{toChase.map((e) => <EventRow key={e.id} event={e} showDate />)}</div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 [&>*]:min-w-0">
            <Card className="p-4">
              <h2 className="mb-1 flex items-center gap-2 font-semibold">
                <Clock className="h-5 w-5 text-violet-500" /> Up next
              </h2>
              {workNext.length === 0 ? (
                <p className="flex items-center gap-2 py-6 text-sm text-muted">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Nothing due. Enjoy the breather!
                </p>
              ) : (
                <div className="divide-y divide-line">{workNext.map((e) => <EventRow key={e.id} event={e} showDate />)}</div>
              )}
            </Card>

            <div className="space-y-5">
              <section aria-label="Pipeline overview">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted">Pipeline</h2>
                  <Link to="/pipeline" className="inline-flex items-center gap-1 text-sm font-medium text-neon">
                    Open board <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4 xl:grid-cols-7">
                  {visible.map((s) => {
                    const Icon = s.icon;
                    return (
                      <Link
                        key={s.id}
                        to="/pipeline"
                        onClick={() => ui.setFilters({ stages: [s.id] })}
                        className="flex flex-col gap-1 rounded-2xl bg-surface p-2.5 ring-1 ring-line transition hover:ring-neon/40 active:scale-95"
                      >
                        <Icon className={cn('h-4 w-4', s.text)} />
                        <span className="text-xl font-bold tabular-nums">{counts.get(s.id) ?? 0}</span>
                        <span className="truncate text-[11px] text-muted">{s.short}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>

              <Card className="p-4">
                <h2 className="mb-3 flex items-center gap-2 font-semibold">
                  <Rocket className="h-5 w-5 text-emerald-500" /> Recently published
                </h2>
                {recentlyPublished.length === 0 ? (
                  <p className="py-4 text-sm text-muted">Ship your first collab and it'll show up here 🚀</p>
                ) : (
                  <ul className="space-y-2">
                    {recentlyPublished.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => ui.openEditor(c.id)}
                          className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-emerald-500/5 p-3 text-left ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/10"
                        >
                          <Rocket className="h-5 w-5 shrink-0 text-emerald-500" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{c.title}</p>
                            <p className="truncate text-xs text-muted">
                              {c.partnerName} · {format(new Date(c.publishedAt!), 'MMM d')}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-elevated px-4 text-sm font-medium ring-1 ring-line transition hover:bg-line/60 active:scale-[0.97]"
    >
      <Icon className="h-4 w-4 text-neon" /> {label}
    </Link>
  );
}

function Kpi({ to, icon: Icon, label, value, hint, tone }: { to: string; icon: LucideIcon; label: string; value: string; hint: string; tone: string }) {
  return (
    <Link to={to} className="group rounded-2xl bg-surface p-3.5 ring-1 ring-line transition hover:ring-neon/40 active:scale-[0.98]">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <Icon className={cn('h-4 w-4', tone)} /> {label}
      </p>
      <p key={value} className="mt-1 animate-fade-up truncate text-2xl font-bold tabular-nums">{value}</p>
      <p className="flex items-center justify-between text-xs text-subtle">
        {hint} <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
      </p>
    </Link>
  );
}
