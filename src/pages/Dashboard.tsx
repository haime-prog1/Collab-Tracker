import { useMemo } from 'react';
import { Link } from 'react-router';
import { format } from 'date-fns';
import { ArrowRight, CalendarClock, CheckCircle2, Plus, Rocket, Sparkles } from 'lucide-react';
import { useCollabs, useStages } from '@/hooks/useStore';
import { ACTIVE_STAGES } from '@/lib/constants';
import { DUE_TONE_CLASS, dueInfo, parseDate } from '@/lib/format';
import { loadSampleData } from '@/db/seed';
import { ui } from '@/state/ui';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { EarningsSummary } from '@/components/finance/EarningsSummary';
import { InstallBanner } from '@/components/pwa/InstallBanner';
import { BackupReminder } from '@/components/BackupReminder';
import { cn } from '@/lib/cn';

interface Upcoming {
  key: string;
  collabId: string;
  title: string;
  partner: string;
  date: string;
}

export default function Dashboard() {
  const collabs = useCollabs();
  const { visible } = useStages();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    collabs.forEach((c) => m.set(c.stage, (m.get(c.stage) ?? 0) + 1));
    return m;
  }, [collabs]);

  const upcoming = useMemo<Upcoming[]>(() => {
    const items: Upcoming[] = [];
    for (const c of collabs) {
      if (!ACTIVE_STAGES.includes(c.stage)) continue;
      for (const d of c.deliverables) {
        if (!d.done && d.dueDate) items.push({ key: d.id, collabId: c.id, title: d.title, partner: c.partnerName, date: d.dueDate });
      }
      if (c.deadline && !c.deliverables.some((d) => d.dueDate === c.deadline)) {
        items.push({ key: `${c.id}-deadline`, collabId: c.id, title: c.title, partner: c.partnerName, date: c.deadline });
      }
    }
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  }, [collabs]);

  const recentlyPublished = useMemo(
    () =>
      collabs
        .filter((c) => c.publishedAt)
        .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
        .slice(0, 3),
    [collabs],
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-5">
      <InstallBanner />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{format(new Date(), 'EEEE, MMMM d')}</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{greeting} ✨</h1>
        </div>
        <Button variant="primary" className="hidden md:inline-flex" onClick={() => ui.openEditor()}>
          <Plus className="h-4 w-4" /> New collab
        </Button>
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
          <EarningsSummary />

          <section aria-label="Pipeline overview">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted">Pipeline</h2>
              <Link to="/pipeline" className="inline-flex items-center gap-1 text-sm font-medium text-neon">
                Open board <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:grid md:grid-cols-7 md:px-0">
              {visible.map((s) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.id}
                    to="/pipeline"
                    onClick={() => ui.setFilters({ stages: [s.id] })}
                    className="flex w-28 shrink-0 flex-col gap-2 rounded-2xl bg-surface p-3 ring-1 ring-line transition hover:ring-neon/40 active:scale-95 md:w-auto"
                  >
                    <Icon className={cn('h-5 w-5', s.text)} />
                    <span key={counts.get(s.id) ?? 0} className="animate-pop text-2xl font-bold tabular-nums">
                      {counts.get(s.id) ?? 0}
                    </span>
                    <span className="truncate text-xs text-muted">{s.short}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-4">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <CalendarClock className="h-5 w-5 text-amber-300" /> Up next
              </h2>
              {upcoming.length === 0 ? (
                <p className="flex items-center gap-2 py-6 text-sm text-muted">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Nothing due. Enjoy the breather!
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {upcoming.map((u) => {
                    const due = dueInfo(u.date);
                    return (
                      <li key={u.key}>
                        <button
                          type="button"
                          onClick={() => ui.openEditor(u.collabId)}
                          className="flex min-h-14 w-full items-center gap-3 py-2 text-left transition hover:opacity-80"
                        >
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-elevated text-center ring-1 ring-line">
                            <span className="text-[10px] uppercase leading-none text-subtle">{format(parseDate(u.date)!, 'MMM')}</span>
                            <span className="text-base font-bold leading-none">{format(parseDate(u.date)!, 'd')}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{u.title}</p>
                            <p className="truncate text-xs text-muted">{u.partner}</p>
                          </div>
                          <span className={cn('shrink-0 text-xs font-medium', DUE_TONE_CLASS[due.tone])}>{due.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card className="p-4">
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <Rocket className="h-5 w-5 text-emerald-400" /> Recently published
              </h2>
              {recentlyPublished.length === 0 ? (
                <p className="py-6 text-sm text-muted">Ship your first collab and it'll show up here 🚀</p>
              ) : (
                <ul className="space-y-2">
                  {recentlyPublished.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => ui.openEditor(c.id)}
                        className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-emerald-500/5 p-3 text-left ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/10"
                      >
                        <Rocket className="h-5 w-5 shrink-0 text-emerald-400" />
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
        </>
      )}
    </div>
  );
}
