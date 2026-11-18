import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, runMigrations, type CollabDB } from './schema';

let dbPromise: Promise<IDBPDatabase<CollabDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<CollabDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CollabDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, tx) {
        runMigrations(db, oldVersion, newVersion ?? DB_VERSION, tx);
      },
      blocking() {
        // A newer version of the app opened the DB in another tab: release our handle so it can upgrade.
        dbPromise?.then((db) => db.close());
        dbPromise = null;
      },
      terminated() {
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

/** Test helper: drop the cached connection. */
export async function closeDB() {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

let persistRequested = false;
/** Ask the browser not to evict our storage (important on iOS / low-disk Android). */
export async function requestPersistence(): Promise<boolean> {
  if (persistRequested || typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  persistRequested = true;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function storageStatus() {
  if (typeof navigator === 'undefined' || !navigator.storage) return null;
  try {
    const [persisted, estimate] = await Promise.all([
      navigator.storage.persisted?.() ?? Promise.resolve(false),
      navigator.storage.estimate?.() ?? Promise.resolve({} as StorageEstimate),
    ]);
    return { persisted, usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
  } catch {
    return null;
  }
}
