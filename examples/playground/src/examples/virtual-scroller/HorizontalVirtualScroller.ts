import type { ShallowUnwrapRef } from 'vue';

import {
  propsWithDefaults,
  Reactive,
  type ReactiveInstance
} from '../../ivue';
import type { BaseItem } from './VirtualScroller.types';
import { VirtualScroller } from './VirtualScroller';

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
class $HorizontalVirtualScroller<T extends BaseItem> extends (VirtualScroller.$Class as typeof VirtualScroller.$Class) <T> {
  protected get lenisOrientation(): 'vertical' | 'horizontal' {
    // lenis writes the wheel-path transform itself — translateX only when
    // it knows the axis
    return 'horizontal';
  }

  protected get lenisIgnoreNativeScroll(): boolean {
    return true;
  }

  protected get lenisGestureOrientation(): 'vertical' | 'horizontal' | 'both' {
    // deltaX ONLY: a plain vertical wheel is the page's (lenis refuses it
    // before preventDefault, so the page scrolls straight through); the
    // strip answers to shift+wheel and real horizontal trackpad swipes.
    return 'horizontal';
  }

  protected offsetSize(element: HTMLElement | null | undefined): number {
    return element?.offsetWidth ?? 0;
  }

  protected rectSize(element: Element): number {
    return element.getBoundingClientRect().width;
  }

  protected transformFor(px: number): string {
    return 'translateX(' + px + 'px)';
  }

  protected get axisPaddingProps(): readonly [string, string] {
    return ['padding-left', 'padding-right'];
  }

  protected axisDelta(data: { deltaX: number; deltaY: number }): number {
    return data.deltaX;
  }

  get containerSize() {
    return this.elementSize.width;
  }

  get containerOuterSize() {
    return this.outerElementSize.width;
  }
}

/** Standard namespace pattern, generic adaptation — see VirtualScroller's
 *  note on why `Class` casts back and `Instance<T>` applies
 *  ReactiveInstance by hand. The props surface extends the same way the
 *  class does: spread the parent's maps, override what defines the
 *  specialization — here a single default (cards are ~hundreds of px
 *  wide where rows are tens tall), stated once instead of duplicating
 *  the whole defaults block. */
export namespace HorizontalVirtualScroller {
  /* Identity */

  export const $Class = $HorizontalVirtualScroller;
  export let Class = Reactive(
    $HorizontalVirtualScroller
  ) as unknown as typeof $HorizontalVirtualScroller;
  export type Instance<T extends BaseItem> = ReactiveInstance<
    $HorizontalVirtualScroller<T>
  >;

  /* Values */

  export const propsTypes = { ...VirtualScroller.propsTypes };
  export const propsDefaults = {
    ...VirtualScroller.propsDefaults,
    assumedSize: 300
  };
  export const props = propsWithDefaults(propsDefaults, propsTypes);
  export const emits = VirtualScroller.emits;

  /* Types */

  export type Props<T extends BaseItem> = VirtualScroller.Props<T>;
  export type Emits = VirtualScroller.Emits;
  export type Slots<T extends BaseItem> = VirtualScroller.Slots<T>;
  /** See VirtualScroller.Exposed — same surface, this class's instance. */
  export type Exposed<T extends BaseItem> = ShallowUnwrapRef<Instance<T>>;
}
