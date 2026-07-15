---
title: The Flyweight Pattern
description: 20,000,000 live formula-capable cells in 89 MB — 4.7 bytes each — created in 67 ms, with memory that never grows past the viewport. Observation-priced existence, ivue's invariant taken all the way down.
---

# The Flyweight Pattern — observation-priced existence

Everything in ivue descends from one invariant:

> **Everything costs proportional to what's observed; nothing costs
> proportional to what exists.**

Lazy ref-getters apply it to _reactive cells_: an instance's refs don't exist
until read. The flyweight pattern applies it one level deeper: **the model
objects themselves don't exist until observed.** Ground truth lives in
columnar typed storage; entity objects are disposable facades created per
render; reactivity is a sparse overlay that materializes per observation —
and is _evicted_ when observation moves away.

The proof is a working spreadsheet —
[`examples/playground/src/examples/flyweight-grid`](https://github.com/infinite-system/ivue/tree/main/examples/playground/src/examples/flyweight-grid)
— **20 columns × 1,000,000 rows = 20,000,000 live cells**, ~55% real
Excel-syntax formulas evaluated by `fast-formula-parser` with Vue-discovered
dependencies. A document _twice Google Sheets' 10M-cell hard cap_.

## The measured numbers

Headless-Chromium heap protocol, gc-forced, 3 runs, medians — deltas
bit-identical across runs (full receipts in the sketch's `RESULTS.md`):

| Metric                            | production build |
| --------------------------------- | ---------------: |
| Model creation (20,000,000 cells) |      **67.1 ms** |
| Model heap                        |     **89.48 MB** |
| **Bytes per cell**                |       **4.69 B** |
| After 30 viewports across 1M rows |      **+0.3 MB** |

The per-cell cost ladder, all arms measured with the same protocol:

<p class="benchmark-legend">Best measured result among fully reactive implementations. The POJO control marks the non-reactive floor. <BenchmarkWinner placement="after" /></p>

| Arm                              | bytes/cell | what a cell IS at rest         |
| -------------------------------- | ---------: | ------------------------------ |
| Composable (idiomatic Vue)       |       ~758 | closures + eager ref/computeds |
| ivue instance grid               |        ~67 | object + lazy overlay          |
| Plain POJO floor (no reactivity) |        ~40 | `{ row, col, raw }`            |
| **Flyweight columnar**           | <strong><BenchmarkWinner />4.7</strong> | 1 B kind + 8 B number ÷ shared |

**8.5× below the "theoretical floor"** — because the floor was never plain
objects; it was ground truth. And still fully reactive, formula-capable, and
editable the moment anything observes it.

## The three moves

**1. Columnar ground truth.** Per column: a `Uint8Array` of cell kinds, a
lazily-allocated `Float64Array` for numerics, a sparse `Map` for text and
edited formula sources (default sources are per-column _pattern functions_ —
11M formulas stored as 11 closures). Writes to unobserved cells update the
arrays and notify no one — **a value arriving costs nothing until someone
looks at it.**

**2. Flyweight facades.** The entity class holds three fields —
`(sheet, row, col)` — plus plain getters delegating to the sheet. ivue makes
the reactive portion zero-allocation at rest: no getter runs at construction, plain getters
de-optimize to native prototype getters, and reads are tracked through
whatever effect performs them. Create per render, drop on scroll, zero loss —
the reactive state lives on the sheet's overlay, not on the facade.

**3. A two-tier sparse overlay** (the
[keyed-reactivity shape](/guide/state#keyed-reactivity-the-third-shape)).
Fine per-cell version refs for point
observers (rendered cells, single-cell formula references — conditional
dependencies still shift with the executed branch); coarse per-4,096-row
_block_ refs for large ranges — `=SUM(A1:A1000000)` costs **245 edges, not a
million**. A derived-write bridge (each cached formula computed bumps its own
block on value change) lets coarse subscribers see through formulas to
out-of-range inputs. Viewport-tied _eviction_ releases overlay entries as the
window moves: memory is **O(viewport), not O(rows-ever-visited)** — under
sustained scrolling the process breathes around a flat floor instead of
climbing.

## What fell out (measured, not projected)

- **Bulk aggregation belongs to the columnar layer.** The stock parser's
  range aggregation measured O(n²) — 27 ms at 10k cells, 40 s at 200k. A
  linear columnar fast path for bare `SUM/AVERAGE/MIN/MAX/COUNT(range)` (same
  observation semantics) closed a five-orders-of-magnitude gap — the same
  reason desktop engines special-case range ops.
- **Hot-swapping the engine under the data.** The sheet is an ivue class, so
  [class HMR](/guide/hmr) grafts formula-engine edits onto the _live_
  20M-cell model — demonstrated: page never reloaded, ground truth and
  census byte-identical, next recompute ran the new math. Compiled/WASM
  engines structurally cannot offer this: their code and their memory die
  together on rebuild.
- **The scroll walls are physical.** Chrome's compositor does scroll math in
  float32 (dead past 2^24 px ≈ row 599,186 of a 28px-row grid); Firefox caps
  element height at ~17.9M px. The scaled scrollbar (capped physical height,
  ratio-mapped virtual offset) clears both.

## Where the pattern fits

Anywhere **data grows faster than attention**: AI token-stream/trace viewers
(a token arriving costs nothing until observed), log tails with live
windowed aggregates, dataframe viewers (Arrow columns _are_ typed arrays —
zero-copy adoption), time-series dashboards, collaborative grids (remote
edits to unobserved cells are peek-only writes). Observation-priced
reactivity turns "it slows down as it fills up" into a flat line.

## Honest boundaries

Eviction uses a dependency-locality margin (production wants refcounts);
compound formulas over giant ranges inherit the general parser's cost; the
Sheets comparison is architectural (a 20M-cell document exceeds its cap),
not benchmarked. Run it yourself:

```bash
npm run dev:flyweight       # the demo, with a live observation census
npm run measure:flyweight   # the heap protocol (pass the URL)
```
