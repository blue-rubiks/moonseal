<script lang="ts">
  import type { SoundDef } from '../lib/audio/types';
  import { audioStore } from '../lib/stores/audioStore.svelte';
  import { favoritesRepo } from '../lib/storage/FavoritesRepo';

  interface Props { sound: SoundDef; }
  let { sound }: Props = $props();

  let active = $derived(!!audioStore.tracks[sound.id]);
  let favored = $state(false);

  $effect(() => {
    favoritesRepo.isFavorite('sound', sound.id).then((v) => { favored = v; });
  });

  async function toggle() {
    await audioStore.toggleSound(sound.id, 0.7);
  }

  async function toggleFav(e: MouseEvent) {
    e.stopPropagation();
    if (favored) {
      const all = await favoritesRepo.listByType('sound');
      const found = all.find((f) => f.refId === sound.id);
      if (found) await favoritesRepo.remove(found.id);
      favored = false;
    } else {
      await favoritesRepo.add({ type: 'sound', refId: sound.id });
      favored = true;
    }
  }
</script>

<div class="wrap">
  <button class="card" class:active onclick={toggle} aria-pressed={active}>
    <div class="icon" data-icon={sound.iconKey}>♪</div>
    <div class="name">{sound.nameKey}</div>
  </button>
  <button class="fav" class:on={favored} onclick={toggleFav} aria-label="收藏">
    {favored ? '♥' : '♡'}
  </button>
</div>

<style>
  .wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
  }
  .card {
    background: var(--bg-elevated);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: transform 80ms, background 200ms;
    width: 100%;
    height: 100%;
  }
  .card:hover { transform: scale(1.02); }
  .card.active { background: var(--accent); color: #fff; }
  .icon { font-size: 2.5rem; opacity: 0.85; }
  .name { font-size: 0.95rem; }
  .fav {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    width: 2.25rem;
    height: 2.25rem;
    display: grid;
    place-items: center;
    font-size: 1.2rem;
    line-height: 1;
    color: var(--text-dim);
    border-radius: 999px;
    z-index: 1;
  }
  .fav:hover { background: rgba(255, 255, 255, 0.06); }
  .fav.on { color: #ff5f7a; }
</style>
