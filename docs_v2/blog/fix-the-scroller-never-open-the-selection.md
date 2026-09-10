---
title: 'Fix the scroller, never open the selection'
description: 'One session, five scrolling bugs, each a one-line relation inside a 2,200-line class that sits beside 2,700 lines of selection, touch and padding code it never had to read. What a class boundary buys is a smaller search space, and the numbers from the hunt.'
date: 2026-09
tags: [architecture, patterns, performance]
relatedPosts: [select-text-across-a-million-rows, a-million-rows-twelve-divs, ship-the-variant-keep-the-tuning, templates-with-nothing-to-debug]
---

# Fix the scroller, never open the selection

![Fix the scroller, never open the selection](/blog/fix-the-scroller-never-open-the-selection.png)

<BlogPostDate />

Five scrolling bugs surfaced in one session on the chat example: a frame
loop that never stopped, a glide that never finished, a viewport left past
the last row, a blank strip at the bottom of a long scroll up, and one
frame where the rows landed 63,000 pixels away. Every one of them was a
one-line relation. Every one of them lived in the same 2,200-line file.
And that file sits beside 2,700 lines of selection, touch and padding
code that I never opened to find any of them.

That is the whole post. The rest is the receipts.

> A class boundary is a smaller search space.

## The size of the thing

The virtual scroller in the ivue playground is five classes, each an ivue
class, a plain `class $X` published through a namespace. ivue is a 1.1 kB
layer over Vue's reactivity that turns such a class into a reactive model
once, at load, and leaves the instances as plain objects.

| file | lines | owns |
| --- | --- | --- |
| `VirtualScroller.ts` | 2,200 | the window, the lerp, the spacers, the scrollbar |
| `VirtualScrollerSelection.ts` | 1,558 | a selection as a range over the data |
| `VirtualScrollerSelectionTouch.ts` | 735 | the long press, the handles, the copy chip |
| `VirtualScrollerPadding.ts` | 265 | the pad around the window |
| `HorizontalVirtualScroller.ts` | 128 | the other axis, through seam getters |

The selection alone is nearly the size of the scroller. Packed into one
class this would be a 4,900-line scroller, and the two most common edits
in it, a scroll fix and a selection fix, would share a file and a scroll
position.

They do not share a file because the selection reaches the scroller
through an owner interface, a few getters and methods the scroller
promises, and nothing else. The scroller does not import the selection's
class. The selection cannot see the scroller's lerp. That is a rule in the
scroller's invariants file with a spec bound to it, so it cannot drift.

Said plainly: the selection knows the scroller's front door, not its
rooms.

## Five bugs, one file

Each fix below is a spec now, and each spec fails on the code before it.

**The loop that never stopped.** A scroller nobody touched should cost no
frames. Counting `requestAnimationFrame` per second on the chat page: 0
before the first wheel, 60 during the glide, and 60 forever after. The
loop only parked itself in the autoplay path. It parks at rest now, and
the next input wakes it. Measured after: 0, 60, 0.

**The glide that never finished.** The parking depended on Lenis saying it
was at rest, and it never did. Its lerp completed only when
`Math.round(value) === target`, and a target that had been shifted by a
fraction of a pixel, a rebased offset does that, could never round onto.
The animation ran forever at a velocity of a millionth of a pixel. It
completes within half a pixel of any target now.

**The viewport past the last row.** After a row resizes, the scroller
re-measures and restores the anchor row, the row under the reading edge,
so nothing above the reader jumps. That restore moves the position by
what changed above the anchor. When the last row shrinks, a streaming
reply whose partial markdown was taller than its final render, or a tall
card folded at the end, nothing above changes, so nothing re-clamped, and
the viewport rested on empty canvas below the last row. A clamp runs after
every re-measure now.

**The blank strip on a long scroll up.** The window walks from the lerp's
target, and the reader sees the animated position some hundreds of pixels
behind it. The rows between were padded as gap divided by the estimated
row size. Here the rows behind measured 35 to 86 pixels against a 160
pixel estimate, so four rows covered a fraction of a 504 pixel gap, and
the bottom 243 pixels went blank. The walk extends in pixels over the
measured sizes now.

**The frame 63,000 pixels away.** Rendered offsets are rebased by whole
chunks of 65,536 pixels so the compositor never sees a large number. The
loop rebased from the animated scroll, then its target write rebased again
from the target. When the two straddled a chunk boundary the bias flipped
mid-frame: the spacer took the new bias, the transform kept the old. A
position write that does not write the transform never rebases now.

The last two were found with a probe that wheels up 120 times and samples
whether mounted rows cover the viewport. Before: three uncovered frames.
After: none.

| probe, 120 wheel ticks up | before | after |
| --- | --- | --- |
| frames with the bottom uncovered | 2 (150 and 243 px) | 0 |
| frames with the rows a chunk off | 1 (63,387 px) | 0 |
| frames per second at rest | 60 | 0 |

## Why the file size was the finding

None of those five bugs was about ivue. They were about virtual scrolling
under a lerp, and no class layer changes the physics. What the layer
changed was where I had to look.

A one-line relation in 2,200 lines that are all about the same thing is a
bisect: sample the viewport, revert the file to yesterday, sample again,
read the loop. A one-line relation in 4,900 lines where the same file also
owns pointer capture and long-press timing is an afternoon of reading code
that cannot be the cause. I made that check once during the session, by
reverting only the scroller and Lenis files to the commit before the
day's changes and running the probe again. Same three frames. The bugs
were old. The check took one command because the files were the boundary.

The boundary held under pressure because the standard makes it the cheap
option, not the disciplined one. A capability is a class with an owner
interface. A seam is a getter. A section of a component is a role on a
kit. None of those cost anything at runtime, so there is never a moment
where merging things would be faster. Correctness came from the right
shape being the easy shape.

## The same shape on the other side

The chat that runs on this scroller was built the same way in the same
session, and it kept the count I care about most. The whole chat, the
thread, the index, the files panel with its diffs, the scrollbar peek, the
model picker, the settings, derives everything through plain getters. The
count as of the last commit:

| kind | count |
| --- | --- |
| plain getters | 397 |
| `computed()` | 3 |

All three computeds are the same forced case, a list handed to a virtual
scroller whose identity must be stable per filter state. Everything else
is a getter on a prototype, which costs zero bytes per instance and is why
a message row is a small object and not a small heap. That is also why the
code reads clean: there is nowhere for state plumbing to accumulate, so
what is left on the page is the domain.

Every feature added that day landed as a getter, a method, or an entry on
a seam. The scrollbar peek is a role on the chat's kit. The model picker
is a role on the composer's. The files panel's records are rows of its own
scroller. None of them touched a sibling. The pattern is written up in
[Infinite malleability](/guide/malleability); the selection's own design is
in [Select text across a million rows](/blog/select-text-across-a-million-rows).

## What to take

If a bug hunt makes you read code that cannot be the cause, the boundary
is in the wrong place. Move it to the concern, give the capability an
owner interface, and bind the rule to a spec so it stays there. Then the
next hunt is a bisect.

The class boundary is the search space.
