import { audioEngine } from '../audio/AudioEngine';
import { audioStore } from './audioStore.svelte';
import { storyStore } from './storyStore.svelte';
import { SleepTimer } from '../timer/SleepTimer';
import { settingsRepo } from '../storage/SettingsRepo';

class TimerStore {
  remainingSec = $state(0);
  totalSec = $state(0);
  running = $state(false);
  fadeOutSec = $state(30);
  private timer: SleepTimer;
  private tickHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.timer = new SleepTimer({
      fadeOut: (sec) => audioEngine.masterFadeOut(sec),
      stopAll: () => {
        storyStore.stop();
        void audioStore.stopAll(0);
      }
    });
    void this.loadSettings();
  }

  private async loadSettings() {
    const s = await settingsRepo.load();
    this.fadeOutSec = s.fadeOutOnTimerSec;
  }

  start(totalMin: number) {
    const total = totalMin * 60;
    this.timer.start({ totalSec: total, fadeOutSec: this.fadeOutSec });
    this.totalSec = total;
    this.remainingSec = total;
    this.running = true;
    this.startTick();
  }

  cancel() {
    this.timer.cancel();
    this.running = false;
    this.stopTick();
    this.remainingSec = 0;
    this.totalSec = 0;
  }

  private startTick() {
    this.stopTick();
    this.tickHandle = setInterval(() => {
      this.remainingSec = this.timer.remaining();
      if (this.remainingSec === 0) {
        this.running = false;
        this.stopTick();
      }
    }, 250);
  }

  private stopTick() {
    if (this.tickHandle) { clearInterval(this.tickHandle); this.tickHandle = null; }
  }
}

export const timerStore = new TimerStore();
