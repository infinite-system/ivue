---
title: 'Example: Virtual Scroller on Lenis'
description: 'Production-extracted 1,000,000-row virtual scroller driven by a customized Lenis — scroll math and momentum feel intact, full source on the page.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [select-text-across-a-million-rows, a-million-rows-twelve-divs, ship-the-variant-keep-the-tuning]
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

::: code-group
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScroller.ts [VirtualScroller.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScroller.vue [VirtualScroller.vue]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.ts [VirtualScrollerSelection.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerSelectionTouchCustom.ts [VirtualScrollerSelectionTouchCustom.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerSelectionTouch.ts [VirtualScrollerSelectionTouch.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.ts [VirtualScrollerPadding.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerItem.ts [VirtualScrollerItem.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerItem.vue [VirtualScrollerItem.vue]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerExample.ts [example]
<<< @/.vitepress/theme/components/examples/ExampleVirtualScroller.vue [template]
:::

Every class above has a colocated spec beside it, and the subsystem has a
contract the spec headers bind to — the method is on
[Testing & Invariants](/guide/testing).

::: code-group
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts [VirtualScroller.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.test.ts [VirtualScrollerSelection.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerSelectionTouchCustom.test.ts [VirtualScrollerSelectionTouchCustom.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerSelectionTouch.test.ts [VirtualScrollerSelectionTouch.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.test.ts [VirtualScrollerPadding.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerItem.test.ts [VirtualScrollerItem.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerExample.test.ts [VirtualScrollerExample.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/hosted.ts [hosted.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md [virtual-scroller.invariants.md]
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
- **Text selection is a range over the data.** A native selection is
  anchored to DOM nodes, and this list recycles its nodes, so the browser's
  selection collapses as soon as a row scrolls out and copy sees only what
  is mounted. Here the scroller owns it: mousedown records a logical anchor
  (item index + character offset), a drag near or past either edge
  autoscrolls at a speed that ramps with distance and follows the
  reading-speed knob, the
  highlight is re-pinned to whatever rows are mounted after every window
  change, and copy assembles its text from the items — rows that were
  never on screen together included. All of it lives in
  `VirtualScrollerSelection`, a hosted class the scroller reaches through
  one `$`-getter: the pure statics (range math, text assembly, the ramp)
  with their own DOM-free spec, the three cells, the mouse handlers, the
  autoscroll and follow loops. The scroller supplies what only it knows
  through a small owner interface: its elements, the axis, a row's text
  by index, and a way to scroll by a delta. On touch, a long press starts
  the selection (a `VirtualScrollerSelectionTouch` hosted by the selection owns
  the hold and the slop) and a chip copies it, since a phone has no
  Ctrl+C. A double click selects the word under the caret and a triple
  click the row, the browser's own units given back over the data.
  During any drag a per-frame follow loop keeps the focus under the
  pointer while content slides beneath it.
- **The pad follows the flick.** The window walk is anchored at the
  scroll target, the destination of the wheel lerp, while the transform
  travels there over many frames. A fixed pad leaves the rows between the
  two unmounted, and a hard flick showed blank canvas for a third of its
  frames. `VirtualScrollerPadding`, hosted through one `$`-getter, sizes
  the pad per walk: the lerp gap in rows on the trailing end, exact every
  frame, plus a velocity lookahead on the leading end held with
  hysteresis, and one more walk after the flick settles so the pad never
  outlives it. Measured on three flick strengths, 91 frames each: 21, 28
  and 35 uncovered frames before, zero after, and the window rests at its
  base size again within half a second.
- **The scrollbar is code.** `overflow-anchor: none` and a `translateZ`
  compositor layer keep the browser out of the way; Lenis takes its clamp
  from the computed content height, not the DOM.

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

`defineProps` receives a plain **runtime object** (types and defaults
fused by [`propsWithDefaults`](/guide/extensible-components)), so the
compiler never resolves a cross-file type inside a macro, and the cast
recovers the generic `<T>` precision a runtime map cannot carry. The
payoff is the same one the class hierarchy already has, because it IS
the class hierarchy: a subclass component composes its surface with
**`super`**. `HorizontalVirtualScroller` — the same tuned class rotated
sideways through its axis seams — inherits every prop and states its one
real difference in one override:

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
<<< ../../examples/playground/src/examples/text-marquee/TextMarqueeExample.ts [example]
<<< @/.vitepress/theme/components/examples/ExampleTextMarquee.vue [template]
<<< ../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.ts [HorizontalVirtualScroller.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.vue [HorizontalVirtualScroller.vue]
:::

The scale math holds up to real books: 600k characters is ~1,500 chunks,
the scroll extent a few million pixels — inside the scroller's
origin-rebasing regime — and the DOM holds a dozen-odd `span`s at any
moment. Run it in the playground:

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Ftext-marquee%2FTextMarquee.ts&path=%2F%23%2Ftext-marquee">Open the marquee in StackBlitz ⚡</a>
