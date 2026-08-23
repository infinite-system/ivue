---
title: 'Show HN: ivue launch'
description: 'The Show HN submission: title + the author first comment, posted immediately.'
channel: hn
date: 2026-08
---

# Show HN: ivue launch

**Submission title (79 chars):**

> Show HN: Ivue – full Vue reactivity on plain TypeScript classes, in 1.1 kB

**First comment (post immediately as author):**

I spent three years on a question the industry decided wasn't worth
asking: what would have to be TRUE for plain JavaScript classes to be
fully reactive, fully memoized, and fully inheritable — with no
decorators, no proxies per instance, and no framework simulation of
`this`?

Some history. Classes were the future in 2016 — Angular, early React,
Vue class components. Then came the bill: `this`-binding bugs, mixin
collisions, HOC wrappers, TypeScript fighting every framework's
class-shaped DSL. The industry's verdict was that classes "confuse
both people and machines," and everything moved to hooks and
composables. I read the evidence differently: classes weren't broken,
they were UNCONSTRAINED. A class gives you ten ways to do everything —
fields vs getters, bind vs arrows, eager vs lazy init — and
unconstrained variation is a bug farm. Functions won because they came
with definitive constraints: fewer ways to do it, more predictable.
Nobody had found the equivalent constraint set for classes.

ivue is that constraint set — the invariant shape of classes in
JavaScript, found by asking what must be true rather than what could
be added. Hold the constraints and everything unlocks at once.
`Reactive()` transforms a class prototype once:
getters returning `ref()` become per-instance cached state, plain
getters become zero-byte reactive derivations (they live on the
prototype — `extends` and `super` work on them), methods lazy-bind
with stable identity. Instances stay plain objects — creating 100k of
them measures 55–253× faster than reactive wrappers or composable
factories, because nothing is paid until first access.

Each classic class-era wound is closed structurally, not by
convention — every one has a write-up with measurements:
`this.method` is finally safe to pass (lazy-bound once on the
prototype, stable identity); circular imports dissolve (every
cross-module reference resolves at first access, after all modules
load — any import order works); initialization order is solved in
userland; and shared stores can't fork under subclassing or race
module loading. That last chain is what makes "bulletproof modules"
a claim rather than a slogan. And the part I care most about: all of
it landed while the core STAYED 1.1 kB and got faster, not slower —
because each solution was derived from the invariant (what must be
true) rather than invented as a feature (what could be added).
Invariants delete code; features accumulate it. The overview with all
the receipts: https://ivue.dev/blog/introducing-ivue

What I didn't expect: solving the instance side forced a static-side
dual, `Static()`, with the same constraints (lazy binding, per-receiver
caching, one anchor for inheritance) — I've written about how it was
discovered rather than designed. The last seam — shared stores that
must construct across modules without racing import cycles or forking
under subclassing — closed last week; the whole memoization map now
fits in one table:
https://ivue.dev/blog/bulletproof-class-modules

And the payoff functions structurally cannot offer: the application
becomes a live, inspectable OBJECT GRAPH — entities holding entities,
stores referencing stores, subclasses specializing nodes — because
constrained classes compose into a graph where closures compose into
opaque scopes. That graph is what makes large apps navigable, for
humans and for AI agents alike.

Numbers, held to "measured, not promised": 1.1 kB gzipped core, zero
dependencies, 100% test coverage, a 20M-cell spreadsheet demo at 4.7
bytes/cell, and a 94,000-line terminal IDE built on it (by AI agents
following the same one-document standard humans use:
https://ivue.dev/guide/standard).

It's built ON Vue 3's reactivity primitives, not against them — refs,
watch, and composables all work inside the constructor. Happy to
answer anything, including where it loses: v-for item cells keep
explicit `.value`, and a bound method call is ~4ns vs ~1.4ns for a raw
closure (hoisting recovers it — the docs benchmark the misses too).
