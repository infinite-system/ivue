/*
=== GENERATOR ===
Goal: A range is inert geometry — a stretch of the list resolved to px — and every layer is a pure function of the scroll value over one: progress across it, presence in the aperture, step quantised and held; so any number of ranges animate at once, forwards and backwards, without an observer and without blocking.
// domain-invariant: $Ranges — If a range is resolved, then its span is the owner's anchored positions where geometry knows them and the assumed row height where it does not, memoised for the batch and re-resolved when a batch begins.
// domain-invariant: $Ranges — If the scroll is at a value, then progress across a range is 0 at its span's start, 1 at its end and held outside; step is progress quantised to n held states; presence is 0 until the span has entered most of the aperture, 1 once it fills it, held while it alone is in it, falling from the moment the next row enters — the aperture, not the frame.
Impossible if true: A range whose derivation reads anything but the scroll value and the owner's geometry.
Impossible if true: A presence measured against the frame when the aperture is narrower.
Impossible if true: A one-row range treated differently from a many-row one.

=== GENERATOR-DESCRIBED ===
The owner is a table: positions, an aperture, anchors; every case is
arithmetic checked at the edges.
*/

import { expect, test } from 'vitest';
import { Ranges } from './Ranges';

const owner = (positions: number[] | null, aperture = Ranges.Class.WHOLE_FRAME): Ranges.Owner & { aperture: Ranges.Aperture } => ({
  rowCount: 20,
  anchoredPosition: (index) => positions?.[index],
  assumedRowPx: 100,
  frameSpan: 1000,
  aperture,
  anchors: new Map([
    ['battle', 4],
    ['retreat', 9]
  ])
});

// domain-invariant: $Ranges — If a range is resolved, then its span is the owner's anchored positions where geometry knows them and the assumed row height where it does not, memoised for the batch and re-resolved when a batch begins.
// impossible-if-true: $Ranges — A one-row range treated differently from a many-row one.
test('a row and a stretch of rows resolve the same way — assumed heights before geometry, anchored positions after, once per batch', () => {
  const assumed = new Ranges.Class(owner(null));
  expect(assumed.spanOf(assumed.row(4))).toEqual({ start: 400, end: 500 });
  expect(assumed.spanOf(assumed.rows(4, 9))).toEqual({ start: 400, end: 900 });
  expect(assumed.between('battle', 'retreat')).toEqual({ from: 4, to: 9 });
  expect(assumed.spanOf(assumed.between('battle', 'nowhere')!)).toEqual({ start: 400, end: 2000 });
  expect(assumed.between('nowhere', 'retreat')).toBeNull();
  const positions = Array.from({ length: 21 }, (_, index) => index * 150);
  const table = owner(positions);
  const measured = new Ranges.Class(table);
  expect(measured.spanOf(measured.row(4))).toEqual({ start: 600, end: 750 });
  // memoised for the batch: a moved position is seen only after the batch begins again
  positions[4] = 620;
  expect(measured.spanOf(measured.row(4)).start).toBe(600);
  measured.beginBatch();
  expect(measured.spanOf(measured.row(4)).start).toBe(620);
});

// domain-invariant: $Ranges — If the scroll is at a value, then progress across a range is 0 at its span's start, 1 at its end and held outside; step is progress quantised to n held states; presence is 0 until the span has entered most of the aperture, 1 once it fills it, held while it alone is in it, falling from the moment the next row enters — the aperture, not the frame.
// impossible-if-true: $Ranges — A range whose derivation reads anything but the scroll value and the owner's geometry.
// impossible-if-true: $Ranges — A presence measured against the frame when the aperture is narrower.
test('progress is held past the edges, step is quantised and held, presence is measured against the aperture and its focus line', () => {
  const ranges = new Ranges.Class(owner(null));
  const chapter = ranges.rows(4, 9); // 400..900
  expect(ranges.progressOf(chapter, 300)).toBe(0);
  expect(ranges.progressOf(chapter, 400)).toBe(0);
  expect(ranges.progressOf(chapter, 650)).toBe(0.5);
  expect(ranges.progressOf(chapter, 900)).toBe(1);
  expect(ranges.progressOf(chapter, 5000)).toBe(1);
  expect([0, 0.34, 0.67, 1].map((p) => ranges.stepOf(chapter, 400 + p * 500, 3))).toEqual([0, 1, 2, 2]);
  // presence of a range TALLER than the frame reproduces the interlude's curve: rows 12..24 = 1200..2400, frame 1000, fade 600
  const tall = ranges.rows(12, 24);
  expect(ranges.presenceOf(tall, 0)).toBe(0);
  expect(ranges.presenceOf(tall, 599)).toBe(0); // entered 399 of 1000: under the threshold
  expect(ranges.presenceOf(tall, 900)).toBeCloseTo(0.5, 6); // entered 700: halfway up the fade
  expect(ranges.presenceOf(tall, 1200)).toBeCloseTo(1, 9); // the span fills the frame
  expect(ranges.presenceOf(tall, 1500)).toBeCloseTo(1 - 100 / 600, 6); // the next row has entered 100 px
  expect(ranges.presenceOf(tall, 2400)).toBe(0);
  // a one-row range SHORTER than the frame is fully present once wholly inside, fading over the last 60% of its own height
  const picture = ranges.row(12); // 1200..1300
  expect(ranges.presenceOf(picture, 0)).toBe(0);
  expect(ranges.presenceOf(picture, 260)).toBeCloseTo((0.6 - 0.4) / 0.6, 6); // 60 of its 100 px inside the frame's bottom
  expect(ranges.presenceOf(picture, 300)).toBeCloseTo(1, 9);
  expect(ranges.presenceOf(picture, 1200)).toBeCloseTo(1, 9); // at the frame's top edge, still whole
  expect(ranges.presenceOf(picture, 1250)).toBeCloseTo((0.5 - 0.4) / 0.6, 6);
  expect(ranges.presenceOf(picture, 1300)).toBe(0);
  // a narrower aperture — the middle 60% of the frame — is what the row must be inside: it enters later and leaves earlier
  const narrow = new Ranges.Class(owner(null, { top: 0.2, bottom: 0.8, focus: 0.5 }));
  expect(narrow.apertureHeight).toBeCloseTo(600, 9);
  expect(narrow.presenceOf(picture, 300)).toBe(0); // inside the frame, not yet inside the aperture (its bottom is at 1100)
  expect(narrow.presenceOf(picture, 500)).toBeCloseTo(1, 9); // aperture 700..1300: the row is wholly inside
  expect(narrow.presenceOf(tall, 1000)).toBeCloseTo(1, 9); // tall: aperture 1200..1800 lies wholly inside the span
  expect(narrow.presenceOf(tall, 700)).toBeCloseTo(((1500 - 1200) / 600 - 0.4) / 0.6, 6); // aperture 900..1500: 300 of 600 covered
  // the focus line: 0 when the span's centre sits on it, ±1 a half-aperture off
  const focusLine = (value: number) => value + 1000 * (0.2 + 0.6 * 0.5); // 500 into the frame
  expect(ranges.focusOf(picture, 1250 - 400)).toBeCloseTo(0, 9); // whole frame: line at 400, centre 1250
  expect(narrow.focusOf(picture, 1250 - 500)).toBeCloseTo(0, 9);
  expect(narrow.focusOf(picture, 1250 - 500 + 300)).toBeCloseTo(1, 9);
  expect(narrow.focusOf(picture, 1250 - 500 - 300)).toBeCloseTo(-1, 9);
  void focusLine;
});
