---
title: 'Example: Formula grid'
description: 'Real Excel-syntax formulas over a virtualized sheet — one shared parser, one computed per cell, the dependency graph discovered by Vue.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [twenty-million-cells, computed-is-a-cache, measured-not-promised]
---

# Formula grid: real formulas, live

Every cell in columns E–J (and every odd column beyond) holds a real
formula — `=A1+B1`, `=SUM(A1:D1)`, `=IF(A1>0,B1,C1)`, a running sum —
evaluated by [fast-formula-parser](https://github.com/LesterLyu/fast-formula-parser)
(280 Excel functions), with the dependency graph discovered by Vue's
tracking rather than parsed up front. The parser loads on demand when you
click; nothing runs on page load.

<ClientOnly>
  <FormulaGrid />
</ClientOnly>

## What to notice

- **Set A1 to `5000`** and watch E1, G1, H1, I1 and the J column cascade.
- **Conditional dependencies are live.** Select I1 and flip A1's sign — the
  tracked dependency set shifts between branches, because the graph is
  whatever the formula actually read.
- **An unrendered cell allocates nothing.** The virtualized window mounts a
  few hundred DOM cells out of up to a million in the model; a formula
  cell's ref and computed materialize only when observed.

## The source

::: code-group
<<< ../../examples/playground/src/examples/formula-grid/FormulaCell.ts [FormulaCell.ts]
<<< ../../examples/playground/src/examples/formula-grid/Sheet.ts [Sheet.ts]
<<< ../../examples/playground/src/examples/formula-grid/formula-logic.ts [formula-logic.ts]
:::

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Fformula-grid%2FFormulaCell.ts&path=%2F%23%2Fformula-grid">Open in StackBlitz ⚡</a>
— the playground boots with this example's route and file active.

The measured heap/creation protocol lives in
[`demo/formula/RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/demo/formula/RESULTS.md);
the benchmark context is on the
[Interactive Benchmarks page](/guide/benchmarks).
