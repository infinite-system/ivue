import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { ChatShell } from '../../../../../examples/playground/src/examples/ai-chat/ChatShell';
import { Reactive } from '../../../../../examples/playground/src/ivue';
import { Static } from '../../../../../lib/Static';

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
  /** How many ms of frames the report holds. */
  static readonly TRACE_MS = 4000;

  /** Frames kept either side of the motion in the report. */
  static readonly SPAN_MARGIN_FRAMES = 8;

  /** How long the copy button says "copied". */
  static readonly COPIED_MS = 1500;

  constructor() {
    // the shell mounts, then its view mounts a beat later; the moment the
    // scroller is reachable, read the settings it shipped with
    watch(
      () => this.scroller,
      (scroller) => this.onScrollerReady(scroller),
      { immediate: true }
    );
      // the frame meter: what rate the page actually renders at, read off
    // requestAnimationFrame itself — the number a glide's smoothness is
    // bounded by, and the one a phone never tells you
    onMounted(() => this.startFrameMeter());
    onBeforeUnmount(() => this.stopFrameMeter());
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ExampleFeelToggle;
  }

  /** Bookkeeping the meter keeps between frames — plain, never rendered:
   *  the last second of frame stamps for the rate, and the last seconds
   *  of (time, position) for the report. */
  protected readonly meter = {
    handle: 0,
    stamps: [] as number[],
    lastAt: 0,
    worstGap: 0,
    trace: [] as Array<{ at: number; position: number; target: number }>
  };

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

  /** A flick's glide plays on the compositor as held, snapped keyframes, the
   *  way a native fling renders: no callback timing in the loop. 'on' is the
   *  shipped scroller; 'off' is the JavaScript-timed glide, for comparison. */
  get compositorGlide() {
    return ref<'off' | 'on'>('on');
  }

  get compositorGlideOptions(): Array<'off' | 'on'> {
    return ['off', 'on'];
  }

  /** The report shown on the strip when no copy path worked — empty means hidden. */
  get reportText() {
    return ref('');
  }

  get showsReport(): boolean {
    return this.reportText.value !== '';
  }

  /** The report was just copied — the button says so for a moment. */
  get copied() {
    return ref(false);
  }

  /** Frames rendered in the last second — the page's real refresh rate. */
  get frameRate() {
    return ref(0);
  }

  /** The longest gap between two frames in the last second, in ms. */
  get worstGapMs() {
    return ref(0);
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

  get copyLabel(): string {
    return this.copied.value ? 'copied' : 'copy log';
  }

  /** The meter's line on the strip: rate and worst gap, or nothing until a second has passed. */
  get frameLabel(): string {
    if (!this.frameRate.value) return '';
    return `${this.frameRate.value} fps · worst gap ${this.worstGapMs.value} ms`;
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
    const options = this.scroller?.lenis?.options;
    if (options) {
      this.pixels.value = options.pixelSnap === false ? 'fraction' : 'device';
      this.layerReset.value = options.safariLayerReset === false ? 'off' : 'on';
      this.compositorGlide.value = options.compositorGlide ? 'on' : 'off';
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

  pickCompositorGlide(value: 'off' | 'on') {
    this.compositorGlide.value = value;
    this.scroller?.lenis?.tune?.({ compositorGlide: value === 'on' });
  }

  isCompositorGlide(value: string) {
    return this.compositorGlide.value === value;
  }

  /* ---- the frame meter and the report ---- */

  protected startFrameMeter() {
    this.meter.handle = requestAnimationFrame((time) => this.onFrame(time));
  }

  protected stopFrameMeter() {
    cancelAnimationFrame(this.meter.handle);
  }

  /** One frame: keep a second of stamps and a few seconds of positions; publish the rate once a second. */
  protected onFrame(time: number) {
    const meter = this.meter;
    const self = this.self;
    if (meter.lastAt) meter.worstGap = Math.max(meter.worstGap, time - meter.lastAt);
    meter.lastAt = time;
    meter.stamps.push(time);
    while (time - meter.stamps[0] > 1000) meter.stamps.shift();
    // the RENDERED position — what the glide draws this frame — beside the model's target
    const lenis = this.scroller?.lenis;
    meter.trace.push({
      at: time,
      position: lenis?.animatedScroll ?? this.scroller?.scrollPosition ?? 0,
      target: lenis?.targetScroll ?? 0
    });
    while (time - meter.trace[0].at > self.TRACE_MS) meter.trace.shift();
    if (time - meter.stamps[0] >= 950 && Math.round(time) % 4 === 0) {
      this.frameRate.value = meter.stamps.length;
      this.worstGapMs.value = Math.round(meter.worstGap);
      meter.worstGap = 0;
    }
    meter.handle = requestAnimationFrame((next) => this.onFrame(next));
  }

  /** The report as text: the device, the knobs, the rate, then one line per
   *  frame of the last seconds — time, gap to the previous frame, the RENDERED
   *  position (Lenis's animated scroll, what the frame drew), its move, and the
   *  model's target — so a glide can be read frame by frame off the phone. */
  buildReport(): string {
    const trace = this.motionSpan(this.meter.trace);
    const head = [
      `ua: ${navigator.userAgent}`,
      `dpr: ${devicePixelRatio} · viewport: ${innerWidth}×${innerHeight}`,
      `knobs: ${this.glide.value} · carry ${this.carry.value} · pixels ${this.pixels.value} · reset ${this.layerReset.value}`,
      `rate: ${this.frameRate.value} fps · worst gap ${this.worstGapMs.value} ms · frames in the moving span: ${trace.length}`,
      't(ms)  gap(ms)  rendered  move  target   (the meter reads before the scroller steps: a move belongs to the gap on the line above)'
    ];
    const first = trace[0]?.at ?? 0;
    const lines = trace.map((frame, index) => {
      const previous = trace[index - 1];
      const gap = previous ? (frame.at - previous.at).toFixed(1) : '-';
      const move = previous ? (frame.position - previous.position).toFixed(3) : '-';
      return `${(frame.at - first).toFixed(1)}\t${gap}\t${frame.position.toFixed(3)}\t${move}\t${frame.target.toFixed(1)}`;
    });
    return [...head, ...lines].join('\n');
  }

  /** Copy the report: the clipboard API on a secure page, the legacy copy
   *  command on a plain-http LAN page (the phones reach the dev server that
   *  way), and when both refuse, the report opens on the strip to select by hand. */
  /** The frames that moved, with a margin either side — at 120 Hz the 4-second
   *  window is 480 lines and a glide sits near its start, so a partial paste
   *  loses exactly the part that matters. A window with no motion is returned whole. */
  protected motionSpan(trace: Array<{ at: number; position: number; target: number }>) {
    const margin = this.self.SPAN_MARGIN_FRAMES;
    let first = -1;
    let last = -1;
    for (let index = 1; index < trace.length; index++) {
      if (trace[index].position !== trace[index - 1].position) {
        if (first < 0) first = index;
        last = index;
      }
    }
    if (first < 0) return trace;
    return trace.slice(Math.max(0, first - margin), Math.min(trace.length, last + margin + 1));
  }

  async copyReport() {
    const report = this.buildReport();
    const copied = (await this.writeClipboard(report)) || this.copyThroughCommand(report);
    if (!copied) {
      this.reportText.value = report;
      return;
    }
    this.copied.value = true;
    setTimeout(() => this.onCopiedShown(), this.self.COPIED_MS);
  }

  closeReport() {
    this.reportText.value = '';
  }

  protected async writeClipboard(text: string): Promise<boolean> {
    if (!navigator.clipboard?.writeText) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  protected copyThroughCommand(text: string): boolean {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    area.remove();
    return copied;
  }

  protected onCopiedShown() {
    this.copied.value = false;
  }
}

export namespace ExampleFeelToggle {
  export const $Class = Static($ExampleFeelToggle); // anchor — it declares statics
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
