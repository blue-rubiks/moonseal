import { describe, it, expect } from 'vitest';

describe('test infrastructure', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('has fake-indexeddb', () => {
    expect(typeof indexedDB).toBe('object');
    expect(indexedDB).not.toBeNull();
  });

  it('has jsdom DOM globals', () => {
    expect(typeof document).toBe('object');
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement);
  });
});
