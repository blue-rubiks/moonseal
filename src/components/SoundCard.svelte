<script lang="ts">
  import type { SoundDef } from '../lib/audio/types';
  import { audioStore } from '../lib/stores/audioStore.svelte';
  import { favoritesRepo } from '../lib/storage/FavoritesRepo';
  import Glyph from './Glyph.svelte';

  interface Props {
    sound: SoundDef;
    index: number;
  }
  let { sound, index }: Props = $props();

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

  let label = $derived(`0${index + 1}`.slice(-2));
</script>

<div class="card" class:active>
  <button class="hit" onclick={toggle} aria-pressed={active} aria-label={sound.nameKey}>
    <span class="num en">{label}</span>
    <span class="glyph">
      <Glyph kind={sound.iconKey} size={42} sw={1}/>
    </span>
    <span class="meta">
      <span class="name">{sound.nameKey}</span>
      <span class="en sub">{sound.id.toUpperCase()}</span>
    </span>
    {#if active}
      <span class="playing">
        <span class="dot"></span>
        <span>播放中</span>
      </span>
    {/if}
  </button>
  <button class="fav" class:on={favored} onclick={toggleFav} aria-label="收藏">
    <Glyph kind={favored ? 'heart-fill' : 'heart'} size={14} sw={1.2}/>
  </button>
</div>

<style>
  .card {
    background: transparent;
    border: 1px solid var(--line);
    position: relative;
    min-height: 168px;
    transition: background .2s, border-color .2s;
    user-select: none;
  }
  .card:hover { background: var(--bg-elev); }
  .card.active {
    background: var(--bg-elev);
    border-color: var(--ink);
  }
  .hit {
    width: 100%;
    height: 100%;
    min-height: 168px;
    padding: 28px 22px 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    text-align: left;
    cursor: pointer;
    color: inherit;
    background: transparent;
    border: 0;
  }
  .num {
    position: absolute;
    top: 10px;
    left: 12px;
    font-size: 11px;
    color: var(--mute);
    letter-spacing: 0.1em;
  }
  .glyph { display: block; line-height: 0; }
  .meta { display: block; }
  .name { display: block; }
  .sub { display: block; }
  .playing { display: inline-flex; }
  .fav {
    position: absolute;
    top: 6px;
    right: 6px;
    padding: 12px;
    color: var(--mute);
    line-height: 0;
    z-index: 2;
  }
  .fav.on { color: var(--seal); }
  .glyph {
    color: var(--ink-soft);
    margin-top: 12px;
  }
  .meta { margin-top: auto; }
  .name {
    font-size: 22px;
    font-weight: 500;
    line-height: 1.2;
  }
  .sub {
    font-size: 11px;
    color: var(--mute);
    letter-spacing: 0.1em;
    margin-top: 4px;
  }
  .playing {
    position: absolute;
    bottom: 10px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--seal);
    font-size: 10px;
    letter-spacing: 0.1em;
  }
  .dot {
    width: 6px;
    height: 6px;
    background: var(--seal);
    border-radius: 50%;
  }

  @media (max-width: 879px) {
    .card { min-height: 138px; }
    .hit { min-height: 138px; padding: 22px 16px 18px; }
    .name { font-size: 18px; }
  }
</style>
