---
title: Performance
description: The honest numbers — v2 is 55–253× faster to create, ~18× lighter per instance, ~5× slower on hot state reads, and how to erase that read cost with a one-line hoist.
---

# Performance

v2's design is one trade: **defer everything**. No proxy, no eager refs, no
binding until first access. That makes creation extraordinarily cheap and pushes
a small cost to read-time.

## Creation is nearly free

Creating an instance is a plain `new` — the refs/computeds don't exist until you
touch them. Measured on one machine, 100k instances:

|                            | allocate 100k | vs v2       |
| -------------------------- | ------------- | ----------- |
| **v2 `new Class()`**       | **0.7 ms**    | —           |
| native `reactive(new X())` | 36.7 ms       | 55× slower  |
| native composable factory  | 42.8 ms       | 64× slower  |
| v1 `ivue(Class)`           | 169 ms        | 253× slower |

At 10M instances v2 still scales linearly: ~50 ms to allocate, ~1 s to also
materialize a ref + computed on each, ~2.9 s for full **four-level** hierarchies
(40M+ cells). Unused instances cost essentially nothing — ideal for large lists
and virtual scrolling.

## Memory: derivations weigh nothing

Every eager `computed()` costs real bytes **per instance** — the
`ComputedRefImpl`, its dependency links, and the closure — even when all it
memoizes is trivial math. In v2, derivations live once on the prototype as
plain getters; an instance holds only the state cells it actually materialized.

Measured on Vue 3.5, identical shape (10 state refs + 60 trivial derivations,
one full read pass), 20k instances:

| authoring style                    | heap per instance | vs v2 |
| ---------------------------------- | ----------------- | ----- |
| composable — 60 eager `computed()` | 31.1 KB           | 18.6× |
| composable — 60 plain closures     | 12.8 KB           | 7.7×  |
| **v2 class — 60 plain getters**    | **1.7 KB**        | —     |

That's ≈300 bytes per trivial computed and ≈190 bytes per closure, per
instance, paid at creation whether the value is ever read. The middle row is
the sharp one: even skipping `computed()` inside a composable still costs
7.7×, because **closures allocate per instance** — only prototype getters are
shared. Skipping memoization is a policy win; the prototype is the structural
win; v2 stacks both by default.

Scaled up: a 1,000-row grid of components this shape drops from ~31 MB to
~1.7 MB of reactivity cells (10k virtualized items: ~311 MB → ~17 MB), and the
creation-burst GC pressure shrinks with it.

Where it doesn't matter: singletons (one store with 60 computeds is 31 KB,
total), and components whose heap is dominated by vnodes and DOM rather than
reactivity cells. Reach for [`computed()`](/guide/computed-watch) per getter
only where memoization or render-suppression earns its ~300 bytes.

## Reads cost a little more

State lives behind a getter, so each `this.x.value` does a tiny bit of indirection
(`toRaw` + a cache lookup) before reaching the ref. A native composable reads its
closure ref directly. On a hot loop dominated by reads, identical bodies:

| 10M method calls         | time    | per call |
| ------------------------ | ------- | -------- |
| native composable `fn()` | ~48 ms  | ~4.8 ns  |
| v2 `inst.method()`       | ~240 ms | ~24 ns   |

So a method that hammers reactive state is ~5× the per-call cost of a native
closure. **Method dispatch is not the cost** — caching the method vs. retrieving
it each call is the same; it's the getter-indirected reads inside.

In absolute terms 24 ns is nothing — this only matters when you call something
millions of times.

## Hot loops

When you do have such a loop, hoist the ref out of the getter once:

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

Now the inner loop reads refs directly and runs at native speed.

## The mental model

- **v2**: cheap to create, light in memory, slightly costlier to read.
- **v1 / native composable**: costlier to create, heavier per instance, cheap to read.

Pick by your workload. Most apps create and render far more than they hot-loop, so
v2's creation win dominates — and the read cost is erasable where it isn't.
