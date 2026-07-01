---
layout: home
title: 'Reactive classes for Vue 3'
description: 'ivue turns plain TypeScript classes into fine-grained Vue 3 reactivity — real inheritance, lazy per-property refs, and zero per-instance proxy.'

hero:
  name: ivue
  text: Reactive classes for Vue 3
  tagline: Write plain classes. Get fine-grained reactivity. Pay nothing per instance.
  image:
    src: /logo.svg
    alt: ivue
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Why v2
      link: /guide/introduction
    - theme: alt
      text: GitHub
      link: https://github.com/infinite-system/ivue

features:
  - icon: 🧬
    title: Real classes
    details: Native class, extends, super, getters, private fields and methods — nothing hidden or rewritten. The instance is just an object, not a proxy.
  - icon: ⚡
    title: Zero-cost creation
    details: Refs and computeds materialize lazily on first access, so a new instance is a bare `new`. A million you never touch cost almost nothing.
  - icon: 🎯
    title: Fine-grained by choice
    details: Pick ref, shallowRef or computed per property. Reactivity is opt-in and explicit — no deep-proxy surprises, no over-tracking.
  - icon: 🧩
    title: Deep inheritance
    details: Parent → grandparent computed chains and `super.x.value` resolve exactly like native classes, and stay reactive through every level.
  - icon: 🔗
    title: Circular-import safe
    details: The namespace module pattern resolves cross-references in any load order and survives cross-file hot-module replacement.
  - icon: 🧹
    title: Deterministic teardown
    details: 'A lazy per-instance effect scope holds every $watch; $stopEffects stops it. Instances that never watch allocate no scope at all.'
---

<div style="max-width: 780px; margin: 72px auto 0; padding: 0 24px;">

## The one idea

`Reactive()` transforms a class **once**: its getters become lazily-cached reactive
cells, its methods become lazily-bound functions — and instances stay **plain
objects**. You declare state as getters that return `ref()` / `computed()`, and
read it with `.value`. That's the entire model; inheritance, watching, teardown,
and performance all fall out of it.

```ts
import { Reactive } from 'ivue'
import { ref, computed } from 'vue'

class $Counter {
  get count()  { return ref(0) }
  get double() { return computed(() => this.count.value * 2) }
  inc() { this.count.value++ }
}

export const Counter = Reactive($Counter)

const c = new Counter()
c.inc()
c.count.value   // 1
c.double.value  // 2
```

## Fast where it counts

Creation is a plain `new`, so it scales to millions. Measured on one machine —
100,000 instances:

<div class="stats">
  <div class="stat"><div class="n">0.7 ms</div><div class="l">v2 · 100k instances</div></div>
  <div class="stat"><div class="n">55×</div><div class="l">faster than reactive()</div></div>
  <div class="stat"><div class="n">64×</div><div class="l">faster than a composable</div></div>
  <div class="stat"><div class="n">253×</div><div class="l">faster than ivue v1</div></div>
</div>

Reads cost a little more (state lives behind a getter) — a trade you can erase in
hot loops. See [Performance](/guide/performance) for the honest numbers.

## Start here

- **New to ivue?** → [What is ivue?](/guide/introduction) then [Getting Started](/guide/getting-started)
- **Want the model?** → [Principles](/guide/principles)
- **Coming from v1?** → [Migrating from v1](/guide/migration)

<div style="margin-top: 28px;">
  <span class="pill">100% test coverage</span>&nbsp;
  <span class="pill">zero dependencies</span>&nbsp;
  <span class="pill">Vue 3.5 ready</span>
</div>

</div>
