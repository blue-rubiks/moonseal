import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

export const DB_NAME = 'whitenoise-app';
export const DB_VERSION = 1;
export const OBJECT_STORES = [
  'customStories',
  'favorites',
  'mixes',
  'recents',
  'settings'
] as const;

export interface CustomStoryRecord {
  id: string;
  nameKey: string;
  description: string;
  builtin: false;
  segments: unknown[];
  totalDurationSec: number;
  createdAt: number;
  updatedAt: number;
}

export interface FavoriteRecord {
  id: string;
  type: 'sound' | 'mix' | 'story';
  refId: string;
  addedAt: number;
}

export interface MixRecord {
  id: string;
  name: string;
  tracks: Array<{ soundId: string; volume: number }>;
  createdAt: number;
}

export interface RecentRecord {
  id: string;
  type: 'sound' | 'mix' | 'story';
  refId: string;
  playedAt: number;
}

export interface SettingsRecord {
  key: string;
  value: unknown;
}

interface AppSchema extends DBSchema {
  customStories: { key: string; value: CustomStoryRecord; indexes: { 'by-updated': number } };
  favorites:     { key: string; value: FavoriteRecord;    indexes: { 'by-type': string; 'by-added': number } };
  mixes:         { key: string; value: MixRecord;         indexes: { 'by-created': number } };
  recents:       { key: string; value: RecentRecord;      indexes: { 'by-played': number } };
  settings:      { key: string; value: SettingsRecord };
}

let dbPromise: Promise<IDBPDatabase<AppSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<AppSchema>> {
  dbPromise ??= openDB<AppSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('customStories')) {
        const s = db.createObjectStore('customStories', { keyPath: 'id' });
        s.createIndex('by-updated', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('favorites')) {
        const s = db.createObjectStore('favorites', { keyPath: 'id' });
        s.createIndex('by-type', 'type');
        s.createIndex('by-added', 'addedAt');
      }
      if (!db.objectStoreNames.contains('mixes')) {
        const s = db.createObjectStore('mixes', { keyPath: 'id' });
        s.createIndex('by-created', 'createdAt');
      }
      if (!db.objectStoreNames.contains('recents')) {
        const s = db.createObjectStore('recents', { keyPath: 'id' });
        s.createIndex('by-played', 'playedAt');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    }
  });
  return dbPromise;
}

export function _resetForTests(): void {
  dbPromise = null;
}
