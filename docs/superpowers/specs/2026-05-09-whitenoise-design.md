# 白噪音與睡眠 App — 設計規格

**版本：** 1.0
**日期：** 2026-05-09
**狀態：** Draft，待使用者 review

---

## 1. 產品概述

一款專為助眠、放鬆、專注設計的純前端 PWA 白噪音應用。簡約深色介面，所有資料留在使用者瀏覽器，無後端、無帳號。

### 1.1 核心價值

不只是音效播放器，而是透過「故事模式」串接多個自然音效，搭配詩意文案，帶來沉浸式放鬆體驗。

### 1.2 目標使用者

- 想睡前放鬆的人
- 需要專注背景音的工作者
- 願意自行創作放鬆旅程的使用者

### 1.3 平台

**網頁 / PWA**（可在桌面與手機瀏覽器執行，可加到主畫面，可離線）。

---

## 2. 功能需求（MVP）

### 2.1 核心功能（使用者描述）

1. **8 種自然白噪音** — 海浪、雨聲、壁爐、風聲、鳥鳴、溪流、雷聲、白噪音
2. **故事模式** — 預設 3-5 個內建故事（如「海邊漫步」），按時間軸自動串接音效並 crossfade，搭配詩意文案
3. **自訂故事** — 使用者可建立/編輯/儲存自己的故事

### 2.2 補充 MVP 功能（使用者勾選）

4. **睡眠定時器** — N 分鐘後自動漸弱關閉
5. **多軌道混音** — 同時播放多個音效，各自獨立音量
6. **收藏 + 最近播放**
7. **PWA** — 可安裝、可離線、音檔快取

### 2.3 觸發方式

- 故事模式：**按時間自動流動**（不需使用者互動）
- 多軌道混音：使用者拖滑桿即時調整

---

## 3. 非功能需求（Non-Goals）

明確不做的事，避免 scope creep：

- 後端 / 帳號系統
- 跨裝置同步
- iOS Safari 實機驗證（先測網頁版即可）
- Native iOS / Android App
- E2E 自動化測試
- Media Session API（鎖屏控制）
- 多語系 i18n（架構預留 hook，但 MVP 只做繁體中文）
- 進階音效（呼吸引導、節拍器、ASMR）
- 商店化 / IAP / 訂閱

---

## 4. 技術選型

### 4.1 執行環境

| 項目 | 版本 | 理由 |
|---|---|---|
| **Node.js** | **24 LTS（Krypton）** | 開發 + Docker build 統一用 LTS |
| pnpm | 最新 | disk 友善、Linux 順 |
| 瀏覽器 | Chromium / Firefox 近兩年版本 | Web Audio API、IndexedDB、Service Worker 全支援 |

`package.json` 鎖定：
```json
{
  "engines": {
    "node": ">=24.0.0"
  },
  "packageManager": "pnpm@10.0.0"
}
```

### 4.2 套件清單

| 項目 | 選擇 | 版本 | 理由 |
|---|---|---|---|
| 語言 | TypeScript | 6.0.3 | 嚴格型別，減少跨 session 資料 bug |
| 框架 | Svelte | 5.55.5 | Runes 語法、bundle 小、反應式適合多 state UI |
| 建置工具 | Vite | 8.0.11 | 開發體驗好、PWA plugin 完整 |
| PWA 工具 | vite-plugin-pwa | 1.3.0 | service worker 設定簡化 |
| 音訊引擎 | Tone.js | 15.1.22 | 活躍維護、`Tone.Player` 支援 loop/crossfade |
| IndexedDB 包裝 | idb | 8.0.3 | Promise 化原生 API |
| 測試 | Vitest | 4.1.5 | 配 Vite 最順 |
| 元件測試 | @testing-library/svelte | 5.3.1 | Svelte 5 相容 |
| IndexedDB 測試 | fake-indexeddb | 6.2.5 | 單元測試環境用 |

### 4.3 tsconfig 重點設定

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

---

## 5. 系統架構

### 5.1 高階架構

```
┌─────────────────────────────────────────────────────┐
│                  Browser (PWA)                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  UI Layer (Svelte 5 components)               │  │
│  │  - 4 routes: 首頁/混音/故事/我的               │  │
│  └────────────────┬──────────────────────────────┘  │
│                   │                                  │
│  ┌────────────────▼──────────────────────────────┐  │
│  │  State Layer (Svelte 5 runes)                 │  │
│  │  - audioStore  - storyStore  - timerStore     │  │
│  └────────────────┬──────────────────────────────┘  │
│                   │                                  │
│  ┌────────────────▼──────────────────────────────┐  │
│  │  Domain Layer                                 │  │
│  │  ├ AudioEngine  (Tone.js wrapper, 唯一進出口) │  │
│  │  ├ StoryRunner  (時間軸調度，不知道 Tone.js)   │  │
│  │  ├ SleepTimer   (倒數 + 漸弱)                  │  │
│  │  ├ NoiseGenerator (程式合成噪音)               │  │
│  │  └ *Repo        (IndexedDB CRUD)              │  │
│  └────────────────┬──────────────────────────────┘  │
│                   │                                  │
│  ┌────────────────▼──────────────────────────────┐  │
│  │  Persistence                                  │  │
│  │  ├ IndexedDB  (自訂故事、收藏、混音、設定)     │  │
│  │  ├ Cache API  (音檔離線快取，via SW)          │  │
│  │  └ Static assets  (8 音檔 + 5 故事 JSON)      │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 5.2 三個關鍵分層原則

1. **UI 不直接呼叫 Tone.js** — UI 只跟 stores 互動，stores 才呼 AudioEngine。UI 可單純測試（mock store 即可）
2. **StoryRunner 跟 AudioEngine 解耦** — StoryRunner 只發出 `onSegmentChange(soundId, fadeMs)` 事件，由 store 接起來再呼叫 AudioEngine。換句話說 StoryRunner 不知道 Tone.js 存在。可用假時鐘做測試
3. **音檔走 Cache API、不走 IndexedDB** — service worker 攔截音檔請求做快取（PWA 標準做法）。IndexedDB 只放使用者結構化資料

### 5.3 模組邊界規則

- **`src/lib/audio/` 是 Tone.js 唯一接觸點。** 其他資料夾禁止 `import 'tone'`。換掉 Tone.js 只需動這個資料夾
- **每個 Repo 管一張 IndexedDB table。** `StoryRepo` / `FavoritesRepo` / `MixRepo` / `SettingsRepo` / `RecentsRepo` 各自獨立。未來加 `AuthRepo` 不會撞到別人

### 5.4 Routing

只有 4 個 route，**不導入 router 套件**。用 Svelte 5 `$state` 在 `App.svelte` 維護目前 route id（`'home' | 'mixer' | 'stories' | 'library'`），用 `{#if}` 切換對應元件。`StoryPlayer` 跟 `StoryEditor` 視為 `Stories` 的子狀態，不獨立成 route。

未來若需要 deep link，再考慮加 `svelte-spa-router` 或自寫 hash 監聽。

---

## 6. 檔案結構

```
whitenoise/
├── public/
│   ├── audio/                       # 7 個音檔（白噪音為程式合成）
│   │   ├── ocean.mp3
│   │   ├── rain.mp3
│   │   ├── fireplace.mp3
│   │   ├── wind.mp3
│   │   ├── birds.mp3
│   │   ├── stream.mp3
│   │   └── thunder.mp3
│   ├── stories/                     # 5 個內建故事 JSON
│   │   ├── seaside-walk.json
│   │   ├── rainy-fireplace.json
│   │   ├── forest-spa.json
│   │   ├── mountain-stream.json
│   │   └── summer-thunder.json
│   └── icons/                       # PWA icons (192, 512, maskable)
│
├── src/
│   ├── lib/
│   │   ├── audio/
│   │   │   ├── AudioEngine.ts       # Tone.js 包裝層（單例）
│   │   │   ├── NoiseGenerator.ts    # Tone.Noise 包裝
│   │   │   ├── builtinSounds.ts     # 8 個 SoundDef
│   │   │   └── types.ts
│   │   ├── story/
│   │   │   ├── StoryRunner.ts       # 時間軸調度
│   │   │   ├── builtinStories.ts    # 載入內建 JSON
│   │   │   └── types.ts
│   │   ├── timer/
│   │   │   └── SleepTimer.ts        # 倒數 + 漸弱停止
│   │   ├── storage/
│   │   │   ├── db.ts                # IndexedDB schema 定義
│   │   │   ├── StoryRepo.ts
│   │   │   ├── FavoritesRepo.ts
│   │   │   ├── MixRepo.ts
│   │   │   ├── RecentsRepo.ts
│   │   │   └── SettingsRepo.ts
│   │   └── stores/
│   │       ├── audioStore.svelte.ts
│   │       ├── storyStore.svelte.ts
│   │       └── timerStore.svelte.ts
│   │
│   ├── routes/
│   │   ├── Home.svelte              # 8 個音效卡片
│   │   ├── Mixer.svelte             # 多軌道滑桿
│   │   ├── Stories.svelte           # 故事列表（內建+自訂）
│   │   ├── StoryPlayer.svelte       # 故事播放畫面
│   │   ├── StoryEditor.svelte       # 自訂故事編輯
│   │   └── Library.svelte           # 收藏 / 最近
│   │
│   ├── components/
│   │   ├── PlayerBar.svelte         # 底部全域播放列
│   │   ├── SoundCard.svelte
│   │   ├── VolumeSlider.svelte
│   │   ├── TimerDial.svelte
│   │   ├── PoeticText.svelte        # 故事文案淡入淡出
│   │   └── Toast.svelte             # 錯誤/通知
│   │
│   ├── App.svelte
│   └── main.ts
│
├── tests/
│   ├── audio/AudioEngine.test.ts
│   ├── story/StoryRunner.test.ts
│   ├── timer/SleepTimer.test.ts
│   └── storage/StoryRepo.test.ts
│
├── vite.config.ts
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
├── Dockerfile                       # 多階段：node:24-alpine build → nginx:alpine
├── .dockerignore
├── docker-compose.yml               # 本機/單機部署用
├── nginx.conf                       # SPA fallback + 音檔/PWA 快取 header
├── .nvmrc                           # Node 24
└── README.md
```

---

## 7. 資料模型

### 7.1 靜態資料（隨 App 打包）

```typescript
// 8 個音效定義（src/lib/audio/builtinSounds.ts）
interface SoundDef {
  id: string;                  // 'ocean' | 'rain' | 'fireplace' | ...
  nameKey: string;             // i18n key（MVP 直接做為顯示文字）
  type: 'file' | 'synth';      // 檔案或程式合成
  src?: string;                // type='file' 時用
  loopPoint?: {
    start: number;
    end: number;
  };
  iconKey: string;
}

// 內建故事 JSON 結構（public/stories/*.json）
interface StoryDef {
  id: string;                  // 'seaside-walk'
  nameKey: string;
  description: string;
  builtin: true;
  segments: StorySegment[];
  totalDurationSec: number;    // 計算出來的總長
}
```

### 7.2 使用者資料（IndexedDB）

開一個 DB 名稱 `whitenoise-app`，5 個 object stores：

```typescript
// store: customStories
interface CustomStory {
  id: string;                  // uuid
  name: string;
  segments: StorySegment[];
  createdAt: number;
  updatedAt: number;
}

// 內建/自訂共用 segment 結構
interface StorySegment {
  soundId: string;             // 對應 SoundDef.id
  durationSec: number;         // 這段播多久
  crossfadeSec: number;        // 跟下一段的交叉淡化時間（最後一段為 0）
  poeticText?: string;         // 詩意文案
  volume: number;              // 0.0–1.0，這段音量
}

// store: favorites
interface Favorite {
  id: string;                  // uuid
  type: 'sound' | 'mix' | 'story';
  refId: string;
  addedAt: number;
}

// store: mixes
interface Mix {
  id: string;
  name: string;
  tracks: Array<{
    soundId: string;
    volume: number;
  }>;
  createdAt: number;
}

// store: recents
interface RecentEntry {
  id: string;
  type: 'sound' | 'mix' | 'story';
  refId: string;
  playedAt: number;
}
// 寫入時自動截斷只留最近 20 筆

// store: settings (K-V style)
interface Settings {
  defaultTimerMin?: number;
  fadeOutOnTimerSec: number;   // 預設 30
  masterVolume: number;        // 0.0–1.0，預設 0.7
}
```

### 7.3 為什麼 mix 跟 story 拆開？

雖然「同時播海浪+雨聲」也可以用單段 Story 表達，但兩者**心智模型**不同：
- `Mix` 是「**並聯**」幾個音效，使用者調整滑桿即時生效
- `Story` 是「**串聯**」幾個音效，按時間軸自動推進

UI、資料、互動都不同，分開更清晰。

### 7.4 StorySegment.volume 設計

每段獨立音量，故事可做出「雷聲漸大」這種戲劇張力。預設值 0.7。

---

## 8. 關鍵互動流程

### 8.1 流程 1：點音效卡片開始播放

```
User tap "海浪" card
       │
       ▼
Home.svelte → audioStore.play({ type:'sound', id:'ocean' })
       │
       ▼
audioStore:
  1. (首次) await Tone.start()           ← iOS Safari autoplay 解鎖
  2. AudioEngine.playTrack('ocean', 0.7)
  3. recentsRepo.push(...)
  4. 更新 store 狀態 → UI 反應
       │
       ▼
AudioEngine:
  1. 找出 SoundDef
  2. 檢查 player cache，沒有就 new Tone.Player(src, { loop: true }).toDestination()
  3. player.fadeIn = 1（秒）
  4. await Tone.loaded()
  5. player.start()
```

### 8.2 流程 2：故事模式播放（含 crossfade）

```
User tap "海邊漫步"
       │
       ▼
storyStore.start(storyDef)
       │
       ▼
StoryRunner.run(segments):
  for i, seg in segments:
    emit('segment-start', i, seg)        # UI 顯示 poeticText
    audioEngine.crossfadeTo(
      seg.soundId, seg.volume, seg.crossfadeSec
    )
    await sleep(seg.durationSec * 1000)   # 可被 cancel
  emit('story-end')
```

**Crossfade 策略：** 兩個 `Tone.Player` 並聯到 destination，A 走 `gain.rampTo(0, n)`、B 同時 `gain.rampTo(targetVol, n)` 並 start。淡出完成後釋放 A。

**取消：** StoryRunner 持有 cancellation token。使用者按停止 → 取消 setTimeout → 淡出當前 segment。

### 8.3 流程 3：睡眠定時器

```
User 設定 30 分鐘
       │
       ▼
timerStore.set(30) → SleepTimer.start(30 * 60)
       │
       ▼
SleepTimer:
  this.endAt = Date.now() + 30*60*1000
  setInterval 每秒更新 timerStore.remaining
       │
       ▼
最後 30 秒：
  audioEngine.masterFadeOut(30)
       │
       ▼
0 秒：
  audioEngine.stopAll()
  storyRunner.stop()
  timerStore.clear()
```

**為何用 endAt 而非 remaining？** 切換 tab 時瀏覽器降速 setInterval。用 `endAt - now()` 精準。

### 8.4 流程 4：建立自訂故事

```
StoryEditor.svelte:
  - 加段落 → push 到 local segments[]
  - 每段選音效（dropdown）
  - 每段拖滑桿改 durationSec / crossfadeSec / volume
  - 寫 poeticText
  - 即時試聽（audioEngine.previewTrack(soundId, 5)）
       │
       ▼
按「儲存」：
  storyRepo.save({ id, name, segments, createdAt, updatedAt })
       │
       ▼
回到 Stories.svelte（自訂分類下出現新項目）
```

---

## 9. 邊界情境與錯誤處理

### 9.1 Autoplay policy 與生命週期

| 情境 | 處理方式 |
|---|---|
| iOS Safari 首次播放 | 必須在 click event handler 裡呼叫 `Tone.start()` 解鎖 |
| Tab 進背景 | Web Audio 通常照常播放；setInterval 降速 → 用 `endAt` 規避 |
| 螢幕鎖定 | PWA standalone 模式繼續播 |
| 來電/媒體中斷 | 監聽 `Tone.context.statechange`，狀態轉 `suspended` 時更新 UI |

### 9.2 錯誤處理表

| 錯誤類型 | 處理 |
|---|---|
| 音檔下載失敗 | Toast「`{音效名}` 載入失敗」+ 卡片變灰，可重試 |
| AudioContext 被拒絕 | 「點任一處開始」全螢幕遮罩，捕捉首次 click 後重試 |
| IndexedDB 讀寫失敗（容量爆 / 隱私模式） | Toast「儲存失敗」+ console.error；不擋使用者繼續播放 |
| Tone.js 載入失敗 | 不會發生（隨 bundle）；若發生顯示 fallback 錯誤頁 |
| 自訂故事 segments=0 / duration=0 | UI 層擋住（按鈕 disabled） |
| 不存在的 soundId | AudioEngine 丟 error → store → toast |

**錯誤訊息原則：** 簡短、無術語、可行動。「載入失敗，請檢查網路後重試」而非「Failed to fetch /audio/ocean.mp3」。

---

## 10. 測試策略

### 10.1 單元測試（Vitest，主力）

| 模組 | 測什麼 |
|---|---|
| AudioEngine | mock Tone.js，驗證 `crossfadeTo` 確實呼叫 `rampTo(0, n)` 跟 `rampTo(v, n)`；play / stop / cleanup |
| StoryRunner | `vi.useFakeTimers()` 推進時間，驗證 segment 切換順序、cancellation |
| SleepTimer | fake timer 推到 endAt，驗 fadeOut → stopAll |
| StoryRepo / FavoritesRepo / etc. | 用 `fake-indexeddb` 做真實 CRUD |
| NoiseGenerator | 驗 buffer 長度、loop 行為 |

**目標：domain 層覆蓋率 80%+。**

### 10.2 元件測試（@testing-library/svelte，少數關鍵）

只測狀態複雜的元件：
- StoryEditor — 加減 segment、儲存按鈕 enable/disable
- Mixer — 多軌道滑桿同步到 store
- TimerDial — 設定值正確傳出

純展示元件不測。

### 10.3 不做 E2E

MVP 不導入 Playwright，改用人工驗收清單。

### 10.4 人工驗收清單（每次 release 跑）

- [ ] 8 個音效都能播放、loop 無接縫
- [ ] 多軌道混音 3 個音效，各自滑桿獨立調音量
- [ ] 5 個內建故事都能順跑完，crossfade 不卡頓、文案有顯示
- [ ] 自訂故事建立 → 儲存 → 重整頁面後還在 → 播放
- [ ] 睡眠定時器 30s（測試短時間）正確漸弱停止
- [ ] PWA 安裝、離線狀態下重開 App 還能播放
- [ ] Chrome on Linux + Firefox on Linux 各跑一次

### 10.5 已知風險

**iOS Safari 行為需在實機驗證。** 開發者只有 Linux 環境，iOS Safari 對 Web Audio、autoplay、靜音模式的特殊行為無法本地測。MVP 範圍內接受此限制；未來再以朋友協助/線上服務驗證。

---

## 11. 音檔資源來源（採購計畫）

### 11.1 優先順序

#### CC0（公眾領域，無需署名）
1. **[Pixabay Sounds](https://pixabay.com/sound-effects/)** — 全部免費商用，無署名要求
2. **[BBC Sound Effects Archive](https://sound-effects.bbcrewind.co.uk/)** — RemArc License，個人/教育用
3. **[Freesound.org](https://freesound.org/)** — 過濾 CC0 license

#### CC-BY（要署名）
4. **[SoundBible](https://soundbible.com/)** — 部分 CC-BY 3.0
5. **[OpenGameArt](https://opengameart.org/)**

#### 程式合成（無音檔）
- 白噪音：`new Tone.Noise('white')`
- 粉紅噪音：`new Tone.Noise('pink')`
- 棕色噪音：`new Tone.Noise('brown')`

### 11.2 8 種需求對應建議

| 需求 | 建議來源 |
|---|---|
| 海浪 | Pixabay 搜 `ocean waves`，1-2 分鐘長 |
| 雨聲 | Pixabay 搜 `rain` |
| 壁爐 | Pixabay 搜 `fireplace crackling` |
| 風聲 | Pixabay 搜 `wind ambience` |
| 鳥鳴 | Pixabay 搜 `forest birds` |
| 溪流 | Pixabay 搜 `stream water` |
| 雷聲 | Pixabay 搜 `thunderstorm` |
| 白噪音 | 不用音檔，`Tone.Noise` 即可 |

### 11.3 音檔處理規範（Linux 上用 Audacity）

- 統一格式：mp3，128kbps
- 長度：60-120 秒
- Loop 接縫處理：淡入結尾 → 淡出開頭，避免 click 聲
- 歸檔到 `public/audio/{soundId}.mp3`

---

## 12. 部署

純前端 + 無後端 = 任何靜態 host 皆可。**主要部署方式為 Docker**（自架），其他選項列為備援。

### 12.1 Docker 部署（主要方式）

採 **多階段 build**，第一階段用 Node 24 編譯 → 第二階段用 nginx 服務靜態檔。最終 image 不含 Node、不含 source code，只剩 nginx + 編譯產物。

#### Dockerfile

```dockerfile
# ── Stage 1: Build ──
FROM node:24-alpine AS builder

# 啟用 corepack，鎖定 pnpm 版本（從 package.json 讀 packageManager）
RUN corepack enable

WORKDIR /app

# 先複製 lock 檔做 cache
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 複製 source 並 build
COPY . .
RUN pnpm build
# 產出在 /app/dist

# ── Stage 2: Runtime ──
FROM nginx:alpine

# 移除預設站台
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

# 把 build 產物搬到 nginx 服務目錄
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf

PWA 對 cache 行為有要求：HTML 不能被快取（service worker 才能更新），但 hashed assets（`*.[hash].js`、`*.[hash].css`、音檔）應該強快取。

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # gzip 開啟（音檔已壓縮，跳過 mp3）
  gzip on;
  gzip_types text/plain text/css application/javascript application/json image/svg+xml;
  gzip_proxied any;
  gzip_min_length 1024;

  # SPA fallback：所有未知路徑回 index.html
  location / {
    try_files $uri $uri/ /index.html;
  }

  # index.html 與 service worker 不快取（讓更新可立即生效）
  location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }
  location = /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }

  # Hashed assets 強快取一年
  location ~* \.(js|css|woff2?|svg|png|webp)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # 音檔長快取（不會變）
  location ~* \.(mp3|wav|ogg)$ {
    expires 30d;
    add_header Cache-Control "public";
  }
}
```

#### docker-compose.yml

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

#### .dockerignore

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
```

#### 部署流程

```bash
# 本機 build + 跑
docker compose up -d --build

# 看 log
docker compose logs -f

# 停掉
docker compose down

# 推到 registry（之後上 production）
docker build -t registry.example.com/whitenoise:v1.0.0 .
docker push registry.example.com/whitenoise:v1.0.0
```

#### HTTPS 注意

Docker container 本身只跑 HTTP:80。**PWA 需要 HTTPS** 才能註冊 service worker（localhost 例外）。production 部署時：

- **建議：** 前面加一層 reverse proxy（Caddy / Traefik / nginx）負責 TLS 終止 + Let's Encrypt 自動憑證，後面 proxy 到本 container
- **或：** 直接在這個 nginx.conf 裡加 SSL block + mount 憑證

具體選哪種看部署環境。spec 不綁死。

### 12.2 備援部署選項

如果之後不想自架：

| 選項 | 適用 |
|---|---|
| Cloudflare Pages | 快速、免費、HTTPS、全球 CDN，git push 自動 deploy |
| GitHub Pages | 已有 GH 帳號即可，預設 HTTPS |
| Netlify / Vercel | 同上 |

**PWA 必須跑在 HTTPS**（或 localhost），上述全部符合。

---

## 13. 實作里程碑

供 writing-plans 階段參考的初版時程：

| 里程碑 | 內容 | 估時 |
|---|---|---|
| **M1** | 專案 skeleton + 音檔載入流程 | 1-2 天 |
| **M2** | 8 音效 + 多軌道混音 + 收藏 | 2-3 天 |
| **M3** | 故事模式（內建 5 個）+ crossfade + PoeticText | 3-4 天 |
| **M4** | 自訂故事編輯 + 列表 | 2-3 天 |
| **M5** | 睡眠定時器 + PlayerBar | 1-2 天 |
| **M6** | PWA 化 + Dockerfile + nginx.conf + 驗收 | 2-3 天 |

實際時數依熟悉度而定。

---

## 14. 設計決定摘要

關鍵決策的快速回顧：

| 決策 | 選擇 | 理由 |
|---|---|---|
| 平台 | 網頁 / PWA | Linux 開發環境最順 |
| 執行環境 | Node.js 24 LTS | 開發 + Docker build 一致 |
| 部署方式 | Docker（多階段 build → nginx:alpine） | 自架可控、image 精簡 |
| 音訊庫 | Tone.js（不選 Howler） | Howler 維護冷淡 |
| 框架 | Svelte 5 + runes | bundle 小、反應式適合多 state UI |
| 儲存 | 純 IndexedDB（無後端） | 簡單、無隱私問題 |
| 故事推進 | 按時間自動 | 助眠不需互動 |
| 內建故事數 | 3-5 個精選 | 不讓 MVP 變重 |
| StorySegment.volume | 保留 | 保有戲劇張力 |
| Mix vs Story | 拆兩個 table | 心智模型不同 |
| MVP E2E | 不做 | 維護成本高 |
| iOS 測試 | 暫不顧 | Linux 環境限制 |
| TS 嚴格度 | `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | 跨 session 資料 bug 防範 |

---

**END OF SPEC**
