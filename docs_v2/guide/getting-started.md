---
title: Getting Started
description: Install ivue, give your AI the standard, confirm the production-parity development setup, write a reactive class, use it in a Vue component, and see the result.
---

# Getting Started

## Install

```sh
npm install ivue
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

## Development needs no ivue plugin

Use Vite's normal Vue plugin. ivue runs the same engine path in development
and production:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});
```

Vite and Vue reconstruct the affected component after a class or script edit,
so constructor wiring, cached state, methods, inheritance, and private fields
all come from one class generation. Template-only edits retain Vue's normal
state-preserving HMR. See [Development & HMR](/guide/hmr).

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
  export let Class = Reactive($Class) // reactive, replaceable — you `new` this
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
cross-file references, and later kernel composition as the codebase grows.

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
