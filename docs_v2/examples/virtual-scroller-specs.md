---
title: 'Example: Virtual Scroller Specs & Contract'
description: 'Every colocated spec of the 1,000,000-row virtual scroller and the Lenis fork it drives, with the two contracts their generator headers bind to.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [select-text-across-a-million-rows, a-million-rows-twelve-divs]
---

<script setup>
import LazyCodeGroup from '../.vitepress/theme/components/LazyCodeGroup.vue'
</script>

# Virtual Scroller: Specs & Contract

The source is on the [virtual scroller](/examples/virtual-scroller) page.
This page holds what proves it: one colocated spec per class, each with a
generator header that binds it to the records below, and the contract the
subsystem is held to. The method is on [Testing & Invariants](/guide/testing).

## The scroller's specs and contract

<LazyCodeGroup
  :files="[
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScroller.test.ts', label: 'VirtualScroller.test.ts' },
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScrollerSelection.test.ts', label: 'VirtualScrollerSelection.test.ts' },
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScrollerSelectionTouch.test.ts', label: 'VirtualScrollerSelectionTouch.test.ts' },
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScrollerPadding.test.ts', label: 'VirtualScrollerPadding.test.ts' },
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScrollerItem.test.ts', label: 'VirtualScrollerItem.test.ts' },
      { path: 'examples/playground/src/examples/virtual-scroller/VirtualScrollerExample.test.ts', label: 'VirtualScrollerExample.test.ts' },
      { path: 'examples/playground/src/examples/virtual-scroller/hosted.ts', label: 'hosted.ts' },
      { path: 'examples/playground/src/examples/virtual-scroller/virtual-scroller.invariants.md', label: 'virtual-scroller.invariants.md' }
  ]"
/>

## The Lenis fork's specs and contract

The scroll integrator is a vendored fork of Lenis, converted to the same
class shape as everything else here: one seam per module, statics for the
constants and the pure maths, handlers as prototype methods bound once.
Its own contract records what a finger is guaranteed on every phone.

<LazyCodeGroup
  :files="[
      { path: 'examples/playground/src/lenis/Lenis.test.ts', label: 'Lenis.test.ts' },
      { path: 'examples/playground/src/lenis/Animate.test.ts', label: 'Animate.test.ts' },
      { path: 'examples/playground/src/lenis/VirtualScroll.test.ts', label: 'VirtualScroll.test.ts' },
      { path: 'examples/playground/src/lenis/Dimensions.test.ts', label: 'Dimensions.test.ts' },
      { path: 'examples/playground/src/lenis/Emitter.test.ts', label: 'Emitter.test.ts' },
      { path: 'examples/playground/src/lenis/LenisUtils.test.ts', label: 'LenisUtils.test.ts' },
      { path: 'examples/playground/src/lenis/lenis.invariants.md', label: 'lenis.invariants.md' }
  ]"
/>
