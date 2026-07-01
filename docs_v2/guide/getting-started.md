---
title: Getting Started
description: Install ivue, write your first reactive class with getters returning ref()/computed(), and use it in a Vue component.
---

# Getting Started

## Install

```sh
npm i ivue vue
```

ivue has no runtime dependencies of its own; it works with any Vue 3.x.

::: tip Hide `.value` while coding
v2 state is read with `.value`. If you'd rather not see it, the
[Vue plugin for VS Code / WebStorm](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
ecosystem includes inlay-hint and "hide `.value`" options that keep your source
clean.
:::

## Your first reactive class

Write a normal class. Declare state as getters returning `ref()` / `computed()`.
Wrap it with `Reactive()`.

```ts
// counter.ts
import { Reactive } from 'ivue'
import { ref, computed } from 'vue'

class $Counter {
  get count() { return ref(0) }
  get double() { return computed(() => this.count.value * 2) }

  inc() { this.count.value++ }
  reset() { this.count.value = 0 }
}

export const Counter = Reactive($Counter)
```

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
  <button @click="c.inc">{{ c.count.value }} → {{ c.double.value }}</button>
  <button @click="c.reset">reset</button>
</template>
```

That's it — `c.count` is a real ref, `c.double` a real computed, `c.inc` a stable
bound method. The component re-renders when `count` changes, exactly as if you'd
written refs by hand.

## What just happened

- `new Counter()` created a **plain object** — no proxy.
- The first time you read `c.count`, its `ref(0)` was created and cached.
- `c.double` is a computed that tracks `c.count`.
- `c.inc` was bound to the instance once and reused.

Read the [Principles](/guide/principles) for the full picture, or jump to
[Reactive State](/guide/state).
