<script lang="ts">
  import { timerStore } from '../lib/stores/timerStore.svelte';

  const PRESETS = [15, 30, 45, 60, 90];

  function fmt(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
</script>

<div class="dial">
  {#if timerStore.running}
    <div class="active">
      <span class="time">{fmt(timerStore.remainingSec)}</span>
      <button class="cancel" onclick={() => timerStore.cancel()}>取消</button>
    </div>
  {:else}
    <div class="presets">
      <span class="label">睡眠定時</span>
      <div class="buttons">
        {#each PRESETS as min (min)}
          <button onclick={() => timerStore.start(min)}>{min} 分</button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .dial { padding: 1rem; }
  .label { font-size: 0.85rem; color: var(--text-dim); margin-right: 0.5rem; }
  .buttons { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.5rem; }
  .buttons button {
    background: var(--bg-elevated);
    border-radius: 999px;
    padding: 0.4rem 0.85rem;
    font-size: 0.85rem;
  }
  .active { display: flex; align-items: center; gap: 1rem; }
  .time { font-variant-numeric: tabular-nums; font-size: 1.1rem; }
  .cancel {
    background: var(--bg-elevated);
    color: var(--danger);
    padding: 0.35rem 0.8rem;
    border-radius: 999px;
    font-size: 0.85rem;
  }
</style>
