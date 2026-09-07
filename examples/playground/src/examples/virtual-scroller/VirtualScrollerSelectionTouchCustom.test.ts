/*
=== GENERATOR ===
Goal: Let a finger select text in a virtual list without the system's selection: the class paints the range, owns two handles, and hands every drag to the same primitives the mouse uses.
[On a touch device the selection is drawn by the class](virtual-scroller.invariants.md#on-a-touch-device-the-selection-is-drawn-by-the-class)
[A long press turns the next move into a selection](virtual-scroller.invariants.md#a-long-press-turns-the-next-move-into-a-selection)
[A drag scrolls from inside the edge zone](virtual-scroller.invariants.md#a-drag-scrolls-from-inside-the-edge-zone)
[A hosted capability reaches its owner through an interface](virtual-scroller.invariants.md#a-hosted-capability-reaches-its-owner-through-an-interface)
// domain-invariant: $VirtualScrollerSelectionTouchCustom — If the device has neither touch points nor touch events, then attach does nothing: no overlay, no listeners, the rows stay selectable and the native selection paints as before.
// domain-invariant: $VirtualScrollerSelectionTouchCustom — If a DOM range is painted, then one box per non-empty client rect is laid relative to the overlay, laid whole since the frame clips, and the handles sit beside the true ends — the start above the first line, the end below the last, offset outward — so they never cover the text — pinned whole just inside the visible edge while an end's line is partly on screen and hidden once it has scrolled wholly away; a null range hides the overlay.
// domain-invariant: $VirtualScrollerSelectionTouchCustom — If a finger lands on a handle, then the drag begins at once from the other end, the handle stops catching pointer events for its own drag, and lifting ends it with the chip offered.
// domain-invariant: $VirtualScrollerSelectionTouchCustom — If a finger lands on a button or on the overlay, then no hold arms; a tap on an existing selection clears it; a swipe past the slop is a scroll.
// domain-invariant: $VirtualScrollerSelectionTouchCustom — If a second tap lands within the double-tap window and slop of the first, then the word under it is selected as a touch range and the chip is offered; mouse events synthesized after a touch are that touch's.
Impossible if true: A native selection created by this class.
Impossible if true: A handle drag that starts over instead of extending.
Impossible if true: A swipe over selected text changing the selection instead of scrolling.

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
  // jsdom lays nothing out: the frame's rect is the clip every box is cut to.
  frame.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 800, bottom: 1000, width: 800, height: 1000 }) as DOMRect;
  const wrapper = document.createElement('div');
  const row = document.createElement('div');
  row.className = 'virtual-scroller__item';
  row.textContent = 'alpha beta gamma';
  wrapper.appendChild(row);
  frame.appendChild(wrapper);
  document.body.appendChild(frame);
  const owner = {
    beginAt: vi.fn(() => true),
    selectAt: vi.fn(() => true),
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
  // performance.now() is faked too: the double tap and the mouse-after-touch
  // windows read the clock, and advancing the timers must advance it.
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance']
  });
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

// domain-invariant: $VirtualScrollerSelectionTouchCustom — If a DOM range is painted, then one box per non-empty client rect is laid relative to the overlay, laid whole since the frame clips, and the handles sit beside the true ends — the start above the first line, the end below the last, offset outward — so they never cover the text — pinned whole just inside the visible edge while an end's line is partly on screen and hidden once it has scrolled wholly away; a null range hides the overlay.
test('painting a range lays one box per non-empty rect and puts the handles at the ends; painting null hides it all', () => {
  const rects = [
    { left: 20, top: 10, right: 320, bottom: 30, width: 300, height: 20 },
    { left: 0, top: 30, right: 0, bottom: 50, width: 0, height: 20 },
    { left: 0, top: 30, right: 120, bottom: 50, width: 120, height: 20 }
  ];
  expect(Touch.boxesFrom(rects as DOMRectReadOnly[], { left: 10, top: 5 })).toEqual([
    { left: 10, top: 5, width: 300, height: 20 },
    { left: -10, top: 25, width: 120, height: 20 }
  ]);
  expect(Touch.handlePositions([])).toBeNull();
  // Clipped to the frame: a rect above it is dropped, one crossing its bottom is cut.
  const frame = { left: 0, top: 0, right: 400, bottom: 40 };
  expect(
    Touch.boxesFrom(
      [
        { left: 20, top: -30, right: 320, bottom: -10, width: 300, height: 20 },
        { left: 20, top: 30, right: 320, bottom: 50, width: 300, height: 20 }
      ] as DOMRectReadOnly[],
      { left: 0, top: 0 },
      frame
    )
  ).toEqual([{ left: 20, top: 30, width: 300, height: 10 }]);

  const { instance, wrapper, row } = gesture();
  const range = document.createRange();
  range.selectNodeContents(row);
  range.getClientRects = () => rects as unknown as DOMRectList;
  const overlay = wrapper.querySelector(`.${Touch.OVERLAY_CLASS}`) as HTMLElement;
  // The overlay must be shown before it is measured: a hidden one has no rect.
  const measured: boolean[] = [];
  const originalRect = overlay.getBoundingClientRect.bind(overlay);
  overlay.getBoundingClientRect = () => {
    measured.push(overlay.hidden);
    return originalRect();
  };
  instance.paint(range);
  expect(measured).toEqual([false]);
  expect(overlay.hidden).toBe(false);
  const boxes = overlay.querySelectorAll(`.${Touch.BOX_CLASS}`);
  expect(boxes).toHaveLength(2);
  expect((boxes[0] as HTMLElement).style.transform).toBe('translate(20px, 10px)');
  expect((boxes[0] as HTMLElement).style.width).toBe('300px');
  const start = overlay.querySelector(`.${Touch.HANDLE_CLASS}--start`) as HTMLElement;
  const end = overlay.querySelector(`.${Touch.HANDLE_CLASS}--end`) as HTMLElement;
  // Beside the ends, offset outward and half the offset down — never over the text.
  const offset = Touch.HANDLE_OFFSET_PX;
  // The start's true spot is 4 px from the frame's top — pinned to the knob's radius.
  const inset = Touch.HANDLE_KNOB_PX / 2;
  expect(
    Touch.handlePositions(
      Touch.boxesFrom(rects as unknown as DOMRectReadOnly[], { left: 0, top: 0 } as DOMRect)
    )
  ).toEqual({
    start: { x: 20 - offset, y: 10 - offset / 2 },
    end: { x: 120 + offset, y: 50 + offset / 2 }
  });
  expect(start.style.transform).toBe(`translate(${20 - offset}px, ${inset}px)`);
  expect(end.style.transform).toBe(`translate(${120 + offset}px, ${50 + offset / 2}px)`);

  // An end whose line is partly on screen keeps its handle, pinned whole
  // just inside the visible edge; boxes are laid whole, the frame clips.
  const visibleBottom = Math.min(1000, window.innerHeight);
  range.getClientRects = () =>
    [
      rects[0],
      { left: 0, top: visibleBottom - 10, right: 120, bottom: visibleBottom + 10, width: 120, height: 20 }
    ] as unknown as DOMRectList;
  instance.paint(range);
  expect(start.hidden).toBe(false);
  expect(end.hidden).toBe(false);
  expect(end.style.transform).toBe(`translate(${120 + offset}px, ${visibleBottom - inset}px)`);
  expect(overlay.querySelectorAll(`.${Touch.BOX_CLASS}`)).toHaveLength(2);
  // An end whose line has scrolled wholly away has no handle.
  range.getClientRects = () =>
    [
      rects[0],
      { left: 0, top: 1200, right: 120, bottom: 1220, width: 120, height: 20 }
    ] as unknown as DOMRectList;
  instance.paint(range);
  expect(start.hidden).toBe(false);
  expect(end.hidden).toBe(true);
  expect(overlay.querySelectorAll(`.${Touch.BOX_CLASS}`)).toHaveLength(2);
  // A scroll re-places the handles from the last paint and one rect read:
  // the overlay moved up 1000 px, so the end's line is on screen and the
  // start's has left.
  overlay.getBoundingClientRect = () => ({ left: 0, top: -1000, width: 800, height: 3000 }) as DOMRect;
  instance.follow();
  expect(start.hidden).toBe(true);
  expect(end.hidden).toBe(false);
  expect(end.style.transform).toBe(`translate(${120 + offset}px, ${1220 + offset / 2}px)`);

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

// domain-invariant: $VirtualScrollerSelectionTouchCustom — If a second tap lands within the double-tap window and slop of the first, then the word under it is selected as a touch range and the chip is offered; mouse events synthesized after a touch are that touch's.
test('a double tap selects the word under it through the owner and offers the chip; a late second tap is a new tap', () => {
  const { owner, instance, row, frame: element } = gesture();
  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  row.dispatchEvent(touchEvent('touchend', []));
  expect(instance.recentTouch).toBe(true);
  vi.advanceTimersByTime(Touch.DOUBLE_TAP_MS - 50);
  row.dispatchEvent(touchEvent('touchstart', [{ x: 104, y: 98 }]));
  expect(owner.selectAt).toHaveBeenCalledWith(104, 98, 'word', 'touch');
  expect(instance.selected.value).toBe(true);
  expect(instance.holding).toBe(false);
  // The rows are locked for the second tap, so the system's own double-tap
  // selection finds nothing; the lock lifts when the tap ends, the word stays.
  expect(element.style.userSelect).toBe('none');
  row.dispatchEvent(touchEvent('touchend', []));
  expect(element.style.userSelect).toBe('');
  expect(owner.clear).not.toHaveBeenCalled();

  vi.advanceTimersByTime(Touch.DOUBLE_TAP_MS + 50);
  row.dispatchEvent(touchEvent('touchstart', [{ x: 104, y: 98 }]));
  expect(owner.selectAt).toHaveBeenCalledTimes(1);
  expect(instance.holding).toBe(true);
  row.dispatchEvent(touchEvent('touchend', []));
  vi.advanceTimersByTime(Touch.MOUSE_AFTER_TOUCH_MS + 10);
  expect(instance.recentTouch).toBe(false);
  instance.dispose();
});

// impossible-if-true: $VirtualScrollerSelectionTouchCustom — A swipe over selected text changing the selection instead of scrolling.
test('a swipe over selected text is a scroll — no drag begins and the selection stays; a tap there clears it', () => {
  const { owner, instance, row } = gesture({ start: at(1, 0), end: at(3, 4) });
  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  const move = touchEvent('touchmove', [{ x: 100, y: 160 }]);
  row.dispatchEvent(move);
  expect(owner.beginAt).not.toHaveBeenCalled();
  expect(owner.extendTo).not.toHaveBeenCalled();
  expect(move.defaultPrevented).toBe(false);
  expect(instance.holding).toBe(false);
  row.dispatchEvent(touchEvent('touchend', []));
  expect(owner.clear).not.toHaveBeenCalled();

  row.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100 }]));
  row.dispatchEvent(touchEvent('touchend', []));
  expect(owner.clear).toHaveBeenCalledTimes(1);
  instance.dispose();
});
