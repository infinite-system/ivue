---
title: Performance
description: The honest numbers — v2 is 55–253× faster to create, ~5× slower on hot state reads, and how to erase that read cost with a one-line hoist.
---

# Performance

v2's design is one trade: **defer everything**. No proxy, no eager refs, no
binding until first access. That makes creation extraordinarily cheap and pushes
a small cost to read-time.

## Creation is nearly free

Creating an instance is a plain `new` — the refs/computeds don't exist until you
touch them. Measured on one machine, 100k instances:

| | allocate 100k | vs v2 |
|---|---|---|
| **v2 `new Class()`** | **0.7 ms** | — |
| native `reactive(new X())` | 36.7 ms | 55× slower |
| native composable factory | 42.8 ms | 64× slower |
| v1 `ivue(Class)` | 169 ms | 253× slower |

At 10M instances v2 still scales linearly: ~50 ms to allocate, ~1 s to also
materialize a ref + computed on each, ~2.9 s for full **four-level** hierarchies
(40M+ cells). Unused instances cost essentially nothing — ideal for large lists
and virtual scrolling.

## Reads cost a little more

State lives behind a getter, so each `this.x.value` does a tiny bit of indirection
(`toRaw` + a cache lookup) before reaching the ref. A native composable reads its
closure ref directly. On a hot loop dominated by reads, identical bodies:

| 10M method calls | time | per call |
|---|---|---|
| native composable `fn()` | ~48 ms | ~4.8 ns |
| v2 `inst.method()` | ~240 ms | ~24 ns |

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

- **v2**: cheap to create, slightly costlier to read.
- **v1 / native composable**: costlier to create, cheap to read.

Pick by your workload. Most apps create and render far more than they hot-loop, so
v2's creation win dominates — and the read cost is erasable where it isn't.
