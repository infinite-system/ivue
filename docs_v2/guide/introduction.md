---
title: What is ivue?
description: ivue builds Vue 3 reactivity from plain TypeScript classes. Meet Reactive() — the v2 engine — and see how it differs from the v1 ivue() approach.
---

# What is ivue?

**ivue** (Infinite Vue) lets you build Vue 3 reactivity out of plain TypeScript
classes — with real inheritance, encapsulation and polymorphism — instead of
loose composables.

`Reactive()` is the v2 engine. It takes a class and transforms its prototype
**once** so that:

- **getters** that return `ref()` / `computed()` become lazily-cached reactive cells, and
- **methods** become lazily-bound functions,

while the instances themselves stay **ordinary objects** — no `reactive()` proxy
wrapping each one.

```ts
import { Reactive } from 'ivue'
import { ref, computed } from 'vue'

class $Timer {
  get seconds() { return ref(0) }
  get label() { return computed(() => `${this.seconds.value}s`) }
  tick() { this.seconds.value++ }
}
export const Timer = Reactive($Timer)
```

```ts
const t = new Timer()
t.tick()
t.seconds.value // 1
t.label.value   // "1s"
```

## Why classes?

Composables are great for small, local state. As an app grows, you want
**structure**: shared base behavior, overridable pieces, encapsulated internals,
a clear "this is the model" boundary. Classes give you that natively — `extends`,
`super`, `private`, getters/setters — and ivue makes them reactive without
asking you to give any of it up.

## ivue v1 vs v2

ivue ships two engines. They express the same idea differently.

| | **v1 — `ivue()`** | **v2 — `Reactive()`** |
|---|---|---|
| How | wraps each instance in Vue `reactive()` | transforms the prototype once; instances stay plain |
| State | fields via `iref()`, **no `.value`** | getters return `ref()`/`computed()`, read with **`.value`** |
| Creation cost | a proxy + eager computeds per instance | a plain `new` (refs/computeds are lazy) |
| Best at | ergonomics — reads like a pure class | scale + control — millions of instances, fine-grained |
| Extras | `.clone()`, `.toRefs()`, lifecycle | lean core (`$watch`, `$stopEffects`) |

::: tip Which should I use?
Reach for **v2** for performance-critical, many-instance, or deeply-structured
models — especially if a "hide `.value`" editor plugin or AI-assisted coding
makes the `.value` cost a non-issue. Use **v1** where pure-class ergonomics
matter most and you want `.clone()`/`.toRefs()` out of the box. See
[Migrating from v1](/guide/migration).
:::

## The trade-off in one line

v2 is **cheap to create, slightly costlier to read** (state lives behind a
getter); v1 and native composables are the reverse. v2 pays at access time what
it saves at creation time — and you can erase the access cost in hot loops by
[hoisting](/guide/performance#hot-loops). For everything else it doesn't matter.

Next: the [principles](/guide/principles) that make all of this work.
