<script lang="ts">
  import { BUILTIN_SOUNDS } from '../lib/audio/builtinSounds';
  import { audioStore } from '../lib/stores/audioStore.svelte';
  import { toastStore } from '../lib/stores/toastStore.svelte';
  import { mixRepo } from '../lib/storage/MixRepo';
  import { uiStore } from '../lib/stores/uiStore.svelte';
  import VolumeSlider from '../components/VolumeSlider.svelte';
  import Glyph from '../components/Glyph.svelte';
  import { fmtMMSS } from '../lib/util/format';

  async function toggle(id: string) {
    await audioStore.toggleSound(id, 0.7);
  }
  function setVol(id: string, v: number) {
    audioStore.setVolume(id, v);
  }

  let elapsed = $state(0);
  $effect(() => {
    if (!audioStore.isPlaying) { elapsed = 0; return; }
    const id = setInterval(() => { elapsed += 1; }, 1000);
    return () => clearInterval(id);
  });

  let activeCount = $derived(Object.keys(audioStore.tracks).length);

  async function saveMix() {
    if (activeCount === 0) return;
    const tracks = Object.values(audioStore.tracks).map((t) => ({
      soundId: t.soundId,
      volume: t.volume
    }));
    const time = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    const name = `我的混音 · ${time}`;
    await mixRepo.save({ name, tracks });
    toastStore.show(`已儲存「${name}」`);
  }

  async function stopAll() {
    await audioStore.stopAll(0.6);
  }
</script>

<section class:mobile={uiStore.mobile}>
  <div class="title">
    <h1>混音</h1>
    <span class="subtitle">同時播放多軌 · 各自調整音量</span>
  </div>
  <div class="hline"></div>

  <ul class="rows">
    {#each BUILTIN_SOUNDS as sound (sound.id)}
      {@const track = audioStore.tracks[sound.id]}
      {@const on = !!track}
      <li>
        <button class="play" class:on onclick={() => toggle(sound.id)} aria-label={on ? '停止' : '播放'}>
          <Glyph kind={on ? 'pause' : 'play'} size={11}/>
        </button>
        {#if !uiStore.mobile}
          <span class="glyph" class:on>
            <Glyph kind={sound.iconKey} size={20} sw={1}/>
          </span>
        {/if}
        <div class="meta">
          <div class="name" class:on>{sound.nameKey}</div>
          {#if !uiStore.mobile}
            <div class="en sub">{sound.id.toUpperCase()}</div>
          {/if}
        </div>
        <VolumeSlider
          value={track?.volume ?? 0.6}
          disabled={!on}
          oninput={(v) => setVol(sound.id, v)}
        />
        <span class="vol en">{on ? Math.round((track?.volume ?? 0) * 100) : '–'}</span>
      </li>
    {/each}
  </ul>

  <div class="actions">
    <button class="primary" disabled={activeCount === 0} onclick={saveMix}>
      儲存為「我的混音」
    </button>
    <button class="ghost" disabled={activeCount === 0} onclick={stopAll}>
      全部停止
    </button>
    <span class="status">
      {#if activeCount > 0}
        {activeCount} 軌混音 · <span class="en">{fmtMMSS(elapsed)}</span>
      {:else}
        尚未播放任何聲音
      {/if}
    </span>
  </div>
</section>

<style>
  section {
    padding: 32px 56px 32px;
    position: relative;
    z-index: 2;
  }
  section.mobile { padding: 16px 24px 32px; }
  .title { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
  h1 {
    font-size: clamp(36px, 5vw, 56px);
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.02em;
    margin: 0;
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
    margin: 18px 0 12px;
  }
  .rows {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    border-top: 1px solid var(--line);
  }
  .rows li {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 14px 4px;
    border-bottom: 1px solid var(--line);
  }
  section.mobile .rows li { gap: 14px; }
  .play {
    width: 32px;
    height: 32px;
    border: 1px solid var(--mute);
    border-radius: 50%;
    color: var(--mute);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .play.on { color: var(--ink); border-color: var(--ink); }
  .glyph { color: var(--mute); flex-shrink: 0; line-height: 0; }
  .glyph.on { color: var(--ink); }
  .meta { min-width: 100px; flex-shrink: 0; }
  section.mobile .meta { min-width: 56px; }
  .name {
    font-size: 16px;
    color: var(--ink-soft);
    line-height: 1.2;
  }
  section.mobile .name { font-size: 14px; }
  .name.on { color: var(--ink); }
  .sub {
    font-size: 10px;
    color: var(--mute);
    letter-spacing: 0.2em;
    margin-top: 2px;
  }
  .vol {
    font-size: 12px;
    color: var(--mute);
    min-width: 32px;
    text-align: right;
  }

  .actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    flex-wrap: wrap;
    align-items: center;
  }
  .actions .primary {
    padding: 9px 18px;
    border: 1px solid var(--ink);
    color: var(--ink);
    font-size: 13px;
  }
  .actions .primary:disabled {
    color: var(--mute);
    border-color: var(--line);
    cursor: not-allowed;
  }
  .actions .ghost {
    padding: 9px 18px;
    color: var(--ink-soft);
    font-size: 13px;
  }
  .actions .ghost:disabled { color: var(--mute); cursor: not-allowed; }
  .status {
    font-size: 12px;
    color: var(--mute);
    margin-left: auto;
  }
</style>
