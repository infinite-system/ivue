// VirtualScrollerPadding — the pure half of adaptive render padding. Every
// spec runs with no DOM: velocity to rows, the split by direction, and the
// settle rule are functions of their arguments.
import { describe, expect, test } from 'vitest';
import { VirtualScrollerPadding } from '../VirtualScrollerPadding';

const Logic = VirtualScrollerPadding.Class;

describe('VirtualScrollerPadding', () => {
  test('rows ahead cover the distance the content travels in the lookahead, rounded up and capped', () => {
    // 40 px/frame at 16.7 ms/frame over 250 ms ≈ 599 px; 40 px rows → 15 rows.
    expect(Logic.rowsAhead(40, 40)).toBe(15);
    expect(Logic.rowsAhead(-40, 40)).toBe(15);
    expect(Logic.rowsAhead(0.2, 40)).toBe(0);
    expect(Logic.rowsAhead(10_000, 40)).toBe(Logic.MAX_ROWS_AHEAD);
    expect(Logic.rowsAhead(40, 0)).toBe(0);
  });

  test('direction follows the sign of the velocity, and a crawl counts as still', () => {
    expect(Logic.directionOf(3)).toBe(1);
    expect(Logic.directionOf(-3)).toBe(-1);
    expect(Logic.directionOf(0.1)).toBe(0);
  });

  test('rows behind cover the lerp gap exactly, rounded up and capped', () => {
    expect(Logic.rowsBehind(848, 56)).toBe(16);
    expect(Logic.rowsBehind(-848, 56)).toBe(16);
    expect(Logic.rowsBehind(0, 56)).toBe(0);
    expect(Logic.rowsBehind(1_000_000, 56)).toBe(Logic.MAX_ROWS_GAP);
  });

  test('the split puts the lookahead rows ahead of the motion and the gap rows behind it', () => {
    expect(Logic.split(3, 12, 16, 1)).toEqual({ before: 19, after: 15 });
    expect(Logic.split(3, 12, 16, -1)).toEqual({ before: 15, after: 19 });
    expect(Logic.split(3, 12, 16, 0)).toEqual({ before: 3, after: 3 });
  });

  test('settle grows at once, shrinks only after SETTLE_MS, and drops on a turn', () => {
    const start = { ahead: 0, direction: 0 as const, since: 0 };
    const grown = Logic.settle(start, 10, 1, 100);
    expect(grown).toEqual({ ahead: 10, direction: 1, since: 100 });
    // A lower reading inside the settle window keeps the held level.
    expect(Logic.settle(grown, 4, 1, 100 + Logic.SETTLE_MS - 1)).toBe(grown);
    // Once the window passes, the lower reading takes over.
    expect(Logic.settle(grown, 4, 1, 100 + Logic.SETTLE_MS)).toEqual({
      ahead: 4,
      direction: 1,
      since: 100 + Logic.SETTLE_MS
    });
    // A reversal drops to the new reading immediately — the held rows face the wrong way.
    expect(Logic.settle(grown, 2, -1, 150)).toEqual({ ahead: 2, direction: -1, since: 150 });
    // Coming to rest keeps the direction the rows already face.
    expect(Logic.settle(grown, 0, 0, 100 + Logic.SETTLE_MS)).toEqual({
      ahead: 0,
      direction: 1,
      since: 100 + Logic.SETTLE_MS
    });
  });

  test('pad() follows the lerp gap frame by frame and holds the lookahead across a decaying tail', () => {
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
    // Settled: the lookahead drops to the reading.
    owner.scrollGap = 0;
    expect(padding.pad(100 + Logic.SETTLE_MS)).toEqual({ before: 3, after: 6 });
    // A flick back: everything mirrors.
    owner.scrollVelocity = -40;
    owner.scrollGap = -800;
    expect(padding.pad(1000)).toEqual({ before: 18, after: 23 });
    expect(padding.rowsAhead).toBe(15);
  });
});
