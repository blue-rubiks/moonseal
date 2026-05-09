import * as Tone from 'tone';
import { getSoundById } from './builtinSounds';
import type { SoundDef } from './types';

interface ActiveTrack {
  soundId: string;
  source: Tone.Player | Tone.Noise;
}

type GainOutput = { output: { gain: { rampTo: (v: number, t: number) => void; value: number } } };

function gainOf(source: Tone.Player | Tone.Noise) {
  return (source as unknown as GainOutput).output.gain;
}

export class AudioEngine {
  private initialized = false;
  private readonly tracks = new Map<string, ActiveTrack>();

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();
    this.initialized = true;
  }

  async playTrack(soundId: string, volume: number, fadeInSec = 1): Promise<void> {
    const def = getSoundById(soundId);
    if (!def) throw new Error(`unknown sound: ${soundId}`);
    if (this.tracks.has(soundId)) {
      this.setVolume(soundId, volume, fadeInSec);
      return;
    }
    const track = await this.createTrack(def);
    this.tracks.set(soundId, track);
    track.source.start();
    gainOf(track.source).rampTo(volume, fadeInSec);
  }

  setVolume(soundId: string, volume: number, rampSec = 0.1): void {
    const t = this.tracks.get(soundId);
    if (!t) return;
    gainOf(t.source).rampTo(volume, rampSec);
  }

  async stopTrack(soundId: string, fadeOutSec = 0.5): Promise<void> {
    const t = this.tracks.get(soundId);
    if (!t) return;
    if (fadeOutSec > 0) {
      gainOf(t.source).rampTo(0, fadeOutSec);
      await new Promise((r) => setTimeout(r, fadeOutSec * 1000));
    }
    t.source.stop();
    t.source.dispose();
    this.tracks.delete(soundId);
  }

  async stopAll(fadeOutSec = 0.5): Promise<void> {
    const ids = [...this.tracks.keys()];
    await Promise.all(ids.map((id) => this.stopTrack(id, fadeOutSec)));
  }

  async crossfadeTo(soundId: string, volume: number, crossfadeSec: number): Promise<void> {
    const def = getSoundById(soundId);
    if (!def) throw new Error(`unknown sound: ${soundId}`);

    const previousIds = [...this.tracks.keys()].filter((id) => id !== soundId);

    if (this.tracks.has(soundId)) {
      this.setVolume(soundId, volume, crossfadeSec);
    } else {
      const track = await this.createTrack(def);
      this.tracks.set(soundId, track);
      track.source.start();
      gainOf(track.source).rampTo(volume, crossfadeSec);
    }

    for (const id of previousIds) {
      const prev = this.tracks.get(id)!;
      gainOf(prev.source).rampTo(0, crossfadeSec);
      setTimeout(() => {
        try {
          prev.source.stop();
          prev.source.dispose();
        } catch {
          /* already disposed */
        }
        this.tracks.delete(id);
      }, crossfadeSec * 1000);
    }
  }

  async masterFadeOut(fadeOutSec: number): Promise<void> {
    for (const t of this.tracks.values()) {
      gainOf(t.source).rampTo(0, fadeOutSec);
    }
    await new Promise((r) => setTimeout(r, fadeOutSec * 1000));
    await this.stopAll(0);
  }

  isPlaying(soundId: string): boolean {
    return this.tracks.has(soundId);
  }

  activeTrackIds(): string[] {
    return [...this.tracks.keys()];
  }

  private async createTrack(def: SoundDef): Promise<ActiveTrack> {
    if (def.type === 'file') {
      const player = new Tone.Player(def.src!).toDestination();
      player.loop = true;
      await Tone.loaded();
      return { soundId: def.id, source: player };
    }
    const noise = new Tone.Noise(def.flavor!).toDestination();
    return { soundId: def.id, source: noise };
  }
}

export const audioEngine = new AudioEngine();
