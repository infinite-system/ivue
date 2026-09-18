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

  /** The creep's starting speed, px per second: a scene reads faster than
   *  a chat, so it starts above the scroller's tuned reading cadence. */
  static get DEFAULT_SPEED_PX_PER_S() {
    return 14;
  }

  /** How much of a linear run the stage's tracks take at a time. The scroll
   *  layer plays a creep as ONE run (it carries text, and a text layer
   *  re-rasters where an animation ends), but a held track needs a keyframe
   *  per step, so the stage cuts the run into pieces of this length, each
   *  aligned to the run's own start on the document timeline, two in flight. */
  static get TRACK_CHUNK_MS() {
    return 2000;
  }

  /** The drawing box of a ridge's path: twice as wide as tall, scaled
   *  uniformly to cover the tile — a tall phone sees the middle of the
   *  skyline at its true proportion instead of the whole of it squeezed. */
  static get RIDGE_BOX() {
    return { width: 2000, height: 1000 };
  }

  /** The interludes: media the list makes room for. A row that carries one
   *  is an empty span of the list, and while that span crosses the frame the
   *  stage shows the media pinned behind it — pulled in as the span enters,
   *  held while it is in view, gone as it leaves — a picture, or a video on
   *  its own clock. None in the base; a subclass fills the table. */
  static get INTERLUDES(): ScrollStage.Interlude[] {
    return [];
  }

  /** The two media slots: an interlude lives in the slot of its ordinal's parity. */
  static get MEDIA_SLOTS() {
    return 2;
  }

  /** The part of the frame over which an interlude's media fades: in, as
   *  the last of the span's leading edge crosses that much of the frame —
   *  so the media is full once the empty span fills the frame — and out,
   *  from the moment the next row enters, gone by the time it has taken
   *  that much of the frame. Between the two the media holds. */
  static get INTERLUDE_FADE_FRACTION() {
    return 0.6;
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
   *  as an SVG path in the ridge box. The same chapter always draws the
   *  same ridge, and no two chapters draw the same one. */
  static ridgePath(chapter: number, ridge: ScrollStage.Ridge): string {
    let seed = chapter * 9973 + ridge.points * 7919;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const { width, height } = this.RIDGE_BOX;
    const steps = ridge.points;
    let path = `M0 ${Math.round((ridge.base + (next() - 0.5) * ridge.amplitude) * height)}`;
    for (let step = 1; step <= steps; step++) {
      const x = Math.round((step / steps) * width);
      const y = Math.round((ridge.base + (next() - 0.5) * 2 * ridge.amplitude) * height);
      path += ` L${x} ${y}`;
    }
    return `${path} L${width} ${height} L0 ${height} Z`;
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
  protected readonly tracks: ScrollStage.Flight[] = [];

  /** Which chapter each slot's scene currently draws — 0 until written. */
  protected readonly slotChapters: number[] = [0, 0];

  /** Which interlude (by ordinal, 1-based) each media slot currently holds — 0 until written. */
  protected readonly mediaOrdinals: number[] = [0, 0];


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

  /** The reading creep's speed, px per second — the speed slider writes it. */
  get speed() {
    return ref(this.self.DEFAULT_SPEED_PX_PER_S);
  }

  /** The track table, built once per stage element: the layers do not
   *  change under a mounted stage, and a query per layer per frame is a
   *  cost the callback path would pay for nothing. */
  protected get trackCache() {
    return shallowRef<{ stage: HTMLElement; tracks: ScrollStage.Track[] } | null>(null);
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
    // one word each: the strip's cells must not change height as the label does
    return this.onCompositor.value ? 'compositor' : 'callback';
  }

  get trackCountLabel(): string {
    return String(this.trackList().length);
  }

  /** The slider's px/s in the creep integrator's unit, ms per px. */
  get creepMsPerPx(): number {
    return 1000 / Math.max(1, this.speed.value);
  }

  get speedLabel(): string {
    return `${this.speed.value.toFixed(0)} px/s`;
  }

  /** The scroller's reactive autoplay state, through its exposed surface. */
  get isAutoPlaying(): boolean {
    return this.scroller.value?.isAutoPlaying ?? false;
  }

  get playButtonIcon(): string {
    return this.isAutoPlaying ? '⏸' : '▶';
  }

  get playButtonLabel(): string {
    return this.isAutoPlaying ? 'pause' : 'autoplay';
  }

  /** The rows that carry an interlude, in order: index and interlude. */
  get interludeRows(): Array<{ index: number; interlude: ScrollStage.Interlude }> {
    const rows: Array<{ index: number; interlude: ScrollStage.Interlude }> = [];
    this.items.value.forEach((row, index) => {
      if (row.interlude) rows.push({ index, interlude: row.interlude });
    });
    return rows;
  }

  /** The frame's height along the scroll — what an interlude's span crosses. */
  get frameSpan(): number {
    return this.scroller.value?.containerSpan ?? 1;
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

  /** Where a chapter's text ends: at its first interlude row when it has
   *  one, else where the next chapter starts. A crossing plays out over the
   *  text, so it is done before the interlude takes the frame. */
  textEnd(chapter: number): number {
    const first = (chapter - 1) * this.self.CHAPTER_ROWS;
    const last = Math.min(this.items.value.length, first + this.self.CHAPTER_ROWS);
    for (let index = first; index < last; index++) {
      if (!this.items.value[index]?.interlude) continue;
      return this.scroller.value?.getAnchoredPosition(index) ?? index * this.self.ASSUMED_ROW_PX;
    }
    return this.chapterStart(chapter + 1);
  }

  /** A scroll value inside its chapter's TEXT: the progress runs 0 to 1 over
   *  the rows before the interlude, and holds 1 through the interlude. */
  textLocalOf(value: number): ScrollStage.Local {
    const chapter = this.chapterAt(value);
    const start = this.chapterStart(chapter);
    const travel = Math.max(0, value - start);
    const span = Math.max(1, this.textEnd(chapter) - start);
    return { chapter, progress: Math.min(1, travel / span), travel };
  }

  /** A scroll value as a chapter and its progress through it, 0 to 1. */
  localOf(value: number): ScrollStage.Local {
    const chapter = this.chapterAt(value);
    const travel = Math.max(0, value - this.chapterStart(chapter));
    return { chapter, progress: Math.min(1, travel / this.chapterSpan(chapter)), travel };
  }

  /** Where an interlude row spans: its anchored start and its measured
   *  size, the assumed row before geometry knows it. */
  interludeSpan(ordinal: number): { start: number; end: number } | null {
    const row = this.interludeRows[ordinal - 1];
    if (!row) return null;
    const scroller = this.scroller.value;
    const start = scroller?.getAnchoredPosition(row.index) ?? row.index * this.self.ASSUMED_ROW_PX;
    const next = scroller?.getAnchoredPosition(row.index + 1) ?? start + this.self.ASSUMED_ROW_PX;
    return { start, end: Math.max(start + 1, next) };
  }

  /** How present an interlude is at a scroll value: 0 until its span has
   *  entered most of the frame, rising to 1 as the span fills it; 1 while
   *  the span alone is in the frame; falling from the moment the next row
   *  enters, 0 once that row has taken most of the frame. */
  interludePresence(ordinal: number, value: number): number {
    const span = this.interludeSpan(ordinal);
    if (!span) return 0;
    const frame = this.frameSpan;
    const fade = frame * this.self.INTERLUDE_FADE_FRACTION;
    const threshold = frame - fade;
    // how much of the span has entered from the bottom; how much is still ahead of the top
    const entered = value + frame - span.start;
    const ahead = span.end - value;
    const entering = Math.min(1, Math.max(0, (entered - threshold) / fade));
    const leaving = Math.min(1, Math.max(0, (ahead - threshold) / fade));
    return Math.min(entering, leaving);
  }

  /** The interlude whose span a scroll value is at or before: the one the
   *  frame shows now, or the next one coming. Ordinals are 1-based. */
  interludeAt(value: number): number {
    const rows = this.interludeRows;
    for (let ordinal = 1; ordinal <= rows.length; ordinal++) {
      const span = this.interludeSpan(ordinal);
      if (span && span.end > value) return ordinal;
    }
    return rows.length;
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

  /** A media slot's opacity: its interlude's presence, eased so the media
   *  is faint while it still rides beside the rows and full once it holds. */
  mediaOpacity(slot: number, value: number): string {
    const ordinal = this.mediaOrdinals[slot];
    const presence = ordinal ? this.interludePresence(ordinal, value) : 0;
    return (presence * presence).toFixed(3);
  }

  /** A media slot's transform: the media rides in with its span — it sits
   *  where the empty span is, so the rows never cross it — and settles at
   *  the frame's centre as it comes fully in; it leaves the same way, with
   *  the span. A translation only: a change of scale on a raster the size
   *  of a picture is a re-raster, and one per held keyframe is a dropped
   *  frame — a translation just moves the raster. */
  mediaTransform(slot: number, value: number): string {
    const ordinal = this.mediaOrdinals[slot];
    const span = ordinal ? this.interludeSpan(ordinal) : null;
    if (!span) return 'translateY(0px)';
    const center = (span.start + span.end) / 2 - (value + this.frameSpan / 2);
    const presence = this.interludePresence(ordinal, value);
    // eased: the media stays with its span until it is nearly in, then settles.
    // The ride is FRACTIONAL: at reading speed it moves under a device pixel
    // per frame, where a snapped write is a tick every few frames (the grid
    // record's scope boundary), and a picture is not text — it resamples
    // without a shimmer.
    const settle = presence * presence * presence;
    const ride = (center * (1 - settle)).toFixed(2);
    return `translateY(${ride}px)`;
  }

  progressTransform(value: number): string {
    return `scaleX(${Math.min(1, Math.max(0, value / this.extent)).toFixed(4)})`;
  }

  /** Every track on the stage, from the table built for this stage element. */
  trackList(): ScrollStage.Track[] {
    const stage = this.stage.value;
    if (!stage) return [];
    if (this.trackCache.value?.stage !== stage)
      this.trackCache.value = { stage, tracks: this.buildTracks(stage) };
    return this.trackCache.value.tracks;
  }

  /** The track table: the element each track drives, the property, and its
   *  formatter — the whole contract between a scene and the scroll. A
   *  subclass adds its layers by extending this list. */
  protected buildTracks(stage: HTMLElement): ScrollStage.Track[] {
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
    for (let slot = 0; slot < this.self.MEDIA_SLOTS; slot++) {
      const media = stage.querySelector<HTMLElement>(`[data-media="${slot}"]`);
      if (!media) continue;
      tracks.push({ element: media, property: 'opacity', formatOf: (value) => this.mediaOpacity(slot, value) });
      tracks.push({ element: media, property: 'transform', formatOf: (value) => this.mediaTransform(slot, value) });
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

  /** The play button: arm the reading creep at once, or stop it. */
  toggleAutoPlay() {
    const scroller = this.scroller.value;
    if (!scroller) return;
    if (this.isAutoPlaying) scroller.stopAutoPlay();
    else scroller.startAutoPlay(0);
  }

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
    this.prepareInterludes(value);
  }

  /** The interlude the frame is at or before in the slot of its parity, the
   *  one after in the other — loaded only when the ordinal changes, so a
   *  picture is fetched once and a video keeps playing while it is held. */
  prepareInterludes(value: number) {
    const rows = this.interludeRows;
    if (!rows.length) return;
    const ordinal = this.interludeAt(value);
    for (const target of [ordinal, ordinal + 1]) {
      if (target > rows.length) continue;
      const slot = target % this.self.MEDIA_SLOTS;
      if (this.mediaOrdinals[slot] === target) continue;
      this.mediaOrdinals[slot] = target;
      this.drawInterlude(slot, rows[target - 1].interlude);
    }
  }

  /** Put an interlude's media into a slot: the picture's source, or the
   *  video's, which plays on its own clock while it is held. */
  drawInterlude(slot: number, interlude: ScrollStage.Interlude) {
    const root = this.stage.value?.querySelector<HTMLElement>(`[data-media="${slot}"]`);
    if (!root) return;
    root.dataset.kind = interlude.kind;
    const image = root.querySelector<HTMLImageElement>('img');
    const video = root.querySelector<HTMLVideoElement>('video');
    const caption = root.querySelector<HTMLElement>('[data-caption]');
    if (image) {
      image.src = interlude.kind === 'image' ? interlude.src : '';
      image.alt = interlude.caption ?? '';
    }
    if (video) {
      if (interlude.kind === 'video') {
        video.src = interlude.src;
        if (interlude.poster) video.poster = interlude.poster;
        void video.play?.()?.catch?.(() => undefined);
      } else {
        video.pause?.();
        video.removeAttribute('src');
      }
    }
    if (caption) caption.textContent = interlude.caption ?? '';
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
   *  the same values, aligned with the same animation on the document
   *  timeline. A glide's held values are taken whole; a linear run is cut
   *  into held pieces the stage composes as the run plays. */
  onSequence(sequence: Lenis.Sequence) {
    const tracks = this.trackList();
    if (!tracks.length) return;
    // the scenes for where the sequence BEGINS: the model keeps stepping under
    // a compositor sequence and prepares each chapter as it is reached, and a
    // run to the end of the list must not draw its last chapter over the
    // first's slot before the first has played
    this.prepareScenes(sequence.values[0]);
    // a sequence chained after another keeps the tracks of the one playing
    if (!sequence.after) this.cancelTracks();
    const flight: ScrollStage.Flight = { scroll: sequence.animation, sequence, pieces: [], nextPieceMs: 0 };
    this.tracks.push(flight);
    if (sequence.linear) {
      // two pieces in flight: the one playing and the one queued after it.
      // The queued one aligns to the run's start on the document timeline,
      // which the browser assigns when the run is ready to play — after the
      // frame that created it, later than a frame callback sees. Until then
      // it waits on the run's own ready promise, or it would begin now and
      // cover the first piece.
      this.composePiece(flight);
      if (sequence.animation.startTime !== null) this.composePiece(flight);
      else sequence.animation.ready?.then(() => this.onRunStarted(flight));
    } else {
      flight.pieces.push({ atMs: 0, animations: this.composeTracks(sequence.values, sequence.animation, 0, null) });
    }
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

  /** The scroll's playing sequence changed its rate in place (the creep's
   *  speed): every piece in flight over it takes the same rate, seamlessly,
   *  so it stays where it was and moves as the scroll now moves. Pieces
   *  composed from here on inherit the rate from the run they align to. */
  onSequenceRate(change: Lenis.SequenceRate) {
    const flight = this.tracks.find((track) => track.scroll === change.animation);
    if (!flight) return;
    for (const piece of flight.pieces)
      for (const animation of piece.animations) {
        if (typeof animation.updatePlaybackRate === 'function') animation.updatePlaybackRate(change.rate);
        else animation.playbackRate = change.rate;
      }
  }

  /** Every track over a list of values, aligned `atMs` into the scroll
   *  animation; a scene track is never interpolated — a chapter boundary
   *  inside the values is a step in the role, and only held keyframes step
   *  with it. */
  protected composeTracks(
    values: readonly number[],
    scroll: Animation,
    atMs: number,
    durationMs: number | null
  ): Animation[] {
    const animations: Animation[] = [];
    for (const track of this.trackList()) {
      const animation = Lenis.Class.composeSequence(track.element, values, track.formatOf, {
        alongside: scroll,
        offsetMs: atMs,
        durationMs,
        property: track.property,
        // a track may ask to be interpolated between a piece's two ends instead
        // of held at every step — only over a linear run, where the ends are the line
        linear: durationMs !== null && this.trackIsLinear(track)
      });
      if (animation) animations.push(animation);
    }
    return animations;
  }

  /** Whether a track is composed linear between a piece's ends rather than
   *  held at every step. Held by default: a scene steps at a chapter
   *  boundary. A subclass may answer for a track whose values are a line. */
  protected trackIsLinear(_track: ScrollStage.Track): boolean {
    return false;
  }

  /** The next piece of a linear run: its values sampled at the keyframe
   *  step from the run's two endpoints, composed to begin where the piece
   *  before ends. When a piece finishes it is dropped and one more is
   *  composed, so two are always in flight. */
  protected composePiece(flight: ScrollStage.Flight) {
    const { sequence } = flight;
    if (flight.nextPieceMs >= sequence.durationMs) return;
    const stepMs = Lenis.Class.KEYFRAME_MS;
    const fromMs = flight.nextPieceMs;
    const toMs = Math.min(sequence.durationMs, fromMs + this.self.TRACK_CHUNK_MS);
    const [start, end] = [sequence.values[0], sequence.values[sequence.values.length - 1]];
    const valueAt = (ms: number) => start + ((end - start) * ms) / sequence.durationMs;
    const values: number[] = [];
    for (let ms = fromMs; ms < toMs; ms += stepMs) values.push(valueAt(ms));
    values.push(valueAt(toMs));
    const piece: ScrollStage.Piece = {
      atMs: fromMs,
      animations: this.composeTracks(values, sequence.animation, fromMs, toMs - fromMs)
    };
    flight.pieces.push(piece);
    flight.nextPieceMs = toMs;
    piece.animations[0]?.addEventListener('finish', () => this.onPieceFinish(flight, piece), { once: true });
  }

  /** The run is ready to play: its start time is known, so the queued
   *  piece can be aligned to it. */
  protected onRunStarted(flight: ScrollStage.Flight) {
    if (this.tracks.includes(flight)) this.composePiece(flight);
  }

  /** A piece of a run played out: it goes, and the piece after the one now
   *  playing is composed. */
  protected onPieceFinish(flight: ScrollStage.Flight, piece: ScrollStage.Piece) {
    const index = flight.pieces.indexOf(piece);
    if (index < 0) return;
    for (const animation of piece.animations) animation.cancel();
    flight.pieces.splice(index, 1);
    if (this.tracks.includes(flight)) this.composePiece(flight);
  }

  /** A scroll sequence ended — naturally, by promotion of a chained one, or
   *  by an interrupt. Its tracks go with it; when nothing plays any more the
   *  stage is written from the rendered position again. */
  onScrollSequenceOver(scroll: Animation) {
    const index = this.tracks.findIndex((track) => track.scroll === scroll);
    if (index >= 0) {
      this.cancelFlight(this.tracks[index]);
      this.tracks.splice(index, 1);
    }
    const lenis = this.scroller.value?.lenis;
    if (lenis?.compositorGlideActive && this.tracks.length) return;
    this.cancelTracks();
    this.onCompositor.value = false;
    if (lenis) this.writeTracks(lenis.animatedScroll);
  }

  cancelTracks() {
    for (const flight of this.tracks) this.cancelFlight(flight);
    this.tracks.length = 0;
  }

  protected cancelFlight(flight: ScrollStage.Flight) {
    for (const piece of flight.pieces) for (const animation of piece.animations) animation.cancel();
    flight.pieces.length = 0;
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
    /** the media this row makes room for, if it is an interlude */
    interlude?: Interlude;
  }

  /** Media the list makes room for: a picture, or a video on its own clock. */
  export interface Interlude {
    kind: 'image' | 'video';
    src: string;
    caption?: string;
    poster?: string;
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

  /** A piece of a run on the stage's tracks: its start into the scroll
   *  animation and the animations composed for it. */
  export interface Piece {
    atMs: number;
    animations: Animation[];
  }

  /** The stage's tracks over one scroll sequence: its pieces in flight and
   *  where the next piece begins. */
  export interface Flight {
    scroll: Animation;
    sequence: Lenis.Sequence;
    pieces: Piece[];
    nextPieceMs: number;
  }

  /** One track on the stage: an element, the property it animates, and the formatter. */
  export interface Track {
    element: HTMLElement;
    property: 'transform' | 'opacity';
    formatOf: (value: number) => string;
  }
}
