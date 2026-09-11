import { Static } from '../Static';
import { LenisUtils } from './LenisUtils';

/**
 * Animate — a value animated by lerp or easing, under an optional speed cap
 *
 * @example
 * const animate = new Animate.Class()
 * animate.fromTo(0, 100, { duration: 1, easing: (t) => t })
 * animate.advance(0.5) // 50
 */
class $Animate {
  /** a lerp this close to its target is complete — half a pixel, the band `Math.round` gave integer targets */
  static readonly SETTLE_PX = 0.5;

  isRunning = false;
  value = 0;
  from = 0;
  to = 0;
  currentTime = 0;

  // These are instanciated in the fromTo method
  lerp?: number;
  duration?: number;
  easing?: Animate.EasingFunction;
  maxPxPerMs?: number;
  onUpdate?: Animate.OnUpdateCallback;

  /**
   * Advance the animation by the given delta time
   *
   * @param deltaTime - The time in seconds to advance the animation
   */
  advance(deltaTime: number) {
    if (!this.isRunning) return;

    let completed = false;
    const previous = this.value;

    if (this.duration && this.easing) {
      this.currentTime += deltaTime;
      const linearProgress = LenisUtils.Class.clamp(0, this.currentTime / this.duration, 1);

      completed = linearProgress >= 1;
      const easedProgress = completed ? 1 : this.easing(linearProgress);
      this.value = this.from + (this.to - this.from) * easedProgress;
    } else if (this.lerp) {
      this.value = LenisUtils.Class.damp(this.value, this.to, this.lerp * 60, deltaTime);
      // Within half a pixel the lerp is done and snaps. Upstream tested
      // `Math.round(value) === to`, which a fractional target — a shifted
      // lerp, a rebased offset — can never satisfy: the animation then runs
      // forever at a velocity of 1e-6 px and the scroller never rests.
      if (Math.abs(this.value - this.to) < Animate.$Class.SETTLE_PX) {
        this.value = this.to;
        completed = true;
      }
    } else {
      // If no easing or lerp, just jump to the end value
      this.value = this.to;
      completed = true;
    }

    // The speed cap: the value moves no more than maxPxPerMs × elapsed
    // per advance, whatever the lerp or the easing asked for. A capped
    // frame is never the last one — the animation keeps running at the
    // cap until it reaches its target.
    if (this.maxPxPerMs && this.maxPxPerMs > 0) {
      const maxStep = this.maxPxPerMs * deltaTime * 1000;
      const step = this.value - previous;
      if (Math.abs(step) > maxStep) {
        this.value = previous + Math.sign(step) * maxStep;
        completed = false;
      }
    }

    if (completed) {
      this.stop();
    }

    // Call the onUpdate callback with the current value and completed status
    this.onUpdate?.(this.value, completed);
  }

  /** Stop the animation */
  /** Move a running lerp bodily: the content it travels over shifted
   *  under it, so its origin, its value and its target shift by the same
   *  amount and the remaining distance stays what it was. */
  shift(delta: number) {
    this.from += delta;
    this.value += delta;
    this.to += delta;
  }

  stop() {
    this.isRunning = false;
  }

  /**
   * Set up the animation from a starting value to an ending value
   * with optional parameters for lerping, duration, easing, and onUpdate callback
   *
   * @param from - The starting value
   * @param to - The ending value
   * @param options - Options for the animation
   */
  fromTo(
    from: number,
    to: number,
    { lerp, duration, easing, maxPxPerMs, onStart, onUpdate }: Animate.FromToOptions
  ) {
    this.from = this.value = from;
    this.to = to;
    this.lerp = lerp;
    this.duration = duration;
    this.easing = easing;
    this.maxPxPerMs = maxPxPerMs;
    this.currentTime = 0;
    this.isRunning = true;

    onStart?.();
    this.onUpdate = onUpdate;
  }
}

export namespace Animate {
  export const $Class = Static($Animate); // anchored — the settle band is a static
  export let Class = $Class; // plain — no reactive state, no Reactive()
  // raw-instance type — fields, parameters, returns
  export type Model = InstanceType<typeof Class>;
  // the type of an unwrapping surface (none here; kept for the manifest)
  export type Instance = InstanceType<typeof Class>;

  export type EasingFunction = (time: number) => number;
  export type OnUpdateCallback = (value: number, completed: boolean) => void;
  export type OnStartCallback = () => void;

  export type FromToOptions = {
    /**
     * Linear interpolation (lerp) intensity (between 0 and 1)
     * @default 0.1
     */
    lerp?: number;
    /**
     * The most the value may move per millisecond; 0 is uncapped
     * @default 0
     */
    maxPxPerMs?: number;
    /**
     * The duration of the scroll animation (in s)
     * @default 1
     */
    duration?: number;
    /**
     * The easing function to use for the scroll animation
     * @default (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
     */
    easing?: EasingFunction;
    /**
     * Called when the scroll starts
     */
    onStart?: OnStartCallback;
    /**
     * Called when the scroll progress changes
     */
    onUpdate?: OnUpdateCallback;
  };
}
