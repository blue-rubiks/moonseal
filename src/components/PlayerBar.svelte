<script lang="ts">
  import { audioStore } from '../lib/stores/audioStore.svelte';
  import { timerStore } from '../lib/stores/timerStore.svelte';
  import { uiStore } from '../lib/stores/uiStore.svelte';
  import { getSoundById } from '../lib/audio/builtinSounds';
  import { fmtMMSS } from '../lib/util/format';
  import Glyph from './Glyph.svelte';

  let visible = $derived(audioStore.isPlaying);

  let label = $derived.by(() => {
    if (audioStore.currentStory) return audioStore.currentStory.nameKey;
    const ids = Object.keys(audioStore.tracks);
    if (ids.length === 0) return '尚未播放';
    return ids.map((id) => getSoundById(id)?.nameKey ?? id).join(' · ');
  });

  let sub = $derived.by(() => {
    if (audioStore.currentStory) return `第 ${audioStore.currentIndex + 1} 段 · 夜讀配樂`;
    const n = Object.keys(audioStore.tracks).length;
    if (n === 0) return '從首頁挑一個聲音開始';
    return `${n} 軌混音`;
  });

  let elapsed = $state(0);
  $effect(() => {
    if (!visible) { elapsed = 0; return; }
    const id = setInterval(() => { elapsed += 1; }, 1000);
    return () => clearInterval(id);
  });

  let timerProgress = $derived(
    timerStore.running && timerStore.totalSec > 0
      ? Math.min(1, Math.max(0, (timerStore.totalSec - timerStore.remainingSec) / timerStore.totalSec))
      : 0
  );
  let progressPct = $derived(`${(timerProgress * 100).toFixed(2)}%`);

  async function stopAll() {
    await audioStore.stopAll(0.8);
    elapsed = 0;
  }
</script>

{#if visible}
  {#if uiStore.mobile}
    <aside class="bar mobile" class:immersive={!!uiStore.currentStory}>
      <button class="play" onclick={stopAll} aria-label="停止全部">
        <Glyph kind="stop" size={11}/>
      </button>
      <div class="info">
        <div class="title">{label}</div>
        <div class="sub">{sub}</div>
      </div>
      <button class="timer" onclick={() => uiStore.openTimer()} aria-label="計時器">
        <Glyph kind="timer" size={14} sw={1.2}/>
      </button>
    </aside>
  {:else}
    <aside class="bar desktop">
      <button class="play" onclick={stopAll} aria-label="停止全部">
        <Glyph kind="stop" size={14} sw={1.4}/>
      </button>
      <div class="info">
        <div class="title">{label}</div>
        <div class="sub">{sub}</div>
      </div>
      {#if timerStore.running}
        <div class="track">
          <span class="line"></span>
          <span class="fill" style="width: {progressPct}"></span>
          <span class="head" style="left: {progressPct}"></span>
        </div>
      {:else}
        <div class="track empty"></div>
      {/if}
      <span class="en time">{fmtMMSS(elapsed)}</span>
      <button class="timer-chip" onclick={() => uiStore.openTimer()}>
        <Glyph kind="timer" size={14} sw={1.2}/>
        <span class="en">{timerStore.running ? fmtMMSS(timerStore.remainingSec) : '計時'}</span>
      </button>
    </aside>
  {/if}
{/if}

<style>
  .bar {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 6;
    background: var(--bg-elev);
    border-top: 1px solid var(--line);
  }
  .bar.desktop {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 12px 56px;
  }
  .bar.mobile {
    inset-inline: 8px;
    bottom: calc(70px + env(safe-area-inset-bottom));
    border: 1px solid var(--line);
    background: var(--bg-elev);
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .bar.mobile.immersive {
    bottom: calc(8px + env(safe-area-inset-bottom));
  }
  .play {
    width: 36px;
    height: 36px;
    border: 1px solid var(--ink);
    border-radius: 50%;
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .bar.mobile .play { width: 32px; height: 32px; }
  .info { flex: 1; min-width: 0; overflow: hidden; }
  .title {
    font-size: 15px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bar.mobile .title { font-size: 13px; }
  .sub {
    font-size: 11px;
    color: var(--mute);
    letter-spacing: 0.1em;
    margin-top: 2px;
  }
  .bar.mobile .sub { font-size: 10px; }

  .track {
    flex: 2;
    height: 1px;
    background: var(--line);
    position: relative;
  }
  .track .fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 0;
    background: var(--ink);
    transition: width .3s linear;
  }
  .track .head {
    position: absolute;
    left: 0;
    top: -2px;
    width: 5px;
    height: 5px;
    background: var(--seal);
    border-radius: 50%;
    transform: translateX(-50%);
    transition: left .3s linear;
  }
  .track .line { display: none; }
  .track.empty { opacity: 0.4; }
  .time {
    font-size: 12px;
    color: var(--mute);
    min-width: 64px;
    text-align: right;
  }
  .timer-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--ink-soft);
    border-left: 1px solid var(--line);
    padding-left: 18px;
  }
  .timer {
    width: 32px;
    height: 32px;
    color: var(--ink-soft);
    flex-shrink: 0;
  }
</style>
