import { useMemo, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import type { Collab, CollabKind, Priority, StageId } from '@/types/models';
import { COLLAB_KIND_IDS, PLATFORM_IDS, PRIORITY_IDS } from '@/types/models';
import { COLLAB_KINDS, PLATFORMS, PRIORITIES } from '@/lib/constants';
import { deleteCollab, saveBrand, saveCollab } from '@/db/store';
import { newBrand, newCollab } from '@/db/factories';
import { useBrands, useCollabs, useSettings, useStages } from '@/hooks/useStore';
import { ui, useUI } from '@/state/ui';
import { normalize } from '@/lib/search';
import { uid } from '@/lib/id';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Chip, Segmented } from '@/components/ui/Chip';
import { confirm } from '@/components/ui/confirm';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { DeliverablesEditor } from './DeliverablesEditor';
import { MoneyEditor } from './MoneyEditor';

type Tab = 'overview' | 'deliverables' | 'money' | 'notes';

/** Global create/edit sheet, driven by `ui.openEditor()`. */
export function CollabEditorHost() {
  const editor = useUI((s) => s.editor);
  const collabs = useCollabs();
  const existing = editor.collabId ? collabs.find((c) => c.id === editor.collabId) : undefined;
  if (!editor.open) return null;
  // Remount per target so the draft resets cleanly.
  return <CollabEditor key={editor.collabId ?? 'new'} existing={existing} defaults={editor.defaults} />;
}

function CollabEditor({ existing, defaults }: { existing?: Collab; defaults?: { stage?: StageId; brandId?: string } }) {
  const brands = useBrands();
  const { currency } = useSettings();
  const { all, labels } = useStages();
  const [tab, setTab] = useState<Tab>('overview');
  const [draft, setDraft] = useState<Collab>(() => {
    if (existing) return structuredClone(existing);
    const brand = defaults?.brandId ? brands.find((b) => b.id === defaults.brandId) : undefined;
    return newCollab({ stage: defaults?.stage ?? 'inbox', brandId: brand?.id, partnerName: brand?.name ?? '' });
  });
  const [saveToDirectory, setSaveToDirectory] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const set = (patch: Partial<Collab>) => setDraft((d) => ({ ...d, ...patch }));

  const matchedBrand = useMemo(
    () => brands.find((b) => normalize(b.name) === normalize(draft.partnerName)),
    [brands, draft.partnerName],
  );
  const dirty = !existing || JSON.stringify(existing) !== JSON.stringify(draft);
  const valid = draft.title.trim() || draft.partnerName.trim();

  const close = async () => {
    if (dirty && valid) {
      const ok = await confirm({ title: 'Discard changes?', message: 'Your edits to this collab will be lost.', confirmLabel: 'Discard', danger: true });
      if (!ok) return;
    }
    ui.closeEditor();
  };

  const save = async () => {
    if (!valid) {
      toast('Add a brand/creator name or a title first.', { tone: 'error' });
      return;
    }
    let brandId = matchedBrand?.id;
    const partnerName = draft.partnerName.trim();
    if (!brandId && partnerName && saveToDirectory) {
      const kind = draft.kind === 'peer_collab' ? 'creator' : 'brand';
      brandId = (await saveBrand(newBrand({ name: partnerName, kind }))).id;
    }
    const tags = tagInput.trim() ? [...new Set([...draft.tags, tagInput.trim()])] : draft.tags;
    await saveCollab({
      ...draft,
      title: draft.title.trim() || `${partnerName} collab`,
      partnerName,
      brandId,
      tags,
      deliverables: draft.deliverables.filter((d) => d.title.trim() || d.link),
      perks: draft.perks.filter((p) => p.description.trim()),
    });
    if (!existing) toast(`Added “${draft.title.trim() || partnerName}” to ${labels[draft.stage]}`, { tone: 'success' });
    ui.closeEditor();
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: 'Delete collab?',
      message: `“${existing.title}” and its deliverables & payments will be removed from this device.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await deleteCollab(existing.id);
    ui.closeEditor();
    toast('Collab deleted', {
      action: { label: 'Undo', onClick: () => void saveCollab(existing) },
    });
  };

  const duplicate = async () => {
    const copy = newCollab({
      ...structuredClone(draft),
      id: uid(),
      title: `${draft.title} (copy)`,
      stage: 'inbox',
      publishedAt: undefined,
      deliverables: draft.deliverables.map((d) => ({ ...d, id: uid(), done: false, link: undefined })),
      compensation: draft.compensation.map((c) => ({ ...c, id: uid(), status: 'unpaid', paidAt: undefined, invoicedAt: undefined })),
      perks: draft.perks.map((p) => ({ ...p, id: uid(), received: false, receivedAt: undefined })),
    });
    copy.stageHistory = [{ stage: 'inbox', at: copy.createdAt }];
    await saveCollab(copy);
    toast('Duplicated to Inbox', { tone: 'success' });
    ui.closeEditor();
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'deliverables', label: 'Deliverables', count: draft.deliverables.length },
    { id: 'money', label: 'Money & perks', count: draft.compensation.length + draft.perks.length },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <Sheet
      open
      onClose={close}
      title={existing ? existing.title || 'Edit collab' : 'New collab'}
      footer={
        <>
          {existing && (
            <>
              <Button size="icon" variant="danger" aria-label="Delete collab" onClick={remove}>
                <Trash2 className="h-5 w-5" />
              </Button>
              <Button size="icon" aria-label="Duplicate collab" onClick={duplicate}>
                <Copy className="h-5 w-5" />
              </Button>
            </>
          )}
          <Button className="flex-1" onClick={close}>
            Cancel
          </Button>
          <Button className="flex-1" variant="primary" onClick={save} disabled={!dirty}>
            {existing ? 'Save' : 'Add collab'}
          </Button>
        </>
      }
    >
      <div role="tablist" className="-mx-5 -mt-4 mb-4 flex gap-1 overflow-x-auto border-b border-line px-5 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative h-12 shrink-0 px-3 text-sm font-medium transition',
              tab === t.id ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {t.label}
            {!!t.count && <span className="ml-1.5 text-xs text-subtle">{t.count}</span>}
            {tab === t.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-neon" />}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <Field
            label="Brand / creator"
            hint={
              draft.partnerName.trim() &&
              (matchedBrand ? (
                <span className="text-emerald-400">Linked to {matchedBrand.name} in your directory</span>
              ) : (
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={saveToDirectory} onChange={(e) => setSaveToDirectory(e.target.checked)} className="h-4 w-4 accent-violet-500" />
                  Add “{draft.partnerName.trim()}” to the brand directory
                </label>
              ))
            }
          >
            {(id) => (
              <>
                <Input
                  id={id}
                  list="ct-brand-names"
                  autoComplete="off"
                  autoFocus={!existing}
                  value={draft.partnerName}
                  placeholder="e.g. Nova Audio"
                  onChange={(e) => set({ partnerName: e.target.value, brandId: undefined })}
                />
                <datalist id="ct-brand-names">
                  {brands.map((b) => (
                    <option key={b.id} value={b.name} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Title">
            {(id) => <Input id={id} value={draft.title} placeholder="e.g. Q3 product launch integration" onChange={(e) => set({ title: e.target.value })} />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              {(id) => (
                <Select id={id} value={draft.kind} onChange={(e) => set({ kind: e.target.value as CollabKind })}>
                  {COLLAB_KIND_IDS.map((k) => (
                    <option key={k} value={k}>
                      {COLLAB_KINDS[k]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Stage">
              {(id) => (
                <Select id={id} value={draft.stage} onChange={(e) => set({ stage: e.target.value as StageId })}>
                  {all.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Platforms</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_IDS.map((p) => (
                <Chip
                  key={p}
                  active={draft.platforms.includes(p)}
                  onClick={() =>
                    set({ platforms: draft.platforms.includes(p) ? draft.platforms.filter((x) => x !== p) : [...draft.platforms, p] })
                  }
                >
                  {PLATFORMS[p].label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Priority</p>
            <Segmented<Priority>
              className="w-full [&>button]:flex-1"
              value={draft.priority}
              onChange={(priority) => set({ priority })}
              options={PRIORITY_IDS.map((p) => ({ value: p, label: <span className={PRIORITIES[p].color}>{PRIORITIES[p].label}</span> }))}
            />
          </div>
          <Field label="Deliverables deadline">
            {(id) => <Input id={id} type="date" value={draft.deadline ?? ''} onChange={(e) => set({ deadline: e.target.value || undefined })} />}
          </Field>
          <Field label="Tags" hint="Press Enter to add">
            {(id) => (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-elevated p-2 ring-1 ring-line focus-within:ring-2 focus-within:ring-neon/70">
                {draft.tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set({ tags: draft.tags.filter((x) => x !== t) })}
                    className="rounded-full bg-neon/15 px-2.5 py-1 text-xs font-medium text-violet-400 hover:bg-rose-500/15 hover:text-rose-400"
                    aria-label={`Remove tag ${t}`}
                  >
                    #{t} ×
                  </button>
                ))}
                <input
                  id={id}
                  value={tagInput}
                  enterKeyHint="enter"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      set({ tags: [...new Set([...draft.tags, tagInput.trim()])] });
                      setTagInput('');
                    }
                  }}
                  placeholder="launch, evergreen…"
                  className="h-8 min-w-24 flex-1 bg-transparent px-1 focus:outline-none"
                />
              </div>
            )}
          </Field>
        </div>
      )}

      {tab === 'deliverables' && <DeliverablesEditor items={draft.deliverables} onChange={(deliverables) => set({ deliverables })} />}

      {tab === 'money' && (
        <MoneyEditor compensation={draft.compensation} perks={draft.perks} currency={currency} onChange={(patch) => set(patch)} />
      )}

      {tab === 'notes' && (
        <div className="space-y-4">
          <Field label="Notes">
            {(id) => (
              <Textarea
                id={id}
                rows={8}
                value={draft.notes ?? ''}
                placeholder="Talking points, contract terms, exclusivity windows, usage-rights duration…"
                onChange={(e) => set({ notes: e.target.value || undefined })}
              />
            )}
          </Field>
          {existing && existing.stageHistory.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Stage history</p>
              <ol className="space-y-1.5 border-l border-line pl-4 text-sm">
                {[...existing.stageHistory].reverse().map((h, i) => (
                  <li key={i} className="relative">
                    <span className={cn('absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full', all.find((s) => s.id === h.stage)?.dot)} />
                    <span className="font-medium">{labels[h.stage]}</span>{' '}
                    <span className="text-subtle">· {new Date(h.at).toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
