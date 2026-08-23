---
title: 'What native signals should steal'
description: "TC39's signals proposal standardizes the graph and explicitly defers the layer where apps actually live: how signals attach to objects. That layer has been built and measured in userland — lazy existence, zero-cost derivation, explicit release. Three mechanisms, three receipts, all on offer."
tags: [engine, javascript]
relatedPosts: [total-memory-control, derivations-are-free, release-what-the-gc-cant, what-javascript-becomes, computed-is-a-cache, the-stack-got-faster]
date: 2026-08
---

# What native signals should steal

![What native signals should steal](/blog/what-native-signals-should-steal.png)

<BlogPostDate />

JavaScript is getting signals. The [TC39
proposal](https://github.com/tc39/proposal-signals) — backed by
authors from Vue, Angular, Solid, Preact, MobX, and more — is sitting
deliberately at Stage 1, with an unusual gate the champions set for
themselves: significant prototyping first, and advancement only if
native signals prove *real benefits over framework-provided signals,
in practice*.

What the proposal standardizes is the **graph**: `Signal.State`,
`Signal.Computed`, `Signal.subtle.Watcher`, automatic dependency
tracking, glitch-free lazy pull. It's a good graph. And the proposal
is explicit about what it leaves out: effects, decorators, and —
the line that matters here — **reactive objects**. How signals attach
to the objects your app is actually made of is deferred, framework
territory, someone else's problem.

We've spent three years in exactly that territory, and this month we
put numbers on all of it. So here is the object layer's field report,
written for the native-signals conversation: three problems the graph
alone doesn't solve, three mechanisms that solve them in userland
today, and what an engine could do with them that no library can.

## 1. Lazy existence — when does a cell get to exist?

The blessed pattern for signals in classes is an accessor decorator
wrapping a per-instance `Signal.State`. Ergonomic — and **eager**:
the backing signal allocates at construction, touched or not. Fifty
signal-backed properties on a class means fifty allocations per
`new`, exactly the cost structure that makes people avoid modeling
entities as instances today.

The userland fix is [one indirection](/blog/total-memory-control):
the property is a prototype getter, and the cell materializes on
first access, cached by the engine that owns the class. Existence
becomes a managed axis — deferred by default, releasable, rebuildable.
The measured consequences: instance creation runs
[55–253× faster](/guide/performance) than eager-allocation shapes,
and [twenty million cells](/blog/twenty-million-cells) stop being a
frightening number, because a cell that's never read is a cell that
never exists.

An engine could do this *properly*. Userland lazy cells cost a
first-touch own-property and a prototype-getter hop. A native lazy
slot could be a hidden-class transition — allocate the backing store
on first access with no shape churn, no `defineProperty`, no
indirection tax. Lazy accessor semantics are a few lines of spec text
and a real allocation-model decision; the data says it's the decision
that makes signals-in-classes viable at entity scale.

## 2. Derivation needs no node — the standard can get smaller

Here is the elegant part, and it's already latent in the proposal's
own design: the tracked read is the primitive. A plain prototype
getter that reads signal cells auto-tracks through whatever computed
or watcher is reading it. No `Signal.Computed` per property, no
per-instance node, no allocation. The derivation layer can be **zero
bytes, shared on the prototype** — ordinary getters all the way down.

We measured [where a cache node actually pays for
itself](/blog/derivations-are-free): a derivation doing real work
earns memoization at about **two reads per change**; a trivial
derivation almost never does; and at one read per change — the rhythm
of anything animation-driven — the uncached getter wins every tier,
because invalidation machinery costs more than recomputing. A
production model with ninety derivations needed exactly **zero**
cache nodes.

The implication for the standard runs in its favorite direction:
smaller. The object layer needs only lazy *state* slots. Derived
values don't need a primitive, a decorator, or a convention beyond
"write a getter" — they need the committee to bless the tracked read
as the derivation idiom and resist the pull toward
[memoizing by default](/blog/computed-is-a-cache), which was never
neutral in frameworks and shouldn't be canonized in the language.

## 3. Explicit release — reachability is not the last word

The proposal's memory story is reachability: unwatched computeds are
collectable, watchers need manual `unwatch()`, and everything else is
the GC's problem. But the GC's contract ends where retention begins —
one leaked reference (an event bus, a stray closure, a devtools
panel) and everything the object holds stays resident, forever.

Because the proposal has no object model, it cannot even *express*
the countermeasure: releasing the cells of a live object. Userland
can, when the cells live in a ledger the engine owns rather than in
opaque closures. [We measured it](/blog/release-what-the-gc-cant):
10,000 leaked component models keep **85 MB** under closure-based
signals and **4.7 MB** when the object can empty itself — and the GC's
own collection passes run 2–3× faster, because cleared cells shrink
the live graph the collector must trace. A native per-object cell
table makes this a one-call API: existence management as the clause
the collector never offered.

## What C++ deletes that userland can't

Every line item of our engine's overhead is a thing a native
implementation simply wouldn't have. The prototype-getter hop that
makes a userland cell read cost ~15–25 ns instead of property speed —
an inline cache deletes it. The first-touch own-property that
transitions object shape — a spec'd lazy slot avoids it. The
deoptimization risk of getter-heavy prototypes — native slots don't
deopt. The invisibility of the cell ledger — DevTools could render
it. We built the object layer with the tools the language allows;
the point of a standard is that the language could allow better ones.

## The honest scope

The class transform itself — a library rewriting getters into cells
under [a set of conventions](/guide/standard) — is policy, and policy
doesn't belong in a spec. TC39 was right to keep even `effect()` out.
What's standardizable is the mechanics underneath: **lazy slots, a
per-object cell table, an existence API**. If those go native, the
userland layer doesn't die — it thins toward pure convention, riding
a faster substrate. We've already watched that movie once this month:
[the stack got faster and we changed
nothing](/blog/the-stack-got-faster).

> The proposal standardized the graph and deferred the object. But
> the object layer is where apps live — and its three hard problems
> (when cells exist, what derivation costs, how memory lets go) now
> have userland answers with published numbers. Stage 1's gate is
> evidence from practice. Here is some.

Benchmarks: `bench/derived-vs-computed.mjs`,
`bench/derived-vs-computed-ratio.mjs`,
`bench/disposal-vs-vue-components.mjs` in
[the repo](https://github.com/infinite-system/ivue) — Node 26, Vue
3.5.41 and 3.6.0-rc.5, methodology in each linked post.
[Measured, not promised](/blog/measured-not-promised).
