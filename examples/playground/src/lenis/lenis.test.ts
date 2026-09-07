/*
=== GENERATOR ===
Goal: Read a flick's velocity off the finger's last stretch of moves, so a touchend that lands after an idle frame still flicks at the finger's speed.
[The feel is one nested prop complete at every depth](../examples/virtual-scroller/virtual-scroller.invariants.md#the-feel-is-one-nested-prop-complete-at-every-depth)
// domain-invariant: trailVelocity — If the finger's trail holds two or more samples spanning a readable time, then the flick's velocity is the position change over that span scaled to a frame; otherwise it is the frame's own velocity.
Impossible if true: A flick that dies because the last animation frame before the touchend saw no move.

=== GENERATOR-DESCRIBED ===
The trail is the one thing the fork adds to touch inertia; the sync
lerp and the inertia multiplier are upstream Lenis.
*/

import { expect, test } from 'vitest';
import { FLICK_WINDOW_MS, trailVelocity, trimTrail } from './lenis';

// domain-invariant: trailVelocity — If the finger's trail holds two or more samples spanning a readable time, then the flick's velocity is the position change over that span scaled to a frame; otherwise it is the frame's own velocity.
// invariant: The feel is one nested prop complete at every depth (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('the flick velocity is read off the trail, and falls back to the frame velocity with too little trail', () => {
  const trail = [
    { at: 1000, position: 0 },
    { at: 1050, position: 100 },
    { at: 1100, position: 200 }
  ];
  // 200 px over 100 ms = 2 px/ms ≈ 33.4 px per 16.7 ms frame.
  expect(trailVelocity(trail, 0)).toBeCloseTo(33.4, 6);
  expect(trailVelocity([trail[0]], 7)).toBe(7);
  expect(trailVelocity([trail[0], { at: 1004, position: 50 }], 7)).toBe(7);
  expect(trailVelocity([], 3)).toBe(3);
});

// impossible-if-true: trailVelocity — A flick that dies because the last animation frame before the touchend saw no move.
test('an idle frame before the touchend does not zero the flick: the trail still spans the finger’s moves', () => {
  const trail = [
    { at: 1000, position: 0 },
    { at: 1030, position: 60 },
    { at: 1060, position: 120 }
  ];
  // The frame's own velocity read zero (no move in the last 16 ms); the trail says otherwise.
  expect(trailVelocity(trail, 0)).toBeGreaterThan(30);
  // The window drops what is older than FLICK_WINDOW_MS, so a pause mid-touch is not a flick.
  const paused = [{ at: 0, position: 0 }, { at: 50, position: 100 }, { at: 400, position: 100 }];
  trimTrail(paused, 400, FLICK_WINDOW_MS);
  expect(paused).toEqual([{ at: 400, position: 100 }]);
  expect(trailVelocity(paused, 0)).toBe(0);
});
