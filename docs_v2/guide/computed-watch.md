---
title: Computed & Watch
description: Plain getters derive reactively with zero per-instance cost; computed() is the surgical opt-in. Plus this.$watch, the scoped watcher with clean teardown.
---

# Computed & Watch

## Derived values: plain getters by default

The most important thing on this page: **you usually don't need `computed()`.**
A plain getter is already reactive.

```ts
class $Cart {
  get items() { return ref<{ price: number }[]>([]) }
  get total() { return this.items.value.reduce((s, i) => s + i.price, 0) }
}
```

When a render (or watcher) reads `total`, execution runs synchronously inside
that effect — so every reactive leaf the getter touches subscribes the effect
directly. A source changes, the effect re-runs, the getter re-derives.
Dependencies re-collect on every run, so conditional branches always track
correctly.

The payoff is memory. A plain getter lives once on the prototype and weighs
**zero bytes per instance**. Every eager `computed()` costs ~300 bytes per
instance at creation, read or not — 60 of them on a 10k-row list is ~300 MB
of pure bookkeeping avoided. Full numbers in
[Memory](/guide/performance#memory-derivations-weigh-nothing).

## computed(): your useMemo

Wrap a getter in `computed()` when memoization earns its bytes:

- the derivation is genuinely **expensive** (sorting/filtering large arrays,
  heavy string building);
- an unchanged result should **suppress re-renders** — a Vue 3.4+ computed
  stops propagation when the value is equal, a plain getter cannot;
- you need a **stable ref identity** to hand to `watch`, a prop, or a
  composable.

```ts
get sorted() {
  return computed(() => [...this.items.value].sort(byPrice))
}
```

Each instance and each inheritance level caches its computed under a distinct
key, so overrides and `super` never collide
([Inheritance](/guide/inheritance)).

See both side by side — the plain getter re-derives freely while the
computed's body only runs when its dependency actually changes:

<DemoDerived />

## Watch

Use the engine-injected **`this.$watch`** to react to changes. It has the same
signature as Vue's `watch`, but registers the watcher in the instance's effect
scope so [`$stopEffects`](/guide/teardown) can clean it up.

```ts
class $Search {
  get query() { return ref('') }
  get results() { return ref<string[]>([]) }

  constructor() {
    this.$watch(
      () => this.query.value,
      (q) => { this.results.value = runSearch(q) },
      { debounce: 0 },
    )
  }
}
```

::: tip Which watcher, where
An instance created during a component's `setup()` can use plain `watch()` /
`watchEffect()` freely — Vue's component scope owns watchers created
synchronously there and stops them on unmount. `$watch` / `$watchEffect`
exist for everything else: instances that **outlive a component** (module
singletons, entities created in callbacks or async code) register into the
instance's own scope, so `$stopEffects()` tears them down deterministically.
Never wrap a `watchEffect` inside `$watch` — `$watchEffect` is the
symmetric primitive.
:::

## `$watchEffect`

The `watchEffect` twin — same lazy per-instance scope, same teardown:

```ts
this.$watchEffect(() => {
  render(this.width.value, this.height.value)
})
```

## Watching plain getters — yes, it works

`watch(() => inst.someDerived, cb)` works on the **raw** instance — no
`reactive()` wrapper, no Ref/Computed required. Not intuitive, but structural: a
watch *source* is a function executed **inside the watcher's effect**; the
plain getter's body runs there, and its leaf reads (refs via `.value`,
props, stores) subscribe the watcher directly. The getter is a transparent
corridor — the same mechanism that makes plain getters reactive in
templates. It holds through the expose surface too:
`watch(() => playerRef.value.someDerivedPx, cb)` fires exactly when the
getter's actual leaves change (verified live). What does NOT work is
snapshotting: `watch(inst.someDerived, cb)` passes a dead value — the
source must be the function form.

`$watch` returns Vue's stop handle, so you can stop a single watcher without
tearing down the instance:

```ts
const stop = this.$watch(() => this.query.value, onChange)
// ...later
stop()
```

## watchEffect-style

Need `watchEffect`? Run it inside the same scope by calling Vue's `watchEffect`
from within a `$watch`-style helper, or create your own `effectScope`. For most
cases `this.$watch(source, cb)` is enough — see
[Teardown](/guide/teardown) for the full lifecycle.
