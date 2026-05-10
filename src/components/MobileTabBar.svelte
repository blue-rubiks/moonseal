<script lang="ts">
  import { uiStore, type Route } from '../lib/stores/uiStore.svelte';

  const TABS: ReadonlyArray<{ k: Route; label: string }> = [
    { k: 'home',  label: '首頁' },
    { k: 'mix',   label: '混音' },
    { k: 'story', label: '夜讀' },
    { k: 'mine',  label: '我的' }
  ];
</script>

<nav class="tabbar">
  {#each TABS as t (t.k)}
    <button class:active={uiStore.route === t.k} onclick={() => uiStore.setRoute(t.k)}>
      {#if uiStore.route === t.k}<span class="bar" aria-hidden="true"></span>{/if}
      {t.label}
    </button>
  {/each}
</nav>

<style>
  .tabbar {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 5;
    background: var(--bg-elev);
    border-top: 1px solid var(--line);
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding: 10px env(safe-area-inset-right) calc(env(safe-area-inset-bottom) + 12px) env(safe-area-inset-left);
  }
  .tabbar button {
    position: relative;
    padding: 4px 0;
    font-size: 12px;
    color: var(--mute);
    line-height: 1.4;
  }
  .tabbar button.active { color: var(--ink); font-weight: 600; }
  .bar {
    position: absolute;
    top: 0;
    left: 50%;
    width: 16px;
    height: 1px;
    background: var(--seal);
    transform: translateX(-50%);
  }
</style>
