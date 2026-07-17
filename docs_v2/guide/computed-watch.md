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
  get items() {
    return ref<{ price: number }[]>([]);
  }
  get total() {
    return this.items.value.reduce((sum, item) => sum + item.price, 0);
  }
}
```

When a render (or watcher) reads `total`, execution runs synchronously inside
that effect — so every reactive leaf the getter touches subscribes the effect
directly. A source changes, the effect re-runs, the getter re-derives.
Dependencies re-collect on every run, so conditional branches always track
correctly.

The payoff is memory. A plain getter lives once on the prototype and weighs
**zero bytes per instance**. In ivue, a getter returning `computed()` is lazy:
its ~300-byte cell is paid only on instances that first read it. By contrast,
computed fields and ordinary composables allocate eagerly. Sixty observed
computeds on a 10k-row list is ~300 MB of bookkeeping; untouched ivue members
allocate nothing. Full numbers in
[Memory](/guide/performance#memory-derivations-weigh-nothing).

Because derivations add zero bytes per instance, they absorb what templates elsewhere carry
inline: every `v-if` combination, comparison and ternary becomes a **named**
plain getter (`canEditItems`, not `items.length && !loading && …`). The
condition gains a name, a single home, and testability — and costs nothing
([the template rule](/guide/components#the-rules-that-keep-it-clean)).

## computed(): your useMemo

Wrap a getter in `computed()` when memoization earns its bytes:

- the derivation is genuinely **expensive** (sorting/filtering large arrays,
  heavy string building);
- an unchanged result should **suppress re-renders** — a Vue 3.4+ computed
  stops propagation when the value is equal, a plain getter cannot;
- you need a **stable ref identity** to hand to `watch`, a prop, or a
  composable.

```ts
get sortedItems() {
  return computed(() => [...this.items.value].sort(byPrice))
}
```

Each instance and each inheritance level caches its computed under a distinct
key, so overrides and `super` never collide
([Inheritance](/guide/inheritance)).

### Point the computed at a method

Prefer the **thin** form: the computed is only the caching shell, and the
logic lives in a method.

```ts
// ✅ THIN — the closure is a pointer; the logic lives on the prototype
get sortedItems() {
  return computed(() => this.sortItems())
}
sortItems() {
  return [...this.items.value].sort(byPrice)
}

// ❌ FAT — the logic is frozen into a per-instance closure
get sortedItems() {
  return computed(() => [...this.items.value].sort(byPrice))
}
```

::: warning Why not `computed(this.sortItems)` without the arrow?
It works in ivue — methods are lazy-bound, so the reference carries its
instance (in a vanilla class this is the classic detached-`this` bug). But
since Vue 3.4 a computed getter **receives the
previous value as its first argument** — so the day someone gives the
method an optional parameter, that parameter silently receives stale data.
No error, just wrong results. The arrow is refactor-proof and idiomatic:
always use it.
:::

A computed is a _cache_, not a home for logic — and the thin form is what
makes that doctrine mechanical:

- **Memory.** The thin closure captures nothing but the instance — a
  pointer-sized hop to logic that exists **once per class** on the
  prototype. A fat closure invites per-instance captures: any local you
  reference from the getter's scope stays alive for as long as the
  instance does. The thin form's footprint is the guaranteed minimum by
  construction.
- **Testability & reuse.** `instance.sortItems()` is directly callable in a
  test and from other methods — no reactive plumbing required to exercise
  the logic.

Reactivity is unaffected: the method's reads (`this.items.value`) are
tracked through the computed's evaluation exactly as if they were inlined.

See both side by side — the plain getter re-derives freely while the
computed's body only runs when its dependency actually changes:

<DemoDerived />

## Watching plain getters — yes, it works

You do not need a Ref or a Computed to watch a derived value.
`watch(() => instance.someDerived, cb)` works on the **raw** instance — no
`reactive()` wrapper anywhere:

```ts
import { watch } from 'vue';
import { Reactive } from 'ivue';

class $Invoice {
  get quantity() {
    return ref(2);
  }
  get price() {
    return ref(50);
  }

  // plain getters — no Refs/Computeds of their own
  get subtotal() {
    return this.quantity.value * this.price.value;
  }
  get totalLabel() {
    return `$${(this.subtotal * 1.13).toFixed(2)}`;
  }
}
const Invoice = Reactive($Invoice);

const invoice = new Invoice();

// ✓ watching a plain getter on the RAW instance — fires on any leaf change
watch(
  () => invoice.totalLabel,
  (label) => console.log('total:', label),
);

invoice.quantity.value = 3; // → "total: $169.50"
invoice.price.value = 40; // → "total: $135.60"

// ✓ also works through a component boundary (template ref / expose):
watch(() => invoiceRef.value?.totalLabel, onTotalChange);

// ✗ the ONE mistake: snapshotting — this passes a dead string, never fires
watch(invoice.totalLabel, onTotalChange);
```

Not intuitive, but structural: a watch **source is a function executed
inside the watcher's effect**. `totalLabel` runs there, reads `subtotal`,
which reads `quantity.value` and `price.value` — and those leaf reads subscribe
the watcher directly. The getter chain is a transparent corridor — the same
leaf-tracking that makes plain getters reactive in templates, so it survives
any number of getters deep and passes straight through the expose surface
(verified live in production). The only hard rule: the source must be the
**function form** — `() => instance.someDerived`, never `instance.someDerived`.

## `$watch`

**For watchers on instances that live outside a component.** Inside
`setup()`, plain `watch()` is fine — the component scope owns and stops it.
But a module singleton, or an instance created in a callback or async code,
has no component scope; a plain `watch()` there leaks. `this.$watch` is the
fix: same signature as Vue's `watch`, registered in the instance's own lazy
effect scope, torn down by [`$stopEffects`](/guide/lifecycle-teardown).

```ts
class $Search {
  get query() {
    return ref('');
  }
  get results() {
    return ref<string[]>([]);
  }

  constructor() {
    this.$watch(
      () => this.query.value,
      (query) => {
        this.results.value = runSearch(query);
      },
      { debounce: 0 },
    );
  }
}
```

## `$watchEffect`

The `watchEffect` twin — same lazy per-instance scope, same teardown:

```ts
this.$watchEffect(() => {
  render(this.width.value, this.height.value);
});
```

`$watch` returns Vue's stop handle, so you can stop a single watcher without
tearing down the instance:

```ts
const stop = this.$watch(() => this.query.value, onChange);
// ...later
stop();
```
