import { useState } from 'react';
import { Plus, Trash2, UserRound } from 'lucide-react';
import type { Brand, BrandKind, Contact, SocialKey } from '@/types/models';
import { BRAND_KIND_IDS, SOCIAL_KEYS } from '@/types/models';
import { BRAND_KINDS } from '@/lib/constants';
import { newBrand } from '@/db/factories';
import { saveBrand } from '@/db/store';
import { useBrands } from '@/hooks/useStore';
import { normalize } from '@/lib/search';
import { uid } from '@/lib/id';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Chip';
import { toast } from '@/components/ui/toast';

const SOCIAL_LABELS: Record<SocialKey, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  twitch: 'Twitch',
  x: 'X / Twitter',
  website: 'Website',
};

export function BrandEditor({ brand, open, onClose, onSaved }: { brand?: Brand; open: boolean; onClose: () => void; onSaved?: (b: Brand) => void }) {
  if (!open) return null;
  return <BrandForm key={brand?.id ?? 'new'} brand={brand} onClose={onClose} onSaved={onSaved} />;
}

function BrandForm({ brand, onClose, onSaved }: { brand?: Brand; onClose: () => void; onSaved?: (b: Brand) => void }) {
  const brands = useBrands();
  const [draft, setDraft] = useState<Brand>(() => (brand ? structuredClone(brand) : newBrand()));
  const [tags, setTags] = useState(draft.nicheTags.join(', '));
  const set = (patch: Partial<Brand>) => setDraft((d) => ({ ...d, ...patch }));
  const setContact = (id: string, patch: Partial<Contact>) =>
    set({ contacts: draft.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const save = async () => {
    const name = draft.name.trim();
    if (!name) return toast('Give the brand a name.', { tone: 'error' });
    if (brands.some((b) => b.id !== draft.id && normalize(b.name) === normalize(name))) {
      return toast(`“${name}” is already in your directory.`, { tone: 'error' });
    }
    const saved = await saveBrand({
      ...draft,
      name,
      nicheTags: [...new Set(tags.split(',').map((t) => t.trim()).filter(Boolean))],
      contacts: draft.contacts.filter((c) => c.name.trim() || c.email?.trim()),
      socials: Object.fromEntries(Object.entries(draft.socials).filter(([, v]) => v?.trim())),
    });
    toast(brand ? 'Brand updated' : `${name} added to directory`, { tone: 'success' });
    onSaved?.(saved);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={brand ? `Edit ${brand.name}` : 'New brand / contact'}
      footer={
        <>
          <Button className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" variant="primary" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">{(id) => <Input id={id} autoFocus={!brand} value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Brand, agency or creator" />}</Field>
        <Segmented<BrandKind>
          className="w-full [&>button]:flex-1"
          value={draft.kind}
          onChange={(kind) => set({ kind })}
          options={BRAND_KIND_IDS.map((k) => ({ value: k, label: BRAND_KINDS[k] }))}
        />
        <Field label="Niche tags" hint="Comma separated, e.g. tech, gaming, beauty">
          {(id) => <Input id={id} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tech, lifestyle" />}
        </Field>

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Contacts</h3>
          <ul className="space-y-2">
            {draft.contacts.map((c) => (
              <li key={c.id} className="space-y-2 rounded-2xl bg-elevated/60 p-3 ring-1 ring-line">
                <div className="flex gap-2">
                  <Input aria-label="Contact name" value={c.name} placeholder="Name" onChange={(e) => setContact(c.id, { name: e.target.value })} className="h-10 flex-1 bg-surface" />
                  <button
                    type="button"
                    aria-label="Remove contact"
                    onClick={() => set({ contacts: draft.contacts.filter((x) => x.id !== c.id) })}
                    className="grid h-10 w-10 place-items-center rounded-lg text-subtle hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Input aria-label="Role" value={c.role ?? ''} placeholder="Role (e.g. Partnerships Manager)" onChange={(e) => setContact(c.id, { role: e.target.value || undefined })} className="h-10 bg-surface" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input aria-label="Email" type="email" inputMode="email" autoComplete="off" value={c.email ?? ''} placeholder="Email" onChange={(e) => setContact(c.id, { email: e.target.value || undefined })} className="h-10 bg-surface" />
                  <Input aria-label="Phone" type="tel" inputMode="tel" value={c.phone ?? ''} placeholder="Phone" onChange={(e) => setContact(c.id, { phone: e.target.value || undefined })} className="h-10 bg-surface" />
                </div>
              </li>
            ))}
          </ul>
          <Button size="sm" className="mt-2" onClick={() => set({ contacts: [...draft.contacts, { id: uid(), name: '' }] })}>
            <UserRound className="h-4 w-4" /> <Plus className="-ml-1 h-3 w-3" /> Add contact
          </Button>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Social handles</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {SOCIAL_KEYS.map((k) => (
              <label key={k} className="flex flex-col gap-1 text-xs text-subtle">
                {SOCIAL_LABELS[k]}
                <Input
                  value={draft.socials[k] ?? ''}
                  inputMode={k === 'website' ? 'url' : 'text'}
                  placeholder={k === 'website' ? 'https://…' : '@handle'}
                  onChange={(e) => set({ socials: { ...draft.socials, [k]: e.target.value } })}
                  className="h-10"
                />
              </label>
            ))}
          </div>
        </section>

        <Field label="Notes">
          {(id) => <Textarea id={id} value={draft.notes ?? ''} onChange={(e) => set({ notes: e.target.value || undefined })} placeholder="Rates, preferences, red flags…" />}
        </Field>
      </div>
    </Sheet>
  );
}
