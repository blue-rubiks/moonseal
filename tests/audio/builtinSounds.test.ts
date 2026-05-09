import { describe, it, expect } from 'vitest';
import { BUILTIN_SOUNDS, getSoundById } from '../../src/lib/audio/builtinSounds';

describe('builtinSounds', () => {
  it('exposes 8 sound definitions', () => {
    expect(BUILTIN_SOUNDS).toHaveLength(8);
  });

  it('has all expected sound ids', () => {
    const ids = BUILTIN_SOUNDS.map((s) => s.id).sort();
    expect(ids).toEqual([
      'birds', 'fireplace', 'ocean', 'rain', 'stream', 'thunder', 'white', 'wind'
    ]);
  });

  it('marks white as synth and others as file', () => {
    const white = getSoundById('white');
    expect(white?.type).toBe('synth');
    expect(white?.flavor).toBe('white');
    expect(getSoundById('ocean')?.type).toBe('file');
  });

  it('returns undefined for unknown id', () => {
    expect(getSoundById('does-not-exist')).toBeUndefined();
  });

  it('every file-type sound has a src', () => {
    for (const s of BUILTIN_SOUNDS) {
      if (s.type === 'file') expect(s.src).toMatch(/\.mp3$/);
    }
  });
});
