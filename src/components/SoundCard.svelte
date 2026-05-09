<script lang="ts">
  import type { SoundDef } from '../lib/audio/types';
  import { audioStore } from '../lib/stores/audioStore.svelte';

  interface Props { sound: SoundDef; }
  let { sound }: Props = $props();

  let active = $derived(!!audioStore.tracks[sound.id]);

  async function toggle() {
    await audioStore.toggleSound(sound.id, 0.7);
  }
</script>

<button class="card" class:active onclick={toggle} aria-pressed={active}>
  <div class="icon" data-icon={sound.iconKey}>♪</div>
  <div class="name">{sound.nameKey}</div>
</button>

<style>
  .card {
    background: var(--bg-elevated);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    transition: transform 80ms, background 200ms;
    width: 100%;
    aspect-ratio: 1;
  }
  .card:hover { transform: scale(1.02); }
  .card.active { background: var(--accent); color: #fff; }
  .icon { font-size: 2.5rem; opacity: 0.85; }
  .name { font-size: 0.95rem; }
</style>
