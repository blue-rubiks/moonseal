<script lang="ts">
  interface Props {
    value: number;
    label?: string;
    disabled?: boolean;
    oninput: (v: number) => void;
  }
  let { value, label, disabled = false, oninput }: Props = $props();

  let trackEl: HTMLDivElement | undefined = $state();

  function update(clientX: number) {
    if (!trackEl) return;
    const r = trackEl.getBoundingClientRect();
    const x = clientX - r.left;
    const v = Math.max(0, Math.min(1, x / r.width));
    oninput(v);
  }

  function onPointerDown(e: PointerEvent) {
    if (disabled) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    update(e.clientX);
  }
  function onPointerMove(e: PointerEvent) {
    if (disabled) return;
    if (e.buttons !== 1) return;
    update(e.clientX);
  }
</script>

<div class="wrap">
  {#if label}<span class="label">{label}</span>{/if}
  <div class="track"
       bind:this={trackEl}
       class:disabled
       role="slider"
       tabindex={disabled ? -1 : 0}
       aria-valuemin="0"
       aria-valuemax="100"
       aria-valuenow={Math.round(value * 100)}
       aria-label={label ?? '音量'}
       onpointerdown={onPointerDown}
       onpointermove={onPointerMove}>
    <span class="line"></span>
    {#if !disabled}
      <span class="fill" style:width={`${value * 100}%`}></span>
      <span class="thumb" style:left={`${value * 100}%`}></span>
    {/if}
  </div>
</div>

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }
  .label {
    font-size: 11px;
    color: var(--mute);
    letter-spacing: 0.1em;
  }
  .track {
    flex: 1;
    height: 24px;
    position: relative;
    cursor: pointer;
    display: flex;
    align-items: center;
    touch-action: none;
  }
  .track.disabled { cursor: default; }
  .line {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 1px;
    background: var(--line);
    transform: translateY(-50%);
  }
  .fill {
    position: absolute;
    left: 0;
    top: 50%;
    height: 1px;
    background: var(--ink);
    transform: translateY(-50%);
  }
  .thumb {
    position: absolute;
    top: 50%;
    width: 10px;
    height: 10px;
    background: var(--seal);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 0 4px var(--bg);
  }
</style>
