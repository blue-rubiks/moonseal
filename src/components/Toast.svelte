<script lang="ts">
  import { toastStore } from '../lib/stores/toastStore.svelte';
  import { uiStore } from '../lib/stores/uiStore.svelte';
</script>

<div class="layer" class:mobile={uiStore.mobile}>
  {#each toastStore.toasts as t (t.id)}
    <div class="toast" class:error={t.kind === 'error'} role="status">
      {t.text}
    </div>
  {/each}
</div>

<style>
  .layer {
    position: fixed;
    inset-inline: 0;
    bottom: 110px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    z-index: 200;
  }
  .layer.mobile { bottom: calc(160px + env(safe-area-inset-bottom)); }
  .toast {
    background: var(--ink);
    color: var(--bg);
    padding: 10px 18px;
    font-size: 13px;
    letter-spacing: 0.05em;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    max-width: 80vw;
  }
  .toast.error {
    background: var(--seal);
    color: var(--bg-elev);
  }
</style>
