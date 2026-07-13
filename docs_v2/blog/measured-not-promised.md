---
title: "Measured, not promised"
description: Benchmarks lie by default — dead-code elimination, unobserved heaps, harness tax. What it took to publish numbers we'd defend, and the bugs our own harnesses hid.
date: 2026-07
---

# Measured, not promised

![Measured, not promised](/blog/measured-not-promised.png)

Every library's benchmarks are flattering. Not because authors lie —
because **benchmarks lie by default**, and it takes real work to stop
them. Building ivue's numbers, our own harnesses lied to us three times.
This post is the confession log, because the failure modes live in your
benchmarks too.

**Lie one: the JIT deleted the competition.** Our first creation
benchmark wrote instances into one overwritten variable. V8's escape
analysis elided the competitors' allocations entirely — `reactive()`
"created" 100,000 proxies in 0.0 ms — while ivue's opaque construction
kept honestly paying. The fix: every instance retained in an array,
touched after timing. Nothing the optimizer can discard.

**Lie two: the unobserved heap.** Our first memory benchmark read
instances *outside any effect* — and `reactive()` looked impossibly
light, because a proxy allocates its dependency storage only when
something subscribes. Live objects are *observed* objects. Re-measured
with every instance read inside its own subscribing effect, the proxy's
real bill arrived: dependency maps for every tracked key.

**Lie three: the harness tax.** Timing operations through a per-call
closure added a constant cost to every variant — large enough to hide a
3× difference between two method-call styles. Loop inside the timed
region, or measure the harness instead of the code.

What survived the discipline ships on the [Performance by
Design](/guide/performance) page with its protocol attached — and the
sharpest habit we kept: **run the numbers in the reader's browser**, on
the shipped engine, where no one can quietly pick the machine:

<DemoPerf />

If a claim can't survive its own methodology section, it isn't a result —
it's marketing with axes. Steal the harness patterns; they're described
under [Methodology](/guide/benchmarks#methodology).
