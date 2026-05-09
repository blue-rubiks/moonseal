import { describe, it, expect, beforeEach } from 'vitest';
import { MixRepo } from '../../src/lib/storage/MixRepo';
import { _resetForTests } from '../../src/lib/storage/db';

describe('MixRepo', () => {
  beforeEach(async () => {
    await _resetForTests();
  });

  it('save() and getById() round-trip a mix', async () => {
    const repo = new MixRepo();
    const created = await repo.save({
      name: 'Cozy night',
      tracks: [{ soundId: 'rain', volume: 0.6 }, { soundId: 'fireplace', volume: 0.4 }]
    });
    const found = await repo.getById(created.id);
    expect(found?.name).toBe('Cozy night');
    expect(found?.tracks).toHaveLength(2);
  });

  it('listAll() sorts newest first', async () => {
    const repo = new MixRepo();
    await repo.save({ name: 'A', tracks: [] });
    await new Promise((r) => setTimeout(r, 5));
    await repo.save({ name: 'B', tracks: [] });
    const all = await repo.listAll();
    expect(all[0]?.name).toBe('B');
  });

  it('delete() removes a mix', async () => {
    const repo = new MixRepo();
    const m = await repo.save({ name: 'Test', tracks: [] });
    await repo.delete(m.id);
    expect(await repo.getById(m.id)).toBeUndefined();
  });
});
