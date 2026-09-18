/*
=== GENERATOR ===
Goal: A scene per chapter moves WITH the scroll on one clock — composed over the scroll's own sequence when the compositor draws it, written in the same callback when a callback does — so scenery can never drift against the text, and never repeats.
[A glide plays on the compositor as held snapped keyframes](../../lenis/lenis.invariants.md#a-glide-plays-on-the-compositor-as-held-snapped-keyframes)
[The creep plays on the compositor as a linear sequence in chained chunks](../../lenis/lenis.invariants.md#the-creep-plays-on-the-compositor-as-a-linear-sequence-in-chained-chunks)
// domain-invariant: $ScrollStage — If the scroll hands the compositor a sequence, then every track is composed over the same values alongside the same animation, and no track is written inline while it plays.
// domain-invariant: $ScrollStage — If a scroll sequence ends, is promoted or is interrupted, then its tracks are cancelled with it, and when nothing plays the tracks are written from the rendered position again.
// domain-invariant: $ScrollStage — If a scroll value lies in a chapter, then that chapter's slot draws it at its progress and the other slot draws the next chapter waiting, the two opacities summing to one through the fade, and a ridge's rise is its fraction of the chapter's progress over the tile's overhang and never wraps.
Impossible if true: A track written inline while the compositor owns the scroll.
Impossible if true: A ridge risen by more than its fraction of the tile's overhang.
Impossible if true: Two chapters drawing the same skyline.
Impossible if true: A track left playing after the scroll animation it was composed over was cancelled with nothing else in flight.

=== GENERATOR-DESCRIBED ===
The stage is a table of formatters over one number, a pair of slots the
chapters alternate through, and a handoff that follows the scroll onto the
compositor and back; the Web Animation API is stubbed here, so the specs
read what was composed, over which values, aligned with what.
*/

import { expect, test } from 'vitest';
import { nextTick } from 'vue';
import { ScrollStage } from './ScrollStage';
import type { Lenis } from '../../lenis/Lenis';

/** A Web Animation stand-in: what the stage aligns with and cancels. */
class FakeAnimation extends EventTarget {
  startTime: number | null = 1000;
  cancelled = false;
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
    this.cancelled = true;
    this.dispatchEvent(new Event('cancel'));
  }
}

const SVG = 'http://www.w3.org/2000/svg';

/** A stage with two slots, each holding the ridges and a sun, and a bar. */
function stageWithSlots() {
  const stage = new ScrollStage.Class();
  const root = document.createElement('div');
  const animates: Array<{
    element: Element;
    property: string;
    frames: Keyframe[];
    options: KeyframeAnimationOptions;
  }> = [];
  const animatable = (element: Element) => {
    (element as unknown as { animate: unknown }).animate = (
      frames: Keyframe[],
      options: KeyframeAnimationOptions
    ) => {
      const property = Object.keys(frames[0]).find((key) => key !== 'easing' && key !== 'offset') ?? '';
      animates.push({ element, property, frames, options });
      return new FakeAnimation(frames, Number(options.duration));
    };
  };
  for (const slot of [0, 1]) {
    const scene = document.createElement('div');
    scene.dataset.slot = String(slot);
    animatable(scene);
    for (const ridge of ScrollStage.Class.RIDGES) {
      const svg = document.createElementNS(SVG, 'svg');
      svg.setAttribute('data-track', ridge.key);
      svg.appendChild(document.createElementNS(SVG, 'path'));
      animatable(svg);
      scene.appendChild(svg);
    }
    const sun = document.createElement('div');
    sun.dataset.track = 'sun';
    animatable(sun);
    scene.appendChild(sun);
    root.appendChild(scene);
  }
  const bar = document.createElement('div');
  bar.dataset.track = 'progress';
  animatable(bar);
  root.appendChild(bar);
  stage.stage.value = root;
  return { stage, root, animates };
}

// domain-invariant: $ScrollStage — If a scroll value lies in a chapter, then that chapter's slot draws it at its progress and the other slot draws the next chapter waiting, the two opacities summing to one through the fade, and a ridge's rise is its fraction of the chapter's progress over the tile's overhang and never wraps.
// impossible-if-true: $ScrollStage — A ridge risen by more than its fraction of the tile's overhang.
// impossible-if-true: $ScrollStage — Two chapters drawing the same skyline.
test('a chapter owns a slot: its ridges move by their fraction of the chapter travel, the sun crosses once, the fade hands over to the other slot', () => {
  const stage = new ScrollStage.Class();
  const { CHAPTER_ROWS, ASSUMED_ROW_PX, RIDGES, FADE_FRACTION, RIDGE_RISE_CQH } = ScrollStage.Class;
  const span = CHAPTER_ROWS * ASSUMED_ROW_PX; // no scroller: geometry falls back to the assumed row
  // chapter 1 is the first span; it lives in slot 1 (its parity), chapter 2 waits in slot 0
  expect(stage.localOf(0)).toEqual({ chapter: 1, progress: 0, travel: 0 });
  expect(stage.roleOf(1, span * 0.5)).toMatchObject({ chapter: 1, current: true, progress: 0.5 });
  expect(stage.roleOf(0, span * 0.5)).toMatchObject({ chapter: 2, current: false, progress: 0, travel: 0 });
  // a ridge in the current slot rises by its fraction of the progress over the overhang; the waiting slot's ridge does not move
  const ground = RIDGES[3];
  expect(stage.ridgeTransform(1, ground, span * 0.5)).toBe(
    `translateY(-${(0.5 * ground.factor * RIDGE_RISE_CQH).toFixed(3)}cqh)`
  );
  expect(stage.ridgeTransform(0, ground, span * 0.5)).toBe('translateY(-0.000cqh)');
  // never more than its fraction of the overhang, whatever the value or the chapter's span
  for (const value of [0, span * 0.999, span * 3.4, span * 40]) {
    const slot = stage.localOf(value).chapter % 2;
    const rise = Number(/translateY\(-([\d.]+)cqh\)/.exec(stage.ridgeTransform(slot, ground, value))![1]);
    expect(rise).toBeLessThanOrEqual(ground.factor * RIDGE_RISE_CQH + 0.001);
  }
  // the sun: at half a chapter, mid-band and at the apex
  expect(stage.sunTransform(1, span * 0.5)).toBe('translate(74.000cqw, -82.000cqh)');
  // the fade: before it starts the current slot is opaque and the other clear; through it they sum to 1
  expect(stage.opacityOf(1, span * 0.5)).toBe('1.000');
  expect(stage.opacityOf(0, span * 0.5)).toBe('0.000');
  const midFade = span * (1 - FADE_FRACTION / 2);
  expect(Number(stage.opacityOf(1, midFade)) + Number(stage.opacityOf(0, midFade))).toBeCloseTo(1, 3);
  expect(Number(stage.opacityOf(1, midFade))).toBeCloseTo(0.5, 2);
  // the next chapter: slot 0 becomes current, slot 1 waits for chapter 3
  expect(stage.roleOf(0, span * 1.2)).toMatchObject({ chapter: 2, current: true });
  expect(stage.roleOf(1, span * 1.2)).toMatchObject({ chapter: 3, current: false });
  // skylines are seeded per chapter: stable, and different
  const far = RIDGES[0];
  expect(ScrollStage.Class.ridgePath(7, far)).toBe(ScrollStage.Class.ridgePath(7, far));
  const paths = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((chapter) => ScrollStage.Class.ridgePath(chapter, far)));
  expect(paths.size).toBe(8);
  expect(ScrollStage.Class.ridgePath(3, far)).toMatch(/^M0 \d+( L\d+ \d+){9} L1000 1000 L0 1000 Z$/);
});

// invariant: A glide plays on the compositor as held snapped keyframes (examples/playground/src/lenis/lenis.invariants.md)
// domain-invariant: $ScrollStage — If the scroll hands the compositor a sequence, then every track is composed over the same values alongside the same animation, and no track is written inline while it plays.
// domain-invariant: $ScrollStage — If a scroll sequence ends, is promoted or is interrupted, then its tracks are cancelled with it, and when nothing plays the tracks are written from the rendered position again.
// impossible-if-true: $ScrollStage — A track written inline while the compositor owns the scroll.
// impossible-if-true: $ScrollStage — A track left playing after the scroll animation it was composed over was cancelled with nothing else in flight.
test('a sequence composes every track over the same values alongside the scroll animation, draws the scenes it will reach, and a cancel takes it all down', async () => {
  const { stage, root, animates } = stageWithSlots();
  const scroll = new FakeAnimation([], 500);
  const values = [0, 30, 55, 75, 90, 100];
  stage.onSequence({
    animation: scroll as unknown as Animation,
    values,
    linear: false,
    after: null
  } as Lenis.Sequence);
  // 2 slots × (opacity + 4 ridges + sun) + the bar
  expect(animates.length).toBe(13);
  expect(stage.onCompositor.value).toBe(true);
  for (const composed of animates) {
    expect(Number(composed.options.duration)).toBeCloseTo(5 * (1000 / 120), 3);
    expect(composed.frames[0].offset).toBe(0);
    expect(composed.frames[composed.frames.length - 1].offset).toBe(1);
    expect(composed.frames.every((frame) => frame.easing === 'step-end')).toBe(true);
  }
  // the slot roots animate opacity; everything else transform
  expect(animates.filter((composed) => composed.property === 'opacity').length).toBe(2);
  // the scenes for chapter 1 and 2 were drawn: each slot's far ridge has its chapter's path
  const slots = [...root.querySelectorAll<HTMLElement>('[data-slot]')];
  const far = ScrollStage.Class.RIDGES[0];
  expect(slots[1].querySelector('[data-track="far"] path')!.getAttribute('d')).toBe(
    ScrollStage.Class.ridgePath(1, far)
  );
  expect(slots[0].querySelector('[data-track="far"] path')!.getAttribute('d')).toBe(
    ScrollStage.Class.ridgePath(2, far)
  );
  // no inline write while the compositor owns the scroll
  const sun = slots[1].querySelector<HTMLElement>('[data-track="sun"]')!;
  sun.style.transform = '';
  stage.onScroll(40);
  expect(sun.style.transform).toBe('');
  // an interrupt: the tracks go, the stage writes inline again
  scroll.cancel();
  await nextTick();
  expect(stage.onCompositor.value).toBe(false);
  stage.onScroll(40);
  expect(sun.style.transform).toBe(stage.sunTransform(1, 40));
  expect(Number(slots[1].style.opacity)).toBe(1); // jsdom normalizes the written '1.000'
});

// invariant: The creep plays on the compositor as a linear sequence in chained chunks (examples/playground/src/lenis/lenis.invariants.md)
test('a chained chunk composes after the tracks before it and keeps them; scene tracks are held even when the scroll chunk is linear', () => {
  const { stage, animates } = stageWithSlots();
  const first = new FakeAnimation([], 2000);
  stage.onSequence({
    animation: first as unknown as Animation,
    values: [0, 1, 2, 3],
    linear: true,
    after: null
  } as Lenis.Sequence);
  const second = new FakeAnimation([], 2000);
  stage.onSequence({
    animation: second as unknown as Animation,
    values: [3, 4, 5, 6],
    linear: true,
    after: first as unknown as Animation
  } as Lenis.Sequence);
  expect(animates.length).toBe(26);
  // scene tracks step — held keyframes, never a linear pair, so a chapter boundary is a step
  expect(animates.every((composed) => composed.frames.every((frame) => frame.easing === 'step-end'))).toBe(true);
  // the first chunk's tracks were not cancelled by the chained one
  expect(stage.onCompositor.value).toBe(true);
});
