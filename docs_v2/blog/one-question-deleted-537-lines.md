---
title: 'One question deleted 537 lines'
description: A virtual scroller that reads as the browser's own on an iPhone and a Galaxy, exact to the fraction of a pixel. Then the three days of machinery one question made unnecessary.
date: 2026-09
tags: [story, performance, philosophy]
relatedPosts: [a-million-rows-twelve-divs, select-text-across-a-million-rows, measured-not-promised, win-by-reduction]
---

<script setup>
import ExampleAiChat from '../.vitepress/theme/components/examples/ExampleAiChat.vue'
</script>

# One question deleted 537 lines

![One question deleted 537 lines](/blog/one-question-deleted-537-lines.png)

<BlogPostDate />

```ts
// how every row height was recorded, for three days
const scale = rect.height / wrapper.offsetHeight; // 1149.625 / 1150 = 0.999674
```

One line. A fraction divided by a whole number. It made a virtual
scroller record every row three to six hundredths of a pixel taller
than the browser drew it, and it cost three days, four reverted
mechanisms and a settings knob with three positions before anyone
asked the question that made it visible.

I want to tell this one in order, because the order is the lesson.

## What we were trying to do

[ivue](/), a 1.1 kB class layer over Vue's reactivity, ships a
[virtual scroller](/examples/virtual-scroller): a list that holds a
million rows in twelve `div`s. The rows you can see are real DOM. The
rest is two spacer elements sized by arithmetic. Scrolling is not the
browser's own: a forked integrator computes a position every frame and
writes it as a `translateY` on the strip of live rows.

That last part is the whole difficulty. A browser scrolls on its
compositor thread and never asks the page for anything. A virtual list
scrolls on the main thread, has to mount rows before you reach them,
and has to measure each one after it appears, because a chat message is
as tall as its text. The goal was for a reader on a phone to be unable to
tell the difference.

The thread below is the test bed: a real 10,350-message Claude Code
session, every message a row, content fetched a page at a time as the
window reaches it. Scroll it on a phone.

<ClientOnly>
  <ExampleAiChat />
</ClientOnly>

## The symptom

On an Android phone, after a flick came to rest, a line of text would
drop one pixel. Not the whole screen. One line, sometimes two, one pixel
up or down, about every other scroll. On the iPhone beside it, nothing.

Subtle enough to doubt. Real enough to see on demand once you knew
where to look.

## Three days of the wrong question

The question I asked was: *what is the browser doing with the fraction?*

The scroller writes fractional positions, `translateY(-107293.6458px)`.
A compositor moving a rasterised layer by a fraction of a pixel has to
resample it. Chrome snaps each line of text to whole device pixels when
it rasterises, and a tile rasterised at one sub-pixel phase can disagree
with its neighbour rasterised at another. That is a true story about
browsers, and it was a complete explanation of the symptom. So we built
around it.

A snap policy at the write: `grid` rounds every position to the device
pixel, `fractional` never rounds, `auto` rounds only above one device
pixel of motion per frame. A knob to choose. A row of buttons in the docs
to feel the difference on the device. Probe numbers arguing that
fractional was the expensive one.

Then measurement, because the knob did not remove the line shift. Every
frame of a glide instrumented at the source. The moment the glide came
to rest, caught: a half-pixel jump onto the grid with nothing else
moving, my own rule, reverted. A claim that fresh tiles were the
trigger, so the two frames after any window change took the grid: built,
measured, fixed nothing, reverted. The render pad releasing rows at rest
was found to move every surviving row by exactly **3/64 of a pixel**, so
the release was moved to the next moving frame, where nothing can be
seen: shipped, and it stopped the iPhone unloading rows. Reverted.

Every one of those was reasoned. Every one had a measurement behind it.
Every one was about the costume.

## The question

> "Don't you already know the heights? Why is there a 3/64 px diff at all?"

That was the user, not the instruments. The scroller records each row's
height when it mounts, so the geometry knows to the pixel what the
spacers should be. If the model knows the heights, releasing rows into a
spacer should move nothing. The residual was not the browser rounding.
It was the model disagreeing with the browser about the heights.

Five rows, one `getBoundingClientRect`, thirty seconds:

```
row       laid out    recorded    error
10343     191.3750    191.4374    +0.062
10344     149.1875    149.2362    +0.049
10345     102.5000    102.5334    +0.033
10346     169.9063    169.9617    +0.055
```

Every laid-out height is an exact multiple of 1/64 px, which is how
Chrome's layout engine counts. Every recorded height is not. The
difference is the line at the top of this post. The scroller divides
each measured height by a "wrapper scale" meant to undo an ancestor CSS
transform, and that scale is the wrapper's fractional rect height over
its `offsetHeight`, which is an integer. A wrapper 1149.625 px tall
reads as scaled by 0.999674. Every row in the wave gets divided by it.

In plain words: the ruler was off by a hair, and every measurement made
with it was off by the same hair. Fold three mis-measured rows back into
a spacer and the spacer is three hairs too tall. The content below moves
by three hairs. That is 3/64 px. Nobody can see 3/64 px move. What they
see is the raster that follows, snapping each line of text to the grid
from a new position: the lines that sat near a boundary hop, the rest do
not.

The fix is four lines. A transform moves the wrapper by many pixels;
rounding moves it by at most half of one. Under a pixel of difference,
the scale is 1.

## What fell out

Recorded heights equal laid-out heights on every row, `off: 0`. The same
at-rest release of four rows moves zero surviving rows. Both phones
tested by hand: no line shifts, on either, in any setting.

And then the part that makes it a story about reasoning rather than a
bug fix. With the heights exact, `fractional` had no downside left. The
observation the snap knob existed to hide had been the height error the
whole time: rows "whose layout tops carry different fractions" were rows
recorded a hair off, moving against their neighbours at every window
change. The knob, its three modes, the landing snap, the argument every
position write in the codebase had been carrying, the row of buttons,
and the plain-browser comparison chat we had mounted under the example
to judge against: **537 lines out, 50 in**, across 13 files, and the
scroller behaves identically.

The scaffolding was a monument to the costume.

## What it reads as now

Same flick on both devices, judged by hand against the browser's own
scrolling, sub-pixel positions written to the fraction and never
rounded on the way from the model to the layer. Two knobs stayed,
because they turned out to be about the phones and not about the bug:
how far a flick carries (the browser's own fling measures at about 16
frames of the finger's speed; the scroller ships 35 and offers both), and
how it comes to rest. An exponential ease reads as an iPhone. A
constant-friction stop reads as Android. Both stay live in the strip
above the thread.

The numbers that survived: the DOM holds a few dozen rows of a
10,350-message thread; the recorded height of every row matches layout
to 1/64 px; and on both phones the scroller is indistinguishable from
native by the only instrument that counts for that claim, which is a
thumb.

## The shape of it

I had every instrument pointed at the browser. Tracing, per-frame
capture, a PNG decoder written to measure glyph edges at sub-pixel
phases, a synthetic page to isolate line-height quantisation. All of it
measured the costume with great precision. None of it asked whether the
model's own inputs matched the thing it was modelling.

The right question is not a clever one. It is the one that asks about
what must be true before it asks about what is happening. *Do we know the
heights?* We did. We were reading them wrong, and every mechanism we
built on top was reasoning carefully about a fraction that was never the
problem.

This is the way of working that produced ivue and keeps shrinking it:
ask what reality requires, delete what it does not, keep what survives.
It made a 1.1 kB engine. Here it made 537 lines disappear in a
morning. It is coming as its own thing, and it is bigger than the
library.

When a mechanism exists to hide an observation rather than explain it,
check the inputs first. The observation may be a bug wearing the costume
of a trade-off.
