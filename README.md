<p align="center">
  <a href="https://infinite-system.github.io/ivue/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs_v2/public/brand-lockup-dark.png">
      <img src="docs_v2/public/brand-lockup-light.png" alt="ivue — Infinite Vue" width="340">
    </picture>
  </a>
</p>

<h3 align="center">Plain classes. Full reactivity.<br>Infinite scalability. One kilobyte.</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/ivue"><img src="https://img.shields.io/npm/v/ivue.svg" alt="npm"></a>
  <a href="https://github.com/infinite-system/ivue/actions/workflows/ci.yml"><img src="https://github.com/infinite-system/ivue/actions/workflows/ci.yml/badge.svg?branch=main" alt="build status"></a>
</p>

<p align="center">
  <strong>Docs: <a href="https://infinite-system.github.io/ivue/">infinite-system.github.io/ivue</a></strong>
</p>

ivue builds Vue 3 reactivity out of plain TypeScript classes. Real
inheritance, real encapsulation, real polymorphism — on ordinary objects,
with nothing paid until first access. The whole engine is **1.1kb gzipped**
with zero dependencies.

- **Native class API** — `extends`, `super`, getters, setters, private
  fields. Real inheritance, encapsulation and polymorphism, all reactive.
- **Zero-cost creation** — instances are plain objects. A million of them
  take 22 ms — 6 to 132× faster than the alternatives.
- **One kilobyte** — 1.1kb gzipped, zero dependencies, 100% test coverage.
  Stripped to the load-bearing core — an API you can hold in your head.
- **Store or ViewModel** — the same class serves as a global store, a
  component ViewModel, or a domain model. One mental model everywhere.
- **Composition API, fully compatible** — composables plug in through
  `$`-getters. The entire Vue ecosystem works inside your classes.
- **TypeScript first** — writable ref-getters, fully typed instances,
  precise inference. The type system shaped the engine's design.

## Getting started

```sh
npm i ivue vue
```

```ts
import { Reactive } from 'ivue';
import { ref } from 'vue';

class $Counter {
  get count() {
    return ref(0)
  }
  get double() {
    return this.count.value * 2 // plain getter — derives on read
  }
  increment() {
    this.count.value++
  }
}

export namespace Counter {
  export const $Class = $Counter; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // the unwrapping-surface type
}
```

In a component:

```vue
<script setup lang="ts">
import { Counter } from './Counter';

const counter = new Counter.Class();

// the state destructure — every Ref the template touches, unwrapped uniformly
const { count } = counter;
</script>

<template>
  <button @click="counter.increment()">{{ count }} · double {{ counter.double }}</button>
</template>
```

Full walkthrough: [Getting Started](https://infinite-system.github.io/ivue/guide/getting-started).

## Built for humans and AI

ivue ships with an [Operating Manual](https://infinite-system.github.io/ivue/guide/standard) —
the complete authoring standard as annotated templates, rules, and a review
checklist. It reads as documentation and works as a drop-in skill for AI
coding agents, so generated code follows the same standard your team writes:

```sh
npx ivue skill        # installs .claude/skills/ivue/SKILL.md, version-locked
npx ivue skill --all  # + Codex/Cursor/Copilot where already in use
```

## Hard problems, solved together

Each of these sank earlier class-reactivity attempts. ivue ships all of them
as one coherent design:

- **Bound methods** — `this.method` is always correct, always the same reference.
- **Reactive inheritance** — deep `super.x.value` chains resolve level-safe.
- **Hot reload for classes** — behavior edits graft onto live instances, state intact.
- **Circular import immunity** — the namespace pattern resolves mutual references in any load order.
- **Writable getter types** — ref-returning getters type as writable; instances fully inferred.
- **Deterministic teardown** — `$watch` scopes per instance, `$stopEffects()` cleans up.
- **Minimal memory footprint** — derivations are shared prototype getters, not per-instance allocations.
- **Hot paths** — reads hoist to native ref speed with one line where it matters.

## One idea, carried through

`Reactive()` transforms a class **once**. A getter returning `ref()` becomes
state: created on first touch, cached, stable forever. A plain getter stays
plain and re-derives on every read — reactive with zero allocation. Methods
bind themselves once, to the right `this`. Instances stay ordinary objects:
no proxy wraps them, no work happens at construction.

Inheritance, hot reload, teardown, speed — consequences of that one move.

Composables plug straight in — the entire Vue ecosystem works inside your
classes:

```ts
import { useMouse } from '@vueuse/core';

class $Pointer {
  private get $mouse() {
    return useMouse() // created once, encapsulated
  }
  get x() {
    return this.$mouse.x
  }
  get y() {
    return this.$mouse.y
  }
}
```

## The numbers

Measured, not promised — method and live in-browser benchmarks in
[the docs](https://infinite-system.github.io/ivue/guide/benchmarks).

| creating 1,000,000 instances | time | ivue is |
| --- | --- | --- |
| **ivue `new Class()`** | **21.7 ms** | the baseline |
| composable factory | 139 ms | **6.4× faster** |
| native `reactive()` | 470 ms | **22× faster** |

| memory heap at 100,000 live instances | per instance | 100k total |
| --- | --- | --- |
| **ivue class, 30 getters** | **3.7 KB** | 364 MB |
| composable, 30 closures | 8.0 KB | 781 MB |
| `reactive()`, fields + getters | 10.4 KB | 1.02 GB |
| composable, 30 computeds | 19.7 KB | 1.93 GB |

Taken all the way down: a fully reactive spreadsheet model holding
**20,000,000 live cells at 4.7 bytes each** — 8.5× below the plain-object
floor — because in ivue, everything costs proportional to what's *observed*,
nothing costs proportional to what *exists*.

## A note on the size

The v1 README said `1.1kb gzipped`. This engine — rewritten from scratch on a
different architecture: lazy prototype transform instead of per-instance
proxies, hot-reload grafting included — is **1.1kb gzipped** again.
Completely different, precisely the same weight.

> *Perfection is achieved, not when there is nothing more to add, but when
> there is nothing left to take away.* — Antoine de Saint-Exupéry

## Documentation

Full guide, principles, live benchmarks, advanced examples (a 1,000,000-row
virtual scroller, a 20,000,000-cell flyweight grid, production-grade Quasar
field components), and the API reference:
**https://infinite-system.github.io/ivue/**

## License

[MIT](./LICENSE)
