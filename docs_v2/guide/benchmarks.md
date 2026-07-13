---
title: Benchmarks
description: 'A live, in-browser 100k/1M-cell virtualized grid — the same model built three ways (composable, ivue, plain POJO) — plus a working 100k-cell spreadsheet with real Excel formulas whose dependency graph Vue discovers by itself.'
---

# Benchmarks

[The Model Layer, Measured](/guide/model-layer) argues that a domain model —
thousands of live, individually-reactive entities — has a structural memory
cost in idiomatic Vue, and that ivue's laziness erases it. This page is the
receipt: a real, reproducible, end-to-end measurement, not a microbenchmark.
[Performance by Design](/guide/performance) covers the micro-level numbers (creation of
isolated instances, per-read cost); this page covers what happens when you
build an actual grid out of them.

The same 40-column virtualized spreadsheet grid is built three ways from
identical seeded data:

- **Composable** — the idiomatic Vue 3 "composable per entity": every cell
  eagerly allocates a `ref()` plus four `computed()`s.
- **ivue** — a `Reactive()` class `$Cell`: `raw` is a ref-getter, three
  derived values are **plain getters** (0 bytes/instance), and only the one
  hot value is a `computed()`. Refs/computeds materialize lazily.
- **POJO floor** — plain `{ row, col, raw }` objects, no reactivity at all.
  The theoretical memory minimum; edits don't re-render, by design.

## Try it

Click a button — it builds all three models at once, from the same data, so
every number below is directly comparable. Nothing runs until you click:
this is a live embed of the shipped engine, not a video.

<GridBenchmark />

## The measured numbers

The live demo above is illustrative — same machine, same session, but not
gc-forced or run in isolation. The numbers below are the controlled
measurement: 3 runs per arm, median reported, headless Chromium, heap read
via `window.gc()` ×3 + `performance.memory.usedJSHeapSize`, one fresh page
load per arm. Full protocol, caveats and raw numbers in
[`demo/grid/RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/demo/grid/RESULTS.md).

### 100,000 cells (40 cols × 2,500 rows)

| Arm        | Model heap (virtualized) | Bytes/cell | Model heap (all materialized) | Bytes/cell (mat.) |    Creation |
| ---------- | -----------------------: | ---------: | ----------------------------: | ----------------: | ----------: |
| Composable |                  77.3 MB |        773 |                      109.8 MB |             1,098 |     75.1 ms |
| **ivue**   |               **5.7 MB** |     **57** |                   **40.3 MB** |           **403** | **11.4 ms** |
| POJO floor |                   4.5 MB |         45 |                             — |                 — |     10.3 ms |

### 1,000,000 cells (40 cols × 25,000 rows)

| Arm        | Model heap (virtualized) | Bytes/cell | Model heap (all materialized) | Bytes/cell (mat.) |    Creation |
| ---------- | -----------------------: | ---------: | ----------------------------: | ----------------: | ----------: |
| Composable |                 757.7 MB |        758 |                    1,083.7 MB |             1,084 |    406.8 ms |
| **ivue**   |              **41.7 MB** |     **42** |                  **388.3 MB** |           **388** | **57.2 ms** |
| POJO floor |                  40.5 MB |         41 |                             — |                 — |     53.3 ms |

### The sharpest number: marginal cost per added cell

Scaling 100k → 1M (×10 cells) isolates the fixed viewport/DOM overhead from
the per-cell cost. The result:

| Metric                           |     Composable |            ivue |            POJO |
| -------------------------------- | -------------: | --------------: | --------------: |
| **Marginal heap per added cell** | **756 B/cell** | **40.0 B/cell** | **40.0 B/cell** |

**ivue's marginal cost matches the non-reactive POJO floor to the byte.** An
unrendered ivue cell costs exactly what a plain object would have cost —
except it is fully reactive: watchable, derivable, editable. At the
realistic (virtualized) footprint, ivue holds **13.6× less memory** than the
composable at 100k and **18.2× less** at 1M, while creating the model
**6.6×** and **7.1× faster**, respectively.

Both reactive arms pass live reactivity verification in every run: editing a
cell after scrolling away and back re-renders the new value and its row's Σ
recomputes. The POJO arm's edit mutates the data but does not re-render —
reported, not asserted, since it has no reactivity by design.

## The formula grid: real formulas, discovered dependencies

The grids above prove the memory claim with a toy derivation. The formula
grid replaces the toy cell with a real one: a working spreadsheet whose cells
hold **actual Excel-formula syntax** — `=A1+B2`, `=SUM(A1:D1)`,
`=IF(A1>0,B1,C1)` — parsed and evaluated by the real
[`fast-formula-parser`](https://www.npmjs.com/package/fast-formula-parser)
package (280 Excel-compatible functions, not a stub).

The load-bearing fact: **there is no hand-built dependency graph anywhere.**
Each cell's `value` is the one `computed()`; the shared parser's
`onCell`/`onRange` hooks read referenced cells' `value.value` *while that
computed is evaluating*, so Vue records those reads as its dependencies. Edit
a cell and every dependent formula invalidates and recomputes, cascading
through the graph, with no manual invalidation call. This is the
[formula hole](/guide/model-layer) closed: the model stays at full size, at
the memory floor, and whole-range formulas just read through it.

And it is not 100k trivial formulas: **52.5% of the 100,000 cells are
cross-referencing formulas** — arithmetic, `SUM`/`AVERAGE` ranges,
conditionals, a 50-row running-sum cascade, a cross-column mesh.

### Try it

The exact `Sheet`/`FormulaCell` model the measurements were run on, live.
The parser loads on demand when you click — nothing runs until then. Edit
`A1` and watch its dependents cascade; select `I1` (the `IF`) and flip
`A1`'s sign to watch the tracked dependency set shift branches in the
formula bar.

<FormulaGrid />

### The numbers (3 runs, median, same protocol)

| Metric                        | Formula grid | Toy ivue grid |
| ----------------------------- | -----------: | ------------: |
| Model heap (virtualized)      |  **8.36 MB** |       5.70 MB |
| Bytes/cell (virtualized)      |           84 |            57 |
| Model heap (all materialized) |     48.11 MB |      40.30 MB |
| Creation time                 |      17.1 ms |       11.4 ms |
| Verification                  | **ALL PASS** |          pass |

**At 1M cells (virtualized):** 68.41 MB — **68 B/cell**, created in 104 ms,
with a marginal cost of ~67 B per added cell.

The +27 B/cell over the toy grid is accounted for, not hand-waved: the
formula **strings themselves** (52,500 formulas averaging ~13 chars are
simply longer than `-142.39` — real formulas are real bytes) and one `sheet`
back-pointer per cell. The materialized delta (+5.15 MB) is the **actual
dependency graph**: each formula computed subscribes to 1–4 other cells'
computeds — live cross-cell edges at ~100 B per formula cell. That is the
feature, priced honestly. Even carrying real formula text and a live
dependency graph, the formula grid virtualizes to **8.4 MB — still ~9× under
the composable arm's 77.3 MB for the toy cell**.

### What the verification proves

Every check runs in Playwright against the live DOM, asserted on every run:

- **Evaluation is correct** — `=SUM(A1:D1)`, `=AVERAGE(A1:D1)` and friends
  produce the arithmetic truth; bad references and `1/0` yield the real
  `#VALUE!` / `#DIV/0!` errors.
- **Conditional dependencies shift.** For `=IF(A1>0, B1, C1)`, the dependency
  set Vue tracks is `{A1, C1}` while A1 < 0 and **provably shifts** to
  `{A1, B1}` when A1 crosses zero — editing the off-branch cell leaves the
  formula untouched; editing the live branch moves it.
- **The cascade is live in the DOM.** Editing one input updated a running-sum
  cell five links down the chain in the rendered page, with no manual
  re-render.

Full write-up, machine notes, honest-cost accounting and caveats:
[`demo/formula/RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/demo/formula/RESULTS.md).

```bash
# from the ivue repo root — the interactive playground
npx vite demo --host --port 5182     # then open /grid-formula
node demo/formula/measure.mjs http://localhost:5182         # 100k protocol
node demo/formula/measure.mjs http://localhost:5182 25000   # 1M cells
```

## The flyweight grid: 20 million cells

The grids above price the cell **instance**.
[The flyweight pattern](/guide/flyweight) removes even that
(`sketch/flyweight-grid/`, working and measured, structural proofs run at
full scale): ground truth lives in columnar typed arrays,
cell objects are disposable three-field facades created per render, and
reactivity is a sparse overlay that materializes per observation. One invariant
governs all of it:

> **Everything costs proportional to what's observed; nothing costs
> proportional to what exists.**

**20 columns × 1,000,000 rows = 20,000,000 live cells**, ~55% real
Excel-syntax formulas, same parser, same gc-forced 3-run protocol:

| Metric                              | measured (production build) |
| ----------------------------------- | --------------------------: |
| Model creation, 20,000,000 cells    |                  **67.1 ms** |
| Model heap                          |                 **89.48 MB** |
| **Bytes per cell**                  |                   **4.7 B** |
| After 30 viewports across 1M rows   |        +0.3 MB of overlay   |
| Full-column `SUM(A1:A1000000)`      |    live, 245 block edges    |

That last pair is the architecture: memory is **O(viewport), not
O(rows-ever-visited)** — viewport-tied eviction returns scrolled-away
overlay to the collector, and released cells re-materialize correctly on
re-observation. A write to a cell nobody is observing allocates nothing and
notifies no one. And because behavior lives on prototypes, the formula
engine was **hot-swapped under the live 20M-cell model** — edited on disk,
grafted by [class HMR](/guide/hmr), totals recomputed through the new
engine, zero state loss. A compiled/WASM engine cannot do that at any
price: its code and its memory die together.

### The per-cell cost ladder

Every rung measured, same machine family, same protocol:

| a live cell, at rest                 | bytes/cell | what the cell is             |
| ------------------------------------ | ---------: | ---------------------------- |
| composable (idiomatic Vue)           |       ~758 | closures + eager ref/computeds |
| ivue instance grid (formula)         |        ~67 | plain object + lazy overlay  |
| plain POJO (no reactivity at all)    |        ~40 | `{ row, col, raw }`          |
| **ivue flyweight columnar**          |    **4.7** | 1 B kind + 8 B Float64, shared |

The flyweight sits **8.5× below the "theoretical floor"** — because the
floor was never plain objects; it was ground truth. A cell at rest is one
byte of kind tag plus eight bytes of number, and it is still fully
reactive, formula-capable and editable the moment anything observes it.
For scale: Google Sheets caps at 10M cells — this 20M-cell document cannot
be created there (architectural comparison, not a benchmark).

Status, honestly: a **sketch** — measured, verified in the DOM down to row
1,000,000, its structural suite green at real scale, but not yet packaged
as a shipping layer. The pattern itself — how observation pricing works and
where it applies beyond spreadsheets — is
[The Flyweight Pattern](/guide/flyweight); the raw material lives in the
repo:
[`RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/sketch/flyweight-grid/RESULTS.md)
(measurements, the steady-state memory ceiling, the hot-swap demo),
[`DESIGN.md`](https://github.com/infinite-system/ivue/blob/main/sketch/flyweight-grid/DESIGN.md)
(mechanisms, including the discovered O(n²) parser-aggregation finding and
the columnar fast path), and
[`Flyweight.invariants.md`](https://github.com/infinite-system/ivue/blob/main/sketch/flyweight-grid/Flyweight.invariants.md)
(the structural spec and its impossibility boundary).

```bash
# standalone demo, from the ivue repo root
npx vite sketch/flyweight-grid --host
node sketch/flyweight-grid/measure.mjs <url>
```

## Methodology

Per arm: navigate fresh, wait for the model-not-yet-built state, force
`window.gc()` ×3 and read `performance.memory.usedJSHeapSize` as a baseline,
click **create model**, measure creation time around the allocation loop
only, let the render settle, gc ×3 again and read the heap delta. A second
delta forces every cell's derived values to materialize once (the "all
materialized" columns), for an apples-to-apples worst case. Repeated 3×,
median reported. Full protocol, the machine spec, and every caveat (what the
delta does and doesn't include, why heap is bit-stable but creation time
varies run-to-run) are in [`demo/grid/RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/demo/grid/RESULTS.md). The measurement
script itself — reusable against your own machine — is
[`demo/grid/measure.mjs`](https://github.com/infinite-system/ivue/blob/main/demo/grid/measure.mjs):

```bash
# from the ivue repo root
npx vite demo --host --port 5180
node demo/grid/measure.mjs http://localhost:5180        # 100k cells
node demo/grid/measure.mjs http://localhost:5180 25000  # 1M cells
```

## See also

- [The Model Layer, Measured](/guide/model-layer) — why this gap is
  structural, and why ivue closes it.
- [Performance by Design](/guide/performance) — the micro-level numbers: isolated
  instance creation, per-instance memory, hot-loop read cost.
