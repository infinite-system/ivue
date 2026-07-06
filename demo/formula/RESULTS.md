# Formula grid — 100,000 live cells with real Excel formulas

A working spreadsheet where cells hold **real Excel-formula syntax**
(`=A1+B2`, `=SUM(A1:D1)`, `=IF(A1>0,B1,C1)`), parsed and evaluated by the real
[`fast-formula-parser`](https://www.npmjs.com/package/fast-formula-parser) npm
package (not a stub — it bundles 280 Excel-compatible functions), wired so that
**Vue's own reactivity discovers each formula's dependencies automatically** —
there is no hand-built dependency graph anywhere in this demo.

This is the `demo/grid` benchmark's architecture (virtualization, row-windowing,
the create/scroll/edit verification pattern, the gc-forced 3-run heap protocol)
with the toy string-concat `IvueCell` replaced by a real `FormulaCell` that
parses and evaluates. The point is to measure the **honest** heap cost of doing
that at 100k cells, and to prove the reactivity claims end-to-end.

## The integration seam (how Vue discovers the graph)

Three files, following the ivue operating manual exactly:

- **`FormulaCell.ts`** — a `Reactive()` class, same shape as `demo/grid`'s
  `IvueCell`:
  - `raw` → a **ref-getter** holding the literal text the user typed (`"42"`,
    `"hello"`, or `"=A1+B2"`).
  - `value` → the **one** `computed()` (the hot, correctly-memoized value:
    parsing + evaluating a formula is real work). If `raw` isn't a formula it
    resolves the literal; if it is, it calls `sheet.evaluate(this, body)`.
  - `display` / `isFormula` / `cssClass` → **plain getters** (0 bytes/instance,
    reactive via leaf tracking).
- **`Sheet.ts`** — a plain (non-reactive) container holding the 100,000
  `FormulaCell` instances in a `grid[row][col]` that doubles as an O(1)
  `cellAt(row, col)`. It owns **one shared `FormulaParser`** (never one per
  cell) whose `onCell`/`onRange` hooks read cells' `value.value`.
- The seam: those `onCell`/`onRange` reads happen **while a cell's `value`
  computed is evaluating**, so Vue records them as that computed's dependencies.
  Edit a referenced cell and every dependent formula invalidates and
  recomputes — cascading through the graph — with **no manual re-render call**.

The parser needs a shared singleton because a per-cell parser would reintroduce
exactly the per-instance allocation this whole line of work fights. It's built
once, in the `Sheet` constructor, and closes over `this` so its hooks resolve
through that sheet's `cellAt`.

## Machine

- Parallels VM, **aarch64** (Apple-silicon host), 16 vCPU, 31 GiB RAM
- Linux 6.8.0-134-generic
- Node v26.3.1 · Vue 3.5.x · `fast-formula-parser` 1.0.19
- Playwright headless Chromium, launched with `--js-flags=--expose-gc` and
  `--enable-precise-memory-info`; heap read via
  `performance.memory.usedJSHeapSize`.

## The 100k population — a REAL cross-cell dependency graph

Not 100k independent trivial formulas. Of the 100,000 cells, **52,500 (52.5%)
are cross-referencing formulas** and the rest are the numeric source data they
read (`formula-logic.ts`, `initialFormula`):

| cols | contents                                | kind                              |
| ---- | --------------------------------------- | --------------------------------- |
| A–D  | numeric input (some blanks/negatives)   | source data                       |
| E    | `=A+B`                                  | cross-cell arithmetic             |
| F    | `=C-D`                                  | cross-cell arithmetic             |
| G    | `=SUM(A:D)`                             | range → exercises `onRange`       |
| H    | `=AVERAGE(A:D)`                         | range → exercises `onRange`       |
| I    | `=IF(A>0, B, C)`                        | **conditional dependency**        |
| J    | `=J(r-1)+A`, reset every 50 rows        | **running sum** (marquee cascade) |
| K…AN | even col = data, odd col = `=<L1>+<L2>` | cross-column mesh                 |

The running-sum column J is the marquee cascade: row _r_ references row _r-1_,
so editing one input ripples down its 50-row block. It resets every 50 rows on
purpose — a full-height chain would recurse through the parser thousands of
levels deep on a cold read of the bottom cell.

## Protocol (`measure.mjs`)

Per run (3×, median reported): navigate → wait ready → gc×3 → heap (baseline) →
create model → `creationMs` → gc×3 → heap (**model heap** = after − baseline) →
`materializeAll` (force every cell's ref + computed to allocate & evaluate) →
gc×3 → heap (**materialized heap**). Run 1 additionally runs the full
verification suite (below).

## Median results (3 runs, 100,000 cells)

| Metric                                  | Formula grid | Toy `IvueCell` grid (`demo/grid`) |
| --------------------------------------- | -----------: | --------------------------------: |
| **Model heap (virtualized)**            |  **8.36 MB** |                       **5.70 MB** |
| Bytes/cell (virtualized)                |           84 |                                57 |
| **Model heap (all cells materialized)** | **48.11 MB** |                      **40.30 MB** |
| Bytes/cell (materialized)               |          481 |                               403 |
| Creation time                           |      17.1 ms |                           11.4 ms |
| Mounted DOM cells                       |          960 |                               960 |
| Verification                            |     ALL PASS |                              pass |

Heap was **bit-stable** across all three runs (8.36 MB virtualized every run;
materialized 48.11–48.36 MB); creation varied 15.7–18.3 ms.

**1M follow-up (40 cols × 25,000 rows), virtualized, single run:** model heap
**68.41 MB (68 B/cell)**, created in **104 ms**. The clean **marginal** cost of
each added cell from 100k → 1M is **~67 B/cell**. (The 1M _materialized_ figure
was not run to the full 3× protocol — forcing ~500k live formula parses is
minutes of work, not a heap question; the marginal virtualized number is the
load-bearing scaling result.)

### The honest number vs the ~5 MB hope

The going-in hope was ~5 MB at 100k. The real virtualized figure is **8.36 MB**
— meaningfully above that, and **nothing was tuned to move it**. Here is exactly
where the extra **2.66 MB (+27 B/cell)** over the toy grid's 5.70 MB comes from,
measured, not guessed:

1. **The formula strings themselves.** Every cell stores its literal text as a
   field on construction (materialized or not). Summing every cell's raw-string
   length across the 100k grid and applying V8's one-byte-string cost gives
   **≈ 2.8 MB of literal-string heap** — vs the toy grid's shorter numeric/word
   strings (~2 MB). 52,500 formula strings averaging ~13 chars (`=SUM(A1:D1)`,
   `=IF(A1>0,B1,C1)`) are simply longer than `-142.39`. This is **~1 MB** of the
   delta and it is irreducible: real formulas are real bytes.
2. **A fourth cell field.** `FormulaCell` carries a `sheet` back-reference
   (`row`, `col`, `iv`, **`sheet`**) where the toy carried three, so it can reach
   the shared parser + `cellAt`. One pointer × 100k ≈ **0.8 MB**.

That's ~1.8 MB of the 2.66 MB accounted for directly; the small remainder is the
`Sheet`/`grid` structure and object-shape rounding. Crucially, an **unrendered**
formula cell still costs like a plain object — its ref and computed never
materialize — which is why 100k formula cells virtualize to 8 MB and not the
48 MB worst case.

### Where the materialized delta comes from — the real dependency graph

Forcing all 100k cells live costs the formula grid **48.11 MB vs the toy's
40.3 MB (+7.8 MB)**. Subtract the shared model-heap baseline and the cost of
_materializing_ 100k (ref + computed) pairs is **39.75 MB** for the formula grid
vs **34.6 MB** for the toy — a **+5.15 MB** difference. That difference is the
**actual dependency graph**: each of the 52,500 formula computeds subscribes to
1–4 other cells' computeds (and is subscribed to by its dependents), where the
toy's computed subscribed only to its own `raw` ref. Real cross-cell edges cost
~100 B per formula cell to retain. The toy had **no** cross-cell edges; this grid
has a live one with tens of thousands of nodes. That is the feature, priced
honestly.

The takeaway is unchanged from `demo/grid`: even carrying real formula text and
a real dependency graph, the ivue formula grid virtualizes to **8.4 MB** —
**~9× under** the idiomatic composable arm's 77.3 MB for the _toy_ cell, let
alone what a per-cell-parser or eager-computed formula model would cost.

## Verification (all via Playwright against the live dev server)

Every check below is asserted in `measure.mjs` run 1 and passed on every run.

### Real formula evaluation is correct

| cell | formula           |  result | check           |
| ---- | ----------------- | ------: | --------------- |
| E1   | `=A1+B1`          | −642.39 | = A1 + B1 ✓     |
| G1   | `=SUM(A1:D1)`     | −854.34 | = A1+B1+C1+D1 ✓ |
| H1   | `=AVERAGE(A1:D1)` | −213.58 | = SUM/4 ✓       |
| J2   | `=J1+A2`          |   (sum) | running sum ✓   |

Text typed into a cell resolves as text; a bad reference or `1/0` yields the
real `#VALUE!` / `#DIV/0!` errors (rendered amber); `=` alone renders blank.

### The conditional-dependency test — PASSED

`I1 = =IF(A1>0, B1, C1)`. The dependency Vue tracks **shifts** as A1 crosses
zero — proven three ways:

- **A1 = −5 (< 0):** I1's live tracked deps = **{A1, C1}** (no B1); I1 = 215.22
  (= C1). ✓
- **A1 = 5 (> 0):** deps **shift to {A1, B1}** (no C1); I1 = −142.39 (= B1). ✓
- **Behavioral** (with A1 > 0, so I1 depends on B1 not C1): editing the
  **off-branch** C1 to `424242` leaves I1 **unchanged** (−142.39); editing the
  **live-branch** B1 to `777` moves I1 to **777**. ✓

The dep set is read by re-walking the exact same `onCell` path Vue tracks, so it
_is_ Vue's live dependency set — which is why editing an off-branch cell provably
doesn't touch the formula.

### Cross-cell cascade, live in the DOM — PASSED

Editing input `A101 = 100000` updated running-sum cell `J106` (five links down
the chain) from `206` to `100,266` in the **rendered DOM**, with no manual
re-render. Observed live in the browser: flipping `A1` from −500 to 5,000
cascaded E1, F/G/H1, I1 (flipped C1→B1), the entire J block, and cross-column L
— all at once — while the untouched data columns stayed put.

## Caveats (honest notes)

- **The heap delta includes ~viewport DOM** (~960 mounted cells), identical to
  the toy grid, so the arm-to-arm _difference_ is the model difference.
- **`shallowRef` for the model.** The `Sheet` is held in a `shallowRef`, so
  neither it, its `grid`, nor its 100k cells are ever deep-proxied; per-cell
  reactivity comes entirely from each cell's own ref/computed.
- **Creation includes parser build + formula-string generation.** `creationMs`
  covers building the one chevrotain-backed parser (a fixed one-time cost) and
  generating every cell's formula text, which is why it runs a few ms above the
  toy grid's construction. Neither cost is per-render.
- **Recursion guard.** A user-typed circular reference (`A1: =A1`) returns
  `#REF!` via a cheap per-evaluation guard rather than overflowing the stack; the
  guard allocates nothing per cell.
- Single-machine, single-browser (Chromium/V8) on aarch64; absolute bytes will
  differ elsewhere, but the ratios are the load-bearing result.

## Reproduce

```bash
# from the ivue repo root
npx yarn install                                   # fast-formula-parser is a devDependency
npx playwright install chromium                     # once
npx vite demo --host --port 5182                    # serve the demo (any free port)
node demo/formula/measure.mjs http://localhost:5182         # 100k cells (default)
node demo/formula/measure.mjs http://localhost:5182 25000   # 1M cells (25,000 rows)
```

Then open `http://localhost:5182/grid-formula`, click **create model (100k)**,
click any cell to edit its formula, and watch dependents cascade.
