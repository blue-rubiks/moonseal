import { getDB, type MixRecord } from './db';
import { uuid } from '../util/uuid';

export interface SaveMixInput {
  id?: string;
  name: string;
  tracks: Array<{ soundId: string; volume: number }>;
}

export class MixRepo {
  async save(input: SaveMixInput): Promise<MixRecord> {
    const db = await getDB();
    const id = input.id ?? uuid();
    const existing = await db.get('mixes', id);
    const record: MixRecord = {
      id,
      name: input.name,
      tracks: input.tracks,
      createdAt: existing?.createdAt ?? Date.now()
    };
    await db.put('mixes', record);
    return record;
  }

  async getById(id: string): Promise<MixRecord | undefined> {
    const db = await getDB();
    return db.get('mixes', id);
  }

  async listAll(): Promise<MixRecord[]> {
    const db = await getDB();
    const all = await db.getAll('mixes');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('mixes', id);
  }
}

export const mixRepo = new MixRepo();
