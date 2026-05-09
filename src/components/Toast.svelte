<script lang="ts">
  import { toastStore } from '../lib/stores/toastStore.svelte';
</script>

<div class="layer">
  {#each toastStore.toasts as t (t.id)}
    <div class="toast" class:error={t.kind === 'error'} role="status">
      {t.text}
    </div>
  {/each}
</div>

<style>
  .layer {
    position: fixed;
    top: env(safe-area-inset-top, 0);
    inset-inline: 0;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    pointer-events: none;
    z-index: 100;
  }
  .toast {
    background: var(--bg-elevated);
    border-left: 3px solid var(--accent);
    padding: 0.65rem 0.9rem;
    border-radius: 8px;
    font-size: 0.9rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  }
  .toast.error { border-left-color: var(--danger); }
</style>
