---
title: Getting Started
description: Install ivue, write your first reactive class with ref-getters and plain derived getters, and use it in a Vue component.
---

# Getting Started

## Install

```sh
npm i ivue vue
```

ivue has no runtime dependencies of its own; it works with any Vue 3.x.

::: tip Hide `.value` while coding
ivue state is read with `.value`. If you'd rather not see it, the
[Vue plugin for VS Code / WebStorm](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
ecosystem includes inlay-hint and "hide `.value`" options that keep your source
clean.
:::

## Your first reactive class

Write a normal class. Declare state as getters returning `ref()`; derive with plain getters.
Wrap it with `Reactive()`.

```ts
// counter.ts
import { Reactive } from 'ivue'
import { ref } from 'vue'

class $Counter {
  get count() { return ref(0) }
  get double() { return this.count.value * 2 } // derived: plain getter

  inc() { this.count.value++ }
  reset() { this.count.value = 0 }
}

export const Counter = Reactive($Counter)
```

Note what `double` is **not**: a `computed()`. Simple derivations stay plain
getters. They re-derive whenever a render reads them, cost zero bytes per
instance, and stay fully reactive. Reach for `computed()` only when the work
is expensive or you need render suppression. See
[Computed & Watch](/guide/computed-watch).

The `$`-prefixed raw class (`$Counter`) is what children `extends`; the
transformed `Counter` is what you `new`. (More on this in
[Modules & Imports](/guide/modules) — for a single class you can skip the split
and just `Reactive(class Counter { … })`.)

## Use it in a component

```vue
<script setup lang="ts">
import { Counter } from './counter'

const c = new Counter()
</script>

<template>
  <button @click="c.inc">{{ c.count.value }} → {{ c.double }}</button>
  <button @click="c.reset">reset</button>
</template>
```

That's it — `c.count` is a real ref, `c.double` re-derives on every render, `c.inc` is a stable
bound method. The component re-renders when `count` changes, exactly as if you'd
written refs by hand. Here is that exact class, running on this page:

<DemoCounter />

## What just happened

- `new Counter()` created a **plain object** — no proxy.
- The first time you read `c.count`, its `ref(0)` was created and cached.
- `c.double` is a plain getter. The render effect reads it, subscribes to `count` underneath, and re-derives on change. No allocation.
- `c.inc` was bound to the instance once and reused.

Read the [Principles](/guide/principles) for the full picture, or jump to
[Reactive State](/guide/state).
