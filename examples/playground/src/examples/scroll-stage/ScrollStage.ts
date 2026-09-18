// ScrollStage.ts — a pinned stage of tracks that move WITH a virtual
// scroller: layers of scenery at their own fractions of the scroll, a sun on
// an arc, a progress bar. Each track is a formatter over the scroll value and
// nothing else, and it goes wherever the scroll goes: when the scroll hands
// the compositor a sequence (a flick's glide, a creep chunk), the stage
// composes every track over the SAME values alongside the SAME animation;
// when the scroll is written from a callback (a drag, a wheel), the tracks
// are written in that same callback from the rendered position. One clock
// per frame, never two: a scene is a track of the scroll's sequence, not a
// listener to its position (lenis/presented-motion.generator.md).
import { ref, shallowRef, watch } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { Lenis } from '../../lenis/Lenis';
import type { VirtualScroller } from '../virtual-scroller/VirtualScroller';

class $ScrollStage {
  /** Typed as a number, not the literal, so a test double can shrink the list. */
  static readonly ITEM_COUNT: number = 720;

  /** Rows per chapter: a heading, then the lines. */
  static get CHAPTER_ROWS() {
    return 12;
  }

  /** Rows the scroller keeps mounted around the window, half each side. */
  static get PADDING_QUANTITY() {
    return 8;
  }

  /** The sun crosses the sky once over this much scroll. */
  static get SUN_ARC_PX() {
    return 24_000;
  }

  /** The tracks, by the `data-track` an element carries in the stage. A
   *  parallax layer moves at its fraction of the scroll, snapped to the device
   *  grid; the sun turns about its pivot; the bar scales to the fraction of
   *  the whole extent. Adding a layer is one line here and one element there. */
  static get TRACKS(): ScrollStage.Track[] {
    return [
      { key: 'sky', kind: 'parallax', factor: 0.06, period: 900 },
      { key: 'far', kind: 'parallax', factor: 0.14, period: 720 },
      { key: 'mid', kind: 'parallax', factor: 0.3, period: 600 },
      { key: 'near', kind: 'parallax', factor: 0.55, period: 480 },
      { key: 'ground', kind: 'parallax', factor: 0.85, period: 360 },
      { key: 'sun', kind: 'arc' },
      { key: 'progress', kind: 'progress' }
    ];
  }

  /** The rows: chapter headings over a long text, so the scroll has content. */
  static buildItems(): ScrollStage.Row[] {
    const items = new Array<ScrollStage.Row>(this.ITEM_COUNT);
    for (let index = 0; index < this.ITEM_COUNT; index++) {
      const chapter = Math.floor(index / this.CHAPTER_ROWS) + 1;
      const line = index % this.CHAPTER_ROWS;
      items[index] = {
        id: String(index),
        position: String(index + 1),
        chapter,
        heading: line === 0,
        body:
          line === 0
            ? `Chapter ${chapter}`
            : `Line ${line}. The scenery behind this text is 5 layers, each at its own fraction of the scroll; the sun crosses the sky once every 24,000 px. None of it listens to the scroll — every layer is a track of the same sequence the text is.`
      };
    }
    return items;
  }

  constructor() {
    // the scroller mounts a beat after the stage: hear its frames from then on
    watch(
      () => this.scroller.value,
      () => this.onScrollerChange()
    );
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ScrollStage;
  }

  // STATE
  get items() {
    return shallowRef<ScrollStage.Row[]>(this.self.buildItems());
  }

  /** The scroll value the tracks were last written or composed from. */
  get position() {
    return ref(0);
  }

  /** Whether the stage's tracks are playing on the compositor right now. */
  get onCompositor() {
    return ref(false);
  }

  /** The tracks in flight, paired with the scroll animation each was composed over. */
  protected readonly tracks: Array<{ scroll: Animation; animations: Animation[] }> = [];

  // ELEMENT REFS
  get scroller() {
    return ref<VirtualScroller.Exposed<ScrollStage.Row> | null>(null);
  }

  /** The stage: the pinned element whose `[data-track]` children are the layers. */
  get stage() {
    return ref<HTMLElement | null>(null);
  }

  // DERIVED
  get itemCountLabel(): string {
    return this.items.value.length.toLocaleString();
  }

  /** The chapter under the top edge — the pinned headline reads it, through
   *  the scroller's own row-at-offset lookup over the rendered position. */
  get chapter(): number {
    const at = this.scroller.value?.getIndexAtPosition(this.position.value);
    const index = Math.min(at?.index ?? 0, this.items.value.length - 1);
    return this.items.value[index]?.chapter ?? 1;
  }

  get chapterLabel(): string {
    return `Chapter ${this.chapter}`;
  }

  get positionLabel(): string {
    return `${Math.round(this.position.value).toLocaleString()} px`;
  }

  get modeLabel(): string {
    return this.onCompositor.value
      ? 'compositor · alongside the scroll'
      : 'callback · with the scroll';
  }

  get trackCountLabel(): string {
    return String(this.self.TRACKS.length);
  }

  /** The whole scrollable extent — the progress bar's denominator. */
  get extent(): number {
    return this.scroller.value?.scrollExtent ?? 1;
  }

  /** A track's transform for a scroll value: the whole contract between a
   *  layer and the scroll is a function of one number. */
  transformOf(track: ScrollStage.Track, value: number): string {
    switch (track.kind) {
      case 'parallax': {
        // a layer is its pattern's period tall plus the frame, and wraps where
        // the pattern repeats — so a 46,000 px extent never needs a 46,000 px layer
        const travel = value * (track.factor ?? 0);
        const period = track.period ?? 1;
        const wrapped = ((travel % period) + period) % period;
        return `translateY(${-Lenis.Class.snapToDevicePixel(wrapped)}px)`;
      }
      case 'arc':
        return `rotate(${(value / this.self.SUN_ARC_PX) * 360}deg)`;
      case 'progress':
        return `scaleX(${Math.min(1, Math.max(0, value / this.extent))})`;
    }
  }

  // METHODS

  /** The scroller's ref resolved (or cleared): hear every rendered frame from it. */
  onScrollerChange() {
    const lenis = this.scroller.value?.lenis;
    if (!lenis) return;
    lenis.on('scroll', () => this.onScroll(lenis.animatedScroll));
    this.writeTracks(lenis.animatedScroll);
  }

  /** A rendered frame from the callback path: the tracks follow in the same
   *  callback. While the compositor owns the scroll, its tracks own the stage. */
  onScroll(rendered: number) {
    this.position.value = rendered;
    if (!this.onCompositor.value) this.writeTracks(rendered);
  }

  writeTracks(value: number) {
    for (const [track, element] of this.trackElements())
      element.style.transform = this.transformOf(track, value);
  }

  /** The scroll handed the compositor a sequence: compose every track over
   *  the same values, aligned with the same animation — alongside a new
   *  sequence, after the one before for a chained chunk. */
  onSequence(sequence: Lenis.Sequence) {
    const elements = this.trackElements();
    if (!elements.length) return;
    if (!sequence.after) this.cancelTracks();
    const alignment = sequence.after
      ? { after: this.lastTrackAnimation() }
      : { alongside: sequence.animation };
    const animations: Animation[] = [];
    for (const [track, element] of elements) {
      const animation = Lenis.Class.composeSequence(
        element,
        sequence.values,
        (value) => this.transformOf(track, value),
        {
          ...alignment,
          // a wrapping layer must never be interpolated across its wrap: held keyframes
          linear: sequence.linear && track.kind !== 'parallax'
        }
      );
      if (animation) animations.push(animation);
    }
    this.tracks.push({ scroll: sequence.animation, animations });
    this.onCompositor.value = true;
    this.position.value = sequence.values[sequence.values.length - 1];
    sequence.animation.addEventListener(
      'cancel',
      () => this.onScrollSequenceOver(sequence.animation),
      { once: true }
    );
    sequence.animation.addEventListener(
      'finish',
      () => this.onScrollSequenceOver(sequence.animation),
      { once: true }
    );
  }

  /** A scroll sequence ended — naturally, by promotion of a chained chunk, or
   *  by an interrupt. Its tracks go with it; when nothing plays any more the
   *  stage is written from the rendered position again. */
  onScrollSequenceOver(scroll: Animation) {
    const index = this.tracks.findIndex((track) => track.scroll === scroll);
    if (index >= 0) {
      for (const animation of this.tracks[index].animations) animation.cancel();
      this.tracks.splice(index, 1);
    }
    const lenis = this.scroller.value?.lenis;
    if (lenis?.compositorGlideActive && this.tracks.length) return;
    this.cancelTracks();
    this.onCompositor.value = false;
    if (lenis) this.writeTracks(lenis.animatedScroll);
  }

  cancelTracks() {
    for (const track of this.tracks) for (const animation of track.animations) animation.cancel();
    this.tracks.length = 0;
  }

  /** The stage's layers, paired with their tracks by `data-track`. */
  protected trackElements(): Array<[ScrollStage.Track, HTMLElement]> {
    const stage = this.stage.value;
    if (!stage) return [];
    const pairs: Array<[ScrollStage.Track, HTMLElement]> = [];
    for (const track of this.self.TRACKS) {
      const element = stage.querySelector<HTMLElement>(`[data-track="${track.key}"]`);
      if (element) pairs.push([track, element]);
    }
    return pairs;
  }

  /** The latest track animation, for a chained chunk to follow. */
  protected lastTrackAnimation(): Animation | null {
    const last = this.tracks[this.tracks.length - 1];
    return last?.animations[0] ?? null;
  }
}

export namespace ScrollStage {
  export const $Class = Static($ScrollStage); // anchor — it declares statics
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Row extends VirtualScroller.BaseItem {
    chapter: number;
    heading: boolean;
    body: string;
  }

  /** A layer of the stage: what it does with the scroll value. */
  export interface Track {
    key: string;
    kind: 'parallax' | 'arc' | 'progress';
    /** a parallax layer's fraction of the scroll */
    factor?: number;
    /** a parallax layer's pattern period in px — the translate wraps there */
    period?: number;
  }
}
