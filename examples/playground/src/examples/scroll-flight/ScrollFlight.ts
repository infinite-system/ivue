// ScrollFlight.ts — the scroll stage, extended: a flight over the range. The
// scene machinery is the stage's (slots, roles, the fade, the handoff onto
// the compositor and back) and this class adds what a flight needs — smooth
// ridges under atmospheric haze, a time of day per chapter, drifting clouds,
// a plane crossing in perspective, a flock on the GPU — as tracks over the
// same one number. Two clocks, split by what they are: everything that moves
// WITH the scroll is a transform the compositor plays; the wingbeat, which
// does not, is the canvas's own frame (lenis/presented-motion.generator.md).
import { onUnmounted, ref, shallowRef, watch } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { ScrollStage } from '../scroll-stage/ScrollStage';
import { BirdFlock } from './BirdFlock';

class $ScrollFlight extends ScrollStage.$Class {
  static override readonly ITEM_COUNT: number = 360;

  /** A heading, then the paragraphs of the chapter. */
  static override get CHAPTER_ROWS() {
    return 6;
  }

  /** Paragraph rows are tall: the fallback span before geometry knows it. */
  static override get ASSUMED_ROW_PX() {
    return 150;
  }

  /** Smoother, taller ridges: the far ones lifted into the haze. */
  static override get RIDGES(): ScrollStage.Ridge[] {
    return [
      { key: 'far', factor: 0.1, base: 0.46, amplitude: 0.2, points: 7 },
      { key: 'mid', factor: 0.24, base: 0.6, amplitude: 0.15, points: 9 },
      { key: 'near', factor: 0.45, base: 0.74, amplitude: 0.11, points: 11 },
      { key: 'ground', factor: 0.75, base: 0.9, amplitude: 0.04, points: 6 }
    ];
  }

  /** The clouds of a scene: each drifts across by its own fraction of the
   *  chapter's progress, in hundredths of the stage's width. */
  static get CLOUDS(): ScrollFlight.Cloud[] {
    return [
      { key: 'cloud-a', drift: 22, lift: 3 },
      { key: 'cloud-b', drift: -14, lift: 5 }
    ];
  }

  /** The chapter cycle of what crosses the sky. */
  static get KINDS(): ScrollFlight.Kind[] {
    return ['birds', 'plane', 'both'];
  }

  /** The plane's path in perspective: from far left to near right over the
   *  chapter, banking through the middle. Positions in the stage's units,
   *  depth in px against the stage's perspective. */
  static get PLANE_PATH() {
    return { fromX: -36, toX: 130, baseY: 56, arcY: 34, fromZ: -640, toZ: 300, bank: 42, roll: 9 };
  }

  static get PLANE_PARKED() {
    return 'translate3d(-60cqw, 30cqh, -900px)';
  }

  static get FLOCK_PARKED() {
    return 'translate(130cqw, 12cqh)';
  }

  /** The fraction of a chapter over which the birds and the plane come in. */
  static get ENTRY_FRACTION() {
    return 0.12;
  }

  static get TITLES() {
    return [
      'The valley wakes',
      'Above the cloud line',
      'A plane in the pass',
      'The long ridge',
      'Where the light turns',
      'Wind from the east',
      'The last pass before dark',
      'Night over the range',
      'The birds come back',
      'Morning on the high plain',
      'The crossing',
      'Home by the river'
    ];
  }

  static get PARAGRAPHS() {
    return [
      'The first light finds the far ridge before it finds the valley. For a while the mountains are the only thing awake, a line of pale rock over a floor still dark, and then the light comes down the slopes the way water would, filling each fold in turn.',
      'Above the cloud line the air is thin and very clear. The peaks stand out of the white like islands, and the shadows they throw across it are so sharp you could cut along them. Nothing up here is in a hurry. The wind does the moving.',
      'A small plane came through the pass below us, lower than we were, close enough to see the propeller as a blur. It banked once over the river and straightened toward the north, growing smaller until it was a mark on the haze, and then it was gone.',
      'The long ridge runs for most of a day. You walk it with the valley on your left and the next range on your right, and the path never quite decides which side to fall toward. By the afternoon you stop looking at the map. The ridge is the map.',
      'There is an hour when the light turns and every colour in the range changes at once. The rock that was grey goes copper, the haze goes rose, the snow on the high faces goes a blue that was not there a minute earlier. It does not last. That is the point of it.',
      'The wind came from the east all night and by morning it had cleared the valley of every cloud. The birds took it as a road. We watched a line of them cross the whole width of the sky without a single wingbeat, riding what we could only feel.',
      'The last pass before dark is the steepest, and you take it slowly, with the sun already behind the western wall. The far peaks are still lit. You climb toward that light while the valley fills with shadow below you, and at the top the two meet.',
      'Night over the range is not dark. The snowfields hold the starlight and give it back, and the ridges stand against the sky like torn paper. You can walk by it. You can read the shape of the whole horizon by what it hides.',
      'The birds come back in the second week, in numbers, and the sky over the lake is never empty again. They arrive from the south in long loose lines that bend and re-form as they cross, and settle on the water all at once, as if on a word.',
      'Morning on the high plain is cold and wide and utterly still. The mountains are a long way off now, a blue wall along the edge of everything. You can see a whole day of walking laid out flat in front of you, and nothing moving on it but your own shadow.',
      'The crossing takes the better part of the afternoon. Halfway over, the far side is no closer and the near side no further, and the only proof of progress is the angle of the sun. Then, all at once, the far shore has trees on it, and rocks, and a path.',
      'Home by the river, the mountains are a rumour on the horizon, something you might have imagined. But the light at the end of the day still turns, and you still look up for it, and when the birds cross you count them without meaning to.'
    ];
  }

  /** The title of a chapter — the cycle wraps. */
  static titleOf(chapter: number): string {
    return this.TITLES[(chapter - 1) % this.TITLES.length];
  }

  /** What crosses a chapter's sky. */
  static kindOf(chapter: number): ScrollFlight.Kind {
    return this.KINDS[(chapter - 1) % this.KINDS.length];
  }

  static hasBirds(chapter: number): boolean {
    return this.kindOf(chapter) !== 'plane';
  }

  static hasPlane(chapter: number): boolean {
    return this.kindOf(chapter) !== 'birds';
  }

  /** The rows: a heading with the chapter's title, then its paragraphs. */
  static override buildItems(): ScrollFlight.Row[] {
    const items = new Array<ScrollFlight.Row>(this.ITEM_COUNT);
    for (let index = 0; index < this.ITEM_COUNT; index++) {
      const chapter = Math.floor(index / this.CHAPTER_ROWS) + 1;
      const line = index % this.CHAPTER_ROWS;
      const paragraph = (chapter - 1 + line - 1) % this.PARAGRAPHS.length;
      items[index] = {
        id: String(index),
        position: String(index + 1),
        chapter,
        heading: line === 0,
        title: this.titleOf(chapter),
        body: line === 0 ? `Chapter ${chapter}` : this.PARAGRAPHS[paragraph]
      };
    }
    return items;
  }

  /** A chapter's skyline for one ridge, smooth: the seeded points are the
   *  controls of a run of quadratic curves through their midpoints. */
  static override ridgePath(chapter: number, ridge: ScrollStage.Ridge): string {
    let seed = chapter * 9973 + ridge.points * 7919;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const { width, height } = this.RIDGE_BOX;
    const points: Array<[number, number]> = [];
    for (let step = 0; step <= ridge.points; step++) {
      const x = Math.round((step / ridge.points) * width);
      const y = Math.round((ridge.base + (next() - 0.5) * 2 * ridge.amplitude) * height);
      points.push([x, y]);
    }
    let path = `M0 ${points[0][1]}`;
    for (let index = 1; index < points.length - 1; index++) {
      const [cx, cy] = points[index];
      const [nx, ny] = points[index + 1];
      path += ` Q${cx} ${cy} ${Math.round((cx + nx) / 2)} ${Math.round((cy + ny) / 2)}`;
    }
    const [lx, ly] = points[points.length - 1];
    path += ` L${lx} ${ly}`;
    return `${path} L${width} ${height} L0 ${height} Z`;
  }

  /** A chapter's palette: a time of day that cycles every four chapters
   *  over a hue that walks the wheel, the ridges paling into the sky the
   *  farther back they stand, a sun that is a moon at night. */
  static override palette(chapter: number): ScrollFlight.Palette {
    const hue = (chapter * 47) % 360;
    const time = (['dawn', 'day', 'dusk', 'night'] as const)[(chapter - 1) % 4];
    const light = { dawn: [14, 56], day: [40, 66], dusk: [12, 42], night: [5, 15] }[time];
    const warm = (hue + { dawn: 38, day: 10, dusk: 50, night: -20 }[time] + 360) % 360;
    const [top, bottom] = light;
    const ridge = (depth: number) => {
      // depth 0 is the farthest ridge: it takes most of the sky's light
      const lightness = bottom * (0.72 - depth * 0.19) + 4;
      const saturation = 30 + depth * 8;
      return `hsl(${hue} ${saturation}% ${Math.round(lightness)}%)`;
    };
    const sun = {
      dawn: 'radial-gradient(circle at 40% 40%, #fff2d6, #ffb45c 55%, #ff7a3d 100%)',
      day: 'radial-gradient(circle at 40% 40%, #ffffff, #fff1b8 50%, #ffd27a 100%)',
      dusk: 'radial-gradient(circle at 40% 40%, #ffe3c2, #ff9a4d 50%, #e9552e 100%)',
      night: 'radial-gradient(circle at 42% 38%, #f6f8ff, #cfd8f5 55%, #98a6d6 100%)'
    }[time];
    return {
      time,
      skyTop: `hsl(${hue} 50% ${top}%)`,
      skyBottom: `hsl(${warm} 62% ${bottom}%)`,
      haze: `hsl(${warm} 70% ${Math.min(88, bottom + 24)}% / 0.42)`,
      sun,
      ridges: [ridge(0), ridge(1), ridge(2), ridge(3)]
    };
  }

  constructor() {
    super();
    // the flock's canvas mounts with the stage: the GPU loop runs while it does
    watch(
      () => this.flockCanvas.value,
      () => this.onFlockCanvasChange()
    );
    onUnmounted(() => this.flock.value?.stop());
  }

  protected override get self() {
    return this.constructor as typeof $ScrollFlight;
  }

  // STATE
  /** The flock renderer, once its canvas is mounted. */
  protected get flock() {
    return shallowRef<BirdFlock.Model | null>(null);
  }

  // ELEMENT REFS
  get flockCanvas() {
    return ref<HTMLCanvasElement | null>(null);
  }

  // DERIVED
  get chapterTitle(): string {
    return this.self.titleOf(this.chapter);
  }

  get kindLabel(): string {
    return { birds: 'a flock', plane: 'a plane', both: 'a flock and a plane' }[
      this.self.kindOf(this.chapter)
    ];
  }

  // TRACKS
  /** A cloud's drift across a slot's sky: its fraction of the progress. */
  cloudTransform(slot: number, cloud: ScrollFlight.Cloud, value: number): string {
    const role = this.roleOf(slot, value);
    const x = (role.progress * cloud.drift).toFixed(3);
    const y = (-role.progress * cloud.lift).toFixed(3);
    return `translate(${x}cqw, ${y}cqh)`;
  }

  /** The plane's crossing in perspective: far left to near right, an arc
   *  in height, banking through the middle. Parked when the chapter has none. */
  planeTransform(value: number): string {
    const local = this.localOf(value);
    const self = this.self;
    if (!self.hasPlane(local.chapter)) return self.PLANE_PARKED;
    const path = self.PLANE_PATH;
    const progress = local.progress;
    const x = (path.fromX + progress * (path.toX - path.fromX)).toFixed(3);
    const y = (path.baseY - Math.sin(progress * Math.PI) * path.arcY).toFixed(3);
    const z = (path.fromZ + progress * (path.toZ - path.fromZ)).toFixed(1);
    const bank = ((0.5 - progress) * path.bank).toFixed(2);
    const roll = (Math.sin(progress * Math.PI * 2) * path.roll).toFixed(2);
    return `translate3d(${x}cqw, ${y}cqh, ${z}px) rotateY(${bank}deg) rotateZ(${roll}deg)`;
  }

  /** How present a crossing is: in over the entry fraction, out with the
   *  chapter's fade, gone when the chapter has none. */
  crossingOpacity(value: number, present: boolean): string {
    if (!present) return '0.000';
    const local = this.localOf(value);
    const self = this.self;
    const entry = Math.min(1, local.progress / self.ENTRY_FRACTION);
    return (entry * (1 - self.fadeAt(local.progress))).toFixed(3);
  }

  planeOpacity(value: number): string {
    return this.crossingOpacity(value, this.self.hasPlane(this.localOf(value).chapter));
  }

  /** The flock's crossing: right to left over the chapter, lifting a little. */
  flockTransform(value: number): string {
    const local = this.localOf(value);
    if (!this.self.hasBirds(local.chapter)) return this.self.FLOCK_PARKED;
    const progress = local.progress;
    const x = (104 - progress * 132).toFixed(3);
    const y = (16 - Math.sin(progress * Math.PI) * 7 + progress * 6).toFixed(3);
    return `translate(${x}cqw, ${y}cqh)`;
  }

  flockOpacity(value: number): string {
    return this.crossingOpacity(value, this.self.hasBirds(this.localOf(value).chapter));
  }

  /** The stage's tracks, then the flight's: the clouds per slot, the plane
   *  and the flock once — a transform and an opacity each. */
  protected override buildTracks(stage: HTMLElement): ScrollStage.Track[] {
    const tracks = super.buildTracks(stage);
    for (let slot = 0; slot < this.self.SLOTS; slot++) {
      const root = stage.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
      if (!root) continue;
      for (const cloud of this.self.CLOUDS) {
        const element = root.querySelector<HTMLElement>(`[data-track="${cloud.key}"]`);
        if (element)
          tracks.push({
            element,
            property: 'transform',
            formatOf: (value) => this.cloudTransform(slot, cloud, value)
          });
      }
    }
    const plane = stage.querySelector<HTMLElement>('[data-track="plane"]');
    if (plane) {
      tracks.push({ element: plane, property: 'transform', formatOf: (value) => this.planeTransform(value) });
      tracks.push({ element: plane, property: 'opacity', formatOf: (value) => this.planeOpacity(value) });
    }
    const flock = stage.querySelector<HTMLElement>('[data-track="flock"]');
    if (flock) {
      tracks.push({ element: flock, property: 'transform', formatOf: (value) => this.flockTransform(value) });
      tracks.push({ element: flock, property: 'opacity', formatOf: (value) => this.flockOpacity(value) });
    }
    return tracks;
  }

  // METHODS
  /** The stage's scene, then the flight's: the haze and the sun's face. */
  override drawScene(slot: number, chapter: number) {
    super.drawScene(slot, chapter);
    const root = this.stage.value?.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
    if (!root) return;
    const palette = this.self.palette(chapter);
    root.style.setProperty('--haze', palette.haze);
    root.style.setProperty('--sun', palette.sun);
    root.dataset.time = palette.time;
  }

  /** A pointer lands on the frame: the flock is startled from that point.
   *  The scroll is untouched — a drag still drags; this only tells the
   *  birds where the hand came down. */
  onFramePointerDown(event: PointerEvent) {
    this.flock.value?.startleAt(event.clientX, event.clientY);
  }

  /** The flock's canvas resolved (or cleared): the GPU loop follows it. */
  onFlockCanvasChange() {
    this.flock.value?.stop();
    this.flock.value = null;
    const canvas = this.flockCanvas.value;
    if (!canvas) return;
    const flock = new BirdFlock.Class(canvas);
    flock.start();
    this.flock.value = flock;
  }
}

export namespace ScrollFlight {
  export const $Class = Static($ScrollFlight); // anchor — it declares statics
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Row extends ScrollStage.Row {
    title: string;
  }

  export type Kind = 'birds' | 'plane' | 'both';

  /** A cloud of a scene: how far it drifts and lifts over a chapter. */
  export interface Cloud {
    key: string;
    drift: number;
    lift: number;
  }

  export interface Palette extends ScrollStage.Palette {
    time: 'dawn' | 'day' | 'dusk' | 'night';
    haze: string;
    sun: string;
  }
}
