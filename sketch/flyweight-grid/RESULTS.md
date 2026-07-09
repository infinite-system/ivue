# Flyweight Grid — Measured Results

**20 columns × 1,000,000 rows = 20,000,000 live cells**, ~55% real
Excel-syntax formulas (as column patterns), evaluated by `fast-formula-parser`
with Vue-discovered dependencies. Protocol identical to the reference grids
(`demo/grid`, `demo/formula`): headless Chromium, `--js-flags=--expose-gc` +
`--enable-precise-memory-info`, `performance.memory.usedJSHeapSize`, gc()×3
before every read, 3 runs, medians. Script: `measure.mjs`. Heap deltas were
**bit-identical across all three runs**.

## The numbers

| Metric                                     |                                                       Value |
| ------------------------------------------ | ----------------------------------------------------------: |
| Model creation (20,000,000 cells)          |                                                 **68.3 ms** |
| Model heap                                 |                                                **89.59 MB** |
| **Bytes per cell**                         |                                                  **4.70 B** |
| After visiting 30 viewports across 1M rows |                                100.15 MB (+10.6 MB overlay) |
| Observation census after those 30 views    | 16,798 fine refs · 735 block refs · 9,130 formula computeds |

Verified live in the DOM on every protocol run: bottom-row (row 1,000,000)
arithmetic correct, a single-cell edit cascades into rendered dependents,
full-column totals (`SUM(A1:A1000000)`) live and reacting.

## In context — the per-cell cost ladder (all measured, same machine family)

| Arm                                  | bytes/cell | what a cell IS at rest         |
| ------------------------------------ | ---------: | ------------------------------ |
| Composable (idiomatic Vue)           |       ~758 | closures + eager ref/computeds |
| ivue instance grid (`demo/formula`)  |        ~67 | object + lazy overlay          |
| Plain POJO floor (no reactivity)     |        ~40 | `{ row, col, raw }`            |
| **Flyweight columnar (this sketch)** |    **4.7** | 1 B kind + 8 B number ÷ shared |

The flyweight model sits **8.5× below the previous "theoretical floor"** —
because the floor was never plain objects; it was ground truth. A cell at
rest is one byte of kind tag plus (for data cells) eight bytes of Float64 —
and it is still fully reactive, formula-capable, and editable the moment
anything observes it.

## What the +10.6 MB after scrolling is

The observation overlay, priced per the design: ~9,130 formula computeds
(≈1.2 KB each with their derived-write watchers) + 16,798 fine refs + 735
block refs, accumulated across 30 far-apart viewports. This is the
documented manual-eviction boundary — `releaseAll()`/`releaseFormula()`
exist; a production impl ties release to viewport departure. Ground truth
never grows.

## Scroll-wall note (found live, fixed)

Chrome's compositor does scroll math in float32: a 28M-px scroller stops
scrolling at 2^24 = 16,777,216 px ≈ **row 599,186** (Firefox's ~17.9M-px
element cap is the adjacent wall). Fixed with the scaled scrollbar every
big-grid engine uses: physical height capped at 12M px, scroll ratio mapped
to virtual offset (~2.4 : 1 at 1M rows). All 1,000,000 rows reachable,
verified headless and by hand. Same f32 invariant the ivue virtual-scroller
neutralizes with scroll-origin rebasing.

## Honest scope

- Heap deltas measure the tab's JS heap for model + overlay + demo UI state;
  DOM nodes for the ~26 rendered rows are constant and excluded by the
  before/after subtraction.
- Formula SOURCES are per-column patterns (sparse overrides for edits) —
  the storage dedup any column-formula engine performs; evaluation is
  per-cell and real.
- Bare `SUM/AVERAGE/MIN/MAX/COUNT(range)` run on the linear columnar fast
  path (the stock parser's range aggregation is O(n²) — measured in
  DESIGN.md); compound giant-range formulas inherit the parser's cost.
- Google Sheets comparison is architectural, not benchmarked: a 20M-cell
  document exceeds its 10M-cell cap and cannot be created there.
