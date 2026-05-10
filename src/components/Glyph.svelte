<script lang="ts">
  export type GlyphKind =
    | 'wave' | 'rain' | 'fire' | 'wind' | 'birds' | 'creek' | 'thunder' | 'white'
    | 'play' | 'pause' | 'stop' | 'timer' | 'heart' | 'heart-fill'
    | 'arrow-l' | 'plus' | 'moon' | 'close' | 'check';

  interface Props {
    kind: GlyphKind | string;
    size?: number;
    sw?: number;
  }
  let { kind, size = 24, sw = 1 }: Props = $props();

  // builtinSounds 用 bird/stream/noise，這裡 alias 到 design 用的 birds/creek/white
  const ALIAS: Record<string, GlyphKind> = {
    bird: 'birds',
    stream: 'creek',
    noise: 'white',
    ocean: 'wave',
    fireplace: 'fire'
  };
  let resolved = $derived((ALIAS[kind] ?? kind) as GlyphKind);
</script>

<svg width={size} height={size} viewBox="0 0 32 32" fill="none"
     stroke="currentColor" stroke-width={sw}
     stroke-linecap="round" stroke-linejoin="round">
  {#if resolved === 'wave'}
    <path d="M2 18 Q7 12 12 18 T22 18 T32 18" opacity="0.55"/>
    <path d="M2 22 Q7 16 12 22 T22 22 T32 22"/>
    <path d="M2 26 Q7 20 12 26 T22 26 T32 26" opacity="0.4"/>
  {:else if resolved === 'rain'}
    <path d="M8 5 v10" opacity="0.5"/>
    <path d="M14 8 v10"/>
    <path d="M20 4 v10" opacity="0.4"/>
    <path d="M26 9 v10" opacity="0.6"/>
    <path d="M11 19 v6"/>
    <path d="M17 22 v6" opacity="0.5"/>
    <path d="M23 19 v6" opacity="0.4"/>
  {:else if resolved === 'fire'}
    <path d="M16 4 C12 10 10 12 10 17 C10 22 13 26 16 26 C19 26 22 22 22 17 C22 14 20 12 18 14 C19 10 17 7 16 4 Z"/>
    <path d="M14 19 C14 22 16 24 16 24 C16 24 18 22 18 19" opacity="0.5"/>
  {:else if resolved === 'wind'}
    <path d="M3 10 H20 a3 3 0 1 0 -3 -3"/>
    <path d="M3 16 H26 a3 3 0 1 1 -3 3" opacity="0.7"/>
    <path d="M3 22 H16 a2 2 0 1 0 -2 -2" opacity="0.5"/>
  {:else if resolved === 'birds'}
    <path d="M3 14 Q8 9 12 14 Q16 9 20 14"/>
    <path d="M16 22 Q21 17 25 22 Q29 17 31 20" opacity="0.55"/>
  {:else if resolved === 'creek'}
    <path d="M4 8 C10 8 8 14 14 14 S18 20 24 20 S28 24 30 24"/>
    <path d="M2 16 C8 16 6 22 12 22" opacity="0.5"/>
  {:else if resolved === 'thunder'}
    <path d="M5 6 Q12 4 18 7 T29 8" opacity="0.5"/>
    <path d="M3 12 Q10 10 16 13 T28 14" opacity="0.7"/>
    <path d="M16 12 L11 22 H17 L13 30"/>
  {:else if resolved === 'white'}
    <circle cx="16" cy="16" r="11" opacity="0.4"/>
    <circle cx="16" cy="16" r="7" opacity="0.65"/>
    <circle cx="16" cy="16" r="3"/>
  {:else if resolved === 'play'}
    <path d="M9 6 L25 16 L9 26 Z" fill="currentColor" stroke="none"/>
  {:else if resolved === 'pause'}
    <rect x="9" y="6" width="4" height="20" fill="currentColor" stroke="none"/>
    <rect x="19" y="6" width="4" height="20" fill="currentColor" stroke="none"/>
  {:else if resolved === 'stop'}
    <rect x="8" y="8" width="16" height="16" fill="currentColor" stroke="none"/>
  {:else if resolved === 'timer'}
    <circle cx="16" cy="17" r="11"/>
    <path d="M16 11 v6 l4 3"/>
    <path d="M11 4 h10"/>
  {:else if resolved === 'heart'}
    <path d="M16 26 C5 19 5 11 11 9 C14 8 16 11 16 12 C16 11 18 8 21 9 C27 11 27 19 16 26 Z"/>
  {:else if resolved === 'heart-fill'}
    <path d="M16 26 C5 19 5 11 11 9 C14 8 16 11 16 12 C16 11 18 8 21 9 C27 11 27 19 16 26 Z" fill="currentColor"/>
  {:else if resolved === 'arrow-l'}
    <path d="M20 6 L10 16 L20 26"/>
  {:else if resolved === 'plus'}
    <path d="M16 6 v20 M6 16 h20"/>
  {:else if resolved === 'moon'}
    <path d="M22 19 A10 10 0 1 1 13 6 A8 8 0 0 0 22 19 Z"/>
  {:else if resolved === 'close'}
    <path d="M8 8 L24 24 M24 8 L8 24"/>
  {:else if resolved === 'check'}
    <path d="M6 16 L13 23 L26 9"/>
  {:else}
    <circle cx="16" cy="16" r="6"/>
  {/if}
</svg>
