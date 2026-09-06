// TouchSelectionGesture — the pure decisions of the long-press gesture.
// The timer and the listeners need a DOM; the two judgements they rest on
// do not, and they are what decides scroll-versus-select.
import { describe, expect, test } from 'vitest';
import { TouchSelectionGesture } from '../TouchSelectionGesture';

const Gesture = TouchSelectionGesture.Class;

describe('TouchSelectionGesture', () => {
  test('movement within the slop keeps the hold alive; past it, the gesture is a scroll', () => {
    expect(Gesture.exceedsSlop(0)).toBe(false);
    expect(Gesture.exceedsSlop(Gesture.SLOP_PX)).toBe(false);
    expect(Gesture.exceedsSlop(Gesture.SLOP_PX + 0.1)).toBe(true);
  });

  test('distance from the hold origin is straight-line, in either direction', () => {
    expect(Gesture.distanceFrom({ x: 10, y: 10 }, 13, 14)).toBe(5);
    expect(Gesture.distanceFrom({ x: 10, y: 10 }, 7, 6)).toBe(5);
    expect(Gesture.distanceFrom({ x: 10, y: 10 }, 10, 10)).toBe(0);
  });

  test('the knobs are the ones the gesture is built around', () => {
    expect(Gesture.LONG_PRESS_MS).toBeGreaterThan(300);
    expect(Gesture.SLOP_PX).toBeGreaterThan(0);
  });
});
