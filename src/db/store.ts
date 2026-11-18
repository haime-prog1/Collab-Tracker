/**
 * Reactive, optimistic store on top of IndexedDB.
 *
 * - The whole dataset lives in an immutable in-memory snapshot (a creator's data is small),
 *   so reads are synchronous and React renders instantly via useSyncExternalStore.
 * - Every mutation updates the snapshot first, notifies subscribers, then persists in a single
 *   IDB transaction. If the write fails we re-hydrate from disk (rollback) and report the error.
 * - A BroadcastChannel keeps other open tabs/windows in sync.
 */
import type { Brand, Collab, Settings, StageId } from '@/types/models';
import { nowISO } from '@/lib/id';
import { getDB, requestPersistence } from './client';
import { DEFAULT_SETTINGS } from './factories';

export interface Snapshot {
  ready: boolean;
  collabs: Collab[];
  brands: Brand[];
  settings: Settings;
}

type Listener = () => void;
type ErrorListener = (err: unknown) => void;
type StageChangeListener = (collab: Collab, from: StageId) => void;

let state: Snapshot = { ready: false, collabs: [], brands: [], settings: DEFAULT_SETTINGS };
const listeners = new Set<Listener>();
const errorListeners = new Set<ErrorListener>();
const stageListeners = new Set<StageChangeListener>();

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('collab-tracker') : null;
channel?.addEventListener('message', (e) => {
  if (e.data === 'changed') void hydrate();
});

const sortCollabs = (c: Collab[]) => [...c].sort((a, b) => a.stageOrder - b.stageOrder);
const sortBrands = (b: Brand[]) => [...b].sort((x, y) => x.name.localeCompare(y.name));

function setState(next: Snapshot) {
  state = next;
  listeners.forEach((l) => l());
}

export const store = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => state,
  onError(l: ErrorListener) {
    errorListeners.add(l);
    return () => errorListeners.delete(l);
  },
  /** Fires when a collab lands in a new stage (used for the "Published" celebration). */
  onStageChange(l: StageChangeListener) {
    stageListeners.add(l);
    return () => stageListeners.delete(l);
  },
};

export async function hydrate(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['collabs', 'brands', 'settings'], 'readonly');
  const [collabs, brands, settings] = await Promise.all([
    tx.objectStore('collabs').getAll(),
    tx.objectStore('brands').getAll(),
    tx.objectStore('settings').get('app'),
  ]);
  await tx.done;
  setState({
    ready: true,
    collabs: sortCollabs(collabs),
    brands: sortBrands(brands),
    settings: { ...DEFAULT_SETTINGS, ...settings },
  });
}

async function commit(next: Snapshot, persist: () => Promise<void>) {
  setState(next);
  try {
    await persist();
    channel?.postMessage('changed');
    void requestPersistence();
  } catch (err) {
    errorListeners.forEach((l) => l(err));
    await hydrate().catch(() => undefined);
    throw err;
  }
}

/* ----------------------------------- Collabs ----------------------------------- */

export async function saveCollab(input: Collab): Promise<Collab> {
  const prev = state.collabs.find((c) => c.id === input.id);
  const now = nowISO();
  let collab: Collab = { ...input, updatedAt: now };
  if (prev && prev.stage !== collab.stage) collab = withStage(collab, collab.stage, now);
  if (collab.brandId) {
    const brand = state.brands.find((b) => b.id === collab.brandId);
    if (brand) collab.partnerName = brand.name;
  }
  const collabs = prev
    ? state.collabs.map((c) => (c.id === collab.id ? collab : c))
    : sortCollabs([...state.collabs, collab]);
  await commit({ ...state, collabs }, async () => {
    await (await getDB()).put('collabs', collab);
  });
  if (prev && prev.stage !== collab.stage) stageListeners.forEach((l) => l(collab, prev.stage));
  return collab;
}

function withStage(c: Collab, stage: StageId, at: string): Collab {
  const last = c.stageHistory[c.stageHistory.length - 1];
  return {
    ...c,
    stage,
    stageHistory: last?.stage === stage && last.at === at ? c.stageHistory : [...c.stageHistory, { stage, at }],
    publishedAt: stage === 'published' && !c.publishedAt ? at : c.publishedAt,
  };
}

/**
 * Move a collab to `stage`, placed just before `beforeId` in that column (end when omitted/not found).
 * Anchoring on a neighbour (not an index) stays correct when the board is showing a filtered subset.
 * Re-numbers stageOrder for the target column and persists every changed row in one transaction.
 */
export async function moveCollab(id: string, stage: StageId, beforeId?: string | null): Promise<void> {
  const moving = state.collabs.find((c) => c.id === id);
  if (!moving) return;
  const now = nowISO();
  const column = state.collabs.filter((c) => c.stage === stage && c.id !== id);
  const anchor = beforeId ? column.findIndex((c) => c.id === beforeId) : -1;
  const at = anchor === -1 ? column.length : anchor;
  const moved = moving.stage === stage ? moving : withStage(moving, stage, now);
  column.splice(at, 0, moved);

  const changed = new Map<string, Collab>();
  column.forEach((c, i) => {
    const order = (i + 1) * 1024;
    if (c.stageOrder !== order || c.id === id) {
      changed.set(c.id, { ...c, stageOrder: order, updatedAt: c.id === id ? now : c.updatedAt });
    }
  });
  if (changed.size === 0) return;
  const collabs = sortCollabs(state.collabs.map((c) => changed.get(c.id) ?? c));
  await commit({ ...state, collabs }, async () => {
    const tx = (await getDB()).transaction('collabs', 'readwrite');
    await Promise.all([...changed.values()].map((c) => tx.store.put(c)));
    await tx.done;
  });
  const after = changed.get(id)!;
  if (moving.stage !== stage) stageListeners.forEach((l) => l(after, moving.stage));
}

export async function deleteCollab(id: string): Promise<void> {
  await commit({ ...state, collabs: state.collabs.filter((c) => c.id !== id) }, async () => {
    await (await getDB()).delete('collabs', id);
  });
}

/* ----------------------------------- Brands ----------------------------------- */

export async function saveBrand(input: Brand): Promise<Brand> {
  const brand: Brand = { ...input, updatedAt: nowISO() };
  const prev = state.brands.find((b) => b.id === brand.id);
  const brands = sortBrands(prev ? state.brands.map((b) => (b.id === brand.id ? brand : b)) : [...state.brands, brand]);
  // Keep denormalized partner names in sync when a brand is renamed.
  const renamed =
    prev && prev.name !== brand.name
      ? state.collabs.filter((c) => c.brandId === brand.id).map((c) => ({ ...c, partnerName: brand.name }))
      : [];
  const collabs = renamed.length
    ? state.collabs.map((c) => renamed.find((r) => r.id === c.id) ?? c)
    : state.collabs;
  await commit({ ...state, brands, collabs }, async () => {
    const tx = (await getDB()).transaction(['brands', 'collabs'], 'readwrite');
    await tx.objectStore('brands').put(brand);
    await Promise.all(renamed.map((c) => tx.objectStore('collabs').put(c)));
    await tx.done;
  });
  return brand;
}

/** Deletes a brand. Linked collabs are kept but unlinked (their partnerName text remains). */
export async function deleteBrand(id: string): Promise<void> {
  const unlinked = state.collabs
    .filter((c) => c.brandId === id)
    .map((c) => ({ ...c, brandId: undefined, updatedAt: nowISO() }));
  const collabs = state.collabs.map((c) => unlinked.find((u) => u.id === c.id) ?? c);
  await commit({ ...state, brands: state.brands.filter((b) => b.id !== id), collabs }, async () => {
    const tx = (await getDB()).transaction(['brands', 'collabs'], 'readwrite');
    await tx.objectStore('brands').delete(id);
    await Promise.all(unlinked.map((c) => tx.objectStore('collabs').put(c)));
    await tx.done;
  });
}

/* ----------------------------------- Settings ----------------------------------- */

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const settings: Settings = { ...state.settings, ...patch, id: 'app', updatedAt: nowISO() };
  if (patch.theme) {
    try {
      localStorage.setItem('ct-theme', patch.theme);
    } catch {
      /* private mode */
    }
  }
  await commit({ ...state, settings }, async () => {
    await (await getDB()).put('settings', settings);
  });
}

/* ----------------------------------- Bulk (restore) ----------------------------------- */

export interface Dataset {
  collabs: Collab[];
  brands: Brand[];
  settings?: Settings;
}

/** Replace or merge the full dataset in a single transaction. Merge: newest `updatedAt` wins per id. */
export async function writeDataset(data: Dataset, mode: 'replace' | 'merge'): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['collabs', 'brands', 'settings'], 'readwrite');
  const collabsStore = tx.objectStore('collabs');
  const brandsStore = tx.objectStore('brands');
  const ops: Promise<unknown>[] = [];
  if (mode === 'replace') {
    ops.push(collabsStore.clear(), brandsStore.clear());
    data.collabs.forEach((c) => ops.push(collabsStore.put(c)));
    data.brands.forEach((b) => ops.push(brandsStore.put(b)));
    if (data.settings) ops.push(tx.objectStore('settings').put({ ...data.settings, id: 'app' }));
  } else {
    const newer = <T extends { id: string; updatedAt: string }>(existing: T[], incoming: T[]) => {
      const byId = new Map(existing.map((e) => [e.id, e]));
      return incoming.filter((i) => {
        const e = byId.get(i.id);
        return !e || i.updatedAt > e.updatedAt;
      });
    };
    newer(state.collabs, data.collabs).forEach((c) => ops.push(collabsStore.put(c)));
    newer(state.brands, data.brands).forEach((b) => ops.push(brandsStore.put(b)));
  }
  await Promise.all(ops);
  await tx.done;
  if (data.settings?.theme && mode === 'replace') {
    try {
      localStorage.setItem('ct-theme', data.settings.theme);
    } catch {
      /* ignore */
    }
  }
  await hydrate();
  channel?.postMessage('changed');
}

export async function clearAll(): Promise<void> {
  await writeDataset({ collabs: [], brands: [], settings: { ...DEFAULT_SETTINGS, onboarded: true } }, 'replace');
}
