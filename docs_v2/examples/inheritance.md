---
title: 'Example: Inheritance chain'
description: 'Product → SaleProduct → TaxedProduct — three files, three levels, one instance; total is a plain-getter super chain that allocates zero computeds.'
---

<script setup>
import DemoInheritance from '../.vitepress/theme/components/DemoInheritance.vue'
</script>

# Inheritance chain

Three classes, each in its own file, each refining `total` through
`super.total` — and every `receipt()` line written by a different level of
the chain. Children extend the RAW class (`Product.$Class`), and each file
exports its own `Reactive()` wrapper through the namespace.

<ClientOnly>
  <DemoInheritance />
</ClientOnly>

## What to notice

- **Zero computeds.** The whole `total` chain is plain getters — reactive
  through leaf tracking, no per-instance allocation at any level.
- **Write anywhere, everything re-derives.** Push `price`, deepen the
  discount or toggle the tax — the receipt and total update from whichever
  level you touched.

## The source

::: code-group
<<< ../../examples/playground/src/examples/inheritance/Product.ts [Product.ts]
<<< ../../examples/playground/src/examples/inheritance/SaleProduct.ts [SaleProduct.ts]
<<< ../../examples/playground/src/examples/inheritance/TaxedProduct.ts [TaxedProduct.ts]
<<< ../../examples/playground/src/examples/inheritance/InheritanceExample.vue [InheritanceExample.vue]
:::

<a class="feature-inline-link" href="https://stackblitz.com/github/infinite-system/ivue/tree/main/examples/playground?file=src%2Fexamples%2Finheritance%2FTaxedProduct.ts&initialPath=%2F%23%2Finheritance" target="_blank" rel="noreferrer">Open in StackBlitz ⚡</a>
— the playground boots with this example's route and file active.

For the full story of why inheritance works this way, read the
[Inheritance guide](/guide/inheritance).
