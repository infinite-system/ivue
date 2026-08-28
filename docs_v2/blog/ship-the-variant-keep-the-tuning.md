---
title: 'Ship the variant, keep the tuning'
description: 'A production virtual scroller, hand-tuned for years, became a horizontal card strip and a book-length text marquee — and the whole diff is eight getters and one prop. How class extension keeps the hard 80% shipped once.'
date: 2026-08
tags: [patterns, performance]
relatedPosts: [a-million-rows-twelve-divs, inheritance-exile, the-options-api-everyone-wanted, one-kilobyte-feature]
---

<script setup>
import ExampleTextMarquee from '../.vitepress/theme/components/examples/ExampleTextMarquee.vue'
</script>

# Ship the variant, keep the tuning

![Ship the variant, keep the tuning](/blog/ship-the-variant-keep-the-tuning.png)

<BlogPostDate />

Every codebase has one component that took years to get right. Ours is
a [virtual scroller](/examples/virtual-scroller): a million rows, a
dozen divs, scroll physics driven by a customized Lenis instead of
native scroll. The feel is hand-tuned: a prefix-sum cursor that never
walks the whole list, a creep integrator that glides at fractional
pixels, origin rebasing that keeps the GPU in its precision comfort
zone. Call it the hard 80%.

Then you need it horizontal.

In most codebases that sentence starts a fork. Copy the file. Rename
it. Change every `height` to `width`, every `top` to `left`, every
`deltaY` to `deltaX`. Now there are two files, and every future fix
must remember to visit both. The fork is where tuning goes to rot.

Here is what the horizontal version actually cost:

```ts
class $HorizontalVirtualScroller<T> extends VirtualScroller.$Class<T> {
  protected override get lenisOrientation() { return 'horizontal'; }
  protected override get lenisGestureOrientation() { return 'horizontal'; }
  protected override get lenisIgnoreNativeScroll() { return true; }
  protected override offsetSize(el) { return el?.offsetWidth ?? 0; }
  protected override rectSize(el) { return el.getBoundingClientRect().width; }
  protected override transformFor(px) { return 'translateX(' + px + 'px)'; }
  protected override get axisPaddingProps() { return ['padding-left', 'padding-right']; }
  protected override axisDelta({ deltaX }) { return deltaX; }
}
```

Eight getters and methods. The cursor math, the render-bias rebasing,
the snap policy, the creep integrator, the seek-and-converge loop, the
tuned 80%, all run unchanged, sideways.

> The hard part ships once. A variant pays only for its difference.

## Seams, not switches

The base class is an ivue class — ivue is a 1.1 kB class layer over
Vue's reactivity that lets components be plain classes. Plain classes
extend. That is the whole trick, but it only works if the base is
written for it.

The scroller touches the DOM's geometry in exactly eight places: which
dimension to read, which transform to write, which wheel delta to obey,
which paddings count toward the scroll extent. Each of those places is
a `protected` getter or method with the vertical answer as its body.
We call them axis seams.

The simple version: the scroller never says "height" directly. It asks
itself "how big is this, along my axis?", and a subclass changes the
answer without touching the question.

Every override says so out loud. TypeScript's `noImplicitOverride`
option makes the `override` keyword mandatory, so a seam cannot be
overridden silently — and if the base ever renames a seam, every
subclass breaks at compile time instead of quietly falling back to the
vertical behavior.

A seam is not a mode flag. There is no `direction: 'horizontal'` prop
threading `if` branches through a thousand lines. The base class has
zero awareness that a horizontal variant exists. That is what keeps the
tuned code untouched: extension adds a layer, it never edits one.

One of the eight seams carries a behavior decision worth naming. The
horizontal strip obeys `deltaX` only. A plain vertical wheel passes
through to the page, and only a sideways gesture (shift+wheel, trackpad
swipe) drives the strip. A horizontal element that hijacks vertical
scrolling is how you make readers hate a page.

## The props inherit too

A component is not just its class. It is also its contract: props,
defaults, emits. If the class extends but the props are locked inside a
`withDefaults(defineProps<T>())` macro, the variant re-declares the
whole surface by hand, and the fork sneaks back in through the
front door.

So the contract lives beside the class, as plain data in the same
namespace, and the variant composes it the way the class composes
behavior — by spreading and overriding:

```ts
export namespace HorizontalVirtualScroller {
  export const propsTypes = { ...VirtualScroller.propsTypes };
  export const propsDefaults = {
    ...VirtualScroller.propsDefaults,
    assumedSize: 300 // cards are hundreds of px wide; rows were tens tall
  };
  export const props = propsWithDefaults(propsDefaults, propsTypes);
}
```

Every prop inherited. One default overridden, with the reason on the
line. The SFC becomes pure wiring — `defineProps(X.props)` receives a
runtime object, and the resolved TypeScript type is derived from that
same object, never written twice. The full pattern is in the
[Extensible Components guide](/guide/extensible-components).

## The proof: a book as one scrolling line

Extension proves the seams. Composition proves the component. So we
pointed the horizontal scroller at something it was never built for: a
~400,000-character text, scrolling as a single unbroken line.

The scroller never learns it is scrolling a book. A separate
`TextChunker`, a pure static class with no reactivity, cuts the text into
~400-character chunks at word boundaries, each chunk keeping its
trailing space so side by side they concatenate back exactly. Chunks
become items. Items become five `<span>`s in the DOM at any moment,
because that is all the visible strip needs.

The numbers, measured with Playwright on a Linux VM (a slow
environment; your laptop does better): 401,789 characters, 1,010
chunks, 5 in the DOM, gliding at a measured 50.2 px/s against a 50 px/s
setting, on a 16.7 ms frame cadence. The glide is the scroller's own autoplay creep, the same
integrator that paces article reading, with its speed exposed as a
prop. Drag the slider mid-glide and the speed changes without a
restart, because the integrator reads the live value every frame.

Two details came out sharper than expected:

**Exact sizes are cheap.** Virtual scrolling estimates the size of
unseen items, and estimates drift — ours ran about 1% small per chunk,
which compounds across a thousand chunks into a chunk and a half of
book hiding past the end of the scroll. The fix was not a better
estimate. `measureText` on a canvas returns the exact pixel width of an
unwrapped line, microseconds per chunk, and it matches the DOM to
0.1 px. The marquee measures every chunk up front and seeds the
scroller's size map. The end of the book now lands exactly at the edge
of the visible strip — verified to the pixel.

**Motion this smooth needs a transform, not a scrollbar.** Native
scrolling quantizes position to device pixels. The creep writes
fractional positions into a composited transform. At 50 px/s that is
under a pixel per frame — whole-pixel scrolling cannot even represent
that speed as smooth motion, but the compositor filters the fractions
into a true constant-velocity glide. The same real-valued position model is
why a wheel flick hands off cleanly: the fling decays *to* cruise speed
and the creep adopts the scroll at that exact speed, mid-decay. It
never stalls to zero and restarts.

Here it is, running the shipped engine:

<ClientOnly>
  <ExampleTextMarquee />
</ClientOnly>

Shift+wheel scrubs it. The bar underneath drags, and it lands where it
points, including the true end. A plain vertical wheel scrolls this
page, untouched.

## What this buys you

The vertical scroller shipped years of tuning. The horizontal strip
inherited all of it for eight overridden members. The marquee composed
the horizontal strip with a hundred lines of pure text machinery. Each
layer paid only for what it changed, and every fix to the base, past
and future, lands in all three.

That is the argument for classes as the unit of component authoring,
made with receipts instead of ideology. Composables share logic, but
they cannot take a *finished, tuned component* and produce a variant
that tracks the original. Extension can, when the component is a
class, its geometry passes through seams, and its contract is data.

> Write the hard 80% once. Let every variant subclass it.
