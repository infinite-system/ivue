import type { ExtractPropTypes, PropType, Ref, ShallowUnwrapRef } from 'vue';
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  toRaw,
  shallowRef,
  toRef,
  watch
} from 'vue';

import { useElementSize, useResizeObserver } from '@vueuse/core';
import {
  definePropTypes,
  propsWithDefaults,
  Reactive,
  type ExtractEmitTypes,
  type ExtractPropDefaultTypes,
  type ReactiveInstance
} from '../../ivue';
import { Lenis } from '../../lenis/Lenis';
import { nestedProps, type NestedPartial, type NestedProps } from '../../nestedProps';
import { Static } from '../../Static';
import type { Kit } from '../../kit/Kit';
import { VirtualScrollerAutoplay } from './VirtualScrollerAutoplay';
import { VirtualScrollerGeometry } from './VirtualScrollerGeometry';
import { VirtualScrollerLanding } from './VirtualScrollerLanding';
import { VirtualScrollerPadding } from './VirtualScrollerPadding';
import { VirtualScrollerSelection } from './VirtualScrollerSelection';

/**
 * Virtualized scroller (ivue v2 `Reactive` class).
 *
 * Scrolling is driven by a customized Lenis over translateY — not native
 * scroll — and the feel is hand-tuned: every Lenis option is load-bearing,
 * so treat them as constants.
 *
 * Five capabilities are hosted, each its own class behind an owner
 * interface, each built once in the constructor: the GEOMETRY answers where
 * every item sits, the PADDING sizes the rows mounted beyond the window, the
 * LANDING seeks and holds a row while sizes settle, the AUTOPLAY runs the
 * reading creep, and the SELECTION owns the range, the gestures and copy.
 * What is left here is the scroller itself: the window walk, the position
 * write, the frame loop, the gesture locks and the scrollbar.
 *
 * POSITION MODEL: rendered items are NORMAL-FLOW block elements between two
 * spacer divs — the browser stacks the window at real sizes for free; no
 * per-item `top` is computed or maintained. Estimates only decide the two
 * spacer sizes and the scrollTop↔index mapping, and the prefix sum that
 * answers both lives in VirtualScrollerGeometry, hosted here: sizes in,
 * positions out, no DOM. Heights are captured ONE-SHOT (item mount — see
 * VirtualScrollerItem.ts) plus one wrapper-observer wave per patch, not
 * continuously observed: a size sync costs O(1), resolving the visible
 * window costs O(items scrolled since the last frame), and nothing ever
 * costs O(total item count) — which is what made 100k-item posts jitter
 * when the prefix sum was a real array rebuilt on every (debounced)
 * ResizeObserver burst.
 */
class $VirtualScroller<T extends VirtualScroller.BaseItem> {
  /* Contract — STATIC, so the class owns its inputs the way it owns its
     state, and a subclass extends them with `super` like any other
     member (HorizontalVirtualScroller re-tunes one default in one line).
     The namespace below holds identity and TYPES only. */

  /** 1 — the TYPES: a defineComponent-style object, no defaults inside.
   *  `modelValue` is typed against VirtualScroller.BaseItem here (a const cannot be
   *  generic); Props<T> recovers the precise item type in the SFC. */
  static get propsTypes() {
    return definePropTypes({
      modelValue: {
        type: Array as PropType<VirtualScroller.BaseItem[]>,
        required: true
      },
      /** Render the built-in draggable scrollbar over the VIRTUAL position. */
      scrollbar: { type: Boolean as PropType<boolean> },
      /** At an end, an outward wheel or touch scrolls the page (the nearest
       *  scrollable ancestor, else the document) — like CSS overscroll-behavior
       *  auto. False keeps every gesture inside: a card over the page wants that. */
      overscroll: { type: Boolean as PropType<boolean> },
      autoPlay: { type: Boolean as PropType<boolean> },
      autoPlayDelay: { type: Number as PropType<number> },
      autoRepeat: { type: Boolean as PropType<boolean> },
      /** Step mode: after any input settles, snap to the nearest item
       *  boundary — scroll, stop; scroll, stop. */
      snapToItems: { type: Boolean as PropType<boolean> },
      /** Where a snapped/step landing places the item: at the container's
       *  start (the default) or its CENTER — `scroll-snap-align` semantics,
       *  clamped at the bounds like the platform's. Edge items that cannot
       *  center rest against the bounds; a consumer that wants true
       *  edge-centering adds main-axis padding (it flows into the extent
       *  through axisPaddingProps — the scroll-padding escape hatch). */
      snapAlign: { type: String as PropType<'start' | 'center'> },
      assumedSize: { type: Number as PropType<number> },
      paddingQuantity: { type: Number as PropType<number> },
      /** Autoplay creep speed: ms of wall time per px. No default on purpose —
       *  unset falls back to the tuned reading cadence (see creepMsPerPx). */
      creepMsPerPx: { type: Number as PropType<number> },
      /** The motion knobs — the wheel's and the finger's gain, follow,
       *  inertia and speed cap. A partial object at any depth: whatever is
       *  left out keeps the tuned default (see SCROLL_KNOBS). */
      scroll: { type: Object as PropType<NestedPartial<VirtualScroller.ScrollKnobs>> },
      /** The selection knobs — a pointer's and a finger's drag autoscroll
       *  cadence. A partial object at any depth (see SELECTION_KNOBS). */
      selection: { type: Object as PropType<NestedPartial<VirtualScroller.SelectionKnobs>> },
      /** The text an item contributes to a copied selection when its row is
       *  NOT mounted (mounted rows read their own text). Return the same
       *  string the row renders, or copy will differ across the window. */
      selectionText: {
        type: Function as PropType<(item: VirtualScroller.BaseItem) => string>
      },
      /** What joins the rows of a copied selection — a line break for
       *  stacked rows; a horizontal strip of text chunks passes a space. */
      selectionJoin: { type: String as PropType<string> },
      /** the kit entry this scroller was rendered through, when a parent's kit names it */
      kit: { type: Object as PropType<Kit.Entry<typeof VirtualScroller>> }
    });
  }

  /** 2 — the DEFAULTS: plain values, typed against the types object.
   *  Required props (`modelValue`) are filtered out by
   *  ExtractPropDefaultTypes itself; a deliberately default-free optional
   *  prop states its ruling in data: `creepMsPerPx: undefined` below means
   *  "unset = the tuned creep cadence". */
  static get propsDefaults(): ExtractPropDefaultTypes<typeof $VirtualScroller.propsTypes> {
    return {
      scrollbar: false,
      overscroll: true,
      autoPlay: false,
      autoPlayDelay: 500,
      autoRepeat: true,
      snapToItems: false,
      snapAlign: 'start',
      assumedSize: 30,
      paddingQuantity: 6,
      creepMsPerPx: undefined, // no default ON PURPOSE — see the comment above
      scroll: this.SCROLL_KNOBS,
      selection: this.SELECTION_KNOBS,
      // mounted rows read their own text; the data fallback is body, then id
      selectionText: undefined,
      selectionJoin: '\n',
      kit: undefined
    };
  }

  /** 3 — the MERGE: a standard Vue props object, ready for defineProps.
   *  Reads through the receiver, so a subclass's `props` is its own
   *  fusion of ITS types and defaults. */
  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  static get emits() {
    return {
      itemsChanged: (args: VirtualScroller.ItemsChangeEmitArgs) => true
    };
  }

  /** How much tail actually gets RENDERED below the window — a safety
   *  margin of a few viewports, not the whole remaining post. The layer
   *  (the inner element) is content-sized; rendering the true tail made it
   *  ~10M px tall on a 100k-item post, and layers that size carry visible
   *  compositor heaviness (confirmed by feel test: capping the layer was
   *  the difference between "slight chop" and "fully smooth"). Nothing
   *  below the fold reads the tail — scroll range comes from the computed
   *  size via lenis.virtualLimit. */
  protected static readonly TRAILING_SPACER_RENDER_CAP = 2048;

  protected static readonly RENDER_BIAS_CHUNK = 65536;

  /**
   * Device-pixel snap for LANDINGS (seeks/jumps): a resting position on
   * the grid keeps text crisp. The snap policy is "slow motion is
   * fractional, fast motion and landings snap" — the reading creep
   * (snapRender=false) and the slow tail of a wheel lerp bypass this:
   * snapped sub-device-pixel-per-frame motion degenerates into whole-pixel
   * ticks at visible rates, while fractional translateY is filtered by the
   * compositor into an apparent glide. The wheel lerp snaps by speed
   * inside lenis.setScroll (a device pixel or more per frame): fractional
   * offsets at speed re-raster the layer and snap each row's text and
   * edges independently, a 1 px shimmer between neighbours. The SPACERS never
   * snap either: they change mid-motion at every window move, and a
   * spacer rounded to the grid while the transform under it is fractional
   * hops the visible content by its rounding error (up to half a device
   * pixel, measured) exactly when the window advances. Safe at any depth —
   * renderBias keeps rendered offsets ≤ ~131k px, where f32 resolves both
   * integers and fractions.
   */
  protected static snapForRender(value: number) {
    const dpr = window.devicePixelRatio || 1;
    return Math.round(value * dpr) / dpr;
  }

  /** WebKit, iOS browsers included (every one of them is WebKit): the
   *  engine that needs its composited layer re-promoted to rasterize
   *  fresh content under a held touch — see nudgePaint. */
  protected static readonly IS_WEBKIT =
    typeof navigator !== 'undefined' &&
    /^((?!chrome|chromium|android).)*safari/i.test(navigator.userAgent);

  /** The tuned motion: how far a wheel notch or a finger's pixel moves the
   *  content (gain), how fast the transform chases its target (follow —
   *  the lerp, higher is snappier), how far a flick carries (inertia), and
   *  the fastest the content may move (maxPxPerMs; 0 is uncapped). Touch
   *  is a native list's: the content follows the finger one to one (a
   *  gain above one read as twitchy under the finger), and a flick carries
   *  thirty-five frames of the finger's speed under a 0.065 lerp — fifty
   *  under 0.06 sent a small flick too far, too fast, most of all on
   *  Android, whose few large moves read a higher velocity off the trail. */
  static get SCROLL_KNOBS(): VirtualScroller.ScrollKnobs {
    return {
      wheel: { gain: 1, follow: 0.1, maxPxPerMs: 0 },
      touch: { gain: 1, follow: 0.065, inertia: 35, maxPxPerMs: 0 }
    };
  }

  /** The tuned selection cadences — the selection class's own profiles. */
  static get SELECTION_KNOBS(): VirtualScroller.SelectionKnobs {
    return {
      // on: rows can be selected and copied; a list of controls — an index, a peek — turns it off
      enabled: true,
      autoscroll: {
        mouse: VirtualScrollerSelection.Class.AUTOSCROLL_MOUSE,
        touch: VirtualScrollerSelection.Class.AUTOSCROLL_TOUCH
      },
      // off: a double click or a double tap selects nothing until a list asks for it — a
      // long press is the touch's way into a selection, and a reader tapping a row twice
      // to open it found a word selected instead
      multiClick: false
    };
  }

  constructor(
    props: VirtualScroller.Props<T>,
    public emit: VirtualScroller.Emits
  ) {
    this.props = nestedProps(props, this.self.propsDefaults as VirtualScroller.KnobDefaults);
    this.outerElementSize = useElementSize(this.scrollElement, undefined, {
      box: 'border-box'
    });

    // The hosted capabilities, built once, in dependency order: the
    // geometry answers positions, the pad reads the motion, the selection
    // watches the window — and the selection's first watch evaluates the
    // window walk, which reads the container size observed just above.
    this.geometry = this.createGeometry();
    this.padding = this.createPadding();
    this.landing = this.createLanding();
    this.autoplay = this.createAutoplay();
    this.selection = this.createSelection();

    // ONE observer per scroller — on the items wrapper, whose size only
    // changes when a rendered item's real size does (spacers are siblings).
    // The callback re-reads just the rendered window (O(window), never
    // O(total)). This is what keeps rendered-item sizes truthful for the
    // scroll clamps and index→position math: slot content hydrates a tick
    // after item mount (mount-time capture reads the pre-hydration size),
    // fonts/images settle later still — and none of that re-fires per-item
    // observers anymore.
    useResizeObserver(this.itemsWrapperElement, () => this.remeasureRenderedItems());

    this.updatePositionsImmediately();

    // Structural changes (splice/filter/wholesale replace) shift what every
    // index means — re-derive aggregates/cursor from the current map. The
    // old model self-healed the same way via its full array rebuild.
    watch(
      () => this.items.value.length,
      () => this.updatePositionsImmediately()
    );

    // The container grew — a phone's address bar folded away, a panel
    // closed — and the range shrank by the same amount: a position resting
    // at the old end now sits past the new one, and the last row floats
    // above a blank strip. Pull it back in; a reader at the end stays at
    // the end.
    // invariant: The scroll position lands inside the scrollable range (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
    watch(
      () => this.containerOuterSize.value,
      () => this.clampScrollPosition()
    );

    if (this.autoPlay.value) this.startAutoPlay(this.props.autoPlayDelay);

    onMounted(() => this.onMount());
    onBeforeUnmount(() => this.onUnmount());
  }

  /* Template refs */

  /** The props, complete at every depth: a nested knob an author leaves
   *  out reads as its tuned default (see nestedProps). */
  public props: VirtualScroller.MergedProps<T>;

  // POSITION MODEL — a hosted VirtualScrollerGeometry: the sparse size map,
  // the prefix-sum cursor, the estimate and every position query. The
  // scroller measures and anchors; the geometry only answers. A field, not a
  // `$`-getter: the constructor's own repair call reads it, so there is no
  // first touch to be lazy about, and the window walk reads it every frame.
  // invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  readonly geometry: VirtualScrollerGeometry.Instance;

  // RENDER PADDING — a hosted VirtualScrollerPadding: the base pad on both
  // ends, plus rows ahead of the motion sized by velocity. The window walk
  // asks it once per evaluation, which is every frame there is motion.
  // invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  readonly padding: VirtualScrollerPadding.Instance;

  // LANDING — a hosted VirtualScrollerLanding: a seek, a thumb drag and a
  // step-mode snap all name an item and hold it while the sizes settle.
  // invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  readonly landing: VirtualScrollerLanding.Instance;

  // AUTOPLAY — a hosted VirtualScrollerAutoplay: the reading creep and its
  // handoff with the wheel. A plain list never arms it.
  // invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  readonly autoplay: VirtualScrollerAutoplay.Instance;

  // TEXT SELECTION — a hosted VirtualScrollerSelection: the logical range
  // over the DATA, the highlight, the gestures, copy. The scroller supplies
  // what only it knows (the Owner interface); the template reads the
  // instance.
  // invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  readonly selection: VirtualScrollerSelection.Instance;

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $VirtualScroller;
  }

  get scrollElement(): Ref<HTMLElement | null> {
    return ref<HTMLElement | null>(null);
  }

  get scrollElementInner(): Ref<HTMLElement | null> {
    return ref<HTMLElement | null>(null);
  }

  /** Lenis, for paths that only run after mount created it. */
  protected get lenisRequired(): Lenis.Model {
    if (!this.lenis) throw new Error('VirtualScroller: lenis is created on mount');
    return this.lenis;
  }

  /** The div wrapping the rendered items (between the two spacers). */
  get itemsWrapperElement(): Ref<HTMLElement | null> {
    return ref<HTMLElement | null>(null);
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

  /* ---- gesture-axis lock (touch) ---------------------------------- */

  /** The axis this gesture belongs to, decided once per touch. */
  protected gestureAxis: 'x' | 'y' | null = null;

  protected gestureOrigin = { x: 0, y: 0 };

  /** The touch began inside an element that scrolls across the own axis — a code block, a
   *  table — and the browser's pan is the default for it until the finger is clearly ours. */
  protected gestureInPannable = false;

  /** Below this the finger has not said which way it is going yet. */
  protected get gestureAxisThresholdPx(): number {
    return 8;
  }

  /** How much the cross-axis delta must exceed the own-axis delta for a
   *  touch to be the page's. One sample decides — Android delivers the
   *  first touchmove only past its own slop, already several px along a
   *  noisy direction — so a merely diagonal start stays ours. */
  protected get crossAxisBias(): number {
    return 1.5;
  }

  /** The axis this scroller answers to — cross-axis gestures are the
   *  page's. A 'both' gesture orientation claims everything, and so does
   *  a frame whose touch-action is none: the browser has no cross-axis
   *  gesture to run over it, so handing one over would only kill it. */
  protected get gestureOwnAxis(): 'x' | 'y' | null {
    if (this.frameTouchAction === 'none') return null;
    if (this.lenisGestureOrientation === 'horizontal') return 'x';
    if (this.lenisGestureOrientation === 'vertical') return 'y';
    return null;
  }

  /* Axis seams — every place the class touches a DOM dimension or a
     gesture axis goes through these. Vertical defaults here; the
     horizontal subclass overrides ONLY these (the tuned scroll physics,
     cursor math, and creep never fork). */

  // invariant: Every axis dependency goes through a seam getter (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  protected get lenisOrientation(): 'vertical' | 'horizontal' {
    return 'vertical';
  }

  protected get lenisGestureOrientation(): 'vertical' | 'horizontal' | 'both' {
    return 'vertical';
  }

  // invariant: The frame is never natively panned along its own axis (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  /** Both axes are fully virtual: scrollTop and scrollLeft are pinned at 0
   *  by design, so Lenis must never adopt a native scroll as the position
   *  (see the fork's onNativeScroll). Adopting one teleports the content:
   *  a 30 px native nudge under a touch became "scroll 30", and the rows,
   *  the thumb and the copy chip left the frame together on iOS. Any
   *  native scroll the frame does receive is converted by onScroll. */
  protected get lenisIgnoreNativeScroll(): boolean {
    return true;
  }

  protected get axisPaddingProps(): readonly [string, string] {
    return ['padding-top', 'padding-bottom'];
  }

  /** Scrollbar-thumb style properties along the main axis: [size, offset]. */
  protected get axisThumbProps(): readonly [string, string] {
    return ['height', 'top'];
  }

  // invariant: The frame is never natively panned along its own axis (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  /** The frame's touch-action. The own axis is never the browser's — Lenis
   *  drives it in JS, and a touch selection needs the own-axis touchmove
   *  to stay cancelable; without this, the overflow:auto frame pans for
   *  real under a selecting finger and the transformed rows leave the
   *  clip. The vertical scroller gives the browser nothing: a page does
   *  not pan sideways, and any token left on (`pan-x`) lets Chrome on
   *  Android claim a sloppy second swipe as a horizontal pan and end it
   *  with a touchcancel, which is a flick that never fires. The strip
   *  keeps `pan-y`, since the page must scroll vertically across it. */
  get frameTouchAction(): string {
    return 'none';
  }

  /* Container size */

  protected outerElementSize: ReturnType<typeof useElementSize>;

  /**
   * Border-box container size — the same box the bottom clamp measures.
   * One observer, one box: a second content-box observer per scroller
   * fed only the window walk, and the padding it left out only made the
   * walk cover less than the frame it has to fill.
   */
  get containerOuterSize() {
    return this.outerElementSize.height;
  }

  /** The frame's main-axis size as the resize observer last reported it — the
   *  hot paths read this, never the element: an `offsetHeight` read after a
   *  patch forces a layout, and the frame loop, the clamp and the limit each
   *  read it every frame (measured: 191 ms of forced layouts over two flicks).
   *  Before the first report it falls back to the element once. */
  get containerSpan(): number {
    const observed = this.containerOuterSize.value;
    return observed > 0 ? observed : this.offsetSize(this.scrollElement.value);
  }

  /* Scroll state */

  /** Absolute (unsigned) scroll offset within the content. */
  get scrollPosition() {
    return ref(0);
  }

  get scrollDirection() {
    return ref('down');
  }

  /** The axis seam — rows stack down; the horizontal subclass says 'x'. */
  get selectionAxis(): VirtualScrollerSelection.Axis {
    return 'y';
  }

  /** What joins the rows of a copied selection (the prop, defaulted). */
  get selectionJoin() {
    return this.props.selectionJoin;
  }

  /** Whether a multi-click or a double tap selects (the `selection.multiClick` knob). */
  get multiClickSelects(): boolean {
    return this.props.selection.multiClick;
  }

  /** Whether the rows can be selected at all (the `selection.enabled` knob). */
  get selectionEnabled(): boolean {
    return this.props.selection.enabled;
  }

  /** The frame's class object: the axis, and the refusal of selection when the knob is off. */
  get frameClass(): Record<string, boolean> {
    return { 'virtual-scroller--unselectable': !this.selectionEnabled };
  }

  /** The drag autoscroll's speed factor: a faster reading creep is a
   *  faster drag. */
  get creepFactor() {
    return this.autoplay.factor;
  }

  /** The motion knobs as Lenis reads them — one object, so a watch over
   *  it sees every leaf. */
  get lenisMotion() {
    const { wheel, touch } = this.props.scroll;
    return {
      wheelMultiplier: wheel.gain,
      lerp: wheel.follow,
      wheelMaxPxPerMs: wheel.maxPxPerMs,
      touchMultiplier: touch.gain,
      syncTouchLerp: touch.follow,
      touchInertiaMultiplier: touch.inertia,
      touchMaxPxPerMs: touch.maxPxPerMs
    };
  }

  /** The two drag autoscroll cadences the selection scrolls with. */
  get autoscrollProfiles() {
    return this.props.selection.autoscroll;
  }

  /** Reactive autoplay state — true while the reading creep is armed.
   *  Consumers bind buttons to it; a user scroll UP flips it off. */
  get isAutoPlaying() {
    return this.autoplay.isPlaying;
  }

  /** Measured main-axis pixel sizes by item index (unmeasured fall back to the estimate). */
  get measuredSizes() {
    return this.geometry.measuredSizes;
  }

  /** The size assumed for unmeasured items — the prop until the first wave calibrates it. */
  get estimatedItemSize(): number {
    return this.geometry.estimatedItemSize;
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
  protected get leadingSpacerSize() {
    return ref(0);
  }

  protected get trailingSpacerSize() {
    return ref(0);
  }

  // invariant: The two spacers and the rendered rows sum to the extent (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  /** Fractional on purpose — a row sum is fractional whenever a row is,
   *  and a snapped spacer hops the content at every window move (see
   *  snapForRender). */
  get leadingSpacerPx() {
    return Math.max(0, this.leadingSpacerSize.value - this.renderBias.value) + 'px';
  }

  get trailingSpacerPx() {
    return Math.min(this.self.TRAILING_SPACER_RENDER_CAP, this.trailingSpacerSize.value) + 'px';
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
  protected get renderBias() {
    return ref(0);
  }

  // computed: expensive — walks the measured sizes; THIN, the caching
  // shell only; the logic stays named in a directly testable method.
  get scrollExtent() {
    return computed(() => this.computeScrollExtent());
  }

  get halfPaddingQuantity() {
    return Math.ceil(this.paddingQuantity.value / 2);
  }

  /** The content's velocity in px per animation frame, signed: positive
   *  forward. Read, never tracked — Lenis is not reactive. */
  // invariant: Lenis is read inside the walk never tracked (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  get scrollVelocity() {
    return this.lenis?.velocity ?? 0;
  }

  /** The px the content has shifted under the reader so far, summed — the position less this
   *  is the reader's own motion (the chat's pin reads it: a shift is never a scroll up). */
  get contentShift(): number {
    return this.shiftMark.total;
  }

  /** The furthest a glide can travel and still show content the whole way:
   *  the pad's own coverage limit. Past it there is nothing to animate
   *  ACROSS — the rows between were never mounted — so a landing arrives
   *  instead of sliding over blank. */
  get coverableGlidePx(): number {
    return this.padding.coverableGapPx;
  }

  /** The lerp gap: how far the transform still has to travel to the
   *  target, in px, signed like the velocity. The window walk is anchored
   *  at the target; this is what the trailing pad must cover. */
  // invariant: The transform lerps to the target over many frames (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  get scrollGap() {
    const lenis = this.lenis;
    return lenis ? lenis.targetScroll - lenis.animatedScroll : 0;
  }

  /**
   * Previous visibleItems result — returned again when the window is
   * unchanged so the computed's equality check stops propagation.
   */
  protected visibleItemsSnapshot: VirtualScroller.ItemContext<T>[] = [];

  /**
   * The window of items currently rendered. Hot path: re-evaluates on every
   * scroll tick, so it must stay O(window + scroll delta) — never O(total).
   *
   * - Window resolution walks the prefix-sum cursor from wherever it last
   *   was to the current scrollTop — plain object reads on the RAW size
   *   map, no proxy traps. Geometry changes are tracked via the
   *   geometry's one version cell.
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
  // computed: expensive + render-suppression — the window walk, and the
  // unchanged-window snapshot that keeps the v-for from re-rendering.
  get visibleItems() {
    return computed(() => this.computeVisibleItems());
  }

  /* Scrollbar geometry — the thumb's size and travel over the VIRTUAL
     position, since a native scrollbar can never exist here */

  /** Scrollbar geometry over the VIRTUAL position (native scrollTop stays
   *  0 by design, so a native scrollbar can never exist here). Fraction of
   *  the track the thumb occupies — floored so a million-item list still
   *  presents a grabbable thumb. */
  // invariant: The thumb never shrinks below a grabbable fraction (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
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
    return Math.min(Math.max(this.scrollPosition.value / scrollable, 0), 1);
  }

  /* Scrollbar drag state — what a live thumb drag holds */

  /** True while a pointer owns the thumb — the thumb's easing turns off so
   *  it sticks to the finger (see the .dragging CSS). */
  get scrollbarDragging() {
    return ref(false);
  }

  /** The creep speed the author set, if any — unset means the tuned
   *  reading cadence, which the autoplay owns. */
  get creepMsPerPxSetting(): number | undefined {
    return this.props.creepMsPerPx;
  }

  /** Whether reaching the end restarts the creep from the top. */
  get autoRepeat(): boolean {
    return this.props.autoRepeat;
  }

  /** How long the pause before reading resumes. */
  get autoPlayDelay(): number {
    return this.props.autoPlayDelay;
  }

  /** False before mount: there is nothing to land in yet. */
  get hasFrame(): boolean {
    return this.scrollElement.value !== null;
  }

  /** Where a snapped or stepped landing places its item. */
  get snapAlign(): 'start' | 'center' {
    return this.props.snapAlign;
  }

  /* The motion predicates. Two primitives, and the three different
     questions the scroller asks of them — kept apart on purpose: a creep is
     not an input, and an anchor cares about one where a landing cares about
     the other. Written out by hand at each site, the difference is
     invisible and the drift is silent. */

  /** Input is still arriving — a wheel notch, a finger on the glass. */
  get inputLive(): boolean {
    return this.virtualScrolling;
  }

  /** A lerp is still travelling toward its target. */
  get lerpRunning(): boolean {
    return Boolean(this.lenis?.isScrolling);
  }

  /** The lerp has arrived — within the settle band of its target. */
  get lerpLanded(): boolean {
    return Math.abs(this.scrollGap) < 0.5;
  }

  /** The content is travelling under the reader right now. What the anchor
   *  edge turns on: at rest a row that grows must grow DOWNWARD from where
   *  the reader left it, whatever the last direction was. */
  get contentIsMoving(): boolean {
    return this.lerpRunning || this.inputLive;
  }

  /** This scroller plays itself as the reader reads: autoplay is asked for
   *  and step mode is not. A plain list — a chat, an index — never creeps,
   *  and so never reaches the auto-repeat reset that would send it back to
   *  the top. Both the wheel and a thumb release ask this before arming. */
  get playsWhileReading(): boolean {
    return this.props.autoPlay && !this.props.snapToItems;
  }

  /** The reader is moving the content themselves — a glide, or the reading
   *  creep moving on from a landing. What a converge loop ends on: a creep
   *  that kept mounting rows shifted the target at every mount, and every
   *  shift re-pinned the landing under it, a 6 px snap-back every few frames
   *  for as long as the creep ran. */
  get readerIsMoving(): boolean {
    return this.lerpRunning || this.autoplay.isCreeping;
  }

  /** Nothing left for the frame loop to paint: no creep armed, no input
   *  arriving, no lerp remaining. */
  get isAtRest(): boolean {
    return (
      !this.isAutoPlaying.value && !this.inputLive && !this.lerpRunning && this.lerpLanded
    );
  }

  /** The track renders only when asked for AND there is travel to show. */
  get scrollbarVisible() {
    return this.props.scrollbar && this.scrollbarThumbFraction > 0;
  }

  /** The track's class object: the axis modifier comes from the seam. */
  get scrollbarTrackClass() {
    return { 'virtual-scroller__track--x': this.selectionAxis === 'x' };
  }

  /** The thumb's class object: the axis modifier and the drag state. */
  get scrollbarThumbClass() {
    return {
      'virtual-scroller__thumb--x': this.selectionAxis === 'x',
      dragging: this.scrollbarDragging.value
    };
  }

  /** The thumb's size and offset along the track — main-axis property
   *  names come from the axis seam, so the same geometry renders as
   *  height/top on the vertical track and width/left on the horizontal. */
  get scrollbarThumbStyle() {
    const [sizeProp, offsetProp] = this.axisThumbProps;
    return {
      [sizeProp]: this.scrollbarThumbFraction * 100 + '%',
      [offsetProp]: this.scrollbarProgress * (1 - this.scrollbarThumbFraction) * 100 + '%'
    };
  }

  /* Motion state — the integrator, the frame loop's handle, and the plain
     holders the hot paths read and write per frame */

  lenis: Lenis.Model | null = null;

  protected frame: number | null = null;

  protected virtualScrolling = false;

  /** A thumb drag's track fractions at its start and its latest move —
   *  their order on release is the drag's direction. */
  protected readonly thumbDrag = { from: 0, to: 0 };
  /** Every px the content ever shifted under the reader (rows measuring above the anchor),
   *  summed: a reader of the position subtracts it to see the reader's own motion alone. */
  protected readonly shiftMark = { total: 0 };
  /** The row captures of the current patch, applied together by flushItemSizes. */
  protected pendingSizes: [number, number][] = [];
  /** The anchor taken at the wave's first capture, restored once at the flush. */
  protected pendingAnchor: VirtualScroller.Anchor | undefined = undefined;

  protected virtualScrollTimeout: ReturnType<typeof setTimeout> | undefined;

  onTouchStartCapture(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch) return;
    this.gestureAxis = null;
    this.gestureOrigin = { x: touch.clientX, y: touch.clientY };
    this.gestureInPannable = this.pannableAncestor(event.target as Element | null) !== null;
  }

  /** The nearest ancestor of a touch, inside the frame, that scrolls across the own axis and
   *  has somewhere to go — the element the browser would pan. */
  protected pannableAncestor(target: Element | null): HTMLElement | null {
    const frame = this.scrollElement.value;
    const across = this.selectionAxis === 'y';
    let node = target instanceof HTMLElement ? target : null;
    while (node && node !== frame) {
      const style = getComputedStyle(node);
      const overflow = across ? style.overflowX : style.overflowY;
      const scrollable =
        (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') &&
        (across ? node.scrollWidth > node.clientWidth : node.scrollHeight > node.clientHeight);
      if (scrollable) return node;
      node = node.parentElement;
    }
    return null;
  }

  // invariant: A cross-axis touch belongs to the page (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  onTouchMoveCapture(event: TouchEvent) {
    const pannable = this.gestureInPannable;
    const ownAxis = this.gestureOwnAxis ?? (pannable ? this.selectionAxis : null);
    if (!ownAxis) return; // 'both' — every gesture is ours
    const touch = event.touches[0];
    if (!touch) return;
    if (!this.gestureAxis) {
      const deltaX = Math.abs(touch.clientX - this.gestureOrigin.x);
      const deltaY = Math.abs(touch.clientY - this.gestureOrigin.y);
      const bias = this.crossAxisBias;
      const clearlyX = deltaX > deltaY * bias;
      const clearlyY = deltaY > deltaX * bias;
      if (pannable) {
        // inside a block that scrolls across the axis the browser's pan is the default: the
        // first move decides — the browser decides its own gesture on it, and a move Lenis
        // has prevented kills the pan for the whole touch — and only a clearly own-axis
        // move is ours; a finger drifting a few px up while it scrolls code sideways is not
        const clearlyOwn = ownAxis === 'y' ? clearlyY : clearlyX;
        this.gestureAxis = clearlyOwn ? ownAxis : ownAxis === 'y' ? 'x' : 'y';
      } else {
        if (Math.max(deltaX, deltaY) < this.gestureAxisThresholdPx) return;
        this.gestureAxis = clearlyX ? 'x' : clearlyY ? 'y' : ownAxis;
      }
    }
    // a cross-axis gesture belongs to the page: lenis skips any event
    // carrying this flag, so its preventDefault never runs
    if (this.gestureAxis !== ownAxis)
      (event as TouchEvent & { lenisStopPropagation?: boolean }).lenisStopPropagation = true;
  }

  onTouchEndCapture() {
    this.gestureAxis = null;
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

  /** The gesture delta that drives the main axis. */
  protected axisDelta(data: { deltaX: number; deltaY: number }): number {
    return data.deltaY;
  }

  /** 0..1 position of a pointer along the scrollbar track's main axis. */
  protected trackPointerFraction(event: PointerEvent, rect: DOMRect): number {
    return (event.clientY - rect.top) / rect.height;
  }

  /**
   * The frame exists: build Lenis over it, take the touch-axis lock, hand
   * the element to the selection, and give Lenis the limit to clamp against.
   * A subclass overrides this to change what a mount sets up.
   */
  protected onMount() {
    const element = this.scrollElement.value;
    const inner = this.scrollElementInner.value;
    if (!element || !inner) return;

    this.lenis = this.createLenis(element, inner);
    this.lenis.on('virtual-scroll', this.onVirtualScroll);
    // The motion knobs are live: a page re-tuning them re-tunes Lenis.
    watch(
      () => this.lenisMotion,
      (motion) => this.tuneMotion(motion)
    );

    this.attachGestureLock(element);
    this.selection.attach(element);

    // The DOM is much shorter than the virtual content (content-sized layer
    // + capped tail — see trailingSpacerPx), so lenis takes its wheel-clamp
    // limit from the COMPUTED size — same box as setScrollPosition's own
    // bottom clamp. A pull callback, not a watcher: lenis reads it at clamp
    // time, the computed caches, and it can never be stale.
    this.lenis.virtualLimit = () => Math.max(0, this.scrollExtent.value - this.containerSpan);
  }

  /** The scroll integrator this scroller drives — a factory so a subclass
   *  swaps the engine, or its options, by overriding one method. */
  protected createLenis(wrapper: HTMLElement, content: HTMLElement): Lenis.Model {
    return new Lenis.Class({
      wrapper,
      content,
      orientation: this.lenisOrientation,
      gestureOrientation: this.lenisGestureOrientation,
      ignoreNativeScroll: this.lenisIgnoreNativeScroll,
      syncTouch: true, // Sync touch events
      overscroll: this.props.overscroll,
      smoothWheel: true,
      // a scrollable element inside a row — a wide code block, a diff — takes the wheel
      // until it reaches its own edge; only then does the gesture move the list
      allowNestedScroll: true,
      autoRaf: false, // we drive it ourselves
      ...this.lenisMotion
    });
  }

  /**
   * Gesture-axis lock (touch). Lenis only refuses a gesture whose cross-axis
   * delta is EXACTLY zero, and a finger swiping down a page always drifts a
   * pixel or two sideways — so a horizontal strip would claim the swipe and
   * preventDefault the page's own scroll. These run in the CAPTURE phase
   * (lenis binds on bubble), decide the axis once per touch, and hand
   * cross-axis gestures back by marking the event lenis already knows to skip.
   */
  protected attachGestureLock(element: HTMLElement) {
    element.addEventListener('touchstart', this.onTouchStartCapture, {
      capture: true,
      passive: true
    });
    element.addEventListener('touchmove', this.onTouchMoveCapture, {
      capture: true,
      passive: true
    });
    element.addEventListener('touchend', this.onTouchEndCapture, {
      capture: true,
      passive: true
    });
  }

  protected detachGestureLock(element: HTMLElement) {
    element.removeEventListener('touchstart', this.onTouchStartCapture, true);
    element.removeEventListener('touchmove', this.onTouchMoveCapture, true);
    element.removeEventListener('touchend', this.onTouchEndCapture, true);
  }

  /** The frame is going: every capability disposes, both rAF loops park,
   *  and Lenis is torn down. A subclass overrides this to add its own. */
  protected onUnmount() {
    const element = this.scrollElement.value;
    if (element) this.detachGestureLock(element);
    this.landing.dispose();
    this.autoplay.dispose();
    this.cancelFrames();
    this.selection.dispose();
    this.padding.dispose();
    this.lenis?.stop();
    this.lenis?.destroy();
  }

  /** The position model, built once at construction — a factory so a
   *  subclass swaps the model by overriding one method. */
  protected createGeometry(): VirtualScrollerGeometry.Instance {
    return new VirtualScrollerGeometry.Class(this);
  }

  /** The render pad this scroller walks with — a factory so a subclass
   *  swaps the pad by overriding one method. */
  protected createPadding(): VirtualScrollerPadding.Instance {
    return new VirtualScrollerPadding.Class(this);
  }

  /** The landing this scroller seeks with — a factory so a subclass swaps
   *  the whole capability by overriding one method. */
  protected createLanding(): VirtualScrollerLanding.Instance {
    return new VirtualScrollerLanding.Class(this);
  }

  /** The reading creep this scroller plays with — a factory so a subclass
   *  swaps the whole capability by overriding one method. */
  protected createAutoplay(): VirtualScrollerAutoplay.Instance {
    return new VirtualScrollerAutoplay.Class(this);
  }

  /** The selection this scroller hosts — a factory so a subclass swaps the
   *  whole capability by overriding one method. */
  protected createSelection(): VirtualScrollerSelection.Instance {
    return new VirtualScrollerSelection.Class(this);
  }

  protected bumpGeometryVersion() {
    this.geometry.bump();
  }

  /** The estimate calibrates on a measurement wave — the geometry's rule;
   *  the anchor around the wave absorbs the shift wherever the reader is. */
  protected maybeCalibrateEstimate() {
    this.geometry.calibrate();
  }

  // invariant: Rendered offsets are rebased by whole chunks (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  protected updateRenderBias(scroll: number) {
    const chunk = this.self.RENDER_BIAS_CHUNK;
    const bias = Math.max(0, (Math.floor(scroll / chunk) - 1) * chunk);
    if (bias !== this.renderBias.value) {
      this.renderBias.value = bias;
      if (this.lenis) this.lenis.renderOffset = bias;
    }
  }

  /** The content the geometry measures, plus the frame's own main-axis
   *  padding — the one part of the extent that is a DOM read, which is why
   *  it lives here and not in the position model. */
  protected computeScrollExtent(): number {
    const content = this.geometry.contentSize;
    if (content === 0) return 0;
    return content + this.mainAxisPadding();
  }

  /** The frame's main-axis padding, start plus end (see axisPaddingProps). */
  protected mainAxisPadding(): number {
    const element = this.scrollElement.value;
    if (!element) return 0;
    const computedStyle = window.getComputedStyle(element, null);
    const [paddingStartProp, paddingEndProp] = this.axisPaddingProps;
    return (
      parseInt(computedStyle.getPropertyValue(paddingStartProp)) +
      parseInt(computedStyle.getPropertyValue(paddingEndProp))
    );
  }

  protected computeVisibleItems(): VirtualScroller.ItemContext<T>[] {
    // the geometry's own materials for the walk: one `toRaw` and one cursor
    // read for the whole pass, never one per row
    const geometry = this.geometry;
    geometry.version.value;
    const items = this.items.value;
    const itemCount = items.length;
    const measured = geometry.rawSizes;
    const assumed = geometry.estimatedItemSize;
    const scrollTop = this.scrollPosition.value;

    // Walk the cursor to the last item whose top is at/above scrollTop —
    // same semantics the binary search over the dense array had.
    const cursor = geometry.cursor;
    let start = Math.min(cursor.index, Math.max(0, itemCount - 1));
    let startOffset = cursor.offset;
    for (let index = cursor.index; index > start; index--) {
      // Cursor beyond a shrunk list (pre-repair) — walk it back in.
      startOffset -= measured[index - 1] ?? assumed;
    }
    if (itemCount > 0) {
      let step;
      while (
        start < itemCount - 1 &&
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

    // Walk forward until the window covers the container size — and, mid-lerp, the
    // animated position too: the reader sees the animated position while the walk starts
    // at the target, and the rows between are covered in PIXELS over their measured sizes.
    // A pad counted in rows of the estimate under-covers a gap over rows shorter than it
    // (a 35px system line against a 160px estimate) and the bottom of the viewport goes blank.
    // The gap is read through the pad, which holds it: the exact gap shrinks every frame as
    // the lerp converges, and a walk mid-tail would trim the rows it no longer needs — a burst
    // of unmounts while the content still crawls. Held, they release once, at rest.
    // invariant: The pad covers the lerp gap exactly (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
    const pad = this.padding;
    const padding = pad.pad();
    const behindPx = pad.gapEndPx;
    let end = start;
    let endOffset = startOffset;
    const bottom = startOffset + this.containerSpan + behindPx;
    while (end < itemCount && endOffset < bottom) {
      endOffset += measured[end] ?? assumed;
      end++;
    }
    // scrolling down the animated position is ABOVE the target: cover it the same way
    const aheadPx = pad.gapStartPx;
    while (start > 0 && startOffset > scrollTop - aheadPx) {
      start--;
      startOffset -= measured[start] ?? assumed;
    }

    const paddedStart = Math.max(0, start - padding.before);
    end += padding.after + 1;

    if (this.visibleIndex.value.start !== paddedStart || this.visibleIndex.value.end !== end) {
      this.visibleIndex.value.start = paddedStart;
      this.visibleIndex.value.end = end;
      nextTick(() => this.onItemsChanged({ start: paddedStart, end }));
    }

    // Clamp like Array.slice did — items and geometry can briefly
    // disagree between a splice and the structural repair.
    const count = Math.min(end, itemCount);
    const length = Math.max(0, count - paddedStart);

    // Estimated top of the first rendered item = the leading spacer.
    let paddedStartOffset = startOffset;
    for (let index = start - 1; index >= paddedStart; index--) {
      paddedStartOffset -= measured[index] ?? assumed;
    }
    if (paddedStart === 0 || paddedStartOffset < 0) paddedStartOffset = 0;

    // Trailing spacer: everything after the window. P(itemCount) equals the
    // aggregate total by the cursor invariant, so this is exactly 0 when
    // the window reaches the last item (clamped for float drift).
    let afterWindowOffset = paddedStartOffset;
    for (let index = paddedStart; index < count; index++) {
      afterWindowOffset += measured[index] ?? assumed;
    }
    const total = geometry.contentSize;
    // Spacers must update even when the window itself is unchanged
    // (e.g. a size correction above the window moved only the lead).
    // invariant: The two spacers and the rendered rows sum to the extent (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
    this.leadingSpacerSize.value = paddedStartOffset;
    this.trailingSpacerSize.value = count >= itemCount ? 0 : Math.max(0, total - afterWindowOffset);

    // invariant: An unchanged window keeps its array identity (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
    const previous = this.visibleItemsSnapshot;
    if (previous.length === length) {
      let unchanged = true;
      for (let slot = 0; slot < length; slot++) {
        const context = previous[slot];
        const index = paddedStart + slot;
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
      if (unchanged) return previous;
    }

    const next: VirtualScroller.ItemContext<T>[] = new Array(length);
    for (let slot = 0; slot < length; slot++) {
      const index = paddedStart + slot;
      const item = items[index];
      next[slot] = {
        item: item,
        id: item.id,
        index: index
      };
    }
    return (this.visibleItemsSnapshot = next);
  }

  protected onItemsChanged(args: VirtualScroller.ItemsChangeEmitArgs) {
    this.emit('itemsChanged', args);
  }

  /* Measuring and anchoring — the scroller's half of the position model:
     it reads the DOM and keeps the reader's row still; the geometry answers */

  /**
   * Structural repair after a splice: the geometry re-derives its
   * aggregates and cursor and prunes the measurements past the new end.
   * Public because the marquee seeds sizes and then calls it once.
   */
  // invariant: Shrinking the list prunes the measurements at its new end (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  updatePositionsImmediately() {
    this.geometry.rederive();
  }

  /**
   * Re-read the real sizes of every rendered item in one pass —
   * O(window), driven by the single wrapper ResizeObserver. Reads happen
   * in one layout pass (no interleaved writes); only changed sizes sync.
   */
  /** The wrapper's rect-to-layout ratio: an ancestor transform scale, 1 when none. */
  protected wrapperScale(): number {
    const wrapper = this.itemsWrapperElement.value;
    if (!wrapper) return 1;
    const wrapperSize = this.offsetSize(wrapper);
    const scale = wrapperSize > 0 ? this.rectSize(wrapper) / wrapperSize : 1;
    return scale > 0 ? scale : 1;
  }

  protected remeasureRenderedItems() {
    const wrapper = this.itemsWrapperElement.value;
    if (!wrapper) return;
    const rendered = wrapper.querySelectorAll<HTMLElement>('.virtual-scroller__item');
    // Rects are in SCREEN px; the map must be in LAYOUT px. An ancestor
    // transform scale (the post card scales to fit the window) would
    // otherwise shrink every recorded size by the scale factor while the
    // flow renders at full layout size — the map diverges from the flow
    // and index-targeted jumps land short by exactly that drift. The
    // wrapper's rect-to-layout ratio is the scale; divide it out.
    const scale = this.wrapperScale();
    const measured = toRaw(this.measuredSizes.value);
    let changed = false;
    const sizes: [number, number][] = [];
    for (const element of rendered) {
      const row = element.getAttribute('aria-rowindex');
      if (row === null) continue;
      sizes.push([+row - 1, this.rectSize(element) / scale]);
    }
    const anchor = this.captureAnchor();
    for (const [index, size] of sizes) {
      if (measured[index] !== size) {
        this.syncItemSize(index, size, false);
        changed = true;
      }
    }
    if (changed) {
      this.bumpGeometryVersion();
      this.maybeCalibrateEstimate();
      this.restoreAnchor(anchor);
      this.clampScrollPosition();
    }
  }

  /**
   * The content shrank under the reader — the last row re-rendered
   * shorter, a tall card folded — and the anchor row above it did not
   * move, so the anchor restore had nothing to shift: the position is
   * pulled back inside the range here, so the viewport never rests past
   * the last row on nothing.
   */
  // invariant: The scroll position lands inside the scrollable range (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  clampScrollPosition() {
    const container = this.containerSpan;
    const max = Math.max(0, this.scrollExtent.value - container);
    if (this.scrollPosition.value <= max) return;
    this.setScrollPosition(-max, true, false);
  }

  /**
   * The row under the edge the reader is reading from and where its top
   * sits, taken before a wave of size changes. Restoring it afterwards
   * keeps that row where it was: rows measure as they mount (a placeholder
   * becoming its content, an estimate becoming a size), and every such
   * change would otherwise move the content under the reader. Scrolling
   * down, the edge is the top: rows above grow away from the reader.
   * Scrolling up, it is the bottom: a row growing inside the view then
   * expands UPWARD — the rows the reader just read stay where they are.
   */
  // invariant: A row under the reader stays put while sizes settle (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  captureAnchor(): VirtualScroller.Anchor | undefined {
    // mid-glide the reader sees the animated position, not the lerp's
    // target: a row growing between the two would otherwise be read as
    // below the anchor (no shift) while it is on screen, and the content
    // under the reader would move — a backward jerk in every glide it hit
    const scroll = this.lerpRunning ? this.lenis!.animatedScroll : this.scrollPosition.value;
    // the bottom edge is the anchor only while the reader is actually moving
    // up: at rest, a row that grows (a card opened by a click) must grow
    // DOWNWARD from where the reader left it, whatever the last direction was
    const edge =
      this.contentIsMoving && this.scrollDirection.value === 'up'
        ? scroll + Math.max(0, this.containerOuterSize.value - 1)
        : scroll;
    const at = this.getIndexAtPosition(edge);
    if (!at) return undefined;
    const top = this.getIndexPosition(at.index);
    return top === undefined ? undefined : { index: at.index, top };
  }

  /** Put the anchored row back where it was: the scroll moves by exactly
   *  what the content above it moved, with no visible motion. */
  restoreAnchor(anchor: VirtualScroller.Anchor | undefined) {
    if (!anchor) return;
    const top = this.getIndexPosition(anchor.index);
    if (top === undefined) return;
    const delta = top - anchor.top;
    if (Math.abs(delta) < 0.5) return;
    this.shiftScroll(delta);
  }

  /** Move the scroll by a delta the content itself moved. A running glide
   *  keeps its lerp — both endpoints shift — and a seek's landing shifts
   *  with it, so the converge loop does not mistake this for the reader. */
  protected shiftScroll(delta: number) {
    this.shiftMark.total += delta;
    this.landing.shiftLanding(delta);
    const lenis = this.lenis;
    if (lenis && this.lerpRunning) {
      // the glide moves with the content: its lerp keeps its remaining
      // distance and the compensation paints in this frame. The position
      // cell follows the shifted target — the clamp that runs after a
      // shift reads it, and a stale target above the new limit read as
      // out of range and adopted the limit, killing the glide.
      lenis.shiftBy(delta);
      this.scrollPosition.value = Math.max(0, lenis.targetScroll);
      return;
    }
    const next = Math.max(0, this.scrollPosition.value + delta);
    if (lenis) lenis.targetScroll = next;
    this.setScrollPosition(-next, true, false);
  }

  // invariant: Rendered sizes are known only after a row mounts (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  /**
   * One row's size, from its own mount capture or a caller. On its own
   * (`doUpdatePositions`) the change is anchored: the row under the
   * viewport's leading edge stays where it was. A batch caller passes
   * false, anchors once around the whole wave, and bumps geometry itself.
   */
  /**
   * A row's own capture — its mount or its unmount. A wave of rows lands
   * in one patch, so their captures coalesce: the anchor is taken at the
   * first, the sizes collect, and one microtask applies them all, bumps
   * geometry once, restores the anchor once and clamps once. Anchored per
   * row, each capture wrote the transform between the next row's reads —
   * a forced layout per row, dozens on a flick's mount frame on a phone.
   */
  // invariant: A row under the reader stays put while sizes settle (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  // invariant: An item captures its size once on mount (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  captureItemSize(index: number, size: number) {
    // `size` is the row's rect in screen px; the flush divides the wave by the wrapper's scale
    if (this.pendingSizes.length === 0) {
      this.pendingAnchor = this.captureAnchor();
      queueMicrotask(this.flushItemSizes);
    }
    this.pendingSizes.push([index, size]);
  }

  /** The wave's one application: every collected size, one bump, one anchor restore, one clamp. */
  flushItemSizes() {
    const sizes = this.pendingSizes;
    const anchor = this.pendingAnchor;
    if (sizes.length === 0) return;
    this.pendingSizes = [];
    this.pendingAnchor = undefined;
    // rects are screen px; the map is layout px — one wrapper scale for the whole wave
    const scale = this.wrapperScale();
    const measured = toRaw(this.measuredSizes.value);
    let changed = false;
    for (const [index, rect] of sizes) {
      const size = rect / scale;
      if (measured[index] === size) continue;
      this.applyItemSize(index, size, false);
      changed = true;
    }
    if (!changed) return;
    // the estimate calibrates on the wrapper observer's wave, as before; a
    // row's own capture only records
    this.bumpGeometryVersion();
    this.restoreAnchor(anchor);
    this.clampScrollPosition();
  }

  syncItemSize(index: number, size: number, doUpdatePositions = true) {
    if (!doUpdatePositions) {
      this.applyItemSize(index, size, false);
      return;
    }
    const anchor = this.captureAnchor();
    this.applyItemSize(index, size, true);
    this.restoreAnchor(anchor);
    this.clampScrollPosition();
  }

  protected applyItemSize(index: number, size: number, doUpdatePositions: boolean) {
    this.geometry.applySize(index, size, doUpdatePositions);
  }

  /* Position queries — answered by VirtualScrollerGeometry; these are the
     surface consumers call */

  /** Top offset of item `index` — the geometry's prefix sum, `undefined`
   *  outside the current items range. Reactive: re-evaluates when geometry
   *  settles, so `watch(() => scroller.getIndexPosition(index), …)` behaves
   *  like watching a position array. */
  // invariant: Rendered sizes are known only after a row mounts (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  getIndexPosition(index: number): number | undefined {
    return this.geometry.positionOf(index);
  }

  /** Pixel offset for a 0..1 ratio in ITEM-INDEX space — the seek bar's
   *  contract, size-independent so a landing survives the estimate
   *  refining under it; `endGapPx` keeps the next item's top clear of the
   *  landed viewport top. */
  getRatioPosition(ratio: number, endGapPx = 0): number | undefined {
    return this.geometry.ratioPosition(ratio, endGapPx);
  }

  /** Pixel offset of a CONTENT ANCHOR: item `index` plus a 0..1 fraction
   *  scrolled within it — what the reader is looking at, so re-applying it
   *  while sizes settle keeps the content still. */
  getAnchoredPosition(index: number, fraction = 0): number | undefined {
    return this.geometry.anchoredPosition(index, fraction);
  }

  /** The inverse: which item (+ fraction within it) lives at a pixel offset. */
  getIndexAtPosition(offset: number): VirtualScrollerGeometry.At | undefined {
    return this.geometry.indexAt(offset);
  }

  /* The position write — every path that moves the content comes through
     setScrollPosition, and the frame is never natively panned */

  // invariant: The frame is never natively panned along its own axis (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  /**
   * The frame scrolled natively — a focused input scrolled into view, a
   * find-in-page match, a selection nudge under a finger. Scroll is
   * virtual here, so the native offset is handed to the transform and
   * zeroed: what the browser wanted to show is shown, and the rows stay
   * inside the clip.
   */
  onScroll(_event: Event) {
    const element = this.scrollElement.value;
    if (!element) return;
    const native = this.nativeScrollOffset(element);
    if (native === 0) return;
    this.resetNativeScroll(element);
    this.scrollBy(native);
  }

  /** The frame's native offset along the main axis. */
  protected nativeScrollOffset(element: HTMLElement): number {
    return element.scrollTop;
  }

  protected resetNativeScroll(element: HTMLElement) {
    element.scrollTop = 0;
  }

  setScrollPosition(
    position: number,
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
    // invariant: The scroll position lands inside the scrollable range (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
    if (!Number.isFinite(position)) return;
    // Every read this method needs, taken once: it runs on every frame there
    // is motion, and the layer, the extent and the integrator were each
    // re-read three or four times down the body.
    const inner = this.scrollElementInner.value;
    const lenis = this.lenis;
    const containerSize = this.containerSpan;
    const extent = this.scrollExtent.value;

    if (position > 0 || extent < containerSize) position = 0;

    // Prevent scrolling down beyond the last row. The frame's native
    // scrollTop is not read here: the frame is never natively panned along
    // its own axis (onScroll converts and zeroes any offset it gets), and a
    // scrollTop read on this per-frame path forced a layout after every
    // patch (measured: 163 ms over two flicks on a phone profile).
    // invariant: The frame is never natively panned along its own axis (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
    if (Math.abs(position) + containerSize > extent && extent > containerSize) {
      // Must be negative
      position = -(extent - containerSize);
    }

    const absolutePosition = Math.abs(position);

    // The bias moves only with a write that also writes the transform: the frame loop
    // rebases from the ANIMATED scroll before Lenis writes its transform, and its target
    // write (translateY false) must not rebase again from the target — with the two
    // straddling a chunk boundary the bias flipped mid-frame, the spacer on the new bias
    // and the transform on the old, a whole chunk apart for that frame.
    // invariant: Rendered offsets are rebased by whole chunks (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
    if (translateY) this.updateRenderBias(absolutePosition);

    this.scrollPosition.value = absolutePosition;

    if (inner && translateY) {
      // WebKit does not rasterize what a write like this one mounts: it
      // moves the composited layer and leaves the fresh rows blank until
      // something re-promotes it. Lenis does exactly this before every
      // transform IT writes (see the fork's IS_SAFARI branch in setScroll);
      // the writes the scroller makes ITSELF — a size wave's anchor shift, a
      // clamp, a landing, the creep — bypass that branch, so they ask for
      // the same nudge here. Seen on an iPhone as the bottom of the list
      // going blank after folding a tool call and coming back on the next
      // scroll, which is Lenis writing again.
      // invariant: WebKit re-rasterizes the layer on every autoscroll write (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
      this.nudgePaint();
      // Rebased + snapped for GPU precision (see renderBias/snapForRender);
      // scrollPosition and lenis keep full precision for the scroll math.
      const rendered = position + this.renderBias.value;
      inner.style.transform = this.transformFor(
        snapRender ? this.self.snapForRender(rendered) : rendered
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
      lenis?.adoptExternalScroll(absolutePosition);
    }

    if (lenis) lenis.targetScroll = absolutePosition;
  }

  resetScrollTop() {
    const element = this.scrollElement.value;
    if (element) element.scrollTop = 0;
  }

  /* The built-in track — a pointer owns the thumb, and its fraction seeks */

  /** A thumb drag never stops autoplay: a reader repositioning by the
   *  thumb, either way, is still reading, so a playing scroller re-arms
   *  the creep on release, and a drag deeper in the scroll direction from
   *  rest starts it, as a forward wheel does. While the thumb is held the
   *  creep waits, as it does under any live input. */
  onTrackPointerDown(event: PointerEvent) {
    const track = this.trackOf(event);
    if (!track) return;
    this.scrollbarDragging.value = true;
    this.virtualScrolling = true;
    clearTimeout(this.virtualScrollTimeout);
    this.autoplay.cancelResume();
    const fraction = this.trackPointerFraction(event, track.getBoundingClientRect());
    this.thumbDrag.from = fraction;
    this.thumbDrag.to = fraction;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    // the release reaches the track through its capture; when the track
    // re-renders mid-drag the capture goes with it, so the window hears
    // the release too, once — a drag that outlives its release followed
    // the mouse with no button held
    window.addEventListener('pointerup', this.onTrackPointerUp, { once: true });
    this.seekToPointer(event);
  }

  onTrackPointerMove(event: PointerEvent) {
    if (!this.scrollbarDragging.value) return;
    // a mouse move with no button held is a release the track never heard
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      this.onTrackPointerUp();
      return;
    }
    const track = this.trackOf(event);
    if (track) this.thumbDrag.to = this.trackPointerFraction(event, track.getBoundingClientRect());
    this.seekToPointer(event);
  }

  onTrackPointerUp() {
    if (!this.scrollbarDragging.value) return;
    window.removeEventListener('pointerup', this.onTrackPointerUp);
    this.scrollbarDragging.value = false;
    this.virtualScrolling = false;
    const forward = this.thumbDrag.to > this.thumbDrag.from;
    if (forward && this.playsWhileReading) this.isAutoPlaying.value = true;
    if (this.isAutoPlaying.value) {
      this.scrollDirection.value = 'down';
      this.autoplay.armResume();
    }
  }

  /** A cancelled pointer ends the drag as a lift does — its own handler,
   *  so a subclass can treat a cancel differently without touching the lift. */
  onTrackPointerCancel(_event: PointerEvent) {
    this.onTrackPointerUp();
  }

  /** The track lost its capture — it re-rendered, or the browser took the pointer: the drag ends. */
  onTrackLostCapture(_event: PointerEvent) {
    this.onTrackPointerUp();
  }

  /** The track's touchstart: claimed from Lenis (see claimTouch). */
  onTrackTouchStart(event: TouchEvent) {
    this.claimTouch(event);
  }

  /** The track's touchmove: claimed from Lenis (see claimTouch). */
  onTrackTouchMove(event: TouchEvent) {
    this.claimTouch(event);
  }

  /** The track element a pointer event on it or its thumb belongs to. */
  protected trackOf(event: PointerEvent): HTMLElement | null {
    return (event.currentTarget as HTMLElement | null)?.closest('.virtual-scroller__track') ?? null;
  }

  /** A finger on the track is the track's: Lenis listens for touches on
   *  the frame and would scroll the content under the thumb drag. The
   *  flag makes Lenis skip the event; the pointer capture drives the seek. */
  claimTouch(event: TouchEvent) {
    (event as TouchEvent & { lenisStopPropagation?: boolean }).lenisStopPropagation = true;
  }

  seekToPointer(event: PointerEvent) {
    const track = this.trackOf(event);
    if (!track) return;
    this.seekToProgress(this.trackPointerFraction(event, track.getBoundingClientRect()));
  }

  /* Landing — the seek, the thumb's target and step mode's snap all live on
     VirtualScrollerLanding; these are the surface consumers call, plus the
     one DOM read it needs back from the frame */

  /** Seek to a 0..1 track fraction in ITEM-INDEX space — the external seek
   *  bar's contract (see the landing). */
  seekToFraction(fraction: number) {
    this.landing.toFraction(fraction);
  }

  /** Seek to a 0..1 fraction of the SCROLLABLE RANGE — the thumb's own
   *  inverse, so a drag lands where it points (see the landing). */
  seekToProgress(fraction: number) {
    this.landing.toProgress(fraction);
  }

  /** Step mode's landing: the nearest item boundary (see the landing). */
  snapToNearest() {
    this.landing.snapToNearest();
  }

  /** Main-axis offset that places item `index` per the snapAlign prop (see
   *  the landing). */
  snapAlignOffset(index: number): number {
    return this.landing.alignOffset(index);
  }

  /** Leading main-axis padding of the scroll container (see
   *  axisPaddingProps) — the offset between position space and the
   *  rendered flow. */
  mainAxisPaddingStart(): number {
    const element = this.scrollElement.value;
    if (!element) return 0;
    const [paddingStartProp] = this.axisPaddingProps;
    return parseInt(window.getComputedStyle(element).getPropertyValue(paddingStartProp)) || 0;
  }

  /**
   * Land on item `index` and hold it there while the sizes settle — the
   * landing's converge loop (see VirtualScrollerLanding).
   *
   * @param topOffsetPx pushes the landing DOWN so the target sits this many
   * pixels below the viewport top.
   * @param innerFraction 0..1 point WITHIN the item to align to (0 = its top).
   */
  // invariant: A seek names an item not a pixel (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  scrollToIndex(
    index: number,
    afterCallback?: () => void,
    animate = true,
    /** Defaults to the snapAlign placement — pass an explicit value to
     *  override it (0 = flush to the container start). */
    topOffsetPx = this.snapAlignOffset(index),
    innerFraction = 0
  ) {
    this.landing.toIndex(index, afterCallback, animate, topOffsetPx, innerFraction);
  }

  /** End a seek's converge loop now — the owner calls it when the reader
   *  acts on the content instead of scrolling. A no-op when none is armed. */
  cancelSeek() {
    this.landing.cancel();
  }

  /* Input intake and the frame loop — what a gesture means, and the one rAF
     that paints it; the creep keeps its own (see VirtualScrollerAutoplay) */

  onVirtualScroll({ deltaX, deltaY }: { deltaX: number; deltaY: number }) {
    const delta = this.axisDelta({ deltaX, deltaY });
    // Scrolling UP is the reader taking over — autoplay stops outright
    // (the frame loop re-arms below for the manual scroll itself).
    // Scrolling DOWN is reading intent — autoplay re-arms by itself and
    // the settle chain below resumes the creep once the input rests.
    if (this.isAutoPlaying.value && delta < 0) {
      this.stopAutoPlay();
    } else if (!this.isAutoPlaying.value && delta > 0 && this.playsWhileReading) {
      // reading intent re-arms the creep
      this.isAutoPlaying.value = true;
    }
    this.virtualScrolling = true;
    clearTimeout(this.virtualScrollTimeout);
    this.scrollDirection.value = delta < 0 ? 'up' : 'down';
    if (!this.frame) {
      // Lenis's clock aged while its raf loop was parked (the creep runs
      // without it) — reset it or the first frame advances the whole gap
      // and the flick lands as an instant jump instead of the lerp.
      this.restartLoop();
    }
    if (this.isAutoPlaying.value) {
      // input settles → the creep resumes; never re-arms when not playing
      this.autoplay.armResume();
    }

    this.virtualScrollTimeout = setTimeout(() => {
      this.virtualScrolling = false;
    }, 3);

    if (this.props.snapToItems) {
      // step mode: once the input rests AND the lenis lerp settles, the
      // strip snaps to the nearest item boundary through the same
      // scrollToIndex pipeline a seek uses.
      this.landing.armSnap();
    }
  }

  // invariant: The transform lerps to the target over many frames (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  // invariant: Rendered offsets are rebased by whole chunks (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  loop(now: number) {
    const lenis = this.lenisRequired;
    // Rebase BEFORE lenis writes this frame's transform: the transform and
    // the spacer (rendered by this frame's flush) must shift together.
    this.updateRenderBias(Math.abs(lenis.scroll ?? 0));
    lenis.raf(now); // keep Lenis in sync
    this.setScrollPosition(-lenis.targetScroll, false);
    // The loop runs only while there is motion to paint: a glide still
    // lerping, input still arriving, or the creep. At rest it parks, and the
    // next input wakes it — a scroller nobody touches costs no frames.
    if (this.isAtRest) {
      this.frame = null;
      return;
    }
    this.frame = requestAnimationFrame(this.loop);
  }

  /** Arm the reading creep after a pause (see VirtualScrollerAutoplay). */
  startAutoPlay(delay = 500, callback = () => {}) {
    this.autoplay.start(delay, callback);
  }

  /** Stop the reading creep and park both rAF loops. */
  stopAutoPlay(callback = () => {}) {
    this.autoplay.stop(callback);
  }

  /** Cancel both rAF loops (the frame loop and the creep) if armed. */
  cancelFrames() {
    this.parkLoopFrame();
    this.autoplay.cancelFrame();
  }

  /** Cancel the frame loop's rAF and forget its handle. */
  parkLoopFrame() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    // 0 (not null): falsy for onVirtualScroll's re-arm check without widening
    // the field type, so the creep's handoff does not look like a live loop.
    this.frame = 0;
  }

  /** Start the frame loop from a stopped clock — pressing play wakes Lenis,
   *  whose clock aged while its raf loop was parked. */
  restartLoop() {
    if (this.lenis) this.lenis.time = 0;
    this.frame = requestAnimationFrame(this.loop);
  }

  /** Resume the creep once the reader's input settles. */
  play() {
    this.autoplay.play();
  }

  /* Text selection — the Owner side; the behavior lives on VirtualScrollerSelection */

  /**
   * A row's text for the copied selection. A MOUNTED row reads its own
   * DOM (the same trimmed text offsets are measured against); an unmounted
   * row asks the `selectionText` prop, and falls back to `item.body`, then
   * the id. The two sources must produce the same string, or a copy that
   * spans the window boundary would change wording halfway through.
   */
  // invariant: The copied text is the string the row renders (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  rowText(index: number): string {
    const row = this.selection.mountedRowElement(index);
    if (row) return VirtualScrollerSelection.Class.rowText(row);
    const item = this.items.value[index];
    if (!item) return '';
    if (this.props.selectionText) return this.props.selectionText(item);
    const body = (item as { body?: unknown }).body;
    return typeof body === 'string' ? body : String(item.id);
  }

  /** Re-tune the mounted Lenis with the motion knobs as they change. */
  tuneMotion(motion: VirtualScroller.LenisMotion) {
    this.lenis?.tune(motion);
  }

  /** Stop a glide where the content is — a touch a capability claims. */
  holdScroll() {
    this.lenis?.hold();
  }

  /** Glide to an absolute position through Lenis: the tuned lerp, whose gap
   *  the window walk extends over and the pad covers. Wakes the frame loop,
   *  since a programmatic scroll emits no virtual-scroll event of its own. */
  glideTo(position: number, onArrive?: () => void) {
    const lenis = this.lenis;
    if (!lenis) return;
    lenis.scrollTo(position, { onComplete: () => onArrive?.() });
    if (!this.frame) this.restartLoop();
  }

  /** Scroll by a signed delta along the axis, immediately — the edge
   *  autoscroll's step. It writes lenis's target directly, so an upward
   *  drag is a scroll up, never mistaken for the reader taking over. */
  scrollBy(delta: number) {
    if (!this.lenis) return;
    const lenis = this.lenisRequired;
    lenis.targetScroll = Math.max(0, lenis.targetScroll + delta);
    this.setScrollPosition(-lenis.targetScroll, true, false);
  }

  // invariant: WebKit re-rasterizes the layer on every autoscroll write (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  /**
   * Force WebKit to rasterize what the last write mounted. Under a held
   * touch, iOS moves the composited layer but leaves rows that mounted
   * during the move blank until the finger lifts — the scrollbar thumb
   * in the same layer vanishes with them. Demoting and re-promoting the
   * layer (will-change auto → layout read → transform) is the fork's own
   * Safari workaround on the wheel path; the selection's autoscroll
   * writes the transform here instead, so it asks for the same nudge.
   * WebKit only: on Chrome the re-raster snaps text per frame as shimmer.
   */
  nudgePaint() {
    if (!this.self.IS_WEBKIT) return;
    const inner = this.scrollElementInner.value;
    if (!inner) return;
    inner.style.willChange = 'auto';
    void inner.offsetHeight;
    inner.style.willChange = 'transform';
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
 * The namespace is IDENTITY ($Class / Class / Instance) and TYPES, every
 * type derived from `$Class` — never hand-duplicated. The contract itself
 * (prop types, defaults, their fusion, emits) lives on the class as
 * statics: it swaps with `Class` under a global override and a subclass
 * extends it with `super` (see HorizontalVirtualScroller, which inherits
 * every prop and re-tunes one default in one line). The SFC is pure
 * wiring: the macros receive the RUNTIME objects through `Class`, so no
 * compiler macro ever resolves a cross-file type.
 */
export namespace VirtualScroller {
  /* Identity */

  export const $Class = Static($VirtualScroller); // anchor — statics live here
  export let Class = Reactive($VirtualScroller) as unknown as typeof $VirtualScroller;
  export type Instance<T extends BaseItem> = ReactiveInstance<$VirtualScroller<T>>;

  /* Types */

  /** What every row carries — the minimum a scroller needs to key, render
   *  and number an item; a list's own row type extends it. */
  export interface BaseItem {
    id: string;
    body: string;
    position: string;
    sequence?: string;
  }

  /** Resolved props — what the class receives AFTER defaults are applied.
   *  DERIVED from the merged runtime object (never hand-duplicated):
   *  ExtractPropTypes makes every defaulted prop non-optional and the
   *  default-free `creepMsPerPx` optional; the one thing a runtime map
   *  cannot carry — the generic item type — is grafted back over
   *  `modelValue`. */
  export type Props<T extends BaseItem> = Omit<
    ExtractPropTypes<typeof $Class.props>,
    'modelValue'
  > & {
    modelValue: T[];
  };

  /** The props as the class reads them: the nested knobs complete. */
  export type MergedProps<T extends BaseItem> = NestedProps<Props<T>, KnobDefaults>;

  /** The motion knobs in Lenis's vocabulary. */
  export type LenisMotion = $VirtualScroller<BaseItem>['lenisMotion'];

  /** The knob defaults' full shape — what a partial prop is completed from. */
  export interface KnobDefaults {
    scroll: ScrollKnobs;
    selection: SelectionKnobs;
  }

  /** The motion knobs, per input. */
  export interface ScrollKnobs {
    wheel: { gain: number; follow: number; maxPxPerMs: number };
    touch: { gain: number; follow: number; inertia: number; maxPxPerMs: number };
  }

  /** The selection knobs: a pointer's and a finger's autoscroll cadence. */
  export interface SelectionKnobs {
    /** whether rows can be selected at all — off, no gesture selects and the rows refuse the native selection */
    enabled: boolean;
    autoscroll: {
      mouse: VirtualScrollerSelection.AutoscrollProfile;
      touch: VirtualScrollerSelection.AutoscrollProfile;
    };
    /** a double click selects the word and a triple click the row; a double tap the word — when on */
    multiClick: boolean;
  }

  export type Emits = ExtractEmitTypes<typeof $Class.emits>;

  export interface ItemsChangeEmitArgs {
    start: number;
    end: number;
  }

  /** the row under the viewport's leading edge and its top, before a wave of size changes */
  export interface Anchor {
    index: number;
    top: number;
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
