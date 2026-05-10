<script lang="ts">
  import { loadBuiltinStories } from '../lib/story/builtinStories';
  import { storyRepo, type CustomStoryRecord } from '../lib/storage/StoryRepo';
  import { uiStore } from '../lib/stores/uiStore.svelte';
  import { fmtMin } from '../lib/util/format';
  import type { StoryDef } from '../lib/story/types';
  import Glyph from '../components/Glyph.svelte';

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

  async function deleteCustom(e: MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('確定刪除這個故事？')) return;
    await storyRepo.delete(id);
    await refresh();
  }
</script>

<section class:mobile={uiStore.mobile}>
  <div class="title">
    <div class="title-l">
      <h1>故事</h1>
      <span class="subtitle">搭配音效的詩意短篇 · 單句呼吸式閱讀</span>
    </div>
    <button class="new" onclick={onCreate}>
      <Glyph kind="plus" size={12} sw={1.4}/>
      新增自訂故事
    </button>
  </div>
  <div class="hline"></div>

  {#if error}<p class="error">{error}</p>{/if}

  <div class="block">
    <div class="section-label">內建</div>
    <div class="grid">
      {#each builtins as s, i (s.id)}
        <button class="story" onclick={() => onSelect(s)}>
          <span class="num en">0{i + 1}</span>
          <div class="story-name">{s.nameKey}</div>
          <div class="story-desc">{s.description}</div>
          <div class="story-meta">
            <span class="en">{fmtMin(s.totalDurationSec)}</span>
            ·
            <span class="en">{s.segments.length} 段</span>
          </div>
        </button>
      {/each}
    </div>
  </div>

  <div class="block">
    <div class="section-label">自訂</div>
    {#if customs.length === 0}
      <div class="empty">
        <div class="empty-title">還沒有自訂故事</div>
        <div class="empty-hint">點右上「+ 新增自訂故事」建立你自己的旅程</div>
      </div>
    {:else}
      <div class="grid">
        {#each customs as s, i (s.id)}
          <div class="custom">
            <button class="story" onclick={() => onSelect(s)}>
              <span class="num en">0{i + 1}</span>
              <div class="story-name">{s.nameKey}</div>
              {#if s.description}
                <div class="story-desc">{s.description}</div>
              {/if}
              <div class="story-meta">
                <span class="en">{fmtMin(s.totalDurationSec)}</span>
                ·
                <span class="en">{s.segments.length} 段</span>
              </div>
            </button>
            <div class="custom-actions">
              <button onclick={(e) => { e.stopPropagation(); onEdit(s); }}>編輯</button>
              <button class="del" onclick={(e) => deleteCustom(e, s.id)}>刪除</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
  section {
    padding: 32px 56px 32px;
    position: relative;
    z-index: 2;
  }
  section.mobile { padding: 16px 24px 32px; }
  .title {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }
  .title-l { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
  h1 {
    font-size: clamp(36px, 5vw, 56px);
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.02em;
    margin: 0;
  }
  .subtitle {
    font-size: 13px;
    color: var(--mute);
    padding-bottom: 8px;
    letter-spacing: 0.1em;
  }
  .new {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    border: 1px solid var(--seal);
    color: var(--seal);
    font-size: 13px;
  }
  .hline {
    height: 1px;
    background: var(--line);
    transform: scaleY(0.5);
    margin: 18px 0 24px;
  }
  .error { color: var(--seal); margin: 8px 0 16px; }
  .block { margin-top: 24px; }
  .section-label {
    font-size: 11px;
    letter-spacing: 0.4em;
    color: var(--mute);
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  section.mobile .grid { grid-template-columns: 1fr; }
  .story {
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
    padding: 20px 22px;
    border: 1px solid var(--line);
    background: var(--bg-elev);
    width: 100%;
    cursor: pointer;
  }
  .story:hover { border-color: var(--ink); }
  .num {
    position: absolute;
    top: 10px;
    right: 14px;
    font-size: 11px;
    color: var(--mute);
  }
  .story-name {
    font-size: 18px;
    font-weight: 500;
    margin-bottom: 4px;
  }
  .story-desc {
    font-size: 13px;
    color: var(--ink-soft);
    margin-bottom: 10px;
    font-style: italic;
    line-height: 1.55;
  }
  .story-meta {
    font-size: 11px;
    color: var(--mute);
    letter-spacing: 0.15em;
  }

  .custom {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .custom-actions {
    display: flex;
    gap: 0;
    border-left: 1px solid var(--line);
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  .custom-actions button {
    flex: 1;
    padding: 8px;
    font-size: 12px;
    color: var(--ink-soft);
    border-right: 1px solid var(--line);
  }
  .custom-actions button:last-child { border-right: 0; }
  .custom-actions .del { color: var(--seal); }

  .empty {
    padding: 24px 22px;
    border: 1px dashed var(--line);
    text-align: center;
    color: var(--mute);
  }
  .empty-title { font-size: 13px; margin-bottom: 4px; }
  .empty-hint { font-size: 11px; font-style: italic; }
</style>
