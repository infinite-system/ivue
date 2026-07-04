---
title: Reactive State
description: Declare state as ref-getters, derive with plain getters, memoize surgically with computed(). Covers writable computeds, stable bound methods, $-singletons, and private fields.
---

# Reactive State

In v2 you declare state as **getters that return refs**. That single convention
is what makes instances plain and creation lazy.

## ref

```ts
class $Box {
  get width() { return ref(100) }
  get tags() { return ref<string[]>([]) }
}
const box = new (Reactive($Box))()

box.width.value        // 100
box.width.value = 250  // write
box.tags.value.push('a')
```

The getter runs once per instance; the same ref is returned forever after.

## shallowRef

Use `shallowRef` for large structures you replace rather than mutate deeply:

```ts
get rows() { return shallowRef<Row[]>([]) }
// ...
inst.rows.value = nextRows   // triggers; deep mutations do not
```

## Derived values: plain getters first

Derive with a **plain getter** by default. No `computed()`:

```ts
class $Box {
  get w() { return ref(4) }
  get h() { return ref(3) }
  get area() { return this.w.value * this.h.value } // plain getter
}
```

It stays fully reactive: whatever effect reads `area` — a render, a watcher —
reads `w` and `h` underneath and subscribes to them directly. Change a source
and the effect re-runs.

Why this is the default:

- **Zero memory per instance.** A plain getter lives once, on the prototype.
  Every `computed()` allocates ~300 bytes per instance, paid at creation,
  read or not. Sixty computeds on 10k instances is real megabytes — see
  [Memory](/guide/performance#memory-derivations-weigh-nothing).
- **Zero staleness.** The value re-derives whenever it's read. Nothing to
  invalidate, nothing to reason about.
- **The engine helps.** On first access it sees a non-ref result and restores
  a native prototype getter — from then on it's ordinary JavaScript.

<DemoState />

## computed(): the surgical opt-in

Wrap a getter in `computed()` when the memoization earns its bytes:

```ts
get sorted() {
  return computed(() => [...this.rows.value].sort(byScore)) // expensive: memoize
}
```

Reach for it when:

- the derivation is genuinely **expensive** (sorting/filtering large arrays);
- an unchanged result should **suppress re-renders** (Vue 3.4+ computeds stop
  propagation on equal values, plain getters cannot);
- you need a **stable ref identity** to hand to `watch`, a prop, or a composable.

Read it with `.value` — standard Vue computed semantics.

### Writable computed

Return a computed with `get`/`set` to make a two-way derived value:

```ts
get celsius() { return ref(20) }
get fahrenheit() {
  return computed({
    get: () => this.celsius.value * 9 / 5 + 32,
    set: (f: number) => { this.celsius.value = (f - 32) * 5 / 9 },
  })
}
// inst.fahrenheit.value = 100  → updates celsius
```

## Methods

Plain methods just work. They're bound to the instance, so `this` is always
correct — even when detached:

```ts
class $Box {
  get w() { return ref(1) }
  grow() { this.w.value++ }
}
const box = new (Reactive($Box))()
const { grow } = box   // detached
grow()                 // still updates box.w
box.grow === box.grow  // true — referentially stable
```

## Plain (non-reactive) getters

A getter that returns a **non-ref** value is fine — ivue detects it on first
access and turns it back into a normal getter (zero overhead, see
[Principles #4](/guide/principles#_4-self-optimizing)):

```ts
get kind() { return 'box' }   // just a normal getter
```

## `$`-prefixed singletons

A getter whose name starts with `$` is cached **whole, forever** on first access —
ideal for "create this composable/service once per instance":

```ts
import { useMouse } from '@vueuse/core'

class $Pointer {
  get $mouse() { return useMouse() }  // created once, reused
  get x() { return this.$mouse.x }
  get y() { return this.$mouse.y }
}
```

## Private fields

Regular class privates work as encapsulated, non-reactive instance state:

```ts
class $Cache {
  #hits = 0
  get value() { return ref(0) }
  read() { this.#hits++; return this.value.value }
}
```
