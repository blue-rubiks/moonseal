import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const startMock = vi.fn(async () => {});
  const loadedMock = vi.fn(async () => {});
  const gainToDb = (g: number) => (g <= 0 ? -Infinity : 20 * Math.log10(g));

  class FakeParam {
    rampTo = vi.fn();
    value = 0;
  }
  class FakeGain {
    gain = new FakeParam();
    connect(_: unknown) { return this; }
    toDestination() { return this; }
    dispose = vi.fn();
  }
  const playerInstances: FakePlayer[] = [];
  const noiseInstances: FakeNoise[] = [];

  class FakePlayer {
    src: string;
    loop = false;
    state = 'stopped';
    volume = new FakeParam();
    start = vi.fn(() => { this.state = 'started'; });
    stop = vi.fn(() => { this.state = 'stopped'; });
    dispose = vi.fn();
    connect = vi.fn(() => this);
    toDestination = vi.fn(() => this);
    constructor(src: string) {
      this.src = src;
      playerInstances.push(this);
    }
  }
  class FakeNoise {
    type: string;
    state = 'stopped';
    volume = new FakeParam();
    start = vi.fn(() => { this.state = 'started'; });
    stop = vi.fn(() => { this.state = 'stopped'; });
    dispose = vi.fn();
    connect = vi.fn(() => this);
    toDestination = vi.fn(() => this);
    constructor(type: string) {
      this.type = type;
      noiseInstances.push(this);
    }
  }

  return { startMock, loadedMock, gainToDb, FakeGain, FakePlayer, FakeNoise, playerInstances, noiseInstances };
});

vi.mock('tone', () => ({
  Player: mocks.FakePlayer,
  Noise: mocks.FakeNoise,
  Gain: mocks.FakeGain,
  start: mocks.startMock,
  loaded: mocks.loadedMock,
  gainToDb: mocks.gainToDb,
  getDestination: () => new mocks.FakeGain()
}));

import { AudioEngine } from '../../src/lib/audio/AudioEngine';

const { playerInstances, noiseInstances, startMock, loadedMock, gainToDb } = mocks;
const MIN_DB = -100;
const dbOf = (linear: number) => (linear <= 0 ? MIN_DB : gainToDb(linear));

describe('AudioEngine', () => {
  let engine: AudioEngine;

  beforeEach(() => {
    playerInstances.length = 0;
    noiseInstances.length = 0;
    startMock.mockClear();
    loadedMock.mockClear();
    engine = new AudioEngine();
  });

  it('initialize() calls Tone.start() (autoplay unlock)', async () => {
    await engine.initialize();
    expect(startMock).toHaveBeenCalledOnce();
  });

  it('playTrack creates a Tone.Player for file-type sounds and starts it', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.7);
    expect(playerInstances).toHaveLength(1);
    expect(playerInstances[0]?.src).toBe('/audio/ocean.mp3');
    expect(playerInstances[0]?.loop).toBe(true);
    expect(playerInstances[0]?.start).toHaveBeenCalled();
  });

  it('playTrack creates a Tone.Noise for synth-type sounds', async () => {
    await engine.initialize();
    await engine.playTrack('white', 0.5);
    expect(noiseInstances).toHaveLength(1);
    expect(noiseInstances[0]?.type).toBe('white');
    expect(noiseInstances[0]?.start).toHaveBeenCalled();
  });

  it('playTrack on the same id twice does not double-create', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.5);
    await engine.playTrack('ocean', 0.8);
    expect(playerInstances).toHaveLength(1);
  });

  it('setVolume ramps the track volume in decibels', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.5);
    engine.setVolume('ocean', 0.9, 1);
    expect(playerInstances[0]?.volume.rampTo).toHaveBeenLastCalledWith(dbOf(0.9), 1);
  });

  it('stopTrack stops and disposes the Tone resource', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.5);
    await engine.stopTrack('ocean', 0);
    expect(playerInstances[0]?.stop).toHaveBeenCalled();
    expect(playerInstances[0]?.dispose).toHaveBeenCalled();
  });

  it('stopAll stops every active track', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.5);
    await engine.playTrack('rain', 0.5);
    await engine.stopAll(0);
    expect(playerInstances[0]?.stop).toHaveBeenCalled();
    expect(playerInstances[1]?.stop).toHaveBeenCalled();
  });

  it('throws on unknown sound id', async () => {
    await engine.initialize();
    await expect(engine.playTrack('not-a-sound', 0.5)).rejects.toThrow(/unknown sound/i);
  });

  it('crossfadeTo ramps current track to 0 and new track to target volume', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.7);
    await engine.crossfadeTo('rain', 0.6, 5);
    expect(playerInstances[0]?.volume.rampTo).toHaveBeenLastCalledWith(dbOf(0), 5);
    expect(playerInstances[1]?.volume.rampTo).toHaveBeenLastCalledWith(dbOf(0.6), 5);
  });

  it('crossfadeTo with no current track simply starts the new one at target volume', async () => {
    await engine.initialize();
    await engine.crossfadeTo('rain', 0.5, 3);
    expect(playerInstances).toHaveLength(1);
    expect(playerInstances[0]?.volume.rampTo).toHaveBeenLastCalledWith(dbOf(0.5), 3);
  });

  it('crossfadeTo to the currently-playing same id only adjusts volume', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.4);
    await engine.crossfadeTo('ocean', 0.9, 2);
    expect(playerInstances).toHaveLength(1);
    expect(playerInstances[0]?.volume.rampTo).toHaveBeenLastCalledWith(dbOf(0.9), 2);
  });

  it('playTrack pre-sets volume to MIN_DB before fade-in to avoid full-volume blast', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.7, 1);
    expect(playerInstances[0]?.volume.value).toBe(MIN_DB);
    expect(playerInstances[0]?.volume.rampTo).toHaveBeenLastCalledWith(dbOf(0.7), 1);
  });
});
