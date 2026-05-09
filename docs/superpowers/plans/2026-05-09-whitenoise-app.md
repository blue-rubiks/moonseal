# 白噪音與睡眠 App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Linux-developed, browser-based PWA white-noise sleep app with 8 sounds, multi-track mixing, story mode (auto-crossfade audio sequences with poetic text), custom story editor, sleep timer, favorites, IndexedDB persistence, and Docker deployment.

**Architecture:** Pure-frontend SPA. Svelte 5 (runes) UI + reactive store layer + domain layer (AudioEngine, StoryRunner, SleepTimer, IndexedDB Repos) + PWA via vite-plugin-pwa. UI never touches Tone.js directly — only via `audioStore`. StoryRunner is decoupled from AudioEngine (event-based). Multi-stage Docker (Node 24 builder → nginx:alpine runtime).

**Tech Stack:** Node 24 LTS · TypeScript 6.0.3 · Svelte 5.55.5 (runes) · Vite 8 + vite-plugin-pwa · Tone.js 15 · idb 8 · Vitest 4 + fake-indexeddb · pnpm · Docker (nginx:alpine).

**Spec:** [`docs/superpowers/specs/2026-05-09-whitenoise-design.md`](../specs/2026-05-09-whitenoise-design.md)

---

## File Structure

```
whitenoise/
├── public/
│   ├── audio/{ocean,rain,fireplace,wind,birds,stream,thunder}.mp3
│   ├── stories/{seaside-walk,rainy-fireplace,forest-spa,mountain-stream,summer-thunder}.json
│   └── icons/{icon-192,icon-512,icon-maskable-512}.png
├── src/
│   ├── lib/
│   │   ├── audio/{AudioEngine,NoiseGenerator,builtinSounds,types}.ts
│   │   ├── story/{StoryRunner,builtinStories,types}.ts
│   │   ├── timer/SleepTimer.ts
│   │   ├── storage/{db,StoryRepo,FavoritesRepo,MixRepo,RecentsRepo,SettingsRepo}.ts
│   │   └── stores/{audioStore,storyStore,timerStore}.svelte.ts
│   ├── routes/{Home,Mixer,Stories,StoryPlayer,StoryEditor,Library}.svelte
│   ├── components/{PlayerBar,SoundCard,VolumeSlider,TimerDial,PoeticText,Toast}.svelte
│   ├── App.svelte
│   └── main.ts
├── tests/
│   ├── setup.ts
│   ├── audio/{AudioEngine,NoiseGenerator}.test.ts
│   ├── story/StoryRunner.test.ts
│   ├── timer/SleepTimer.test.ts
│   └── storage/{StoryRepo,FavoritesRepo,MixRepo,RecentsRepo,SettingsRepo}.test.ts
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── svelte.config.js
├── package.json
├── pnpm-lock.yaml
├── Dockerfile
├── .dockerignore
├── docker-compose.yml
├── nginx.conf
├── .nvmrc
├── .gitignore
└── README.md
```

---

# Milestone M1 — Project Skeleton + Foundation

## Task 1: Initialize Vite + Svelte + TypeScript project

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml` (empty if not needed), `tsconfig.json`, `tsconfig.node.json`, `svelte.config.js`, `vite.config.ts`, `.gitignore`, `.nvmrc`, `src/main.ts`, `src/App.svelte`, `src/app.d.ts`, `index.html`

- [ ] **Step 1: Create the project directory and init git**

```bash
cd /home/twtrubiks/open
mkdir -p whitenoise
cd whitenoise
git init -b main
```

- [ ] **Step 2: Create `.nvmrc` pinning Node 24**

```
24
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules
dist
.svelte-kit
*.log
.env*
.DS_Store
coverage
```

- [ ] **Step 4: Create `package.json`**

```json
{
  "name": "whitenoise",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "node": ">=24.0.0"
  },
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 4173",
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui"
  }
}
```

- [ ] **Step 5: Install dependencies**

```bash
corepack enable
pnpm add svelte@5.55.5 tone@15.1.22 idb@8.0.3
pnpm add -D typescript@6.0.3 vite@8.0.11 @sveltejs/vite-plugin-svelte@latest \
  svelte-check@latest vite-plugin-pwa@1.3.0 \
  vitest@4.1.5 @testing-library/svelte@5.3.1 \
  @testing-library/jest-dom@latest jsdom@latest fake-indexeddb@6.2.5 \
  @types/node@latest
```

- [ ] **Step 6: Create `svelte.config.js`**

```javascript
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess()
};
```

- [ ] **Step 7: Create `tsconfig.json`** with strict settings from spec §4.3

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2024", "DOM", "DOM.Iterable", "WebWorker"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "useDefineForClassFields": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src/**/*", "src/**/*.svelte", "tests/**/*"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 8: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 9: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    host: true
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts']
  }
});
```

- [ ] **Step 10: Create `index.html`**

```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0b0d12" />
    <title>白噪音與睡眠</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 11: Create `src/app.d.ts`**

```typescript
/// <reference types="svelte" />
/// <reference types="vite/client" />
```

- [ ] **Step 12: Create `src/main.ts`**

```typescript
import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

const target = document.getElementById('app');
if (!target) throw new Error('#app element not found');

const app = mount(App, { target });

export default app;
```

- [ ] **Step 13: Create `src/app.css`** (dark base styles)

```css
:root {
  color-scheme: dark;
  --bg: #0b0d12;
  --bg-elevated: #161922;
  --text: #e8eaef;
  --text-dim: #8a8f9c;
  --accent: #6b9bd2;
  --danger: #d2796b;
  font-family: system-ui, -apple-system, "PingFang TC", "Noto Sans TC", sans-serif;
  font-size: 16px;
  line-height: 1.5;
}

* { box-sizing: border-box; }

html, body { margin: 0; padding: 0; min-height: 100dvh; }

body {
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}

button {
  font: inherit;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 0;
}
```

- [ ] **Step 14: Create `src/App.svelte`** (placeholder homepage)

```svelte
<script lang="ts">
  let route = $state<'home' | 'mixer' | 'stories' | 'library'>('home');
</script>

<main>
  <h1>白噪音與睡眠</h1>
  <p>Current route: {route}</p>
  <nav>
    <button onclick={() => route = 'home'}>首頁</button>
    <button onclick={() => route = 'mixer'}>混音</button>
    <button onclick={() => route = 'stories'}>故事</button>
    <button onclick={() => route = 'library'}>我的</button>
  </nav>
</main>

<style>
  main { padding: 2rem; }
  nav { display: flex; gap: 1rem; margin-top: 1rem; }
</style>
```

- [ ] **Step 15: Verify dev server runs**

Run: `pnpm dev`
Expected: Vite prints `Local: http://localhost:5173/`, opens in browser, page shows "白噪音與睡眠" with 4 nav buttons that change `route`. Stop with Ctrl+C.

- [ ] **Step 16: Verify build works**

Run: `pnpm build`
Expected: tsc completes with no errors; vite builds to `dist/` with no warnings.

- [ ] **Step 17: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + Svelte 5 + TS 6 project skeleton"
```

---

## Task 2: Set up Vitest with first sanity test

**Files:**
- Create: `tests/setup.ts`, `tests/sanity.test.ts`

- [ ] **Step 1: Create `tests/setup.ts`** (initializes fake-indexeddb + jest-dom matchers globally)

```typescript
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: Write a sanity test** at `tests/sanity.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('test infrastructure', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('has fake-indexeddb', () => {
    expect(typeof indexedDB).toBe('object');
    expect(indexedDB).not.toBeNull();
  });

  it('has jsdom DOM globals', () => {
    expect(typeof document).toBe('object');
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement);
  });
});
```

- [ ] **Step 3: Run test**

Run: `pnpm test:run`
Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/
git commit -m "test: add Vitest setup with fake-indexeddb and jsdom"
```

---

## Task 3: Define audio domain types and 8 builtin sound definitions

**Files:**
- Create: `src/lib/audio/types.ts`, `src/lib/audio/builtinSounds.ts`
- Test: `tests/audio/builtinSounds.test.ts`

- [ ] **Step 1: Create `src/lib/audio/types.ts`**

```typescript
export type SoundType = 'file' | 'synth';

export type SynthFlavor = 'white' | 'pink' | 'brown';

export interface SoundDef {
  id: string;
  nameKey: string;
  type: SoundType;
  src?: string;
  flavor?: SynthFlavor;
  iconKey: string;
}

export interface PlaybackHandle {
  soundId: string;
  stop: (fadeSec?: number) => Promise<void>;
  setVolume: (volume: number, rampSec?: number) => void;
}
```

- [ ] **Step 2: Write failing test** at `tests/audio/builtinSounds.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { BUILTIN_SOUNDS, getSoundById } from '../../src/lib/audio/builtinSounds';

describe('builtinSounds', () => {
  it('exposes 8 sound definitions', () => {
    expect(BUILTIN_SOUNDS).toHaveLength(8);
  });

  it('has all expected sound ids', () => {
    const ids = BUILTIN_SOUNDS.map((s) => s.id).sort();
    expect(ids).toEqual([
      'birds', 'fireplace', 'ocean', 'rain', 'stream', 'thunder', 'white', 'wind'
    ]);
  });

  it('marks white as synth and others as file', () => {
    const white = getSoundById('white');
    expect(white?.type).toBe('synth');
    expect(white?.flavor).toBe('white');
    expect(getSoundById('ocean')?.type).toBe('file');
  });

  it('returns undefined for unknown id', () => {
    expect(getSoundById('does-not-exist')).toBeUndefined();
  });

  it('every file-type sound has a src', () => {
    for (const s of BUILTIN_SOUNDS) {
      if (s.type === 'file') expect(s.src).toMatch(/\.mp3$/);
    }
  });
});
```

- [ ] **Step 3: Run test, expect fail**

Run: `pnpm test:run tests/audio/builtinSounds.test.ts`
Expected: FAIL — `Cannot find module '...builtinSounds'`.

- [ ] **Step 4: Implement `src/lib/audio/builtinSounds.ts`**

```typescript
import type { SoundDef } from './types';

export const BUILTIN_SOUNDS: readonly SoundDef[] = [
  { id: 'ocean',     nameKey: '海浪',   type: 'file', src: '/audio/ocean.mp3',     iconKey: 'wave' },
  { id: 'rain',      nameKey: '雨聲',   type: 'file', src: '/audio/rain.mp3',      iconKey: 'rain' },
  { id: 'fireplace', nameKey: '壁爐',   type: 'file', src: '/audio/fireplace.mp3', iconKey: 'fire' },
  { id: 'wind',      nameKey: '風聲',   type: 'file', src: '/audio/wind.mp3',      iconKey: 'wind' },
  { id: 'birds',     nameKey: '鳥鳴',   type: 'file', src: '/audio/birds.mp3',     iconKey: 'bird' },
  { id: 'stream',    nameKey: '溪流',   type: 'file', src: '/audio/stream.mp3',    iconKey: 'stream' },
  { id: 'thunder',   nameKey: '雷聲',   type: 'file', src: '/audio/thunder.mp3',   iconKey: 'thunder' },
  { id: 'white',     nameKey: '白噪音', type: 'synth', flavor: 'white',            iconKey: 'noise' }
] as const;

const SOUND_INDEX = new Map(BUILTIN_SOUNDS.map((s) => [s.id, s] as const));

export function getSoundById(id: string): SoundDef | undefined {
  return SOUND_INDEX.get(id);
}
```

- [ ] **Step 5: Run test, expect pass**

Run: `pnpm test:run tests/audio/builtinSounds.test.ts`
Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/audio/ tests/audio/
git commit -m "feat(audio): add SoundDef types and 8 builtin sound definitions"
```

---

## Task 4: Audio asset placeholders

**Files:**
- Create: 7 silent placeholder mp3 files in `public/audio/`
- Create: `public/audio/README.md`

> Real audio sourcing happens during M6 acceptance. For now we need files at the right paths so the app can load without 404s. Generate a 5-second silent mp3 with ffmpeg and copy it to each filename.

- [ ] **Step 1: Generate one silent placeholder mp3**

Run:
```bash
mkdir -p public/audio
ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 5 -b:a 96k public/audio/_silence.mp3 -y
```
Expected: 5-second silent stereo mp3 at `public/audio/_silence.mp3`. If `ffmpeg` is missing, install with `sudo apt install ffmpeg`.

- [ ] **Step 2: Copy as the 7 sound names**

Run:
```bash
for name in ocean rain fireplace wind birds stream thunder; do
  cp public/audio/_silence.mp3 "public/audio/${name}.mp3"
done
rm public/audio/_silence.mp3
ls public/audio/
```
Expected: 7 mp3 files listed.

- [ ] **Step 3: Create `public/audio/README.md`**

```markdown
# Audio assets

These are silent placeholders. Replace each file with a CC0 / CC-BY licensed loop-friendly recording before release. Sources are listed in `docs/superpowers/specs/2026-05-09-whitenoise-design.md` §11.

Format: mp3, 128 kbps, stereo, 60-120 seconds, with ~1s fade-in/out at the loop seam.

Filenames must remain exactly:
- ocean.mp3, rain.mp3, fireplace.mp3, wind.mp3, birds.mp3, stream.mp3, thunder.mp3
```

- [ ] **Step 4: Commit**

```bash
git add public/audio/
git commit -m "chore(audio): add silent mp3 placeholders for 7 file-based sounds"
```

---

# Milestone M2 — Audio Engine + Home + Mixer + Library

## Task 5: NoiseGenerator (synth-based noise wrapper)

**Files:**
- Create: `src/lib/audio/NoiseGenerator.ts`
- Test: `tests/audio/NoiseGenerator.test.ts`

> NoiseGenerator wraps `Tone.Noise` so AudioEngine doesn't need to special-case synth sounds. The Tone class itself is real — we just verify our wrapper exposes the right API.

- [ ] **Step 1: Write failing test** at `tests/audio/NoiseGenerator.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const startMock = vi.fn();
const stopMock = vi.fn();
const disposeMock = vi.fn();
const connectMock = vi.fn();
let lastFlavor: string | undefined;

vi.mock('tone', () => {
  class FakeNoise {
    type: string;
    constructor(type: string) {
      this.type = type;
      lastFlavor = type;
    }
    start = startMock;
    stop = stopMock;
    dispose = disposeMock;
    connect = connectMock;
    toDestination() { return this; }
  }
  class FakeGain {
    gain = { value: 0, rampTo: vi.fn() };
    connect = connectMock;
    toDestination() { return this; }
    dispose = disposeMock;
  }
  return { Noise: FakeNoise, Gain: FakeGain };
});

import { createNoise } from '../../src/lib/audio/NoiseGenerator';

describe('NoiseGenerator', () => {
  beforeEach(() => {
    startMock.mockClear();
    stopMock.mockClear();
    disposeMock.mockClear();
    connectMock.mockClear();
    lastFlavor = undefined;
  });

  it('creates a Tone.Noise with the requested flavor', () => {
    const n = createNoise('pink');
    expect(lastFlavor).toBe('pink');
    expect(n).toBeDefined();
  });

  it('start() forwards to underlying noise', () => {
    const n = createNoise('white');
    n.start();
    expect(startMock).toHaveBeenCalledOnce();
  });

  it('stop() forwards to underlying noise', () => {
    const n = createNoise('white');
    n.stop();
    expect(stopMock).toHaveBeenCalledOnce();
  });

  it('dispose() releases underlying resources', () => {
    const n = createNoise('brown');
    n.dispose();
    expect(disposeMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `pnpm test:run tests/audio/NoiseGenerator.test.ts`
Expected: FAIL — `Cannot find module '...NoiseGenerator'`.

- [ ] **Step 3: Implement `src/lib/audio/NoiseGenerator.ts`**

```typescript
import { Noise, Gain } from 'tone';
import type { SynthFlavor } from './types';

export interface NoiseHandle {
  start(): void;
  stop(): void;
  setVolume(v: number, rampSec?: number): void;
  dispose(): void;
  readonly output: Gain;
}

export function createNoise(flavor: SynthFlavor): NoiseHandle {
  const noise = new Noise(flavor);
  const gain = new Gain(0).toDestination();
  noise.connect(gain);

  return {
    start() { noise.start(); },
    stop() { noise.stop(); },
    setVolume(v: number, rampSec = 0) {
      if (rampSec <= 0) gain.gain.value = v;
      else gain.gain.rampTo(v, rampSec);
    },
    dispose() {
      noise.dispose();
      gain.dispose();
    },
    output: gain
  };
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `pnpm test:run tests/audio/NoiseGenerator.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio/NoiseGenerator.ts tests/audio/NoiseGenerator.test.ts
git commit -m "feat(audio): add NoiseGenerator wrapper for Tone.Noise"
```

---

## Task 6: AudioEngine — playTrack / stop / setVolume

**Files:**
- Create: `src/lib/audio/AudioEngine.ts`
- Test: `tests/audio/AudioEngine.test.ts`

> AudioEngine is the only module allowed to import 'tone'. It exposes a small typed surface that the stores call.

- [ ] **Step 1: Write failing test** at `tests/audio/AudioEngine.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Tone.js mock ---
const playerInstances: FakePlayer[] = [];
const noiseInstances: FakeNoise[] = [];
const startMock = vi.fn(async () => {});
const loadedMock = vi.fn(async () => {});

class FakeRamp {
  rampTo = vi.fn();
  value = 0;
}
class FakeGain {
  gain = new FakeRamp();
  connect(_: unknown) { return this; }
  toDestination() { return this; }
  dispose = vi.fn();
}
class FakePlayer {
  src: string;
  loop = false;
  fadeIn = 0;
  fadeOut = 0;
  state = 'stopped';
  output = new FakeGain();
  start = vi.fn(() => { this.state = 'started'; });
  stop = vi.fn(() => { this.state = 'stopped'; });
  dispose = vi.fn();
  connect = vi.fn(() => this);
  toDestination = vi.fn(() => this);
  constructor(src: string) {
    this.src = src;
    playerInstances.push(this);
  }
}
class FakeNoise {
  type: string;
  state = 'stopped';
  start = vi.fn(() => { this.state = 'started'; });
  stop = vi.fn(() => { this.state = 'stopped'; });
  dispose = vi.fn();
  connect = vi.fn(() => this);
  toDestination = vi.fn(() => this);
  constructor(type: string) {
    this.type = type;
    noiseInstances.push(this);
  }
}

vi.mock('tone', () => ({
  Player: FakePlayer,
  Noise: FakeNoise,
  Gain: FakeGain,
  start: startMock,
  loaded: loadedMock,
  getDestination: () => new FakeGain()
}));

import { AudioEngine } from '../../src/lib/audio/AudioEngine';

describe('AudioEngine', () => {
  let engine: AudioEngine;

  beforeEach(() => {
    playerInstances.length = 0;
    noiseInstances.length = 0;
    startMock.mockClear();
    loadedMock.mockClear();
    engine = new AudioEngine();
  });

  it('initialize() calls Tone.start() (autoplay unlock)', async () => {
    await engine.initialize();
    expect(startMock).toHaveBeenCalledOnce();
  });

  it('playTrack creates a Tone.Player for file-type sounds and starts it', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.7);
    expect(playerInstances).toHaveLength(1);
    expect(playerInstances[0]?.src).toBe('/audio/ocean.mp3');
    expect(playerInstances[0]?.loop).toBe(true);
    expect(playerInstances[0]?.start).toHaveBeenCalled();
  });

  it('playTrack creates a Tone.Noise for synth-type sounds', async () => {
    await engine.initialize();
    await engine.playTrack('white', 0.5);
    expect(noiseInstances).toHaveLength(1);
    expect(noiseInstances[0]?.type).toBe('white');
    expect(noiseInstances[0]?.start).toHaveBeenCalled();
  });

  it('playTrack on the same id twice does not double-create', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.5);
    await engine.playTrack('ocean', 0.8);
    expect(playerInstances).toHaveLength(1);
  });

  it('setVolume ramps the track gain', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.5);
    engine.setVolume('ocean', 0.9, 1);
    expect(playerInstances[0]?.output.gain.rampTo).toHaveBeenCalledWith(0.9, 1);
  });

  it('stopTrack stops and disposes the Tone resource', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.5);
    await engine.stopTrack('ocean', 0);
    expect(playerInstances[0]?.stop).toHaveBeenCalled();
    expect(playerInstances[0]?.dispose).toHaveBeenCalled();
  });

  it('stopAll stops every active track', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.5);
    await engine.playTrack('rain', 0.5);
    await engine.stopAll(0);
    expect(playerInstances[0]?.stop).toHaveBeenCalled();
    expect(playerInstances[1]?.stop).toHaveBeenCalled();
  });

  it('throws on unknown sound id', async () => {
    await engine.initialize();
    await expect(engine.playTrack('not-a-sound', 0.5)).rejects.toThrow(/unknown sound/i);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `pnpm test:run tests/audio/AudioEngine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/audio/AudioEngine.ts`**

```typescript
import * as Tone from 'tone';
import { getSoundById } from './builtinSounds';
import type { SoundDef } from './types';

interface ActiveTrack {
  soundId: string;
  source: Tone.Player | Tone.Noise;
  gain: Tone.Gain;
}

export class AudioEngine {
  private initialized = false;
  private readonly tracks = new Map<string, ActiveTrack>();

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();
    this.initialized = true;
  }

  async playTrack(soundId: string, volume: number, fadeInSec = 1): Promise<void> {
    const def = getSoundById(soundId);
    if (!def) throw new Error(`unknown sound: ${soundId}`);
    if (this.tracks.has(soundId)) {
      this.setVolume(soundId, volume, fadeInSec);
      return;
    }
    const track = await this.createTrack(def, volume, fadeInSec);
    this.tracks.set(soundId, track);
    track.source.start();
    if (track.gain.gain.rampTo) {
      track.gain.gain.rampTo(volume, fadeInSec);
    } else {
      track.gain.gain.value = volume;
    }
  }

  setVolume(soundId: string, volume: number, rampSec = 0.1): void {
    const t = this.tracks.get(soundId);
    if (!t) return;
    t.gain.gain.rampTo(volume, rampSec);
  }

  async stopTrack(soundId: string, fadeOutSec = 0.5): Promise<void> {
    const t = this.tracks.get(soundId);
    if (!t) return;
    if (fadeOutSec > 0) {
      t.gain.gain.rampTo(0, fadeOutSec);
      await new Promise((r) => setTimeout(r, fadeOutSec * 1000));
    }
    t.source.stop();
    t.source.dispose();
    t.gain.dispose();
    this.tracks.delete(soundId);
  }

  async stopAll(fadeOutSec = 0.5): Promise<void> {
    const ids = [...this.tracks.keys()];
    await Promise.all(ids.map((id) => this.stopTrack(id, fadeOutSec)));
  }

  isPlaying(soundId: string): boolean {
    return this.tracks.has(soundId);
  }

  activeTrackIds(): string[] {
    return [...this.tracks.keys()];
  }

  private async createTrack(def: SoundDef, _initialVolume: number, _fadeInSec: number): Promise<ActiveTrack> {
    const gain = new Tone.Gain(0).toDestination();
    if (def.type === 'file') {
      const player = new Tone.Player(def.src!);
      player.loop = true;
      player.connect(gain);
      await Tone.loaded();
      return { soundId: def.id, source: player, gain };
    }
    const noise = new Tone.Noise(def.flavor!);
    noise.connect(gain);
    return { soundId: def.id, source: noise, gain };
  }
}

export const audioEngine = new AudioEngine();
```

- [ ] **Step 4: Run test, expect pass**

Run: `pnpm test:run tests/audio/AudioEngine.test.ts`
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio/AudioEngine.ts tests/audio/AudioEngine.test.ts
git commit -m "feat(audio): add AudioEngine with playTrack/stop/setVolume/stopAll"
```

---

## Task 7: AudioEngine — crossfadeTo for story mode

**Files:**
- Modify: `src/lib/audio/AudioEngine.ts`
- Modify: `tests/audio/AudioEngine.test.ts`

- [ ] **Step 1: Add failing test cases** at the end of `tests/audio/AudioEngine.test.ts` `describe` block

```typescript
  it('crossfadeTo ramps current track to 0 and new track to target volume', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.7);
    await engine.crossfadeTo('rain', 0.6, 5);
    // old track gain ramped to 0
    expect(playerInstances[0]?.output.gain.rampTo).toHaveBeenCalledWith(0, 5);
    // new track gain ramped to 0.6
    expect(playerInstances[1]?.output.gain.rampTo).toHaveBeenCalledWith(0.6, 5);
  });

  it('crossfadeTo with no current track simply starts the new one at target volume', async () => {
    await engine.initialize();
    await engine.crossfadeTo('rain', 0.5, 3);
    expect(playerInstances).toHaveLength(1);
    expect(playerInstances[0]?.output.gain.rampTo).toHaveBeenCalledWith(0.5, 3);
  });

  it('crossfadeTo to the currently-playing same id only adjusts volume', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.4);
    await engine.crossfadeTo('ocean', 0.9, 2);
    expect(playerInstances).toHaveLength(1);
    expect(playerInstances[0]?.output.gain.rampTo).toHaveBeenCalledWith(0.9, 2);
  });
```

- [ ] **Step 2: Run test, expect fail**

Run: `pnpm test:run tests/audio/AudioEngine.test.ts`
Expected: 3 new tests fail with `engine.crossfadeTo is not a function`.

- [ ] **Step 3: Add `crossfadeTo` method to `AudioEngine`** (insert after `stopAll`)

```typescript
  async crossfadeTo(soundId: string, volume: number, crossfadeSec: number): Promise<void> {
    const def = getSoundById(soundId);
    if (!def) throw new Error(`unknown sound: ${soundId}`);

    const previousIds = [...this.tracks.keys()].filter((id) => id !== soundId);

    if (this.tracks.has(soundId)) {
      this.setVolume(soundId, volume, crossfadeSec);
    } else {
      const track = await this.createTrack(def, volume, crossfadeSec);
      this.tracks.set(soundId, track);
      track.source.start();
      track.gain.gain.rampTo(volume, crossfadeSec);
    }

    for (const id of previousIds) {
      const prev = this.tracks.get(id)!;
      prev.gain.gain.rampTo(0, crossfadeSec);
      setTimeout(() => {
        try { prev.source.stop(); prev.source.dispose(); prev.gain.dispose(); } catch { /* already disposed */ }
        this.tracks.delete(id);
      }, crossfadeSec * 1000);
    }
  }

  async masterFadeOut(fadeOutSec: number): Promise<void> {
    for (const t of this.tracks.values()) {
      t.gain.gain.rampTo(0, fadeOutSec);
    }
    await new Promise((r) => setTimeout(r, fadeOutSec * 1000));
    await this.stopAll(0);
  }
```

- [ ] **Step 4: Run test, expect pass**

Run: `pnpm test:run tests/audio/AudioEngine.test.ts`
Expected: all 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audio/ tests/audio/AudioEngine.test.ts
git commit -m "feat(audio): add crossfadeTo and masterFadeOut to AudioEngine"
```

---

## Task 8: IndexedDB foundation (`db.ts`)

**Files:**
- Create: `src/lib/storage/db.ts`
- Test: `tests/storage/db.test.ts`

- [ ] **Step 1: Write failing test** at `tests/storage/db.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getDB, DB_NAME, DB_VERSION, OBJECT_STORES } from '../../src/lib/storage/db';

describe('db', () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase(DB_NAME);
  });

  it('opens DB with the configured version and stores', async () => {
    const db = await getDB();
    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(DB_VERSION);
    for (const store of OBJECT_STORES) {
      expect(db.objectStoreNames.contains(store)).toBe(true);
    }
  });

  it('returns the same instance on subsequent calls', async () => {
    const db1 = await getDB();
    const db2 = await getDB();
    expect(db1).toBe(db2);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `pnpm test:run tests/storage/db.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/storage/db.ts`**

```typescript
import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

export const DB_NAME = 'whitenoise-app';
export const DB_VERSION = 1;
export const OBJECT_STORES = [
  'customStories',
  'favorites',
  'mixes',
  'recents',
  'settings'
] as const;

export interface CustomStoryRecord {
  id: string;
  nameKey: string;
  description: string;
  builtin: false;
  segments: unknown[];
  totalDurationSec: number;
  createdAt: number;
  updatedAt: number;
}

export interface FavoriteRecord {
  id: string;
  type: 'sound' | 'mix' | 'story';
  refId: string;
  addedAt: number;
}

export interface MixRecord {
  id: string;
  name: string;
  tracks: Array<{ soundId: string; volume: number }>;
  createdAt: number;
}

export interface RecentRecord {
  id: string;
  type: 'sound' | 'mix' | 'story';
  refId: string;
  playedAt: number;
}

export interface SettingsRecord {
  key: string;
  value: unknown;
}

interface AppSchema extends DBSchema {
  customStories: { key: string; value: CustomStoryRecord; indexes: { 'by-updated': number } };
  favorites:     { key: string; value: FavoriteRecord;    indexes: { 'by-type': string; 'by-added': number } };
  mixes:         { key: string; value: MixRecord;         indexes: { 'by-created': number } };
  recents:       { key: string; value: RecentRecord;      indexes: { 'by-played': number } };
  settings:      { key: string; value: SettingsRecord };
}

let dbPromise: Promise<IDBPDatabase<AppSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<AppSchema>> {
  dbPromise ??= openDB<AppSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('customStories')) {
        const s = db.createObjectStore('customStories', { keyPath: 'id' });
        s.createIndex('by-updated', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('favorites')) {
        const s = db.createObjectStore('favorites', { keyPath: 'id' });
        s.createIndex('by-type', 'type');
        s.createIndex('by-added', 'addedAt');
      }
      if (!db.objectStoreNames.contains('mixes')) {
        const s = db.createObjectStore('mixes', { keyPath: 'id' });
        s.createIndex('by-created', 'createdAt');
      }
      if (!db.objectStoreNames.contains('recents')) {
        const s = db.createObjectStore('recents', { keyPath: 'id' });
        s.createIndex('by-played', 'playedAt');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    }
  });
  return dbPromise;
}

export function _resetForTests(): void {
  dbPromise = null;
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `pnpm test:run tests/storage/db.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/db.ts tests/storage/db.test.ts
git commit -m "feat(storage): add IndexedDB schema with 5 object stores"
```

---

## Task 9: FavoritesRepo

**Files:**
- Create: `src/lib/storage/FavoritesRepo.ts`
- Test: `tests/storage/FavoritesRepo.test.ts`

- [ ] **Step 1: Write failing test** at `tests/storage/FavoritesRepo.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { FavoritesRepo } from '../../src/lib/storage/FavoritesRepo';
import { _resetForTests, DB_NAME } from '../../src/lib/storage/db';

describe('FavoritesRepo', () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase(DB_NAME);
    _resetForTests();
  });

  it('add() and listAll() round-trip a favorite', async () => {
    const repo = new FavoritesRepo();
    await repo.add({ type: 'sound', refId: 'ocean' });
    const all = await repo.listAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ type: 'sound', refId: 'ocean' });
    expect(all[0]?.id).toBeDefined();
    expect(all[0]?.addedAt).toBeGreaterThan(0);
  });

  it('remove() deletes by id', async () => {
    const repo = new FavoritesRepo();
    const fav = await repo.add({ type: 'mix', refId: 'mix-1' });
    await repo.remove(fav.id);
    expect(await repo.listAll()).toHaveLength(0);
  });

  it('isFavorite() returns true for stored ref', async () => {
    const repo = new FavoritesRepo();
    await repo.add({ type: 'sound', refId: 'rain' });
    expect(await repo.isFavorite('sound', 'rain')).toBe(true);
    expect(await repo.isFavorite('sound', 'ocean')).toBe(false);
  });

  it('listByType filters', async () => {
    const repo = new FavoritesRepo();
    await repo.add({ type: 'sound', refId: 'ocean' });
    await repo.add({ type: 'story', refId: 'seaside-walk' });
    const sounds = await repo.listByType('sound');
    expect(sounds).toHaveLength(1);
    expect(sounds[0]?.refId).toBe('ocean');
  });

  it('listAll sorts newest first', async () => {
    const repo = new FavoritesRepo();
    await repo.add({ type: 'sound', refId: 'a' });
    await new Promise((r) => setTimeout(r, 5));
    await repo.add({ type: 'sound', refId: 'b' });
    const all = await repo.listAll();
    expect(all[0]?.refId).toBe('b');
    expect(all[1]?.refId).toBe('a');
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `pnpm test:run tests/storage/FavoritesRepo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/storage/FavoritesRepo.ts`**

```typescript
import { getDB, type FavoriteRecord } from './db';

export type FavoriteType = FavoriteRecord['type'];

export interface AddFavoriteInput {
  type: FavoriteType;
  refId: string;
}

export class FavoritesRepo {
  async add(input: AddFavoriteInput): Promise<FavoriteRecord> {
    const db = await getDB();
    const record: FavoriteRecord = {
      id: crypto.randomUUID(),
      type: input.type,
      refId: input.refId,
      addedAt: Date.now()
    };
    await db.put('favorites', record);
    return record;
  }

  async remove(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('favorites', id);
  }

  async listAll(): Promise<FavoriteRecord[]> {
    const db = await getDB();
    const all = await db.getAll('favorites');
    return all.sort((a, b) => b.addedAt - a.addedAt);
  }

  async listByType(type: FavoriteType): Promise<FavoriteRecord[]> {
    const all = await this.listAll();
    return all.filter((f) => f.type === type);
  }

  async isFavorite(type: FavoriteType, refId: string): Promise<boolean> {
    const all = await this.listByType(type);
    return all.some((f) => f.refId === refId);
  }
}

export const favoritesRepo = new FavoritesRepo();
```

- [ ] **Step 4: Run test, expect pass**

Run: `pnpm test:run tests/storage/FavoritesRepo.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/FavoritesRepo.ts tests/storage/FavoritesRepo.test.ts
git commit -m "feat(storage): add FavoritesRepo"
```

---

## Task 10: MixRepo

**Files:**
- Create: `src/lib/storage/MixRepo.ts`
- Test: `tests/storage/MixRepo.test.ts`

- [ ] **Step 1: Write failing test** at `tests/storage/MixRepo.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MixRepo } from '../../src/lib/storage/MixRepo';
import { _resetForTests, DB_NAME } from '../../src/lib/storage/db';

describe('MixRepo', () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase(DB_NAME);
    _resetForTests();
  });

  it('save() and getById() round-trip a mix', async () => {
    const repo = new MixRepo();
    const created = await repo.save({
      name: 'Cozy night',
      tracks: [{ soundId: 'rain', volume: 0.6 }, { soundId: 'fireplace', volume: 0.4 }]
    });
    const found = await repo.getById(created.id);
    expect(found?.name).toBe('Cozy night');
    expect(found?.tracks).toHaveLength(2);
  });

  it('listAll() sorts newest first', async () => {
    const repo = new MixRepo();
    await repo.save({ name: 'A', tracks: [] });
    await new Promise((r) => setTimeout(r, 5));
    await repo.save({ name: 'B', tracks: [] });
    const all = await repo.listAll();
    expect(all[0]?.name).toBe('B');
  });

  it('delete() removes a mix', async () => {
    const repo = new MixRepo();
    const m = await repo.save({ name: 'Test', tracks: [] });
    await repo.delete(m.id);
    expect(await repo.getById(m.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `pnpm test:run tests/storage/MixRepo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/storage/MixRepo.ts`**

```typescript
import { getDB, type MixRecord } from './db';

export interface SaveMixInput {
  id?: string;
  name: string;
  tracks: Array<{ soundId: string; volume: number }>;
}

export class MixRepo {
  async save(input: SaveMixInput): Promise<MixRecord> {
    const db = await getDB();
    const id = input.id ?? crypto.randomUUID();
    const existing = await db.get('mixes', id);
    const record: MixRecord = {
      id,
      name: input.name,
      tracks: input.tracks,
      createdAt: existing?.createdAt ?? Date.now()
    };
    await db.put('mixes', record);
    return record;
  }

  async getById(id: string): Promise<MixRecord | undefined> {
    const db = await getDB();
    return db.get('mixes', id);
  }

  async listAll(): Promise<MixRecord[]> {
    const db = await getDB();
    const all = await db.getAll('mixes');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('mixes', id);
  }
}

export const mixRepo = new MixRepo();
```

- [ ] **Step 4: Run test, expect pass**

Run: `pnpm test:run tests/storage/MixRepo.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/MixRepo.ts tests/storage/MixRepo.test.ts
git commit -m "feat(storage): add MixRepo"
```

---

## Task 11: RecentsRepo (with auto-truncate at 20)

**Files:**
- Create: `src/lib/storage/RecentsRepo.ts`
- Test: `tests/storage/RecentsRepo.test.ts`

- [ ] **Step 1: Write failing test** at `tests/storage/RecentsRepo.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RecentsRepo, MAX_RECENTS } from '../../src/lib/storage/RecentsRepo';
import { _resetForTests, DB_NAME } from '../../src/lib/storage/db';

describe('RecentsRepo', () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase(DB_NAME);
    _resetForTests();
  });

  it('push() records a play and listRecent() returns it newest-first', async () => {
    const repo = new RecentsRepo();
    await repo.push('sound', 'ocean');
    await new Promise((r) => setTimeout(r, 5));
    await repo.push('story', 'seaside-walk');
    const list = await repo.listRecent();
    expect(list).toHaveLength(2);
    expect(list[0]?.refId).toBe('seaside-walk');
    expect(list[1]?.refId).toBe('ocean');
  });

  it('truncates beyond MAX_RECENTS', async () => {
    const repo = new RecentsRepo();
    for (let i = 0; i < MAX_RECENTS + 5; i++) {
      await repo.push('sound', `s-${i}`);
      await new Promise((r) => setTimeout(r, 1));
    }
    const list = await repo.listRecent();
    expect(list.length).toBe(MAX_RECENTS);
    expect(list[0]?.refId).toBe(`s-${MAX_RECENTS + 4}`);
  });

  it('pushing same refId again moves it to top (no duplicates)', async () => {
    const repo = new RecentsRepo();
    await repo.push('sound', 'ocean');
    await repo.push('sound', 'rain');
    await repo.push('sound', 'ocean');
    const list = await repo.listRecent();
    expect(list).toHaveLength(2);
    expect(list[0]?.refId).toBe('ocean');
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `pnpm test:run tests/storage/RecentsRepo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/storage/RecentsRepo.ts`**

```typescript
import { getDB, type RecentRecord } from './db';

export const MAX_RECENTS = 20;

export type RecentType = RecentRecord['type'];

export class RecentsRepo {
  async push(type: RecentType, refId: string): Promise<void> {
    const db = await getDB();
    const all = await db.getAll('recents');
    // remove existing same (type, refId)
    for (const r of all) {
      if (r.type === type && r.refId === refId) {
        await db.delete('recents', r.id);
      }
    }
    const record: RecentRecord = {
      id: crypto.randomUUID(),
      type,
      refId,
      playedAt: Date.now()
    };
    await db.put('recents', record);
    // truncate
    const fresh = await db.getAll('recents');
    fresh.sort((a, b) => b.playedAt - a.playedAt);
    for (const r of fresh.slice(MAX_RECENTS)) {
      await db.delete('recents', r.id);
    }
  }

  async listRecent(): Promise<RecentRecord[]> {
    const db = await getDB();
    const all = await db.getAll('recents');
    return all.sort((a, b) => b.playedAt - a.playedAt);
  }

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('recents');
  }
}

export const recentsRepo = new RecentsRepo();
```

- [ ] **Step 4: Run test, expect pass**

Run: `pnpm test:run tests/storage/RecentsRepo.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/RecentsRepo.ts tests/storage/RecentsRepo.test.ts
git commit -m "feat(storage): add RecentsRepo with auto-truncate"
```

---

## Task 12: SettingsRepo

**Files:**
- Create: `src/lib/storage/SettingsRepo.ts`
- Test: `tests/storage/SettingsRepo.test.ts`

- [ ] **Step 1: Write failing test** at `tests/storage/SettingsRepo.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, DEFAULT_SETTINGS } from '../../src/lib/storage/SettingsRepo';
import { _resetForTests, DB_NAME } from '../../src/lib/storage/db';

describe('SettingsRepo', () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase(DB_NAME);
    _resetForTests();
  });

  it('load() returns defaults when nothing stored', async () => {
    const repo = new SettingsRepo();
    const s = await repo.load();
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it('save() and load() round-trip', async () => {
    const repo = new SettingsRepo();
    await repo.save({ masterVolume: 0.5, fadeOutOnTimerSec: 15 });
    const s = await repo.load();
    expect(s.masterVolume).toBe(0.5);
    expect(s.fadeOutOnTimerSec).toBe(15);
  });

  it('partial save merges with existing', async () => {
    const repo = new SettingsRepo();
    await repo.save({ masterVolume: 0.5 });
    await repo.save({ defaultTimerMin: 30 });
    const s = await repo.load();
    expect(s.masterVolume).toBe(0.5);
    expect(s.defaultTimerMin).toBe(30);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `pnpm test:run tests/storage/SettingsRepo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/storage/SettingsRepo.ts`**

```typescript
import { getDB } from './db';

export interface AppSettings {
  defaultTimerMin?: number;
  fadeOutOnTimerSec: number;
  masterVolume: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  fadeOutOnTimerSec: 30,
  masterVolume: 0.7
};

const SETTINGS_KEY = 'app';

export class SettingsRepo {
  async load(): Promise<AppSettings> {
    const db = await getDB();
    const row = await db.get('settings', SETTINGS_KEY);
    if (!row) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(row.value as Partial<AppSettings>) };
  }

  async save(patch: Partial<AppSettings>): Promise<void> {
    const db = await getDB();
    const current = await this.load();
    const merged = { ...current, ...patch };
    await db.put('settings', { key: SETTINGS_KEY, value: merged });
  }
}

export const settingsRepo = new SettingsRepo();
```

- [ ] **Step 4: Run test, expect pass**

Run: `pnpm test:run tests/storage/SettingsRepo.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/SettingsRepo.ts tests/storage/SettingsRepo.test.ts
git commit -m "feat(storage): add SettingsRepo with defaults merge"
```

---

## Task 13: audioStore (Svelte 5 runes)

**Files:**
- Create: `src/lib/stores/audioStore.svelte.ts`

> Stores in Svelte 5 use `$state` runes inside a class instance and are imported by components. Direct unit-tests for runes need the svelte runtime; we test these indirectly via component tests.

- [ ] **Step 1: Implement `src/lib/stores/audioStore.svelte.ts`**

```typescript
import { audioEngine } from '../audio/AudioEngine';
import { recentsRepo } from '../storage/RecentsRepo';

export interface TrackState {
  soundId: string;
  volume: number;
}

class AudioStore {
  initialized = $state(false);
  tracks = $state<Record<string, TrackState>>({});
  masterVolume = $state(0.7);

  isPlaying = $derived(Object.keys(this.tracks).length > 0);

  async ensureInitialized() {
    if (this.initialized) return;
    await audioEngine.initialize();
    this.initialized = true;
  }

  async toggleSound(soundId: string, volume = 0.7) {
    await this.ensureInitialized();
    if (this.tracks[soundId]) {
      await audioEngine.stopTrack(soundId);
      delete this.tracks[soundId];
      return;
    }
    await audioEngine.playTrack(soundId, volume);
    this.tracks[soundId] = { soundId, volume };
    void recentsRepo.push('sound', soundId).catch(() => { /* ignore */ });
  }

  setVolume(soundId: string, volume: number) {
    audioEngine.setVolume(soundId, volume, 0.1);
    const t = this.tracks[soundId];
    if (t) t.volume = volume;
  }

  setMasterVolume(volume: number) {
    this.masterVolume = volume;
    for (const id of Object.keys(this.tracks)) {
      const t = this.tracks[id];
      if (t) audioEngine.setVolume(id, t.volume * volume, 0.05);
    }
  }

  async stopAll(fadeOutSec = 0.5) {
    await audioEngine.stopAll(fadeOutSec);
    this.tracks = {};
  }
}

export const audioStore = new AudioStore();
```

- [ ] **Step 2: Type-check passes**

Run: `pnpm check`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/audioStore.svelte.ts
git commit -m "feat(stores): add audioStore using Svelte 5 runes"
```

---

## Task 14: SoundCard component + Home route

**Files:**
- Create: `src/components/SoundCard.svelte`, `src/routes/Home.svelte`
- Modify: `src/App.svelte`

- [ ] **Step 1: Create `src/components/SoundCard.svelte`**

```svelte
<script lang="ts">
  import type { SoundDef } from '../lib/audio/types';
  import { audioStore } from '../lib/stores/audioStore.svelte';

  interface Props { sound: SoundDef; }
  let { sound }: Props = $props();

  let active = $derived(!!audioStore.tracks[sound.id]);

  async function toggle() {
    await audioStore.toggleSound(sound.id, 0.7);
  }
</script>

<button class="card" class:active onclick={toggle} aria-pressed={active}>
  <div class="icon" data-icon={sound.iconKey}>♪</div>
  <div class="name">{sound.nameKey}</div>
</button>

<style>
  .card {
    background: var(--bg-elevated);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    transition: transform 80ms, background 200ms;
    width: 100%;
    aspect-ratio: 1;
  }
  .card:hover { transform: scale(1.02); }
  .card.active { background: var(--accent); color: #fff; }
  .icon { font-size: 2.5rem; opacity: 0.85; }
  .name { font-size: 0.95rem; }
</style>
```

- [ ] **Step 2: Create `src/routes/Home.svelte`**

```svelte
<script lang="ts">
  import { BUILTIN_SOUNDS } from '../lib/audio/builtinSounds';
  import SoundCard from '../components/SoundCard.svelte';
</script>

<section>
  <h2>聲音</h2>
  <div class="grid">
    {#each BUILTIN_SOUNDS as sound (sound.id)}
      <SoundCard {sound} />
    {/each}
  </div>
</section>

<style>
  section { padding: 1.5rem; }
  h2 { font-weight: 600; margin: 0 0 1rem; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
  }
</style>
```

- [ ] **Step 3: Update `src/App.svelte`** to render Home when route is 'home'

```svelte
<script lang="ts">
  import Home from './routes/Home.svelte';

  let route = $state<'home' | 'mixer' | 'stories' | 'library'>('home');
</script>

<header>
  <h1>白噪音與睡眠</h1>
</header>

<main>
  {#if route === 'home'}
    <Home />
  {:else if route === 'mixer'}
    <p>混音 (尚未實作)</p>
  {:else if route === 'stories'}
    <p>故事 (尚未實作)</p>
  {:else if route === 'library'}
    <p>我的 (尚未實作)</p>
  {/if}
</main>

<nav>
  <button class:active={route === 'home'} onclick={() => route = 'home'}>首頁</button>
  <button class:active={route === 'mixer'} onclick={() => route = 'mixer'}>混音</button>
  <button class:active={route === 'stories'} onclick={() => route = 'stories'}>故事</button>
  <button class:active={route === 'library'} onclick={() => route = 'library'}>我的</button>
</nav>

<style>
  header { padding: 1.25rem 1.5rem 0; }
  h1 { font-size: 1.1rem; font-weight: 500; margin: 0; opacity: 0.7; }
  main { padding-bottom: 5rem; }
  nav {
    position: fixed;
    bottom: 0;
    inset-inline: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: var(--bg-elevated);
    border-top: 1px solid #ffffff10;
    padding: 0.5rem env(safe-area-inset-right) calc(env(safe-area-inset-bottom) + 0.5rem) env(safe-area-inset-left);
  }
  nav button { padding: 0.75rem 0; font-size: 0.875rem; color: var(--text-dim); }
  nav button.active { color: var(--text); font-weight: 600; }
</style>
```

- [ ] **Step 4: Manual verify**

Run: `pnpm dev`
Expected: 8 sound cards visible. Tap any → card highlights, audio actually plays (placeholder silence is silent but no console error). Tap again → stops. Bottom nav present. Stop with Ctrl+C.

- [ ] **Step 5: Type-check + tests**

Run: `pnpm check && pnpm test:run`
Expected: No errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/SoundCard.svelte src/routes/Home.svelte src/App.svelte
git commit -m "feat(ui): add SoundCard, Home route, and bottom nav"
```

---

## Task 15: VolumeSlider component + Mixer route

**Files:**
- Create: `src/components/VolumeSlider.svelte`, `src/routes/Mixer.svelte`
- Modify: `src/App.svelte`

- [ ] **Step 1: Create `src/components/VolumeSlider.svelte`**

```svelte
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
```

- [ ] **Step 2: Create `src/routes/Mixer.svelte`**

```svelte
<script lang="ts">
  import { BUILTIN_SOUNDS } from '../lib/audio/builtinSounds';
  import { audioStore } from '../lib/stores/audioStore.svelte';
  import VolumeSlider from '../components/VolumeSlider.svelte';

  async function toggle(id: string) {
    await audioStore.toggleSound(id, 0.7);
  }

  function setVol(id: string, v: number) {
    audioStore.setVolume(id, v);
  }
</script>

<section>
  <h2>混音</h2>
  <p class="hint">同時播放多個音效，各自調整音量。</p>
  <ul>
    {#each BUILTIN_SOUNDS as sound (sound.id)}
      {@const track = audioStore.tracks[sound.id]}
      <li class:active={!!track}>
        <button class="toggle" onclick={() => toggle(sound.id)}>
          <span class="name">{sound.nameKey}</span>
          <span class="state">{track ? '播放中' : '已停止'}</span>
        </button>
        {#if track}
          <VolumeSlider
            value={track.volume}
            oninput={(v) => setVol(sound.id, v)}
          />
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  section { padding: 1.5rem; }
  h2 { font-weight: 600; margin: 0 0 0.25rem; }
  .hint { color: var(--text-dim); margin: 0 0 1rem; font-size: 0.85rem; }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
  li {
    background: var(--bg-elevated);
    border-radius: 12px;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  li.active { outline: 1px solid var(--accent); }
  .toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    text-align: left;
  }
  .name { font-size: 1rem; }
  .state { font-size: 0.8rem; color: var(--text-dim); }
</style>
```

- [ ] **Step 3: Update `src/App.svelte`** to render Mixer for the 'mixer' route

Replace the line `<p>混音 (尚未實作)</p>` with `<Mixer />` and add `import Mixer from './routes/Mixer.svelte';` at the top.

```svelte
<script lang="ts">
  import Home from './routes/Home.svelte';
  import Mixer from './routes/Mixer.svelte';

  let route = $state<'home' | 'mixer' | 'stories' | 'library'>('home');
</script>

<header>
  <h1>白噪音與睡眠</h1>
</header>

<main>
  {#if route === 'home'}
    <Home />
  {:else if route === 'mixer'}
    <Mixer />
  {:else if route === 'stories'}
    <p>故事 (尚未實作)</p>
  {:else if route === 'library'}
    <p>我的 (尚未實作)</p>
  {/if}
</main>

<nav>
  <button class:active={route === 'home'} onclick={() => route = 'home'}>首頁</button>
  <button class:active={route === 'mixer'} onclick={() => route = 'mixer'}>混音</button>
  <button class:active={route === 'stories'} onclick={() => route = 'stories'}>故事</button>
  <button class:active={route === 'library'} onclick={() => route = 'library'}>我的</button>
</nav>

<style>
  header { padding: 1.25rem 1.5rem 0; }
  h1 { font-size: 1.1rem; font-weight: 500; margin: 0; opacity: 0.7; }
  main { padding-bottom: 5rem; }
  nav {
    position: fixed;
    bottom: 0;
    inset-inline: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: var(--bg-elevated);
    border-top: 1px solid #ffffff10;
    padding: 0.5rem env(safe-area-inset-right) calc(env(safe-area-inset-bottom) + 0.5rem) env(safe-area-inset-left);
  }
  nav button { padding: 0.75rem 0; font-size: 0.875rem; color: var(--text-dim); }
  nav button.active { color: var(--text); font-weight: 600; }
</style>
```

- [ ] **Step 4: Manual verify**

Run: `pnpm dev`
Expected: Switch to "混音" tab. Tap 2-3 sounds to start. Each shows a volume slider when active. Sliders move smoothly. Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/components/VolumeSlider.svelte src/routes/Mixer.svelte src/App.svelte
git commit -m "feat(ui): add VolumeSlider component and Mixer route"
```

---

## Task 16: Library route (favorites + recents)

**Files:**
- Create: `src/routes/Library.svelte`
- Modify: `src/components/SoundCard.svelte` (add long-press / heart toggle)
- Modify: `src/App.svelte`

- [ ] **Step 1: Add favorite-toggle button to `src/components/SoundCard.svelte`**

```svelte
<script lang="ts">
  import type { SoundDef } from '../lib/audio/types';
  import { audioStore } from '../lib/stores/audioStore.svelte';
  import { favoritesRepo } from '../lib/storage/FavoritesRepo';

  interface Props { sound: SoundDef; }
  let { sound }: Props = $props();

  let active = $derived(!!audioStore.tracks[sound.id]);
  let favored = $state(false);

  $effect(() => {
    favoritesRepo.isFavorite('sound', sound.id).then((v) => { favored = v; });
  });

  async function toggle() {
    await audioStore.toggleSound(sound.id, 0.7);
  }

  async function toggleFav(e: MouseEvent) {
    e.stopPropagation();
    if (favored) {
      const all = await favoritesRepo.listByType('sound');
      const found = all.find((f) => f.refId === sound.id);
      if (found) await favoritesRepo.remove(found.id);
      favored = false;
    } else {
      await favoritesRepo.add({ type: 'sound', refId: sound.id });
      favored = true;
    }
  }
</script>

<button class="card" class:active onclick={toggle} aria-pressed={active}>
  <button class="fav" class:on={favored} onclick={toggleFav} aria-label="收藏">
    {favored ? '♥' : '♡'}
  </button>
  <div class="icon" data-icon={sound.iconKey}>♪</div>
  <div class="name">{sound.nameKey}</div>
</button>

<style>
  .card {
    position: relative;
    background: var(--bg-elevated);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    transition: transform 80ms, background 200ms;
    width: 100%;
    aspect-ratio: 1;
  }
  .card:hover { transform: scale(1.02); }
  .card.active { background: var(--accent); color: #fff; }
  .icon { font-size: 2.5rem; opacity: 0.85; }
  .name { font-size: 0.95rem; }
  .fav {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    font-size: 1.2rem;
    color: var(--text-dim);
  }
  .fav.on { color: #ff5f7a; }
</style>
```

- [ ] **Step 2: Create `src/routes/Library.svelte`**

```svelte
<script lang="ts">
  import { favoritesRepo } from '../lib/storage/FavoritesRepo';
  import { recentsRepo } from '../lib/storage/RecentsRepo';
  import { getSoundById } from '../lib/audio/builtinSounds';
  import { audioStore } from '../lib/stores/audioStore.svelte';
  import type { FavoriteRecord, RecentRecord } from '../lib/storage/db';

  let favorites = $state<FavoriteRecord[]>([]);
  let recents = $state<RecentRecord[]>([]);

  async function refresh() {
    favorites = await favoritesRepo.listAll();
    recents = await recentsRepo.listRecent();
  }

  $effect(() => { void refresh(); });

  async function play(refId: string) {
    await audioStore.toggleSound(refId, 0.7);
    await refresh();
  }

  function labelFor(refId: string): string {
    return getSoundById(refId)?.nameKey ?? refId;
  }
</script>

<section>
  <h2>收藏</h2>
  {#if favorites.length === 0}
    <p class="empty">還沒有收藏</p>
  {:else}
    <ul>
      {#each favorites as fav (fav.id)}
        <li>
          <button onclick={() => play(fav.refId)}>
            <span class="type">{fav.type}</span>
            <span>{labelFor(fav.refId)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <h2>最近播放</h2>
  {#if recents.length === 0}
    <p class="empty">尚未播放任何聲音</p>
  {:else}
    <ul>
      {#each recents as r (r.id)}
        <li>
          <button onclick={() => play(r.refId)}>
            <span class="type">{r.type}</span>
            <span>{labelFor(r.refId)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  section { padding: 1.5rem; }
  h2 { font-weight: 600; margin: 0 0 0.75rem; font-size: 1rem; }
  h2:not(:first-child) { margin-top: 1.5rem; }
  .empty { color: var(--text-dim); font-size: 0.9rem; }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  li button {
    width: 100%;
    text-align: left;
    background: var(--bg-elevated);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    display: flex;
    gap: 0.75rem;
  }
  .type {
    font-size: 0.7rem;
    color: var(--text-dim);
    text-transform: uppercase;
    align-self: center;
  }
</style>
```

- [ ] **Step 3: Wire 'library' route in `src/App.svelte`**

Replace `<p>我的 (尚未實作)</p>` with `<Library />` and import: `import Library from './routes/Library.svelte';`

- [ ] **Step 4: Manual verify**

Run: `pnpm dev`
Expected: Tap a few cards on Home → tap heart icons. Switch to 我的 → favorites + recent list shows entries. Reload page → still there. Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/components/SoundCard.svelte src/routes/Library.svelte src/App.svelte
git commit -m "feat(ui): add favorite toggle on SoundCard and Library route"
```

---

# Milestone M3 — Story Mode

## Task 17: Story types + StoryRunner

**Files:**
- Create: `src/lib/story/types.ts`, `src/lib/story/StoryRunner.ts`
- Test: `tests/story/StoryRunner.test.ts`

- [ ] **Step 1: Create `src/lib/story/types.ts`**

```typescript
export interface StorySegment {
  soundId: string;
  durationSec: number;
  crossfadeSec: number;
  poeticText?: string;
  volume: number;
}

export interface StoryDef {
  id: string;
  nameKey: string;
  description: string;
  builtin: boolean;
  segments: StorySegment[];
  totalDurationSec: number;
}

export type StoryEvent =
  | { type: 'segment-start'; index: number; segment: StorySegment }
  | { type: 'story-end' }
  | { type: 'cancelled' };

export type StoryEventListener = (e: StoryEvent) => void;
```

- [ ] **Step 2: Write failing test** at `tests/story/StoryRunner.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StoryRunner } from '../../src/lib/story/StoryRunner';
import type { StorySegment, StoryEvent } from '../../src/lib/story/types';

describe('StoryRunner', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  const segments: StorySegment[] = [
    { soundId: 'ocean',  durationSec: 5,  crossfadeSec: 2, volume: 0.7, poeticText: '海邊' },
    { soundId: 'birds',  durationSec: 5,  crossfadeSec: 2, volume: 0.7, poeticText: '鳥鳴' },
    { soundId: 'rain',   durationSec: 5,  crossfadeSec: 0, volume: 0.6, poeticText: '雨聲' }
  ];

  it('emits segment-start for each segment in order', async () => {
    const events: StoryEvent[] = [];
    const runner = new StoryRunner();
    runner.on((e) => events.push(e));

    const promise = runner.run(segments);

    expect(events.filter((e) => e.type === 'segment-start')).toHaveLength(1);
    expect((events[0] as { index: number }).index).toBe(0);

    await vi.advanceTimersByTimeAsync(5000);
    expect(events.filter((e) => e.type === 'segment-start')).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(5000);
    expect(events.filter((e) => e.type === 'segment-start')).toHaveLength(3);

    await vi.advanceTimersByTimeAsync(5000);
    await promise;
    expect(events.at(-1)?.type).toBe('story-end');
  });

  it('cancel() halts execution and emits cancelled', async () => {
    const events: StoryEvent[] = [];
    const runner = new StoryRunner();
    runner.on((e) => events.push(e));

    const promise = runner.run(segments);
    await vi.advanceTimersByTimeAsync(2000);
    runner.cancel();
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    expect(events.find((e) => e.type === 'cancelled')).toBeDefined();
    expect(events.find((e) => e.type === 'story-end')).toBeUndefined();
  });

  it('does not start a second run while one is active', async () => {
    const runner = new StoryRunner();
    const p1 = runner.run(segments);
    await expect(runner.run(segments)).rejects.toThrow(/already running/i);
    runner.cancel();
    await vi.advanceTimersByTimeAsync(0);
    await p1;
  });
});
```

- [ ] **Step 3: Run test, expect fail**

Run: `pnpm test:run tests/story/StoryRunner.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/lib/story/StoryRunner.ts`**

```typescript
import type { StorySegment, StoryEvent, StoryEventListener } from './types';

export class StoryRunner {
  private listeners = new Set<StoryEventListener>();
  private cancelled = false;
  private active = false;
  private currentTimeout: ReturnType<typeof setTimeout> | null = null;

  on(listener: StoryEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(e: StoryEvent): void {
    for (const l of this.listeners) l(e);
  }

  async run(segments: StorySegment[]): Promise<void> {
    if (this.active) throw new Error('StoryRunner already running');
    this.active = true;
    this.cancelled = false;

    try {
      for (let i = 0; i < segments.length; i++) {
        if (this.cancelled) {
          this.emit({ type: 'cancelled' });
          return;
        }
        const seg = segments[i]!;
        this.emit({ type: 'segment-start', index: i, segment: seg });
        await this.sleep(seg.durationSec * 1000);
      }
      if (!this.cancelled) this.emit({ type: 'story-end' });
      else this.emit({ type: 'cancelled' });
    } finally {
      this.active = false;
      this.currentTimeout = null;
    }
  }

  cancel(): void {
    this.cancelled = true;
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
  }

  isActive(): boolean { return this.active; }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.currentTimeout = setTimeout(() => {
        this.currentTimeout = null;
        resolve();
      }, ms);
    });
  }
}
```

- [ ] **Step 5: Run test, expect pass**

Run: `pnpm test:run tests/story/StoryRunner.test.ts`
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/story/ tests/story/
git commit -m "feat(story): add StoryRunner with cancellation and event emission"
```

---

## Task 18: Built-in stories (5 JSON files + loader)

**Files:**
- Create: 5 JSON files at `public/stories/`
- Create: `src/lib/story/builtinStories.ts`
- Test: `tests/story/builtinStories.test.ts`

- [ ] **Step 1: Create `public/stories/seaside-walk.json`**

```json
{
  "id": "seaside-walk",
  "nameKey": "海邊漫步",
  "description": "從浪潮聲走進清晨的海邊",
  "builtin": true,
  "totalDurationSec": 1500,
  "segments": [
    { "soundId": "ocean",  "durationSec": 360, "crossfadeSec": 30, "volume": 0.75, "poeticText": "腳步緩慢，海浪一波又一波湧來。" },
    { "soundId": "birds",  "durationSec": 360, "crossfadeSec": 30, "volume": 0.55, "poeticText": "天色漸亮，遠方傳來海鳥呼喚。" },
    { "soundId": "rain",   "durationSec": 360, "crossfadeSec": 30, "volume": 0.6,  "poeticText": "雲層飄來，溫柔的雨打在沙上。" },
    { "soundId": "stream", "durationSec": 420, "crossfadeSec": 0,  "volume": 0.55, "poeticText": "雨後的小溪，是回家的路。" }
  ]
}
```

- [ ] **Step 2: Create `public/stories/rainy-fireplace.json`**

```json
{
  "id": "rainy-fireplace",
  "nameKey": "雨夜壁爐",
  "description": "雨打窗戶，柴火微亮的夜晚",
  "builtin": true,
  "totalDurationSec": 1800,
  "segments": [
    { "soundId": "rain",      "durationSec": 600, "crossfadeSec": 45, "volume": 0.7,  "poeticText": "雨輕輕敲打窗戶。" },
    { "soundId": "fireplace", "durationSec": 600, "crossfadeSec": 45, "volume": 0.55, "poeticText": "壁爐的柴火劈啪作響。" },
    { "soundId": "rain",      "durationSec": 600, "crossfadeSec": 0,  "volume": 0.45, "poeticText": "夜深了，雨聲伴你入睡。" }
  ]
}
```

- [ ] **Step 3: Create `public/stories/forest-spa.json`**

```json
{
  "id": "forest-spa",
  "nameKey": "森林湯泉",
  "description": "森林的早晨，靜靜的水聲",
  "builtin": true,
  "totalDurationSec": 1620,
  "segments": [
    { "soundId": "birds",  "durationSec": 540, "crossfadeSec": 30, "volume": 0.55, "poeticText": "樹梢的鳥聲喚醒森林。" },
    { "soundId": "stream", "durationSec": 540, "crossfadeSec": 30, "volume": 0.65, "poeticText": "潺潺溪水，清澈如鏡。" },
    { "soundId": "wind",   "durationSec": 540, "crossfadeSec": 0,  "volume": 0.5,  "poeticText": "風穿過樹葉，把心吹得很慢。" }
  ]
}
```

- [ ] **Step 4: Create `public/stories/mountain-stream.json`**

```json
{
  "id": "mountain-stream",
  "nameKey": "山中溪流",
  "description": "高山溪流伴隨遠方鳥鳴",
  "builtin": true,
  "totalDurationSec": 1500,
  "segments": [
    { "soundId": "stream", "durationSec": 600, "crossfadeSec": 30, "volume": 0.7,  "poeticText": "溪水從山谷中流下。" },
    { "soundId": "birds",  "durationSec": 450, "crossfadeSec": 30, "volume": 0.5,  "poeticText": "山中迴盪著鳥鳴。" },
    { "soundId": "wind",   "durationSec": 450, "crossfadeSec": 0,  "volume": 0.45, "poeticText": "晚風拂過稜線。" }
  ]
}
```

- [ ] **Step 5: Create `public/stories/summer-thunder.json`**

```json
{
  "id": "summer-thunder",
  "nameKey": "夏夜雷雨",
  "description": "夏天的雷與雨，由近至遠",
  "builtin": true,
  "totalDurationSec": 1500,
  "segments": [
    { "soundId": "thunder", "durationSec": 360, "crossfadeSec": 30, "volume": 0.6,  "poeticText": "遠方雷聲，預告了夏夜。" },
    { "soundId": "rain",    "durationSec": 540, "crossfadeSec": 30, "volume": 0.7,  "poeticText": "豆大的雨珠落下。" },
    { "soundId": "rain",    "durationSec": 600, "crossfadeSec": 0,  "volume": 0.45, "poeticText": "雨勢漸小，世界安靜下來。" }
  ]
}
```

- [ ] **Step 6: Write failing test** at `tests/story/builtinStories.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { BUILTIN_STORY_IDS, loadBuiltinStories } from '../../src/lib/story/builtinStories';

describe('builtinStories', () => {
  it('exposes 5 ids', () => {
    expect(BUILTIN_STORY_IDS).toHaveLength(5);
  });
});
```

- [ ] **Step 7: Run test, expect fail**

Run: `pnpm test:run tests/story/builtinStories.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 8: Implement `src/lib/story/builtinStories.ts`**

```typescript
import type { StoryDef } from './types';

export const BUILTIN_STORY_IDS = [
  'seaside-walk',
  'rainy-fireplace',
  'forest-spa',
  'mountain-stream',
  'summer-thunder'
] as const;

export type BuiltinStoryId = typeof BUILTIN_STORY_IDS[number];

export async function loadBuiltinStories(): Promise<StoryDef[]> {
  const out: StoryDef[] = [];
  for (const id of BUILTIN_STORY_IDS) {
    const res = await fetch(`/stories/${id}.json`);
    if (!res.ok) throw new Error(`failed to load story: ${id}`);
    out.push(await res.json() as StoryDef);
  }
  return out;
}
```

- [ ] **Step 9: Run test, expect pass**

Run: `pnpm test:run tests/story/builtinStories.test.ts`
Expected: 1 test passes.

- [ ] **Step 10: Commit**

```bash
git add public/stories/ src/lib/story/builtinStories.ts tests/story/builtinStories.test.ts
git commit -m "feat(story): add 5 builtin story JSON files and loader"
```

---

## Task 19: storyStore + PoeticText component

**Files:**
- Create: `src/lib/stores/storyStore.svelte.ts`, `src/components/PoeticText.svelte`

- [ ] **Step 1: Create `src/lib/stores/storyStore.svelte.ts`**

```typescript
import { audioEngine } from '../audio/AudioEngine';
import { StoryRunner } from '../story/StoryRunner';
import type { StoryDef, StorySegment } from '../story/types';
import { recentsRepo } from '../storage/RecentsRepo';

class StoryStore {
  current = $state<StoryDef | null>(null);
  currentSegment = $state<StorySegment | null>(null);
  currentIndex = $state(0);
  private runner: StoryRunner | null = null;

  isPlaying = $derived(this.current !== null);

  async start(story: StoryDef): Promise<void> {
    await audioEngine.initialize();
    if (this.runner) this.runner.cancel();

    this.current = story;
    this.currentIndex = 0;
    this.currentSegment = story.segments[0] ?? null;

    void recentsRepo.push('story', story.id).catch(() => { /* ignore */ });

    this.runner = new StoryRunner();
    this.runner.on(async (e) => {
      if (e.type === 'segment-start') {
        this.currentIndex = e.index;
        this.currentSegment = e.segment;
        await audioEngine.crossfadeTo(e.segment.soundId, e.segment.volume, e.segment.crossfadeSec);
      } else if (e.type === 'story-end' || e.type === 'cancelled') {
        await audioEngine.stopAll(2);
        this.current = null;
        this.currentSegment = null;
        this.currentIndex = 0;
      }
    });

    await this.runner.run(story.segments);
  }

  stop(): void {
    this.runner?.cancel();
  }
}

export const storyStore = new StoryStore();
```

- [ ] **Step 2: Create `src/components/PoeticText.svelte`**

```svelte
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
```

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stores/storyStore.svelte.ts src/components/PoeticText.svelte
git commit -m "feat(story): add storyStore and PoeticText component"
```

---

## Task 20: Stories list + StoryPlayer routes

**Files:**
- Create: `src/routes/Stories.svelte`, `src/routes/StoryPlayer.svelte`
- Modify: `src/App.svelte`

- [ ] **Step 1: Create `src/routes/Stories.svelte`**

```svelte
<script lang="ts">
  import { loadBuiltinStories } from '../lib/story/builtinStories';
  import type { StoryDef } from '../lib/story/types';

  interface Props { onSelect: (story: StoryDef) => void; }
  let { onSelect }: Props = $props();

  let stories = $state<StoryDef[]>([]);
  let error = $state<string | null>(null);

  $effect(() => {
    loadBuiltinStories()
      .then((s) => { stories = s; })
      .catch((e: unknown) => { error = e instanceof Error ? e.message : '載入失敗'; });
  });

  function fmtMin(sec: number): string {
    const m = Math.round(sec / 60);
    return `${m} 分鐘`;
  }
</script>

<section>
  <h2>故事</h2>
  {#if error}
    <p class="error">{error}</p>
  {/if}
  <ul>
    {#each stories as story (story.id)}
      <li>
        <button onclick={() => onSelect(story)}>
          <strong>{story.nameKey}</strong>
          <span class="desc">{story.description}</span>
          <span class="meta">{fmtMin(story.totalDurationSec)} · {story.segments.length} 段</span>
        </button>
      </li>
    {/each}
  </ul>
</section>

<style>
  section { padding: 1.5rem; }
  h2 { font-weight: 600; margin: 0 0 1rem; }
  .error { color: var(--danger); }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
  li button {
    width: 100%;
    text-align: left;
    background: var(--bg-elevated);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .desc { color: var(--text-dim); font-size: 0.9rem; }
  .meta { color: var(--text-dim); font-size: 0.8rem; }
</style>
```

- [ ] **Step 2: Create `src/routes/StoryPlayer.svelte`**

```svelte
<script lang="ts">
  import { storyStore } from '../lib/stores/storyStore.svelte';
  import PoeticText from '../components/PoeticText.svelte';
  import type { StoryDef } from '../lib/story/types';

  interface Props {
    story: StoryDef;
    onClose: () => void;
  }
  let { story, onClose }: Props = $props();

  $effect(() => {
    void storyStore.start(story);
    return () => storyStore.stop();
  });

  function stopAndClose() {
    storyStore.stop();
    onClose();
  }
</script>

<div class="player">
  <header>
    <button class="back" onclick={stopAndClose} aria-label="返回">←</button>
    <h2>{story.nameKey}</h2>
  </header>

  <div class="stage">
    <PoeticText text={storyStore.currentSegment?.poeticText} />
    <p class="progress">
      {storyStore.currentIndex + 1} / {story.segments.length}
    </p>
  </div>

  <button class="stop" onclick={stopAndClose}>停止</button>
</div>

<style>
  .player {
    display: flex;
    flex-direction: column;
    min-height: calc(100dvh - 4rem);
    padding: 1.5rem;
  }
  header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem; }
  .back { font-size: 1.5rem; padding: 0.25rem 0.5rem; }
  h2 { margin: 0; font-weight: 600; }
  .stage { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2rem; }
  .progress { color: var(--text-dim); font-size: 0.85rem; }
  .stop {
    background: var(--bg-elevated);
    border-radius: 999px;
    padding: 0.85rem 2rem;
    align-self: center;
    margin-top: 2rem;
  }
</style>
```

- [ ] **Step 3: Wire routes in `src/App.svelte`**

```svelte
<script lang="ts">
  import Home from './routes/Home.svelte';
  import Mixer from './routes/Mixer.svelte';
  import Stories from './routes/Stories.svelte';
  import StoryPlayer from './routes/StoryPlayer.svelte';
  import Library from './routes/Library.svelte';
  import type { StoryDef } from './lib/story/types';

  let route = $state<'home' | 'mixer' | 'stories' | 'library'>('home');
  let activeStory = $state<StoryDef | null>(null);
</script>

<header>
  <h1>白噪音與睡眠</h1>
</header>

<main>
  {#if activeStory}
    <StoryPlayer story={activeStory} onClose={() => activeStory = null} />
  {:else if route === 'home'}
    <Home />
  {:else if route === 'mixer'}
    <Mixer />
  {:else if route === 'stories'}
    <Stories onSelect={(s) => activeStory = s} />
  {:else if route === 'library'}
    <Library />
  {/if}
</main>

{#if !activeStory}
  <nav>
    <button class:active={route === 'home'} onclick={() => route = 'home'}>首頁</button>
    <button class:active={route === 'mixer'} onclick={() => route = 'mixer'}>混音</button>
    <button class:active={route === 'stories'} onclick={() => route = 'stories'}>故事</button>
    <button class:active={route === 'library'} onclick={() => route = 'library'}>我的</button>
  </nav>
{/if}

<style>
  header { padding: 1.25rem 1.5rem 0; }
  h1 { font-size: 1.1rem; font-weight: 500; margin: 0; opacity: 0.7; }
  main { padding-bottom: 5rem; }
  nav {
    position: fixed;
    bottom: 0;
    inset-inline: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: var(--bg-elevated);
    border-top: 1px solid #ffffff10;
    padding: 0.5rem env(safe-area-inset-right) calc(env(safe-area-inset-bottom) + 0.5rem) env(safe-area-inset-left);
  }
  nav button { padding: 0.75rem 0; font-size: 0.875rem; color: var(--text-dim); }
  nav button.active { color: var(--text); font-weight: 600; }
</style>
```

- [ ] **Step 4: Manual verify**

Run: `pnpm dev`
Expected: 故事 tab → list of 5 stories. Tap one → enters StoryPlayer. PoeticText fades in/out as segments transition. Even though placeholder audio is silent, segment progress (1/4 → 2/4) advances over the duration. Tap stop → returns to story list.

> **Note:** During testing, you may want to lower the segment durations in the JSON files temporarily (e.g. 10 seconds each) to verify segment transitions quickly. Restore durations before commit.

- [ ] **Step 5: Type-check + tests**

Run: `pnpm check && pnpm test:run`
Expected: No errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/routes/Stories.svelte src/routes/StoryPlayer.svelte src/App.svelte
git commit -m "feat(story): add Stories list and StoryPlayer routes"
```

---

# Milestone M4 — Custom Story Editor

## Task 21: StoryRepo

**Files:**
- Create: `src/lib/storage/StoryRepo.ts`
- Test: `tests/storage/StoryRepo.test.ts`

- [ ] **Step 1: Write failing test** at `tests/storage/StoryRepo.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { StoryRepo } from '../../src/lib/storage/StoryRepo';
import { _resetForTests, DB_NAME } from '../../src/lib/storage/db';

describe('StoryRepo', () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase(DB_NAME);
    _resetForTests();
  });

  it('save() creates a new story when no id provided', async () => {
    const repo = new StoryRepo();
    const story = await repo.save({
      name: 'My Story',
      segments: [{ soundId: 'rain', durationSec: 60, crossfadeSec: 5, volume: 0.7 }]
    });
    expect(story.id).toBeDefined();
    expect(story.nameKey).toBe('My Story');
    expect(story.builtin).toBe(false);
    expect(story.totalDurationSec).toBe(60);
    expect(story.createdAt).toBeGreaterThan(0);
    expect(story.updatedAt).toBe(story.createdAt);
  });

  it('save() updates existing when id matches', async () => {
    const repo = new StoryRepo();
    const created = await repo.save({ name: 'A', segments: [] });
    await new Promise((r) => setTimeout(r, 5));
    const updated = await repo.save({ id: created.id, name: 'B', segments: [] });
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBeGreaterThan(created.createdAt);
    expect(updated.nameKey).toBe('B');
  });

  it('listAll() sorts by updatedAt desc', async () => {
    const repo = new StoryRepo();
    const a = await repo.save({ name: 'A', segments: [] });
    await new Promise((r) => setTimeout(r, 5));
    await repo.save({ name: 'B', segments: [] });
    await new Promise((r) => setTimeout(r, 5));
    await repo.save({ id: a.id, name: 'A-updated', segments: [] });
    const all = await repo.listAll();
    expect(all[0]?.nameKey).toBe('A-updated');
  });

  it('delete() removes by id', async () => {
    const repo = new StoryRepo();
    const s = await repo.save({ name: 'X', segments: [] });
    await repo.delete(s.id);
    expect(await repo.getById(s.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `pnpm test:run tests/storage/StoryRepo.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/storage/StoryRepo.ts`**

```typescript
import { getDB, type CustomStoryRecord as RawRecord } from './db';
import type { StorySegment } from '../story/types';

export interface CustomStoryRecord extends Omit<RawRecord, 'segments'> {
  segments: StorySegment[];
}

export interface SaveStoryInput {
  id?: string;
  name: string;
  segments: StorySegment[];
}

export class StoryRepo {
  async save(input: SaveStoryInput): Promise<CustomStoryRecord> {
    const db = await getDB();
    const id = input.id ?? crypto.randomUUID();
    const existing = (await db.get('customStories', id)) as CustomStoryRecord | undefined;
    const now = Date.now();
    const totalDurationSec = input.segments.reduce((sum, s) => sum + s.durationSec, 0);
    const record: CustomStoryRecord = {
      id,
      nameKey: input.name,
      description: '',
      builtin: false,
      segments: input.segments,
      totalDurationSec,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    await db.put('customStories', record);
    return record;
  }

  async getById(id: string): Promise<CustomStoryRecord | undefined> {
    const db = await getDB();
    const row = await db.get('customStories', id);
    return row as CustomStoryRecord | undefined;
  }

  async listAll(): Promise<CustomStoryRecord[]> {
    const db = await getDB();
    const all = (await db.getAll('customStories')) as CustomStoryRecord[];
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('customStories', id);
  }
}

export const storyRepo = new StoryRepo();
```

- [ ] **Step 4: Run test, expect pass**

Run: `pnpm test:run tests/storage/StoryRepo.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/StoryRepo.ts tests/storage/StoryRepo.test.ts
git commit -m "feat(storage): add StoryRepo for custom user stories"
```

---

## Task 22: StoryEditor route

**Files:**
- Create: `src/routes/StoryEditor.svelte`
- Modify: `src/routes/Stories.svelte`, `src/App.svelte`

- [ ] **Step 1: Create `src/routes/StoryEditor.svelte`**

```svelte
<script lang="ts">
  import { BUILTIN_SOUNDS } from '../lib/audio/builtinSounds';
  import { audioEngine } from '../lib/audio/AudioEngine';
  import { storyRepo, type CustomStoryRecord } from '../lib/storage/StoryRepo';
  import type { StorySegment } from '../lib/story/types';

  interface Props {
    initial: CustomStoryRecord | null;
    onClose: () => void;
    onSaved: () => void;
  }
  let { initial, onClose, onSaved }: Props = $props();

  let name = $state(initial?.nameKey ?? '');
  let segments = $state<StorySegment[]>(
    initial?.segments ? structuredClone(initial.segments) : []
  );

  let canSave = $derived(name.trim().length > 0 && segments.length > 0 && segments.every((s) => s.durationSec > 0));

  function addSegment() {
    segments = [
      ...segments,
      { soundId: BUILTIN_SOUNDS[0]!.id, durationSec: 60, crossfadeSec: 5, volume: 0.7, poeticText: '' }
    ];
  }

  function removeSegment(i: number) {
    segments = segments.filter((_, idx) => idx !== i);
  }

  function updateSegment(i: number, patch: Partial<StorySegment>) {
    segments = segments.map((s, idx) => idx === i ? { ...s, ...patch } : s);
  }

  async function preview(soundId: string) {
    await audioEngine.initialize();
    await audioEngine.playTrack(soundId, 0.7);
    setTimeout(() => { void audioEngine.stopTrack(soundId, 1); }, 5000);
  }

  async function save() {
    await storyRepo.save({
      id: initial?.id,
      name: name.trim(),
      segments
    });
    onSaved();
  }
</script>

<div class="editor">
  <header>
    <button class="back" onclick={onClose} aria-label="返回">←</button>
    <h2>{initial ? '編輯故事' : '建立故事'}</h2>
    <button class="save" onclick={save} disabled={!canSave}>儲存</button>
  </header>

  <label class="field">
    <span>故事名稱</span>
    <input type="text" bind:value={name} placeholder="我的旅程" />
  </label>

  <ol class="segments">
    {#each segments as seg, i (i)}
      <li>
        <div class="seg-row">
          <select
            value={seg.soundId}
            onchange={(e) => updateSegment(i, { soundId: (e.currentTarget as HTMLSelectElement).value })}
          >
            {#each BUILTIN_SOUNDS as s (s.id)}
              <option value={s.id}>{s.nameKey}</option>
            {/each}
          </select>
          <button class="preview" onclick={() => preview(seg.soundId)}>試聽 5s</button>
          <button class="remove" onclick={() => removeSegment(i)} aria-label="移除這段">×</button>
        </div>
        <label class="sub">
          <span>時長 {seg.durationSec}s</span>
          <input type="range" min="10" max="900" step="5" value={seg.durationSec}
                 oninput={(e) => updateSegment(i, { durationSec: Number((e.currentTarget as HTMLInputElement).value) })} />
        </label>
        <label class="sub">
          <span>交叉淡化 {seg.crossfadeSec}s</span>
          <input type="range" min="0" max="60" step="1" value={seg.crossfadeSec}
                 oninput={(e) => updateSegment(i, { crossfadeSec: Number((e.currentTarget as HTMLInputElement).value) })} />
        </label>
        <label class="sub">
          <span>音量 {Math.round(seg.volume * 100)}%</span>
          <input type="range" min="0" max="1" step="0.01" value={seg.volume}
                 oninput={(e) => updateSegment(i, { volume: Number((e.currentTarget as HTMLInputElement).value) })} />
        </label>
        <label class="sub">
          <span>場景文字</span>
          <textarea rows="2" value={seg.poeticText ?? ''}
                    oninput={(e) => updateSegment(i, { poeticText: (e.currentTarget as HTMLTextAreaElement).value })}></textarea>
        </label>
      </li>
    {/each}
  </ol>

  <button class="add" onclick={addSegment}>+ 加一段</button>
</div>

<style>
  .editor { padding: 1.5rem; padding-bottom: 6rem; }
  header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; }
  header h2 { margin: 0; flex: 1; }
  .back { font-size: 1.5rem; padding: 0.25rem 0.5rem; }
  .save { padding: 0.5rem 1rem; background: var(--accent); border-radius: 999px; color: #fff; font-weight: 500; }
  .save:disabled { background: var(--bg-elevated); color: var(--text-dim); }
  .field { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
  .field input {
    background: var(--bg-elevated);
    border: 0;
    border-radius: 8px;
    padding: 0.7rem 0.9rem;
    color: var(--text);
    font: inherit;
  }
  .segments { list-style: decimal; padding-left: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
  .segments li {
    background: var(--bg-elevated);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .seg-row { display: flex; align-items: center; gap: 0.5rem; }
  .seg-row select {
    flex: 1;
    background: var(--bg);
    color: var(--text);
    border: 0;
    border-radius: 6px;
    padding: 0.45rem;
  }
  .preview { padding: 0.4rem 0.65rem; background: var(--bg); border-radius: 6px; font-size: 0.8rem; }
  .remove { padding: 0.4rem 0.6rem; color: var(--danger); font-size: 1.1rem; }
  .sub { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; color: var(--text-dim); }
  textarea {
    background: var(--bg);
    border: 0;
    border-radius: 6px;
    padding: 0.5rem;
    color: var(--text);
    font: inherit;
    resize: vertical;
  }
  .add {
    margin-top: 1rem;
    width: 100%;
    padding: 0.85rem;
    background: var(--bg-elevated);
    border-radius: 12px;
    color: var(--accent);
  }
</style>
```

- [ ] **Step 2: Update `src/routes/Stories.svelte`** to show custom stories and an "Add" button

```svelte
<script lang="ts">
  import { loadBuiltinStories } from '../lib/story/builtinStories';
  import { storyRepo, type CustomStoryRecord } from '../lib/storage/StoryRepo';
  import type { StoryDef } from '../lib/story/types';

  interface Props {
    onSelect: (story: StoryDef) => void;
    onCreate: () => void;
    onEdit: (story: CustomStoryRecord) => void;
  }
  let { onSelect, onCreate, onEdit }: Props = $props();

  let builtins = $state<StoryDef[]>([]);
  let customs = $state<CustomStoryRecord[]>([]);
  let error = $state<string | null>(null);

  async function refresh() {
    try {
      builtins = await loadBuiltinStories();
    } catch (e) {
      error = e instanceof Error ? e.message : '載入失敗';
    }
    customs = await storyRepo.listAll();
  }

  $effect(() => { void refresh(); });

  async function deleteCustom(id: string) {
    if (!confirm('確定刪除這個故事？')) return;
    await storyRepo.delete(id);
    await refresh();
  }

  function fmtMin(sec: number): string {
    const m = Math.round(sec / 60);
    return `${m} 分鐘`;
  }
</script>

<section>
  <header>
    <h2>故事</h2>
    <button class="new" onclick={onCreate}>+ 新增</button>
  </header>

  {#if error}<p class="error">{error}</p>{/if}

  <h3>內建</h3>
  <ul>
    {#each builtins as story (story.id)}
      <li>
        <button class="story" onclick={() => onSelect(story)}>
          <strong>{story.nameKey}</strong>
          <span class="desc">{story.description}</span>
          <span class="meta">{fmtMin(story.totalDurationSec)} · {story.segments.length} 段</span>
        </button>
      </li>
    {/each}
  </ul>

  <h3>自訂</h3>
  {#if customs.length === 0}
    <p class="empty">點 + 新增建立你自己的旅程</p>
  {:else}
    <ul>
      {#each customs as story (story.id)}
        <li class="custom-row">
          <button class="story" onclick={() => onSelect(story)}>
            <strong>{story.nameKey}</strong>
            <span class="meta">{fmtMin(story.totalDurationSec)} · {story.segments.length} 段</span>
          </button>
          <div class="actions">
            <button onclick={() => onEdit(story)}>編輯</button>
            <button class="del" onclick={() => deleteCustom(story.id)}>刪除</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  section { padding: 1.5rem; }
  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  h2 { margin: 0; font-weight: 600; }
  h3 { margin: 1.5rem 0 0.75rem; font-size: 0.85rem; color: var(--text-dim); font-weight: 500; }
  .new { background: var(--accent); color: #fff; padding: 0.45rem 0.9rem; border-radius: 999px; }
  .error { color: var(--danger); }
  .empty { color: var(--text-dim); font-size: 0.9rem; }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
  li button.story {
    width: 100%;
    text-align: left;
    background: var(--bg-elevated);
    border-radius: 12px;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .desc { color: var(--text-dim); font-size: 0.85rem; }
  .meta { color: var(--text-dim); font-size: 0.75rem; }
  .custom-row { display: flex; flex-direction: column; gap: 0.4rem; }
  .actions { display: flex; gap: 0.5rem; padding: 0 0.5rem; }
  .actions button {
    flex: 1;
    background: var(--bg-elevated);
    padding: 0.45rem;
    border-radius: 8px;
    font-size: 0.85rem;
  }
  .del { color: var(--danger); }
</style>
```

- [ ] **Step 3: Wire StoryEditor in `src/App.svelte`**

```svelte
<script lang="ts">
  import Home from './routes/Home.svelte';
  import Mixer from './routes/Mixer.svelte';
  import Stories from './routes/Stories.svelte';
  import StoryPlayer from './routes/StoryPlayer.svelte';
  import StoryEditor from './routes/StoryEditor.svelte';
  import Library from './routes/Library.svelte';
  import type { StoryDef } from './lib/story/types';
  import type { CustomStoryRecord } from './lib/storage/StoryRepo';

  let route = $state<'home' | 'mixer' | 'stories' | 'library'>('home');
  let activeStory = $state<StoryDef | null>(null);
  let editing = $state<{ initial: CustomStoryRecord | null } | null>(null);
  let storiesKey = $state(0);
</script>

<header>
  <h1>白噪音與睡眠</h1>
</header>

<main>
  {#if editing !== null}
    <StoryEditor
      initial={editing.initial}
      onClose={() => editing = null}
      onSaved={() => { editing = null; storiesKey++; }}
    />
  {:else if activeStory}
    <StoryPlayer story={activeStory} onClose={() => activeStory = null} />
  {:else if route === 'home'}
    <Home />
  {:else if route === 'mixer'}
    <Mixer />
  {:else if route === 'stories'}
    {#key storiesKey}
      <Stories
        onSelect={(s) => activeStory = s}
        onCreate={() => editing = { initial: null }}
        onEdit={(s) => editing = { initial: s }}
      />
    {/key}
  {:else if route === 'library'}
    <Library />
  {/if}
</main>

{#if !activeStory && !editing}
  <nav>
    <button class:active={route === 'home'} onclick={() => route = 'home'}>首頁</button>
    <button class:active={route === 'mixer'} onclick={() => route = 'mixer'}>混音</button>
    <button class:active={route === 'stories'} onclick={() => route = 'stories'}>故事</button>
    <button class:active={route === 'library'} onclick={() => route = 'library'}>我的</button>
  </nav>
{/if}

<style>
  header { padding: 1.25rem 1.5rem 0; }
  h1 { font-size: 1.1rem; font-weight: 500; margin: 0; opacity: 0.7; }
  main { padding-bottom: 5rem; }
  nav {
    position: fixed;
    bottom: 0;
    inset-inline: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: var(--bg-elevated);
    border-top: 1px solid #ffffff10;
    padding: 0.5rem env(safe-area-inset-right) calc(env(safe-area-inset-bottom) + 0.5rem) env(safe-area-inset-left);
  }
  nav button { padding: 0.75rem 0; font-size: 0.875rem; color: var(--text-dim); }
  nav button.active { color: var(--text); font-weight: 600; }
</style>
```

- [ ] **Step 4: Manual verify**

Run: `pnpm dev`
Expected: 故事 tab → "+ 新增" → editor opens. Add 2 segments, set durations 30s each, write text. Save. Returns to list, custom story shows. Tap to play. Edit existing. Delete with confirmation.

- [ ] **Step 5: Type-check + tests**

Run: `pnpm check && pnpm test:run`
Expected: No errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/routes/StoryEditor.svelte src/routes/Stories.svelte src/App.svelte
git commit -m "feat(story): add custom story editor and management"
```

---

# Milestone M5 — Sleep Timer + Player Bar

## Task 23: SleepTimer

**Files:**
- Create: `src/lib/timer/SleepTimer.ts`
- Test: `tests/timer/SleepTimer.test.ts`

- [ ] **Step 1: Write failing test** at `tests/timer/SleepTimer.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SleepTimer } from '../../src/lib/timer/SleepTimer';

describe('SleepTimer', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('start() schedules fadeOut and stopAll callbacks', async () => {
    const fadeOut = vi.fn();
    const stopAll = vi.fn();
    const timer = new SleepTimer({ fadeOut, stopAll });

    timer.start({ totalSec: 60, fadeOutSec: 10 });

    await vi.advanceTimersByTimeAsync(50_000);
    expect(fadeOut).toHaveBeenCalledWith(10);
    expect(stopAll).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(stopAll).toHaveBeenCalled();
  });

  it('remaining() reports remaining seconds', () => {
    const timer = new SleepTimer({ fadeOut: vi.fn(), stopAll: vi.fn() });
    timer.start({ totalSec: 30, fadeOutSec: 5 });
    expect(timer.remaining()).toBe(30);
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z'));
    expect(timer.remaining()).toBe(20);
  });

  it('cancel() prevents callbacks from firing', async () => {
    const fadeOut = vi.fn();
    const stopAll = vi.fn();
    const timer = new SleepTimer({ fadeOut, stopAll });

    timer.start({ totalSec: 60, fadeOutSec: 10 });
    timer.cancel();
    await vi.advanceTimersByTimeAsync(70_000);

    expect(fadeOut).not.toHaveBeenCalled();
    expect(stopAll).not.toHaveBeenCalled();
  });

  it('isRunning() reflects state', () => {
    const timer = new SleepTimer({ fadeOut: vi.fn(), stopAll: vi.fn() });
    expect(timer.isRunning()).toBe(false);
    timer.start({ totalSec: 60, fadeOutSec: 10 });
    expect(timer.isRunning()).toBe(true);
    timer.cancel();
    expect(timer.isRunning()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `pnpm test:run tests/timer/SleepTimer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/timer/SleepTimer.ts`**

```typescript
export interface SleepTimerCallbacks {
  fadeOut: (sec: number) => void;
  stopAll: () => void;
}

export interface StartTimerInput {
  totalSec: number;
  fadeOutSec: number;
}

export class SleepTimer {
  private endAt: number | null = null;
  private fadeAt: number | null = null;
  private fadeTimeout: ReturnType<typeof setTimeout> | null = null;
  private stopTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cb: SleepTimerCallbacks) {}

  start(input: StartTimerInput): void {
    this.cancel();
    const now = Date.now();
    this.endAt = now + input.totalSec * 1000;
    this.fadeAt = this.endAt - input.fadeOutSec * 1000;

    const untilFade = Math.max(0, this.fadeAt - now);
    this.fadeTimeout = setTimeout(() => this.cb.fadeOut(input.fadeOutSec), untilFade);

    const untilStop = Math.max(0, this.endAt - now);
    this.stopTimeout = setTimeout(() => {
      this.cb.stopAll();
      this.endAt = null;
      this.fadeAt = null;
    }, untilStop);
  }

  cancel(): void {
    if (this.fadeTimeout) { clearTimeout(this.fadeTimeout); this.fadeTimeout = null; }
    if (this.stopTimeout) { clearTimeout(this.stopTimeout); this.stopTimeout = null; }
    this.endAt = null;
    this.fadeAt = null;
  }

  remaining(): number {
    if (this.endAt === null) return 0;
    return Math.max(0, Math.ceil((this.endAt - Date.now()) / 1000));
  }

  isRunning(): boolean { return this.endAt !== null; }
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `pnpm test:run tests/timer/SleepTimer.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timer/SleepTimer.ts tests/timer/SleepTimer.test.ts
git commit -m "feat(timer): add SleepTimer with endAt-based scheduling"
```

---

## Task 24: timerStore + TimerDial component

**Files:**
- Create: `src/lib/stores/timerStore.svelte.ts`, `src/components/TimerDial.svelte`

- [ ] **Step 1: Implement `src/lib/stores/timerStore.svelte.ts`**

```typescript
import { audioEngine } from '../audio/AudioEngine';
import { audioStore } from './audioStore.svelte';
import { storyStore } from './storyStore.svelte';
import { SleepTimer } from '../timer/SleepTimer';
import { settingsRepo } from '../storage/SettingsRepo';

class TimerStore {
  remainingSec = $state(0);
  running = $state(false);
  fadeOutSec = $state(30);
  private timer: SleepTimer;
  private tickHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.timer = new SleepTimer({
      fadeOut: (sec) => audioEngine.masterFadeOut(sec),
      stopAll: () => {
        storyStore.stop();
        void audioStore.stopAll(0);
      }
    });
    void this.loadSettings();
  }

  private async loadSettings() {
    const s = await settingsRepo.load();
    this.fadeOutSec = s.fadeOutOnTimerSec;
  }

  start(totalMin: number) {
    this.timer.start({ totalSec: totalMin * 60, fadeOutSec: this.fadeOutSec });
    this.running = true;
    this.startTick();
  }

  cancel() {
    this.timer.cancel();
    this.running = false;
    this.stopTick();
    this.remainingSec = 0;
  }

  private startTick() {
    this.stopTick();
    this.tickHandle = setInterval(() => {
      this.remainingSec = this.timer.remaining();
      if (this.remainingSec === 0) {
        this.running = false;
        this.stopTick();
      }
    }, 250);
  }

  private stopTick() {
    if (this.tickHandle) { clearInterval(this.tickHandle); this.tickHandle = null; }
  }
}

export const timerStore = new TimerStore();
```

- [ ] **Step 2: Create `src/components/TimerDial.svelte`**

```svelte
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
```

- [ ] **Step 3: Type-check**

Run: `pnpm check`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/stores/timerStore.svelte.ts src/components/TimerDial.svelte
git commit -m "feat(timer): add timerStore and TimerDial component"
```

---

## Task 25: PlayerBar component (global player + timer dial)

**Files:**
- Create: `src/components/PlayerBar.svelte`
- Modify: `src/App.svelte`

- [ ] **Step 1: Create `src/components/PlayerBar.svelte`**

```svelte
<script lang="ts">
  import { audioStore } from '../lib/stores/audioStore.svelte';
  import { storyStore } from '../lib/stores/storyStore.svelte';
  import { timerStore } from '../lib/stores/timerStore.svelte';
  import TimerDial from './TimerDial.svelte';
  import VolumeSlider from './VolumeSlider.svelte';

  let expanded = $state(false);

  let visible = $derived(audioStore.isPlaying || storyStore.isPlaying);
  let activeCount = $derived(Object.keys(audioStore.tracks).length);

  async function stopEverything() {
    storyStore.stop();
    await audioStore.stopAll(1);
  }
</script>

{#if visible}
  <aside class="bar" class:expanded>
    <div class="row" onclick={() => expanded = !expanded} role="button" tabindex="0">
      <div class="info">
        {#if storyStore.current}
          <strong>{storyStore.current.nameKey}</strong>
          <span class="dim">第 {storyStore.currentIndex + 1} 段</span>
        {:else if activeCount > 0}
          <strong>{activeCount} 個音效播放中</strong>
        {/if}
      </div>
      <button class="stop" onclick={(e) => { e.stopPropagation(); void stopEverything(); }}>停止</button>
    </div>
    {#if expanded}
      <div class="extras">
        <VolumeSlider
          label="主音量"
          value={audioStore.masterVolume}
          oninput={(v) => audioStore.setMasterVolume(v)}
        />
        <TimerDial />
      </div>
    {/if}
  </aside>
{/if}

<style>
  .bar {
    position: fixed;
    inset-inline: 0;
    bottom: 4rem;
    background: var(--bg-elevated);
    border-top: 1px solid #ffffff10;
    padding: 0.5rem 1rem;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    cursor: pointer;
  }
  .info { display: flex; flex-direction: column; gap: 0.15rem; }
  .dim { color: var(--text-dim); font-size: 0.8rem; }
  .stop {
    background: var(--bg);
    color: var(--danger);
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    font-size: 0.85rem;
  }
  .extras { padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
</style>
```

- [ ] **Step 2: Add `<PlayerBar />` to `src/App.svelte`**

Add `import PlayerBar from './components/PlayerBar.svelte';` at the top, and place `<PlayerBar />` just before `{#if !activeStory && !editing}` so it shows above the nav bar:

```svelte
<!-- ... existing main and route logic ... -->

<PlayerBar />

{#if !activeStory && !editing}
  <nav>
    <!-- ... -->
  </nav>
{/if}
```

- [ ] **Step 3: Manual verify**

Run: `pnpm dev`
Expected: Play 1-2 sounds → PlayerBar appears at bottom. Tap → expands with master volume + timer presets. Click "30 分" → timer counts down. Tap "取消" → cancels. Stop button stops everything.

- [ ] **Step 4: Commit**

```bash
git add src/components/PlayerBar.svelte src/App.svelte
git commit -m "feat(ui): add PlayerBar with global stop and timer dial"
```

---

# Milestone M6 — PWA + Docker + Polish

## Task 26: Toast component + error UI

**Files:**
- Create: `src/components/Toast.svelte`, `src/lib/stores/toastStore.svelte.ts`
- Modify: `src/lib/stores/audioStore.svelte.ts`, `src/App.svelte`

- [ ] **Step 1: Create `src/lib/stores/toastStore.svelte.ts`**

```typescript
interface ToastEntry {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

class ToastStore {
  toasts = $state<ToastEntry[]>([]);
  private nextId = 1;

  show(text: string, kind: ToastEntry['kind'] = 'info') {
    const id = this.nextId++;
    this.toasts = [...this.toasts, { id, text, kind }];
    setTimeout(() => this.dismiss(id), 3500);
  }

  dismiss(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}

export const toastStore = new ToastStore();
```

- [ ] **Step 2: Create `src/components/Toast.svelte`**

```svelte
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
```

- [ ] **Step 3: Wire toast on audio errors in `src/lib/stores/audioStore.svelte.ts`**

Wrap the body of `toggleSound` with try/catch (replace the existing method):

```typescript
import { toastStore } from './toastStore.svelte';

// inside class AudioStore:
  async toggleSound(soundId: string, volume = 0.7) {
    try {
      await this.ensureInitialized();
      if (this.tracks[soundId]) {
        await audioEngine.stopTrack(soundId);
        delete this.tracks[soundId];
        return;
      }
      await audioEngine.playTrack(soundId, volume);
      this.tracks[soundId] = { soundId, volume };
      void recentsRepo.push('sound', soundId).catch(() => { /* ignore */ });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '播放失敗';
      toastStore.show(`音效載入失敗：${msg}`, 'error');
    }
  }
```

- [ ] **Step 4: Add `<Toast />` to `src/App.svelte`**

Add `import Toast from './components/Toast.svelte';` at the top and `<Toast />` somewhere outside of `<main>` (e.g. just before `<header>`):

```svelte
<Toast />
<header>...</header>
```

- [ ] **Step 5: Manual verify**

Run: `pnpm dev`
Expected: App still works. Manually trigger an error by replacing one of the sound paths in `builtinSounds.ts` with a 404 path, reload — toast appears for ~3.5s, then disappears. Revert the change.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stores/toastStore.svelte.ts src/components/Toast.svelte src/lib/stores/audioStore.svelte.ts src/App.svelte
git commit -m "feat(ui): add Toast component and audio error reporting"
```

---

## Task 27: PWA manifest + icons + service worker config

**Files:**
- Modify: `vite.config.ts`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`

- [ ] **Step 1: Generate placeholder PNG icons** (any tool — here we use ImageMagick or a simple Python one-liner)

Run:
```bash
mkdir -p public/icons
# If ImageMagick installed:
convert -size 192x192 xc:'#0b0d12' -fill '#6b9bd2' -gravity center -font 'Sans' -pointsize 80 -annotate +0+0 '♪' public/icons/icon-192.png
convert -size 512x512 xc:'#0b0d12' -fill '#6b9bd2' -gravity center -font 'Sans' -pointsize 220 -annotate +0+0 '♪' public/icons/icon-512.png
cp public/icons/icon-512.png public/icons/icon-maskable-512.png
ls public/icons/
```
Expected: 3 png files. Replace with real designed icons before public release.

- [ ] **Step 2: Modify `vite.config.ts`** to include vite-plugin-pwa

```typescript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'audio/*.mp3', 'stories/*.json'],
      manifest: {
        name: '白噪音與睡眠',
        short_name: '白噪音',
        description: '專為助眠、放鬆、專注設計的白噪音 App',
        lang: 'zh-Hant',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0d12',
        theme_color: '#0b0d12',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/audio\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: /\/stories\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'stories-cache' }
          }
        ]
      }
    })
  ],
  server: { port: 5173, host: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts']
  }
});
```

- [ ] **Step 3: Build and preview**

Run: `pnpm build && pnpm preview`
Expected: Build succeeds; preview at `http://localhost:4173`. Open Chrome → DevTools → Application → Manifest shows the manifest. Service Worker registered. Reload page; Network tab shows audio served from service worker.

- [ ] **Step 4: Verify install prompt**

In Chrome on Linux: visit `http://localhost:4173`, look for the install icon in the address bar (right side). Click → app installs as standalone window. Open it → app loads without browser chrome. Close.

- [ ] **Step 5: Verify offline**

In DevTools → Network → tick "Offline". Reload page. App still loads.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts public/icons/
git commit -m "feat(pwa): add manifest, icons, and service worker with audio cache"
```

---

## Task 28: Dockerfile + .dockerignore

**Files:**
- Create: `Dockerfile`, `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

```
node_modules
dist
.git
.svelte-kit
*.log
.env*
docs
tests
.vscode
.nvmrc
README.md
```

- [ ] **Step 2: Create `Dockerfile`**

```dockerfile
# ── Stage 1: Build ──
FROM node:24-alpine AS builder

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ── Stage 2: Runtime ──
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: Commit (build will fail until nginx.conf exists in next task)**

```bash
git add Dockerfile .dockerignore
git commit -m "build: add multi-stage Dockerfile (node:24-alpine -> nginx:alpine)"
```

---

## Task 29: nginx.conf

**Files:**
- Create: `nginx.conf`

- [ ] **Step 1: Create `nginx.conf`** at repo root

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  gzip on;
  gzip_types text/plain text/css application/javascript application/json image/svg+xml;
  gzip_proxied any;
  gzip_min_length 1024;

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Don't cache index or service worker
  location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }
  location = /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }
  location = /manifest.webmanifest {
    add_header Cache-Control "no-cache";
  }

  # Hashed assets - immutable
  location ~* \.(js|css|woff2?|svg|png|webp)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Audio files - long cache
  location ~* \.(mp3|wav|ogg)$ {
    expires 30d;
    add_header Cache-Control "public";
  }
}
```

- [ ] **Step 2: Build the Docker image**

Run: `docker build -t whitenoise:dev .`
Expected: Build completes successfully. Both stages run. Final image based on nginx:alpine.

- [ ] **Step 3: Run the image**

Run: `docker run --rm -p 8080:80 --name whitenoise-test whitenoise:dev`
Expected: nginx starts. Visit `http://localhost:8080`. App loads. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add nginx.conf
git commit -m "build: add nginx.conf with SPA fallback and PWA cache headers"
```

---

## Task 30: docker-compose.yml + final assembly

**Files:**
- Create: `docker-compose.yml`, `README.md`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  web:
    build: .
    image: whitenoise:latest
    container_name: whitenoise
    ports:
      - "8080:80"
    restart: unless-stopped
```

- [ ] **Step 2: Verify compose**

Run: `docker compose up -d --build`
Expected: Container starts.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/`
Expected: `200`.
Run: `docker compose down`

- [ ] **Step 3: Create `README.md`**

```markdown
# 白噪音與睡眠

A PWA white-noise sleep app. 8 nature sounds, multi-track mixing, story mode with poetic text, sleep timer, custom stories, all stored locally in IndexedDB. No backend, no account.

## Requirements

- Node.js 24+ (LTS)
- pnpm 10+
- Docker (for production deployment)

## Development

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # vitest watch
pnpm test:run     # vitest run once
pnpm check        # svelte-check + tsc
pnpm build        # build to dist/
pnpm preview      # preview prod build at :4173
```

## Deployment (Docker)

```bash
docker compose up -d --build
# App at http://localhost:8080
```

For HTTPS in production, place a reverse proxy (Caddy / Traefik / nginx with Let's Encrypt) in front of port 8080. PWA service worker requires HTTPS (or localhost).

## Project structure

See `docs/superpowers/specs/2026-05-09-whitenoise-design.md`.

## License & Audio assets

Audio files in `public/audio/` are silent placeholders. Replace with CC0 / CC-BY recordings before public release. See spec §11 for sources.

## Acceptance checklist

Before tagging a release, verify:

- [ ] 8 sounds play and loop without gaps
- [ ] Mixer plays 3+ sounds simultaneously with independent volumes
- [ ] All 5 builtin stories play through with crossfade and poetic text
- [ ] Custom story create → save → reload page → play works
- [ ] Sleep timer 30s correctly fades out and stops
- [ ] PWA installs and runs offline (audio served from cache)
- [ ] Tested on Chromium and Firefox on Linux
```

- [ ] **Step 4: Final verification round**

Run:
```bash
pnpm install && pnpm check && pnpm test:run && pnpm build
docker compose up -d --build
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/
docker compose down
```
Expected: All pass; HTTP 200.

- [ ] **Step 5: Final commit**

```bash
git add docker-compose.yml README.md
git commit -m "docs: add README and docker-compose for production deploy"
```

---

# Acceptance & Release Checklist

After all tasks complete, run this checklist (which is also in the README):

- [ ] `pnpm check` — no TypeScript errors
- [ ] `pnpm test:run` — all unit tests pass
- [ ] `pnpm build` — production build succeeds
- [ ] **8 sounds:** every card on Home plays a looping sound (note: real audio files must replace placeholders for audible verification)
- [ ] **Mixer:** at least 3 sounds simultaneously with independent volume sliders
- [ ] **Stories:** all 5 builtin stories play through; segments transition with crossfade; poetic text fades in/out
- [ ] **Custom story:** create with 3 segments, save, reload page, story persists, plays correctly
- [ ] **Sleep timer:** 30-second test (temporarily change `PRESETS = [0.5, ...]` for quick verification, restore after); fade-out happens, audio stops
- [ ] **PlayerBar:** shows when audio plays, expands with master volume + timer dial, stop button works
- [ ] **PWA:** Chrome shows install icon → install → app opens standalone; offline mode reload works
- [ ] **Docker:** `docker compose up -d --build` → `curl http://localhost:8080/` returns 200; app loads in browser
- [ ] **Cross-browser:** verified in Chromium and Firefox on Linux
- [ ] **Audio assets:** placeholder mp3s replaced with real CC0/CC-BY recordings (per spec §11)

---

**END OF PLAN**
