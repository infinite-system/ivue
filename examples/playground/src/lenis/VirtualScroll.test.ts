/*
=== GENERATOR ===
Goal: Turn wheel and touch events on the frame into signed deltas on one 'scroll' event, so Lenis reads every input the same way.
[A touchcancel flicks like a touchend](lenis.invariants.md#a-touchcancel-flicks-like-a-touchend)
[Android holds the first move back and may coalesce a swipe into one](lenis.invariants.md#android-holds-the-first-move-back-and-may-coalesce-a-swipe-into-one)
// domain-invariant: $VirtualScroll — If a touch moves, then the delta is the finger's travel since the last touch sample, negated and scaled by the touch multiplier; a touchstart emits zero; a touchend or touchcancel re-emits the last delta with its own event.
// domain-invariant: $VirtualScroll — If a wheel turns, then the delta is the event's, scaled by its delta mode and the wheel multiplier, and tune re-scales later events.
Impossible if true: A touchcancel that emits nothing. A wheel notch in line mode read as pixels.

=== GENERATOR-DESCRIBED ===
Upstream Lenis's VirtualScroll, ported with the handlers as prototype
methods bound in the constructor and the touchcancel listener the fork
added; the spec drives the listeners through real DOM events.
*/

import { expect, test, vi } from 'vitest';
import { VirtualScroll } from './VirtualScroll';

const touch = (type: string, x: number, y: number) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'targetTouches', { value: [{ clientX: x, clientY: y }] });
  return event;
};

// domain-invariant: $VirtualScroll — If a touch moves, then the delta is the finger's travel since the last touch sample, negated and scaled by the touch multiplier; a touchstart emits zero; a touchend or touchcancel re-emits the last delta with its own event.
// invariant: A touchcancel flicks like a touchend (examples/playground/src/lenis/lenis.invariants.md)
// invariant: Android holds the first move back and may coalesce a swipe into one (examples/playground/src/lenis/lenis.invariants.md)
test('a touch emits zero at the start, the negated scaled travel per move, and the last delta again at the end or the cancel', () => {
  const element = document.createElement('div');
  const scroll = new VirtualScroll.Class(element, { wheelMultiplier: 1, touchMultiplier: 2 });
  const seen: Array<{ type: string; deltaY: number }> = [];
  scroll.on('scroll', ({ deltaY, event }) => seen.push({ type: event.type, deltaY }));
  element.dispatchEvent(touch('touchstart', 100, 500));
  element.dispatchEvent(touch('touchmove', 100, 400));
  element.dispatchEvent(touch('touchmove', 100, 350));
  element.dispatchEvent(touch('touchend', 100, 350));
  element.dispatchEvent(touch('touchstart', 100, 500));
  element.dispatchEvent(touch('touchmove', 100, 470));
  element.dispatchEvent(touch('touchcancel', 100, 470));
  expect(seen).toEqual([
    { type: 'touchstart', deltaY: 0 },
    { type: 'touchmove', deltaY: 200 },
    { type: 'touchmove', deltaY: 100 },
    { type: 'touchend', deltaY: 100 },
    { type: 'touchstart', deltaY: 0 },
    { type: 'touchmove', deltaY: 60 },
    { type: 'touchcancel', deltaY: 60 }
  ]);
  scroll.destroy();
  element.dispatchEvent(touch('touchmove', 100, 0));
  expect(seen).toHaveLength(7);
});

// domain-invariant: $VirtualScroll — If a wheel turns, then the delta is the event's, scaled by its delta mode and the wheel multiplier, and tune re-scales later events.
// impossible-if-true: $VirtualScroll — A touchcancel that emits nothing. A wheel notch in line mode read as pixels.
test('a wheel delta is scaled by its mode and the multiplier, and tune re-scales the next event', () => {
  const element = document.createElement('div');
  const scroll = new VirtualScroll.Class(element, { wheelMultiplier: 1, touchMultiplier: 1 });
  const seen: number[] = [];
  scroll.on('scroll', ({ deltaY }) => seen.push(deltaY));
  element.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, deltaMode: 0 }));
  element.dispatchEvent(new WheelEvent('wheel', { deltaY: 3, deltaMode: 1 }));
  scroll.tune({ wheelMultiplier: 2 });
  element.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, deltaMode: 0 }));
  expect(seen[0]).toBe(120);
  expect(seen[1]).toBeCloseTo(3 * (100 / 6), 6);
  expect(seen[2]).toBe(240);
  // The handler is a prototype method bound once: a subclass override wins.
  const onWheel = vi.spyOn(VirtualScroll.$Class.prototype, 'onWheel');
  const another = new VirtualScroll.Class(document.createElement('div'));
  another.onWheel(new WheelEvent('wheel', { deltaY: 1 }));
  expect(onWheel).toHaveBeenCalled();
  onWheel.mockRestore();
  scroll.destroy();
  another.destroy();
});
