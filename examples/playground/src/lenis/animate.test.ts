/*
=== GENERATOR ===
Goal: Move a value toward its target by lerp or easing, never faster than a cap the scroller sets from its motion knobs.
[The feel is one nested prop complete at every depth](../examples/virtual-scroller/virtual-scroller.invariants.md#the-feel-is-one-nested-prop-complete-at-every-depth)
// domain-invariant: Animate — If a speed cap is set, then no advance moves the value more than the cap times the elapsed time, a capped frame is never the last, and the value still arrives; at zero the cap is off.
Impossible if true: A wheel scroll under a cap that jumps further in one frame than the cap allows.

=== GENERATOR-DESCRIBED ===
The cap is the one thing the fork adds to Animate; the lerp and the
easing are upstream Lenis and are not re-proven here.
*/

import { expect, test } from 'vitest';
import { Animate } from './animate';

// domain-invariant: Animate — If a speed cap is set, then no advance moves the value more than the cap times the elapsed time, a capped frame is never the last, and the value still arrives; at zero the cap is off.
// invariant: The feel is one nested prop complete at every depth (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a capped lerp moves at most cap × elapsed per frame, keeps running while capped, and still arrives', () => {
  const capped = new Animate();
  const seen: Array<[number, boolean]> = [];
  capped.fromTo(0, 1000, { lerp: 1, maxPxPerMs: 1, onUpdate: (value, done) => seen.push([value, done]) });
  capped.advance(0.016);
  expect(seen[0]).toEqual([16, false]);
  for (let frame = 0; frame < 200 && capped.isRunning; frame++) capped.advance(0.016);
  expect(capped.value).toBe(1000);
  expect(seen[seen.length - 1][1]).toBe(true);
  expect(seen.length).toBeGreaterThan(60);

  // Uncapped, the same lerp's first frame moves far more than the cap allowed.
  const free = new Animate();
  free.fromTo(0, 1000, { lerp: 1, maxPxPerMs: 0 });
  free.advance(0.016);
  expect(free.value).toBeGreaterThan(600);
});

// impossible-if-true: Animate — A wheel scroll under a cap that jumps further in one frame than the cap allows.
test('no capped frame ever exceeds cap × elapsed, whatever the lerp or the easing asks for', () => {
  for (const options of [{ lerp: 1 }, { duration: 0.001, easing: (t: number) => t }]) {
    const animate = new Animate();
    let previous = 0;
    let largest = 0;
    animate.fromTo(0, 5000, {
      ...options,
      maxPxPerMs: 2,
      onUpdate: (value) => {
        largest = Math.max(largest, Math.abs(value - previous));
        previous = value;
      }
    });
    for (let frame = 0; frame < 500 && animate.isRunning; frame++) animate.advance(0.016);
    expect(largest).toBeLessThanOrEqual(2 * 16 + 1e-9);
    expect(animate.value).toBe(5000);
  }
});
