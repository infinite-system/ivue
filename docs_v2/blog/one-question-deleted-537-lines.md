---
title: 'One question deleted 537 lines'
description: A virtual scroller that feels like the browser's own on an iPhone and a Galaxy, exact to a fraction of a pixel. Then the 3 days of machinery one question made unnecessary.
date: 2026-09
tags: [story, performance, philosophy]
relatedPosts: [99-7-and-100-are-worlds-apart, subpixel-perfect-scrolling, a-million-rows-twelve-divs, select-text-across-a-million-rows, measured-not-promised, win-by-reduction]
---

<script setup>
import ExampleAiChat from '../.vitepress/theme/components/examples/ExampleAiChat.vue'
</script>

# One question deleted 537 lines

![One question deleted 537 lines](/blog/one-question-deleted-537-lines.png)

<BlogPostDate />

```ts
// how every row height was recorded, for 3 days
const scale = rect.height / wrapper.offsetHeight; // 1149.625 / 1150 = 0.999674
```

1 line. A fraction divided by a whole number. It made a virtual scroller
record every row 0.03 to 0.06 px taller than the browser drew it. It cost
3 days, 4 reverted mechanisms and a settings knob with 3 positions before
anyone asked the question that made it visible.

I want to tell this one in order, because the order is the lesson.

## What we were trying to do

[ivue](/), a 1.1 kB class layer over Vue's reactivity, ships a
[virtual scroller](/examples/virtual-scroller). It holds a million rows in
12 `div`s. The rows you can see are real DOM. The rest is 2 empty
elements sized by arithmetic. The browser does not scroll it. A small
scroll engine computes a position every frame and writes it as a
`translateY` on the strip of live rows.

That is the whole difficulty. A browser scrolls on its own thread and
never asks the page for anything. A virtual list scrolls on the main
thread. It has to mount rows before you reach them, and it has to measure
each one after it appears, because a chat message is as tall as its
text. The goal: a reader on a phone cannot tell the difference.

The thread below is the test bed: the [AI chat example](/examples/ai-chat),
built with the [Infinite Malleability Kit](/guide/malleability). It is a
real Claude Code session with 10,350 messages. Every message is a row. Content is fetched a page at a
time as the window reaches it. Scroll it on a phone.

<ClientOnly>
  <ExampleAiChat />
</ClientOnly>

## The symptom

On an Android phone, after a flick came to rest, a line of text would
drop 1 pixel. Not the whole screen. 1 line, sometimes 2, 1 pixel up or
down, about every other scroll. On the iPhone beside it, nothing.

Small enough to doubt. Real enough to see on demand once you knew where
to look.

## 3 days of the wrong question

The question on the table was: *what is the browser doing with the fraction?*
I was working this with an AI agent, and that was the agent's question. It
was a good one. It was also the wrong one, and for 3 days I did not stop it.

The scroller writes fractional positions, like `translateY(-107293.6458px)`.
To move a drawn layer by a fraction of a pixel, the browser has to
resample it. Chrome also snaps each line of text to whole device pixels
when it draws, and 2 neighbouring tiles drawn at different fractions can
disagree. That is a true story about browsers. It explained the symptom
completely. So we built around it.

We added a snap setting at the write. `grid` rounds every position to the
device pixel. `fractional` never rounds. `auto` rounds only when the
content moves more than 1 device pixel per frame. A knob to choose. A row
of buttons in the docs to feel the difference on the device. Probe numbers
that said fractional was the expensive one.

Then we measured, because the knob did not remove the line shift. Every
frame of a glide, recorded at the source. We caught the moment the glide
came to rest: a half-pixel jump onto the grid with nothing else moving,
a rule the agent had added that same morning, reverted. We tried a claim
that fresh tiles were the trigger,
so the 2 frames after any window change took the grid: built, measured,
fixed nothing, reverted. We found that releasing spare rows at rest moved
every remaining row by exactly **3/64 px**, so we moved the release to the
next moving frame, where nothing can be seen: shipped, and it stopped the
iPhone from unloading rows. Reverted.

Every one of those was reasoned. Every one had a measurement behind it.
Every one was about the costume.

## The question

> "Don't you already know the heights? Why is there a 3/64 px diff at all?"

That was me. Not the tracing, not the per-frame capture, not the agent
with 3 days of numbers. I had no instrument at all, only the thought that
we were arguing about the browser's rounding while our own model claimed
to know the heights. The scroller records each row's
height when it mounts. So the model knows to the pixel what the spacers
should be. If the model knows the heights, releasing rows into a spacer
should move nothing. The leftover was not the browser rounding. It was the
model disagreeing with the browser about the heights.

5 rows, 1 `getBoundingClientRect`, 30 seconds:

```
row       drawn       recorded    error
10343     191.3750    191.4374    +0.062
10344     149.1875    149.2362    +0.049
10345     102.5000    102.5334    +0.033
10346     169.9063    169.9617    +0.055
```

Every drawn height is an exact multiple of 1/64 px. That is how Chrome's
layout engine counts. Every recorded height is not. The difference is the
line at the top of this post. The scroller divides each measured height
by a "wrapper scale" meant to undo a CSS transform on a parent. That scale
is the wrapper's fractional height over its `offsetHeight`, which is a
whole number. A wrapper 1149.625 px tall reads as scaled by 0.999674.
Every row in the wave gets divided by it.

In plain words: the ruler was off by a hair. Every measurement made with
it was off by the same hair. Fold 3 mis-measured rows back into a spacer
and the spacer is 3 hairs too tall. The content below moves by 3 hairs.
That is 3/64 px. Nobody can see 3/64 px move. What they see is the redraw
that follows. It snaps each line of text to the grid from a new position.
The lines that sat near a boundary hop. The rest do not.

The fix is 4 lines. A transform moves the wrapper by many pixels.
Rounding moves it by at most half of one. Under 1 px of difference, the
scale is 1.

## What fell out

Recorded heights now equal drawn heights on every row: `off: 0`. The
same release of 4 spare rows at rest moves 0 remaining rows. Both phones
tested by hand: no line shifts, on either, in any setting.

Then the part that makes this a story about reasoning and not a bug fix.
With the heights exact, `fractional` had no downside left. The thing the
snap knob existed to hide had been the height error the whole time. Rows
"whose tops carry different fractions" were rows recorded a hair off,
moving against their neighbours at every window change. So out went the
knob, its 3 modes, the landing snap, the extra argument every position
write in the codebase had carried, the row of buttons, and the
plain-browser comparison chat we had mounted under the example to judge
against. **537 lines out, 50 in**, across 13 files. The scroller behaves
the same.

The scaffolding was a monument to the costume.

## What it feels like now

The same flick on both devices, judged by hand against the browser's own
scrolling. Positions are written to the fraction and never rounded on the
way from the model to the layer. (2 days later that last clause turned
out to be half right: the model keeps the fraction, and the write now
lands on the device-pixel grid. The snap I deleted here had been tested in
the 1 regime where it cannot show. The story continues in
[99.7% and 100% are worlds apart](/blog/99-7-and-100-are-worlds-apart).) 2 knobs stayed, because they turned out
to be about the phones and not about the bug. How far a flick carries:
the browser's own fling measures at about 16 frames of the finger's
speed; the scroller ships 35 and offers both. How a flick comes to rest:
an exponential ease feels like an iPhone, a constant-friction stop feels
like Android. Both are live in the strip above the thread.

The numbers that survived. The DOM holds a few dozen rows of a
10,350-message thread. The recorded height of every row matches layout to
1/64 px. On both phones the scroller is indistinguishable from native by
the only instrument that counts for that claim, which is a thumb.

## The shape of it

Every instrument was pointed at the browser. Tracing. Per-frame capture.
A PNG decoder written to measure glyph edges at sub-pixel offsets. A
synthetic page to isolate line-height rounding. All of it measured the
costume, with great precision.

None of it asked whether our own numbers were true.

That is the whole lesson, and it is older than software. Before you ask
what the world is doing, ask what you are claiming to know about it. *Do
we know the heights?* We did not. We had a ruler with a hair missing and
3 days of careful reasoning about what the hair was doing to the browser.

The right question is not clever. It points at the thing you already
believe. It costs nothing to ask. This one deleted 537 lines.

This is the way of working that produced ivue and keeps shrinking it. Ask
what must be true. Delete what reality does not require. Keep what
survives. It made a 1.1 kB engine. Here it made 3 days of machinery
vanish before lunch. It is coming as its own thing, and it is bigger than
the library.

A mechanism that hides an observation is hiding a mistake of yours. Check
the ruler before you argue about the world.
