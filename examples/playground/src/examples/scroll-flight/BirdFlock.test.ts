/*
=== GENERATOR ===
Goal: The flock breathes on its own clock — the wingbeat and a startle are functions of TIME and the hand, never of the scroll — so the birds can be handed to the GPU while their place in the sky stays a track of the scroll.
// domain-invariant: $BirdFlock — If the wings beat, then they beat by time and never by the scroll: the flock's vertices at a time are a pure function of the formation, the time and a startle, so the same time draws the same wings.
// domain-invariant: $BirdFlock — If a hand comes down on the frame, then the flock bursts away from that point and regroups on its own clock, the near birds hardest, with the scroll untouched.
Impossible if true: A wingbeat that changes with the scroll position.
Impossible if true: A startled bird pushed toward the hand.
Impossible if true: A flock that does not regroup.

=== GENERATOR-DESCRIBED ===
The GPU part is held pure: the formation, the vertices at a time and the
startle's grip are static functions, so the wingbeat and the startle are
specified without a context.
*/

import { expect, test } from 'vitest';
import { BirdFlock } from './BirdFlock';

// domain-invariant: $BirdFlock — If the wings beat, then they beat by time and never by the scroll: the flock's vertices at a time are a pure function of the formation, the time and a startle, so the same time draws the same wings.
// impossible-if-true: $BirdFlock — A wingbeat that changes with the scroll position.
test('the wings beat by time — pure and repeatable — and the formation is the same flock every time', () => {
  const birds = BirdFlock.Class.formation();
  expect(birds.length).toBe(BirdFlock.Class.COUNT);
  expect(BirdFlock.Class.formation()).toEqual(birds);
  const at = (time: number) => BirdFlock.Class.vertices(birds, time, 1);
  expect(at(0).length).toBe(birds.length * 18);
  expect(at(100)).toEqual(at(100));
  // the wingtip (vertex 1 of the left wing, y at index 4) moves between two times
  expect(at(0)[4]).not.toBe(at(90)[4]);
});

// domain-invariant: $BirdFlock — If a hand comes down on the frame, then the flock bursts away from that point and regroups on its own clock, the near birds hardest, with the scroll untouched.
// impossible-if-true: $BirdFlock — A startled bird pushed toward the hand.
// impossible-if-true: $BirdFlock — A flock that does not regroup.
test('a startle pushes the flock away from the point, the near birds hardest, then lets it regroup', () => {
  const birds = BirdFlock.Class.formation();
  const at = (time: number, startle: BirdFlock.Startle | null = null) =>
    BirdFlock.Class.vertices(birds, time, 1, undefined, startle);
  const lead = birds[0];
  const startle = { x: lead.x - 0.2, y: lead.y, atMs: 1000 };
  const restX = at(1000)[0];
  expect(at(1000, startle)[0]).toBe(restX); // not yet
  expect(at(1150, startle)[0]).toBeGreaterThan(restX + 0.05);
  // a far bird is pushed less than the lead
  const farIndex = (birds.length - 1) * 18;
  const farPush = Math.abs(at(1150, startle)[farIndex] - at(1150)[farIndex]);
  expect(farPush).toBeLessThan(at(1150, startle)[0] - restX);
  // and back
  expect(Math.abs(at(9000, startle)[0] - at(9000)[0])).toBeLessThan(0.002);
});
