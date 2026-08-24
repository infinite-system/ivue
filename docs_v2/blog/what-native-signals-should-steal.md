---
title: 'What native signals should steal'
description: "TC39's signals proposal standardizes the graph. It defers the layer where apps actually live: how signals attach to objects. That layer has been built and measured in userland. Lazy existence, zero-cost derivation, explicit release. Three mechanisms, three receipts, all on offer."
tags: [engine, javascript]
relatedPosts: [total-memory-control, derivations-are-free, release-what-the-gc-cant, what-javascript-becomes, computed-is-a-cache, the-stack-got-faster]
date: 2026-08
---

# What native signals should steal

![What native signals should steal](/blog/what-native-signals-should-steal.png)

<BlogPostDate />

JavaScript is getting signals. The [TC39
proposal](https://github.com/tc39/proposal-signals) is backed by
authors from Vue, Angular, Solid, Preact, MobX, and more. It sits at
Stage 1 on purpose. The champions set an unusual gate for themselves:
prototype first, and advance only if native signals prove real
benefits over framework signals, in practice.

The proposal standardizes the **graph**: `Signal.State`,
`Signal.Computed`, `Signal.subtle.Watcher`, automatic dependency
tracking, glitch-free lazy pull. It is a good graph. The proposal is
also explicit about what it leaves out: effects, decorators, and
reactive objects. How signals attach to the objects your app is made
of stays framework territory.

We have spent three years in exactly that territory. This month we
put numbers on all of it. So here is the object layer's field report,
written for the native-signals conversation. Three problems the graph
alone does not solve. Three mechanisms that solve them in userland
today. And what an engine could do with them that no library can.

## 1. Lazy existence — when does a cell get to exist?

The blessed pattern for signals in classes is an accessor decorator
that wraps a per-instance `Signal.State`. It reads well. It is also
eager: the backing signal allocates at construction, touched or not.
Fifty signal-backed properties means fifty allocations per `new`.
That cost structure is why people avoid modeling entities as
instances today.

The userland fix is [one indirection](/blog/total-memory-control).
The property is a prototype getter. The cell materializes on first
access, cached by the engine that owns the class. Existence becomes a
managed axis: deferred by default, releasable, rebuildable.

In plain words: the object is born knowing the names of its state,
but the storage does not exist yet. Storage appears the first time
someone asks. State you never touch is state that never existed.

The measured consequences: instance creation runs
[55–253× faster](/guide/performance) than eager shapes, and
[twenty million cells](/blog/twenty-million-cells) stops being a
frightening number.

An engine could do this properly. A userland lazy cell costs a
first-touch own-property and a prototype-getter hop. A native lazy
slot could be a hidden-class transition: allocate the backing store
on first access, with no shape churn and no indirection tax. Lazy
accessor semantics are a small piece of spec text. The data says it
is the piece that makes signals-in-classes viable at entity scale.

## 2. Derivation needs no node — the standard can get smaller

The best part is already latent in the proposal's own design: the
tracked read is the primitive. A plain prototype getter that reads
signal cells auto-tracks through whatever computed or watcher reads
it. No `Signal.Computed` per property. No per-instance node. No
allocation. The derivation layer can be zero bytes, shared on the
prototype, written as ordinary getters.

In plain words: a derived value does not need its own box. It is
just a question you ask of the boxes you already have. The graph
notices which boxes the question touched, and that is the whole
trick.

We measured [when a cache node pays for
itself](/blog/derivations-are-free). A derivation doing real work
earns memoization at about **two reads per change**. A trivial
derivation almost never does. And at one read per change, the rhythm
of anything animation-driven, the uncached getter wins every tier —
invalidation costs more than recomputing. A production model with
ninety derivations needed exactly zero cache nodes.

The implication runs in the standard's favorite direction: smaller.
The object layer needs only lazy state slots. Derived values need no
primitive and no decorator. They need the committee to bless the
tracked read as the derivation idiom, and to resist canonizing
[memoization by default](/blog/computed-is-a-cache). It was never
neutral in frameworks. It should not become neutral in the language.

## 3. Explicit release — reachability is not the last word

The proposal's memory story is reachability. Unwatched computeds are
collectable. Watchers need manual `unwatch()`. Everything else is the
GC's problem. But the GC's contract ends where retention starts. One
leaked reference — an event bus, a stray closure, a devtools panel —
and everything the object holds stays resident, forever.

The proposal has no object model, so it cannot even express the
countermeasure: releasing the cells of a live object. Userland can,
when the cells live in a ledger the engine owns rather than in opaque
closures.

In plain words: when signals live inside a closure, nobody can reach
in and empty it. When they live in a ledger, the object can hand its
storage back while it is still being held.

[We measured it](/blog/release-what-the-gc-cant). Ten thousand leaked
component models keep **85 MB** under closure-based signals and
**4.7 MB** when the object can empty itself. The GC's own collection
passes also run 2–3× faster, because cleared cells shrink the live
graph the collector must trace. A native per-object cell table makes
this a one-call API: existence management as the clause the collector
never offered.

## What C++ deletes that userland can't

Every overhead line item in our engine is a thing a native
implementation would not have. The prototype-getter hop that makes a
userland cell read cost ~15–25 ns instead of property speed: an
inline cache deletes it. The first-touch own-property that changes
object shape: a spec'd lazy slot avoids it. The deopt risk of
getter-heavy prototypes: native slots do not deopt. The invisible
cell ledger: DevTools could render it.

We built the object layer with the tools the language allows. The
point of a standard is that the language could allow better ones.

## The honest scope

The class transform itself, a library rewriting getters into cells
under [a set of conventions](/guide/standard), is policy. Policy does
not belong in a spec, and TC39 was right to keep even `effect()` out.
What is standardizable is the mechanics underneath: lazy slots, a
per-object cell table, an existence API. If those go native, the
userland layer does not die. It thins toward pure convention, riding
a faster substrate. We watched that movie once already this month:
[the stack got faster and we changed
nothing](/blog/the-stack-got-faster).

> The proposal standardized the graph and deferred the object. But
> the object layer is where apps live. Its three hard problems —
> when cells exist, what derivation costs, how memory lets go — now
> have userland answers with published numbers. Stage 1's gate is
> evidence from practice. Here is some.

Benchmarks: `bench/derived-vs-computed.mjs`,
`bench/derived-vs-computed-ratio.mjs`,
`bench/disposal-vs-vue-components.mjs` in
[the repo](https://github.com/infinite-system/ivue). Node 26, Vue
3.5.41 and 3.6.0-rc.5, methodology in each linked post.
[Measured, not promised](/blog/measured-not-promised).
