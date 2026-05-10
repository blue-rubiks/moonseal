import type { StoryDef } from '../story/types';
import type { CustomStoryRecord } from '../storage/StoryRepo';

export type Route = 'home' | 'mix' | 'story' | 'mine';

class UIStore {
  route = $state<Route>('home');
  mobile = $state(false);
  timerSheetOpen = $state(false);
  editor = $state<{ open: boolean; initial: CustomStoryRecord | null }>({ open: false, initial: null });
  currentStory = $state<StoryDef | null>(null);

  private mql: MediaQueryList | null = null;

  initBreakpoint() {
    if (typeof window === 'undefined') return;
    this.mql = window.matchMedia('(min-width: 880px)');
    const apply = (e: MediaQueryListEvent | MediaQueryList) => {
      this.mobile = !e.matches;
    };
    apply(this.mql);
    this.mql.addEventListener('change', apply);
  }

  setRoute(r: Route) { this.route = r; this.currentStory = null; }
  openTimer() { this.timerSheetOpen = true; }
  closeTimer() { this.timerSheetOpen = false; }
  openEditor(initial: CustomStoryRecord | null = null) { this.editor = { open: true, initial }; }
  closeEditor() { this.editor = { open: false, initial: null }; }
  openStory(s: StoryDef) { this.currentStory = s; }
  closeStory() { this.currentStory = null; }
}

export const uiStore = new UIStore();
