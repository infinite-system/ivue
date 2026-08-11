---
title: 'Three years to reduce, two weeks to build'
description: Two commit logs, one project. ivue - 597 commits over three years finding the generator. Invar - 3,109 commits in twenty days generating from it, starting the same day the engine reached its final form. Reduction is where the cost lives.
date: 2026-08
---

# Three years to reduce, two weeks to build

<BlogPostDate />

![Three years to reduce, two weeks to build](/blog/three-years-to-reduce.png)

Three dates, from two public git logs:

```
2023-07-19   ivue's first commit
2026-07-21   ivue@2.0.0 tagged — the engine's final form
2026-07-21   Invar's first commit — the same day
```

The library took **597 commits over three years** — roughly one commit
every other day. The editor built on it took **3,109 commits in twenty
days** — about 155 a day. A three-hundred-fold change of tempo, at a
boundary you can point to in the history: the day the substrate was
finished, construction began, and it never slowed down.

## The two phases were different kinds of work

The slow phase was not slow building. It was **reduction**: finding
which primitives a reactive class model actually needs, and discarding
everything else. Three years of trying shapes, breaking them, and
keeping only what survived — until the engine fit in
[1.1 kB](/blog/one-kilobyte-feature) and its runtime model fit in a
sentence. The commit rate was low because most of the work was
deletion, and deletion does not fill a log.

The fast phase was **generation**: applying the finished primitives,
over and over, at machine speed. [AI agents wrote almost all of
Invar](/blog/agents-built-an-editor) — 143,785 lines of TypeScript
(94,043 source, 49,742 tests), 35 invariant contracts, and on top of
that a verification harness the size of the product itself —
and could only do so because every class takes the same shape, every
seam sits in the same place, and the failure classes that eat agent
sessions (initialization order, unbound methods, memo discipline) had
been [removed by construction](/blog/the-constraint-that-unlocks)
years earlier.

The tempo did not change because the tools got faster. It changed
because the *kind of work* changed. Finding a generator is expensive.
Running one is nearly free.

## The conventional schedule, inverted

A ten-person team building an Invar-class IDE by hand prices out to
roughly three years. The same wall-clock elapsed here — but the
distribution inverted: the three years went into the substrate, and
the product took a fortnight. Same calendar, opposite shape.

That inversion is the practical claim of this post. The instinct under
deadline is to start building and let abstractions emerge. This
history argues the reverse allocation wins when machines do the
building: **spend your years on the thing that makes construction
cheap, then construct.** The reduction is reusable; the fortnight is
repeatable. Invar was the first two-week build on this substrate.
There is no reason it is the last.

## What one log can and cannot say

The three years bought domain knowledge too, and 2026 agents are
not 2023 agents — but neither explains the shape of the data: the
tempo change arrived **at the tag**, not gradually, and every
discipline metric [held at speed](/blog/the-zeros-didnt-move).
Whatever was finished on 2026-07-21, it was the thing that had been
missing.

Both logs are public. The dates are one `git log` away.
