// VirtualScrollerLanding.ts — landing on an ITEM, hosted by the scroller:
// a seek, a scrollbar drag, a step-mode snap. Everything that names a row
// and puts it where the reader should see it, and keeps it there while the
// list is still learning its own sizes.
//
// The problem is that a landing is computed from an estimate. `scrollToIndex`
// asks where item 4,000 is, and the answer is a prefix sum over rows that
// have mostly never rendered; the jump lands, the fresh window mounts, and
// every row that measures shifts the target out from under the reader. So a
// landing is not one write — it is a write plus a CONVERGE LOOP: re-apply the
// target on every shift of its position, and let go only once the position
// has been quiet long enough that the waves are done.
//
// Letting go is the whole difficulty, and it has three exits:
//
//   - QUIET. A timer the loop re-arms on every wave. A fixed disarm instead
//     loses the race against late waves — slot hydration, fonts, images — and
//     leaves the reader a paragraph or two off the target.
//   - THE READER TOOK OVER. A wheel glide, or the reading creep moving on. A
//     creep that kept mounting rows shifted the target at every mount, and
//     every shift re-pinned the landing under it: a 6 px snap-back every few
//     frames, for as long as the creep ran.
//   - THE POSITION IS NO LONGER THE LANDING'S. A glide that ended between two
//     waves, a scrollbar drag. Re-pinning now would yank the reader back to a
//     target they left on purpose.
//
// A new seek supersedes the live one, so a stale loop can never fire on an
// unrelated size change later. And a shift the CONTENT made — rows measuring
// above the reader — is not the reader moving, so the scroller tells the
// landing to follow it (`shiftLanding`) instead of letting the loop read it
// as a take-over.
//
// Two spaces meet here and must not be confused. A seek bar names an ITEM
// (index space): the landing promises a row, which is size-independent and so
// survives the estimate refining under it. The built-in thumb renders a
// POSITION (the scrollable range), so its drag has to land where it points —
// index space cannot express that when one item outsizes the container, since
// the last item's start is far from the end of the content. `toFraction` is
// the first, `toProgress` the second, and both resolve to an item plus an
// in-item fraction before riding the same converge loop.
import { nextTick, watch, type ComputedRef, type Ref } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import type { VirtualScrollerGeometry } from './VirtualScrollerGeometry';

class $VirtualScrollerLanding {
  /** How long the position must hold still before a converge loop lets go. */
  static readonly QUIET_MS = 600;

  /** How long after the last input step mode waits before it snaps. */
  static readonly SNAP_MS = 160;

  /** How often the snap re-checks while an input or a lerp is still live. */
  static readonly SNAP_RETRY_MS = 90;

  /** Past this much drift the position is no longer the landing's. */
  static readonly TAKEOVER_PX = 1;

  // invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  constructor(public owner: VirtualScrollerLanding.Owner) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $VirtualScrollerLanding;
  }

  /** The live converge loop — one at a time, and plain: nothing renders it. */
  protected readonly converge = {
    /** ends the loop and clears this holder; null when none is armed */
    stop: null as (() => void) | null,
    /** re-applies the target at the sizes of the moment */
    reapply: null as (() => void) | null,
    /** the quiet timer, re-armed on every wave */
    quietTimer: null as ReturnType<typeof setTimeout> | null,
    /** the position the loop last landed on, after the clamp */
    appliedPosition: null as number | null
  };

  /** Step mode's debounce: the snap waits for the input to rest. */
  protected readonly snap = { timer: undefined as ReturnType<typeof setTimeout> | undefined };

  /** Whether a converge loop is live — the reader has not taken over yet. */
  get isConverging(): boolean {
    return this.converge.stop !== null;
  }

  /** The position the live loop last landed on, or null when none is armed. */
  get appliedPosition(): number | null {
    return this.converge.appliedPosition;
  }

  /**
   * Main-axis offset that places item `index` per the snapAlign prop — 0 for
   * 'start'; half the free space for 'center'. Clamped landings at the bounds
   * come free from the scroller's own position clamps. The rendered flow
   * starts AFTER the container's leading main-axis padding while prefix-sum
   * positions do not include it — subtract it, or every "centered" landing
   * sits paddingStart px past center.
   */
  alignOffset(index: number): number {
    if (this.owner.snapAlign !== 'center') return 0;
    const size = this.owner.geometry.sizeOf(index);
    return Math.max(0, (this.owner.containerSpan - size) / 2 - this.owner.mainAxisPaddingStart());
  }

  /**
   * Land on item `index` and hold it there while the sizes settle.
   *
   * @param topOffsetPx pushes the landing DOWN so the target sits this many
   * pixels below the viewport top — context above a jumped-to item (and clear
   * of any fade overlay at the reading area's top edge).
   * @param innerFraction 0..1 point WITHIN the item to align to (0 = its
   * top). A search match deep inside a paragraph taller than the viewport
   * would otherwise land below the fold — the item's size keeps refining
   * through the loop, so this converges onto the real text position.
   */
  // invariant: A seek names an item not a pixel (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  toIndex(
    index: number,
    afterCallback?: () => void,
    animate = true,
    topOffsetPx = this.alignOffset(index),
    innerFraction = 0
  ) {
    const owner = this.owner;
    const targetPosition = () => {
      const position = owner.geometry.positionOf(index);
      if (position === undefined) return undefined;
      return Math.max(0, position + innerFraction * owner.geometry.sizeOf(index) - topOffsetPx);
    };

    const position = targetPosition();
    if (position === undefined || !owner.hasFrame) return;

    owner.resetScrollTop();
    // A glide and a converge loop are mutually exclusive, and the reason is
    // the same one that makes a far glide dishonest: convergence exists
    // because a LONG landing is computed from an estimate and the fresh
    // window then measures under it. A glide only happens when the travel is
    // short enough that the rows between are already mounted and measured —
    // so there is nothing left to converge onto, and a re-apply would only
    // teleport over the glide it was meant to protect.
    if (this.land(position, animate, afterCallback)) return;

    const setScroll = () => {
      nextTick(() => {
        const position = targetPosition();
        if (position === undefined) return;
        owner.setScrollPosition(-position);
        this.converge.appliedPosition = owner.scrollPosition.value;
        nextTick(() => {
          afterCallback?.();
        });
      });
    };

    setScroll();

    // The first jump lands on an ESTIMATED position; the fresh window then
    // measures in waves (mount → slot hydration → wrapper-observer
    // correction), each shifting P(index). Re-apply on every change and
    // disarm only once the position has been QUIET for a while.
    this.cancel();
    const stop = () => {
      if (this.converge.quietTimer !== null) clearTimeout(this.converge.quietTimer);
      stopWatch();
      if (this.converge.stop === stop) {
        this.converge.stop = null;
        this.converge.reapply = null;
        this.converge.appliedPosition = null;
        this.converge.quietTimer = null;
      }
    };
    this.converge.reapply = setScroll;
    this.converge.stop = stop;
    const stopWatch = watch(
      () => owner.geometry.positionOf(index),
      () => this.onPositionShift()
    );
    this.converge.quietTimer = setTimeout(stop, this.self.QUIET_MS);
  }

  /**
   * Put the content at `position`. A glide is asked for AND worth it only
   * when the travel is short enough that the rows between are mounted the
   * whole way — the pad's own coverage limit. Past that there is nothing to
   * animate across, and sliding the layer over unmounted space is a blank
   * frame wearing an animation's clothes (measured: 0% of the viewport
   * covered for the whole 450 ms of the CSS transition this replaced). So a
   * far landing arrives, which is what the reader wanted anyway.
   */
  protected land(position: number, animate: boolean, onArrive?: () => void): boolean {
    const travel = Math.abs(position - this.owner.scrollPosition.value);
    if (animate && travel <= this.owner.coverableGlidePx) {
      // the callback fires when the glide LANDS, not when it starts: a caller
      // that cycles (the drip showcase) asks for the next item on arrival
      this.owner.glideTo(position, onArrive);
      return true;
    }
    this.owner.setScrollPosition(-position);
    return false;
  }

  /**
   * Seek to a 0..1 track fraction in ITEM-INDEX space — the external seek
   * bar's contract: the landing promises an ITEM, size-independent, so it
   * survives the estimate→real refinement. A raw lenis.scrollTo would
   * translate content out of the viewport without rebasing the window.
   */
  // invariant: A seek names an item not a pixel (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  toFraction(fraction: number) {
    const lastIndex = this.owner.items.value.length - 1;
    if (lastIndex < 0) return;
    const clamped = Math.min(Math.max(fraction, 0), 1);
    this.toIndex(Math.round(clamped * lastIndex), undefined, false);
  }

  /**
   * Seek to a 0..1 fraction of the SCROLLABLE RANGE — the exact inverse of
   * the thumb's progress, which is what the built-in track needs: the thumb
   * RENDERS position-space, so its drag must land where it points. Index
   * space cannot express this when one item outsizes the container (a marquee
   * chunk is ~3 containers wide): the last item's START is far from the end
   * of the content, so an index-anchored drag leaves the tail unreachable.
   * The target still resolves to an item plus an in-item fraction and rides
   * the converge loop, so the landing stays on the same CONTENT as late sizes
   * refine.
   */
  toProgress(fraction: number) {
    const clamped = Math.min(Math.max(fraction, 0), 1);
    const target = clamped * Math.max(0, this.owner.scrollExtent.value - this.owner.containerSpan);
    const at = this.owner.geometry.indexAt(target);
    if (!at) return;
    this.toIndex(at.index, undefined, false, 0, at.fraction);
  }

  /**
   * The content moved under the reader by `delta` — rows measuring above the
   * anchor. The landing moves with it, so the loop does not read the content's
   * own shift as the reader taking over.
   */
  shiftLanding(delta: number) {
    if (this.converge.appliedPosition !== null) this.converge.appliedPosition += delta;
  }

  /** End the live converge loop now. The owner calls it when the reader acts
   *  on the content instead of scrolling — opening a card, for one — so the
   *  next size shift is the reader's own and never re-pins the landing under
   *  them. A no-op when no loop is armed. */
  cancel() {
    this.converge.stop?.();
  }

  /** One wave of the converge loop: the reader taking over ends it; any other
   *  shift re-applies the target and re-arms the quiet timer. */
  protected onPositionShift() {
    const stop = this.converge.stop;
    if (!stop) return;
    // The reader has taken over — a wheel glide, or the reading creep moving
    // on from the landing: the loop ends.
    if (this.owner.readerIsMoving) {
      stop();
      return;
    }
    // The reader scrolled between two waves (a glide that ended before this
    // shift, a scrollbar drag): the position is no longer the landing's.
    const applied = this.converge.appliedPosition;
    if (
      applied !== null &&
      Math.abs(this.owner.scrollPosition.value - applied) > this.self.TAKEOVER_PX
    ) {
      stop();
      return;
    }
    this.converge.reapply?.();
    if (this.converge.quietTimer !== null) clearTimeout(this.converge.quietTimer);
    this.converge.quietTimer = setTimeout(stop, this.self.QUIET_MS);
  }

  /** Step mode: once the input rests, snap to the nearest item boundary. */
  armSnap() {
    clearTimeout(this.snap.timer);
    this.snap.timer = setTimeout(this.snapToNearest, this.self.SNAP_MS);
  }

  /**
   * 'start': the item nearest the container's leading edge. 'center': the
   * item under the container's center — that item then lands centered. The
   * probe point lives in POSITION space: the container's visual center minus
   * the leading padding that the rendered flow adds.
   */
  snapToNearest() {
    const owner = this.owner;
    if (owner.inputLive || owner.lerpRunning) {
      clearTimeout(this.snap.timer);
      this.snap.timer = setTimeout(this.snapToNearest, this.self.SNAP_RETRY_MS);
      return;
    }
    const offset = owner.scrollPosition.value;
    const centered = owner.snapAlign === 'center';
    const at = owner.geometry.indexAt(
      centered ? offset + owner.containerSpan / 2 - owner.mainAxisPaddingStart() : offset
    );
    if (!at) return;
    const target = centered ? at.index : at.fraction > 0.5 ? at.index + 1 : at.index;
    this.toIndex(Math.min(target, owner.items.value.length - 1), undefined, true);
  }

  dispose() {
    clearTimeout(this.snap.timer);
    this.snap.timer = undefined;
    this.cancel();
  }
}

export namespace VirtualScrollerLanding {
  export const $Class = Static($VirtualScrollerLanding); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — the scroller hosts one
  export type Instance = typeof Class.Instance;

  /** What the landing needs from the scroller that hosts it. */
  export interface Owner {
    /** The position model a landing is computed from. */
    readonly geometry: VirtualScrollerGeometry.Instance;
    /** The items the landing names one of. */
    readonly items: Ref<{ id: string }[]>;
    /** The frame's main-axis size as the resize observer last reported it. */
    readonly containerSpan: number;
    /** The whole content's scrollable size, padding included. */
    readonly scrollExtent: ComputedRef<number>;
    /** The scroll position, read to tell the reader's motion from the loop's own. */
    readonly scrollPosition: Ref<number>;
    /** Where a snapped landing places its item. */
    readonly snapAlign: 'start' | 'center';
    /** False before mount: there is nothing to land in yet. */
    readonly hasFrame: boolean;
    /** The reader is moving the content themselves — a glide, or the creep
     *  moving on from the landing. A converge loop ends the moment this is true. */
    readonly readerIsMoving: boolean;
    /** Input is still arriving: a snap waits rather than fighting it. */
    readonly inputLive: boolean;
    /** A lerp is still travelling: a snap waits for it to land. */
    readonly lerpRunning: boolean;
    /** The frame's leading main-axis padding — the offset between position
     *  space and the rendered flow. A DOM read, so it stays the scroller's. */
    mainAxisPaddingStart(): number;
    /** The furthest a glide shows content the whole way (see `land`). */
    readonly coverableGlidePx: number;
    setScrollPosition(position: number): void;
    /** Glide to an absolute position through the tuned lerp, calling back
     *  when it lands. */
    glideTo(position: number, onArrive?: () => void): void;
    resetScrollTop(): void;
  }
}
