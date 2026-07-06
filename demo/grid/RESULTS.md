# Grid benchmark — 100,000-cell virtualized spreadsheet

The flagship ivue benchmark: the **same** 100,000-cell (40 cols × 2,500 rows)
virtualized spreadsheet grid, built **three** ways, then measured for real heap
retention and model-creation time in headless Chromium.

- **Arm A — composable model** (`GridComposable.vue` / `composableCell.ts`):
  the idiomatic Vue 3 "composable per entity". Every cell factory eagerly
  creates a `ref` for the raw value plus **four** `computed()`s
  (`display`, `isNumber`, `cssClass`, `numericValue`).
- **Arm B — ivue model** (`GridIvue.vue` / `IvueCell.ts`): a `Reactive()`
  class `$Cell` authored per the ivue skill — `raw` is a ref-getter,
  `display`/`isNumber`/`cssClass` are **plain getters** (0 bytes/instance,
  reactive via leaf tracking), and only the hot `numericValue` is a
  `computed()`. Instances are plain objects; refs/computeds **materialize
  lazily** on first access.
- **Arm C — POJO floor** (`GridPojo.vue` / `pojoCell.ts`): plain, non-reactive
  `{ row, col, raw }` objects; derived values are pure functions at render time.
  The theoretical memory floor. (Edits do not re-render — no reactivity, by
  design.)

Everything except the per-cell model is shared, byte-for-byte, across the arms:
the grid shape and cell logic (`cell-logic.ts`), the row-windowing
(`useRowWindow.ts`), and the page controller (`useGridPage.ts`, arms A & B).
All 100,000 cells are created up front in every arm — virtualization only
limits the **DOM**, never the model.

## Machine

- Parallels VM, **aarch64** (Apple-silicon host), 16 vCPU, 31 GiB RAM
- Linux 6.8.0-134-generic
- Node v26.3.1 · Vue 3.5.39
- Playwright 1.61.1 · Chromium 149.0.7827.0 (headless)
- Chromium launched with `--js-flags=--expose-gc` and
  `--enable-precise-memory-info`; heap read via
  `performance.memory.usedJSHeapSize` (CDP `Performance.getMetrics →
JSHeapUsedSize` fallback was not needed — precise `performance.memory` was
  available on every run).

## Protocol (`measure.mjs`)

Per arm, repeated **3×**, median reported:

1. Navigate to the page (the model is **not** built on load).
2. Wait until `window.__grid` is ready.
3. `window.gc()` ×3 → read `usedJSHeapSize` → **baseline**.
4. Click **create model (100k)**; wait until done; read `creationMs`
   (`performance.now()` measured around the creation loop only).
5. Let the reactive render settle; `window.gc()` ×3 → read `usedJSHeapSize`
   again → **model heap = after − baseline**.
6. **Live reactivity check:** scroll to the middle row, read a cell's rendered
   text, `editCell(r, c, '987654')`, re-read the DOM — assert it now shows
   `987,654`.
7. **Fully-materialized heap (arms A & B):** read _every_ cell's derived values
   once (forcing ivue's lazy refs/computeds to allocate, and evaluating the
   composable's already-allocated computeds), gc ×3, read heap again — an
   apples-to-apples "all 100k cells live" figure.

The model heap delta includes the small, identical ~viewport DOM (960 mounted
cells in every arm), so the delta **difference** between arms is essentially the
model difference. See caveats.

## Median results (3 runs)

| Arm                | Model heap (virtualized) | Bytes/cell | Model heap (all cells materialized) | Bytes/cell (mat.) |    Creation | Mounted DOM cells |     Reactivity     | OOM  |
| ------------------ | -----------------------: | ---------: | ----------------------------------: | ----------------: | ----------: | ----------------: | :----------------: | :--: |
| **A — composable** |              **77.3 MB** |        773 |                            109.8 MB |             1,098 | **75.1 ms** |               960 |      ✅ pass       | none |
| **B — ivue**       |               **5.7 MB** |         57 |                             40.3 MB |               403 | **11.4 ms** |               960 |      ✅ pass       | none |
| **C — POJO floor** |               **4.5 MB** |         45 |                                   — |                 — |     10.3 ms |               960 | n/a (non-reactive) | none |

Heap figures were bit-stable across all three runs (deterministic allocation +
full GC + precise memory info); only creation time varied run-to-run
(composable 69.5–75.8 ms, ivue 9.6–13.5 ms, POJO 7.9–11.8 ms).

### What the numbers say

- **Realistic (virtualized) footprint:** ivue retains **5.7 MB vs the
  composable's 77.3 MB — 13.6× less memory**, sitting just **1.2 MB above the
  non-reactive POJO floor (4.5 MB)**. Because ivue materializes refs/computeds
  lazily, a virtualized grid only ever allocates reactive machinery for the ~960
  cells it actually renders; the other ~99,000 cells cost the same as plain
  objects. The composable, by contrast, allocates 1 ref + 4 computeds for all
  100,000 cells whether or not they are ever seen.
- **Worst case (every cell materialized):** even when _all_ 100k cells are
  forced live, ivue is **40.3 MB vs the composable's 109.8 MB — 2.7× less**
  (403 vs 1,098 bytes/cell). ivue pays for 1 ref + 1 computed per cell; its
  three plain getters cost **0 bytes/instance**. The composable pays for 1 ref +
  4 computeds per cell.
- **Creation time:** ivue builds the 100k model in **11.4 ms vs the composable's
  75.1 ms — ~6.6× faster** — and ivue's creation time is statistically
  indistinguishable from the plain-POJO floor (10.3 ms), confirming the
  `Reactive()` class adds ~zero construction cost: only plain objects are
  allocated up front.

### Reactivity verification

Both reactive arms **passed**: after scrolling to row 1,250 and calling
`editCell(1250, 1, '987654')`, the rendered cell updated to `987,654` and the
row's Σ column recomputed live, in every run. This exercises the same write path
the click-to-edit UI uses (`cell.raw.value = v`). Arm C (POJO) is non-reactive
by design — the edit mutates the data but the DOM does not update; this is
reported, not asserted.

### OOM events

**None.** All three arms completed all runs at the full 100,000 cells. The
composable arm landed at 77.3 MB (virtualized) / 109.8 MB (fully materialized) —
heavy, but it did not crash, so the `measure.mjs` 25k-fallback + ×4
extrapolation path was not triggered. (Prior microbenchmarks that reached
"hundreds of MB / OOM" carried a large per-entity payload object; this cell is
lean — 1 ref + 4 computeds — so 100k of them fit without OOM.)

## Caveats (honest notes)

- **The heap delta includes ~viewport DOM.** After model creation the grid
  renders ~960 cells in every arm, so each delta carries the same small DOM +
  render-effect cost. This is identical across arms and dwarfed by the model, so
  it does not distort the comparison — but the absolute deltas are "model +
  viewport", not "model in a vacuum". The POJO floor (4.5 MB) is the best
  estimate of that shared non-model overhead.
- **ivue's virtualized win is laziness, and that is the point.** ivue's 5.7 MB
  is not a trick — it is the architectural payoff: in a virtualized view you
  never touch most entities, and ivue never allocates reactivity for what you do
  not touch. The 40.3 MB "all materialized" column is the honest worst case if
  every cell is forced live; ivue still wins there (2.7×) purely on the
  plain-getter-vs-computed structure.
- **Fairness of the derived set.** Both reactive arms compute the _same_ four
  derived values from the _same_ shared pure functions (`cell-logic.ts`); the
  only difference is the reactivity primitive wrapping them (eager `computed()`
  vs plain getter + one `computed()`) — exactly the composable-vs-ivue contrast
  under test.
- **`shallowRef` for the model.** The model array is held in a `shallowRef`, not
  `ref`/`reactive`, so the array and its cell instances are never deep-proxied
  (which would have added overhead to every arm and corrupted the comparison).
  Per-cell reactivity comes entirely from each cell's own refs/getters.
- Numbers are single-machine, single-browser (Chromium/V8) on aarch64; absolute
  bytes/ms will differ on other CPUs/engines, but the **ratios** are the load-
  bearing result.

## Reproduce

```bash
# from the ivue repo root
npx vite demo --host --port 5180        # serve the demo (any free port)
node demo/grid/measure.mjs http://localhost:5180
```

`measure.mjs` requires Playwright from the realized worktree
(`.../convert-player-to-ivue2/app/node_modules`), where Chromium is already
installed.
