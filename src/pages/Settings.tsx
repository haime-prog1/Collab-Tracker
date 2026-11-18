import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { Database, Download, Eye, EyeOff, HardDrive, Moon, Smartphone, Sun, SunMoon, Trash2, Upload, Wand2 } from 'lucide-react';
import { useSnapshot, useStages } from '@/hooks/useStore';
import { clearAll, updateSettings } from '@/db/store';
import { exportBackup, parseBackup, restoreBackup, type ParseResult } from '@/db/backup';
import { loadSampleData } from '@/db/seed';
import { storageStatus } from '@/db/client';
import { CURRENCIES } from '@/lib/constants';
import type { ThemePref } from '@/types/models';
import { Card, PageHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { confirm } from '@/components/ui/confirm';
import { toast } from '@/components/ui/toast';
import { InstallButton } from '@/components/pwa/InstallButton';
import { isStandalone } from '@/hooks/useInstallPrompt';
import { cn } from '@/lib/cn';

export default function Settings() {
  const { settings, collabs, brands } = useSnapshot();
  const { all } = useStages();
  const { hash } = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Extract<ParseResult, { ok: true }> | null>(null);
  const [storage, setStorage] = useState<Awaited<ReturnType<typeof storageStatus>>>(null);

  useEffect(() => {
    void storageStatus().then(setStorage);
  }, [collabs.length]);

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  const onExport = async () => {
    try {
      const r = await exportBackup();
      toast(`Backup saved (${r.count} collabs)`, { tone: 'success' });
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast('Export failed. Please try again.', { tone: 'error' });
    }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    const result = parseBackup(await file.text());
    if (fileRef.current) fileRef.current.value = '';
    if (!result.ok) return toast(result.error, { tone: 'error', duration: 6000 });
    setPending(result);
  };

  const doRestore = async (mode: 'replace' | 'merge') => {
    if (!pending) return;
    if (mode === 'replace') {
      const ok = await confirm({
        title: 'Replace all data?',
        message: `Everything currently on this device (${collabs.length} collabs, ${brands.length} brands) will be replaced by the backup.`,
        confirmLabel: 'Replace',
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await restoreBackup(pending.dataset, mode);
      toast(`Restored ${pending.dataset.collabs.length} collabs & ${pending.dataset.brands.length} brands`, { tone: 'success' });
      setPending(null);
    } catch {
      toast('Restore failed — your existing data was not changed.', { tone: 'error' });
    }
  };

  const themes: { value: ThemePref; label: ReactNode }[] = [
    { value: 'dark', label: <><Moon className="h-4 w-4" /> Dark</> },
    { value: 'light', label: <><Sun className="h-4 w-4" /> Light</> },
    { value: 'system', label: <><SunMoon className="h-4 w-4" /> Auto</> },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Settings" />

      <Card id="backup" className="scroll-mt-24 p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Database className="h-5 w-5 text-neon" /> Backup & restore
        </h2>
        <p className="mt-1 text-sm text-muted">
          Your data lives only on this device. Export a JSON backup regularly — and before clearing browser data or switching phones.
        </p>
        <p className="mt-2 text-xs text-subtle">
          Last backup:{' '}
          <b className={cn(!settings.lastBackupAt && 'text-amber-400')}>
            {settings.lastBackupAt ? formatDistanceToNow(new Date(settings.lastBackupAt), { addSuffix: true }) : 'never'}
          </b>
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button variant="primary" onClick={onExport}>
            <Download className="h-4 w-4" /> Export JSON backup
          </Button>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Restore from file
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="font-semibold">Preferences</h2>
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Theme</p>
          <Segmented<ThemePref> className="w-full [&>button]:flex-1" value={settings.theme} onChange={(theme) => void updateSettings({ theme })} options={themes} />
        </div>
        <Field label="Display currency" hint="Totals are shown in this currency. Amounts in other currencies are listed separately (no conversion).">
          {(id) => (
            <Select id={id} value={settings.currency} onChange={(e) => void updateSettings({ currency: e.target.value })}>
              {[...new Set([settings.currency, ...CURRENCIES])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          )}
        </Field>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold">Pipeline stages</h2>
        <p className="mt-1 text-sm text-muted">Rename stages to match your workflow, or hide ones you don't use.</p>
        <ul className="mt-3 space-y-2">
          {all.map((s) => {
            const o = settings.stageOverrides[s.id] ?? {};
            const Icon = s.icon;
            return (
              <li key={s.id} className={cn('flex items-center gap-2', o.hidden && 'opacity-50')}>
                <Icon className={cn('h-5 w-5 shrink-0', s.text)} />
                <Input
                  aria-label={`Label for ${s.id} stage`}
                  defaultValue={o.label ?? ''}
                  placeholder={s.label}
                  onBlur={(e) => {
                    const label = e.target.value.trim() || undefined;
                    if (label !== o.label) void updateSettings({ stageOverrides: { ...settings.stageOverrides, [s.id]: { ...o, label } } });
                  }}
                  className="h-10"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={o.hidden ? `Show ${s.label}` : `Hide ${s.label}`}
                  aria-pressed={!o.hidden}
                  onClick={() => void updateSettings({ stageOverrides: { ...settings.stageOverrides, [s.id]: { ...o, hidden: !o.hidden } } })}
                >
                  {o.hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Smartphone className="h-5 w-5 text-emerald-400" /> App & storage
        </h2>
        <ul className="space-y-1 text-sm text-muted">
          <li>Installed: <b className="text-fg">{isStandalone() ? 'Yes' : 'No (running in browser)'}</b></li>
          {storage && (
            <>
              <li>
                Persistent storage:{' '}
                <b className={storage.persisted ? 'text-emerald-400' : 'text-amber-400'}>{storage.persisted ? 'Granted' : 'Not granted (browser may evict data)'}</b>
              </li>
              <li className="flex items-center gap-1">
                <HardDrive className="h-4 w-4" /> Using {(storage.usage / 1024).toFixed(0)} KB
              </li>
            </>
          )}
          <li>{collabs.length} collabs · {brands.length} brands</li>
        </ul>
        <InstallButton />
      </Card>

      <Card className="space-y-2 p-4">
        <h2 className="font-semibold">Data</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={async () => { await loadSampleData(); toast('Sample data added', { tone: 'success' }); }}>
            <Wand2 className="h-4 w-4" /> Add sample data
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              const ok = await confirm({ title: 'Erase everything?', message: 'All collabs, brands and settings on this device will be deleted. Export a backup first if you might need them.', confirmLabel: 'Erase all', danger: true });
              if (ok) { await clearAll(); toast('All data erased'); }
            }}
          >
            <Trash2 className="h-4 w-4" /> Erase all data
          </Button>
        </div>
      </Card>

      <p className="pb-4 text-center text-xs text-subtle">Collab Tracker v{__APP_VERSION__} · 100% offline · No accounts, no tracking</p>

      <Sheet
        center
        open={!!pending}
        onClose={() => setPending(null)}
        title="Restore backup"
        footer={
          <>
            <Button className="flex-1" onClick={() => void doRestore('merge')}>Merge</Button>
            <Button className="flex-1" variant="primary" onClick={() => void doRestore('replace')}>Replace all</Button>
          </>
        }
      >
        {pending && (
          <div className="space-y-3 text-sm">
            <p>
              Backup from <b>{new Date(pending.meta.exportedAt).toLocaleString()}</b> contains{' '}
              <b>{pending.dataset.collabs.length}</b> collabs and <b>{pending.dataset.brands.length}</b> brands.
            </p>
            <ul className="space-y-1 text-muted">
              <li><b className="text-fg">Merge</b> — add new records; for ones on both, keep the most recently edited.</li>
              <li><b className="text-fg">Replace all</b> — make this device match the backup exactly.</li>
            </ul>
          </div>
        )}
      </Sheet>
    </div>
  );
}
