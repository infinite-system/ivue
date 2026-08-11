---
title: "Introducing ivue: plain classes, full reactivity, one kilobyte"
description: The launch post — why the field abandoned classes for the wrong reason, what the derivation primitive actually is, and the measured numbers behind a 1.1 kB answer.
date: 2026-07
---

# Introducing ivue: plain classes, full reactivity, one kilobyte

<BlogPostDate />

![Introducing ivue](/blog/introducing-ivue.png)

Here is an uncomfortable reading of the last decade of frontend history:
the field did not abandon classes because classes failed. It abandoned
them because making classes work — cheaply, reactively, correctly — was
genuinely hard, and it is easier to canonize a retreat than to admit one.
"Composition over inheritance" started as a correction to deep, fragile
hierarchies and hardened into something stranger: a taboo on the one
construct JavaScript provides for modeling *things* — entities with
identity, state, behavior and lineage.

React said the quiet part out loud in its Hooks announcement: classes
"confuse both people and machines." And they did — `this` broke when you
passed a method anywhere, binding it cost an allocation per method per
instance, and reactive state made everything worse. Every framework hit
the same wall. Every framework walked away. A generation of developers
learned that objects and reactivity don't mix, the way you learn any
superstition: by inheriting the recoil without ever seeing the original
wound.

ivue exists because the wound was treatable all along.

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
allocation. Methods bind themselves once, to the right `this` —
`instance.method` is always correct and always the same reference, which
retires the `() => this.method()` wrapper and the entire class of shipped
bugs behind it. Instances stay ordinary objects. No proxy wraps them.
Nothing happens at construction. The whole engine is **1.1 kB gzipped**,
zero dependencies, 100% test coverage on every metric.

## The mistake everyone actually made

The earlier class attempts didn't die of one bug. They died of a design
decision so common nobody noticed it was a decision: **welding the class
to the component**. In `vue-class-component` and React class components,
the class *was* the component — chained to lifecycle, render, and
props-as-`this`. You could never have a plain reactive model that wasn't
also a framework artifact. Which means the real casualty of the class
wars was never syntax. It was the **model layer** — the idea that your
domain (the order, the document, the ten thousand rows) deserves to be
live, reactive objects in its own right, rather than state smeared across
whatever components happen to be mounted.

Ask yourself honestly: where does your domain logic live right now? If
the answer is "in composables that exist only while their component
does," then your objects are rented from the framework. ivue's first
decision is the eviction notice:

> A class is a reactive unit — a store, a view-model, a domain entity —
> usable anywhere. It is never itself a component.

## The `computed()` assumption

Along the way, one more assumption refused to survive measurement:
that `computed()` is how you derive values. It isn't. Vue's actual
derivation primitive is the **tracked read** — any function that reads
reactive state inside an effect subscribes to it without a separate
derivation node. `computed()` is a *cache* bolted onto that primitive, and a cache
costs real bytes per instance, paid at creation, whether the value is
ever read or not. Idiomatic Vue memoizes everything by default — which
is why, measured at 100,000 live instances, the composable-per-entity
pattern holds 5.3× the heap of the identical model written as an ivue
class, where derivations are plain prototype getters weighing nothing
([The Engine](/engine)).

The default was never neutral. It was just unexamined.

## Measured, not promised

Claims like these deserve hostility, so the docs are built to survive it.
Every number runs live, in your browser, on the shipped engine:

- **1,000,000 instances in 22 ms** — 6–132× the alternatives, measured
  with escape-proof harnesses (every instance retained; nothing for the
  JIT to optimize away).
- **100,000 live, observed instances in 364 MB** — closures cost 2.1×,
  `reactive()` 2.8×, eager computeds 5.3× more.
- **20,000,000 formula-capable spreadsheet cells at 4.7 bytes per cell** —
  a document Google Sheets cannot represent, created in front of you when
  you click ([Interactive Benchmarks](/guide/benchmarks)).
- **Raw reads avoid proxy overhead** — measured access is 3–18× faster than
  shallow or deep proxy wrappers. A direct closure ref is the remaining
  performance floor; hot loops reach it with a one-line hoist
  ([Performance by Design](/guide/performance)).

Development is deliberately unsurprising: `Reactive()` returns the input
class and uses native construction in development exactly as it does in
production. Vite and Vue rebuild the affected owner after a script edit, so
one instance never mixes state and behavior from different class generations
([Development & HMR](/guide/hmr)).

## What this is really about

Signals won. Vue, Angular, Solid, Svelte, and the TC39 proposal all agree
on the engine layer now. The remaining question — the one nobody is
asking loudly enough — is what *authors* those signals. For a decade the
answer has been "whatever shape the framework hands you." ivue's answer
is the oldest one in the language: a class, undamaged, with inheritance
and encapsulation and polymorphism intact, compiled by nothing, wrapped
in nothing, one kilobyte all-in.

The head-to-head against Angular Signals, MobX, Solid, Svelte 5 runes and
hand-rolled JavaScript is [ivue vs the World](/guide/model-layer). The
authoring standard — the same document we ship to AI coding agents as a
skill — is [The Standard Operating Manual](/guide/standard). And the
method that produced all of it has its own story, told at the end of
[The Invariants Behind ivue](/reference/invariants).

## Start

```sh
npm i ivue vue
```

[Getting Started](/guide/getting-started) takes you from install to a
working component in minutes. Come skeptical — the receipts are the point.
