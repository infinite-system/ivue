import { onMounted, ref } from 'vue';
import { Reactive } from '../../../../../examples/playground/src/ivue';

/**
 * Docs chrome, not a scroller feature: a strip of buttons that re-tunes the
 * live scroller's feel so the two choices that can only be judged by hand —
 * how a flick comes to rest, and how far it carries — can be swapped on the
 * device without an edit and a reload.
 *
 * It reaches the mounted instance through the DOM rather than a prop, which
 * is what keeps it chrome: the example under it is the shipped component,
 * configured exactly as a consumer would get it, and nothing about this
 * strip is in its contract. Both settings are live through `lenis.tune`, so
 * a press takes effect on the very next frame with the scroll position and
 * the window untouched.
 */
class $ExampleFeelToggle {
  constructor(public selector: string) {
    onMounted(() => this.onMount());
  }

  /** How a flick comes to rest. Judged on the devices: 'exponential' reads
   *  as the iPhone's own fling, 'friction' as Android's. */
  get glide() {
    return ref<'friction' | 'exponential'>('friction');
  }

  /** How many 60 Hz frames of the finger's own speed a flick carries. */
  get carry() {
    return ref(35);
  }

  /** What the strip offers, in the order it offers it. */
  get glideOptions(): Array<'friction' | 'exponential'> {
    return ['friction', 'exponential'];
  }

  /** 16 is what the browser's own fling measures at — same launch speed, it
   *  travels 310 px where 35 travels 491; 24 and 30 are the steps between. */
  get carryOptions(): number[] {
    return [16, 24, 30, 35];
  }

  /** The scroller the strip drives — found once the example beneath has mounted. */
  protected get scroller() {
    const frame = document.querySelector(this.selector) as
      (Element & { __vueParentComponent?: { setupState?: Record<string, unknown> } }) | null;
    return (frame?.__vueParentComponent?.setupState?.virtualScroller ?? null) as {
      lenis?: { tune?: (options: Record<string, unknown>) => void };
      props?: { scroll?: { touch?: { launch?: number } } };
    } | null;
  }

  protected onMount() {
    // the example mounts its own tree first; read the settings it shipped with
    // so the strip opens showing the truth rather than its own guesses
    window.setTimeout(() => this.readShipped(), 600);
  }

  protected readShipped() {
    const model = this.scroller as {
      props?: { scroll?: { touch?: { glide?: string; carry?: number } } };
    } | null;
    const shipped = model?.props?.scroll;
    if (shipped?.touch?.glide) this.glide.value = shipped.touch.glide as 'friction' | 'exponential';
    if (typeof shipped?.touch?.carry === 'number') this.carry.value = shipped.touch.carry;
  }

  /** The launch ratio the scroller shipped with — the flick leaves the finger
   *  at this much of its speed, and carry alone decides how long it keeps it. */
  protected shippedLaunch(): number {
    return this.scroller?.props?.scroll?.touch?.launch ?? 1;
  }

  pickGlide(value: 'friction' | 'exponential') {
    this.glide.value = value;
    this.scroller?.lenis?.tune?.({ syncTouchGlide: value });
  }

  /**
   * Carry is stated in 60 Hz frames of the finger's own speed, and the lerp
   * is derived from it — `launch / carry` — so a flick always leaves the
   * finger at the same speed and only the distance changes. Tuning the
   * multiplier without the lerp would change the launch too, and the strip
   * would be moving two things behind one label.
   */
  pickCarry(value: number) {
    this.carry.value = value;
    this.scroller?.lenis?.tune?.({
      touchInertiaMultiplier: value,
      syncTouchLerp: this.shippedLaunch() / value
    });
  }

  /** Whether a button is the live one — the template asks by name, never with a comparison. */
  isGlide(value: string) {
    return this.glide.value === value;
  }

  isCarry(value: number) {
    return this.carry.value === value;
  }
}

export namespace ExampleFeelToggle {
  export const $Class = $ExampleFeelToggle;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
