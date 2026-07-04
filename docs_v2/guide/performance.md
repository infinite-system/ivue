---
title: Performance
description: The honest numbers. v2 creates instances 55–253× faster, uses up to 18× less memory per instance, and reads state ~5× slower in hot loops — a cost you can erase with a one-line hoist.
---

# Performance

v2's design is one trade: **defer everything**. No proxy. No eager refs. No
binding until first access. Creation becomes extremely cheap. Reads pay a
small cost.

## Creation is nearly free

Creating an instance is a plain `new`. Refs and computeds do not exist until
you touch them. Measured on one machine:

| creating 100k instances    | time       | v2 is           |
| -------------------------- | ---------- | --------------- |
| **v2 `new Class()`**       | **0.7 ms** | —               |
| native `reactive(new X())` | 36.7 ms    | **55× faster**  |
| native composable factory  | 42.8 ms    | **64× faster**  |
| v1 `ivue(Class)`           | 169 ms     | **253× faster** |

v2 scales linearly at 10M instances: ~50 ms to allocate, ~1 s to also
materialize a ref and a computed on each, ~2.9 s for full **four-level**
hierarchies (40M+ cells). Unused instances cost almost nothing. This is ideal
for large lists and virtual scrolling.

Don't take the table's word for it — run it on your own machine:

<DemoPerf />

## Memory: derivations weigh nothing

Every eager `computed()` costs real bytes **per instance**. You pay for the
`ComputedRefImpl`, its dependency links, and the closure. You pay even when
all it memoizes is trivial math.

v2 stores derivations once, on the prototype, as plain getters. An instance
holds only the state cells it has actually materialized.

Measured on Vue 3.5 with an identical shape — 10 state refs, 60 trivial
derivations, one full read pass, 20k instances:

| authoring style                    | heap per instance | v2 is             |
| ---------------------------------- | ----------------- | ----------------- |
| **v2 class — 60 plain getters**    | **1.7 KB**        | —                 |
| composable — 60 plain closures     | 12.8 KB           | **7.7× lighter**  |
| composable — 60 eager `computed()` | 31.1 KB           | **18.6× lighter** |

A trivial computed costs ≈300 bytes per instance. A closure costs ≈190. Both
are paid at creation, whether the value is ever read or not.

The middle row is the sharp one. Skipping `computed()` inside a composable
still costs 7.7×, because **closures allocate per instance**. Only prototype
getters are shared. Skipping memoization is a policy win. The prototype is
the structural win. v2 stacks both by default.

Scaled up: a 1,000-row grid of these components drops from ~31 MB to ~1.7 MB
of reactivity cells. For 10k virtualized items: ~311 MB → ~17 MB. The GC
pressure of creation bursts shrinks with it.

This doesn't matter everywhere. A singleton store with 60 computeds costs
31 KB, total. And in many components, vnodes and DOM dominate the heap, not
reactivity cells. Use [`computed()`](/guide/computed-watch) where memoization
or render suppression earns its ~300 bytes.

## Reads cost a little more

State lives behind a getter. Each `this.x.value` does a small indirection
before reaching the ref: a `toRaw` call and a cache lookup. A native
composable reads its closure ref directly.

On a hot loop dominated by reads, with identical bodies:

| 10M method calls         | time    | per call |
| ------------------------ | ------- | -------- |
| native composable `fn()` | ~48 ms  | ~4.8 ns  |
| v2 `inst.method()`       | ~240 ms | ~24 ns   |

A method that hammers reactive state costs ~5× more per call than a native
closure. **Method dispatch is not the cost.** The getter-indirected reads
inside the method are.

In absolute terms, 24 ns is nothing. It only matters when you call something
millions of times.

## Hot loops

When you do have such a loop, hoist the refs out of the getters once:

```ts
calculate() {
  const w = this.w, h = this.h        // hoist: one getter access each
  let s = 0
  for (let i = 0; i < 1e7; i++) {
    s += Math.sqrt(w.value ** 2 + h.value ** 2)   // direct ref reads now
  }
  return s
}
```

The inner loop now reads refs directly and runs at native speed.

## The mental model

- **v2**: cheap to create, light in memory, slightly costlier to read.
- **v1 / native composable**: costlier to create, heavier per instance, cheap to read.

Pick by workload. Most apps create and render far more than they hot-loop, so
v2's creation win usually dominates. Where it doesn't, the read cost is
erasable.
