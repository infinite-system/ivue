/*
=== GENERATOR ===
Goal: Let a finger select text in a virtual list without the system's selection: the class paints the range, owns two handles, and hands every drag to the same primitives the mouse uses.
[On a touch device the selection is drawn by the class](virtual-scroller.invariants.md#on-a-touch-device-the-selection-is-drawn-by-the-class)
[A long press turns the next move into a selection](virtual-scroller.invariants.md#a-long-press-turns-the-next-move-into-a-selection)
[A drag scrolls from inside the edge zone](virtual-scroller.invariants.md#a-drag-scrolls-from-inside-the-edge-zone)
[A hosted capability reaches its owner through an interface](virtual-scroller.invariants.md#a-hosted-capability-reaches-its-owner-through-an-interface)
// domain-invariant: $VirtualScrollerSelectionTouchCustom — If the device has neither touch points nor touch events, then attach does nothing: no overlay, no listeners, the rows stay selectable and the native selection paints as before.
// domain-invariant: $VirtualScrollerSelectionTouchCustom — If a DOM range is painted, then one box per non-empty client rect is laid relative to the overlay and the handles sit at the first box's bottom-left and the last box's bottom-right; a null range hides the overlay.
// domain-invariant: $VirtualScrollerSelectionTouchCustom — If a finger lands on a handle, then the drag begins at once from the other end, the handle stops catching pointer events for its own drag, and lifting ends it with the chip offered.
// domain-invariant: $VirtualScrollerSelectionTouchCustom — If a finger lands on a button or on the overlay, then no hold arms; a tap on an existing selection clears it; a swipe past the slop is a scroll.
Impossible if true: A native selection created by this class.
Impossible if true: A handle drag that starts over instead of extending.

=== GENERATOR-DESCRIBED ===
The owner is a plain object of the primitives plus a wrapper element the
overlay is laid into. jsdom lays nothing out and has no touch points, so
the device is faked through navigator.maxTouchPoints and a range's
client rects are supplied by the spec; timers are faked for the hold.
Touch events are plain Events with a `touches` list, dispatched on real
nodes — the frame for the long press, the handle element for a handle
drag.
*/

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { VirtualScrollerSelectionTouchCustom } from './VirtualScrollerSelectionTouchCustom';
import type { VirtualScrollerSelection } from './VirtualScrollerSelection';

const Touch = VirtualScrollerSelectionTouchCustom.Class;
const at = (index: number, offset: number): VirtualScrollerSelection.Position => ({
  index,
  offset
});

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

function device(touchPoints: number) {
  Object.defineProperty(navigator, 'maxTouchPoints', { value: touchPoints, configurable: true });
}

function gesture(range: VirtualScrollerSelection.Range | null = null) {
  const frame = document.createElement('div');
  const wrapper = document.createElement('div');
  const row = document.createElement('div');
  row.className = 'virtual-scroller__item';
  row.textContent = 'alpha beta gamma';
  wrapper.appendChild(row);
  frame.appendChild(wrapper);
  document.body.appendChild(frame);
  const owner = {
    beginAt: vi.fn(() => true),
    beginFromEnd: vi.fn(() => true),
    extendTo: vi.fn(),
    endDrag: vi.fn(),
    clear: vi.fn(),
    isInteractive: (target: EventTarget | null) =>
      target instanceof Element && target.closest('button, a, input') !== null,
    hasSelection: range !== null,
    range,
    itemsWrapperElement: { value: wrapper }
  };
  const instance = new Touch(owner);
  instance.attach(frame);
  return { owner, instance, frame, wrapper, row };
}

beforeEach(() => {
  vi.useFakeTimers();
  device(5);
});
afterEach(() => {
  vi.useRealTimers();
  device(0);
  document.body.innerHTML = '';
});

// domain-invariant: $VirtualScrollerSelectionTouchCustom — If the device has neither touch points nor touch events, then attach does nothing: no overlay, no listeners, the rows stay selectable and the native selection paints as before.
// impossible-if-true: $VirtualScrollerSelectionTouchCustom — A native selection created by this class.
test('without a touch point the class is inert: no overlay, selectable rows, and it paints nothing', () => {
  device(0);
  expect('ontouchstart' in window).toBe(false);
  expect(Touch.isActive).toBe(false);
  const { instance, frame, wrapper } = gesture();
  expect(instance.paintsSelection).toBe(false);
  expect(frame.style.userSelect).toBe('');
  expect(wrapper.querySelector(`.${Touch.OVERLAY_CLASS}`)).toBeNull();
  instance.paint(document.createRange());
  expect(window.getSelection()!.rangeCount).toBe(0);
  instance.dispose();
});

// invariant: On a touch device the selection is drawn by the class (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('with a touch point the overlay with its two handles is laid inside the wrapper, the rows lock only while a finger is down; dispose removes it all', () => {
  const { instance, frame, wrapper, row } = gesture();
  expect(instance.paintsSelection).toBe(true);
  expect(frame.style.userSelect).toBe('');
  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  expect(frame.style.userSelect).toBe('none');
  row.dispatchEvent(touchEvent('touchend', []));
  expect(frame.style.userSelect).toBe('');
  const overlay = wrapper.querySelector(`.${Touch.OVERLAY_CLASS}`) as HTMLElement;
  expect(overlay).not.toBeNull();
  expect(overlay.hidden).toBe(true);
  expect(overlay.querySelectorAll(`.${Touch.HANDLE_CLASS}`)).toHaveLength(2);
  expect(wrapper.style.position).toBe('relative');
  instance.dispose();
  expect(wrapper.querySelector(`.${Touch.OVERLAY_CLASS}`)).toBeNull();
});

// domain-invariant: $VirtualScrollerSelectionTouchCustom — If a DOM range is painted, then one box per non-empty client rect is laid relative to the overlay and the handles sit at the first box's bottom-left and the last box's bottom-right; a null range hides the overlay.
test('painting a range lays one box per non-empty rect and puts the handles at the ends; painting null hides it all', () => {
  const rects = [
    { left: 20, top: 10, width: 300, height: 20 },
    { left: 0, top: 30, width: 0, height: 20 },
    { left: 0, top: 30, width: 120, height: 20 }
  ];
  expect(Touch.boxesFrom(rects as DOMRectReadOnly[], { left: 10, top: 5 })).toEqual([
    { left: 10, top: 5, width: 300, height: 20 },
    { left: -10, top: 25, width: 120, height: 20 }
  ]);
  expect(Touch.handlePositions([])).toBeNull();

  const { instance, wrapper, row } = gesture();
  const range = document.createRange();
  range.selectNodeContents(row);
  range.getClientRects = () => rects as unknown as DOMRectList;
  instance.paint(range);
  const overlay = wrapper.querySelector(`.${Touch.OVERLAY_CLASS}`) as HTMLElement;
  expect(overlay.hidden).toBe(false);
  const boxes = overlay.querySelectorAll(`.${Touch.BOX_CLASS}`);
  expect(boxes).toHaveLength(2);
  expect((boxes[0] as HTMLElement).style.transform).toBe('translate(20px, 10px)');
  expect((boxes[0] as HTMLElement).style.width).toBe('300px');
  const start = overlay.querySelector(`.${Touch.HANDLE_CLASS}--start`) as HTMLElement;
  const end = overlay.querySelector(`.${Touch.HANDLE_CLASS}--end`) as HTMLElement;
  expect(start.style.transform).toBe('translate(20px, 30px)');
  expect(end.style.transform).toBe('translate(120px, 50px)');

  // A smaller range shrinks the pool; null hides.
  range.getClientRects = () => [rects[0]] as unknown as DOMRectList;
  instance.paint(range);
  expect(overlay.querySelectorAll(`.${Touch.BOX_CLASS}`)).toHaveLength(1);
  instance.paint(null);
  expect(overlay.hidden).toBe(true);
  instance.dispose();
});

// invariant: A long press turns the next move into a selection (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// invariant: A drag scrolls from inside the edge zone (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a still hold promotes, the first move lays the anchor at the resting point through the owner, and every move is taken from the scroll', () => {
  const { owner, instance, row } = gesture();
  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  vi.advanceTimersByTime(Touch.LONG_PRESS_MS);
  expect(instance.selecting.value).toBe(true);
  expect(owner.beginAt).not.toHaveBeenCalled();
  const move = touchEvent('touchmove', [{ x: 100, y: 180 }]);
  row.dispatchEvent(move);
  expect(owner.beginAt).toHaveBeenCalledWith(100, 100, 'touch');
  expect(owner.extendTo).toHaveBeenCalledWith(100, 180);
  expect(move.defaultPrevented).toBe(true);
  expect(move.lenisStopPropagation).toBe(true);
  owner.hasSelection = true;
  row.dispatchEvent(touchEvent('touchend', []));
  expect(owner.endDrag).toHaveBeenCalledTimes(1);
  expect(instance.selected.value).toBe(true);
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelectionTouchCustom — If a finger lands on a handle, then the drag begins at once from the other end, the handle stops catching pointer events for its own drag, and lifting ends it with the chip offered.
// impossible-if-true: $VirtualScrollerSelectionTouchCustom — A handle drag that starts over instead of extending.
// invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a finger on the end handle drags from the start at once, and on the start handle from the end', () => {
  const range = { start: at(2, 3), end: at(6, 4) };
  const { owner, instance, wrapper } = gesture(range);
  const end = wrapper.querySelector(`.${Touch.HANDLE_CLASS}--end`) as HTMLElement;
  const press = touchEvent('touchstart', [{ x: 200, y: 300 }]);
  end.dispatchEvent(press);
  expect(press.defaultPrevented).toBe(true);
  expect(owner.beginFromEnd).toHaveBeenCalledWith(at(2, 3), 200, 300);
  expect(owner.beginAt).not.toHaveBeenCalled();
  expect(end.style.pointerEvents).toBe('none');
  expect(instance.selecting.value).toBe(true);
  const move = touchEvent('touchmove', [{ x: 200, y: 360 }]);
  end.dispatchEvent(move);
  expect(owner.extendTo).toHaveBeenCalledWith(200, 360);
  expect(move.lenisStopPropagation).toBe(true);
  end.dispatchEvent(touchEvent('touchend', []));
  expect(owner.endDrag).toHaveBeenCalledTimes(1);
  expect(end.style.pointerEvents).toBe('');
  expect(instance.selected.value).toBe(true);

  const start = wrapper.querySelector(`.${Touch.HANDLE_CLASS}--start`) as HTMLElement;
  start.dispatchEvent(touchEvent('touchstart', [{ x: 40, y: 120 }]));
  expect(owner.beginFromEnd).toHaveBeenLastCalledWith(at(6, 4), 40, 120);
  start.dispatchEvent(touchEvent('touchend', []));
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelectionTouchCustom — If a finger lands on a button or on the overlay, then no hold arms; a tap on an existing selection clears it; a swipe past the slop is a scroll.
test('a button and the overlay arm nothing, a tap on the selection clears it, a swipe is a scroll', () => {
  const { owner, instance, row, wrapper, frame } = gesture({ start: at(0, 0), end: at(1, 2) });
  const chip = document.createElement('button');
  frame.appendChild(chip);
  chip.dispatchEvent(touchEvent('touchstart', [{ x: 10, y: 10 }]));
  expect(instance.holding).toBe(false);
  const overlay = wrapper.querySelector(`.${Touch.OVERLAY_CLASS}`) as HTMLElement;
  overlay.dispatchEvent(touchEvent('touchstart', [{ x: 10, y: 10 }]));
  expect(instance.holding).toBe(false);

  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  expect(instance.holding).toBe(true);
  row.dispatchEvent(touchEvent('touchend', []));
  expect(owner.clear).toHaveBeenCalledTimes(1);

  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  row.dispatchEvent(touchEvent('touchmove', [{ x: 100, y: 140 }]));
  expect(instance.holding).toBe(false);
  vi.advanceTimersByTime(Touch.LONG_PRESS_MS);
  expect(owner.beginAt).not.toHaveBeenCalled();
  row.dispatchEvent(touchEvent('touchend', []));
  expect(owner.clear).toHaveBeenCalledTimes(1);
  instance.dispose();
});
