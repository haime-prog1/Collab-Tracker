import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { closeDB } from '@/db/client';
import { buildBackup, parseBackup, restoreBackup } from '@/db/backup';
import { sampleData } from '@/db/seed';
import { clearAll, hydrate, saveCollab, store, writeDataset } from '@/db/store';
import { newCollab } from '@/db/factories';

beforeEach(async () => {
  await closeDB();
  globalThis.indexedDB = new IDBFactory();
  await hydrate();
});

describe('backup', () => {
  it('round-trips through JSON (export → wipe → restore)', async () => {
    await writeDataset(sampleData(), 'replace');
    const before = store.getSnapshot();
    const json = JSON.stringify(buildBackup());
    await clearAll();
    expect(store.getSnapshot().collabs).toHaveLength(0);

    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await restoreBackup(parsed.dataset, 'replace');
    const after = store.getSnapshot();
    expect(after.collabs).toEqual(before.collabs);
    expect(after.brands).toEqual(before.brands);
  });

  it('merge keeps the newest version of each record', async () => {
    const c = await saveCollab(newCollab({ title: 'Local newer' }));
    const older = { ...c, title: 'Backup older', updatedAt: '2000-01-01T00:00:00.000Z' };
    const fresh = newCollab({ title: 'Only in backup' });
    await restoreBackup({ collabs: [older, fresh], brands: [] }, 'merge');
    const titles = store.getSnapshot().collabs.map((x) => x.title).sort();
    expect(titles).toEqual(['Local newer', 'Only in backup']);
  });

  it('rejects invalid files with a readable error', () => {
    expect(parseBackup('not json')).toMatchObject({ ok: false, error: expect.stringMatching(/not valid JSON/) });
    expect(parseBackup('{"app":"other"}')).toMatchObject({ ok: false, error: expect.stringMatching(/not a Collab Tracker/) });
    const future = JSON.stringify({ ...buildBackup(), schemaVersion: 999 });
    expect(parseBackup(future)).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) });
  });

  it('tolerates unknown enum values by falling back to safe defaults', () => {
    const b = buildBackup();
    const c = newCollab({ title: 'X' });
    const raw = { ...b, data: { ...b.data, collabs: [{ ...c, stage: 'mystery', platforms: ['myspace'] }] } };
    const r = parseBackup(JSON.stringify(raw));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dataset.collabs[0].stage).toBe('inbox');
      expect(r.dataset.collabs[0].platforms).toEqual([]);
    }
  });
});
