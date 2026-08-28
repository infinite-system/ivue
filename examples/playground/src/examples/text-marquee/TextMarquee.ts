import type { ExtractPropTypes, PropType, ShallowUnwrapRef } from 'vue';
import { computed, onMounted, ref } from 'vue';

import {
  propsWithDefaults,
  Reactive,
  type ExtractPropDefaultTypes
} from '../../ivue';
import { HorizontalVirtualScroller } from '../virtual-scroller/HorizontalVirtualScroller';
import type { BaseItem } from '../virtual-scroller/VirtualScroller.types';
import { TextChunker } from './TextChunker';

/**
 * A text — up to a whole book — as ONE scrolling line. The class owns the
 * text, the speed and the play state; TextChunker turns the text into
 * whitespace-safe chunks; the HorizontalVirtualScroller glides them as
 * items. The scroller stays pure (items, sizes, pixels — it never learns
 * this is text): the marquee is COMPOSITION, not extension.
 *
 * Speed rides the scroller's autoplay creep — the same per-frame
 * integrator that paces article reading — through the `creepMsPerPx`
 * prop, so a speed slider takes effect mid-glide with no restart.
 */
class $TextMarquee {
  constructor(public props: TextMarquee.Props) {
    onMounted(() => this.measureFont());
  }

  /* Template refs */

  get rootElement() {
    return ref<HTMLElement | null>(null);
  }

  /** The scroller component's exposed instance. */
  get scroller() {
    return ref<HorizontalVirtualScroller.Exposed<BaseItem> | null>(null);
  }

  /* Props */

  get text() {
    return this.props.text;
  }

  get pxPerSecond() {
    return this.props.pxPerSecond;
  }

  get targetChars() {
    return this.props.targetChars;
  }

  /* Chunk width estimation */

  /** Average character width of the marquee's real font — canvas-measured
   *  on mount (see measureFont); the pre-mount value only serves the very
   *  first frame. */
  get averageCharWidth() {
    return ref(7.5);
  }

  /** What the scroller assumes for a chunk it has not measured yet. */
  get assumedChunkSize() {
    return Math.max(
      60,
      Math.round(this.targetChars * this.averageCharWidth.value)
    );
  }

  /* Items */

  // computed: expensive — chunking a book-scale text is real work, and
  // the array identity must be stable across unrelated re-renders.
  // THIN closure — the logic stays a testable method (buildItems).
  get items() {
    return computed(() => this.buildItems());
  }

  get chunkCount() {
    return this.items.value.length;
  }

  get renderedCount() {
    return this.scroller.value?.visibleItems.length ?? 0;
  }

  /* Speed and play state */

  /** The speed setting, translated into the creep integrator's unit. */
  get creepMsPerPx() {
    return 1000 / Math.max(1, this.pxPerSecond);
  }

  get isPlaying() {
    return this.scroller.value?.isAutoPlaying ?? false;
  }

  /* Methods */

  measureFont() {
    const element = this.rootElement.value;
    if (!element) return;
    const style = getComputedStyle(element);
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    this.averageCharWidth.value = TextChunker.Class.averageCharWidth(font);
  }

  buildItems(): BaseItem[] {
    const chunks = TextChunker.Class.chunk(
      TextChunker.Class.oneLine(this.text),
      this.targetChars
    );
    const items: BaseItem[] = new Array(chunks.length);
    for (let index = 0; index < chunks.length; index++) {
      items[index] = {
        id: String(index),
        body: chunks[index],
        position: String(index + 1)
      };
    }
    return items;
  }

  play() {
    this.scroller.value?.startAutoPlay(0);
  }

  pause() {
    this.scroller.value?.stopAutoPlay();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
}

/**
 * The namespace carries the WHOLE component contract — class, instance
 * type, props types + defaults merged by propsWithDefaults, and the
 * expose-surface type. TextMarquee.vue is pure wiring against it.
 */
export namespace TextMarquee {
  export const $Class = $TextMarquee; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /** 1 — the TYPES: a defineComponent-style object, no defaults inside. */
  export const propsTypes = {
    /** The full text — newlines and all; the marquee one-lines it. */
    text: { type: String as PropType<string>, required: true },
    /** Glide speed. The default reads like a fast news ticker. */
    pxPerSecond: { type: Number as PropType<number> },
    /** Characters per chunk (cut at spaces). Bigger chunks = fewer items;
     *  smaller chunks = finer virtualization granularity. */
    targetChars: { type: Number as PropType<number> }
  };

  /** 2 — the DEFAULTS: plain values, typed against the types object
   *  (`text` is required, so it carries none). */
  export const propsDefaults: ExtractPropDefaultTypes<
    Omit<typeof propsTypes, 'text'>
  > = {
    pxPerSecond: 120,
    targetChars: 400
  };

  /** 3 — the MERGE: a standard Vue props object, ready for defineProps. */
  export const props = propsWithDefaults(propsDefaults, propsTypes);

  /** Resolved props — what the class receives after defaults apply.
   *  DERIVED from the merged runtime object, never hand-duplicated. */
  export type Props = ExtractPropTypes<typeof props>;

  export type Exposed = ShallowUnwrapRef<Instance>;
}
