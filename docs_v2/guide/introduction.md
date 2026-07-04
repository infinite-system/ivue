---
title: What is ivue?
description: 'ivue builds Vue 3 reactivity from plain TypeScript classes. One kilobyte, zero dependencies, native inheritance. Meet Reactive(), the v2 engine.'
---

# What is ivue?

**ivue** (Infinite Vue) builds Vue 3 reactivity out of plain TypeScript
classes. Real inheritance. Real encapsulation. Real polymorphism. The whole
engine is **1,052 bytes gzipped** with zero dependencies.

`Reactive()` transforms a class's prototype **once**:

- **getters** that return `ref()` become lazily cached state cells,
- **plain derived getters** stay plain and re-derive on render (`computed()` is a per-getter opt-in),
- **methods** become lazily bound functions,

and instances stay **ordinary objects**. No `reactive()` proxy wraps them. No
work happens at construction.

```ts
import { Reactive } from 'ivue'
import { ref } from 'vue'

class $Timer {
  get seconds() { return ref(0) }
  get label() { return `${this.seconds.value}s` } // derived: plain getter
  tick() { this.seconds.value++ }
}
export const Timer = Reactive($Timer)
```

```ts
const t = new Timer()
t.tick()
t.seconds.value // 1
t.label         // "1s", re-derived on read
```

## Why classes?

Composables are great for small, local state. Growing apps want **structure**:
shared base behavior, overridable pieces, encapsulated internals, a clear
"this is the model" boundary. Classes give you that natively. `extends`,
`super`, `private`, getters and setters. ivue makes them reactive without
taking any of it away.

And classes host composables, not replace them:

```ts
class $Pointer {
  get $mouse() { return useMouse() }   // a composable, created once per instance
  get x() { return this.$mouse.x }
}
```

## ivue v1 vs v2

ivue ships two engines. They express the same idea differently.

| | **v1 — `ivue()`** | **v2 — `Reactive()`** |
|---|---|---|
| How | wraps each instance in Vue `reactive()` | transforms the prototype once; instances stay plain |
| State | fields via `iref()`, no `.value` | getters return `ref()`, read with `.value` |
| Creation | a proxy + eager computeds per instance | a bare `new`; state is lazy |
| Memory | per-instance computeds | derivations shared on the prototype, up to **18.6× lighter** |
| Modules | hierarchy in one file (HMR) | cross-file hierarchies, circular-import immunity |
| Extras | `.clone()`, `.toRefs()`, `init()` | lean core: `$watch`, `$stopEffects` |

::: tip Which should I use?
**v2** for everything new, and for anything with many instances or deep
structure. **v1** where you rely on `.clone()` / `.toRefs()` today. The
[migration](/guide/migration) is smaller than it looks: only mutable state
converts.
:::

## The trade, in one line

v2 is **cheap to create and light to hold, slightly costlier to read**: state
sits behind a getter, so hot loops pay ~5× per read over a raw closure ref.
One [hoist line](/guide/performance#hot-loops) erases it. Everything else is
free.

Next: the [principles](/guide/principles) that make it work.
