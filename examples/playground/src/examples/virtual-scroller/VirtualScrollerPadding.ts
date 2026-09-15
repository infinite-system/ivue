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
//   - the instance: a plain holder and nothing else — no reactive cell, no
//     timer. Velocity is READ inside the one call the window walk makes per
//     evaluation, never tracked: the walk already reruns on every position
//     change, and a reactive velocity would rerun it for no new information.
//
// The hysteresis is what keeps the window from thrashing. A pad grows the
// frame the velocity or the gap does, and it is released only on a frame
// the content is MOVING, once SETTLE_MS has passed since it last grew. So
// the decay tail of a flick never unmounts a burst of rows mid-glide (a
// visible hitch on a phone), and a pad outlives the flick that grew it,
// down to the reader's next move — releasing rows is a layout change, and
// at rest it is the only thing that moves. The gap rows are held the same
// way: exact per frame they would be trimmed on every walk of the tail.
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

  /** Below this speed the content counts as still, in px per MILLISECOND —
   *  the 0.5 px per frame this was tuned at, over a 60 Hz frame. Stated per
   *  ms because a per-frame threshold means a different real speed on every
   *  refresh rate, and Android runs at 90 and 120 where iOS mostly runs 60. */
  static get STILL_PX_PER_MS() {
    return 0.5 / 16.7;
  }

  /** Below this lerp gap (px) the content counts as landed — the lerp's own settle band. */
  static get STILL_GAP_PX() {
    return 0.5;
  }

  /* Pure decisions — the spec covers these */

  /**
   * Rows the content travels in LOOKAHEAD_MS at `pxPerFrame`, rounded up
   * and capped: the pad that keeps the leading edge covered.
   */
  static rowsAhead(pxPerMs: number, rowSize: number): number {
    if (rowSize <= 0) return 0;
    const speed = Math.abs(pxPerMs);
    if (speed < this.STILL_PX_PER_MS) return 0;
    const distance = speed * this.LOOKAHEAD_MS;
    return Math.min(this.MAX_ROWS_AHEAD, Math.ceil(distance / rowSize));
  }

  /** Rows between the animated position and the target: the trailing
   *  pad that keeps the viewport covered while the lerp travels. */
  // invariant: The pad covers the lerp gap exactly (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  // invariant: The transform lerps to the target over many frames (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  static rowsBehind(gapPx: number, rowSize: number): number {
    if (rowSize <= 0) return 0;
    // a sub-pixel gap is the lerp's settle band: at rest, no rows
    if (Math.abs(gapPx) < this.STILL_GAP_PX) return 0;
    return Math.min(this.MAX_ROWS_GAP, Math.ceil(Math.abs(gapPx) / rowSize));
  }

  /** Which way the content moves: 1 forward (down / right), -1 back, 0 still. */
  static directionOf(pxPerMs: number): -1 | 0 | 1 {
    if (Math.abs(pxPerMs) < this.STILL_PX_PER_MS) return 0;
    return pxPerMs > 0 ? 1 : -1;
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
   * — rows ahead or rows behind — raises its level at once; a lower one
   * never shrinks either while the content still moves — the decay tail
   * of a flick is when a burst of unmounts would be seen as a hitch — and
   * a still reading releases both once the settle window has passed since
   * the last growth, on the last frame the position changed; a direction
   * change turns the direction and keeps the levels —
   * the rows held the old way release at rest with the rest, never on the
   * reversal's own frame.
   */
  static settle(
    held: VirtualScrollerPadding.Held,
    ahead: number,
    behind: number,
    gapPx: number,
    direction: -1 | 0 | 1,
    now: number
  ): VirtualScrollerPadding.Held {
    // a reversal turns the direction and keeps the levels: the rows held
    // the old way unmount at rest like any other — dropping them here put
    // a burst of unmounts on the very frame the finger reversed
    const turned = direction !== 0 && held.direction !== 0 && direction !== held.direction;
    const grew = ahead > held.ahead || behind > held.behind || gapPx > held.gapPx;
    if (turned || grew) {
      return {
        ahead: Math.max(ahead, held.ahead),
        behind: Math.max(behind, held.behind),
        gapPx: Math.max(gapPx, held.gapPx),
        direction: direction || held.direction,
        since: now
      };
    }
    // The release goes back to the base once the reading has been still for
    // the settle window — and it lands on the last frame the position
    // CHANGED, because the walk runs on a position change and nothing forces
    // one at rest. That timing is the whole point. Releasing rows folds
    // their heights back into the leading spacer, Blink lays out in 1/64 px,
    // and the sum of N row boxes does not round to the one box replacing
    // them: every row below moves by the residual (measured: 3/64 px). Too
    // small to see as motion, but the raster it forces re-snaps each line
    // box from a new sub-pixel phase, so some lines hop a pixel and their
    // neighbours do not. On a moving frame nobody can see it. On a still
    // one it is the only thing on screen that moves.
    const still = ahead === 0 && behind === 0;
    const padded = held.ahead > 0 || held.behind > 0 || held.gapPx > 0;
    if (still && padded && now - held.since >= this.SETTLE_MS) {
      return { ahead: 0, behind: 0, gapPx: 0, direction: held.direction, since: now };
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

  /** The held level — plain, not reactive: nothing renders it, and the
   *  window walk that reads it already reruns on every scroll position. */
  protected readonly held: VirtualScrollerPadding.Held = {
    ahead: 0,
    behind: 0,
    gapPx: 0,
    direction: 0,
    since: 0
  };

  /** The pad the last walk used, for anyone who wants to show it. */
  protected readonly last: VirtualScrollerPadding.Pad = { before: 0, after: 0 };

  /** Rows the last walk mounted ahead of the motion, beyond the base. */
  get rowsAhead() {
    return this.held.ahead;
  }
  /** Rows the last walk held behind the target, over the lerp gap. */
  get rowsBehind() {
    return this.held.behind;
  }
  /** The furthest a lerp gap is worth ANIMATING across: the row cap in
   *  pixels of the estimate. A landing reads it and refuses to glide
   *  farther, because there is no honest animation over content nobody
   *  mounts. The walk does NOT clamp to it — the gap the walk covers comes
   *  from a gesture, whose reach is already bounded by its own inertia, and
   *  clamping the walk could only ever take coverage away from a reader
   *  mid-flick. */
  get coverableGapPx(): number {
    return this.self.MAX_ROWS_GAP * this.owner.estimatedItemSize;
  }

  /** The held gap in px on the START side: scrolling forward the animated
   *  position is before the target, and the walk reaches back to it. */
  get gapStartPx() {
    return this.held.direction > 0 ? this.held.gapPx : 0;
  }

  /** The held gap in px on the END side: scrolling back the animated
   *  position is past the target, and the walk reaches on to it. */
  get gapEndPx() {
    return this.held.direction < 0 ? this.held.gapPx : 0;
  }

  get before() {
    return this.last.before;
  }

  get after() {
    return this.last.after;
  }

  /**
   * The pad for this evaluation of the window: the scroller calls it once
   * per walk. The gap rows and the lookahead rows both go through the
   * held level: they grow at once and release together at rest. The
   * direction is the gap's when there is one (the lerp says where the
   * content is going), the velocity's otherwise.
   */
  pad(now = performance.now()): VirtualScrollerPadding.Pad {
    const self = this.self;
    const rowSize = this.owner.estimatedItemSize;
    const velocity = this.owner.scrollVelocity;
    const gap = this.owner.scrollGap;
    const behind = self.rowsBehind(gap, rowSize);
    const ahead = self.rowsAhead(velocity, rowSize);
    const gapPx = Math.abs(gap) < self.STILL_GAP_PX ? 0 : Math.abs(gap);
    const direction = behind > 0 ? self.directionOf(gap) : self.directionOf(velocity);
    Object.assign(this.held, self.settle(this.held, ahead, behind, gapPx, direction, now));
    const pad = self.split(
      this.owner.halfPaddingQuantity,
      this.held.ahead,
      this.held.behind,
      this.held.direction || direction
    );
    this.last.before = pad.before;
    this.last.after = pad.after;
    return pad;
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

  /** The held level: rows ahead of the motion, rows behind the target over
   *  the lerp gap, the direction they face, and when the level last grew. */
  export interface Held {
    ahead: number;
    behind: number;
    /** the lerp gap in px, held: the walk's pixel extension over the rows between */
    gapPx: number;
    direction: -1 | 0 | 1;
    since: number;
  }

  /** What the pad needs from the scroller that hosts it. */
  export interface Owner {
    /** The base pad on each end — the paddingQuantity prop, halved. */
    readonly halfPaddingQuantity: number;
    /** The content's speed in px per MILLISECOND, signed: positive forward.
     *  Per ms rather than per frame so a 120 Hz display sizes the same pad a
     *  60 Hz one does for the same motion. */
    readonly scrollVelocity: number;
    /** The lerp gap: target minus animated position, in px, signed the same way. */
    readonly scrollGap: number;
    /** The size assumed for an unmeasured row along the axis. */
    readonly estimatedItemSize: number;
  }
}
