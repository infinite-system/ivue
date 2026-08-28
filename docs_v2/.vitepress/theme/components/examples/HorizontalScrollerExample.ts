import { ref, shallowRef } from 'vue';
import { Reactive } from '../../../../../lib/Reactive';
import type { HorizontalVirtualScroller } from '../../../../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller';
import type { BaseItem } from '../../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller.types';

/**
 * The docs demo model for the horizontal 1M example — itself written to
 * the standard the page teaches: one class, one namespace carrying the
 * class plus every const the module owns (non-exported members stay
 * private to the file), nothing at module level beside imports.
 */
class $HorizontalScrollerExample {
  // MUTABLE STATE — the list is replaced wholesale, never deep-mutated,
  // so shallowRef keeps a million cards out of the deep-proxy machinery.
  get items() {
    return shallowRef<BaseItem[]>(HorizontalScrollerExample.buildItems());
  }

  // MUTABLE STATE — the glide-speed slider writes this (px/s).
  get speed() {
    return ref(50);
  }

  // TEMPLATE-REF TARGET — the scroller component's exposed instance.
  get scroller() {
    return ref<HorizontalVirtualScroller.Exposed<BaseItem> | null>(null);
  }

  /* DERIVED — plain getters; reactive through the scroller's expose. */

  get renderedCount() {
    return this.scroller.value?.visibleItems.length ?? 0;
  }

  get creepMsPerPx() {
    return 1000 / Math.max(1, this.speed.value);
  }

  get speedLabel() {
    return `${this.speed.value} px/s`;
  }

  get isAutoPlaying() {
    return this.scroller.value?.isAutoPlaying ?? false;
  }

  get playButtonIcon() {
    return this.isAutoPlaying ? '⏸' : '▶';
  }

  get playButtonLabel() {
    return this.isAutoPlaying ? 'pause the glide' : 'glide';
  }

  jumpTo(index: number) {
    this.scroller.value?.scrollToIndex(index, undefined, true);
  }

  toggleAutoPlay() {
    const scroller = this.scroller.value;
    if (!scroller) return;
    if (this.isAutoPlaying) {
      scroller.stopAutoPlay();
    } else {
      scroller.startAutoPlay(0);
    }
  }
}

export namespace HorizontalScrollerExample {
  /* Identity */

  export const $Class = $HorizontalScrollerExample; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /* Values */

  export const ITEM_COUNT = 1_000_000;

  // Non-exported namespace members: private to this file — the namespace
  // is the ONE seam, so nothing lives at module level beside it.
  const CAPTIONS = [
    'The window walks; the strip stands still',
    'A million cards, a handful of divs',
    'Widths are captured once, in and out',
    'Estimates decide the spacers',
    'Scroll is virtual — the DOM never learns the total',
    'Everything costs O(window)',
  ];

  export function buildItems(): BaseItem[] {
    const items = new Array(ITEM_COUNT);
    for (let index = 0; index < ITEM_COUNT; index++) {
      items[index] = {
        id: String(index),
        body: CAPTIONS[(index * 7) % CAPTIONS.length],
        position: String(index + 1),
      };
    }
    return items;
  }
}
