/*
=== GENERATOR ===
Goal: Read a flick's velocity off the finger's last stretch of moves, so a touchend that lands after an idle frame still flicks at the finger's speed.
[A flick's velocity is read off the finger's last stretch](lenis.invariants.md#a-flicks-velocity-is-read-off-the-fingers-last-stretch)
[Android holds the first move back and may coalesce a swipe into one](lenis.invariants.md#android-holds-the-first-move-back-and-may-coalesce-a-swipe-into-one)
// domain-invariant: trailVelocity — If the finger's trail holds two or more samples spanning a readable time, then the flick's velocity is the position change over that span scaled to a frame; otherwise it is the frame's own velocity.
Impossible if true: A flick that dies because the last animation frame before the touchend saw no move.

=== GENERATOR-DESCRIBED ===
The trail is the one thing the fork adds to touch inertia; the sync
lerp and the inertia multiplier are upstream Lenis.
*/

import { expect, test } from 'vitest';
import { FLICK_WINDOW_MS, trailVelocity, trimTrail } from './lenis';

// domain-invariant: trailVelocity — If the finger's trail holds two or more samples spanning a readable time, then the flick's velocity is the position change over that span scaled to a frame; otherwise it is the frame's own velocity.
// invariant: A flick's velocity is read off the finger's last stretch (examples/playground/src/lenis/lenis.invariants.md)
test('the flick velocity is read off the trail, and falls back to the frame velocity with too little trail', () => {
  const trail = [
    { at: 1000, position: 0 },
    { at: 1050, position: 100 },
    { at: 1100, position: 200 }
  ];
  // 200 px over 100 ms = 2 px/ms ≈ 33.4 px per 16.7 ms frame.
  expect(trailVelocity(trail, 0)).toBeCloseTo(33.4, 6);
  // A span longer than the window reads as the window.
  expect(trailVelocity([{ at: 0, position: 0 }, { at: 400, position: 200 }], 0)).toBeCloseTo(33.4, 6);
  expect(trailVelocity([trail[0]], 7)).toBe(7);
  expect(trailVelocity([trail[0], { at: 1004, position: 50 }], 7)).toBe(7);
  expect(trailVelocity([], 3)).toBe(3);
});

// impossible-if-true: trailVelocity — A flick that dies because the last animation frame before the touchend saw no move.
// invariant: Android holds the first move back and may coalesce a swipe into one (examples/playground/src/lenis/lenis.invariants.md)
test('a re-flick Android coalesced into one touchmove still flicks: the touchstart seeds the trail, so one move has a span', () => {
  // The log from the phone: touchstart at 10.99 s, one touchmove 190 ms
  // later carrying 194 px, touchend 10 ms after; the frame velocity was
  // zero since the tap-to-stop reset. Seeded, the trail reads the swipe.
  const seeded = [
    { at: 10_990, position: 12_887 },
    { at: 11_180, position: 12_887 + 194 }
  ];
  // The 190 ms wait is not the flick: the span counts as the window.
  expect(trailVelocity(seeded, 0)).toBeCloseTo((194 / FLICK_WINDOW_MS) * 16.7, 6);
  // The seed sits outside the window by the time the move lands; the trim
  // keeps it as the anchor all the same (the phone's second log: 260 ms).
  const late = [
    { at: 6_350, position: 4_982 },
    { at: 6_610, position: 4_982 + 257 }
  ];
  trimTrail(late, 6_610, FLICK_WINDOW_MS);
  expect(late).toHaveLength(2);
  expect(trailVelocity(late, 0)).toBeCloseTo((257 / FLICK_WINDOW_MS) * 16.7, 6);
  // The seed is the animated position, not the glide's target: seeded at
  // the target (13476, 327 px ahead of the content at 13149) the phone's
  // 336 px swipe read as 1.19 px/frame; seeded where the content is, it
  // reads the swipe.
  const atTarget = [
    { at: 15_980, position: 13_476 },
    { at: 16_100, position: 13_149 + 336 }
  ];
  expect(trailVelocity(atTarget, 0)).toBeLessThan(2);
  const atContent = [
    { at: 15_980, position: 13_149 },
    { at: 16_100, position: 13_149 + 336 }
  ];
  expect(trailVelocity(atContent, 0)).toBeCloseTo((336 / FLICK_WINDOW_MS) * 16.7, 6);
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
  expect(paused).toEqual([{ at: 50, position: 100 }, { at: 400, position: 100 }]);
  expect(trailVelocity(paused, 0)).toBe(0);
});
