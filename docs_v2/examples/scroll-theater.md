---
title: 'Example: Scroll Theater — the bench'
description: "The test bench of the scroll theater: each primitive is exercised live as it lands. Ranges first — a row, a chapter, an anchor pair over a plain list, the three derivations read out every frame, and the aperture narrowed by sliders."
aside: false
pageClass: benchmarks-wide examples-page
---

<script setup>
import ExampleScrollTheaterLab from '../.vitepress/theme/components/examples/ExampleScrollTheaterLab.vue'
</script>

# Scroll theater: the bench

<ClientOnly>
  <ExampleScrollTheaterLab />
</ClientOnly>

The theater is being built one primitive per commit on top of the
[scroll stage](/examples/scroll-flight), and this page is where each is
tried before it carries a scene. The plan is in the repository under
`tasks/scroll-theater.md`.

## Ranges

A range is a stretch of the list from one row to another, resolved to
pixels through the scroller's own geometry. A row is a range one row long;
a chapter is a range of rows; an anchor pair names two rows. Three
derivations, each a pure function of the scroll value, so any number of
ranges animate at once, forwards and backwards, without an observer:

- **progress**, 0 at the range's start, 1 at its end, held outside;
- **presence**, how much of the aperture the range owns, over the smaller
  of the two heights — a tall range is present once it fills the aperture,
  a short row once it is wholly inside; the last 60% of coverage is the
  fade in and out;
- **step**, progress quantised to n held states.

The aperture is the region of the frame the text is seen through, with a
focus line inside it. Narrow it above and watch presence follow the
aperture's edges, not the frame's.
