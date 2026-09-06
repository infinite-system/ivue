/*
=== GENERATOR ===
Goal: Report one rendered row's real size to the scroller twice — on the way into the window and on the way out — in layout pixels whatever the ancestor scale.
[An item captures its size once in and once out](virtual-scroller.invariants.md#an-item-captures-its-size-once-in-and-once-out)
// domain-invariant: $VirtualScrollerItem — If the row is captured under an ancestor transform scale, then the reported size is the rect divided by that scale: layout pixels, not screen pixels.
// domain-invariant: $VirtualScrollerItem — If the axis prop is x, then the capture reads the rect's width; otherwise its height; the row index is the 1-based aria-rowindex.
Impossible if true: A size report while no element is attached.

=== GENERATOR-DESCRIBED ===
jsdom lays nothing out, so the element and its parent are objects with
the two rect readers the capture uses. The item is hosted (hosted.ts) so
its two hooks fire for real: the mount capture and the unmount capture
are counted, not assumed.
*/

import { expect, test, vi } from 'vitest';
import { VirtualScrollerItem } from './VirtualScrollerItem';
import { hosted } from './hosted';

/** A row element with a parent, as the capture reads them. */
function fakeRow(options: {
  width: number;
  height: number;
  parentLayout: number;
  parentRect: number;
}) {
  const parent = {
    offsetWidth: options.parentLayout,
    offsetHeight: options.parentLayout,
    getBoundingClientRect: () => ({ width: options.parentRect, height: options.parentRect })
  };
  return {
    parentElement: parent,
    getBoundingClientRect: () => ({ width: options.width, height: options.height })
  } as unknown as HTMLElement;
}

function item(axis: 'x' | 'y', element: HTMLElement | null) {
  const emit = vi.fn();
  const host = hosted(() => {
    const instance = new VirtualScrollerItem.Class({ index: 4, axis }, emit);
    instance.element.value = element;
    return instance;
  });
  return { ...host, emit };
}

// invariant: An item captures its size once in and once out (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('the size is reported once on mount and once on unmount, and never in between', () => {
  const { emit, unmount } = item(
    'y',
    fakeRow({ width: 300, height: 48, parentLayout: 100, parentRect: 100 })
  );
  expect(emit).toHaveBeenCalledTimes(1);
  expect(emit).toHaveBeenLastCalledWith('sizeUpdated', 48);
  unmount();
  expect(emit).toHaveBeenCalledTimes(2);
  expect(emit).toHaveBeenLastCalledWith('sizeUpdated', 48);
});

// domain-invariant: $VirtualScrollerItem — If the row is captured under an ancestor transform scale, then the reported size is the rect divided by that scale: layout pixels, not screen pixels.
test('under a half-scale ancestor the reported size is the rect doubled back to layout pixels', () => {
  const { emit, unmount } = item(
    'y',
    fakeRow({ width: 300, height: 24, parentLayout: 200, parentRect: 100 })
  );
  expect(emit).toHaveBeenLastCalledWith('sizeUpdated', 48);
  unmount();
});

// domain-invariant: $VirtualScrollerItem — If the axis prop is x, then the capture reads the rect's width; otherwise its height; the row index is the 1-based aria-rowindex.
test('a horizontal item reports its width, a vertical one its height, and the row index is one-based', () => {
  const sideways = item(
    'x',
    fakeRow({ width: 300, height: 48, parentLayout: 100, parentRect: 100 })
  );
  expect(sideways.emit).toHaveBeenLastCalledWith('sizeUpdated', 300);
  expect(sideways.instance.isHorizontal).toBe(true);
  expect(sideways.instance.rowIndex).toBe(5);
  sideways.unmount();

  const upright = item(
    'y',
    fakeRow({ width: 300, height: 48, parentLayout: 100, parentRect: 100 })
  );
  expect(upright.instance.isHorizontal).toBe(false);
  expect(VirtualScrollerItem.Class.props.axis).toMatchObject({ default: 'y' });
  upright.unmount();
});

// impossible-if-true: $VirtualScrollerItem — A size report while no element is attached.
test('no element, no report', () => {
  const { emit, unmount } = item('y', null);
  unmount();
  expect(emit).not.toHaveBeenCalled();
});
