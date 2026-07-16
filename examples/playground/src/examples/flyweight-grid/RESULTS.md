# Flyweight Grid — Measured Results

**20 columns × 1,000,000 rows = 20,000,000 live cells**, ~55% real
Excel-syntax formulas (as column patterns), evaluated by `fast-formula-parser`
with Vue-discovered dependencies. Protocol identical to the reference grids
(`demo/grid`, `demo/formula`): headless Chromium, `--js-flags=--expose-gc` +
`--enable-precise-memory-info`, `performance.memory.usedJSHeapSize`, gc()×3
before every read, 3 runs, medians. Script: `measure.mjs`. Heap deltas were
**bit-identical across all three runs**.

## The numbers

| Metric                            | dev (pre-eviction) | **production (with eviction)** |
| --------------------------------- | -----------------: | -----------------------------: |
| Model creation (20,000,000 cells) |            68.3 ms |                    **67.1 ms** |
| Model heap                        |           89.59 MB |                   **89.48 MB** |
| **Bytes per cell**                |             4.70 B |                     **4.69 B** |
| After 30 viewports across 1M rows |          100.15 MB |                   **89.78 MB** |
| Census after those 30 views       | 16,798 fine · 9,130 computeds | **556 fine · 302 computeds** |

**Memory is O(viewport), not O(rows-ever-visited)**: with debounced
viewport-tied eviction (release rows outside window ± 512 — a margin ≫ the
50-row running-sum reach, the layout's longest dependency), thirty
far-apart viewports leave **+0.3 MB** of overlay — one window's worth.
Released cells re-materialize correctly on re-observation, including writes
made while they were unobserved (proven in the suite, 12/12). Dev vs prod
being near-identical on creation/heap is itself informative: typed arrays
do not care about Vue's development diagnostics, and ivue runs the same
construction and method-binding path in both environments.

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

## Lifecycle: why eviction and not GC

The overlay cannot garbage-collect on its own: the sheet's Maps hold strong
references, and every formula computed carries its derived-write watcher —
a permanent subscriber. Vue 3.5's lazy computeds are what make explicit
eviction SAFE: when a row scrolls out, the component's render effect drops
its subscription automatically, so stopping the bridge watcher and deleting
the Map entry leaves the whole subgraph unreachable → collected.
`evictOutsideRows` does exactly that on window movement (debounced), with a
locality margin ≥ the longest dependency reach in the layout; refcounting
is the production-grade generalization (documented boundary). Ground truth
never grows either way — the pre-eviction dev column's +10.6 MB was purely
this overlay accumulating (~350 KB per distinct viewport visited).

## Field note: the steady-state ceiling

Observed on a desktop Chrome (whole-renderer task-manager numbers, which
include V8 reserve + DOM + compositor on top of the JS heap): idle
~190–200 MB, and under sustained aggressive scrolling across the million
rows the process **never exceeded ~327 MB** before collapsing back on rest.
That ceiling is a steady-state equilibrium, not a tuned cache: resident
overlay is bounded by (scroll velocity × debounce window × per-viewport
cost) + GC slack — every term a constant — so the ceiling is
**document-size-independent**. A 40M-cell sheet pays a higher floor
(more ground truth) but the same breathing amplitude.

## Scroll-wall note (found live, fixed)

Chrome's compositor does scroll math in float32: a 28M-px scroller stops
scrolling at 2^24 = 16,777,216 px ≈ **row 599,186** (Firefox's ~17.9M-px
element cap is the adjacent wall). Fixed with the scaled scrollbar every
big-grid engine uses: physical height capped at 12M px, scroll ratio mapped
to virtual offset (~2.4 : 1 at 1M rows). All 1,000,000 rows reachable,
verified headless and by hand. Same f32 invariant the ivue virtual-scroller
neutralizes with scroll-origin rebasing.

## Development parity

The development server uses ivue's production class path: native construction,
plain instances, and direct lazy-bound methods. Editing the sheet model makes
Vite and Vue reconstruct the example owner, applying one complete class
generation instead of retaining a hybrid 20M-cell instance.

## Where this architecture shines next

The workload shape this sketch proves — **huge, fast-growing data; a tiny
observed window; live derivations over both** — is not a spreadsheet
specialty. Candidates for the next demo, in rough order of impact:

1. **AI trace / token-stream viewer** (the marquee). Agent runs and LLM
   streams produce exactly this shape: hundreds of thousands of tokens,
   tool calls, and log events appended at high frequency, of which the user
   watches one scrolling window. Appends land in columnar storage as
   peek-only writes — **a token arriving costs ~nothing until someone looks
   at it** — while live derivations (running token counts, cost meters,
   per-tool aggregates, error scans) ride the block tier. Today's chat UIs
   choke on their own transcript length for exactly the cost-∝-exists
   reason this design deletes. A million-token conversation at a flat
   viewport cost would be a category demo.
2. **Log / observability tail** — same stream shape plus search: the
   columnar fast path is a natural home for grep-like scans and windowed
   aggregations over millions of rows (Σ errors/min as a live formula).
3. **Dataframe viewer** (notebooks, DuckDB/Arrow results) — Arrow columns
   ARE typed arrays; the ground-truth layer could adopt them zero-copy,
   making ivue the reactive display layer over real analytics data.
4. **Time-series / trading dashboards** — high-frequency appends,
   window-priced charts, derived indicators as live formulas over blocks.
5. **Collaborative grids** — remote edits are peek-only writes too:
   a thousand collaborators mutating cells you aren't looking at cost you
   nothing until you scroll there.

Common thread: anywhere data grows faster than attention, observation-priced
reactivity turns "it slows down as it fills up" into a flat line.

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
