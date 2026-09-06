// VirtualScrollerSelection — the pure half of text selection over a virtual
// list. Every spec here runs with no DOM: the range math and the text
// assembly are functions of their arguments, which is why they live on a
// Static capability class and not on the scroller.
import { describe, expect, test } from 'vitest';
import { VirtualScrollerSelection } from '../VirtualScrollerSelection';

const Logic = VirtualScrollerSelection.Class;
const at = (index: number, offset: number): VirtualScrollerSelection.Position => ({ index, offset });

describe('VirtualScrollerSelection', () => {
  test('normalize orders anchor and focus by index, then by offset — a backward drag is the same range', () => {
    expect(Logic.normalize(at(5, 3), at(2, 9))).toEqual({ start: at(2, 9), end: at(5, 3) });
    expect(Logic.normalize(at(2, 9), at(5, 3))).toEqual({ start: at(2, 9), end: at(5, 3) });
    expect(Logic.normalize(at(4, 8), at(4, 2))).toEqual({ start: at(4, 2), end: at(4, 8) });
  });

  test('an empty range is one where anchor and focus coincide', () => {
    expect(Logic.isEmpty(Logic.normalize(at(3, 3), at(3, 3)))).toBe(true);
    expect(Logic.isEmpty(Logic.normalize(at(3, 3), at(3, 4)))).toBe(false);
    expect(Logic.rowCount(Logic.normalize(at(10, 0), at(14, 5)))).toBe(5);
  });

  test('clampToWindow pins the ends to the mounted boundary rows and returns null when the range scrolled out', () => {
    const range = Logic.normalize(at(100, 7), at(300, 4));
    expect(Logic.clampToWindow(range, 120, 140, 30)).toEqual({ start: at(120, 0), end: at(140, 30) });
    expect(Logic.clampToWindow(range, 90, 110, 30)).toEqual({ start: at(100, 7), end: at(110, 30) });
    expect(Logic.clampToWindow(range, 290, 310, 30)).toEqual({ start: at(290, 0), end: at(300, 4) });
    expect(Logic.clampToWindow(range, 0, 50, 30)).toBeNull();
    expect(Logic.clampToWindow(range, 400, 450, 30)).toBeNull();
  });

  test('assembleText copies the first row from its offset, the last row to its offset, and every row between in full', () => {
    const textOf = (index: number) => `row ${index} body`;
    expect(Logic.assembleText(Logic.normalize(at(2, 4), at(2, 7)), textOf)).toBe('2 b');
    expect(Logic.assembleText(Logic.normalize(at(2, 4), at(5, 3)), textOf)).toBe('2 body\nrow 3 body\nrow 4 body\nrow');
  });

  test('assembleText reaches rows that were never mounted — it reads the data, not the DOM', () => {
    const mounted = new Set([0, 1, 2]);
    const seen: number[] = [];
    const textOf = (index: number) => {
      seen.push(index);
      return mounted.has(index) ? `dom ${index}` : `data ${index}`;
    };
    const text = Logic.assembleText(Logic.normalize(at(1, 0), at(4, 6)), textOf);
    expect(text).toBe('dom 1\ndom 2\ndata 3\ndata 4');
    expect(seen).toEqual([1, 2, 3, 4]);
  });

  test('assembleText joins rows with the given separator — a space for the chunks of a one-line marquee', () => {
    const textOf = (index: number) => `chunk${index}`;
    expect(Logic.assembleText(Logic.normalize(at(1, 2), at(3, 3)), textOf, ' ')).toBe('unk1 chunk2 chu');
  });

  test('autoscrollSpeed ramps from the edge minimum to the maximum and scales with the creep knob, clamped', () => {
    const min = Logic.AUTOSCROLL_MIN_PX_PER_MS;
    const max = Logic.AUTOSCROLL_MAX_PX_PER_MS;
    expect(Logic.autoscrollSpeed(0)).toBeCloseTo(min);
    expect(Logic.autoscrollSpeed(Logic.AUTOSCROLL_RAMP_PX)).toBeCloseTo(max);
    expect(Logic.autoscrollSpeed(10_000)).toBeCloseTo(max);
    expect(Logic.autoscrollSpeed(Logic.AUTOSCROLL_RAMP_PX / 2)).toBeCloseTo((min + max) / 2);
    expect(Logic.autoscrollSpeed(0, 2)).toBeCloseTo(min * 2);
    expect(Logic.autoscrollSpeed(0, 100)).toBeCloseTo(min * 3);
    expect(Logic.autoscrollSpeed(0, 0.01)).toBeCloseTo(min * 0.5);
  });
});
