---
title: Performance by Design
description: The honest numbers. ivue creates instances 6–132× faster, holds live instances at up to 5× less heap, reads 3–18× faster than proxy-wrapped objects, and hoists hot paths to native speed.
relatedPosts: [measured-not-promised, one-kilobyte-feature, twenty-million-cells]
---

# Performance by Design

ivue's design is one move: **defer everything**. No proxy. No eager refs. No
binding until first access. Creation becomes extremely cheap, observed state
stays small, and ordinary object access avoids proxy indirection. The only
faster read path is a direct handle already held in a closure or local
variable; stable ivue refs and methods hoist to that same path when a hot loop
needs it.

## Creation is nearly free

Creating an instance is a plain `new`. Refs and computeds do not exist until
you touch them. Measured with every instance retained in an array — nothing
the JIT can optimize away — as the median of 7 runs (Node 22, Vue 3.5). All
four columns share the same member shape: two state members and one derived
value.

<p class="benchmark-legend">Best measured result among fully reactive implementations. Non-reactive controls mark the floor. <BenchmarkWinner placement="after" /></p>

| creating 1,000,000 instances | time        | ivue is                                   |
| ---------------------------- | ----------- | ----------------------------------------- |
| **ivue `new Class()`**       | <strong>21.7 ms <BenchmarkWinner placement="after" /></strong> | <span class="ix-base">the baseline</span> |
| native composable factory    | 139 ms      | **6.4× faster**                           |
| native `reactive(new X())`   | 470 ms      | **22× faster**                            |
| v1 `ivue(Class)`             | 2,861 ms    | **132× faster**                           |

The same run at 100,000 instances: **1.7 ms** for ivue, 46.3 ms for the
composable factory, 28.8 ms for `reactive()`, 169 ms for v1. Between the
two scales the alternatives swap places — at 100k `reactive()` beats the
closure factory, at 1M it costs over three times more — because proxy
registration compounds with population while closures grow linearly. ivue
itself scales near-linearly (1.7 ms → 21.7 ms for 10× the instances),
because a plain `new` allocates one object and nothing else. Unused
instances cost almost nothing. This is ideal for large lists and virtual
scrolling.

Don't take the table's word for it — run it in your own browser:

<DemoPerf />

## Memory: derivations weigh nothing

Every eager `computed()` costs real bytes **per instance**. You pay for the
`ComputedRefImpl`, its dependency links, and the closure. You pay even when
all it memoizes is trivial math.

ivue stores derivations once, on the prototype, as plain getters. An instance
holds only the Refs it has actually materialized.

The floor of that claim is measurable at creation time, before anything
is read. A freshly constructed instance owns nothing but its constructor-
assigned fields — every getter, computed, and method is shared prototype
structure, paid once per class. 100,000 bare `{ id }` object literals
against 100,000 instances of
[InteractiveBox](/blog/one-kilobyte-feature#the-model-behind-the-benchmark),
the three-level reactive hierarchy from the creation benchmark (heap
delta after GC, Node 26 with `--expose-gc`, stable across runs):

| 100,000 of…                          | heap    | per instance |
| ------------------------------------ | ------- | ------------ |
| `{ id }` object literal              | 3.04 MB | 31.9 bytes   |
| `new InteractiveBox.Class({ id })`   | 3.08 MB | 32.2 bytes   |

**1.01×** a bare object literal — the entire hierarchy's members cost
zero bytes per instance until first access. The numbers below measure
the other end: instances *live and observed*, refs materialized,
dependencies subscribed.

Measured on Vue 3.5 (Node 22, gc-forced heap deltas, 100,000 instances
retained) with an identical shape — 10 state refs, 30 trivial derivations —
and every instance **observed**: its full read pass runs inside its own
subscribing effect, one effect per instance in every arm. Live means
observed; a heap number taken without a subscriber flatters the lazy and
hides dependency storage.

| authoring style, 100,000 live instances  | heap per instance | 100k total   | ivue is                                   |
| ---------------------------------------- | ----------------- | ------------ | ----------------------------------------- |
| **ivue class — 30 plain getters**        | <strong>3.7 KB <BenchmarkWinner placement="after" /></strong> | <strong>364 MB <BenchmarkWinner placement="after" /></strong> | <span class="ix-base">the baseline</span> |
| composable — 30 plain closures           | 8.0 KB            | 781 MB       | **2.1× lighter**                           |
| `reactive(new X())` — fields + getters   | 10.4 KB           | 1.02 GB      | **2.8× lighter**                           |
| composable — 30 eager `computed()`       | 19.7 KB           | 1.93 GB      | **5.3× lighter**                           |

Per-instance cost is flat across scales, so the ratios are structural. The
`reactive()` number deserves its own sentence: the proxy is nearly free at
rest (nothing allocates until something subscribes), but the first effect
that observes an instance allocates dependency storage for **every tracked
key** — every field and every proxy-tracked getter — and that lands at
10.4 KB, on top of creation that runs 22× slower at a million instances
and reads that pay the proxy forever. ivue's refs subscribe at the leaf:
10 refs, 10 dependencies, 3.7 KB, raw-speed reads. An eager computed costs ≈390 bytes per instance under observation. A plain
closure costs ≈145. Both are paid whether the value is ever read or not.

The closures row is the sharp one. Skipping `computed()` inside a
composable still costs 2.1×, because **closures allocate per instance**.
Only prototype getters are shared. Skipping memoization is a policy win.
The prototype is the structural win. ivue stacks both by default.

Scaled up: a 1,000-row grid of these components drops from ~20 MB to
~3.7 MB of live reactive state. For 10k virtualized items: ~197 MB →
~37 MB. The GC pressure of creation bursts shrinks with it.

This doesn't matter everywhere. A singleton store with 30 computeds costs
20 KB, total. And in many components, vnodes and DOM dominate the heap, not
Refs/Computeds. Use [`computed()`](/guide/computed-watch) where memoization
or render suppression earns its ~300 bytes.

The same rule extends to the computeds you _do_ cache: point them at
methods — `computed(() => this.recalculate())` — instead of inlining the logic.
The per-instance closure is then a pointer-sized hop to code that exists
once per class on the prototype, and it can never accidentally capture
getter-scope locals that would otherwise live as long as the instance —
the guaranteed-minimum footprint
([the thin convention](/guide/computed-watch#point-the-computed-at-a-method)).

At document scale the same invariant goes one level deeper: the flyweight columnar
model holds **20,000,000 live cells at 4.7 bytes each**, fully reactive —
[Interactive Benchmarks](/guide/benchmarks#the-flyweight-grid-20-million-cells).

## The whole engine is ~1.1 kB

The entire runtime — lazy ref-getters, method binding, inheritance/`super`
resolution, teardown, and `$watch`/`$watchEffect` — ships as **1.1 kB gzipped**
(ES build). Development, test, SSR, and production execute the same ivue engine
path: no development registry, construct proxy, or live method dispatch layer.

## Raw access avoids proxy overhead

The standard is the raw ivue instance — templates read state through
destructured bindings and behavior through dotted access. Wrapper costs are
shown for comparison; both wrappers were retired
([Components & Templates](/guide/components)). Measured per read over
10-million-iteration loops (Node 22, V8, Vue 3.5):

| access path          | **ivue raw instance (the standard)** | shallow unwrap proxy | `reactive()` |
| -------------------- | ------------------------------------ | -------------------- | ------------ |
| plain derived getter | <strong>23.4 ns <BenchmarkWinner placement="after" /></strong> | 68.2 ns              | 125.1 ns     |
| ref-getter access    | <strong>9.6 ns <BenchmarkWinner placement="after" /></strong> | 47.0 ns              | 72.4 ns      |
| method access        | <strong>3.8 ns <BenchmarkWinner placement="after" /></strong> | 42.3 ns              | 68.5 ns      |

The first column includes ivue's own getter work — a `toRaw` call and cache
lookup — but no proxy sits between the caller and the object. A shallow
unwrap proxy costs 3–11× the raw ivue path; `reactive()` costs 5–18×. That is
the ordinary architectural comparison: ivue creates less indirection and
reads through less indirection.

## The direct-access floor

A ref already held in a closure or local variable performs no property
lookup. It is the irreducible floor. Measured with the loop inside the timed
region, one million iterations, median of 9 runs (Node 22, V8):

| per operation                     | dotted ivue | direct handle |
| --------------------------------- | ----------- | ------------- |
| ref read (`instance.width.value`) | **~10 ns**  | <strong>~1.3 ns <BenchmarkWinner placement="after" /></strong> |
| method call                       | **~4 ns**   | <strong>~1.2 ns <BenchmarkWinner placement="after" /></strong> |

This comparison isolates the remaining getter/property hop; it does not make
ivue slower than proxy-based reactive objects. Ordinary application reads pay
single-digit nanoseconds for methods and about ten for state. Only a loop
performing the same access millions of times can measure the difference — and
stable identity lets that loop remove it.

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

### Methods hoist the same way

Methods are referentially stable, so a method hoists exactly like a ref —
and it pays. In a clean one-million-call loop, `instance.grow()` costs
~4 ns per call while the hoisted form runs at ~1.4 ns — **closure parity**:

```ts
processAll() {
  // hoist once: the bound function is the same reference forever
  const grow = this.grow;

  for (let i = 0; i < 1e6; i++) {
    grow(); // per-call property lookup gone — native closure speed
  }
}
```

The win comes from removing the per-call property access and letting the
JIT inline a single hot function reference. The same trick works across
instances (`const grow = box.grow`) because the bound function never
changes identity.

In templates, event handlers fire per click, not per million — hoisting
buys nothing for those; keep them dotted (dotted access is what marks them
as actions). The one template case that earns the hoist is a method called
per row of a large `v-for` — there, destructuring the method is the same
measured win.

## Designed for native JIT shapes

A just-in-time compiler (JIT) turns repeatedly executed JavaScript into
specialized machine code while the application runs. ivue does not require a
JIT for correctness. It gives one unusually favorable input: stable,
ordinary JavaScript structures.

After first access, an ivue model consists of:

- plain instances with repeated object shapes;
- stable prototypes and native method dispatch;
- symbol-keyed own properties holding lazy state;
- identity-stable refs and bound functions;
- plain getters for uncached derivation;
- no per-instance proxy handler or steady-state plugin registry dispatch.

The prototype transformation happens once. Repeated execution then sees the
same getters, cache slots, functions, and object shapes, giving a modern
JavaScript engine consistent structures it can specialize. Hoisting a ref or
method goes one step further: the hot loop receives the stable handle directly
and removes the property lookup from its repeated work.

This is alignment, not a performance promise. Whether an engine inlines a
particular call depends on the engine, version, warm-up, call-site shapes, and
surrounding code. The measured numbers on this page belong to their stated
Node and V8 environment; the architectural guarantee is that ivue leaves
ordinary JavaScript behind for the engine to optimize.

> ivue remains correct without a JIT. A JIT only specializes the stable native
> structures ivue leaves behind.

## The mental model

- **Against proxy objects:** raw ivue access is 3–18× faster because no
  shallow or deep proxy mediates the read.
- **Against a direct closure ref:** dotted ivue access has one getter/cache
  hop; the closure starts at the direct-access floor.
- **In hot paths:** stable refs and methods hoist once, so repeated work runs
  at direct-ref or closure speed.

The result is not allocation performance purchased with permanently slower
reads. ivue combines plain-object construction, observation-priced memory,
proxy-free ordinary access, and an explicit path to native speed where a
profiler shows repetition matters.
