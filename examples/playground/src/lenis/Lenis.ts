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
  // invariant: A flick's velocity is read off the finger's last stretch (examples/playground/src/lenis/lenis.invariants.md)
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
    this.animate.stop();
    this.isScrolling = false;
    this.lastVelocity = this.velocity = 0;
    this.animatedScroll = this.targetScroll = scroll;
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
  shiftBy(delta: number) {
    this.targetScroll += delta;
    this.animatedScroll += delta;
    if (this.animate.isRunning) this.animate.shift(delta);
    this.setScroll(this.scroll);
  }

  protected setScroll(scroll: number) {
    // behavior: 'instant' bypasses the scroll-behavior CSS property

    scroll -= this.renderOffset;

    // SNAP BY SPEED. Fast motion (a device pixel or more per frame) is
    // written on the device-pixel grid; slow motion is written fractional.
    //   - Fractional at speed re-rasterizes the layer at a new sub-pixel
    //     offset as tiles are repainted, and Chrome snaps each text line
    //     and box edge to whole device pixels independently at every
    //     re-raster: rows whose layout tops carry different fractions
    //     shift by a pixel relative to their neighbours mid-glide (seen as
    //     "some elements hop 1px" on wheel scrolls). On the grid the
    //     raster offset never changes, so every row keeps its snap.
    //   - Snapped at the slow tail (velocity decaying below ~1 device
    //     px/frame) turns the exponential decay into whole-pixel steps at
    //     stretching, IRREGULAR intervals — a visible chop just before the
    //     creep takes over, worst on dpr-1 screens. Fractional there, the
    //     compositor filters the sub-pixel motion into an apparent glide.
    // The renderOffset rebasing keeps this value small (≤ ~131k px), where
    // f32 still resolves sub-pixel fractions. Resting positions stay crisp
    // regardless: scrollTo rounds its targets, so completed inertia lands
    // on integers.
    const dpr = window.devicePixelRatio || 1;
    const fast = Math.abs(this.velocity) * dpr >= 1;
    const rendered = fast ? Math.round(scroll * dpr) / dpr : scroll;

    if (this.isHorizontal) {
      (this.options.content as HTMLElement).style.transform = `translateX(${-rendered}px)`;
    } else {
      if (this.self.IS_SAFARI) {
        /** Safari mis-renders long translated content unless the layer is
         *  reset before every write — the original workaround. It is
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
        // The touch is pending: the glide runs on. The trail is seeded at
        // the animated position now and re-seeded at the first move, so a
        // whole swipe Android coalesces into one move still has a span.
        this.touchPending = true;
        this.touchTrail = [{ at: now, position: this.animatedScroll }];
        this.trace?.('touch pending: glide runs on');
        return;
      }
      if (this.touchPending && event.type === 'touchmove') {
        // The finger takes over from where the content IS: the glide's
        // target, hundreds of px ahead, is dropped.
        this.touchPending = false;
        // invariant: A flick carries the glide it interrupted (examples/playground/src/lenis/lenis.invariants.md)
        this.carriedVelocity = this.velocity;
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

    const isUnknownGesture =
      (this.options.gestureOrientation === 'vertical' && deltaY === 0) ||
      (this.options.gestureOrientation === 'horizontal' && deltaX === 0);

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

    let flickVelocity = this.velocity;
    let trailLength = 0;
    if (isTouch) {
      // The touchstart seeded the trail above.
      if (event.type === 'touchmove') {
        this.touchTrail.push({ at: now, position: this.targetScroll + delta });
        this.self.trimTrail(this.touchTrail, now, this.self.FLICK_WINDOW_MS);
      } else if (isTouchEnd) {
        trailLength = this.touchTrail.length;
        flickVelocity = this.self.carryVelocity(
          this.self.trailVelocity(this.touchTrail, this.velocity),
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

    this.scrollTo(this.targetScroll + delta, {
      programmatic: false,
      ...(isSyncTouch
        ? {
            lerp: hasTouchInertia ? this.options.syncTouchLerp : 1
            // immediate: !hasTouchInertia,
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
  raf(time: number) {
    const deltaTime = time - (this.time || time);
    this.time = time;

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
      userData
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
    target = Math.round(target);

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

    if (immediate) {
      this.animatedScroll = this.targetScroll = target;
      this.setScroll(this.scroll);
      this.reset();
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
      scroll = this.getTranslateY(node as HTMLElement);
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
    'duration' | 'easing' | 'prevent' | 'virtualScroll'
  >;
  type OptionalPick<T, F extends keyof T> = Omit<T, F> & Partial<Pick<T, F>>;
}
