/*
=== GENERATOR ===
Goal: Drift the content forward at a reading pace that never reads as judder, and hand the scroll back and forth with the reader's own gestures without a stall.
// domain-invariant: $VirtualScrollerAutoplay — If a creep frame runs, then the content advances by the elapsed time over the cadence, so a slow frame advances further rather than falling behind.
// domain-invariant: $VirtualScrollerAutoplay — If the gap since the last creep frame exceeds SUSPENDED_MS, then it is a resumed tab and the frame advances one frame's worth instead of the whole gap.
// domain-invariant: $VirtualScrollerAutoplay — If the reader is scrolling or an input is live when the creep steps, then the creep hands back to the defer loop instead of writing.
// domain-invariant: $VirtualScrollerAutoplay — If a forward glide has decayed to cruise speed while play defers, then the creep adopts the animated position there and continues, rather than waiting for the lerp to reach zero.
// domain-invariant: $VirtualScrollerAutoplay — If the creep reaches the end with autoRepeat on, then it stops and the repeat chain resets to the top after the hold.
// domain-invariant: $VirtualScrollerAutoplay — If the creep speed is unset, then the cadence is the tuned default, and the drag factor is one; a faster setting raises the factor proportionally.
Impossible if true: A creep frame that writes while the reader's own input is live.
Impossible if true: A glide decaying below cruise speed before the creep takes it over.

=== GENERATOR-DESCRIBED ===
The owner is a plain object with a fake Lenis — the creep only ever reads
four things off it and writes one — so every claim here is a sequence of
explicit frames with a fake clock, rather than something that only happens
during a real rAF over a real composited layer. rAF itself is stubbed to a
queue the spec drains by hand: the creep's whole design is about WHEN a
frame lands relative to the clock, and a real rAF would make that
unobservable.

What this file cannot reach is the part that is not code: whether 0.11 px
per frame reads as a glide or as judder on a given screen. That was settled
by measurement on real devices and is recorded in the class header; the
specs below only hold the mechanism that delivers it.
*/

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { computed, ref } from 'vue';
import { VirtualScrollerAutoplay } from './VirtualScrollerAutoplay';

const Logic = VirtualScrollerAutoplay.Class;

/** rAF as a hand-drained queue: the creep's design is about frame timing. */
let frames: Array<(ts: number) => void>;

function autoplay(overrides: Record<string, unknown> = {}) {
  const lenis = {
    targetScroll: 0,
    animatedScroll: 0,
    actualScroll: 0,
    velocity: 0,
    isScrolling: false as false | 'smooth',
    adoptExternalScroll: vi.fn()
  };
  const owner = {
    lenis,
    scrollDirection: ref('down'),
    inputLive: false,
    lerpRunning: false,
    containerSpan: 400,
    scrollExtent: computed(() => 10_000),
    creepMsPerPxSetting: undefined as number | undefined,
    autoRepeat: false,
    autoPlayDelay: 500,
    setScrollPosition: vi.fn(),
    restartLoop: vi.fn(),
    cancelFrames: vi.fn(),
    parkLoopFrame: vi.fn(),
    ...overrides
  };
  return { owner, lenis, model: new VirtualScrollerAutoplay.Class(owner) };
}

/** Run the one frame the creep has queued, at `ts`. */
function step(ts: number) {
  const pending = frames.shift();
  expect(pending).toBeTypeOf('function');
  pending!(ts);
}

beforeEach(() => {
  vi.useFakeTimers();
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (callback: (ts: number) => void) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// domain-invariant: $VirtualScrollerAutoplay — If a creep frame runs, then the content advances by the elapsed time over the cadence, so a slow frame advances further rather than falling behind.
test('the creep advances by elapsed time over the cadence, so a slow frame travels further than a fast one', () => {
  const { model, lenis, owner } = autoplay();
  model.play();
  // the first frame has no previous timestamp: one frame's worth
  step(1000);
  expect(lenis.targetScroll).toBeCloseTo(Logic.FRAME_MS / Logic.CREEP_MS_PER_PX, 6);
  expect(owner.setScrollPosition).toHaveBeenCalledWith(-lenis.targetScroll, true, false);

  // a 16 ms frame and then a 48 ms frame: the slow one advances three times as far
  const afterFirst = lenis.targetScroll;
  step(1016);
  const fast = lenis.targetScroll - afterFirst;
  const afterFast = lenis.targetScroll;
  step(1064);
  const slow = lenis.targetScroll - afterFast;
  expect(fast).toBeCloseTo(16 / Logic.CREEP_MS_PER_PX, 6);
  expect(slow).toBeCloseTo(48 / Logic.CREEP_MS_PER_PX, 6);
});

// domain-invariant: $VirtualScrollerAutoplay — If the gap since the last creep frame exceeds SUSPENDED_MS, then it is a resumed tab and the frame advances one frame's worth instead of the whole gap.
test('a resumed tab advances one frame’s worth, not the whole gap it slept through', () => {
  const { model, lenis } = autoplay();
  model.play();
  step(1000);
  const afterFirst = lenis.targetScroll;
  // the tab slept for five seconds
  step(6000);
  expect(lenis.targetScroll - afterFirst).toBeCloseTo(Logic.FRAME_MS / Logic.CREEP_MS_PER_PX, 6);
});

// impossible-if-true: $VirtualScrollerAutoplay — A creep frame that writes while the reader's own input is live.
// domain-invariant: $VirtualScrollerAutoplay — If the reader is scrolling or an input is live when the creep steps, then the creep hands back to the defer loop instead of writing.
test('a live input hands the creep back to the defer loop and writes nothing', () => {
  const { model, owner } = autoplay();
  model.play();
  owner.inputLive = true;
  step(1000);
  expect(owner.setScrollPosition).not.toHaveBeenCalled();
  // it is deferring, not dead: the loop is waiting on its timer
  expect(model.isCreeping).toBe(false);
  owner.inputLive = false;
  vi.advanceTimersByTime(Logic.DEFER_MS);
  step(1016);
  expect(owner.setScrollPosition).toHaveBeenCalledTimes(1);
});

// impossible-if-true: $VirtualScrollerAutoplay — A glide decaying below cruise speed before the creep takes it over.
// domain-invariant: $VirtualScrollerAutoplay — If a forward glide has decayed to cruise speed while play defers, then the creep adopts the animated position there and continues, rather than waiting for the lerp to reach zero.
test('a forward glide decaying to cruise is adopted where it is, and a faster one is left alone', () => {
  const { model, owner, lenis } = autoplay();
  lenis.isScrolling = 'smooth';
  lenis.animatedScroll = 4242;
  owner.lerpRunning = true;

  // still well above cruise: the creep waits rather than snatching the glide
  lenis.velocity = 10;
  model.play();
  expect(lenis.adoptExternalScroll).not.toHaveBeenCalled();

  // decayed to cruise (1 px per 150 ms is ~0.11 px per frame): adopted here
  lenis.velocity = Logic.FRAME_MS / Logic.CREEP_MS_PER_PX / 2;
  model.play();
  expect(lenis.adoptExternalScroll).toHaveBeenCalledWith(4242);
  expect(owner.parkLoopFrame).toHaveBeenCalled();
  expect(model.isCreeping).toBe(true);
});

// domain-invariant: $VirtualScrollerAutoplay — If a forward glide has decayed to cruise speed while play defers, then the creep adopts the animated position there and continues, rather than waiting for the lerp to reach zero.
test('a backward glide is never adopted: that is the reader taking over', () => {
  const { model, owner, lenis } = autoplay();
  lenis.isScrolling = 'smooth';
  lenis.velocity = Logic.FRAME_MS / Logic.CREEP_MS_PER_PX / 2;
  owner.lerpRunning = true;
  owner.scrollDirection.value = 'up';
  model.play();
  expect(lenis.adoptExternalScroll).not.toHaveBeenCalled();
});

// domain-invariant: $VirtualScrollerAutoplay — If the creep reaches the end with autoRepeat on, then it stops and the repeat chain resets to the top after the hold.
test('the end stops the creep, and with autoRepeat the chain returns to the top after the hold', () => {
  const { model, owner, lenis } = autoplay({ autoRepeat: true });
  lenis.actualScroll = 9_700; // 9,700 + 400 ≥ 10,000 − 10
  model.play();
  step(1000);
  // nothing written, no next frame queued: the repeat chain owns the resumption
  expect(owner.setScrollPosition).not.toHaveBeenCalled();
  expect(frames.length).toBe(0);

  vi.advanceTimersByTime(Logic.REPEAT_HOLD_MS);
  expect(owner.setScrollPosition).toHaveBeenCalledWith(0);
  vi.advanceTimersByTime(owner.autoPlayDelay);
  // reading resumes from the top
  expect(model.isCreeping).toBe(true);
});

// domain-invariant: $VirtualScrollerAutoplay — If the creep reaches the end with autoRepeat on, then it stops and the repeat chain resets to the top after the hold.
test('without autoRepeat the end simply stops: the write lands and no frame follows', () => {
  const { model, owner, lenis } = autoplay();
  lenis.actualScroll = 9_700;
  model.play();
  step(1000);
  expect(owner.setScrollPosition).toHaveBeenCalledTimes(1);
  expect(frames.length).toBe(0);
  expect(model.isCreeping).toBe(false);
});

// domain-invariant: $VirtualScrollerAutoplay — If the creep speed is unset, then the cadence is the tuned default, and the drag factor is one; a faster setting raises the factor proportionally.
test('an unset speed is the tuned cadence at factor one; a faster setting raises the factor', () => {
  const { model } = autoplay();
  expect(model.msPerPx).toBe(Logic.CREEP_MS_PER_PX);
  expect(model.factor).toBe(1);

  const fast = autoplay({ creepMsPerPxSetting: 30 });
  expect(fast.model.msPerPx).toBe(30);
  expect(fast.model.factor).toBe(5);
});

// domain-invariant: $VirtualScrollerAutoplay — If the reader is scrolling or an input is live when the creep steps, then the creep hands back to the defer loop instead of writing.
test('start arms the creep after its delay and stop parks both loops', () => {
  const { model, owner } = autoplay();
  const callback = vi.fn();
  model.start(500, callback);
  expect(model.isPlaying.value).toBe(true);
  expect(owner.restartLoop).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(500);
  expect(callback).toHaveBeenCalledTimes(1);
  expect(model.isCreeping).toBe(true);

  model.stop();
  expect(model.isPlaying.value).toBe(false);
  expect(owner.cancelFrames).toHaveBeenCalled();
});
