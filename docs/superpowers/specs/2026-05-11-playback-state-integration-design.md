# 播放狀態整合設計（audioStore / storyStore → 單一 audioStore）

日期：2026-05-11
範圍：`src/lib/stores/audioStore.svelte.ts`、`src/lib/stores/storyStore.svelte.ts`、`src/lib/audio/AudioEngine.ts` 以及其所有 consumer。

## 動機

當下有兩套播放狀態，且兩者沒有同步：

- **真實音訊狀態**：`AudioEngine` 內的 `tracks: Map<string, ActiveTrack>`
- **UI 認知狀態**：`audioStore.tracks: Record<string, TrackState>`

`storyStore` 直接呼叫 `audioEngine.playTrack / crossfadeTo / stopAll`，而沒有同步 `audioStore.tracks`。具體缺陷：

1. 混音播放中切換到夜讀 → `crossfadeTo` 在第二段把 mix tracks 殺掉，但 `audioStore.tracks` 仍顯示在播。
2. 夜讀結束 → engine 已空，`audioStore.tracks` 可能仍非空（取決於切換時序）。
3. `StoryEditor` 5 秒試聽繞過 audioStore，可能停掉正在播的同 id 音效。
4. `Library` 載入 mix preset 時不會停夜讀。
5. `PlayerBar` 停止鈕為了保險同時呼 `storyStore.stop()` 和 `audioStore.stopAll()`，反映了兩份狀態的味道。
6. `timerStore` 直接呼叫 `audioEngine.masterFadeOut`，再分別清兩個 store。

## 設計決策（已確認）

- **Mix 與 Story 互斥**：同一時刻只能是 `idle / mix / story` 其中之一。
- **Preview 走獨立 channel**：StoryEditor 5 秒試聽不影響主播放狀態。
- **整合到單一 store**：保留 `audioStore` 名稱，刪除 `storyStore`。互斥規則寫在 store 的進入點。
- **AudioEngine 仍是執行器**：但對外暴露面收斂，UI / routes 不再直連（除 `timerStore` 的 `masterFadeOut`）。

## §1 audioStore state shape

```ts
class AudioStore {
  initialized:    boolean
  masterVolume:   number

  mode:           'idle' | 'mix' | 'story'   // 新增
  tracks:         Record<string, TrackState> // mix 模式下的 tracks

  currentStory:   StoryDef | null            // 從 storyStore 搬入
  currentSegment: StorySegment | null
  currentIndex:   number
  private runner: StoryRunner | null

  isPlaying = $derived(this.mode !== 'idle')
}
```

不變量（任何 public method 結束後必須成立）：

1. `mode === 'idle'` ⟺ engine 沒有任何 main track 在播 ⟺ `tracks` 為空 ⟺ `currentStory === null`
2. `mode === 'mix'` ⟺ `tracks` 非空 ⟺ `currentStory === null`
3. `mode === 'story'` ⟺ `currentStory !== null` ⟺ `tracks` 為空

不變量 3 是關鍵：story 開始時清空 `tracks`，UI（SoundCard、Mixer 卡片）即自動反映沒有 mix track 在播。

Preview 不在 state 中：fire-and-forget 副效應，不影響 `mode` / `tracks`，UI 不顯示 preview 狀態。

## §2 API surface

```ts
class AudioStore {
  // Mix
  async toggleSound(soundId: string, volume?: number): Promise<void>
  setVolume(soundId: string, volume: number): void
  setMasterVolume(volume: number): void

  // Story
  async startStory(story: StoryDef): Promise<void>
  stopStory(): void                                          // 取消 runner

  // 共用
  async stopAll(fadeOutSec?: number): Promise<void>          // 不論 mode 清乾淨
  async ensureInitialized(): Promise<void>

  // Preview（獨立 channel）
  async preview(soundId: string, durationSec: number, volume?: number): Promise<void>
}
```

互斥規則寫在進入點：

```ts
async toggleSound(id, vol = 0.7) {
  await this.ensureInitialized()
  if (this.mode === 'story') await this.#leaveStory(0.6)
  // …原有 toggle 邏輯
  this.mode = Object.keys(this.tracks).length > 0 ? 'mix' : 'idle'
}

async startStory(story) {
  await this.ensureInitialized()
  if (this.mode === 'mix') {
    await audioEngine.stopAll(0.8)
    this.tracks = {}
  }
  this.mode = 'story'
  this.currentStory = story
  this.currentIndex = 0
  this.currentSegment = story.segments[0] ?? null
  this.runner = new StoryRunner()
  this.runner.on(async (e) => { /* segment-start / story-end / cancelled — 失敗時 leaveStory */ })
  await this.runner.run(story.segments)
}

stopStory() { this.runner?.cancel() }

async #leaveStory(fadeSec) {
  this.runner?.cancel()
  await audioEngine.stopAll(fadeSec)
  this.currentStory = null
  this.currentSegment = null
  this.currentIndex = 0
  this.runner = null
  this.mode = 'idle'
}
```

`stopAll` 不論 mode 都先 `runner?.cancel()` + `audioEngine.stopAll(fade)` + 清所有 state，PlayerBar 不再需要兩段式停止。

## §3 AudioEngine：preview channel

```ts
class AudioEngine {
  private readonly tracks       = new Map<string, ActiveTrack>()  // main 不變
  private previewTrack:           ActiveTrack | null = null       // 新增：單一 slot

  async previewOnce(soundId, durationSec, volume): Promise<void> {
    await this.stopPreview(0.1)
    const def = getSoundById(soundId); if (!def) throw new Error(...)
    const track = await this.createTrack(def)
    this.previewTrack = track
    track.source.volume.value = MIN_DB
    track.source.start()
    rampVolume(track.source, volume, 0.3)
    setTimeout(() => { void this.stopPreview(1) }, durationSec * 1000)
  }

  async stopPreview(fadeOutSec = 0.3): Promise<void> {
    const t = this.previewTrack
    if (!t) return
    this.previewTrack = null
    if (fadeOutSec > 0) {
      rampVolume(t.source, 0, fadeOutSec)
      await new Promise((r) => setTimeout(r, fadeOutSec * 1000))
    }
    t.source.stop(); t.source.dispose()
  }
}
```

獨立 slot 而非進 `tracks` Map 的理由：

- `crossfadeTo` 的 previousIds 邏輯會把同 id 的 preview track 當舊 track 殺掉。
- preview 不該被 `stopAll / crossfadeTo / masterFadeOut` 影響。
- 同一 soundId 可能同時出現在 main 與 preview 兩條路徑。

`crossfadeTo` / `stopAll` / `masterFadeOut` 只走 `this.tracks`，無需改動。

API 收斂用 lint rule（或 grep 巡邏）限制 `audioEngine` import 只允許出現在 `audioStore.svelte.ts` 和 `timerStore.svelte.ts`，不重寫 visibility。

## §4 Consumer 遷移對照

| 檔案 | 改動 |
|---|---|
| `src/lib/stores/storyStore.svelte.ts` | 刪除 |
| `src/lib/stores/audioStore.svelte.ts` | 擴張：吸收 story state、加 mode、加 `startStory/stopStory/preview` |
| `src/lib/audio/AudioEngine.ts` | 加 `previewOnce/stopPreview` 與 `previewTrack` |
| `src/lib/stores/timerStore.svelte.ts` | 移除 `storyStore` import；只呼 `audioStore.stopAll(0)` |
| `src/components/PlayerBar.svelte` | 只 import `audioStore`；改讀 `mode / currentStory / currentIndex`；停止鈕只呼 `audioStore.stopAll(0.8)` |
| `src/routes/StoryPlayer.svelte` | `storyStore.*` → `audioStore.startStory/stopStory/currentSegment/currentIndex` |
| `src/routes/StoryEditor.svelte` | 試聽改呼 `audioStore.preview(soundId, 5, 0.7)`；移除 `audioEngine` import |
| `src/routes/Library.svelte` | 不用改（`toggleSound` 已含離開 story 邏輯） |
| `src/routes/Mixer.svelte` | 不用改（state shape 對它透明） |
| `src/components/SoundCard.svelte` | 不用改 |

邊界案例驗證：

1. Mix → Story：`startStory` fade out mix、清 `tracks`、進 `story`，SoundCard 自動全暗。
2. Story → Mix：`toggleSound` 觸發 `#leaveStory`，取消 runner、清 story state、進 `mix`。
3. Story 中 preview：走獨立 channel，story 不中斷。
4. Story 中載入 Library preset：`stopAll` + 後續 toggle 系列序列正確。
5. Sleep timer 到點：`masterFadeOut` + `audioStore.stopAll(0)`。

## §5 錯誤處理與測試

**錯誤處理**

- `startStory` 內 segment-start handler 包 try/catch，engine 失敗則 `runner.cancel()`，cancelled 事件走標準 `#leaveStory(0)`。
- `toggleSound` 沿用既有 try/catch + toast；收尾以 `tracks.length` 重新計算 mode。
- `preview` 失敗 toast，不影響 mode / tracks。
- `stopAll` finally 區塊保證 state 清空，即使 engine 例外。
- **互斥切換的併發**：`#leaveStory(0.6)` / `engine.stopAll(0.8)` 期間使用者可能連點。`toggleSound` / `startStory` 加 `busy` flag（單一 in-flight）— 第二個 call 排隊在前一個 await 完成後執行；不引入 cancel 邏輯避免新狀態被舊 fade 蓋掉。

**單元測試**（新增 `src/lib/stores/audioStore.test.ts`）

先確認 vitest 設定能否 mock Tone.js；若無，用 `vi.mock('../audio/AudioEngine', ...)` 注入 fake engine。

測試矩陣：

1. idle → toggleSound → `mode === 'mix'`、tracks 有該 id
2. mix（兩 track）→ startStory → engine.stopAll 一次、tracks 清空、`mode === 'story'`、currentStory 正確
3. story 中 → toggleSound → runner.cancel + engine.stopAll、`mode === 'mix'`、currentStory 為 null
4. story 中 → preview → engine.previewOnce 呼叫、mode 仍 'story'
5. story 跑完 → `mode === 'idle'`、currentStory null
6. story 中 → stopStory → `mode === 'idle'`
7. mix 單 track → toggleSound 同 id → `mode === 'idle'`
8. story 中 segment-start 拋錯 → `mode === 'idle'`、currentStory null

**手動驗證 checklist**（dev server 跑一遍）

- [ ] 開混音兩條音 → 進夜讀 → PlayerBar 切夜讀標題、Mixer 卡片全暗、僅夜讀聲
- [ ] 夜讀中切混音點卡 → 夜讀停、PlayerBar 切 mix
- [ ] 夜讀中 StoryEditor 試聽不同音效 → 夜讀不中斷、5 秒自動結束
- [ ] 夜讀中按 PlayerBar 停止 → 全停、PlayerBar 消失
- [ ] Sleep timer 到點 → 不論模式都完整淡出
- [ ] Library 在夜讀進行中載 preset → 夜讀停、新 mix 起來

不寫 e2e：範圍不值得 Playwright（audio context 啟動成本高），手動 checklist 在 dev server 跑一遍即可。
