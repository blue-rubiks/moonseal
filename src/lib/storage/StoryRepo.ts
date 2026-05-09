import { getDB, type CustomStoryRecord as RawRecord } from './db';
import type { StorySegment } from '../story/types';

export interface CustomStoryRecord extends Omit<RawRecord, 'segments'> {
  segments: StorySegment[];
}

export interface SaveStoryInput {
  id?: string;
  name: string;
  segments: StorySegment[];
}

export class StoryRepo {
  async save(input: SaveStoryInput): Promise<CustomStoryRecord> {
    const db = await getDB();
    const id = input.id ?? crypto.randomUUID();
    const existing = (await db.get('customStories', id)) as CustomStoryRecord | undefined;
    const now = Date.now();
    const totalDurationSec = input.segments.reduce((sum, s) => sum + s.durationSec, 0);
    const record: CustomStoryRecord = {
      id,
      nameKey: input.name,
      description: '',
      builtin: false,
      segments: input.segments,
      totalDurationSec,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    await db.put('customStories', record);
    return record;
  }

  async getById(id: string): Promise<CustomStoryRecord | undefined> {
    const db = await getDB();
    const row = await db.get('customStories', id);
    return row as CustomStoryRecord | undefined;
  }

  async listAll(): Promise<CustomStoryRecord[]> {
    const db = await getDB();
    const all = (await db.getAll('customStories')) as CustomStoryRecord[];
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('customStories', id);
  }
}

export const storyRepo = new StoryRepo();
