/*
=== GENERATOR ===
Goal: Land on the row a seek names and keep the reader on it while the list is still learning its sizes — without ever fighting a reader who has moved on.
[A seek names an item not a pixel](virtual-scroller.invariants.md#a-seek-names-an-item-not-a-pixel)
// domain-invariant: $VirtualScrollerLanding — If a landing is asked for, then the target is re-applied on every shift of the item's position until the position has been quiet for QUIET_MS.
// domain-invariant: $VirtualScrollerLanding — If the reader is moving the content themselves when a wave arrives, then the loop ends instead of re-pinning the landing under them.
// domain-invariant: $VirtualScrollerLanding — If the position has drifted from the last landing by more than TAKEOVER_PX when a wave arrives, then the loop ends: the reader scrolled between two waves.
// domain-invariant: $VirtualScrollerLanding — If the content shifts under the reader, then the recorded landing shifts with it, so the content's own motion is never read as a take-over.
// domain-invariant: $VirtualScrollerLanding — If a new landing begins, then the live one ends first, so a stale loop can never fire on a later unrelated size change.
// domain-invariant: $VirtualScrollerLanding — If a fraction is asked for in index space, then it names a row; if in progress space, then it resolves through the scrollable range so the tail of an over-tall row is reachable.
Impossible if true: A converge loop still armed after the reader has taken the scroll.
Impossible if true: A landing re-pinned under a reader who scrolled away from it.

=== GENERATOR-DESCRIBED ===
The owner is a plain object: a real geometry (the position model needs no
scroller either), the few scalars the landing reads, and spies for the two
writes it makes. That is the whole point of the seam — the converge loop is
the hardest thing in the subsystem to reason about, and here it is a
sequence of explicit waves with a fake clock rather than something that only
happens inside a mounted component during a real measurement burst.

Waves are delivered by changing a size through the geometry, which is what
actually happens in the browser: a row mounts, its size lands, P(index)
moves, and the loop's watcher fires. `await nextTick()` twice per wave is not
incidental — the landing writes inside a nextTick and reads back inside a
second one, so a single tick would assert against a half-applied wave.
*/

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { nextTick, ref, computed } from 'vue';
import { VirtualScrollerGeometry } from './VirtualScrollerGeometry';
import { VirtualScrollerLanding } from './VirtualScrollerLanding';

type Row = { id: string };

function landing(itemCount = 100, assumedSize = 30) {
  const items = ref<Row[]>(
    Array.from({ length: itemCount }, (_row, index) => ({ id: String(index) }))
  );
  const assumed = ref(assumedSize);
  const geometry = new VirtualScrollerGeometry.Class({ items, assumedSize: assumed });
  const scrollPosition = ref(0);
  const owner = {
    geometry,
    items,
    scrollPosition,
    containerSpan: 400,
    scrollExtent: computed(() => geometry.contentSize),
    snapAlign: 'start' as 'start' | 'center',
    hasFrame: true,
    readerIsMoving: false,
    inputLive: false,
    lerpRunning: false,
    mainAxisPaddingStart: () => 0,
    // a glide is coherent only inside the pad's coverage; the specs below
    // drive both sides of that line
    coverableGlidePx: 4800,
    glideTo: vi.fn((position: number, onArrive?: () => void) => {
      scrollPosition.value = position;
      onArrive?.();
    }),
    // the scroller's write, spied: it stores the position the way the real one does
    setScrollPosition: vi.fn((position: number) => {
      scrollPosition.value = Math.abs(position);
    }),
    resetScrollTop: vi.fn()
  };
  return { owner, geometry, items, scrollPosition, model: new VirtualScrollerLanding.Class(owner) };
}

/** One measurement wave: a row's size lands, P(index) moves, the loop reacts. */
async function wave(geometry: VirtualScrollerGeometry.Instance, index: number, size: number) {
  geometry.applySize(index, size);
  await nextTick();
  await nextTick();
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// invariant: A seek names an item not a pixel (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// domain-invariant: $VirtualScrollerLanding — If a landing is asked for, then the target is re-applied on every shift of the item's position until the position has been quiet for QUIET_MS.
test('a landing re-applies its target on every size wave and lets go once the position has been quiet', async () => {
  const { model, geometry, scrollPosition } = landing();
  model.toIndex(50, undefined, false);
  await nextTick();
  await nextTick();
  // 50 rows of the 30 px estimate
  expect(scrollPosition.value).toBe(1500);
  expect(model.isConverging).toBe(true);

  // a row above the target measures taller: the target moves and the landing follows
  await wave(geometry, 10, 130);
  expect(scrollPosition.value).toBe(1600);
  expect(model.isConverging).toBe(true);

  // and again — the quiet timer re-arms on every wave
  vi.advanceTimersByTime(VirtualScrollerLanding.Class.QUIET_MS - 1);
  await wave(geometry, 11, 130);
  expect(scrollPosition.value).toBe(1700);
  expect(model.isConverging).toBe(true);

  // silence: the loop lets go
  vi.advanceTimersByTime(VirtualScrollerLanding.Class.QUIET_MS);
  expect(model.isConverging).toBe(false);
});

// impossible-if-true: $VirtualScrollerLanding — A converge loop still armed after the reader has taken the scroll.
// domain-invariant: $VirtualScrollerLanding — If the reader is moving the content themselves when a wave arrives, then the loop ends instead of re-pinning the landing under them.
test('the reader moving the content ends the loop on the next wave, and nothing is re-pinned', async () => {
  const { model, geometry, owner, scrollPosition } = landing();
  model.toIndex(50, undefined, false);
  await nextTick();
  await nextTick();
  expect(model.isConverging).toBe(true);

  owner.readerIsMoving = true;
  const landed = scrollPosition.value;
  await wave(geometry, 10, 130);
  expect(model.isConverging).toBe(false);
  // the wave moved P(50), but the landing did not chase it
  expect(scrollPosition.value).toBe(landed);
});

// impossible-if-true: $VirtualScrollerLanding — A landing re-pinned under a reader who scrolled away from it.
// domain-invariant: $VirtualScrollerLanding — If the position has drifted from the last landing by more than TAKEOVER_PX when a wave arrives, then the loop ends: the reader scrolled between two waves.
test('a position that drifted from the landing ends the loop: the reader scrolled between two waves', async () => {
  const { model, geometry, scrollPosition } = landing();
  model.toIndex(50, undefined, false);
  await nextTick();
  await nextTick();

  // a glide that ended between waves left the position somewhere else
  scrollPosition.value = 900;
  await wave(geometry, 10, 130);
  expect(model.isConverging).toBe(false);
  expect(scrollPosition.value).toBe(900);
});

// domain-invariant: $VirtualScrollerLanding — If the content shifts under the reader, then the recorded landing shifts with it, so the content's own motion is never read as a take-over.
test('a shift the content made moves the landing with it, and the loop keeps converging', async () => {
  const { model, geometry, scrollPosition } = landing();
  model.toIndex(50, undefined, false);
  await nextTick();
  await nextTick();
  const landed = model.appliedPosition!;
  expect(landed).toBe(1500);

  // rows above the reader measured: the scroller shifts the position AND tells
  // the landing, so the drift test below does not read it as the reader moving
  scrollPosition.value += 100;
  model.shiftLanding(100);
  expect(model.appliedPosition).toBe(1600);
  await wave(geometry, 10, 130);
  expect(model.isConverging).toBe(true);
});

// domain-invariant: $VirtualScrollerLanding — If a new landing begins, then the live one ends first, so a stale loop can never fire on a later unrelated size change.
test('a new landing supersedes the live one, and cancel ends it outright', async () => {
  const { model, geometry, scrollPosition } = landing();
  model.toIndex(50, undefined, false);
  await nextTick();
  await nextTick();
  model.toIndex(10, undefined, false);
  await nextTick();
  await nextTick();
  expect(scrollPosition.value).toBe(300);
  expect(model.isConverging).toBe(true);

  // the second loop is the live one: a wave lands on ITS target, not the first's
  await wave(geometry, 2, 130);
  expect(scrollPosition.value).toBe(400);

  model.cancel();
  expect(model.isConverging).toBe(false);
  expect(model.appliedPosition).toBe(null);
  await wave(geometry, 3, 130);
  expect(scrollPosition.value).toBe(400);
});

// domain-invariant: $VirtualScrollerLanding — If a fraction is asked for in index space, then it names a row; if in progress space, then it resolves through the scrollable range so the tail of an over-tall row is reachable.
test('index space names a row and progress space resolves through the scrollable range', async () => {
  const { model, scrollPosition } = landing(101);
  model.toFraction(0.5);
  await nextTick();
  await nextTick();
  // 0.5 × 100 = row 50, flush to the start
  expect(scrollPosition.value).toBe(1500);

  // progress space: the fraction is of the travel, not of the index range
  model.toProgress(1);
  await nextTick();
  await nextTick();
  // the whole content is 3030; the travel is 3030 − 400
  expect(scrollPosition.value).toBeCloseTo(2630, 0);
});

// domain-invariant: $VirtualScrollerLanding — If a fraction is asked for in index space, then it names a row; if in progress space, then it resolves through the scrollable range so the tail of an over-tall row is reachable.
test('a centered landing puts the row under the container’s middle, and a start landing flush to the edge', () => {
  const { model, owner } = landing();
  expect(model.alignOffset(20)).toBe(0);
  owner.snapAlign = 'center';
  // a 30 px row in a 400 px frame
  expect(model.alignOffset(20)).toBe(185);
});

// domain-invariant: $VirtualScrollerLanding — If a landing is asked for, then the target is re-applied on every shift of the item's position until the position has been quiet for QUIET_MS.
test('step mode waits for the input and the lerp to rest before it snaps', async () => {
  const { model, owner, scrollPosition } = landing();
  owner.inputLive = true;
  model.armSnap();
  vi.advanceTimersByTime(VirtualScrollerLanding.Class.SNAP_MS);
  await nextTick();
  // still live: nothing landed, and the snap re-armed itself
  expect(owner.setScrollPosition).not.toHaveBeenCalled();

  owner.inputLive = false;
  scrollPosition.value = 100; // a third into row 3, whose top is 90
  vi.advanceTimersByTime(VirtualScrollerLanding.Class.SNAP_RETRY_MS);
  await nextTick();
  await nextTick();
  // under half: the landing is the row the reader is already mostly in
  expect(scrollPosition.value).toBe(90);

  // two thirds into row 3: past half, so the landing is the NEXT row's top
  scrollPosition.value = 110;
  model.armSnap();
  vi.advanceTimersByTime(VirtualScrollerLanding.Class.SNAP_MS);
  await nextTick();
  await nextTick();
  expect(scrollPosition.value).toBe(120);
});
