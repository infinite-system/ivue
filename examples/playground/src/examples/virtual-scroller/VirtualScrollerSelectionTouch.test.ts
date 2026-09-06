/*
=== GENERATOR ===
Goal: Let a finger select text in a list where a drag already means scroll, by promoting a still hold into a selection and handing the moves to the owner as points.
[Touch events keep firing on the node the finger landed on](virtual-scroller.invariants.md#touch-events-keep-firing-on-the-node-the-finger-landed-on)
[A long press turns the next move into a selection](virtual-scroller.invariants.md#a-long-press-turns-the-next-move-into-a-selection)
[A hosted capability reaches its owner through an interface](virtual-scroller.invariants.md#a-hosted-capability-reaches-its-owner-through-an-interface)
// domain-invariant: $VirtualScrollerSelectionTouch — If the finger moves past the slop before the hold fires, then the gesture is a scroll and the owner never hears of it.
// domain-invariant: $VirtualScrollerSelectionTouch — If two fingers land, then no hold arms; if a second finger lands mid-drag, then the first finger keeps the focus.
// domain-invariant: $VirtualScrollerSelectionTouch — If the finger lifts after a selecting drag, then the drag ends and the copy chip shows exactly when the owner holds a selection.
// domain-invariant: $VirtualScrollerSelectionTouch — If the finger lifts without moving, or scrolls away, or is a tap, then the rows are selectable again and nothing was selected.
Impossible if true: The page scrolling while a touch selection is being extended.

=== GENERATOR-DESCRIBED ===
The owner is a plain object of the three primitives plus hasSelection,
recording every call. Timers are faked so the long press is a clock
advance, not a wait. Touch events are plain Events with a `touches` list
attached, dispatched on real jsdom nodes — including a node removed from
the document, which is the whole reason the listeners ride the origin
node instead of the element.
*/

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { VirtualScrollerSelectionTouch } from './VirtualScrollerSelectionTouch';

const Gesture = VirtualScrollerSelectionTouch.Class;

function touchEvent(type: string, touches: { x: number; y: number; id?: number }[]) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: touches.map((touch) => ({
      clientX: touch.x,
      clientY: touch.y,
      identifier: touch.id ?? 1
    }))
  });
  return event as Event & { lenisStopPropagation?: boolean };
}

function gesture() {
  const owner = {
    beginAt: vi.fn(() => true),
    extendTo: vi.fn(),
    endDrag: vi.fn(),
    hasSelection: false
  };
  const instance = new Gesture(owner);
  const element = document.createElement('div');
  const row = document.createElement('div');
  element.appendChild(row);
  document.body.appendChild(element);
  instance.attach(element);
  return { owner, instance, element, row };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

// domain-invariant: $VirtualScrollerSelectionTouch — If the finger moves past the slop before the hold fires, then the gesture is a scroll and the owner never hears of it.
test('movement within the slop keeps the hold alive; past it, the gesture is a scroll', () => {
  expect(Gesture.exceedsSlop(0)).toBe(false);
  expect(Gesture.exceedsSlop(Gesture.SLOP_PX)).toBe(false);
  expect(Gesture.exceedsSlop(Gesture.SLOP_PX + 0.1)).toBe(true);
  expect(Gesture.distanceFrom({ x: 10, y: 10 }, 13, 14)).toBe(5);
  expect(Gesture.distanceFrom({ x: 10, y: 10 }, 7, 6)).toBe(5);

  const { owner, instance, row } = gesture();
  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  row.dispatchEvent(touchEvent('touchmove', [{ x: 104, y: 103 }]));
  vi.advanceTimersByTime(Gesture.LONG_PRESS_MS / 2);
  row.dispatchEvent(touchEvent('touchmove', [{ x: 100, y: 130 }]));
  vi.advanceTimersByTime(Gesture.LONG_PRESS_MS);
  expect(owner.beginAt).not.toHaveBeenCalled();
  expect(instance.selecting.value).toBe(false);
  instance.dispose();
});

// invariant: A long press turns the next move into a selection (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// impossible-if-true: $VirtualScrollerSelectionTouch — The page scrolling while a touch selection is being extended.
test('a still hold promotes at the long-press mark, and every move after it extends the selection while the page and the list are told to stay put', () => {
  const { owner, instance, row, element } = gesture();
  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  // The rows are non-selectable for the length of the hold: iOS's own
  // long press finds nothing to select.
  expect(element.style.userSelect).toBe('none');
  vi.advanceTimersByTime(Gesture.LONG_PRESS_MS - 1);
  expect(instance.selecting.value).toBe(false);
  vi.advanceTimersByTime(1);
  expect(instance.selecting.value).toBe(true);
  expect(owner.beginAt).not.toHaveBeenCalled();

  // The first move lays the anchor at the resting point, with the rows selectable again.
  const move = touchEvent('touchmove', [{ x: 100, y: 180 }]);
  row.dispatchEvent(move);
  expect(element.style.userSelect).toBe('');
  expect(owner.beginAt).toHaveBeenCalledWith(100, 100);
  expect(owner.extendTo).toHaveBeenCalledWith(100, 180);
  expect(move.defaultPrevented).toBe(true);
  expect(move.lenisStopPropagation).toBe(true);
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelectionTouch — If the finger lifts without moving, or scrolls away, or is a tap, then the rows are selectable again and nothing was selected.
test('a tap, a swipe and a motionless long press all restore selectability and select nothing', () => {
  const { owner, instance, row, element } = gesture();
  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  row.dispatchEvent(touchEvent('touchend', []));
  expect(element.style.userSelect).toBe('');

  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  row.dispatchEvent(touchEvent('touchmove', [{ x: 100, y: 140 }]));
  expect(element.style.userSelect).toBe('');

  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  vi.advanceTimersByTime(Gesture.LONG_PRESS_MS);
  expect(element.style.userSelect).toBe('none');
  row.dispatchEvent(touchEvent('touchend', []));
  expect(element.style.userSelect).toBe('');
  expect(owner.beginAt).not.toHaveBeenCalled();
  expect(owner.endDrag).not.toHaveBeenCalled();
  expect(instance.selecting.value).toBe(false);
  instance.dispose();
});

// invariant: Touch events keep firing on the node the finger landed on (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a finger whose origin row left the DOM still extends the selection, because the listeners ride the origin node', () => {
  const { owner, instance, row } = gesture();
  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  vi.advanceTimersByTime(Gesture.LONG_PRESS_MS);
  row.remove();
  expect(row.isConnected).toBe(false);
  row.dispatchEvent(touchEvent('touchmove', [{ x: 100, y: 190 }]));
  expect(owner.extendTo).toHaveBeenLastCalledWith(100, 190);
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelectionTouch — If two fingers land, then no hold arms; if a second finger lands mid-drag, then the first finger keeps the focus.
test('two fingers never arm a hold, and a second finger mid-drag does not steal the focus', () => {
  const pinch = gesture();
  pinch.row.dispatchEvent(
    touchEvent('touchstart', [
      { x: 100, y: 100, id: 1 },
      { x: 200, y: 100, id: 2 }
    ])
  );
  vi.advanceTimersByTime(Gesture.LONG_PRESS_MS);
  expect(pinch.owner.beginAt).not.toHaveBeenCalled();
  pinch.instance.dispose();

  const { owner, instance, row } = gesture();
  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100, id: 1 }]));
  vi.advanceTimersByTime(Gesture.LONG_PRESS_MS);
  row.dispatchEvent(
    touchEvent('touchmove', [
      { x: 100, y: 150, id: 1 },
      { x: 300, y: 300, id: 2 }
    ])
  );
  expect(owner.extendTo).toHaveBeenLastCalledWith(100, 150);
  // Only the second finger reported: the tracked one is absent, nothing moves.
  row.dispatchEvent(touchEvent('touchmove', [{ x: 300, y: 320, id: 2 }]));
  expect(owner.extendTo).toHaveBeenCalledTimes(1);
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelectionTouch — If the finger lifts after a selecting drag, then the drag ends and the copy chip shows exactly when the owner holds a selection.
// invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('lifting the finger ends the drag and reports selected exactly when the owner holds a selection; a cleared selection drops the chip', () => {
  const { owner, instance, row } = gesture();
  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  vi.advanceTimersByTime(Gesture.LONG_PRESS_MS);
  row.dispatchEvent(touchEvent('touchmove', [{ x: 100, y: 180 }]));
  owner.hasSelection = true;
  row.dispatchEvent(touchEvent('touchend', []));
  expect(owner.endDrag).toHaveBeenCalledTimes(1);
  expect(instance.selecting.value).toBe(false);
  expect(instance.selected.value).toBe(true);

  instance.onSelectionCleared();
  expect(instance.selected.value).toBe(false);

  // A tap (no hold) ends nothing.
  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  row.dispatchEvent(touchEvent('touchend', []));
  expect(owner.endDrag).toHaveBeenCalledTimes(1);
  instance.dispose();
});
