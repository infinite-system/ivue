import type {
  ExtractPropTypes,
  PropType,
  Ref,
  ShallowUnwrapRef
} from 'vue';
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
import {
  propsWithDefaults,
  Reactive,
  type ExtractEmitTypes,
  type ExtractPropDefaultTypes,
  type ReactiveInstance
} from '../../ivue';
import { Lenis } from '../../lenis/lenis';
import type { BaseItem } from './VirtualScroller.types';

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
 * spacer divs — the browser stacks the window at real sizes for free; no
 * per-item `top` is computed or maintained. Estimates only decide the two
 * spacer sizes and the scrollTop↔index mapping: an item's estimated top
 * is the prefix sum `P(i) = Σ (measuredSizes[j] ?? assumedSize)` for
 * `j < i`, never materialized as an array — it is evaluated lazily by
 * walking a movable cursor `(index, offset)` kept exactly equal to
 * `P(index)` under the current size map, plus O(1) aggregates
 * (`measuredSum`/`measuredCount`) for the total content size. Heights are
 * captured ONE-SHOT (item mount + final size at item unmount — see
 * VirtualScrollerItem.vue), not continuously observed: a size sync costs
 * O(1), resolving the visible window costs O(items scrolled since last
 * frame), and nothing ever costs O(total item count) — which is what made
 * 100k-item posts jitter when the prefix sum was a real array rebuilt on
 * every (debounced) ResizeObserver burst.
 */
class $VirtualScroller<T extends BaseItem> {
  constructor (
    public props: VirtualScroller.Props<T>,
    public emit: VirtualScroller.Emits
  ) {
    this.elementSize = useElementSize(this.scrollElement);
    this.outerElementSize = useElementSize(this.scrollElement, undefined, {
      box: 'border-box'
    });

    // ONE observer per scroller — on the items wrapper, whose size only
    // changes when a rendered item's real size does (spacers are siblings).
    // The callback re-reads just the rendered window (O(window), never
    // O(total)). This is what keeps rendered-item sizes truthful for the
    // scroll clamps and index→position math: slot content hydrates a tick
    // after item mount (mount-time capture reads the pre-hydration size),
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
        orientation: this.lenisOrientation,
        gestureOrientation: this.lenisGestureOrientation,
        ignoreNativeScroll: this.lenisIgnoreNativeScroll,
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
      // wheel-clamp limit from the COMPUTED size — same box as
      // setScrollPosition's own bottom clamp. A pull callback, not a
      // watcher: lenis reads it at clamp time, the computed caches, and it
      // can never be stale.
      this.lenis.virtualLimit = () =>
        Math.max(
          0,
          this.scrollExtent.value - this.offsetSize(this.scrollElement.value)
        );
    });

    onBeforeUnmount(() => {
      clearTimeout(this.snapTimeout);
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

  get assumedSize() {
    return toRef(this.props, 'assumedSize');
  }

  get paddingQuantity() {
    return toRef(this.props, 'paddingQuantity');
  }

  get autoPlay() {
    return toRef(this.props, 'autoPlay');
  }

  /* Axis seams — every place the class touches a DOM dimension or a
     gesture axis goes through these. Vertical defaults here; the
     horizontal subclass overrides ONLY these (the tuned scroll physics,
     cursor math, and creep never fork). */

  protected get lenisOrientation(): 'vertical' | 'horizontal' {
    return 'vertical';
  }

  protected get lenisGestureOrientation(): 'vertical' | 'horizontal' | 'both' {
    return 'vertical';
  }

  /** Fully-virtual axes refuse native-scroll adoption (see the fork's
   *  onNativeScroll) — the vertical scroller keeps the stock behavior. */
  protected get lenisIgnoreNativeScroll(): boolean {
    return false;
  }

  /** Main-axis border-box size of an element. */
  protected offsetSize(element: HTMLElement | null | undefined): number {
    return element?.offsetHeight ?? 0;
  }

  /** Main-axis rect size (screen px) of an element. */
  protected rectSize(element: Element): number {
    return element.getBoundingClientRect().height;
  }

  /** The transform that places the content at `px` along the main axis. */
  protected transformFor(px: number): string {
    return 'translateY(' + px + 'px)';
  }

  protected get axisPaddingProps(): readonly [string, string] {
    return ['padding-top', 'padding-bottom'];
  }

  /** The gesture delta that drives the main axis. */
  protected axisDelta(data: { deltaX: number; deltaY: number }): number {
    return data.deltaY;
  }

  /** Scrollbar-thumb style properties along the main axis: [size, offset]. */
  protected get axisThumbProps(): readonly [string, string] {
    return ['height', 'top'];
  }

  /** 0..1 position of a pointer along the scrollbar track's main axis. */
  protected trackPointerFraction(event: PointerEvent, rect: DOMRect): number {
    return (event.clientY - rect.top) / rect.height;
  }

  /* Container size */

  protected elementSize: ReturnType<typeof useElementSize>;
  protected outerElementSize: ReturnType<typeof useElementSize>;

  get containerSize() {
    return this.elementSize.height;
  }

  /**
   * Border-box container size — the same box setScrollPosition's bottom
   * clamp measures (offsetHeight). Seek math must use THIS, not the
   * content-box containerSize: the padding difference is invisible on a
   * huge post but parks the knob 10-15% short of the end on a small one.
   */
  get containerOuterSize() {
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

  /** Measured main-axis pixel sizes by item index (unmeasured fall back to assumedSize). */
  get measuredSizes() {
    return ref<Record<number, number>>({});
  }

  /**
   * Bumped whenever item geometry may have changed (size sync, structural
   * repair). The reactive invalidation signal for visibleItems/scrollExtent/
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
   * measured-or-assumed sizes of every item before `index`) under the
   * current measuredSizes/assumedSize/items — maintained O(1) in
   * syncItemSize and re-derived from scratch in updatePositionsImmediately.
   * Deliberately a plain non-reactive field (like visibleItemsSnapshot):
   * it is a cache; reactivity flows through geometryVersion.
   */
  private cursor = { index: 0, offset: 0 };

  /** Σ of all values in measuredSizes — non-reactive, see cursor. */
  private measuredSum = 0;

  /** Number of keys in measuredSizes — non-reactive, see cursor. */
  private measuredCount = 0;

  /** Post-calibration per-item estimate (frozen once) — see below. */
  private calibratedAssumed: number | null = null;

  /**
   * The size assumed for unmeasured items. Starts as the assumedSize
   * prop; once enough real measurements exist it calibrates to the post's
   * true average (once, frozen). The prop's fixed value is biased low for
   * prose (50 vs ~130 real), which warps every estimate-derived quantity —
   * scrollExtent, the seek mapping, the knob — by 2-3x until items are
   * measured. Reads are plain (non-reactive); geometryVersion bumps cover
   * invalidation at the calibration moment.
   */
  private get estimatedItemSize() {
    return this.calibratedAssumed ?? this.assumedSize.value;
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
    if (scrollTop > this.containerSize.value) return;
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
   * Spacer sizes around the rendered window — the whole leading/trailing
   * content reduced to two numbers. Written by visibleItems on every
   * evaluation (same mutate-inside-computed pattern as visibleIndex).
   */
  private get leadingSpacerSize() {
    return ref(0);
  }

  private get trailingSpacerSize() {
    return ref(0);
  }

  get leadingSpacerPx() {
    return (
      $VirtualScroller.snapForRender(
        Math.max(0, this.leadingSpacerSize.value - this.renderBias.value)
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
   *  size via lenis.virtualLimit. */
  private static readonly TRAILING_SPACER_RENDER_CAP = 2048;

  get trailingSpacerPx() {
    return (
      $VirtualScroller.snapForRender(
        Math.min(
          $VirtualScroller.TRAILING_SPACER_RENDER_CAP,
          this.trailingSpacerSize.value
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

  get scrollExtent() {
    // THIN computed — the caching shell only; the logic stays named in a
    // directly testable method on the prototype.
    return computed(() => this.computeScrollExtent());
  }

  private computeScrollExtent(): number {
    const len = this.items.value.length;

    if (len === 0) return 0;

    /** Account for the scroller's main-axis padding (top/bottom vertical,
     * left/right horizontal — see axisPaddingProps). */
    let paddingStart = 0;
    let paddingEnd = 0;
    if (this.scrollElement.value) {
      const computedStyle = window.getComputedStyle(
        this.scrollElement.value,
        null
      );
      const [paddingStartProp, paddingEndProp] = this.axisPaddingProps;
      paddingStart = parseInt(computedStyle.getPropertyValue(paddingStartProp));
      paddingEnd = parseInt(computedStyle.getPropertyValue(paddingEndProp));
    }

    // O(1) total: P(len) = measured sum + assumed estimate for the rest.
    this.geometryVersion.value;
    return (
      this.measuredSum +
      Math.max(0, len - this.measuredCount) * this.estimatedItemSize +
      paddingStart +
      paddingEnd
    );
  }

  private get halfPaddingQuantity() {
    return Math.ceil(this.paddingQuantity.value / 2);
  }

  /**
   * Previous visibleItems result — returned again when the window is
   * unchanged so the computed's equality check stops propagation.
   */
  private visibleItemsSnapshot: VirtualScroller.ItemContext<T>[] = [];

  /**
   * The window of items currently rendered. Hot path: re-evaluates on every
   * scroll tick, so it must stay O(window + scroll delta) — never O(total).
   *
   * - Window resolution walks the prefix-sum cursor from wherever it last
   *   was to the current scrollTop — plain object reads on the RAW size
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
    // THIN computed — see computeScrollExtent's note.
    return computed(() => this.computeVisibleItems());
  }

  private computeVisibleItems(): VirtualScroller.ItemContext<T>[] {
    this.geometryVersion.value;
    const items = this.items.value;
    const len = items.length;
    const measured = toRaw(this.measuredSizes.value);
    const assumed = this.estimatedItemSize;
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
      let step;
      while (
        start < len - 1 &&
        startOffset + (step = measured[start] ?? assumed) <= scrollTop
      ) {
        startOffset += step;
        start++;
      }
      while (start > 0 && startOffset > scrollTop) {
        start--;
        startOffset -= measured[start] ?? assumed;
      }
      cursor.index = start;
      cursor.offset = startOffset;
    }

    // Walk forward until the window covers the container size.
    let end = start;
    let endOffset = startOffset;
    const bottom = startOffset + this.containerSize.value;
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
    // (e.g. a size correction above the window moved only the lead).
    this.leadingSpacerSize.value = paddedStartOffset;
    this.trailingSpacerSize.value =
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

    const next: VirtualScroller.ItemContext<T>[] = new Array(length);
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

  private onItemsChanged(args: VirtualScroller.ItemsChangeEmitArgs) {
    this.emit('itemsChanged', args);
  }

  /* Positions */

  /**
   * Structural repair: re-derive the aggregates and the cursor offset from
   * the current size map, prune measurements of items that no longer
   * exist, and invalidate geometry immediately. O(#measured) over plain
   * values — it runs imperatively (never inside an effect), so nothing needs
   * tracking. Called after splices (by PostPlayer and the items-length
   * watch); the per-size-sync hot path never comes through here.
   */
  updatePositionsImmediately() {
    const measured = toRaw(this.measuredSizes.value);
    const assumed = this.estimatedItemSize;
    const length = toRaw(this.items.value).length;

    const cursorIndex = Math.min(this.cursor.index, Math.max(0, length - 1));

    /** Remove the measurements of the items that no longer exist. (Same
     * contiguous-from-end prune the old rebuild did — farther stale keys
     * are kept unaggregated and, like before, resurrect if the list regrows
     * over them, until the rendered item re-measures.) */
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
    this.measuredSum = sum;
    this.measuredCount = count;
    this.cursor.index = cursorIndex;
    this.cursor.offset =
      sumBeforeCursor + (cursorIndex - countBeforeCursor) * assumed;

    this.bumpGeometryVersion();
  }

  /**
   * Re-read the real sizes of every rendered item in one pass —
   * O(window), driven by the single wrapper ResizeObserver. Reads happen
   * in one layout pass (no interleaved writes); only changed sizes sync.
   */
  private remeasureRenderedItems() {
    const wrapper = this.itemsWrapperElement.value;
    if (!wrapper) return;
    const rendered = wrapper.querySelectorAll<HTMLElement>(
      '.virtual-scroller__item'
    );
    // Rects are in SCREEN px; the map must be in LAYOUT px. An ancestor
    // transform scale (the post card scales to fit the window) would
    // otherwise shrink every recorded size by the scale factor while the
    // flow renders at full layout size — the map diverges from the flow
    // and index-targeted jumps land short by exactly that drift. The
    // wrapper's rect-to-layout ratio is the scale; divide it out.
    const wrapperSize = this.offsetSize(wrapper);
    const scale = wrapperSize > 0 ? this.rectSize(wrapper) / wrapperSize : 1;
    const measured = toRaw(this.measuredSizes.value);
    let changed = false;
    const sizes: [number, number][] = [];
    for (const el of rendered) {
      const row = el.getAttribute('aria-rowindex');
      if (row === null) continue;
      sizes.push([+row - 1, this.rectSize(el) / (scale > 0 ? scale : 1)]);
    }
    for (const [index, size] of sizes) {
      if (measured[index] !== size) {
        this.syncItemSize(index, size, false);
        changed = true;
      }
    }
    if (changed) {
      this.bumpGeometryVersion();
      this.maybeCalibrateEstimate();
    }
  }

  syncItemSize(index: number, size: number, doUpdatePositions = true) {
    if (index < 0) return;
    if (index >= toRaw(this.items.value).length) {
      // Beyond the current list (mid-edit shift loops): keep the value for
      // neighbor reads, but out-of-range keys never count toward geometry —
      // exactly like the old rebuild, which only summed j < length.
      if (size == null) delete this.measuredSizes.value[index];
      else this.measuredSizes.value[index] = size;
      if (doUpdatePositions) this.bumpGeometryVersion();
      return;
    }
    const assumed = this.estimatedItemSize;
    const previous = toRaw(this.measuredSizes.value)[index];
    // O(1) bookkeeping that keeps the aggregates and the cursor invariant
    // (`offset === P(index)`) exact — sizes before the cursor shift it.
    if (size == null) {
      // Callers copy neighbor sizes that may not exist — undefined means
      // "unmeasured": drop the entry so the item falls back to assumedSize
      // (the old rebuild got this via its `?? assumed`).
      if (previous !== undefined) {
        this.measuredCount--;
        this.measuredSum -= previous;
        if (index < this.cursor.index) {
          this.cursor.offset += assumed - previous;
        }
        delete this.measuredSizes.value[index];
      }
      if (doUpdatePositions) this.bumpGeometryVersion();
      return;
    }
    if (previous === undefined) {
      this.measuredCount++;
      this.measuredSum += size;
    } else {
      this.measuredSum += size - previous;
    }
    if (index < this.cursor.index) {
      this.cursor.offset += size - (previous ?? assumed);
    }
    this.measuredSizes.value[index] = size;
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
   * under the top edge, where autoplay's reading creep or a late size
   * wave cuts the promised item moments after landing. The seek settle
   * re-applies this same clamped map at refined sizes, so the gap holds
   * once the real sizes are in. Cost: the last `endGapPx` of each item
   * is a scrub dead-zone — invisible next to typical item sizes.
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
   * re-applying it while sizes settle keeps the CONTENT still (the
   * indicator adapts instead — the search-jump behavior).
   */
  getAnchoredPosition(index: number, fraction = 0): number | undefined {
    const base = this.getIndexPosition(index);
    if (base === undefined) return undefined;
    const size =
      toRaw(this.measuredSizes.value)[index] ?? this.estimatedItemSize;
    return base + fraction * size;
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
    const measured = toRaw(this.measuredSizes.value);
    const assumed = this.estimatedItemSize;
    const cursor = this.cursor;
    let index = Math.min(cursor.index, len - 1);
    let top = cursor.offset;
    while (index > 0 && top > offset) {
      index--;
      top -= measured[index] ?? assumed;
    }
    let size = measured[index] ?? assumed;
    while (
      index < len - 1 &&
      top + (size = measured[index] ?? assumed) <= offset
    ) {
      top += size;
      index++;
    }
    size = measured[index] ?? assumed;
    cursor.index = index;
    cursor.offset = top;
    return {
      index,
      fraction:
        size > 0 ? Math.min(1, Math.max(0, (offset - top) / size)) : 0
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
    const containerSize = this.offsetSize(this.scrollElement.value);
    if (position > 0 || this.scrollExtent.value < containerSize) position = 0;

    // Prevent scrolling down beyond last paragraph
    if (
      Math.abs(position) +
      containerSize +
      (this.scrollElement.value?.scrollTop ?? 0) >
      this.scrollExtent.value &&
      this.scrollExtent.value > containerSize
    ) {
      position = -(
        // Must be negative
        this.scrollExtent.value -
        containerSize -
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
      this.scrollElementInner.value!.style.transform = this.transformFor(
        snapRender ? $VirtualScroller.snapForRender(rendered) : rendered
      );
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

  /** Scrollbar geometry over the VIRTUAL position (native scrollTop stays
   *  0 by design, so a native scrollbar can never exist here). Fraction of
   *  the track the thumb occupies — floored so a million-item list still
   *  presents a grabbable thumb. */
  get scrollbarThumbFraction() {
    const total = this.scrollExtent.value;
    const container = this.containerOuterSize.value;
    if (!total || !container || total <= container) return 0;
    return Math.max(container / total, 0.08);
  }

  /** 0..1 progress of the thumb along its travel range. */
  get scrollbarProgress() {
    const total = this.scrollExtent.value;
    const scrollable = total - this.containerOuterSize.value;
    if (scrollable <= 0) return 0;
    const position = parseFloat(String(this.scrollPosition.value)) || 0;
    return Math.min(Math.max(position / scrollable, 0), 1);
  }

  /** Seek to a 0..1 track fraction through the full scrollToIndex pipeline
   *  (spacer rebase + converge loop) — a raw lenis.scrollTo would translate
   *  content out of the viewport without rebasing the window. */
  seekToFraction(fraction: number) {
    const lastIndex = this.items.value.length - 1;
    if (lastIndex < 0) return;
    const clamped = Math.min(Math.max(fraction, 0), 1);
    this.scrollToIndex(Math.round(clamped * lastIndex), undefined, false);
  }

  /* Scrollbar drag (the built-in track) */

  /** True while a pointer owns the thumb — the thumb's easing turns off so
   *  it sticks to the finger (see the .dragging CSS). */
  get scrollbarDragging() {
    return ref(false);
  }

  /** The track renders only when asked for AND there is travel to show. */
  get scrollbarVisible() {
    return this.props.scrollbar && this.scrollbarThumbFraction > 0;
  }

  /** The thumb's size and offset along the track — main-axis property
   *  names come from the axis seam, so the same geometry renders as
   *  height/top on the vertical track and width/left on the horizontal. */
  get scrollbarThumbStyle() {
    const [sizeProp, offsetProp] = this.axisThumbProps;
    return {
      [sizeProp]: this.scrollbarThumbFraction * 100 + '%',
      [offsetProp]:
        this.scrollbarProgress * (1 - this.scrollbarThumbFraction) * 100 + '%'
    };
  }

  onTrackPointerDown(event: PointerEvent) {
    this.stopAutoPlay();
    this.scrollbarDragging.value = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.seekToPointer(event);
  }

  onTrackPointerMove(event: PointerEvent) {
    if (this.scrollbarDragging.value) this.seekToPointer(event);
  }

  onTrackPointerUp() {
    this.scrollbarDragging.value = false;
  }

  seekToPointer(event: PointerEvent) {
    const track = (event.currentTarget as HTMLElement).closest(
      '.virtual-scroller__track'
    ) as HTMLElement;
    if (!track) return;
    this.seekToFraction(
      this.trackPointerFraction(event, track.getBoundingClientRect())
    );
  }

  /** Stop handle for the latest scrollToIndex re-apply watcher (see below). */
  private stopScrollToIndexReapply: (() => void) | null = null;

  /**
   * @param topOffsetPx pushes the landing DOWN so the target sits this many
   * pixels below the viewport top — context above a jumped-to item (and
   * clear of any fade overlay at the reading area's top edge).
   * @param innerFraction 0..1 point WITHIN the item to align to (0 = its
   * top). A search match deep inside a paragraph taller than the viewport
   * would otherwise land below the fold — the item's size keeps refining
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
      const size =
        toRaw(this.measuredSizes.value)[index] ?? this.estimatedItemSize;
      return Math.max(0, position + innerFraction * size - topOffsetPx);
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
    // unrelated size change and yank the reader back), and the reader
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

  onVirtualScroll({ deltaX, deltaY }) {
    const delta = this.axisDelta({ deltaX, deltaY });
    // Scrolling UP is the reader taking over — autoplay stops outright
    // (the frame loop re-arms below for the manual scroll itself).
    // Scrolling DOWN is reading intent — autoplay re-arms by itself and
    // the settle chain below resumes the creep once the input rests.
    if (this.isAutoPlaying.value && delta < 0) {
      this.stopAutoPlay();
    } else if (!this.isAutoPlaying.value && delta > 0 && !this.props.snapToItems) {
      this.isAutoPlaying.value = true;
    }
    this.virtualScrolling = true;
    clearTimeout(this.virtualScrollTimeout);
    this.scrollElementInner.value.style.transitionDuration = '0s';
    this.scrollDirection.value = delta < 0 ? 'up' : 'down';
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

    if (this.props.snapToItems) {
      // step mode: once the input rests AND the lenis lerp settles, the
      // strip snaps to the nearest item boundary through the same
      // scrollToIndex pipeline a seek uses.
      clearTimeout(this.snapTimeout);
      this.snapTimeout = setTimeout(this.snapToNearest, 160);
    }
  }

  private snapTimeout: ReturnType<typeof setTimeout> | undefined;

  snapToNearest() {
    if (this.virtualScrolling || this.lenis?.isScrolling) {
      clearTimeout(this.snapTimeout);
      this.snapTimeout = setTimeout(this.snapToNearest, 90);
      return;
    }
    const scrollPosition = this.scrollPosition.value;
    const offset =
      typeof scrollPosition === 'number'
        ? scrollPosition
        : parseFloat(scrollPosition) || 0;
    const at = this.getIndexAtPosition(offset);
    if (!at) return;
    const target = at.fraction > 0.5 ? at.index + 1 : at.index;
    this.scrollToIndex(
      Math.min(target, this.items.value.length - 1),
      undefined,
      true
    );
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

  /** Speed as a SETTING: the optional creepMsPerPx prop overrides the
   *  tuned reading cadence (which stays the sacred default). A marquee
   *  reads a live value here every creep frame, so a speed slider takes
   *  effect mid-glide. */
  protected get creepMsPerPx(): number {
    return this.props.creepMsPerPx ?? $VirtualScroller.CREEP_MS_PER_PX;
  }

  /** rAF handle + last frame timestamp of the creep integrator. */
  private creepFrame: number | null = null;
  private lastCreepTs: number | null = null;

  play() {
    if (this.virtualScrolling || this.lenis.isScrolling) {
      clearTimeout(this.autoscrollTimeout);
      // Forward inertia decaying through cruise speed hands off to the
      // creep RIGHT THERE — the glide never dips below cruise.
      if (this.adoptDecayedInertia()) return;

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
   * The wheel-to-creep handoff: while a FORWARD flick's inertia decays,
   * the moment its speed falls to the creep's cruise speed the creep
   * adopts the scroll right there — a scrub may accelerate the glide
   * above cruise, but it never drags it below. Without this, play()
   * waits for the lenis lerp to decay all the way to zero before
   * resuming: decelerate, stall, accelerate — felt as a stutter after
   * every shift+wheel scrub. A backward scrub is the reader taking over
   * (stopAutoPlay already handled it), so no handoff there. Snap-mode
   * consumers never arm autoplay, so this path never runs for them.
   */
  private adoptDecayedInertia(): boolean {
    const lenis = this.lenis;
    // While input is still arriving, the reader owns the scroll — only a
    // free-decaying smooth lerp is a candidate.
    if (!lenis || this.virtualScrolling) return false;
    if (lenis.isScrolling !== 'smooth') return false;
    if (this.scrollDirection.value !== 'down') return false;
    // lenis.velocity is px per rAF frame; at ~60fps that is px per 16.7ms.
    const pxPerMs = lenis.velocity / 16.7;
    if (pxPerMs <= 0 || pxPerMs > 1 / this.creepMsPerPx) return false;
    // Adopt the CURRENT animated position (not the farther wheel target):
    // the lerp dies where it is and the creep continues from that exact
    // pixel at cruise speed — velocity is continuous through the handoff.
    lenis.adoptExternalScroll(lenis.animatedScroll);
    cancelAnimationFrame(this.frame);
    // 0 (not null): falsy for onVirtualScroll's re-arm check without
    // widening the field type.
    this.frame = 0;
    if (this.creepFrame !== null) cancelAnimationFrame(this.creepFrame);
    this.lastCreepTs = null;
    this.creepFrame = requestAnimationFrame(this.creepStep);
    return true;
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

    // Δt integrates TRUTHFULLY on slow frames: a loaded machine's 60→20fps
    // jitter stays time-correct, so every displayed position is where the
    // clock says it should be. (Clamping Δt at 50ms made the advance
    // constant per FRAME — at marquee speeds that turns frame jitter into
    // visible speed wobble: 6px landing every 50–250ms reads as chop.)
    // Only a genuine rAF suspension (background tab) resumes as a fresh
    // frame instead of a content jump.
    const elapsed = this.lastCreepTs === null ? 16.7 : ts - this.lastCreepTs;
    const dt = elapsed > 250 ? 16.7 : elapsed;
    this.lastCreepTs = ts;
    this.lenis.targetScroll += dt / this.creepMsPerPx;

    const container = this.offsetSize(this.scrollElement.value);
    const atEnd =
      this.lenis.actualScroll + container >= this.scrollExtent.value - 10;

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
 *
 * The namespace carries the WHOLE component contract, in canonical order:
 * IDENTITY ($Class / Class / Instance), then VALUES (prop types + defaults
 * merged by propsWithDefaults, the emits object), then TYPES (all derived
 * from the values — never hand-duplicated). One import gives a consumer or
 * a subclass everything the component is, and the SFC is pure wiring: the
 * macros receive the RUNTIME objects, so no compiler macro ever resolves a
 * cross-file type, and a subclass component composes its surface by
 * SPREADING the maps (see HorizontalVirtualScroller, which inherits every
 * prop and overrides one default in one line).
 */
export namespace VirtualScroller {
  /* Identity */

  export const $Class = $VirtualScroller;
  export let Class = Reactive(
    $VirtualScroller
  ) as unknown as typeof $VirtualScroller;
  export type Instance<T extends BaseItem> = ReactiveInstance<
    $VirtualScroller<T>
  >;

  /* Values */

  /** 1 — the TYPES: a defineComponent-style object, no defaults inside.
   *  `modelValue` is typed against BaseItem here (a const cannot be
   *  generic); Props<T> recovers the precise item type in the SFC. */
  export const propsTypes = {
    modelValue: { type: Array as PropType<BaseItem[]>, required: true },
    /** Render the built-in draggable scrollbar over the VIRTUAL position. */
    scrollbar: { type: Boolean as PropType<boolean> },
    autoPlay: { type: Boolean as PropType<boolean> },
    autoPlayDelay: { type: Number as PropType<number> },
    autoRepeat: { type: Boolean as PropType<boolean> },
    /** Step mode: after any input settles, snap to the nearest item
     *  boundary — scroll, stop; scroll, stop. */
    snapToItems: { type: Boolean as PropType<boolean> },
    assumedSize: { type: Number as PropType<number> },
    paddingQuantity: { type: Number as PropType<number> },
    /** Autoplay creep speed: ms of wall time per px. No default on purpose —
     *  unset falls back to the tuned reading cadence (see creepMsPerPx). */
    creepMsPerPx: { type: Number as PropType<number> },
    /** Accepted for API compatibility; the docs build renders the plain branch. */
    draggable: { type: Boolean as PropType<boolean> },
    dragHandleSelector: { type: String as PropType<string> },
    dragClass: { type: String as PropType<string> },
    dragGhostClass: { type: String as PropType<string> },
    dragChosenClass: { type: String as PropType<string> }
  };

  /** 2 — the DEFAULTS: plain values, typed against the types object.
   *  `modelValue` is required and `creepMsPerPx` deliberately default-free
   *  (unset = the tuned creep cadence), so both are excluded from the
   *  must-have-a-default check. */
  export const propsDefaults: ExtractPropDefaultTypes<
    Omit<typeof propsTypes, 'modelValue' | 'creepMsPerPx'>
  > = {
    scrollbar: false,
    autoPlay: false,
    autoPlayDelay: 500,
    autoRepeat: true,
    snapToItems: false,
    assumedSize: 30,
    paddingQuantity: 6,
    draggable: false,
    dragHandleSelector: '.sortable-drag-handle',
    dragClass: 'sortable-drag',
    dragGhostClass: 'sortable-ghost',
    dragChosenClass: 'sortable-chosen'
  };

  /** 3 — the MERGE: a standard Vue props object, ready for defineProps. */
  export const props = propsWithDefaults(propsDefaults, propsTypes);

  export const emits = {
    itemsChanged: (args: ItemsChangeEmitArgs) => true,
    drop: (startIndex: number, dropIndex: number) => true,
    move: (evt: any) => true
  };

  /* Types */

  /** Resolved props — what the class receives AFTER defaults are applied.
   *  DERIVED from the merged runtime object (never hand-duplicated):
   *  ExtractPropTypes makes every defaulted prop non-optional and the
   *  default-free `creepMsPerPx` optional; the one thing a runtime map
   *  cannot carry — the generic item type — is grafted back over
   *  `modelValue`. */
  export type Props<T extends BaseItem> = Omit<
    ExtractPropTypes<typeof props>,
    'modelValue'
  > & { modelValue: T[] };

  export type Emits = ExtractEmitTypes<typeof emits>;

  export interface ItemsChangeEmitArgs {
    start: number;
    end: number;
  }

  export interface ItemContext<T extends BaseItem> {
    item: T;
    id: string;
    index: number;
  }

  export interface Slots<T extends BaseItem> {
    item: (scope: ItemContext<T>) => any;
  }

  /**
   * What consumers hold through a template ref: Vue's expose surface
   * unwraps refs on read and redirects ref writes into .value (proxyRefs
   * semantics). Instance (ReactiveInstance) is load-bearing underneath:
   * it strips the readonly that TS puts on get-only accessors, so writes
   * like `scroller.scrollDirection = 'down'` typecheck as they behave.
   */
  export type Exposed<T extends BaseItem> = ShallowUnwrapRef<Instance<T>>;
}
