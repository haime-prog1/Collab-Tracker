import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Building2, Plus, Search, UsersRound } from 'lucide-react';
import { useBrands, useCollabs, useSettings } from '@/hooks/useStore';
import { BRAND_KINDS } from '@/lib/constants';
import { formatMoney } from '@/lib/format';
import { normalize } from '@/lib/search';
import { ACTIVE_STAGES } from '@/lib/constants';
import { PageHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { BrandEditor } from '@/components/brands/BrandEditor';
import type { BrandKind } from '@/types/models';

export default function Brands() {
  const brands = useBrands();
  const collabs = useCollabs();
  const { currency } = useSettings();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<BrandKind | 'all'>('all');
  const [tag, setTag] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const stats = useMemo(() => {
    const m = new Map<string, { total: number; active: number; earned: number }>();
    for (const c of collabs) {
      if (!c.brandId) continue;
      const s = m.get(c.brandId) ?? { total: 0, active: 0, earned: 0 };
      s.total++;
      if (ACTIVE_STAGES.includes(c.stage)) s.active++;
      s.earned += c.compensation.filter((i) => i.status === 'paid' && i.currency === currency).reduce((a, i) => a + i.amount, 0);
      m.set(c.brandId, s);
    }
    return m;
  }, [collabs, currency]);

  const allTags = useMemo(() => [...new Set(brands.flatMap((b) => b.nicheTags))].sort(), [brands]);

  const list = useMemo(() => {
    const nq = normalize(q);
    return brands.filter(
      (b) =>
        (kind === 'all' || b.kind === kind) &&
        (!tag || b.nicheTags.includes(tag)) &&
        (!nq ||
          normalize([b.name, ...b.nicheTags, ...b.contacts.flatMap((c) => [c.name, c.email ?? '']), ...Object.values(b.socials)].join(' ')).includes(nq)),
    );
  }, [brands, q, kind, tag]);

  return (
    <div>
      <PageHeader
        title="Brands & contacts"
        subtitle={`${brands.length} in your directory`}
        actions={
          <Button variant="primary" onClick={() => setEditorOpen(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        }
      />
      {brands.length === 0 ? (
        <EmptyState icon={UsersRound} title="No brands yet" action={<Button variant="primary" onClick={() => setEditorOpen(true)}><Plus className="h-4 w-4" /> Add a brand</Button>}>
          Brands are also added automatically when you create a collab.
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 space-y-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <span className="sr-only">Search brands</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search names, contacts, handles, niches…"
                className="h-11 w-full rounded-xl bg-elevated pl-10 pr-3 ring-1 ring-line placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-neon/70"
              />
            </label>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none md:mx-0 md:flex-wrap md:px-0">
              <Chip active={kind === 'all'} onClick={() => setKind('all')}>All</Chip>
              {(Object.keys(BRAND_KINDS) as BrandKind[]).map((k) => (
                <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
                  {BRAND_KINDS[k]}s
                </Chip>
              ))}
              {allTags.map((t) => (
                <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                  #{t}
                </Chip>
              ))}
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((b) => {
              const s = stats.get(b.id);
              return (
                <li key={b.id}>
                  <Link
                    to={`/brands/${b.id}`}
                    className="flex h-full animate-fade-up flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line transition hover:ring-neon/40 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/30 to-emerald-500/20 text-lg font-bold ring-1 ring-line">
                        {b.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{b.name}</p>
                        <p className="truncate text-xs text-muted">
                          {BRAND_KINDS[b.kind]}
                          {b.contacts[0] && ` · ${b.contacts[0].name}`}
                        </p>
                      </div>
                      {!!s?.active && <span className="rounded-full bg-neon/15 px-2 py-0.5 text-xs font-semibold text-violet-400">{s.active} active</span>}
                    </div>
                    {b.nicheTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {b.nicheTags.map((t) => (
                          <span key={t} className="rounded-full bg-elevated px-2 py-0.5 text-[11px] text-muted ring-1 ring-line">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" /> {s?.total ?? 0} collab{s?.total === 1 ? '' : 's'}
                      </span>
                      {!!s?.earned && <span className="font-semibold text-emerald-400">{formatMoney(s.earned, currency)} earned</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {list.length === 0 && <p className="py-10 text-center text-sm text-muted">No brands match.</p>}
        </>
      )}
      <BrandEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
    </div>
  );
}
