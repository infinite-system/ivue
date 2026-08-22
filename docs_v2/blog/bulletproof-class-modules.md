---
title: Bulletproof class modules
description: LazyShared seals the last seam — the full Reactive() + Static() system is now memoizable at every scope, with polymorphism, inheritance, and performance intact. The classic failure modes are no longer mistakes to avoid; they are states you cannot represent.
date: 2026-08
tags: [architecture, javascript, patterns]
---

# Bulletproof class modules

<BlogPostDate />

![Bulletproof class modules](/blog/bulletproof-class-modules.png)

Every value a class module can hold wants three things at once: to be
**computed once** (memoized at the right scope), to stay **overridable**
(polymorphism and inheritance keep working), and to cost **nothing it
didn't earn** (no allocation before first use, no tax after). JavaScript
gives you no help reconciling the three — eager statics race module
loading, per-instance caching bloats objects, and anything cached too
early stops respecting subclasses.

ivue's architecture has been closing that triangle one seam at a time.
With `LazyShared`, the last seam is sealed: the combined `Reactive()` +
`Static()` system now memoizes at **every scope a value can live in**,
and it does so without giving up late binding anywhere.

> Bulletproof does not mean "carefully avoided." It means the failure
> modes are unrepresentable: there is no way to write the forked
> registry, the load-order race, or the stale `this` — each value kind
> has exactly one home, and every home is safe by construction.

## The full map

| the value is… | its home | memoized | inheritance |
| --- | --- | --- | --- |
| mutable state | ref-getter | per instance, on first touch | subclass overrides the getter |
| a derivation | plain getter | never allocated — prototype only | `super` works; zero bytes to inherit |
| an expensive derivation | `computed()` thin closure | per instance | body delegates to an overridable method |
| a store or composable | instance `$`-getter | per instance, forever | resolves at first touch, after cycles |
| a method | plain method | bound lazily, per receiver | stable identity, safe to detach |
| a tunable static | live static getter | never — deliberately fresh | the override IS the feature |
| a static memo | `$`-static getter | per receiver | subclass derives through its overrides |
| a shared registry | `static readonly` field | one reference | inherited, never receiver-cached |
| shared AND constructed | `LazyShared` cell | one value, built on first read | every receiver converges on it |

Nine value kinds, nine homes, no judgment calls left at the call site.
The bottom row is the one that was missing.

## The last seam

A shared store that must *construct* another module's class sat in a
gap between two guarantees. Put it in a per-receiver `$`-cache and every
subclass silently forks its own copy — fatal for a registry. Put it in
an eager static field and the initializer runs at module load, racing
every import cycle — the exact hazard the rest of the architecture
solves by deferring cross-module references to first access.

The seam needed both properties at once: **load-lazy and unforkable**.
That is the whole specification of `LazyShared`, and the implementation
is small enough to hold in one thought — the field eagerly stores a
cell holding an inert thunk; the thunk runs on the first `.value` read,
after every module in every cycle has loaded; the memoized result lives
*inside* the cell:

```ts
import { LazyShared } from 'ivue/extras';

class $SearchRegistry {
  protected static readonly sharedBackend = new LazyShared(
    () => new SearchBackend.Class(),
  );

  protected static get $backend() {
    return this.sharedBackend.value;
  }
}
```

The property that seals it: **forking the access path is harmless,
because there is nothing forkable at the end of it.** A subclass
receiver reads the same inherited field. A per-receiver `$`-cache over
the cell caches the same `.value` in every receiver. Every road leads
to the one constructed singleton — the sharing guarantee moved out of
receiver-space entirely, into the cell. Even failure is engineered: a
thunk cycle throws a named, retryable error instead of a stack
overflow, and a throwing thunk never poisons the cell.

## What was never given up

**Polymorphism.** Every memo in the table is late-bound to its
receiver. `$`-statics derive through subclass overrides; methods bind
to the receiving class; instance code reads its own statics through
`self` — `this.constructor`, cast once per class — so a subclass tuning
a constant is honored everywhere, including inside caches computed from
it. The one value that must NOT respect the receiver — the shared
store — is exactly the one whose state lives outside receiver-space.

**Inheritance.** Derivations are getters, so `extends` and `super` work
on them — subclass a store, override one derivation. Statics anchor
once at `$Class` and children extend it bare. Registries inherit as one
reference. Nothing in the memoization layer sees a subclass as a
special case.

**Performance.** Memoization here is not a cache bolted on — it is the
allocation model. Instances are plain objects; derivations cost zero
bytes each; nothing is computed before first use, which is why creating
100,000 instances measures 55–253× faster than the alternatives
([Performance by Design](/guide/performance)). The residual taxes are
measured and each has a one-line refund: a hot `$`-cache read hoists to
a local, a hot `self` read hoists to `const self = this.self` — both
land at fractions of a nanosecond per iteration, cheaper than the
unhoisted "fast" form.

## Why this matters beyond ivue

The triangle — memoized, overridable, pay-per-use — is not an ivue
problem. It is what every module system with classes eventually fights:
singletons that break under subclassing, initializers that break under
circular imports, caches that break polymorphism. The usual answer is
discipline: conventions, lint rules, code review vigilance.

The architecture's answer is structural. Each value kind gets a home
whose guarantees are enforced by the engine or by the shape itself, and
the homes compose — which is why the whole map fits in one table and
the newest piece is forty lines. Discipline you maintain; structure you
inherit.

The reference lives in the guide:
[Caches, Registries & `self`](/guide/caches-and-registries) — and the
system it completes is [The Standard](/guide/standard).
