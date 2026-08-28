import { ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import type { VirtualScroller } from './VirtualScroller';
import type { BaseItem } from './VirtualScroller.types';

class $VirtualScrollerExample {
  // MUTABLE STATE — the list is replaced wholesale, never deep-mutated,
  // so shallowRef keeps a million rows out of the deep-proxy machinery.
  get items() {
    return shallowRef<BaseItem[]>(VirtualScrollerExample.buildItems());
  }

  // MUTABLE STATE — the autoplay-speed slider writes this (px/s; 6.7 is
  // the scroller's tuned reading cadence, 150 ms per px).
  get speed() {
    return ref(6.7);
  }

  // TEMPLATE-REF TARGET — the scroller component's exposed instance.
  get scroller() {
    return ref<VirtualScroller.Exposed<BaseItem> | null>(null);
  }

  // DERIVED — plain getter; reactive through the scroller's exposed state.
  get renderedCount() {
    return this.scroller.value?.visibleItems.length ?? 0;
  }

  // DERIVED — the slider's px/s translated into the creep integrator's unit.
  get creepMsPerPx() {
    return 1000 / Math.max(1, this.speed.value);
  }

  get speedLabel() {
    return `${this.speed.value.toFixed(1)} px/s`;
  }

  // DERIVED — reads the scroller's reactive autoplay state through expose.
  get isAutoPlaying() {
    return this.scroller.value?.isAutoPlaying ?? false;
  }

  get playButtonIcon() {
    return this.isAutoPlaying ? '⏸' : '▶';
  }

  get playButtonLabel() {
    return this.isAutoPlaying ? 'autoplay on — scroll up to stop' : 'autoplay';
  }

  jumpTo(index: number) {
    this.scroller.value?.scrollToIndex(index, undefined, true, 12);
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

export namespace VirtualScrollerExample {
  /* Identity */

  export const $Class = $VirtualScrollerExample; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /* Values */

  export const ITEM_COUNT = 1_000_000;

  // Non-exported namespace members: private to this file, invisible to
  // importers — the namespace is the ONE seam, so nothing lives at
  // module level beside it.
  const OPENERS = [
    'Everything costs proportional to what is observed',
    'The window walks; the list stands still',
    'A million rows, a handful of divs',
    'Estimates decide the spacers; real heights decide the rest',
    'Scroll is virtual — the DOM never learns the total',
    'Heights are captured once, on the way in and on the way out',
  ];

  // A million rows must stay memory-sane: bodies are 24 SHARED string
  // variants — unique text per row would be hundreds of MB of strings.
  const BODY_VARIANTS: string[] = [];
  for (let openerIndex = 0; openerIndex < OPENERS.length; openerIndex++) {
    for (let extraSentences = 0; extraSentences < 4; extraSentences++) {
      let body = `${OPENERS[openerIndex]}.`;
      for (let extra = 0; extra < extraSentences; extra++) {
        body +=
          ' Rendered rows are normal-flow blocks between two spacer divs, so the browser stacks them at their real heights for free.';
      }
      BODY_VARIANTS.push(body);
    }
  }

  export function buildItems(): BaseItem[] {
    const items = new Array(ITEM_COUNT);
    for (let index = 0; index < ITEM_COUNT; index++) {
      items[index] = {
        id: String(index),
        body: BODY_VARIANTS[(index * 7) % BODY_VARIANTS.length],
        position: String(index + 1),
      };
    }
    return items;
  }
}
