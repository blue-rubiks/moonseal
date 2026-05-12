# 播放狀態整合實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `audioStore` 和 `storyStore` 合併成單一 `audioStore`，引入 `idle / mix / story` 互斥 mode，preview 走獨立 channel，消除 UI state 與 engine state 不同步的 bug。

**Architecture:** AudioEngine 加一條獨立 preview slot；audioStore 吸收 story state + StoryRunner，互斥規則寫在進入點；storyStore 過渡為 delegating shim，等所有 consumer 遷移完再刪掉。

**Tech Stack:** Svelte 5 + TypeScript + Tone.js 15 + vitest 4（jsdom + `vi.mock('tone')` 既有 pattern）

**Spec：** `docs/superpowers/specs/2026-05-11-playback-state-integration-design.md`

---

## File Structure

**Create:**
- `tests/stores/audioStore.test.ts` — audioStore 新行為的單元測試

**Modify:**
- `src/lib/audio/AudioEngine.ts` — 加 `previewOnce` / `stopPreview` / `previewTrack`
- `tests/audio/AudioEngine.test.ts` — 加 preview 行為測試
- `src/lib/stores/audioStore.svelte.ts` — 吸收 story state + mode + preview 包裝
- `src/lib/stores/storyStore.svelte.ts` — 暫時改為 delegating shim，最後刪除
- `src/components/PlayerBar.svelte` — 改讀 `audioStore.mode / currentStory / currentIndex`
- `src/routes/StoryPlayer.svelte` — 改呼 `audioStore.startStory / stopStory`
- `src/routes/StoryEditor.svelte` — 改呼 `audioStore.preview`
- `src/lib/stores/timerStore.svelte.ts` — 移除 `storyStore` 依賴

**Delete:**
- `src/lib/stores/storyStore.svelte.ts`（在最後一步）

---

### Task 1: AudioEngine — preview channel

**Files:**
- Modify: `src/lib/audio/AudioEngine.ts`
- Test: `tests/audio/AudioEngine.test.ts`

- [ ] **Step 1: 在既有 `tests/audio/AudioEngine.test.ts` 最末（line 167 之後、`});` 之前）加入 preview 相關測試**

```ts
  it('previewOnce creates a separate preview track that is not in main tracks list', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.5);
    await engine.previewOnce('rain', 5, 0.7);
    expect(playerInstances).toHaveLength(2);
    expect(engine.activeTrackIds()).toEqual(['ocean']);
  });

  it('previewOnce does not affect main tracks when stopAll is called', async () => {
    await engine.initialize();
    await engine.previewOnce('ocean', 5, 0.7);
    await engine.stopAll(0);
    expect(playerInstances[0]?.stop).not.toHaveBeenCalled();
  });

  it('previewOnce replaces existing preview (only one preview at a time)', async () => {
    await engine.initialize();
    await engine.previewOnce('ocean', 5, 0.7);
    await engine.previewOnce('rain', 5, 0.7);
    expect(playerInstances[0]?.stop).toHaveBeenCalled();
    expect(playerInstances[0]?.dispose).toHaveBeenCalled();
  });

  it('stopPreview disposes the preview track without touching main tracks', async () => {
    await engine.initialize();
    await engine.playTrack('ocean', 0.5);
    await engine.previewOnce('rain', 5, 0.7);
    await engine.stopPreview(0);
    expect(playerInstances[0]?.stop).not.toHaveBeenCalled();
    expect(playerInstances[1]?.stop).toHaveBeenCalled();
    expect(playerInstances[1]?.dispose).toHaveBeenCalled();
  });

  it('crossfadeTo does not affect preview track', async () => {
    await engine.initialize();
    await engine.previewOnce('ocean', 5, 0.7);
    await engine.crossfadeTo('rain', 0.5, 1);
    expect(playerInstances[0]?.stop).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test:run tests/audio/AudioEngine.test.ts`
Expected: 5 個新測試 FAIL，原因類似 `engine.previewOnce is not a function`

- [ ] **Step 3: 在 `src/lib/audio/AudioEngine.ts` 加 preview 欄位與方法**

在 class `AudioEngine` 內，緊接 `private readonly tracks = new Map<string, ActiveTrack>();`（line 19）後加：

```ts
  private previewTrack: ActiveTrack | null = null;
```

並在 class 內、`private async createTrack(...)`（line 111）之前加兩個 method：

```ts
  async previewOnce(soundId: string, durationSec: number, volume: number): Promise<void> {
    await this.stopPreview(0.1);
    const def = getSoundById(soundId);
    if (!def) throw new Error(`unknown sound: ${soundId}`);
    const track = await this.createTrack(def);
    this.previewTrack = track;
    track.source.volume.value = MIN_DB;
    track.source.start();
    rampVolume(track.source, volume, 0.3);
    setTimeout(() => { void this.stopPreview(1); }, durationSec * 1000);
  }

  async stopPreview(fadeOutSec = 0.3): Promise<void> {
    const t = this.previewTrack;
    if (!t) return;
    this.previewTrack = null;
    if (fadeOutSec > 0) {
      rampVolume(t.source, 0, fadeOutSec);
      await new Promise((r) => setTimeout(r, fadeOutSec * 1000));
    }
    t.source.stop();
    t.source.dispose();
  }
```

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm test:run tests/audio/AudioEngine.test.ts`
Expected: 全部 PASS（既有 + 5 個新）

- [ ] **Step 5: typecheck**

Run: `pnpm check`
Expected: 無錯誤

- [ ] **Step 6: Commit**

```bash
git add src/lib/audio/AudioEngine.ts tests/audio/AudioEngine.test.ts
git commit -m "feat(audio): 加入 preview channel，獨立於 main tracks"
```

---

### Task 2: audioStore — 吸收 story state 並加 preview 包裝（保留舊 API）

**Files:**
- Modify: `src/lib/stores/audioStore.svelte.ts`
- Create: `tests/stores/audioStore.test.ts`

說明：本步驟採「additive」策略 — 既有的 `toggleSound / setVolume / setMasterVolume / stopAll / ensureInitialized` 全保留並調整其互斥行為，新增 `mode / currentStory / currentSegment / currentIndex / startStory / stopStory / preview`。`storyStore` 此時還沒改，所以 UI 仍透過 `storyStore.start` 進入夜讀（下一個 task 把 storyStore 改成 shim 後才路由到這裡）。

- [ ] **Step 1: 新建 `tests/stores/audioStore.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    initialize: vi.fn(async () => {}),
    playTrack: vi.fn(async () => {}),
    crossfadeTo: vi.fn(async () => {}),
    setVolume: vi.fn(),
    stopTrack: vi.fn(async () => {}),
    stopAll: vi.fn(async () => {}),
    previewOnce: vi.fn(async () => {}),
    activeTrackIds: vi.fn(() => [] as string[])
  };
});

vi.mock('../../src/lib/audio/AudioEngine', () => ({
  audioEngine: {
    initialize: mocks.initialize,
    playTrack: mocks.playTrack,
    crossfadeTo: mocks.crossfadeTo,
    setVolume: mocks.setVolume,
    stopTrack: mocks.stopTrack,
    stopAll: mocks.stopAll,
    previewOnce: mocks.previewOnce,
    activeTrackIds: mocks.activeTrackIds
  }
}));

vi.mock('../../src/lib/storage/RecentsRepo', () => ({
  recentsRepo: { push: vi.fn(async () => {}) }
}));

import { audioStore } from '../../src/lib/stores/audioStore.svelte';
import type { StoryDef } from '../../src/lib/story/types';

const story: StoryDef = {
  id: 'test-story',
  nameKey: '測試',
  description: '',
  builtin: false,
  totalDurationSec: 30,
  segments: [
    { soundId: 'ocean', durationSec: 0.05, crossfadeSec: 0, volume: 0.5, poeticText: 'a' },
    { soundId: 'rain', durationSec: 0.05, crossfadeSec: 0, volume: 0.5, poeticText: 'b' }
  ]
};

async function reset() {
  await audioStore.stopAll(0);
  vi.clearAllMocks();
}

describe('audioStore — mode lifecycle', () => {
  beforeEach(reset);

  it('starts in idle mode', () => {
    expect(audioStore.mode).toBe('idle');
    expect(audioStore.isPlaying).toBe(false);
  });

  it('toggleSound from idle enters mix mode', async () => {
    await audioStore.toggleSound('ocean', 0.7);
    expect(audioStore.mode).toBe('mix');
    expect(audioStore.tracks['ocean']).toBeDefined();
  });

  it('toggleSound removing last sound returns to idle', async () => {
    await audioStore.toggleSound('ocean', 0.7);
    await audioStore.toggleSound('ocean', 0.7);
    expect(audioStore.mode).toBe('idle');
    expect(Object.keys(audioStore.tracks)).toHaveLength(0);
  });

  it('startStory from mix mode stops mix and enters story mode', async () => {
    await audioStore.toggleSound('ocean', 0.7);
    await audioStore.toggleSound('rain', 0.7);
    expect(audioStore.mode).toBe('mix');

    const p = audioStore.startStory(story);
    await new Promise((r) => setTimeout(r, 10));

    expect(mocks.stopAll).toHaveBeenCalled();
    expect(audioStore.tracks).toEqual({});
    expect(audioStore.mode).toBe('story');
    expect(audioStore.currentStory?.id).toBe('test-story');
    expect(audioStore.currentIndex).toBe(0);

    await audioStore.stopStory();
    await p;
  });

  it('toggleSound during story stops story and enters mix mode', async () => {
    const p = audioStore.startStory(story);
    await new Promise((r) => setTimeout(r, 10));
    expect(audioStore.mode).toBe('story');

    await audioStore.toggleSound('ocean', 0.7);
    expect(audioStore.mode).toBe('mix');
    expect(audioStore.currentStory).toBeNull();
    expect(audioStore.currentSegment).toBeNull();
    expect(audioStore.tracks['ocean']).toBeDefined();
    await p;
  });

  it('stopStory cancels story and returns to idle', async () => {
    const p = audioStore.startStory(story);
    await new Promise((r) => setTimeout(r, 10));
    await audioStore.stopStory();
    await p;
    expect(audioStore.mode).toBe('idle');
    expect(audioStore.currentStory).toBeNull();
  });

  it('story completing all segments returns to idle', async () => {
    await audioStore.startStory(story);
    expect(audioStore.mode).toBe('idle');
    expect(audioStore.currentStory).toBeNull();
  });

  it('stopAll from any mode cleans up to idle', async () => {
    await audioStore.toggleSound('ocean', 0.7);
    await audioStore.stopAll(0);
    expect(audioStore.mode).toBe('idle');
    expect(audioStore.tracks).toEqual({});

    const p2 = audioStore.startStory(story);
    await new Promise((r) => setTimeout(r, 10));
    await audioStore.stopAll(0);
    expect(audioStore.mode).toBe('idle');
    expect(audioStore.currentStory).toBeNull();
    await p2;
  });
});

describe('audioStore — preview channel', () => {
  beforeEach(reset);

  it('preview does not change mode or tracks', async () => {
    await audioStore.preview('ocean', 5, 0.7);
    expect(audioStore.mode).toBe('idle');
    expect(audioStore.tracks).toEqual({});
    expect(mocks.previewOnce).toHaveBeenCalledWith('ocean', 5, 0.7);
  });

  it('preview during story does not stop story', async () => {
    const p = audioStore.startStory(story);
    await new Promise((r) => setTimeout(r, 10));
    await audioStore.preview('rain', 5, 0.7);
    expect(audioStore.mode).toBe('story');
    expect(audioStore.currentStory?.id).toBe('test-story');
    await audioStore.stopStory();
    await p;
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm test:run tests/stores/audioStore.test.ts`
Expected: 全部 FAIL（mode、startStory、preview 等都還不存在）

- [ ] **Step 3: 重寫 `src/lib/stores/audioStore.svelte.ts`**

整個檔案替換為：

```ts
import { audioEngine } from '../audio/AudioEngine';
import { recentsRepo } from '../storage/RecentsRepo';
import { toastStore } from './toastStore.svelte';
import { StoryRunner } from '../story/StoryRunner';
import type { StoryDef, StorySegment } from '../story/types';

export interface TrackState {
  soundId: string;
  volume: number;
}

export type PlaybackMode = 'idle' | 'mix' | 'story';

class AudioStore {
  initialized = $state(false);
  masterVolume = $state(0.7);

  mode = $state<PlaybackMode>('idle');
  tracks = $state<Record<string, TrackState>>({});

  currentStory = $state<StoryDef | null>(null);
  currentSegment = $state<StorySegment | null>(null);
  currentIndex = $state(0);

  private runner: StoryRunner | null = null;
  private busy: Promise<unknown> | null = null;

  isPlaying = $derived(this.mode !== 'idle');

  async ensureInitialized() {
    if (this.initialized) return;
    await audioEngine.initialize();
    this.initialized = true;
  }

  async toggleSound(soundId: string, volume = 0.7) {
    await this.#serialize(async () => {
      try {
        await this.ensureInitialized();
        if (this.mode === 'story') await this.#leaveStorySync(0.3);
        if (this.tracks[soundId]) {
          await audioEngine.stopTrack(soundId);
          delete this.tracks[soundId];
        } else {
          await audioEngine.playTrack(soundId, volume);
          this.tracks[soundId] = { soundId, volume };
          void recentsRepo.push('sound', soundId).catch(() => { /* ignore */ });
        }
        this.mode = Object.keys(this.tracks).length > 0 ? 'mix' : 'idle';
      } catch (e) {
        const msg = e instanceof Error ? e.message : '播放失敗';
        toastStore.show(`音效載入失敗：${msg}`, 'error');
      }
    });
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

  async startStory(story: StoryDef): Promise<void> {
    const r = await this.#serialize(async () => {
      await this.ensureInitialized();
      if (this.mode === 'mix') {
        await audioEngine.stopAll(0.6);
        this.tracks = {};
      } else if (this.mode === 'story') {
        await this.#leaveStorySync(0.6);
      }

      this.mode = 'story';
      this.currentStory = story;
      this.currentIndex = 0;
      this.currentSegment = story.segments[0] ?? null;
      void recentsRepo.push('story', story.id).catch(() => { /* ignore */ });

      const runner = new StoryRunner();
      this.runner = runner;
      runner.on(async (e) => {
        if (e.type === 'segment-start') {
          this.currentIndex = e.index;
          this.currentSegment = e.segment;
          try {
            if (e.index === 0) {
              await audioEngine.playTrack(e.segment.soundId, e.segment.volume, 2);
            } else {
              await audioEngine.crossfadeTo(e.segment.soundId, e.segment.volume, e.segment.crossfadeSec);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : '夜讀載入失敗';
            toastStore.show(`夜讀載入失敗：${msg}`, 'error');
            runner.cancel();
          }
        } else if (e.type === 'story-end') {
          // 同步清狀態，避免 await startStory 後 state 仍是 'story' 的 race
          this.currentStory = null;
          this.currentSegment = null;
          this.currentIndex = 0;
          this.runner = null;
          this.mode = 'idle';
          void audioEngine.stopAll(2);
        }
        // 'cancelled' 由呼叫 cancel 的人負責清理（toggleSound / stopStory / stopAll）
      });
      return runner;
    });
    await r.run(story.segments);
  }

  async stopStory(): Promise<void> {
    await this.#serialize(async () => {
      if (this.mode !== 'story') return;
      await this.#leaveStorySync(2);
    });
  }

  async stopAll(fadeOutSec = 0.5) {
    await this.#serialize(async () => {
      try {
        this.runner?.cancel();
        await audioEngine.stopAll(fadeOutSec);
      } finally {
        this.tracks = {};
        this.currentStory = null;
        this.currentSegment = null;
        this.currentIndex = 0;
        this.runner = null;
        this.mode = 'idle';
      }
    });
  }

  async preview(soundId: string, durationSec: number, volume = 0.7): Promise<void> {
    try {
      await this.ensureInitialized();
      await audioEngine.previewOnce(soundId, durationSec, volume);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '試聽失敗';
      toastStore.show(`試聽失敗：${msg}`, 'error');
    }
  }

  async #leaveStorySync(fadeSec: number) {
    this.runner?.cancel();
    await audioEngine.stopAll(fadeSec);
    this.currentStory = null;
    this.currentSegment = null;
    this.currentIndex = 0;
    this.runner = null;
    this.mode = 'idle';
  }

  async #serialize<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.busy;
    let resolveDone!: (v: T) => void;
    let rejectDone!: (e: unknown) => void;
    const done = new Promise<T>((res, rej) => { resolveDone = res; rejectDone = rej; });
    this.busy = done;
    if (prev) { try { await prev; } catch { /* prev 失敗不影響後續排隊任務 */ } }
    try {
      const v = await fn();
      resolveDone(v);
      return v;
    } catch (e) {
      rejectDone(e);
      throw e;
    } finally {
      if (this.busy === done) this.busy = null;
    }
  }
}

export const audioStore = new AudioStore();
```

說明：
- `#leaveStorySync` / `#serialize` 是 private（`#` 私有欄位語法）
- `#serialize` 把 `toggleSound / startStory(setup 段) / stopStory / stopAll` 序列化，避免 fade 期間使用者連點造成 race。**注意 startStory 的 `await r.run(...)` 在 serialize 外面**，否則 lock 會被故事整段持有導致 stopStory/stopAll 死鎖。
- listener 的 `cancelled` 不做事，由呼叫 cancel 的方法（`#leaveStorySync` 在 `toggleSound / stopStory / stopAll / startStory` 內）負責清狀態；`story-end` 則同步清狀態 + 非同步 fade，這樣 `await startStory()` resolve 後 state 已是 'idle'，方便測試與 PlayerBar 觀察。
- `setVolume` 在 mode === 'mix' 才有意義；story mode 下 `tracks` 為空，呼叫 `setVolume` 是 no-op，符合不變量

- [ ] **Step 4: 跑 audioStore 測試確認通過**

Run: `pnpm test:run tests/stores/audioStore.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 跑既有測試確認沒有 regression**

Run: `pnpm test:run`
Expected: 全部 PASS（AudioEngine + audioStore + 其他既有測試）

- [ ] **Step 6: typecheck**

Run: `pnpm check`
Expected: 無錯誤（注意：storyStore 此時仍在，仍會直接呼叫 `audioEngine.*`，typecheck 應該還是過）

- [ ] **Step 7: Commit**

```bash
git add src/lib/stores/audioStore.svelte.ts tests/stores/audioStore.test.ts
git commit -m "feat(store): audioStore 吸收 story state 與 preview，引入 mode 互斥"
```

---

### Task 3: storyStore 改為 delegating shim

**Files:**
- Modify: `src/lib/stores/storyStore.svelte.ts`

說明：把 storyStore 改成純委派層，所有 state/方法都路由到 audioStore。consumer 不需改動就能拿到正確行為，bug 在本 task 完成後即修復。

- [ ] **Step 1: 把 `src/lib/stores/storyStore.svelte.ts` 整個檔案改為**

```ts
import { audioStore } from './audioStore.svelte';
import type { StoryDef } from '../story/types';

class StoryStore {
  get current() { return audioStore.currentStory; }
  get currentSegment() { return audioStore.currentSegment; }
  get currentIndex() { return audioStore.currentIndex; }
  get isPlaying() { return audioStore.mode === 'story'; }

  async start(story: StoryDef): Promise<void> {
    await audioStore.startStory(story);
  }

  stop(): void {
    void audioStore.stopStory();
  }
}

export const storyStore = new StoryStore();
```

- [ ] **Step 2: typecheck**

Run: `pnpm check`
Expected: 無錯誤

- [ ] **Step 3: 跑全測試**

Run: `pnpm test:run`
Expected: 全部 PASS

- [ ] **Step 4: 手動冒煙驗證（dev server）**

```bash
pnpm dev
```

打開 http://localhost:5173，跑這個快速 checklist：
- 開混音兩條音 → 進夜讀 → Mixer 卡片應該全暗，只剩夜讀聲
- 夜讀進行中按 PlayerBar 停止 → 全停、PlayerBar 消失

PASS 才繼續下一步。

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/storyStore.svelte.ts
git commit -m "refactor(store): storyStore 改為 audioStore 的委派 shim"
```

---

### Task 4: PlayerBar 直連 audioStore

**Files:**
- Modify: `src/components/PlayerBar.svelte`

說明：移除 `storyStore` import，改讀 `audioStore.mode / currentStory / currentIndex`。停止按鈕只呼一次 `audioStore.stopAll(0.8)`（不再二段式）。

- [ ] **Step 1: 編輯 `src/components/PlayerBar.svelte`**

把 `<script lang="ts">` 開頭兩行：

```svelte
  import { audioStore } from '../lib/stores/audioStore.svelte';
  import { storyStore } from '../lib/stores/storyStore.svelte';
```

改為：

```svelte
  import { audioStore } from '../lib/stores/audioStore.svelte';
```

把 line 10：

```svelte
  let visible = $derived(audioStore.isPlaying || storyStore.isPlaying);
```

改為：

```svelte
  let visible = $derived(audioStore.isPlaying);
```

把 line 12-17 的 `label` derived：

```svelte
  let label = $derived.by(() => {
    if (storyStore.current) return storyStore.current.nameKey;
    const ids = Object.keys(audioStore.tracks);
    if (ids.length === 0) return '尚未播放';
    return ids.map((id) => getSoundById(id)?.nameKey ?? id).join(' · ');
  });
```

改為：

```svelte
  let label = $derived.by(() => {
    if (audioStore.currentStory) return audioStore.currentStory.nameKey;
    const ids = Object.keys(audioStore.tracks);
    if (ids.length === 0) return '尚未播放';
    return ids.map((id) => getSoundById(id)?.nameKey ?? id).join(' · ');
  });
```

把 line 19-24 的 `sub` derived：

```svelte
  let sub = $derived.by(() => {
    if (storyStore.current) return `第 ${storyStore.currentIndex + 1} 段 · 夜讀配樂`;
    const n = Object.keys(audioStore.tracks).length;
    if (n === 0) return '從首頁挑一個聲音開始';
    return `${n} 軌混音`;
  });
```

改為：

```svelte
  let sub = $derived.by(() => {
    if (audioStore.currentStory) return `第 ${audioStore.currentIndex + 1} 段 · 夜讀配樂`;
    const n = Object.keys(audioStore.tracks).length;
    if (n === 0) return '從首頁挑一個聲音開始';
    return `${n} 軌混音`;
  });
```

把 line 40-44 的 `stopAll`：

```svelte
  async function stopAll() {
    storyStore.stop();
    await audioStore.stopAll(0.8);
    elapsed = 0;
  }
```

改為：

```svelte
  async function stopAll() {
    await audioStore.stopAll(0.8);
    elapsed = 0;
  }
```

- [ ] **Step 2: typecheck**

Run: `pnpm check`
Expected: 無錯誤

- [ ] **Step 3: Commit**

```bash
git add src/components/PlayerBar.svelte
git commit -m "refactor(player-bar): 直接讀 audioStore，移除 storyStore 依賴"
```

---

### Task 5: StoryPlayer 直連 audioStore

**Files:**
- Modify: `src/routes/StoryPlayer.svelte`

- [ ] **Step 1: 編輯 `src/routes/StoryPlayer.svelte`**

把 line 2：

```svelte
  import { storyStore } from '../lib/stores/storyStore.svelte';
```

改為：

```svelte
  import { audioStore } from '../lib/stores/audioStore.svelte';
```

把 line 14-17：

```svelte
  $effect(() => {
    void storyStore.start(story);
    return () => storyStore.stop();
  });
```

改為：

```svelte
  $effect(() => {
    void audioStore.startStory(story);
    return () => { void audioStore.stopStory(); };
  });
```

把 line 19-22：

```svelte
  function stopAndClose() {
    storyStore.stop();
    onClose();
  }
```

改為：

```svelte
  function stopAndClose() {
    void audioStore.stopStory();
    onClose();
  }
```

把 line 24-25：

```svelte
  let seg = $derived(storyStore.currentSegment);
  let idx = $derived(storyStore.currentIndex);
```

改為：

```svelte
  let seg = $derived(audioStore.currentSegment);
  let idx = $derived(audioStore.currentIndex);
```

- [ ] **Step 2: typecheck**

Run: `pnpm check`
Expected: 無錯誤

- [ ] **Step 3: Commit**

```bash
git add src/routes/StoryPlayer.svelte
git commit -m "refactor(story-player): 直接呼 audioStore.startStory"
```

---

### Task 6: StoryEditor 改用 audioStore.preview

**Files:**
- Modify: `src/routes/StoryEditor.svelte`

- [ ] **Step 1: 編輯 `src/routes/StoryEditor.svelte`**

把 line 3：

```svelte
  import { audioEngine } from '../lib/audio/AudioEngine';
```

改為：

```svelte
  import { audioStore } from '../lib/stores/audioStore.svelte';
```

把 line 46-50：

```svelte
  async function preview(soundId: string) {
    await audioEngine.initialize();
    await audioEngine.playTrack(soundId, 0.7);
    setTimeout(() => { void audioEngine.stopTrack(soundId, 1); }, 5000);
  }
```

改為：

```svelte
  async function preview(soundId: string) {
    await audioStore.preview(soundId, 5, 0.7);
  }
```

- [ ] **Step 2: typecheck**

Run: `pnpm check`
Expected: 無錯誤

- [ ] **Step 3: 手動驗證 preview 不打斷夜讀**

```bash
pnpm dev
```

- 進入夜讀某故事 → 等到第二段（音樂穩定）
- 打開「新增自訂夜讀」（從首頁或我的頁的入口）
- 點任一段「試聽 5s」→ 預期：夜讀繼續播、試聽音重疊播 5 秒、5 秒後試聽自動結束、夜讀仍在播

PASS 才繼續。

- [ ] **Step 4: Commit**

```bash
git add src/routes/StoryEditor.svelte
git commit -m "refactor(story-editor): 試聽改走 audioStore.preview 獨立 channel"
```

---

### Task 7: timerStore 移除 storyStore 依賴

**Files:**
- Modify: `src/lib/stores/timerStore.svelte.ts`

- [ ] **Step 1: 編輯 `src/lib/stores/timerStore.svelte.ts`**

把 line 1-3：

```ts
import { audioEngine } from '../audio/AudioEngine';
import { audioStore } from './audioStore.svelte';
import { storyStore } from './storyStore.svelte';
```

改為：

```ts
import { audioEngine } from '../audio/AudioEngine';
import { audioStore } from './audioStore.svelte';
```

把 line 18-21：

```ts
      stopAll: () => {
        storyStore.stop();
        void audioStore.stopAll(0);
      }
```

改為：

```ts
      stopAll: () => {
        void audioStore.stopAll(0);
      }
```

- [ ] **Step 2: typecheck**

Run: `pnpm check`
Expected: 無錯誤

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/timerStore.svelte.ts
git commit -m "refactor(timer): 移除 storyStore 依賴，audioStore.stopAll 已含 story 清理"
```

---

### Task 8: 刪除 storyStore.svelte.ts + 最終驗證

**Files:**
- Delete: `src/lib/stores/storyStore.svelte.ts`

- [ ] **Step 1: 確認沒有任何檔案還在 import storyStore**

Run: `grep -rn "storyStore" src tests`
Expected: 沒有任何輸出（或只有歷史 commit message 之類無關內容）

如果還有輸出，回頭把對應檔案改掉再回來。

- [ ] **Step 2: 刪除檔案**

```bash
rm src/lib/stores/storyStore.svelte.ts
```

- [ ] **Step 3: typecheck**

Run: `pnpm check`
Expected: 無錯誤

- [ ] **Step 4: 跑全測試**

Run: `pnpm test:run`
Expected: 全部 PASS

- [ ] **Step 5: 完整手動驗證 checklist（dev server）**

```bash
pnpm dev
```

逐項驗證（每項都要實際操作確認）：

- [ ] 開混音兩條音 → PlayerBar 顯示「N 軌混音」、Mixer 卡片亮
- [ ] 在混音中進入夜讀某故事 → PlayerBar 切換為夜讀標題、Mixer 卡片全暗、只剩夜讀聲
- [ ] 夜讀進行中切回混音頁點一張卡 → 夜讀停、PlayerBar 切回 mix、StoryPlayer 退出
- [ ] 夜讀進行中開「新增自訂夜讀」點試聽 → 夜讀不中斷、5 秒後試聽自動結束、夜讀仍在播
- [ ] 夜讀進行中按 PlayerBar 停止鈕 → 全停、PlayerBar 消失
- [ ] 開計時器（短秒數）→ 不論在 mix 或 story 模式都完整淡出、UI 清乾淨
- [ ] 我的頁載入一組混音 preset，且當下在夜讀中 → 夜讀停、新 mix 起來

若任何項目失敗，回頭排查；全 PASS 才提交。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(store): 刪除 storyStore，整合完成"
```

---

## 驗證總結（plan 完成判準）

- `pnpm check` 無錯誤
- `pnpm test:run` 全 PASS
- `grep -rn "storyStore" src tests` 無輸出
- Task 8 Step 5 的手動 checklist 全 PASS
- `src/routes/Library.svelte`、`src/routes/Mixer.svelte`、`src/components/SoundCard.svelte` 三個檔案未修改（驗證 state shape 對它們透明）
