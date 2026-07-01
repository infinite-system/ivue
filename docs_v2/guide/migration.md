---
title: Migrating from v1
description: A mechanical map from ivue v1 (ivue(), iref, no .value) to v2 (Reactive(), getters returning refs, .value) — what v2 drops, adds, and how to phase the move.
---

# Migrating from v1

v1 and v2 express the same idea. The mechanical differences are small and
predictable.

## The core change

| v1 | v2 |
|---|---|
| `ivue(MyClass, ...args)` | `new MyClass()` (after `Reactive(MyClass)`) |
| field `x = iref(0)` | getter `get x() { return ref(0) }` |
| read `inst.x` | read `inst.x.value` |
| getter auto-becomes computed | getter returns `computed(...)` explicitly |

```ts
// v1
class Counter {
  count = iref(0)
  get double() { return this.count * 2 }
  inc() { this.count++ }
}
const c = ivue(Counter)
c.count            // 0
```

```ts
// v2
class $Counter {
  get count()  { return ref(0) }
  get double() { return computed(() => this.count.value * 2) }
  inc() { this.count.value++ }
}
const Counter = Reactive($Counter)
const c = new Counter()
c.count.value      // 0
```

## What v2 drops on purpose

- **`init()`** — use the constructor; lifecycle belongs to the component.
- **`.toRefs()`** — unnecessary: getters already *are* refs, so `const { count } = inst`
  gives you the ref directly.
- **`.clone()` / `propsWithDefaults` deep clone** — not built into the core. v2
  ships `propsWithDefaults(defaults, typed, cloner?)` using `structuredClone` by
  default, with a `cloner` override (pass lodash `cloneDeep` for class-instance or
  function defaults). Port `clone()` yourself if you rely on it.

## What v2 adds

- **`$watch`** — scoped watcher (use instead of raw `watch`).
- **`$stopEffects`** — deterministic teardown.
- the **namespace module pattern** — cross-file hierarchies + circular-import
  safety ([Modules](/guide/modules)).

## Behavioral notes

- Instances are **plain** (`isReactive(inst) === false`). If you wrap one in
  `reactive()`, Vue auto-unwraps the refs returned from getters, so you read
  without `.value` through the proxy — but you rarely need to.
- A getter at one level + setter at another are **not merged** (native JS
  semantics). Use a single getter returning a writable computed instead
  ([Inheritance](/guide/inheritance#one-difference-from-native-js-and-v1)).

## Suggested approach

1. Adopt `Reactive()` for new classes now.
2. Convert fields → getters returning `ref()`; add `.value` at use sites (an editor
   "hide `.value`" hint keeps source clean; AI-assisted refactors make this quick).
3. Replace raw `watch()` with `this.$watch`.
4. If you need `clone()`/`toRefs()`, port them onto v2 before retiring v1.
