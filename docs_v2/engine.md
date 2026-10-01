---
title: The Engine
description: Vue's reactivity engine can track a derived value without allocating a separate derivation node. computed() is a cache annotation rather than the derivation primitive.
relatedPosts: [computed-is-a-cache, discovered-not-invented, introducing-ivue]
---

# The Engine

> **Vue's reactivity engine has a native, zero-node mode for derived values,
> and the way Vue is normally written hides it.** `computed()` was never the derivation
> primitive. It is a _cache annotation_. The derivation primitive is the
> tracked read, and it flows through plain functions without creating another
> reactive node.

ivue, a 1.1 kB class layer over that engine, changes the _authoring
geometry_ so the cheapest mode becomes the default instead of the
exception.

## The engine's three moves

Vue's reactivity is three moves:

1. Reads of reactive leaves (`ref.value`, reactive props) are **tracked**
   against whatever effect is currently running.
2. Writes **notify** the effects that read them.
3. Tracking flows **through arbitrary function calls**. The engine neither
   knows nor cares how many stack frames sit between the effect and the leaf.

The third move is the one Vue code rarely uses. When a render effect reads a
plain getter, the getter's body executes _inside the effect_, so every leaf
it touches subscribes the effect directly:

```ts
class $Cart {
  get items() {
    return ref<{ price: number }[]>([]);
  }
  // No computed(), no graph node, still fully reactive.
  get total() {
    return this.items.value.reduce((sum, item) => sum + item.price, 0);
  }
}
```

A template reading `cart.total` re-renders when `items` changes, with
**zero per-instance reactive machinery** for `total` itself. Everything it
costs at runtime is the arithmetic in its body. The engine has supported
this since Vue 3.0.

`computed()` buys one thing: **memoization**, priced at roughly 300 bytes
per instance, a graph node, and invalidation bookkeeping
([measured](/guide/performance#memory-derivations-weigh-nothing)). It was
never the way derivation works.

## Inside setup()

Every tutorial teaches "derived state = computed property." If the engine
doesn't need it, why does everyone write it?

Because of where the code is written. The convention is _correct for Vue's
authoring shape_. A `setup()` body, or any composable it calls, has no good
home for a live derived value:

```ts
setup() {
  const items = ref([]);

  const total = items.value.reduce(...);   // ✗ computes ONCE, stale forever
  const total = () => items.value.reduce(...); // ✗ works, but {{ total() }} everywhere
  const total = computed(() => ...);       // ✓ the only ergonomic option
}
```

A `const` evaluates once and goes stale. A function re-evaluates but breaks
template ergonomics. `computed()` is the only form that is both live and
reads like a value. **Everyone uses it, and the cache tax comes along
silently.** Multiply that across every component and every instance, and
the ecosystem's default became: pay for memoization everywhere, need it
almost nowhere.

The engine's cheapest mode has no syntax there.

## The prototype

A class has a prototype, where a composable gets one scope per call with
nothing shared between them. A derived value declared on the prototype is
shared by every instance. Its body re-executes on every read, so the value
is never stale, and the template writes `cart.total` with no parentheses.
That is everything `computed()` was covering for.

With the shape available, `computed()` collapses back to what it always
was: a surgical opt-in for the rare derivation where caching pays
([when, exactly](/guide/computed-watch#computed-your-usememo)).

The transformation happens once per prototype. Steady execution is ordinary
JavaScript property access.

## What falls out

- **A census.** A shipped reader application, with virtualized scrolling on
  the same class that [drives 1,000,000 rows live on this
  site](/examples/virtual-scroller), plus seek, search, autoplay and inline
  editing, runs on **three** `computed()`s across ~3,900 lines: one
  expensive search sweep, one render-suppressing window snapshot, one stable
  watched handle. Every other derived value across ~170 getters is a plain
  getter.
- **`computed()` becomes signal.** When the keyword appears three times
  instead of three hundred, each occurrence means the derivation behind it is
  expensive.
- **Instance cost collapses.** An instance pays for a derivation only when it
  reads one, so a model per row costs the plain-object floor until something
  renders it. A grid holding 1,000,000 cell models keeps them in
  [41.7 MB where composables need 757.7 MB, each added cell costing the same
  40 bytes a non-reactive object would](/guide/benchmarks).
- **The graph is constant-size.** Reactive-graph size scales with _how many
  caches you deliberately bought_ rather than with feature count or data
  size. Each new getter's cost is readable off its body.
- **Development matches production.** The engine uses native construction and
  direct method binding in every environment. No development proxy or
  dispatch layer changes the class geometry you test
  ([Development & HMR](/guide/hmr)).

## Convergence

Others arrived at the same place:

- **Solid.js** documents it outright: derived values are plain functions, and
  `createMemo` comes out only when memoization pays
  ([the full comparison](/guide/model-layer#ivue-vs-solid-js)).
- **Vue 3.4** shipped equality-based propagation stops for computeds, the
  team trimming the cache tax the convention institutionalized.
- **MobX** made `computed` an opt-in decoration over plain class getters a
  decade ago.

ivue's contribution is expressing that invariant _inside Vue's own engine_:
zero patches, standard `ref()`/`computed()`/`watch` underneath, 1.1 kB of
glue. React stays outside this, having no tracked reads for a getter to flow
through.

The cheap mode was always in the engine. There was no way to write it down.
