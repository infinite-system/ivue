/*
=== GENERATOR ===
Goal: Size the rows mounted beyond the visible window from the motion itself, so a flick never shows canvas and a resting list never carries a flick's pad.
[The transform lerps to the target over many frames](virtual-scroller.invariants.md#the-transform-lerps-to-the-target-over-many-frames)
[The pad covers the lerp gap exactly](virtual-scroller.invariants.md#the-pad-covers-the-lerp-gap-exactly)
[Lenis is read inside the walk never tracked](virtual-scroller.invariants.md#lenis-is-read-inside-the-walk-never-tracked)
[A pad is released when the reader moves, never at rest](virtual-scroller.invariants.md#a-pad-is-released-when-the-reader-moves-never-at-rest)
[A hosted capability reaches its owner through an interface](virtual-scroller.invariants.md#a-hosted-capability-reaches-its-owner-through-an-interface)
// domain-invariant: $VirtualScrollerPadding — If the content moves at a speed, then the rows ahead cover the distance it travels in the lookahead, rounded up and capped, and a crawl counts as still.
// domain-invariant: $VirtualScrollerPadding — If a pad is split, then the lookahead rows sit on the end the content moves toward and the gap rows on the end it comes from; at rest both ends carry the base.
// domain-invariant: $VirtualScrollerPadding — If a new reading arrives, then a higher level — rows ahead or rows behind — raises the held one at once, a lower one is released only on a frame the content is MOVING and only after the settle window, and a reversal turns the direction and keeps the levels.
Impossible if true: A pad that shrinks on the first frame of a flick's decay.
Impossible if true: Rows released while the reader sits still, so the only thing that moves on screen is the layout settling under them.
Impossible if true: Gap rows trimmed while the lerp still travels.

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
  // Speeds are px per MILLISECOND, so the same reading means the same pad on
  // a 60 Hz display and a 120 Hz one. 40 px per 16.7 ms frame is 2.395 px/ms,
  // which over the 250 ms lookahead is ≈ 599 px; 40 px rows → 15 rows.
  const perFrame = (px: number) => px / 16.7;
  expect(Logic.rowsAhead(perFrame(40), 40)).toBe(15);
  expect(Logic.rowsAhead(perFrame(-40), 40)).toBe(15);
  expect(Logic.rowsAhead(perFrame(0.2), 40)).toBe(0);
  expect(Logic.rowsAhead(10_000, 40)).toBe(Logic.MAX_ROWS_AHEAD);
  expect(Logic.rowsAhead(perFrame(40), 0)).toBe(0);
  expect(Logic.directionOf(perFrame(3))).toBe(1);
  expect(Logic.directionOf(perFrame(-3))).toBe(-1);
  expect(Logic.directionOf(perFrame(0.1))).toBe(0);
});

// invariant: The pad covers the lerp gap exactly (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// invariant: The transform lerps to the target over many frames (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('rows behind cover the lerp gap exactly, rounded up and capped', () => {
  expect(Logic.rowsBehind(848, 56)).toBe(16);
  expect(Logic.rowsBehind(-848, 56)).toBe(16);
  expect(Logic.rowsBehind(0, 56)).toBe(0);
  // the lerp's settle band: a sub-pixel gap is rest, not one more row
  expect(Logic.rowsBehind(0.4, 56)).toBe(0);
  expect(Logic.rowsBehind(1, 56)).toBe(1);
  expect(Logic.rowsBehind(1_000_000, 56)).toBe(Logic.MAX_ROWS_GAP);
});

// domain-invariant: $VirtualScrollerPadding — If a pad is split, then the lookahead rows sit on the end the content moves toward and the gap rows on the end it comes from; at rest both ends carry the base.
test('the split puts the lookahead rows ahead of the motion and the gap rows behind it', () => {
  expect(Logic.split(3, 12, 16, 1)).toEqual({ before: 19, after: 15 });
  expect(Logic.split(3, 12, 16, -1)).toEqual({ before: 15, after: 19 });
  expect(Logic.split(3, 12, 16, 0)).toEqual({ before: 3, after: 3 });
});

// domain-invariant: $VirtualScrollerPadding — If a new reading arrives, then a higher level — rows ahead or rows behind — raises the held one at once, a lower one is released only on a frame the content is MOVING and only after the settle window, and a reversal turns the direction and keeps the levels.
// impossible-if-true: $VirtualScrollerPadding — A pad that shrinks on the first frame of a flick's decay.
// impossible-if-true: $VirtualScrollerPadding — Gap rows trimmed while the lerp still travels.
// impossible-if-true: $VirtualScrollerPadding — Rows released while the reader sits still, so the only thing that moves on screen is the layout settling under them.
// invariant: A pad is released when the reader moves, never at rest (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('settle grows at once, holds through the decay, releases only while moving, and keeps its rows through a turn', () => {
  const start = { ahead: 0, behind: 0, gapPx: 0, direction: 0 as const, since: 0 };
  const grown = Logic.settle(start, 10, 20, 800, 1, 100);
  expect(grown).toEqual({ ahead: 10, behind: 20, gapPx: 800, direction: 1, since: 100 });
  // Lower readings inside the settle window keep the held level — however
  // long the decay tail runs — so no burst of unmounts lands mid-glide.
  // The gap rows are held the same way: the lerp closing its gap trims nothing.
  expect(Logic.settle(grown, 4, 12, 480, 1, 101)).toBe(grown);
  expect(Logic.settle(grown, 4, 2, 80, 1, 100 + Logic.SETTLE_MS - 1)).toBe(grown);
  // One side growing raises that side and keeps the others' levels.
  expect(Logic.settle(grown, 12, 5, 200, 1, 120)).toEqual({
    ahead: 12,
    behind: 20,
    gapPx: 800,
    direction: 1,
    since: 120
  });
  // A still reading inside the window still holds; past the window it
  // releases to the base. The walk runs on a position change and nothing
  // forces one at rest, so this lands on the last frame that moved.
  expect(Logic.settle(grown, 0, 0, 0, 0, 100 + Logic.SETTLE_MS - 1)).toBe(grown);
  expect(Logic.settle(grown, 0, 0, 0, 0, 100 + Logic.SETTLE_MS)).toEqual({
    ahead: 0,
    behind: 0,
    gapPx: 0,
    direction: 1,
    since: 100 + Logic.SETTLE_MS
  });
  // A reversal turns the direction and keeps the levels — unmounting the rows held the
  // old way would land on the very frame the finger reversed; the next moving
  // frame past the window releases them.
  expect(Logic.settle(grown, 2, 3, 120, -1, 150)).toEqual({
    ahead: 10,
    behind: 20,
    gapPx: 800,
    direction: -1,
    since: 150
  });
});

// invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// invariant: Lenis is read inside the walk never tracked (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('pad() holds the gap rows and the lookahead across a decaying tail and through rest, releasing only when the reader moves again', () => {
  const owner = {
    halfPaddingQuantity: 3,
    scrollVelocity: 40 / 16.7, // px per ms: the 40 px/frame this was tuned at
    scrollGap: 800,
    estimatedItemSize: 40
  };
  const padding = new Logic(owner);
  // Flick: 20 rows of gap behind the target-anchored window, 15 of lookahead beyond it.
  expect(padding.pad(0)).toEqual({ before: 23, after: 18 });
  // The lerp converges: neither the gap rows nor the lookahead shrink mid-glide.
  owner.scrollVelocity = 8 / 16.7;
  owner.scrollGap = 80;
  expect(padding.pad(100)).toEqual({ before: 23, after: 18 });
  // Still inside the settle window: both held, nothing unmounts in the tail.
  owner.scrollGap = 0;
  expect(padding.pad(Logic.SETTLE_MS - 1)).toEqual({ before: 23, after: 18 });
  // The tail goes still: the release happens HERE, on the last frame the
  // position changed, and nothing forces another walk afterwards — so it
  // lands while the layer is still moving, where its layout residual cannot
  // be seen.
  owner.scrollVelocity = 0;
  expect(padding.pad(Logic.SETTLE_MS * 5)).toEqual({ before: 3, after: 3 });
  // A flick back: everything mirrors.
  owner.scrollVelocity = -40 / 16.7;
  owner.scrollGap = -800;
  expect(padding.pad(1000)).toEqual({ before: 18, after: 23 });
  expect(padding.rowsAhead).toBe(15);
  expect(padding.rowsBehind).toBe(20);
  // the held gap in px sits on the end side of a flick back, nothing on the start side
  expect(padding.gapEndPx).toBe(800);
  expect(padding.gapStartPx).toBe(0);
  expect(padding.before).toBe(18);
  expect(padding.after).toBe(23);
});
