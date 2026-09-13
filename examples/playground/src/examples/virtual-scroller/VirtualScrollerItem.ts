// VirtualScrollerItem.ts — one rendered row's model: a template ref and
// the ONE-SHOT size capture the parent scroller's spacer math needs.
import { onMounted, ref, type PropType } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive } from '../../ivue';
import { Static } from '../../Static';

class $VirtualScrollerItem {
  /* Contract — STATIC */

  static get propsTypes() {
    return definePropTypes({
      index: { type: Number as PropType<number>, required: true },
      /** Main axis the parent scroller virtualizes ('y' default). */
      axis: { type: String as PropType<'y' | 'x'> }
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
      sizeUpdated: (size: number) => true
    };
  }

  constructor(
    public props: VirtualScrollerItem.Props,
    public emit: VirtualScrollerItem.Emits
  ) {
    // Capture once, on mount: the size the moment the item enters the
    // window. Nothing on unmount — the wrapper observer kept the size
    // current while the row was mounted, and an unmount capture read its
    // rect between the patch's removals, a forced layout per row (measured:
    // 711 ms of captures over two flicks on a phone profile).
    // invariant: An item captures its size once, on mount (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
    onMounted(() => this.capture());
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
   * The size is the row's rect in screen px; the scroller divides the
   * wave by the wrapper's rect-to-layout ratio once, so an ancestor
   * transform scale is taken out there, not per row.
   */
  capture() {
    const element = this.element.value;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    this.emit('sizeUpdated', this.isHorizontal ? rect.width : rect.height);
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
