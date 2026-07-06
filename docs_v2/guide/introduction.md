---
title: What is ivue?
description: 'ivue builds Vue 3 reactivity from plain TypeScript classes. One kilobyte, zero dependencies, native inheritance. Meet Reactive(), the ivue engine.'
---

# What is ivue?

**ivue** (Infinite Vue) builds Vue 3 reactivity out of plain TypeScript
classes. Real inheritance. Real encapsulation. Real polymorphism. The whole
engine is **1.1kb gzipped** with zero dependencies.

`Reactive()` transforms a class's prototype **once**:

- **getters** that return `ref()` become lazily cached Refs,
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

## The trade, in one line

ivue is **cheap to create and light to hold, slightly costlier to read**: state
sits behind a getter, so hot loops pay ~5× per read over a raw closure ref.
One [hoist line](/guide/performance#hot-loops) erases it. Everything else is
free.

Next: the [principles](/guide/principles) that make it work.
