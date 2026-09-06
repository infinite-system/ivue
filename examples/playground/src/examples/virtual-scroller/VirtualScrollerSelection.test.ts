/*
=== GENERATOR ===
Goal: Hold a text selection over a virtual list as a range over the DATA, so the highlight survives row recycling and copy reaches rows that were never on screen together.
[A native selection dies with the node that anchors it](virtual-scroller.invariants.md#a-native-selection-dies-with-the-node-that-anchors-it)
[The selection is a range over the data](virtual-scroller.invariants.md#the-selection-is-a-range-over-the-data)
[Text offsets are measured against the trimmed row text](virtual-scroller.invariants.md#text-offsets-are-measured-against-the-trimmed-row-text)
[The copied text is the string the row renders](virtual-scroller.invariants.md#the-copied-text-is-the-string-the-row-renders)
[A multi-click selects the word or the row under it](virtual-scroller.invariants.md#a-multi-click-selects-the-word-or-the-row-under-it)
[A hosted capability reaches its owner through an interface](virtual-scroller.invariants.md#a-hosted-capability-reaches-its-owner-through-an-interface)
[A drag scrolls from inside the edge zone](virtual-scroller.invariants.md#a-drag-scrolls-from-inside-the-edge-zone)
[A native selection inside the frame is adopted as the logical range](virtual-scroller.invariants.md#a-native-selection-inside-the-frame-is-adopted-as-the-logical-range)
[A finger's drag paints without selecting](virtual-scroller.invariants.md#a-fingers-drag-paints-without-selecting)
[On a touch device the selection is drawn by the class](virtual-scroller.invariants.md#on-a-touch-device-the-selection-is-drawn-by-the-class)
// domain-invariant: $VirtualScrollerSelection — If anchor and focus are given in either order, then the range is the same, and a range whose ends coincide is no selection.
// domain-invariant: $VirtualScrollerSelection — If a range is clamped to the mounted window, then an end that scrolled out is pinned to the boundary row, and a range wholly outside the window is null.
// domain-invariant: $VirtualScrollerSelection — If a point is over a row, then the position is that row at the caret's offset; in a gap it is the nearest row along the axis, at its start before it and its end after; over nothing it is null.
// domain-invariant: $VirtualScrollerSelection — If the pointer nears an edge or passes it, then the drag scrolls that way at a speed that ramps from a crawl at the zone's inner boundary to the maximum past the edge: an upward drag scrolls up.
// domain-invariant: $VirtualScrollerSelection — If a mousedown is not the primary button or lands on an interactive element, then it is left to the browser; otherwise it begins a selection and takes the native one away.
// domain-invariant: $VirtualScrollerSelection — If a press lands outside the frame, then the selection clears; inside, it stays.
// domain-invariant: $VirtualScrollerSelection — If a drag begins from a fixed end, then that end is the anchor and the point under the finger the focus, and the drag is any other touch drag from there.
// domain-invariant: $VirtualScrollerSelection — If the mounted part of the range is asked for as a DOM range, then it spans the clamped carets, and it is null with no range, nothing mounted, or the range scrolled out.
// domain-invariant: $VirtualScrollerSelection — If a finger's press lands inside the existing range, then the drag extends it from the far end; outside it, or from a mouse, the drag starts over; and isInsideSelection answers whether a point lies on the range.
// domain-invariant: $VirtualScrollerSelection — If a native handle drags the selection's end into the edge zone, then the list scrolls under it frame by frame until the end leaves the zone or the selection stops changing; the native selection is never re-pinned while it does.
// domain-invariant: $VirtualScrollerSelection — If a touch lands within reach of the native selection's first or last caret, then it is a handle grab; elsewhere, or with no native selection in the frame, it is not.
// domain-invariant: $VirtualScrollerSelection — If the reader dismisses a natively pinned selection, then the logical range and the chip go with it; a collapse of our own making (a range scrolled out, a clear) does not.
Impossible if true: A selection whose anchor equals its focus.
Impossible if true: Clearing our selection removing a highlight the reader made elsewhere on the page.

=== GENERATOR-DESCRIBED ===
jsdom has no layout, so the three DOM readers the class rests on are
stubbed at their seams: elementFromPoint, caretPositionFromPoint, and
getBoundingClientRect on the frame, the wrapper and each row. Text nodes
and the tree walker are real, which is why the offset round-trip is the
strongest test here: every offset of a three-node row goes DOM → text →
DOM and comes back. The owner is a plain object of the Owner interface —
the seam that makes this class testable without a scroller.
*/

import { computed, ref, shallowRef } from 'vue';
import { afterEach, expect, test, vi } from 'vitest';
import { VirtualScrollerSelection } from './VirtualScrollerSelection';

const Logic = VirtualScrollerSelection.Class;
const at = (index: number, offset: number): VirtualScrollerSelection.Position => ({
  index,
  offset
});

/* ---- the DOM double ------------------------------------------------- */

const ROW_HEIGHT = 40;
const CHAR_WIDTH = 10;

/** Row i's text as the template renders it (three text nodes once mounted). */
const rowText = (index: number) => `#${index + 1} — alpha beta gamma ${index}`;

interface Stage {
  frame: HTMLElement;
  wrapper: HTMLElement;
  rows: HTMLElement[];
  first: number;
}

/**
 * Mount rows [first, first + count) into a wrapper inside a 400 px frame
 * at y = 0. Row i sits at y = (i − first) × ROW_HEIGHT; a caret's offset in
 * the row's trailing text node is x / CHAR_WIDTH. The wrapper extends
 * 100 px past the rows on both ends, so a point can land in a gap.
 */
function stage(first: number, count: number): Stage {
  document.body.innerHTML = '';
  const frame = document.createElement('div');
  const wrapper = document.createElement('div');
  frame.appendChild(wrapper);
  document.body.appendChild(frame);
  const rect = (top: number, bottom: number) =>
    ({ top, bottom, left: 0, right: 800, width: 800, height: bottom - top }) as DOMRect;
  frame.getBoundingClientRect = () => rect(0, 400);
  wrapper.getBoundingClientRect = () => rect(-100, count * ROW_HEIGHT + 100);
  const rows: HTMLElement[] = [];
  for (let slot = 0; slot < count; slot++) {
    const index = first + slot;
    const row = document.createElement('div');
    row.className = 'virtual-scroller__item';
    row.setAttribute('aria-rowindex', String(index + 1));
    // The template's whitespace and its three text nodes.
    row.innerHTML = `\n  <b>#${index + 1}</b> — alpha beta gamma ${index}\n`;
    row.getBoundingClientRect = () => rect(slot * ROW_HEIGHT, (slot + 1) * ROW_HEIGHT);
    wrapper.appendChild(row);
    rows.push(row);
  }
  document.elementFromPoint = (x: number, y: number) => {
    if (x < 0 || x >= 800) return null;
    if (y < 0) return null;
    const slot = Math.floor(y / ROW_HEIGHT);
    return rows[slot] ?? null;
  };
  (document as unknown as { caretPositionFromPoint: unknown }).caretPositionFromPoint = (
    x: number,
    y: number
  ) => {
    const row = document.elementFromPoint(x, y);
    if (!row) return null;
    // The trailing text node (whitespace, <b>, text) — a link appended by
    // a test must not move the caret's node.
    const trailing = row.childNodes[2] as Text;
    return {
      offsetNode: trailing,
      offset: Math.min(trailing.data.length, Math.floor(x / CHAR_WIDTH))
    };
  };
  return { frame, wrapper, rows, first };
}

/** The Owner interface, as a plain object. */
function owner(stage: Stage, join = '\n') {
  const window = shallowRef(0);
  return {
    scrollElement: ref(stage.frame),
    itemsWrapperElement: ref(stage.wrapper),
    visibleItems: computed(() => window.value),
    selectionAxis: 'y' as const,
    selectionJoin: join,
    creepFactor: 1,
    rowText,
    scrollBy: vi.fn(),
    nudgePaint: vi.fn(),
    window
  };
}

function selection(first = 0, count = 5, join?: string) {
  const dom = stage(first, count);
  const host = owner(dom, join);
  const instance = new Logic(host);
  return { dom, owner: host, instance };
}

/** A mousedown as the handler reads it. */
function press(
  x: number,
  y: number,
  options: { button?: number; detail?: number; target?: Element } = {}
) {
  const event = new MouseEvent('mousedown', {
    button: options.button ?? 0,
    detail: options.detail ?? 1,
    clientX: x,
    clientY: y,
    cancelable: true,
    bubbles: true
  });
  if (options.target) Object.defineProperty(event, 'target', { value: options.target });
  else Object.defineProperty(event, 'target', { value: document.elementFromPoint(x, y) });
  return event;
}

const frames: FrameRequestCallback[] = [];
vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
  frames.push(callback);
  return frames.length;
});
vi.stubGlobal('cancelAnimationFrame', () => {});

afterEach(() => {
  frames.length = 0;
  window.getSelection()?.removeAllRanges();
});

/* ---- range math — no DOM ------------------------------------------- */

// domain-invariant: $VirtualScrollerSelection — If anchor and focus are given in either order, then the range is the same, and a range whose ends coincide is no selection.
test('normalize orders anchor and focus by index then offset, so a backward drag is the same range, and coinciding ends are empty', () => {
  expect(Logic.normalize(at(5, 3), at(2, 9))).toEqual({ start: at(2, 9), end: at(5, 3) });
  expect(Logic.normalize(at(2, 9), at(5, 3))).toEqual({ start: at(2, 9), end: at(5, 3) });
  expect(Logic.normalize(at(4, 8), at(4, 2))).toEqual({ start: at(4, 2), end: at(4, 8) });
  expect(Logic.isEmpty(Logic.normalize(at(3, 3), at(3, 3)))).toBe(true);
  expect(Logic.isEmpty(Logic.normalize(at(3, 3), at(3, 4)))).toBe(false);
  expect(Logic.rowCount(Logic.normalize(at(10, 0), at(14, 5)))).toBe(5);
});

// domain-invariant: $VirtualScrollerSelection — If a range is clamped to the mounted window, then an end that scrolled out is pinned to the boundary row, and a range wholly outside the window is null.
test('clampToWindow pins scrolled-out ends to the boundary rows and returns null when the range left the window', () => {
  const range = Logic.normalize(at(100, 7), at(300, 4));
  expect(Logic.clampToWindow(range, 120, 140, 30)).toEqual({ start: at(120, 0), end: at(140, 30) });
  expect(Logic.clampToWindow(range, 90, 110, 30)).toEqual({ start: at(100, 7), end: at(110, 30) });
  expect(Logic.clampToWindow(range, 290, 310, 30)).toEqual({ start: at(290, 0), end: at(300, 4) });
  expect(Logic.clampToWindow(range, 0, 50, 30)).toBeNull();
  expect(Logic.clampToWindow(range, 400, 450, 30)).toBeNull();
});

// invariant: The selection is a range over the data (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('assembleText copies the first row from its offset, every row between in full, the last row to its offset, reading rows the DOM never held', () => {
  const textOf = (index: number) => `row ${index} body`;
  expect(Logic.assembleText(Logic.normalize(at(2, 4), at(2, 7)), textOf)).toBe('2 b');
  expect(Logic.assembleText(Logic.normalize(at(2, 4), at(5, 3)), textOf)).toBe(
    '2 body\nrow 3 body\nrow 4 body\nrow'
  );
  const mounted = new Set([0, 1, 2]);
  const asked: number[] = [];
  const text = Logic.assembleText(Logic.normalize(at(0, 0), at(9, 3)), (index) => {
    asked.push(index);
    return mounted.has(index) ? `dom ${index}` : `data ${index}`;
  });
  expect(asked).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(text.split('\n')[5]).toBe('data 5');
  expect(Logic.assembleText(Logic.normalize(at(0, 0), at(1, 3)), textOf, ' ')).toBe(
    'row 0 body row'
  );
});

// domain-invariant: $VirtualScrollerSelection — If the pointer nears an edge or passes it, then the drag scrolls that way at a speed that ramps from a crawl at the zone's inner boundary to the maximum past the edge: an upward drag scrolls up.
test('the autoscroll speed ramps from the minimum at the edge to the maximum past the ramp, scaled by the creep knob within bounds', () => {
  // A pointer: a shallow zone, and the speed keeps rising past the edge.
  const mouse = Logic.AUTOSCROLL_MOUSE;
  expect(Logic.autoscrollSpeed(0)).toBe(mouse.minPxPerMs);
  expect(Logic.autoscrollSpeed(mouse.zonePx)).toBeLessThan(mouse.maxPxPerMs);
  expect(Logic.autoscrollSpeed(mouse.zonePx + mouse.reachPx)).toBeCloseTo(mouse.maxPxPerMs, 6);
  expect(Logic.autoscrollSpeed(mouse.zonePx + mouse.reachPx * 5)).toBe(mouse.maxPxPerMs);
  // A finger: a deep zone, full speed a fingertip before the edge and held there.
  const touch = Logic.AUTOSCROLL_TOUCH;
  const rise = touch.zonePx - touch.restPx;
  expect(Logic.autoscrollSpeed(0, 1, touch)).toBe(touch.minPxPerMs);
  expect(Logic.autoscrollSpeed(rise / 2, 1, touch)).toBeCloseTo(
    (touch.minPxPerMs + touch.maxPxPerMs) / 2,
    6
  );
  expect(Logic.autoscrollSpeed(rise, 1, touch)).toBeCloseTo(touch.maxPxPerMs, 6);
  expect(Logic.autoscrollSpeed(touch.zonePx, 1, touch)).toBeCloseTo(touch.maxPxPerMs, 6);
  expect(Logic.autoscrollSpeed(touch.zonePx + 500, 1, touch)).toBeCloseTo(touch.maxPxPerMs, 6);
  // The creep knob scales either, within bounds.
  expect(Logic.autoscrollSpeed(0, 2)).toBe(mouse.minPxPerMs * 2);
  expect(Logic.autoscrollSpeed(0, 100)).toBe(mouse.minPxPerMs * 3);
  expect(Logic.autoscrollSpeed(0, 0)).toBe(mouse.minPxPerMs * 0.5);
});

/* ---- text offsets over real nodes ----------------------------------- */

// invariant: Text offsets are measured against the trimmed row text (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a row’s text is the trimmed textContent, and every offset survives the DOM → text → DOM round trip across three text nodes', () => {
  const { dom } = selection(0, 1);
  const row = dom.rows[0];
  expect(Logic.rowText(row)).toBe('#1 — alpha beta gamma 0');
  expect(Logic.leadingWhitespaceLength(row)).toBe(3);
  const text = Logic.rowText(row);
  for (let offset = 0; offset <= text.length; offset++) {
    const caret = Logic.caretInRow(row, offset);
    expect(Logic.offsetInRow(row, caret)).toBe(offset);
  }
  // A caret outside the row resolves to its start; one past its end clamps.
  expect(Logic.offsetInRow(row, { node: document.body, offset: 0 })).toBe(0);
  expect(Logic.offsetInRow(row, { node: row.lastChild!, offset: 999 })).toBe(text.length);
});

// domain-invariant: $VirtualScrollerSelection — If a point is over a row, then the position is that row at the caret's offset; in a gap it is the nearest row along the axis, at its start before it and its end after; over nothing it is null.
test('a point over a row gives that row at the caret, a point past the rows gives the nearest row’s start or end, and an empty wrapper gives nothing', () => {
  const { dom } = selection(10, 3);
  // Row 11 (slot 1): the caret lands 6 characters into the last text node;
  // the bold '#12' comes first, so the text offset is 6 + 3.
  expect(Logic.positionAt(dom.wrapper, 60, 50)).toEqual(at(11, 9));
  // Below the last row: its end. Above the first: its start.
  expect(Logic.positionAt(dom.wrapper, 60, 500)).toEqual(at(12, rowText(12).length));
  expect(Logic.positionAt(dom.wrapper, 60, -500)).toEqual(at(10, 0));
  const empty = stage(0, 0);
  expect(Logic.positionAt(empty.wrapper, 10, 10)).toBeNull();
});

/* ---- the instance: begin, extend, end --------------------------------- */

// invariant: A native selection dies with the node that anchors it (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a drag begins at a logical position, extends by logical positions in either direction, and survives its anchor row leaving the DOM', () => {
  const { instance, dom } = selection(0, 5);
  expect(instance.beginAt(60, 20)).toBe(true);
  expect(instance.dragging.value).toBe(true);
  expect(instance.anchor.value).toEqual(at(0, 8));
  expect(instance.focus.value).toEqual(at(0, 8));
  expect(instance.hasSelection).toBe(false);

  instance.extendTo(30, 100);
  expect(instance.range).toEqual({ start: at(0, 8), end: at(2, 5) });
  expect(instance.selectedRowCount).toBe(3);

  // The anchor row recycles: the range is unchanged, it lives on the data.
  dom.rows[0].remove();
  instance.extendTo(30, 140);
  expect(instance.range).toEqual({ start: at(0, 8), end: at(3, 5) });

  instance.endDrag();
  expect(instance.dragging.value).toBe(false);
  expect(instance.selectedRowCount).toBe(4);
  instance.dispose();
});

// impossible-if-true: $VirtualScrollerSelection — A selection whose anchor equals its focus.
test('a drag that never moved leaves nothing selected', () => {
  const { instance } = selection();
  instance.beginAt(60, 20);
  instance.endDrag();
  expect(instance.hasSelection).toBe(false);
  expect(instance.anchor.value).toBeNull();
  expect(instance.focus.value).toBeNull();
  instance.dispose();
});

// invariant: The copied text is the string the row renders (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('copy assembles the selected text from the owner’s row text with the owner’s join, and takes the copy event over only while something is selected', () => {
  const { instance } = selection(0, 5, ' ');
  const setData = vi.fn();
  const untouched = {
    clipboardData: { setData },
    preventDefault: vi.fn()
  } as unknown as ClipboardEvent;
  instance.onCopyEvent(untouched);
  expect(untouched.preventDefault).not.toHaveBeenCalled();

  instance.beginAt(60, 20);
  instance.extendTo(30, 100);
  instance.endDrag();
  expect(instance.selectedText).toBe(
    [rowText(0).slice(8), rowText(1), rowText(2).slice(0, 5)].join(' ')
  );
  const event = {
    clipboardData: { setData },
    preventDefault: vi.fn()
  } as unknown as ClipboardEvent;
  instance.onCopyEvent(event);
  expect(event.preventDefault).toHaveBeenCalled();
  expect(setData).toHaveBeenCalledWith('text/plain', instance.selectedText);
  expect(instance.copyChipLabel).toBe('Copy');
  expect(instance.copyChipCount).toBe('3');
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelection — If a mousedown is not the primary button or lands on an interactive element, then it is left to the browser; otherwise it begins a selection and takes the native one away.
test('a right button or a click on a link is left alone; a primary press on a row begins the selection and prevents the native one', () => {
  const { instance, dom } = selection();
  const right = press(60, 20, { button: 2 });
  instance.onMouseDown(right);
  expect(right.defaultPrevented).toBe(false);
  expect(instance.dragging.value).toBe(false);

  const link = document.createElement('a');
  dom.rows[0].appendChild(link);
  const onLink = press(60, 20, { target: link });
  instance.onMouseDown(onLink);
  expect(onLink.defaultPrevented).toBe(false);
  expect(Logic.isInteractive(link)).toBe(true);

  const primary = press(60, 20);
  instance.onMouseDown(primary);
  expect(primary.defaultPrevented).toBe(true);
  expect(instance.dragging.value).toBe(true);
  instance.onMouseUp();
  instance.dispose();
});

// invariant: A multi-click selects the word or the row under it (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a double click selects the word under the caret and a triple click the row, as settled ranges with no drag', () => {
  const text = 'alpha  beta gamma';
  expect(Logic.wordBoundsAt(text, 0)).toEqual({ start: 0, end: 5 });
  expect(Logic.wordBoundsAt(text, 3)).toEqual({ start: 0, end: 5 });
  // A caret at the end of a word belongs to that word.
  expect(Logic.wordBoundsAt(text, 5)).toEqual({ start: 0, end: 5 });
  // A caret inside whitespace selects the whitespace run.
  expect(Logic.wordBoundsAt(text, 6)).toEqual({ start: 5, end: 7 });
  expect(Logic.wordBoundsAt(text, 12)).toEqual({ start: 12, end: 17 });
  expect(Logic.wordBoundsAt(text, 99)).toEqual({ start: 12, end: 17 });
  expect(Logic.wordBoundsAt('', 0)).toEqual({ start: 0, end: 0 });
  // Punctuation is its own unit, as in the browser: "divs," yields "divs".
  expect(Logic.wordBoundsAt('divs, more', 1)).toEqual({ start: 0, end: 4 });
  expect(Logic.wordBoundsAt('divs, more', 4)).toEqual({ start: 0, end: 4 });
  expect(Logic.wordBoundsAt('a — b', 2)).toEqual({ start: 2, end: 3 });

  const { instance } = selection(0, 5);
  // Row 1, caret at text offset 8: inside "alpha".
  const double = press(60, 60, { detail: 2 });
  instance.onMouseDown(double);
  expect(double.defaultPrevented).toBe(true);
  expect(instance.dragging.value).toBe(false);
  expect(instance.range).toEqual({ start: at(1, 5), end: at(1, 10) });
  expect(instance.selectedText).toBe('alpha');

  const triple = press(60, 60, { detail: 3 });
  instance.onMouseDown(triple);
  expect(instance.range).toEqual({ start: at(1, 0), end: at(1, rowText(1).length) });
  expect(instance.selectedText).toBe(rowText(1));
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelection — If the pointer nears an edge or passes it, then the drag scrolls that way at a speed that ramps from a crawl at the zone's inner boundary to the maximum past the edge: an upward drag scrolls up.
test('holding the pointer inside the edge zone scrolls forward at a crawl, past the frame faster, above it backward, and returning to the interior stops it', () => {
  const zone = Logic.AUTOSCROLL_MOUSE.zonePx;
  const { instance, owner, dom } = selection(0, 5);
  // A pointer's zone is the last 32 px inside each edge and everything beyond.
  expect(Logic.edgePenetration(dom.frame, 60, 200)).toBe(0);
  expect(Logic.edgePenetration(dom.frame, 60, 400 - zone + 10)).toBe(10);
  expect(Logic.edgePenetration(dom.frame, 60, 450)).toBe(50 + zone);
  expect(Logic.edgePenetration(dom.frame, 60, zone - 10)).toBe(-10);
  expect(Logic.edgePenetration(dom.frame, 60, -30)).toBe(-(30 + zone));
  // Inside the frame the probe is the pointer; outside, the edge.
  expect(Logic.probePoint(dom.frame, 60, 170)).toEqual({ x: 60, y: 170 });
  expect(Logic.probePoint(dom.frame, 60, 450)).toEqual({ x: 1, y: 450 });

  instance.beginAt(60, 20);
  frames.length = 0;
  // 10 px into the bottom zone, still inside the frame: a crawl.
  instance.extendTo(60, 400 - zone + 10);
  expect(frames).toHaveLength(1);
  frames.shift()!(1000);
  expect(owner.scrollBy).toHaveBeenLastCalledWith(Logic.autoscrollSpeed(10) * 16.7);
  // Every write asks the engine to paint what it mounted.
  expect(owner.nudgePaint).toHaveBeenCalledTimes(1);
  // 50 px past the bottom edge: the ramp counts the whole zone plus the overshoot.
  instance.extendTo(60, 450);
  frames.shift()!(1016.7);
  expect(owner.scrollBy.mock.calls.at(-1)![0]).toBeCloseTo(
    Logic.autoscrollSpeed(50 + zone) * 16.7,
    6
  );
  // 30 px above the top edge: the same loop scrolls back.
  instance.extendTo(60, -30);
  frames.shift()!(1033.4);
  expect(owner.scrollBy.mock.calls.at(-1)![0]).toBeCloseTo(
    -Logic.autoscrollSpeed(30 + zone) * 16.7,
    6
  );
  // Back in the interior: the loop stops, and a stale frame does nothing.
  const calls = owner.scrollBy.mock.calls.length;
  instance.extendTo(60, 200);
  frames.shift()!(1050.1);
  expect(owner.scrollBy.mock.calls.length).toBe(calls);
  instance.dispose();
});

// invariant: A drag scrolls from inside the edge zone (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a frame the size of the page still scrolls a selection: the zone lies inside the frame, so a pointer never has to leave it', () => {
  const { instance, owner, dom } = selection(0, 5);
  instance.beginAt(60, 20);
  frames.length = 0;
  instance.extendTo(60, 399);
  expect(frames).toHaveLength(1);
  frames.shift()!(1000);
  expect(owner.scrollBy).toHaveBeenCalled();
  expect(Logic.edgeDistance(dom.frame, 60, 399)).toBe(0);
  instance.dispose();
});

// invariant: A native selection inside the frame is adopted as the logical range (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a native selection the reader makes inside the frame becomes the logical range, while our own re-pins are ignored as echoes, re-seated or not', () => {
  const { instance, dom } = selection(0, 5);
  instance.attach(dom.frame);
  // Our own drag pins the native selection; a selectionchange for it changes nothing.
  instance.beginAt(60, 20);
  instance.extendTo(30, 100);
  instance.endDrag();
  const before = instance.range;
  instance.onSelectionChange();
  expect(instance.range).toEqual(before);

  // The reader extends the native selection (iOS handles, shift+arrows): rows 1 → 3.
  const native = window.getSelection()!;
  native.setBaseAndExtent(dom.rows[1].childNodes[2], 3, dom.rows[3].childNodes[2], 5);
  instance.onSelectionChange();
  expect(instance.range).toEqual({ start: at(1, 5), end: at(3, 7) });
  expect(instance.selectedRowCount).toBe(3);

  // A range that runs past the window is pinned natively on the mounted rows
  // only; the browser re-seating that selection must not shrink the range.
  instance.anchor.value = at(1, 5);
  instance.focus.value = at(40, 2);
  instance.applyHighlight();
  expect(instance.selectedRowCount).toBe(40);
  const reseated = window.getSelection()!;
  const tail = dom.rows[4].childNodes[2] as Text;
  reseated.setBaseAndExtent(dom.rows[1].childNodes[2], 3, tail, tail.data.length);
  instance.onSelectionChange();
  expect(instance.selectedRowCount).toBe(40);

  // A native selection elsewhere on the page is not ours to adopt.
  const elsewhere = document.createElement('p');
  elsewhere.textContent = 'reader text';
  document.body.appendChild(elsewhere);
  native.setBaseAndExtent(elsewhere.firstChild!, 0, elsewhere.firstChild!, 6);
  instance.onSelectionChange();
  expect(instance.range).toEqual({ start: at(1, 5), end: at(40, 2) });
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelection — If a press lands outside the frame, then the selection clears; inside, it stays.
test('a press inside the frame keeps the selection, a press outside drops it', () => {
  const { instance, dom } = selection();
  instance.beginAt(60, 20);
  instance.extendTo(30, 100);
  instance.endDrag();
  instance.onDocumentPress({ target: dom.rows[1] } as unknown as MouseEvent);
  expect(instance.hasSelection).toBe(true);
  instance.onDocumentPress({ target: document.body } as unknown as MouseEvent);
  expect(instance.hasSelection).toBe(false);
  instance.dispose();
});

// invariant: A finger's drag paints without selecting (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('a finger’s drag paints the range through the CSS Highlight API and leaves the native selection alone until release, when the range becomes the native selection', () => {
  const registry = new Map<string, unknown>();
  vi.stubGlobal('CSS', { highlights: registry });
  vi.stubGlobal(
    'Highlight',
    class {
      constructor(public range: Range) {}
    }
  );
  expect(Logic.supportsCssHighlight).toBe(true);
  const { instance } = selection(0, 5);
  const native = window.getSelection()!;
  native.removeAllRanges();

  instance.beginAt(60, 20, 'touch');
  instance.extendTo(30, 100);
  const painted = registry.get(Logic.TOUCH_HIGHLIGHT_NAME) as { range: Range } | undefined;
  expect(painted).toBeDefined();
  expect(painted!.range.toString().length).toBeGreaterThan(0);
  expect(native.rangeCount).toBe(0);

  instance.endDrag();
  expect(registry.has(Logic.TOUCH_HIGHLIGHT_NAME)).toBe(false);
  expect(native.rangeCount).toBe(1);
  expect(native.toString().length).toBeGreaterThan(0);

  instance.clear();
  expect(native.rangeCount).toBe(0);
  // Restore only what this test stubbed — the frame stubs at the top of the file stay.
  vi.stubGlobal('CSS', undefined);
  vi.stubGlobal('Highlight', undefined);
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelection — If the reader dismisses a natively pinned selection, then the logical range and the chip go with it; a collapse of our own making (a range scrolled out, a clear) does not.
test('dismissing the native selection clears the logical range, while our own collapse of it keeps the range', () => {
  const { instance } = selection(0, 5);
  instance.beginAt(60, 20);
  instance.extendTo(30, 100);
  instance.endDrag();
  expect(instance.hasSelection).toBe(true);

  // Our own collapse: the range scrolls out of the window and the native
  // highlight is dropped by applyHighlight — the range stays.
  instance.anchor.value = at(40, 0);
  instance.focus.value = at(45, 3);
  instance.applyHighlight();
  expect(window.getSelection()!.rangeCount).toBe(0);
  instance.onSelectionChange();
  expect(instance.hasSelection).toBe(true);

  // Back on screen, pinned natively; then the reader taps it away.
  instance.anchor.value = at(0, 8);
  instance.focus.value = at(2, 5);
  instance.applyHighlight();
  expect(window.getSelection()!.rangeCount).toBe(1);
  window.getSelection()!.removeAllRanges();
  instance.onSelectionChange();
  expect(instance.hasSelection).toBe(false);
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelection — If a finger's press lands inside the existing range, then the drag extends it from the far end; outside it, or from a mouse, the drag starts over; and isInsideSelection answers whether a point lies on the range.
test('a finger pressing inside the selection extends it from the far end; a press outside or a mouse press starts over', () => {
  const range = Logic.normalize(at(2, 0), at(6, 4));
  expect(Logic.farEnd(range, at(5, 1))).toEqual(at(2, 0));
  expect(Logic.farEnd(range, at(3, 1))).toEqual(at(6, 4));
  expect(Logic.farEnd(range, at(9, 0))).toBeNull();
  expect(Logic.farEnd(null, at(3, 1))).toBeNull();

  const { instance } = selection(0, 5);
  instance.beginAt(60, 20, 'touch');
  instance.extendTo(30, 100);
  instance.endDrag();
  expect(instance.range).toEqual({ start: at(0, 8), end: at(2, 5) });

  // A finger on row 2 (inside) drags down to row 4: the start stays.
  instance.beginAt(30, 100, 'touch');
  instance.extendTo(30, 180);
  instance.endDrag();
  expect(instance.range).toEqual({ start: at(0, 8), end: at(4, 5) });

  expect(instance.isInsideSelection(30, 100)).toBe(true);
  expect(instance.isInsideSelection(60, 190)).toBe(false);
  // A mouse press on row 2 starts over.
  instance.beginAt(30, 100);
  instance.extendTo(30, 180);
  instance.endDrag();
  expect(instance.range).toEqual({ start: at(2, 5), end: at(4, 5) });
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelection — If a touch lands within reach of the native selection's first or last caret, then it is a handle grab; elsewhere, or with no native selection in the frame, it is not.
test('a touch within reach of the native selection’s ends is a handle grab', () => {
  const { instance, dom } = selection(0, 5);
  expect(instance.isNearSelectionHandle(60, 20)).toBe(false);
  instance.beginAt(60, 20);
  instance.extendTo(30, 100);
  instance.endDrag();
  const range = window.getSelection()!.getRangeAt(0);
  // jsdom lays nothing out: give the range two rects, one per end.
  range.getClientRects = () =>
    [
      { left: 60, top: 10, right: 400, bottom: 30 },
      { left: 0, top: 90, right: 30, bottom: 110 }
    ] as unknown as DOMRectList;
  expect(instance.isNearSelectionHandle(62, 12)).toBe(true);
  expect(instance.isNearSelectionHandle(31, 109)).toBe(true);
  expect(instance.isNearSelectionHandle(200, 60)).toBe(false);
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelection — If a native handle drags the selection's end into the edge zone, then the list scrolls under it frame by frame until the end leaves the zone or the selection stops changing; the native selection is never re-pinned while it does.
test('a native handle dragged into the edge zone scrolls the list under it, and the loop stops when the changes stop', () => {
  const { instance, dom, owner } = selection(0, 10);
  instance.attach(dom.frame);
  const native = window.getSelection()!;
  // jsdom lays nothing out: a collapsed range reports the rect of its row.
  const rowOf = (node: Node) =>
    (node.parentElement ?? (node as Element)).closest('.virtual-scroller__item')!;
  const originalRects = Range.prototype.getClientRects;
  Range.prototype.getClientRects = function () {
    return [rowOf(this.startContainer).getBoundingClientRect()] as unknown as DOMRectList;
  };
  frames.length = 0;

  // The reader drags the end handle onto row 8, whose rect sits in the bottom zone.
  native.setBaseAndExtent(dom.rows[1].childNodes[2], 3, dom.rows[8].childNodes[2], 5);
  instance.onSelectionChange();
  expect(instance.range).toEqual({ start: at(1, 5), end: at(8, 7) });
  expect(frames).toHaveLength(1);
  const step = frames.shift()!;
  step(performance.now());
  expect(owner.scrollBy).toHaveBeenCalled();
  expect(frames).toHaveLength(1);
  // A window change while the handle drives must not re-pin the native selection.
  const before = native.toString();
  instance.applyHighlight();
  expect(native.toString()).toBe(before);
  // The changes stop: the loop lets go.
  frames.shift()!(performance.now() + Logic.HANDLE_SETTLE_MS + 10);
  expect(frames).toHaveLength(0);

  Range.prototype.getClientRects = originalRects;
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelection — If a drag begins from a fixed end, then that end is the anchor and the point under the finger the focus, and the drag is any other touch drag from there.
test('a drag from a fixed end keeps that end as the anchor and follows the finger with the focus', () => {
  const { instance } = selection(0, 5);
  expect(instance.beginFromEnd(at(0, 8), 30, 100)).toBe(true);
  expect(instance.dragging.value).toBe(true);
  expect(instance.range).toEqual({ start: at(0, 8), end: at(2, 5) });
  instance.extendTo(30, 140);
  expect(instance.range).toEqual({ start: at(0, 8), end: at(3, 5) });
  instance.endDrag();
  expect(instance.selectedRowCount).toBe(4);
  // The other way round: the end fixed, the finger above it.
  expect(instance.beginFromEnd(at(3, 5), 60, 20)).toBe(true);
  expect(instance.range).toEqual({ start: at(0, 8), end: at(3, 5) });
  instance.endDrag();
  instance.dispose();
});

// domain-invariant: $VirtualScrollerSelection — If the mounted part of the range is asked for as a DOM range, then it spans the clamped carets, and it is null with no range, nothing mounted, or the range scrolled out.
test('the mounted part of the range as a DOM range spans the clamped carets, and is null when nothing of it is on screen', () => {
  const { instance, dom } = selection(0, 5);
  expect(instance.visibleDomRange()).toBeNull();
  instance.anchor.value = at(1, 5);
  instance.focus.value = at(40, 2);
  const painted = instance.visibleDomRange()!;
  expect(painted.startContainer).toBe(dom.rows[1].childNodes[2]);
  expect(painted.startOffset).toBe(3);
  expect(painted.endContainer).toBe(dom.rows[4].childNodes[2]);
  expect(painted.toString().startsWith(rowText(1).slice(5))).toBe(true);
  expect(painted.toString().endsWith(rowText(4).slice(-6))).toBe(true);
  instance.anchor.value = at(40, 0);
  instance.focus.value = at(45, 3);
  expect(instance.visibleDomRange()).toBeNull();
  instance.dispose();
});

// invariant: On a touch device the selection is drawn by the class (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('on a touch device the highlight is the touch class’s overlay and the native selection is never created', () => {
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
  const { instance, dom } = selection(0, 5);
  instance.attach(dom.frame);
  const originalRects = Range.prototype.getClientRects;
  Range.prototype.getClientRects = function () {
    return [{ left: 0, top: 10, width: 200, height: 20 }] as unknown as DOMRectList;
  };
  window.getSelection()!.removeAllRanges();
  instance.beginAt(60, 20, 'touch');
  instance.extendTo(30, 100);
  instance.endDrag();
  const overlay = dom.wrapper.querySelector('.virtual-scroller__touch-selection') as HTMLElement;
  expect(overlay.hidden).toBe(false);
  expect(overlay.querySelectorAll('.virtual-scroller__touch-box')).toHaveLength(1);
  expect(window.getSelection()!.rangeCount).toBe(0);
  // A mouse drag on the same device keeps the native selection and drops the overlay.
  instance.beginAt(60, 20);
  instance.extendTo(30, 100);
  instance.endDrag();
  expect(overlay.hidden).toBe(true);
  expect(window.getSelection()!.rangeCount).toBe(1);
  instance.clear();
  Range.prototype.getClientRects = originalRects;
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
  instance.dispose();
});

// impossible-if-true: $VirtualScrollerSelection — Clearing our selection removing a highlight the reader made elsewhere on the page.
test('clear drops only a highlight inside our frame', () => {
  const { instance } = selection();
  instance.beginAt(60, 20);
  instance.extendTo(30, 100);
  instance.endDrag();
  expect(instance.hasSelection).toBe(true);

  // The reader then selects something elsewhere on the page.
  const elsewhere = document.createElement('p');
  elsewhere.textContent = 'reader text';
  document.body.appendChild(elsewhere);
  const native = window.getSelection()!;
  native.setBaseAndExtent(elsewhere.firstChild!, 0, elsewhere.firstChild!, 6);
  expect(native.toString()).toBe('reader');

  instance.clear();
  expect(instance.hasSelection).toBe(false);
  expect(window.getSelection()!.toString()).toBe('reader');
  instance.dispose();
});
