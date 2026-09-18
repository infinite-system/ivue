import { Static } from '../Static';
import { Animate } from './Animate';
import { Dimensions } from './Dimensions';
import { Emitter } from './Emitter';
import { LenisUtils } from './LenisUtils';
import { VirtualScroll } from './VirtualScroll';

// Technical explanation
// - listen to 'wheel' events
// - prevent 'wheel' event to prevent scroll
// - normalize wheel delta
// - add delta to targetScroll
// - animate scroll to targetScroll (smooth context)
// - if animation is not running, listen to 'scroll' events (native context)

/**
 * Lenis — the scroll integrator the virtual scroller drives: a smooth wheel
 * lerp, sync touch with a finger trail for the flick, a speed cap, fully
 * virtual mode. Vendored and forked; the fork's rules are in
 * `lenis.invariants.md`.
 */
class $Lenis {
  /* Statics — constants the hot paths read, and the pure flick maths */

  /** Stamped on window.lenisVersion. */
  protected static readonly VERSION = 'ivue-docs-vendored';

  /** True Safari (not Chrome/Chromium, which also carry "Safari" in the UA).
   *  Hot path: read on every transform write, so a field, evaluated once. */
  protected static readonly IS_SAFARI =
    typeof navigator !== 'undefined' &&
    /^((?!chrome|chromium|android).)*safari/i.test(navigator.userAgent);

  /** How far back a flick's velocity is read off the finger's path. */
  static get FLICK_WINDOW_MS() {
    return 100;
  }

  /** Lenis measures velocity in px per animation frame; a frame is ~16.7 ms. */
  static get FRAME_MS() {
    return 16.7;
  }

  /** The duration-based animation's easing when none is given. */
  static defaultEasing(t: number) {
    return Math.min(1, 1.001 - Math.pow(2, -10 * t));
  }

  /**
   * Drop trail samples older than the window — all but one: the newest
   * sample before the window stays as the anchor, so a lone move inside
   * the window still has a span. A whole re-flick coalesced into one
   * touchmove 260 ms after the touchstart would otherwise trim its seed
   * and read no velocity at all.
   */
  static trimTrail(trail: Array<{ at: number; position: number }>, now: number, windowMs: number) {
    while (trail.length > 2 && now - trail[1].at > windowMs) trail.shift();
  }

  /**
   * The flick's velocity in px per frame off the finger's trail: the
   * position change over the trail's span, scaled to a frame. The span is
   * at most the window: an anchor older than it (the touchstart seed, when
   * Android held the whole swipe back and delivered one move ~200 ms later)
   * counts as sitting at the window's edge, since a flick's velocity is
   * its last stretch, not its wait. Fewer than two samples, or a span too
   * short to read, fall back to the frame's own velocity.
   */
  // invariant: A flick reads its velocity off the last stretch (examples/playground/src/lenis/lenis.invariants.md)
  static trailVelocity(
    trail: Array<{ at: number; position: number }>,
    fallback: number,
    windowMs = this.FLICK_WINDOW_MS
  ): number {
    if (trail.length < 2) return fallback;
    const first = trail[0];
    const last = trail[trail.length - 1];
    const span = Math.min(windowMs, last.at - first.at);
    if (span < 8) return fallback;
    return ((last.position - first.position) / span) * this.FRAME_MS;
  }

  /** Past this a gap between frames is a suspension, not a frame time. */
  static get MAX_FRAME_MS() {
    return 100;
  }


  /** Within this many px of an end the content counts as at it. */
  static get LIMIT_TOLERANCE_PX() {
    return 0.5;
  }

  /**
   * Constant deceleration, as an easing. A flick that leaves at v and
   * decelerates at a fixed rate covers `x(t) = v t - a t^2 / 2`, which over
   * its own duration is exactly `1 - (1 - p)^2` — so the friction model
   * needs no integrator of its own, only this curve and the right duration.
   * Unlike a lerp toward a target it ARRIVES: at p = 1 the content is
   * stopped, with no asymptote to creep through.
   */
  static frictionEasing(progress: number): number {
    const remaining = 1 - progress;
    return 1 - remaining * remaining;
  }

  /**
   * How long a friction glide runs, in frames. Constant deceleration over a
   * throw of `carry` frames of the finger's own speed takes `2 x carry`
   * frames, and `carry` is `launch / lerp` — so the duration is `2 / lerp`
   * and Lenis needs no knob it does not already have.
   */
  static frictionFrames(lerp: number): number {
    return lerp > 0 ? 2 / lerp : 0;
  }

  /** The nearest device pixel: `px` rounded to a multiple of 1/devicePixelRatio. */
  static snapToDevicePixel(px: number): number {
    const ratio = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
    return Math.round(px * ratio) / ratio;
  }

  /** The compositor glide's keyframe step: one per 120 Hz frame. A 60 Hz panel
   *  samples every other one; a 120 Hz panel every one. */
  static get KEYFRAME_MS() {
    return 1000 / 120;
  }

  /** The most keyframes a compositor glide is handed — 6 s at 120 Hz; an
   *  exponential tail past that is below the settle band anyway. */
  static get MAX_KEYFRAMES() {
    return 720;
  }

  /** The glide's remaining curve as absolute scroll values, one per KEYFRAME_MS
   *  from the integrator's current state: the friction curve is evaluated from
   *  its own elapsed time, the exponential model is stepped by damp until it
   *  settles — the same arithmetic `Animate.advance` runs, at a fixed step. The
   *  first value is the current one, so the hold begins where the layer is. */
  static glideKeyframes(animate: Animate.Model, stepMs = this.KEYFRAME_MS): number[] {
    const values = [animate.value];
    const stepSeconds = stepMs / 1000;
    if (animate.duration && animate.easing) {
      let time = animate.currentTime;
      while (values.length < this.MAX_KEYFRAMES) {
        time += stepSeconds;
        const progress = LenisUtils.Class.clamp(0, time / animate.duration, 1);
        values.push(
          progress >= 1 ? animate.to : animate.from + (animate.to - animate.from) * animate.easing(progress)
        );
        if (progress >= 1) break;
      }
    } else if (animate.lerp) {
      let value = animate.value;
      while (values.length < this.MAX_KEYFRAMES) {
        value = LenisUtils.Class.damp(value, animate.to, animate.lerp * 60, stepSeconds);
        if (Math.abs(value - animate.to) < Animate.Class.SETTLE_PX) {
          values.push(animate.to);
          break;
        }
        values.push(value);
      }
    } else {
      values.push(animate.to);
    }
    return values;
  }

  /** The keyframes the compositor is handed: one per DISTINCT snapped value,
   *  each at its step's offset and held to the next. A glide's slow tail moves
   *  less than a device pixel per step, so the same transform would repeat
   *  frame after frame — an exponential glide of 484 steps holds 283 distinct
   *  values — and a hold is a hold whether it is one keyframe or three. The
   *  first and last steps are always kept, so the hold begins where the layer
   *  is and ends on the target. One pass: the value is formatted here and only
   *  a kept keyframe is allocated. A single step carries no offset. */
  static heldKeyframes(
    values: readonly number[],
    formatOf: (value: number) => string,
    property = 'transform'
  ): Keyframe[] {
    const last = values.length - 1;
    const frames: Keyframe[] = [];
    let previous = '';
    for (let index = 0; index <= last; index++) {
      const formatted = formatOf(values[index]);
      if (index !== 0 && index !== last && formatted === previous) continue;
      previous = formatted;
      frames.push(
        last > 0
          ? { [property]: formatted, easing: 'step-end', offset: index / last }
          : { [property]: formatted, easing: 'step-end' }
      );
    }
    return frames;
  }

  /** Any element, any value list, any formatter: the sequence as one Web
   *  Animation — held keyframes (one per distinct formatted value) or the two
   *  linear endpoints — aligned on the document timeline either AFTER another
   *  animation (a chained chunk) or ALONGSIDE one (a scene track over the
   *  scroll's own sequence: same start, same clock, no drift possible). The
   *  scroll layer uses this for itself; a stage uses it for every track it
   *  derives from the same values. Returns null when the element cannot animate
   *  or the list is too short. */
  static composeSequence(
    element: Element,
    values: readonly number[],
    formatOf: (value: number) => string,
    {
      after = null,
      alongside = null,
      linear = false,
      property = 'transform',
      stepMs = this.KEYFRAME_MS
    }: Lenis.ComposeOptions = {}
  ): Animation | null {
    if (typeof element.animate !== 'function' || values.length < 2) return null;
    const duration = (values.length - 1) * stepMs;
    const frames: Keyframe[] = linear
      ? [values[0], values[values.length - 1]].map((value) => ({ [property]: formatOf(value) }))
      : this.heldKeyframes(values, formatOf, property);
    const animation = element.animate(frames, { duration, fill: 'forwards' });
    if (after && after.startTime !== null) {
      const afterDuration = Number(after.effect?.getTiming().duration ?? 0);
      animation.startTime = Number(after.startTime) + afterDuration;
    } else if (alongside && alongside.startTime !== null) {
      animation.startTime = alongside.startTime;
    }
    return animation;
  }

  /** A touch on a glide pulls its target this far ahead in TIME: the brake's
   *  length. In ms, not frames — four frames is 67 ms on a 60 Hz display and
   *  33 on a 120 Hz one, so a frame count made the brake twice as abrupt on
   *  exactly the hardware most likely to be running at 120. */
  static get TOUCH_BRAKE_MS() {
    return 4 * 16.7;
  }

  /** The brake's lerp — steep, so the content settles under the finger within a few frames. */
  static get TOUCH_BRAKE_LERP() {
    return 0.35;
  }

  /**
   * A gesture that asks for more than an end has: back at the start, on
   * past the end — the page's to scroll, never this scroller's. A list
   * shorter than its frame (limit 0) has nothing of its own either way.
   */
  // invariant: An outward gesture at a limit belongs to the page (examples/playground/src/lenis/lenis.invariants.md)
  static isOutward(scroll: number, limit: number, delta: number): boolean {
    if (delta < 0) return scroll <= this.LIMIT_TOLERANCE_PX;
    if (delta > 0) return scroll >= limit - this.LIMIT_TOLERANCE_PX;
    return false;
  }

  /**
   * A flick's velocity with the interrupted glide's added back, when the
   * flick runs the same way; a flick the other way, or a swipe too slow
   * to be a flick, drops the carry.
   */
  // invariant: A flick carries the glide it interrupted (examples/playground/src/lenis/lenis.invariants.md)
  static carryVelocity(flick: number, carried: number): number {
    if (carried === 0 || Math.sign(flick) !== Math.sign(carried)) return flick;
    return flick + carried;
  }

  constructor({
    wrapper = window,
    content = document.documentElement,
    eventsTarget = wrapper,
    smoothWheel = true,
    syncTouch = false,
    syncTouchLerp = 0.075,
    touchInertiaMultiplier = 35,
    syncTouchGlide = 'exponential',
    pixelSnap = true,
    safariLayerReset = false,
    compositorGlide = true,
    onSequence,
    duration, // in seconds
    easing,
    lerp = 0.1,
    infinite = false,
    orientation = 'vertical', // vertical, horizontal
    gestureOrientation = 'vertical', // vertical, horizontal, both
    ignoreNativeScroll = false, // fully-virtual mode: never adopt native scroll
    touchMultiplier = 1,
    wheelMultiplier = 1,
    wheelMaxPxPerMs = 0,
    touchMaxPxPerMs = 0,
    autoResize = true,
    prevent,
    virtualScroll,
    overscroll = true,
    autoRaf = false,
    anchors = false,
    autoToggle = false, // https://caniuse.com/?search=transition-behavior
    allowNestedScroll = false,
    __experimental__naiveDimensions = false
  }: Lenis.Options = {}) {
    // The handlers are prototype methods (overridable, spy-able); bound
    // once here so add/removeEventListener and the raf clock see one
    // stable function each.
    this.onScrollEnd = this.onScrollEnd.bind(this);
    this.dispatchScrollendEvent = this.dispatchScrollendEvent.bind(this);
    this.onTransitionEnd = this.onTransitionEnd.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onVirtualScroll = this.onVirtualScroll.bind(this);
    this.onNativeScroll = this.onNativeScroll.bind(this);
    this.raf = this.raf.bind(this);

    const self = this.self;
    this.animate = new Animate.Class();
    this.emitter = new Emitter.Class();
    // Set version (the global the upstream library stamps)
    (window as Window & { lenisVersion?: string }).lenisVersion = self.VERSION;

    // Check if wrapper is <html>, fallback to window
    if (!wrapper || wrapper === document.documentElement) {
      wrapper = window;
    }

    // flip to easing/time based animation if at least one of them is provided
    if (typeof duration === 'number' && typeof easing !== 'function') {
      easing = self.defaultEasing;
    } else if (typeof easing === 'function' && typeof duration !== 'number') {
      duration = 1;
    }

    // Setup options
    this.options = {
      wrapper,
      content,
      eventsTarget,
      smoothWheel,
      syncTouch,
      syncTouchLerp,
      touchInertiaMultiplier,
      syncTouchGlide,
      pixelSnap,
      safariLayerReset,
      compositorGlide,
      onSequence,
      duration,
      easing,
      lerp,
      infinite,
      gestureOrientation,
      ignoreNativeScroll,
      orientation,
      touchMultiplier,
      wheelMultiplier,
      wheelMaxPxPerMs,
      touchMaxPxPerMs,
      autoResize,
      prevent,
      virtualScroll,
      overscroll,
      autoRaf,
      anchors,
      autoToggle,
      allowNestedScroll,
      __experimental__naiveDimensions
    };

    // Setup dimensions instance
    this.dimensions = new Dimensions.Class(wrapper, content, { autoResize });

    // Setup class name
    this.updateClassName();

    // Set the initial scroll value for all scroll information
    this.targetScroll = this.animatedScroll = this.actualScroll;

    // Add event listeners
    this.options.wrapper.addEventListener('scroll', this.onNativeScroll, false);

    this.options.wrapper.addEventListener('scrollend', this.onScrollEnd, {
      capture: true
    });

    if (this.options.anchors && this.options.wrapper === window) {
      this.options.wrapper.addEventListener('click', this.onClick as EventListener, false);
    }

    this.options.wrapper.addEventListener(
      'pointerdown',
      this.onPointerDown as EventListener,
      false
    );

    // Setup virtual scroll instance
    this.virtualScroll = new VirtualScroll.Class(eventsTarget as HTMLElement, {
      touchMultiplier,
      wheelMultiplier
    });
    this.virtualScroll.on('scroll', this.onVirtualScroll);

    if (this.options.autoToggle) {
      this.rootElement.addEventListener('transitionend', this.onTransitionEnd, {
        passive: true
      });
    }

    if (this.options.autoRaf) {
      this.rafId = requestAnimationFrame(this.raf);
    }
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Lenis;
  }

  /* The instance */

  protected scrolling: Lenis.Scrolling = false; // true when scroll is animating
  protected stopped = false; // true if user should not be able to scroll - enable/disable programmatically
  protected locked = false; // same as isStopped but enabled/disabled when scroll reaches target
  protected nativeScrollEventSuppressed = false;
  protected resetVelocityTimer: ReturnType<typeof setTimeout> | null = null;
  protected rafId: number | null = null;

  /**
   * Whether or not the user is touching the screen
   */
  isTouching?: boolean;
  /**
   * Whether the last gesture was a touch — it picks which speed cap a
   * gesture-driven scroll runs under, a flick's inertia included
   */
  lastInputTouch = false;
  /**
   * The finger's recent path — (time, target position) per touchmove
   * inside FLICK_WINDOW_MS — so a flick's velocity is read off the finger's
   * last stretch, not off the last animation frame. Android delivers the
   * touchend after a frame with no touchmove often enough that the
   * frame's velocity reads zero or stale there, and the flick dies.
   */
  protected touchTrail: Array<{ at: number; position: number }> = [];
  /**
   * A touch has landed and no move has come yet. The glide keeps running
   * until the first move — the finger then takes over from wherever the
   * content is — and a touch that ends with no move stops it (tap to
   * stop). Stopping at the touchstart froze the content for the ~200 ms
   * Android holds the first move back, then jumped: a stall per re-flick.
   */
  protected touchPending = false;
  /**
   * The glide's velocity at the moment a finger took it over, px per
   * frame. A flick that follows in the same direction adds it back, so
   * flick after flick GAINS speed instead of restarting from the finger's
   * own: the glide the finger interrupted is not lost, it is carried.
   */
  protected carriedVelocity = 0;
  /**
   * An optional sink for one line per gesture event and decision — the
   * on-device touch log sets it; null costs nothing.
   */
  trace: ((line: string) => void) | null = null;
  /**
   * The time in ms since the lenis instance was created
   */
  time = 0;
  /**
   * User data that will be forwarded through the scroll event
   *
   * @example
   * lenis.scrollTo(100, {
   *   userData: {
   *     foo: 'bar'
   *   }
   * })
   */
  userData: Lenis.UserData = {};
  /**
   * The last velocity of the scroll
   */
  lastVelocity = 0;
  /**
   * The current velocity of the scroll
   */
  velocity = 0;

  /** The wall time the last animation frame actually took, in ms. */
  frameMs = this.self.FRAME_MS;
  /** The compositor glide in flight, if any: the Web Animation on the content,
   *  its keyframes in scroll space (to adopt the shown value on interrupt), and
   *  whether the model has already completed while it plays. */
  protected readonly compositor = {
    animation: null as Animation | null,
    keyframes: [] as number[],
    modelDone: false,
    /** a linear sequence: two fractional endpoints the compositor interpolates
     *  (a constant-speed creep), against held snapped keyframes (a glide) */
    linear: false,
    /** chunks scheduled to follow the current one (the creep chains them),
     *  promoted one at a time as the one before finishes */
    chained: [] as Array<{ animation: Animation; values: number[]; linear: boolean }>
  };
  /**
   * The direction of the scroll
   */
  direction: 1 | -1 | 0 = 0;
  /**
   * The options passed to the lenis instance
   */
  options: Lenis.ResolvedOptions;
  /**
   * The target scroll value
   */
  targetScroll: number;
  /**
   * The animated scroll value
   */
  animatedScroll: number;

  // The hosted parts — constructed in the constructor (a cross-module
  // class read belongs inside a body, so any load order resolves).
  protected readonly animate: Animate.Model;
  protected readonly emitter: Emitter.Model;
  readonly dimensions: Dimensions.Model; // public: the Snap class reads it
  protected readonly virtualScroll: VirtualScroll.Model;

  /** The scroll value the content's transform currently carries, in absolute
   *  scroll space: remembered when we write it and when a consumer tells us
   *  what it wrote. Null only before the first write, when reading it back
   *  is the sole source — and reading it back means
   *  `getComputedStyle(...).transform`, which forces a style recalc for a
   *  number we already have. */
  protected appliedTranslate: number | null = null;

  /**
   * Subtracted from the applied translate (and added back on read-back) so
   * a virtualized consumer can keep the RENDERED offset near zero while the
   * scroll VALUE runs into the millions — GPU compositing is single
   * precision, and past ~2^23 px even integer positions lose their
   * sub-pixel placement in raster space (visible stutter deep in a
   * 100k-item post, worst near its end). The consumer shifts its leading
   * spacer by the same amount in the same frame; 0 (the default) is a
   * numeric no-op. See VirtualScroller's renderBias.
   */
  renderOffset = 0;

  /**
   * VirtualScroller sets this: a PULL callback returning the maximum scroll
   * derived from its COMPUTED content height (a cached Vue computed — each
   * read is O(1) and can never be stale, no watcher needed). The DOM is
   * deliberately much shorter than the virtual content — the composited
   * layer stays small (a ~10M px layer carried visible compositor
   * heaviness), the rendered window + spacers only ever span a few hundred
   * k px — so a DOM-measured limit would clamp wheel scrolling to a
   * fraction of the post.
   */
  virtualLimit: (() => number) | null = null;

  /**
   * The root element on which lenis is instanced
   */
  get rootElement() {
    return (
      this.options.wrapper === window ? document.documentElement : this.options.wrapper
    ) as HTMLElement;
  }

  /**
   * The limit which is the maximum scroll value
   */
  get limit() {
    if (this.virtualLimit !== null) {
      return this.virtualLimit();
    }
    if (this.options.__experimental__naiveDimensions) {
      if (this.isHorizontal) {
        return this.rootElement.scrollWidth - this.rootElement.clientWidth;
      } else {
        return this.rootElement.scrollHeight - this.rootElement.clientHeight;
      }
    } else {
      return this.dimensions.limit[this.isHorizontal ? 'x' : 'y'];
    }
  }

  /**
   * Whether or not the scroll is horizontal
   */
  get isHorizontal() {
    return this.options.orientation === 'horizontal';
  }

  /**
   * The content's speed in px per MILLISECOND — the refresh-rate independent
   * one, and the only one worth doing arithmetic with. `velocity` is the
   * per-animation-frame delta, so a 120 Hz display reports half of what a
   * 60 Hz display does for the very same motion; anything that converts it
   * with an assumed 16.7 ms frame is wrong by the ratio of the refresh
   * rates, which is how a lookahead sized in milliseconds ends up half as
   * long on the phones most likely to be running at 120.
   */
  /* ---- the compositor seam, read by the scroller and the creep ---- */

  /** Whether a compositor glide owns the layer right now. */
  get compositorGlideActive(): boolean {
    return this.compositor.animation !== null;
  }

  /** Whether the layer can take a compositor sequence at all. */
  get canComposite(): boolean {
    const content = this.options.content as HTMLElement | Window;
    return typeof (content as HTMLElement).animate === 'function';
  }

  /** The playing sequence and the value it ends on — where a chained chunk starts. */
  get compositorPlaying(): { animation: Animation; lastValue: number } | null {
    const { animation, keyframes } = this.compositor;
    return animation ? { animation, lastValue: keyframes[keyframes.length - 1] } : null;
  }

  /** The compositor's keyframe step, for a caller building its own sequence. */
  get keyframeMs(): number {
    return this.self.KEYFRAME_MS;
  }

  /** Whether a chunk is already queued to follow the playing one. */
  get compositorHasChained(): boolean {
    return this.compositor.chained.length > 0;
  }

  /** Milliseconds left in the sequence the compositor is playing, or 0. */
  get compositorRemainingMs(): number {
    const animation = this.compositor.animation;
    if (!animation) return 0;
    const duration = Number(animation.effect?.getTiming().duration ?? 0);
    return Math.max(0, duration - Number(animation.currentTime ?? 0));
  }


  get velocityPerMs() {
    return this.frameMs > 0 ? this.velocity / this.frameMs : 0;
  }

  /**
   * The actual scroll value
   */
  get actualScroll() {
    // value browser takes into account
    // it has to be this way because of DOCTYPE declaration
    const wrapper = this.options.wrapper as Window | HTMLElement;

    return this.isHorizontal
      ? ((wrapper as Window).scrollX ?? (wrapper as HTMLElement).scrollLeft)
      : this.getTranslateY(this.options.content as HTMLElement);
  }

  /**
   * The current scroll value
   */
  get scroll() {
    return this.options.infinite
      ? LenisUtils.Class.modulo(this.animatedScroll, this.limit)
      : this.animatedScroll;
  }

  /**
   * The progress of the scroll relative to the limit
   */
  get progress() {
    // avoid progress to be NaN
    return this.limit === 0 ? 1 : this.scroll / this.limit;
  }

  /**
   * Current scroll state
   */
  get isScrolling() {
    return this.scrolling;
  }

  protected set isScrolling(value: Lenis.Scrolling) {
    if (this.scrolling !== value) {
      this.scrolling = value;
      this.updateClassName();
    }
  }

  /**
   * Check if lenis is stopped
   */
  get isStopped() {
    return this.stopped;
  }

  protected set isStopped(value: boolean) {
    if (this.stopped !== value) {
      this.stopped = value;
      this.updateClassName();
    }
  }

  /**
   * Check if lenis is locked
   */
  get isLocked() {
    return this.locked;
  }

  protected set isLocked(value: boolean) {
    if (this.locked !== value) {
      this.locked = value;
      this.updateClassName();
    }
  }

  /**
   * Check if lenis is smooth scrolling
   */
  get isSmooth() {
    return this.isScrolling === 'smooth';
  }

  /**
   * The class name applied to the wrapper element
   */
  get className() {
    let className = 'lenis';
    if (this.options.autoToggle) className += ' lenis-autoToggle';
    if (this.isStopped) className += ' lenis-stopped';
    if (this.isLocked) className += ' lenis-locked';
    if (this.isScrolling) className += ' lenis-scrolling';
    if (this.isScrolling === 'smooth') className += ' lenis-smooth';
    return className;
  }

  /**
   * Destroy the lenis instance, remove all event listeners and clean up the class name
   */
  destroy() {
    this.emitter.destroy();

    this.options.wrapper.removeEventListener('scroll', this.onNativeScroll, false);

    this.options.wrapper.removeEventListener('scrollend', this.onScrollEnd, {
      capture: true
    });

    this.options.wrapper.removeEventListener(
      'pointerdown',
      this.onPointerDown as EventListener,
      false
    );

    if (this.options.anchors && this.options.wrapper === window) {
      this.options.wrapper.removeEventListener('click', this.onClick as EventListener, false);
    }

    this.virtualScroll.destroy();
    this.dimensions.destroy();

    this.cleanUpClassName();

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  /**
   * Add an event listener for the given event and callback
   *
   * @param event Event name
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  on(event: Lenis.Event, callback: Lenis.ScrollCallback | VirtualScroll.Callback): () => void {
    return this.emitter.on(event, callback as (...args: unknown[]) => void);
  }

  /**
   * Remove an event listener for the given event and callback
   *
   * @param event Event name
   * @param callback Callback function
   */
  off(event: Lenis.Event, callback: Lenis.ScrollCallback | VirtualScroll.Callback): void {
    this.emitter.off(event, callback as (...args: unknown[]) => void);
  }

  protected onScrollEnd(e: Event | CustomEvent) {
    if (!(e instanceof CustomEvent)) {
      if (this.isScrolling === 'smooth' || this.isScrolling === false) {
        e.stopPropagation();
      }
    }
  }

  protected dispatchScrollendEvent() {
    this.options.wrapper.dispatchEvent(
      new CustomEvent('scrollend', {
        bubbles: this.options.wrapper === window,
        // cancelable: false,
        detail: {
          lenisScrollEnd: true
        }
      })
    );
  }

  protected onTransitionEnd(event: TransitionEvent) {
    if (event.propertyName.includes('overflow')) {
      const property = this.isHorizontal ? 'overflow-x' : 'overflow-y';

      const overflow = getComputedStyle(this.rootElement)[
        property as keyof CSSStyleDeclaration
      ] as string;

      if (['hidden', 'clip'].includes(overflow)) {
        this.stop();
      } else {
        this.start();
      }
    }
  }

  /**
   * An external authority (VirtualScroller's setScrollPosition) wrote the
   * content transform directly: abandon any in-flight wheel animation and
   * adopt the jump as the new resting state. The running Animate holds its
   * own captured from/to — overwriting animatedScroll/targetScroll alone
   * does NOT retarget it, so every raf tick would keep dragging the content
   * back toward the stale wheel target, silently eating the jump (and its
   * `isScrolling: 'smooth'` aborts the seek/search settle loops on their
   * first re-pin).
   */
  adoptExternalScroll(scroll: number) {
    this.endCompositorGlide(false);
    // The consumer wrote the transform itself and is telling us where it put
    // the content, so this is what a read-back would say — record it rather
    // than dropping the cache, which left it cold on every frame that
    // mounted a row (measured: 0 hits, 34 adopts over thirty notches).
    this.appliedTranslate = scroll;
    this.animate.stop();
    this.isScrolling = false;
    this.lastVelocity = this.velocity = 0;
    this.animatedScroll = this.targetScroll = scroll;
    // The layer moved — by the consumer's hand, but it moved — so whoever
    // follows the layer (a stage composing scenes over it) hears it like
    // every other write. Nothing here re-enters: the consumer that adopted
    // is not a listener of its own write.
    this.emit();
  }

  /**
   * The content shifted under a running glide — rows above the reader
   * changed size — and the scroller asks the glide to move with it: the
   * target, the animated position and the running lerp's origin, value
   * and target all shift by `delta`, so the remaining distance, the
   * velocity and the easing are exactly what they were. The transform is
   * written at once: the DOM already holds the new size, and a frame late
   * is a visible jerk.
   */
  shiftBy(delta: number, write = true) {
    this.targetScroll += delta;
    this.animatedScroll += delta;
    if (this.animate.isRunning) this.animate.shift(delta);
    // the finger's trail shifts with the content too: its positions are
    // where the content was under each move, and a flick's velocity is the
    // finger's motion over them — rows measuring above the reader mid-drag
    // moved the positions without the finger, and the flick read as still
    for (const point of this.touchTrail) point.position += delta;
    // The write is the caller's to decline. A caller that writes the layer
    // itself right after (a virtual window restoring its anchor, from a
    // rebased offset only it knows) needs the MODEL shifted — target,
    // animated position, lerp, trail — and not a second write of the same
    // frame. On Safari that second write is not cheap: setScroll cycles
    // will-change with a forced layout between, and the whole layer is
    // rasterised again. Once per anchor restore, on every measurement
    // wave, it read as a choppy scroll on an iPhone that Chrome never saw.
    if (this.compositor.animation) this.restartCompositorGlide();
    else if (write) this.setScroll(this.scroll);
  }

  protected setScroll(scroll: number) {
    // The compositor owns the layer while a glide plays there: the model still
    // runs, but no write reaches the DOM until the glide ends or is interrupted.
    if (this.compositor.animation) return;
    // behavior: 'instant' bypasses the scroll-behavior CSS property

    scroll -= this.renderOffset;

    // Written where the model says, on the DEVICE-PIXEL grid. Nothing before
    // this rounds: not the target (a finger's sub-pixel reaches the model),
    // not the lerp, not the trail — only the number handed to the layer, and
    // only to the nearest device pixel, which is where a browser's own scroll
    // offset lands. A fractional write is resampled by the compositor: every
    // line blurs by the fraction's phase, and as a glide slows the phase
    // creeps — read on both phones as a shimmer at the slow tail. A snap was
    // tried here before and rejected on a flawed trial: its default flavour
    // snapped only while FAST, where motion blur hides the phase, and every
    // iPhone run had the per-frame layer reset below in play. The contract's
    // record carries the history. renderOffset rebasing keeps this value
    // small (≤ ~131k px), where f32 still resolves the grid.
    const rendered =
      this.options.pixelSnap === false ? scroll : this.self.snapToDevicePixel(scroll);

    if (this.isHorizontal) {
      (this.options.content as HTMLElement).style.transform = `translateX(${-rendered}px)`;
    } else {
      // invariant: The frame write leaves the layer promoted (examples/playground/src/lenis/lenis.invariants.md)
      if (this.self.IS_SAFARI && this.options.safariLayerReset === true) {
        /** The original Safari workaround, opt-in since 2026-09-16 (see the
         *  option): a layer reset before every write, against long translated
         *  content mis-rendering and rows mounted under a touch staying blank. It is
         *  Safari-ONLY on purpose: the reset demotes (will-change: auto)
         *  and re-promotes the composited layer every frame, forcing the
         *  (often enormous) text layer to re-rasterize per scroll frame —
         *  on Chrome that re-raster snaps text to whole device pixels each
         *  frame and reads as scroll shimmer/chop, worst on low-DPI
         *  screens and on the biggest posts. Chrome/Firefox keep the
         *  permanent will-change: transform from the CSS and take the
         *  plain transform write. */
        (this.options.content as HTMLElement).style.willChange = `auto`;
        (this.options.content as HTMLElement).offsetHeight;
        (this.options.content as HTMLElement).style.willChange = `transform`;
      }
      (this.options.content as HTMLElement).style.transform = `translateY(${-rendered}px)`;
    }
    // What the read-back would say, remembered at the moment of writing.
    // Reading it back instead means `getComputedStyle(...).transform`, which
    // forces a style recalc — 157 of them over a thirty-notch scroll in a
    // trace, about 85 ms, for a number this method already has in hand.
    this.appliedTranslate = this.isHorizontal ? null : rendered + this.renderOffset;
  }

  protected onClick(event: PointerEvent | MouseEvent) {
    const path = event.composedPath();
    const anchor = path.find(
      (node) =>
        node instanceof HTMLAnchorElement &&
        (node.getAttribute('href')?.startsWith('#') ||
          node.getAttribute('href')?.startsWith('/#') ||
          node.getAttribute('href')?.startsWith('./#'))
    ) as HTMLAnchorElement | undefined;
    if (anchor) {
      const id = anchor.getAttribute('href');

      if (id) {
        const options =
          typeof this.options.anchors === 'object' && this.options.anchors
            ? this.options.anchors
            : undefined;

        let target: number | string = `#${id.split('#')[1]}`;
        if (['#', '/#', './#', '#top', '/#top', './#top'].includes(id)) {
          target = 0;
        }

        this.scrollTo(target, options);
      }
    }
  }

  protected onPointerDown(event: PointerEvent | MouseEvent) {
    if (event.button === 1) {
      this.reset();
    }
  }

  /**
   * Scroll what holds this scroller by a gesture's delta: the nearest
   * ancestor that overflows on the axis, else the window. The frame pans
   * nothing natively on its own axis, so the hand-off is the fork's own
   * write.
   */
  // invariant: An outward gesture at a limit belongs to the page (examples/playground/src/lenis/lenis.invariants.md)
  protected chainToAncestor(delta: number) {
    const horizontal = this.isHorizontal;
    let node = this.rootElement.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      const overflow = horizontal ? style.overflowX : style.overflowY;
      const scrollable =
        (overflow === 'auto' || overflow === 'scroll') &&
        (horizontal ? node.scrollWidth > node.clientWidth : node.scrollHeight > node.clientHeight);
      if (scrollable) {
        if (horizontal) node.scrollLeft += delta;
        else node.scrollTop += delta;
        return;
      }
      node = node.parentElement;
    }
    window.scrollBy(horizontal ? delta : 0, horizontal ? 0 : delta);
  }

  protected onVirtualScroll(data: VirtualScroll.Data) {
    if (
      typeof this.options.virtualScroll === 'function' &&
      this.options.virtualScroll(data) === false
    )
      return;

    const { deltaX, deltaY, event } = data;

    this.emitter.emit('virtual-scroll', { deltaX, deltaY, event });

    // keep zoom feature
    if (event.ctrlKey) return;
    // @ts-ignore
    if (event.lenisStopPropagation) return;

    const isTouch = event.type.includes('touch');
    const isWheel = event.type.includes('wheel');

    this.isTouching = event.type === 'touchstart' || event.type === 'touchmove';
    // if (event.type === 'touchend') {
    //   console.log('touchend', this.scroll)
    //   // this.lastVelocity = this.velocity
    //   // this.velocity = 0
    //   // this.isScrolling = false
    //   this.emit({ type: 'touchend' })
    //   // alert('touchend')
    //   return
    // }

    const isClickOrTap = deltaX === 0 && deltaY === 0;
    const now = performance.now();
    this.trace?.(
      `${event.type} d=(${Math.round(deltaX)},${Math.round(deltaY)}) flag=${Boolean(
        (event as Event & { lenisStopPropagation?: boolean }).lenisStopPropagation
      )} scrolling=${String(this.isScrolling)} v=${this.velocity.toFixed(1)} target=${Math.round(this.targetScroll)} anim=${Math.round(this.animatedScroll)} stopped=${this.isStopped} locked=${this.isLocked}`
    );

    // invariant: A touch on a glide keeps it running until the first move (examples/playground/src/lenis/lenis.invariants.md)
    // invariant: Android holds the first move back and may coalesce a swipe into one (examples/playground/src/lenis/lenis.invariants.md)
    if (this.options.syncTouch && isTouch && !this.isStopped && !this.isLocked) {
      if (event.type === 'touchstart' && isClickOrTap) {
        // The touch is pending: the glide runs on, braked — its target is
        // pulled to a few frames ahead, so the content eases to a stop under
        // the finger the way a native list stops dead on the touch, without
        // the freeze-then-jump a hard stop gave Android's held-back first
        // move. The momentum is remembered now, before the brake takes it,
        // for a flick the same way. The trail is seeded at the animated
        // position now and re-seeded at the first move, so a whole swipe
        // Android coalesces into one move still has a span.
        this.touchPending = true;
        this.touchTrail = [{ at: now, position: this.animatedScroll }];
        // invariant: A flick carries the glide it interrupted (examples/playground/src/lenis/lenis.invariants.md)
        // carried in the SAME unit the trail reports — px per 60 Hz frame —
        // so a glide interrupted on a 120 Hz display contributes what it
        // actually had, not half of it
        this.carriedVelocity = this.velocityPerMs * this.self.FRAME_MS;
        if (this.animate.isRunning) {
          this.scrollTo(this.animatedScroll + this.velocityPerMs * this.self.TOUCH_BRAKE_MS, {
            programmatic: false,
            lerp: this.self.TOUCH_BRAKE_LERP
          });
        }
        this.trace?.(`touch pending: glide brakes, carrying v=${this.carriedVelocity.toFixed(1)}`);
        return;
      }
      if (this.touchPending && event.type === 'touchmove') {
        // The finger takes over from where the content IS: the glide's
        // target, hundreds of px ahead, is dropped.
        this.touchPending = false;
        this.animate.stop();
        this.targetScroll = this.animatedScroll;
        this.touchTrail[0] = { at: this.touchTrail[0]?.at ?? now, position: this.animatedScroll };
        this.trace?.(`finger takes over, carrying v=${this.carriedVelocity.toFixed(1)}`);
      } else if (this.touchPending && (event.type === 'touchend' || event.type === 'touchcancel')) {
        // A touch with no move: tap to stop.
        this.touchPending = false;
        this.carriedVelocity = 0;
        this.trace?.('tap-to-stop: reset');
        this.reset();
        return;
      }
    }

    // const isPullToRefresh =
    //   this.options.gestureOrientation === 'vertical' &&
    //   this.scroll === 0 &&
    //   !this.options.infinite &&
    //   deltaY <= 5 // touch pull to refresh, not reliable yet

    // A wheel that runs mostly across the axis is not this scroller's: a
    // trackpad swiping a code block sideways carries a few px of drift on
    // the other axis, and taking that drift scrolled the list under the
    // block while the block itself never moved. Left alone, the browser
    // scrolls whatever under the pointer scrolls that way.
    // invariant: A cross-axis wheel belongs to what is under it (examples/playground/src/lenis/lenis.invariants.md)
    const isUnknownGesture =
      (this.options.gestureOrientation === 'vertical' &&
        (deltaY === 0 || (isWheel && Math.abs(deltaX) > Math.abs(deltaY)))) ||
      (this.options.gestureOrientation === 'horizontal' &&
        (deltaX === 0 || (isWheel && Math.abs(deltaY) > Math.abs(deltaX))));

    if (isClickOrTap || isUnknownGesture) {
      // console.log('prevent')
      return;
    }

    // catch if scrolling on nested scroll elements
    let composedPath = event.composedPath();
    composedPath = composedPath.slice(0, composedPath.indexOf(this.rootElement)); // remove parents elements

    const prevent = this.options.prevent;

    if (
      !!composedPath.find(
        (node) =>
          node instanceof HTMLElement &&
          ((typeof prevent === 'function' && prevent?.(node)) ||
            node.hasAttribute?.('data-lenis-prevent') ||
            (isTouch && node.hasAttribute?.('data-lenis-prevent-touch')) ||
            (isWheel && node.hasAttribute?.('data-lenis-prevent-wheel')) ||
            (this.options.allowNestedScroll && this.checkNestedScroll(node, { deltaX, deltaY })))
      )
    )
      return;

    if (this.isStopped || this.isLocked) {
      event.preventDefault(); // this will stop forwarding the event to the parent, this is problematic
      return;
    }

    const isSmooth = (this.options.syncTouch && isTouch) || (this.options.smoothWheel && isWheel);

    if (!isSmooth) {
      this.trace?.('not smooth: native');
      this.isScrolling = 'native';
      this.animate.stop();
      // @ts-ignore
      event.lenisStopPropagation = true;
      return;
    }

    // console.log('deltaX', deltaX, 'deltaY', deltaY, 'isTouch', isTouch, 'isWheel', isWheel)
    let delta = deltaY;
    if (this.options.gestureOrientation === 'both') {
      delta = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
    } else if (this.options.gestureOrientation === 'horizontal') {
      delta = deltaX;
    }

    // An outward gesture at a limit is the page's. The frame is overflow:auto and
    // its own axis is never the browser's — an uncancelled wheel would pan the
    // frame natively and be zeroed, a touch has `touch-action: none` under it — so
    // the fork cancels the event and moves the nearest scrollable ancestor by the
    // gesture's own, un-multiplied delta. No stop flag is set. `overscroll: false`
    // keeps every gesture inside — a card over the page, like the peek, wants that.
    // invariant: An outward gesture at a limit belongs to the page (examples/playground/src/lenis/lenis.invariants.md)
    if (
      this.options.overscroll &&
      !this.options.infinite &&
      this.options.wrapper !== window &&
      this.self.isOutward(this.animatedScroll, this.limit, delta)
    ) {
      event.preventDefault();
      if (isWheel || event.type === 'touchmove') {
        const gain = isTouch ? this.options.touchMultiplier : this.options.wheelMultiplier;
        this.chainToAncestor(delta / (gain || 1));
      }
      return;
    }

    if (
      !this.options.overscroll ||
      this.options.infinite ||
      (this.options.wrapper !== window &&
        ((this.animatedScroll > 0 && this.animatedScroll < this.limit) ||
          (this.animatedScroll === 0 && deltaY > 0) ||
          (this.animatedScroll === this.limit && deltaY < 0)))
    ) {
      // @ts-ignore
      event.lenisStopPropagation = true;
      // event.stopPropagation()
    }

    event.preventDefault();

    this.lastInputTouch = isTouch;
    const isSyncTouch = isTouch && this.options.syncTouch;
    // invariant: A touchcancel flicks like a touchend (examples/playground/src/lenis/lenis.invariants.md)
    const isTouchEnd = isTouch && (event.type === 'touchend' || event.type === 'touchcancel');

    // in the trail's unit — px per 60 Hz frame — because that is what it
    // falls back TO. Raw `velocity` is per rendered frame, which is half of
    // that at 120 Hz, and this fallback is exactly the path a coalesced
    // Android swipe takes.
    let flickVelocity = this.velocityPerMs * this.self.FRAME_MS;
    let trailLength = 0;
    if (isTouch) {
      // The touchstart seeded the trail above.
      if (event.type === 'touchmove') {
        this.touchTrail.push({ at: now, position: this.targetScroll + delta });
        this.self.trimTrail(this.touchTrail, now, this.self.FLICK_WINDOW_MS);
      } else if (isTouchEnd) {
        trailLength = this.touchTrail.length;
        flickVelocity = this.self.carryVelocity(
          this.self.trailVelocity(this.touchTrail, this.velocityPerMs * this.self.FRAME_MS),
          this.carriedVelocity
        );
        this.carriedVelocity = 0;
        this.touchTrail = [];
      }
    }

    const hasTouchInertia = isTouchEnd && (Math.abs(delta) > 5 || Math.abs(flickVelocity) > 0.5);

    if (hasTouchInertia) {
      delta = flickVelocity * this.options.touchInertiaMultiplier;
    }
    if (isTouchEnd) {
      this.trace?.(
        `flick? ${hasTouchInertia} trail=${trailLength} flickV=${flickVelocity.toFixed(2)} inertiaDelta=${Math.round(delta)}`
      );
    }

    // A flick carries either way; the model decides HOW it comes to rest.
    // 'friction' decelerates to a full stop over a duration the throw
    // implies; 'exponential' approaches the target forever and settles when
    // it is within half a pixel.
    const friction = hasTouchInertia && this.options.syncTouchGlide === 'friction';
    const frictionDuration =
      (this.self.frictionFrames(this.options.syncTouchLerp ?? 0) * this.self.FRAME_MS) / 1000;
    this.scrollTo(this.targetScroll + delta, {
      programmatic: false,
      ...(isSyncTouch
        ? {
            ...(friction && frictionDuration > 0
              ? { duration: frictionDuration, easing: this.self.frictionEasing }
              : { lerp: hasTouchInertia ? this.options.syncTouchLerp : 1 }),
            compositor: hasTouchInertia,
            // A DRAG is not an animation: the content belongs under the
            // finger, at the pixel the finger is at, the way the browser's
            // own scrolling puts it there. Through a lerp — even a lerp of
            // 1, which damp turns into 63% of the remaining distance per
            // frame — the content trails the finger by about 50 ms and
            // arrives only when the half-pixel settle snaps it, which is
            // felt as the content creeping after the thumb rather than
            // moving with it. A flick is the opposite case and keeps its
            // animation.
            immediate: !hasTouchInertia
          }
        : {
            lerp: this.options.lerp,
            duration: this.options.duration,
            easing: this.options.easing
          })
    });
  }

  /**
   * Stop a glide where the content is, now. A touch that a class claims
   * for itself — a selection handle, a long press, a double tap — flags
   * its moves for Lenis to skip, so the pending touch would never see the
   * move that takes over and the glide would run on under the finger.
   */
  hold() {
    this.touchPending = false;
    this.reset();
  }

  /**
   * Re-tune the motion options after construction: the gains, the lerps,
   * the flick inertia and the speed caps. Anything omitted is unchanged.
   */
  tune(
    options: Partial<
      Pick<
        Lenis.Options,
        | 'wheelMultiplier'
        | 'touchMultiplier'
        | 'lerp'
        | 'syncTouchLerp'
        | 'touchInertiaMultiplier'
        | 'syncTouchGlide'
        | 'pixelSnap'
        | 'safariLayerReset'
        | 'compositorGlide'
        | 'wheelMaxPxPerMs'
        | 'touchMaxPxPerMs'
      >
    >
  ) {
    Object.assign(this.options, options);
    this.virtualScroll.tune({
      ...(options.wheelMultiplier !== undefined && { wheelMultiplier: options.wheelMultiplier }),
      ...(options.touchMultiplier !== undefined && { touchMultiplier: options.touchMultiplier })
    });
  }

  /**
   * Force lenis to recalculate the dimensions
   */
  resize() {
    this.dimensions.resize();
    this.animatedScroll = this.targetScroll = this.actualScroll;
    this.emit();
  }

  protected emit() {
    this.emitter.emit('scroll', this);
  }

  protected onNativeScroll() {
    // Fully-virtual scrollers (the horizontal strip) never accept native
    // adoption: the wrapper's scrollLeft/scrollTop are pinned 0 by design,
    // and adopting them the instant a lerp completes teleports the content
    // back to the origin.
    if (this.options.ignoreNativeScroll) return;
    if (this.resetVelocityTimer !== null) {
      clearTimeout(this.resetVelocityTimer);
      this.resetVelocityTimer = null;
    }

    if (this.nativeScrollEventSuppressed) {
      this.nativeScrollEventSuppressed = false;
      return;
    }

    if (this.isScrolling === false || this.isScrolling === 'native') {
      const lastScroll = this.animatedScroll;
      this.animatedScroll = this.targetScroll = this.actualScroll;
      this.lastVelocity = this.velocity;
      this.velocity = this.animatedScroll - lastScroll;
      this.direction = Math.sign(this.animatedScroll - lastScroll) as $Lenis['direction'];

      if (!this.isStopped) {
        this.isScrolling = 'native';
      }

      this.emit();

      if (this.velocity !== 0) {
        this.resetVelocityTimer = setTimeout(() => {
          this.lastVelocity = this.velocity;
          this.velocity = 0;
          this.isScrolling = false;
          this.emit();
        }, 400);
      }
    }
  }

  protected reset() {
    this.isLocked = false;
    this.isScrolling = false;
    // Fully-virtual scrollers pin the wrapper's native scroll at 0, so
    // adopting actualScroll on completion would teleport the content back
    // to the origin — virtual mode keeps the animated position instead.
    this.animatedScroll = this.targetScroll = this.options.ignoreNativeScroll
      ? this.animatedScroll
      : this.actualScroll;
    this.lastVelocity = this.velocity = 0;
    this.animate.stop();
  }

  /**
   * Start lenis scroll after it has been stopped
   */
  start() {
    if (!this.isStopped) return;
    this.reset();

    this.isStopped = false;

    this.emit();
  }

  /**
   * Stop lenis scroll
   */
  stop() {
    if (this.isStopped) return;
    this.reset();

    this.isStopped = true;

    this.emit();
  }

  /**
   * RequestAnimationFrame for lenis
   *
   * @param time The time in ms from an external clock like `requestAnimationFrame` or Tempus
   */
  // invariant: A glide renders at the rate the platform grants a page (examples/playground/src/lenis/lenis.invariants.md)
  raf(time: number) {
    // invariant: A frame advances by the reported gap (examples/playground/src/lenis/lenis.invariants.md)
    const deltaTime = time - (this.time || time);
    this.time = time;
    // The REAL frame time — the reported gap, never a stepped interval. Safari
    // at 120 Hz reports 13 then 3 ms and those are true: the callback fired
    // late and the next on time, and the content must be where that moment
    // says. Stepping by whole intervals put it 4–8 ms off its own frame and
    // read as a nudge (see the contract's rejected alternative). A suspended
    // tab or a first frame is not a frame time; the tuned 60 Hz value stands in.
    if (deltaTime > 0 && deltaTime < this.self.MAX_FRAME_MS) this.frameMs = deltaTime;

    this.animate.advance(deltaTime * 0.001);

    if (this.options.autoRaf) {
      this.rafId = requestAnimationFrame(this.raf);
    }
  }

  /**
   * Scroll to a target value
   *
   * @param target The target value to scroll to
   * @param options The options for the scroll
   *
   * @example
   * lenis.scrollTo(100, {
   *   offset: 100,
   *   duration: 1,
   *   easing: (t) => 1 - Math.cos((t * Math.PI) / 2),
   *   lerp: 0.1,
   *   onStart: () => {
   *     console.log('onStart')
   *   },
   *   onComplete: () => {
   *     console.log('onComplete')
   *   },
   * })
   */
  scrollTo(
    target: number | string | HTMLElement,
    {
      offset = 0,
      immediate = false,
      lock = false,
      duration = this.options.duration,
      easing = this.options.easing,
      lerp = this.options.lerp,
      onStart,
      onComplete,
      force = false, // scroll even if stopped
      programmatic = true, // called from outside of the class
      userData,
      compositor = false
    }: Lenis.ScrollToOptions = {}
  ) {
    if ((this.isStopped || this.isLocked) && !force) return;

    // keywords
    if (typeof target === 'string' && ['top', 'left', 'start'].includes(target)) {
      target = 0;
    } else if (typeof target === 'string' && ['bottom', 'right', 'end'].includes(target)) {
      target = this.limit;
    } else {
      let node;

      if (typeof target === 'string') {
        // CSS selector
        node = document.querySelector(target);
      } else if (target instanceof HTMLElement && target?.nodeType) {
        // Node element
        node = target;
      }

      if (node) {
        if (this.options.wrapper !== window) {
          // nested scroll offset correction
          const wrapperRect = this.rootElement.getBoundingClientRect();
          offset -= this.isHorizontal ? wrapperRect.left : wrapperRect.top;
        }

        const rect = node.getBoundingClientRect();

        target = (this.isHorizontal ? rect.left : rect.top) + this.animatedScroll;
      }
    }

    if (typeof target !== 'number') return;

    target += offset;
    // The target is NOT rounded. It used to be, so the lerp could finish on
    // `Math.round(value) === to`; that test is gone (Animate settles inside
    // half a pixel instead), and nothing else rounds either — the layer is
    // written where the model says. Rounding here quantised the one thing
    // that must not be: a finger's
    // own motion. A drag re-targets every frame, so each sub-pixel of the
    // gesture was thrown away before it reached the layer, and the content
    // walked under the finger in whole-pixel steps — the drag reads
    // crisper, the glide out of it starts from a lie.

    if (this.options.infinite) {
      if (programmatic) {
        this.targetScroll = this.animatedScroll = this.scroll;

        const distance = target - this.animatedScroll;

        if (distance > this.limit / 2) {
          target = target - this.limit;
        } else if (distance < -this.limit / 2) {
          target = target + this.limit;
        }
      }
    } else {
      target = LenisUtils.Class.clamp(0, target, this.limit);
    }

    if (target === this.targetScroll) {
      onStart?.(this);
      onComplete?.(this);
      return;
    }

    this.userData = userData ?? {};
    // any new motion takes the layer back from a compositor glide, at the
    // value the compositor is showing, so the handoff has no jump
    this.endCompositorGlide(true);

    if (immediate) {
      // The speed the content is actually moving at, kept across the jump:
      // `reset` below zeroes it, and the render pad sizes its lookahead from
      // it — zeroed on every move of a drag, the pad collapses to its base
      // and the rows a fast drag is about to reach are mounted late.
      const moved = target - this.animatedScroll;
      this.animatedScroll = this.targetScroll = target;
      this.setScroll(this.scroll);
      this.reset();
      this.velocity = moved;
      this.preventNextNativeScrollEvent();
      this.emit();
      onComplete?.(this);
      this.userData = {};

      requestAnimationFrame(() => {
        this.dispatchScrollendEvent();
      });
      return;
    }

    if (!programmatic) {
      this.targetScroll = target;
    }

    // flip to easing/time based animation if at least one of them is provided
    if (typeof duration === 'number' && typeof easing !== 'function') {
      easing = this.self.defaultEasing;
    } else if (typeof easing === 'function' && typeof duration !== 'number') {
      duration = 1;
    }

    // A gesture's scroll runs under its input's speed cap; a programmatic
    // seek is uncapped — it is asked for by name and lands where it says.
    const maxPxPerMs = programmatic
      ? 0
      : this.lastInputTouch
        ? this.options.touchMaxPxPerMs
        : this.options.wheelMaxPxPerMs;
    this.animate.fromTo(this.animatedScroll, target, {
      duration,
      easing,
      lerp,
      maxPxPerMs,
      onStart: () => {
        // started
        if (lock) this.isLocked = true;
        this.isScrolling = 'smooth';
        onStart?.(this);
      },
      onUpdate: (value: number, completed: boolean) => {
        this.isScrolling = 'smooth';

        // updated
        this.lastVelocity = this.velocity;
        this.velocity = value - this.animatedScroll;
        this.direction = Math.sign(this.velocity) as $Lenis['direction'];

        this.animatedScroll = value;
        this.setScroll(this.scroll);

        if (programmatic) {
          // wheel during programmatic should stop it
          this.targetScroll = value;
        }

        if (!completed) this.emit();

        if (completed) {
          this.onModelGlideComplete();
          this.reset();
          this.emit();
          onComplete?.(this);
          this.userData = {};

          requestAnimationFrame(() => {
            this.dispatchScrollendEvent();
          });

          // avoid emitting event twice
          this.preventNextNativeScrollEvent();
        }
      }
    });
    if (compositor && this.options.compositorGlide) this.startCompositorGlide();
  }

  /* ---- the compositor glide ---- */

  /** Hand the glide's remaining curve to the layer as held, snapped keyframes. */
  protected startCompositorGlide() {
    if (!this.animate.isRunning) return;
    this.startCompositorSequence(this.self.glideKeyframes(this.animate));
  }

  /** Hand any sequence of scroll values — one per KEYFRAME_MS, the first being
   *  where the layer is — to the layer as held, snapped keyframes. Returns the
   *  animation, or null when there is nothing to hand over. With `after`, the
   *  new sequence is scheduled to begin exactly when that animation ends, on the
   *  document timeline, so a chained chunk shows no seam. */
  // invariant: A glide plays on the compositor as held snapped keyframes (examples/playground/src/lenis/lenis.invariants.md)
  startCompositorSequence(
    values: number[],
    { after = null, linear = false }: { after?: Animation | null; linear?: boolean } = {}
  ): Animation | null {
    const content = this.options.content as HTMLElement;
    if (!this.canComposite || values.length < 2) return null;
    const self = this.self;
    const axis = this.isHorizontal ? 'translateX' : 'translateY';
    const offset = this.renderOffset;
    // a glide: every step a held, snapped keyframe. A creep: the two fractional
    // endpoints, interpolated — at a fraction of a device pixel per frame the
    // compositor's filtering IS the motion, and a snapped step would be a tick.
    const animation = self.composeSequence(
      content,
      values,
      linear
        ? (value) => `${axis}(${-(value - offset)}px)`
        : (value) => `${axis}(${-self.snapToDevicePixel(value - offset)}px)`,
      { after, linear }
    );
    if (!animation) return null;
    animation.onfinish = () => this.onCompositorSequenceFinish(animation);
    this.options.onSequence?.({ animation, values, linear, after });
    if (after && after.startTime !== null) {
      // a chained chunk: it begins on the document timeline exactly where the
      // one before ends, and waits in the queue until that one finishes
      this.compositor.chained.push({ animation, values, linear });
      return animation;
    }
    this.compositor.keyframes = values;
    this.compositor.linear = linear;
    this.compositor.modelDone = false;
    this.compositor.animation = animation;
    return animation;
  }

  /** Take the layer back from any compositor sequence — a caller's seam, for
   *  the creep stopping under input, at the end of the list, or on stop(). */
  releaseCompositor(adopt: boolean) {
    this.endCompositorGlide(adopt);
  }

  /** The value the compositor is showing now, from its own clock over our keyframes. */
  protected compositorShownValue(): number {
    const { animation, keyframes, linear } = this.compositor;
    const elapsed = Math.max(0, Number(animation?.currentTime ?? 0));
    const last = keyframes.length - 1;
    if (last < 0) return this.animatedScroll;
    if (linear) {
      const progress = Math.min(1, elapsed / (last * this.self.KEYFRAME_MS));
      return keyframes[0] + (keyframes[last] - keyframes[0]) * progress;
    }
    const index = Math.min(last, Math.floor(elapsed / this.self.KEYFRAME_MS));
    return keyframes[index];
  }

  /** Take the layer back. With `adopt`, the model moves to the value on screen
   *  first, so the inline write that follows changes nothing visible. */
  protected endCompositorGlide(adopt: boolean) {
    const animation = this.compositor.animation;
    if (!animation) return;
    for (const pending of this.compositor.chained) pending.animation.cancel();
    this.compositor.chained = [];
    if (adopt) {
      const shown = this.compositorShownValue();
      const delta = shown - this.animatedScroll;
      this.animatedScroll = shown;
      if (this.animate.isRunning) this.animate.shift(delta);
    }
    this.compositor.animation = null;
    this.compositor.keyframes = [];
    // inline first, cancel second: the animation overrides the inline write
    // until it is gone, so the layer never shows an older inline value
    this.setScroll(this.scroll);
    animation.cancel();
  }

  /** The content shifted under the glide (rows measured): rebuild the
   *  remaining curve from the shifted model and hand it over again. */
  protected restartCompositorGlide() {
    if (!this.compositor.animation) return;
    this.endCompositorGlide(false);
    this.startCompositorGlide();
  }

  /** The model finished first: the compositor plays its last held frames out
   *  and the finish handler takes the layer back at the model's end value. */
  protected onModelGlideComplete() {
    if (this.compositor.animation) this.compositor.modelDone = true;
  }

  /** A sequence finished. If it is still the one in charge (a chained chunk
   *  may have replaced it), the model is at its end or within a frame of it:
   *  the inline write lands on the model's value and the animation goes. A
   *  superseded chunk only needs cancelling. */
  protected onCompositorSequenceFinish(animation: Animation) {
    const compositor = this.compositor;
    if (compositor.animation !== animation) {
      animation.cancel();
      return;
    }
    const next = compositor.chained.shift();
    if (!next) {
      this.endCompositorGlide(false);
      return;
    }
    // the chunk after it is already playing from this one's last value
    compositor.animation = next.animation;
    compositor.keyframes = next.values;
    compositor.linear = next.linear;
    animation.cancel();
  }

  protected preventNextNativeScrollEvent() {
    this.nativeScrollEventSuppressed = true;

    requestAnimationFrame(() => {
      this.nativeScrollEventSuppressed = false;
    });
  }

  protected checkNestedScroll(
    node: HTMLElement,
    { deltaX, deltaY }: { deltaX: number; deltaY: number }
  ) {
    const time = Date.now();

    // @ts-ignore
    const cache = (node._lenis ??= {});

    let hasOverflowX,
      hasOverflowY,
      isScrollableX,
      isScrollableY,
      scrollWidth,
      scrollHeight,
      clientWidth,
      clientHeight;

    const gestureOrientation = this.options.gestureOrientation;

    if (time - (cache.time ?? 0) > 2000) {
      cache.time = Date.now();

      const computedStyle = window.getComputedStyle(node);
      cache.computedStyle = computedStyle;

      const overflowXString = computedStyle.overflowX;
      const overflowYString = computedStyle.overflowY;

      hasOverflowX = ['auto', 'overlay', 'scroll'].includes(overflowXString);
      hasOverflowY = ['auto', 'overlay', 'scroll'].includes(overflowYString);
      cache.hasOverflowX = hasOverflowX;
      cache.hasOverflowY = hasOverflowY;

      if (!hasOverflowX && !hasOverflowY) return false; // if no overflow, it's not scrollable no matter what, early return saves some computations
      if (gestureOrientation === 'vertical' && !hasOverflowY) return false;
      if (gestureOrientation === 'horizontal' && !hasOverflowX) return false;

      scrollWidth = node.scrollWidth;
      scrollHeight = node.scrollHeight;

      clientWidth = node.clientWidth;
      clientHeight = node.clientHeight;

      isScrollableX = scrollWidth > clientWidth;
      isScrollableY = scrollHeight > clientHeight;

      cache.isScrollableX = isScrollableX;
      cache.isScrollableY = isScrollableY;
      cache.scrollWidth = scrollWidth;
      cache.scrollHeight = scrollHeight;
      cache.clientWidth = clientWidth;
      cache.clientHeight = clientHeight;
    } else {
      isScrollableX = cache.isScrollableX;
      isScrollableY = cache.isScrollableY;
      hasOverflowX = cache.hasOverflowX;
      hasOverflowY = cache.hasOverflowY;
      scrollWidth = cache.scrollWidth;
      scrollHeight = cache.scrollHeight;
      clientWidth = cache.clientWidth;
      clientHeight = cache.clientHeight;
    }

    if ((!hasOverflowX && !hasOverflowY) || (!isScrollableX && !isScrollableY)) {
      return false;
    }

    if (gestureOrientation === 'vertical' && (!hasOverflowY || !isScrollableY)) return false;

    if (gestureOrientation === 'horizontal' && (!hasOverflowX || !isScrollableX)) return false;

    let orientation: 'x' | 'y' | undefined;

    if (gestureOrientation === 'horizontal') {
      orientation = 'x';
    } else if (gestureOrientation === 'vertical') {
      orientation = 'y';
    } else {
      const isScrollingX = deltaX !== 0;
      const isScrollingY = deltaY !== 0;

      if (isScrollingX && hasOverflowX && isScrollableX) {
        orientation = 'x';
      }

      if (isScrollingY && hasOverflowY && isScrollableY) {
        orientation = 'y';
      }
    }

    if (!orientation) return false;

    let scroll, maxScroll, delta, hasOverflow, isScrollable;

    if (orientation === 'x') {
      scroll = node.scrollLeft;
      maxScroll = scrollWidth - clientWidth;
      delta = deltaX;

      hasOverflow = hasOverflowX;
      isScrollable = isScrollableX;
    } else if (orientation === 'y') {
      // a nested box scrolls natively: its position is scrollTop, never a transform — read off the
      // transform, a box scrolled down still read as sitting at its top, and every upward wheel
      // over it went to the thread instead
      scroll = node.scrollTop;
      maxScroll = scrollHeight - clientHeight;
      delta = deltaY;

      hasOverflow = hasOverflowY;
      isScrollable = isScrollableY;
    } else {
      return false;
    }

    const willScroll = delta > 0 ? scroll < maxScroll : scroll > 0;

    return willScroll && hasOverflow && isScrollable;
  }

  getTranslateY(element: HTMLElement) {
    // the content's own translate is whatever the last write applied; only a
    // foreign element, or a content we have not written yet, needs the read
    if (element === this.options.content && this.appliedTranslate !== null)
      return this.appliedTranslate;
    const style = window.getComputedStyle(element);
    const transform = style.transform;

    if (transform === 'none' || !transform) {
      return 0;
    }

    // Extract values from matrix(a, b, c, d, x, y)
    const matrixValues = transform.slice(7, -1).split(','); // Remove "matrix(" and ")"
    const translated = -parseFloat(matrixValues[5]) || 0; // translateY is the 6th value
    // The content's applied transform is renderOffset-shifted (see
    // setScroll) — undo it so actualScroll stays in absolute scroll space.
    // Reads of other (nested) elements are untouched.
    return element === this.options.content ? translated + this.renderOffset : translated;
  }

  protected updateClassName() {
    this.cleanUpClassName();

    this.rootElement.className = `${this.rootElement.className} ${this.className}`.trim();
  }

  protected cleanUpClassName() {
    this.rootElement.className = this.rootElement.className.replace(/lenis(-\w+)?/g, '').trim();
  }
}

export namespace Lenis {
  export const $Class = Static($Lenis); // anchor — it declares statics
  export let Class = $Class; // plain — no reactive state, no Reactive()
  // raw-instance type — fields, parameters, returns
  export type Model = InstanceType<typeof Class>;
  // the type of an unwrapping surface (none here; kept for the manifest)
  export type Instance = InstanceType<typeof Class>;

  export type UserData = Record<string, any>;
  export type Scrolling = boolean | 'native' | 'smooth';
  export type Event = 'scroll' | 'virtual-scroll';
  export type ScrollCallback = (lenis: Model) => void;
  export type Orientation = 'vertical' | 'horizontal';
  export type GestureOrientation = 'vertical' | 'horizontal' | 'both';

  export type ScrollToOptions = {
    /**
     * The offset to apply to the target value
     * @default 0
     */
    offset?: number;
    /**
     * Skip the animation and jump to the target value immediately
     * @default false
     */
    immediate?: boolean;
    /**
     * Lock the scroll to the target value
     * @default false
     */
    lock?: boolean;
    /**
     * The duration of the scroll animation (in s)
     */
    duration?: number;
    /**
     * The easing function to use for the scroll animation
     * @default (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
     */
    easing?: Animate.EasingFunction;
    /**
     * Linear interpolation (lerp) intensity (between 0 and 1)
     * @default 0.1
     */
    lerp?: number;
    /**
     * Called when the scroll starts
     */
    onStart?: (lenis: Model) => void;
    /**
     * Called when the scroll completes
     */
    onComplete?: (lenis: Model) => void;
    /**
     * Scroll even if stopped
     * @default false
     */
    force?: boolean;
    /** the glide may play on the compositor (a flick's inertia only) */
    compositor?: boolean;
    /**
     * Scroll initiated from outside of the lenis instance
     * @default false
     */
    programmatic?: boolean;
    /**
     * User data that will be forwarded through the scroll event
     */
    userData?: UserData;
  };

  /** A sequence the compositor was handed: the animation, the scroll values
   *  it was built from (one per KEYFRAME_MS), whether it is linear, and the
   *  animation it was chained after, if any. */
  export interface Sequence {
    animation: Animation;
    values: readonly number[];
    linear: boolean;
    after: Animation | null;
  }

  /** How `composeSequence` aligns and shapes a track. */
  export interface ComposeOptions {
    after?: Animation | null;
    alongside?: Animation | null;
    linear?: boolean;
    property?: string;
    stepMs?: number;
  }

  /** The options as given. */
  export type Options = {
    /**
     * The element that will be used as the scroll container
     * @default window
     */
    wrapper?: Window | HTMLElement | Element;
    /**
     * The element that contains the content that will be scrolled, usually `wrapper`'s direct child
     * @default document.documentElement
     */
    content?: HTMLElement | Element;
    /**
     * The element that will listen to `wheel` and `touch` events
     * @default window
     */
    eventsTarget?: Window | HTMLElement | Element;
    /**
     * Smooth the scroll initiated by `wheel` events
     * @default true
     */
    smoothWheel?: boolean;
    /**
     * Mimic touch device scroll while allowing scroll sync
     * @default false
     */
    syncTouch?: boolean;
    /**
     * Linear interpolation (lerp) intensity (between 0 and 1)
     * @default 0.075
     */
    syncTouchLerp?: number;
    /**
     * Manage the the strength of `syncTouch` inertia
     * @default 35
     */
    touchInertiaMultiplier?: number;
    /**
     * How a flick comes to rest: 'exponential' approaches its target and
     * settles within half a pixel, 'friction' decelerates at a constant rate
     * to a full stop over the duration its throw implies.
     * @default 'exponential'
     */
    syncTouchGlide?: 'exponential' | 'friction';
    /** Write the transform on the device-pixel grid (1/devicePixelRatio) — the
     *  default, and where a browser's own scroll offset lands. `false` writes
     *  the fraction; the compositor then resamples the raster at a phase that
     *  creeps as a glide slows, seen on both phones as a shimmer at the slow
     *  tail (iPhone and Galaxy S22 Ultra, 2026-09-16). */
    pixelSnap?: boolean;
    /** The Safari-only layer reset before every write (will-change auto →
     *  transform, a re-raster of the text layer each frame). OFF by default
     *  since 2026-09-16: with the write on the device-pixel grid the iPhone
     *  glides on a raster made once, the way Chrome does, and a drag into
     *  mounting rows showed none left blank. `true` restores the workaround. */
    safariLayerReset?: boolean;
    /** A flick's glide plays on the compositor: the whole remaining curve is
     *  handed to the layer as one snapped keyframe per 120 Hz step, held between
     *  keyframes, so every presented frame is on the device grid and no
     *  callback's timing is in the loop — the way a native fling renders. The
     *  model keeps running for the window and the events. ON by default since
     *  2026-09-17, judged by hand on both phones; `false` restores the
     *  JavaScript-timed glide. Under observation: the two handoffs (a grab
     *  mid-glide, an anchor shift under a running glide) are the surface. */
    compositorGlide?: boolean;
    /** Called each time the scroll hands the compositor a sequence — a flick's
     *  glide, a creep chunk — with the animation and the values it was built
     *  from, so a stage can compose its own tracks over the same list, aligned
     *  alongside (or, for a chained chunk, after) the same animation. */
    onSequence?: (sequence: Lenis.Sequence) => void;
    /**
     * Scroll duration in seconds
     */
    duration?: number;
    /**
     * Scroll easing function
     * @default (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
     */
    easing?: Animate.EasingFunction;
    /**
     * Linear interpolation (lerp) intensity (between 0 and 1)
     * @default 0.1
     */
    lerp?: number;
    /**
     * Enable infinite scrolling
     * @default false
     */
    infinite?: boolean;
    /**
     * The orientation of the scrolling. Can be `vertical` or `horizontal`
     * @default vertical
     */
    orientation?: Orientation;
    /**
     * The orientation of the gestures. Can be `vertical`, `horizontal` or `both`
     * @default vertical
     */
    gestureOrientation?: GestureOrientation;
    /** Fully-virtual mode: never adopt the wrapper's native scroll — not on
     *  native scroll events, and not in reset() when a lerp completes. */
    ignoreNativeScroll?: boolean;
    /**
     * The multiplier to use for mouse wheel events
     * @default 1
     */
    touchMultiplier?: number;
    /**
     * The multiplier to use for touch events
     * @default 1
     */
    wheelMultiplier?: number;
    /**
     * The fastest a wheel scroll may move the content, in px per ms; 0 is uncapped
     * @default 0
     */
    wheelMaxPxPerMs?: number;
    /**
     * The fastest a touch scroll or flick may move the content, in px per ms; 0 is uncapped
     * @default 0
     */
    touchMaxPxPerMs?: number;
    /**
     * Resize instance automatically
     * @default true
     */
    autoResize?: boolean;
    /**
     * Manually prevent scroll to be smoothed based on elements traversed by events
     */
    prevent?: (node: HTMLElement) => boolean;
    /**
     * Manually modify the events before they get consumed
     */
    virtualScroll?: (data: VirtualScroll.Data) => boolean;
    /**
     * Wether or not to enable overscroll on a nested Lenis instance, similar to CSS overscroll-behavior (https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior)
     * @default true
     */
    overscroll?: boolean;
    /**
     * If `true`, Lenis will not try to detect the size of the content and wrapper
     * @default false
     */
    autoRaf?: boolean;
    /**
     * If `true`, Lenis will automatically run `requestAnimationFrame` loop
     * @default false
     */
    anchors?: boolean | ScrollToOptions;
    /**
     * If `true`, Lenis will automatically start/stop based on wrapper's overflow property
     * @default false
     */
    autoToggle?: boolean;
    /**
     * If `true`, Lenis will allow nested scroll
     * @default false
     */
    allowNestedScroll?: boolean;
    /**
     * If `true`, Lenis will use naive dimensions calculation
     * @default false
     */
    __experimental__naiveDimensions?: boolean;
  };
  /** The options as resolved: every default filled, four left optional. */
  export type ResolvedOptions = OptionalPick<
    Required<Options>,
    'duration' | 'easing' | 'prevent' | 'virtualScroll' | 'onSequence'
  >;
  type OptionalPick<T, F extends keyof T> = Omit<T, F> & Partial<Pick<T, F>>;
}
