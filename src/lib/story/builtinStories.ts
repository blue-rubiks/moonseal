import type { StoryDef } from './types';

export const BUILTIN_STORY_IDS = [
  'seaside-walk',
  'rainy-fireplace',
  'forest-spa',
  'mountain-stream',
  'summer-thunder'
] as const;

export type BuiltinStoryId = typeof BUILTIN_STORY_IDS[number];

export async function loadBuiltinStories(): Promise<StoryDef[]> {
  const out: StoryDef[] = [];
  for (const id of BUILTIN_STORY_IDS) {
    const res = await fetch(`/stories/${id}.json`);
    if (!res.ok) throw new Error(`failed to load story: ${id}`);
    out.push(await res.json() as StoryDef);
  }
  return out;
}
