# ivue — Infinite Vue &nbsp; [![npm](https://img.shields.io/npm/v/ivue.svg)](https://www.npmjs.com/package/ivue) [![build status](https://github.com/infinite-system/ivue/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/infinite-system/ivue/actions/workflows/ci.yml)

**Plain classes. Full reactivity. One kilobyte.**

ivue builds Vue 3 reactivity out of plain TypeScript classes. Real
inheritance, real encapsulation, real polymorphism — on ordinary objects,
with nothing paid until first access. The whole engine is **1.1kb gzipped**
with zero dependencies.

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

export const Counter = Reactive($Counter);

const counter = new Counter();
counter.increment();
counter.count.value  // 1
counter.double       // 2, re-derived on read
```

## One idea, carried through

`Reactive()` transforms a class **once**. A getter returning `ref()` becomes
state: created on first touch, cached, stable forever. A plain getter stays
plain and re-derives on every read — reactive with zero allocation. Methods
bind themselves once, to the right `this`. Instances stay ordinary objects:
no proxy wraps them, no work happens at construction.

Inheritance, hot reload, teardown, speed — consequences of that one move.

## In a component

```vue
<script setup lang="ts">
import { Counter } from './Counter';

const counter = new Counter();

// the state destructure — every Ref the template touches, unwrapped uniformly
const { count } = counter;
</script>

<template>
  <button @click="counter.increment()">{{ count }} · double {{ counter.double }}</button>
</template>
```

The same class serves as a global store, a component ViewModel, or a domain
model. Composables plug straight in — the entire Vue ecosystem works inside
your classes:

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
[the docs](https://infinite-system.github.io/ivue/).

| creating 1,000,000 instances | time | ivue is |
| --- | --- | --- |
| **ivue `new Class()`** | **21.7 ms** | the baseline |
| composable factory | 139 ms | **6.4× faster** |
| native `reactive()` | 470 ms | **22× faster** |

| memory heap at 100,000 live instances | per instance | at 1,000,000 |
| --- | --- | --- |
| **ivue class, 60 getters** | **3.7 KB** | runs — 3.64 GB |
| composable, 60 closures | 12.3 KB | **OOM** ~12.3 GB |
| `reactive()`, fields + getters | 17.5 KB | **OOM** ~17.5 GB |
| composable, 60 computeds | 35.7 KB | **OOM** ~35.7 GB |

Taken all the way down: a fully reactive spreadsheet model holding
**20,000,000 live cells at 4.7 bytes each** — 8.5× below the plain-object
floor — because in ivue, everything costs proportional to what's *observed*,
nothing costs proportional to what *exists*.

## Hard problems, solved together

Each of these sank earlier class-reactivity attempts. ivue ships all of them
as one coherent design:

- **Bound methods** — `this.method` is always correct, always the same reference.
- **Reactive inheritance** — deep `super.x.value` chains resolve level-safe.
- **Hot reload for classes** — behavior edits graft onto live instances, state intact.
- **Circular imports** — the namespace pattern resolves mutual references in any load order.
- **Writable getter types** — ref-returning getters type as writable; instances fully inferred.
- **Deterministic teardown** — `$watch` scopes per instance, `$stopEffects()` cleans up.
- **Memory** — derivations are shared prototype getters, not per-instance allocations.
- **Hot paths** — reads hoist to native ref speed with one line where it matters.

## Built for humans and AI

ivue ships with an [Operating Manual](https://infinite-system.github.io/ivue/guide/standard) —
the complete authoring standard as annotated templates, rules, and a review
checklist. It reads as documentation and works as a drop-in skill for AI
coding agents, so generated code follows the same standard your team writes.

## A note on the size

The v1 README said `1.1kb gzipped`. This engine — rewritten from scratch on a
different architecture: lazy prototype transform instead of per-instance
proxies, hot-reload grafting included — is **exactly 1.1kb gzipped** again.
Completely different, precisely the same weight.

> *Perfection is achieved, not when there is nothing more to add, but when
> there is nothing left to take away.* — Antoine de Saint-Exupéry

## Documentation

Full guide, principles, live benchmarks, and the API reference:
**https://infinite-system.github.io/ivue/**

## License

[MIT](./LICENSE)
