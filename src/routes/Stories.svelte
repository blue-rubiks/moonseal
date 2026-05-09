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
