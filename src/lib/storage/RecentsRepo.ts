import { getDB, type RecentRecord } from './db';
import { uuid } from '../util/uuid';

export const MAX_RECENTS = 20;

export type RecentType = RecentRecord['type'];

let lastPlayedAt = 0;
function nextPlayedAt(): number {
  const now = Date.now();
  lastPlayedAt = now > lastPlayedAt ? now : lastPlayedAt + 1;
  return lastPlayedAt;
}

export class RecentsRepo {
  async push(type: RecentType, refId: string): Promise<void> {
    const db = await getDB();
    const all = await db.getAll('recents');
    for (const r of all) {
      if (r.type === type && r.refId === refId) {
        await db.delete('recents', r.id);
      }
    }
    const record: RecentRecord = {
      id: uuid(),
      type,
      refId,
      playedAt: nextPlayedAt()
    };
    await db.put('recents', record);
    const fresh = await db.getAll('recents');
    fresh.sort((a, b) => b.playedAt - a.playedAt);
    for (const r of fresh.slice(MAX_RECENTS)) {
      await db.delete('recents', r.id);
    }
  }

  async listRecent(): Promise<RecentRecord[]> {
    const db = await getDB();
    const all = await db.getAll('recents');
    return all.sort((a, b) => b.playedAt - a.playedAt);
  }

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('recents');
  }

  async removeByRef(type: RecentType, refId: string): Promise<void> {
    const db = await getDB();
    const all = await db.getAll('recents');
    for (const r of all) {
      if (r.type === type && r.refId === refId) {
        await db.delete('recents', r.id);
      }
    }
  }
}

export const recentsRepo = new RecentsRepo();
