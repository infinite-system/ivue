// VirtualScrollerSelection.ts — text selection over a VIRTUAL list, as a
// pure capability. A native selection is anchored to DOM nodes, and a
// virtual list recycles its nodes, so the browser's selection collapses
// the moment a row scrolls out and copy only ever sees what is mounted.
// The scroller owns the selection instead: anchor and focus are logical
// `{ index, offset }` positions over the DATA, the highlight is re-applied
// to whatever rows are mounted, and copy assembles its text from the items.
// Everything here is a function of its arguments — the scroller holds the
// three cells of state and calls in.
import { Static } from '../../Static';

class $VirtualScrollerSelection {
  /** The row element every position resolves through. */
  static get ROW_SELECTOR() {
    return '.virtual-scroller__item';
  }

  /** Elements a mousedown must leave alone — they own their own gesture. */
  static get INTERACTIVE_SELECTOR() {
    return 'a, button, input, textarea, select, [contenteditable="true"], [contenteditable=""]';
  }

  /** Drag autoscroll: px per ms at the frame's edge, and the fastest it ramps to. */
  static get AUTOSCROLL_MIN_PX_PER_MS() {
    return 0.15;
  }

  static get AUTOSCROLL_MAX_PX_PER_MS() {
    return 2;
  }

  /** How far past the edge (px) the ramp reaches full speed. */
  static get AUTOSCROLL_RAMP_PX() {
    return 160;
  }

  /* Geometry → position */

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

  /** The browser's caret for a viewport point (both spellings of the API). */
  static caretFromPoint(x: number, y: number): VirtualScrollerSelection.Caret | null {
    const doc = document as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    };
    if (doc.caretPositionFromPoint) {
      const position = doc.caretPositionFromPoint(x, y);
      return position ? { node: position.offsetNode, offset: position.offset } : null;
    }
    const range = document.caretRangeFromPoint?.(x, y);
    return range ? { node: range.startContainer, offset: range.startOffset } : null;
  }

  /** A row's selectable text: its textContent with the template's leading
   *  and trailing whitespace removed, so offsets line up with what copy emits. */
  static rowText(row: Element): string {
    return (row.textContent ?? '').trim();
  }

  static leadingWhitespaceLength(row: Element): number {
    const text = row.textContent ?? '';
    return text.length - text.trimStart().length;
  }

  /** The character offset of a caret inside a row's text (0 … text.length). */
  static offsetInRow(row: Element, caret: VirtualScrollerSelection.Caret): number {
    let raw = 0;
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    let found = false;
    for (let text = walker.nextNode() as Text | null; text; text = walker.nextNode() as Text | null) {
      if (text === caret.node) {
        raw += caret.offset;
        found = true;
        break;
      }
      if (caret.node.nodeType !== Node.TEXT_NODE && caret.node.contains(text)) {
        // the caret sits on an element: its offset counts child nodes; a
        // text node before that child is wholly before the caret
        const child = caret.node.childNodes[caret.offset] ?? null;
        if (child && (child === text || child.contains(text))) {
          found = true;
          break;
        }
      }
      raw += text.data.length;
    }
    if (!found && caret.node !== row && !row.contains(caret.node)) return 0;
    const offset = raw - this.leadingWhitespaceLength(row);
    return Math.max(0, Math.min(this.rowText(row).length, offset));
  }

  /** The text node and offset that render a row-text offset — the inverse
   *  of offsetInRow, for setBaseAndExtent. */
  static caretInRow(row: Element, offset: number): VirtualScrollerSelection.Caret {
    let remaining = offset + this.leadingWhitespaceLength(row);
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    let last: Text | null = null;
    for (let text = walker.nextNode() as Text | null; text; text = walker.nextNode() as Text | null) {
      if (remaining <= text.data.length) return { node: text, offset: Math.max(0, remaining) };
      remaining -= text.data.length;
      last = text;
    }
    return last ? { node: last, offset: last.data.length } : { node: row, offset: 0 };
  }

  /**
   * The logical position for a viewport point inside a container: the row
   * under the point and the caret's offset in it. Between rows, or past the
   * container's edge, the nearest row wins with its start or end.
   */
  static positionAt(container: Element, x: number, y: number): VirtualScrollerSelection.Position | null {
    const bounds = container.getBoundingClientRect();
    const clampedX = Math.min(bounds.right - 1, Math.max(bounds.left + 1, x));
    const clampedY = Math.min(bounds.bottom - 1, Math.max(bounds.top + 1, y));
    const row = this.rowElementAt(clampedX, clampedY);
    if (row) {
      const caret = this.caretFromPoint(clampedX, clampedY);
      const offset = caret ? this.offsetInRow(row, caret) : 0;
      return { index: this.rowIndexOf(row), offset };
    }
    const rows = this.mountedRows(container);
    if (rows.length === 0) return null;
    let nearest = rows[0];
    let nearestDistance = Infinity;
    for (const candidate of rows) {
      const rect = candidate.getBoundingClientRect();
      const distance = clampedY < rect.top ? rect.top - clampedY : clampedY > rect.bottom ? clampedY - rect.bottom : 0;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = candidate;
      }
    }
    const rect = nearest.getBoundingClientRect();
    const offset = clampedY < rect.top ? 0 : this.rowText(nearest).length;
    return { index: this.rowIndexOf(nearest), offset };
  }

  /** Whether a mousedown target owns its own gesture (link, button, input). */
  static isInteractive(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(this.INTERACTIVE_SELECTOR) !== null;
  }

  /* Pure range math */

  static comparePositions(left: VirtualScrollerSelection.Position, right: VirtualScrollerSelection.Position): number {
    return left.index !== right.index ? left.index - right.index : left.offset - right.offset;
  }

  /** Anchor and focus in document order. */
  static normalize(
    anchor: VirtualScrollerSelection.Position,
    focus: VirtualScrollerSelection.Position,
  ): VirtualScrollerSelection.Range {
    return this.comparePositions(anchor, focus) <= 0 ? { start: anchor, end: focus } : { start: focus, end: anchor };
  }

  static isEmpty(range: VirtualScrollerSelection.Range): boolean {
    return this.comparePositions(range.start, range.end) === 0;
  }

  static rowCount(range: VirtualScrollerSelection.Range): number {
    return range.end.index - range.start.index + 1;
  }

  /**
   * The part of a range that falls on mounted rows [firstIndex, lastIndex],
   * with the ends pinned to the window's boundary rows — null when the
   * whole range has scrolled out.
   */
  static clampToWindow(
    range: VirtualScrollerSelection.Range,
    firstIndex: number,
    lastIndex: number,
    lastRowTextLength: number,
  ): VirtualScrollerSelection.Range | null {
    if (range.end.index < firstIndex || range.start.index > lastIndex) return null;
    const start = range.start.index < firstIndex ? { index: firstIndex, offset: 0 } : range.start;
    const end = range.end.index > lastIndex ? { index: lastIndex, offset: lastRowTextLength } : range.end;
    return { start, end };
  }

  /** The copied text: the first row from its offset, the last row to its
   *  offset, every row between in full, one row per line. */
  static assembleText(range: VirtualScrollerSelection.Range, textOf: (index: number) => string): string {
    if (range.start.index === range.end.index) {
      return textOf(range.start.index).slice(range.start.offset, range.end.offset);
    }
    const lines: string[] = [textOf(range.start.index).slice(range.start.offset)];
    for (let index = range.start.index + 1; index < range.end.index; index++) lines.push(textOf(index));
    lines.push(textOf(range.end.index).slice(0, range.end.offset));
    return lines.join('\n');
  }

  /**
   * Drag autoscroll speed (px/ms) for a pointer `distance` px past the
   * frame's edge: a ramp from the minimum at the edge to the maximum at
   * AUTOSCROLL_RAMP_PX, scaled by the scroller's creep knob (a faster
   * reading creep is a faster drag).
   */
  static autoscrollSpeed(distance: number, creepFactor = 1): number {
    const ramp = Math.min(1, Math.max(0, distance) / this.AUTOSCROLL_RAMP_PX);
    const base = this.AUTOSCROLL_MIN_PX_PER_MS + (this.AUTOSCROLL_MAX_PX_PER_MS - this.AUTOSCROLL_MIN_PX_PER_MS) * ramp;
    return base * Math.min(3, Math.max(0.5, creepFactor));
  }

  /** How far past the frame the pointer is: negative above, positive below, 0 inside. */
  static edgeDistance(container: Element, y: number): number {
    const bounds = container.getBoundingClientRect();
    if (y < bounds.top) return y - bounds.top;
    if (y > bounds.bottom) return y - bounds.bottom;
    return 0;
  }
}

export namespace VirtualScrollerSelection {
  export const $Class = Static($VirtualScrollerSelection); // raw — children extend this
  export let Class = $Class; // selected — callers read this

  /** A logical position over the data: item index + character offset in that item's text. */
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
