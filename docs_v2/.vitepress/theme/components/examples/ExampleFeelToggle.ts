import { ref, watch } from 'vue';
import type { ChatShell } from '../../../../../examples/playground/src/examples/ai-chat/ChatShell';
import { Reactive } from '../../../../../examples/playground/src/ivue';

/**
 * Docs chrome, not a scroller feature: a strip of buttons that re-tunes the
 * live scroller's feel so the two choices that can only be judged by hand —
 * how a flick comes to rest, and how far it carries — can be swapped on the
 * device without an edit and a reload.
 *
 * It reaches the scroller along the exposed chain — the shell's template
 * ref, the shell's mounted view, the view's scroller — which is what keeps
 * it chrome: the example under it is the shipped component, configured
 * exactly as a consumer would get it, and nothing about this strip is in
 * its contract. Both settings are live through `lenis.tune`, so a press
 * takes effect on the very next frame with the scroll position and the
 * window untouched.
 *
 * The chain is the standard's own unwrapping surface (`defineExpose` +
 * template refs), and it exists in a production build. The first version
 * read `element.__vueParentComponent`, a Vue dev-build internal: on the
 * built site every button highlighted and none of them tuned anything.
 */
class $ExampleFeelToggle {
  constructor() {
    // the shell mounts, then its view mounts a beat later; the moment the
    // scroller is reachable, read the settings it shipped with
    watch(
      () => this.scroller,
      (scroller) => this.onScrollerReady(scroller),
      { immediate: true }
    );
  }

  /** The shell beneath the strip — a template ref the SFC binds. */
  get shell() {
    return ref<ChatShell.Exposed | null>(null);
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

  /** Where the transform is written: on the device-pixel grid (the shipped
   *  scroller, where a browser's own scroll offset lands) or to the fraction.
   *  Judged by eye at the slow tail of a glide: the fraction shimmers. */
  get pixels() {
    return ref<'fraction' | 'device'>('device');
  }

  /** The Safari-only layer reset before every write. 'off' is the shipped
   *  scroller (a raster made once, moved whole); 'on' restores the old
   *  per-frame re-raster. Only Safari is affected; on Chrome the two are the same. */
  get layerReset() {
    return ref<'on' | 'off'>('off');
  }

  /** Whether the strip has something to drive yet — the chain has mounted. */
  get isLive(): boolean {
    return this.scroller !== null;
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

  get pixelOptions(): Array<'fraction' | 'device'> {
    return ['fraction', 'device'];
  }

  get layerResetOptions(): Array<'on' | 'off'> {
    return ['on', 'off'];
  }

  /** The scroller the strip drives: shell → mounted view → its scroller,
   *  null until the chain has mounted. */
  protected get scroller() {
    return this.shell.value?.view?.scroller ?? null;
  }

  /** The chain has just resolved (or been torn down): read the shipped feel once it is there. */
  protected onScrollerReady(scroller: unknown) {
    if (scroller) this.readShipped();
  }

  protected readShipped() {
    const shipped = this.scroller?.props?.scroll;
    if (shipped?.touch?.glide) this.glide.value = shipped.touch.glide as 'friction' | 'exponential';
    if (typeof shipped?.touch?.carry === 'number') this.carry.value = shipped.touch.carry;
    const options = (this.scroller?.lenis as { options?: { pixelSnap?: boolean; safariLayerReset?: boolean } } | undefined)?.options;
    if (options) {
      this.pixels.value = options.pixelSnap === false ? 'fraction' : 'device';
      this.layerReset.value = options.safariLayerReset === false ? 'off' : 'on';
    }
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

  pickPixels(value: 'fraction' | 'device') {
    this.pixels.value = value;
    this.scroller?.lenis?.tune?.({ pixelSnap: value === 'device' });
  }

  pickLayerReset(value: 'on' | 'off') {
    this.layerReset.value = value;
    this.scroller?.lenis?.tune?.({ safariLayerReset: value === 'on' });
  }

  /** Whether a button is the live one — the template asks by name, never with a comparison. */
  isGlide(value: string) {
    return this.glide.value === value;
  }

  isCarry(value: number) {
    return this.carry.value === value;
  }

  isPixels(value: string) {
    return this.pixels.value === value;
  }

  isLayerReset(value: string) {
    return this.layerReset.value === value;
  }
}

export namespace ExampleFeelToggle {
  export const $Class = $ExampleFeelToggle;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
