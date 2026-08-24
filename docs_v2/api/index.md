---
title: API Reference
description: The complete public surface — runtime functions plus the class, component, and utility types that support them.
relatedPosts: [one-kilobyte-feature]
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

## `instance.$stopEffects(options?)`

Disposes the instance, in order:

1. stops the effect scope — every `$watch` / `$watchEffect` watcher;
2. clears all cached Refs/Computeds and bound methods, so the instance can
   be garbage-collected.

```ts
instance.$stopEffects()                 // stop + clear (disposal is a reset)
instance.$stopEffects({ reset: false }) // stop the watchers ONLY
```

Accessing a member after the default call re-materializes it fresh — the
initializers run again. With `{ reset: false }` every cached cell survives
with its current value: the watchers die, the state stays, and the
instance can `$watch` again in a fresh scope — the suspend/resume pattern
(keep watcher wiring in a `startWatchers()` method the constructor calls,
and resuming is one call). There are no teardown hooks — richer cleanup is
an ordinary method of yours that does its own work and then calls
`$stopEffects()` ([Lifecycle & Teardown](/guide/lifecycle-teardown)).

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

## `Static(Class)` — from `ivue/extras`

The static-side sibling of `Reactive()`, for **stateless capability
classes** — function bags published behind a namespace's replaceable
`Class` slot. Imported from the separate `ivue/extras` entry so the
primary `ivue` entry stays the bare engine. This page is the contract;
the guide is [Static() — Capability Classes](/guide/static).

```ts
import { Static } from 'ivue/extras';
```

`Static()` returns a subclass of the given class (the raw class is
never touched — it stays a clean foundation for `extends`) and
transforms two member kinds:

- **Static methods bind lazily with stable identity.** `Class.method`
  is the same function on every read, bound to the receiving class —
  safe to detach, hand to a router, keep in a registry. Because
  binding resolves through the receiver at first read, a subclass's
  overrides are honored.
- **Get-only static accessors named `$…` become
  compute-once-per-receiver caches.** The getter body runs on first
  read through a given class; the result is stored on that receiver
  and returned forever after. The guard checks **own** properties
  only, so a parent's cache can never shadow a subclass: each class in
  a hierarchy derives through its own overrides on its own first read,
  in any read order.

```ts
class $ScrollMomentum {
  // a live knob — subclasses pinch it, so NO $ prefix
  static get friction() {
    return 2;
  }

  // derived once per receiver — the $ prefix is the API
  static get $atRest() {
    return { velocity: 0, threshold: this.friction * 10 };
  }

  static settle(velocity: number) {
    return Math.abs(velocity) < this.$atRest.threshold;
  }
}

export namespace ScrollMomentum {
  export const $Class = Static($ScrollMomentum); // anchor — children `extends` this
  export let Class = $Class; // selection — kernels/tests swap this
}
```

Semantics to rely on:

- **The `$` prefix promises stable identity per receiver — nothing
  more.** The getter body runs once per class; every later read
  returns the same value. Whether that value is immutable config or a
  deliberately mutable memo table is the author's design — the engine
  does not freeze it. A static getter that must stay live — a knob for
  test subclasses, a fresh-per-read value — must not use the prefix.
  (Measured on Node 26: the caching getter's warm read costs ~4–6 ns
  more than a plain property — invisible at any real call frequency;
  in a genuinely hot loop, hoist the value into a local once.)
- **Caching is per receiver**: when a subclass overrides an input,
  `Sub.$x !== Base.$x`. Compare by value, or through one receiver.
  Bound methods follow the same rule — `Sub.method` binds to `Sub`,
  in any read order.
- **`$` semantics are granted by the transform.** A raw class, a raw
  subclass, or a class only passed through `Reactive()` keeps native
  getter behavior — exactly as an unwrapped class's *instance*
  `$`-getters aren't cached either. A class that needs instance
  reactivity **and** static `$`-caches composes the transforms:

  ```ts
  export namespace Settings {
    // the anchor: statics wrapped once, at definition
    export const $Class = Static($Settings);
    // Reactive() is in-place — Class === $Class
    export let Class = Reactive($Class);
    export type Instance = typeof Class.Instance;
  }
  ```

  `Static()` wraps the statics at the anchor, so subclasses and test
  doubles inherit working static semantics by extending `$Class`;
  `Reactive()` then transforms the prototype in place. Instances carry
  full reactive semantics; the static surface carries binding and
  `$`-caching.
- Accessor pairs with a setter, getters without the `$` prefix, and
  instance members are untouched by `Static()`.

## `LazyShared<T>` — from `ivue/extras`

```ts
class LazyShared<T> {
  constructor(make: () => T);
  get value(): T; // constructs on first read, then memoizes
  reset(): void; // drop the value; the next read constructs again
}
```

The safe **shared-store cell** for static classes. It closes a triangle
no other member kind can:

- A `$`-prefixed static getter caches **per receiver** — right for
  memos and per-class tuning, wrong for a shared store: a subclass
  reading `this.$store` silently forks the registry.
- A plain `static readonly` field is shared and never forks — but its
  initializer runs at **module load**, so constructing another
  namespace's class there races import cycles.
- `LazyShared` is both: the field eagerly stores the CELL (load-safe —
  a thunk evaluates nothing), the thunk runs on the first `.value`
  read (cycle-safe — every module in any import cycle has finished
  loading), and memoization lives inside the cell (fork-safe — no
  receiver, subclass included, can fork it).

```ts
import { Static, LazyShared } from 'ivue/extras';

class $SearchRegistry {
  // ONE backend for the whole hierarchy — the field IS the pin
  protected static readonly sharedBackend = new LazyShared(
    () => new SearchBackend.Class(),
  );

  protected static get $backend() {
    return this.sharedBackend.value;
  }
}

export namespace SearchRegistry {
  export const $Class = Static($SearchRegistry);
  export let Class = $Class;
}
```

Guarantees:

- A thunk that reads its own cell (directly or through another cell)
  throws a **named cycle error** instead of a bare stack overflow.
- A thunk that throws leaves the cell **retryable, never poisoned** —
  the next read runs the thunk again.
- `reset()` exists for tests and process recomposition; production
  code never resets.

The pattern in full — when a shared store beats a `$`-getter, and how
the two divide the static world — is in
[Caches, Registries & self](/guide/caches-and-registries).

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
impossible — is on [The Invariants Behind ivue](/reference/invariants).
