---
title: API Reference
description: Reactive(), instance.$watch, instance.$stopEffects, propsWithDefaults, isClass, and the ReactiveInstance / ReactiveClass types.
---

# API Reference

## `Reactive(Class)`

Transforms a class's prototype in place and returns the same class, typed as a
reactive class.

```ts
function Reactive<C>(targetClass: C): ReactiveClass<C> & { Instance: ReactiveInstance<InstanceType<C>> }
```

- Getters returning `ref()`/`computed()` become lazily-cached reactive cells.
- Getters returning plain values de-optimize to native prototype getters — the
  recommended default for simple derivations (memoize with `computed()` only
  when the work is expensive or you need render suppression).
- Getters named `$…` are cached whole (singletons).
- Methods become lazily-bound, referentially-stable functions.
- Injects `$watch` and `$stopEffects` on the prototype.
- **Idempotent** — safe to call multiple times and across an inheritance chain.

```ts
const Counter = Reactive(class {
  get count() { return ref(0) }
  inc() { this.count.value++ }
})
new Counter().inc()
```

## `instance.$watch(source, cb, options?)`

Same signature as Vue's [`watch`](https://vuejs.org/api/reactivity-core.html#watch).
Registers the watcher in the instance's lazily-created effect scope and returns a
stop handle.

```ts
const stop = inst.$watch(() => inst.count.value, (v, old) => { /* ... */ })
stop() // stop just this watcher
```

The effect scope is allocated on first `$watch` only.

## `instance.$stopEffects()`

Disposes the instance:

1. runs a user `stopEffects()` method if present,
2. stops the effect scope (all `$watch` watchers),
3. clears all cached cells.

```ts
inst.$stopEffects()
```

## `propsWithDefaults(defaults, typedProps, cloner?)`

Merges plain default values into `defineComponent`-style prop definitions, wrapping
object/array defaults in factory functions (so each component instance gets a
fresh copy).

```ts
const props = propsWithDefaults(
  { size: { w: 10, h: 10 }, label: 'box', items: [] },
  {
    size:  { type: Object },
    label: { type: String },
    items: { type: Array },
  },
)
```

- **Default cloner:** native `structuredClone` (zero-dependency; handles plain
  data, `Map`/`Set`/`Date`/typed arrays, circular refs).
- **`cloner` override:** pass your own (e.g. lodash `cloneDeep`) for defaults that
  contain class instances or functions, which `structuredClone` can't clone.
- Required props and primitive/function/class defaults are passed through
  unwrapped.

## `isClass(value)`

```ts
function isClass(value: any): boolean
```

`true` for ES classes, `false` for arrow functions, normal functions, and
non-functions. Used internally by `propsWithDefaults`; exported for convenience.

## Types

| Type | Meaning |
|---|---|
| `ReactiveInstance<T>` | `T` + `$watch` + `$stopEffects` + writable-getter keys |
| `ReactiveClass<C>` | constructor producing a `ReactiveInstance` |
| `VuePropsObject` | `Record<string, { type; default?; required? }>` |
| `VuePropsWithDefaults<T>` | `T` with every prop's `default` present |

## Invariants spec

The full, rigorous specification of the engine — each guarantee, its mechanism,
and what it makes impossible — is on the [Invariants](/reference/invariants) page.
