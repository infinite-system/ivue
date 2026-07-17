---
title: "The object should tell the truth"
description: State is explicit. Caching is intentional. Everything else stays pure. An ivue class makes the runtime semantics of an object visible in its source.
date: 2026-07
---

# The object should tell the truth

![A transparent object with explicit state, one cache, and pure paths through it](/blog/the-object-should-tell-the-truth.png)

Look at an object and answer three questions:

1. What persists?
2. What is cached?
3. What is merely derived from what already exists?

In most reactive code, the answers are harder to find than they should be.
State may be hidden behind a proxy. Derivations may all look like cache nodes.
A compiler may rewrite one field into machinery that another field does not
have. The source presents a uniform surface while the runtime underneath it is
anything but uniform.

ivue takes the opposite position: **unlike things should look unlike.**

```ts
class $Invoice {
  get subtotal() {
    return ref(0); // persistent reactive state
  }

  get taxRate() {
    return ref(0.13); // persistent reactive state
  }

  get total() {
    return this.subtotal.value * (1 + this.taxRate.value); // pure derivation
  }

  get formattedTotal() {
    return computed(() => this.formatTotal()); // deliberately memoized
  }

  formatTotal() {
    return expensiveCurrencyFormat(this.total);
  }
}
```

The class tells the truth before it runs.

`subtotal` and `taxRate` create stable reactive identities. `formattedTotal`
creates a cache because its work earns one. `total` stores nothing, owns
nothing, and can never become stale. It is just the current answer.

The extra syntax appears exactly where persistent machinery begins.

## Reactivity was never the same thing as memoization

The confusion starts with a collapsed category. We say “reactive value” as if
state, dependency tracking, derivation, caching, and invalidation were one
capability.

They are not.

Vue tracks reads inside an active effect. If a plain getter reads two refs
while a template renders, the template subscribes to those refs through the
getter. The getter does not need its own reactive node. It does not need a
closure per instance. It does not need invalidation state. The render already
provides the tracking context.

That means a plain getter is fully reactive where reactivity actually matters:
at the observer. Adding `computed()` does not make the derivation reactive. It
adds memoization.

This distinction sounds small. It changes the shape of the whole object model.

Once reactivity and memoization separate, the cheapest correct default becomes
obvious:

- State gets a `ref()` because identity and mutation must persist.
- Expensive or identity-sensitive work gets a `computed()` because caching has
  earned its cost.
- Everything else remains a plain getter because the answer is cheaper than
  the cache.

No policy table is required. The JavaScript syntax is the policy table.

## Verbosity belongs where machinery begins

Framework ergonomics often pursue visual uniformity. If every value uses the
same syntax, the API feels clean in a tutorial. But identical syntax can hide
different lifetimes, allocation costs, and identity rules.

ivue chooses semantic clarity over cosmetic sameness.

Writing `return ref(...)` is slightly more explicit than assigning a field and
asking a compiler or proxy to reinterpret it. That explicitness buys a precise
statement: this member owns mutable reactive state, its handle is stable, and
its lifetime belongs to this instance.

Writing `return computed(...)` makes a second precise statement: this member
owns a memoized node, and the author intends to pay for it.

Writing an ordinary getter makes the strongest statement of all: there is no
hidden object here. No cache. No dirty flag. No retained answer. Just code on
the prototype deriving a value from current state.

The result is not verbosity everywhere. It is verbosity at the two boundaries
where the runtime stops being pure.

> Persistent machinery is explicit. Purity gets to stay pure.

## One object, visible costs

That visibility matters at scale because costs multiply by population.

A cache that is harmless in one component becomes 100,000 cache nodes in an
entity model. A closure that feels free in one composable becomes 100,000
copies of the same behavior. A proxy hop that disappears in ordinary UI work
becomes measurable inside a loop that performs millions of reads.

ivue does not claim that state or caches are bad. It makes them countable.

Open a class and count the `ref()` getters: that is its possible persistent
reactive state. Count the `computed()` getters: that is its possible memoized
graph. Everything else is shared prototype behavior and pure derivation. Lazy
materialization then tightens the statement further: even explicit machinery
costs nothing on an instance until something reads it.

The source becomes a useful approximation of the object’s runtime weight.
That is rare in framework code.

## Clarity compounds across a codebase

The larger win is not measured in bytes. It is measured in how much of the
system a developer must simulate mentally.

When the syntax distinguishes state, caches, derivation, and behavior, code
review becomes concrete. A reviewer can ask why a particular value persists,
whether a calculation is expensive enough to cache, or whether a method is the
right home for an effect. The questions attach to visible decisions.

The same property helps newcomers and coding agents. They do not need an
invisible convention saying that some fields are magical, some getters are
cached, and some assignments are rewritten. The local class carries the
architecture:

- `ref()` means state.
- `computed()` means cache.
- a plain getter means pure derivation.
- a method means behavior.

Small local rules preserve global coherence. A codebase can grow without every
author holding its whole reactive graph in working memory.

## What becomes impossible

A useful architecture does more than enable good code. It removes classes of
misunderstanding.

With this shape:

- A plain getter cannot secretly allocate a cache per instance.
- A memoized value cannot pretend to be free.
- Persistent reactive state cannot hide behind an ordinary-looking field.
- A pure derivation cannot become stale, because it retains no previous value.
- Two instances cannot accidentally receive separate copies of a plain
  getter’s implementation, because it lives once on the prototype.

There are still choices to make. A cache can be justified or wasteful. A piece
of state can belong on the object or somewhere else. But the choices are no
longer disguised as one generic idea called “reactivity.”

## The light-bulb moment

At first, it seems that every reactive getter must become a `computed()`.
How else could a template know when the result changes?

Then the underlying structure becomes visible: the template is already an
effect, and the refs read through the getter are already tracked. The extra
node was not providing reactivity. It was providing a cache.

Remove the cache where it is not needed and nothing is lost. Inheritance gets
cleaner. `super` remains ordinary JavaScript. Behavior stays on the prototype.
Per-instance allocation collapses. The class becomes easier to read.

Several wins arrive together because they were all blocked by the same false
assumption.

That is the ivue 2 object model in one sentence:

> **Reactive where persistence is real. Memoized where caching is earned. Pure
> everywhere else.**

Continue with [`computed()` is a cache, not a derivation](/blog/computed-is-a-cache)
for the engine-level argument, or [The Engine](/guide/engine-under-the-idiom)
for the complete mechanics and measured costs.
