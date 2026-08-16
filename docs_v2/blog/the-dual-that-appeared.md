---
title: 'Reactive() and Static() — discovered, not invented'
description: Reactive() and Static() look like a designed pair — one transform for instances, one for the class object, same late binding, same per-receiver caching, one level apart. Neither was designed to complete the other. The mirror emerged from the same constraints, and emergent duals are load-bearing.
date: 2026-08
tags: [engine, philosophy, patterns]
---

# Reactive() and Static() — discovered, not invented

<BlogPostDate />

![Reactive() and Static() — discovered, not invented](/blog/the-dual-that-appeared.png)

We did not set out to invent a dual.

[`Reactive()`](/engine) and [`Static()`](/guide/static) look like a
deliberate pair in retrospect: one transform for instances, one for the
class object itself; the same late binding, the same stable identity, the
same per-receiver cache discipline, applied one level apart. But neither
was designed to complete the other. Each was forced into existence by the
same pressures, and only afterward did the mirror become visible.

That is usually a good sign. Planned dualities often feel forced.
Emergent ones tend to be load-bearing, because both halves were required
by the same underlying constraints.

## What the pressures were

The original problem was simple and stubborn: we wanted ordinary
TypeScript classes — real inheritance, `super`, private fields,
polymorphism — to be fully reactive without paying a cost up front.
Earlier attempts at class-based reactivity kept failing in the same
places:

- Methods lost their `this` binding, or produced a new function identity
  on every access.
- Inheritance either collided between parent and child or silently
  overwrote the parent's behavior.
- Construction allocated every reactive cell whether it was ever used or
  not.
- Circular imports between modules forced special workarounds.
- Cleaning up watchers and cached state was either missing or relied on
  hidden framework hooks.

The answer that survived [three years of reduction](/blog/three-years-to-reduce)
was a single transform applied to the class prototype. Getters that
return Vue refs become lazy state: created on first access, then cached.
Plain getters stay plain and still participate in reactivity through
ordinary dependency tracking. Methods are bound once and keep the same
function identity forever. Instances remain ordinary objects — no proxy
wrapper. Nothing is created until something actually reads it.

That transform became `Reactive()`.

Separately, the rest of the codebase kept accumulating small, local
caching solutions on the *static* side of classes: module-level maps,
lazy singletons, bags of functions that needed to be replaceable in
tests, values that should be computed once per class rather than once
per instance. Each solution was reasonable on its own. Collectively
there were dozens of slightly different answers to the same three
questions:

1. Compute this value only once.
2. Keep a stable identity so the result can be passed around safely.
3. Let a subclass override or isolate the behavior in tests.

A single convention collapsed most of them: a static getter whose name
starts with `$` is computed once per receiving class and cached on that
class under a private symbol. Subclasses get their own cache
automatically. That convention, together with a small transform that
makes static methods lazy-bound and inheritance-safe, became
`Static()`.

Only after both existed was it obvious that they were the same idea
applied to different receivers.

> We did not mean to invent the dual. We meant to stop inventing the
> caches.

## A sublanguage, not a library

By that point the system had stopped feeling like a library you call. A
library offers functions and leaves the surrounding discipline to the
author. What had actually been built was a small set of structural rules
that changed what was cheap, what was expensive, and what was awkward to
express:

- Reactive state is declared as a getter that returns a ref.
- Derived values are ordinary getters unless memoization is
  [measurably worth its cost](/blog/computed-is-a-cache).
- Methods are stable by construction; you pass them as callbacks without
  extra wrapping.
- References from one module to another resolve when the code first
  runs, [not while modules are still loading](/blog/circular-imports-dissolved).
- A name starting with `$` means "compute once per receiver and cache
  the result."
- The class a child `extends` is not the same slot you later swap.

Under those rules, whole families of ad-hoc solutions became
unnecessary. A module-level `const cache = new Map()` stopped looking
normal, because ownership, laziness, and test isolation already had a
[single declaration form](/blog/module-level-state). Calling a store or
a service inside a field initializer at construction time became
suspicious, because a `$`-getter did the same work later and more
safely. Hand-rolled dirty-flag caches for cheap derived values looked
like extra state for no gain, because an ordinary getter was already
reactive and allocated nothing per instance.

The difference matters. A style guide asks people to be careful. A set
of structural rules makes the careless move harder or more expensive.
The invariants do not merely document good practice — they
[remove the conditions that made the old workarounds rational](/blog/the-field-not-the-rules).

## Why the dual matters

Once both transforms existed, larger pieces of architecture simplified.

Classes that represent *capabilities* — filesystem access, subprocesses,
terminal handles, native libraries — became `Static()` collections of
methods and `$`-cached resources. Classes that represent *domain
entities* or view-models became `Reactive()` instances. Both use the
same export shape. Both expose a single replaceable slot for tests and
higher-level composition. Both resolve cross-module references at first
use, so circular imports between them stopped being a special case.

In the largest system built on this substrate —
[a terminal IDE of 94,054 source lines](/examples/invar) — there are
**198 `Static()` classes and 79 `Reactive()` ones**, no module-level
mutable variables, and no circular value imports. The dozens of
hand-rolled caches are gone. They were symptoms of the earlier
constraints. Once the constraints were removed, the caches had no
reason to exist.

The dual was never a feature we decided to ship. It was what remained
after the constraints had finished eliminating everything that was not
required.

## Reduction as method

The useful lesson is not that every system needs a pair of transforms
named `Reactive` and `Static`. It is that certain symmetries only become
visible when you stop compensating for the underlying costs and instead
eliminate the costs themselves.

- When creating an object is expensive, codebases grow lazy factories
  and pooling.
- When a method's identity or `this` binding is unreliable, codebases
  grow explicit binders, arrow wrappers, and defensive copying.
- When inheritance produces collisions or silent overwrites, teams
  abandon inheritance and rely only on composition.
- When the order in which modules load determines whether a reference is
  safe, codebases grow deferred-reference helpers, lint rules against
  cycles, and documentation about import order.

Each of those responses is locally rational. Taken together they become
a large framework whose main job is to manage the consequences of the
original costs. The other path is to keep asking which of the costs are
optional. Make construction [essentially free](/blog/one-kilobyte-feature).
Make method identity stable by construction. Place behavior on the
prototype so inheritance composes instead of colliding. Resolve every
cross-module value reference at first use rather than at load time.

What remains is smaller than the sum of the earlier workarounds. And the
shapes that survive often mirror each other, because they were forced by
the same questions.

> The dual was what the invariants left standing.

Both halves live in the [Standard](/guide/standard); the capability-class
half has its own chapter in [Static() — Capability Classes](/guide/static).
