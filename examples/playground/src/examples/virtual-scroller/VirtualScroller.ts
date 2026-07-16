import type { Ref } from 'vue';
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  toRaw,
  toRef,
  watch
} from 'vue';

import { useElementSize, useResizeObserver } from '@vueuse/core';
import { Reactive, type ReactiveInstance } from '../../ivue';
import { Lenis } from '../../lenis/lenis';
import type { BaseItem } from './VirtualScroller.types';
import type {
  ItemContext,
  ItemsChangeEmitArgs,
  VirtualScrollerEmits,
  VirtualScrollerProps
} from './VirtualScroller.vue';

/**
 * Virtualized scroller (ivue v2 `Reactive` class).
 *
 * Scrolling is driven by a customized Lenis over translateY — not native
 * scroll — and the feel is hand-tuned. The autoplay SPEED (CREEP_MS_PER_PX,
 * the original 1px/150ms cadence) and every Lenis option are load-bearing;
 * treat them as constants. The creep DELIVERY is a per-frame integrator
 * (see creepStep) — do not go back to timer ticks smoothed by CSS
 * transitions; that produced a velocity sawtooth felt as judder on low-DPI
 * screens.
 *
 * POSITION MODEL: rendered items are NORMAL-FLOW block elements between two
 * spacer divs — the browser stacks the window at real heights for free; no
 * per-item `top` is computed or maintained. Estimates only decide the two
 * spacer heights and the scrollTop↔index mapping: an item's estimated top
 * is the prefix sum `P(i) = Σ (measuredHeights[j] ?? assumedHeight)` for
 * `j < i`, never materialized as an array — it is evaluated lazily by
 * walking a movable cursor `(index, offset)` kept exactly equal to
 * `P(index)` under the current height map, plus O(1) aggregates
 * (`measuredSum`/`measuredCount`) for the total content height. Heights are
 * captured ONE-SHOT (item mount + final height at item unmount — see
 * VirtualScrollerItem.vue), not continuously observed: a height sync costs
 * O(1), resolving the visible window costs O(items scrolled since last
 * frame), and nothing ever costs O(total item count) — which is what made
 * 100k-item posts jitter when the prefix sum was a real array rebuilt on
 * every (debounced) ResizeObserver burst.
 */
class $VirtualScroller<T extends BaseItem> {
  constructor (
    public props: VirtualScrollerProps<T>,
    public emit: VirtualScrollerEmits
  ) {
    this.elementSize = useElementSize(this.scrollElement);
    this.outerElementSize = useElementSize(this.scrollElement, undefined, {
      box: 'border-box'
    });

    // ONE observer per scroller — on the items wrapper, whose height only
    // changes when a rendered item's real height does (spacers are siblings).
    // The callback re-reads just the rendered window (O(window), never
    // O(total)). This is what keeps rendered-item heights truthful for the
    // scroll clamps and index→position math: slot content hydrates a tick
    // after item mount (mount-time capture reads the pre-hydration height),
    // fonts/images settle later still — and none of that re-fires per-item
    // observers anymore.
    useResizeObserver(this.itemsWrapperElement, () =>
      this.remeasureRenderedItems()
    );

    this.updatePositionsImmediately();

    // Structural changes (splice/filter/wholesale replace) shift what every
    // index means — re-derive aggregates/cursor from the current map. The
    // old model self-healed the same way via its full array rebuild.
    watch(
      () => this.items.value.length,
      () => this.updatePositionsImmediately()
    );

    if (this.autoPlay.value) this.startAutoPlay(this.props.autoPlayDelay);

    onMounted(() => {
      if (!this.scrollElement.value || !this.scrollElementInner.value) return;

      this.lenis = new Lenis({
        wrapper: this.scrollElement.value,
        content: this.scrollElementInner.value,
        syncTouch: true, // Sync touch events
        smoothWheel: true,
        autoRaf: false, // we drive it ourselves
        syncTouchLerp: 0.1,
        touchInertiaMultiplier: 30,
        touchMultiplier: 1.3 // Sensitivity of touch scrolling
      });
      this.lenis.on('virtual-scroll', this.onVirtualScroll);

      // The DOM is much shorter than the virtual content (content-sized
      // layer + capped tail — see trailingSpacerPx), so lenis takes its
      // wheel-clamp limit from the COMPUTED height — same box as
      // setScrollPosition's own bottom clamp. A pull callback, not a
      // watcher: lenis reads it at clamp time, the computed caches, and it
      // can never be stale.
      this.lenis.virtualLimit = () =>
        Math.max(
          0,
          this.scrollHeight.value -
          (this.scrollElement.value?.offsetHeight ?? 0)
        );
    });

    onBeforeUnmount(() => {
      cancelAnimationFrame(this.frame);
      cancelAnimationFrame(this.creepFrame);
      this.stopScrollToIndexReapply?.();
      this.lenis?.stop();
      this.lenis?.destroy();
    });
  }

  /* Template refs */

  get scrollElement() {
    return ref(null) as Ref<HTMLElement | null>;
  }

  get scrollElementInner() {
    return ref(null) as Ref<HTMLElement | null>;
  }

  /** The div wrapping the rendered items (between the two spacers). */
  get itemsWrapperElement() {
    return ref(null) as Ref<HTMLElement | null>;
  }

  /* Props as refs */

  get items() {
    return toRef(this.props, 'modelValue');
  }

  get assumedHeight() {
    return toRef(this.props, 'assumedHeight');
  }

  get paddingQuantity() {
    return toRef(this.props, 'paddingQuantity');
  }

  get autoPlay() {
    return toRef(this.props, 'autoPlay');
  }

  /* Container size */

  private elementSize: ReturnType<typeof useElementSize>;
  private outerElementSize: ReturnType<typeof useElementSize>;

  get containerHeight() {
    return this.elementSize.height;
  }

  /**
   * Border-box container height — the same box setScrollPosition's bottom
   * clamp measures (offsetHeight). Seek math must use THIS, not the
   * content-box containerHeight: the padding difference is invisible on a
   * huge post but parks the knob 10-15% short of the end on a small one.
   */
  get containerOuterHeight() {
    return this.outerElementSize.height;
  }

  /* Scroll state */

  /** Absolute (unsigned) scroll offset within the content. */
  get scrollPosition() {
    return ref<string | number>(0);
  }

  get scrollDirection() {
    return ref('down');
  }

  /** Reactive autoplay state — true while the reading creep is armed.
   *  Consumers bind buttons to it; a user scroll UP flips it off. */
  get isAutoPlaying() {
    return ref(false);
  }

  /** Measured pixel heights by item index (unmeasured fall back to assumedHeight). */
  get measuredHeights() {
    return ref<Record<number, number>>({});
  }

  /**
   * Bumped whenever item geometry may have changed (height sync, structural
   * repair). The reactive invalidation signal for visibleItems/scrollHeight/
   * getIndexPosition — replaces the old wholesale `positions` array
   * replacement. Bumps are O(1) and evaluations are O(window), so no
   * debounce is needed anywhere anymore.
   */
  private get geometryVersion() {
    return ref(0);
  }

  private bumpGeometryVersion() {
    this.geometryVersion.value++;
  }

  /**
   * Movable prefix-sum cursor. INVARIANT: `offset === P(index)` (sum of
   * measured-or-assumed heights of every item before `index`) under the
   * current measuredHeights/assumedHeight/items — maintained O(1) in
   * syncItemHeight and re-derived from scratch in updatePositionsImmediately.
   * Deliberately a plain non-reactive field (like visibleItemsSnapshot):
   * it is a cache; reactivity flows through geometryVersion.
   */
  private cursor = { index: 0, offset: 0 };

  /** Σ of all values in measuredHeights — non-reactive, see cursor. */
  private measuredSum = 0;

  /** Number of keys in measuredHeights — non-reactive, see cursor. */
  private measuredCount = 0;

  /** Post-calibration per-item estimate (frozen once) — see below. */
  private calibratedAssumed: number | null = null;

  /**
   * The height assumed for unmeasured items. Starts as the assumedHeight
   * prop; once enough real measurements exist it calibrates to the post's
   * true average (once, frozen). The prop's fixed value is biased low for
   * prose (50 vs ~130 real), which warps every estimate-derived quantity —
   * scrollHeight, the seek mapping, the knob — by 2-3x until items are
   * measured. Reads are plain (non-reactive); geometryVersion bumps cover
   * invalidation at the calibration moment.
   */
  private get estimatedItemHeight() {
    return this.calibratedAssumed ?? this.assumedHeight.value;
  }

  /**
   * One-time estimate calibration. Runs only while the reader is near the
   * top: there the scrollTop→content mapping goes through fully-measured
   * items, so swapping the assumption for the tail cannot move anything
   * visible — the change lands entirely in the trailing spacer.
   */
  private maybeCalibrateEstimate() {
    if (this.calibratedAssumed !== null) return;
    const length = toRaw(this.items.value).length;
    if (this.measuredCount < 20 || this.measuredCount >= length) return;
    const scrollPosition = this.scrollPosition.value;
    const scrollTop =
      typeof scrollPosition === 'number'
        ? scrollPosition
        : parseFloat(scrollPosition) || 0;
    if (scrollTop > this.containerHeight.value) return;
    this.calibratedAssumed = this.measuredSum / this.measuredCount;
    this.updatePositionsImmediately();
  }

  /** The currently rendered window, including padding. */
  get visibleIndex() {
    return ref({
      start: 0,
      end: 0
    });
  }

  /**
   * Spacer heights around the rendered window — the whole leading/trailing
   * content reduced to two numbers. Written by visibleItems on every
   * evaluation (same mutate-inside-computed pattern as visibleIndex).
   */
  private get leadingSpacerHeight() {
    return ref(0);
  }

  private get trailingSpacerHeight() {
    return ref(0);
  }

  get leadingSpacerPx() {
    return (
      $VirtualScroller.snapForRender(
        Math.max(0, this.leadingSpacerHeight.value - this.renderBias.value)
      ) + 'px'
    );
  }

  /** How much tail actually gets RENDERED below the window — a safety
   *  margin of a few viewports, not the whole remaining post. The layer
   *  (the inner element) is content-sized; rendering the true tail made it
   *  ~10M px tall on a 100k-item post, and layers that size carry visible
   *  compositor heaviness (confirmed by feel test: capping the layer was
   *  the difference between "slight chop" and "fully smooth"). Nothing
   *  below the fold reads the tail — scroll range comes from the computed
   *  height via lenis.virtualLimit. */
  private static readonly TRAILING_SPACER_RENDER_CAP = 2048;

  get trailingSpacerPx() {
    return (
      $VirtualScroller.snapForRender(
        Math.min(
          $VirtualScroller.TRAILING_SPACER_RENDER_CAP,
          this.trailingSpacerHeight.value
        )
      ) + 'px'
    );
  }

  /**
   * SCROLL-ORIGIN REBASING. GPU compositing is single precision: past
   * ~2^23 px even integer positions lose sub-pixel raster placement, so a
   * reader deep in a 100k-item post stutters no matter how exact the CSS
   * values are — the content itself must live at small coordinates. The
   * bias (a multiple of 65,536, updated as the scroll crosses chunks) is
   * subtracted from BOTH the leading spacer and the applied translate in
   * the same frame: their difference — everything visible — is unchanged,
   * but the rendered numbers stay below ~131k px at any reading depth,
   * the same regime a normal-sized post renders in. All scroll MATH stays
   * absolute; only the two render outputs are shifted. A ref, not a plain
   * field: the spacer template binding must re-render on rebase.
   */
  private get renderBias() {
    return ref(0);
  }

  private static readonly RENDER_BIAS_CHUNK = 65536;

  private updateRenderBias(scroll: number) {
    const chunk = $VirtualScroller.RENDER_BIAS_CHUNK;
    const bias = Math.max(0, (Math.floor(scroll / chunk) - 1) * chunk);
    if (bias !== this.renderBias.value) {
      this.renderBias.value = bias;
      if (this.lenis) this.lenis.renderOffset = bias;
    }
  }

  /**
   * Device-pixel snap for LANDINGS (spacers, seeks/jumps): a resting
   * position on the grid keeps text crisp. The snap policy is "motion is
   * fractional, landings snap" — continuous MOTION paths (the wheel lerp in
   * lenis.setScroll, the reading creep via snapRender=false) deliberately
   * bypass this: snapped sub-device-pixel-per-frame motion degenerates into
   * whole-pixel ticks at visible rates, while fractional translateY is
   * filtered by the compositor into an apparent glide. Safe at any depth —
   * renderBias keeps rendered offsets ≤ ~131k px, where f32 resolves both
   * integers and fractions.
   */
  private static snapForRender(value: number) {
    const dpr = window.devicePixelRatio || 1;
    return Math.round(value * dpr) / dpr;
  }

  get scrollHeight() {
    // THIN computed — the caching shell only; the logic stays named in a
    // directly testable method on the prototype.
    return computed(() => this.computeScrollHeight());
  }

  private computeScrollHeight(): number {
    const len = this.items.value.length;

    if (len === 0) return 0;

    /** Account for padding top and bottom of virtual scroller. */
    let paddingTop = 0;
    let paddingBottom = 0;
    if (this.scrollElement.value) {
      const computedStyle = window.getComputedStyle(
        this.scrollElement.value,
        null
      );
      paddingTop = parseInt(computedStyle.getPropertyValue('padding-top'));
      paddingBottom = parseInt(
        computedStyle.getPropertyValue('padding-bottom')
      );
    }

    // O(1) total: P(len) = measured sum + assumed estimate for the rest.
    this.geometryVersion.value;
    return (
      this.measuredSum +
      Math.max(0, len - this.measuredCount) * this.estimatedItemHeight +
      paddingTop +
      paddingBottom
    );
  }

  private get halfPaddingQuantity() {
    return Math.ceil(this.paddingQuantity.value / 2);
  }

  /**
   * Previous visibleItems result — returned again when the window is
   * unchanged so the computed's equality check stops propagation.
   */
  private visibleItemsSnapshot: ItemContext<T>[] = [];

  /**
   * The window of items currently rendered. Hot path: re-evaluates on every
   * scroll tick, so it must stay O(window + scroll delta) — never O(total).
   *
   * - Window resolution walks the prefix-sum cursor from wherever it last
   *   was to the current scrollTop — plain object reads on the RAW height
   *   map, no proxy traps. Geometry changes are tracked via geometryVersion.
   * - Items are read through the REACTIVE array on purpose: the item
   *   proxies must stay live for editing, and per-index tracking is what
   *   invalidates the window on splice/reorder.
   * - COMPARE-FIRST: the window is checked against the previous snapshot
   *   before anything is built. On a stable window (the 60–120Hz autoplay /
   *   lenis path) the previous ARRAY INSTANCE is returned with ZERO
   *   allocations, and the computed's equality check stops propagation —
   *   the v-for never re-renders. Only a genuinely shifted window builds a
   *   new array (plain for-loop, no slice/map).
   */
  get visibleItems() {
    // THIN computed — see computeScrollHeight's note.
    return computed(() => this.computeVisibleItems());
  }

  private computeVisibleItems(): ItemContext<T>[] {
    this.geometryVersion.value;
    const items = this.items.value;
    const len = items.length;
    const measured = toRaw(this.measuredHeights.value);
    const assumed = this.estimatedItemHeight;
    const scrollPosition = this.scrollPosition.value;
    const scrollTop =
      typeof scrollPosition === 'number'
        ? scrollPosition
        : parseFloat(scrollPosition);

    // Walk the cursor to the last item whose top is at/above scrollTop —
    // same semantics the binary search over the dense array had.
    const cursor = this.cursor;
    let start = Math.min(cursor.index, Math.max(0, len - 1));
    let startOffset = cursor.offset;
    for (let i = cursor.index; i > start; i--) {
      // Cursor beyond a shrunk list (pre-repair) — walk it back in.
      startOffset -= measured[i - 1] ?? assumed;
    }
    if (len > 0) {
      let h;
      while (
        start < len - 1 &&
        startOffset + (h = measured[start] ?? assumed) <= scrollTop
      ) {
        startOffset += h;
        start++;
      }
      while (start > 0 && startOffset > scrollTop) {
        start--;
        startOffset -= measured[start] ?? assumed;
      }
      cursor.index = start;
      cursor.offset = startOffset;
    }

    // Walk forward until the window covers the container height.
    let end = start;
    let endOffset = startOffset;
    const bottom = startOffset + this.containerHeight.value;
    while (end < len && endOffset < bottom) {
      endOffset += measured[end] ?? assumed;
      end++;
    }

    const padding = this.halfPaddingQuantity;
    const paddedStart = Math.max(0, start - padding);
    end += padding + 1;

    if (
      this.visibleIndex.value.start !== paddedStart ||
      this.visibleIndex.value.end !== end
    ) {
      this.visibleIndex.value.start = paddedStart;
      this.visibleIndex.value.end = end;
      nextTick(() => this.onItemsChanged({ start: paddedStart, end }));
    }

    // Clamp like Array.slice did — items and geometry can briefly
    // disagree between a splice and the structural repair.
    const count = Math.min(end, len);
    const length = Math.max(0, count - paddedStart);

    // Estimated top of the first rendered item = the leading spacer.
    let paddedStartOffset = startOffset;
    for (let i = start - 1; i >= paddedStart; i--) {
      paddedStartOffset -= measured[i] ?? assumed;
    }
    if (paddedStart === 0 || paddedStartOffset < 0) paddedStartOffset = 0;

    // Trailing spacer: everything after the window. P(len) equals the
    // aggregate total by the cursor invariant, so this is exactly 0 when
    // the window reaches the last item (clamped for float drift).
    let afterWindowOffset = paddedStartOffset;
    for (let i = paddedStart; i < count; i++) {
      afterWindowOffset += measured[i] ?? assumed;
    }
    const total =
      this.measuredSum + Math.max(0, len - this.measuredCount) * assumed;
    // Spacers must update even when the window itself is unchanged
    // (e.g. a height correction above the window moved only the lead).
    this.leadingSpacerHeight.value = paddedStartOffset;
    this.trailingSpacerHeight.value =
      count >= len ? 0 : Math.max(0, total - afterWindowOffset);

    const prev = this.visibleItemsSnapshot;
    if (prev.length === length) {
      let unchanged = true;
      for (let i = 0; i < length; i++) {
        const context = prev[i];
        const index = paddedStart + i;
        const item = items[index];
        if (
          context.item !== item ||
          // item.id is read here to keep dependency parity with the build
          // path, so an id change still invalidates a stable window.
          context.id !== item.id ||
          context.index !== index
        ) {
          unchanged = false;
          break;
        }
      }
      if (unchanged) return prev;
    }

    const next: ItemContext<T>[] = new Array(length);
    for (let i = 0; i < length; i++) {
      const index = paddedStart + i;
      const item = items[index];
      next[i] = {
        item: item,
        id: item.id,
        index: index
      };
    }
    return (this.visibleItemsSnapshot = next);
  }

  private onItemsChanged(args: ItemsChangeEmitArgs) {
    this.emit('itemsChanged', args);
  }

  /* Positions */

  /**
   * Structural repair: re-derive the aggregates and the cursor offset from
   * the current height map, prune measurements of items that no longer
   * exist, and invalidate geometry immediately. O(#measured) over plain
   * values — it runs imperatively (never inside an effect), so nothing needs
   * tracking. Called after splices (by PostPlayer and the items-length
   * watch); the per-height-sync hot path never comes through here.
   */
  updatePositionsImmediately() {
    const measured = toRaw(this.measuredHeights.value);
    const assumed = this.estimatedItemHeight;
    const length = toRaw(this.items.value).length;

    const cursorIndex = Math.min(this.cursor.index, Math.max(0, length - 1));

    /** Remove the measurements of the items that no longer exist. (Same
     * contiguous-from-end prune the old rebuild did — farther stale keys
     * are kept unaggregated and, like before, resurrect if the list regrows
     * over them, until the rendered item re-measures.) */
    let beyondLastIndex = length;
    if (beyondLastIndex in measured) {
      while (measured[beyondLastIndex]) {
        delete this.measuredHeights.value[beyondLastIndex];
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
      const height = measured[index];
      if (height === undefined) continue;
      sum += height;
      count++;
      if (index < cursorIndex) {
        sumBeforeCursor += height;
        countBeforeCursor++;
      }
    }
    this.measuredSum = sum;
    this.measuredCount = count;
    this.cursor.index = cursorIndex;
    this.cursor.offset =
      sumBeforeCursor + (cursorIndex - countBeforeCursor) * assumed;

    this.bumpGeometryVersion();
  }

  /**
   * Re-read the real heights of every rendered item in one pass —
   * O(window), driven by the single wrapper ResizeObserver. Reads happen
   * in one layout pass (no interleaved writes); only changed heights sync.
   */
  private remeasureRenderedItems() {
    const wrapper = this.itemsWrapperElement.value;
    if (!wrapper) return;
    const rendered = wrapper.querySelectorAll<HTMLElement>(
      '.virtual-scroller__item'
    );
    // Rects are in SCREEN px; the map must be in LAYOUT px. An ancestor
    // transform scale (the post card scales to fit the window) would
    // otherwise shrink every recorded height by the scale factor while the
    // flow renders at full layout height — the map diverges from the flow
    // and index-targeted jumps land short by exactly that drift. The
    // wrapper's rect-to-layout ratio is the scale; divide it out.
    const scale =
      wrapper.offsetHeight > 0
        ? wrapper.getBoundingClientRect().height / wrapper.offsetHeight
        : 1;
    const measured = toRaw(this.measuredHeights.value);
    let changed = false;
    const heights: [number, number][] = [];
    for (const el of rendered) {
      const row = el.getAttribute('aria-rowindex');
      if (row === null) continue;
      heights.push([
        +row - 1,
        el.getBoundingClientRect().height / (scale > 0 ? scale : 1)
      ]);
    }
    for (const [index, height] of heights) {
      if (measured[index] !== height) {
        this.syncItemHeight(index, height, false);
        changed = true;
      }
    }
    if (changed) {
      this.bumpGeometryVersion();
      this.maybeCalibrateEstimate();
    }
  }

  syncItemHeight(index: number, height: number, doUpdatePositions = true) {
    if (index < 0) return;
    if (index >= toRaw(this.items.value).length) {
      // Beyond the current list (mid-edit shift loops): keep the value for
      // neighbor reads, but out-of-range keys never count toward geometry —
      // exactly like the old rebuild, which only summed j < length.
      if (height == null) delete this.measuredHeights.value[index];
      else this.measuredHeights.value[index] = height;
      if (doUpdatePositions) this.bumpGeometryVersion();
      return;
    }
    const assumed = this.estimatedItemHeight;
    const previous = toRaw(this.measuredHeights.value)[index];
    // O(1) bookkeeping that keeps the aggregates and the cursor invariant
    // (`offset === P(index)`) exact — heights before the cursor shift it.
    if (height == null) {
      // Callers copy neighbor heights that may not exist — undefined means
      // "unmeasured": drop the entry so the item falls back to assumedHeight
      // (the old rebuild got this via its `?? assumed`).
      if (previous !== undefined) {
        this.measuredCount--;
        this.measuredSum -= previous;
        if (index < this.cursor.index) {
          this.cursor.offset += assumed - previous;
        }
        delete this.measuredHeights.value[index];
      }
      if (doUpdatePositions) this.bumpGeometryVersion();
      return;
    }
    if (previous === undefined) {
      this.measuredCount++;
      this.measuredSum += height;
    } else {
      this.measuredSum += height - previous;
    }
    if (index < this.cursor.index) {
      this.cursor.offset += height - (previous ?? assumed);
    }
    this.measuredHeights.value[index] = height;
    if (doUpdatePositions) this.bumpGeometryVersion();
  }

  /**
   * Top offset of item `index` — lazily-evaluated prefix sum, walked from
   * the cursor (or from 0 when that is closer). `undefined` outside the
   * current items range. Reactive: re-evaluates when geometry settles, so
   * `watch(() => scroller.getIndexPosition(i), …)` behaves like watching
   * the old `positions[i]`.
   */
  getIndexPosition(index: number): number | undefined {
    this.geometryVersion.value;
    if (index < 0 || index >= this.items.value.length) return undefined;

    const measured = toRaw(this.measuredHeights.value);
    const assumed = this.estimatedItemHeight;
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
   * Pixel offset for a 0..1 ratio in ITEM-INDEX space: `ratio × (len − 1)`
   * names an item plus a fraction scrolled within it. This is the seek
   * bar's contract — its hover preview promises item `ceil(scaled)`, the
   * first item fully readable below the landed viewport top, and that
   * identity is height-independent so it survives the estimate→real
   * refinement after landing.
   *
   * `endGapPx` keeps the NEXT item's top at least that many px below the
   * landed viewport top (never clamping above the floor item's own top): a
   * high in-item fraction otherwise parks the boundary a knife-edge few px
   * under the top edge, where autoplay's reading creep or a late height
   * wave cuts the promised item moments after landing. The seek settle
   * re-applies this same clamped map at refined heights, so the gap holds
   * once the real heights are in. Cost: the last `endGapPx` of each item
   * is a scrub dead-zone — invisible next to typical item heights.
   */
  getRatioPosition(ratio: number, endGapPx = 0): number | undefined {
    const len = this.items.value.length;
    if (len === 0) return undefined;
    const scaled = Math.min(1, Math.max(0, ratio)) * (len - 1);
    const index = Math.floor(scaled);
    const position = this.getAnchoredPosition(index, scaled - index);
    if (position === undefined || endGapPx <= 0) return position;
    const base = this.getIndexPosition(index);
    const next = this.getIndexPosition(index + 1);
    if (base === undefined || next === undefined) return position;
    return Math.min(position, Math.max(base, next - endGapPx));
  }

  /**
   * Pixel offset of a CONTENT ANCHOR: item `index` plus a 0..1 fraction
   * scrolled within it. The anchor names what the reader is looking at, so
   * re-applying it while heights settle keeps the CONTENT still (the
   * indicator adapts instead — the search-jump behavior).
   */
  getAnchoredPosition(index: number, fraction = 0): number | undefined {
    const base = this.getIndexPosition(index);
    if (base === undefined) return undefined;
    const height =
      toRaw(this.measuredHeights.value)[index] ?? this.estimatedItemHeight;
    return base + fraction * height;
  }

  /**
   * The inverse: which item (+ fraction within it) lives at a pixel offset.
   * Walked from the cursor — O(distance), cheap for seek-bar use.
   */
  getIndexAtPosition(
    offset: number
  ): { index: number; fraction: number } | undefined {
    this.geometryVersion.value;
    const len = this.items.value.length;
    if (len === 0) return undefined;
    const measured = toRaw(this.measuredHeights.value);
    const assumed = this.estimatedItemHeight;
    const cursor = this.cursor;
    let index = Math.min(cursor.index, len - 1);
    let top = cursor.offset;
    while (index > 0 && top > offset) {
      index--;
      top -= measured[index] ?? assumed;
    }
    let height = measured[index] ?? assumed;
    while (
      index < len - 1 &&
      top + (height = measured[index] ?? assumed) <= offset
    ) {
      top += height;
      index++;
    }
    height = measured[index] ?? assumed;
    cursor.index = index;
    cursor.offset = top;
    return {
      index,
      fraction:
        height > 0 ? Math.min(1, Math.max(0, (offset - top) / height)) : 0
    };
  }

  /* Scrolling */

  get preventScrollEvent() {
    return ref(false);
  }

  onScroll(e: Event) {
    // Prevents native scrolling on focus of contenteditable elements.
    if (this.preventScrollEvent.value) {
      e.preventDefault();
      this.scrollElement.value.scrollTop = 0;
    }
  }

  disableScrollEvent() {
    this.preventScrollEvent.value = true;
  }

  enableScrollEvent() {
    this.preventScrollEvent.value = false;
  }

  setScrollPosition(
    position: number,
    animate = true,
    translateY = true,
    /** The creep passes false: at sub-device-pixel speeds a snapped
     *  transform ticks whole pixels at a visible rate; fractional motion
     *  lets the compositor filter it into an apparent glide. Safe at any
     *  depth — renderBias keeps the effective offset small, where f32
     *  still resolves fractions. */
    snapRender = true
  ) {
    // A non-finite position would poison lenis.targetScroll and freeze the
    // scroller until remount (invalid transforms are silently ignored, so
    // nothing ever recovers). Refuse it.
    if (!Number.isFinite(position)) return;
    if (
      position > 0 ||
      this.scrollHeight.value < (this.scrollElement.value?.offsetHeight ?? 0)
    )
      position = 0;

    // Prevent scrolling down beyond last paragraph
    if (
      Math.abs(position) +
      (this.scrollElement.value?.offsetHeight ?? 0) +
      (this.scrollElement.value?.scrollTop ?? 0) >
      this.scrollHeight.value &&
      this.scrollHeight.value > (this.scrollElement.value?.offsetHeight ?? 0)
    ) {
      position = -(
        // Must be negative
        this.scrollHeight.value -
        (this.scrollElement.value?.offsetHeight ?? 0) -
        (this.scrollElement.value?.scrollTop ?? 0)
      );
    }

    const absolutePosition = Math.abs(position);

    this.updateRenderBias(absolutePosition);

    this.scrollPosition.value = absolutePosition;
    if (this.scrollElementInner.value) {
      if (!animate) {
        this.scrollElementInner.value.style.transitionDuration = '0s';
      } else {
        this.scrollElementInner.value.style.transitionDuration = '0.45s';
      }
    }

    if (position == 0 && this.scrollElement.value?.scrollTop) {
      this.scrollElement.value!.scrollTop = 0;
    }

    if (translateY && this.scrollElementInner.value) {
      // Rebased + snapped for GPU precision (see renderBias/snapForRender);
      // scrollPosition and lenis keep full precision for the scroll math.
      const rendered = position + this.renderBias.value;
      this.scrollElementInner.value!.style.transform =
        'translateY(' +
        (snapRender ? $VirtualScroller.snapForRender(rendered) : rendered) +
        'px)';
      // Programmatic jumps write the transform directly — lenis must ADOPT
      // the jump, not just be told about it. Adopting kills any in-flight
      // wheel animation (a running lerp holds its own captured target;
      // seeking mid-inertia otherwise loses the fight, dragged back toward
      // the stale wheel target) and syncs lenis's animated position (or the
      // first wheel input afterwards lerps from wherever lenis last
      // animated, possibly millions of px away: a few frames of catch-up
      // sweep). The wheel path (translateY false — lenis owns the transform
      // there) keeps its lerp untouched.
      this.lenis.adoptExternalScroll(absolutePosition);
    }

    this.lenis.targetScroll = absolutePosition;
  }

  resetScrollTop() {
    this.scrollElement.value.scrollTop = 0;
  }

  /** Stop handle for the latest scrollToIndex re-apply watcher (see below). */
  private stopScrollToIndexReapply: (() => void) | null = null;

  /**
   * @param topOffsetPx pushes the landing DOWN so the target sits this many
   * pixels below the viewport top — context above a jumped-to item (and
   * clear of any fade overlay at the reading area's top edge).
   * @param innerFraction 0..1 point WITHIN the item to align to (0 = its
   * top). A search match deep inside a paragraph taller than the viewport
   * would otherwise land below the fold — the item's height keeps refining
   * through the settle loop, so this converges onto the real text position.
   */
  scrollToIndex(
    index: number,
    afterCallback?: () => void,
    animate = true,
    topOffsetPx = 0,
    innerFraction = 0
  ) {
    const targetPosition = () => {
      const position = this.getIndexPosition(index);
      if (position === undefined) return undefined;
      const height =
        toRaw(this.measuredHeights.value)[index] ?? this.estimatedItemHeight;
      return Math.max(0, position + innerFraction * height - topOffsetPx);
    };

    const position = targetPosition();

    if (position === undefined || !this.scrollElement.value) return;

    this.resetScrollTop();

    this.setScrollPosition(-position, animate);

    const setScroll = () => {
      nextTick(() => {
        const position = targetPosition();
        if (position === undefined) return;
        this.setScrollPosition(-position, animate);
        nextTick(() => {
          afterCallback?.();
        });
      });
    };

    setScroll();

    // Converge onto the target: the first jump lands on an ESTIMATED
    // position; the fresh window then measures in waves (mount → slot
    // hydration → wrapper-observer correction), each shifting P(index).
    // Re-apply on every change and disarm only after the position has been
    // QUIET for a while — a fixed disarm timer loses the race against late
    // waves and leaves the reader a paragraph or two off the target. A new
    // seek supersedes this loop (a stale one would fire on the next
    // unrelated height change and yank the reader back), and the reader
    // taking over the scroll abandons it immediately.
    this.stopScrollToIndexReapply?.();
    let quietTimer: ReturnType<typeof setTimeout>;
    const stop = () => {
      clearTimeout(quietTimer);
      stopWatch();
      if (this.stopScrollToIndexReapply === stop) {
        this.stopScrollToIndexReapply = null;
      }
    };
    const stopWatch = watch(
      () => this.getIndexPosition(index),
      () => {
        if (this.lenis?.isScrolling) {
          stop();
          return;
        }
        setScroll();
        clearTimeout(quietTimer);
        quietTimer = setTimeout(stop, 600);
      }
    );
    quietTimer = setTimeout(stop, 600);
    this.stopScrollToIndexReapply = stop;
  }

  /* Autoplay (Lenis-driven) */

  lenis: Lenis | null = null;
  private frame: number;

  private virtualScrolling = false;
  private virtualScrollTimeout;
  private autoscrollTimeout;
  private autoRepeatTimeout;

  onVirtualScroll({ deltaY }) {
    // Scrolling UP is the reader taking over — autoplay stops outright
    // (the frame loop re-arms below for the manual scroll itself).
    // Scrolling DOWN is reading intent — autoplay re-arms by itself and
    // the settle chain below resumes the creep once the input rests.
    if (this.isAutoPlaying.value && deltaY < 0) {
      this.stopAutoPlay();
    } else if (!this.isAutoPlaying.value && deltaY > 0) {
      this.isAutoPlaying.value = true;
    }
    this.virtualScrolling = true;
    clearTimeout(this.virtualScrollTimeout);
    this.scrollElementInner.value.style.transitionDuration = '0s';
    this.scrollDirection.value = deltaY < 0 ? 'up' : 'down';
    if (!this.frame) {
      // Lenis's clock aged while its raf loop was parked (the creep runs
      // without it) — reset it or the first frame advances the whole gap
      // and the flick lands as an instant jump instead of the lerp.
      this.lenis.time = 0;
      this.frame = requestAnimationFrame(this.loop);
    }
    if (this.isAutoPlaying.value) {
      // input settles → the creep resumes; never re-arms when not playing
      clearTimeout(this.autoscrollTimeout);
      this.autoscrollTimeout = setTimeout(this.play, 3);
    }

    this.virtualScrollTimeout = setTimeout(() => {
      this.virtualScrolling = false;
    }, 3);
  }

  loop(now: number) {
    // Rebase BEFORE lenis writes this frame's transform: the transform and
    // the spacer (rendered by this frame's flush) must shift together.
    this.updateRenderBias(Math.abs(this.lenis.scroll ?? 0));
    this.lenis.raf(now); // keep Lenis in sync
    this.frame = requestAnimationFrame(this.loop);
    this.setScrollPosition(-this.lenis.targetScroll, false, false);
  }

  startAutoPlay(delay = 500, callback = () => {}) {
    this.isAutoPlaying.value = true;
    // A prior up-scroll leaves direction 'up', which gates the creep off —
    // pressing play IS the intent to read downward again.
    this.scrollDirection.value = 'down';
    if (this.lenis) this.lenis.time = 0;
    this.frame = requestAnimationFrame(this.loop);
    this.autoscrollTimeout = setTimeout(() => {
      this.play();
      callback();
    }, delay);
  }

  stopAutoPlay(callback = () => {}) {
    this.isAutoPlaying.value = false;
    cancelAnimationFrame(this.frame);
    this.frame = null;
    cancelAnimationFrame(this.creepFrame);
    this.creepFrame = null;
    this.lastCreepTs = null;
    clearTimeout(this.autoscrollTimeout);
    callback();
  }

  /** Reading-creep speed: ms of wall time per px of content — the original
   *  cadence (1px per 150ms tick ≈ 6.7px/s), now integrated per FRAME. */
  private static readonly CREEP_MS_PER_PX = 150;

  /** rAF handle + last frame timestamp of the creep integrator. */
  private creepFrame: number | null = null;
  private lastCreepTs: number | null = null;

  play() {
    if (this.virtualScrolling || this.lenis.isScrolling) {
      clearTimeout(this.autoscrollTimeout);

      return (this.autoscrollTimeout = setTimeout(this.play, 3));
    }

    clearTimeout(this.autoscrollTimeout);
    // The reader is at rest — lenis has nothing to animate, so its raf loop
    // can stop (the old timer creep cancelled it one tick later).
    cancelAnimationFrame(this.frame);
    this.frame = null;
    cancelAnimationFrame(this.creepFrame);
    this.lastCreepTs = null;
    this.creepFrame = requestAnimationFrame(this.creepStep);
  }

  /**
   * The reading creep, integrated per FRAME (speed × Δt, transform written
   * directly, no CSS transition, UNSNAPPED — see the write below). The
   * original delivery — a 150ms setTimeout writing +1px targets smoothed
   * by a re-targeted 0.45s ease transition — produced a permanent ~6.7Hz
   * velocity sawtooth plus timer jitter: irregularly-timed device-pixel
   * crossings, felt as judder on low-DPI screens. A snapped integrator was
   * tried next: metronome-regular but WHOLE-pixel ticks at 6.7Hz, still
   * read as chop on dpr-1. Constant-velocity fractional motion is the
   * remaining delivery: the compositor filters ~0.11px/frame into an
   * apparent glide (cost: slight text softness while creeping).
   */
  creepStep(ts: number) {
    this.creepFrame = null;
    if (this.virtualScrolling || this.lenis.isScrolling) {
      // Reader took over — hand back to play()'s defer loop, which resumes
      // the creep when the input settles.
      this.lastCreepTs = null;
      this.play();
      return;
    }
    if (this.scrollDirection.value !== 'down') {
      this.lastCreepTs = null;
      return;
    }

    // Δt clamped so a background-tab rAF suspension resumes as a slow
    // frame, not a content jump.
    const dt =
      this.lastCreepTs === null ? 16.7 : Math.min(50, ts - this.lastCreepTs);
    this.lastCreepTs = ts;
    this.lenis.targetScroll += dt / $VirtualScroller.CREEP_MS_PER_PX;

    const containerH = this.scrollElement.value?.offsetHeight ?? 0;
    const atEnd =
      this.lenis.actualScroll + containerH >= this.scrollHeight.value - 10;

    if (this.props.autoRepeat && atEnd) {
      // End reached: stop creeping and let the auto-repeat chain own the
      // resumption (reset to top after a pause, then play again).
      clearTimeout(this.autoRepeatTimeout);
      this.autoRepeatTimeout = setTimeout(() => {
        this.setScrollPosition(0, true, true);
        this.autoscrollTimeout = setTimeout(() => {
          if (this.scrollDirection.value === 'down') {
            this.play();
          }
        }, this.props.autoPlayDelay);
      }, 10000);
      return;
    }

    clearTimeout(this.autoRepeatTimeout);
    // Unsnapped on purpose: constant-velocity FRACTIONAL motion — the
    // compositor's filtering renders ~0.11px/frame as an apparent glide.
    // Snapped, the same speed ticks a whole device pixel every 150ms on
    // dpr-1 screens, which reads as chop.
    this.setScrollPosition(-this.lenis.targetScroll, false, true, false);
    if (atEnd) {
      // Nothing left to creep into (setScrollPosition clamps at the end);
      // the next wheel re-arms play via onVirtualScroll.
      this.lastCreepTs = null;
      return;
    }
    this.creepFrame = requestAnimationFrame(this.creepStep);
  }

  /* Drag and Drop */

  private startIndex = 0;

  onStart(evt: any) {
    this.startIndex = evt.item.__draggable_context.element.index;
  }

  onDrop(evt: any) {
    const dropIndex =
      evt.target
        .closest('.virtual-scroller__item')
        .getAttribute('aria-rowindex') - 1;
    this.emit('drop', this.startIndex, dropIndex);
  }

  onMove(evt: any, originalEvent: any) {
    this.emit('move', evt);
    return true; // — keep default insertion point based on the direction
  }
}

/**
 * Standard namespace pattern, generic adaptation. `Reactive()` returns the
 * SAME constructor (identity preservation), but its return TYPE
 * (ReactiveClass<C>) cannot carry <T> — TS has no higher-kinded types — so
 * `Class` is cast back to the raw constructor type to keep
 * `new VirtualScroller.Class<T>()` fully generic. For the same reason
 * `typeof Class.Instance` cannot exist per-T; `Instance<T>` applies
 * `ReactiveInstance` explicitly instead.
 */
export namespace VirtualScroller {
  export const $Class = $VirtualScroller;
  export let Class = Reactive(
    $VirtualScroller
  ) as unknown as typeof $VirtualScroller;
  export type Instance<T extends BaseItem> = ReactiveInstance<
    $VirtualScroller<T>
  >;
}

export type VirtualScrollerReturn<T extends BaseItem> = $VirtualScroller<T>;
