---
title: 'Expressiveness is no longer a budget'
description: "Every Vue architecture rations expressiveness — inline the expression, flatten the model, split the editor from the player, keep it light. The rationing was never wisdom. It was a price list. Change the prices and the correlation between how expressive an app is and how heavy it is simply breaks."
tags: [philosophy, performance]
relatedPosts: [derivations-are-free, total-memory-control, one-kilobyte-feature, release-what-the-gc-cant, measured-not-promised]
date: 2026-08
---

# Expressiveness is no longer a budget

![Expressiveness is no longer a budget](/blog/expressiveness-is-no-longer-a-budget.png)

<BlogPostDate />

There is a correlation every frontend developer treats as physics:
the more expressive an app is, the heavier it runs. More derived
state, more memory. Richer models, slower creation. More capability
per component, more weight per component. Nobody voted for this; it's
just the water.

And because it's the water, everyone rations. Look at what passes for
discipline in a mature codebase and notice how much of it is
expressiveness being *withheld*:

- The condition stays inline in the template —
  `v-if="items.length && !loading && mode === 'edit'"` — because
  naming it would cost a `computed()`.
- The model stays flat, because every derived field is another 300
  bytes per instance.
- The editor lives in a separate component from the viewer, because
  carrying edit capability everywhere would make the common case
  heavy.
- The entity is a plain object with helper functions scattered around
  it, because a real model class "doesn't scale."

Each of these is taught as a best practice. Each one is actually a
*purchase decision* — a thing not expressed because expressing it had
a price. Which means the correlation was never physics. It was a
price list.

## The price list

In the conventional shape, every unit of expressiveness bills
per-instance, at creation, whether used or not:

| you want to express | it costs |
| --- | --- |
| a derived value | ~300 bytes of `computed()`, per instance, up front |
| a named condition | same — so it stays inline instead |
| a piece of state | a ref allocated the moment setup runs, touched or not |
| a capability (the edit half) | its whole state and derivation graph, paid by every viewer |
| another instance | the full re-run of the factory — every ref, every computed, again |

Under that price list, the rationing *is* rational. If naming a
condition costs allocation, you inline it. If capability costs weight
even when dormant, you split components by capability. If instances
cost creation, you avoid modeling things as instances. The
architecture optimizes expression away, because expression is what's
billed.

## The repealed prices

Here is the same list in ivue — and every line carries a measurement,
not a promise:

| you want to express | it costs | receipt |
| --- | --- | --- |
| a derived value | **0 bytes** — a plain getter on the prototype, shared by every instance | [Derivations are free](/blog/derivations-are-free) |
| a named condition | **0 bytes** — same getter; templates read as prose because naming is free | [the standard](/guide/standard) |
| a piece of state | **nothing until first touch** — the ref materializes on first read | [Total memory control](/blog/total-memory-control) |
| a dormant capability | **nothing at all** — an unread getter is a function nobody called | [Derivations are free](/blog/derivations-are-free) |
| another instance | **a plain object** — creation runs 55–253× faster than the alternatives | [Performance](/guide/performance) |
| the engine itself | **1.1 kB gzipped** | [One kilobyte of feature](/blog/one-kilobyte-feature) |
| even the leak | a husk — cells released on demand, GC or no GC | [Release what the GC can't](/blog/release-what-the-gc-cant) |

The pattern in the column is not "cheaper." It's *decoupled*. Weight
no longer scales with expression — it scales with **use**. You pay
for the state you actually touch and the caches you deliberately
earn, and for nothing else: not for names, not for derivations, not
for capability held in reserve, not for the size of your vocabulary.

## What a repealed budget looks like

A production component we measured is both the **player and the
editor** of a post — one class, one model, about ninety derived
getters. Scale ratios, font sizes, named conditions, dialog field
templates, has-changes checks. In the conventional pricing this
component is malpractice: ninety computeds would cost ~27 kilobytes
per instance, and there are many instances on screen.

In ivue it's just a well-spoken model. The ninety derivations weigh
zero. A full template pass over forty of them recomputes from scratch
in two to three microseconds. While the post is merely playing, every
editor derivation is untouched — no allocation, no subscription, no
bookkeeping. And the component can multiply: a thousand instances is
ninety thousand live derivations backed by nothing, still under the
floor.

That component is not an outlier. It's what any component becomes
when its author stops rationing: richer names, more refinements, the
whole capability in one honest model — because there is no longer a
reason not to.

## The disciplines dissolve

Watch what happens to the "best practices" when the price list that
created them is repealed:

- *Keep logic out of templates* stops being a sacrifice and becomes
  free — every condition gets a name, because
  [names cost zero](/guide/standard).
- *Split by capability to stay light* loses its premise — dormant
  capability weighs nothing, so components split by **meaning**, not
  by weight.
- *Avoid modeling entities as instances* inverts — instances are
  plain objects with lazy state, so the
  [object graph comes back](/blog/the-object-graph-they-took).
- *Memoize by default* was
  [always a cache misapplied](/blog/computed-is-a-cache) — now it's a
  deliberate purchase with a
  [measured crossover](/blog/derivations-are-free).

None of those disciplines were wrong under the old prices. They were
correct responses to a bill that no longer exists. Keeping them after
the repeal isn't rigor — it's paying a tax that was abolished.

## The correlation, broken

> When expressiveness has a price, architecture optimizes expression
> away. When it's free, architecture optimizes for meaning. The
> correlation between expressive and heavy was never physics — it was
> pricing. Change the prices and it breaks.

Super complex and super lean were opposite directions for as long as
every name, every derivation, and every dormant capability sent an
invoice. They aren't opposite directions anymore. Build the app that
says everything it means — the weight follows use, and
[use was measured](/blog/measured-not-promised).
