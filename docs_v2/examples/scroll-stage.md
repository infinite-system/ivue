---
title: 'Example: Scroll Stage — a scene per chapter, composed on the scroll'
description: "Every chapter of a 720-row virtual list owns a scene: its own sky and skyline, 4 ridges at their fractions of the chapter's travel, a sun crossing once, fading into the next chapter's scene. None of it listens to the scroll. Every layer is a track of the same sequence the text moves by, drawn by the compositor when the scroll is, written in the same callback when it is not."
aside: false
pageClass: benchmarks-wide examples-page examples-bleed
relatedPosts: [99-7-and-100-are-worlds-apart, subpixel-perfect-scrolling, a-million-rows-twelve-divs]
---

<script setup>
import LazyCodeGroup from '../.vitepress/theme/components/LazyCodeGroup.vue'
import ExampleScrollStage from '../.vitepress/theme/components/examples/ExampleScrollStage.vue'
</script>

# Scroll stage: a scene per chapter, composed on the scroll

<ClientOnly>
  <ExampleScrollStage />
</ClientOnly>

Flick, drag, wheel, or press play and let it read. Every chapter has its
own sky: 4 ridges that move at their own fractions of the chapter's
travel, a sun that crosses once, a palette of its own. As a chapter ends
its scene fades into the next chapter's, and the bar at the bottom fills
to the end of the list. Nothing on the stage reads the scroll position.
That is the point of the page.

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
  the reading creep's run — the scroller emits it as an event with
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

## A scene per chapter, and why not a parallax

The first version of this page was a single parallax: layers wrapping at
their pattern's period over the whole list. It was wrong at the root. A
horizon has one skyline, and a layer that wraps stacks skyline over
skyline up the sky, which is exactly what it looked like. Taller tiles
would only have stretched the interval between the same mistake.

A scene must be bounded. Each chapter owns one: a seeded skyline and a
palette nobody drew by hand, ridges that rise by their fraction of the
chapter's progress over the tile's own overhang, so nothing wraps and no
edge shows whatever the chapter's span in pixels, and a sun that rises
and sets inside that chapter. Two slots alternate, the current
chapter in the slot of its parity and the next one waiting in the other,
so 60 chapters cost 2 scenes in the DOM. The fade between them is a
compositor track like the rest: an opacity that goes from 1 to 0 over the
chapter's last 22% while the other slot goes from 0 to 1.

## A track is a function of one number

Each layer declares what it does with the scroll value, and nothing else:

```ts
static get RIDGES(): ScrollStage.Ridge[] {
  return [
    { key: 'far',    factor: 0.12, base: 0.5,  amplitude: 0.22, points: 9 },
    { key: 'mid',    factor: 0.28, base: 0.62, amplitude: 0.16, points: 11 },
    { key: 'near',   factor: 0.5,  base: 0.74, amplitude: 0.1,  points: 13 },
    { key: 'ground', factor: 0.8,  base: 0.88, amplitude: 0.04, points: 7 }
  ];
}

ridgeTransform(slot, ridge, value) {
  const role = this.roleOf(slot, value);           // this slot's chapter at this value
  const rise = role.progress * ridge.factor * 40;  // over the tile's overhang, in cqh
  return `translateY(-${rise.toFixed(3)}cqh)`;
}
```

The chapter a value is in comes from the scroller's own row-at-offset
lookup, the chapter's start from its anchored position, and everything
after that is arithmetic on the progress through the chapter. The sun is
a translate in the stage's own units across the half the rows leave open.
Adding a ridge is one line here and one element in the template.

## The handoff

The whole composition is one call, the same one the scroller uses for
its own layer:

```ts
onSequence(sequence: Lenis.Sequence) {
  for (const track of this.trackList()) {
    Lenis.Class.composeSequence(
      track.element,
      sequence.values,                    // the scroll's own keyframe values
      track.formatOf,                     // this layer's formatter
      { alongside: sequence.animation,    // same start, same clock
        property: track.property }        // a transform, or a slot's opacity
    );
  }
}
```

Every track is interpolated between samples taken along the scroll's
sequence: a reading run is cut into two-second pieces sampled every
250 ms, a glide's own samples are taken every fourth, and a piece is cut
short at a chapter boundary so nothing steps inside one. Held keyframes
belong to the text layer, which is written on the device grid; a scenery
layer is not, and a track held at the compositor's step judders by its
speed on a panel presented at a lower rate. A track whose value does not
change over a piece is written once and composes nothing. When the
scroll's animation ends, is promoted, or is interrupted, its tracks go
with it and the stage is written from the rendered position again.

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
