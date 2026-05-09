<script lang="ts">
  import { loadBuiltinStories } from '../lib/story/builtinStories';
  import type { StoryDef } from '../lib/story/types';

  interface Props { onSelect: (story: StoryDef) => void; }
  let { onSelect }: Props = $props();

  let stories = $state<StoryDef[]>([]);
  let error = $state<string | null>(null);

  $effect(() => {
    loadBuiltinStories()
      .then((s) => { stories = s; })
      .catch((e: unknown) => { error = e instanceof Error ? e.message : '載入失敗'; });
  });

  function fmtMin(sec: number): string {
    const m = Math.round(sec / 60);
    return `${m} 分鐘`;
  }
</script>

<section>
  <h2>故事</h2>
  {#if error}
    <p class="error">{error}</p>
  {/if}
  <ul>
    {#each stories as story (story.id)}
      <li>
        <button onclick={() => onSelect(story)}>
          <strong>{story.nameKey}</strong>
          <span class="desc">{story.description}</span>
          <span class="meta">{fmtMin(story.totalDurationSec)} · {story.segments.length} 段</span>
        </button>
      </li>
    {/each}
  </ul>
</section>

<style>
  section { padding: 1.5rem; }
  h2 { font-weight: 600; margin: 0 0 1rem; }
  .error { color: var(--danger); }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
  li button {
    width: 100%;
    text-align: left;
    background: var(--bg-elevated);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .desc { color: var(--text-dim); font-size: 0.9rem; }
  .meta { color: var(--text-dim); font-size: 0.8rem; }
</style>
