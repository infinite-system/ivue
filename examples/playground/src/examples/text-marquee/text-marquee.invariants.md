# Text marquee invariants

The living contract for the text marquee: `TextMarquee.ts`, which composes `TextChunker.ts` and the horizontal virtual scroller to glide a whole book as one scrolling line. Records are unnumbered; the name is the identifier and is referenced verbatim by code annotations (`// invariant: <name> (examples/playground/src/examples/text-marquee/text-marquee.invariants.md)`) and by the generator headers of the colocated `*.test.ts` files. The scroller it rides has its own contract: `../virtual-scroller/virtual-scroller.invariants.md`.

Two kinds of records, and the split is load-bearing: reality-based invariants are forced by how text and the canvas actually measure; chosen invariants are the marquee's own disciplines. Chosen invariants stand on reality invariants, never the reverse.

## Generator

The records below are gears. This section is the mechanism they form.

STUDY ALSO: [Testing ivue Classes](../../../../../docs_v2/guide/testing.md) —
where the chunker stands as the example of a pure Static class whose
whole spec is a function of its arguments.

### A book glides as one line by composition

**Invariant:** If a text is one-lined and cut into chunks only at spaces, the chunk widths are seeded into the scroller exactly before any chunk renders, and the speed is written into the scroller's creep integrator, then a text of any length scrolls as one continuous line at a live speed, and the scroller never learns it is text.

**Scope:** `TextMarquee.ts` and `TextChunker.ts`; the horizontal scroller is used, not extended.

**Components:** One per gear, each delete-testable:
- [Chunks concatenate back to the source text byte for byte](#chunks-concatenate-back-to-the-source-text-byte-for-byte) — why the joints between chunks are invisible.
- [Chunk widths are seeded exact before any chunk renders](#chunk-widths-are-seeded-exact-before-any-chunk-renders) — why the end of the book is reachable before it has rendered.
- [The marquee composes the scroller and never extends it](#the-marquee-composes-the-scroller-and-never-extends-it) — why the scroller stays pure.
- [Speed rides the creep integrator](#speed-rides-the-creep-integrator) — why a speed slider takes effect mid-glide.
- [The assumed chunk size never falls below the minimum](#the-assumed-chunk-size-never-falls-below-the-minimum) — why a tiny target cannot starve the extent.

**Mechanism:** The chunker speaks text; the scroller speaks items, sizes and pixels; `TextMarquee` is the only place the two meet, translating text into items, canvas widths into seeded sizes, and px per second into ms per px.

**Generates:** `TextChunker.test.ts`, `TextMarquee.test.ts`; the marquee example page and its sweep probe ("ExampleTextMarquee (drag-select + copy)" — two chunks copied as one line).

**Impossible if true:** A chunk boundary inside a word. A scroll extent that ends before the text does. A scroller method that knows about words.

**Evidence:** The component records below; the two colocated specs (11 tests).

**Verification:** `npx vitest run examples/playground/src/examples/text-marquee` green, then `node .claude/skills/invariants/scripts/check_invariants.mjs --all --refs` clean.

**Status:** provisional

**Last refined:** 2026-09-06

## Reality-based invariants

### Chunk widths are seeded exact before any chunk renders

**Invariant:** If chunk widths are estimated from an average character width, then the estimate runs about one percent small per chunk and compounds across a thousand chunks into a hidden tail; if every chunk is measured with one canvas `measureText` under the real font and seeded into the scroller's size map, then the extent, the seek mapping and the end of the text are true before a chunk has rendered.

**Scope:** `TextChunker.ts` `measureChunks`, `averageCharWidth`; `TextMarquee.ts` `measureFont`, `seedChunkSizes`, `fontShorthand`, and the items watch that reseeds on rechunk.

**Renegotiable at:** Canvas text metrics — `measureText` is the browser's own measurement of the rendered font; an environment without a canvas falls back to 7.5 px a character.

**Mechanism:** `seedChunkSizes` measures every chunk (microseconds each; a book in single-digit milliseconds) and calls `syncItemSize(index, width, false)` for each, then `updatePositionsImmediately()` once. Real one-shot captures still overwrite the seeds as chunks render. The average is measured once per font and cached.

**Evidence:** `TextMarquee.ts` `seedChunkSizes` doc comment. Tests: "on mount the real font is measured and every chunk width is seeded into the scroller, then positions are repaired once", "with a canvas every chunk is measured exactly, and the average character width is measured once per font", "without a canvas the widths fall back to 7.5 px a character".

**Impossible if true:** A scrollbar that cannot reach the end of the book. Two `measureText` calls for the same font's average.

**Verification:** `npx vitest run examples/playground/src/examples/text-marquee -t "seeded into the scroller|measured once per font|fall back"`

**Status:** provisional

**Last refined:** 2026-09-06

## Chosen invariants

### Chunks concatenate back to the source text byte for byte

**Invariant:** If a one-lined text is cut into chunks of roughly the target length, then every cut lands after a space, the space stays with the left chunk, a word longer than the target extends its chunk to the next space, and the chunks joined with nothing equal the source.

**Scope:** `TextChunker.ts` `oneLine`, `chunk`.

**Mechanism:** Rendered side by side with `white-space: pre`, the joints are invisible only if no character is lost or added at a boundary; keeping the trailing space with the left chunk makes the join byte-identical, and cutting only at spaces keeps every word whole so a selection across chunks copies as prose.

**Generates:** The marquee's `selection-join=" "`; the copy probe that reads two chunks as one line.

**Evidence:** `TextChunker.ts` `chunk`. Tests: "chunks join back to the source byte for byte, cut only at spaces, each keeping its trailing space", "a word longer than the target stays whole — the chunk extends to the next space".

**Impossible if true:** A chunk boundary inside a word. A chunk sequence that does not join back to its source.

**Verification:** `npx vitest run examples/playground/src/examples/text-marquee/TextChunker.test.ts -t "byte for byte|stays whole"`

**Status:** provisional

**Last refined:** 2026-09-06

### The marquee composes the scroller and never extends it

**Invariant:** If the marquee needs the scroller, then it holds the scroller's exposed instance in a template ref and calls its public surface (`syncItemSize`, `updatePositionsImmediately`, `startAutoPlay`, `stopAutoPlay`, `visibleItems`, `selection`), and it never subclasses `VirtualScroller` or `HorizontalVirtualScroller`.

**Scope:** `TextMarquee.ts` (`scroller`, `play`, `pause`, `togglePlay`, `seedChunkSizes`); `TextMarquee.vue`.

**Mechanism:** The scroller stays pure (items, sizes, pixels); the marquee is composition. Extension would put words into the scroller's vocabulary and fork the tuned class for one consumer.

**Rejected alternatives:** A `TextScroller` subclass — the horizontal scroller would then carry chunking, fonts and a canvas.

**Evidence:** `TextMarquee.ts` header comment, `import { HorizontalVirtualScroller }` used as a type and a component only. Test: "play, pause and toggle delegate to the scroller’s autoplay through the exposed instance".

**Impossible if true:** `extends VirtualScroller.$Class` or `extends HorizontalVirtualScroller.$Class` in `TextMarquee.ts`.

**Verification:** `grep -n "extends" examples/playground/src/examples/text-marquee/TextMarquee.ts` prints nothing.

**Status:** provisional

**Last refined:** 2026-09-06

### Speed rides the creep integrator

**Invariant:** If the speed prop is px per second, then the marquee passes `1000 / max(1, pxPerSecond)` as the scroller's `creepMsPerPx`, so the glide is the scroller's own per-frame integrator and a slider change takes effect mid-glide with no restart.

**Scope:** `TextMarquee.ts` `creepMsPerPx`, `pxPerSecond`; the scroller's `creepMsPerPx` prop and `creepStep`.

**Mechanism:** The creep integrates speed × Δt per frame and reads the prop live every step, so the marquee never owns a timer or a frame loop of its own.

**Evidence:** `TextMarquee.ts` `creepMsPerPx`. Test: "px per second becomes the creep’s ms per px, floored at one px per second".

**Impossible if true:** A frame loop in `TextMarquee.ts`. A speed of zero producing a division by zero.

**Verification:** `npx vitest run examples/playground/src/examples/text-marquee/TextMarquee.test.ts -t "ms per px"`

**Status:** provisional

**Last refined:** 2026-09-06

### The assumed chunk size never falls below the minimum

**Invariant:** If the scroller asks what to assume for an unmeasured chunk, then the answer is the target character count times the measured average character width, and never less than `minimumChunkWidth`.

**Scope:** `TextMarquee.ts` `assumedChunkSize`, `averageCharWidth`, `minimumChunkWidth`, `preMeasureCharWidth`.

**Mechanism:** Before the font is measured, the pre-measure average serves the first frame; a tiny target or a narrow font cannot push the assumption toward zero, which would collapse the extent and the seek mapping until seeds arrive.

**Evidence:** `TextMarquee.ts` `assumedChunkSize`. Test: "the assumed chunk size is the target times the average character width, never below the minimum".

**Impossible if true:** A chunk width the scroller assumes that is smaller than the minimum.

**Verification:** `npx vitest run examples/playground/src/examples/text-marquee/TextMarquee.test.ts -t "never below the minimum"`

**Status:** provisional

**Last refined:** 2026-09-06
