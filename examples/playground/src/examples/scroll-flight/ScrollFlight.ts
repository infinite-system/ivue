// ScrollFlight.ts — the scroll stage, extended: a flight through three
// worlds. The scene machinery is the stage's (slots, roles, the fade, the
// handoff onto the compositor and back) and this class adds what a flight
// needs — a theme per chapter (mountains, a beach, a rain forest), a time of
// day, drifting clouds, two planes built in real 3D that fly into and out of
// the screen, a flock on the GPU — as tracks over the same one number. Two
// clocks, split by what they are: everything that moves WITH the scroll is a
// transform the compositor plays; the wingbeat, the rain and the propeller,
// which do not, are clocks of their own (lenis/presented-motion.generator.md).
import { onUnmounted, ref, shallowRef, watch } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { ScrollStage } from '../scroll-stage/ScrollStage';
import { BirdFlock } from './BirdFlock';

class $ScrollFlight extends ScrollStage.$Class {
  static override readonly ITEM_COUNT: number = 360;

  /** A heading, the paragraphs of the chapter, then an interlude. */
  static override get CHAPTER_ROWS() {
    return 6;
  }

  /** The interludes, one closing each chapter in turn: the site's own
   *  illustrations, pulled in as their span crosses the frame. */
  static override get INTERLUDES(): ScrollStage.Interlude[] {
    return [
      { kind: 'image', src: '/blog/art/three-years-to-reduce-art-1.png', caption: 'Three years to reduce' },
      { kind: 'image', src: '/blog/art/discovered-not-invented-art-1.png', caption: 'Discovered, not invented' },
      { kind: 'video', src: '/video/ivue-objects.mp4', caption: 'The object graph, on film — a video on its own clock' },
      { kind: 'image', src: '/blog/art/win-by-reduction-art-1.png', caption: 'Win by reduction' },
      { kind: 'image', src: '/blog/art/the-object-graph-they-took-art-1.png', caption: 'The object graph they took' },
      { kind: 'image', src: '/blog/art/twenty-million-cells-art-1.png', caption: 'Twenty million cells' },
      { kind: 'image', src: '/blog/art/the-field-not-the-rules-art-1.png', caption: 'The field, not the rules' },
      { kind: 'image', src: '/blog/art/what-javascript-becomes-art-1.png', caption: 'What JavaScript becomes' },
      { kind: 'image', src: '/blog/art/uniformity-is-a-measuring-device-art-1.png', caption: 'Uniformity is a measuring device' },
      { kind: 'image', src: '/blog/art/agents-built-an-editor-art-1.png', caption: 'Agents built an editor' }
    ];
  }

  /** Paragraph rows are tall: the fallback span before geometry knows it. */
  static override get ASSUMED_ROW_PX() {
    return 150;
  }

  /** The worlds, one per chapter in turn. */
  static get THEMES(): ScrollFlight.Theme[] {
    return ['mountains', 'beach', 'rainforest'];
  }

  /** The mountain ridges: smooth, tall, the far ones lifted into the haze. */
  static override get RIDGES(): ScrollStage.Ridge[] {
    return [
      { key: 'far', factor: 0.1, base: 0.44, amplitude: 0.2, points: 7 },
      { key: 'mid', factor: 0.24, base: 0.58, amplitude: 0.15, points: 9 },
      { key: 'near', factor: 0.45, base: 0.72, amplitude: 0.11, points: 11 },
      { key: 'ground', factor: 0.75, base: 0.9, amplitude: 0.04, points: 6 }
    ];
  }

  /** The ridges that carry snow: the two farthest, highest ones. */
  static get SNOW_RIDGES() {
    return ['far', 'mid'];
  }

  /** How deep the snow band runs under a skyline, in box units. */
  static get SNOW_DEPTH() {
    return 70;
  }

  /** The beach's one ridge: an island on the horizon. */
  static get ISLAND(): ScrollStage.Ridge {
    return { key: 'island', factor: 0.06, base: 0.6, amplitude: 0.05, points: 4 };
  }

  /** The palms' parallax across the beach, in hundredths of the width. */
  static get PALM_DRIFT_CQW() {
    return 7;
  }

  /** The rain forest's canopies, back to front: rounded crowns. */
  static get CANOPIES(): ScrollStage.Ridge[] {
    return [
      { key: 'canopy-far', factor: 0.1, base: 0.5, amplitude: 0.06, points: 9 },
      { key: 'canopy-mid', factor: 0.26, base: 0.62, amplitude: 0.07, points: 8 },
      { key: 'canopy-near', factor: 0.5, base: 0.76, amplitude: 0.08, points: 6 }
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

  /** The jet flies INTO the screen: it enters near the camera, low left, and
   *  climbs away toward the far ridge, shrinking as the perspective takes it.
   *  Positions in the stage's units, depth in px against the stage's
   *  perspective, the yaw turning its nose into the screen. */
  static get JET_PATH() {
    return { fromX: 6, toX: 64, fromY: 80, toY: 28, fromZ: 520, toZ: -1500, yaw: -52, pitch: -8, bank: 52, roll: 10 };
  }

  /** The seaplane flies OUT of the screen: it appears over the sea near the
   *  horizon and comes low over the beach toward the camera, growing, and
   *  leaves past the frame's left edge at its largest. */
  static get SEAPLANE_PATH() {
    return { fromX: 80, toX: -34, fromY: 44, toY: 74, fromZ: -1400, toZ: 560, yaw: 142, pitch: 3, bank: -48, roll: -8 };
  }

  static get PLANE_PARKED() {
    return 'translate3d(-80cqw, 40cqh, -1500px)';
  }

  static get FLOCK_PARKED() {
    return 'translate(130cqw, 12cqh)';
  }

  /** The fraction of a chapter over which a crossing comes in. */
  static get ENTRY_FRACTION() {
    return 0.12;
  }

  static get TITLES() {
    return {
      mountains: ['The valley wakes', 'Above the cloud line', 'A jet through the pass', 'Night over the range'],
      beach: ['The seaplane comes in', 'Palms in the east wind', 'Low over the water', 'The last light on the reef'],
      rainforest: ['Rain on the canopy', 'The birds come back', 'Mist in the trees', 'The forest at night']
    } as Record<ScrollFlight.Theme, string[]>;
  }

  static get PARAGRAPHS() {
    return {
      mountains: [
        'The first light finds the far ridge before it finds the valley. For a while the mountains are the only thing awake, a line of pale rock over a floor still dark, and then the light comes down the slopes the way water would, filling each fold in turn.',
        'Above the cloud line the air is thin and very clear. The peaks stand out of the white like islands, and the shadows they throw across it are so sharp you could cut along them. Nothing up here is in a hurry. The wind does the moving.',
        'The jet came through low, from right over our heads, and climbed away into the pass with the sound arriving a full second behind it. It banked once against the snow and straightened for the north, and we watched it shrink into a mark on the haze, and then into nothing.',
        'Night over the range is not dark. The snowfields hold the starlight and give it back, and the ridges stand against the sky like torn paper. You can walk by it. You can read the shape of the whole horizon by what it hides.'
      ],
      beach: [
        'We heard the seaplane before we saw it, a drone out over the water that grew until it was a shape against the island, then a plane, then a plane with floats coming straight at the beach. It flattened out over the reef and passed so low the palms leaned.',
        'The palms take the east wind all day. They lean the same way, every one of them, fronds streaming, and the sand goes with the wind in long low ribbons that never quite settle. You learn to sit with your back to it.',
        'Low over the water the sea turns from green to a blue so deep it looks solid. The pilot follows the reef line for the fun of it, banking a little each way, and the shadow of the plane runs across the shallows beside us like something alive.',
        'The last light on the reef is copper for about four minutes. The island goes black against it, the sea holds the colour longer than the sky does, and then the first star is out and the water is only sound.'
      ],
      rainforest: [
        'The rain starts in the canopy long before it reaches the ground. You hear it first, a hiss across the whole roof of the forest, and then the light changes, and then, a full minute later, the first drops come down through the leaves.',
        'The birds come back the hour the rain stops. They arrive over the canopy in long loose lines that bend and re-form as they cross, and drop into the trees all at once, as if on a word, and the whole forest starts talking.',
        'Mist sits in the trees all morning. The far crowns are a suggestion, the near ones are dark and wet and every leaf is running, and somewhere under all of it a river is going by that you will not see until the afternoon.',
        'The forest at night is louder than by day. The rain comes back after dark, softer, and under it the frogs and the insects and something larger moving slowly on the ground, and above it, once, the whole canopy lit by lightning with no thunder.'
      ]
    } as Record<ScrollFlight.Theme, string[]>;
  }

  /** The world a chapter is in. */
  static themeOf(chapter: number): ScrollFlight.Theme {
    return this.THEMES[(chapter - 1) % this.THEMES.length];
  }

  /** The time of day, cycling on its own, so a world is seen in every light. */
  static timeOf(chapter: number): ScrollFlight.Time {
    return (['dawn', 'day', 'dusk', 'night'] as const)[(chapter - 1) % 4];
  }

  /** Which of a world's titles a chapter carries. */
  static cycleOf(chapter: number): number {
    return Math.floor((chapter - 1) / this.THEMES.length) % 4;
  }

  static titleOf(chapter: number): string {
    return this.TITLES[this.themeOf(chapter)][this.cycleOf(chapter)];
  }

  /** What crosses a chapter's sky: a jet over the mountains, a seaplane and
   *  a flock over the beach, a flock over the forest. */
  static hasJet(chapter: number): boolean {
    return this.themeOf(chapter) === 'mountains';
  }

  static hasSeaplane(chapter: number): boolean {
    return this.themeOf(chapter) === 'beach';
  }

  static hasBirds(chapter: number): boolean {
    return this.themeOf(chapter) !== 'mountains';
  }

  /** The rows: a heading with the chapter's title, then its paragraphs. */
  static override buildItems(): ScrollFlight.Row[] {
    const items = new Array<ScrollFlight.Row>(this.ITEM_COUNT);
    for (let index = 0; index < this.ITEM_COUNT; index++) {
      const chapter = Math.floor(index / this.CHAPTER_ROWS) + 1;
      const line = index % this.CHAPTER_ROWS;
      const paragraphs = this.PARAGRAPHS[this.themeOf(chapter)];
      const last = line === this.CHAPTER_ROWS - 1;
      const interludes = this.INTERLUDES;
      items[index] = {
        id: String(index),
        position: String(index + 1),
        chapter,
        heading: line === 0,
        title: this.titleOf(chapter),
        body: line === 0 ? `Chapter ${chapter}` : last ? '' : paragraphs[(this.cycleOf(chapter) + line - 1) % paragraphs.length],
        ...(last && interludes.length ? { interlude: interludes[(chapter - 1) % interludes.length] } : {})
      };
    }
    return items;
  }

  /** The seeded points of a skyline across the box, for one chapter and ridge. */
  static skylinePoints(chapter: number, ridge: ScrollStage.Ridge): Array<[number, number]> {
    let seed = chapter * 9973 + ridge.points * 7919 + ridge.key.length * 131;
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
    return points;
  }

  /** A run of quadratic curves through the midpoints of the points. */
  static smoothLine(points: Array<[number, number]>): string {
    let line = `M${points[0][0]} ${points[0][1]}`;
    for (let index = 1; index < points.length - 1; index++) {
      const [cx, cy] = points[index];
      const [nx, ny] = points[index + 1];
      line += ` Q${cx} ${cy} ${Math.round((cx + nx) / 2)} ${Math.round((cy + ny) / 2)}`;
    }
    const [lx, ly] = points[points.length - 1];
    return `${line} L${lx} ${ly}`;
  }

  /** A chapter's skyline for one ridge, smooth, filled to the box's floor. */
  static override ridgePath(chapter: number, ridge: ScrollStage.Ridge): string {
    const { width, height } = this.RIDGE_BOX;
    return `${this.smoothLine(this.skylinePoints(chapter, ridge))} L${width} ${height} L0 ${height} Z`;
  }

  /** The snow on a ridge: a band under the skyline, its lower edge the same
   *  line dropped by the snow depth, so the crowns keep it and the flanks
   *  shed it as the line falls. */
  static snowPath(chapter: number, ridge: ScrollStage.Ridge): string {
    const points = this.skylinePoints(chapter, ridge);
    const lower = points.map(([x, y]) => [x, y + this.SNOW_DEPTH] as [number, number]).reverse();
    const under = this.smoothLine(lower).replace(/^M/, 'L');
    return `${this.smoothLine(points)} ${under} Z`;
  }

  /** A canopy: a row of rounded crowns, each a dome between two of the
   *  seeded points, with a trunk under every crown down to the box floor. */
  static canopyPath(chapter: number, canopy: ScrollStage.Ridge): string {
    const points = this.skylinePoints(chapter, canopy);
    const { height } = this.RIDGE_BOX;
    let path = `M${points[0][0]} ${height}`;
    for (let index = 0; index < points.length - 1; index++) {
      const [x0, y0] = points[index];
      const [x1, y1] = points[index + 1];
      const base = Math.max(y0, y1);
      const crown = Math.min(y0, y1) - Math.round((x1 - x0) * 0.22);
      const mid = Math.round((x0 + x1) / 2);
      path += ` L${x0} ${base} Q${x0} ${crown} ${mid} ${crown} Q${x1} ${crown} ${x1} ${base}`;
    }
    path += ` L${points[points.length - 1][0]} ${height} Z`;
    // the trunks: one under each crown
    for (let index = 0; index < points.length - 1; index++) {
      const [x0, y0] = points[index];
      const [x1, y1] = points[index + 1];
      const mid = Math.round((x0 + x1) / 2);
      const half = Math.max(6, Math.round((x1 - x0) * 0.04));
      const top = Math.max(y0, y1) - 20;
      path += ` M${mid - half} ${top} L${mid + half} ${top} L${mid + half} ${height} L${mid - half} ${height} Z`;
    }
    return path;
  }

  /** A chapter's palette: its world's colours under its time of day, the
   *  layers paling into the sky the farther back they stand. */
  static override palette(chapter: number): ScrollFlight.Palette {
    const theme = this.themeOf(chapter);
    const time = this.timeOf(chapter);
    const hue = { mountains: 215, beach: 200, rainforest: 150 }[theme];
    const light = { dawn: [18, 60], day: [48, 72], dusk: [14, 46], night: [5, 14] }[time];
    // the horizon's hue: warm at dawn and dusk, the sky's own by day, deeper at night
    const warm = { dawn: 26, day: hue + 8, dusk: 16, night: (hue + 340) % 360 }[time];
    const [top, bottom] = light;
    const groundHue = { mountains: 222, beach: 42, rainforest: 140 }[theme];
    const layer = (depth: number) => {
      const lightness = bottom * (0.7 - depth * 0.17) + 4;
      const saturation = { mountains: 26 + depth * 6, beach: 36 + depth * 8, rainforest: 34 + depth * 10 }[theme];
      return `hsl(${groundHue} ${saturation}% ${Math.round(lightness)}%)`;
    };
    const sun = {
      dawn: 'radial-gradient(circle at 40% 40%, #fff2d6, #ffb45c 55%, #ff7a3d 100%)',
      day: 'radial-gradient(circle at 40% 40%, #ffffff, #fff1b8 50%, #ffd27a 100%)',
      dusk: 'radial-gradient(circle at 40% 40%, #ffe3c2, #ff9a4d 50%, #e9552e 100%)',
      night: 'radial-gradient(circle at 42% 38%, #f6f8ff, #cfd8f5 55%, #98a6d6 100%)'
    }[time];
    return {
      theme,
      time,
      skyTop: `hsl(${hue} ${theme === 'rainforest' ? 30 : 52}% ${top}%)`,
      skyBottom: `hsl(${warm} ${theme === 'rainforest' ? 34 : time === 'day' ? 62 : 72}% ${bottom}%)`,
      haze: `hsl(${warm} 70% ${Math.min(88, bottom + 24)}% / ${theme === 'rainforest' ? 0.55 : 0.42})`,
      sun,
      ridges: [layer(0), layer(1), layer(2), layer(3)],
      snow: `hsl(${hue} 30% ${Math.min(96, bottom + 30)}%)`,
      sea: `hsl(${hue - 10} 60% ${Math.round(bottom * 0.55 + 6)}%)`,
      sand: `hsl(42 46% ${Math.round(bottom * 0.9 + 8)}%)`
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

  get themeLabel(): string {
    return { mountains: 'the mountains', beach: 'the beach', rainforest: 'the rain forest' }[
      this.self.themeOf(this.chapter)
    ];
  }

  get kindLabel(): string {
    const self = this.self;
    const chapter = this.chapter;
    if (self.hasJet(chapter)) return 'a jet, into the screen';
    if (self.hasSeaplane(chapter)) return 'a seaplane and a flock';
    return 'a flock, in the rain';
  }

  // TRACKS
  /** A cloud's drift across a slot's sky: its fraction of the progress. */
  cloudTransform(slot: number, cloud: ScrollFlight.Cloud, value: number): string {
    const role = this.roleOf(slot, value);
    const x = (role.progress * cloud.drift).toFixed(3);
    const y = (-role.progress * cloud.lift).toFixed(3);
    return `translate(${x}cqw, ${y}cqh)`;
  }

  /** The palms lean across the beach as the chapter goes by. */
  palmsTransform(slot: number, value: number): string {
    const role = this.roleOf(slot, value);
    return `translateX(${(-role.progress * this.self.PALM_DRIFT_CQW).toFixed(3)}cqw)`;
  }

  /** A plane along a 3D path at a chapter's progress: a straight line in x, y
   *  and depth, an arc in height, its yaw fixed along the line, a constant
   *  bank so the camera sees its wings, and a roll on top that banks it
   *  through the middle. The model's nose points along +x, so a yaw is a
   *  turn about y, a pitch a turn about z, and a bank a turn about x — in
   *  that order, the bank in the plane's own frame. */
  protected planeAlong(path: ScrollFlight.PlanePath, progress: number): string {
    const x = (path.fromX + progress * (path.toX - path.fromX)).toFixed(3);
    const y = (path.fromY + progress * (path.toY - path.fromY) - Math.sin(progress * Math.PI) * 10).toFixed(3);
    const z = (path.fromZ + progress * (path.toZ - path.fromZ)).toFixed(1);
    const bank = (path.bank + Math.sin(progress * Math.PI) * path.roll).toFixed(2);
    return `translate3d(${x}cqw, ${y}cqh, ${z}px) rotateY(${path.yaw}deg) rotateZ(${path.pitch}deg) rotateX(${bank}deg)`;
  }

  /** The jet: into the screen, over the mountains, over the chapter's text.
   *  Parked elsewhere. */
  jetTransform(value: number): string {
    const local = this.textLocalOf(value);
    const self = this.self;
    if (!self.hasJet(local.chapter)) return self.PLANE_PARKED;
    return this.planeAlong(self.JET_PATH, local.progress);
  }

  /** The seaplane: out of the distance, over the beach, over the chapter's
   *  text. Parked elsewhere. */
  seaplaneTransform(value: number): string {
    const local = this.textLocalOf(value);
    const self = this.self;
    if (!self.hasSeaplane(local.chapter)) return self.PLANE_PARKED;
    return this.planeAlong(self.SEAPLANE_PATH, local.progress);
  }

  /** How present a crossing is: in over the entry fraction of the chapter's
   *  text, out with the text's last fraction — so it is gone before the
   *  interlude takes the frame — and gone when the chapter has none. */
  crossingOpacity(value: number, present: boolean): string {
    if (!present) return '0.000';
    const local = this.textLocalOf(value);
    const self = this.self;
    const entry = Math.min(1, local.progress / self.ENTRY_FRACTION);
    return (entry * (1 - self.fadeAt(local.progress))).toFixed(3);
  }

  jetOpacity(value: number): string {
    return this.crossingOpacity(value, this.self.hasJet(this.localOf(value).chapter));
  }

  seaplaneOpacity(value: number): string {
    return this.crossingOpacity(value, this.self.hasSeaplane(this.localOf(value).chapter));
  }

  /** The flock's crossing: right to left over the chapter's text, lifting a little. */
  flockTransform(value: number): string {
    const local = this.textLocalOf(value);
    if (!this.self.hasBirds(local.chapter)) return this.self.FLOCK_PARKED;
    const progress = local.progress;
    const x = (104 - progress * 132).toFixed(3);
    const y = (16 - Math.sin(progress * Math.PI) * 7 + progress * 6).toFixed(3);
    return `translate(${x}cqw, ${y}cqh)`;
  }

  flockOpacity(value: number): string {
    return this.crossingOpacity(value, this.self.hasBirds(this.localOf(value).chapter));
  }

  /** The stage's tracks, then the flight's: per slot the clouds, the island,
   *  the palms and the canopies; once, the jet, the seaplane and the flock —
   *  a transform and an opacity each. */
  protected override buildTracks(stage: HTMLElement): ScrollStage.Track[] {
    const tracks = super.buildTracks(stage);
    const self = this.self;
    const transform = (element: HTMLElement | null, formatOf: (value: number) => string) => {
      if (element) tracks.push({ element, property: 'transform', formatOf });
    };
    const opacity = (element: HTMLElement | null, formatOf: (value: number) => string) => {
      if (element) tracks.push({ element, property: 'opacity', formatOf });
    };
    for (let slot = 0; slot < self.SLOTS; slot++) {
      const root = stage.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
      if (!root) continue;
      const track = (key: string) => root.querySelector<HTMLElement>(`[data-track="${key}"]`);
      for (const cloud of self.CLOUDS) transform(track(cloud.key), (value) => this.cloudTransform(slot, cloud, value));
      transform(track(self.ISLAND.key), (value) => this.ridgeTransform(slot, self.ISLAND, value));
      transform(track('palms'), (value) => this.palmsTransform(slot, value));
      for (const canopy of self.CANOPIES) transform(track(canopy.key), (value) => this.ridgeTransform(slot, canopy, value));
    }
    const jet = stage.querySelector<HTMLElement>('[data-track="jet"]');
    transform(jet, (value) => this.jetTransform(value));
    opacity(jet, (value) => this.jetOpacity(value));
    const seaplane = stage.querySelector<HTMLElement>('[data-track="seaplane"]');
    transform(seaplane, (value) => this.seaplaneTransform(value));
    opacity(seaplane, (value) => this.seaplaneOpacity(value));
    const flock = stage.querySelector<HTMLElement>('[data-track="flock"]');
    transform(flock, (value) => this.flockTransform(value));
    opacity(flock, (value) => this.flockOpacity(value));
    return tracks;
  }

  // METHODS
  /** The stage's scene — the sky and the ridges — then the world's: the
   *  theme and the time on the slot, the snow, the island, the canopies,
   *  the sea and the sand, the haze and the sun's face. */
  override drawScene(slot: number, chapter: number) {
    super.drawScene(slot, chapter);
    const root = this.stage.value?.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
    if (!root) return;
    const self = this.self;
    const palette = self.palette(chapter);
    root.dataset.theme = palette.theme;
    root.dataset.time = palette.time;
    root.style.setProperty('--haze', palette.haze);
    root.style.setProperty('--sun', palette.sun);
    root.style.setProperty('--sea', palette.sea);
    root.style.setProperty('--sand', palette.sand);
    const pathOf = (key: string, selector = 'path') =>
      root.querySelector<SVGPathElement>(`[data-track="${key}"] ${selector}`);
    for (const ridge of self.RIDGES) {
      const snow = pathOf(ridge.key, 'path.snow');
      if (!snow) continue;
      const carries = self.SNOW_RIDGES.includes(ridge.key);
      snow.setAttribute('d', carries ? self.snowPath(chapter, ridge) : '');
      snow.setAttribute('fill', palette.snow);
    }
    const island = pathOf(self.ISLAND.key);
    island?.setAttribute('d', self.ridgePath(chapter, self.ISLAND));
    island?.setAttribute('fill', palette.ridges[1]);
    self.CANOPIES.forEach((canopy, index) => {
      const path = pathOf(canopy.key);
      path?.setAttribute('d', self.canopyPath(chapter, canopy));
      path?.setAttribute('fill', palette.ridges[index + 1]);
    });
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

  export type Theme = 'mountains' | 'beach' | 'rainforest';
  export type Time = 'dawn' | 'day' | 'dusk' | 'night';

  /** A cloud of a scene: how far it drifts and lifts over a chapter. */
  export interface Cloud {
    key: string;
    drift: number;
    lift: number;
  }

  /** A plane's line through the stage: from where to where, in the stage's
   *  units and px of depth, and how it sits on the line. */
  export interface PlanePath {
    fromX: number;
    toX: number;
    fromY: number;
    toY: number;
    fromZ: number;
    toZ: number;
    yaw: number;
    pitch: number;
    /** the constant bank the plane holds along the line, so its wings show */
    bank: number;
    /** the extra roll through the middle of the crossing */
    roll: number;
  }

  export interface Palette extends ScrollStage.Palette {
    theme: Theme;
    time: Time;
    haze: string;
    sun: string;
    snow: string;
    sea: string;
    sand: string;
  }
}
