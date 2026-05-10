import * as Tone from 'tone';
import { getSoundById } from './builtinSounds';
import type { SoundDef } from './types';

interface ActiveTrack {
  soundId: string;
  source: Tone.Player | Tone.Noise;
}

const MIN_DB = -100;

function rampVolume(source: Tone.Player | Tone.Noise, linearGain: number, sec: number) {
  const db = linearGain <= 0 ? MIN_DB : Tone.gainToDb(linearGain);
  source.volume.rampTo(db, sec);
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
    track.source.volume.value = MIN_DB;
    track.source.start();
    rampVolume(track.source, volume, fadeInSec);
  }

  setVolume(soundId: string, volume: number, rampSec = 0.1): void {
    const t = this.tracks.get(soundId);
    if (!t) return;
    rampVolume(t.source, volume, rampSec);
  }

  async stopTrack(soundId: string, fadeOutSec = 0.5): Promise<void> {
    const t = this.tracks.get(soundId);
    if (!t) return;
    if (fadeOutSec > 0) {
      rampVolume(t.source, 0, fadeOutSec);
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
      track.source.volume.value = MIN_DB;
      track.source.start();
      rampVolume(track.source, volume, crossfadeSec);
    }

    for (const id of previousIds) {
      const prev = this.tracks.get(id)!;
      rampVolume(prev.source, 0, crossfadeSec);
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
      rampVolume(t.source, 0, fadeOutSec);
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
