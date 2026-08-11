---
title: "Measured, not promised"
description: Benchmarks lie by default — dead-code elimination, unobserved heaps, harness tax. What it took to publish numbers we'd defend, and the bugs our own harnesses hid.
date: 2026-07
---

# Measured, not promised

<BlogPostDate />

![Measured, not promised](/blog/measured-not-promised.png)

Every library's benchmarks are flattering. Not because authors lie —
because **benchmarks lie by default**, and it takes real work to stop
them. Building ivue's numbers, our own harnesses lied to us three times.
This post is the confession log, because the failure modes live in your
benchmarks too.

**Lie one: the results nobody read.** Our first creation benchmark
overwrote every instance into a single variable and never read one of
them. An optimizing JIT is free to skip work whose results are provably
unused — and it exercised that freedom *unevenly* across the variants,
timing some at a literal 0.0 ms. Whatever that clock measured, it was
not creation. The fix: every instance retained in an array and touched
after the timer stops, so each variant pays its full price and the
comparison compares one thing.

**Lie two: the empty-shell heap.** Our first memory benchmark
snapshotted instances that nothing had ever read. Reactive systems
defer their real allocation to first use — ivue materializes its cells
on first touch, and a proxy builds its tracking structures as reads
get tracked — so an untouched heap compares empty shells, not working
objects, and flatters whichever side defers more. Re-measured after a
full read pass inside a subscribing effect, every variant carried its
true working weight, and only then did the per-instance numbers mean
anything.

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
