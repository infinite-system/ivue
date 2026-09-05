// VirtualScrollerItem.ts — one rendered row's model: a template ref and
// the ONE-SHOT size capture the parent scroller's spacer math needs.
import { onBeforeUnmount, onMounted, ref, type PropType } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive } from '../../ivue';
import { Static } from '../../Static';

class $VirtualScrollerItem {
  /* Contract — STATIC */

  static get propsTypes() {
    return definePropTypes({
      index: { type: Number as PropType<number>, required: true },
      /** Main axis the parent scroller virtualizes ('y' default). */
      axis: { type: String as PropType<'y' | 'x'> },
    });
  }

  static get propsDefaults() {
    return { axis: 'y' as const };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  static get emits() {
    return {
      sizeUpdated: (size: number) => true,
    };
  }

  constructor(
    public props: VirtualScrollerItem.Props,
    public emit: VirtualScrollerItem.Emits,
  ) {
    // Capture once on mount (seeds the estimate the moment the item enters
    // the window) and once right before unmount (the final size — the only
    // one that matters once the item leaves the window).
    onMounted(() => this.capture());
    onBeforeUnmount(() => this.capture());
  }

  /** The row element (a template ref). */
  get element() {
    return ref<HTMLElement | null>(null);
  }

  // DERIVED — plain getters
  get isHorizontal() {
    return this.props.axis === 'x';
  }
  get rowIndex() {
    return this.props.index + 1;
  }

  /**
   * ONE-SHOT size capture — deliberately not a ResizeObserver. Items render
   * in normal flow, so the browser positions them at their real size with no
   * bookkeeping; the parent only needs sizes for its spacer/estimate math.
   * Continuous observation is what caused measurable jitter at 100k items:
   * bursts of resize callbacks during scroll, each invalidating geometry.
   *
   * Sizes are reported in LAYOUT px: an ancestor transform scale (the post
   * card scales to fit the window) shrinks every rect readout, and a size
   * map built from scaled values diverges from the real flow by the scale
   * factor — landing every index-targeted jump short. The parent stack's
   * rect-to-layout ratio is the current scale; divide it out.
   */
  capture() {
    const element = this.element.value;
    if (!element) return;
    const parent = element.parentElement;
    const horizontal = this.isHorizontal;
    const parentLayout = horizontal
      ? (parent?.offsetWidth ?? 0)
      : (parent?.offsetHeight ?? 0);
    const parentRect = parent
      ? horizontal
        ? parent.getBoundingClientRect().width
        : parent.getBoundingClientRect().height
      : 0;
    const scale = parent && parentLayout > 0 ? parentRect / parentLayout : 1;
    const rect = element.getBoundingClientRect();
    const size = horizontal ? rect.width : rect.height;
    this.emit('sizeUpdated', scale > 0 ? size / scale : size);
  }
}

export namespace VirtualScrollerItem {
  export const $Class = Static($VirtualScrollerItem); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /* Types — DERIVED from the class's statics */

  export type Props = { index: number; axis: 'y' | 'x' };
  export type Emits = (event: 'sizeUpdated', size: number) => void;
}
