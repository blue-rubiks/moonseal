import type { StorySegment, StoryEvent, StoryEventListener } from './types';

export class StoryRunner {
  private listeners = new Set<StoryEventListener>();
  private cancelled = false;
  private active = false;
  private currentTimeout: ReturnType<typeof setTimeout> | null = null;
  private sleepResolve: (() => void) | null = null;

  on(listener: StoryEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(e: StoryEvent): void {
    for (const l of this.listeners) l(e);
  }

  async run(segments: StorySegment[]): Promise<void> {
    if (this.active) throw new Error('StoryRunner already running');
    if (this.cancelled) {
      this.emit({ type: 'cancelled' });
      return;
    }
    this.active = true;

    try {
      for (let i = 0; i < segments.length; i++) {
        if (this.cancelled) {
          this.emit({ type: 'cancelled' });
          return;
        }
        const seg = segments[i]!;
        this.emit({ type: 'segment-start', index: i, segment: seg });
        await this.sleep(seg.durationSec * 1000);
        if (this.cancelled) {
          this.emit({ type: 'cancelled' });
          return;
        }
      }
      this.emit({ type: 'story-end' });
    } finally {
      this.active = false;
      this.currentTimeout = null;
      this.sleepResolve = null;
    }
  }

  cancel(): void {
    this.cancelled = true;
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    if (this.sleepResolve) {
      const resolve = this.sleepResolve;
      this.sleepResolve = null;
      resolve();
    }
  }

  isActive(): boolean { return this.active; }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.sleepResolve = resolve;
      this.currentTimeout = setTimeout(() => {
        this.currentTimeout = null;
        this.sleepResolve = null;
        resolve();
      }, ms);
    });
  }
}
