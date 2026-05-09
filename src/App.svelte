<script lang="ts">
  import Home from './routes/Home.svelte';
  import Mixer from './routes/Mixer.svelte';

  let route = $state<'home' | 'mixer' | 'stories' | 'library'>('home');
</script>

<header>
  <h1>白噪音與睡眠</h1>
</header>

<main>
  {#if route === 'home'}
    <Home />
  {:else if route === 'mixer'}
    <Mixer />
  {:else if route === 'stories'}
    <p>故事 (尚未實作)</p>
  {:else if route === 'library'}
    <p>我的 (尚未實作)</p>
  {/if}
</main>

<nav>
  <button class:active={route === 'home'} onclick={() => route = 'home'}>首頁</button>
  <button class:active={route === 'mixer'} onclick={() => route = 'mixer'}>混音</button>
  <button class:active={route === 'stories'} onclick={() => route = 'stories'}>故事</button>
  <button class:active={route === 'library'} onclick={() => route = 'library'}>我的</button>
</nav>

<style>
  header { padding: 1.25rem 1.5rem 0; }
  h1 { font-size: 1.1rem; font-weight: 500; margin: 0; opacity: 0.7; }
  main { padding-bottom: 5rem; }
  nav {
    position: fixed;
    bottom: 0;
    inset-inline: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: var(--bg-elevated);
    border-top: 1px solid #ffffff10;
    padding: 0.5rem env(safe-area-inset-right) calc(env(safe-area-inset-bottom) + 0.5rem) env(safe-area-inset-left);
  }
  nav button { padding: 0.75rem 0; font-size: 0.875rem; color: var(--text-dim); }
  nav button.active { color: var(--text); font-weight: 600; }
</style>
