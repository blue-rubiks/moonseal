import { audioEngine } from '../audio/AudioEngine';
import { recentsRepo } from '../storage/RecentsRepo';
import { toastStore } from './toastStore.svelte';
import { StoryRunner } from '../story/StoryRunner';
import type { StoryDef, StorySegment } from '../story/types';

export interface TrackState {
  soundId: string;
  volume: number;
}

export type PlaybackMode = 'idle' | 'mix' | 'story';

class AudioStore {
  initialized = $state(false);
  masterVolume = $state(0.7);

  mode = $state<PlaybackMode>('idle');
  tracks = $state<Record<string, TrackState>>({});

  currentStory = $state<StoryDef | null>(null);
  currentSegment = $state<StorySegment | null>(null);
  currentIndex = $state(0);

  private runner: StoryRunner | null = null;
  private busy: Promise<unknown> | null = null;
  private pendingSegment: Promise<void> | null = null;

  isPlaying = $derived(this.mode !== 'idle');

  async ensureInitialized() {
    if (this.initialized) return;
    await audioEngine.initialize();
    this.initialized = true;
  }

  async toggleSound(soundId: string, volume = 0.7) {
    await this.#serialize(async () => {
      try {
        await this.ensureInitialized();
        if (this.mode === 'story') await this.#leaveStorySync(0.3);
        if (this.tracks[soundId]) {
          await audioEngine.stopTrack(soundId);
          delete this.tracks[soundId];
        } else {
          await audioEngine.playTrack(soundId, volume);
          this.tracks[soundId] = { soundId, volume };
          void recentsRepo.push('sound', soundId).catch(() => { /* ignore */ });
        }
        this.mode = Object.keys(this.tracks).length > 0 ? 'mix' : 'idle';
      } catch (e) {
        const msg = e instanceof Error ? e.message : '播放失敗';
        toastStore.show(`音效載入失敗：${msg}`, 'error');
      }
    });
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

  async startStory(story: StoryDef): Promise<void> {
    const r = await this.#serialize(async () => {
      await this.ensureInitialized();
      if (this.mode === 'mix') {
        await audioEngine.stopAll(0.6);
        this.tracks = {};
      } else if (this.mode === 'story') {
        await this.#leaveStorySync(0.6);
      }

      this.mode = 'story';
      this.currentStory = story;
      this.currentIndex = 0;
      this.currentSegment = story.segments[0] ?? null;
      void recentsRepo.push('story', story.id).catch(() => { /* ignore */ });

      const runner = new StoryRunner();
      this.runner = runner;
      runner.on((e) => {
        if (e.type === 'segment-start') {
          this.currentIndex = e.index;
          this.currentSegment = e.segment;
          const work = (async () => {
            try {
              if (e.index === 0) {
                await audioEngine.playTrack(e.segment.soundId, e.segment.volume, 2);
              } else {
                await audioEngine.crossfadeTo(e.segment.soundId, e.segment.volume, e.segment.crossfadeSec);
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : '夜讀載入失敗';
              toastStore.show(`夜讀載入失敗：${msg}`, 'error');
              runner.cancel();
            }
          })();
          this.pendingSegment = work;
          void work.finally(() => {
            if (this.pendingSegment === work) this.pendingSegment = null;
          });
        } else if (e.type === 'story-end') {
          this.currentStory = null;
          this.currentSegment = null;
          this.currentIndex = 0;
          this.runner = null;
          this.mode = 'idle';
          void audioEngine.stopAll(2);
        }
      });
      return runner;
    });
    // 序列鎖在 setup 完成後就釋放，到這裡之前 stopStory/stopAll 可能搶先把 this.runner 清掉
    // 若已被取代或清空，就不要啟動 run（否則 StoryRunner 會無視之前的 cancel 開始播）
    if (this.runner !== r) return;
    await r.run(story.segments);
  }

  async stopStory(): Promise<void> {
    await this.#serialize(async () => {
      if (this.mode !== 'story') return;
      await this.#leaveStorySync(2);
    });
  }

  async stopAll(fadeOutSec = 0.5) {
    await this.#serialize(async () => {
      try {
        this.runner?.cancel();
        await this.#flushPendingSegment();
        await audioEngine.stopAll(fadeOutSec);
      } finally {
        this.tracks = {};
        this.currentStory = null;
        this.currentSegment = null;
        this.currentIndex = 0;
        this.runner = null;
        this.pendingSegment = null;
        this.mode = 'idle';
      }
    });
  }

  async preview(soundId: string, durationSec: number, volume = 0.7): Promise<void> {
    try {
      await this.ensureInitialized();
      await audioEngine.previewOnce(soundId, durationSec, volume);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '試聽失敗';
      toastStore.show(`試聽失敗：${msg}`, 'error');
    }
  }

  async #leaveStorySync(fadeSec: number) {
    this.runner?.cancel();
    await this.#flushPendingSegment();
    await audioEngine.stopAll(fadeSec);
    this.currentStory = null;
    this.currentSegment = null;
    this.currentIndex = 0;
    this.runner = null;
    this.pendingSegment = null;
    this.mode = 'idle';
  }

  async #flushPendingSegment() {
    const p = this.pendingSegment;
    if (!p) return;
    try { await p; } catch { /* segment-start listener 內部已 toast/cancel，忽略 */ }
  }

  async #serialize<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.busy;
    let resolveDone!: (v: T) => void;
    let rejectDone!: (e: unknown) => void;
    const done = new Promise<T>((res, rej) => { resolveDone = res; rejectDone = rej; });
    this.busy = done;
    if (prev) { try { await prev; } catch { /* prev 失敗不影響後續排隊任務 */ } }
    try {
      const v = await fn();
      resolveDone(v);
      return v;
    } catch (e) {
      rejectDone(e);
      throw e;
    } finally {
      if (this.busy === done) this.busy = null;
    }
  }
}

export const audioStore = new AudioStore();
