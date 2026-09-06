// VirtualScrollerSelection.ts — text selection over a VIRTUAL list, hosted
// by the scroller: one instance per scroller, reached through a `$`-getter.
//
// The problem: a native selection is anchored to DOM nodes, and a virtual
// list recycles its nodes. The moment a row scrolls out, the browser's
// selection collapses, and copy only ever sees the rows that happen to be
// mounted. Worse, a native drag-selection makes the browser autoscroll the
// nearest scrollable ancestor, which fights a transform-driven scroll.
//
// The answer: this class OWNS the selection. Anchor and focus are logical
// `{ index, offset }` positions over the DATA (an item index and a character
// offset in that item's text). The native highlight is re-applied to
// whatever rows are mounted, and copy assembles its text from the items.
//
// Three layers live here, top to bottom:
//   - pure statics: viewport point ↔ row ↔ logical position, and the
//     range math (ordering, clamping, text assembly, the autoscroll ramp).
//     The range math has no DOM at all and carries the spec.
//   - the instance: three cells (anchor, focus, dragging), the drag's
//     bookkeeping, and the three pointer-agnostic primitives every input
//     gesture calls — begin at a point, extend to a point, end.
//   - the gestures: the mouse handlers are thin methods here; the touch
//     gesture (long press) is its own hosted class, reached through `$touch`.
//
// What it needs from the scroller arrives through the Owner interface: the
// frame and wrapper elements, the window it renders, the axis, a row's
// text by index, the creep factor, and a way to scroll by a signed delta.
import { ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { VirtualScrollerSelectionTouch } from './VirtualScrollerSelectionTouch';

class $VirtualScrollerSelection {
  /* Knobs */

  /** The row element every position resolves through. */
  static get ROW_SELECTOR() {
    return '.virtual-scroller__item';
  }

  /** The CSS Custom Highlight registered while a finger drags — a paint
   *  with no native selection behind it, so iOS never enters its own
   *  selection handling under the touch. Styled by `::highlight(...)`. */
  static get TOUCH_HIGHLIGHT_NAME() {
    return 'virtual-scroller-selection';
  }

  /** Whether this browser can paint a range without selecting it. */
  static get supportsCssHighlight(): boolean {
    return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight === 'function';
  }

  /** Elements a mousedown must leave alone — they own their own gesture. */
  static get INTERACTIVE_SELECTOR() {
    return 'a, button, input, textarea, select, [contenteditable="true"], [contenteditable=""]';
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

  /** The band inside each edge where a drag begins to scroll — the closer
   *  to the edge, the faster; past the edge it keeps ramping. A drag never
   *  has to leave the frame, which a frame the size of the page has no
   *  outside of. */
  static get AUTOSCROLL_EDGE_ZONE_PX() {
    return 48;
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
        y: number
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
  // invariant: Text offsets are measured against the trimmed row text (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
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
    axis: VirtualScrollerSelection.Axis = 'y'
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
    axis: VirtualScrollerSelection.Axis = 'y'
  ): number {
    const [start, end] = this.axisEdges(container, axis);
    const along = axis === 'y' ? y : x;
    if (along < start) return along - start;
    if (along > end) return along - end;
    return 0;
  }

  /**
   * How far the pointer has pushed INTO the autoscroll zone along the
   * axis, signed: negative toward the start edge (up / left), positive
   * toward the end edge, 0 in the frame's interior. The zone starts
   * AUTOSCROLL_EDGE_ZONE_PX inside each edge and continues past it, so
   * the value grows smoothly from the zone's inner boundary through the
   * edge and beyond — the speed ramp reads it directly.
   */
  // invariant: A drag scrolls from inside the edge zone (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  static edgePenetration(
    container: Element,
    x: number,
    y: number,
    axis: VirtualScrollerSelection.Axis = 'y'
  ): number {
    const [start, end] = this.axisEdges(container, axis);
    const along = axis === 'y' ? y : x;
    const zone = this.AUTOSCROLL_EDGE_ZONE_PX;
    if (along < start + zone) return along - (start + zone);
    if (along > end - zone) return along - (end - zone);
    return 0;
  }

  /**
   * Where to probe for the focus while autoscrolling. Inside the frame
   * the pointer itself: the rows slide under it and the focus follows.
   * Outside, the pointer's coordinate along the axis (clamped into the
   * frame by positionAt) paired with the frame's first pixel across it —
   * the row that just scrolled in under the pointer.
   */
  static probePoint(
    container: Element,
    pointerX: number,
    pointerY: number,
    axis: VirtualScrollerSelection.Axis = 'y'
  ): { x: number; y: number } {
    if (this.edgeDistance(container, pointerX, pointerY, axis) === 0) {
      return { x: pointerX, y: pointerY };
    }
    const bounds = container.getBoundingClientRect();
    return axis === 'y' ? { x: bounds.left + 1, y: pointerY } : { x: pointerX, y: bounds.top + 1 };
  }

  /**
   * The word around a text offset — a run of letters, digits and
   * underscores, the unit a double click selects. mousedown's
   * preventDefault takes the browser's own double-click selection away
   * with the drag-selection, so the class gives it back over the DATA.
   * Punctuation runs and whitespace runs are their own units, as in the
   * browser: a double click on "divs," takes "divs". A caret right after
   * a word belongs to that word (the pointer was on its last letter).
   */
  static wordBoundsAt(text: string, offset: number): { start: number; end: number } {
    if (text.length === 0) return { start: 0, end: 0 };
    const kindOf = (index: number) =>
      /\s/.test(text[index]) ? 'space' : /[\p{L}\p{N}_]/u.test(text[index]) ? 'word' : 'mark';
    let at = Math.min(text.length - 1, Math.max(0, offset));
    if (at > 0 && at === offset && kindOf(at) !== 'word' && kindOf(at - 1) === 'word') at--;
    const kind = kindOf(at);
    let start = at;
    while (start > 0 && kindOf(start - 1) === kind) start--;
    let end = at + 1;
    while (end < text.length && kindOf(end) === kind) end++;
    return { start, end };
  }

  /** The logical position of a DOM caret inside a mounted row of the
   *  wrapper, or null when the node is not in one. */
  static positionOfNode(
    wrapper: Element,
    node: Node | null,
    offset: number
  ): VirtualScrollerSelection.Position | null {
    if (!node || !wrapper.contains(node)) return null;
    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
    const row = element?.closest(this.ROW_SELECTOR) ?? null;
    if (!row) return null;
    return { index: this.rowIndexOf(row), offset: this.offsetInRow(row, { node, offset }) };
  }

  /** A native selection's four coordinates as one comparable string. */
  static selectionSignature(selection: Selection): string {
    const identity = (node: Node | null) =>
      node
        ? node.nodeName +
          '@' +
          Array.prototype.indexOf.call(node.parentNode?.childNodes ?? [], node)
        : '';
    return `${identity(selection.anchorNode)}:${selection.anchorOffset}>${identity(selection.focusNode)}:${selection.focusOffset}`;
  }

  /* Range math — no DOM */

  /** Document order: by row index first, then by offset within the row. */
  static comparePositions(
    left: VirtualScrollerSelection.Position,
    right: VirtualScrollerSelection.Position
  ): number {
    if (left.index !== right.index) return left.index - right.index;
    return left.offset - right.offset;
  }

  /** Anchor and focus in document order — a drag upward is the same
   *  range as the drag downward that covers the same text. */
  static normalize(
    anchor: VirtualScrollerSelection.Position,
    focus: VirtualScrollerSelection.Position
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
    lastRowTextLength: number
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
  // invariant: The selection is a range over the data (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  static assembleText(
    range: VirtualScrollerSelection.Range,
    textOf: (index: number) => string,
    separator = '\n'
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

  /* The instance — one selection per scroller */

  // The constructor runs where the scroller constructs it, in the
  // component's setup: the plain watch lands in the component's scope and
  // is reaped on unmount. Rows recycle under a live selection, so after
  // every window change the highlight is re-pinned to what is mounted.
  // invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  // invariant: The selection is a range over the data (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  constructor(public owner: VirtualScrollerSelection.Owner) {
    watch(
      () => this.owner.visibleItems.value,
      () => this.applyHighlight(),
      { flush: 'post' }
    );
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $VirtualScrollerSelection;
  }

  // MUTABLE STATE — the two logical ends and whether a drag is live
  get anchor() {
    return shallowRef<VirtualScrollerSelection.Position | null>(null);
  }

  get focus() {
    return shallowRef<VirtualScrollerSelection.Position | null>(null);
  }

  get dragging() {
    return ref(false);
  }

  /** The drag's non-reactive bookkeeping: the pointer's last position, the
   *  edge-autoscroll frame, the per-frame follow loop, the listeners. */
  protected readonly drag = {
    pointerX: 0,
    pointerY: 0,
    frame: null as number | null,
    lastTs: null as number | null,
    followLoop: null as number | null,
    listening: false
  };

  /** The native selection this class last applied, as a signature — a
   *  selectionchange that matches it is our own echo, not the reader's. */
  protected readonly native = { applied: '', collapsedByUs: false };

  /** The input driving the live drag: a finger's drag paints through the
   *  CSS Highlight API and hands the range to the native selection only on
   *  release (see applyHighlight). */
  protected readonly input = { touch: false };

  // HOSTED — the touch gesture (long press, then move); attached to the
  // frame by `attach`, disposed with this selection.
  // invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  protected get $touch() {
    return new VirtualScrollerSelectionTouch.Class(this);
  }

  // DERIVED — plain getters over the two cells
  /** The selection in document order, or null when there is none. */
  get range(): VirtualScrollerSelection.Range | null {
    const anchor = this.anchor.value;
    const focus = this.focus.value;
    if (!anchor || !focus) return null;
    const range = this.self.normalize(anchor, focus);
    return this.self.isEmpty(range) ? null : range;
  }

  get hasSelection() {
    return this.range !== null;
  }

  get selectedRowCount() {
    const range = this.range;
    return range ? this.self.rowCount(range) : 0;
  }

  /** The selected text, assembled from the DATA — rows never mounted included. */
  get selectedText() {
    const range = this.range;
    if (!range) return '';
    return this.self.assembleText(
      range,
      (index) => this.owner.rowText(index),
      this.owner.selectionJoin
    );
  }

  /** The copy chip: a phone has no Ctrl+C, so a touch selection shows one. */
  get showsCopyChip() {
    return this.$touch.selected.value && this.hasSelection;
  }

  get copyChipLabel() {
    const count = this.selectedRowCount;
    return `copy ${count.toLocaleString()} ${count === 1 ? 'row' : 'rows'}`;
  }

  /* Lifetime — the scroller calls these from its own mount and unmount */

  attach(element: HTMLElement) {
    this.$touch.attach(element);
    document.addEventListener('selectionchange', this.onSelectionChange);
  }

  dispose() {
    this.end();
    this.$touch.dispose();
    document.removeEventListener('selectionchange', this.onSelectionChange);
  }

  /* The three pointer-agnostic primitives — every gesture calls these */

  /**
   * Begin a selection at a viewport point. Records the anchor as a logical
   * position, arms the drag, installs the document listeners that end it,
   * and starts the per-frame follow. Returns false when the point is on
   * nothing.
   */
  beginAt(x: number, y: number, input: 'mouse' | 'touch' = 'mouse'): boolean {
    const wrapper = this.owner.itemsWrapperElement.value;
    if (!wrapper) return false;
    const anchor = this.self.positionAt(wrapper, x, y, this.owner.selectionAxis);
    if (!anchor) return false;
    this.anchor.value = anchor;
    this.focus.value = anchor;
    this.input.touch = input === 'touch';
    this.dragging.value = true;
    this.drag.pointerX = x;
    this.drag.pointerY = y;
    this.listen();
    this.startFollow();
    this.applyHighlight();
    return true;
  }

  /**
   * Extend the selection to a viewport point: the focus follows the point
   * as a logical position, the highlight is re-pinned, and past the
   * frame's edge the autoscroll loop takes over until the point returns.
   */
  extendTo(x: number, y: number) {
    if (!this.dragging.value) return;
    const wrapper = this.owner.itemsWrapperElement.value;
    const frame = this.owner.scrollElement.value;
    if (!wrapper || !frame) return;
    this.drag.pointerX = x;
    this.drag.pointerY = y;
    const focus = this.self.positionAt(wrapper, x, y, this.owner.selectionAxis);
    if (focus) this.focus.value = focus;
    this.applyHighlight();
    const nearEdge = this.self.edgePenetration(frame, x, y, this.owner.selectionAxis) !== 0;
    if (nearEdge) this.startAutoscroll();
    else this.stopAutoscroll();
  }

  /**
   * Select a whole unit at a viewport point — the word or the row under
   * it — as a settled range, no drag. The outside-press listeners arm so
   * a click elsewhere drops it, like any selection.
   */
  selectAt(x: number, y: number, unit: 'word' | 'row'): boolean {
    const wrapper = this.owner.itemsWrapperElement.value;
    if (!wrapper) return false;
    const position = this.self.positionAt(wrapper, x, y, this.owner.selectionAxis);
    if (!position) return false;
    const text = this.owner.rowText(position.index);
    const bounds =
      unit === 'row'
        ? { start: 0, end: text.length }
        : this.self.wordBoundsAt(text, position.offset);
    this.end();
    this.anchor.value = { index: position.index, offset: bounds.start };
    this.focus.value = { index: position.index, offset: bounds.end };
    this.listenForOutsidePress();
    this.applyHighlight();
    return true;
  }

  /** End the drag: the range stays. A drag that never moved (anchor ===
   *  focus) leaves nothing selected. */
  endDrag() {
    if (!this.dragging.value) return;
    this.dragging.value = false;
    this.stopFollow();
    this.stopAutoscroll();
    this.stopListening();
    if (!this.hasSelection) {
      this.clear();
      return;
    }
    // A finger's drag painted without selecting; now that it has lifted
    // the range becomes the native selection (copy, iOS handles).
    if (this.input.touch) {
      this.input.touch = false;
      this.applyHighlight();
    }
  }

  /* The mouse gesture — thin: press, move, release */

  /**
   * mousedown on the rows: the browser is told NOT to start its own
   * drag-selection (`preventDefault`) — no native selection means no
   * native autoscroll fighting the virtual scroll, and no DOM anchor that
   * dies when its row recycles — and the selection begins at the point.
   * Links, buttons and inputs inside a row keep their own gesture.
   */
  onMouseDown(event: MouseEvent) {
    const isPrimaryButton = event.button === 0;
    if (!isPrimaryButton || this.self.isInteractive(event.target)) return;
    // The second click of a double click selects the word, the third the
    // row — the browser's own multi-click units, which the preventDefault
    // below would otherwise take away with the drag-selection.
    // invariant: A multi-click selects the word or the row under it (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
    if (event.detail >= 2) {
      const unit = event.detail === 2 ? 'word' : 'row';
      if (this.selectAt(event.clientX, event.clientY, unit)) event.preventDefault();
      return;
    }
    // invariant: A native selection dies with the node that anchors it (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
    if (this.beginAt(event.clientX, event.clientY)) event.preventDefault();
  }

  onMouseMove(event: MouseEvent) {
    this.extendTo(event.clientX, event.clientY);
  }

  onMouseUp() {
    this.endDrag();
  }

  /** A press anywhere outside the frame drops the selection, the way a
   *  click elsewhere drops a native one. */
  onDocumentPress(event: MouseEvent | TouchEvent) {
    const frame = this.owner.scrollElement.value;
    const inside = frame && event.target instanceof Node && frame.contains(event.target);
    if (inside) return;
    this.clear();
  }

  /* Copy and clear */

  /**
   * copy: the browser would hand over the mounted fragment of the native
   * highlight. Replace it with the text assembled from the data, which
   * covers every row in the range — including the ones that scrolled out.
   */
  onCopyEvent(event: ClipboardEvent) {
    if (!this.hasSelection || !event.clipboardData) return;
    event.preventDefault();
    event.clipboardData.setData('text/plain', this.selectedText);
  }

  /** The copy chip's action: the clipboard API needs a user gesture, and
   *  the tap on the chip is one. */
  async copy() {
    if (!this.hasSelection) return;
    await navigator.clipboard.writeText(this.selectedText);
    this.clear();
  }

  clear() {
    this.end();
    this.anchor.value = null;
    this.focus.value = null;
    this.$touch.onSelectionCleared();
    // Drop the native highlight too, but only if it is ours — never touch
    // a selection the user made elsewhere on the page.
    const selection = window.getSelection();
    const frame = this.owner.scrollElement.value;
    const ours = selection?.anchorNode && frame && frame.contains(selection.anchorNode);
    if (ours && selection) this.collapseNative(selection);
    this.native.applied = '';
    this.clearCssHighlight();
    this.input.touch = false;
    // Nothing is selected any more: the outside-press listeners go too.
    this.stopListeningForOutsidePress();
  }

  /** Stop the drag and its loops without touching the range — unmount and
   *  clear both go through here. */
  end() {
    this.dragging.value = false;
    this.stopFollow();
    this.stopAutoscroll();
    this.stopListening();
  }

  /* The highlight — re-pinned to what is mounted */

  /**
   * Pin the highlight to the MOUNTED part of the logical range. Called on
   * every move and after every window change, because the rows under the
   * highlight recycle while it lives. The logical range is index-based,
   * so nothing is lost when a boundary row unmounts; the visible part is
   * simply re-derived.
   *
   * Two paints. A mouse drag pins the NATIVE selection, which is what
   * Ctrl+C reads. A finger's drag paints through the CSS Custom Highlight
   * API and leaves the native selection alone until release: on iOS, a
   * native selection changing under a held finger hands the touch to the
   * system's selection handling — the page's touch is cancelled, the
   * autoscroll stops, and the range freezes where the cancel hit. A
   * highlight is only paint; it wakes nothing.
   */
  // invariant: The selection is a range over the data (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  // invariant: A finger's drag paints without selecting (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  applyHighlight() {
    const range = this.range;
    const wrapper = this.owner.itemsWrapperElement.value;
    const selection = window.getSelection();
    if (!wrapper || !selection) return;
    const paintOnly = this.input.touch && this.self.supportsCssHighlight;
    if (!paintOnly) this.clearCssHighlight();

    // No range: make sure no stale highlight of ours lingers.
    if (!range) {
      const ours = selection.anchorNode && wrapper.contains(selection.anchorNode);
      if (ours) this.collapseNative(selection);
      this.clearCssHighlight();
      return;
    }

    // Clamp the range to what is mounted; an end that scrolled out is
    // pinned to the window's boundary row.
    const rows = this.self.mountedRows(wrapper);
    if (rows.length === 0) return;
    const firstIndex = this.self.rowIndexOf(rows[0]);
    const lastRow = rows[rows.length - 1];
    const lastIndex = this.self.rowIndexOf(lastRow);
    const visible = this.self.clampToWindow(
      range,
      firstIndex,
      lastIndex,
      this.self.rowText(lastRow).length
    );
    if (!visible) {
      if (paintOnly) this.clearCssHighlight();
      else this.collapseNative(selection);
      return;
    }

    // Translate the two logical ends back into DOM carets and apply.
    const startRow = this.mountedRowElement(visible.start.index);
    const endRow = this.mountedRowElement(visible.end.index);
    if (!startRow || !endRow) return;
    const start = this.self.caretInRow(startRow, visible.start.offset);
    const end = this.self.caretInRow(endRow, visible.end.offset);
    if (paintOnly) {
      const painted = new Range();
      painted.setStart(start.node, start.offset);
      painted.setEnd(end.node, end.offset);
      CSS.highlights.set(this.self.TOUCH_HIGHLIGHT_NAME, new Highlight(painted));
      return;
    }
    selection.setBaseAndExtent(start.node, start.offset, end.node, end.offset);
    this.native.applied = this.self.selectionSignature(selection);
    this.native.collapsedByUs = false;
  }

  /** Drop the native selection as OUR act, so the selectionchange it
   *  fires is not read as the reader dismissing the range. */
  protected collapseNative(selection: Selection) {
    if (selection.rangeCount === 0) return;
    this.native.collapsedByUs = true;
    selection.removeAllRanges();
  }

  protected clearCssHighlight() {
    if (this.self.supportsCssHighlight) CSS.highlights.delete(this.self.TOUCH_HIGHLIGHT_NAME);
  }

  /**
   * The reader moved the native selection inside the frame by some means
   * that is not ours — iOS's selection handles after a long press or a
   * double tap, shift+arrows on a keyboard. Adopt it as the logical
   * range, so the chip's count and the copied text follow what the
   * reader sees. Our own re-pins echo back as selectionchange too; the
   * signature tells them apart. A live drag owns the range and ignores
   * this.
   */
  // invariant: A native selection inside the frame is adopted as the logical range (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  onSelectionChange() {
    if (this.dragging.value) return;
    const wrapper = this.owner.itemsWrapperElement.value;
    const selection = window.getSelection();
    if (!wrapper || !selection) return;
    if (selection.isCollapsed) {
      // Our own collapses (a range scrolled out of the window, a clear)
      // are marked; any other dismissal of a natively pinned range — a tap
      // on iOS — takes the logical range and its chip with it.
      if (this.native.collapsedByUs) {
        this.native.collapsedByUs = false;
        return;
      }
      if (this.native.applied && this.hasSelection) this.clear();
      return;
    }
    if (this.self.selectionSignature(selection) === this.native.applied) return;
    const anchor = this.self.positionOfNode(wrapper, selection.anchorNode, selection.anchorOffset);
    const focus = this.self.positionOfNode(wrapper, selection.focusNode, selection.focusOffset);
    if (!anchor || !focus) return;
    // The native selection only ever covers the MOUNTED part of the range.
    // A selection that equals that clamped part is our own re-pin however
    // the browser re-seated its nodes — adopting it would shrink a range
    // that runs past the window to the rows on screen.
    if (this.isClampedEcho(anchor, focus)) return;
    this.anchor.value = anchor;
    this.focus.value = focus;
    this.native.applied = this.self.selectionSignature(selection);
    this.listenForOutsidePress();
    // A finger made it: offer the chip, since a phone has no Ctrl+C.
    if (window.matchMedia?.('(pointer: coarse)').matches) this.$touch.selected.value = true;
  }

  /** Whether a native range equals the logical range clamped to the
   *  mounted window — our own highlight, wherever its nodes now sit. */
  protected isClampedEcho(
    anchor: VirtualScrollerSelection.Position,
    focus: VirtualScrollerSelection.Position
  ): boolean {
    const range = this.range;
    const wrapper = this.owner.itemsWrapperElement.value;
    if (!range || !wrapper) return false;
    const rows = this.self.mountedRows(wrapper);
    if (rows.length === 0) return false;
    const lastRow = rows[rows.length - 1];
    const visible = this.self.clampToWindow(
      range,
      this.self.rowIndexOf(rows[0]),
      this.self.rowIndexOf(lastRow),
      this.self.rowText(lastRow).length
    );
    if (!visible) return false;
    const native = this.self.normalize(anchor, focus);
    return (
      this.self.comparePositions(native.start, visible.start) === 0 &&
      this.self.comparePositions(native.end, visible.end) === 0
    );
  }

  mountedRowElement(index: number): Element | null {
    const wrapper = this.owner.itemsWrapperElement.value;
    if (!wrapper) return null;
    return wrapper.querySelector(`${this.self.ROW_SELECTOR}[aria-rowindex="${index + 1}"]`);
  }

  /* The follow loop — the focus tracks the pointer every frame of a drag */

  /**
   * Each animation frame of a drag the focus is re-derived from the last
   * known pointer position and the highlight re-pinned, so content
   * sliding under a stationary pointer — a wheel scroll's lerp, the
   * autoplay creep, a window jump whose rows arrive from below — extends
   * the selection exactly as a pointer move would. A scroll event could
   * not carry this: the wheel path lets Lenis own the transform between
   * events.
   *
   * Two guards. While the edge autoscroll runs it owns the focus, so the
   * follow only re-pins. And inside the frame but over no row (a gap, or
   * rows still sliding into place) the previous focus is kept rather than
   * snapped to a boundary row, which would collapse the range for a frame.
   */
  followPointer() {
    if (this.dragging.value && this.drag.frame === null) {
      const wrapper = this.owner.itemsWrapperElement.value;
      const frame = this.owner.scrollElement.value;
      if (wrapper && frame) {
        const { pointerX, pointerY } = this.drag;
        const axis = this.owner.selectionAxis;
        const inside = this.self.edgeDistance(frame, pointerX, pointerY, axis) === 0;
        const overRow = this.self.rowElementAt(pointerX, pointerY) !== null;
        if (!inside || overRow) {
          const focus = this.self.positionAt(wrapper, pointerX, pointerY, axis);
          if (focus) this.focus.value = focus;
        }
      }
    }
    this.applyHighlight();
  }

  protected startFollow() {
    if (this.drag.followLoop !== null) return;
    const step = () => {
      this.drag.followLoop = null;
      if (!this.dragging.value) return;
      this.followPointer();
      this.drag.followLoop = requestAnimationFrame(step);
    };
    this.drag.followLoop = requestAnimationFrame(step);
  }

  protected stopFollow() {
    if (this.drag.followLoop !== null) cancelAnimationFrame(this.drag.followLoop);
    this.drag.followLoop = null;
  }

  /* The edge autoscroll — the pointer held past the frame scrolls it */

  protected startAutoscroll() {
    if (this.drag.frame !== null) return;
    this.drag.lastTs = null;
    this.drag.frame = requestAnimationFrame(this.autoscrollStep);
  }

  protected stopAutoscroll() {
    if (this.drag.frame !== null) cancelAnimationFrame(this.drag.frame);
    this.drag.frame = null;
    this.drag.lastTs = null;
  }

  /**
   * One autoscroll frame, while the pointer is held past the frame's edge.
   *   1. how far past the edge decides the speed (a ramp, scaled by the
   *      creep knob) and the sign decides the direction — an upward drag
   *      scrolls UP;
   *   2. the scroller scrolls by that signed delta;
   *   3. the focus is extended to the row at the pointer's height, which
   *      after the scroll is a row that just arrived;
   *   4. the highlight is re-pinned and the next frame is requested.
   */
  autoscrollStep(ts: number) {
    this.drag.frame = null;
    if (!this.dragging.value) return;
    const frame = this.owner.scrollElement.value;
    const wrapper = this.owner.itemsWrapperElement.value;
    if (!frame || !wrapper) return;
    const axis = this.owner.selectionAxis;

    // 1 — speed and direction from how far the pointer pushed into the edge zone.
    const distance = this.self.edgePenetration(frame, this.drag.pointerX, this.drag.pointerY, axis);
    if (distance === 0) return;
    const elapsed = this.drag.lastTs === null ? 16.7 : Math.min(50, ts - this.drag.lastTs);
    this.drag.lastTs = ts;
    const speed = this.self.autoscrollSpeed(Math.abs(distance), this.owner.creepFactor);

    // 2 — scroll by speed × time in the pointer's direction.
    this.owner.scrollBy(Math.sign(distance) * speed * elapsed);

    // 3 — the focus follows the pointer along the axis onto the arriving rows.
    const probe = this.self.probePoint(frame, this.drag.pointerX, this.drag.pointerY, axis);
    const focus = this.self.positionAt(wrapper, probe.x, probe.y, axis);
    if (focus) this.focus.value = focus;

    // 4 — re-pin and continue.
    this.applyHighlight();
    this.drag.frame = requestAnimationFrame(this.autoscrollStep);
  }

  /* Document listeners — the drag keeps tracking after the pointer leaves the frame */

  protected listen() {
    if (this.drag.listening) return;
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    this.listenForOutsidePress();
    this.drag.listening = true;
  }

  /** The outside-press listeners: armed by any selection, dropped with it.
   *  Adding twice is safe — the handler is identity-stable. */
  protected listenForOutsidePress() {
    document.addEventListener('mousedown', this.onDocumentPress, true);
    document.addEventListener('touchstart', this.onDocumentPress, true);
  }

  protected stopListeningForOutsidePress() {
    document.removeEventListener('mousedown', this.onDocumentPress, true);
    document.removeEventListener('touchstart', this.onDocumentPress, true);
  }

  protected stopListening() {
    if (!this.drag.listening) return;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.drag.listening = false;
    // The outside-press listeners outlive the drag: they stay armed until
    // the selection itself is cleared.
    if (!this.hasSelection) this.stopListeningForOutsidePress();
  }
}

export namespace VirtualScrollerSelection {
  export const $Class = Static($VirtualScrollerSelection); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — the scroller hosts one
  export type Instance = typeof Class.Instance;

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

  /** What the selection needs from the scroller that hosts it. */
  export interface Owner {
    /** The frame: the scroll element the pointer is measured against. */
    readonly scrollElement: Ref<HTMLElement | null>;
    /** The wrapper the mounted rows live in. */
    readonly itemsWrapperElement: Ref<HTMLElement | null>;
    /** The rendered window — the highlight is re-pinned when it changes. */
    readonly visibleItems: ComputedRef<unknown>;
    readonly selectionAxis: Axis;
    /** What joins the rows of a copied selection. */
    readonly selectionJoin: string;
    /** The drag autoscroll's speed factor (a faster reading creep is a faster drag). */
    readonly creepFactor: number;
    /** A row's text by index — mounted or not — the same string the row renders. */
    rowText(index: number): string;
    /** Scroll by a signed delta along the axis, immediately. */
    scrollBy(delta: number): void;
  }
}
