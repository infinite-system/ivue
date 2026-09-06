// VirtualScrollerSelectionTouch.ts — the touch gesture that produces a text
// selection over a virtual list, hosted by the selection.
//
// On a touchscreen a drag already means SCROLL, so selection needs a way
// in that scrolling does not use. The browser's own convention is the long
// press: hold a finger still for a moment and the next movement selects
// instead of scrolling. This class owns exactly that gesture — the hold
// timer, the slop that cancels it, the mode flag, and the one non-passive
// listener it installs while selecting — and hands the scroller three
// pointer-agnostic calls: begin at a point, extend to a point, end.
//
// The selection itself (the logical range, the highlight, copy) is the
// scroller's, and it does not know or care which input produced the
// points. That is why the mouse path and this class share the primitives
// and nothing else.
import { ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';

class $VirtualScrollerSelectionTouch {
  /* Knobs */

  /** How long a finger must hold still before movement selects. */
  static get LONG_PRESS_MS() {
    return 450;
  }

  /** Movement (px) during the hold that turns the gesture back into a scroll. */
  static get SLOP_PX() {
    return 8;
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

  // invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  constructor(public owner: VirtualScrollerSelectionTouch.Owner) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $VirtualScrollerSelectionTouch;
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

  /** True while a finger holds or selects — collapses of the native
   *  selection in that window are the lock's doing, not the reader's. */
  get holding() {
    return this.hold.timer !== null || this.selecting.value;
  }

  /** The element the listeners are attached to, once attached. */
  get element() {
    return shallowRef<HTMLElement | null>(null);
  }

  /** The hold in progress: where it started and the timer that promotes it. */
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
    moved: false
  };

  /* Lifetime — the host calls these from its own mount and unmount */

  /**
   * Only `touchstart` lives on the element. Touch events keep firing on
   * the node the finger LANDED on — even after that node leaves the DOM,
   * and in a virtual list it does leave: the edge autoscroll recycles the
   * origin row mid-drag. A detached node has no ancestors, so its events
   * reach neither the element nor the document. They do still reach
   * listeners on the node ITSELF. So once a hold is armed, move and end
   * are listened for on the touch's own target node, and released when
   * the gesture ends.
   */
  attach(element: HTMLElement) {
    this.detach();
    this.element.value = element;
    element.addEventListener('touchstart', this.onTouchStart, { passive: true });
  }

  detach() {
    this.stopFollowingTouch();
    const element = this.element.value;
    if (!element) return;
    element.removeEventListener('touchstart', this.onTouchStart);
    this.element.value = null;
  }

  dispose() {
    this.cancelHold();
    this.unlockSelectability();
    this.detach();
    this.selecting.value = false;
  }

  // invariant: Touch events keep firing on the node the finger landed on (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
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

  /* The gesture */

  /** A finger lands: arm the hold. Two fingers is a pinch or a scroll, never a selection. */
  /**
   * A finger lands: arm the hold, and make the rows non-selectable for
   * as long as it lasts. iOS runs its own long-press text selection on
   * selectable text, at about the same moment this hold promotes; from
   * then on the finger's movement belongs to that native machinery and
   * never reaches these listeners. Non-selectable rows give its
   * recogniser nothing to select. WebKit paints no highlight in
   * non-selectable text (native or CSS Highlight API — measured), so
   * selectability returns the moment the promoted finger first moves,
   * right before the anchor is laid down, and on release for a tap or a
   * swipe — a double tap still selects a word.
   */
  onTouchStart(event: TouchEvent) {
    this.cancelHold();
    if (event.touches.length !== 1) return;
    // A button, a link, an input own their own tap — the copy chip above
    // all: arming here would clear the selection before its click copies.
    if (this.owner.isInteractive(event.target)) return;
    const touch = event.touches[0];
    this.hold.origin = { x: touch.clientX, y: touch.clientY };
    this.hold.identifier = touch.identifier;
    this.hold.began = false;
    this.hold.moved = false;
    if (event.target) this.followTouch(event.target);
    // Always locked, selection or not: a finger on selected text is the
    // reader about to EXTEND it with a long press (the owner extends from
    // the far end when the press lands inside the range), and iOS must
    // not take that press. A tap on it clears, as the system's would.
    this.hold.hadSelection = this.owner.hasSelection;
    this.lockSelectability();
    this.hold.timer = setTimeout(() => this.promoteHold(), this.self.LONG_PRESS_MS);
  }

  /** The hold survived: from here movement selects. The anchor is laid
   *  down by the first move, at the point the finger has been resting on. */
  // invariant: A long press turns the next move into a selection (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  promoteHold() {
    this.hold.timer = null;
    this.selecting.value = true;
    this.selected.value = false;
  }

  /** Rows non-selectable while a finger holds — see onTouchStart. */
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

  /**
   * The finger moves. Before the hold fires, moving past the slop means
   * the user is scrolling — cancel the hold and stay out of the way.
   * After it fires, the move extends the selection and is taken away from
   * the scroll: `preventDefault` stops the page, and the flag Lenis
   * already honours for cross-axis gestures stops the list.
   */
  onTouchMove(event: TouchEvent) {
    const touch = this.trackedTouch(event);
    if (!touch) return;
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
    // The first move after the promotion lays the anchor down where the
    // finger rested — with the rows selectable again, so the highlight paints.
    if (!this.hold.began) {
      this.unlockSelectability();
      this.hold.began = this.owner.beginAt(this.hold.origin.x, this.hold.origin.y, 'touch');
      if (!this.hold.began) {
        this.selecting.value = false;
        return;
      }
    }
    // invariant: A long press turns the next move into a selection (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
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
    const promoted = this.selecting.value;
    this.selecting.value = false;
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

export namespace VirtualScrollerSelectionTouch {
  export const $Class = Static($VirtualScrollerSelectionTouch); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — the scroller hosts one
  export type Instance = typeof Class.Instance;

  /** What the gesture needs from the selection that hosts it: the three
   *  pointer-agnostic primitives, and whether a selection exists. */
  export interface Owner {
    beginAt(x: number, y: number, input: 'mouse' | 'touch'): boolean;
    extendTo(x: number, y: number): void;
    endDrag(): void;
    clear(): void;
    /** Whether a touch target owns its own gesture (a button, a link, an input). */
    isInteractive(target: EventTarget | null): boolean;
    readonly hasSelection: boolean;
  }
}
