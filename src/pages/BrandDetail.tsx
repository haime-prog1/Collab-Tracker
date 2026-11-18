import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, AtSign, Globe, Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { useBrand, useCollabs, useSettings } from '@/hooks/useStore';
import { BRAND_KINDS } from '@/lib/constants';
import { formatMoney } from '@/lib/format';
import { deleteBrand } from '@/db/store';
import { ui } from '@/state/ui';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { confirm } from '@/components/ui/confirm';
import { toast } from '@/components/ui/toast';
import { CollabCard } from '@/components/pipeline/CollabCard';
import { BrandEditor } from '@/components/brands/BrandEditor';
import { Building2 } from 'lucide-react';

const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

export default function BrandDetail() {
  const { id } = useParams();
  const brand = useBrand(id);
  const collabs = useCollabs();
  const { currency } = useSettings();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const history = useMemo(
    () => collabs.filter((c) => c.brandId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [collabs, id],
  );
  const totals = useMemo(() => {
    let earned = 0;
    let pending = 0;
    for (const c of history)
      for (const i of c.compensation) {
        if (i.currency !== currency) continue;
        if (i.status === 'paid') earned += i.amount;
        else pending += i.amount;
      }
    return { earned, pending };
  }, [history, currency]);

  if (!brand) {
    return (
      <EmptyState icon={Building2} title="Brand not found" action={<Button onClick={() => navigate('/brands')}>Back to brands</Button>}>
        It may have been deleted.
      </EmptyState>
    );
  }

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${brand.name}?`,
      message: history.length
        ? `Its ${history.length} collab(s) will be kept but unlinked from the directory.`
        : 'This removes the brand and its contacts.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await deleteBrand(brand.id);
    toast('Brand deleted');
    navigate('/brands');
  };

  const socials = Object.entries(brand.socials).filter(([, v]) => v);

  return (
    <div className="space-y-5">
      <Link to="/brands" className="inline-flex h-11 items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Brands
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/40 to-emerald-500/30 text-2xl font-bold ring-1 ring-line">
          {brand.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">{brand.name}</h1>
          <p className="text-sm text-muted">
            {BRAND_KINDS[brand.kind]}
            {brand.nicheTags.length > 0 && ` · ${brand.nicheTags.map((t) => `#${t}`).join(' ')}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="danger" aria-label="Delete brand" onClick={remove}>
            <Trash2 className="h-5 w-5" />
          </Button>
          <Button onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted">Collabs</p>
          <p className="text-xl font-bold">{history.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">Earned</p>
          <p className="truncate text-xl font-bold text-emerald-400">{formatMoney(totals.earned, currency, true)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">Pending</p>
          <p className="truncate text-xl font-bold text-amber-300">{formatMoney(totals.pending, currency, true)}</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <Card className="p-4">
            <h2 className="mb-3 font-semibold">Contacts</h2>
            {brand.contacts.length === 0 ? (
              <p className="text-sm text-muted">No contacts yet.</p>
            ) : (
              <ul className="space-y-3">
                {brand.contacts.map((c) => (
                  <li key={c.id} className="rounded-xl bg-elevated/60 p-3 ring-1 ring-line">
                    <p className="font-medium">{c.name}</p>
                    {c.role && <p className="text-xs text-muted">{c.role}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface px-3 text-xs font-medium text-neon ring-1 ring-line">
                          <Mail className="h-3.5 w-3.5" /> {c.email}
                        </a>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface px-3 text-xs font-medium text-neon ring-1 ring-line">
                          <Phone className="h-3.5 w-3.5" /> {c.phone}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {(socials.length > 0 || brand.notes) && (
            <Card className="space-y-3 p-4">
              {socials.length > 0 && (
                <div>
                  <h2 className="mb-2 font-semibold">Socials</h2>
                  <ul className="space-y-1.5 text-sm">
                    {socials.map(([k, v]) => (
                      <li key={k} className="flex items-center gap-2">
                        {k === 'website' ? <Globe className="h-4 w-4 text-subtle" /> : <AtSign className="h-4 w-4 text-subtle" />}
                        <span className="w-20 capitalize text-muted">{k}</span>
                        {k === 'website' ? (
                          <a href={safeUrl(v!)} target="_blank" rel="noreferrer noopener" className="truncate text-neon">
                            {v}
                          </a>
                        ) : (
                          <span className="truncate">{v}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {brand.notes && (
                <div>
                  <h2 className="mb-1 font-semibold">Notes</h2>
                  <p className="whitespace-pre-wrap text-sm text-muted">{brand.notes}</p>
                </div>
              )}
            </Card>
          )}
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Collaboration history</h2>
            <Button size="sm" variant="primary" onClick={() => ui.openEditor(undefined, { brandId: brand.id })}>
              <Plus className="h-4 w-4" /> New collab
            </Button>
          </div>
          {history.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">No collabs with {brand.name} yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {history.map((c) => (
                <CollabCard key={c.id} collab={c} showStage onClick={() => ui.openEditor(c.id)} />
              ))}
            </div>
          )}
        </section>
      </div>

      <BrandEditor brand={brand} open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}
