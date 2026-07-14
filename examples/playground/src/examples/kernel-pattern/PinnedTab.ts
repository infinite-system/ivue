// PinnedTab.ts — extends Tab. It's registered too, so at seal the kernel
// re-parents it onto the COMPOSED Tab — a pinned tab inherits Tab's plugins
// even though it was declared before any plugin loaded.
import { Reactive } from '../../ivue';
import { kernel } from './kernel';
import { Tab } from './Tab';

class $PinnedTab extends Tab.$Class {
  get badges(): string[] {
    return ['pinned', ...super.badges];
  }
}

export namespace PinnedTab {
  export const $Class = $PinnedTab;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}

kernel.defineClass('PinnedTab', PinnedTab);
