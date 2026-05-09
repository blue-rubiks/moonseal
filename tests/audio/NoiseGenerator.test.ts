import { describe, it, expect, vi, beforeEach } from 'vitest';

const startMock = vi.fn();
const stopMock = vi.fn();
const disposeMock = vi.fn();
const connectMock = vi.fn();
let lastFlavor: string | undefined;

vi.mock('tone', () => {
  class FakeNoise {
    type: string;
    constructor(type: string) {
      this.type = type;
      lastFlavor = type;
    }
    start = startMock;
    stop = stopMock;
    dispose = disposeMock;
    connect = connectMock;
    toDestination() { return this; }
  }
  class FakeGain {
    gain = { value: 0, rampTo: vi.fn() };
    connect = connectMock;
    toDestination() { return this; }
    dispose = disposeMock;
  }
  return { Noise: FakeNoise, Gain: FakeGain };
});

import { createNoise } from '../../src/lib/audio/NoiseGenerator';

describe('NoiseGenerator', () => {
  beforeEach(() => {
    startMock.mockClear();
    stopMock.mockClear();
    disposeMock.mockClear();
    connectMock.mockClear();
    lastFlavor = undefined;
  });

  it('creates a Tone.Noise with the requested flavor', () => {
    const n = createNoise('pink');
    expect(lastFlavor).toBe('pink');
    expect(n).toBeDefined();
  });

  it('start() forwards to underlying noise', () => {
    const n = createNoise('white');
    n.start();
    expect(startMock).toHaveBeenCalledOnce();
  });

  it('stop() forwards to underlying noise', () => {
    const n = createNoise('white');
    n.stop();
    expect(stopMock).toHaveBeenCalledOnce();
  });

  it('dispose() releases underlying resources', () => {
    const n = createNoise('brown');
    n.dispose();
    expect(disposeMock).toHaveBeenCalled();
  });
});
