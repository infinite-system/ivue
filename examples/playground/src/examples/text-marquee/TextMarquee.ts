import type { ExtractPropTypes, PropType, ShallowUnwrapRef } from 'vue';
import type { VirtualScroller } from '../virtual-scroller/VirtualScroller';
import { computed, onMounted, ref, watch } from 'vue';

import {
  definePropTypes,
  propsWithDefaults,
  Reactive,
  type ExtractPropDefaultTypes
} from '../../ivue';
import { Static } from '../../Static';
import { HorizontalVirtualScroller } from '../virtual-scroller/HorizontalVirtualScroller';
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
  /* Contract — STATIC, so the class owns its inputs the way it owns its
     state, and a subclass extends them with `super` like any other
     member. The namespace below holds identity and TYPES only. */

  /** 1 — the TYPES: a defineComponent-style object, no defaults inside. */
  static get propsTypes() {
    return definePropTypes({
      /** The full text — newlines and all; the marquee one-lines it. */
      text: { type: String as PropType<string>, required: true },
      /** Glide speed. The default is a comfortable reading glide. */
      pxPerSecond: { type: Number as PropType<number> },
      /** Characters per chunk (cut at spaces). Bigger chunks = fewer items;
       *  smaller chunks = finer virtualization granularity. */
      targetChars: { type: Number as PropType<number> }
    });
  }

  /** 2 — the DEFAULTS: plain values, typed against the types object
   *  (`text` is required — filtered out of the check automatically). */
  static get propsDefaults(): ExtractPropDefaultTypes<
    typeof $TextMarquee.propsTypes
  > {
    return {
      pxPerSecond: 50,
      targetChars: 400
    };
  }

  /** 3 — the MERGE: a standard Vue props object, ready for defineProps.
   *  Reads through the receiver, so a subclass's `props` is its own
   *  fusion of ITS types and defaults. */
  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  /** Smallest width the scroller assumes for an unmeasured chunk. A live
   *  knob (no `$`): a subclass or test double overrides it. */
  static get minimumChunkWidth() {
    return 60;
  }

  /** Average character width before the real font is measured on mount. */
  static get preMeasureCharWidth() {
    return 7.5;
  }

  constructor(public props: TextMarquee.Props) {
    onMounted(() => this.measureFont());
    // Rechunked text (text/targetChars changed) invalidates every index —
    // reseed the exact widths for the new chunk list.
    watch(
      () => this.items.value,
      () => this.seedChunkSizes()
    );
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $TextMarquee;
  }

  /* Template refs */

  get rootElement() {
    return ref<HTMLElement | null>(null);
  }

  /** The scroller component's exposed instance. */
  get scroller() {
    return ref<HorizontalVirtualScroller.Exposed<VirtualScroller.BaseItem> | null>(null);
  }
  /** Chunks under the reader's text selection (a range over the data). */
  get selectedChunkCount() {
    return this.scroller.value?.selection.selectedRowCount ?? 0;
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
    return ref(this.self.preMeasureCharWidth);
  }

  /** What the scroller assumes for a chunk it has not measured yet. */
  get assumedChunkSize() {
    return Math.max(
      this.self.minimumChunkWidth,
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
    const font = this.fontShorthand();
    if (!font) return;
    this.averageCharWidth.value = TextChunker.Class.averageCharWidth(font);
    this.seedChunkSizes();
  }

  /** The marquee's real rendered font, as a canvas-ready shorthand. */
  fontShorthand(): string | null {
    const element = this.rootElement.value;
    if (!element) return null;
    const style = getComputedStyle(element);
    return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  }

  /**
   * Seed the scroller's size map with canvas-EXACT chunk widths (see
   * TextChunker.measureChunks). Without seeds, unmeasured chunks ride the
   * average-based assumed size, whose ~1% error compounds across a
   * thousand chunks into a scroll extent that ends a chunk and a half
   * short — the end of the book hides past the clamp and the scrollbar
   * cannot reach it. Real one-shot captures still overwrite the seeds as
   * chunks render.
   */
  seedChunkSizes() {
    const scroller = this.scroller.value;
    const font = this.fontShorthand();
    if (!scroller || !font) return;
    const items = this.items.value;
    const widths = TextChunker.Class.measureChunks(
      items.map((item) => item.body),
      font
    );
    for (let index = 0; index < widths.length; index++) {
      scroller.syncItemSize(index, widths[index], false);
    }
    scroller.updatePositionsImmediately();
  }

  buildItems(): VirtualScroller.BaseItem[] {
    const chunks = TextChunker.Class.chunk(
      TextChunker.Class.oneLine(this.text),
      this.targetChars
    );
    const items: VirtualScroller.BaseItem[] = new Array(chunks.length);
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
 * The namespace is identity and TYPES only. The contract (prop types,
 * defaults, their fusion) lives on the class as statics, so it swaps with
 * `Class` under a global override and extends through `super` in a
 * subclass; every type here is DERIVED from `$Class`, never hand-written.
 * TextMarquee.vue is pure wiring against it.
 */
export namespace TextMarquee {
  export const $Class = Static($TextMarquee); // anchor — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /** Resolved props — what the class receives after defaults apply. */
  export type Props = ExtractPropTypes<typeof $Class.props>;

  export type Exposed = ShallowUnwrapRef<Instance>;
}
