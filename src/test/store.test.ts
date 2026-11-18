import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { closeDB, getDB } from '@/db/client';
import { newBrand, newCollab } from '@/db/factories';
import { deleteBrand, hydrate, moveCollab, saveBrand, saveCollab, store } from '@/db/store';

beforeEach(async () => {
  await closeDB();
  globalThis.indexedDB = new IDBFactory();
  await hydrate();
});

const ids = () => store.getSnapshot().collabs.filter((c) => c.stage === 'inbox').map((c) => c.title);

describe('store', () => {
  it('persists collabs and re-hydrates them', async () => {
    await saveCollab(newCollab({ title: 'A' }));
    await hydrate();
    expect(store.getSnapshot().collabs.map((c) => c.title)).toEqual(['A']);
  });

  it('notifies subscribers synchronously (optimistic)', async () => {
    const l = vi.fn();
    const off = store.subscribe(l);
    const p = saveCollab(newCollab({ title: 'B' }));
    expect(l).toHaveBeenCalled();
    expect(store.getSnapshot().collabs).toHaveLength(1);
    await p;
    off();
  });

  it('moves between stages, records history, and fires stage listeners', async () => {
    const c = await saveCollab(newCollab({ title: 'Deal' }));
    const onStage = vi.fn();
    const off = store.onStageChange(onStage);
    await moveCollab(c.id, 'published');
    const moved = store.getSnapshot().collabs[0];
    expect(moved.stage).toBe('published');
    expect(moved.publishedAt).toBeTruthy();
    expect(moved.stageHistory.map((h) => h.stage)).toEqual(['inbox', 'published']);
    expect(onStage).toHaveBeenCalledWith(expect.objectContaining({ id: c.id }), 'inbox');
    off();
    const db = await getDB();
    expect((await db.get('collabs', c.id))?.stage).toBe('published');
  });

  it('reorders within a column using a before-anchor', async () => {
    const a = await saveCollab(newCollab({ title: 'A', stageOrder: 1 }));
    await saveCollab(newCollab({ title: 'B', stageOrder: 2 }));
    const c = await saveCollab(newCollab({ title: 'C', stageOrder: 3 }));
    await moveCollab(c.id, 'inbox', a.id);
    expect(ids()).toEqual(['C', 'A', 'B']);
    await moveCollab(c.id, 'inbox', null);
    expect(ids()).toEqual(['A', 'B', 'C']);
  });

  it('cascades brand renames and unlinks on delete', async () => {
    const b = await saveBrand(newBrand({ name: 'Old' }));
    const c = await saveCollab(newCollab({ brandId: b.id, partnerName: 'Old' }));
    await saveBrand({ ...b, name: 'New' });
    expect(store.getSnapshot().collabs[0].partnerName).toBe('New');
    await deleteBrand(b.id);
    const after = store.getSnapshot().collabs.find((x) => x.id === c.id)!;
    expect(after.brandId).toBeUndefined();
    expect(after.partnerName).toBe('New');
  });
});
