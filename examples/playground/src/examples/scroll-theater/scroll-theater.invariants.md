# Scroll theater invariants

The living contract for the theater's primitives: `Ranges.ts` first, the modules the refactor extracts after it (`tasks/scroll-theater-refactor.md`). It stands on the stage's contract, `../scroll-stage/scroll-stage.invariants.md`, and through it on the integrator's; as mechanism moves here, its records move with it.

Two kinds of records, and the split is load-bearing:

- **Reality-based invariants** are forced by the scroller's geometry and the compositor. Discovered, not chosen.
- **Chosen invariants** are the theater's own disciplines.

Chosen invariants stand on reality invariants, never the reverse.

## Generator

Every layer of a theater is a formatter over a RANGE of the one number — [A range is inert geometry over the list](#a-range-is-inert-geometry-over-the-list) — through one of three derivations: [Progress is the fraction of a range crossed and held past its edges](#progress-is-the-fraction-of-a-range-crossed-and-held-past-its-edges), [Presence is coverage of the aperture over the smaller height](#presence-is-coverage-of-the-aperture-over-the-smaller-height), and step, progress quantised and held. Because a range does not run, any number of them animate at once, forwards and backwards, and nothing waits for anything.

### A range is inert geometry over the list

**Invariant:** If a range is declared — rows `from` to `to`, a row being the range one row long, an anchor pair naming rows — then its span is the owner's anchored positions where geometry knows them and the assumed row height where it does not, memoised for the batch and re-resolved when a batch begins; a range holds no state, runs nothing, observes nothing, and reads only the scroll value and the owner's geometry.

**Scope:** `Ranges.ts` `row`, `rows`, `between`, `positionOf`, `spanOf`, `beginBatch`; `Ranges.Owner`.

**Components:** [Progress is the fraction of a range crossed and held past its edges](#progress-is-the-fraction-of-a-range-crossed-and-held-past-its-edges) · [Presence is coverage of the aperture over the smaller height](#presence-is-coverage-of-the-aperture-over-the-smaller-height).

**Mechanism:** A layer that observes (an intersection observer) runs a frame late and cannot run backwards; a layer that computes from a span and the one number composes into the scroll's sequence exactly. The stage's chapters, texts and interludes were three private copies of this arithmetic; they are one now.

**Evidence:** `Ranges.test.ts`; `ScrollStage.ts` delegating its geometry with its suites unchanged, 2026-09-19.

**Impossible if true:** A range whose derivation reads anything but the scroll value and the owner's geometry. A one-row range treated differently from a many-row one.

**Verification:** `npx vitest run src/examples/scroll-theater src/examples/scroll-stage`.

**Status:** established

**Last refined:** 2026-09-19

## Reality-based invariants

### Progress is the fraction of a range crossed and held past its edges

**Invariant:** If the scroll is at a value, then progress across a range is 0 at its span's start, 1 at its end, linear between, and held at 0 or 1 outside; step is that progress quantised to n held states.

**Renegotiable at:** nowhere — it is what a fraction of a span is.

**Scope:** `Ranges.ts` `progressOf`, `stepOf`.

**Mechanism:** Held past the edges is what lets a state a range reached stay reached, and what makes a range wider than a row the way an animation outlasts a row's crossing.

**Evidence:** `Ranges.test.ts`.

**Impossible if true:** A progress outside 0..1. A step outside 0..n-1.

**Verification:** `npx vitest run src/examples/scroll-theater`.

**Status:** established

**Last refined:** 2026-09-19

### Presence is coverage of the aperture over the smaller height

**Invariant:** If the scroll is at a value, then a range's presence is the overlap of its span with the aperture, divided by the lesser of the span's height and the aperture's, with the last `FADE_FRACTION` of that coverage the fade in and out: a span taller than the aperture is fully present once it fills the aperture and falls from the moment the next row enters; a row shorter than it is fully present once wholly inside. The aperture — not the frame — is the reference, with a focus line inside it.

**Renegotiable at:** the aperture's definition, which a world or a curtain sets; the curve's reduction to the interlude's for a tall span is arithmetic.

**Scope:** `Ranges.ts` `presenceOf`, `focusOf`, `apertureHeight`, `FADE_FRACTION`, `WHOLE_FRAME`; `Ranges.Aperture`.

**Mechanism:** The interlude's curve assumed a span taller than the frame; a small row could never reach one under it. Coverage over the smaller height is the one form both obey, found when the first spec for a one-row range failed.

**Evidence:** `Ranges.test.ts` — a tall range reproducing the interlude's numbers, a one-row range wholly inside, a narrowed aperture entering later and leaving earlier; `ScrollStage.ts` `interludePresence` delegating with its suite unchanged.

**Impossible if true:** A presence measured against the frame when the aperture is narrower. A row wholly inside the aperture with presence below one.

**Verification:** `npx vitest run src/examples/scroll-theater src/examples/scroll-stage`.

**Status:** established

**Last refined:** 2026-09-19

## Chosen invariants

(none yet — the composer, the rail, the curtains and the theater bring theirs as they land)

## Impossibility boundary — what these invariants forbid

A range that runs or observes · a derivation reading anything but the one number and the geometry · a presence against the frame under a narrower aperture · a progress or step outside its bounds.
