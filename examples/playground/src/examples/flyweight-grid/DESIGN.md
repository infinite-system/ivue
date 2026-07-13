# Flyweight Columnar Grid — 20 columns × 1,000,000 rows

Status: WORKING & MEASURED — 11/11 structural proofs over a live
20,000,000-cell sheet (repo suite 161/161), demo UI user-verified across
all 1M rows, heap protocol complete (see RESULTS.md): **68 ms creation,
89.6 MB model heap = 4.7 B/cell** — 8.5× below the plain-POJO floor, fully
reactive. Nothing outside `sketch/flyweight-grid/` touched; `demo/formula/`
reference only. Demo: `npx vite sketch/flyweight-grid --host`; measure:
`node sketch/flyweight-grid/measure.mjs <url>`.

The structural spec — reality vs chosen invariants and the impossibility
boundary — lives in `Flyweight.invariants.md`; this document carries the
mechanisms, `RESULTS.md` the measurements.

## The invariant this design descends from

> **Everything costs proportional to what's observed; nothing costs
> proportional to what exists.**

The formula grid (`demo/formula`) obeys this invariant for refs and computeds —
but its 1M `FormulaCell` _instances_ still exist eagerly, and at 20M cells
(~67 B/cell marginal) that's a ~1.3–2.7 GB wall of cell objects. This sketch
extends the invariant one level deeper: **the cells themselves don't exist until
observed.** Ground truth is columnar typed storage; cell objects are
transient flyweight facades; reactivity is a sparse overlay that materializes
per observation.

| Layer             | Exists when…                            | Cost at rest      |
| ----------------- | --------------------------------------- | ----------------- |
| cell VALUE        | always (typed arrays / sparse maps)     | ~8 B numeric cell |
| cell OBJECT       | rendered / handed to something (facade) | 0                 |
| fine version ref  | a point observer reads that cell        | 0                 |
| block version ref | a range formula covers that block       | 0                 |
| formula computed  | that formula's value is observed        | 0                 |
| dependency edge   | that dependency was _executed_          | 0                 |

## Storage: columnar ground truth

Per column:

- `kind: Uint8Array` — Blank / Number / Text / Formula per row (1 B/cell).
- `nums: Float64Array | null` — numeric ground truth, **allocated on the
  first numeric write to that column** (formula-only columns never pay).
- `text: Map<row, string>` — sparse: typed text and _edited_ formula sources.

**Formula sources are columnar too.** In real sheets (and this demo's
layout) formulas come in per-column patterns — every row of column E is
`=A{r}+B{r}`. Storing 11M near-identical strings would cost ~1 GB, so the
default source is a per-column _pattern function_ and `text` holds only
user-edited overrides. This is not a benchmark trick: it is what
column-formula/structured-reference engines do, and every row still parses
and evaluates its own concrete `=A5+B5` through the real parser. Stated
honestly: source _storage_ is deduplicated; evaluation is not.

Predicted ground-truth heap at 20×1M: 20 MB kind + 9 numeric columns × 8 MB
≈ **~95 MB** — for a document Google Sheets cannot open at all (20M cells >
its 10M-cell cap). Reactive overlay: O(observed), zero at rest.

## Reactivity: a two-tier sparse overlay

**Fine tier — per-cell version refs** (`cellVersions: Map<key, Ref>`),
created only when a _point_ observer reads a cell: a rendered cell, an
`onCell` formula reference, a small range. Same precision as the formula
grid — including the conditional-dependency shift (`=IF(A1>0,B1,C1)` tracks
only the live branch).

**Coarse tier — per-block version refs** (`blockVersions`, 4,096 rows per
block), created only when a _large_ range (> `FINE_RANGE_LIMIT` = 64 cells)
subscribes. `=SUM(A1:A1000000)` costs **245 block edges, not 1,000,000 fine
edges** — the adaptive-granularity answer to the bulk-range problem, using
the same one-integer-covers-many trick as ivue's virtual-scroller
`geometryVersion`.

**Writes are O(observers-of-that-cell)**: update the typed array, then bump
the cell's fine ref _if it exists_ and its block ref _if it exists_
(peek-only — a write to a never-observed cell allocates nothing and notifies
no one).

## Formulas: discovered dependencies at two granularities

One shared `fast-formula-parser` (280 Excel functions), exactly like the
formula grid. Formula _values_ are cached computeds created on demand
(`formulaCache`), whose evaluation:

- reads its own fine ref (so editing the formula source invalidates it);
- `onCell` → tracked point read (fine edge, conditional-shift preserved);
- `onRange` → small ranges read per-cell (fine); large ranges subscribe
  blocks and read ground truth **with tracking paused**.

**The derived-write bridge.** A large range must see through formula cells
inside it (and their upstream inputs _outside_ it) without fine edges. Every
cached formula computed carries one sync watcher: when its value changes, it
bumps **its own block**. So `A1 → E50 (formula) → SUM(E1:E200)` propagates:
`A1` write → `E50` computed (fine edge) → watcher bumps E50's block → SUM
(block edge) recomputes. Correctness through coarse edges, precision where
it's cheap.

**Transitive observation is priced, honestly.** A large range over a
_formula_ column materializes those formulas' computeds on first evaluation —
that is genuine observation (the range's value depends on theirs), and it
costs O(range-formulas) once. Large ranges over _data_ columns — the common
bulk case — touch nothing but blocks. The demo's totals bar deliberately
aggregates data columns; the tests exercise the priced case at bounded scale.

## Discovered during implementation: the parser's range aggregation is O(n²)

The first full-scale run hung — and bisection + isolation produced a
measured finding worth more than the feature it blocked:
`fast-formula-parser`'s built-in range aggregation is **quadratic in range
size** (its argument flattening, not our reactivity — the reactive layer had
already delivered its 245 block edges in milliseconds):

| SUM over…    | stock parser |
| ------------ | -----------: |
| 10,000 cells |        27 ms |
| 50,000       |      2,702 ms |
| 100,000      |     10,957 ms |
| 200,000      |     40,482 ms |
| 1,000,000    | ~17 min (extrapolated; observed as a 19-CPU-minute hang) |

The architectural conclusion was already in this document's next-steps as a
hunch and is now a necessity: **bulk aggregation belongs to the columnar
layer, not a per-cell AST interpreter** — the same reason desktop engines
special-case range ops instead of feeding them through the general
evaluator. `matchSimpleAggregate` detects bodies that are exactly one
aggregate over one contiguous range (`SUM/AVERAGE/MIN/MAX/COUNT(X1:Yn)`)
and `fastAggregate` computes them LINEARLY over ground truth with the
*identical* observation semantics (fine tier small, block tier + paused
reads + formula computeds large). Compound formulas (`=SUM(A1:A99)/2`) and
everything else still take the general parser — with the honest boundary
that a compound formula over a giant range inherits the parser's quadratic
cost.

## The flyweight facade

`FlyweightCell` is three fields — `(sheet, row, col)` — plus plain getters
delegating to the sheet and a `write()`. ivue makes facades free at rest: no
getter runs at construction, plain getters de-optimize to native prototype
getters, and every read is tracked through whatever effect performs it.
Facades are disposable by design — create per render, drop on scroll; the
reactive state they expose lives on the sheet's sparse overlay, not on them.

## Impossibility boundary

If the design holds, none of these can occur:

- an interaction whose cost is O(total cells) — edits, reads, renders and
  invalidations are all O(observed);
- a full-document recalculation on edit;
- reactive-graph size scaling with document size (it scales with viewport +
  live formula closure);
- a document-size cap that is architectural rather than raw-heap-bound
  (Sheets' 10M-cell cap is architectural; this design's limit is the typed
  arrays themselves).

## Honest boundaries / open corners

- **Eviction is manual in the sketch** (`release()` / `stats()` provided;
  scrolled-through formula computeds accumulate until released — a
  production impl ties release to viewport + formula refcounts or LRU).
- **Derived-bump over-fires on object results** (FormulaError identities
  differ per eval) — correct, occasionally redundant.
- **`traceDeps` on a giant-range formula** records the full range (tooling
  concern only; UI traces small formulas).
- **Volatile functions** (`NOW()`…) need a tick signal — not wired.
- `pauseTracking`/`resetTracking` come from `@vue/reactivity` (public
  exports of the reactivity package, not re-exported by `vue`).
- Self-referential ranges resolve to `#REF!` via the cycle guard, matching
  the formula grid.

## Files

- `flyweight-logic.ts` — pure config, column layout, pattern sources.
- `model/FlyweightSheet.ts` — columnar stores, two-tier overlay, formula
  cache + derived bridge, parser seam, `stats()`.
- `model/FlyweightCell.ts` — the facade.
- `__tests__/FlyweightSheet.vitest.spec.ts` — the structural proofs, run at
  the REAL 20×1M scale: zero-allocation creation/writes, O(observed)
  tracking, 245-edge bulk SUM, block invalidation, transitive derived
  propagation, conditional shift, cycles, facade flyweight-ness.
- `index.html` / `main.ts` / `FlyweightGridApp.vue` / `grid.css` /
  `vite.config.ts` — standalone demo: `npx vite sketch/flyweight-grid --host`.

## Next steps (not in this sketch)

- `measure.mjs` heap protocol (adapt `demo/formula/measure.mjs`) → RESULTS.md
  in the house style, including the Sheets-cannot-open-this comparison.
- Viewport-tied eviction; column stats (typed-array aggregates for instant
  Σ/μ over data columns without the parser).
