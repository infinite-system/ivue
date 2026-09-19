# Scroll Theater — the refactor plan

Companion to `scroll-theater.md` (the primitives). This is the order of
commits that turns the shipped stage into the theater, with the rule each
commit obeys and how each is judged. The shipped stage (`ScrollStage`,
`ScrollFlight`, the page at `/examples/scroll-flight`) is judged native on
both phones and deployed; nothing here may make it worse at any commit.

## Principles

1. **Extract, never rewrite.** The stage already holds the mechanism a
   theater needs — pieces of a run aligned to its start, the rate handoff,
   constant tracks written once, the per-batch memo, presence, the video
   rule, model mirroring. Each moves into its new home function by
   function, with its spec. Two implementations of one invariant is the
   failure mode; a re-derived mechanism is never accepted.
2. **One primitive per commit.** Each commit is a refactor with no visible
   change, or one new capability, never both. The specs staying green is
   the proof of the first kind; a screenshot pass and the built site on the
   phones judge the second.
3. **The stage keeps deploying at every commit.** `ScrollStage` delegates to
   the extracted modules as they land, so the shipped page runs on the new
   code long before the page swaps. When the theater renders the flight
   identically, the old classes are retired — the theater is not a second
   architecture but the first one finished.
4. **Contracts move with the code.** A new `scroll-theater.invariants.md`
   is born with commit 1; records now living in the stage's test headers
   migrate as their code does; the checker's baseline never rises.
5. **The generator is the judge.** Every layer is a formatter over a range
   of the one number, composed alongside the scroll's sequence; anything
   with its own clock is gated by presence. A step that needs an exception
   to that is wrong, not the rule.

## The new folder

`examples/playground/src/examples/scroll-theater/`

| file | role | born in |
| --- | --- | --- |
| `Ranges.ts` | `Range {from,to}` in list space; `spanOf` (px through the owner's anchored positions, assumed before geometry); `progressOf`, `presenceOf` (against the APERTURE and its focus line), `stepOf(n)`; named anchors | 1 |
| `Aperture` (in `Ranges.ts`) | the region of the frame the text is seen through: top/bottom insets and a focus line; the frame by default; later a track | 1 |
| `Composer.ts` | the track table (build once per element, cached), `composeTracks` over samples, pieces of a run aligned to its start, the rate handoff, constant tracks written once, the batch memo, `onSequence`/`onSequenceRate`/`onSequenceOver`, `writeTracks` | 2 |
| `MediaRail.ts` | rows that carry media; presence, ride (translate only), the bar over the hold, parity slots, load once, the video rule — all over `Ranges` and the aperture | 3 |
| `Curtains.ts` | two foreground panels as tracks over ranges: presence (arise/dissemble), progress (expand/contract), off-frame parking; the aperture they define | 4 |
| `World.ts` | the interface a world bundle implements: `key`, `view`, `rows`, `palette`, `draw`, `tracks`, `crossings` | 5 |
| `ScrollTheater.ts` | the stage as mechanism: chapters as ranges, two scene slots by parity and their fade, the world table and the row→world rule, `drawScene` dispatch; holds a `Composer`, a `Ranges`, a `MediaRail`, a `Curtains` | 5 |
| `worlds/Mountains.ts`, `Beach.ts`, `Rainforest.ts` + views | the flight's three worlds as bundles, extracted from `ScrollFlight` and its component | 5 |
| `FlightTheater.ts` | the shipped page's class: the world table and the row generator, nothing else | 5 |
| `PinnedFigure.ts` | a figure held over a paragraph range with `stepOf` driving its state — the tutorial primitive | 7 |

`VirtualScroller`, `Lenis`, `BirdFlock`/`BirdFlockPainter` are unchanged
throughout.

## The commits

### 1. Ranges and the aperture — no visible change

- New: `Ranges.ts` with `Range`, `spanOf`, `progressOf`, `presenceOf`,
  `stepOf`, anchors; `Aperture` as a value (frame insets + focus line),
  default the whole frame. Pure over an owner interface: row count,
  `anchoredPosition(index)`, `frameSpan`, `aperture`.
- Moved: the stage's `chapterStart`/`chapterSpan`/`textEnd`/`localOf`/
  `textLocalOf`/`interludeSpan`/`interludePresence`/`interludeAt` become
  calls into `Ranges` (a chapter is a range; the text is a range ending at
  the interlude; an interlude is a one-row range). The public names on the
  stage stay, so the flight and its specs are untouched.
- Spec: `Ranges.test.ts` — a one-row range and a many-row range; progress
  0/1 and held past the edges; presence against the frame and against a
  narrowed aperture; step at n; anchors resolving; the assumed-height
  fallback. The stage's and flight's suites stay green as they are.
- Contract: `scroll-theater.invariants.md` created with the range records
  (progress, presence, step) as reality-based on the scroller's geometry.
- Judged by: specs; a screenshot pass identical to the last.

#### Commit 1 in detail — the API a fresh session can build from

```ts
// Ranges.ts — pure over an owner; no DOM, no Vue
export namespace Ranges {
  export interface Owner {
    rowCount: number;
    anchoredPosition(index: number): number | undefined;  // px, when geometry knows
    assumedRowPx: number;                                 // the fallback before it does
    frameSpan: number;                                    // the frame's height along the scroll
    aperture: Aperture;                                   // where the text is seen
  }
  export interface Range { from: number; to: number }     // rows, `to` exclusive; a row is {i, i+1}
  export interface Span { start: number; end: number }    // px
  export interface Aperture { top: number; bottom: number; focus: number } // fractions of the frame: 0/1/0.4 by default
  export interface Local { progress: number; travel: number }
}
class $Ranges {
  static readonly FADE_FRACTION: number = 0.6;            // the interlude's presence curve, moved here
  constructor(public owner: Ranges.Owner) {}
  row(index): Range; rows(from, to): Range; between(anchorA, anchorB): Range  // anchors: a Map<string, index> the owner fills
  spanOf(range): Span                    // memoised per batch (beginBatch clears)
  progressOf(range, value): number       // 0 at span.start, 1 at span.end, held outside
  presenceOf(range, value): number       // against the APERTURE: 0 until the span has entered most of it, 1 while it alone fills it, falling as the next row enters (the current interludePresence with frame → aperture height)
  focusOf(range, value): number          // -1..1: the span's centre against the focus line, over half the aperture
  stepOf(range, value, n): number        // floor(progress * n) clamped to n-1; held
  beginBatch(): void
}
```

What moves from `ScrollStage` and becomes a one-liner over `Ranges`:
`chapterStart` → `spanOf(chapterRange).start`; `chapterSpan` → its length;
`textEnd` → `spanOf(textRange).end` where `textRange` ends at the first
interlude row; `localOf(value)` → `{chapter, ...progress over chapterRange}`;
`textLocalOf` → progress over `textRange`; `interludeSpan(ordinal)` →
`spanOf(row(rowIndex))`; `interludePresence` → `presenceOf`; `interludeAt`
unchanged in logic. `ScrollStage` implements `Ranges.Owner` (rowCount from
items, anchoredPosition from the scroller, assumedRowPx, frameSpan,
aperture = whole frame with focus 0.4) and holds `protected readonly
ranges = new Ranges.Class(this)`. Its memo shrinks to `local`/`textLocal`
(or goes, if `Ranges` memoises spans).

`Ranges.test.ts` cases: a one-row range and a five-row range at assumed
heights (owner with no anchored positions) and at measured ones (owner
returning a table); progress 0/0.5/1 and held at −1/2; presence against the
whole frame reproducing the interlude numbers pinned in `ScrollStage.test.ts`
(enter at threshold, 1 in the hold, fall as the next row enters); presence
against a narrowed aperture (top 0.2, bottom 0.8) entering later and leaving
earlier; focus −1/0/1; step n=3 at 0/0.34/0.67/1 → 0/1/2/2; anchors
resolving to a range; `beginBatch` invalidating a span after the owner's
positions change.

Contract `scroll-theater.invariants.md` (new, colocated): three
reality-based records — "Progress is the fraction of a range's span the
scroll has crossed, held past its edges", "Presence is measured against
the aperture, not the frame", "A step is progress quantised and held" —
each with Impossible-if-true lines and the spec as verification.

### 2. The composer — no visible change

- Moved: the track table and cache, `composeTracks`, the pieces
  (`composePiece`, `onPieceFinish`, `onRunStarted`), the rate handoff,
  the constant-track rule, the batch memo, `onSequence`/`Over`/`Rate`,
  `writeTracks`, `Track`/`Piece`/`Flight` types. The stage keeps
  `buildTracks` as the hook a subclass extends; it holds a `Composer`.
- Spec: `Composer.test.ts` takes the stage's pieces, rate and constant
  cases verbatim (they are the composer's); the stage's suite keeps its
  scene cases.
- Judged by: specs; the built site on the phones once, because pieces and
  the rate are the compositor path and must read the same.

#### Commit 2 in detail

```ts
// Composer.ts — owns the track table and everything that plays it
export namespace Composer {
  export interface Owner {
    stage: HTMLElement | null;                 // the pinned element the tracks live in
    buildTracks(stage: HTMLElement): Track[];  // the subclass hook, unchanged
    beginBatch(): void;                        // clears the geometry memos
    chapterBoundaryMs(value, run): number;     // where a piece must be cut (from Ranges)
    prepareScenes(value: number): void;        // drawn for where a sequence BEGINS
    lenis: { compositorGlideActive: boolean; animatedScroll: number } | null;
  }
}
class $Composer {
  static readonly TRACK_CHUNK_MS = 2000; static readonly TRACK_SAMPLE_MS = 250; static readonly GLIDE_SUBSAMPLE = 4;
  constructor(public owner: Composer.Owner) {}
  get onCompositor(): Ref<boolean>              // the strip reads it
  trackList(): Track[]                          // cached per stage element
  writeTracks(value): void                      // callback path
  onSequence(sequence): void                    // glide: subsampled once; run: pieces
  onSequenceRate(change): void
  onSequenceOver(scroll): void
  cancelTracks(): void
  // protected: composeTracks, composePiece, onRunStarted (animation.ready), onPieceFinish, cancelFlight, writeTrack
}
```

Everything under "TRACKS", `onSequence*`, `composeTracks`, `composePiece`,
`onRunStarted`, `onPieceFinish`, `cancelTracks`, `cancelFlight`,
`writeTracks`, `writeTrack`, the `tracks`/`trackCache` fields and the
`Track`/`Piece`/`Flight` types move verbatim. `ScrollStage.onSequence`
becomes `this.composer.onSequence(sequence)`; `modeLabel`/`trackCountLabel`
read the composer. `Composer.test.ts` takes the stage's "composes every
changing track", "pieces aligned to the run's start", "rate reaches every
piece" cases verbatim with a fake owner whose `buildTracks` returns stub
elements with `animate`.

### 3. The media rail — no visible change

- Moved: interludes, media slots, presence, ride, bar, parity, load-once,
  `syncMedia`, `drawInterlude`; the rail's tracks are appended by the
  stage's `buildTracks`. Presence now against the aperture (still the
  whole frame here, so identical numbers).
- Spec: `MediaRail.test.ts` takes the interlude cases; the video case
  included.
- Judged by: specs; a screenshot at a held picture.

### 4. Curtains and the aperture as tracks — the first visible primitive

- New: `Curtains.ts`: two panels above the scroller, pointer events off,
  short of the scrollbar's column, each a track over a range (presence →
  opacity, progress → translate, parked off-frame outside their ranges);
  their opening IS the aperture, so the rail's presence and the focus line
  follow them. A curtain's face: the world's sky (the same custom
  properties as the slot) or a picture via the rail.
- Shown on the flight page only where a world declares an aperture; the
  first use is a reading band with the sky above and below, and the
  aperture narrowing while a picture holds.
- Spec: arise/dissemble by presence, expand/contract by progress, parked
  outside, the aperture reported to `Ranges`.
- Judged by: screenshots at five positions; the built site on the phones.

### 5. The theater and the worlds — no visible change

- New: `World.ts`, `ScrollTheater.ts`, `FlightTheater.ts`, the three world
  bundles and their views, `ExampleScrollTheater.vue`.
- Moved: everything scene-specific out of `ScrollFlight` — themes, palette,
  ridges, snow, island, palms, canopies, clouds, the paths, the copy —
  into the three worlds; the crossings become each world's `crossings`;
  the stage's slots/parity/fade become the theater's; `themeOf` becomes
  the row's world key.
- The page renders the theater component; the old component stays in the
  tree one commit longer for a side-by-side screenshot diff.
- Spec: the flight's suite becomes the worlds' (one per world: rows,
  palette, draw, tracks) plus the theater's (dispatch, slots, fade).
- Judged by: pixel-level screenshot diff old vs new at eight positions;
  the built site on the phones.

### 6. Retire the stage — no visible change

- Deleted: `ScrollStage.ts`, `ScrollFlight.ts`, their specs and the old
  component; every record their headers held has moved by now; the
  checker's baseline is unchanged; the page's code group lists the
  theater, a world and the composer.
- Judged by: the specs, the checker, one screenshot.

### 7. The pinned stepped figure — the tutorial primitive

- New: `PinnedFigure.ts` on the rail's shape: a figure held over a
  paragraph range, `stepOf(n)` choosing its state as held keyframes, the
  aperture narrowing beside it if the world asks. One real example: a
  three-state diagram over three paragraphs in a new world, `Tutorial`.
- Judged by: screenshots at each step; the built site on the phones.

After 7 the rest of `scroll-theater.md` follows in its own order: blocks
and layouts, camera and transitions, the manuscript compiler, navigation,
then the measured ones.

## What each commit must show

- the suites green, the type check clean, the docs gate at zero findings,
  the invariants checker at or below its baseline, the docs build complete;
- for a refactor, a screenshot pass identical to the previous commit's;
- for a primitive, the screenshot pass plus the built site on the phones,
  the frame meter read during a creep, and the word "native" or the reason
  it is not;
- LESSONS gains a line only when something was learned the hard way.
