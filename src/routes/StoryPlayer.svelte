<script lang="ts">
  import { storyStore } from '../lib/stores/storyStore.svelte';
  import PoeticText from '../components/PoeticText.svelte';
  import type { StoryDef } from '../lib/story/types';

  interface Props {
    story: StoryDef;
    onClose: () => void;
  }
  let { story, onClose }: Props = $props();

  $effect(() => {
    void storyStore.start(story);
    return () => storyStore.stop();
  });

  function stopAndClose() {
    storyStore.stop();
    onClose();
  }
</script>

<div class="player">
  <header>
    <button class="back" onclick={stopAndClose} aria-label="返回">←</button>
    <h2>{story.nameKey}</h2>
  </header>

  <div class="stage">
    <PoeticText text={storyStore.currentSegment?.poeticText} />
    <p class="progress">
      {storyStore.currentIndex + 1} / {story.segments.length}
    </p>
  </div>

  <button class="stop" onclick={stopAndClose}>停止</button>
</div>

<style>
  .player {
    display: flex;
    flex-direction: column;
    min-height: calc(100dvh - 4rem);
    padding: 1.5rem;
  }
  header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem; }
  .back { font-size: 1.5rem; padding: 0.25rem 0.5rem; }
  h2 { margin: 0; font-weight: 600; }
  .stage { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2rem; }
  .progress { color: var(--text-dim); font-size: 0.85rem; }
  .stop {
    background: var(--bg-elevated);
    border-radius: 999px;
    padding: 0.85rem 2rem;
    align-self: center;
    margin-top: 2rem;
  }
</style>
