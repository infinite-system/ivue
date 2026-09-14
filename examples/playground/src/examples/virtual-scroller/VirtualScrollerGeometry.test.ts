/*
=== GENERATOR ===
Goal: Answer where any item sits, and which item sits at any pixel, over a list whose rows are mostly unmeasured — at a cost that never grows with the list.
[Rendered sizes are known only after a row mounts](virtual-scroller.invariants.md#rendered-sizes-are-known-only-after-a-row-mounts)
[Shrinking the list prunes the measurements at its new end](virtual-scroller.invariants.md#shrinking-the-list-prunes-the-measurements-at-its-new-end)
[A seek names an item not a pixel](virtual-scroller.invariants.md#a-seek-names-an-item-not-a-pixel)
// domain-invariant: $VirtualScrollerGeometry — If item i's position is asked, then it is the sum of the sizes before it, measured where known and the estimate elsewhere, whichever way the cursor walks there.
// domain-invariant: $VirtualScrollerGeometry — If a pixel offset is asked for its item, then anchoring that item at the returned fraction gives the same pixel back.
// domain-invariant: $VirtualScrollerGeometry — If the content size is asked, then it is the measured sum plus the estimate for every unmeasured row, in one addition rather than a walk.
// domain-invariant: $VirtualScrollerGeometry — If a ratio is asked for its pixel, then it names an item plus a fraction inside it, and an end gap keeps the next item's top that far below the landing.
// domain-invariant: $VirtualScrollerGeometry — If at least CALIBRATION_ROWS rows have measured and some have not, then the estimate becomes their average once and never moves again.
Impossible if true: An item outside the list with a position.
Impossible if true: A cursor whose offset disagrees with the sum of the sizes before its index.

=== GENERATOR-DESCRIBED ===
The owner is a plain object of two refs — the items and the assumed size —
which is the whole point of the split: the position model needs no scroller,
no DOM and no scroll position, so every claim here is proven by arithmetic
alone. Positions are asked in both directions on purpose: the cursor is a
cache that moves, and a walk that lands on different numbers depending on
where it came from is the one failure this model can have. `rawSizes` and
`cursor` are read here the way the window walk reads them — the hot path
takes the map and the cursor once per pass, never per row, and a future
edit that makes either of them private would put a `toRaw` back inside the
per-row loop.
*/

import { expect, test } from 'vitest';
import { ref } from 'vue';
import { VirtualScrollerGeometry } from './VirtualScrollerGeometry';

type Row = { id: string };

/** The owner is two refs — no scroller, no DOM, no scroll position. */
function geometry(itemCount: number, assumedSize = 30) {
  const items = ref<Row[]>(
    Array.from({ length: itemCount }, (_row, index) => ({ id: String(index) }))
  );
  const assumed = ref(assumedSize);
  return {
    items,
    assumed,
    model: new VirtualScrollerGeometry.Class({ items, assumedSize: assumed })
  };
}

// invariant: Rendered sizes are known only after a row mounts (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// domain-invariant: $VirtualScrollerGeometry — If item i's position is asked, then it is the sum of the sizes before it, measured where known and the estimate elsewhere, whichever way the cursor walks there.
test('an item’s position is the sum of the sizes before it, measured or assumed, and the same from either direction of the walk', () => {
  const { model } = geometry(10);
  expect(model.contentSize).toBe(300);
  expect(model.positionOf(4)).toBe(120);

  // Item 2 turns out to be 100 px tall: everything after it shifts by 70.
  model.applySize(2, 100);
  expect(model.positionOf(2)).toBe(60);
  expect(model.positionOf(3)).toBe(160);
  expect(model.positionOf(9)).toBe(340);
  expect(model.contentSize).toBe(370);

  // Walking back from the far end lands on the same numbers as walking up.
  expect(model.positionOf(0)).toBe(0);
  expect(model.positionOf(3)).toBe(160);

  // Un-measuring restores the estimate.
  model.applySize(2, null as unknown as number);
  expect(model.positionOf(3)).toBe(90);
  expect(model.contentSize).toBe(300);
});

// impossible-if-true: $VirtualScrollerGeometry — An item outside the list with a position.
test('no item outside the list has a position', () => {
  const { model } = geometry(5);
  expect(model.positionOf(-1)).toBeUndefined();
  expect(model.positionOf(5)).toBeUndefined();
  expect(model.anchoredPosition(5)).toBeUndefined();
  expect(model.indexAt(0)).toEqual({ index: 0, fraction: 0 });
});

// impossible-if-true: $VirtualScrollerGeometry — A cursor whose offset disagrees with the sum of the sizes before its index.
test('however far the cursor has walked, its offset is still the sum of the sizes before its index', () => {
  const { model } = geometry(40);
  model.applySize(3, 90);
  model.applySize(11, 140);
  model.applySize(30, 15);
  for (const index of [0, 39, 12, 4, 25, 1, 39, 0]) {
    model.positionOf(index);
    let sum = 0;
    for (let before = 0; before < model.cursor.index; before++) sum += model.sizeOf(before);
    expect(model.cursor.offset).toBeCloseTo(sum, 6);
  }
});

// domain-invariant: $VirtualScrollerGeometry — If a pixel offset is asked for its item, then anchoring that item at the returned fraction gives the same pixel back.
test('the item under a pixel offset, anchored at its fraction, returns that pixel', () => {
  const { model } = geometry(10);
  model.applySize(2, 100);
  for (const offset of [0, 29, 30, 75, 159, 160, 345]) {
    const at = model.indexAt(offset)!;
    expect(model.anchoredPosition(at.index, at.fraction)).toBeCloseTo(offset, 6);
  }
  expect(model.indexAt(75)).toEqual({ index: 2, fraction: 0.15 });
  // Past the end: the last item, fully scrolled.
  expect(model.indexAt(10_000)).toEqual({ index: 9, fraction: 1 });
});

// domain-invariant: $VirtualScrollerGeometry — If the content size is asked, then it is the measured sum plus the estimate for every unmeasured row, in one addition rather than a walk.
test('the content size is the measured sum plus the estimate for the rest, and an empty list has none', () => {
  const { model, items } = geometry(100);
  expect(model.contentSize).toBe(3000);
  model.applySize(0, 130);
  model.applySize(1, 70);
  // two measured (200) + ninety-eight assumed (2940)
  expect(model.contentSize).toBe(3140);
  // the total agrees with the position of the item past the end
  expect(model.positionOf(99)! + model.sizeOf(99)).toBe(3140);
  items.value = [];
  model.rederive();
  expect(model.contentSize).toBe(0);
});

// invariant: A seek names an item not a pixel (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
// domain-invariant: $VirtualScrollerGeometry — If a ratio is asked for its pixel, then it names an item plus a fraction inside it, and an end gap keeps the next item's top that far below the landing.
test('a ratio names an item plus a fraction inside it, and the end gap keeps the next item’s top clear of the viewport top', () => {
  const { model } = geometry(11);
  expect(model.ratioPosition(0)).toBe(0);
  expect(model.ratioPosition(1)).toBe(300);
  // 0.5 × 10 = item 5 exactly.
  expect(model.ratioPosition(0.5)).toBe(150);
  // 0.55 × 10 = item 5 at half: 165 px. With a 20 px end gap the landing
  // may not pass 180 − 20 = 160.
  expect(model.ratioPosition(0.55)).toBe(165);
  expect(model.ratioPosition(0.55, 20)).toBe(160);
});

// invariant: Shrinking the list prunes the measurements at its new end (examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md)
test('shrinking the list re-derives the size over what remains, prunes the measurements at the new end, and parks the farther ones', () => {
  const { model, items } = geometry(10);
  model.applySize(4, 100);
  model.applySize(5, 100);
  model.applySize(6, 100);
  model.applySize(9, 100);
  expect(model.contentSize).toBe(6 * 30 + 4 * 100);

  items.value = items.value.slice(0, 5);
  model.rederive();
  // Only index 4 survives; 5 and 6 were the contiguous run at the new end.
  expect(model.contentSize).toBe(4 * 30 + 100);
  expect(model.measuredSizes.value[5]).toBeUndefined();
  expect(model.measuredSizes.value[6]).toBeUndefined();
  // 9 is parked, not counted — and resurrects if the list grows back over it.
  expect(model.measuredSizes.value[9]).toBe(100);
});

// domain-invariant: $VirtualScrollerGeometry — If at least CALIBRATION_ROWS rows have measured and some have not, then the estimate becomes their average once and never moves again.
test('the estimate calibrates to the average once five rows have measured, and never moves again', () => {
  const { model } = geometry(100);
  expect(model.estimatedItemSize).toBe(30);

  // four measured rows are not yet a screen: nothing changes
  for (const index of [0, 1, 2, 3]) model.applySize(index, 150);
  model.calibrate();
  expect(model.estimatedItemSize).toBe(30);

  model.applySize(4, 150);
  model.calibrate();
  expect(model.estimatedItemSize).toBe(150);

  // a later, taller wave never moves it again
  for (const index of [5, 6, 7, 8, 9]) model.applySize(index, 400);
  model.calibrate();
  expect(model.estimatedItemSize).toBe(150);
});

// domain-invariant: $VirtualScrollerGeometry — If item i's position is asked, then it is the sum of the sizes before it, measured where known and the estimate elsewhere, whichever way the cursor walks there.
test('a size written past the end of the list is kept for neighbour reads but counts toward nothing', () => {
  const { model } = geometry(5);
  model.applySize(12, 200);
  expect(model.measuredSizes.value[12]).toBe(200);
  expect(model.contentSize).toBe(150);
  expect(model.positionOf(12)).toBeUndefined();
});
