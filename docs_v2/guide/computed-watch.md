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

## Watching plain getters — yes, it works

You do not need a Ref or a Computed to watch a derived value.
`watch(() => inst.someDerived, cb)` works on the **raw** instance — no
`reactive()` wrapper anywhere:

```ts
import { watch } from 'vue'
import { Reactive } from 'ivue'

class $Invoice {
  get qty() { return ref(2) }
  get price() { return ref(50) }

  // plain getters — no Refs/Computeds of their own
  get subtotal() { return this.qty.value * this.price.value }
  get totalLabel() { return `$${(this.subtotal * 1.13).toFixed(2)}` }
}
export namespace Invoice {
  export const $Class = $Invoice
  export const Class = Reactive($Invoice)
  export type Instance = typeof Class.Instance
}

const inv = new Invoice.Class()

// ✓ watching a plain getter on the RAW instance — fires on any leaf change
watch(() => inv.totalLabel, (label) => console.log('total:', label))

inv.qty.value = 3      // → "total: $169.50"
inv.price.value = 40   // → "total: $135.60"

// ✓ also works through a component boundary (template ref / expose):
watch(() => invoiceRef.value?.totalLabel, onTotalChange)

// ✗ the ONE mistake: snapshotting — this passes a dead string, never fires
watch(inv.totalLabel, onTotalChange)
```

Not intuitive, but structural: a watch **source is a function executed
inside the watcher's effect**. `totalLabel` runs there, reads `subtotal`,
which reads `qty.value` and `price.value` — and those leaf reads subscribe
the watcher directly. The getter chain is a transparent corridor — the same
leaf-tracking that makes plain getters reactive in templates, so it survives
any number of getters deep and passes straight through the expose surface
(verified live in production). The only hard rule: the source must be the
**function form** — `() => inst.x`, never `inst.x`.

## `$watch`

**For watchers on instances that live outside a component.** Inside
`setup()`, plain `watch()` is fine — the component scope owns and stops it.
But a module singleton, or an instance created in a callback or async code,
has no component scope; a plain `watch()` there leaks. `this.$watch` is the
fix: same signature as Vue's `watch`, registered in the instance's own lazy
effect scope, torn down by [`$stopEffects`](/guide/teardown).

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

::: tip
Need effect-style instead of source/callback? Use
[`$watchEffect`](#watcheffect) — never wrap a `watchEffect` inside `$watch`.
:::

## `$watchEffect`

The `watchEffect` twin — same lazy per-instance scope, same teardown:

```ts
this.$watchEffect(() => {
  render(this.width.value, this.height.value)
})
```

`$watch` returns Vue's stop handle, so you can stop a single watcher without
tearing down the instance:

```ts
const stop = this.$watch(() => this.query.value, onChange)
// ...later
stop()
```

