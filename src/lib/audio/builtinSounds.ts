import type { SoundDef } from './types';

const B = import.meta.env.BASE_URL;

export const BUILTIN_SOUNDS: readonly SoundDef[] = [
  { id: 'ocean',     nameKey: '海浪',   type: 'file', src: `${B}audio/ocean.mp3`,     iconKey: 'wave' },
  { id: 'rain',      nameKey: '雨聲',   type: 'file', src: `${B}audio/rain.mp3`,      iconKey: 'rain' },
  { id: 'fireplace', nameKey: '壁爐',   type: 'file', src: `${B}audio/fireplace.mp3`, iconKey: 'fire' },
  { id: 'wind',      nameKey: '風聲',   type: 'file', src: `${B}audio/wind.mp3`,      iconKey: 'wind' },
  { id: 'birds',     nameKey: '鳥鳴',   type: 'file', src: `${B}audio/birds.mp3`,     iconKey: 'bird' },
  { id: 'stream',    nameKey: '溪流',   type: 'file', src: `${B}audio/stream.mp3`,    iconKey: 'stream' },
  { id: 'thunder',   nameKey: '雷聲',   type: 'file', src: `${B}audio/thunder.mp3`,   iconKey: 'thunder' },
  { id: 'white',     nameKey: '白噪音', type: 'synth', flavor: 'white',               iconKey: 'noise' }
] as const;

const SOUND_INDEX = new Map(BUILTIN_SOUNDS.map((s) => [s.id, s] as const));

export function getSoundById(id: string): SoundDef | undefined {
  return SOUND_INDEX.get(id);
}
