/*
=== GENERATOR ===
Goal: A scene per chapter moves WITH the scroll on one clock — composed over the scroll's own sequence when the compositor draws it, written in the same callback when a callback does — so scenery can never drift against the text, and never repeats.
[A glide plays on the compositor as held snapped keyframes](../../lenis/lenis.invariants.md#a-glide-plays-on-the-compositor-as-held-snapped-keyframes)
[The creep plays on the compositor as one linear run](../../lenis/lenis.invariants.md#the-creep-plays-on-the-compositor-as-one-linear-run)
// domain-invariant: $ScrollStage — If the scroll hands the compositor a sequence, then every track is composed over the same values alongside the same animation, and no track is written inline while it plays.
// domain-invariant: $ScrollStage — If a scroll sequence ends, is promoted or is interrupted, then its tracks are cancelled with it, and when nothing plays the tracks are written from the rendered position again.
// domain-invariant: $ScrollStage — If the scroll plays a linear run, then the stage cuts it into held pieces aligned to the run's own start on the document timeline, two in flight, the next composed as one finishes, and every piece's values lie on the run's line.
// domain-invariant: $ScrollStage — If the run's rate changes in place, then every piece in flight takes the same rate and a piece composed after inherits it, its offset scaled by it.
// domain-invariant: $ScrollStage — If a row carries an interlude, then its media's presence is zero until the row's span has entered most of the frame, one once the span fills it, held while the span alone is in the frame, and falling from the moment the next row enters; the interlude the frame is at or before lives in the media slot of its parity, the next in the other.
// domain-invariant: $ScrollStage — If a scroll value lies in a chapter, then that chapter's slot draws it at its progress and the other slot draws the next chapter waiting, the two opacities summing to one through the fade, and a ridge's rise is its fraction of the chapter's progress over the tile's overhang and never wraps.
Impossible if true: A track written inline while the compositor owns the scroll.
Impossible if true: A ridge risen by more than its fraction of the tile's overhang.
Impossible if true: Two chapters drawing the same skyline.
Impossible if true: A track left playing after the scroll animation it was composed over was cancelled with nothing else in flight.
Impossible if true: A piece of a run whose start is not the run's start plus its offset.
Impossible if true: A piece moving at a rate other than the run's.
Impossible if true: An interlude's media shown while its span is outside the frame.
Impossible if true: A media track that changes the raster's scale from one keyframe to the next.

=== GENERATOR-DESCRIBED ===
The stage is a table of formatters over one number, a pair of slots the
chapters alternate through, and a handoff that follows the scroll onto the
compositor and back; the Web Animation API is stubbed here, so the specs
read what was composed, over which values, aligned with what.
*/

import { expect, test } from 'vitest';
import { nextTick } from 'vue';
import { ScrollStage } from './ScrollStage';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import type { Lenis } from '../../lenis/Lenis';

/** A Web Animation stand-in: what the stage aligns with and cancels. */
class FakeAnimation extends EventTarget {
  startTime: number | null = 1000;
  playbackRate = 1;
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
  updatePlaybackRate(rate: number) {
    this.playbackRate = rate;
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
    animation: FakeAnimation;
  }> = [];
  const animatable = (element: Element) => {
    (element as unknown as { animate: unknown }).animate = (
      frames: Keyframe[],
      options: KeyframeAnimationOptions
    ) => {
      const property = Object.keys(frames[0]).find((key) => key !== 'easing' && key !== 'offset') ?? '';
      const animation = new FakeAnimation(frames, Number(options.duration));
      animation.startTime = null;
      animates.push({ element, property, frames, options, animation });
      return animation;
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
  expect(ScrollStage.Class.ridgePath(3, far)).toMatch(/^M0 \d+( L\d+ \d+){9} L2000 1000 L0 1000 Z$/);
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
    after: null,
    durationMs: 5 * (1000 / 120)
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

// invariant: The creep plays on the compositor as one linear run (examples/playground/src/lenis/lenis.invariants.md)
// domain-invariant: $ScrollStage — If the scroll plays a linear run, then the stage cuts it into held pieces aligned to the run's own start on the document timeline, two in flight, the next composed as one finishes, and every piece's values lie on the run's line.
// impossible-if-true: $ScrollStage — A piece of a run whose start is not the run's start plus its offset.
test("a linear run is cut into held pieces aligned to the run's start, two in flight, the next composed as one finishes, all on the run's line", async () => {
  const { stage, animates } = stageWithSlots();
  const { TRACK_CHUNK_MS } = ScrollStage.Class;
  const run = new FakeAnimation([], 5000); // startTime 1000: known, so the queued piece aligns at once
  stage.onSequence({
    animation: run as unknown as Animation,
    values: [0, 500], // 0.1 px per ms
    linear: true,
    after: null,
    durationMs: 5000
  } as Lenis.Sequence);
  // two pieces × 13 tracks, each held, each aligned to the run's start plus its offset
  expect(animates.length).toBe(26);
  const first = animates.slice(0, 13);
  const second = animates.slice(13);
  expect(first.every((composed) => composed.frames.every((frame) => frame.easing === 'step-end'))).toBe(true);
  expect(first.every((composed) => composed.animation.startTime === 1000)).toBe(true);
  expect(second.every((composed) => composed.animation.startTime === 1000 + TRACK_CHUNK_MS)).toBe(true);
  expect(first.every((composed) => Number(composed.options.duration) === TRACK_CHUNK_MS)).toBe(true);
  // a piece's values lie on the run's line: the bar's last keyframe at 2000 ms is scaleX of 200 px
  const bar = first[first.length - 1];
  expect(bar.frames[bar.frames.length - 1].transform).toBe(stage.progressTransform(200));
  // the first piece finishes: it goes, and a third is composed after the second
  first[0].animation.dispatchEvent(new Event('finish'));
  expect(animates.length).toBe(39);
  expect(animates.slice(26).every((composed) => composed.animation.startTime === 1000 + 2 * TRACK_CHUNK_MS)).toBe(true);
  expect(first.every((composed) => composed.animation.cancelled)).toBe(true);
  // the run ends at 5000: the third piece is the remainder, and no piece follows it
  expect(Number(animates[26].options.duration)).toBe(1000);
  animates[13].animation.dispatchEvent(new Event('finish'));
  animates[26].animation.dispatchEvent(new Event('finish'));
  expect(animates.length).toBe(39);
  // the run's cancel takes the stage down and it writes inline again
  run.cancel();
  await nextTick();
  expect(stage.onCompositor.value).toBe(false);
});

// domain-invariant: $ScrollStage — If the run's rate changes in place, then every piece in flight takes the same rate and a piece composed after inherits it, its offset scaled by it.
// impossible-if-true: $ScrollStage — A piece moving at a rate other than the run's.
test("a rate change on the run reaches every piece in flight, and a later piece inherits the run's rate with its offset scaled", () => {
  const { stage, animates } = stageWithSlots();
  const { TRACK_CHUNK_MS } = ScrollStage.Class;
  const run = new FakeAnimation([], 8000);
  stage.onSequence({
    animation: run as unknown as Animation,
    values: [0, 800],
    linear: true,
    after: null,
    durationMs: 8000
  } as Lenis.Sequence);
  expect(animates.length).toBe(26);
  run.updatePlaybackRate(2);
  stage.onSequenceRate({ animation: run as unknown as Animation, rate: 2 });
  expect(animates.every((composed) => composed.animation.playbackRate === 2)).toBe(true);
  // the first piece finishes: the third is composed at the run's rate, its offset in the run's own time halved on the timeline
  animates[0].animation.dispatchEvent(new Event('finish'));
  const third = animates.slice(26);
  expect(third.length).toBe(13);
  expect(third.every((composed) => composed.animation.playbackRate === 2)).toBe(true);
  expect(third.every((composed) => composed.animation.startTime === 1000 + (2 * TRACK_CHUNK_MS) / 2)).toBe(true);
});

// domain-invariant: $ScrollStage — If a row carries an interlude, then its media's presence is zero until the row's span has entered most of the frame, one once the span fills it, held while the span alone is in the frame, and falling from the moment the next row enters; the interlude the frame is at or before lives in the media slot of its parity, the next in the other.
// impossible-if-true: $ScrollStage — An interlude's media shown while its span is outside the frame.
test("an interlude is pulled in as its span enters the frame, held while it covers it, gone as it leaves; the slots hold this one and the next", () => {
  class $Gallery extends ScrollStage.$Class {
    static override readonly ITEM_COUNT: number = 40;
    static override get INTERLUDES(): ScrollStage.Interlude[] {
      return [
        { kind: 'image', src: '/a.png', caption: 'A' },
        { kind: 'image', src: '/b.png', caption: 'B' }
      ];
    }
    static override buildItems(): ScrollStage.Row[] {
      return super.buildItems().map((row, index) =>
        index % 10 === 9 ? { ...row, interlude: this.INTERLUDES[Math.floor(index / 10) % 2] } : row
      );
    }
  }
  const Gallery = Static($Gallery);
  const stage = new (Reactive(Gallery))();
  const { ASSUMED_ROW_PX, INTERLUDE_FADE_FRACTION } = ScrollStage.Class;
  // no scroller: rows are the assumed size, the frame's span is 1 — so presence is the frame's overlap with the row over the in-fraction
  expect(stage.interludeRows.map((row) => row.index)).toEqual([9, 19, 29, 39]);
  expect(stage.interludeSpan(1)).toEqual({ start: 9 * ASSUMED_ROW_PX, end: 10 * ASSUMED_ROW_PX });
  // outside: nothing; entering: nothing until most of the frame, then rising as the span fills it;
  // held while the span alone is in the frame; leaving from the moment the next row enters
  const threshold = 1 - INTERLUDE_FADE_FRACTION;
  expect(stage.interludePresence(1, 0)).toBe(0);
  expect(stage.interludePresence(1, 9 * ASSUMED_ROW_PX - 1)).toBe(0);
  expect(stage.interludePresence(1, 9 * ASSUMED_ROW_PX - 0.7)).toBe(0); // entered 0.3 of the frame: under the threshold
  expect(stage.interludePresence(1, 9 * ASSUMED_ROW_PX - 0.1)).toBeCloseTo((0.9 - threshold) / INTERLUDE_FADE_FRACTION, 6);
  expect(stage.interludePresence(1, 9 * ASSUMED_ROW_PX)).toBe(1);
  expect(stage.interludePresence(1, 9 * ASSUMED_ROW_PX + 30)).toBe(1);
  expect(stage.interludePresence(1, 10 * ASSUMED_ROW_PX - 1)).toBe(1); // the next row is about to enter
  expect(stage.interludePresence(1, 10 * ASSUMED_ROW_PX - 0.7)).toBeCloseTo((0.7 - threshold) / INTERLUDE_FADE_FRACTION, 6);
  expect(stage.interludePresence(1, 10 * ASSUMED_ROW_PX)).toBe(0);
  // the chapter's text ends at its interlude row; the text-local progress holds 1 through it
  expect(stage.textEnd(1)).toBe(9 * ASSUMED_ROW_PX);
  expect(stage.textLocalOf(4.5 * ASSUMED_ROW_PX).progress).toBeCloseTo(0.5, 6);
  expect(stage.textLocalOf(9.5 * ASSUMED_ROW_PX).progress).toBe(1);
  // the interlude at a value: this one until its span has passed, then the next
  expect(stage.interludeAt(0)).toBe(1);
  expect(stage.interludeAt(9.5 * ASSUMED_ROW_PX)).toBe(1);
  expect(stage.interludeAt(10 * ASSUMED_ROW_PX)).toBe(2);
  // the media slots: two figures the class draws into, by the ordinal's parity
  const root = document.createElement('div');
  for (const slot of [0, 1]) {
    const figure = document.createElement('figure');
    figure.dataset.media = String(slot);
    figure.appendChild(document.createElement('img'));
    const caption = document.createElement('figcaption');
    caption.dataset.caption = '';
    figure.appendChild(caption);
    root.appendChild(figure);
  }
  stage.stage.value = root;
  stage.prepareScenes(0);
  const figure = (slot: number) => root.querySelector<HTMLElement>(`[data-media="${slot}"]`)!;
  expect(figure(1).querySelector('img')!.getAttribute('src')).toBe('/a.png');
  expect(figure(0).querySelector('img')!.getAttribute('src')).toBe('/b.png');
  expect(figure(1).querySelector('[data-caption]')!.textContent).toBe('A');
  // its tracks: opacity is the presence; the transform is a translation only — a scale
  // on a raster the size of a picture is a re-raster per keyframe
  expect(stage.mediaOpacity(1, 9 * ASSUMED_ROW_PX + 30)).toBe('1.000');
  expect(stage.mediaOpacity(1, 0)).toBe('0.000');
  expect(stage.mediaTransform(1, 9 * ASSUMED_ROW_PX + 30)).toBe('translateY(0.00px)');
  // riding with its span, fractional: a snapped ride ticks at reading speed
  expect(stage.mediaTransform(1, 9 * ASSUMED_ROW_PX - 0.25)).toMatch(/^translateY\(\d+\.\d\dpx\)$/);
  expect(stage.mediaTransform(1, 0)).toMatch(/^translateY\(\d+\.\d\dpx\)$/);
  // past the second interlude: the third takes slot 1, the fourth slot 0
  stage.prepareScenes(20 * ASSUMED_ROW_PX);
  expect(figure(1).querySelector('img')!.getAttribute('src')).toBe('/a.png');
  expect(figure(0).querySelector('img')!.getAttribute('src')).toBe('/b.png');
  expect(stage.interludeAt(20 * ASSUMED_ROW_PX)).toBe(3);
});
