# Shared FramePump — one rAF scheduler for N animating scrollers

**Status:** designed, deliberately deferred.
**Trigger:** dozens of concurrently ANIMATING scroller/marquee instances
on one page (a wall-of-marquees demo, a post player with many
auto-creeping strips). Today's worst page runs 2–3 rAF loops — below the
threshold, so building now is unproven labor.

## What it is

A `Static()` class (`FramePump`) holding a registry of animating
instances. Instances register while animating and unregister when
settled; the pump runs ONE `requestAnimationFrame` loop while the
registry is non-empty and stops when it empties. One pump per app,
statics read through `self` — the shared-store Static pattern
coordinating N `Reactive` instances.

## What it buys (in order of weight)

1. **Read/write phasing — the real argument.** Each scroller's frame
   path both writes (transform, spacer sizes) and reads layout
   (`offsetSize` in the clamp). Spacer writes dirty layout, so N
   instances animating in the same tick can interleave
   write → read → write → read: up to N forced layouts per frame.
   A coordinator runs the two-phase schedule — ALL reads, then ALL
   writes — collapsing that to at most one layout per frame regardless
   of N. Independent rAF loops structurally cannot do this.
2. **Lifecycle.** Offscreen instances (IntersectionObserver) don't tick;
   "who deserves a frame" is decided in one place instead of N little
   state machines.
3. **Budgeting/priority.** The visible marquee gets full cadence,
   below-fold strips half rate — and the pump composes with the
   ParagraphMeasurer idle pump (see paragraph-measurer.md): one
   scheduler owning the frame budget for animation AND measurement.

## What it does NOT buy

Frames. The browser already coalesces every rAF callback into one vsync
tick with one timestamp — ten loops ≠ ten frames, and clock consistency
already exists. Per-frame scheduling overhead of N registrations is
tiny. Do not sell the pump as "fewer frames"; sell it as phasing +
lifecycle + budget.

## Migration seams (already in place — no debt accruing by waiting)

The per-frame work already lives behind narrow methods on
`$VirtualScroller`: `creepStep` (autoplay integrator) and `loop` (lenis
raf while wheel-scrolling). Migration = instances hand those to the
registry instead of arming their own rAF. No redesign.
