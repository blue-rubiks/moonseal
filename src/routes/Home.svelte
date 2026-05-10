<script lang="ts">
  import { BUILTIN_SOUNDS } from '../lib/audio/builtinSounds';
  import SoundCard from '../components/SoundCard.svelte';
  import { uiStore } from '../lib/stores/uiStore.svelte';
</script>

<section class:mobile={uiStore.mobile}>
  <div class="title">
    <h1>聲音</h1>
    <span class="subtitle">八種自然之音 · 點擊試聽 · 多選即進入混音</span>
  </div>
  <div class="hline"></div>

  <div class="grid">
    {#each BUILTIN_SOUNDS as sound, i (sound.id)}
      <SoundCard {sound} index={i}/>
    {/each}
  </div>

  <p class="quote">
    "閉上眼睛，讓自然的聲音帶你入眠。"<br/>
    點擊任一聲音卡片開始，多選即同時播放並自動進入「混音」模式。
  </p>
</section>

<style>
  section {
    padding: 32px 56px 32px;
    position: relative;
    z-index: 2;
  }
  section.mobile { padding: 16px 24px 32px; }
  .title {
    display: flex;
    align-items: flex-end;
    gap: 14px;
    flex-wrap: wrap;
  }
  h1 {
    font-size: clamp(36px, 5vw, 56px);
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.02em;
    margin: 0;
    color: var(--ink);
  }
  .subtitle {
    font-size: 13px;
    color: var(--mute);
    padding-bottom: 8px;
    letter-spacing: 0.1em;
  }
  .hline {
    height: 1px;
    background: var(--line);
    transform: scaleY(0.5);
    margin: 18px 0 24px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
  section.mobile .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .quote {
    font-size: 12px;
    color: var(--mute);
    margin: 32px 0 0;
    font-style: italic;
    max-width: 480px;
    line-height: 1.7;
  }
</style>
