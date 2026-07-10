---
title: Performance
description: The honest numbers. ivue creates instances 55–253× faster, uses up to 18× less memory per instance, and reads state ~5× slower in hot loops — a cost you can erase with a one-line hoist.
---

# Performance

ivue's design is one trade: **defer everything**. No proxy. No eager refs. No
binding until first access. Creation becomes extremely cheap. Reads pay a
small cost.

## Creation is nearly free

Creating an instance is a plain `new`. Refs and computeds do not exist until
you touch them. Measured on one machine:

| creating 100k instances    | time       | ivue is         |
| -------------------------- | ---------- | --------------- |
| **ivue `new Class()`**     | **0.7 ms** | —               |
| native `reactive(new X())` | 36.7 ms    | **55× faster**  |
| native composable factory  | 42.8 ms    | **64× faster**  |
| v1 `ivue(Class)`           | 169 ms     | **253× faster** |

ivue scales linearly at 10M instances: ~50 ms to allocate, ~1 s to also
materialize a ref and a computed on each, ~2.9 s for full **four-level**
hierarchies (40M+ Refs/Computeds). Unused instances cost almost nothing. This is ideal
for large lists and virtual scrolling.

Don't take the table's word for it — run it on your own machine:

<DemoPerf />

::: info The embed measures production semantics
This page runs on a dev server, where ivue's [class HMR](/guide/hmr) arms a
construct-trap proxy that costs ~11× on bare instantiation (0.6 ms → 6.7 ms
per 100k — dev only; production bundles contain zero HMR code, verified by
grepping `dist/`). The docs opt out via
`globalThis[Symbol.for('ivue.hmr.disable')]` so the numbers you measure here
are the numbers production pays.
:::

## Memory: derivations weigh nothing

Every eager `computed()` costs real bytes **per instance**. You pay for the
`ComputedRefImpl`, its dependency links, and the closure. You pay even when
all it memoizes is trivial math.

ivue stores derivations once, on the prototype, as plain getters. An instance
holds only the Refs it has actually materialized.

Measured on Vue 3.5 with an identical shape — 10 state refs, 60 trivial
derivations, one full read pass, 20k instances:

| authoring style                    | heap per instance | ivue is           |
| ---------------------------------- | ----------------- | ----------------- |
| **ivue class — 60 plain getters**  | **1.7 KB**        | —                 |
| composable — 60 plain closures     | 12.8 KB           | **7.7× lighter**  |
| composable — 60 eager `computed()` | 31.1 KB           | **18.6× lighter** |

A trivial computed costs ≈300 bytes per instance. A closure costs ≈190. Both
are paid at creation, whether the value is ever read or not.

The middle row is the sharp one. Skipping `computed()` inside a composable
still costs 7.7×, because **closures allocate per instance**. Only prototype
getters are shared. Skipping memoization is a policy win. The prototype is
the structural win. ivue stacks both by default.

Scaled up: a 1,000-row grid of these components drops from ~31 MB to ~1.7 MB
of Refs/Computeds. For 10k virtualized items: ~311 MB → ~17 MB. The GC
pressure of creation bursts shrinks with it.

This doesn't matter everywhere. A singleton store with 60 computeds costs
31 KB, total. And in many components, vnodes and DOM dominate the heap, not
Refs/Computeds. Use [`computed()`](/guide/computed-watch) where memoization
or render suppression earns its ~300 bytes.

The same rule extends to the computeds you _do_ cache: point them at
methods — `computed(() => this.recalculate())` — instead of inlining the logic.
The per-instance closure is then a pointer-sized hop to code that exists
once per class on the prototype, and it can never accidentally capture
getter-scope locals that would otherwise live as long as the instance —
the guaranteed-minimum footprint
([the thin convention](/guide/computed-watch#point-the-computed-at-a-method)),
and the shape that hot-reloads onto live instances ([HMR](/guide/hmr)).

At document scale the same invariant goes one level deeper: the flyweight columnar
model holds **20,000,000 live cells at 4.7 bytes each**, fully reactive —
[Benchmarks](/guide/benchmarks#the-flyweight-grid-20-million-cells).

## The whole engine is ~1.1 kB

The entire runtime — lazy ref-getters, method binding, inheritance/`super`
resolution, teardown, `$watch`/`$watchEffect`, **and the full
hot-reload-for-classes engine** — ships as **1.1 kB gzipped** (ES build).
The HMR machinery costs production literally zero bytes: every call site is
gated on the statically-replaceable `import.meta.env.DEV`, so bundlers
dead-code-eliminate all of it — verified by grepping the built output, not
assumed. Dev gets class grafting; prod gets the same 1.1 kB it always had.

## Reads cost a little more

State lives behind a getter. Each `this.x.value` does a small indirection
before reaching the ref: a `toRaw` call and a cache lookup. A native
composable reads its closure ref directly.

On a hot loop dominated by reads, with identical bodies:

| 10M method calls         | time    | per call |
| ------------------------ | ------- | -------- |
| native composable `fn()` | ~48 ms  | ~4.8 ns  |
| ivue `instance.method()`     | ~240 ms | ~24 ns   |

A method that hammers reactive state costs ~5× more per call than a native
closure. **Method dispatch is not the cost.** The getter-indirected reads
inside the method are.

In absolute terms, 24 ns is nothing. It only matters when you call something
millions of times — and when it does, one hoist erases the entire gap.

## Hot loops

When you do have such a loop, hoist the refs out of the getters once:

```ts
calculate() {
  const width = this.width, height = this.height  // hoist: one getter access each
  let sum = 0
  for (let i = 0; i < 1e7; i++) {
    sum += Math.sqrt(width.value ** 2 + height.value ** 2)  // direct ref reads now
  }
  return sum
}
```

The inner loop now reads refs directly and runs at native speed.

## The template boundary

The standard is the raw instance — templates read Refs/Computeds as `.value` at the
raw column's cost. Wrapper costs shown for comparison; both wrappers were
retired ([Components & Templates](/guide/components)). Measured per read:

| access path          | **raw (the standard)** | shallow unwrap proxy | `reactive()` |
| -------------------- | ---------------------- | -------------------- | ------------ |
| plain derived getter | **13.7 ns**            | 24.3 ns              | 75.4 ns      |
| ref-getter           | **4.1 ns**             | 22.6 ns              | 59.5 ns      |
| method               | **4.0 ns**             | 22.1 ns              | 60.3 ns      |

Raw access pays 4–14 ns — no proxy on the path at all. Class internals and
templates run at the same column. The wrapper columns exist only as the
receipts for why they lost — a `proxyRefs`-style shallow view costs ~2–5×,
`reactive()` ~6–15×. The authoring standard reads state as destructured setup
bindings — direct `.value` reads on the same cells, i.e. the raw column
([Components & Templates](/guide/components)).

## The mental model

- **ivue**: cheap to create, light in memory, slightly costlier to read.
- **ivue v1 (unreleased) / native composable**: costlier to create, heavier per instance, cheap to read.

Pick by workload. Most apps create and render far more than they hot-loop, so
ivue's creation win usually dominates. Where it doesn't, the read cost is
erasable.
