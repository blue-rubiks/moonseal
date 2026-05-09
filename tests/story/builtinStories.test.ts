import { describe, it, expect } from 'vitest';
import { BUILTIN_STORY_IDS } from '../../src/lib/story/builtinStories';

describe('builtinStories', () => {
  it('exposes 5 ids', () => {
    expect(BUILTIN_STORY_IDS).toHaveLength(5);
  });
});
