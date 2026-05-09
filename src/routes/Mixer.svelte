<script lang="ts">
  import { BUILTIN_SOUNDS } from '../lib/audio/builtinSounds';
  import { audioStore } from '../lib/stores/audioStore.svelte';
  import VolumeSlider from '../components/VolumeSlider.svelte';

  async function toggle(id: string) {
    await audioStore.toggleSound(id, 0.7);
  }

  function setVol(id: string, v: number) {
    audioStore.setVolume(id, v);
  }
</script>

<section>
  <h2>混音</h2>
  <p class="hint">同時播放多個音效，各自調整音量。</p>
  <ul>
    {#each BUILTIN_SOUNDS as sound (sound.id)}
      {@const track = audioStore.tracks[sound.id]}
      <li class:active={!!track}>
        <button class="toggle" onclick={() => toggle(sound.id)}>
          <span class="name">{sound.nameKey}</span>
          <span class="state">{track ? '播放中' : '已停止'}</span>
        </button>
        {#if track}
          <VolumeSlider
            value={track.volume}
            oninput={(v) => setVol(sound.id, v)}
          />
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  section { padding: 1.5rem; }
  h2 { font-weight: 600; margin: 0 0 0.25rem; }
  .hint { color: var(--text-dim); margin: 0 0 1rem; font-size: 0.85rem; }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
  li {
    background: var(--bg-elevated);
    border-radius: 12px;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  li.active { outline: 1px solid var(--accent); }
  .toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    text-align: left;
  }
  .name { font-size: 1rem; }
  .state { font-size: 0.8rem; color: var(--text-dim); }
</style>
