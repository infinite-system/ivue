---
title: 'Example: Virtual Scroller Specs & Contract'
description: 'Every colocated spec of the 1,000,000-row virtual scroller and the Lenis fork it drives, with the two contracts their generator headers bind to.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [select-text-across-a-million-rows, a-million-rows-twelve-divs]
---

# Virtual Scroller: Specs & Contract

The source is on the [virtual scroller](/examples/virtual-scroller) page.
This page holds what proves it: one colocated spec per class, each with a
generator header that binds it to the records below, and the contract the
subsystem is held to. The method is on [Testing & Invariants](/guide/testing).

## The scroller's specs and contract

::: code-group
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts [VirtualScroller.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.test.ts [VirtualScrollerSelection.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerSelectionTouch.test.ts [VirtualScrollerSelectionTouch.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.test.ts [VirtualScrollerPadding.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerItem.test.ts [VirtualScrollerItem.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerExample.test.ts [VirtualScrollerExample.test.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/hosted.ts [hosted.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md [virtual-scroller.invariants.md]
:::

## The Lenis fork's specs and contract

The scroll integrator is a vendored fork of Lenis, converted to the same
class shape as everything else here: one seam per module, statics for the
constants and the pure maths, handlers as prototype methods bound once.
Its own contract records what a finger is guaranteed on every phone.

::: code-group
<<< ../../examples/playground/src/lenis/Lenis.test.ts [Lenis.test.ts]
<<< ../../examples/playground/src/lenis/Animate.test.ts [Animate.test.ts]
<<< ../../examples/playground/src/lenis/VirtualScroll.test.ts [VirtualScroll.test.ts]
<<< ../../examples/playground/src/lenis/Dimensions.test.ts [Dimensions.test.ts]
<<< ../../examples/playground/src/lenis/Emitter.test.ts [Emitter.test.ts]
<<< ../../examples/playground/src/lenis/LenisUtils.test.ts [LenisUtils.test.ts]
<<< ../../examples/playground/src/lenis/lenis.invariants.md [lenis.invariants.md]
:::
