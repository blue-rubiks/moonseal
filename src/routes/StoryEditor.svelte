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
    const input: { id?: string; name: string; segments: StorySegment[] } = {
      name: name.trim(),
      segments
    };
    if (initial?.id) input.id = initial.id;
    await storyRepo.save(input);
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
