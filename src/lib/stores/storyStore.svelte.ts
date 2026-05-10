import { audioEngine } from '../audio/AudioEngine';
import { StoryRunner } from '../story/StoryRunner';
import type { StoryDef, StorySegment } from '../story/types';
import { recentsRepo } from '../storage/RecentsRepo';

class StoryStore {
  current = $state<StoryDef | null>(null);
  currentSegment = $state<StorySegment | null>(null);
  currentIndex = $state(0);
  private runner: StoryRunner | null = null;

  isPlaying = $derived(this.current !== null);

  async start(story: StoryDef): Promise<void> {
    await audioEngine.initialize();
    if (this.runner) this.runner.cancel();

    this.current = story;
    this.currentIndex = 0;
    this.currentSegment = story.segments[0] ?? null;

    void recentsRepo.push('story', story.id).catch(() => { /* ignore */ });

    this.runner = new StoryRunner();
    this.runner.on(async (e) => {
      if (e.type === 'segment-start') {
        this.currentIndex = e.index;
        this.currentSegment = e.segment;
        if (e.index === 0) {
          await audioEngine.playTrack(e.segment.soundId, e.segment.volume, 2);
        } else {
          await audioEngine.crossfadeTo(e.segment.soundId, e.segment.volume, e.segment.crossfadeSec);
        }
      } else if (e.type === 'story-end' || e.type === 'cancelled') {
        await audioEngine.stopAll(2);
        this.current = null;
        this.currentSegment = null;
        this.currentIndex = 0;
      }
    });

    await this.runner.run(story.segments);
  }

  stop(): void {
    this.runner?.cancel();
  }
}

export const storyStore = new StoryStore();
