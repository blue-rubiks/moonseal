<script lang="ts">
  interface Props { text: string | undefined; }
  let { text }: Props = $props();

  let displayText = $state('');

  $effect(() => {
    if (!text) { displayText = ''; return; }
    const fadeOutTimer = setTimeout(() => {
      displayText = text;
    }, 600);
    return () => clearTimeout(fadeOutTimer);
  });
</script>

<p class="poetic">{displayText}</p>

<style>
  .poetic {
    margin: 0;
    font-family: 'Noto Serif TC', serif;
    font-size: 1.15rem;
    line-height: 1.8;
    color: var(--ink);
    text-align: center;
    min-height: 3em;
    animation: breathe 5s ease-in-out infinite;
  }
</style>
