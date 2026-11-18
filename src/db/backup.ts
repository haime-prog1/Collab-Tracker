import { z } from 'zod';
import {
  BRAND_KIND_IDS,
  COLLAB_KIND_IDS,
  COMPENSATION_TYPE_IDS,
  PAYMENT_STATUS_IDS,
  PLATFORM_IDS,
  PRIORITY_IDS,
  STAGE_IDS,
  type Brand,
  type Collab,
  type Settings,
} from '@/types/models';
import { DB_VERSION } from './schema';
import { DEFAULT_SETTINGS } from './factories';
import { store, updateSettings, writeDataset, type Dataset } from './store';
import { nowISO } from '@/lib/id';
import { toISODate } from '@/lib/format';

export const BACKUP_APP_ID = 'collab-tracker';

const opt = <T extends z.ZodType>(s: T) => s.optional().catch(undefined);
const str = z.string();
const dateTime = z.string().min(1);

const deliverable = z.object({
  id: str,
  title: z.string().default(''),
  platform: opt(z.enum(PLATFORM_IDS)),
  dueDate: opt(str),
  done: z.boolean().default(false),
  link: opt(str),
  notes: opt(str),
});

const compensation = z.object({
  id: str,
  type: z.enum(COMPENSATION_TYPE_IDS).catch('other'),
  label: opt(str),
  amount: z.coerce.number().catch(0),
  currency: z.string().default('USD'),
  status: z.enum(PAYMENT_STATUS_IDS).catch('unpaid'),
  dueDate: opt(str),
  invoicedAt: opt(str),
  paidAt: opt(str),
});

const perk = z.object({
  id: str,
  description: z.string().default(''),
  estimatedValue: opt(z.coerce.number()),
  received: z.boolean().default(false),
  receivedAt: opt(str),
});

export const collabSchema = z.object({
  id: str,
  title: z.string().default(''),
  kind: z.enum(COLLAB_KIND_IDS).catch('sponsorship'),
  brandId: opt(str),
  partnerName: z.string().default(''),
  platforms: z.array(z.enum(PLATFORM_IDS)).catch([]),
  stage: z.enum(STAGE_IDS).catch('inbox'),
  stageOrder: z.coerce.number().catch(0),
  priority: z.enum(PRIORITY_IDS).catch('medium'),
  deadline: opt(str),
  deliverables: z.array(deliverable).default([]),
  compensation: z.array(compensation).default([]),
  perks: z.array(perk).default([]),
  notes: opt(str),
  tags: z.array(str).default([]),
  stageHistory: z.array(z.object({ stage: z.enum(STAGE_IDS), at: dateTime })).catch([]),
  createdAt: dateTime,
  updatedAt: dateTime,
  publishedAt: opt(str),
});

export const brandSchema = z.object({
  id: str,
  name: z.string().default(''),
  kind: z.enum(BRAND_KIND_IDS).catch('brand'),
  website: opt(str),
  contacts: z
    .array(z.object({ id: str, name: z.string().default(''), role: opt(str), email: opt(str), phone: opt(str) }))
    .default([]),
  socials: z.record(z.string(), z.string()).catch({}),
  nicheTags: z.array(str).default([]),
  notes: opt(str),
  createdAt: dateTime,
  updatedAt: dateTime,
});

const settingsSchema = z
  .object({
    currency: z.string().catch(DEFAULT_SETTINGS.currency),
    theme: z.enum(['dark', 'light', 'system']).catch('dark'),
    view: z.enum(['kanban', 'table']).catch('kanban'),
    stageOverrides: z
      .record(z.string(), z.object({ label: opt(str), hidden: opt(z.boolean()) }))
      .catch({}),
    lastBackupAt: opt(str),
    installDismissedAt: opt(str),
    onboarded: z.boolean().catch(true),
    updatedAt: z.string().catch(() => nowISO()),
  })
  .partial();

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.object({
    collabs: z.array(collabSchema),
    brands: z.array(brandSchema),
    settings: opt(settingsSchema),
  }),
});

export type BackupFile = z.infer<typeof backupSchema>;

export function buildBackup(): BackupFile {
  const { collabs, brands, settings } = store.getSnapshot();
  return {
    app: BACKUP_APP_ID,
    schemaVersion: DB_VERSION,
    exportedAt: nowISO(),
    data: { collabs, brands, settings },
  };
}

export const backupFileName = (d = new Date()) => `collab-tracker-backup-${toISODate(d)}.json`;

/**
 * Save the backup to a local file. Uses a plain download link; on iOS standalone PWAs, where
 * downloads are unreliable, falls back to the Web Share sheet ("Save to Files").
 */
export async function exportBackup(): Promise<{ method: 'download' | 'share'; count: number }> {
  const backup = buildBackup();
  const json = JSON.stringify(backup, null, 2);
  const name = backupFileName();
  const file = new File([json], name, { type: 'application/json' });
  const isIOSStandalone =
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    ((navigator as Navigator & { standalone?: boolean }).standalone ||
      matchMedia('(display-mode: standalone)').matches);

  let method: 'download' | 'share' = 'download';
  if (isIOSStandalone && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: name });
    method = 'share';
  } else {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  await updateSettings({ lastBackupAt: nowISO() });
  return { method, count: backup.data.collabs.length };
}

export type ParseResult =
  | { ok: true; dataset: Dataset; meta: { exportedAt: string; schemaVersion: number } }
  | { ok: false; error: string };

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.join('.') || 'file';
    if (first?.path[0] === 'app') return { ok: false, error: 'This is not a Collab Tracker backup file.' };
    return { ok: false, error: `Backup is invalid at "${where}": ${first?.message ?? 'unknown error'}` };
  }
  const { data, exportedAt, schemaVersion } = parsed.data;
  if (schemaVersion > DB_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of Collab Tracker. Update the app first.' };
  }
  const settings: Settings | undefined = data.settings
    ? ({ ...DEFAULT_SETTINGS, ...data.settings, id: 'app' } as Settings)
    : undefined;
  return {
    ok: true,
    dataset: { collabs: data.collabs as Collab[], brands: data.brands as Brand[], settings },
    meta: { exportedAt, schemaVersion },
  };
}

export async function restoreBackup(dataset: Dataset, mode: 'replace' | 'merge') {
  await writeDataset(dataset, mode);
}
