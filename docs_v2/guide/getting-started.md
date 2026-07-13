---
title: Getting Started
description: Install ivue, enable hot reload for classes with one Vite plugin line, write your first reactive class with ref-getters and plain derived getters, and use it in a Vue component.
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

## Enable hot reload for classes

One plugin line in `vite.config.ts` gives your classes real HMR — edit a
method or getter and the new behavior grafts onto **live instances, state
intact**, no page reload:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import ivueHmr from 'ivue/lib/hmr-plugin';

export default defineConfig({
  plugins: [vue(), ivueHmr()],
});
```

The plugin only marks modules that call `Reactive(...)` as HMR boundaries;
it runs in the dev server only, and production builds contain **zero** HMR
code. Optional — everything else on this page works without it — but it's
one line, and it's the difference between tweaking a method live and
re-clicking through your app after every save. Details, the manual
three-line alternative, and how the grafting works: [HMR](/guide/hmr).

## Your first reactive class

Write a normal class. Declare state as getters returning `ref()`; derive with plain getters.
Wrap it with `Reactive()`.

```ts
// counter.ts
import { Reactive } from 'ivue'
import { ref } from 'vue'

class $Counter {
  get count() {
    return ref(0)
  }
  get double() {
    return this.count.value * 2 // derived: plain getter
  }

  increment() {
    this.count.value++
  }
  reset() {
    this.count.value = 0
  }
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

const counter = new Counter()

// destructure every Ref/Computed the template touches
const { count } = counter
</script>

<template>
  <button @click="counter.increment">{{ count }} → {{ counter.double }}</button>
  <button @click="counter.reset">reset</button>
</template>
```

That's it — `count` is the real ref, destructured straight off the instance (a state binding: unwrapped in the template, state at a glance); `counter.double` re-derives on every render; `counter.increment` is a stable
bound method. The component re-renders when `count` changes, exactly as if you'd
written refs by hand. Here is that exact class, running on this page:

<DemoCounter />

## What just happened

- `new Counter()` created a **plain object** — no proxy.
- The first time you read `count`, its `ref(0)` was created and cached — the destructured binding IS that cached ref.
- `counter.double` is a plain getter — dotted in the template, because dotted means derivation. The render effect reads it, subscribes to `count` underneath, and re-derives on change. No allocation.
- `counter.increment` was bound to the instance once and reused.

Read the [Principles](/guide/principles) for the full picture, or jump to
[Reactive State](/guide/state).
