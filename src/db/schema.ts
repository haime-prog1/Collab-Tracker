import type { DBSchema, IDBPDatabase, IDBPTransaction, StoreNames } from 'idb';
import type { Brand, Collab, Settings } from '@/types/models';

export const DB_NAME = 'collab-tracker';
export const DB_VERSION = 1;

export interface CollabDB extends DBSchema {
  collabs: {
    key: string;
    value: Collab;
    indexes: { by_stage: string; by_brand: string; by_updated: string };
  };
  brands: {
    key: string;
    value: Brand;
    indexes: { by_name: string };
  };
  settings: {
    key: string;
    value: Settings;
  };
}

type UpgradeTx = IDBPTransaction<CollabDB, StoreNames<CollabDB>[], 'versionchange'>;

/**
 * Ordered migrations. Each entry upgrades the DB *to* that version.
 * Never edit a shipped migration — append a new one and bump DB_VERSION.
 */
const migrations: Record<number, (db: IDBPDatabase<CollabDB>, tx: UpgradeTx) => void> = {
  1: (db) => {
    const collabs = db.createObjectStore('collabs', { keyPath: 'id' });
    collabs.createIndex('by_stage', 'stage');
    collabs.createIndex('by_brand', 'brandId');
    collabs.createIndex('by_updated', 'updatedAt');
    const brands = db.createObjectStore('brands', { keyPath: 'id' });
    brands.createIndex('by_name', 'name');
    db.createObjectStore('settings', { keyPath: 'id' });
  },
};

export function runMigrations(db: IDBPDatabase<CollabDB>, oldVersion: number, newVersion: number, tx: UpgradeTx) {
  for (let v = oldVersion + 1; v <= newVersion; v++) migrations[v]?.(db, tx);
}
