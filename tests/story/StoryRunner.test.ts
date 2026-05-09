import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StoryRunner } from '../../src/lib/story/StoryRunner';
import type { StorySegment, StoryEvent } from '../../src/lib/story/types';

describe('StoryRunner', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  const segments: StorySegment[] = [
    { soundId: 'ocean',  durationSec: 5,  crossfadeSec: 2, volume: 0.7, poeticText: '海邊' },
    { soundId: 'birds',  durationSec: 5,  crossfadeSec: 2, volume: 0.7, poeticText: '鳥鳴' },
    { soundId: 'rain',   durationSec: 5,  crossfadeSec: 0, volume: 0.6, poeticText: '雨聲' }
  ];

  it('emits segment-start for each segment in order', async () => {
    const events: StoryEvent[] = [];
    const runner = new StoryRunner();
    runner.on((e) => events.push(e));

    const promise = runner.run(segments);

    expect(events.filter((e) => e.type === 'segment-start')).toHaveLength(1);
    expect((events[0] as { index: number }).index).toBe(0);

    await vi.advanceTimersByTimeAsync(5000);
    expect(events.filter((e) => e.type === 'segment-start')).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(5000);
    expect(events.filter((e) => e.type === 'segment-start')).toHaveLength(3);

    await vi.advanceTimersByTimeAsync(5000);
    await promise;
    expect(events.at(-1)?.type).toBe('story-end');
  });

  it('cancel() halts execution and emits cancelled', async () => {
    const events: StoryEvent[] = [];
    const runner = new StoryRunner();
    runner.on((e) => events.push(e));

    const promise = runner.run(segments);
    await vi.advanceTimersByTimeAsync(2000);
    runner.cancel();
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    expect(events.find((e) => e.type === 'cancelled')).toBeDefined();
    expect(events.find((e) => e.type === 'story-end')).toBeUndefined();
  });

  it('does not start a second run while one is active', async () => {
    const runner = new StoryRunner();
    const p1 = runner.run(segments);
    await expect(runner.run(segments)).rejects.toThrow(/already running/i);
    runner.cancel();
    await vi.advanceTimersByTimeAsync(0);
    await p1;
  });
});
