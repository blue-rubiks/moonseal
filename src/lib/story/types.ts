export interface StorySegment {
  soundId: string;
  durationSec: number;
  crossfadeSec: number;
  poeticText?: string;
  volume: number;
}

export interface StoryDef {
  id: string;
  nameKey: string;
  description: string;
  builtin: boolean;
  segments: StorySegment[];
  totalDurationSec: number;
}

export type StoryEvent =
  | { type: 'segment-start'; index: number; segment: StorySegment }
  | { type: 'story-end' }
  | { type: 'cancelled' };

export type StoryEventListener = (e: StoryEvent) => void;
