// VirtualScrollerSelection.ts — text selection over a VIRTUAL list, as a
// pure capability.
//
// The problem: a native selection is anchored to DOM nodes, and a virtual
// list recycles its nodes. The moment a row scrolls out, the browser's
// selection collapses, and copy only ever sees the rows that happen to be
// mounted. Worse, a native drag-selection makes the browser autoscroll the
// nearest scrollable ancestor, which fights a transform-driven scroll.
//
// The answer: the scroller OWNS the selection. Anchor and focus are logical
// `{ index, offset }` positions over the DATA (an item index and a character
// offset in that item's text). The native highlight is re-applied to
// whatever rows are mounted, and copy assembles its text from the items.
//
// Everything in this class is a function of its arguments. The scroller
// holds the three cells of state (anchor, focus, dragging) and calls in.
// Two kinds of member live here:
//   - geometry: viewport point ↔ row element ↔ logical position (needs a DOM)
//   - range math: ordering, clamping, text assembly, the autoscroll ramp
//     (no DOM at all — these carry the spec)
import { Static } from '../../Static';

class $VirtualScrollerSelection {
  /* Knobs */

  /** The row element every position resolves through. */
  static get ROW_SELECTOR() {
    return '.virtual-scroller__item';
  }

  /** Elements a mousedown must leave alone — they own their own gesture. */
  static get INTERACTIVE_SELECTOR() {
    return (
      'a, button, input, textarea, select, ' + '[contenteditable="true"], [contenteditable=""]'
    );
  }

  /** Drag autoscroll: px per ms right at the frame's edge … */
  static get AUTOSCROLL_MIN_PX_PER_MS() {
    return 0.15;
  }

  /** … and the fastest the ramp reaches. */
  static get AUTOSCROLL_MAX_PX_PER_MS() {
    return 2;
  }

  /** How far past the edge (px) the ramp reaches full speed. */
  static get AUTOSCROLL_RAMP_PX() {
    return 160;
  }

  /* Geometry — viewport point ↔ row ↔ logical position */

  /** The row element under a viewport point, or null between rows. */
  static rowElementAt(x: number, y: number): Element | null {
    const hit = document.elementFromPoint(x, y);
    return hit ? hit.closest(this.ROW_SELECTOR) : null;
  }

  /** The item index a row element renders (aria-rowindex is 1-based). */
  static rowIndexOf(row: Element): number {
    return Number(row.getAttribute('aria-rowindex')) - 1;
  }

  /** The mounted rows inside a container, in document order. */
  static mountedRows(container: Element): Element[] {
    return Array.from(container.querySelectorAll(this.ROW_SELECTOR));
  }

  /**
   * The browser's caret for a viewport point. Two spellings of the same
   * API exist: the standard `caretPositionFromPoint` (Firefox, and Chrome
   * since 128) and WebKit's older `caretRangeFromPoint`. Either yields a
   * DOM node plus an offset inside it.
   */
  static caretFromPoint(x: number, y: number): VirtualScrollerSelection.Caret | null {
    const doc = document as Document & {
      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => { offsetNode: Node; offset: number } | null;
    };
    if (doc.caretPositionFromPoint) {
      const position = doc.caretPositionFromPoint(x, y);
      if (!position) return null;
      return { node: position.offsetNode, offset: position.offset };
    }
    const range = document.caretRangeFromPoint?.(x, y);
    if (!range) return null;
    return { node: range.startContainer, offset: range.startOffset };
  }

  /**
   * A row's selectable text. A template like
   *   <div><b>#1</b> — body</div>
   * carries a newline and indentation inside the element, so the raw
   * textContent starts with whitespace the user never sees. Offsets are
   * measured against the TRIMMED text, which is also what copy emits — the
   * two must agree or a copied row would start a few characters off.
   */
  static rowText(row: Element): string {
    return (row.textContent ?? '').trim();
  }

  /** The whitespace `rowText` trimmed from the front — the correction
   *  between a raw DOM offset and a text offset. */
  static leadingWhitespaceLength(row: Element): number {
    const text = row.textContent ?? '';
    return text.length - text.trimStart().length;
  }

  /**
   * The character offset of a caret inside a row's text (0 … length).
   *
   * A row's text is spread over several text nodes (`#1`, ` — `, the
   * body). The caret names one node and an offset within it; the row
   * offset is the total length of the text nodes BEFORE that node, plus
   * the caret's own offset.
   */
  static offsetInRow(row: Element, caret: VirtualScrollerSelection.Caret): number {
    let raw = 0;
    let found = false;
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);

    // Walk the row's text nodes in order, summing their lengths until the
    // caret's node is reached.
    for (
      let text = walker.nextNode() as Text | null;
      text;
      text = walker.nextNode() as Text | null
    ) {
      // The usual case: the caret sits inside this text node.
      if (text === caret.node) {
        raw += caret.offset;
        found = true;
        break;
      }
      // The caret can also sit on an ELEMENT (a click on the gap between
      // two nodes). Then its offset counts child nodes, and every text
      // node before that child is wholly before the caret.
      if (caret.node.nodeType !== Node.TEXT_NODE && caret.node.contains(text)) {
        const child = caret.node.childNodes[caret.offset] ?? null;
        if (child && (child === text || child.contains(text))) {
          found = true;
          break;
        }
      }
      raw += text.data.length;
    }

    // A caret outside the row altogether resolves to the row's start.
    if (!found && caret.node !== row && !row.contains(caret.node)) return 0;

    // Convert the raw DOM offset to a text offset and keep it in range.
    const offset = raw - this.leadingWhitespaceLength(row);
    return Math.max(0, Math.min(this.rowText(row).length, offset));
  }

  /**
   * The text node and in-node offset that render a row-text offset — the
   * inverse of `offsetInRow`, for `Selection.setBaseAndExtent`.
   */
  static caretInRow(row: Element, offset: number): VirtualScrollerSelection.Caret {
    // Back to raw DOM terms: add the leading whitespace the offset skips.
    let remaining = offset + this.leadingWhitespaceLength(row);
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    let last: Text | null = null;

    // Walk the text nodes, spending the offset until it fits in one.
    for (
      let text = walker.nextNode() as Text | null;
      text;
      text = walker.nextNode() as Text | null
    ) {
      if (remaining <= text.data.length) {
        return { node: text, offset: Math.max(0, remaining) };
      }
      remaining -= text.data.length;
      last = text;
    }

    // Past the end: the end of the last text node, or the row itself when
    // it renders no text at all.
    if (last) return { node: last, offset: last.data.length };
    return { node: row, offset: 0 };
  }

  /**
   * The logical position for a viewport point inside a container.
   *
   * Three cases, in order:
   *   1. the point is over a row → that row, at the caret's offset;
   *   2. the point is between rows, or past the container's edge (the
   *      pointer left the frame mid-drag) → the NEAREST mounted row along
   *      the scroll axis, at its start when the point is before it, at
   *      its end when after;
   *   3. nothing is mounted → null.
   *
   * `axis` is the scroll axis: rows stack vertically ('y'), cards of a
   * horizontal strip stack sideways ('x'). Only case 2 cares.
   */
  static positionAt(
    container: Element,
    x: number,
    y: number,
    axis: VirtualScrollerSelection.Axis = 'y',
  ): VirtualScrollerSelection.Position | null {
    // Clamp the point into the container so `elementFromPoint` and the
    // caret APIs look at the list, not at whatever lies past its edge.
    const bounds = container.getBoundingClientRect();
    const clampedX = Math.min(bounds.right - 1, Math.max(bounds.left + 1, x));
    const clampedY = Math.min(bounds.bottom - 1, Math.max(bounds.top + 1, y));

    // Case 1 — a row under the point: the caret decides the offset.
    const row = this.rowElementAt(clampedX, clampedY);
    if (row) {
      const caret = this.caretFromPoint(clampedX, clampedY);
      const offset = caret ? this.offsetInRow(row, caret) : 0;
      return { index: this.rowIndexOf(row), offset };
    }

    // Case 3 — nothing mounted (an empty list): no position at all.
    const rows = this.mountedRows(container);
    if (rows.length === 0) return null;

    // Case 2 — in a gap or past the edge: the row with the smallest
    // distance to the point ALONG THE AXIS wins.
    const along = axis === 'y' ? clampedY : clampedX;
    let nearest = rows[0];
    let nearestDistance = Infinity;
    for (const candidate of rows) {
      const [before, after] = this.axisEdges(candidate, axis);
      const distance = along < before ? before - along : along > after ? along - after : 0;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = candidate;
      }
    }

    // Before the nearest row selects from its start; after, to its end.
    const [before] = this.axisEdges(nearest, axis);
    const offset = along < before ? 0 : this.rowText(nearest).length;
    return { index: this.rowIndexOf(nearest), offset };
  }

  /** A row's two edges along the scroll axis: [top, bottom] or [left, right]. */
  static axisEdges(element: Element, axis: VirtualScrollerSelection.Axis): [number, number] {
    const rect = element.getBoundingClientRect();
    return axis === 'y' ? [rect.top, rect.bottom] : [rect.left, rect.right];
  }

  /** Whether a mousedown target owns its own gesture (link, button, input). */
  static isInteractive(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(this.INTERACTIVE_SELECTOR) !== null;
  }

  /** How far past the frame the pointer is along the scroll axis:
   *  negative before the start edge (above / left), positive past the end
   *  edge (below / right), 0 inside. */
  static edgeDistance(
    container: Element,
    x: number,
    y: number,
    axis: VirtualScrollerSelection.Axis = 'y',
  ): number {
    const [start, end] = this.axisEdges(container, axis);
    const along = axis === 'y' ? y : x;
    if (along < start) return along - start;
    if (along > end) return along - end;
    return 0;
  }

  /**
   * Where to probe for the focus while autoscrolling with the pointer
   * held outside the frame: the pointer's coordinate along the axis
   * (clamped into the frame by positionAt) paired with the frame's first
   * pixel across it — the row that just scrolled in under the pointer.
   */
  static probePoint(
    container: Element,
    pointerX: number,
    pointerY: number,
    axis: VirtualScrollerSelection.Axis = 'y',
  ): { x: number; y: number } {
    const bounds = container.getBoundingClientRect();
    return axis === 'y' ? { x: bounds.left + 1, y: pointerY } : { x: pointerX, y: bounds.top + 1 };
  }

  /* Range math — no DOM */

  /** Document order: by row index first, then by offset within the row. */
  static comparePositions(
    left: VirtualScrollerSelection.Position,
    right: VirtualScrollerSelection.Position,
  ): number {
    if (left.index !== right.index) return left.index - right.index;
    return left.offset - right.offset;
  }

  /** Anchor and focus in document order — a drag upward is the same
   *  range as the drag downward that covers the same text. */
  static normalize(
    anchor: VirtualScrollerSelection.Position,
    focus: VirtualScrollerSelection.Position,
  ): VirtualScrollerSelection.Range {
    if (this.comparePositions(anchor, focus) <= 0) {
      return { start: anchor, end: focus };
    }
    return { start: focus, end: anchor };
  }

  static isEmpty(range: VirtualScrollerSelection.Range): boolean {
    return this.comparePositions(range.start, range.end) === 0;
  }

  static rowCount(range: VirtualScrollerSelection.Range): number {
    return range.end.index - range.start.index + 1;
  }

  /**
   * The part of a range that falls on the mounted rows [firstIndex,
   * lastIndex] — the only part a native highlight can show.
   *
   * An end that scrolled out is pinned to the window's boundary row: the
   * start to the first mounted row's beginning, the end to the last
   * mounted row's end. Null when the whole range is off-screen.
   */
  static clampToWindow(
    range: VirtualScrollerSelection.Range,
    firstIndex: number,
    lastIndex: number,
    lastRowTextLength: number,
  ): VirtualScrollerSelection.Range | null {
    const scrolledOut = range.end.index < firstIndex || range.start.index > lastIndex;
    if (scrolledOut) return null;
    const start = range.start.index < firstIndex ? { index: firstIndex, offset: 0 } : range.start;
    const end =
      range.end.index > lastIndex ? { index: lastIndex, offset: lastRowTextLength } : range.end;
    return { start, end };
  }

  /**
   * The copied text: the first row from its offset, every row between in
   * full, the last row up to its offset, joined by `separator` — a line
   * break for stacked rows, a space for the chunks of a one-line marquee.
   * `textOf` is asked for every row in the span — mounted or not — which
   * is what lets copy reach rows the DOM never held at the same time.
   */
  static assembleText(
    range: VirtualScrollerSelection.Range,
    textOf: (index: number) => string,
    separator = '\n',
  ): string {
    const { start, end } = range;
    // A single row: the slice between the two offsets.
    if (start.index === end.index) {
      return textOf(start.index).slice(start.offset, end.offset);
    }
    const lines: string[] = [textOf(start.index).slice(start.offset)];
    for (let index = start.index + 1; index < end.index; index++) {
      lines.push(textOf(index));
    }
    lines.push(textOf(end.index).slice(0, end.offset));
    return lines.join(separator);
  }

  /**
   * Drag autoscroll speed (px/ms) for a pointer `distance` px past the
   * frame's edge.
   *
   * A linear ramp: the minimum right at the edge, the maximum once the
   * pointer is AUTOSCROLL_RAMP_PX past it, so a small overshoot crawls
   * and a big one flies. The scroller's creep knob scales it — a faster
   * reading creep is a faster drag — within sane bounds either way.
   */
  static autoscrollSpeed(distance: number, creepFactor = 1): number {
    const ramp = Math.min(1, Math.max(0, distance) / this.AUTOSCROLL_RAMP_PX);
    const span = this.AUTOSCROLL_MAX_PX_PER_MS - this.AUTOSCROLL_MIN_PX_PER_MS;
    const base = this.AUTOSCROLL_MIN_PX_PER_MS + span * ramp;
    return base * Math.min(3, Math.max(0.5, creepFactor));
  }
}

export namespace VirtualScrollerSelection {
  // raw — children extend this
  export const $Class = Static($VirtualScrollerSelection);
  export let Class = $Class; // selected — callers read this

  /** The scroll axis: rows stack down ('y'), cards stack sideways ('x'). */
  export type Axis = 'x' | 'y';

  /** A logical position over the data: item index + character offset in
   *  that item's text. */
  export interface Position {
    index: number;
    offset: number;
  }

  /** A normalized selection: start before end in document order. */
  export interface Range {
    start: Position;
    end: Position;
  }

  /** A DOM caret: a node and an offset within it. */
  export interface Caret {
    node: Node;
    offset: number;
  }
}
