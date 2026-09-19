// VirtualScrollerAutoplay.ts — the reading creep, hosted by the scroller: the
// slow forward drift a post plays itself at, and the marquee's constant glide.
//
// The speed is the whole design. 1 px per 150 ms is the cadence the feel was
// tuned to, and the DELIVERY of that speed is what took the work:
//
//   - TIMER TICKS. The original: a 150 ms setTimeout writing +1 px targets,
//     smoothed by a re-targeted 0.45 s ease transition. That is a permanent
//     ~6.7 Hz velocity sawtooth plus timer jitter — irregularly-timed
//     device-pixel crossings, felt as judder on low-DPI screens.
//   - A SNAPPED INTEGRATOR. Metronome-regular, but whole-pixel ticks at
//     6.7 Hz still read as chop on dpr-1.
//   - CONSTANT-VELOCITY FRACTIONAL MOTION, per frame, unsnapped. The
//     compositor filters ~0.11 px/frame into an apparent glide. This is what
//     ships; the cost is slight text softness while creeping.
//
// Δt integrates truthfully rather than being clamped per frame: a loaded
// machine's 60→20 fps jitter stays time-correct, so every displayed position
// is where the clock says it should be. Clamping made the advance constant per
// FRAME, which at marquee speeds turns frame jitter into visible speed wobble.
// Only a genuine rAF suspension (a background tab) resumes as a fresh frame
// instead of a content jump.
//
// The hard seam is the HANDOFF with the wheel. The reader scrubs, the glide
// decays, and the creep must pick the content up without a stall: the moment
// a forward lerp's speed falls to cruise, the creep adopts the animated
// position right there and continues at cruise. Without it, play() waits for
// the lerp to decay all the way to zero — decelerate, stall, accelerate, felt
// as a stutter after every scrub. A backward scrub is the reader taking over
// and stops autoplay outright instead.
//
// Two rAF loops exist and only one is this class's. The scroller's frame loop
// drives Lenis; the creep runs its own, because at rest Lenis has nothing to
// animate and its loop should park. Both are cancelled together on a stop,
// which is why the owner exposes cancelLoopFrame.
import { ref, type ComputedRef, type Ref } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import type { Lenis } from '../../lenis/Lenis';

class $VirtualScrollerAutoplay {
  /** Reading-creep speed: ms of wall time per px of content — the original
   *  cadence (1px per 150ms tick ≈ 6.7px/s), now integrated per FRAME. */
  static readonly CREEP_MS_PER_PX = 150;

  /** The frame budget Δt falls back to: a first frame, or a resumed tab. */
  static readonly FRAME_MS = 16.7;

  /** Past this a gap is a rAF suspension, not a slow frame. */
  static readonly SUSPENDED_MS = 250;

  /** How often play() re-checks while the reader still owns the scroll. */
  static readonly DEFER_MS = 3;

  /** How close to the end still counts as the end. */
  static readonly END_SLACK_PX = 10;

  /** How long the end is held before the auto-repeat chain resets to the top. */
  /** The most creep the compositor is handed as ONE run. A creep runs to
   *  the end of the content in a single linear animation, because the text
   *  layer re-rasters where one animation ends and the next begins (a 1 px
   *  shift of the whole layer at every 2 s chunk boundary on the Galaxy,
   *  2026-09-18); this only bounds the numbers a very long list would put
   *  into one animation — ten minutes at reading speed. */
  static readonly RUN_MS = 600_000;

  /** With this much of the playing run left, the next one is chained. */
  static readonly CHAIN_AT_MS = 700;

  static readonly REPEAT_HOLD_MS = 10_000;

  // invariant: A hosted capability reaches its owner through an interface (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
  constructor(public owner: VirtualScrollerAutoplay.Owner) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $VirtualScrollerAutoplay;
  }

  /** Reactive autoplay state — true while the reading creep is armed.
   *  Consumers bind buttons to it; a reader's up-scroll flips it off. */
  get isPlaying() {
    return ref(false);
  }

  /** The creep's own rAF handle and the timestamp of its last frame — plain:
   *  nothing renders them, and the loop reads them every frame. */
  protected readonly creep = {
    frame: null as number | null,
    lastTs: null as number | null,
    /** the creep, not a flick, put the playing sequence on the compositor */
    composited: false,
    /** the speed the playing chunk (and any queued one) was built at */
    chunkMsPerPx: 0,
    /** the rate the run plays at now, as a multiple of the speed it was built at */
    rate: 1
  };

  /** The two deferral timers: resuming the creep, and the end-of-content repeat. */
  protected readonly timers = {
    resume: undefined as ReturnType<typeof setTimeout> | undefined,
    repeat: undefined as ReturnType<typeof setTimeout> | undefined
  };

  /** Whether a creep frame is pending — the landing reads it through the
   *  owner to tell the reader's own motion from a settling size wave. */
  get isCreeping(): boolean {
    return this.creep.frame !== null;
  }

  /** Speed as a SETTING: the optional creepMsPerPx prop overrides the tuned
   *  reading cadence (which stays the sacred default). A marquee reads a live
   *  value here every creep frame, so a speed slider takes effect mid-glide. */
  get msPerPx(): number {
    return this.owner.creepMsPerPxSetting ?? this.self.CREEP_MS_PER_PX;
  }

  /** The drag autoscroll's speed factor: a faster reading creep is a faster drag. */
  get factor(): number {
    return this.self.CREEP_MS_PER_PX / this.msPerPx;
  }

  start(delay = 500, callback = () => {}) {
    this.isPlaying.value = true;
    // A prior up-scroll leaves direction 'up', which gates the creep off —
    // pressing play IS the intent to read downward again.
    this.owner.scrollDirection.value = 'down';
    this.owner.restartLoop();
    this.timers.resume = setTimeout(() => {
      this.play();
      callback();
    }, delay);
  }

  stop(callback = () => {}) {
    this.isPlaying.value = false;
    this.releaseCreepCompositor();
    this.owner.cancelFrames();
    this.creep.lastTs = null;
    clearTimeout(this.timers.resume);
    callback();
  }

  /** Pretend a creep frame is pending — the seam a spec drives the
   *  "reader took over" branch through without running a real rAF. */
  markCreeping() {
    this.creep.frame = 1;
  }

  /** The reader's input settled — resume the creep after a tick. The caller
   *  checks that the creep is playing; a plain list never reaches here. */
  armResume() {
    clearTimeout(this.timers.resume);
    this.timers.resume = setTimeout(this.play, this.self.DEFER_MS);
  }

  /** The reader took the scroll — stop waiting to resume. */
  cancelResume() {
    clearTimeout(this.timers.resume);
  }

  /** Cancel the creep's own rAF if one is armed. The scroller's frame loop is
   *  the owner's to cancel — the two are stopped together. */
  cancelFrame() {
    if (this.creep.frame !== null) cancelAnimationFrame(this.creep.frame);
    this.creep.frame = null;
  }

  /** Resume the creep once the reader's input settles — deferring while it
   *  does not, and taking the glide over the moment it decays to cruise. */
  play() {
    if (this.owner.inputLive || this.owner.lerpRunning) {
      clearTimeout(this.timers.resume);
      // Forward inertia decaying through cruise speed hands off to the creep
      // RIGHT THERE — the glide never dips below cruise.
      if (this.adoptDecayedInertia()) return;
      this.timers.resume = setTimeout(this.play, this.self.DEFER_MS);
      return;
    }

    clearTimeout(this.timers.resume);
    // The reader is at rest — lenis has nothing to animate, so its raf loop
    // can stop too.
    this.owner.cancelFrames();
    this.creep.lastTs = null;
    this.creep.frame = requestAnimationFrame(this.creepStep);
  }

  /** The wheel-to-creep handoff (see the file header). True when the creep
   *  took the glide over; false leaves play() deferring. */
  protected adoptDecayedInertia(): boolean {
    const lenis = this.owner.lenis;
    // While input is still arriving, the reader owns the scroll — only a
    // free-decaying smooth lerp is a candidate.
    if (!lenis || this.owner.inputLive) return false;
    if (lenis.isScrolling !== 'smooth') return false;
    if (this.owner.scrollDirection.value !== 'down') return false;
    // px per millisecond, so the handoff happens at the same real speed
    // whatever the display's refresh rate is.
    const pxPerMs = lenis.velocityPerMs;
    if (pxPerMs <= 0 || pxPerMs > 1 / this.msPerPx) return false;
    // Adopt the CURRENT animated position (not the farther wheel target): the
    // lerp dies where it is and the creep continues from that exact pixel at
    // cruise speed — velocity is continuous through the handoff.
    lenis.adoptExternalScroll(lenis.animatedScroll);
    this.owner.parkLoopFrame();
    this.cancelFrame();
    this.creep.lastTs = null;
    this.creep.frame = requestAnimationFrame(this.creepStep);
    return true;
  }

  /** One creep frame: speed × Δt onto the target, written unsnapped. */
  creepStep(ts: number) {
    const owner = this.owner;
    this.creep.frame = null;
    if (owner.inputLive || owner.lerpRunning) {
      // Reader took over — hand back to play()'s defer loop, which resumes
      // the creep when the input settles.
      this.creep.lastTs = null;
      this.releaseCreepCompositor();
      this.play();
      return;
    }
    if (owner.scrollDirection.value !== 'down') {
      this.creep.lastTs = null;
      this.releaseCreepCompositor();
      return;
    }

    const elapsed = this.creep.lastTs === null ? this.self.FRAME_MS : ts - this.creep.lastTs;
    const dt = elapsed > this.self.SUSPENDED_MS ? this.self.FRAME_MS : elapsed;
    this.creep.lastTs = ts;
    const lenis = owner.lenis;
    if (!lenis) return;
    // While a run plays on the compositor the model MIRRORS what it shows,
    // instead of integrating its own frame gaps: a gap the model clamps (a
    // stall, a hidden tab) is time the compositor keeps, and a model that
    // integrated it fell behind the run — the scene slots, drawn from the
    // model, then held a chapter the tracks were not showing, and a finger,
    // which adopts the shown value, snapped the model forward and the scene
    // switched. Mirrored, the two cannot diverge.
    // invariant: The creep plays on the compositor as one linear run (examples/playground/src/lenis/lenis.invariants.md)
    const shown = this.creep.composited && lenis.compositorGlideActive ? lenis.compositorShown : undefined;
    if (shown !== undefined) lenis.targetScroll = shown;
    else lenis.targetScroll += dt / this.msPerPx;

    const atEnd =
      lenis.actualScroll + owner.containerSpan >= owner.scrollExtent.value - this.self.END_SLACK_PX;

    if (owner.autoRepeat && atEnd) {
      // End reached: stop creeping and let the auto-repeat chain own the
      // resumption (reset to top after a pause, then play again).
      clearTimeout(this.timers.repeat);
      this.releaseCreepCompositor();
      this.timers.repeat = setTimeout(() => this.repeatFromTop(), this.self.REPEAT_HOLD_MS);
      return;
    }

    clearTimeout(this.timers.repeat);
    if (this.usesCompositor(lenis)) {
      // The compositor draws a linear, FRACTIONAL sequence — at ~0.11 px per
      // frame its filtering is the motion; a snapped step would tick a whole
      // device pixel every 150 ms on a 1x screen — and the model only keeps
      // the window and the events.
      this.feedCompositor(lenis);
      lenis.animatedScroll = lenis.targetScroll;
      owner.setScrollPosition(-lenis.targetScroll, false);
    } else {
      owner.setScrollPosition(-lenis.targetScroll);
    }
    if (atEnd) {
      // Nothing left to creep into (the position write clamps at the end);
      // the next wheel re-arms play through the scroller.
      this.creep.lastTs = null;
      this.releaseCreepCompositor();
      return;
    }
    this.creep.frame = requestAnimationFrame(this.creepStep);
  }

  /** The creep plays on the compositor when the scroller's glide does — the
   *  same option — as one linear run: constant speed by construction,
   *  fractional, sequenced on the compositor's own clock. */
  protected usesCompositor(lenis: VirtualScrollerAutoplay.Integrator): boolean {
    return Boolean(lenis.options?.compositorGlide) && Boolean(lenis.canComposite);
  }

  /** The run of creep from `start`: constant speed to the end of the content
   *  (or the run cap), as the two endpoints and the time between them. */
  protected runFrom(start: number, lenis: VirtualScrollerAutoplay.Integrator): { values: number[]; durationMs: number } {
    const capPx = this.self.RUN_MS / this.msPerPx;
    const end = Math.min(lenis.limit ?? start + capPx, start + capPx);
    const distance = Math.max(0, end - start);
    return { values: [start, start + distance], durationMs: distance * this.msPerPx };
  }

  /** Keep the compositor fed: start a run from the model when nothing plays;
   *  only a run that hits its cap chains the next from its last value as it
   *  nears its end. A flick's glide on the layer is left alone until it ends. */
  // invariant: The creep plays on the compositor as one linear run (examples/playground/src/lenis/lenis.invariants.md)
  protected feedCompositor(lenis: VirtualScrollerAutoplay.Integrator) {
    // a new speed: the run keeps playing at a new rate — the multiple of the
    // speed it was built at — with its keyframes and its current time; it is
    // never ended for a speed change, because an animation ending under the
    // text layer re-rasters it (a 1 px shift on Chrome)
    const rate = this.creep.chunkMsPerPx / this.msPerPx;
    if (this.creep.composited && lenis.compositorGlideActive && rate !== this.creep.rate) {
      if (lenis.setCompositorRate) {
        lenis.setCompositorRate(rate);
        this.creep.rate = rate;
      } else this.releaseCreepCompositor();
    }
    if (!lenis.compositorGlideActive) {
      const run = this.runFrom(lenis.targetScroll, lenis);
      if (run.durationMs <= 0) return;
      const started = lenis.startCompositorSequence?.(run.values, { linear: true, durationMs: run.durationMs });
      if (started) {
        this.creep.composited = true;
        this.creep.chunkMsPerPx = this.msPerPx;
        this.creep.rate = 1;
      }
      return;
    }
    if (!this.creep.composited) return;
    if (lenis.compositorHasChained || (lenis.compositorRemainingMs ?? 0) > this.self.CHAIN_AT_MS) return;
    const playing = lenis.compositorPlaying;
    if (!playing) return;
    const run = this.runFrom(playing.lastValue, lenis);
    if (run.durationMs <= 0) return;
    lenis.startCompositorSequence?.(run.values, { after: playing.animation, linear: true, durationMs: run.durationMs });
  }

  /** The creep stops owning the layer: adopt what the compositor shows and let go. */
  protected releaseCreepCompositor() {
    if (!this.creep.composited) return;
    this.creep.composited = false;
    const lenis = this.owner.lenis;
    if (!lenis) return;
    lenis.releaseCompositor?.(true);
    // the adopt moved the rendered position to what the compositor showed;
    // the creep advances the TARGET, so the next chunk must start from there
    lenis.targetScroll = lenis.animatedScroll;
  }

  /** The auto-repeat chain: back to the top, pause, then read again. */
  protected repeatFromTop() {
    // the reset is a full-post jump: it arrives. Eased, it was 450 ms of
    // blank layer before the top appeared anyway.
    this.owner.setScrollPosition(0);
    this.timers.resume = setTimeout(() => {
      if (this.owner.scrollDirection.value === 'down') this.play();
    }, this.owner.autoPlayDelay);
  }

  dispose() {
    clearTimeout(this.timers.resume);
    clearTimeout(this.timers.repeat);
    this.cancelFrame();
  }
}

export namespace VirtualScrollerAutoplay {
  export const $Class = Static($VirtualScrollerAutoplay); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — the scroller hosts one
  export type Instance = typeof Class.Instance;

  /** The whole of what the creep reads off the scroll integrator — named
   *  here rather than as Lenis itself, so the handoff is provable against a
   *  few fields instead of a scroll engine. Lenis satisfies it. */
  export interface Integrator {
    /** where the content is heading — the creep advances this */
    targetScroll: number;
    /** where the content is right now — what the handoff adopts */
    animatedScroll: number;
    /** the browser's own offset — the end test reads it */
    readonly actualScroll: number;
    /** px per animation frame, signed: positive forward */
    readonly velocity: number;
    /** px per millisecond, signed — the refresh-rate independent speed */
    readonly velocityPerMs: number;
    /** false at rest; 'smooth' while a lerp travels */
    readonly isScrolling: Lenis.Scrolling;
    /** take this position as the current one, killing any lerp in flight */
    adoptExternalScroll(scroll: number): void;
    /* The compositor seam — present on the fork, absent on a spec's fake; the
     * creep takes the compositor path only when `options.compositorGlide` says so. */
    /** the compositor glide option — the creep plays there when the glide does */
    readonly options?: { compositorGlide?: boolean };
    /** whether the layer can take a compositor sequence at all */
    readonly canComposite?: boolean;
    /** the compositor's keyframe step, ms */
    readonly keyframeMs?: number;
    readonly compositorGlideActive?: boolean;
    readonly compositorHasChained?: boolean;
    readonly compositorRemainingMs?: number;
    readonly compositorPlaying?: { animation: Animation; lastValue: number } | null;
    /** the end of the scrollable range — a run is built to it */
    readonly limit?: number;
    /** change the playing run's speed in place, as a multiple of the speed it was built at */
    setCompositorRate?(rate: number): void;
    /** the value the compositor is showing while a sequence plays — the model mirrors it */
    readonly compositorShown?: number;
    startCompositorSequence?(
      values: number[],
      options?: { after?: Animation | null; linear?: boolean; durationMs?: number | null }
    ): Animation | null;
    releaseCompositor?(adopt: boolean): void;
  }

  /** What the creep needs from the scroller that hosts it. */
  export interface Owner {
    /** The scroll integrator the creep advances and reads its glide from. */
    readonly lenis: Integrator | null;
    /** Which way the reader last went — the creep only runs downward. */
    readonly scrollDirection: Ref<string>;
    /** Input is still arriving: the creep defers rather than fighting it. */
    readonly inputLive: boolean;
    /** A lerp is still travelling: the creep defers, or takes it over at cruise. */
    readonly lerpRunning: boolean;
    /** The frame's main-axis size, for the end test. */
    readonly containerSpan: number;
    /** The whole content's scrollable size, for the end test. */
    readonly scrollExtent: ComputedRef<number>;
    /** The creep speed the author set, if any — unset means the tuned cadence. */
    readonly creepMsPerPxSetting: number | undefined;
    /** Whether reaching the end restarts from the top. */
    readonly autoRepeat: boolean;
    /** How long the pause before reading resumes. */
    readonly autoPlayDelay: number;
    setScrollPosition(position: number, translateY?: boolean): void;
    /** Start the scroller's own frame loop — pressing play wakes Lenis. */
    restartLoop(): void;
    /** Cancel both rAF loops: the scroller's frame loop and the creep's. */
    cancelFrames(): void;
    /** Park the scroller's frame loop without disarming its re-arm check —
     *  the handoff cancels the Lenis frame while the creep takes over. */
    parkLoopFrame(): void;
  }
}
