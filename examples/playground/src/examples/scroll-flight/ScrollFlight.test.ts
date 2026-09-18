/*
=== GENERATOR ===
Goal: A flight over the range moves WITH the scroll on one clock and breathes on another — every scroll-linked layer (ridges, clouds, a plane in perspective, the flock's place in the sky) is a track composed over the scroll's own sequence, and only what is not scroll-linked (the wingbeat, a startle) runs on the GPU's own frame.
[A glide plays on the compositor as held snapped keyframes](../../lenis/lenis.invariants.md#a-glide-plays-on-the-compositor-as-held-snapped-keyframes)
// domain-invariant: $ScrollFlight — If a layer moves with the scroll, then it is a track over the scroll value and nothing else: the plane's place in perspective, the flock's place in the sky, a cloud's drift are formatters of the one number, parked or faded where their chapter has none.
// domain-invariant: $ScrollFlight — If a chapter crosses nothing of a kind, then that kind's opacity is zero for every value in it and its transform is the parked one; a crossing comes in over the entry fraction and goes out with the chapter's fade.
Impossible if true: A plane visible in a chapter that has none.
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
    for (const ridge of ScrollFlight.Class.RIDGES) tracked(scene, 'svg', ridge.key);
    tracked(scene, 'div', 'sun');
    for (const cloud of ScrollFlight.Class.CLOUDS) tracked(scene, 'div', cloud.key);
    root.appendChild(scene);
  }
  tracked(root, 'div', 'plane');
  tracked(root, 'div', 'flock');
  tracked(root, 'div', 'progress');
  flight.stage.value = root;
  return { flight, root, animates };
}

// domain-invariant: $ScrollFlight — If a chapter crosses nothing of a kind, then that kind's opacity is zero for every value in it and its transform is the parked one; a crossing comes in over the entry fraction and goes out with the chapter's fade.
// impossible-if-true: $ScrollFlight — A plane visible in a chapter that has none.
test('chapters cycle birds, plane, both; a crossing is parked and clear where its chapter has none, comes in over the entry and goes out with the fade', () => {
  const flight = new ScrollFlight.Class();
  const { CHAPTER_ROWS, ASSUMED_ROW_PX, ENTRY_FRACTION, FADE_FRACTION, PLANE_PARKED, FLOCK_PARKED } =
    ScrollFlight.Class;
  const span = CHAPTER_ROWS * ASSUMED_ROW_PX;
  expect([1, 2, 3, 4].map((chapter) => ScrollFlight.Class.kindOf(chapter))).toEqual(['birds', 'plane', 'both', 'birds']);
  // chapter 1: birds only — the plane is parked and clear everywhere in it
  for (const p of [0, 0.3, 0.6, 0.99]) {
    expect(flight.planeTransform(span * p)).toBe(PLANE_PARKED);
    expect(flight.planeOpacity(span * p)).toBe('0.000');
  }
  expect(flight.flockOpacity(span * 0.5)).toBe('1.000');
  // chapter 2: the plane crosses — far left to near right, level at the middle
  const start = span;
  expect(flight.flockTransform(start + span * 0.5)).toBe(FLOCK_PARKED);
  expect(flight.flockOpacity(start + span * 0.5)).toBe('0.000');
  expect(flight.planeTransform(start + span * 0.5)).toContain('rotateY(0.00deg)');
  const z = (p: number) => Number(/, (-?[\d.]+)px\)/.exec(flight.planeTransform(start + span * p))![1]);
  expect(z(0.1)).toBeLessThan(z(0.5));
  expect(z(0.5)).toBeLessThan(z(0.9));
  // in over the entry fraction, out with the fade
  expect(flight.planeOpacity(start)).toBe('0.000');
  expect(flight.planeOpacity(start + span * ENTRY_FRACTION * 0.5)).toBe('0.500');
  expect(flight.planeOpacity(start + span * 0.5)).toBe('1.000');
  expect(Number(flight.planeOpacity(start + span * (1 - FADE_FRACTION / 2)))).toBeCloseTo(0.5, 2);
  // the rows: a titled heading then the paragraphs
  const rows = ScrollFlight.Class.buildItems();
  expect(rows[0]).toMatchObject({ heading: true, title: 'The valley wakes', body: 'Chapter 1' });
  expect(rows[1].body).toBe(ScrollFlight.Class.PARAGRAPHS[0]);
  expect(rows[CHAPTER_ROWS].title).toBe('Above the cloud line');
});

// domain-invariant: $ScrollFlight — If a layer moves with the scroll, then it is a track over the scroll value and nothing else: the plane's place in perspective, the flock's place in the sky, a cloud's drift are formatters of the one number, parked or faded where their chapter has none.
test('the skyline is smooth and seeded, and the palette pales the ridges into the sky the farther back they stand, a time of day per chapter', () => {
  const far = ScrollFlight.Class.RIDGES[0];
  const path = ScrollFlight.Class.ridgePath(3, far);
  expect(path).toMatch(/^M0 \d+( Q\d+ \d+ \d+ \d+){6} L2000 \d+ L2000 1000 L0 1000 Z$/);
  expect(ScrollFlight.Class.ridgePath(3, far)).toBe(path);
  expect(ScrollFlight.Class.ridgePath(4, far)).not.toBe(path);
  expect([1, 2, 3, 4, 5].map((chapter) => ScrollFlight.Class.palette(chapter).time)).toEqual([
    'dawn', 'day', 'dusk', 'night', 'dawn'
  ]);
  const lightness = (hsl: string) => Number(/(\d+)%\)$/.exec(hsl)![1]);
  const { ridges } = ScrollFlight.Class.palette(2);
  expect(lightness(ridges[0])).toBeGreaterThan(lightness(ridges[1]));
  expect(lightness(ridges[2])).toBeGreaterThan(lightness(ridges[3]));
});

// invariant: A glide plays on the compositor as held snapped keyframes (examples/playground/src/lenis/lenis.invariants.md)
// domain-invariant: $ScrollFlight — If a layer moves with the scroll, then it is a track over the scroll value and nothing else: the plane's place in perspective, the flock's place in the sky, a cloud's drift are formatters of the one number, parked or faded where their chapter has none.
// impossible-if-true: $ScrollFlight — A flight track that reads anything but the scroll value.
test('the flight has 21 tracks — the stage’s 13 plus 4 clouds, the plane and the flock twice — and a sequence composes every one, held', () => {
  const { flight, root, animates } = stageWithFlight();
  expect(flight.trackCountLabel).toBe('21');
  const scroll = new FakeAnimation([], 500);
  flight.onSequence({
    animation: scroll as unknown as Animation,
    values: [0, 40, 80, 120],
    linear: false,
    after: null,
    durationMs: 3 * (1000 / 120)
  } as Lenis.Sequence);
  expect(animates.length).toBe(21);
  expect(animates.filter((composed) => composed.property === 'opacity').length).toBe(4);
  expect(animates.every((composed) => composed.frames.every((frame) => frame.easing === 'step-end'))).toBe(true);
  // the scene carries the flight's palette
  const slot1 = root.querySelector<HTMLElement>('[data-slot="1"]')!;
  expect(slot1.dataset.time).toBe('dawn');
  expect(slot1.style.getPropertyValue('--haze')).toContain('hsl(');
});
