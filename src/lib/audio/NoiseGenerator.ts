import { Noise, Gain } from 'tone';
import type { SynthFlavor } from './types';

export interface NoiseHandle {
  start(): void;
  stop(): void;
  setVolume(v: number, rampSec?: number): void;
  dispose(): void;
  readonly output: Gain;
}

export function createNoise(flavor: SynthFlavor): NoiseHandle {
  const noise = new Noise(flavor);
  const gain = new Gain(0).toDestination();
  noise.connect(gain);

  return {
    start() { noise.start(); },
    stop() { noise.stop(); },
    setVolume(v: number, rampSec = 0) {
      if (rampSec <= 0) gain.gain.value = v;
      else gain.gain.rampTo(v, rampSec);
    },
    dispose() {
      noise.dispose();
      gain.dispose();
    },
    output: gain
  };
}
