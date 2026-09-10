/*
=== GENERATOR ===
Goal: Move a value toward its target by lerp or easing, never faster than a cap the scroller sets from its motion knobs.
[The feel is one nested prop complete at every depth](../examples/virtual-scroller/virtual-scroller.invariants.md#the-feel-is-one-nested-prop-complete-at-every-depth)
// domain-invariant: $Animate — If a running lerp is shifted, then its origin, value and target move by the shift and the remaining distance stays what it was
// domain-invariant: $Animate — If a speed cap is set, then no advance moves the value more than the cap times the elapsed time, a capped frame is never the last, and the value still arrives; at zero the cap is off.
// domain-invariant: $Animate — If a lerp comes within half a pixel of its target, then it snaps to the target and completes, whether the target is an integer or not
[A lerp completes within half a pixel of any target](./lenis.invariants.md#a-lerp-completes-within-half-a-pixel-of-any-target)
Impossible if true: A wheel scroll under a cap that jumps further in one frame than the cap allows.
Impossible if true: A lerp toward a fractional target that never completes.

=== GENERATOR-DESCRIBED ===
The cap is the one thing the fork adds to Animate; the lerp and the
easing are upstream Lenis and are not re-proven here.
*/

import { expect, test } from 'vitest';
import { Animate } from './Animate';

// domain-invariant: $Animate — If a speed cap is set, then no advance moves the value more than the cap times the elapsed time, a capped frame is never the last, and the value still arrives; at zero the cap is off.
// invariant: The feel is one nested prop complete at every depth (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a capped lerp moves at most cap × elapsed per frame, keeps running while capped, and still arrives', () => {
  const capped = new Animate.Class();
  const seen: Array<[number, boolean]> = [];
  capped.fromTo(0, 1000, { lerp: 1, maxPxPerMs: 1, onUpdate: (value, done) => seen.push([value, done]) });
  capped.advance(0.016);
  expect(seen[0]).toEqual([16, false]);
  for (let frame = 0; frame < 200 && capped.isRunning; frame++) capped.advance(0.016);
  expect(capped.value).toBe(1000);
  expect(seen[seen.length - 1][1]).toBe(true);
  expect(seen.length).toBeGreaterThan(60);

  // Uncapped, the same lerp's first frame moves far more than the cap allowed.
  const free = new Animate.Class();
  free.fromTo(0, 1000, { lerp: 1, maxPxPerMs: 0 });
  free.advance(0.016);
  expect(free.value).toBeGreaterThan(600);
});

// impossible-if-true: $Animate — A wheel scroll under a cap that jumps further in one frame than the cap allows.
test('no capped frame ever exceeds cap × elapsed, whatever the lerp or the easing asks for', () => {
  for (const options of [{ lerp: 1 }, { duration: 0.001, easing: (t: number) => t }]) {
    const animate = new Animate.Class();
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

// domain-invariant: $Animate — If a running lerp is shifted, then its origin, value and target move by the shift and the remaining distance stays what it was
test('a shifted lerp keeps its remaining distance and arrives at the shifted target', () => {
  const animate = new Animate.Class();
  animate.fromTo(0, 100, { lerp: 0.1 });
  animate.advance(1 / 60);
  const remaining = animate.to - animate.value;
  animate.shift(250);
  expect(animate.to).toBe(350);
  expect(animate.from).toBe(250);
  expect(animate.to - animate.value).toBeCloseTo(remaining, 6);
  for (let frame = 0; frame < 400 && animate.isRunning; frame++) animate.advance(1 / 60);
  expect(animate.value).toBe(350);
});


// domain-invariant: $Animate — If a lerp comes within half a pixel of its target, then it snaps to the target and completes, whether the target is an integer or not
// impossible-if-true: $Animate — A lerp toward a fractional target that never completes.
// invariant: A lerp completes within half a pixel of any target (examples/playground/src/lenis/lenis.invariants.md)
test('a lerp toward a fractional target completes and snaps to it', () => {
  const fractional = new Animate.Class();
  let done = false;
  fractional.fromTo(0, 518.2035169397, { lerp: 0.1, onUpdate: (_value, completed) => (done = completed) });
  for (let frame = 0; frame < 400 && fractional.isRunning; frame++) fractional.advance(0.016);
  expect(fractional.isRunning).toBe(false);
  expect(done).toBe(true);
  expect(fractional.value).toBe(518.2035169397);

  // an integer target completes in the same band, as upstream's round test did
  const integer = new Animate.Class();
  integer.fromTo(0, 600, { lerp: 0.1 });
  for (let frame = 0; frame < 400 && integer.isRunning; frame++) integer.advance(0.016);
  expect(integer.isRunning).toBe(false);
  expect(integer.value).toBe(600);
});
