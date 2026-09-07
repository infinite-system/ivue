---
title: 'Example: Horizontal Scroller Specs & Contract'
description: 'The colocated specs of the horizontal strip and the text marquee it composes, with the marquee contract their generator headers bind to.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [a-million-rows-twelve-divs]
---

# Horizontal Scroller: Specs & Contract

The source is on the [horizontal scroller](/examples/horizontal-scroller)
page. The strip's spec asserts every seam names the x axis; the marquee's
two specs prove the chunker as a pure Static class and the marquee as
composition, against the marquee's own contract. The scroller's records,
which the strip inherits by construction, are on
[Virtual Scroller: Specs & Contract](/examples/virtual-scroller-specs); the
method is on [Testing & Invariants](/guide/testing).

::: code-group
<<< ../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.test.ts [HorizontalVirtualScroller.test.ts]
<<< ../../examples/playground/src/examples/text-marquee/TextChunker.test.ts [TextChunker.test.ts]
<<< ../../examples/playground/src/examples/text-marquee/TextMarquee.test.ts [TextMarquee.test.ts]
<<< ../../examples/playground/src/examples/text-marquee/text-marquee.invariants.md [text-marquee.invariants.md]
:::
