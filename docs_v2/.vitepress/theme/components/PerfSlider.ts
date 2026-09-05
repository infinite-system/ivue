// PerfSlider.ts — a dependency-free slide carousel's model. Each direct
// child element of the default slot becomes one slide; dots navigate,
// arrows step, swipe works on touch — EXCEPT on narrow screens, where
// slides often contain horizontally scrollable tables: there a horizontal
// pan must scroll the table, never flick the slide, so swipe is disabled
// and the arrows move under the slide beside the dots. No autoplay —
// numbers are for reading, not for racing.
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useSlots, type Slots } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';

class $PerfSlider {
  /* Knobs — STATIC */

  static get NARROW_SCREEN_QUERY() {
    return '(max-width: 719px)';
  }

  /** Horizontal travel (px) below which a touch is a tap, not a swipe. */
  static get SWIPE_THRESHOLD_PX() {
    return 40;
  }

  /** The default slot, read once at setup — the slides are its children. */
  constructor(readonly slots: Slots = useSlots()) {
    onMounted(() => this.measureActiveSlide());
    onBeforeUnmount(() => this.disconnect());
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $PerfSlider;
  }

  // MUTABLE STATE
  get activeIndex() {
    return ref(0);
  }

  get viewportHeight() {
    return ref<number | null>(null);
  }

  /** The observer that keeps the viewport honest when late content
   *  (images, fonts) changes the active slide's height. */
  get resizeObserver() {
    return shallowRef<ResizeObserver | null>(null);
  }

  get touchStartX() {
    return ref(0);
  }

  // TEMPLATE-REF TARGET
  get trackElement() {
    return ref<HTMLElement | null>(null);
  }

  // DERIVED — plain getters
  get slideCount() {
    const children = this.slots.default?.() ?? [];
    return children.filter((node) => typeof node.type !== 'symbol').length;
  }

  /** The viewport follows the ACTIVE slide's height, so a short slide is
   *  not padded out to the tallest sibling's. */
  get viewportStyle() {
    return this.viewportHeight.value !== null ? { height: `${this.viewportHeight.value}px` } : {};
  }

  get trackStyle() {
    return { transform: `translateX(-${this.activeIndex.value * 100}%)` };
  }

  get isNarrowScreen() {
    return typeof window !== 'undefined' && window.matchMedia(this.self.NARROW_SCREEN_QUERY).matches;
  }

  /** Whether a dot (1-based, as `v-for="index in slideCount"` counts) is the active slide. */
  isActiveSlide(index: number) {
    return index - 1 === this.activeIndex.value;
  }

  slideLabel(index: number) {
    return `Slide ${index}`;
  }

  // ACTIONS
  goTo(index: number) {
    const count = this.slideCount;
    this.activeIndex.value = ((index % count) + count) % count;
    void nextTick(() => this.measureActiveSlide());
  }

  /** Jump to a dot (1-based). */
  goToSlide(index: number) {
    this.goTo(index - 1);
  }

  previous() {
    this.goTo(this.activeIndex.value - 1);
  }

  next() {
    this.goTo(this.activeIndex.value + 1);
  }

  measureActiveSlide() {
    const slide = this.trackElement.value?.children[this.activeIndex.value] as HTMLElement | undefined;
    if (!slide) return;
    this.viewportHeight.value = slide.offsetHeight;
    this.observe(slide);
  }

  observe(slide: HTMLElement) {
    if (typeof ResizeObserver === 'undefined') return;
    this.disconnect();
    const observer = new ResizeObserver(() => this.measure(slide));
    observer.observe(slide);
    this.resizeObserver.value = observer;
  }

  measure(slide: HTMLElement) {
    this.viewportHeight.value = slide.offsetHeight;
  }

  disconnect() {
    this.resizeObserver.value?.disconnect();
    this.resizeObserver.value = null;
  }

  onTouchStart(event: TouchEvent) {
    this.touchStartX.value = event.touches[0]?.clientX ?? 0;
  }

  /** On narrow screens a horizontal pan belongs to the slide's own
   *  scrollable content (tables) — never steal it for slide navigation. */
  onTouchEnd(event: TouchEvent) {
    if (this.isNarrowScreen) return;
    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - this.touchStartX.value;
    if (Math.abs(deltaX) > this.self.SWIPE_THRESHOLD_PX) this.goTo(this.activeIndex.value + (deltaX < 0 ? 1 : -1));
  }
}

export namespace PerfSlider {
  export const $Class = Static($PerfSlider); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
