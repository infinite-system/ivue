/*
=== GENERATOR ===
Goal: The pure maths the fork's lerp, clamp and infinite mode run on, and the debounce its resize observers ride — statics with no state.
[A finger's swipe becomes the glide it meant, on every phone](lenis.invariants.md#a-fingers-swipe-becomes-the-glide-it-meant-on-every-phone)
// domain-invariant: $LenisUtils — If damp is advanced, then the value closes 1 − e^(−λ·dt) of the gap, so two half steps equal one whole step; clamp holds the bounds; modulo keeps the divisor's sign; debounce runs once, after the last call, with that call's arguments.
Impossible if true: A damp that depends on the frame rate. A modulo of a negative dividend that comes out negative.

=== GENERATOR-DESCRIBED ===
Upstream Lenis's maths and debounce, ported as statics on one class so
the fork has no free functions; the spec pins the frame-rate independence
the glide's feel rests on.
*/

import { expect, test, vi } from 'vitest';
import { LenisUtils } from './LenisUtils';

const { clamp, truncate, lerp, damp, modulo, debounce } = LenisUtils.Class;

// domain-invariant: $LenisUtils — If damp is advanced, then the value closes 1 − e^(−λ·dt) of the gap, so two half steps equal one whole step; clamp holds the bounds; modulo keeps the divisor's sign; debounce runs once, after the last call, with that call's arguments.
// invariant: A finger's swipe becomes the glide it meant, on every phone (examples/playground/src/lenis/lenis.invariants.md)
test('damp is frame-rate independent: two half steps land where one whole step lands', () => {
  const whole = damp(0, 1000, 6, 0.032);
  const half = damp(damp(0, 1000, 6, 0.016), 1000, 6, 0.016);
  expect(half).toBeCloseTo(whole, 9);
  expect(damp(0, 1000, 6, 1 / 60)).toBeCloseTo(1000 * (1 - Math.exp(-0.1)), 9);
  expect(lerp(10, 20, 0.25)).toBe(12.5);
  expect(clamp(0, -5, 10)).toBe(0);
  expect(clamp(0, 15, 10)).toBe(10);
  expect(clamp(0, 5, 10)).toBe(5);
  expect(truncate(3.14159, 2)).toBe(3.14);
});

// impossible-if-true: $LenisUtils — A damp that depends on the frame rate. A modulo of a negative dividend that comes out negative.
test('modulo keeps the divisor’s sign, and debounce runs once after the last call with its arguments and this', () => {
  expect(modulo(-1, 10)).toBe(9);
  expect(modulo(11, 10)).toBe(1);
  vi.useFakeTimers();
  const seen: Array<{ context: unknown; args: number[] }> = [];
  const debounced = debounce(function (this: unknown, ...args: number[]) {
    seen.push({ context: this, args });
  }, 100);
  const context = { tag: 'owner' };
  debounced.call(context, 1);
  debounced.call(context, 2);
  vi.advanceTimersByTime(99);
  expect(seen).toHaveLength(0);
  vi.advanceTimersByTime(1);
  expect(seen).toEqual([{ context, args: [2] }]);
  vi.useRealTimers();
});
