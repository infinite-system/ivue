# ParagraphMeasurer — exact vertical sizes from the layout oracle

**Status:** designed AND benchmarked (2026-08-28, Parallels VM, headless
Chromium — real desktops faster). Target: the post player (100k-paragraph
posts); optionally a docs book-reader example first.
**Ruling:** tier 3 only. The prediction tiers (canvas line-count
estimate; unique-word-cache wrap simulation) stay UNBUILT — at these
costs they are dead labor. Invariant: *the engine that renders is the
only oracle of its own layout — never simulate the oracle when asking it
is cheap enough.* (The marquee's `measureText` obeys the same rule: for
a single unwrapped line, canvas IS the engine's answer — proven 0.1px.)

## The device

Pure `Static()` class: `(html[], context) → heights[]`. Internals:

- Hidden rig INSIDE the post's content element (inherits real font/CSS
  vars/width): `position: fixed; visibility: hidden` (never
  display:none — that skips layout), `contain: layout style`,
  explicit width. Containment is load-bearing: it isolates the rig's
  layout from the page's.
- **Write once, read many:** batch as one HTML string → `innerHTML` →
  read every `getBoundingClientRect().height`. First read forces THE
  layout; the rest are ~1µs clean reads.
- Images swapped for aspect-ratio-sized placeholder divs before
  injection (our content declares dimensions) — no network, no decode.
- `await document.fonts.ready` before measuring, or you measure the
  fallback font. (The marquee should gain this too.)
- Heights cached by `(post, width bucket, font)` — paragraphs don't
  change; reopen cost ~0ms. Width change invalidates; re-measure.

## Measured (scratchpad tier3-bench.html, realistic corpus: 25–115-word
paragraphs at 700px serif, ~8% with declared-dimension image blocks)

| corpus | strategy | result |
| --- | --- | --- |
| 1,500 ¶ (normal book) | one synchronous batch | **27ms** total (~18µs/¶) — measure at open, before first paint |
| 100k ¶ (Mahabharata) | 20 × 5k batches | 1.94s total, worst batch 123ms |
| 100k ¶ | one giant batch | 1.89s — batching costs ~nothing |
| correctness | batched vs one-at-a-time forced layout | **max delta 0px** |

Cost is LINEAR (~18–19µs/¶ flat from 1.5k to 100k). Content height at
100k ≈ 15.1M px — inside the render-bias rebasing regime.

## Contention (10 books at once, rAF animation as victim)

| batch size (~slice) | frame p95 | frame max | dropped | wall (100k ¶ total) |
| --- | --- | --- | --- | --- |
| 5,000 ¶ (~100ms) | 100ms | 116ms | 20 + 1 stall | 1.85s |
| **1,000 ¶ (~20ms)** | **16.8ms** | **16.8ms** | **0** | **1.74s** |
| 500 / 250 ¶ | 16.8ms | 16.8ms | 0 | ~1.75s |

The finding that sets the design: `requestIdleCallback` only picks when
a slice STARTS — a 100ms slice still blocks whatever arrives mid-slice.
Unblocked means the SLICE fits the frame budget. And small batches cost
nothing (1.74s < 1.85s — better interleaving). So: one shared queue
across all books (no parallelism machinery — same thread anyway),
batches auto-tuned to ≤ ~10–15ms (time the first batch, halve until it
fits — self-calibrating for slow phones), first viewport of the open
book measured synchronously, the rest through the idle pump.

Tier-3 cannot run in a worker (no DOM there); `OffscreenCanvas`
measureText CAN — that shelf only reopens if a case ever demands full
extents synchronously without DOM access (SSR-ish). Not our case.

## Payoff in the player

With exact seeds the converge loop's reason to exist (landings drifting
as estimates refine) mostly evaporates; `seekToProgress` drags become
pixel-true on a 100k-paragraph post — same as proven on the book marquee
(end lands exactly at the opaque boundary).

Bench harness: session scratchpad `tier3-bench.html` (rebuild from this
file's recipe if gone — it is ~150 lines).
