---
title: "The scrollbar is code"
description: A 100,000-row list where scrolling itself is virtual — Lenis drives position over translateY, the DOM holds a dozen rows, and nothing costs O(total).
date: 2026-07
---

<script setup>
import ExampleVirtualScroller from '../.vitepress/theme/components/examples/ExampleVirtualScroller.vue'
</script>

# The scrollbar is code

![The scrollbar is code](/blog/scrollbar-is-code.png)

The browser's scrollbar has one requirement you cannot negotiate away: to
scroll a tall document natively, the DOM has to *be* tall. At 100,000
rows that means a multi-million-pixel layer the compositor must carry,
native scroll anchoring fighting your virtualization, and physics you
don't control.

So this list fires the browser from the job. Scrolling is **virtual**: a
customized [Lenis](https://github.com/darkroomengineering/lenis) owns
position, momentum and touch feel, driving a `translateY` — while the DOM
holds a dozen rows between two spacer `div`s. The scroll range comes from
a *computed* content height, not from the DOM; the compositor layer stays
small no matter how long the list claims to be. Wheel through it, jump to
the middle, and watch the rows-in-DOM counter hold:

<ClientOnly>
  <ExampleVirtualScroller />
</ClientOnly>

The estimates architecture is the readable part: an item's position is a
prefix sum over measured heights that is **never materialized as an
array** — a movable cursor evaluates it lazily, heights are captured
one-shot as rows enter and leave the window, and every operation is
O(window), never O(total). The jump-to-row landing visibly *converges* as
the fresh window measures in — an estimate refined by reality, in front
of you.

All of it lives on **one ivue class**: template refs, prop refs, scroll
state, the windowing math, the Lenis lifecycle — constructed in
`setup()`, torn down by the component scope, hot-reloadable like
everything else. This is not a demo component; it's extracted from
production, where it drives feeds this size daily.

The full tabbed source — the ~1,200-line class included — is on the
[Examples page](/examples/), with an Open-in-StackBlitz link that runs the
standalone app straight from the repo.
