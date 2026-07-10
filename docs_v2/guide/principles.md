---
title: Principles
description: The eight guarantees behind ivue — plain instances, lazy cached state, plain derived getters, surgical computed(), native inheritance, composable modules, and scoped teardown.
---

# Principles

Everything ivue does follows from eight guarantees. Knowing them is
enough to predict its behavior in any situation.

## Plain instances, no proxy

`new Counter()` returns an ordinary object. `Reactive()` never wraps the instance
in `reactive()`. Reactivity comes only from the `ref()` / `computed()` you return
from getters — opt-in, per property.

```ts
const counter = new Counter()
isReactive(counter) // false
```

**Why it matters:** creating an instance costs a plain `new`. A million unused
instances cost almost nothing.

## State is a getter that returns a ref

You declare reactive state as a getter returning `ref()`, `shallowRef()` or
`computed()`, and read/write through `.value`.

```ts
get width() {
  return ref(100) // declaration
}
instance.width.value = 250            // read & write
```

The getter body runs **at most once per instance** — the returned ref is cached
and reused on every later access, so the reactive identity is stable.

## Lazy + cached + stable

Nothing is created until first access. After that it's cached on the instance:

- a getter's ref/computed is created once, then returned identically every time;
- a method is bound once, then returned identically (referentially stable — safe
  as an event handler).

## Derive with plain getters; the engine self-optimizes

Derived values are **plain getters by default**, not `computed()`:

```ts
get area() {
  return this.width.value * this.height.value // reactive, zero allocation
}
```

On first access the engine sees a non-ref result and restores a native getter
on the prototype — from then on it is ordinary JavaScript, re-derived inside
whatever effect reads it. Plain getters live once on the prototype and weigh
**nothing per instance**; every eager `computed()` costs ~300 bytes per
instance whether it is ever read or not. Memoize surgically —
[when it earns it](/guide/computed-watch#computed-your-usememo).

## `computed()` is a cache — apply it surgically

When memoization earns its ~300 bytes per instance, wrap the getter in
`computed()` — it is your `useMemo`:

```ts
get sortedItems() {
  return computed(() => this.sortItems()) // cached derived
}
sortItems() {
  return [...this.items.value].sort(byPrice)
}
```

Reach for it when the derivation is genuinely **expensive**, when an
unchanged result should **suppress re-renders** (a Vue 3.4+ computed stops
propagation on equal values; a plain getter cannot), or when you need a
**stable ref identity** to hand to `watch`, a prop, or a composable. Keep it
**thin**: the computed is the caching shell, the logic lives in a method on
the prototype — testable, hot-graftable, minimum footprint. See
[Computed & Watch](/guide/computed-watch#computed-your-usememo).

## Native inheritance & `super`

Processing runs base → child, and every `(prototype, key)` gets its own cache
symbol. So a child's computed and the `super` computed it calls cache separately
and never collide — `super.x.value` resolves through the whole chain exactly like
native classes. See [Inheritance](/guide/inheritance).

## Modules compose; circular references resolve

Each class is transformed in its own file at load time, and the transform is
idempotent — shared ancestors are processed once, no matter the import order. The
[namespace pattern](/guide/modules) (`$Class` raw + `Class` reactive) exposes
classes through a hoisted object, so mutual cross-references between files resolve
in any order and survive cross-file HMR.

## Teardown is scope-based

`$watch` registers watchers in a **lazily-created** per-instance effect scope;
`$stopEffects` stops that scope, runs an optional `stopEffects()` hook, and clears
the caches. Instances that never `$watch` allocate no scope — teardown stays
pay-for-what-you-use. See [Lifecycle & Teardown](/guide/lifecycle-teardown).

---

::: info Want the formal version?
These are the user-facing form of the engine's invariants. For the rigorous
specification — mechanism, guarantees, and what each one makes *impossible* — see
[Invariants](/reference/invariants).
:::
