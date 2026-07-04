---
layout: home
title: 'Plain classes. Full reactivity. One kilobyte.'
description: 'ivue turns native TypeScript classes into fine-grained Vue 3 reactivity. No proxy per instance, no decorators, nothing paid until first access.'

features:
  - title: Native class API
    details: extends, super, getters, setters, private fields. Real inheritance, encapsulation and polymorphism, all reactive.
  - title: Zero-cost creation
    details: Instances are plain objects. State materializes on first access. Creation runs 55 to 253× faster than the alternatives.
  - title: One kilobyte
    details: 1,052 bytes gzipped. Zero dependencies. 100% test coverage. Small enough to read in one sitting.
  - title: Store or ViewModel
    details: The same class serves as a global store, a component ViewModel, or a domain model. One mental model everywhere.
  - title: Composition API, fully compatible
    details: Composables plug in through $-getters. The entire Vue ecosystem works inside your classes.
  - title: TypeScript first
    details: Writable ref-getters, fully typed instances, precise inference. The type system shaped the engine's design.
---

<div class="ix">

<section class="ix-quote">

> Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.

<cite>Antoine de Saint-Exupéry</cite>

<div class="ix-stats">
  <div class="ix-stat"><div class="n">1,052 B</div><div class="l">the whole engine, gzipped</div></div>
  <div class="ix-stat"><div class="n">0</div><div class="l">dependencies</div></div>
  <div class="ix-stat"><div class="n">100%</div><div class="l">test coverage, every metric</div></div>
  <div class="ix-stat"><div class="n">50 ms</div><div class="l">to create 10 million instances</div></div>
</div>

</section>

<section>

## One idea, carried through

<div class="ix-idea">

<div>

<p class="lead">
<code>Reactive()</code> transforms a class once. Getters that return refs become
lazily cached state. Methods bind themselves on first touch. Instances stay
plain objects. Everything else, inheritance, teardown, speed, falls out of
that single move. <a href="/guide/principles">Read the principles.</a>
</p>

</div>

```ts:no-line-numbers
import { Reactive } from 'ivue'
import { ref } from 'vue'

class $Counter {
  get count()  { return ref(0) }
  get double() { return this.count.value * 2 }  // derived: plain getter
  inc() { this.count.value++ }
}

export const Counter = Reactive($Counter)

const c = new Counter()
c.inc()
c.count.value  // 1
c.double       // 2, re-derived on read; computed() is opt-in
```

</div>

</section>

<section>

## The numbers

<p class="lead">Measured, not promised. Method and full tables in <a href="/guide/performance">Performance</a>.</p>

<div class="ix-cols">

<div>

### Creating 100k instances

| | time | v2 is |
| --- | --- | --- |
| **v2 `new Class()`** | **0.7 ms** | |
| native `reactive()` | 36.7 ms | **55× faster** |
| composable factory | 42.8 ms | **64× faster** |
| v1 `ivue(Class)` | 169 ms | **253× faster** |

<p class="foot">Refs and computeds do not exist until first access.</p>

</div>

<div>

### Heap per instance, same shape

| | heap | v2 is |
| --- | --- | --- |
| **v2 class, 60 getters** | **1.7 KB** | |
| composable, 60 closures | 12.8 KB | **7.7× lighter** |
| composable, 60 computeds | 31.1 KB | **18.6× lighter** |

<p class="foot">Derivations live on the prototype. They weigh nothing per instance.</p>

</div>

</div>

</section>

<section>

## Hard problems, solved together

<p class="lead">Each of these sank earlier class-reactivity attempts. Solving one or two is easy. ivue ships all of them as one coherent design.</p>

<div class="ix-solved">
  <div class="item"><span><strong>Bound methods.</strong> <code>this.method</code> is always correct, always the same reference. The wrapper-arrow era ends.</span></div>
  <div class="item"><span><strong>Reactive inheritance.</strong> Deep <code>super.x.value</code> chains resolve level-safe, reactivity flows through every layer.</span></div>
  <div class="item"><span><strong>Cross-file hot reload.</strong> The transform is idempotent. Multi-file hierarchies never desync.</span></div>
  <div class="item"><span><strong>Circular imports.</strong> The namespace pattern resolves mutual references in any load order.</span></div>
  <div class="item"><span><strong>Writable getter types.</strong> Ref-returning getters type as writable. Instances are fully inferred.</span></div>
  <div class="item"><span><strong>Deterministic teardown.</strong> <code>$watch</code> scopes per instance, <code>$stopEffects</code> cleans up. Pure data pays nothing.</span></div>
  <div class="item"><span><strong>Memory.</strong> Derivations are shared prototype getters, not per-instance allocations.</span></div>
  <div class="item"><span><strong>Hot paths.</strong> Reads hoist to native ref speed with one line where it matters.</span></div>
</div>

</section>

<section class="ix-end">

## Start here

<div class="ix-start">
  <a href="/guide/introduction">
    <div class="t">What is ivue?</div>
    <div class="d">The idea, the engine, and how v2 relates to v1.</div>
    <span class="go">Read →</span>
  </a>
  <a href="/guide/getting-started">
    <div class="t">Getting Started</div>
    <div class="d">Install, write your first reactive class, use it in a component.</div>
    <span class="go">Build →</span>
  </a>
  <a href="/guide/migration">
    <div class="t">Migrating from v1</div>
    <div class="d">The minimal recipe: convert state only, derive on render.</div>
    <span class="go">Migrate →</span>
  </a>
</div>

</section>

</div>
