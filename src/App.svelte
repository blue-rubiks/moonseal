<script lang="ts">
  let route = $state<'home' | 'mixer' | 'stories' | 'library'>('home');
</script>

<main>
  <h1>白噪音與睡眠</h1>
  <p>Current route: {route}</p>
  <nav>
    <button onclick={() => route = 'home'}>首頁</button>
    <button onclick={() => route = 'mixer'}>混音</button>
    <button onclick={() => route = 'stories'}>故事</button>
    <button onclick={() => route = 'library'}>我的</button>
  </nav>
</main>

<style>
  main { padding: 2rem; }
  nav { display: flex; gap: 1rem; margin-top: 1rem; }
</style>
