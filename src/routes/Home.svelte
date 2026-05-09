<script lang="ts">
  import { BUILTIN_SOUNDS } from '../lib/audio/builtinSounds';
  import SoundCard from '../components/SoundCard.svelte';
</script>

<section>
  <h2>聲音</h2>
  <div class="grid">
    {#each BUILTIN_SOUNDS as sound (sound.id)}
      <SoundCard {sound} />
    {/each}
  </div>
</section>

<style>
  section { padding: 1.5rem; }
  h2 { font-weight: 600; margin: 0 0 1rem; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
  }
</style>
