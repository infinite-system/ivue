---
title: "Measured, not promised"
description: Benchmarks lie by default — and our own harness hid a 3× difference before we caught it. What it took to publish numbers we'd defend, run live in the reader's browser.
date: 2026-07
---

# Measured, not promised

<BlogPostDate />

![Measured, not promised](/blog/measured-not-promised.png)

Every library's benchmarks are flattering. Not because authors lie —
because **benchmarks lie by default**, and it takes real work to stop
them. Building ivue's numbers, our own harness lied to us before any
competitor's could — this post is the confession, because the failure
mode lives in your benchmarks too.

**The harness tax.** Timing operations through a per-call closure added
a constant cost to every variant — large enough to hide a 3× difference
between two method-call styles. The operations were honest; the
*measurement* wasn't. Loop inside the timed region, or you are
measuring the harness instead of the code.

What survived the discipline ships on the [Performance by
Design](/guide/performance) page with its protocol attached — and the
sharpest habit we kept: **run the numbers in the reader's browser**, on
the shipped engine, where no one can quietly pick the machine:

<DemoPerf />

If a claim can't survive its own methodology section, it isn't a result —
it's marketing with axes. Steal the harness patterns; they're described
under [Methodology](/guide/benchmarks#methodology).
