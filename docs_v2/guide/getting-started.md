---
title: Getting Started
description: Install ivue, give your AI the standard, enable class HMR, write a reactive class, use it in a Vue component, and see the result.
---

# Getting Started

## Install

```sh
npm i ivue vue
```

ivue has no runtime dependencies of its own and supports Vue 3.2 or newer.
Vue 3.2 is the minimum because `$watch` uses Vue's detached `effectScope()`
to keep component-outliving model watchers under the model's ownership.

## Give your AI the standard

If AI agents write code in your project, hand them the same manual this
site publishes as [The Standard](/guide/standard) — one command, and the
copy is version-locked to your installed ivue:

```sh
npx ivue skill        # Claude Code
npx ivue skill --all  # + Codex/Cursor/Copilot where already in use
```

It lands in your repo (`.claude/skills/ivue/`, `.cursor/rules/`, …),
travels through git, and one teammate installing it equips everyone.

## Enable hot reload for classes

One plugin line in `vite.config.ts` gives your classes real HMR — edit a
method or getter and the new behavior grafts onto **live instances, state
intact**, no page reload:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import ivueHmr from 'ivue/hmr-plugin';

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
// Counter.ts
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

export namespace Counter {
  export const $Class = $Counter // raw — children `extends` this
  export const Class = Reactive($Class) // reactive — you `new` this
  export type Instance = typeof Class.Instance // defineExpose type & reactive() interop
}
```

Note what `double` is **not**: a `computed()`. Simple derivations stay plain
getters. They re-derive whenever a render reads them, cost zero bytes per
instance, and stay fully reactive. Reach for `computed()` only when the work
is expensive or you need render suppression. See
[Computed & Watch](/guide/computed-watch).

The `$`-prefixed raw class (`Counter.$Class`) is what children `extends`;
the transformed class (`Counter.Class`) is what you `new`. This three-line
[namespace export](/guide/modules) keeps the class ready for inheritance,
cross-file references, and HMR as the codebase grows.

## Use it in a component

```vue
<script setup lang="ts">
import { Counter } from './Counter'

const counter = new Counter.Class()

// destructure every Ref/Computed the template touches
const { count } = counter
</script>

<template>
  <button @click="counter.increment">{{ count }} → {{ counter.double }}</button>
  <button @click="counter.reset">reset</button>
</template>
```

That's it — `count` is the real ref, destructured straight off the instance
(a state binding: unwrapped in the template, state at a glance);
`counter.double` re-derives on every render; `counter.increment` is a stable
bound method. The component re-renders when `count` changes, exactly as if
you'd written refs by hand.

## Result

The page below imports the same `Counter` class shown above:

<DemoCounter />

## What just happened

- `new Counter.Class()` created a **plain object** — no proxy.
- The first time you read `count`, its `ref(0)` was created and cached — the destructured binding IS that cached ref.
- `counter.double` is a plain getter — dotted in the template, because dotted means derivation. The render effect reads it, subscribes to `count` underneath, and re-derives on change. No allocation.
- `counter.increment` was bound to the instance once and reused.

Read the [Fundamental Principles](/guide/principles) for the full picture, or jump to
[Reactive State](/guide/state).
