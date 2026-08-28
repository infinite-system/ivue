---
title: 'Example: Virtual Scroller on Lenis'
description: 'Production-extracted 1,000,000-row virtual scroller driven by a customized Lenis — scroll math and momentum feel intact, full source on the page.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [a-million-rows-twelve-divs, ship-the-variant-keep-the-tuning]
---

<script setup>
import ExampleVirtualScroller from '../.vitepress/theme/components/examples/ExampleVirtualScroller.vue'
import ExampleTextMarquee from '../.vitepress/theme/components/examples/ExampleTextMarquee.vue'
</script>

# Virtual scroller: 1,000,000 rows on Lenis

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

## Using it

```vue
<script setup lang="ts">
import VirtualScroller from './virtual-scroller/VirtualScroller.vue'
import type { BaseItem } from './virtual-scroller/VirtualScroller.types'

const items = ref<BaseItem[]>(loadRows()) // any size — 1M is routine
</script>

<template>
  <VirtualScroller v-model="items" :assumed-size="56" :padding-quantity="10">
    <template #item="{ item }">
      <article>{{ item.body }}</article>
    </template>
  </VirtualScroller>
</template>
```

## The source

The exact files running above, tabbed — the class alone is ~1,200 lines,
so each block scrolls inside itself. The demo wrapper is docs code;
everything else is the production component.

::: code-group
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScroller.ts [VirtualScroller.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScroller.vue [VirtualScroller.vue]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerItem.vue [VirtualScrollerItem.vue]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerExample.ts [demo model]
<<< @/.vitepress/theme/components/examples/ExampleVirtualScroller.vue [demo wrapper]
:::

The example lives in the unified playground at
[`examples/playground/`](https://github.com/infinite-system/ivue/tree/main/examples/playground)
— the customized Lenis (virtual-limit support over the stock engine) is
vendored inside it. Run it without cloning anything:

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Fvirtual-scroller%2FVirtualScroller.ts&path=%2F%23%2Fvirtual-scroller">Open in StackBlitz ⚡</a>
— StackBlitz imports the folder straight from GitHub, so every push
redeploys the example automatically.

## What to notice

- **Rows in the DOM** stays at the window size while you fly through
  1,000,000 items — watch the counter while scrolling.
- **Jumps converge.** A jump lands on an estimated position, then re-applies
  as the fresh window measures in — watch the landing settle onto row
  #500,000.
- **The scrollbar is code.** `overflow-anchor: none` and a `translateZ`
  compositor layer keep the browser out of the way; Lenis takes its clamp
  from the computed content height, not the DOM.

## The contract lives in the namespace

The scroller's namespace carries the **whole component contract**, not
just the class: prop types, prop defaults, the merged runtime props
object, emits, slots and the expose-surface type. The SFC is pure wiring
against it —

```ts
const props = defineProps(
  VirtualScroller.props
) as unknown as VirtualScroller.Props<T>;

const emit = defineEmits(VirtualScroller.emits) as VirtualScroller.Emits;
```

`defineProps` receives a plain **runtime object** (types and defaults
merged by [`propsWithDefaults`](/guide/extensible-components)), so the
compiler never resolves a cross-file type inside a macro, and the cast
recovers the generic `<T>` precision a runtime map cannot carry. The
payoff is the same one the class hierarchy already has: a subclass
component composes its surface by **spread**. `HorizontalVirtualScroller`
— the same tuned class rotated sideways through its axis seams — inherits
every prop and states its one real difference in one line:

```ts
export const propsDefaults = {
  ...VirtualScroller.propsDefaults,
  assumedSize: 300 // cards are ~hundreds of px wide where rows are tens tall
};
```

## A book as one scrolling line

The same machinery, pointed at text: a **marquee** that scrolls a
~400,000-character book as a single unbroken line. Three units, each pure
about one thing:

- **`TextChunker`** (a plain static class) speaks only text: it collapses
  the book to one line, cuts it into ~400-character chunks at spaces so
  words never split — each chunk keeping its trailing space, so side by
  side they concatenate back byte-identically — and canvas-measures the
  font's average character width.
- **`HorizontalVirtualScroller`** speaks only items, sizes and pixels. It
  never learns it is scrolling a book.
- **`TextMarquee`** is where they meet: chunks become items, the measured
  character width seeds `assumed-size`, and the glide is the scroller's
  own autoplay creep — the per-frame integrator that paces article
  reading — with its speed exposed through the `creep-ms-per-px` prop.
  That is why the speed slider takes effect mid-glide: the creep reads
  the live value every frame; nothing restarts.

<ClientOnly>
  <ExampleTextMarquee />
</ClientOnly>

::: code-group
<<< ../../examples/playground/src/examples/text-marquee/TextMarquee.ts [TextMarquee.ts]
<<< ../../examples/playground/src/examples/text-marquee/TextMarquee.vue [TextMarquee.vue]
<<< ../../examples/playground/src/examples/text-marquee/TextChunker.ts [TextChunker.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.ts [HorizontalVirtualScroller.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.vue [HorizontalVirtualScroller.vue]
:::

The scale math holds up to real books: 600k characters is ~1,500 chunks,
the scroll extent a few million pixels — inside the scroller's
origin-rebasing regime — and the DOM holds a dozen-odd `span`s at any
moment. Run it in the playground:

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Ftext-marquee%2FTextMarquee.ts&path=%2F%23%2Ftext-marquee">Open the marquee in StackBlitz ⚡</a>
