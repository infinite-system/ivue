/*
=== GENERATOR ===
Goal: Read a flick's velocity off the finger's last stretch of moves, so a touchend that lands after an idle frame still flicks at the finger's speed.
[A flick's velocity is read off the finger's last stretch](lenis.invariants.md#a-flicks-velocity-is-read-off-the-fingers-last-stretch)
[Android holds the first move back and may coalesce a swipe into one](lenis.invariants.md#android-holds-the-first-move-back-and-may-coalesce-a-swipe-into-one)
[A flick carries the glide it interrupted](lenis.invariants.md#a-flick-carries-the-glide-it-interrupted)
[A touch on a glide keeps it running until the first move](lenis.invariants.md#a-touch-on-a-glide-keeps-it-running-until-the-first-move)
// domain-invariant: $Lenis — If a flick runs the same way as the glide the finger interrupted, then the glide's velocity at the take-over is added to the flick's; a flick the other way, or no glide, adds nothing.
// domain-invariant: $Lenis — If the finger's trail holds two or more samples spanning a readable time, then the flick's velocity is the position change over that span scaled to a frame; otherwise it is the frame's own velocity.
// domain-invariant: $Lenis — If a nested box scrolls natively and can still move the way the wheel asks, then the wheel is the box's, in either direction
// domain-invariant: $Lenis — If the content shifts under a finger's drag, then the trail shifts with it, so the flick's velocity is the finger's motion and never the shift's.
// domain-invariant: $Lenis — If overscroll is on and a gesture at an end asks for more than the end has, then the scroller takes none of it and scrolls the nearest scrollable ancestor, else the window, by the gesture's own delta; an inward gesture, or overscroll off, is taken as before.
// domain-invariant: $Lenis — If a finger lands on a glide, then the glide's target is pulled to a few frames of travel ahead under a steep lerp and its momentum is remembered for a flick the same way; the first move takes over where the content is.
Impossible if true: A flick that dies because the last animation frame before the touchend saw no move.
Impossible if true: A wheel up over a nested box scrolled down that moves the list instead of the box.
Impossible if true: A swipe over rows that measured taller mid-drag reading a velocity of zero.
Impossible if true: A wheel up at the top of the thread that moves nothing.
Impossible if true: A reversal that waits for the old glide to run its distance.

=== GENERATOR-DESCRIBED ===
The trail is the one thing the fork adds to touch inertia; the sync
lerp and the inertia multiplier are upstream Lenis.
*/

import { expect, test, vi } from 'vitest';
import { Lenis } from './Lenis';

const { FLICK_WINDOW_MS } = Lenis.Class;
const trailVelocity = Lenis.Class.trailVelocity;
const trimTrail = Lenis.Class.trimTrail;

// domain-invariant: $Lenis — If the finger's trail holds two or more samples spanning a readable time, then the flick's velocity is the position change over that span scaled to a frame; otherwise it is the frame's own velocity.
// invariant: A flick's velocity is read off the finger's last stretch (examples/playground/src/lenis/lenis.invariants.md)
test('the flick velocity is read off the trail, and falls back to the frame velocity with too little trail', () => {
  const trail = [
    { at: 1000, position: 0 },
    { at: 1050, position: 100 },
    { at: 1100, position: 200 }
  ];
  // 200 px over 100 ms = 2 px/ms ≈ 33.4 px per 16.7 ms frame.
  expect(trailVelocity(trail, 0)).toBeCloseTo(33.4, 6);
  // A span longer than the window reads as the window.
  expect(
    trailVelocity(
      [
        { at: 0, position: 0 },
        { at: 400, position: 200 }
      ],
      0
    )
  ).toBeCloseTo(33.4, 6);
  expect(trailVelocity([trail[0]], 7)).toBe(7);
  expect(trailVelocity([trail[0], { at: 1004, position: 50 }], 7)).toBe(7);
  expect(trailVelocity([], 3)).toBe(3);
});

// impossible-if-true: $Lenis — A flick that dies because the last animation frame before the touchend saw no move.
// invariant: Android holds the first move back and may coalesce a swipe into one (examples/playground/src/lenis/lenis.invariants.md)
test('a re-flick Android coalesced into one touchmove still flicks: the touchstart seeds the trail, so one move has a span', () => {
  // The log from the phone: touchstart at 10.99 s, one touchmove 190 ms
  // later carrying 194 px, touchend 10 ms after; the frame velocity was
  // zero since the tap-to-stop reset. Seeded, the trail reads the swipe.
  const seeded = [
    { at: 10_990, position: 12_887 },
    { at: 11_180, position: 12_887 + 194 }
  ];
  // The 190 ms wait is not the flick: the span counts as the window.
  expect(trailVelocity(seeded, 0)).toBeCloseTo((194 / FLICK_WINDOW_MS) * 16.7, 6);
  // The seed sits outside the window by the time the move lands; the trim
  // keeps it as the anchor all the same (the phone's second log: 260 ms).
  const late = [
    { at: 6_350, position: 4_982 },
    { at: 6_610, position: 4_982 + 257 }
  ];
  trimTrail(late, 6_610, FLICK_WINDOW_MS);
  expect(late).toHaveLength(2);
  expect(trailVelocity(late, 0)).toBeCloseTo((257 / FLICK_WINDOW_MS) * 16.7, 6);
  // The seed is the animated position, not the glide's target: seeded at
  // the target (13476, 327 px ahead of the content at 13149) the phone's
  // 336 px swipe read as 1.19 px/frame; seeded where the content is, it
  // reads the swipe.
  const atTarget = [
    { at: 15_980, position: 13_476 },
    { at: 16_100, position: 13_149 + 336 }
  ];
  expect(trailVelocity(atTarget, 0)).toBeLessThan(2);
  const atContent = [
    { at: 15_980, position: 13_149 },
    { at: 16_100, position: 13_149 + 336 }
  ];
  expect(trailVelocity(atContent, 0)).toBeCloseTo((336 / FLICK_WINDOW_MS) * 16.7, 6);
});

// impossible-if-true: $Lenis — A flick that dies because the last animation frame before the touchend saw no move.
test('an idle frame before the touchend does not zero the flick: the trail still spans the finger’s moves', () => {
  const trail = [
    { at: 1000, position: 0 },
    { at: 1030, position: 60 },
    { at: 1060, position: 120 }
  ];
  // The frame's own velocity read zero (no move in the last 16 ms); the trail says otherwise.
  expect(trailVelocity(trail, 0)).toBeGreaterThan(30);
  // The window drops what is older than FLICK_WINDOW_MS, so a pause mid-touch is not a flick.
  const paused = [
    { at: 0, position: 0 },
    { at: 50, position: 100 },
    { at: 400, position: 100 }
  ];
  trimTrail(paused, 400, FLICK_WINDOW_MS);
  expect(paused).toEqual([
    { at: 50, position: 100 },
    { at: 400, position: 100 }
  ]);
  expect(trailVelocity(paused, 0)).toBe(0);
});

// domain-invariant: $Lenis — If a flick runs the same way as the glide the finger interrupted, then the glide's velocity at the take-over is added to the flick's; a flick the other way, or no glide, adds nothing.
// invariant: A flick carries the glide it interrupted (examples/playground/src/lenis/lenis.invariants.md)
test('a flick the same way carries the interrupted glide’s velocity; the other way, or with no glide, it carries nothing', () => {
  const { carryVelocity } = Lenis.Class;
  expect(carryVelocity(40, 25)).toBe(65);
  expect(carryVelocity(-40, -25)).toBe(-65);
  expect(carryVelocity(40, -25)).toBe(40);
  expect(carryVelocity(40, 0)).toBe(40);
  expect(carryVelocity(0, 25)).toBe(0);
});

// domain-invariant: $Lenis — If a nested box scrolls natively and can still move the way the wheel asks, then the wheel is the box's, in either direction
// impossible-if-true: $Lenis — A wheel up over a nested box scrolled down that moves the list instead of the box.
test('a nested native box keeps the wheel in both directions while it can still move', () => {
  // jsdom has no ResizeObserver; the constructor wires one for the wrapper
  class ObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const hadObserver = 'ResizeObserver' in globalThis;
  if (!hadObserver)
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ObserverStub;
  const wrapper = document.createElement('div');
  const content = document.createElement('div');
  wrapper.appendChild(content);
  document.body.appendChild(wrapper);
  const lenis = new Lenis.Class({ wrapper, content, allowNestedScroll: true, autoRaf: false });
  const box = document.createElement('div');
  box.style.overflowY = 'auto';
  Object.defineProperty(box, 'scrollHeight', { value: 400, configurable: true });
  Object.defineProperty(box, 'clientHeight', { value: 100, configurable: true });
  const check = (scrollTop: number, deltaY: number) => {
    box.scrollTop = scrollTop;
    Object.defineProperty(box, 'scrollTop', {
      value: scrollTop,
      configurable: true,
      writable: true
    });
    delete (box as unknown as { _lenis?: unknown })._lenis;
    return (
      lenis as unknown as {
        checkNestedScroll: (
          node: HTMLElement,
          delta: { deltaX: number; deltaY: number }
        ) => boolean;
      }
    ).checkNestedScroll(box, { deltaX: 0, deltaY });
  };
  expect(check(0, 10)).toBe(true); // at the top, a wheel down is the box's
  expect(check(0, -10)).toBe(false); // at the top, a wheel up has nowhere to go: the list's
  expect(check(150, -10)).toBe(true); // scrolled down, a wheel up is the box's
  expect(check(150, 10)).toBe(true);
  expect(check(300, 10)).toBe(false); // at the bottom, a wheel down is the list's
  lenis.destroy();
  wrapper.remove();
  if (!hadObserver) delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
});

// domain-invariant: $Lenis — If the content shifts under a finger's drag, then the trail shifts with it, so the flick's velocity is the finger's motion and never the shift's.
// impossible-if-true: $Lenis — A swipe over rows that measured taller mid-drag reading a velocity of zero.
test('a shift under the finger moves the trail with the content: the flick reads the finger, not the rows that grew', () => {
  class ObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const hadObserver = 'ResizeObserver' in globalThis;
  if (!hadObserver)
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ObserverStub;
  const wrapper = document.createElement('div');
  const content = document.createElement('div');
  wrapper.appendChild(content);
  document.body.appendChild(wrapper);
  const lenis = new Lenis.Class({ wrapper, content, autoRaf: false, syncTouch: true });
  const inner = lenis as unknown as {
    touchTrail: Array<{ at: number; position: number }>;
    animatedScroll: number;
    targetScroll: number;
  };
  // the finger drags up 300 px over three moves; rows above measure 1000 px taller between them
  inner.animatedScroll = inner.targetScroll = 5000;
  inner.touchTrail = [
    { at: 1000, position: 5000 },
    { at: 1016, position: 4900 }
  ];
  lenis.shiftBy(1000);
  // the finger goes on from where the shifted content is: two more 100 px moves
  inner.touchTrail.push({ at: 1032, position: inner.targetScroll - 200 });
  inner.touchTrail.push({ at: 1048, position: inner.targetScroll - 300 });
  // the trail reads as the finger's 300 px over 48 ms, whatever the rows did
  expect(inner.touchTrail.map((point) => point.position)).toEqual([6000, 5900, 5800, 5700]);
  expect(Lenis.Class.trailVelocity(inner.touchTrail, 0)).toBeCloseTo((-300 / 48) * 16.7, 6);
  lenis.destroy();
  wrapper.remove();
  if (!hadObserver) delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
});

// domain-invariant: $Lenis — If overscroll is on and a gesture at an end asks for more than the end has, then the scroller takes none of it and scrolls the nearest scrollable ancestor, else the window, by the gesture's own delta; an inward gesture, or overscroll off, is taken as before.
// impossible-if-true: $Lenis — A wheel up at the top of the thread that moves nothing.
test('an outward gesture at a limit is handed to the page, an inward one is taken; overscroll off takes both', () => {
  class ObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const hadObserver = 'ResizeObserver' in globalThis;
  if (!hadObserver)
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ObserverStub;
  const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
  const build = (overscroll: boolean) => {
    const wrapper = document.createElement('div');
    const content = document.createElement('div');
    wrapper.appendChild(content);
    document.body.appendChild(wrapper);
    const lenis = new Lenis.Class({
      wrapper,
      content,
      autoRaf: false,
      overscroll,
      wheelMultiplier: 2,
      touchMultiplier: 1.3
    });
    lenis.virtualLimit = () => 1000;
    const gesture = (type: string, deltaY: number) => {
      const event = {
        type,
        ctrlKey: false,
        preventDefault: vi.fn(),
        composedPath: () => [content, wrapper, document.body],
        target: content
      };
      (
        lenis as unknown as {
          onVirtualScroll: (data: { deltaX: number; deltaY: number; event: unknown }) => void;
        }
      ).onVirtualScroll({ deltaX: 0, deltaY, event });
      return event;
    };
    return { lenis, wrapper, gesture };
  };
  // the pure decision: at the start only a backward delta is outward, at the end only a forward one, a still delta never
  expect(Lenis.Class.isOutward(0, 1000, -100)).toBe(true);
  expect(Lenis.Class.isOutward(0, 1000, 100)).toBe(false);
  expect(Lenis.Class.isOutward(1000, 1000, 100)).toBe(true);
  expect(Lenis.Class.isOutward(999.6, 1000, 100)).toBe(true);
  expect(Lenis.Class.isOutward(500, 1000, 100)).toBe(false);
  expect(Lenis.Class.isOutward(0, 0, 100)).toBe(true);
  expect(Lenis.Class.isOutward(0, 1000, 0)).toBe(false);
  // on: a wheel up at the top is the page's, by the un-multiplied notch; a wheel down is the scroller's
  const on = build(true);
  const up = on.gesture('wheel', -200);
  expect(up.preventDefault).toHaveBeenCalled();
  expect(scrollBy).toHaveBeenLastCalledWith(0, -100);
  expect(on.lenis.targetScroll).toBe(0);
  const down = on.gesture('wheel', 200);
  expect(down.preventDefault).toHaveBeenCalled();
  expect(on.lenis.targetScroll).toBe(200);
  expect(scrollBy).toHaveBeenCalledTimes(1);
  // a scrollable ancestor takes the hand-off before the window does
  const box = document.createElement('div');
  box.style.overflowY = 'auto';
  Object.defineProperty(box, 'scrollHeight', { value: 4000, configurable: true });
  Object.defineProperty(box, 'clientHeight', { value: 400, configurable: true });
  box.scrollTop = 50;
  document.body.appendChild(box);
  box.appendChild(on.wrapper);
  on.gesture('wheel', -200);
  expect(box.scrollTop).toBe(50 - 100);
  expect(scrollBy).toHaveBeenCalledTimes(1);
  on.lenis.destroy();
  box.remove();
  // off: both directions stay inside — the page never moves
  const off = build(false);
  const kept = off.gesture('wheel', -200);
  expect(kept.preventDefault).toHaveBeenCalled();
  expect(scrollBy).toHaveBeenCalledTimes(1);
  off.lenis.destroy();
  off.wrapper.remove();
  scrollBy.mockRestore();
  if (!hadObserver) delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
});

// domain-invariant: $Lenis — If a finger lands on a glide, then the glide's target is pulled to a few frames of travel ahead under a steep lerp and its momentum is remembered for a flick the same way; the first move takes over where the content is.
// impossible-if-true: $Lenis — A reversal that waits for the old glide to run its distance.
// invariant: A touch on a glide keeps it running until the first move (examples/playground/src/lenis/lenis.invariants.md)
test('a finger on a glide brakes it to a few frames ahead and keeps its momentum for a flick the same way', () => {
  class ObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const hadObserver = 'ResizeObserver' in globalThis;
  if (!hadObserver)
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ObserverStub;
  const wrapper = document.createElement('div');
  const content = document.createElement('div');
  wrapper.appendChild(content);
  document.body.appendChild(wrapper);
  const lenis = new Lenis.Class({ wrapper, content, autoRaf: false, syncTouch: true });
  lenis.virtualLimit = () => 100_000;
  const gesture = (type: string, deltaY: number) => {
    const event = {
      type,
      ctrlKey: false,
      preventDefault: vi.fn(),
      composedPath: () => [content, wrapper, document.body],
      target: content
    };
    (
      lenis as unknown as {
        onVirtualScroll: (data: { deltaX: number; deltaY: number; event: unknown }) => void;
      }
    ).onVirtualScroll({ deltaX: 0, deltaY, event });
  };
  const inner = lenis as unknown as { carriedVelocity: number; touchPending: boolean };
  // a glide toward 4000, two frames in: moving fast, far from its target
  lenis.scrollTo(4000, { programmatic: false, lerp: 0.08 });
  lenis.raf(0);
  lenis.raf(16.7);
  lenis.raf(33.4);
  const velocity = lenis.velocity;
  expect(velocity).toBeGreaterThan(50);
  expect(lenis.targetScroll).toBe(4000);
  // the finger lands: the target is pulled to a few frames ahead, the momentum is kept
  gesture('touchstart', 0);
  expect(inner.touchPending).toBe(true);
  expect(inner.carriedVelocity).toBe(velocity);
  expect(lenis.targetScroll).toBe(
    Math.round(lenis.animatedScroll + velocity * Lenis.Class.TOUCH_BRAKE_FRAMES)
  );
  expect(lenis.targetScroll - lenis.animatedScroll).toBeLessThan(4000 - lenis.animatedScroll);
  // a few frames on, the content has all but settled under the finger: a
  // quarter of the glide's speed, where the unbraked glide would still run
  const before = lenis.animatedScroll;
  for (let frame = 3; frame < 12; frame++) lenis.raf(frame * 16.7);
  expect(Math.abs(lenis.velocity)).toBeLessThan(velocity * 0.25);
  expect(lenis.animatedScroll - before).toBeLessThan(velocity * Lenis.Class.TOUCH_BRAKE_FRAMES);
  // the first move takes over where the content is, the momentum still carried
  const at = lenis.animatedScroll;
  gesture('touchmove', -40);
  expect(inner.touchPending).toBe(false);
  expect(inner.carriedVelocity).toBe(velocity);
  expect(lenis.targetScroll).toBe(Math.round(at - 40));
  lenis.destroy();
  wrapper.remove();
  if (!hadObserver) delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
});
