---
title: 'Derivations are free. Caches are earned.'
description: "We finally measured the one thing the doctrine never had a number for: the warm read. A plain getter recomputes every time; computed() reads its cache in 3 nanoseconds. So why is the getter still the right default? Because the crossover has a price — and most derivations never pay it."
tags: [performance, patterns]
relatedPosts: [computed-is-a-cache, expressiveness-is-no-longer-a-budget, total-memory-control, the-zeros-didnt-move, twenty-million-cells, measured-not-promised]
date: 2026-08
---

# Derivations are free. Caches are earned.

![Derivations are free. Caches are earned.](/blog/derivations-are-free.png)

<BlogPostDate />

There was one number missing from everything we'd measured so far:
the warm read. We knew what [computed() costs to
exist](/blog/computed-is-a-cache) — roughly 300 bytes per instance,
allocated whether the value is ever read or not. We knew what a plain
getter costs to exist — zero. But existence is only half the ledger.
The other half is the read itself:

```ts
get area() {
  return this.width.value * this.height.value; // recomputes EVERY read
}

get areaCell() {
  return computed(() => this.area);            // reads a cache
}
```

Does a cached read outrun a recompute? Of course it does. The
interesting questions are *by how much*, *when it matters*, and *what
the cache charges when its dependencies actually change*. So we
measured all three.

## The warm read, measured

Four derivation tiers, same logic in each shape: a plain ivue getter,
and the conventional composable — bare refs plus `computed()`. Two
read patterns: **clean** (two million reads, dependencies never
change — the cache's best case) and **churn** (write-then-read
cycles — the cache's worst case, because every write dirties it).
Node 26, Vue 3.5.41, nanoseconds per read, medians of three runs;
Vue 3.6.0-rc.5 shows the same shape with slightly cheaper cached
reads. The scripts are in the repo: `bench/derived-vs-computed.mjs`
and `bench/derived-vs-computed-ratio.mjs`.

| derivation | clean: getter | clean: computed() | churn: getter | churn: computed() |
| --- | --- | --- | --- | --- |
| trivial (`a + b`) | 23.7 ns | **2.6 ns** | 54.6 ns | **39.5 ns** |
| medium (5-ref string) | 150.4 ns | **2.9 ns** | 202.2 ns | **154.1 ns** |
| heavy (reduce over 100) | 3,479 ns | **2.7 ns** | 3,460 ns | **2,065 ns** |
| chained (depth 3) | 71.4 ns | **2.6 ns** | **100.7 ns** | 103.1 ns |

Read the clean column first, because it is genuinely striking:
**computed()'s warm read is about 3 nanoseconds, flat, no matter how
heavy the derivation is.** That is what a cache is. The plain getter
pays the full recompute on every read — 24 nanoseconds for `a + b`,
3.5 *micro*seconds for a reduce over a hundred elements.

So the cache wins the nanosecond race. The doctrine survives anyway,
for two reasons the table already contains.

First, **the absolute scale**. A getter that costs 24 nanoseconds per
read costs 24 microseconds per *thousand* reads. A template does not
read a thousand derivations per render; it reads a few dozen. For
trivial and medium derivations, "slower than a cache" and "free" are
the same thing at template scale.

Second, **churn**. The moment dependencies change between reads, the
cache stops being a 3-nanosecond read and becomes a 3-nanosecond read
*plus* invalidation bookkeeping on every write, plus the recompute it
was going to do anyway. The gap collapses — and on the chained tier
the getter actually wins, because layered computeds pay the
dirty-check once per layer.

## Where the cache pays for itself

Churn and clean are the two ends of one dial: reads per change. So we
swept it — cycles of one write followed by R reads, for each tier.
The question each cell answers: at this ratio, does wrapping the
getter in `computed()` win?

| derivation | crossover (reads per change) | and below it |
| --- | --- | --- |
| heavy (reduce over 100) | **~2** | getter wins outright |
| medium (5-ref string) | **~2** | getter wins outright |
| chained (depth 3) | **~3–5** | getter wins outright |
| trivial (`a + b`) | **~10** | getter wins — and past it, the cache saves single-digit ns |

Two facts fall out, and together they are the whole decision
procedure:

> **Derivations that do real work earn a cache at about two reads per
> change. Trivial derivations almost never earn one.**

And the boundary case: at one read per change — a value that is
written and then rendered once, the rhythm of anything driven by an
animation frame — **the plain getter wins every tier, the heavy one
included.** A cache that is invalidated as often as it is read is
pure overhead with a memory bill attached.

That is the honest accounting, and it cuts both ways. If you have a
derivation that reduces over a real collection and the template reads
it more than once per change: wrap it. `computed()` in an ivue getter
is exactly that surgical opt-in, and this is the number that tells
you when. Everything else: leave it as the getter it already is.

## Case study: the virtual scroller — two of four

A virtual scroller we maintain has four `computed()`s in its
composable form. Run them through the rule:

- **`halfPaddingQuantity`** — `Math.ceil(padding / 2)`. Trivial tier,
  read a handful of times ever. The cache saves ~2 nanoseconds per
  read and costs ~300 bytes. Plain getter.
- **`scrollHeightPx`** — a number plus `'px'`. Trivial, and as a
  computed it sits downstream of the real `scrollExtent`, so every
  position update pays an extra invalidation hop for a string concat.
  Plain getter.
- **`scrollExtent`** — calls `getComputedStyle()` inside the
  derivation. That is a forced style query: microseconds, hundreds of
  times the heavy tier — and it's read every animation frame while
  its dependencies change only when items resize. High reads per
  change, expensive body. **Earned.**
- **`visibleItems`** — binary search plus a `slice().map()` that
  allocates a context object per visible row, read more than once per
  render. The heavy tier crosses over at two reads per change; a
  template hits two reads the moment it checks a length and runs a
  `v-for`. **Earned.**

Four computeds become two plain getters and two caches that can now
justify themselves out loud. That is what *surgical* means.

## Case study: the post player — zero of ninety

The other end of the spectrum is a production component that is both
the player and the editor of a post — one model, one class, about
**ninety derived getters**. A scale ratio. Thirty `Raw`/`Px` pairs:
multiply by the ratio, clamp, append `'px'`. Named conditions,
refined props, font sizes, margins. Nearly all of it trivial or
chained-trivial.

Run the rule and the answer is uniform: **zero caches.** A full pass
of the template over ~40 of these derivations costs two to three
microseconds, recomputed from scratch. And the component's hottest
moment — a resize animation, where the width changes every frame and
all ninety derivations go stale together — is exactly the
one-read-per-change regime where caches *lose outright*: ninety
computeds would pay invalidation machinery every frame for values
that are never read twice.

The composable version of this class would spend ~27 kilobytes per
instance on caches that save microseconds it doesn't have to spend.
The class version spends zero — and there are many of these instances
on screen.

## The scaling law

Here is what the zero actually buys, because it compounds along two
axes at once.

**A thousand instances.** The derivations live on the prototype —
once, shared. A thousand post players with ninety derivations each is
ninety thousand live derivations backed by zero bytes of reactive
machinery, zero dependency-graph nodes, nothing for the garbage
collector to trace. The composable shape allocates the caches per
instance: ~27 megabytes of machinery for the same screen.

**A hundred more derivations.** The marginal cost of a new derived
getter is a function definition on the prototype — not 300 bytes
times the instance count. Derivation count stops being a budget. This
is why one class can afford to be both the player *and* the editor:
the editor's derivations — dialog field templates, has-changes
checks, settings refinements — cost nothing while the dialog is
closed, because **an unread getter is not a stale cache waiting to be
invalidated. It is a function nobody called.** Outside edit mode,
every edit-mode derivation is untouched: no allocation, no
subscription, no bookkeeping. Nothing is paid for the capability —
only, lazily, for the use.

In the computed world, derivations are a cost you ration — so
expressions leak into templates, concerns merge, the editor gets
split off to keep the player light. In the getter world the model can
be maximally expressive and the floor does not move: add a thousand
instances or a hundred derivations, and you are still under it.

## The frame budget — when cost becomes visible

All of these nanoseconds answer to one clock: the frame. At 60 fps a
frame is 16.7 ms. At 120 Hz it is 8.3 ms. Vue's diffing, DOM
patching, and the browser's style, layout, and paint all share that
window, so the realistic headroom for derivation work is a couple of
milliseconds per frame. And reactivity only runs on dirty frames.
Vue batches every write in a frame into one flush, each dirty
component renders once, and an idle frame costs zero — pull-based
getters are never polled.

Hold the getter tax against that budget:

| what renders in one dirty frame | getter cost | share of 16.7 ms |
| --- | --- | --- |
| 1,000 trivial derivations (24 ns) | 24 µs | 0.14% |
| 1,000 medium derivations (150 ns) | 150 µs | 0.9% |
| 100 heavy models × 40 derivations | ~200 µs | 1.2% |
| 1,000 **heavy** derivations (3.5 µs) | 3.5 ms | **21%** |

You would need about forty thousand trivial getter reads in a single
frame to spend one millisecond. Only the last row threatens the
frame, and that row is exactly the one the rule already sends to
`computed()`.

The frame lens also sharpens what "reads per change" means in a real
app. In a continuously animating UI, a dependency changes once per
frame and the render reads once per frame. That is R = 1 sustained,
the regime where the getter wins every tier. The high ratios that
make a cache pay off come from somewhere else: **many consumers
inside one flush**. Ten components, a watcher, and a chained
derivation all reading the same value after one change is R = 10 in
a single frame. So count consumers, not time between changes. One
consumer: getter, always. Two or more consumers of real work:
computed.

That collapses the doctrine into one frame-shaped rule: keep total
derivation work under about one millisecond per dirty frame. A
derivation needs a cache only when its cost times its consumers
threatens that number. A 3.5 µs reduce read by five components is
17.5 µs — nothing. The same reduce inside a 1,000-row `v-for` is
3.5 ms. Cache that one.

## The rare form is the signal

There is a second payoff to making the getter the default, and it
has nothing to do with speed. It is legibility.

In composable style, `computed()` is the primary way of operating. A
mature component has thirty of them, so the one wrapping a genuinely
expensive reduce looks identical to the twenty-nine wrapping
`firstName + lastName`. Expensive and trivial wear the same syntax.
Nothing marks the hotspot.

In ivue the default is the plain getter, so a `computed()` in a
class **is** the marker. It reads as a declaration: this derivation
is expensive enough to earn a cache. The rare form carries the
information because it is rare.

The practical consequence: the performance audit becomes a grep.
Search the codebase for `computed(` and you get the complete
inventory of self-declared hotspots, each one checkable against the
crossover rule. Run the same grep in a composable codebase and you
get every derivation in the app — which is to say, nothing. When a
convention holds everywhere, the deviation becomes
[a measuring device](/blog/uniformity-is-a-measuring-device). Here
the deviation is `computed()`, and what it measures is cost.

## The rule

The full picture, with nothing hidden: a bare `computed()` will
always win a nanosecond drag race on a warm cache — that's its job,
and now there's a number on it. What it charges is existence
(~300 bytes per instance, [paid up
front](/blog/computed-is-a-cache)), graph maintenance on every write,
and — below its crossover — more time than it saves.

> Derive with plain getters. Cache when the work is real **and** it's
> read at least twice per change. The first rule costs you nothing,
> ever; the second one is now a measurement, not a feeling.

Measured on Node 26, Vue 3.5.41 and 3.6.0-rc.5, medians of three —
the benches are `bench/derived-vs-computed.mjs` and
`bench/derived-vs-computed-ratio.mjs` in [the
repo](https://github.com/infinite-system/ivue), and
[measured, not promised](/blog/measured-not-promised) is still the
house rule.
