---
title: 'Example: Inheritance chain'
description: 'Two three-level inheritance chains: zero-allocation plain getters and same-name computeds that coexist through super.total.value.'
relatedPosts: [inheritance-exile]
---

<script setup>
import DemoInheritance from '../.vitepress/theme/components/DemoInheritance.vue'
import DemoComputedInheritance from '../.vitepress/theme/components/DemoComputedInheritance.vue'
</script>

# Inheritance chain

Three classes, each in its own file, each refining `total` through
`super.total` — and every `receipt()` line written by a different level of
the chain. Children extend the RAW class (`Product.$Class`), and each file
exports its own `Reactive()` wrapper through the namespace.

<ClientOnly>
  <DemoInheritance />
</ClientOnly>

### What to notice

- **Zero computeds.** This `total` chain is entirely plain getters — reactive
  through leaf tracking, with no per-instance allocation at any level.
- **Write anywhere, everything re-derives.** Push `price`, deepen the
  discount or toggle the tax — the receipt and total update from whichever
  level you touched.

### Plain-getter source

::: code-group
<<< ../../examples/playground/src/examples/inheritance/Product.ts [Product.ts]
<<< ../../examples/playground/src/examples/inheritance/SaleProduct.ts [SaleProduct.ts]
<<< ../../examples/playground/src/examples/inheritance/TaxedProduct.ts [TaxedProduct.ts]
:::

## The computed chain

The same hierarchy can memoize at every level. Each class owns a different
computed named `total`, and each child refines the parent cell through
`super.total.value`:

<ClientOnly>
  <DemoComputedInheritance />
</ClientOnly>

### What to notice

- **Same-name computeds coexist.** The computed version retains three cached
  `total` cells on one instance; each prototype level owns its own cache key.

### Computed source

::: code-group
<<< ../../examples/playground/src/examples/inheritance/ComputedProduct.ts [ComputedProduct.ts]
<<< ../../examples/playground/src/examples/inheritance/ComputedSaleProduct.ts [ComputedSaleProduct.ts]
<<< ../../examples/playground/src/examples/inheritance/ComputedTaxedProduct.ts [ComputedTaxedProduct.ts]
:::

## Playground wrapper

The standalone playground renders both hierarchies on one route:

::: code-group
<<< ../../examples/playground/src/examples/inheritance/InheritanceExample.vue [InheritanceExample.vue]
:::

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Finheritance%2FTaxedProduct.ts&path=%2F%23%2Finheritance">Open in StackBlitz ⚡</a>
— the playground boots with this example's route and file active.

For the full story of why inheritance works this way, read the
[Inheritance guide](/guide/inheritance).

## Related guide pages

- [Inheritance & super](/guide/inheritance) — `extends $Class`, `super`, `override`.
- [Namespace Pattern](/guide/namespace-pattern) — `$Class`, `Class`, and the types derived from them.
- [Reactive State](/guide/state) — ref-getters, plain getters, the `$`-prefixed cache.

