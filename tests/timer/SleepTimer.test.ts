import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SleepTimer } from '../../src/lib/timer/SleepTimer';

describe('SleepTimer', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('start() schedules fadeOut and stopAll callbacks', async () => {
    const fadeOut = vi.fn();
    const stopAll = vi.fn();
    const timer = new SleepTimer({ fadeOut, stopAll });

    timer.start({ totalSec: 60, fadeOutSec: 10 });

    await vi.advanceTimersByTimeAsync(50_000);
    expect(fadeOut).toHaveBeenCalledWith(10);
    expect(stopAll).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(stopAll).toHaveBeenCalled();
  });

  it('remaining() reports remaining seconds', () => {
    const timer = new SleepTimer({ fadeOut: vi.fn(), stopAll: vi.fn() });
    timer.start({ totalSec: 30, fadeOutSec: 5 });
    expect(timer.remaining()).toBe(30);
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z'));
    expect(timer.remaining()).toBe(20);
  });

  it('cancel() prevents callbacks from firing', async () => {
    const fadeOut = vi.fn();
    const stopAll = vi.fn();
    const timer = new SleepTimer({ fadeOut, stopAll });

    timer.start({ totalSec: 60, fadeOutSec: 10 });
    timer.cancel();
    await vi.advanceTimersByTimeAsync(70_000);

    expect(fadeOut).not.toHaveBeenCalled();
    expect(stopAll).not.toHaveBeenCalled();
  });

  it('isRunning() reflects state', () => {
    const timer = new SleepTimer({ fadeOut: vi.fn(), stopAll: vi.fn() });
    expect(timer.isRunning()).toBe(false);
    timer.start({ totalSec: 60, fadeOutSec: 10 });
    expect(timer.isRunning()).toBe(true);
    timer.cancel();
    expect(timer.isRunning()).toBe(false);
  });
});
