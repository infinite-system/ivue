/*
=== GENERATOR ===
Goal: A stage of tracks moves WITH the scroll on one clock — composed over the scroll's own sequence when the compositor draws it, written in the same callback when a callback does — so scenery can never drift against the text.
[A glide plays on the compositor as held snapped keyframes](../../lenis/lenis.invariants.md#a-glide-plays-on-the-compositor-as-held-snapped-keyframes)
[The creep plays on the compositor as a linear sequence in chained chunks](../../lenis/lenis.invariants.md#the-creep-plays-on-the-compositor-as-a-linear-sequence-in-chained-chunks)
// domain-invariant: $ScrollStage — If the scroll hands the compositor a sequence, then every track is composed over the same values alongside the same animation, and no track is written inline while it plays.
// domain-invariant: $ScrollStage — If a scroll sequence ends, is promoted or is interrupted, then its tracks are cancelled with it, and when nothing plays the tracks are written from the rendered position again.
// domain-invariant: $ScrollStage — If a track is a parallax layer, then its transform is its fraction of the scroll wrapped at its period and snapped to the device grid, and it is never interpolated across the wrap.
Impossible if true: A track written inline while the compositor owns the scroll.
Impossible if true: A parallax layer whose translate exceeds its period.
Impossible if true: A track left playing after the scroll animation it was composed over was cancelled with nothing else in flight.

=== GENERATOR-DESCRIBED ===
The stage is a table of formatters over one number and a handoff that
follows the scroll onto the compositor and back; the Web Animation API is
stubbed here, so the specs read what was composed, over which values,
aligned with what.
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

function stageWithLayers(keys: string[]) {
  const stage = new ScrollStage.Class();
  const root = document.createElement('div');
  const animates: Array<{
    element: HTMLElement;
    frames: Keyframe[];
    options: KeyframeAnimationOptions;
  }> = [];
  for (const key of keys) {
    const layer = document.createElement('div');
    layer.dataset.track = key;
    (layer as unknown as { animate: unknown }).animate = (
      frames: Keyframe[],
      options: KeyframeAnimationOptions
    ) => {
      animates.push({ element: layer, frames, options });
      return new FakeAnimation(frames, Number(options.duration));
    };
    root.appendChild(layer);
  }
  stage.stage.value = root;
  return { stage, root, animates };
}

// domain-invariant: $ScrollStage — If a track is a parallax layer, then its transform is its fraction of the scroll wrapped at its period and snapped to the device grid, and it is never interpolated across the wrap.
// impossible-if-true: $ScrollStage — A parallax layer whose translate exceeds its period.
test('a parallax layer wraps at its period on the device grid; the sun turns by the scroll; the bar scales to the extent', () => {
  const stage = new ScrollStage.Class();
  const ground = ScrollStage.Class.TRACKS.find((track) => track.key === 'ground')!;
  // 0.85 × 1000 = 850, wrapped at 360 → 130
  expect(stage.transformOf(ground, 1000)).toBe('translateY(-130px)');
  // never past the period, whatever the scroll
  for (const value of [0, 359, 360, 361, 12_345, 46_000]) {
    const px = Number(/translateY\((-?[\d.]+)px\)/.exec(stage.transformOf(ground, value))![1]);
    expect(px).toBeLessThanOrEqual(0);
    expect(px).toBeGreaterThan(-360);
  }
  const sun = ScrollStage.Class.TRACKS.find((track) => track.key === 'sun')!;
  // half a cycle: mid-stage, at the apex
  expect(stage.transformOf(sun, 12_000)).toBe('translate(74.000cqw, -82.000cqh)');
  expect(stage.transformOf(sun, 0)).toBe('translate(48.000cqw, 0.000cqh)');
  const progress = ScrollStage.Class.TRACKS.find((track) => track.key === 'progress')!;
  // no scroller mounted: the extent falls back to 1 and the bar clamps
  expect(stage.transformOf(progress, 5)).toBe('scaleX(1)');
  expect(stage.transformOf(progress, 0)).toBe('scaleX(0)');
});

// invariant: A glide plays on the compositor as held snapped keyframes (examples/playground/src/lenis/lenis.invariants.md)
// domain-invariant: $ScrollStage — If the scroll hands the compositor a sequence, then every track is composed over the same values alongside the same animation, and no track is written inline while it plays.
// domain-invariant: $ScrollStage — If a scroll sequence ends, is promoted or is interrupted, then its tracks are cancelled with it, and when nothing plays the tracks are written from the rendered position again.
// impossible-if-true: $ScrollStage — A track written inline while the compositor owns the scroll.
// impossible-if-true: $ScrollStage — A track left playing after the scroll animation it was composed over was cancelled with nothing else in flight.
test('a sequence composes one track per layer over the same values, alongside the scroll animation; a cancel takes them all down', async () => {
  const { stage, animates } = stageWithLayers(['far', 'sun', 'progress']);
  const scroll = new FakeAnimation([], 500);
  const values = [0, 30, 55, 75, 90, 100];
  stage.onSequence({
    animation: scroll as unknown as Animation,
    values,
    linear: false,
    after: null
  } as Lenis.Sequence);
  expect(animates.length).toBe(3);
  expect(stage.onCompositor.value).toBe(true);
  // each track: the duration of the scroll's sequence, held keyframes, offsets from 0 to 1
  for (const composed of animates) {
    expect(Number(composed.options.duration)).toBeCloseTo(5 * (1000 / 120), 3);
    expect(composed.frames[0].offset).toBe(0);
    expect(composed.frames[composed.frames.length - 1].offset).toBe(1);
    expect(composed.frames.every((frame) => frame.easing === 'step-end')).toBe(true);
  }
  // the sun's last keyframe is the sun's formatter over the last value
  const sunFrames = animates[1].frames;
  expect(sunFrames[sunFrames.length - 1].transform).toBe(
    stage.transformOf(ScrollStage.Class.TRACKS[5], 100)
  );
  // no inline write while the compositor owns the scroll
  const far = animates[0].element;
  far.style.transform = '';
  stage.onScroll(40);
  expect(far.style.transform).toBe('');
  // the scroll animation is cancelled (an interrupt): the tracks go, the stage writes inline again
  scroll.cancel();
  await nextTick();
  expect(stage.onCompositor.value).toBe(false);
  stage.onScroll(40);
  expect(far.style.transform).toBe(stage.transformOf(ScrollStage.Class.TRACKS[1], 40));
});

// invariant: The creep plays on the compositor as a linear sequence in chained chunks (examples/playground/src/lenis/lenis.invariants.md)
test('a chained chunk composes after the tracks before it and keeps them; a linear sequence stays linear except for wrapping layers', () => {
  const { stage, animates } = stageWithLayers(['near', 'sun']);
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
  expect(animates.length).toBe(4);
  // the parallax layer is never linear (it wraps); the sun is
  expect(animates[0].frames.length).toBeGreaterThan(2);
  expect(animates[1].frames.length).toBe(2);
  // the first chunk's tracks were not cancelled by the chained one
  expect(stage.onCompositor.value).toBe(true);
});
