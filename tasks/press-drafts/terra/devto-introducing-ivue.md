---
venue: dev.to
purpose: post
lang: en
source: introducing-ivue
status: draft-for-review
---

<!-- canonical_url: https://ivue.dev/blog/introducing-ivue -->

# Put your Vue state back in objects

ivue, a **1.1 kB class layer over Vue's reactivity**, lets a TypeScript class be a reactive store, view-model, or domain entity without becoming a component.

The useful change is not “classes again.” It is that the object can own its state and behavior for as long as the domain needs it. A component can mount it, but does not have to own it.

```ts
import { Reactive } from 'ivue'
import { ref } from 'vue'

class $Counter {
  get count() {
    return ref(0)
  }

  get double() {
    return this.count.value * 2
  }

  increment() {
    this.count.value++
  }
}

export const Counter = Reactive($Counter)
```

`Reactive()` transforms the prototype once.

- A getter that returns `ref()` is state. Its cell is created on first read and then cached on that instance.
- A plain getter is a derivation. Vue tracks the leaf reads; no `computed()` node is allocated unless caching earns its cost.
- A method is bound once on first access, so `instance.increment` has stable identity and the right `this`.

The instance is still a plain object. There is no proxy wrapped around it.

## Why this changes the cost model

The normal question is how to manage framework machinery. The smaller question is whether the machinery needs to exist.

An unread state member has no cell. A cheap derived value has no cache. A hot loop can read the raw object without a proxy boundary. Those are separate facts, but they have one cause: costs are created only when the capability that needs them is used.

The benchmarks run in the browser on the shipped package:

- **1,000,000 instances in 22 ms**, measured with every instance retained; comparable shapes took **6–132×** longer in that test.
- **100,000 live, observed instances in 364 MB**; closures used 2.1×, `reactive()` 2.8×, and eager computeds 5.3× the heap in the compared model.
- **20,000,000 formula-capable cells at 4.7 bytes each** in the live spreadsheet benchmark.

Those are measurements, not portability promises. Hardware and engines change. The methods and runnable benchmarks are published with the claims.

## The authoring rule

Use a ref-getter for mutable state. Use a plain getter for a derivation. Use `computed()` when repeated work makes a cache worth buying.

That rule is small enough to remember, but it also gives code a boundary: an unread member cannot allocate, and a plain getter cannot silently become a cache node.

The full post, benchmark links, and install instructions are at [ivue.dev/blog/introducing-ivue](https://ivue.dev/blog/introducing-ivue).
