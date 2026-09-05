import { ref, shallowRef } from 'vue';
import type { VirtualScroller } from '../../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller';
import { Reactive } from '../../../../../lib/Reactive';
import { Static } from '../../../../../lib/Static';
import type { HorizontalVirtualScroller } from '../../../../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller';

/**
 * The docs example model for the horizontal 1M example — itself written to
 * the standard the page teaches: one class, one namespace carrying the
 * class plus every const the module owns (non-exported members stay
 * private to the file), nothing at module level beside imports.
 */
class $HorizontalScrollerExample {
  static readonly ITEM_COUNT = 1_000_000;

  protected static readonly CAPTIONS = [
    'The window walks; the strip stands still',
    'A million cards, a handful of divs',
    'Widths are captured once, in and out',
    'Estimates decide the spacers',
    'Scroll is virtual — the DOM never learns the total',
    'Everything costs O(window)',
  ];

  static buildItems(): VirtualScroller.BaseItem[] {
    const items = new Array(this.ITEM_COUNT);
    for (let index = 0; index < this.ITEM_COUNT; index++) {
      items[index] = {
        id: String(index),
        body: this.CAPTIONS[(index * 7) % this.CAPTIONS.length],
        position: String(index + 1),
      };
    }
    return items;
  }

  // MUTABLE STATE — the list is replaced wholesale, never deep-mutated,
  // so shallowRef keeps a million cards out of the deep-proxy machinery.
  get items() {
    return shallowRef<VirtualScroller.BaseItem[]>(this.self.buildItems());
  }

  // MUTABLE STATE — the glide-speed slider writes this (px/s).
  get speed() {
    return ref(50);
  }

  // TEMPLATE-REF TARGET — the scroller component's exposed instance.
  get scroller() {
    return ref<HorizontalVirtualScroller.Exposed<VirtualScroller.BaseItem> | null>(null);
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $HorizontalScrollerExample;
  }

  /* DERIVED — plain getters; reactive through the scroller's expose. */

  get itemCount() {
    return this.self.ITEM_COUNT;
  }

  get itemCountLabel() {
    return this.itemCount.toLocaleString();
  }

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

  jumpToEnd() {
    this.jumpTo(this.itemCount - 1);
  }
}

export namespace HorizontalScrollerExample {
  /* Identity */

  export const $Class = Static($HorizontalScrollerExample); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
