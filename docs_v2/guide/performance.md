---
title: Performance by Design
description: The honest numbers. ivue creates instances 6–132× faster, uses up to 18× less memory per instance, and reads state ~4× slower in hot loops — a cost you can erase with a one-line hoist.
---

# Performance by Design

ivue's design is one trade: **defer everything**. No proxy. No eager refs. No
binding until first access. Creation becomes extremely cheap. Reads pay a
small cost.

## Creation is nearly free

Creating an instance is a plain `new`. Refs and computeds do not exist until
you touch them. Measured with every instance retained in an array — nothing
the JIT can optimize away — as the median of 7 runs (Node 22, Vue 3.5). All
four columns share the same member shape: two state members and one derived
value.

| creating 1,000,000 instances | time        | ivue is                                   |
| ---------------------------- | ----------- | ----------------------------------------- |
| **ivue `new Class()`**       | **21.7 ms** | <span class="ix-base">the baseline</span> |
| native composable factory    | 139 ms      | **6.4× faster**                           |
| native `reactive(new X())`   | 470 ms      | **22× faster**                            |
| v1 `ivue(Class)`             | 2,861 ms    | **132× faster**                           |

At 100,000 instances: 1.7 ms for ivue, 46.3 ms for the composable factory,
28.8 ms for `reactive()`, 169 ms for v1. Note the two alternatives swap
places as the population grows — proxy registration costs compound with
scale, closures don't. ivue itself scales near-linearly (1.7 ms → 21.7 ms
for 10× the instances), because a plain `new` allocates one object and
nothing else. Unused instances cost almost nothing. This is ideal for large
lists and virtual scrolling.

Don't take the table's word for it — run it in your own browser:

<DemoPerf />

## Memory: derivations weigh nothing

Every eager `computed()` costs real bytes **per instance**. You pay for the
`ComputedRefImpl`, its dependency links, and the closure. You pay even when
all it memoizes is trivial math.

ivue stores derivations once, on the prototype, as plain getters. An instance
holds only the Refs it has actually materialized.

Measured on Vue 3.5 with an identical shape — 10 state refs, 60 trivial
derivations, one full read pass, 20k instances:

| authoring style                    | heap per instance | ivue is                                   |
| ---------------------------------- | ----------------- | ----------------------------------------- |
| **ivue class — 60 plain getters**  | **1.7 KB**        | <span class="ix-base">the baseline</span> |
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
composable reads its closure ref directly. Measured over 10-million-read
loops (median of runs):

| per operation                          | ivue       | native      |
| -------------------------------------- | ---------- | ----------- |
| ref read (`instance.width` → the ref)  | **8.4 ns** | ~2.1 ns     |
| method call (body reads a ref)         | **9.6 ns** | ~5.2 ns     |

A read that goes through a ref-getter costs about 4× a native closure read.
**Method dispatch is not the main cost** — the getter-indirected reads inside
the method are, plus a smaller tax explained under
[the template boundary](#the-template-boundary).

In absolute terms, 10 ns is nothing. It only matters when you call something
millions of times — and when it does, one hoist erases the entire gap.

## Hot loops

When you do have such a loop, hoist the refs out of the getters once:

```ts
calculate() {
  // hoist: one getter access each — the ref handles are stable forever
  const width = this.width;
  const height = this.height;

  let sum = 0;
  for (let i = 0; i < 1e7; i++) {
    // direct ref reads — native speed
    sum += Math.sqrt(width.value ** 2 + height.value ** 2);
  }
  return sum;
}
```

The inner loop now reads refs directly and runs at native speed.

### Hoisting methods doesn't pay

Methods are referentially stable, so hoisting one is always *safe* —
`const grow = instance.grow` in a function, or destructured into a
template. But it buys nothing measurable: a dotted call costs 9.6 ns and a
hoisted call 9.3 ns. The lookup was never the cost (method *access* is
3.2 ns — the bound function is cached on the instance after first touch).
The remaining gap to a native closure (~5.2 ns) is the **bound-function
call itself**, which no hoist can remove. When a loop genuinely needs
closure parity, hoist the refs and inline the method's body — the refs are
where the money is.

In templates this never matters at all: handlers fire per click, not per
million. Keep methods dotted there — dotted access is what marks them as
actions.

## The template boundary

The standard is the raw ivue instance — templates read state through
destructured bindings and behavior through dotted access, all at the first
column's cost. Wrapper costs shown for comparison; both wrappers were
retired ([Components & Templates](/guide/components)). Measured per read
over 10-million-iteration loops:

| access path          | **ivue raw instance (the standard)** | shallow unwrap proxy | `reactive()` |
| -------------------- | ------------------------------------ | -------------------- | ------------ |
| plain derived getter | **25.1 ns**                          | 75.5 ns              | 91.7 ns      |
| ref-getter access    | **8.4 ns**                           | 57.7 ns              | 76.2 ns      |
| method access        | **3.2 ns**                           | 47.4 ns              | 67.5 ns      |

The first column IS ivue, and its numbers include the engine's own
indirection — the `toRaw` call and cache lookup behind every getter. For
scale: a native class getter reads in ~2.0 ns. So raw ivue access pays
3–25 ns with no wrapper proxy on the path, and the wrapper columns are
the receipts for why they lost — a `proxyRefs`-style shallow view costs
~3–15×, `reactive()` ~4–21× *on top of* the standard. One more honest
number: *calling* a method (not just reaching it) costs ~9.6 ns versus
~2.1 ns for a native method — the cached bound function's call overhead,
covered under [Hot loops](#hot-loops).

## The mental model

- **ivue**: cheap to create, light in memory, slightly costlier to read (~4× per hot-loop read, erasable).
- **ivue v1 (unreleased) / native composable**: costlier to create, heavier per instance, cheap to read.

Pick by workload. Most apps create and render far more than they hot-loop, so
ivue's creation win usually dominates. Where it doesn't, the read cost is
erasable.
