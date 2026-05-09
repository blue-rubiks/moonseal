import { audioEngine } from '../audio/AudioEngine';
import { recentsRepo } from '../storage/RecentsRepo';

export interface TrackState {
  soundId: string;
  volume: number;
}

class AudioStore {
  initialized = $state(false);
  tracks = $state<Record<string, TrackState>>({});
  masterVolume = $state(0.7);

  isPlaying = $derived(Object.keys(this.tracks).length > 0);

  async ensureInitialized() {
    if (this.initialized) return;
    await audioEngine.initialize();
    this.initialized = true;
  }

  async toggleSound(soundId: string, volume = 0.7) {
    await this.ensureInitialized();
    if (this.tracks[soundId]) {
      await audioEngine.stopTrack(soundId);
      delete this.tracks[soundId];
      return;
    }
    await audioEngine.playTrack(soundId, volume);
    this.tracks[soundId] = { soundId, volume };
    void recentsRepo.push('sound', soundId).catch(() => { /* ignore */ });
  }

  setVolume(soundId: string, volume: number) {
    audioEngine.setVolume(soundId, volume, 0.1);
    const t = this.tracks[soundId];
    if (t) t.volume = volume;
  }

  setMasterVolume(volume: number) {
    this.masterVolume = volume;
    for (const id of Object.keys(this.tracks)) {
      const t = this.tracks[id];
      if (t) audioEngine.setVolume(id, t.volume * volume, 0.05);
    }
  }

  async stopAll(fadeOutSec = 0.5) {
    await audioEngine.stopAll(fadeOutSec);
    this.tracks = {};
  }
}

export const audioStore = new AudioStore();
