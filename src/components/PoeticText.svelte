<script lang="ts">
  interface Props { text: string | undefined; }
  let { text }: Props = $props();

  let displayText = $state('');
  let visible = $state(false);

  $effect(() => {
    if (!text) {
      visible = false;
      return;
    }
    visible = false;
    const fadeOutTimer = setTimeout(() => {
      displayText = text;
      visible = true;
    }, 600);
    return () => clearTimeout(fadeOutTimer);
  });
</script>

<p class="poetic" class:visible>{displayText}</p>

<style>
  .poetic {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.7;
    color: var(--text);
    text-align: center;
    opacity: 0;
    transition: opacity 1.2s ease;
    min-height: 3em;
  }
  .poetic.visible { opacity: 0.85; }
</style>
