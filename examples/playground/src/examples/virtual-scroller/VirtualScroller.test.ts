/*
=== GENERATOR ===
Goal: Render a window of a few dozen rows over a list of any length, at the exact pixel the scroll names, with sizes learned as rows pass through.
[Rendered sizes are known only after a row mounts](virtual-scroller.invariants.md#rendered-sizes-are-known-only-after-a-row-mounts)
[The scroll position lands inside the scrollable range](virtual-scroller.invariants.md#the-scroll-position-lands-inside-the-scrollable-range)
[An unchanged window keeps its array identity](virtual-scroller.invariants.md#an-unchanged-window-keeps-its-array-identity)
[The two spacers and the rendered rows sum to the extent](virtual-scroller.invariants.md#the-two-spacers-and-the-rendered-rows-sum-to-the-extent)
[Rendered offsets are rebased by whole chunks](virtual-scroller.invariants.md#rendered-offsets-are-rebased-by-whole-chunks)
[A seek names an item not a pixel](virtual-scroller.invariants.md#a-seek-names-an-item-not-a-pixel)
[The thumb never shrinks below a grabbable fraction](virtual-scroller.invariants.md#the-thumb-never-shrinks-below-a-grabbable-fraction)
[A cross-axis touch belongs to the page](virtual-scroller.invariants.md#a-cross-axis-touch-belongs-to-the-page)
[Shrinking the list prunes the measurements at its new end](virtual-scroller.invariants.md#shrinking-the-list-prunes-the-measurements-at-its-new-end)
[The copied text is the string the row renders](virtual-scroller.invariants.md#the-copied-text-is-the-string-the-row-renders)
[The frame is never natively panned along its own axis](virtual-scroller.invariants.md#the-frame-is-never-natively-panned-along-its-own-axis)
[WebKit re-rasterizes the layer on every autoscroll write](virtual-scroller.invariants.md#webkit-re-rasterizes-the-layer-on-every-autoscroll-write)
// domain-invariant: $VirtualScroller — If the props object is read, then it is the fusion of the static types and defaults: the required list carries no default and the creep knob unset reads as the tuned cadence.
// domain-invariant: $VirtualScroller — If item i's position is asked, then it is the sum of the sizes before it, measured where known and the estimate elsewhere, whichever way the cursor walks there.
// domain-invariant: $VirtualScroller — If a pixel offset is asked for its item, then anchoring that item at the returned fraction gives the same pixel back.
// domain-invariant: $VirtualScroller — If the window changes, then itemsChanged fires once with the padded bounds; a scroll that keeps the window fires nothing.
// domain-invariant: $VirtualScroller — If the vertical seams are read, then they name the y axis: translateY and deltaY, and the frame lets the browser pan only the cross axis: pan-x.
// domain-invariant: $VirtualScroller — If a row before the window has a fractional size, then the leading spacer renders that fraction unrounded; only a landing snaps.
// domain-invariant: $VirtualScroller — If nudgePaint runs on WebKit, then the inner layer's will-change is cycled through auto with a layout read between; elsewhere it does nothing.
// domain-invariant: $VirtualScroller — If the frame scrolls natively, then the offset becomes a virtual scroll and the frame is zeroed; Lenis never adopts a native scroll on either axis.
Impossible if true: A rendered scroll position beyond the extent.
Impossible if true: An item outside the list with a position.
Impossible if true: A window whose spacers plus rows sum to anything but the extent.

=== GENERATOR-DESCRIBED ===
Every spec runs headless. The scroller is hosted in a throwaway component
(hosted.ts) so the constructor's hooks and watch land somewhere real, and
the DOM it cannot have is stubbed at its seams: a Probe subclass pins the
container size and re-exposes the protected seams, the same shape the
horizontal subclass uses to change axis. Lenis is never created, so the
padding class sees zero velocity and the window carries the base pad
only. Not covered here, by kind: the wheel lerp, the creep integrator and
the converge loop need a browser and are driven by the component sweep.
*/

import { nextTick, ref } from 'vue';
import { expect, test, vi } from 'vitest';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { VirtualScroller } from './VirtualScroller';
import { hosted } from './hosted';

type Row = VirtualScroller.BaseItem;

/**
 * The test double: the tuned class with its three DOM seams pinned to one
 * ref, and the protected seams re-exposed. A subclass, never a monkey
 * patch — the same shape the horizontal scroller uses to change axis.
 */
class $Probe extends (VirtualScroller.$Class as typeof VirtualScroller.$Class)<Row> {
  /** The pinned container size. (Not `frame` — that is the scroller's rAF handle.) */
  get frameSize() {
    return ref(100);
  }

  override get containerSize() {
    return this.frameSize;
  }

  override get containerOuterSize() {
    return this.frameSize;
  }

  protected override offsetSize(): number {
    return this.frameSize.value;
  }

  probeTransform(px: number) {
    return this.transformFor(px);
  }

  probeAxisDelta(data: { deltaX: number; deltaY: number }) {
    return this.axisDelta(data);
  }

  probeCreepMsPerPx() {
    return this.creepMsPerPx;
  }

  probeRenderBias() {
    return this.renderBias.value;
  }

  probeRenderBiasChunk() {
    return this.self.RENDER_BIAS_CHUNK;
  }

  probeTrailingCap() {
    return this.self.TRAILING_SPACER_RENDER_CAP;
  }

  probeIgnoresNativeScroll() {
    return this.lenisIgnoreNativeScroll;
  }

  /** The engine flag, pinned per test. */
  static override readonly IS_WEBKIT: boolean = false;
}

class $WebKitProbe extends $Probe {
  static override readonly IS_WEBKIT: boolean = true;
}

namespace WebKitProbe {
  export const $Class = Static($WebKitProbe);
  export let Class = Reactive($WebKitProbe) as unknown as typeof $WebKitProbe;
}

namespace Probe {
  export const $Class = Static($Probe);
  export let Class = Reactive($Probe) as unknown as typeof $Probe;
}

const rows = (count: number): Row[] =>
  Array.from({ length: count }, (_, index) => ({
    id: String(index),
    position: String(index + 1),
    body: `row ${index}`
  }));

function scroller(items: Row[], overrides: Partial<VirtualScroller.Props<Row>> = {}) {
  const emit = vi.fn();
  const props = {
    ...VirtualScroller.Class.propsDefaults,
    modelValue: items,
    ...overrides
  } as VirtualScroller.Props<Row>;
  const host = hosted(() => new Probe.Class(props, emit as unknown as VirtualScroller.Emits));
  return { ...host, emit, props };
}

/** A touch event as the capture handlers read it. */
const touch = (x: number, y: number) =>
  ({ touches: [{ clientX: x, clientY: y }] }) as unknown as TouchEvent & {
    lenisStopPropagation?: boolean;
  };

// domain-invariant: $VirtualScroller — If the props object is read, then it is the fusion of the static types and defaults: the required list carries no default and the creep knob unset reads as the tuned cadence.
test('the props object fuses every default into the types, leaves the required list without one, and the creep knob unset means the tuned cadence', () => {
  const props = VirtualScroller.Class.props;
  for (const [name, value] of Object.entries(VirtualScroller.Class.propsDefaults)) {
    if (value === undefined) continue;
    expect(props[name as keyof typeof props]).toMatchObject({ default: value });
  }
  expect(props.modelValue).toMatchObject({ required: true });
  expect(props.modelValue).not.toHaveProperty('default');
  expect(Object.keys(VirtualScroller.Class.emits)).toEqual(['itemsChanged', 'drop', 'move']);

  const tuned = scroller(rows(3));
  expect(tuned.instance.probeCreepMsPerPx()).toBe(150);
  const set = scroller(rows(3), { creepMsPerPx: 20 });
  expect(set.instance.probeCreepMsPerPx()).toBe(20);
  tuned.unmount();
  set.unmount();
});

// domain-invariant: $VirtualScroller — If item i's position is asked, then it is the sum of the sizes before it, measured where known and the estimate elsewhere, whichever way the cursor walks there.
// invariant: Rendered sizes are known only after a row mounts (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('an item’s position is the sum of the sizes before it, measured or assumed, and the same from either direction of the walk', () => {
  const { instance, unmount } = scroller(rows(10), { assumedSize: 30 });
  expect(instance.scrollExtent.value).toBe(300);
  expect(instance.getIndexPosition(4)).toBe(120);

  // Item 2 turns out to be 100 px tall: everything after it shifts by 70.
  instance.syncItemSize(2, 100);
  expect(instance.getIndexPosition(2)).toBe(60);
  expect(instance.getIndexPosition(3)).toBe(160);
  expect(instance.getIndexPosition(9)).toBe(340);
  expect(instance.scrollExtent.value).toBe(370);

  // Walking back from the far end lands on the same numbers as walking up.
  expect(instance.getIndexPosition(0)).toBe(0);
  expect(instance.getIndexPosition(3)).toBe(160);

  // Un-measuring restores the estimate.
  instance.syncItemSize(2, null as unknown as number);
  expect(instance.getIndexPosition(3)).toBe(90);
  unmount();
});

// impossible-if-true: $VirtualScroller — An item outside the list with a position.
test('no item outside the list has a position', () => {
  const { instance, unmount } = scroller(rows(5));
  expect(instance.getIndexPosition(-1)).toBeUndefined();
  expect(instance.getIndexPosition(5)).toBeUndefined();
  expect(instance.getAnchoredPosition(5)).toBeUndefined();
  unmount();
});

// domain-invariant: $VirtualScroller — If a pixel offset is asked for its item, then anchoring that item at the returned fraction gives the same pixel back.
test('the item under a pixel offset, anchored at its fraction, returns that pixel', () => {
  const { instance, unmount } = scroller(rows(10), { assumedSize: 30 });
  instance.syncItemSize(2, 100);
  for (const offset of [0, 29, 30, 75, 159, 160, 345]) {
    const at = instance.getIndexAtPosition(offset)!;
    expect(instance.getAnchoredPosition(at.index, at.fraction)).toBeCloseTo(offset, 6);
  }
  expect(instance.getIndexAtPosition(75)).toEqual({ index: 2, fraction: 0.15 });
  // Past the end: the last item, fully scrolled.
  expect(instance.getIndexAtPosition(10_000)).toEqual({ index: 9, fraction: 1 });
  unmount();
});

// invariant: A seek names an item not a pixel (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a ratio names an item plus a fraction inside it, and the end gap keeps the next item’s top clear of the viewport top', () => {
  const { instance, unmount } = scroller(rows(11), { assumedSize: 30 });
  expect(instance.getRatioPosition(0)).toBe(0);
  expect(instance.getRatioPosition(1)).toBe(300);
  // 0.5 × 10 = item 5 exactly.
  expect(instance.getRatioPosition(0.5)).toBe(150);
  // 0.55 × 10 = item 5 at half: 165 px. With a 20 px end gap the landing
  // may not pass 180 − 20 = 160.
  expect(instance.getRatioPosition(0.55)).toBe(165);
  expect(instance.getRatioPosition(0.55, 20)).toBe(160);
  unmount();
});

// invariant: An unchanged window keeps its array identity (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('the window covers the container from the item under the scroll top, padded on both ends, and keeps its identity while unchanged', () => {
  const { instance, unmount } = scroller(rows(100), { assumedSize: 30, paddingQuantity: 6 });
  // Container 100 px, rows 30 px: 4 rows cover it; half the pad (3) each side.
  const first = instance.visibleItems.value;
  expect(first.map((context) => context.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(instance.visibleIndex.value).toEqual({ start: 0, end: 8 });

  // Nothing moved: the same array comes back.
  expect(instance.visibleItems.value).toBe(first);

  instance.setScrollPosition(-300, false);
  const scrolled = instance.visibleItems.value;
  expect(scrolled[0].index).toBe(7);
  expect(scrolled.at(-1)!.index).toBe(17);
  expect(scrolled).not.toBe(first);
  unmount();
});

// domain-invariant: $VirtualScroller — If the window changes, then itemsChanged fires once with the padded bounds; a scroll that keeps the window fires nothing.
test('itemsChanged fires once per window change with the padded bounds, and not for a scroll that keeps the window', async () => {
  const { instance, emit, unmount } = scroller(rows(100), { assumedSize: 30 });
  instance.visibleItems.value;
  await nextTick();
  expect(emit).toHaveBeenLastCalledWith('itemsChanged', { start: 0, end: 8 });
  const calls = emit.mock.calls.length;

  instance.setScrollPosition(-10, false);
  instance.visibleItems.value;
  await nextTick();
  expect(emit.mock.calls.length).toBe(calls);

  instance.setScrollPosition(-300, false);
  instance.visibleItems.value;
  await nextTick();
  expect(emit).toHaveBeenLastCalledWith('itemsChanged', { start: 7, end: 18 });
  unmount();
});

// invariant: The two spacers and the rendered rows sum to the extent (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// impossible-if-true: $VirtualScroller — A window whose spacers plus rows sum to anything but the extent.
test('the two spacers and the rendered rows add up to the extent, and the trailing spacer renders capped', () => {
  const { instance, unmount } = scroller(rows(100), { assumedSize: 30 });
  instance.setScrollPosition(-300, false);
  const window = instance.visibleItems.value;
  const leading = parseFloat(instance.leadingSpacerPx);
  expect(leading).toBe(7 * 30);
  // The true trailing size is the rest of the content …
  const trailing = instance.scrollExtent.value - leading - window.length * 30;
  expect(trailing).toBe(3000 - 210 - 330);
  // … and the RENDERED trailing spacer is capped.
  expect(parseFloat(instance.trailingSpacerPx)).toBe(instance.probeTrailingCap());
  unmount();
});

// domain-invariant: $VirtualScroller — If a row before the window has a fractional size, then the leading spacer renders that fraction unrounded; only a landing snaps.
test('a fractional row above the window keeps the leading spacer fractional — a snapped spacer would hop the content at every window move', () => {
  const { instance, unmount } = scroller(rows(100), { assumedSize: 30 });
  instance.syncItemSize(1, 30.375);
  instance.setScrollPosition(-300, false);
  instance.visibleItems.value;
  // Row 1 is 0.375 px taller, so row 10 starts past 300 and the window starts a row earlier.
  expect(instance.leadingSpacerPx).toBe(`${5 * 30 + 30.375}px`);
  unmount();
});

// invariant: The scroll position lands inside the scrollable range (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// impossible-if-true: $VirtualScroller — A rendered scroll position beyond the extent.
test('a scroll position is clamped into the scrollable range, and a non-finite one is refused', () => {
  const { instance, unmount } = scroller(rows(10), { assumedSize: 30 });
  // 300 px of content, 100 px container: the range is 0..200.
  instance.setScrollPosition(-150, false);
  expect(instance.scrollPosition.value).toBe(150);
  instance.setScrollPosition(-5000, false);
  expect(instance.scrollPosition.value).toBe(200);
  instance.setScrollPosition(50, false);
  expect(instance.scrollPosition.value).toBe(0);
  instance.setScrollPosition(-150, false);
  instance.setScrollPosition(Number.NaN, false);
  expect(instance.scrollPosition.value).toBe(150);
  instance.setScrollPosition(-Infinity, false);
  expect(instance.scrollPosition.value).toBe(150);
  unmount();
});

// invariant: Rendered offsets are rebased by whole chunks (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('deep in the list the render bias rebases the leading spacer by whole chunks', () => {
  const { instance, unmount } = scroller(rows(100_000), { assumedSize: 30 });
  const chunk = instance.probeRenderBiasChunk();
  expect(instance.probeRenderBias()).toBe(0);
  instance.setScrollPosition(-(chunk * 3 + 10), false);
  // The bias is one chunk BELOW the current chunk, so the rendered
  // numbers stay small without ever going negative.
  expect(instance.probeRenderBias()).toBe(chunk * 2);
  instance.visibleItems.value;
  const firstIndex = instance.visibleIndex.value.start;
  expect(parseFloat(instance.leadingSpacerPx)).toBe(firstIndex * 30 - chunk * 2);
  unmount();
});

// invariant: The thumb never shrinks below a grabbable fraction (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('the thumb is the container’s share of the content with a floor, progress is the position’s share of the travel, and both render on the vertical axis', () => {
  const short = scroller(rows(3), { assumedSize: 30 });
  expect(short.instance.scrollbarThumbFraction).toBe(0);
  expect(short.instance.scrollbarVisible).toBe(false);
  short.unmount();

  const long = scroller(rows(10), { assumedSize: 30, scrollbar: true });
  expect(long.instance.scrollbarThumbFraction).toBeCloseTo(100 / 300, 6);
  long.instance.setScrollPosition(-100, false);
  expect(long.instance.scrollbarProgress).toBe(0.5);
  expect(long.instance.scrollbarThumbStyle).toEqual({
    height: `${(100 / 300) * 100}%`,
    top: `${0.5 * (1 - 100 / 300) * 100}%`
  });
  expect(long.instance.scrollbarVisible).toBe(true);
  long.unmount();

  const huge = scroller(rows(1_000_000), { assumedSize: 30 });
  expect(huge.instance.scrollbarThumbFraction).toBe(0.08);
  huge.unmount();
});

// invariant: Shrinking the list prunes the measurements at its new end (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('shrinking the list re-derives the extent over what remains, prunes the measurements at the new end, and parks the farther ones', async () => {
  const items = ref(rows(10));
  const emit = vi.fn();
  const props = {
    ...VirtualScroller.Class.propsDefaults,
    assumedSize: 30,
    get modelValue() {
      return items.value;
    }
  } as unknown as VirtualScroller.Props<Row>;
  const { instance, unmount } = hosted(
    () => new Probe.Class(props, emit as unknown as VirtualScroller.Emits)
  );
  instance.syncItemSize(5, 100);
  instance.syncItemSize(6, 100);
  instance.syncItemSize(9, 100);
  expect(instance.scrollExtent.value).toBe(510);

  items.value = rows(5);
  await nextTick();
  // Five 30 px items remain; nothing measured counts.
  expect(instance.scrollExtent.value).toBe(150);
  // 5 and 6 sit contiguous at the new end: dropped. 9 is parked …
  expect(instance.measuredSizes.value[5]).toBeUndefined();
  expect(instance.measuredSizes.value[6]).toBeUndefined();
  expect(instance.measuredSizes.value[9]).toBe(100);
  // … and resurrects when the list regrows over it.
  items.value = rows(10);
  await nextTick();
  expect(instance.scrollExtent.value).toBe(370);
  unmount();
});

// invariant: A cross-axis touch belongs to the page (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a vertical scroller flags a sideways touch for the page, keeps a downward one, and decides nothing under the threshold', () => {
  const { instance, unmount } = scroller(rows(3));
  instance.onTouchStartCapture(touch(100, 100));
  const undecided = touch(103, 104);
  instance.onTouchMoveCapture(undecided);
  expect(undecided.lenisStopPropagation).toBeUndefined();

  const sideways = touch(140, 104);
  instance.onTouchMoveCapture(sideways);
  expect(sideways.lenisStopPropagation).toBe(true);
  // The axis is decided once per touch: a later move along y is still the page's.
  const later = touch(140, 200);
  instance.onTouchMoveCapture(later);
  expect(later.lenisStopPropagation).toBe(true);

  instance.onTouchEndCapture();
  instance.onTouchStartCapture(touch(100, 100));
  const downward = touch(104, 140);
  instance.onTouchMoveCapture(downward);
  expect(downward.lenisStopPropagation).toBeUndefined();
  unmount();
});

// invariant: The copied text is the string the row renders (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('an unmounted row’s copy text falls back from the prop to the body to the id', () => {
  const items = [
    { id: 'first', position: '1', body: 'the body' },
    { id: 'second', position: '2' }
  ] as Row[];
  const plain = scroller(items);
  expect(plain.instance.rowText(0)).toBe('the body');
  expect(plain.instance.rowText(1)).toBe('second');
  expect(plain.instance.rowText(2)).toBe('');
  plain.unmount();

  const custom = scroller(items, { selectionText: (item) => `#${item.id}` });
  expect(custom.instance.rowText(0)).toBe('#first');
  custom.unmount();
});

// invariant: A seek names an item not a pixel (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('seeking to a fraction lands on the item that fraction names, flush to the start by default and centered when asked', () => {
  vi.useFakeTimers();
  const start = scroller(rows(11), { assumedSize: 30 });
  start.instance.scrollElement.value = document.createElement('div');
  start.instance.seekToFraction(0.5);
  expect(start.instance.scrollPosition.value).toBe(150);
  start.unmount();

  const center = scroller(rows(11), { assumedSize: 30, snapAlign: 'center' });
  center.instance.scrollElement.value = document.createElement('div');
  center.instance.seekToFraction(0.5);
  // Item 5 sits at 150; centering a 30 px item in a 100 px frame lifts it 35 px.
  expect(center.instance.scrollPosition.value).toBe(115);
  center.unmount();
  vi.useRealTimers();
});

// domain-invariant: $VirtualScroller — If the vertical seams are read, then they name the y axis: translateY and deltaY, and the frame lets the browser pan only the cross axis: pan-x.
// invariant: The frame is never natively panned along its own axis (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('the vertical seams read the y axis: translateY and deltaY', () => {
  const { instance, unmount } = scroller(rows(3));
  expect(instance.probeTransform(-42)).toBe('translateY(-42px)');
  expect(instance.probeAxisDelta({ deltaX: 5, deltaY: 9 })).toBe(9);
  expect(instance.frameTouchAction).toBe('pan-x');
  unmount();
});

// domain-invariant: $VirtualScroller — If nudgePaint runs on WebKit, then the inner layer's will-change is cycled through auto with a layout read between; elsewhere it does nothing.
// invariant: WebKit re-rasterizes the layer on every autoscroll write (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('the paint nudge cycles will-change on WebKit and is a no-op elsewhere', () => {
  const writes: string[] = [];
  const inner = document.createElement('div');
  Object.defineProperty(inner.style, 'willChange', {
    set: (value: string) => writes.push(value),
    get: () => writes.at(-1) ?? ''
  });
  const props = {
    ...VirtualScroller.Class.propsDefaults,
    modelValue: rows(3)
  } as VirtualScroller.Props<Row>;

  const chrome = hosted(() => new Probe.Class(props, vi.fn() as unknown as VirtualScroller.Emits));
  chrome.instance.scrollElementInner.value = inner;
  chrome.instance.nudgePaint();
  expect(writes).toEqual([]);
  chrome.unmount();

  const webkit = hosted(
    () => new WebKitProbe.Class(props, vi.fn() as unknown as VirtualScroller.Emits)
  );
  webkit.instance.scrollElementInner.value = inner;
  webkit.instance.nudgePaint();
  expect(writes).toEqual(['auto', 'transform']);
  webkit.unmount();
});

// domain-invariant: $VirtualScroller — If the frame scrolls natively, then the offset becomes a virtual scroll and the frame is zeroed; Lenis never adopts a native scroll on either axis.
// invariant: The frame is never natively panned along its own axis (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a native scroll of the frame is handed to the virtual scroll and zeroed, and Lenis is told never to adopt one', () => {
  const { instance, unmount } = scroller(rows(10), { assumedSize: 30 });
  expect(instance.probeIgnoresNativeScroll()).toBe(true);
  const frame = document.createElement('div');
  Object.defineProperty(frame, 'scrollTop', { value: 30, writable: true });
  instance.scrollElement.value = frame;
  const scrollBy = vi.spyOn(instance, 'scrollBy');
  instance.onScroll(new Event('scroll'));
  expect(frame.scrollTop).toBe(0);
  expect(scrollBy).toHaveBeenCalledWith(30);
  // At rest, a scroll event with nothing to hand over does nothing.
  instance.onScroll(new Event('scroll'));
  expect(scrollBy).toHaveBeenCalledTimes(1);
  unmount();
});
