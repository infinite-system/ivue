// VirtualScrollerSelectionTouchCustom.ts — text selection on a touch
// device, drawn and driven by this class and not by the system.
//
// On a phone three parties contend for one finger: the system's native
// text selection (its long press, its handles, its loupe), the list's own
// touch scroll (Lenis, in JS), and the page. Every rule about who yields
// is the system's and undocumented, and a virtual list cannot live with
// the one thing the native selection is anchored to — DOM nodes that
// recycle. So on a touch device a finger never creates a native selection:
//
//   - the rows are non-selectable for as long as a finger is down, so the
//     system never starts a selection and never draws handles; the long
//     press is this class's alone. Between touches the rows are selectable
//     again — a mouse on the same device keeps its native selection and
//     its Ctrl+C;
//   - the range is painted by this class, as boxes from the DOM range's
//     client rects, laid inside the items wrapper so they move with the
//     transform for free and are recomputed when the range or the window
//     changes;
//   - two handles of this class's own sit at the range's ends; a touch on
//     one extends from the other end, and the edge zone scrolls the list —
//     the same primitives and the same loop the mouse path uses.
//
// The copy chip is the copy affordance (a phone has no Ctrl+C). The mouse
// path is untouched: on a device with no touch points this class is
// inert and the native selection paints as before.
import { ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import type { VirtualScrollerSelection } from './VirtualScrollerSelection';

class $VirtualScrollerSelectionTouchCustom {
  /* Knobs */

  /** How long a finger must hold still before movement selects. */
  static get LONG_PRESS_MS() {
    return 450;
  }

  /** Movement (px) during the hold that turns the gesture back into a scroll. */
  static get SLOP_PX() {
    return 8;
  }

  /** Two taps this close in time and place select the word under them —
   *  the touch form of the double click. */
  static get DOUBLE_TAP_MS() {
    return 300;
  }

  static get DOUBLE_TAP_SLOP_PX() {
    return 24;
  }

  /** For how long after a touch the browser's synthesized mouse events
   *  are still that touch's, and not a mouse. */
  static get MOUSE_AFTER_TOUCH_MS() {
    return 700;
  }

  /** How far beside the selection's end its handle sits — left of the
   *  start, right of the end, and a little below — so the knob never
   *  covers the text it marks. */
  static get HANDLE_OFFSET_PX() {
    return 12;
  }

  /** The handle's touch target, centred on its knob. */
  static get HANDLE_TARGET_PX() {
    return 44;
  }

  static get OVERLAY_CLASS() {
    return 'virtual-scroller__touch-selection';
  }

  static get BOX_CLASS() {
    return 'virtual-scroller__touch-box';
  }

  static get HANDLE_CLASS() {
    return 'virtual-scroller__touch-handle';
  }

  /** Whether this device has a finger at all — the class is inert without
   *  one. Both signals: an emulated WebKit reports no touch points yet
   *  fires touch events. */
  static get isActive(): boolean {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
    return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }

  /* Pure decisions — the spec covers these */

  /** Whether movement of `distance` px during the hold cancels it. */
  static exceedsSlop(distance: number): boolean {
    return distance > this.SLOP_PX;
  }

  /** Straight-line distance between the hold's origin and a point. */
  static distanceFrom(origin: { x: number; y: number }, x: number, y: number): number {
    return Math.hypot(x - origin.x, y - origin.y);
  }

  /**
   * Client rects to boxes relative to an origin rect (the overlay's), each
   * clipped to the frame's rect, empty ones dropped. The clip is this
   * class's, not the browser's: the range spans the padded rows above and
   * below the viewport too, and while the layer is in motion the frame's
   * overflow clip lags the compositor — boxes laid there flash over the
   * page until the scroll settles. A range's rects also include
   * zero-width ones at node boundaries that would draw as hairlines.
   */
  static boxesFrom(
    rects: ArrayLike<DOMRectReadOnly>,
    origin: { left: number; top: number },
    clip?: { left: number; top: number; right: number; bottom: number }
  ): VirtualScrollerSelectionTouchCustom.Box[] {
    const boxes: VirtualScrollerSelectionTouchCustom.Box[] = [];
    for (let index = 0; index < rects.length; index++) {
      const rect = rects[index];
      const left = clip ? Math.max(rect.left, clip.left) : rect.left;
      const top = clip ? Math.max(rect.top, clip.top) : rect.top;
      const right = clip ? Math.min(rect.right, clip.right) : rect.right;
      const bottom = clip ? Math.min(rect.bottom, clip.bottom) : rect.bottom;
      if (right - left < 1 || bottom - top < 1) continue;
      boxes.push({
        left: left - origin.left,
        top: top - origin.top,
        width: right - left,
        height: bottom - top
      });
    }
    return boxes;
  }

  /** Where the two handles sit for a set of boxes: the start above the
   *  first box's top-left, the end below the last box's bottom-right, each
   *  offset outward — the system's own placement, and neither knob covers
   *  the text it marks. */
  static handlePositions(boxes: VirtualScrollerSelectionTouchCustom.Box[]): {
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null {
    if (boxes.length === 0) return null;
    const first = boxes[0];
    const last = boxes[boxes.length - 1];
    const offset = this.HANDLE_OFFSET_PX;
    return {
      start: { x: first.left - offset, y: first.top - offset / 2 },
      end: { x: last.left + last.width + offset, y: last.top + last.height + offset / 2 }
    };
  }

  constructor(public owner: VirtualScrollerSelectionTouchCustom.Owner) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $VirtualScrollerSelectionTouchCustom;
  }

  // MUTABLE STATE — whether a touch selection is being extended right now
  get selecting() {
    return ref(false);
  }

  /** Whether the last touch gesture left a selection behind — the copy
   *  chip's reason to exist, since a phone has no Ctrl+C. */
  get selected() {
    return ref(false);
  }

  /** The frame the touchstart listener is attached to, once attached. */
  get element() {
    return shallowRef<HTMLElement | null>(null);
  }

  /** The overlay inside the items wrapper: boxes and the two handles. */
  get overlay() {
    return shallowRef<HTMLElement | null>(null);
  }

  /** True while a finger holds or selects. */
  get holding() {
    return this.hold.timer !== null || this.selecting.value;
  }

  /** The selection paints through this class on a touch device. */
  get paintsSelection() {
    return this.self.isActive;
  }

  /** Whether a touch ended recently enough that mouse events are its echo. */
  get recentTouch() {
    return performance.now() - this.tap.lastTouchAt < this.self.MOUSE_AFTER_TOUCH_MS;
  }

  /** The hold in progress, and the drag it may turn into. */
  protected readonly hold = {
    origin: { x: 0, y: 0 },
    timer: null as ReturnType<typeof setTimeout> | null,
    identifier: -1,
    /** the node the finger landed on — the one node its events keep reaching */
    target: null as EventTarget | null,
    /** whether the promoted hold has begun a selection (on its first move) */
    began: false,
    /** whether a selection existed when the finger landed — a tap on it clears it */
    hadSelection: false,
    /** whether the finger moved past the slop (a swipe, not a tap) */
    moved: false,
    /** the handle being dragged, if the finger landed on one */
    handle: null as 'start' | 'end' | null,
    /** whether this touch is the second tap of a double tap */
    doubleTapped: false
  };

  /** The last tap, for the double tap; and the last touch, for the mouse
   *  events synthesized after it. */
  protected readonly tap = { at: null as number | null, x: 0, y: 0, lastTouchAt: 0 };

  /** The overlay's parts, created once on attach. */
  protected readonly parts = {
    boxes: [] as HTMLElement[],
    start: null as HTMLElement | null,
    end: null as HTMLElement | null
  };

  /* Lifetime — the host calls these from its own mount and unmount */

  /**
   * Only `touchstart` lives on the frame. Touch events keep firing on the
   * node the finger LANDED on — even after that node leaves the DOM, and
   * in a virtual list it does — so once a hold is armed, move and end are
   * listened for on the touch's own target node.
   */
  // invariant: On a touch device the selection is drawn by the class (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  attach(element: HTMLElement) {
    this.detach();
    if (!this.self.isActive) return;
    this.element.value = element;
    element.addEventListener('touchstart', this.onTouchStart, { passive: true });
    this.mountOverlay();
  }

  detach() {
    this.stopFollowingTouch();
    this.unlockSelectability();
    const element = this.element.value;
    if (!element) return;
    element.removeEventListener('touchstart', this.onTouchStart);
    this.element.value = null;
    this.unmountOverlay();
  }

  /** Rows non-selectable while a finger is down — the system's long press
   *  finds nothing to select, and this class paints its own range. */
  protected lockSelectability() {
    const element = this.element.value;
    if (!element) return;
    element.style.userSelect = 'none';
    element.style.webkitUserSelect = 'none';
  }

  protected unlockSelectability() {
    const element = this.element.value;
    if (!element) return;
    element.style.userSelect = '';
    element.style.webkitUserSelect = '';
  }

  dispose() {
    this.cancelHold();
    this.detach();
    this.selecting.value = false;
  }

  protected mountOverlay() {
    const wrapper = this.owner.itemsWrapperElement.value;
    if (!wrapper || this.overlay.value) return;
    if (!wrapper.style.position) wrapper.style.position = 'relative';
    const overlay = document.createElement('div');
    overlay.className = this.self.OVERLAY_CLASS;
    overlay.hidden = true;
    const makeHandle = (which: 'start' | 'end') => {
      const handle = document.createElement('div');
      handle.className = `${this.self.HANDLE_CLASS} ${this.self.HANDLE_CLASS}--${which}`;
      handle.dataset.handle = which;
      handle.addEventListener('touchstart', this.onHandleTouchStart, { passive: false });
      overlay.appendChild(handle);
      return handle;
    };
    this.parts.start = makeHandle('start');
    this.parts.end = makeHandle('end');
    wrapper.appendChild(overlay);
    this.overlay.value = overlay;
  }

  protected unmountOverlay() {
    const overlay = this.overlay.value;
    if (!overlay) return;
    overlay.remove();
    this.overlay.value = null;
    this.parts.boxes = [];
    this.parts.start = null;
    this.parts.end = null;
  }

  /* Paint — the owner hands over the DOM range of the mounted part */

  /**
   * Draw the range: one box per client rect, the handles at the ends.
   * Boxes are positioned relative to the overlay, which lives inside the
   * transformed wrapper, so a scroll moves them with the rows for free;
   * the owner calls this again whenever the range or the window changes.
   */
  // invariant: On a touch device the selection is drawn by the class (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  paint(range: Range | null) {
    const overlay = this.overlay.value;
    if (!overlay) return;
    if (!range) {
      overlay.hidden = true;
      return;
    }
    const rects = typeof range.getClientRects === 'function' ? range.getClientRects() : [];
    const frame = this.element.value;
    // Shown BEFORE it is measured: a hidden element has no rect, and boxes
    // laid from a zero origin land far outside the frame.
    overlay.hidden = false;
    const origin = overlay.getBoundingClientRect();
    const clip = frame ? frame.getBoundingClientRect() : undefined;
    const boxes = this.self.boxesFrom(rects, origin, clip);
    if (boxes.length === 0) {
      overlay.hidden = true;
      return;
    }
    this.paintBoxes(boxes);
    // The handles sit at the TRUE ends; an end that lies outside the frame
    // has no handle — one pinned at the clip line would sit half outside
    // the frame, where a touch is a press elsewhere.
    const handles = this.self.handlePositions(this.self.boxesFrom(rects, origin));
    const inside = (at: { x: number; y: number }) =>
      !clip ||
      (at.x + origin.left >= clip.left &&
        at.x + origin.left <= clip.right &&
        at.y + origin.top >= clip.top &&
        at.y + origin.top <= clip.bottom);
    this.placeHandle(this.parts.start, handles && inside(handles.start) ? handles.start : null);
    this.placeHandle(this.parts.end, handles && inside(handles.end) ? handles.end : null);
  }

  protected paintBoxes(boxes: VirtualScrollerSelectionTouchCustom.Box[]) {
    const overlay = this.overlay.value;
    if (!overlay) return;
    // Reuse box elements; grow or trim the pool to the count needed.
    while (this.parts.boxes.length < boxes.length) {
      const box = document.createElement('div');
      box.className = this.self.BOX_CLASS;
      overlay.insertBefore(box, this.parts.start);
      this.parts.boxes.push(box);
    }
    while (this.parts.boxes.length > boxes.length) this.parts.boxes.pop()!.remove();
    for (let index = 0; index < boxes.length; index++) {
      const { left, top, width, height } = boxes[index];
      const element = this.parts.boxes[index];
      element.style.transform = `translate(${left}px, ${top}px)`;
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
    }
  }

  protected placeHandle(handle: HTMLElement | null, at: { x: number; y: number } | null) {
    if (!handle) return;
    handle.hidden = at === null;
    if (at) handle.style.transform = `translate(${at.x}px, ${at.y}px)`;
  }

  /* The gestures */

  /** A finger lands on the rows: arm the hold. Two fingers is a pinch or a
   *  scroll, never a selection; a button or a handle owns its own touch. */
  onTouchStart(event: TouchEvent) {
    this.cancelHold();
    if (event.touches.length !== 1) return;
    if (this.owner.isInteractive(event.target)) return;
    if (event.target instanceof Element && event.target.closest(`.${this.self.OVERLAY_CLASS}`))
      return;
    const touch = event.touches[0];
    this.tap.lastTouchAt = performance.now();
    // The second tap of a double tap selects the word under it — with the
    // rows locked like any other touch, so the system's own double-tap
    // selection finds nothing, and followed to its end so the lock lifts.
    if (this.isDoubleTap(touch.clientX, touch.clientY)) {
      this.tap.at = null;
      this.hold.doubleTapped = true;
      this.hold.identifier = touch.identifier;
      if (event.target) this.followTouch(event.target);
      this.lockSelectability();
      if (this.owner.selectAt(touch.clientX, touch.clientY, 'word', 'touch')) {
        this.selected.value = true;
      }
      return;
    }
    this.hold.doubleTapped = false;
    this.hold.origin = { x: touch.clientX, y: touch.clientY };
    this.hold.identifier = touch.identifier;
    this.hold.began = false;
    this.hold.moved = false;
    this.hold.handle = null;
    this.hold.hadSelection = this.owner.hasSelection;
    if (event.target) this.followTouch(event.target);
    this.lockSelectability();
    // Selected text is no different from any other: a swipe over it is a
    // scroll, a tap on it clears it, a long press extends it. Only a
    // handle changes the selection from the first move.
    this.hold.timer = setTimeout(() => this.promoteHold(), this.self.LONG_PRESS_MS);
  }

  /** Whether a touch landing now, here, is the second tap of a double tap. */
  protected isDoubleTap(x: number, y: number): boolean {
    if (this.tap.at === null) return false;
    if (performance.now() - this.tap.at > this.self.DOUBLE_TAP_MS) return false;
    return this.self.distanceFrom(this.tap, x, y) <= this.self.DOUBLE_TAP_SLOP_PX;
  }

  /** The hold survived: from here movement selects. The anchor is laid
   *  down by the first move, at the point the finger has been resting on. */
  // invariant: A long press turns the next move into a selection (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  promoteHold() {
    this.hold.timer = null;
    this.selecting.value = true;
    this.selected.value = false;
  }

  /**
   * A finger lands on a handle: no hold, the drag is immediate. The other
   * end stays fixed and the handle's end follows the finger — through the
   * same extendTo as a mouse, edge zone and all. The dragged handle stops
   * catching pointer events so the rows under it are hit-tested.
   */
  // invariant: On a touch device the selection is drawn by the class (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  // invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  onHandleTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) return;
    const handle = event.currentTarget as HTMLElement;
    const which = handle.dataset.handle as 'start' | 'end';
    const range = this.owner.range;
    if (!range) return;
    event.preventDefault();
    this.cancelHold();
    const touch = event.touches[0];
    this.hold.identifier = touch.identifier;
    this.hold.handle = which;
    this.hold.began = true;
    this.hold.moved = false;
    this.hold.hadSelection = true;
    handle.style.pointerEvents = 'none';
    this.followTouch(handle);
    this.lockSelectability();
    const fixed = which === 'end' ? range.start : range.end;
    this.owner.beginFromEnd(fixed, touch.clientX, touch.clientY);
    this.selecting.value = true;
    this.selected.value = false;
  }

  /**
   * The finger moves. Before the hold fires, moving past the slop means
   * the user is scrolling — cancel the hold and stay out of the way.
   * After it fires, or on a handle, the move extends the selection and is
   * taken away from the scroll: `preventDefault` stops the page, and the
   * flag Lenis already honours for cross-axis gestures stops the list.
   */
  onTouchMove(event: TouchEvent) {
    const touch = this.trackedTouch(event);
    if (!touch || this.hold.doubleTapped) return;
    if (!this.selecting.value) {
      const moved = this.self.distanceFrom(this.hold.origin, touch.clientX, touch.clientY);
      if (this.self.exceedsSlop(moved)) {
        this.hold.moved = true;
        this.cancelHold();
        this.stopFollowingTouch();
        this.unlockSelectability();
      }
      return;
    }
    if (
      this.self.exceedsSlop(this.self.distanceFrom(this.hold.origin, touch.clientX, touch.clientY))
    ) {
      this.hold.moved = true;
    }
    // The first move after a promotion lays the anchor down where the
    // finger rested.
    if (!this.hold.began) {
      this.hold.began = this.owner.beginAt(this.hold.origin.x, this.hold.origin.y, 'touch');
      if (!this.hold.began) {
        this.selecting.value = false;
        return;
      }
    }
    event.preventDefault();
    (event as TouchEvent & { lenisStopPropagation?: boolean }).lenisStopPropagation = true;
    this.owner.extendTo(touch.clientX, touch.clientY);
  }

  /** The finger lifts: a cancelled hold was a tap or a scroll; a selecting
   *  drag ends and leaves its range behind for the copy chip. */
  onTouchEnd() {
    this.cancelHold();
    this.stopFollowingTouch();
    this.unlockSelectability();
    this.restoreHandle();
    this.tap.lastTouchAt = performance.now();
    // The second tap lifting: the word stays selected, nothing else happens.
    if (this.hold.doubleTapped) {
      this.hold.doubleTapped = false;
      return;
    }
    const promoted = this.selecting.value;
    this.selecting.value = false;
    // A tap (no promotion, no move) is remembered for a possible double tap.
    if (!promoted && !this.hold.moved && !this.hold.handle) {
      this.tap.at = performance.now();
      this.tap.x = this.hold.origin.x;
      this.tap.y = this.hold.origin.y;
    }
    // A tap (no promotion, no move) on an existing selection dismisses it.
    if (!promoted && this.hold.hadSelection && !this.hold.moved) {
      this.owner.clear();
      return;
    }
    if (!promoted) return;
    // A hold that never moved is a long press with nothing under it.
    if (!this.hold.began) return;
    this.owner.endDrag();
    this.selected.value = this.owner.hasSelection;
  }

  /** The selection was cleared by other means (an outside tap, a clear). */
  onSelectionCleared() {
    this.selected.value = false;
    this.paint(null);
  }

  protected restoreHandle() {
    if (!this.hold.handle) return;
    const handle = this.hold.handle === 'end' ? this.parts.end : this.parts.start;
    if (handle) handle.style.pointerEvents = '';
    this.hold.handle = null;
  }

  protected followTouch(target: EventTarget) {
    this.stopFollowingTouch();
    // touchmove must be able to preventDefault while selecting (it stops
    // the page from scrolling), so it is the one non-passive listener here.
    target.addEventListener('touchmove', this.onTouchMove as EventListener, { passive: false });
    target.addEventListener('touchend', this.onTouchEnd as EventListener);
    target.addEventListener('touchcancel', this.onTouchEnd as EventListener);
    this.hold.target = target;
  }

  protected stopFollowingTouch() {
    const target = this.hold.target;
    if (!target) return;
    target.removeEventListener('touchmove', this.onTouchMove as EventListener);
    target.removeEventListener('touchend', this.onTouchEnd as EventListener);
    target.removeEventListener('touchcancel', this.onTouchEnd as EventListener);
    this.hold.target = null;
  }

  protected cancelHold() {
    if (this.hold.timer !== null) clearTimeout(this.hold.timer);
    this.hold.timer = null;
  }

  /** The finger this gesture follows, by identifier — a second finger
   *  landing mid-drag must not steal the focus. */
  protected trackedTouch(event: TouchEvent): Touch | null {
    for (const touch of Array.from(event.touches)) {
      if (touch.identifier === this.hold.identifier) return touch;
    }
    return null;
  }
}

export namespace VirtualScrollerSelectionTouchCustom {
  export const $Class = Static($VirtualScrollerSelectionTouchCustom); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — the selection hosts one
  export type Instance = typeof Class.Instance;

  /** A painted box, relative to the overlay. */
  export interface Box {
    left: number;
    top: number;
    width: number;
    height: number;
  }

  /** What the gesture needs from the selection that hosts it. */
  export interface Owner {
    beginAt(x: number, y: number, input: 'mouse' | 'touch'): boolean;
    /** Select the word or the row under a point as a settled range. */
    selectAt(x: number, y: number, unit: 'word' | 'row', input: 'mouse' | 'touch'): boolean;
    /** Begin a drag with one end fixed — a handle drag. */
    beginFromEnd(fixed: VirtualScrollerSelection.Position, x: number, y: number): boolean;
    extendTo(x: number, y: number): void;
    endDrag(): void;
    clear(): void;
    isInteractive(target: EventTarget | null): boolean;
    readonly hasSelection: boolean;
    readonly range: VirtualScrollerSelection.Range | null;
    /** The wrapper the rows live in — the overlay is laid inside it. */
    readonly itemsWrapperElement: { value: HTMLElement | null };
  }
}
