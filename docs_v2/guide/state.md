---
title: Reactive State
description: Declare state as ref-getters, derive with plain getters, memoize surgically with computed(). Covers writable computeds, stable bound methods, $-singletons, and private fields.
---

# Reactive State

In ivue you declare state as **getters that return refs**. That single convention
is what makes instances plain and creation lazy.

## ref

```ts
class $Box {
  get width() { return ref(100) }
  get tags() { return ref<string[]>([]) }
}
const Box = Reactive($Box)

const box = new Box()

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
  get width() { return ref(4) }
  get height() { return ref(3) }
  get area() { return this.width.value * this.height.value } // plain getter
}
```

It stays fully reactive: whatever effect reads `area` — a render, a watcher —
reads `width` and `height` underneath and subscribes to them directly. Change a source
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
    set: (fahrenheit: number) => { this.celsius.value = (fahrenheit - 32) * 5 / 9 },
  })
}
// inst.fahrenheit.value = 100  → updates celsius
```

## Methods

Plain methods just work. They're bound to the instance, so `this` is always
correct — even when detached:

```ts
class $Box {
  get width() { return ref(1) }
  grow() { this.width.value++ }
}
const Box = Reactive($Box)

const box = new Box()
const { grow } = box   // detached
grow()                 // still updates box.width
box.grow === box.grow  // true — referentially stable
```

## Plain (non-reactive) getters

A getter that returns a **non-ref** value is fine — ivue detects it on first
access and turns it back into a normal getter (zero overhead, see
[Principles](/guide/principles#derive-with-plain-getters-the-engine-self-optimizes)):

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

## Keyed reactivity: the third shape

Ref-getters express **named** state — members you can list when you author
the class. `shallowRef` expresses **wholesale-replaced** structures. There is
a third shape the getter syntax cannot reach: **keyed state** — sparse,
unbounded, indexed by ids or coordinates unknown until runtime (cells of a
sheet, rows of a stream, entities by id). You cannot write a getter per key.

The pattern: hold **collections of reactive primitives as plain values**, and
materialize them per observation.

```ts
class $Sheet {
  // Plain readonly fields — the COLLECTIONS aren't reactive; their VALUES are.
  private readonly cellVersions = new Map<number, Ref<number>>();

  /** READ path: get-OR-CREATE, then subscribe — observation materializes. */
  private trackCell(cellKey: number): void {
    let versionRef = this.cellVersions.get(cellKey);
    if (!versionRef) {
      versionRef = ref(0);
      this.cellVersions.set(cellKey, versionRef);
    }
    void versionRef.value; // subscribes whatever effect is currently running
  }

  /** WRITE path: PEEK-ONLY — unobserved keys allocate nothing, notify no one. */
  private bumpCell(cellKey: number): void {
    const versionRef = this.cellVersions.get(cellKey);
    if (versionRef) versionRef.value++;
  }
}
```

The read/write **asymmetry is the pattern**: reads get-or-create (so cost is
priced by observation), writes peek (so mere existence is free). Four rules
keep it honest:

- **Ground truth lives in plain storage** (typed arrays, Maps). The refs are
  *version signals*, not value holders — bump to invalidate, let readers
  re-derive from ground truth.
- **Cached computeds per key** follow the same shape
  (`Map<key, ComputedRef>`), with bodies that
  [delegate to methods](/guide/computed-watch#point-the-computed-at-a-method)
  and an **explicit release path** — keyed overlays cannot garbage-collect on
  their own (the Map holds strong references; attached watchers subscribe
  permanently), so eviction is part of the design, not an afterthought.
- **Coarse tiers are the same pattern at lower resolution**: one ref covering
  many keys — a 4,096-row block, or a single version counter for a whole
  collection — for subscribers that span many keys. One integer where naive
  design would put a million nodes.
- **No wrapper needed.** `ref()`/`computed()` are first-class values from
  `@vue/reactivity`; storing them in Maps inside a `Reactive()` class
  composes with everything — methods stay bound, HMR grafts, `$watch` works.

| state shape                    | expression                                              |
| ------------------------------ | ------------------------------------------------------- |
| named members                  | `get x() { return ref(v) }`                             |
| wholesale-replaced structure   | `get rows() { return shallowRef<Row[]>([]) }`           |
| keyed / sparse / unbounded     | `Map<key, Ref>` + get-or-create track, peek-only bump   |

Each shape is the same law at a different granularity — *nothing exists
until observed*: getters price **members**, keyed collections price
**keys**. Proven at scale in
[the Flyweight Pattern](/guide/flyweight): 20,000,000 live formula-capable
cells at 4.7 bytes each, with the overlay evicted as observation moves.
