---
title: 'Example: Scroll Stage — scenes composed on the scroll'
description: 'A pinned scene of 5 parallax layers, a sun on an arc and a progress bar over a 720-row virtual list — none of it listening to the scroll. Every layer is a track of the same sequence the text moves by, drawn by the compositor when the scroll is, written in the same callback when it is not.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [99-7-and-100-are-worlds-apart, subpixel-perfect-scrolling, a-million-rows-twelve-divs]
---

<script setup>
import LazyCodeGroup from '../.vitepress/theme/components/LazyCodeGroup.vue'
import ExampleScrollStage from '../.vitepress/theme/components/examples/ExampleScrollStage.vue'
</script>

# Scroll stage: scenes composed on the scroll

<ClientOnly>
  <ExampleScrollStage />
</ClientOnly>

Flick, drag, wheel, or press play and let it read. The scenery moves with
the text at 5 different speeds, the sun crosses the sky once every
24,000 px, and the bar at the bottom fills to the end of the list. Nothing
on the stage reads the scroll position. That is the point of the page.

## One clock per frame

A scene that listens to a scroll position is a side effect of whatever
loop wrote that position, and it inherits that loop's timing error,
multiplied by its own speed. The [virtual scroller](/examples/virtual-scroller)
moved its glide and its reading creep to the compositor for exactly that
reason: a frame is exact when the state it shows was computed for the
moment it is shown, and the only arrangement with no offset is the
presenter playing a sequence made for its own frames. The story is in
[99.7% and 100% are worlds apart](/blog/99-7-and-100-are-worlds-apart).

The stage follows the same rule, in both directions:

- **When the scroll hands the compositor a sequence** — a flick's glide,
  a chunk of the reading creep — the scroller emits it as an event with
  the animation and the values it was built from. The stage composes
  every track over those same values, aligned alongside that same
  animation on the document timeline. The compositor samples the text and
  the scenery on one vsync; they cannot disagree by a frame.
- **When the scroll is written from a callback** — a drag, a wheel — the
  stage writes its tracks in that same callback from the rendered
  position. Same clock, same offset, so the tracks agree with the text
  exactly.

The thing the stage never does is mix them. A JavaScript track beside a
compositor scroll would be two clocks, and two clocks drift.

## A track is a function of one number

Each layer declares what it does with the scroll value, and nothing else:

```ts
static get TRACKS(): ScrollStage.Track[] {
  return [
    { key: 'sky',    kind: 'parallax', factor: 0.06, period: 900 },
    { key: 'far',    kind: 'parallax', factor: 0.14, period: 720 },
    { key: 'mid',    kind: 'parallax', factor: 0.3,  period: 600 },
    { key: 'near',   kind: 'parallax', factor: 0.55, period: 480 },
    { key: 'ground', kind: 'parallax', factor: 0.85, period: 360 },
    { key: 'sun',    kind: 'arc' },
    { key: 'progress', kind: 'progress' }
  ];
}
```

A parallax layer moves at its fraction of the scroll and wraps where its
pattern repeats, so a 46,000 px extent never needs a 46,000 px layer. The
sun turns about a pivot at the bottom of the frame. The bar scales to the
fraction of the whole extent, which the scroller knows before the rows
have been measured. Adding a layer is one line here and one element with
a `data-track` in the template.

## The handoff

The whole composition is one call, the same one the scroller uses for
its own layer:

```ts
onSequence(sequence: Lenis.Sequence) {
  for (const [track, element] of this.trackElements()) {
    Lenis.Class.composeSequence(
      element,
      sequence.values,                          // the scroll's own keyframe values
      (value) => this.transformOf(track, value), // this layer's formatter
      { alongside: sequence.animation }          // same start, same clock
    );
  }
}
```

A held keyframe per distinct value for a glide, so every presented frame
is on the device grid; the two linear endpoints for the creep, where the
compositor's filtering of the fraction is the motion. When the scroll's
animation ends, is promoted, or is interrupted, its tracks go with it and
the stage is written from the rendered position again.

## Why this and not a scroll-trigger library

A scroll-linked animation library drives its tweens from a number it
reads back each frame. That is the callback path, and it is fine on a
desktop at even frame gaps. It cannot be handed to the compositor, so on
a phone it carries the same one-frame-in-twelve error the glide carried
before it moved. Here the choreography is the same kind of thing those
sites do, pinned scenes and layered parallax, built from the scroll's own
sequence instead of from a listener, so it inherits the scroll's
exactness rather than approximating it.

<LazyCodeGroup
  :files="[
      { path: 'examples/playground/src/examples/scroll-stage/ScrollStage.ts', label: 'ScrollStage.ts' },
      { path: 'docs_v2/.vitepress/theme/components/examples/ExampleScrollStage.vue', label: 'ExampleScrollStage.vue' },
      { path: 'examples/playground/src/lenis/Lenis.ts', label: 'Lenis.ts' },
      { path: 'examples/playground/src/lenis/presented-motion.generator.md', label: 'the generator' }
  ]"
/>
