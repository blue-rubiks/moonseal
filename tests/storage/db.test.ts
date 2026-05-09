import { describe, it, expect, beforeEach } from 'vitest';
import { getDB, DB_NAME, DB_VERSION, OBJECT_STORES } from '../../src/lib/storage/db';

describe('db', () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase(DB_NAME);
  });

  it('opens DB with the configured version and stores', async () => {
    const db = await getDB();
    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(DB_VERSION);
    for (const store of OBJECT_STORES) {
      expect(db.objectStoreNames.contains(store)).toBe(true);
    }
  });

  it('returns the same instance on subsequent calls', async () => {
    const db1 = await getDB();
    const db2 = await getDB();
    expect(db1).toBe(db2);
  });
});
