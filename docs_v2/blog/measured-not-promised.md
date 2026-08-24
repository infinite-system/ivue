---
title: "Measured, not promised"
description: Every performance number on this site comes from a measurement we ran — with its method attached, most of them re-runnable right in your browser, on the shipped engine. Measured, not promised. That's the whole idea.
date: 2026-07
tags: [performance, philosophy]
relatedPosts: [twenty-million-cells, derivations-are-free, a-million-rows-twelve-divs, the-stack-got-faster, one-kilobyte-feature, the-zeros-didnt-move]
---

# Measured, not promised

![Measured, not promised](/blog/measured-not-promised.png)

<BlogPostDate />

Every performance claim on this site comes from a measurement we
actually ran. That's the whole idea behind the phrase this post is
named after: **measured, not promised** — we did the measuring, and
you keep the ability to check.

Three habits make that real.

**Every number carries its method.** A figure on this site names
what was measured, at what scale, on which engine — "Measured on
Vue 3.5, 20,000 instances, one full read pass" — so you can repeat
it, on your hardware, and see what you get. And when a sentence
describes a behavior, that behavior was executed before the
sentence was written: components mounted, watchers fired, heaps
snapshotted. The method travels with the number, always.

**The benchmarks run in your browser.** The best machine to measure
ivue on is yours — so the load-bearing numbers execute live, right
here, on the same engine that ships to npm. Press the button and
watch your own hardware produce them:

<DemoPerf />

**The tools come with the claims.** The full
[benchmark protocol](/guide/benchmarks#methodology) is published.
The [import-cycle audit](/blog/circular-imports-dissolved) is
seventy dependency-free lines you can point at your own codebase.
The census scripts behind the
[discipline numbers](/blog/the-zeros-didnt-move) are printed in the
posts that cite them. Everything we measured, you can measure —
including on your own project.

Numbers age; machines differ; engines improve. The method is the
part that stays true — which is why every number here brings it
along. Measured, not promised. That's all it means, and it's
enough.
