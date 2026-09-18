// VirtualScrollerGeometry.ts — the position model, hosted by the scroller:
// where every item sits, how tall the content is, and which item lives at a
// pixel. Sizes in, positions out. No DOM, no Lenis, no scroll position.
//
// A virtual list has to answer "where is item 400?" before item 400 has ever
// rendered, because nothing renders until the answer places it. So the answer
// is a prefix sum over a SPARSE map: `P(i) = Σ (measuredSizes[j] ?? assumed)`
// for `j < i` — measured where a row has mounted, assumed everywhere else.
//
// Three things keep that cheap at a million rows:
//
//   - THE SUM IS NEVER MATERIALIZED. A dense positions array is O(total) to
//     rebuild, and one row measuring rebuilds it; that is what made 100k-item
//     posts jitter. Instead a movable cursor `(index, offset)` holds
//     `offset === P(index)` and walks to whatever index is asked. Every query
//     costs the distance travelled, which between frames is a few rows.
//   - THE TOTAL IS O(1). `measuredSum` and `measuredCount` are kept exact as
//     sizes land, so the content size is one addition, not a walk.
//   - THE ESTIMATE CALIBRATES ONCE. The assumed size is a prop, biased low for
//     prose; the first wave with CALIBRATION_ROWS measured rows swaps in their
//     average and freezes it. Later waves never re-calibrate — a moving
//     estimate under a reader's gesture grows the extent mid-flick and sends
//     the thumb up the track and back.
//
// Reactivity is ONE cell. The map's values are read raw, the cursor and the
// aggregates are plain fields, and `version` is the single signal every
// derived read tracks: a size change bumps it, and the walk, the extent and
// the seek all re-evaluate off that one integer. Bumps are O(1) and
// evaluations are O(window), so nothing here needs a debounce.
//
// What the geometry deliberately does NOT know: the scroll position, the
// container, the DOM. It is asked, never told — measurement and anchoring are
// the scroller's, which is why the whole class is testable with a plain items
// array and an assumed size.
import { ref, toRaw, type Ref } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';

class $VirtualScrollerGeometry {
  /** measured rows the estimate calibrates on — the first screen's worth, so it lands before a gesture */
  static readonly CALIBRATION_ROWS = 5;

  // invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  constructor(public owner: VirtualScrollerGeometry.Owner) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $VirtualScrollerGeometry;
  }

  /** Measured main-axis pixel sizes by item index (unmeasured fall back to the estimate). */
  get measuredSizes() {
    return ref<Record<number, number>>({});
  }

  /**
   * Bumped whenever item geometry may have changed (size sync, structural
   * repair). The reactive invalidation signal every derived read tracks —
   * the window walk, the extent, the seek. Bumps are O(1) and evaluations
   * are O(window), so no debounce is needed anywhere.
   */
  get version() {
    return ref(0);
  }

  /**
   * Movable prefix-sum cursor. INVARIANT: `offset === P(index)` (sum of
   * measured-or-assumed sizes of every item before `index`) under the
   * current sizes/estimate/items — maintained O(1) in applySize and
   * re-derived from scratch in rederive. Deliberately a plain
   * non-reactive field: it is a cache; reactivity flows through `version`.
   */
  readonly cursor = { index: 0, offset: 0 };

  /** The O(1) aggregates over the size map, and the estimate the first
   *  measurement wave froze — a plain holder like the cursor: caches,
   *  never rendered, and reactivity flows through `version`. */
  protected readonly aggregates = {
    /** Σ of all values in measuredSizes. */
    sum: 0,
    /** Number of keys in measuredSizes. */
    count: 0,
    /** Post-calibration per-item estimate, frozen once — see estimatedItemSize. */
    calibratedSize: null as number | null
  };

  /**
   * The size assumed for unmeasured items. Starts as the owner's assumed
   * size; once enough real measurements exist it calibrates to the list's
   * true average (once, frozen). The prop's fixed value is biased low for
   * prose (50 vs ~130 real), which warps every estimate-derived quantity —
   * the extent, the seek mapping, the knob — by 2-3x until items are
   * measured. Reads are plain (non-reactive); `version` bumps cover
   * invalidation at the calibration moment.
   */
  get estimatedItemSize(): number {
    return this.aggregates.calibratedSize ?? this.owner.assumedSize.value;
  }

  /**
   * The content's own main-axis size: P(itemCount), in O(1) by the cursor
   * invariant — the measured sum plus the estimate for everything
   * unmeasured. The frame's padding is the scroller's to add; this class
   * reads no DOM.
   */
  get contentSize(): number {
    const itemCount = this.owner.items.value.length;
    if (itemCount === 0) return 0;
    this.version.value;
    return this.aggregates.sum + Math.max(0, itemCount - this.aggregates.count) * this.estimatedItemSize;
  }

  /** The size map as a plain object: one `toRaw` for a whole window walk,
   *  never one per row. The walk tracks `version` itself. */
  get rawSizes(): Record<number, number> {
    return toRaw(this.measuredSizes.value);
  }

  /** The size item `index` contributes: its measurement, or the estimate. */
  sizeOf(index: number): number {
    return toRaw(this.measuredSizes.value)[index] ?? this.estimatedItemSize;
  }

  bump() {
    this.version.value++;
  }

  /**
   * One row's size into the map, with the aggregates and the cursor
   * invariant (`offset === P(index)`) kept exact in O(1) — sizes before
   * the cursor shift it. `null`/`undefined` means unmeasured: the entry is
   * dropped and the row falls back to the estimate.
   */
  // invariant: Rendered sizes are known only after a row mounts (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  applySize(index: number, size: number, bump = true) {
    if (index < 0) return;
    if (index >= toRaw(this.owner.items.value).length) {
      // Beyond the current list (mid-edit shift loops): keep the value for
      // neighbor reads, but out-of-range keys never count toward geometry.
      if (size == null) delete this.measuredSizes.value[index];
      else this.measuredSizes.value[index] = size;
      if (bump) this.bump();
      return;
    }
    const assumed = this.estimatedItemSize;
    const previous = toRaw(this.measuredSizes.value)[index];
    if (size == null) {
      // Callers copy neighbor sizes that may not exist — undefined means
      // "unmeasured": drop the entry so the item falls back to the estimate.
      if (previous !== undefined) {
        this.aggregates.count--;
        this.aggregates.sum -= previous;
        if (index < this.cursor.index) {
          this.cursor.offset += assumed - previous;
        }
        delete this.measuredSizes.value[index];
      }
      if (bump) this.bump();
      return;
    }
    if (previous === undefined) {
      this.aggregates.count++;
      this.aggregates.sum += size;
    } else {
      this.aggregates.sum += size - previous;
    }
    if (index < this.cursor.index) {
      this.cursor.offset += size - (previous ?? assumed);
    }
    this.measuredSizes.value[index] = size;
    if (bump) this.bump();
  }

  /**
   * Structural repair: re-derive the aggregates and the cursor offset from
   * the current size map, prune measurements of items that no longer
   * exist, and invalidate geometry immediately. O(#measured) over plain
   * values — it runs imperatively (never inside an effect), so nothing
   * needs tracking. Called after splices; the per-size hot path never
   * comes through here.
   */
  // invariant: Shrinking the list prunes the measurements at its new end (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  rederive() {
    const measured = toRaw(this.measuredSizes.value);
    const assumed = this.estimatedItemSize;
    const length = toRaw(this.owner.items.value).length;

    const cursorIndex = Math.min(this.cursor.index, Math.max(0, length - 1));

    /** Remove the measurements of the items that no longer exist. (The
     * contiguous-from-end prune — farther stale keys are kept unaggregated
     * and resurrect if the list regrows over them, until the rendered item
     * re-measures.) */
    let beyondLastIndex = length;
    if (beyondLastIndex in measured) {
      while (measured[beyondLastIndex]) {
        delete this.measuredSizes.value[beyondLastIndex];
        beyondLastIndex++;
      }
    }

    let sum = 0;
    let count = 0;
    let sumBeforeCursor = 0;
    let countBeforeCursor = 0;
    for (const key in measured) {
      const index = +key;
      if (index >= length) continue;
      const size = measured[index];
      if (size === undefined) continue;
      sum += size;
      count++;
      if (index < cursorIndex) {
        sumBeforeCursor += size;
        countBeforeCursor++;
      }
    }
    this.aggregates.sum = sum;
    this.aggregates.count = count;
    this.cursor.index = cursorIndex;
    this.cursor.offset = sumBeforeCursor + (cursorIndex - countBeforeCursor) * assumed;

    this.bump();
  }

  /**
   * One-time estimate calibration: swap the assumed size for the measured
   * average, once, on the first measurement wave that has CALIBRATION_ROWS
   * rows — the first screen, on any device — and freeze it. The caller
   * anchors around the wave, so a list opened at its end calibrates too.
   * It has to land on the load wave: on a phone the rows measure five
   * times the assumption, so a calibration that waited for a later wave
   * fired under the reader's first swipe, grew the extent fivefold
   * mid-gesture, and sent the thumb up the track and back.
   */
  calibrate() {
    if (this.aggregates.calibratedSize !== null) return;
    const length = toRaw(this.owner.items.value).length;
    if (this.aggregates.count < this.self.CALIBRATION_ROWS || this.aggregates.count >= length) return;
    this.aggregates.calibratedSize = this.aggregates.sum / this.aggregates.count;
    this.rederive();
  }

  /**
   * Top offset of item `index` — lazily-evaluated prefix sum, walked from
   * the cursor (or from 0 when that is closer). `undefined` outside the
   * current items range. Reactive: re-evaluates when geometry settles.
   */
  // invariant: Rendered sizes are known only after a row mounts (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  positionOf(index: number): number | undefined {
    this.version.value;
    if (index < 0 || index >= this.owner.items.value.length) return undefined;

    const measured = toRaw(this.measuredSizes.value);
    const assumed = this.estimatedItemSize;
    const cursor = this.cursor;
    let cursorIndex = cursor.index;
    let offset = cursor.offset;
    if (index < cursorIndex - index) {
      // Walking up from the top is shorter than walking back from the cursor.
      cursorIndex = 0;
      offset = 0;
    }
    while (cursorIndex < index) {
      offset += measured[cursorIndex] ?? assumed;
      cursorIndex++;
    }
    while (cursorIndex > index) {
      cursorIndex--;
      offset -= measured[cursorIndex] ?? assumed;
    }
    cursor.index = cursorIndex;
    cursor.offset = offset;
    return offset;
  }

  /**
   * Pixel offset of a CONTENT ANCHOR: item `index` plus a 0..1 fraction
   * scrolled within it. The anchor names what the reader is looking at, so
   * re-applying it while sizes settle keeps the CONTENT still.
   */
  anchoredPosition(index: number, fraction = 0): number | undefined {
    const base = this.positionOf(index);
    if (base === undefined) return undefined;
    return base + fraction * this.sizeOf(index);
  }

  /**
   * Pixel offset for a 0..1 ratio in ITEM-INDEX space: `ratio × (len − 1)`
   * names an item plus a fraction scrolled within it. This is the seek
   * bar's contract — its hover preview promises item `ceil(scaled)`, the
   * first item fully readable below the landed viewport top, and that
   * identity is size-independent so it survives the estimate→real
   * refinement after landing.
   *
   * `endGapPx` keeps the NEXT item's top at least that many px below the
   * landed viewport top (never clamping above the floor item's own top): a
   * high in-item fraction otherwise parks the boundary a knife-edge few px
   * under the top edge, where the reading creep or a late size wave cuts
   * the promised item moments after landing. Cost: the last `endGapPx` of
   * each item is a scrub dead-zone — invisible next to typical item sizes.
   */
  ratioPosition(ratio: number, endGapPx = 0): number | undefined {
    const itemCount = this.owner.items.value.length;
    if (itemCount === 0) return undefined;
    const scaled = Math.min(1, Math.max(0, ratio)) * (itemCount - 1);
    const index = Math.floor(scaled);
    const position = this.anchoredPosition(index, scaled - index);
    if (position === undefined || endGapPx <= 0) return position;
    const base = this.positionOf(index);
    const next = this.positionOf(index + 1);
    if (base === undefined || next === undefined) return position;
    return Math.min(position, Math.max(base, next - endGapPx));
  }

  /**
   * The inverse: which item (+ fraction within it) lives at a pixel offset.
   * Walked from the cursor — O(distance), cheap for seek-bar use.
   */
  indexAt(offset: number): VirtualScrollerGeometry.At | undefined {
    this.version.value;
    const itemCount = this.owner.items.value.length;
    if (itemCount === 0) return undefined;
    const measured = toRaw(this.measuredSizes.value);
    const assumed = this.estimatedItemSize;
    const cursor = this.cursor;
    let index = Math.min(cursor.index, itemCount - 1);
    let top = cursor.offset;
    while (index > 0 && top > offset) {
      index--;
      top -= measured[index] ?? assumed;
    }
    let size = measured[index] ?? assumed;
    while (index < itemCount - 1 && top + (size = measured[index] ?? assumed) <= offset) {
      top += size;
      index++;
    }
    size = measured[index] ?? assumed;
    cursor.index = index;
    cursor.offset = top;
    return {
      index,
      fraction: size > 0 ? Math.min(1, Math.max(0, (offset - top) / size)) : 0
    };
  }
}

export namespace VirtualScrollerGeometry {
  export const $Class = Static($VirtualScrollerGeometry); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — the scroller hosts one
  export type Instance = typeof Class.Instance;

  /** An item plus how far into it a pixel offset falls. */
  export interface At {
    index: number;
    fraction: number;
  }

  /** What the geometry needs from the scroller that hosts it: the list, and
   *  what a row measures before it has measured. Nothing else — no DOM, no
   *  scroll position, which is what makes the model testable on its own. */
  export interface Owner {
    /** The items the positions are over — read reactively, so a splice invalidates. */
    readonly items: Ref<{ id: string }[]>;
    /** The size assumed for an unmeasured row along the axis, before calibration. */
    readonly assumedSize: Ref<number>;
  }
}
