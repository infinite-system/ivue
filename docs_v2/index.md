---
layout: home
title: 'Plain classes. Full reactivity. One kilobyte.'
description: 'ivue turns native TypeScript classes into fine-grained Vue 3 reactivity. No proxy per instance, no decorators, nothing paid until first access.'

features:
  - title: Native class API
    details: extends, super, getters, setters, private fields. Real inheritance, encapsulation and polymorphism, all reactive.
  - title: Zero-cost creation
    details: Instances are plain objects. A million of them take 22 ms — 6 to 132× faster than the alternatives.
    link: /guide/performance
    linkText: Performance by Design
  - title: One kilobyte
    details: 1.1kb gzipped. Zero dependencies. 100% test coverage. Stripped to the load-bearing core — an API you can hold in your head.
  - title: Store or ViewModel
    details: The same class serves as a global store, a component ViewModel, or a domain model. One mental model everywhere.
  - title: Composition API, fully compatible
    details: Composables plug in through $-getters. The entire Vue ecosystem works inside your classes.
  - title: TypeScript first
    details: Writable ref-getters, fully typed instances, precise inference. The type system shaped the engine's design.
---

<div class="ix">

<section class="ix-statband">

<div class="ix-stats">
  <div class="ix-stat"><div class="n">1.1kb</div><div class="l">the whole engine, gzipped</div></div>
  <div class="ix-stat"><div class="n">0</div><div class="l">dependencies</div></div>
  <div class="ix-stat"><div class="n">100%</div><div class="l">test coverage, every metric</div></div>
  <div class="ix-stat"><div class="n">22 ms</div><div class="l">to create 1 million instances</div></div>
</div>

</section>

<section class="ix-quote">

> Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.

<cite>Antoine de Saint-Exupéry</cite>

</section>

<section>

## Hard problems, solved together

<p class="lead">Each of these sank earlier class-reactivity attempts. Solving one or two is easy. ivue ships all of them as one coherent design.</p>

<div class="ix-moat">
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Bound methods</strong>
      <p><code>this.method</code> is always correct, always the same reference. The wrapper-arrow era ends.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Reactive inheritance</strong>
      <p>Deep <code>super.x.value</code> chains resolve level-safe. Reactivity flows through every layer.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Hot reload for classes</strong>
      <p>Behavior edits graft onto live instances, state intact. Multi-file hierarchies never desync.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Circular imports</strong>
      <p>The namespace pattern resolves mutual references in any load order.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Writable getter types</strong>
      <p>Ref-returning getters type as writable. Instances are fully inferred.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Deterministic teardown</strong>
      <p><code>$watch</code> scopes per instance, <code>$stopEffects</code> cleans up. Pure data pays nothing.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Memory</strong>
      <p>Derivations are shared prototype getters, not per-instance allocations.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Hot paths</strong>
      <p>Reads hoist to native ref speed with one line where it matters.</p>
    </div>
  </div>
</div>

</section>

<section>

## One idea, carried through

<div class="ix-idea">

<div>

<p class="lead">
<code>Reactive()</code> transforms a class once. A getter returning
<code>ref()</code> becomes state: created on first touch, cached, stable
forever. A plain getter stays plain and re-derives on every read, reactive
with zero allocation. Methods bind themselves once, to the right
<code>this</code>. Instances stay ordinary objects. Inheritance, hot reload,
teardown, speed: consequences of that one move.
</p>

<p class="lead">
<a href="/guide/principles">Read the principles →</a>
</p>

</div>

```ts:no-line-numbers
import { Reactive } from 'ivue'
import { ref } from 'vue'

class $Counter {
  get count() {
    return ref(0)
  }
  get double() {
    return this.count.value * 2 // plain getter
  }
  increment() {
    this.count.value++
  }
}

export const Counter = Reactive($Counter)

const counter = new Counter()
counter.increment()
counter.count.value  // 1
counter.double       // 2, re-derived on read
```

</div>

</section>

<section>

## Start here

<div class="ix-start">
  <a href="/guide/introduction">
    <div class="t">What is ivue?</div>
    <div class="d">The idea and the engine.</div>
    <span class="go">Read →</span>
  </a>
  <a href="/guide/getting-started">
    <div class="t">Getting Started</div>
    <div class="d">Install, write your first reactive class, use it in a component.</div>
    <span class="go">Build →</span>
  </a>
  <a href="/guide/benchmarks">
    <div class="t">Benchmarks</div>
    <div class="d">A 100k-cell grid built three ways, and a spreadsheet with real Excel formulas — live, in your browser.</div>
    <span class="go">Run →</span>
  </a>
</div>

</section>

<section class="ix-end">

## Performance numbers

<p class="lead">Measured, not promised. Method and full tables in <a href="/guide/performance">Performance by Design</a>.</p>

<div class="ix-cols">

<div>

### Creating 1,000,000 instances

| | time | ivue is |
| --- | --- | --- |
| **ivue `new Class()`** | **21.7 ms** | <span class="ix-base">the baseline</span> |
| composable factory | 139 ms | **6.4× faster** |
| native `reactive()` | 470 ms | **22× faster** |
| eager class engine (unreleased v1) | 2,861 ms | **132× faster** |

<p class="foot">Refs and computeds do not exist until first access. Median of runs with every instance retained.</p>

</div>

<div>

### Heap per instance, same shape

| | heap | ivue is |
| --- | --- | --- |
| **ivue class, 60 getters** | **1.7 KB** | <span class="ix-base">the baseline</span> |
| composable, 60 closures | 12.8 KB | **7.7× lighter** |
| composable, 60 computeds | 31.1 KB | **18.6× lighter** |

<p class="foot">Derivations live on the prototype. They weigh nothing per instance.</p>

</div>

</div>

### What a live cell costs at rest

| | bytes/cell | what the cell is |
| --- | --- | --- |
| composable (idiomatic Vue) | ~758 | closures + eager ref/computeds |
| ivue instance grid | ~67 | plain object + lazy overlay |
| plain POJO, no reactivity | ~40 | `{ row, col, raw }` |
| **ivue flyweight columnar** | **4.7** | 1 B kind + 8 B Float64, shared |

<p class="foot">Measured end-to-end on live grids up to 20,000,000 cells — fully reactive at 8.5× below the plain-object floor. The receipts run in your browser: <a href="/guide/benchmarks">Benchmarks</a>.</p>

</section>



</div>
