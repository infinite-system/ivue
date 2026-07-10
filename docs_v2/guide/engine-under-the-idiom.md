---
title: The Engine Under the Idiom
description: Vue's reactivity engine has a native, zero-cost derivation mode that the standard idiom hides — computed() is a cache annotation, not a derivation primitive. The class shape excavates what was always there.
---

# The Engine Under the Idiom

ivue's central discovery is not a technique. It is a claim about Vue itself:

> **Vue's reactivity engine has a native, zero-cost mode for derived values —
> and the standard idiom hides it.** `computed()` was never the derivation
> primitive. It is a _cache annotation_. The derivation primitive is the
> tracked read, and it flows through plain functions for free.

ivue doesn't patch Vue, wrap Vue, or compete with Vue. It changes the
_authoring geometry_ so the engine's cheapest mode becomes the default
instead of the exception. Same engine, different expression — and the
difference is measured in orders of magnitude.

## What the engine actually does

Strip every idiom away and Vue's reactivity is three moves:

1. reads of reactive leaves (`ref.value`, reactive props) are **tracked**
   against whatever effect is currently running;
2. writes **notify** the effects that read them;
3. tracking flows **through arbitrary function calls** — the engine neither
   knows nor cares how many stack frames sit between the effect and the leaf.

That third move is the buried one. When a render effect reads a plain
getter, the getter's body executes _inside the effect_ — so every leaf it
touches subscribes the effect directly. The getter is a transparent
corridor:

```ts
class $Cart {
  get items() {
    return ref<{ price: number }[]>([]);
  }
  // No computed(). No graph node. Fully reactive.
  get total() {
    return this.items.value.reduce((sum, item) => sum + item.price, 0);
  }
}
```

A template reading `cart.total` re-renders when `items` changes — with
**zero** reactive machinery for `total` itself. No `ComputedRefImpl`, no
dependency links, no invalidation bookkeeping, no per-instance bytes. The
engine has supported this since Vue 3.0 — it is a direct consequence of how
tracking works, not a feature anyone had to add.

So what does `computed()` actually buy? Exactly one thing: **memoization**
— with ~300 bytes per instance, a graph node, and invalidation bookkeeping
as the price ([the honest numbers](/guide/performance#memory-derivations-weigh-nothing)).
Caching is a real service that is _sometimes_ worth buying. It was never
the way derivation works.

## Why the idiom buried it

The official idiom — docs, tutorials, the entire ecosystem — teaches
"derived state = computed property." If the engine doesn't need it, why does
the idiom insist on it?

Because of **closure geometry** — and this is the honest part: Vue's idiom
is _correct for Vue's authoring shape_. Inside `setup()`, there is no good
home for a live derived value:

```ts
setup() {
  const items = ref([]);

  const total = items.value.reduce(...);   // ✗ computes ONCE — stale forever
  const total = () => items.value.reduce(...); // ✗ works, but {{ total() }} everywhere
  const total = computed(() => ...);       // ✓ the only ergonomic option
}
```

A `const` evaluates once and dies. A function works but breaks template
ergonomics. `computed()` is the only form that is both live and reads like
a value — **so the idiom reached for it universally, and the cache tax came
along silently**. Multiply by every derived value, every component, every
instance of every component, and the ecosystem's default became: pay for
memoization everywhere, need it almost nowhere.

The idiom wasn't wrong. It was the best expression available _in closure
geometry_. The engine's cheapest mode simply has no syntax there.

## What the class shape excavates

A class has the one thing a closure lacks: a **prototype** — a place where
a derived value can live _once_, stay _live_ (getters re-execute per read),
and read like a value (`cart.total`, no parentheses). The three requirements
that forced `computed()` in closures are all met for free:

| requirement            | closure                  | class                       |
| ---------------------- | ------------------------ | --------------------------- |
| stays live             | only `computed()`/fn     | getter re-runs per read     |
| reads like a value     | only `computed()`        | getter — `cart.total`       |
| costs nothing per instance | ✗ (closure or cell each) | prototype — shared, 0 bytes |

That's the entire excavation. The class shape doesn't add a capability to
Vue — it gives Vue's _existing_ cheapest mode an ergonomic syntax, at which
point `computed()` collapses back to what it always was: a surgical opt-in
for the rare derivation where caching pays
([when, exactly](/guide/computed-watch#computed-your-usememo)).

## What falls out

Consequences observed in production, not projected:

- **A census, not a vibe.** A shipped reader application — virtualized
  scrolling of 99,925-paragraph documents, seek, search, autoplay, inline
  editing — runs on **three** `computed()`s across ~3,900 lines: one
  expensive search sweep, one render-suppressing window snapshot, one
  stable watched handle. Every other derived value in ~170 getters is a
  plain getter. Each of the three maps to one of the doctrine's named
  exceptions; a fourth was deleted when it failed the test.
- **`computed()` becomes signal.** When the keyword appears three times
  instead of three hundred, each occurrence _means something_: "the
  derivation behind this is expensive." The annotation's rarity is
  documentation.
- **Instance cost collapses.** Derivations weigh nothing per instance, so
  10k-row virtualized lists stop paying megabytes of bookkeeping —
  [55–253× faster creation, up to 18× less memory](/guide/performance).
- **The graph stays constant-size.** Reactive-graph size stops scaling
  with feature count or data size; it scales with _how many caches you
  deliberately bought_. Complexity becomes locally auditable — each new
  getter's cost is readable off its body.
- **Hot reload beyond Vue's own.** Behavior living on prototypes (not in
  closures) is what makes [class grafting](/guide/hmr) possible — edits
  land on live instances with state intact, which `setup()`'s opaque
  closure structurally cannot offer. The same geometry, paying again in a
  domain it wasn't designed for.

## Convergence — others keep finding the same invariant

A real invariant gets rediscovered from independent directions:

- **Solid.js** documents it outright: derived values are plain functions;
  `createMemo` only when memoization pays. Same invariant, closure-geometry
  dialect ([the full comparison](/guide/model-layer#what-about-solid-js)).
- **Vue 3.4** shipped equality-based propagation stops for computeds — the
  team optimizing the cache tax the idiom institutionalized.
- **MobX** made `computed` opt-in decoration over plain class getters a
  decade ago — different engine, same geometry conclusion.

ivue's contribution is not the invariant — it is expressing the invariant _inside
Vue's own engine_, unmodified, so a Vue codebase gets it without changing
frameworks: zero patches, standard `ref()`/`computed()`/`watch` underneath,
1.1 kB of glue.

## The claim, precisely

**Claimed:** Vue's engine natively supports zero-cost, fully-reactive
derivation through plain getters; `computed()` is semantically a cache
annotation; the closure authoring shape is what made it look like a
derivation primitive; a class shape restores the engine's default, and the
practical need for `computed()` drops to the low single digits per
thousands of lines.

**Not claimed:** that the Vue team doesn't understand their own engine
(they built the mechanism this page describes); that `computed()` is bad
(three of them are load-bearing in the flagship case study); that this
holds outside Vue's fine-grained tracking model (it doesn't — React has no
tracked reads to flow through).

**Falsifiable:** census your own ivue codebase. If honest application of
the doctrine — cache only for expensive work, render suppression, or a
stable watched handle — leaves you needing `computed()` for a substantial
fraction of your derived values, this page is wrong. Measured so far: 3 in
3,902 lines, under production load, at 99,925 items.
