---
title: Examples
description: Production-extracted, full-complexity ivue examples — starting with a 100,000-row virtual scroller driven by a customized Lenis, its scroll math and momentum feel intact.
aside: false
pageClass: benchmarks-wide examples-page
---

<script setup>
import ExampleVirtualScroller from '../.vitepress/theme/components/examples/ExampleVirtualScroller.vue'
</script>

# Examples

Real components, extracted from production — not toy snippets. Each example
ships the actual files an application runs, wired to demo data, with the
full source on the page.

## Virtual scroller: 100,000 rows on Lenis

A virtualized list where **scrolling itself is virtual**: a customized
[Lenis](https://github.com/darkroomengineering/lenis) drives the position
over `translateY` instead of native scroll, so momentum, touch feel and
wheel behavior are owned by code — while the DOM holds only the visible
window between two spacer `div`s. Heights are estimated until rows are
seen, captured one-shot as rows enter and leave, and every operation stays
O(window): nothing ever costs O(total items).

The class is a single ivue `Reactive()` unit — template refs, prop refs,
scroll state, the windowing math and the Lenis lifecycle all live on one
instance, constructed in `setup()` and torn down by the component scope.

<ClientOnly>
  <ExampleVirtualScroller />
</ClientOnly>

### Using it

```vue
<script setup lang="ts">
import VirtualScroller from './virtual-scroller/VirtualScroller.vue'
import type { BaseItem } from './virtual-scroller/VirtualScroller.types'

const items = ref<BaseItem[]>(loadRows()) // any size — 100k is routine
</script>

<template>
  <VirtualScroller v-model="items" :assumed-height="56" :padding-quantity="10">
    <template #item="{ item }">
      <article>{{ item.body }}</article>
    </template>
  </VirtualScroller>
</template>
```

### The source

The exact files running above, tabbed — the class alone is ~1,200 lines,
so each block scrolls inside itself. The demo wrapper is docs code;
everything else is the production component.

::: code-group
<<< ../../examples/virtual-scroller/src/VirtualScroller.ts [VirtualScroller.ts]
<<< ../../examples/virtual-scroller/src/VirtualScroller.vue [VirtualScroller.vue]
<<< ../../examples/virtual-scroller/src/VirtualScrollerItem.vue [VirtualScrollerItem.vue]
<<< @/.vitepress/theme/components/examples/ExampleVirtualScroller.vue [demo wrapper]
:::

The example is a **standalone Vite app** at
[`examples/virtual-scroller/`](https://github.com/infinite-system/ivue/tree/main/examples/virtual-scroller)
— the customized Lenis (virtual-limit support over the stock engine) is
vendored inside it. Run it without cloning anything:

<a class="feature-inline-link" href="https://stackblitz.com/github/infinite-system/ivue/tree/main/examples/virtual-scroller" target="_blank" rel="noreferrer">Open in StackBlitz ⚡</a>
— StackBlitz imports the folder straight from GitHub, so every push
redeploys the example automatically.

### What to notice

- **Rows in the DOM** stays at the window size while you fly through
  100,000 items — watch the counter while scrolling.
- **Jumps converge.** A jump lands on an estimated position, then re-applies
  as the fresh window measures in — watch the landing settle onto row
  #50,000.
- **The scrollbar is code.** `overflow-anchor: none` and a `translateZ`
  compositor layer keep the browser out of the way; Lenis takes its clamp
  from the computed content height, not the DOM.
