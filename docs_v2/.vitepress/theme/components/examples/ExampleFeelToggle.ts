import { onMounted, ref } from 'vue';
import { Reactive } from '../../../../../examples/playground/src/ivue';

/**
 * Docs chrome, not a scroller feature: a strip of buttons that re-tunes the
 * live scroller's feel so the two choices that can only be judged by hand —
 * how a flick comes to rest, and how each step meets the device-pixel grid —
 * can be swapped on the device without an edit and a reload.
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

  /** How a flick comes to rest. */
  get glide() {
    return ref<'friction' | 'exponential'>('friction');
  }

  /** How the applied translate meets the device-pixel grid. */
  get snap() {
    return ref<'auto' | 'grid' | 'fractional'>('fractional');
  }

  /** What the strip offers, in the order it offers it. */
  get glideOptions(): Array<'friction' | 'exponential'> {
    return ['friction', 'exponential'];
  }

  get snapOptions(): Array<'auto' | 'grid' | 'fractional'> {
    return ['auto', 'grid', 'fractional'];
  }

  /** The scroller the strip drives — found once the example beneath has mounted. */
  protected get scroller() {
    const frame = document.querySelector(this.selector) as
      | (Element & { __vueParentComponent?: { setupState?: Record<string, unknown> } })
      | null;
    return (frame?.__vueParentComponent?.setupState?.virtualScroller ?? null) as {
      lenis?: { tune?: (options: Record<string, unknown>) => void };
    } | null;
  }

  protected onMount() {
    // the example mounts its own tree first; read the settings it shipped with
    // so the strip opens showing the truth rather than its own guesses
    window.setTimeout(() => this.readShipped(), 600);
  }

  protected readShipped() {
    const model = this.scroller as { props?: { scroll?: { snap?: string; touch?: { glide?: string } } } } | null;
    const shipped = model?.props?.scroll;
    if (shipped?.snap) this.snap.value = shipped.snap as 'auto' | 'grid' | 'fractional';
    if (shipped?.touch?.glide)
      this.glide.value = shipped.touch.glide as 'friction' | 'exponential';
  }

  pickGlide(value: 'friction' | 'exponential') {
    this.glide.value = value;
    this.scroller?.lenis?.tune?.({ syncTouchGlide: value });
  }

  pickSnap(value: 'auto' | 'grid' | 'fractional') {
    this.snap.value = value;
    this.scroller?.lenis?.tune?.({ renderSnap: value });
  }

  /** Whether a button is the live one — the template asks by name, never with a comparison. */
  isGlide(value: string) {
    return this.glide.value === value;
  }

  isSnap(value: string) {
    return this.snap.value === value;
  }
}

export namespace ExampleFeelToggle {
  export const $Class = $ExampleFeelToggle;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
