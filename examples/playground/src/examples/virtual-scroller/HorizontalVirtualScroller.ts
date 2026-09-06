import type { ShallowUnwrapRef } from 'vue';

import { Reactive, type ReactiveInstance } from '../../ivue';
import { Static } from '../../Static';
import { VirtualScroller } from './VirtualScroller';
import type { VirtualScrollerSelection } from './VirtualScrollerSelection';

/**
 * The virtual scroller, sideways — the extension story on the flagship
 * component. The tuned vertical class ships untouched: every place it
 * touches a DOM dimension or a gesture axis goes through the axis seams
 * (offsetSize / rectSize / transformFor / axisPaddingProps / axisDelta /
 * container sizes), and this subclass overrides ONLY those. The prefix-sum
 * cursor, render-bias rebasing, snap policy, creep integrator, and the
 * seek/converge loop — the hand-tuned 80% — run here unchanged, just over
 * widths instead of heights.
 *
 * Gestures are deltaX-only: shift+wheel and horizontal trackpad swipes
 * drive the strip; a plain vertical wheel scrolls the page straight
 * through. Pair with `snap-to-items` for the step feel: scroll, stop.
 */
class $HorizontalVirtualScroller<
  T extends VirtualScroller.BaseItem,
> extends (VirtualScroller.$Class as typeof VirtualScroller.$Class)<T> {
  /* Contract — inherited whole; ONE default re-tuned. `props` needs no
     override: it reads through the receiver and fuses THESE defaults
     with the inherited types. */
  static override get propsDefaults(): typeof VirtualScroller.$Class.propsDefaults {
    return {
      ...super.propsDefaults,
      assumedSize: 300, // cards are ~hundreds of px wide where rows are tens tall
    };
  }

  protected override get lenisOrientation(): 'vertical' | 'horizontal' {
    // lenis writes the wheel-path transform itself — translateX only when
    // it knows the axis
    return 'horizontal';
  }

  protected override get lenisIgnoreNativeScroll(): boolean {
    return true;
  }

  protected override get lenisGestureOrientation(): 'vertical' | 'horizontal' | 'both' {
    // deltaX ONLY: a plain vertical wheel is the page's (lenis refuses it
    // before preventDefault, so the page scrolls straight through); the
    // strip answers to shift+wheel and real horizontal trackpad swipes.
    return 'horizontal';
  }

  protected override get axisPaddingProps(): readonly [string, string] {
    return ['padding-left', 'padding-right'];
  }

  protected override get axisThumbProps(): readonly [string, string] {
    return ['width', 'left'];
  }

  override get containerSize() {
    return this.elementSize.width;
  }

  override get containerOuterSize() {
    return this.outerElementSize.width;
  }

  /** Text selection walks cards sideways: nearest-card and edge distance
   *  along x, autoscroll left/right. */
  protected override get selectionAxis(): VirtualScrollerSelection.Axis {
    return 'x';
  }

  protected override offsetSize(element: HTMLElement | null | undefined): number {
    return element?.offsetWidth ?? 0;
  }

  protected override rectSize(element: Element): number {
    return element.getBoundingClientRect().width;
  }

  protected override transformFor(px: number): string {
    return 'translateX(' + px + 'px)';
  }

  protected override axisDelta(data: { deltaX: number; deltaY: number }): number {
    return data.deltaX;
  }

  protected override trackPointerFraction(event: PointerEvent, rect: DOMRect): number {
    return (event.clientX - rect.left) / rect.width;
  }
}

/** Standard namespace pattern, generic adaptation — see VirtualScroller's
 *  note on why `Class` casts back and `Instance<T>` applies
 *  ReactiveInstance by hand. Identity and types only: the contract is the
 *  parent's statics, extended on the class above the way the behavior is. */
export namespace HorizontalVirtualScroller {
  /* Identity */

  export const $Class = Static($HorizontalVirtualScroller); // anchor — it overrides a static
  export let Class = Reactive(
    $HorizontalVirtualScroller,
  ) as unknown as typeof $HorizontalVirtualScroller;
  export type Instance<T extends VirtualScroller.BaseItem> = ReactiveInstance<
    $HorizontalVirtualScroller<T>
  >;

  /* Types */

  export type Props<T extends VirtualScroller.BaseItem> = VirtualScroller.Props<T>;
  export type Emits = VirtualScroller.Emits;
  export type Slots<T extends VirtualScroller.BaseItem> = VirtualScroller.Slots<T>;
  /** See VirtualScroller.Exposed — same surface, this class's instance. */
  export type Exposed<T extends VirtualScroller.BaseItem> = ShallowUnwrapRef<Instance<T>>;
}
