<script lang="ts">
  import { uiStore } from '../lib/stores/uiStore.svelte';
  import Glyph from './Glyph.svelte';
</script>

<button class="fab" class:mobile={uiStore.mobile} aria-label="睡眠計時"
        onclick={() => uiStore.openTimer()}>
  <Glyph kind="timer" size={20} sw={1.2}/>
</button>

<style>
  .fab {
    position: fixed;
    z-index: 7;
    right: 32px;
    bottom: 92px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--bg);
    border: 1px solid var(--ink);
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(60, 40, 20, 0.12);
  }
  .fab:hover { background: var(--bg-elev); }
  .fab.mobile {
    right: 20px;
    bottom: calc(140px + env(safe-area-inset-bottom));
    width: 52px;
    height: 52px;
  }
</style>
