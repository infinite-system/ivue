// VirtualScrollerPadding.ts — adaptive render padding, hosted by the
// scroller: the rows mounted BEYOND the visible window, sized by how fast
// the content is moving.
//
// A fixed pad is the wrong shape. Sit still and six spare rows are six
// rows too many; flick, and the content moves a whole viewport in a few
// frames. Two things then need covering, and they are different:
//
//   - THE LERP GAP. The window walk is anchored at the scroll TARGET, the
//     destination of the wheel lerp, while the transform travels there
//     over many frames. Between the two, the viewport shows rows that sit
//     BEHIND the mounted window — exactly the ones nobody mounted. The
//     gap is target minus animated, in px, known exactly every frame; in
//     rows it is the pad on the trailing side of the window. No guess.
//   - THE LOOKAHEAD. Beyond the target, the next flick lands before the
//     next window does. Rows ahead of the motion, sized by velocity over
//     a lookahead time, are mounted early, held with hysteresis so the
//     decay tail of a flick does not unmount what the next one needs.
//
// Two layers:
//   - pure statics: gap → rows behind, velocity → rows ahead, the split
//     of a pad across the two ends by direction, and the settle rule. No
//     DOM, no state; the spec covers them.
//   - the instance: a plain holder (nothing renders it), and one call the
//     window walk makes per evaluation. Velocity is READ there, never
//     tracked: the walk already reruns on every position change, and a
//     reactive velocity would rerun it for no new information. The one
//     cell is `settledVersion`, bumped by a timer once the flick is over,
//     so the walk runs one last time and the pad shrinks back — without
//     it, a flick that stops the creep would leave its pad mounted.
//
// The hysteresis is what keeps the window from thrashing. A pad grows the
// frame the velocity does; it shrinks only once the velocity has been
// below the grown level for SETTLE_MS, so the decay tail of a flick does
// not unmount rows it will need again if the next flick comes.
import { ref } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';

class $VirtualScrollerPadding {
  /* Knobs */

  /** How far ahead in time the pad covers: the distance the content
   *  travels in this many ms is the distance the pad spans. */
  static get LOOKAHEAD_MS() {
    return 250;
  }

  /** The most rows a pad ever adds ahead — a wild flick mounts this many, not hundreds. */
  static get MAX_ROWS_AHEAD() {
    return 60;
  }

  /** The most rows the lerp gap ever adds behind — a jump beyond this shows canvas for a frame. */
  static get MAX_ROWS_GAP() {
    return 160;
  }

  /** How long the velocity must stay below the held pad before the pad shrinks. */
  static get SETTLE_MS() {
    return 300;
  }

  /** Below this speed (px per frame) the content counts as still. */
  static get STILL_PX_PER_FRAME() {
    return 0.5;
  }

  /** Lenis reports velocity per animation frame; this converts it to per ms. */
  static get FRAME_MS() {
    return 16.7;
  }

  /* Pure decisions — the spec covers these */

  /**
   * Rows the content travels in LOOKAHEAD_MS at `pxPerFrame`, rounded up
   * and capped: the pad that keeps the leading edge covered.
   */
  static rowsAhead(pxPerFrame: number, rowSize: number): number {
    if (rowSize <= 0) return 0;
    const speed = Math.abs(pxPerFrame);
    if (speed < this.STILL_PX_PER_FRAME) return 0;
    const distance = (speed / this.FRAME_MS) * this.LOOKAHEAD_MS;
    return Math.min(this.MAX_ROWS_AHEAD, Math.ceil(distance / rowSize));
  }

  /** Rows between the animated position and the target: the trailing
   *  pad that keeps the viewport covered while the lerp travels. */
  // invariant: The pad covers the lerp gap exactly (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  // invariant: The transform lerps to the target over many frames (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  static rowsBehind(gapPx: number, rowSize: number): number {
    if (rowSize <= 0) return 0;
    return Math.min(this.MAX_ROWS_GAP, Math.ceil(Math.abs(gapPx) / rowSize));
  }

  /** Which way the content moves: 1 forward (down / right), -1 back, 0 still. */
  static directionOf(pxPerFrame: number): -1 | 0 | 1 {
    if (Math.abs(pxPerFrame) < this.STILL_PX_PER_FRAME) return 0;
    return pxPerFrame > 0 ? 1 : -1;
  }

  /**
   * The pad on each end: the base on both; the lookahead rows on the end
   * the content moves TOWARD (scrolling forward, new rows enter at the
   * end); the gap rows on the end it comes FROM (the window sits at the
   * target, the viewport trails it).
   */
  static split(
    base: number,
    ahead: number,
    behind: number,
    direction: -1 | 0 | 1
  ): VirtualScrollerPadding.Pad {
    if (direction > 0) return { before: base + behind, after: base + ahead };
    if (direction < 0) return { before: base + ahead, after: base + behind };
    return { before: base, after: base };
  }

  /**
   * The held level after a new reading, with hysteresis: a higher reading
   * replaces the level at once; a lower one only after SETTLE_MS of
   * lower readings; a direction change drops the level to the reading,
   * since rows held ahead of the old direction are behind the new one.
   */
  static settle(
    held: VirtualScrollerPadding.Held,
    ahead: number,
    direction: -1 | 0 | 1,
    now: number
  ): VirtualScrollerPadding.Held {
    const turned = direction !== 0 && held.direction !== 0 && direction !== held.direction;
    if (turned || ahead >= held.ahead) {
      return { ahead, direction: direction || held.direction, since: now };
    }
    if (now - held.since >= this.SETTLE_MS) {
      return { ahead, direction: direction || held.direction, since: now };
    }
    return held;
  }

  /* The instance — one pad per scroller */

  // invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  constructor(public owner: VirtualScrollerPadding.Owner) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $VirtualScrollerPadding;
  }

  // MUTABLE STATE — bumped once the flick has settled. The walk reads it
  // through pad(), so the bump is what runs the walk one last time.
  // invariant: A pad never outlives its flick (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  // invariant: Lenis is read inside the walk never tracked (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  get settledVersion() {
    return ref(0);
  }

  /** The held level — plain, not reactive: nothing renders it, and the
   *  window walk that reads it already reruns on every scroll position. */
  protected readonly held: VirtualScrollerPadding.Held = { ahead: 0, direction: 0, since: 0 };

  /** The pad the last walk used, for anyone who wants to show it. */
  protected readonly last: VirtualScrollerPadding.Pad = { before: 0, after: 0 };

  /** The settle timer: armed by every walk that pads beyond the base. */
  protected readonly settle = { timer: null as ReturnType<typeof setTimeout> | null };

  /** Rows the last walk mounted ahead of the motion, beyond the base. */
  get rowsAhead() {
    return this.held.ahead;
  }

  get before() {
    return this.last.before;
  }

  get after() {
    return this.last.after;
  }

  /**
   * The pad for this evaluation of the window: the scroller calls it once
   * per walk. The gap rows are exact and follow the lerp frame by frame;
   * the lookahead rows go through the held level. The direction is the
   * gap's when there is one (the lerp says where the content is going),
   * the velocity's otherwise.
   */
  pad(now = performance.now()): VirtualScrollerPadding.Pad {
    const self = this.self;
    this.settledVersion.value;
    const rowSize = this.owner.estimatedItemSize;
    const velocity = this.owner.scrollVelocity;
    const gap = this.owner.scrollGap;
    const behind = self.rowsBehind(gap, rowSize);
    const ahead = self.rowsAhead(velocity, rowSize);
    const direction = behind > 0 ? self.directionOf(gap) : self.directionOf(velocity);
    Object.assign(this.held, self.settle(this.held, ahead, direction, now));
    const pad = self.split(
      this.owner.halfPaddingQuantity,
      this.held.ahead,
      behind,
      this.held.direction || direction
    );
    this.last.before = pad.before;
    this.last.after = pad.after;
    const base = this.owner.halfPaddingQuantity;
    if (pad.before > base || pad.after > base) this.armSettle();
    return pad;
  }

  /** One more walk after the settle window, so a pad never outlives its flick. */
  // invariant: A pad never outlives its flick (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  protected armSettle() {
    if (this.settle.timer !== null) clearTimeout(this.settle.timer);
    this.settle.timer = setTimeout(() => this.onSettled(), this.self.SETTLE_MS + 50);
  }

  onSettled() {
    this.settle.timer = null;
    this.settledVersion.value++;
  }

  dispose() {
    if (this.settle.timer !== null) clearTimeout(this.settle.timer);
    this.settle.timer = null;
  }
}

export namespace VirtualScrollerPadding {
  export const $Class = Static($VirtualScrollerPadding); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — the scroller hosts one
  export type Instance = typeof Class.Instance;

  /** Rows mounted beyond the visible window on each end. */
  export interface Pad {
    before: number;
    after: number;
  }

  /** The held velocity level: rows ahead, the direction they face, and
   *  when that level was set. */
  export interface Held {
    ahead: number;
    direction: -1 | 0 | 1;
    since: number;
  }

  /** What the pad needs from the scroller that hosts it. */
  export interface Owner {
    /** The base pad on each end — the paddingQuantity prop, halved. */
    readonly halfPaddingQuantity: number;
    /** The content's velocity in px per animation frame, signed: positive forward. */
    readonly scrollVelocity: number;
    /** The lerp gap: target minus animated position, in px, signed the same way. */
    readonly scrollGap: number;
    /** The size assumed for an unmeasured row along the axis. */
    readonly estimatedItemSize: number;
  }
}
