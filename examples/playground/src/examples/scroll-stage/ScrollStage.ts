// ScrollStage.ts — a scene per chapter, composed on the scroll. Each chapter
// of the list owns a scene: its own skyline and palette, ridges that move at
// their fractions of the CHAPTER's travel (finite, so nothing ever wraps or
// repeats), a sun crossing that chapter's sky once. As a chapter ends its
// scene fades out and the next chapter's fades in; two slots alternate, so
// sixty chapters cost two scenes in the DOM. Every track is a formatter over
// the scroll value and nothing else, and it goes wherever the scroll goes:
// when the scroll hands the compositor a sequence, the stage composes every
// track over the SAME values alongside the SAME animation; when a callback
// writes the scroll, the tracks are written in that callback. One clock per
// frame, never two (lenis/presented-motion.generator.md).
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

  /** The row height the scroller assumes before a row has been measured —
   *  the stage's fallback for a chapter's span before geometry knows it. */
  static get ASSUMED_ROW_PX() {
    return 64;
  }

  /** The last fraction of a chapter over which its scene fades into the next. */
  static get FADE_FRACTION() {
    return 0.22;
  }

  /** How high the sun's arc peaks, in hundredths of the stage's height. */
  static get SUN_APEX_CQH() {
    return 82;
  }

  /** The band of the stage the sun crosses, in hundredths of its width: the
   *  open half right of the rows, so the sun is never behind the text. */
  static get SUN_BAND_START_CQW() {
    return 48;
  }

  static get SUN_BAND_CQW() {
    return 52;
  }

  /** The ridges of a scene, back to front: each moves at its fraction of the
   *  chapter's travel and has its own shape. Adding a ridge is one line. */
  static get RIDGES(): ScrollStage.Ridge[] {
    return [
      { key: 'far', factor: 0.12, base: 0.5, amplitude: 0.22, points: 9 },
      { key: 'mid', factor: 0.28, base: 0.62, amplitude: 0.16, points: 11 },
      { key: 'near', factor: 0.5, base: 0.74, amplitude: 0.1, points: 13 },
      { key: 'ground', factor: 0.8, base: 0.88, amplitude: 0.04, points: 7 }
    ];
  }

  /** The two scene slots: a chapter's scene lives in the slot of its parity. */
  static get SLOTS() {
    return 2;
  }

  /** How far a ridge can rise over a chapter, in the stage's own height: the
   *  tile's overhang below the frame, so a full chapter's rise never shows
   *  the tile's edge whatever the chapter's span in pixels. */
  static get RIDGE_RISE_CQH() {
    return 40;
  }

  /** The lines of a chapter, one short sentence per row. */
  static get LINES() {
    return [
      'This chapter has its own sky.',
      'The ridges move at 4 fractions of its travel.',
      'The sun crosses once.',
      'None of it listens to the scroll.',
      'Every layer is a track of the same sequence.',
      'The text moves by that sequence too.',
      'One clock per frame.',
      'At the end, the scene fades into the next.',
      'Two slots alternate; 60 chapters cost 2 scenes.',
      'The skyline is seeded per chapter.',
      'No two chapters draw the same one.'
    ];
  }

  /** The rows: a heading then short lines, so the scroll has content. */
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
        body: line === 0 ? `Chapter ${chapter}` : this.LINES[(line - 1) % this.LINES.length]
      };
    }
    return items;
  }

  /** A chapter's skyline for one ridge: a seeded polyline across the tile,
   *  as an SVG path in a 1000 × 1000 box. The same chapter always draws the
   *  same ridge, and no two chapters draw the same one. */
  static ridgePath(chapter: number, ridge: ScrollStage.Ridge): string {
    let seed = chapter * 9973 + ridge.points * 7919;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const steps = ridge.points;
    let path = `M0 ${Math.round((ridge.base + (next() - 0.5) * ridge.amplitude) * 1000)}`;
    for (let step = 1; step <= steps; step++) {
      const x = Math.round((step / steps) * 1000);
      const y = Math.round((ridge.base + (next() - 0.5) * 2 * ridge.amplitude) * 1000);
      path += ` L${x} ${y}`;
    }
    return `${path} L1000 1000 L0 1000 Z`;
  }

  /** A chapter's palette: a hue that walks the wheel, the ridges darkening
   *  toward the front, the sky a gradient of the same hue. */
  static palette(chapter: number): ScrollStage.Palette {
    const hue = (chapter * 41) % 360;
    return {
      skyTop: `hsl(${hue} 55% 9%)`,
      skyBottom: `hsl(${(hue + 30) % 360} 50% 26%)`,
      ridges: [
        `hsl(${hue} 42% 34%)`,
        `hsl(${hue} 44% 27%)`,
        `hsl(${hue} 46% 20%)`,
        `hsl(${hue} 48% 14%)`
      ]
    };
  }

  /** How far into its fade a chapter is at a progress, 0 before the fade
   *  starts and 1 at the chapter's end. */
  static fadeAt(progress: number): number {
    const fadeStart = 1 - this.FADE_FRACTION;
    return Math.min(1, Math.max(0, (progress - fadeStart) / this.FADE_FRACTION));
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

  /** The tracks in flight, paired with the scroll animation each was composed over. */
  protected readonly tracks: Array<{ scroll: Animation; animations: Animation[] }> = [];

  /** Which chapter each slot's scene currently draws — 0 until written. */
  protected readonly slotChapters: number[] = [0, 0];

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

  // ELEMENT REFS
  get scroller() {
    return ref<VirtualScroller.Exposed<ScrollStage.Row> | null>(null);
  }

  /** The stage: the pinned element holding the slots, whose `[data-track]`
   *  children are the layers the class drives. */
  get stage() {
    return ref<HTMLElement | null>(null);
  }

  // DERIVED
  get itemCountLabel(): string {
    return this.items.value.length.toLocaleString();
  }

  get paddingQuantity(): number {
    return this.self.PADDING_QUANTITY;
  }

  /** The chapter under the top edge — the pinned headline reads it. */
  get chapter(): number {
    return this.chapterAt(this.position.value);
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
    return String(this.self.SLOTS * (this.self.RIDGES.length + 2) + 1);
  }

  /** The whole scrollable extent — the progress bar's denominator. */
  get extent(): number {
    return this.scroller.value?.scrollExtent ?? 1;
  }

  // GEOMETRY — the chapter a scroll value is in, and where that chapter starts

  chapterAt(value: number): number {
    const at = this.scroller.value?.getIndexAtPosition(Math.max(0, value));
    const fallback = Math.floor(Math.max(0, value) / this.self.ASSUMED_ROW_PX);
    const index = Math.min(at?.index ?? fallback, this.items.value.length - 1);
    return this.items.value[index]?.chapter ?? 1;
  }

  /** Where a chapter's first row sits: the scroller's anchored position when
   *  geometry knows it, the assumed row height before. */
  chapterStart(chapter: number): number {
    const firstIndex = (chapter - 1) * this.self.CHAPTER_ROWS;
    return (
      this.scroller.value?.getAnchoredPosition(firstIndex) ?? firstIndex * this.self.ASSUMED_ROW_PX
    );
  }

  chapterSpan(chapter: number): number {
    return Math.max(1, this.chapterStart(chapter + 1) - this.chapterStart(chapter));
  }

  /** A scroll value as a chapter and its progress through it, 0 to 1. */
  localOf(value: number): ScrollStage.Local {
    const chapter = this.chapterAt(value);
    const travel = Math.max(0, value - this.chapterStart(chapter));
    return { chapter, progress: Math.min(1, travel / this.chapterSpan(chapter)), travel };
  }

  // TRACKS — each a formatter over the scroll value; the slot decides its role

  /** What a slot draws at a scroll value: the current chapter when the
   *  parity matches, else the next one, waiting under the fade. */
  roleOf(slot: number, value: number): ScrollStage.Role {
    const local = this.localOf(value);
    if (local.chapter % this.self.SLOTS === slot) return { ...local, current: true };
    return { chapter: local.chapter + 1, progress: 0, travel: 0, current: false };
  }

  /** A slot's opacity: the current scene fades out over the chapter's last
   *  fraction while the next fades in. */
  opacityOf(slot: number, value: number): string {
    const local = this.localOf(value);
    const fade = this.self.fadeAt(local.progress);
    const current = local.chapter % this.self.SLOTS === slot;
    return (current ? 1 - fade : fade).toFixed(3);
  }

  /** A ridge's transform in a slot: its fraction of the chapter's progress
   *  over the tile's overhang, in the stage's own height — bounded, so it
   *  never wraps and never shows its edge. */
  ridgeTransform(slot: number, ridge: ScrollStage.Ridge, value: number): string {
    const role = this.roleOf(slot, value);
    const rise = (role.progress * ridge.factor * this.self.RIDGE_RISE_CQH).toFixed(3);
    return `translateY(-${rise}cqh)`;
  }

  /** The sun in a slot: across the open band on an arc, once per chapter. */
  sunTransform(slot: number, value: number): string {
    const role = this.roleOf(slot, value);
    const x = (this.self.SUN_BAND_START_CQW + role.progress * this.self.SUN_BAND_CQW).toFixed(3);
    const y = (-Math.sin(role.progress * Math.PI) * this.self.SUN_APEX_CQH).toFixed(3);
    return `translate(${x}cqw, ${y}cqh)`;
  }

  progressTransform(value: number): string {
    return `scaleX(${Math.min(1, Math.max(0, value / this.extent)).toFixed(4)})`;
  }

  /** Every track on the stage: the element it drives, the property, and
   *  its formatter — the whole contract between a scene and the scroll. */
  trackList(): ScrollStage.Track[] {
    const stage = this.stage.value;
    if (!stage) return [];
    const tracks: ScrollStage.Track[] = [];
    for (let slot = 0; slot < this.self.SLOTS; slot++) {
      const root = stage.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
      if (!root) continue;
      tracks.push({
        element: root,
        property: 'opacity',
        formatOf: (value) => this.opacityOf(slot, value)
      });
      for (const ridge of this.self.RIDGES) {
        const element = root.querySelector<HTMLElement>(`[data-track="${ridge.key}"]`);
        if (element)
          tracks.push({
            element,
            property: 'transform',
            formatOf: (value) => this.ridgeTransform(slot, ridge, value)
          });
      }
      const sun = root.querySelector<HTMLElement>('[data-track="sun"]');
      if (sun)
        tracks.push({
          element: sun,
          property: 'transform',
          formatOf: (value) => this.sunTransform(slot, value)
        });
    }
    const bar = stage.querySelector<HTMLElement>('[data-track="progress"]');
    if (bar)
      tracks.push({
        element: bar,
        property: 'transform',
        formatOf: (value) => this.progressTransform(value)
      });
    return tracks;
  }

  // METHODS

  /** The scroller's ref resolved (or cleared): hear every rendered frame from it. */
  onScrollerChange() {
    const lenis = this.scroller.value?.lenis;
    if (!lenis) return;
    lenis.on('scroll', () => this.onScroll(lenis.animatedScroll));
    this.prepareScenes(lenis.animatedScroll);
    this.writeTracks(lenis.animatedScroll);
  }

  /** A rendered frame: the scenes for this chapter and the next are drawn
   *  in their slots if they are not yet; then, on the callback path, the
   *  tracks follow in the same callback. While the compositor owns the
   *  scroll, its tracks own the stage. */
  onScroll(rendered: number) {
    this.position.value = rendered;
    this.prepareScenes(rendered);
    if (!this.onCompositor.value) this.writeTracks(rendered);
  }

  /** The current chapter's scene in the slot of its parity, the next
   *  chapter's in the other — drawn only when the chapter changes. */
  prepareScenes(value: number) {
    const chapter = this.chapterAt(value);
    for (const target of [chapter, chapter + 1]) {
      const slot = target % this.self.SLOTS;
      if (this.slotChapters[slot] === target) continue;
      this.slotChapters[slot] = target;
      this.drawScene(slot, target);
    }
  }

  /** Draw a chapter's scene into a slot: the palette and the four ridges. */
  drawScene(slot: number, chapter: number) {
    const root = this.stage.value?.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
    if (!root) return;
    const self = this.self;
    const palette = self.palette(chapter);
    root.style.setProperty('--sky-top', palette.skyTop);
    root.style.setProperty('--sky-bottom', palette.skyBottom);
    self.RIDGES.forEach((ridge, index) => {
      const path = root.querySelector<SVGPathElement>(`[data-track="${ridge.key}"] path`);
      if (!path) return;
      path.setAttribute('d', self.ridgePath(chapter, ridge));
      path.setAttribute('fill', palette.ridges[index] ?? palette.ridges[palette.ridges.length - 1]);
    });
  }

  writeTracks(value: number) {
    for (const track of this.trackList()) {
      const formatted = track.formatOf(value);
      if (track.property === 'opacity') track.element.style.opacity = formatted;
      else track.element.style.transform = formatted;
    }
  }

  /** The scroll handed the compositor a sequence: compose every track over
   *  the same values, aligned with the same animation — alongside a new
   *  sequence, after the one before for a chained chunk. The scenes the
   *  sequence will reach are drawn first, so a chapter change mid-glide has
   *  its slot ready. */
  onSequence(sequence: Lenis.Sequence) {
    const tracks = this.trackList();
    if (!tracks.length) return;
    this.prepareScenes(sequence.values[sequence.values.length - 1]);
    if (!sequence.after) this.cancelTracks();
    const alignment = sequence.after
      ? { after: this.lastTrackAnimation() }
      : { alongside: sequence.animation };
    const animations: Animation[] = [];
    for (const track of tracks) {
      // a scene track is never interpolated: a chapter boundary inside the
      // sequence is a step in the role, and only held keyframes step with it
      const animation = Lenis.Class.composeSequence(
        track.element,
        sequence.values,
        track.formatOf,
        { ...alignment, property: track.property }
      );
      if (animation) animations.push(animation);
    }
    this.tracks.push({ scroll: sequence.animation, animations });
    this.onCompositor.value = true;
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

  /** A ridge of a scene: its fraction of the chapter's travel and its shape. */
  export interface Ridge {
    key: string;
    factor: number;
    /** where the ridge sits, as a fraction of the tile's height */
    base: number;
    /** how far the skyline wanders, as a fraction of the tile's height */
    amplitude: number;
    /** how many points the skyline has across the tile */
    points: number;
  }

  export interface Palette {
    skyTop: string;
    skyBottom: string;
    ridges: string[];
  }

  /** A scroll value inside its chapter. */
  export interface Local {
    chapter: number;
    /** 0 at the chapter's first row, 1 at its last */
    progress: number;
    /** px into the chapter */
    travel: number;
  }

  /** What a slot draws at a scroll value. */
  export interface Role extends Local {
    current: boolean;
  }

  /** One track on the stage: an element, the property it animates, and the formatter. */
  export interface Track {
    element: HTMLElement;
    property: 'transform' | 'opacity';
    formatOf: (value: number) => string;
  }
}
