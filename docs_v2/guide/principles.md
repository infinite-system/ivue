# Principles

Everything ivue v2 does follows from a handful of guarantees. Knowing them is
enough to predict its behavior in any situation.

## 1. Plain instances, no proxy

`new Counter()` returns an ordinary object. `Reactive()` never wraps the instance
in `reactive()`. Reactivity comes only from the `ref()` / `computed()` you return
from getters — opt-in, per property.

```ts
const c = new Counter()
isReactive(c) // false
```

**Why it matters:** creating an instance costs a plain `new`. A million unused
instances cost almost nothing.

## 2. State is a getter that returns a ref

You declare reactive state as a getter returning `ref()`, `shallowRef()` or
`computed()`, and read/write through `.value`.

```ts
get width() { return ref(100) }   // declaration
inst.width.value = 250            // read & write
```

The getter body runs **at most once per instance** — the returned ref is cached
and reused on every later access, so the reactive identity is stable.

## 3. Lazy + cached + stable

Nothing is created until first access. After that it's cached on the instance:

- a getter's ref/computed is created once, then returned identically every time;
- a method is bound once, then returned identically (referentially stable — safe
  as an event handler).

## 4. Self-optimizing

If a getter returns a **plain value** instead of a ref, ivue detects it on first
access and restores a native getter on the prototype — removing all overhead for
that property forever. You don't pay reactive machinery for non-reactive getters.

```ts
get kind() { return 'box' } // de-optimizes to a normal getter automatically
```

## 5. Native inheritance & `super`

Processing runs base → child, and every `(prototype, key)` gets its own cache
symbol. So a child's computed and the `super` computed it calls cache separately
and never collide — `super.x.value` resolves through the whole chain exactly like
native classes. See [Inheritance](/guide/inheritance).

## 6. Modules compose; circular references resolve

Each class is transformed in its own file at load time, and the transform is
idempotent — shared ancestors are processed once, no matter the import order. The
[namespace pattern](/guide/modules) (`$Class` raw + `Class` reactive) exposes
classes through a hoisted object, so mutual cross-references between files resolve
in any order and survive cross-file HMR.

## 7. Teardown is scope-based

`$watch` registers watchers in a **lazily-created** per-instance effect scope;
`$stopEffects` stops that scope, runs an optional `stopEffects()` hook, and clears
the caches. Instances that never `$watch` allocate no scope — teardown stays
pay-for-what-you-use. See [Teardown](/guide/teardown).

---

::: info Want the formal version?
These are the user-facing form of the engine's invariants. The repository ships a
rigorous specification — mechanism, guarantees, and what each one makes
*impossible* — in [`lib/Reactive.invariants.md`](https://github.com/infinite-system/ivue/blob/main/lib/Reactive.invariants.md).
:::
