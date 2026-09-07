/*
=== GENERATOR ===
Goal: Size the rows mounted beyond the visible window from the motion itself, so a flick never shows canvas and a resting list never carries a flick's pad.
[The transform lerps to the target over many frames](virtual-scroller.invariants.md#the-transform-lerps-to-the-target-over-many-frames)
[The pad covers the lerp gap exactly](virtual-scroller.invariants.md#the-pad-covers-the-lerp-gap-exactly)
[Lenis is read inside the walk never tracked](virtual-scroller.invariants.md#lenis-is-read-inside-the-walk-never-tracked)
[A pad never outlives its flick](virtual-scroller.invariants.md#a-pad-never-outlives-its-flick)
[A hosted capability reaches its owner through an interface](virtual-scroller.invariants.md#a-hosted-capability-reaches-its-owner-through-an-interface)
// domain-invariant: $VirtualScrollerPadding — If the content moves at a speed, then the rows ahead cover the distance it travels in the lookahead, rounded up and capped, and a crawl counts as still.
// domain-invariant: $VirtualScrollerPadding — If a pad is split, then the lookahead rows sit on the end the content moves toward and the gap rows on the end it comes from; at rest both ends carry the base.
// domain-invariant: $VirtualScrollerPadding — If a new reading arrives, then a higher level replaces the held one at once, a lower one never shrinks it while the content moves, rest shrinks it after the settle window, and a reversal drops it immediately.
Impossible if true: A pad that shrinks on the first frame of a flick's decay.

=== GENERATOR-DESCRIBED ===
The owner is a plain object of the four fields the pad reads; the walk
is a call to pad() with an explicit clock, so the hysteresis is a
sequence of readings, not a wait. Timers are faked for the settle
re-walk, and the settled version is read directly — in the scroller it
is read inside the window walk, which is what makes the bump rerun it.
*/

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { VirtualScrollerPadding } from './VirtualScrollerPadding';

const Logic = VirtualScrollerPadding.Class;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// domain-invariant: $VirtualScrollerPadding — If the content moves at a speed, then the rows ahead cover the distance it travels in the lookahead, rounded up and capped, and a crawl counts as still.
test('rows ahead cover the distance the content travels in the lookahead, rounded up and capped, and a crawl is still', () => {
  // 40 px/frame at 16.7 ms/frame over 250 ms ≈ 599 px; 40 px rows → 15 rows.
  expect(Logic.rowsAhead(40, 40)).toBe(15);
  expect(Logic.rowsAhead(-40, 40)).toBe(15);
  expect(Logic.rowsAhead(0.2, 40)).toBe(0);
  expect(Logic.rowsAhead(10_000, 40)).toBe(Logic.MAX_ROWS_AHEAD);
  expect(Logic.rowsAhead(40, 0)).toBe(0);
  expect(Logic.directionOf(3)).toBe(1);
  expect(Logic.directionOf(-3)).toBe(-1);
  expect(Logic.directionOf(0.1)).toBe(0);
});

// invariant: The pad covers the lerp gap exactly (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// invariant: The transform lerps to the target over many frames (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('rows behind cover the lerp gap exactly, rounded up and capped', () => {
  expect(Logic.rowsBehind(848, 56)).toBe(16);
  expect(Logic.rowsBehind(-848, 56)).toBe(16);
  expect(Logic.rowsBehind(0, 56)).toBe(0);
  expect(Logic.rowsBehind(1_000_000, 56)).toBe(Logic.MAX_ROWS_GAP);
});

// domain-invariant: $VirtualScrollerPadding — If a pad is split, then the lookahead rows sit on the end the content moves toward and the gap rows on the end it comes from; at rest both ends carry the base.
test('the split puts the lookahead rows ahead of the motion and the gap rows behind it', () => {
  expect(Logic.split(3, 12, 16, 1)).toEqual({ before: 19, after: 15 });
  expect(Logic.split(3, 12, 16, -1)).toEqual({ before: 15, after: 19 });
  expect(Logic.split(3, 12, 16, 0)).toEqual({ before: 3, after: 3 });
});

// domain-invariant: $VirtualScrollerPadding — If a new reading arrives, then a higher level replaces the held one at once, a lower one never shrinks it while the content moves, rest shrinks it after the settle window, and a reversal drops it immediately.
// impossible-if-true: $VirtualScrollerPadding — A pad that shrinks on the first frame of a flick's decay.
test('settle grows at once, holds through the decay, shrinks at rest after the settle window, and drops on a turn', () => {
  const start = { ahead: 0, direction: 0 as const, since: 0 };
  const grown = Logic.settle(start, 10, 1, 100);
  expect(grown).toEqual({ ahead: 10, direction: 1, since: 100 });
  // Lower readings while the content still moves keep the held level —
  // however long the decay tail runs — so no burst of unmounts lands mid-glide.
  expect(Logic.settle(grown, 4, 1, 101)).toBe(grown);
  expect(Logic.settle(grown, 4, 1, 100 + Logic.SETTLE_MS - 1)).toBe(grown);
  expect(Logic.settle(grown, 4, 1, 100 + Logic.SETTLE_MS * 5)).toBe(grown);
  // Rest inside the window still holds; rest once the window has passed shrinks.
  expect(Logic.settle(grown, 0, 0, 100 + Logic.SETTLE_MS - 1)).toBe(grown);
  expect(Logic.settle(grown, 0, 0, 100 + Logic.SETTLE_MS)).toEqual({
    ahead: 0,
    direction: 1,
    since: 100 + Logic.SETTLE_MS
  });
  // A reversal drops to the new reading immediately — the held rows face the wrong way.
  expect(Logic.settle(grown, 2, -1, 150)).toEqual({ ahead: 2, direction: -1, since: 150 });
});

// invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// invariant: Lenis is read inside the walk never tracked (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('pad() follows the lerp gap frame by frame and holds the lookahead across a decaying tail, reading the owner each call', () => {
  const owner = {
    halfPaddingQuantity: 3,
    scrollVelocity: 40,
    scrollGap: 800,
    estimatedItemSize: 40
  };
  const padding = new Logic(owner);
  // Flick: 20 rows of gap behind the target-anchored window, 15 of lookahead beyond it.
  expect(padding.pad(0)).toEqual({ before: 23, after: 18 });
  // The lerp converges: the gap shrinks at once, the lookahead is held.
  owner.scrollVelocity = 8;
  owner.scrollGap = 80;
  expect(padding.pad(100)).toEqual({ before: 5, after: 18 });
  // Still moving past the window: the lookahead is held, not shrunk mid-glide.
  owner.scrollGap = 0;
  expect(padding.pad(100 + Logic.SETTLE_MS)).toEqual({ before: 3, after: 18 });
  // At rest: the lookahead drops to the base.
  owner.scrollVelocity = 0;
  expect(padding.pad(200 + Logic.SETTLE_MS)).toEqual({ before: 3, after: 3 });
  // A flick back: everything mirrors.
  owner.scrollVelocity = -40;
  owner.scrollGap = -800;
  expect(padding.pad(1000)).toEqual({ before: 18, after: 23 });
  expect(padding.rowsAhead).toBe(15);
  expect(padding.before).toBe(18);
  expect(padding.after).toBe(23);
  padding.dispose();
});

// invariant: A pad never outlives its flick (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a walk that pads beyond the base arms one more walk after the settle window; a base walk arms nothing; dispose cancels', () => {
  const owner = { halfPaddingQuantity: 3, scrollVelocity: 40, scrollGap: 0, estimatedItemSize: 40 };
  const padding = new Logic(owner);
  expect(padding.settledVersion.value).toBe(0);
  padding.pad(0);
  vi.advanceTimersByTime(Logic.SETTLE_MS + 49);
  expect(padding.settledVersion.value).toBe(0);
  vi.advanceTimersByTime(1);
  expect(padding.settledVersion.value).toBe(1);

  // At rest the walk pads the base only, so no timer is armed.
  owner.scrollVelocity = 0;
  padding.pad(10_000);
  vi.advanceTimersByTime(Logic.SETTLE_MS + 100);
  expect(padding.settledVersion.value).toBe(1);

  // A flick, then dispose before the window: the bump never comes.
  owner.scrollVelocity = 40;
  padding.pad(20_000);
  padding.dispose();
  vi.advanceTimersByTime(Logic.SETTLE_MS + 100);
  expect(padding.settledVersion.value).toBe(1);
});
