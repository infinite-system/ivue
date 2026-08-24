---
title: 'A million rows, twelve divs'
description: A 1,000,000-row list where scrolling itself is virtual — Lenis owns position and momentum, the DOM holds a dozen rows between two spacers, and every operation is O(window). One 1,199-line ivue class runs all of it, live on this page.
date: 2026-07
tags: [performance, patterns]
relatedPosts: [twenty-million-cells, measured-not-promised, reactivity-is-an-allocator, one-kilobyte-feature]
---

<script setup>
import ExampleVirtualScroller from '../.vitepress/theme/components/examples/ExampleVirtualScroller.vue'
</script>

# A million rows, twelve divs

![A million rows, twelve divs](/blog/a-million-rows-twelve-divs.png)

<BlogPostDate />

The browser's native scrollbar has one requirement you cannot negotiate
away: to scroll a tall document, the DOM has to *be* tall. Scroll
position is a fraction of real layout height — there is no native way to
say "behave as if this list were fifty million pixels" without building
fifty million pixels.

At a million rows, that requirement stops being expensive and starts
being impossible. A million rows at ~50 px each is a fifty-million-pixel
strip — beyond the layout-height caps some engines enforce outright, and
past the point where any of them behave well. Long before the cap you
pay for it: a giant compositor layer scrolled on the browser's schedule,
native scroll anchoring fighting your row recycling, rubber-banding and
momentum physics you cannot see into, and a scrollbar thumb whose
geometry the browser owns.

So this list fires the browser from the job.

> Scroll position stops being a byproduct of layout and becomes program
> state — one number the application owns. Everything downstream of that
> number is derivation.

**Scrolling is virtual.** A customized
[Lenis](https://github.com/darkroomengineering/lenis) synthesizes the
physics — wheel, touch, momentum, easing — and writes a single position
value. That value drives a `translateY` on a thin strip of real rows;
the scroll *range* comes from a computed content height, not from any
element's size. The DOM holds about a dozen rows between two spacer
`div`s, and the compositor layer stays small no matter how long the
list claims to be. Wheel through it, drag the bar, jump to the middle —
and watch the rows-in-DOM counter hold:

<ClientOnly>
  <ExampleVirtualScroller />
</ClientOnly>

## The estimate that converges

Rows have real, varying heights — but measuring a million of them up
front would be O(total), the exact cost this design exists to refuse.
The resolution is an architecture of estimates:

- **A row's position is a prefix sum over measured heights that is
  never materialized as an array.** A movable cursor evaluates it
  lazily from the nearest known point — ask for row 612,400 and it
  walks estimates, not memory.
- **Heights are captured one-shot** as rows enter the window; a row the
  user never reaches is never measured, and a measured row never pays
  again.
- **Every operation is O(window).** Scrolling, jumping, resizing,
  re-measuring — cost tracks the dozen rows on screen, never the
  million in the model.

The honest consequence is visible in the demo: jump deep into the list
and the landing *converges* — the fresh window measures in, the
estimate corrects, the rows settle. An estimate refined by reality,
in front of you, in two frames. That is not a glitch being hidden; it
is the contract being kept: precision is paid for exactly where the
user is looking, nowhere else.

## One class runs all of it

Everything above lives on **one ivue class** — 1,199 lines,
`VirtualScroller`, exported through the
[namespace pattern](/guide/namespace-pattern) like everything else:

- **Template refs** (`scrollElement`, `itemsWrapperElement`) as
  ref-getters the SFC destructures for `ref=""` bindings.
- **Prop reads** (`items`, `assumedHeight`, `paddingQuantity`) as plain
  getters — leaf-tracked, zero bytes per instance.
- **Derived geometry** — `estimatedItemHeight`, the leading and
  trailing spacer heights, `scrollHeight`, `visibleItems` — as plain
  getters over the measurement state, recomputed only when a
  `geometryVersion` signal says the ground truth moved: the
  [keyed-version-signal pattern](/guide/keyed-version-signals) keeping
  a million-item model out of the dependency graph.
- **The Lenis lifecycle** in the constructor — which runs synchronously
  in `setup()`, so the whole thing wires against the component and is
  torn down by the component scope on unmount. No `init()`, no
  `dispose()` to forget.

This is not a demo component. The class is extracted from production,
where it drives feeds this size daily — the blog post is the tour, and
the machine is real.

## Run it, read it, fork it

The full tabbed source — the 1,199-line class, the SFCs, the types — is
on the [Virtual Scroller example page](/examples/virtual-scroller),
with an Open-in-StackBlitz link that boots the standalone app straight
from the repo. The demo above and that page import the same files: what
you read is what just scrolled.
