---
title: API Reference
description: The complete public surface — runtime functions plus the class, component, and utility types that support them.
---

# API Reference

The entire public surface of the library, one entry per export. The *why*
behind each design lives in the guide; this page is the contract. Every
signature below ships in the 1.1 kB build.

## `Reactive(Class)`

Transforms a class's prototype **in place** — once, idempotently — and
returns the same constructor, typed as a reactive class.

```ts
function Reactive<C>(
  targetClass: C,
): ReactiveClass<C> & { Instance: ReactiveInstance<InstanceType<C>> }
```

What the transform does:

- Getters returning `ref()`/`computed()` become lazily-cached Refs/Computeds —
  created on first access, the same object forever after
  ([Reactive State](/guide/state)).
- Getters returning plain values de-optimize back to native prototype
  getters — the recommended default for derivations; reach for `computed()`
  only when the work is expensive or you need render suppression
  ([Computed & Watch](/guide/computed-watch)).
- Getters named `$…` are cached whole on first access — the singleton slot
  for composables and stores.
- Methods become lazily-bound, referentially-stable functions: `this` is
  always correct, `instance.method === instance.method` is always true.
- Injects `$watch`, `$watchEffect` and `$stopEffects` on the prototype.
- **Idempotent** — safe to call many times and at every level of an
  inheritance chain; each prototype is processed once.

```ts
class $Counter {
  get count() {
    return ref(0)
  }
  increment() {
    this.count.value++
  }
}
const Counter = Reactive($Counter)

new Counter().increment()
```

For anything with a future — parents, children, cross-file references —
export through the [namespace pattern](/guide/modules).

## `instance.$watch(source, callback, options?)`

Same signature as Vue's
[`watch`](https://vuejs.org/api/reactivity-core.html#watch), but the
watcher registers in the instance's **own lazily-created, detached effect
scope** — owned by the instance, not by whichever component constructed it.
Use it for instances that outlive components; component-scoped instances
use plain `watch` in the constructor instead
([Lifecycle & Teardown](/guide/lifecycle-teardown)).

```ts
const stop = instance.$watch(
  () => instance.count.value,
  (count, oldCount) => console.log(count, oldCount),
)
stop() // stop just this watcher
```

The scope is allocated on the first `$watch`/`$watchEffect` call only —
pure-data instances that never watch allocate nothing.

## `instance.$watchEffect(effect, options?)`

Vue's `watchEffect`, registered in the same lazy per-instance scope.
Returns the stop handle.

```ts
instance.$watchEffect(() => render(instance.width.value, instance.height.value))
```

## `instance.$stopEffects()`

Disposes the instance, in order:

1. runs your `stopEffects()` method if you defined one — the hook for
   non-Vue cleanup (sockets, subscriptions);
2. stops the effect scope — every `$watch` / `$watchEffect` watcher;
3. clears all cached Refs/Computeds and bound methods, so the instance can
   be garbage-collected.

```ts
instance.$stopEffects()
```

Accessing a member afterwards re-materializes it fresh.

## `propsWithDefaults(defaults, typedProps, cloner?)`

Merges plain default values into `defineComponent`-style prop definitions,
wrapping object and array defaults in factory functions so each component
instance receives a fresh copy.

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

- **Default cloner:** native `structuredClone` — zero dependencies, handles
  plain data, `Map`/`Set`/`Date`/typed arrays, and circular references.
- **`cloner` override:** pass your own (for example lodash `cloneDeep`)
  when defaults contain class instances or functions, which
  `structuredClone` cannot copy.
- Required props and primitive/function/class defaults pass through
  unwrapped.

## `isClass(value)`

```ts
function isClass(value: any): boolean
```

`true` for ES classes, `false` for arrow functions, normal functions, and
non-functions. Used internally by `propsWithDefaults`; exported because it
keeps being useful.

## Types

All types are erased from production output. The first group supports ivue's
extensible-component architecture directly; the later groups are available
when an application needs their narrower transformations.

### Extensible component types

| Type | Meaning |
|---|---|
| `ExtractPropDefaultTypes<O>` | Extracts the resolved prop values from a Vue runtime props object and marks every key as assigned, matching a defaults object consumed by `propsWithDefaults()` |
| `ExtractEmitTypes<T>` | Converts an object of emit validators into the overloaded emit function accepted by `defineEmits` and class constructors |
| `ExtendSlots<T>` | Keeps every slot in `T` and adds typed `before--*` and `after--*` extension slots around each one |

These three types keep inherited props, emits, and slots aligned as a component
grows. The complete pattern and examples live in
[Extensible Components](/guide/extensible-components).

### Reactive class types

| Type | Meaning |
|---|---|
| `ReactiveInstance<T>` | `T` plus `$watch`/`$watchEffect`/`$stopEffects`, with ref-returning getters re-typed as **writable** — the type of every unwrapping surface (`defineExpose`, `reactive()` interop) |
| `ReactiveClass<C>` | Preserves `C`'s constructor parameters and produces `ReactiveInstance<InstanceType<C>>` |

### Props utility types

| Type | Meaning |
|---|---|
| `VuePropsObject` | The runtime-props shape accepted by `propsWithDefaults()`: `Record<string, { type; default?; required? }>` |
| `VuePropsWithDefaults<T>` | The output shape of `propsWithDefaults()`, with every descriptor's `default` key present in the type |

### General utility types

These exports are optional conveniences. Applications can use their own
equivalents without changing how ivue works.

| Type | Meaning |
|---|---|
| `AnyFn` | Any callable function type |
| `RecordToUnion<T>` | Converts a record into the union of its value types |
| `ValueOf<T, K>` | Selects the value type at key `K` |
| `UnionToIntersection<U>` | Converts a union into an intersection |
| `PrefixKeys<T, P>` | Remaps every string key in `T` with prefix `P` |
| `FnParameter<F, K>` | Selects parameter `K` from function `F` |
| `IFnParameters<T, K>` | Extracts the full parameter tuple from function member `K` of `T` |
| `IFnParameter<T, P, K>` | Selects parameter `K` from function member `P` of `T`, including optional members |

## The formal specification

Each guarantee the engine maintains — its mechanism, and what it makes
impossible — is on the [Invariant-Based Design](/reference/invariants) page.
