---
title: "Introducing ivue: plain classes, full reactivity, one kilobyte"
description: The launch post — what ivue is, why class-based reactivity stayed unsolved, and the measured numbers behind the design.
date: 2026-07
---

# Introducing ivue: plain classes, full reactivity, one kilobyte

Vue's reactivity engine is a general-purpose signals system — and for a
decade, one authoring surface has been missing from it: the plain
TypeScript class. Not a class welded to a component, not a decorator
dialect — an ordinary class, with real inheritance, real encapsulation and
real polymorphism, whose state is fine-grained Vue reactivity.

ivue is that surface. The whole engine is **1.1 kB gzipped**, zero
dependencies, 100% test coverage on every metric.

```ts
import { Reactive } from 'ivue'
import { ref } from 'vue'

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

export const Counter = Reactive($Counter)
```

`Reactive()` transforms the prototype once. A getter returning `ref()`
becomes state — created on first touch, cached, stable forever. A plain
getter stays plain and re-derives on every read, fully reactive with zero
allocation. Methods bind themselves once, to the right `this`. Instances
stay ordinary objects: no proxy wraps them, no work happens at
construction.

## Why this didn't exist

Not for lack of trying. Class-based reactivity keeps sinking on a set of
problems that fight each other: per-instance cost, `this`-binding,
reactive inheritance through `super`, hot reload across files, circular
imports, and TypeScript marking every getter read-only. Solving any one is
easy; the earlier attempts each nailed one or two and shipped the rest as
sharp edges — or made the fatal move of turning the class *into* the
component. The full story is in
[Design & Philosophy](/guide/design); the head-to-head against Angular
Signals, MobX, Solid, Svelte 5 runes and hand-rolled JavaScript is
[ivue vs the World](/guide/model-layer).

## Measured, not promised

Everything below runs live in the docs — the same shipped engine, in your
browser:

- Creating **1,000,000 instances takes 22 ms** — 6–132× faster than the
  alternatives, measured with escape-proof harnesses (every instance
  retained; nothing the JIT can elide).
- **100,000 live, observed instances hold 364 MB** — closures cost 2.1×,
  `reactive()` 2.8×, eager computeds 5.3× more, because ivue's derivations
  live on the prototype and weigh nothing per instance.
- A spreadsheet model holding **20,000,000 formula-capable cells at
  4.7 bytes per cell** — created in front of you when you click
  ([Interactive Benchmarks](/guide/benchmarks)).
- The one honest cost: hot-loop reads pay several-fold over a raw closure
  ref — and one hoist line erases it
  ([Performance by Design](/guide/performance)).

## Hot reload for classes

Edit a method and the new behavior grafts onto **live instances, state
intact** — no remount, no lost work. It works because of what the
architecture already separates: state lives per instance, behavior lives
on the prototype, and a prototype can be swapped under living objects.
One Vite plugin line turns it on ([HMR](/guide/hmr)).

## Built for humans and AI

ivue ships with [The Standard Operating Manual](/guide/standard) — the
complete authoring standard as annotated templates, rules and a review
checklist. It reads as documentation and drops into AI coding agents as a
skill, so generated code follows the same standard your team writes. The
docs and the method behind them are part of the design:
[Invariant-Based Design](/reference/invariants) closes with that story.

## Start

```sh
npm i ivue vue
```

[Getting Started](/guide/getting-started) takes you from install to a
working component in a few minutes. The
[Interactive Benchmarks](/guide/benchmarks) are the receipts.
