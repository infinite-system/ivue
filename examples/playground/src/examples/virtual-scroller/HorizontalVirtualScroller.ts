import { Reactive, type ReactiveInstance } from '../../ivue';
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
 * Gestures: 'both' lets the dominant axis win, so a mouse wheel advances
 * the strip while a trackpad's real horizontal swipe does too. Pair it
 * with `snap-to-items` for the step feel: scroll, stop; scroll, stop.
 */
class $HorizontalVirtualScroller<T extends BaseItem> extends (VirtualScroller.$Class as typeof VirtualScroller.$Class) <T> {
  protected get lenisGestureOrientation(): 'vertical' | 'horizontal' | 'both' {
    return 'both';
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
    // dominant axis: a trackpad's sideways swipe drives directly; a mouse
    // wheel's vertical delta advances the strip while the pointer is on it
    return Math.abs(data.deltaX) > Math.abs(data.deltaY)
      ? data.deltaX
      : data.deltaY;
  }

  get containerHeight() {
    return this.elementSize.width;
  }

  get containerOuterHeight() {
    return this.outerElementSize.width;
  }
}

/** Standard namespace pattern, generic adaptation — see VirtualScroller's
 *  note on why `Class` casts back and `Instance<T>` applies
 *  ReactiveInstance by hand. */
export namespace HorizontalVirtualScroller {
  export const $Class = $HorizontalVirtualScroller;
  export let Class = Reactive(
    $HorizontalVirtualScroller
  ) as unknown as typeof $HorizontalVirtualScroller;
  export type Instance<T extends BaseItem> = ReactiveInstance<
    $HorizontalVirtualScroller<T>
  >;
}
