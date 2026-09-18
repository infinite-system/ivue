---
title: 'Example: Scroll Flight — three worlds, two planes in 3D, a flock on the GPU, and pictures the list makes room for'
description: "The scroll stage extended into a flight through three worlds: mountains under snow, a beach with palms and a sea, a rain forest in the rain, each at its own time of day. A jet flies into the screen and a seaplane out of it, both built in real 3D from CSS planes; a flock of birds is drawn by WebGL and scatters at a tap. Between chapters the list makes room for a picture or a video, pulled in as the empty span fills the frame, held, and gone as the next paragraph arrives. Every scroll-linked layer is a transform the compositor plays alongside the scroll's own sequence."
aside: false
pageClass: benchmarks-wide examples-page examples-bleed
relatedPosts: [99-7-and-100-are-worlds-apart, subpixel-perfect-scrolling, a-million-rows-twelve-divs]
---

<script setup>
import LazyCodeGroup from '../.vitepress/theme/components/LazyCodeGroup.vue'
import ExampleScrollFlight from '../.vitepress/theme/components/examples/ExampleScrollFlight.vue'
</script>

# Scroll flight: three worlds, two planes, a flock, and pictures the list makes room for

<ClientOnly>
  <ExampleScrollFlight />
</ClientOnly>

Read, or let it read itself. Each chapter is a world at its own time of
day: mountains under snow, a beach with palms and a sea, a rain forest in
the rain. A jet comes in low over your shoulder and climbs away into the
pass. A seaplane appears over the horizon and comes at the beach until it
fills the frame. A flock crosses, and scatters when you tap the sky. At
the end of every chapter the list makes room, and a picture — once, a
video — is pulled into the empty space, holds while you scroll through
it, and is gone before the next paragraph arrives. Nothing on the stage
reads the scroll position.

## Two clocks, split by what moves with what

The [scroll stage](/examples/scroll-stage) established the rule: a layer
that moves with the scroll is a track over the scroll's own sequence, so
the compositor samples it and the text on one vsync and they cannot drift.
The flight keeps that rule and adds the other half of it. A wingbeat does
not move with the scroll. Nor does rain, or a propeller, or a video. They
move with time, so each gets a clock of its own: a WebGL canvas drawing
the flock every frame, a CSS animation on the rain and the propeller, the
video element's own playback. The split is by what a motion is linked to:

- **Scroll-linked, on the compositor.** The ridges' rise, the snow with
  them, the clouds' drift, the palms' lean, the sun's arc, both planes'
  whole crossing in perspective, where the flock's window sits, and where
  a picture is and how present it is. Each is a formatter over the one
  number, composed alongside the scroll's animation.
- **Time-linked, on their own frame.** The wingbeat, a startle, the rain,
  the waves, the propeller, the video. The layer they live on is moved as
  one; what happens inside it is its own business.

## The planes are real 3D

Each plane is a group of CSS planes under `transform-style: preserve-3d`:
a fuselage, two wings turned flat into the horizontal, a tailplane, a
fin, engines or floats, a propeller disc spinning on its own clock. The
stage gives them a `perspective`, and the crossing is one transform:

```ts
// the model's nose points along +x: a yaw turns about y, a pitch about z, a bank about x
return `translate3d(${x}cqw, ${y}cqh, ${z}px) rotateY(${yaw}deg) rotateZ(${pitch}deg) rotateX(${bank}deg)`;
```

The jet's depth runs from +520 px, nearer than the screen, to −6000 px,
so it enters from below the frame's edge, large, and shrinks into the
pass until it is a dot: into the screen. The seaplane's runs the other
way, so it grows out of a dot at the horizon and leaves past the frame's
edge at its largest. Neither plane fades, because opacity below one
flattens a 3D model and the wings stand out of its plane; a crossing
enters and leaves by its path. The compositor plays a 3D transform as
readily as a flat one; there is nothing to interpolate in JavaScript.

## Pictures the list makes room for

An interlude is a row that carries media and renders as an empty span,
taller than the frame. While that span crosses the frame the stage shows
the media pinned behind it, and the whole thing is two tracks over the
scroll value:

- **Presence** is zero until the span has entered most of the frame,
  rises to one as the span fills it, holds while the span alone is in the
  frame, and falls from the moment the next row enters, so the picture is
  gone before the next paragraph is readable.
- **Position** rides with the empty span while presence is low, so the
  rows never cross the picture, and settles at the frame's centre as it
  comes fully in, from a slight zoom.

Two media slots alternate, like the scenes: a picture is fetched once,
and a video keeps playing while it is held. Adding an interlude is one
entry in a table and one row in the list:

```ts
static override get INTERLUDES(): ScrollStage.Interlude[] {
  return [
    { kind: 'image', src: '/blog/art/three-years-to-reduce-art-1.png', caption: 'Three years to reduce' },
    { kind: 'video', src: '/video/ivue-objects.mp4', caption: 'The object graph, on film' }
  ];
}
```

The base stage owns the mechanism; this page's class only fills the
table and closes each chapter with a row that points at the next entry.

## The stage, extended, not forked

The flight is one class extending the stage's. It inherits the slots, the
roles, the fade, the interludes and the handoff onto the compositor and
back, and adds what a flight needs by overriding what defines it: the
worlds and their palettes, smooth seeded skylines with a snow band and a
row of crowns for the canopies, and the extra tracks:

```ts
protected override buildTracks(stage) {
  const tracks = super.buildTracks(stage);   // the stage's own, media slots included
  // + per slot: 2 clouds, the island, the palms, 3 canopies
  // + once: the jet and the seaplane (a transform each), the flock (transform and opacity)
  return tracks;                              // 35
}
```

A chapter that crosses nothing of a kind parks that kind and holds its
opacity at zero; a crossing plays out over the chapter's text and is gone
before the interlude takes the frame. The count on the strip is the track
table's length, not a formula, so a subclass that adds a layer cannot get
it wrong.

## What it costs

Thirty-five tracks are thirty-five Web Animations, each built once per
flick — or once per two-second piece of a reading run — and played by the
compositor. Correctness does not change with the count; memory does. A
composited layer is a raster the size of its element, so the ceiling is
how many full-frame layers the GPU holds. The heaviest things on the
stage are the two skies and the two media slots, and there are always
exactly two of each.

<LazyCodeGroup
  :files="[
      { path: 'examples/playground/src/examples/scroll-flight/ScrollFlight.ts', label: 'ScrollFlight.ts' },
      { path: 'examples/playground/src/examples/scroll-flight/BirdFlock.ts', label: 'BirdFlock.ts' },
      { path: 'docs_v2/.vitepress/theme/components/examples/ExampleScrollFlight.vue', label: 'ExampleScrollFlight.vue' },
      { path: 'examples/playground/src/examples/scroll-stage/ScrollStage.ts', label: 'ScrollStage.ts (the base)' }
  ]"
/>
