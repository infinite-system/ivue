/*
=== GENERATOR ===
Goal: Turn the tuned vertical scroller sideways by overriding only its axis seams, so widths replace heights everywhere and nothing else forks.
[Every axis dependency goes through a seam getter](virtual-scroller.invariants.md#every-axis-dependency-goes-through-a-seam-getter)
[A cross-axis touch belongs to the page](virtual-scroller.invariants.md#a-cross-axis-touch-belongs-to-the-page)
[The frame is never natively panned along its own axis](virtual-scroller.invariants.md#the-frame-is-never-natively-panned-along-its-own-axis)
// domain-invariant: $HorizontalVirtualScroller — If the subclass re-tunes one default, then its props object carries that default and the parent's props object keeps its own.
// domain-invariant: $HorizontalVirtualScroller — If the horizontal seams are read, then every one names the x axis: translateX, deltaX, padding-left, width and left, clientX along the track, the selection walks along x, and the browser may pan only y.
Impossible if true: A horizontal scroller whose transform, thumb, or gesture reads the y axis.

=== GENERATOR-DESCRIBED ===
The proof is that the subclass is small: a Probe over it exposes the
protected seams and asserts each names the x axis, and the touch lock
mirrors the vertical spec. Nothing about the cursor, the clamp, or the
window is re-proven here — those specs run against the parent and the
subclass inherits them by construction.
*/

import { expect, test, vi } from 'vitest';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { HorizontalVirtualScroller } from './HorizontalVirtualScroller';
import { VirtualScroller } from './VirtualScroller';
import { hosted } from './hosted';

type Row = VirtualScroller.BaseItem;

class $Probe extends (HorizontalVirtualScroller.$Class as typeof HorizontalVirtualScroller.$Class)<Row> {
  probeTransform(px: number) {
    return this.transformFor(px);
  }

  probeAxisDelta(data: { deltaX: number; deltaY: number }) {
    return this.axisDelta(data);
  }

  probePaddingProps() {
    return this.axisPaddingProps;
  }

  probeThumbProps() {
    return this.axisThumbProps;
  }

  probeTrackFraction(event: PointerEvent, rect: DOMRect) {
    return this.trackPointerFraction(event, rect);
  }

  probeContainerIsWidth() {
    return this.containerSize === this.elementSize.width;
  }

  probeNativeOffset(element: HTMLElement) {
    return this.nativeScrollOffset(element);
  }
}

namespace Probe {
  export const $Class = Static($Probe);
  export let Class = Reactive($Probe) as unknown as typeof $Probe;
}

const rows = (count: number): Row[] =>
  Array.from({ length: count }, (_, index) => ({
    id: String(index),
    position: String(index + 1),
    body: `card ${index}`
  }));

function strip(items: Row[]) {
  const props = {
    ...HorizontalVirtualScroller.Class.propsDefaults,
    modelValue: items
  } as VirtualScroller.Props<Row>;
  return hosted(() => new Probe.Class(props, vi.fn() as unknown as VirtualScroller.Emits));
}

const touch = (x: number, y: number) =>
  ({ touches: [{ clientX: x, clientY: y }] }) as unknown as TouchEvent & {
    lenisStopPropagation?: boolean;
  };

// domain-invariant: $HorizontalVirtualScroller — If the subclass re-tunes one default, then its props object carries that default and the parent's props object keeps its own.
test('the strip assumes 300 px cards while the parent keeps 30 px rows, each in its own props object', () => {
  expect(HorizontalVirtualScroller.Class.propsDefaults.assumedSize).toBe(300);
  expect(VirtualScroller.Class.propsDefaults.assumedSize).toBe(30);
  expect(HorizontalVirtualScroller.Class.props.assumedSize).toMatchObject({ default: 300 });
  expect(VirtualScroller.Class.props.assumedSize).toMatchObject({ default: 30 });
  // Everything else is inherited whole.
  expect(Object.keys(HorizontalVirtualScroller.Class.props)).toEqual(
    Object.keys(VirtualScroller.Class.props)
  );
});

// domain-invariant: $HorizontalVirtualScroller — If the horizontal seams are read, then every one names the x axis: translateX, deltaX, padding-left, width and left, clientX along the track, the selection walks along x, and the browser may pan only y.
// invariant: Every axis dependency goes through a seam getter (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// invariant: The frame is never natively panned along its own axis (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// impossible-if-true: $HorizontalVirtualScroller — A horizontal scroller whose transform, thumb, or gesture reads the y axis.
test('every seam names the x axis', () => {
  const { instance, unmount } = strip(rows(3));
  expect(instance.probeTransform(-42)).toBe('translateX(-42px)');
  expect(instance.probeAxisDelta({ deltaX: 5, deltaY: 9 })).toBe(5);
  expect(instance.probePaddingProps()).toEqual(['padding-left', 'padding-right']);
  expect(instance.probeThumbProps()).toEqual(['width', 'left']);
  expect(Object.keys(instance.scrollbarThumbStyle)).toEqual(['width', 'left']);
  expect(instance.selectionAxis).toBe('x');
  expect(instance.frameTouchAction).toBe('pan-y');
  const scrolled = document.createElement('div');
  Object.defineProperty(scrolled, 'scrollLeft', { value: 12 });
  expect(instance.probeNativeOffset(scrolled)).toBe(12);
  expect(instance.probeContainerIsWidth()).toBe(true);
  const rect = { left: 100, width: 400, top: 0, height: 10 } as DOMRect;
  expect(instance.probeTrackFraction({ clientX: 300, clientY: 5 } as PointerEvent, rect)).toBe(0.5);
  unmount();
});

// invariant: A cross-axis touch belongs to the page (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a horizontal strip flags a downward touch for the page and keeps a sideways one', () => {
  const { instance, unmount } = strip(rows(3));
  instance.onTouchStartCapture(touch(100, 100));
  const downward = touch(104, 140);
  instance.onTouchMoveCapture(downward);
  expect(downward.lenisStopPropagation).toBe(true);

  instance.onTouchEndCapture();
  instance.onTouchStartCapture(touch(100, 100));
  const sideways = touch(140, 104);
  instance.onTouchMoveCapture(sideways);
  expect(sideways.lenisStopPropagation).toBeUndefined();
  unmount();
});
