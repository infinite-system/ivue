---
title: 'Example: Scroll Flight — a range, a plane in perspective, a flock on the GPU, composed on the scroll'
description: "The scroll stage extended into a flight: a time of day per chapter, a smooth skyline under haze, drifting clouds, a plane crossing in 3D perspective and a flock of birds drawn by WebGL. Every scroll-linked layer is a transform the compositor plays alongside the scroll's own sequence; the wingbeat, which is not scroll-linked, runs on the GPU's own clock. Tap the sky to startle the birds."
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [99-7-and-100-are-worlds-apart, subpixel-perfect-scrolling, a-million-rows-twelve-divs]
---

<script setup>
import LazyCodeGroup from '../.vitepress/theme/components/LazyCodeGroup.vue'
import ExampleScrollFlight from '../.vitepress/theme/components/examples/ExampleScrollFlight.vue'
</script>

# Scroll flight: a range, a plane, a flock, composed on the scroll

<ClientOnly>
  <ExampleScrollFlight />
</ClientOnly>

Read, flick, drag the thumb. Each chapter has a time of day, a skyline of
its own under the haze, clouds that drift, and something crossing the sky:
a flock, a plane coming through the pass in perspective, or both. Tap the
sky and the birds scatter and regroup. Nothing on the stage reads the
scroll position, and the birds' wings never read it at all.

## Two clocks, split by what moves with what

The [scroll stage](/examples/scroll-stage) established the rule: a layer
that moves with the scroll is a track over the scroll's own sequence, so
the compositor samples it and the text on one vsync and they cannot drift.
The flight keeps that rule and adds the other half of it. A wingbeat does
not move with the scroll. It moves with time. So it gets a clock of its
own: a WebGL canvas drawing the flock every frame, on its own
`requestAnimationFrame`, unaware that a scroll exists.

The split is by what a motion is linked to, never by what looks nicer:

- **Scroll-linked, on the compositor.** The ridges' rise, the clouds'
  drift, the sun's arc, the plane's whole crossing in perspective, and
  where the flock's window sits in the sky. Each is a formatter over the
  one number, composed alongside the scroll's animation. The plane is a
  `translate3d` with `rotateY` and `rotateZ` against the stage's
  `perspective`, and the compositor plays that as readily as a flat move.
- **Time-linked, on the GPU's own frame.** The wingbeat, the bob, and a
  startle when a hand comes down. The canvas is moved as one layer; what
  it draws inside is its own business.

A startle is the interactive case. A pointer on the frame does not touch
the scroll at all; it tells the flock where the hand came down, in the
formation's own square, and the birds burst away from that point and
regroup over the next second on their own clock. The near birds go
hardest. A drag still drags.

## The stage, extended, not forked

The flight is one class extending the stage's. It inherits the slots, the
roles, the fade, the handoff onto the compositor and back, and adds what
a flight needs by overriding what defines it:

```ts
class $ScrollFlight extends ScrollStage.$Class {
  static override get RIDGES() { /* smoother, taller */ }
  static override ridgePath(chapter, ridge) { /* quadratic curves through the seeded points */ }
  static override palette(chapter) { /* a time of day per chapter, ridges paling into the sky */ }

  planeTransform(value) {
    const local = this.localOf(value);
    if (!this.self.hasPlane(local.chapter)) return this.self.PLANE_PARKED;
    const p = local.progress;
    return `translate3d(${x(p)}cqw, ${y(p)}cqh, ${z(p)}px) rotateY(${bank(p)}deg) rotateZ(${roll(p)}deg)`;
  }

  protected override buildTracks(stage) {
    const tracks = super.buildTracks(stage);   // the stage's 13
    // + 2 clouds per slot, the plane twice, the flock twice → 21
    return tracks;
  }
}
```

Every track is a transform or an opacity over the scroll value. A chapter
that crosses nothing of a kind parks that kind and holds its opacity at
zero for every value in it; a crossing comes in over the chapter's first
12% and goes out with the chapter's fade. The count on the strip is the
track table's length, not a formula, so a subclass that adds a layer
cannot get it wrong.

## What it costs

Twenty-one tracks are twenty-one Web Animations, each built once per
flick from the same value list and played by the compositor. Correctness
does not change with the count; memory does. A composited layer is a
raster the size of its element, so the ceiling is how many full-frame
layers the GPU holds, not how many tracks the page composes. The flock is
one canvas, the plane one small element, the clouds two soft gradients
per slot. The heaviest thing on the stage is the two full-frame skies,
and there are always exactly two.

<LazyCodeGroup
  :files="[
      { path: 'examples/playground/src/examples/scroll-flight/ScrollFlight.ts', label: 'ScrollFlight.ts' },
      { path: 'examples/playground/src/examples/scroll-flight/BirdFlock.ts', label: 'BirdFlock.ts' },
      { path: 'docs_v2/.vitepress/theme/components/examples/ExampleScrollFlight.vue', label: 'ExampleScrollFlight.vue' },
      { path: 'examples/playground/src/examples/scroll-stage/ScrollStage.ts', label: 'ScrollStage.ts (the base)' }
  ]"
/>
