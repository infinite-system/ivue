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
  get seconds() {
    return ref(0)
  }
  get label() {
    return `${this.seconds.value}s` // derived: plain getter
  }
  tick() {
    this.seconds.value++
  }
}
export const Timer = Reactive($Timer)
```

```ts
const timer = new Timer()
timer.tick()
timer.seconds.value // 1
timer.label         // "1s", re-derived on read
```

## Why classes?

Composables are great for small, local state. Growing apps want **structure**:
shared base behavior, overridable pieces, encapsulated internals, a clear
"this is the model" boundary. Classes give you that natively. `extends`,
`super`, `private`, getters and setters. ivue makes them reactive without
taking any of it away.

And classes **host** composables, not replace them. Here the entire
`useMouse` composable is an implementation detail; the class's public
surface is two refs:

```ts
// pointer.ts
import { Reactive } from 'ivue';
import { useMouse } from '@vueuse/core';

class $Pointer {
  // the composable is an implementation detail — created once, held forever
  private get $mouse() {
    return useMouse();
  }

  // the public surface: two refs
  get x() {
    return this.$mouse.x;
  }
  get y() {
    return this.$mouse.y;
  }
}

export namespace Pointer {
  export const $Class = $Pointer; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
```

```vue
<script setup lang="ts">
import { Pointer } from './pointer';

// the state destructure
const { x, y } = new Pointer.Class();
</script>

<template>Mouse: {{ x }}, {{ y }}</template>
```

Live — this pad reads `{ x, y }` from a `Pointer` instance:

<DemoPointer />

`private` means what it always means: consumers of `Pointer` see `x` and
`y`, never the composable. And because the destructure runs in `setup`, the
composable materializes inside the component's scope — `useMouse`'s
listeners are cleaned up on unmount, for free.

## The trade, in one line

ivue is **cheap to create and light to hold, slightly costlier to read**: state
sits behind a getter, so hot loops pay ~4× per read over a raw closure ref.
One [hoist line](/guide/performance#hot-loops) erases it. Everything else is
free.

Next: [get started](/guide/getting-started) — or read the
[principles](/guide/principles) that make it work.
