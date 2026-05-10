<script lang="ts">
  import { uiStore, type Route } from '../lib/stores/uiStore.svelte';

  const TABS: ReadonlyArray<{ k: Route; label: string }> = [
    { k: 'home',  label: '首頁' },
    { k: 'mix',   label: '混音' },
    { k: 'story', label: '故事' },
    { k: 'mine',  label: '我的' }
  ];
</script>

<header class:mobile={uiStore.mobile}>
  <div class="brand">
    <span class="zh">白噪音 · 睡眠</span>
    {#if !uiStore.mobile}
      <span class="en latin">NOX · NOCTURNE</span>
    {/if}
  </div>
  {#if !uiStore.mobile}
    <nav>
      {#each TABS as t (t.k)}
        <button class:active={uiStore.route === t.k} onclick={() => uiStore.setRoute(t.k)}>
          {t.label}
          {#if uiStore.route === t.k}<span class="dot" aria-hidden="true"></span>{/if}
        </button>
      {/each}
    </nav>
  {/if}
</header>

<style>
  header {
    padding: 32px 56px 18px;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    position: relative;
    z-index: 4;
  }
  header.mobile { padding: 20px 24px 14px; }
  .brand { display: flex; align-items: baseline; gap: 14px; }
  .zh {
    font-size: 13px;
    letter-spacing: 0.4em;
    color: var(--mute);
  }
  header.mobile .zh { font-size: 12px; }
  .en {
    font-size: 11px;
    color: var(--mute);
    letter-spacing: 0.2em;
  }
  nav {
    display: flex;
    align-items: center;
    gap: 28px;
    font-size: 14px;
  }
  nav button {
    position: relative;
    padding: 0 0 4px;
    color: var(--mute);
    font-weight: 400;
    line-height: 1.2;
  }
  nav button.active { color: var(--ink); font-weight: 600; }
  .dot {
    position: absolute;
    left: 50%;
    bottom: -2px;
    width: 4px;
    height: 4px;
    background: var(--seal);
    border-radius: 50%;
    transform: translateX(-50%);
  }
</style>
