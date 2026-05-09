import { describe, it, expect, beforeEach } from 'vitest';
import { RecentsRepo, MAX_RECENTS } from '../../src/lib/storage/RecentsRepo';
import { _resetForTests } from '../../src/lib/storage/db';

describe('RecentsRepo', () => {
  beforeEach(async () => {
    await _resetForTests();
  });

  it('push() records a play and listRecent() returns it newest-first', async () => {
    const repo = new RecentsRepo();
    await repo.push('sound', 'ocean');
    await new Promise((r) => setTimeout(r, 5));
    await repo.push('story', 'seaside-walk');
    const list = await repo.listRecent();
    expect(list).toHaveLength(2);
    expect(list[0]?.refId).toBe('seaside-walk');
    expect(list[1]?.refId).toBe('ocean');
  });

  it('truncates beyond MAX_RECENTS', async () => {
    const repo = new RecentsRepo();
    for (let i = 0; i < MAX_RECENTS + 5; i++) {
      await repo.push('sound', `s-${i}`);
      await new Promise((r) => setTimeout(r, 1));
    }
    const list = await repo.listRecent();
    expect(list.length).toBe(MAX_RECENTS);
    expect(list[0]?.refId).toBe(`s-${MAX_RECENTS + 4}`);
  });

  it('pushing same refId again moves it to top (no duplicates)', async () => {
    const repo = new RecentsRepo();
    await repo.push('sound', 'ocean');
    await repo.push('sound', 'rain');
    await repo.push('sound', 'ocean');
    const list = await repo.listRecent();
    expect(list).toHaveLength(2);
    expect(list[0]?.refId).toBe('ocean');
  });
});
