<script lang="ts">
  interface Props {
    value: number;
    label?: string;
    oninput: (v: number) => void;
  }
  let { value, label, oninput }: Props = $props();

  function onInput(e: Event) {
    const v = Number((e.currentTarget as HTMLInputElement).value);
    oninput(v);
  }
</script>

<label class="wrap">
  {#if label}<span class="label">{label}</span>{/if}
  <input type="range" min="0" max="1" step="0.01" {value} oninput={onInput} />
</label>

<style>
  .wrap { display: flex; flex-direction: column; gap: 0.4rem; }
  .label { font-size: 0.8rem; color: var(--text-dim); }
  input[type=range] { width: 100%; accent-color: var(--accent); }
</style>
