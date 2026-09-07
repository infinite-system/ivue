---
title: 'Example: Virtual Scroller on Lenis'
description: 'Production-extracted 1,000,000-row virtual scroller driven by a customized Lenis — scroll math and momentum feel intact, full source on the page.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [select-text-across-a-million-rows, a-million-rows-twelve-divs, ship-the-variant-keep-the-tuning]
---

<script setup>
import LazyCodeGroup from '../.vitepress/theme/components/LazyCodeGroup.vue'
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
import type { VirtualScroller as Scroller } from './virtual-scroller/VirtualScroller'

const items = ref<Scroller.BaseItem[]>(loadRows()) // any size — 1M is routine
</script>

<template>
  <VirtualScroller v-model="items" :assumed-size="56" :padding-quantity="10">
    <template #item="{ item }">
      <article>{{ item.body }}</article>
    </template>
  </VirtualScroller>
</template>
```

## Related guide pages

- [Components & Templates](/guide/components) — one template, one logic owner; the state destructure.
- [Extensible Components](/guide/extensible-components) — props, emits and slots that extend with the class.
- [Performance by Design](/guide/performance) — what the shape costs and does not.

## The source

The exact files running above, tabbed — the class alone is ~1,200 lines,
so each block scrolls inside itself. The demo template is docs code;
everything else is the production component.

<LazyCodeGroup
  :files="[
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScroller.ts', label: 'VirtualScroller.ts' },
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScroller.vue', label: 'VirtualScroller.vue' },
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.ts', label: 'VirtualScrollerSelection.ts' },
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScrollerSelectionTouch.ts', label: 'VirtualScrollerSelectionTouch.ts' },
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.ts', label: 'VirtualScrollerPadding.ts' },
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScrollerItem.ts', label: 'VirtualScrollerItem.ts' },
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScrollerItem.vue', label: 'VirtualScrollerItem.vue' },
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScrollerExample.ts', label: 'example' },
      { path: 'docs_v2/.vitepress/theme/components/examples/ExampleVirtualScroller.vue', label: 'template' }
  ]"
/>

Every class above has a colocated spec beside it, and the subsystem has a
contract the spec headers bind to. The specs, the contract, and the Lenis
fork's own are on their own page —
[Virtual Scroller: Specs & Contract](/examples/virtual-scroller-specs) —
so this page carries the source alone; the method is on
[Testing & Invariants](/guide/testing).

The example lives in the unified playground at
[`examples/playground/`](https://github.com/infinite-system/ivue/tree/main/examples/playground)
— the customized Lenis (virtual-limit support over the stock engine) is
vendored inside it. Run it without cloning anything:

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Fvirtual-scroller%2FVirtualScroller.ts&path=%2F%23%2Fvirtual-scroller">Open in StackBlitz ⚡</a>
— StackBlitz imports the folder straight from GitHub, so every push
redeploys the example automatically.

## Features

- **A million rows, a dozen in the DOM.** The window between two spacers
  is all the browser holds; every operation is O(window). Watch the row
  counter while you fly through the list.
- **Scrolling is code.** A forked Lenis drives `translateY`; momentum,
  wheel and touch feel are tuned, not inherited, and the clamp comes from
  the computed content height.
- **Sizes are learned, jumps converge.** Rows are estimated until seen,
  measured once as they pass, and a jump re-pins its landing as the fresh
  window measures in.
- **Text selection over the data.** The anchor is an item index and a
  character offset, so the highlight survives row recycling and copy
  assembles rows that were never on screen together. Double click selects
  the word, triple click the row, a drag near either edge autoscrolls.
- **Touch selection drawn by the class.** A long press selects the word
  under the finger with two handles and a Copy chip; a handle drag
  extends; a flick carries the glide it interrupted, on Android as on iOS.
- **The pad follows the flick.** Adaptive padding covers the lerp gap and
  looks ahead by velocity, then rests at its base: three flick strengths
  showed 21, 28 and 35 blank frames before and zero after.
- **Reading creep.** Autoplay scrolls at a reading pace, the speed slider
  takes effect mid-glide, and a wheel, a flick or a thumb drag never
  fights it.
- **Capabilities, hosted.** Selection, touch and padding are their own
  classes reached through one `$`-getter each, and they see the scroller
  only through a small owner interface, so each has its own statics, its
  own spec and its own reason to exist.

## The contract lives on the class

The scroller's class carries the **whole component contract** as static
getters, beside the state it governs: prop types, prop defaults, the
fused runtime props object, emits. The namespace holds identity and the
types derived from the class. The SFC is pure wiring against it —

```ts
const props = defineProps(
  VirtualScroller.Class.props
) as unknown as VirtualScroller.Props<T>;

const emit = defineEmits(VirtualScroller.Class.emits) as VirtualScroller.Emits;
```

`defineProps` receives a plain runtime object, fused by
[`propsWithDefaults`](/guide/extensible-components), and the cast
recovers the generic `<T>` a runtime map cannot carry. A subclass
component composes its surface with `super`: `HorizontalVirtualScroller`,
the same class rotated through its axis seams, inherits every prop and
states its one difference in one override:

```ts
static override get propsDefaults(): typeof VirtualScroller.$Class.propsDefaults {
  return {
    ...super.propsDefaults,
    assumedSize: 300 // cards are ~hundreds of px wide where rows are tens tall
  };
}
```

## Tuning the feel

Two props carry every knob, as nested objects. A page sets the leaf it
cares about and everything else keeps the tuned default, at any depth
(the mechanism is [`nestedProps`](/guide/props-and-defaults#nested-defaults-complete-at-every-depth)):

```vue
<template>
  <VirtualScroller
    v-model="items"
    :scroll="{ wheel: { gain: 1.6, maxPxPerMs: 6 } }"
    :selection="{ autoscroll: { touch: { rampMs: 1500 } } }"
  />
</template>
```

The full layout, with the tuned defaults:

```json
{
  "scroll": {
    "wheel": { "gain": 1,   "follow": 0.1, "maxPxPerMs": 0 },
    "touch": { "gain": 1.3, "follow": 0.08, "inertia": 40, "maxPxPerMs": 0 }
  },
  "selection": {
    "autoscroll": {
      "mouse": { "zonePx": 32, "restPx": 0,  "reachPx": 160, "minPxPerMs": 0.15, "maxPxPerMs": 2,   "rampMs": 0 },
      "touch": { "zonePx": 96, "restPx": 24, "reachPx": 0,   "minPxPerMs": 0.06, "maxPxPerMs": 0.9, "rampMs": 0 }
    }
  }
}
```

- **`gain`** is how far one wheel notch or one finger pixel moves the
  content. **`follow`** is how fast the transform chases its target,
  higher is snappier. **`inertia`** is how far a flick carries.
  **`maxPxPerMs`** caps the speed of any gesture, 0 is uncapped; a
  seek by name is never capped.
- **`autoscroll`** is the drag-to-select cadence per input: the zone
  inside each edge where scrolling begins, the band at the edge where
  the speed stops changing, how far past the edge it may keep rising,
  the two speeds, and **`rampMs`**, which lifts the speed toward the
  maximum the longer the pointer holds in the zone. 0 is off.

The knobs are live: change a leaf and the mounted scroller re-tunes.

## The Lenis fork, in the same shape

The scroll integrator is a vendored fork of Lenis in the same shape as
the classes above, with one deliberate difference: no `Reactive()`. Its
state is read every frame inside the window walk and never tracked. The
shape is the rest of the standard: one seam per module, `Class = $Class`,
statics for constants and pure maths, handlers as prototype methods bound
once, `protected` as the floor, types in the namespace. Its contract is
on the [specs page](/examples/virtual-scroller-specs).

<LazyCodeGroup
  :files="[
      { path: 'examples/playground/src/lenis/Lenis.ts', label: 'Lenis.ts' },
      { path: 'examples/playground/src/lenis/VirtualScroll.ts', label: 'VirtualScroll.ts' },
      { path: 'examples/playground/src/lenis/Animate.ts', label: 'Animate.ts' },
      { path: 'examples/playground/src/lenis/Dimensions.ts', label: 'Dimensions.ts' },
      { path: 'examples/playground/src/lenis/Emitter.ts', label: 'Emitter.ts' },
      { path: 'examples/playground/src/lenis/LenisUtils.ts', label: 'LenisUtils.ts' }
  ]"
/>

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

<LazyCodeGroup
  :files="[
      { path: 'examples/playground/src/examples/text-marquee/TextMarquee.ts', label: 'TextMarquee.ts' },
      { path: 'examples/playground/src/examples/text-marquee/TextMarquee.vue', label: 'TextMarquee.vue' },
      { path: 'examples/playground/src/examples/text-marquee/TextChunker.ts', label: 'TextChunker.ts' },
      { path: 'examples/playground/src/examples/text-marquee/TextMarqueeExample.ts', label: 'example' },
      { path: 'docs_v2/.vitepress/theme/components/examples/ExampleTextMarquee.vue', label: 'template' },
      { path: 'examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.ts', label: 'HorizontalVirtualScroller.ts' },
      { path: 'examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.vue', label: 'HorizontalVirtualScroller.vue' }
  ]"
/>

The scale math holds up to real books: 600k characters is ~1,500 chunks,
the scroll extent a few million pixels — inside the scroller's
origin-rebasing regime — and the DOM holds a dozen-odd `span`s at any
moment. Run it in the playground:

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Ftext-marquee%2FTextMarquee.ts&path=%2F%23%2Ftext-marquee">Open the marquee in StackBlitz ⚡</a>
