/*
=== GENERATOR ===
Goal: A flight over the range moves WITH the scroll on one clock and breathes on another — every scroll-linked layer (ridges, clouds, a plane in perspective, the flock's place in the sky) is a track composed over the scroll's own sequence, and only what is not scroll-linked (the wingbeat, a startle) runs on the GPU's own frame.
[A glide plays on the compositor as held snapped keyframes](../../lenis/lenis.invariants.md#a-glide-plays-on-the-compositor-as-held-snapped-keyframes)
// domain-invariant: $ScrollFlight — If a layer moves with the scroll, then it is a track over the scroll value and nothing else: a plane's place in perspective, the flock's place in the sky, a cloud's drift, the palms' lean are formatters of the one number, parked or faded where their chapter has none.
// domain-invariant: $ScrollFlight — If a chapter crosses nothing of a kind, then that kind's opacity is zero for every value in it and its transform is the parked one; a crossing comes in over the entry fraction and goes out with the chapter's fade.
// domain-invariant: $ScrollFlight — If a chapter is in a world, then its slot carries that world and its time of day, the jet flies INTO the screen over the mountains (its depth falling), the seaplane OUT of it over the beach (its depth rising), and every skyline, snow band and canopy is seeded by the chapter.
Impossible if true: A plane visible in a chapter that has none.
Impossible if true: A jet whose depth rises as it crosses, or a seaplane whose depth falls.
Impossible if true: A flight track that reads anything but the scroll value.

=== GENERATOR-DESCRIBED ===
The flight is the stage extended: the same slots, roles and handoff, with
clouds, a plane and a flock added as tracks; the flock's own clock is
specified beside its class, in BirdFlock.test.ts.
*/

import { expect, test } from 'vitest';
import { ScrollFlight } from './ScrollFlight';
import type { Lenis } from '../../lenis/Lenis';

class FakeAnimation extends EventTarget {
  startTime: number | null = 1000;
  constructor(
    public frames: Keyframe[],
    public duration: number
  ) {
    super();
  }
  get effect() {
    return { getTiming: () => ({ duration: this.duration }), getKeyframes: () => this.frames };
  }
  cancel() {
    this.dispatchEvent(new Event('cancel'));
  }
}

const SVG = 'http://www.w3.org/2000/svg';

/** A stage with two slots (ridges, sun, clouds), a plane, a flock and a bar. */
function stageWithFlight() {
  const flight = new ScrollFlight.Class();
  const root = document.createElement('div');
  const animates: Array<{ element: Element; property: string; frames: Keyframe[] }> = [];
  const animatable = (element: Element) => {
    (element as unknown as { animate: unknown }).animate = (frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const property = Object.keys(frames[0]).find((key) => key !== 'easing' && key !== 'offset') ?? '';
      animates.push({ element, property, frames });
      return new FakeAnimation(frames, Number(options.duration));
    };
  };
  const tracked = (parent: Element, tag: string, key: string) => {
    const element = tag === 'svg' ? document.createElementNS(SVG, 'svg') : document.createElement(tag);
    element.setAttribute('data-track', key);
    if (tag === 'svg') element.appendChild(document.createElementNS(SVG, 'path'));
    animatable(element);
    parent.appendChild(element);
    return element;
  };
  for (const slot of [0, 1]) {
    const scene = document.createElement('div');
    scene.dataset.slot = String(slot);
    animatable(scene);
    for (const ridge of ScrollFlight.Class.RIDGES) {
      const svg = tracked(scene, 'svg', ridge.key);
      const snow = document.createElementNS(SVG, 'path');
      snow.setAttribute('class', 'snow');
      svg.appendChild(snow);
    }
    tracked(scene, 'div', 'sun');
    for (const cloud of ScrollFlight.Class.CLOUDS) tracked(scene, 'div', cloud.key);
    tracked(scene, 'svg', ScrollFlight.Class.ISLAND.key);
    tracked(scene, 'div', 'palms');
    for (const canopy of ScrollFlight.Class.CANOPIES) tracked(scene, 'svg', canopy.key);
    root.appendChild(scene);
  }
  tracked(root, 'div', 'jet');
  tracked(root, 'div', 'seaplane');
  tracked(root, 'div', 'flock');
  for (const slot of [0, 1]) {
    const figure = document.createElement('figure');
    figure.dataset.media = String(slot);
    figure.appendChild(document.createElement('img'));
    animatable(figure);
    root.appendChild(figure);
  }
  tracked(root, 'div', 'progress');
  flight.stage.value = root;
  return { flight, root, animates };
}

// domain-invariant: $ScrollFlight — If a chapter crosses nothing of a kind, then that kind's opacity is zero for every value in it and its transform is the parked one; a crossing comes in over the entry fraction and goes out with the chapter's fade.
// domain-invariant: $ScrollFlight — If a chapter is in a world, then its slot carries that world and its time of day, the jet flies INTO the screen over the mountains (its depth falling), the seaplane OUT of it over the beach (its depth rising), and every skyline, snow band and canopy is seeded by the chapter.
// impossible-if-true: $ScrollFlight — A plane visible in a chapter that has none.
// impossible-if-true: $ScrollFlight — A jet whose depth rises as it crosses, or a seaplane whose depth falls.
test('chapters cycle the worlds; the jet flies into the screen over the mountains, the seaplane out of it over the beach, each parked and clear elsewhere, in over the entry, out with the fade', () => {
  const flight = new ScrollFlight.Class();
  const { CHAPTER_ROWS, ASSUMED_ROW_PX, ENTRY_FRACTION, FADE_FRACTION, PLANE_PARKED, FLOCK_PARKED } =
    ScrollFlight.Class;
  const span = CHAPTER_ROWS * ASSUMED_ROW_PX;
  const text = (CHAPTER_ROWS - 1) * ASSUMED_ROW_PX; // the chapter's text: the rows before its interlude
  expect([1, 2, 3, 4].map((chapter) => ScrollFlight.Class.themeOf(chapter))).toEqual(['mountains', 'beach', 'rainforest', 'mountains']);
  expect([1, 2, 3, 4, 5].map((chapter) => ScrollFlight.Class.timeOf(chapter))).toEqual(['dawn', 'day', 'dusk', 'night', 'dawn']);
  const depth = (transform: string) => Number(/, (-?[\d.]+)px\)/.exec(transform)![1]);
  // chapter 1, the mountains: the jet crosses into the screen — no seaplane, no flock
  expect(flight.jetOpacity(text * 0.5)).toBe('1.000');
  expect(depth(flight.jetTransform(text * 0.1))).toBeGreaterThan(depth(flight.jetTransform(text * 0.5)));
  expect(depth(flight.jetTransform(text * 0.5))).toBeGreaterThan(depth(flight.jetTransform(text * 0.9)));
  // the crossing is over — and clear — before the interlude takes the frame
  expect(flight.jetOpacity(text)).toBe('0.000');
  expect(flight.jetOpacity(span * 0.95)).toBe('0.000');
  expect(flight.seaplaneTransform(span * 0.5)).toBe(PLANE_PARKED);
  expect(flight.seaplaneOpacity(span * 0.5)).toBe('0.000');
  expect(flight.flockTransform(span * 0.5)).toBe(FLOCK_PARKED);
  expect(flight.flockOpacity(span * 0.5)).toBe('0.000');
  // chapter 2, the beach: the seaplane comes out of the screen, with the flock; the jet is parked
  const beach = span;
  expect(flight.jetTransform(beach + span * 0.5)).toBe(PLANE_PARKED);
  expect(flight.jetOpacity(beach + span * 0.5)).toBe('0.000');
  expect(depth(flight.seaplaneTransform(beach + text * 0.1))).toBeLessThan(depth(flight.seaplaneTransform(beach + text * 0.9)));
  expect(flight.flockOpacity(beach + text * 0.5)).toBe('1.000');
  // in over the entry fraction of the text, out with the text's fade
  expect(flight.seaplaneOpacity(beach)).toBe('0.000');
  expect(flight.seaplaneOpacity(beach + text * ENTRY_FRACTION * 0.5)).toBe('0.500');
  expect(Number(flight.seaplaneOpacity(beach + text * (1 - FADE_FRACTION / 2)))).toBeCloseTo(0.5, 2);
  // chapter 3, the rain forest: the flock only
  const forest = 2 * span;
  expect(flight.jetOpacity(forest + text * 0.5)).toBe('0.000');
  expect(flight.seaplaneOpacity(forest + text * 0.5)).toBe('0.000');
  expect(flight.flockOpacity(forest + text * 0.5)).toBe('1.000');
  // the rows: a titled heading then the world's paragraphs
  const rows = ScrollFlight.Class.buildItems();
  expect(rows[0]).toMatchObject({ heading: true, title: 'The valley wakes', body: 'Chapter 1' });
  expect(rows[1].body).toBe(ScrollFlight.Class.PARAGRAPHS.mountains[0]);
  // the chapter's last row is an interlude: an empty span the stage shows a picture behind
  expect(rows[CHAPTER_ROWS - 1].interlude).toEqual(ScrollFlight.Class.INTERLUDES[0]);
  expect(rows[CHAPTER_ROWS - 1].body).toBe('');
  expect(rows[2 * CHAPTER_ROWS - 1].interlude).toEqual(ScrollFlight.Class.INTERLUDES[1]);
  expect(rows[CHAPTER_ROWS].title).toBe('The seaplane comes in');
  expect(rows[2 * CHAPTER_ROWS].title).toBe('Rain on the canopy');
  expect(rows[3 * CHAPTER_ROWS].title).toBe('Above the cloud line');
});

// domain-invariant: $ScrollFlight — If a layer moves with the scroll, then it is a track over the scroll value and nothing else: a plane's place in perspective, the flock's place in the sky, a cloud's drift, the palms' lean are formatters of the one number, parked or faded where their chapter has none.
test('skylines, snow and canopies are smooth and seeded, and the palette pales the layers into the sky, a world and a time of day per chapter', () => {
  const far = ScrollFlight.Class.RIDGES[0];
  const path = ScrollFlight.Class.ridgePath(3, far);
  expect(path).toMatch(/^M0 \d+( Q\d+ \d+ \d+ \d+){6} L2000 \d+ L2000 1000 L0 1000 Z$/);
  expect(ScrollFlight.Class.ridgePath(3, far)).toBe(path);
  expect(ScrollFlight.Class.ridgePath(4, far)).not.toBe(path);
  // the snow band follows the skyline and closes on the same line dropped by the depth
  const snow = ScrollFlight.Class.snowPath(3, far);
  expect(snow.startsWith(ScrollFlight.Class.smoothLine(ScrollFlight.Class.skylinePoints(3, far)))).toBe(true);
  expect(snow.endsWith(' Z')).toBe(true);
  // a canopy is a row of domes with a trunk under each
  const canopy = ScrollFlight.Class.canopyPath(2, ScrollFlight.Class.CANOPIES[2]);
  expect((canopy.match(/ Q/g) ?? []).length).toBe(2 * ScrollFlight.Class.CANOPIES[2].points);
  expect((canopy.match(/ M/g) ?? []).length).toBe(ScrollFlight.Class.CANOPIES[2].points);
  const lightness = (hsl: string) => Number(/(\d+)%\)$/.exec(hsl)![1]);
  const mountains = ScrollFlight.Class.palette(1);
  expect(mountains).toMatchObject({ theme: 'mountains', time: 'dawn' });
  expect(lightness(mountains.ridges[0])).toBeGreaterThan(lightness(mountains.ridges[1]));
  expect(lightness(mountains.ridges[2])).toBeGreaterThan(lightness(mountains.ridges[3]));
  expect(ScrollFlight.Class.palette(2)).toMatchObject({ theme: 'beach', time: 'day' });
  expect(ScrollFlight.Class.palette(3).sea).toContain('hsl(');
});

// invariant: A glide plays on the compositor as held snapped keyframes (examples/playground/src/lenis/lenis.invariants.md)
// domain-invariant: $ScrollFlight — If a layer moves with the scroll, then it is a track over the scroll value and nothing else: a plane's place in perspective, the flock's place in the sky, a cloud's drift, the palms' lean are formatters of the one number, parked or faded where their chapter has none.
// impossible-if-true: $ScrollFlight — A flight track that reads anything but the scroll value.
test("the flight has 37 tracks — the stage's 13, plus per slot 2 clouds, the island, the palms and 3 canopies, plus the jet, the seaplane and the flock twice, plus 2 media slots twice — and a sequence composes every one, held", () => {
  const { flight, root, animates } = stageWithFlight();
  expect(flight.trackCountLabel).toBe('37');
  const scroll = new FakeAnimation([], 500);
  flight.onSequence({
    animation: scroll as unknown as Animation,
    values: [0, 40, 80, 120],
    linear: false,
    after: null,
    durationMs: 3 * (1000 / 120)
  } as Lenis.Sequence);
  expect(animates.length).toBe(37);
  expect(animates.filter((composed) => composed.property === 'opacity').length).toBe(7);
  expect(animates.every((composed) => composed.frames.every((frame) => frame.easing === 'step-end'))).toBe(true);
  // the scene carries the world and its time; the snow, the island and the canopies are drawn
  const slot1 = root.querySelector<HTMLElement>('[data-slot="1"]')!;
  expect(slot1.dataset.theme).toBe('mountains');
  expect(slot1.dataset.time).toBe('dawn');
  expect(slot1.style.getPropertyValue('--sea')).toContain('hsl(');
  expect(slot1.querySelector('[data-track="far"] path.snow')!.getAttribute('d')).toBe(
    ScrollFlight.Class.snowPath(1, ScrollFlight.Class.RIDGES[0])
  );
  expect(slot1.querySelector('[data-track="near"] path.snow')!.getAttribute('d')).toBe('');
  const slot0 = root.querySelector<HTMLElement>('[data-slot="0"]')!;
  expect(slot0.dataset.theme).toBe('beach');
  expect(slot0.querySelector('[data-track="island"] path')!.getAttribute('d')).toBe(
    ScrollFlight.Class.ridgePath(2, ScrollFlight.Class.ISLAND)
  );
});
