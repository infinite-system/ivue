---
title: 'Example: Flyweight grid — 20,000,000 cells'
description: 'Columnar ground truth in typed arrays, disposable cell facades per render, a sparse reactive overlay that materializes per observation — 20M cells at 4.7 bytes each.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [twenty-million-cells, measured-not-promised]
---

# Flyweight grid: 20,000,000 cells

Ground truth lives in columnar typed arrays; rendered cells are disposable
flyweight facades created per render pass; a sparse reactive overlay
materializes per observation and evicts with the viewport. ~55% of cells
hold real Excel-syntax formulas. Everything costs proportional to what is
**observed** — never to what exists.

Nothing downloads until you click — the model code and the formula parser
load on demand, then one more click creates all 20,000,000 cells in your
browser.

<ClientOnly>
  <FlyweightGrid20M />
</ClientOnly>

## What to notice

- **Creation fills ~95 MB of typed arrays** — not 20 million objects. The
  reactive layer allocates only for cells something actually observes.
- **Edit a cell at row 1,000,000** and the column totals react — the
  dependency graph is discovered per observation, not precomputed.
- The measured protocol, numbers and design live in
  [`RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/examples/playground/src/examples/flyweight-grid/RESULTS.md)
  and
  [`DESIGN.md`](https://github.com/infinite-system/ivue/blob/main/examples/playground/src/examples/flyweight-grid/DESIGN.md);
  the deeper story is in [Flyweight Pattern guide](/guide/flyweight).

## Related guide pages

- [Flyweight Pattern](/guide/flyweight) — ground truth in plain storage, reactivity as an overlay.
- [Keyed Version Signals](/guide/keyed-version-signals) — invalidation by key at scale.
- [Static() — Capability Classes](/guide/static) — capability classes, `$`-cached statics, the anchor.
- [Performance by Design](/guide/performance) — what the shape costs and does not.

## The source

The heart of the pattern — the sheet (columnar ground truth + sparse
overlay) and the cell facade:

::: code-group
<<< ../../examples/playground/src/examples/flyweight-grid/model/FlyweightCell.ts [FlyweightCell.ts]
<<< ../../examples/playground/src/examples/flyweight-grid/model/FlyweightSheet.ts [FlyweightSheet.ts]
<<< ../../examples/playground/src/examples/flyweight-grid/FlyweightGridPage.ts [example]
<<< ../../examples/playground/src/examples/flyweight-grid/FlyweightGridExample.vue [route]
<<< ../../examples/playground/src/examples/flyweight-grid/FlyweightGridApp.vue [template]
<<< ../../examples/playground/src/examples/flyweight-grid/FlyweightLogic.ts [FlyweightLogic.ts]
:::

The template is the whole wiring layer: one `new FlyweightGridPage.Class()`,
the element-ref destructure, and markup that reads named members. Twenty
million cells, and the SFC still owns no state — every derivation the
rows need is a getter or a method on the page class.

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Fflyweight-grid%2Fmodel%2FFlyweightSheet.ts&path=%2F%23%2Fflyweight-grid">Open in StackBlitz ⚡</a>
— the playground boots with this example's route and file active.
