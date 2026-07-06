---
title: Benchmarks
description: 'A live, in-browser 100k/1M-cell virtualized grid — the same model built three ways (composable, ivue, plain POJO) — plus the measured heap and creation-time numbers behind the claim.'
---

# Benchmarks

[The Reactive Model Layer](/guide/model-layer) argues that a domain model —
thousands of live, individually-reactive entities — has a structural memory
cost in idiomatic Vue, and that ivue's laziness erases it. This page is the
receipt: a real, reproducible, end-to-end measurement, not a microbenchmark.
[Performance](/guide/performance) covers the micro-level numbers (creation of
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

- [The Reactive Model Layer](/guide/model-layer) — why this gap is
  structural, and why ivue closes it.
- [Performance](/guide/performance) — the micro-level numbers: isolated
  instance creation, per-instance memory, hot-loop read cost.
