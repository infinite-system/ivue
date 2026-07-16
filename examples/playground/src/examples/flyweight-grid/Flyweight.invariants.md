# Flyweight Grid — Invariants

The load-bearing truths the flyweight pattern descends from. Everything in
`model/FlyweightSheet.ts` / `model/FlyweightCell.ts` / `FlyweightGridPage.ts`
is a consequence of one of these — change the system _here_ first and let the
code follow. Mechanisms live in `DESIGN.md`; measurements in `RESULTS.md`;
tests in `__tests__/FlyweightSheet.vitest.spec.ts`.

The master invariant, which every entry below either enables or holds:

> **Everything costs proportional to what's observed; nothing costs
> proportional to what exists.**

They split into two kinds, and the split is itself load-bearing: **reality
invariants** are forced by how Vue's tracker, V8, GC and browser compositors
actually work — discovered, not chosen. **Chosen invariants** are disciplines
that could be otherwise but must not drift. Chosen stands on reality, never
the reverse.

---

# Reality invariants — discovered; obey or it breaks

## Observation Is the Only Tracker _(the enabler of the master invariant)_

Vue records dependencies at **execution time**: whatever a running effect
reads, it subscribes to; whatever it never reads **cannot** subscribe it.
There is no static registration step to pay for. This is what makes
observation-priced existence possible at all — an unread cell needs no
reactive representation, because nothing could be depending on it.
Generated: get-or-create tracking, peek-only bumps, discovered formula
dependencies (the parser's `onCell`/`onRange` reads happen _inside_ a
computed's evaluation, so a third-party engine that has never heard of Vue
still yields exact, branch-sensitive dependency sets).
**Test:** _point observation is O(observed)_; _conditional dependencies
SHIFT with the executed branch_.

## Overlay Entries Cannot Garbage-Collect Themselves

The sheet's Maps hold strong references, and every cached formula computed
carries a bridge watcher — a permanent subscriber. So "memory returns to
the viewport" is not a GC property; it must be **designed** (eviction).
Vue 3.5's lazy computeds are what make eviction _safe_: a scrolled-out
row's render effect already unsubscribed, so stop-watcher + Map-delete
leaves the subgraph unreachable → collected.
**Test:** _viewport eviction releases far rows_; _release drops the overlay_.

## Cached Closures Delegate to Named Methods

A reactive closure cached on an instance remains small: every computed and
watcher body delegates to a named prototype method. Logic stays directly
testable and cannot accidentally capture getter-scope values for the lifetime
of the sheet.

## Scroll Physics Are Float32 and Capped

Chrome's compositor does scroll math in f32 — dead past 2^24 px (row
~599,186 at 28px rows); Firefox caps element height at ~17.9M px. No DOM
may be built taller than these walls; range must come from computed
geometry (the scaled scrollbar).

## Bulk Aggregation Belongs to the Columnar Layer

The stock parser's range aggregation is O(n²) in range size (measured:
27 ms @ 10k cells → 40 s @ 200k → hang @ 1M). A per-cell AST interpreter is
the wrong tool for bulk math over contiguous data; linear loops over typed
arrays are within an order of magnitude of native. Same reason desktop
engines special-case range ops.
**Test:** the 1M-cell SUM completes in milliseconds inside the suite.

## Typed Arrays Are the Memory Floor

A numeric cell's irreducible cost is its ground truth: 1 B of kind + 8 B of
Float64. Every object, closure, or eager cell on top is decoration.
**Measured:** 4.7 B/cell at 20M cells — _under_ the plain-object "floor,"
because the floor was never objects.

---

# Chosen invariants — disciplines; hold them consistently

## Ground Truth Lives in Plain Storage; Refs Are Version Signals

The overlay's refs hold **versions, not values** — bump to invalidate,
readers re-derive from the arrays. Values in refs would duplicate ground
truth and desynchronize; version signals cannot lie about content because
they carry none.

## Reads Get-or-Create; Writes Peek

The asymmetry IS observation pricing: a read materializes and subscribes
(observation is the event that costs); a write updates storage and bumps
only refs that already exist. Forbidden by construction: a write to an
unobserved cell allocating anything or notifying anyone.
**Test:** _writes to unobserved cells allocate nothing and notify no one_.

## Two Granularities, Bridged

Point observers take fine per-cell edges (precision — conditional shifts);
large ranges take per-block edges (245 for a 1M-cell SUM). The
derived-write bridge (each formula computed bumps its own block on value
change) keeps the coarse tier truthful through formulas to out-of-range
inputs. One tier alone fails: all-fine explodes on ranges, all-coarse loses
branch precision.
**Tests:** _a 1M-cell range costs O(blocks)_; _derived changes propagate to
block subscribers_.

## Eviction Is Part of the Design

Memory is O(viewport), not O(rows-ever-visited): overlay entries outside
window ± margin are released as observation moves; released cells
re-materialize correctly on re-observation — including writes made while
unobserved. The margin must exceed the layout's longest dependency reach
(locality; refcounts are the production generalization — documented
boundary). **Measured:** +0.3 MB after 30 viewports across 1M rows.

## Facades Are Disposable

The entity object is three fields and prototype getters — created per
render, dropped on scroll, holding NO state. All reactive state lives on
the sheet's overlay, so a facade can never be stale: it has nothing to go
stale. **Test:** _the facade is a true flyweight: three own fields, fully
live_.

## One Write Path

Every mutation — user edit, harness, collaborative future — goes through
`write()`: storage update, kind transition, fine bump, block bump, in that
order. Two write paths would eventually disagree about notification.
**Test:** _kind transitions keep observers correct_.

## The Dependency Graph Is Discovered, Never Hand-Built

No dependency registration API exists anywhere in the sketch — the graph is
whatever the tracked reads of actual evaluation produce. Hand-built graphs
drift from the code they describe; discovered graphs cannot (they _are_ the
code's execution).

---

## Impossibility boundary — what these invariants forbid

If the invariants hold, none of these can exist:

- an interaction whose cost is O(total cells) — reads, writes, renders,
  invalidations and forgetting are all O(observed)
- a write to a never-observed cell that allocates or notifies
- a full-document recalculation, ever
- reactive-graph size or resident memory scaling with document size
  (both scale with the live observation set)
- a dead-branch edit recomputing a conditional formula
- a stale facade (facades hold nothing)
- a document-size cap that is architectural rather than raw-heap-bound

A change that introduces any of the above is breaking an invariant, not
adding a feature — re-derive from here before writing it.
