export interface SleepTimerCallbacks {
  fadeOut: (sec: number) => void;
  stopAll: () => void;
}

export interface StartTimerInput {
  totalSec: number;
  fadeOutSec: number;
}

export class SleepTimer {
  private endAt: number | null = null;
  private fadeAt: number | null = null;
  private fadeTimeout: ReturnType<typeof setTimeout> | null = null;
  private stopTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cb: SleepTimerCallbacks) {}

  start(input: StartTimerInput): void {
    this.cancel();
    const now = Date.now();
    this.endAt = now + input.totalSec * 1000;
    this.fadeAt = this.endAt - input.fadeOutSec * 1000;

    const untilFade = Math.max(0, this.fadeAt - now);
    this.fadeTimeout = setTimeout(() => this.cb.fadeOut(input.fadeOutSec), untilFade);

    const untilStop = Math.max(0, this.endAt - now);
    this.stopTimeout = setTimeout(() => {
      this.cb.stopAll();
      this.endAt = null;
      this.fadeAt = null;
    }, untilStop);
  }

  cancel(): void {
    if (this.fadeTimeout) { clearTimeout(this.fadeTimeout); this.fadeTimeout = null; }
    if (this.stopTimeout) { clearTimeout(this.stopTimeout); this.stopTimeout = null; }
    this.endAt = null;
    this.fadeAt = null;
  }

  remaining(): number {
    if (this.endAt === null) return 0;
    return Math.max(0, Math.ceil((this.endAt - Date.now()) / 1000));
  }

  isRunning(): boolean { return this.endAt !== null; }
}
