<script lang="ts">
  import { storyStore } from '../lib/stores/storyStore.svelte';
  import { uiStore } from '../lib/stores/uiStore.svelte';
  import { fmtMin } from '../lib/util/format';
  import Glyph from '../components/Glyph.svelte';
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

  let seg = $derived(storyStore.currentSegment);
  let idx = $derived(storyStore.currentIndex);
  let total = $derived(story.segments.length);
  let line = $derived(seg?.poeticText ?? '');
</script>

<div class="reader paper-grain" class:mobile={uiStore.mobile}>
  <header>
    <button class="back" onclick={stopAndClose}>
      <Glyph kind="arrow-l" size={16} sw={1.2}/>
      <span>故事</span>
    </button>
    <div class="grow"></div>
    <span class="en chapter">第 {idx + 1} 章 / 共 {total} 章</span>
  </header>

  <div class="stage">
    <div class="kicker">{story.nameKey}</div>
    {#key idx}
      <p class="line">{line || ' '}</p>
    {/key}
    <div class="dots">
      {#each story.segments as _, i (i)}
        <span class="dot" class:on={i === idx}></span>
      {/each}
    </div>
    <div class="en index">{idx + 1} / {total}</div>
  </div>

  <div class="footer">
    <span class="time">共讀 · {fmtMin(story.totalDurationSec)}</span>
    <span class="stamp">夜讀</span>
  </div>
</div>

<style>
  .reader {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
  }
  header {
    padding: 28px 56px 0;
    display: flex;
    align-items: center;
    gap: 16px;
    position: relative;
    z-index: 2;
  }
  .reader.mobile header { padding: 20px 24px 0; }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--ink-soft);
    font-size: 13px;
  }
  .grow { flex: 1; }
  .chapter {
    font-size: 11px;
    color: var(--mute);
    letter-spacing: 0.2em;
  }

  .stage {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 80px 96px;
    position: relative;
    z-index: 2;
  }
  .reader.mobile .stage { padding: 0 32px 140px; }
  .kicker {
    font-size: 13px;
    color: var(--mute);
    letter-spacing: 0.4em;
    margin-bottom: 56px;
  }
  .reader.mobile .kicker { margin-bottom: 36px; }
  .line {
    font-size: 38px;
    font-weight: 400;
    line-height: 1.7;
    text-align: center;
    max-width: 720px;
    margin: 0;
    color: var(--ink);
    animation: breathe 5s ease-in-out infinite;
    min-height: 2em;
  }
  .reader.mobile .line { font-size: 26px; }

  .dots {
    display: flex;
    gap: 8px;
    margin-top: 96px;
    align-items: center;
  }
  .reader.mobile .dots { margin-top: 56px; }
  .dot {
    width: 6px;
    height: 2px;
    background: var(--line);
    transition: width .4s, background .4s;
  }
  .dot.on {
    width: 24px;
    background: var(--ink);
  }
  .index {
    font-size: 12px;
    color: var(--mute);
    letter-spacing: 0.2em;
    margin-top: 14px;
  }

  .footer {
    position: absolute;
    right: 56px;
    bottom: 110px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 3;
  }
  .reader.mobile .footer { right: 24px; bottom: 150px; }
  .time {
    font-size: 12px;
    color: var(--mute);
    font-style: italic;
  }
</style>
