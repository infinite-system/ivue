# Scroll Theater — the primitives of an illustrated, scroll-driven book

The substrate is proven: a virtual list whose scroll is one number, presented
by the compositor from a sequence authored for its frames, with every layer
of a scene a formatter over that number composed alongside it. This document
names the primitives a high-end illustrated book, tutorial or history needs
on top of it, sorts them by what they are, and orders the work. The generator
every item obeys (`examples/playground/src/lenis/presented-motion.generator.md`):

> What moves with the scroll is a track over the one number, played by the
> presenter. What moves with time owns a clock and is gated by presence.
> Nothing reads the DOM per frame. Nothing scales a large raster. Nothing puts
> an opacity on a 3D group.

## 1. The one number and what it derives — RANGES

Today the derivations are chapters (rows partitioned by count) and interlude
spans (one row). Both are instances of one primitive that does not exist yet:

- **Range** — `{ from: rowIndex, to: rowIndex }` in list space, resolved to
  px through the scroller's anchored positions, with a fallback before
  geometry knows. A chapter is a range. An interlude is a one-row range. A
  pinned figure is a range of paragraphs. A choreography is any range.
- **Progress(range, value)** — 0 at `from`, 1 at `to`, held outside.
  `localOf`/`textLocalOf` become progress over the chapter's range / its text
  range.
- **Presence(range, value)** — how much of the frame the range's span owns:
  0 outside, rising as it enters most of the frame, 1 while it alone is in
  the frame, falling from the moment the next row enters. `interludePresence`
  becomes this, for any range.
- **Step(range, value, n)** — progress quantised to n states, held. The
  tutorial primitive: a diagram's state index as paragraphs pass.
- **Named anchors** — a row may carry an `anchor` key; ranges may be declared
  between anchors, so a manuscript says "from 'the-battle' to 'the-retreat'".

Everything in §2–§5 is a formatter over Progress, Presence or Step of a
Range. This is the reduction that turns the flight's hard-coded chapter maths
into a vocabulary.

## 2. Layers on the compositor (scroll-linked)

- **Rise / drift** — translate by a factor of progress, in the stage's units
  (cqw/cqh) so no span in px can show an edge. Exists.
- **Crossing** — a path through the stage, 2D or 3D, from off-frame to
  off-frame or to a dot; never fades (an opacity flattens a 3D group). Exists
  for the jet and the seaplane; generalise to a `Path` table any world can
  declare.
- **Fade** — an opacity track on a flat layer (a slot, a canvas, a card).
  Exists.
- **Reveal by curtain** — a masking layer that translates, instead of a
  clip-path (clip-path is not reliably composited). New.
- **Camera** — ONE transform on a group wrapping every layer of a slot:
  dolly, pan, tilt per chapter, at the cost of one track. With
  `transform-style: preserve-3d` on the group and no opacity, the planes
  keep their 3D. New, and the cheapest way to get "the world moves".
- **Pinned figure** — a figure held in the frame over a paragraph RANGE
  (not only its own empty row), beside or behind the text, its Step driving
  which state the figure shows. The scrollytelling primitive. New: the
  media rail generalised from one-row spans to ranges.
- **Row reveal** — each visible row's opacity/translate as a track of its
  own presence. Possible; costs a track per mounted row and a track-table
  rebuild on every window change (the cache is keyed by the stage element
  today; it would key by the window). Defer; measure first.

## 3. Layers on their own clock (time-linked, gated by presence)

- **Canvas / WebGL** — the flock. Pattern: a class with `start/stop/draw`,
  its element moved by a track, its loop running while its layer is present.
- **CSS animation** — the rain, the waves, the propeller. Compositor-run;
  paused by `animation-play-state` when its slot is not present (not done
  yet — the rain runs in hidden slots' `display:none`, fine; a present but
  faded layer still animates).
- **Video** — plays only while present. Exists.
- **Audio** — ambient per world, gated by presence, opt-in (a gesture is
  required); volume as a formatter over presence would be time-linked ramp,
  not scroll-linked. New.
- **Lottie / animated SVG** — same pattern as canvas. New, if wanted.

## 4. Content and space

- **Blocks** — a row is a block: `paragraph | heading | quote | figure |
  caption | code | interlude | spacer | card`. Today rows know `heading`,
  `body`, `interlude`. New: the block union, and the SFC renders by kind.
- **Spacer** — an empty range with a purpose: breathing room, a hold while
  a time-linked layer plays, a full-bleed. The interlude row is a spacer
  that carries media.
- **Title card** — a chapter's title pinned in its spacer as a layer
  (typography as scenery), fading with presence. New.
- **Layout per chapter** — the column's width and side (centre, left, right,
  two columns) so a figure can own the other side. New: a per-chapter class
  on the rows.
- **Pull quote / drop cap / marginalia** — blocks with their own rendering,
  optionally layers (a marginal note pinned while its paragraph is present).

## 5. Worlds and the theater

- **World** — `{ key, view, rows(), palette(), draw(root, chapter),
  tracks(slot, root), crossings(root) }`: a bundle the theater consumes.
  Rows carry the world key; the theater dispatches per chapter.
- **Theater** — the stage plus the world table and the row→world rule.
- **Transitions between worlds** — the slot crossfade exists; a curtain wipe
  and a camera move are the other two, all transforms/opacity on flat layers.
- **Time of day / lighting** — palettes exist; a lighting change inside a
  chapter is a second slot pair or a tinted overlay layer's opacity track.

## 6. Media rail (its own module)

`ScrollInterludes`: rows that carry media, presence, the ride (translate
only), parity slots, load-once, the video rule. Generalised by §1 to ranges
so a figure can be held over paragraphs and stepped. Captions as a layer.
A second rail on the same shape: subtitles / marginalia.

## 7. Navigation and reading

- Table of contents → seek (the scroller's `jumpTo` / landing exists).
- Chapter marks on the scrollbar track; deep links (`#chapter-3`); reading
  position remembered (per book, localStorage); keyboard (space, arrows,
  page). Autoplay with speed exists; a "read to me" pace per block is a
  speed table.
- Reduced motion: crossings parked, time-linked layers stopped, fades kept.
  Print / text-only: the rows are the book; the stage is optional.

## 8. Authoring — the manuscript

The real product: an author writes Markdown per chapter with front-matter
(`world`, `time`, `crossing`, `layout`, `interludes`, `anchors`) and a
compiler emits rows + world assignments + ranges. "Make this an easy
possibility" is this compiler. Everything above is what the compiler targets.

## 9. Invariants carried (already recorded, in one list)

One clock for scroll-linked motion · the text layer plays one run, no
boundary under it · scenery tracks interpolate, the text holds · a 3D group
never takes opacity · no scale on a large raster · no backdrop blur under
moving rows · constant tracks are written once · geometry memoised per batch
· a video/canvas/audio runs only while present · no getter reads the DOM ·
static data is a field, composed data a `$` getter, the contract a getter.

## 10. Order of work

1. **Ranges** (§1): range, progress, presence, step, anchors — the base's
   maths rewritten over them; chapters and interludes become ranges. Specs.
2. **Split**: base = mechanism; media rail = module (§6); theater = world
   table (§5); flight = three worlds on it. Page merge to one "Scroll Stage".
3. **Pinned figure + Step** (§2/§6): the tutorial primitive, with one real
   example (a diagram that changes as three paragraphs pass).
4. **Blocks, spacers, title cards, layouts** (§4).
5. **Camera + curtain** (§2), world transitions (§5).
6. **Manuscript compiler** (§8) + a real chapter authored in Markdown.
7. **Navigation** (§7): TOC, hash, position memory, keyboard, reduced motion.
8. **Audio, CSS-animation gating, row reveal** (§3/§2) — measured first.
9. Two example books: a history chapter (maps as pinned figures, a camera
   move, a crossing), a tutorial (stepped diagrams, code blocks, captions).

Each step lands with its spec, the gates, a screenshot pass, and the phone's
frame meter as the judge after a push. Nothing in the list needs a new
timing primitive: every item is a formatter over a range or a clock gated by
presence, which is why the list is finite.
