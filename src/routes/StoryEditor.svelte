<script lang="ts">
  import { BUILTIN_SOUNDS } from '../lib/audio/builtinSounds';
  import { audioEngine } from '../lib/audio/AudioEngine';
  import { storyRepo, type CustomStoryRecord } from '../lib/storage/StoryRepo';
  import { toastStore } from '../lib/stores/toastStore.svelte';
  import { uiStore } from '../lib/stores/uiStore.svelte';
  import type { StorySegment } from '../lib/story/types';
  import Glyph from '../components/Glyph.svelte';

  interface Props {
    initial: CustomStoryRecord | null;
    onClose: () => void;
    onSaved: () => void;
  }
  let { initial, onClose, onSaved }: Props = $props();

  // svelte-ignore state_referenced_locally
  let name = $state(initial?.nameKey ?? '');
  // svelte-ignore state_referenced_locally
  let segments = $state<StorySegment[]>(
    // svelte-ignore state_referenced_locally
    initial?.segments
      ? structuredClone(initial.segments)
      : [
          { soundId: BUILTIN_SOUNDS[0]!.id, durationSec: 60, crossfadeSec: 5, volume: 0.7, poeticText: '' }
        ]
  );

  let canSave = $derived(
    name.trim().length > 0 && segments.length > 0 && segments.every((s) => s.durationSec > 0)
  );

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
    const input: { id?: string; name: string; segments: StorySegment[] } = {
      name: name.trim(),
      segments
    };
    if (initial?.id) input.id = initial.id;
    await storyRepo.save(input);
    toastStore.show(`已儲存「${name.trim()}」`);
    onSaved();
  }
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label={initial ? '編輯夜讀' : '新增自訂夜讀'}>
  <div class="sheet paper-grain" class:mobile={uiStore.mobile}>
    <button class="close" onclick={onClose} aria-label="關閉">×</button>
    <span class="stamp top-stamp">新作</span>

    <div class="content">
      <div class="kicker">{initial ? '編輯自訂夜讀' : '新增自訂夜讀'}</div>
      <input class="name" type="text" bind:value={name} placeholder="未命名夜讀"/>

      <div class="block">
        <div class="section-label">段落 · {segments.length} 段</div>
        <div class="segs">
          {#each segments as seg, i (i)}
            <div class="seg">
              <span class="num en">0{i + 1}</span>
              <div class="body">
                <textarea
                  rows="2"
                  placeholder="這一段的場景文字…"
                  value={seg.poeticText ?? ''}
                  oninput={(e) => updateSegment(i, { poeticText: (e.currentTarget as HTMLTextAreaElement).value })}
                ></textarea>

                <div class="row">
                  <label class="field">
                    <span class="label">音效</span>
                    <select
                      value={seg.soundId}
                      onchange={(e) => updateSegment(i, { soundId: (e.currentTarget as HTMLSelectElement).value })}
                    >
                      {#each BUILTIN_SOUNDS as s (s.id)}
                        <option value={s.id}>{s.nameKey}</option>
                      {/each}
                    </select>
                  </label>
                  <button class="ghost" onclick={() => preview(seg.soundId)}>試聽 5s</button>
                </div>

                <div class="row sliders">
                  <label class="field">
                    <span class="label">時長 <span class="en">{seg.durationSec}s</span></span>
                    <input type="range" min="10" max="900" step="5" value={seg.durationSec}
                      oninput={(e) => updateSegment(i, { durationSec: Number((e.currentTarget as HTMLInputElement).value) })}/>
                  </label>
                  <label class="field">
                    <span class="label">交叉淡化 <span class="en">{seg.crossfadeSec}s</span></span>
                    <input type="range" min="0" max="60" step="1" value={seg.crossfadeSec}
                      oninput={(e) => updateSegment(i, { crossfadeSec: Number((e.currentTarget as HTMLInputElement).value) })}/>
                  </label>
                  <label class="field">
                    <span class="label">音量 <span class="en">{Math.round(seg.volume * 100)}</span></span>
                    <input type="range" min="0" max="1" step="0.01" value={seg.volume}
                      oninput={(e) => updateSegment(i, { volume: Number((e.currentTarget as HTMLInputElement).value) })}/>
                  </label>
                </div>
              </div>
              <button class="remove" onclick={() => removeSegment(i)}>移除</button>
            </div>
          {/each}
          <button class="add" onclick={addSegment}>
            <Glyph kind="plus" size={12}/>
            加入新段落
          </button>
        </div>
      </div>

      <div class="footer">
        <span class="hint">儲存於本機 IndexedDB · 不會上傳。</span>
        <div class="actions">
          <button class="ghost" onclick={onClose}>取消</button>
          <button class="primary" onclick={save} disabled={!canSave}>儲存</button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(20, 14, 8, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    overflow: auto;
  }
  .sheet {
    width: 100%;
    max-width: 880px;
    max-height: calc(100% - 32px);
    background: var(--bg);
    border: 1px solid var(--ink);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.25);
    padding: 36px 48px 32px;
    position: relative;
    overflow: auto;
  }
  .sheet.mobile { padding: 24px 24px 24px; }
  .close {
    position: absolute;
    top: 12px;
    right: 18px;
    color: var(--ink-soft);
    font-size: 22px;
    padding: 8px;
    line-height: 1;
    z-index: 3;
  }
  .top-stamp {
    position: absolute;
    right: 28px;
    top: -18px;
    background: var(--bg);
    z-index: 3;
  }
  .content { position: relative; z-index: 2; }

  .kicker {
    font-size: 11px;
    letter-spacing: 0.4em;
    color: var(--mute);
    margin-bottom: 8px;
  }
  .name {
    display: block;
    width: 100%;
    font-family: inherit;
    font-size: 36px;
    font-weight: 500;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--line);
    padding: 4px 0 8px;
    color: var(--ink);
    outline: none;
    letter-spacing: 0.04em;
  }
  .name:focus { border-bottom-color: var(--ink); }

  .block { margin-top: 28px; }
  .section-label {
    font-size: 11px;
    letter-spacing: 0.4em;
    color: var(--mute);
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .segs { display: flex; flex-direction: column; gap: 10px; }

  .seg {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 14px 16px;
    border: 1px solid var(--line);
    background: var(--bg-elev);
  }
  .num {
    font-size: 12px;
    color: var(--mute);
    min-width: 20px;
    margin-top: 6px;
  }
  .body { flex: 1; display: flex; flex-direction: column; gap: 10px; }
  textarea {
    width: 100%;
    font-family: inherit;
    font-size: 16px;
    line-height: 1.6;
    background: transparent;
    border: 0;
    resize: vertical;
    padding: 0;
    color: var(--ink);
    outline: none;
  }
  .row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .row.sliders { gap: 24px; }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 140px;
  }
  .field .label {
    font-size: 11px;
    color: var(--mute);
    letter-spacing: 0.1em;
  }
  select {
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--line);
    padding: 6px 0;
    color: var(--ink);
    font-family: inherit;
    font-size: 14px;
    outline: none;
  }
  input[type=range] {
    width: 100%;
    accent-color: var(--seal);
  }
  .remove {
    align-self: flex-start;
    color: var(--mute);
    font-size: 11px;
    padding: 4px 6px;
  }
  .remove:hover { color: var(--seal); }

  .add {
    padding: 10px 14px;
    border: 1px dashed var(--line);
    color: var(--ink-soft);
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 28px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
    flex-wrap: wrap;
    gap: 12px;
  }
  .hint { font-size: 12px; color: var(--mute); }
  .actions { display: flex; gap: 12px; }
  .actions .ghost {
    padding: 9px 18px;
    color: var(--ink-soft);
    font-size: 13px;
  }
  .actions .primary {
    padding: 9px 22px;
    background: var(--ink);
    color: var(--bg);
    font-size: 13px;
    font-weight: 500;
  }
  .actions .primary:disabled {
    background: var(--mute);
    cursor: not-allowed;
  }
</style>
