<script lang="ts">
  import { audioStore } from '../lib/stores/audioStore.svelte';
  import { storyStore } from '../lib/stores/storyStore.svelte';
  import TimerDial from './TimerDial.svelte';
  import VolumeSlider from './VolumeSlider.svelte';

  let expanded = $state(false);

  let visible = $derived(audioStore.isPlaying || storyStore.isPlaying);
  let activeCount = $derived(Object.keys(audioStore.tracks).length);

  async function stopEverything() {
    storyStore.stop();
    await audioStore.stopAll(1);
  }
</script>

{#if visible}
  <aside class="bar" class:expanded>
    <div class="row" onclick={() => expanded = !expanded} role="button" tabindex="0">
      <div class="info">
        {#if storyStore.current}
          <strong>{storyStore.current.nameKey}</strong>
          <span class="dim">第 {storyStore.currentIndex + 1} 段</span>
        {:else if activeCount > 0}
          <strong>{activeCount} 個音效播放中</strong>
        {/if}
      </div>
      <button class="stop" onclick={(e) => { e.stopPropagation(); void stopEverything(); }}>停止</button>
    </div>
    {#if expanded}
      <div class="extras">
        <VolumeSlider
          label="主音量"
          value={audioStore.masterVolume}
          oninput={(v) => audioStore.setMasterVolume(v)}
        />
        <TimerDial />
      </div>
    {/if}
  </aside>
{/if}

<style>
  .bar {
    position: fixed;
    inset-inline: 0;
    bottom: 4rem;
    background: var(--bg-elevated);
    border-top: 1px solid #ffffff10;
    padding: 0.5rem 1rem;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    cursor: pointer;
  }
  .info { display: flex; flex-direction: column; gap: 0.15rem; }
  .dim { color: var(--text-dim); font-size: 0.8rem; }
  .stop {
    background: var(--bg);
    color: var(--danger);
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    font-size: 0.85rem;
  }
  .extras { padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
</style>
