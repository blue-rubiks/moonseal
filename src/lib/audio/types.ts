export type SoundType = 'file' | 'synth';

export type SynthFlavor = 'white' | 'pink' | 'brown';

export interface SoundDef {
  id: string;
  nameKey: string;
  type: SoundType;
  src?: string;
  flavor?: SynthFlavor;
  iconKey: string;
}

export interface PlaybackHandle {
  soundId: string;
  stop: (fadeSec?: number) => Promise<void>;
  setVolume: (volume: number, rampSec?: number) => void;
}
