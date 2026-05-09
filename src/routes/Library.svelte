<script lang="ts">
  import { favoritesRepo } from '../lib/storage/FavoritesRepo';
  import { recentsRepo } from '../lib/storage/RecentsRepo';
  import { getSoundById } from '../lib/audio/builtinSounds';
  import { audioStore } from '../lib/stores/audioStore.svelte';
  import type { FavoriteRecord, RecentRecord } from '../lib/storage/db';

  let favorites = $state<FavoriteRecord[]>([]);
  let recents = $state<RecentRecord[]>([]);

  async function refresh() {
    favorites = await favoritesRepo.listAll();
    recents = await recentsRepo.listRecent();
  }

  $effect(() => { void refresh(); });

  async function play(refId: string) {
    await audioStore.toggleSound(refId, 0.7);
    await refresh();
  }

  function labelFor(refId: string): string {
    return getSoundById(refId)?.nameKey ?? refId;
  }
</script>

<section>
  <h2>收藏</h2>
  {#if favorites.length === 0}
    <p class="empty">還沒有收藏</p>
  {:else}
    <ul>
      {#each favorites as fav (fav.id)}
        <li>
          <button onclick={() => play(fav.refId)}>
            <span class="type">{fav.type}</span>
            <span>{labelFor(fav.refId)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <h2>最近播放</h2>
  {#if recents.length === 0}
    <p class="empty">尚未播放任何聲音</p>
  {:else}
    <ul>
      {#each recents as r (r.id)}
        <li>
          <button onclick={() => play(r.refId)}>
            <span class="type">{r.type}</span>
            <span>{labelFor(r.refId)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  section { padding: 1.5rem; }
  h2 { font-weight: 600; margin: 0 0 0.75rem; font-size: 1rem; }
  h2:not(:first-child) { margin-top: 1.5rem; }
  .empty { color: var(--text-dim); font-size: 0.9rem; }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  li button {
    width: 100%;
    text-align: left;
    background: var(--bg-elevated);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    display: flex;
    gap: 0.75rem;
  }
  .type {
    font-size: 0.7rem;
    color: var(--text-dim);
    text-transform: uppercase;
    align-self: center;
  }
</style>
