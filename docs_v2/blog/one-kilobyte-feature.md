---
title: "One kilobyte is a feature"
description: 1.1 kB is not a compression achievement — it is what remains when a design stops needing machinery. Small enough to read, small enough to trust.
date: 2026-07
---

# One kilobyte is a feature

![One kilobyte is a feature](/blog/one-kilobyte-feature.png)

The whole ivue engine — lazy state, method binding, reactive inheritance
with `super`, teardown, `$watch`, and the complete hot-reload-for-classes
machinery — ships as **1,148 bytes gzipped**. Zero dependencies. 100% test
coverage, every metric, every file.

That number is not a compression trophy. It's a *diagnosis*. Size is what
a design weighs after you stop paying for machinery it never needed:

- No proxy per instance — instances are plain objects, so there is no
  proxy code.
- No eager anything — state materializes on first access, so there is no
  scheduler for work that never happens.
- No compiler — the transform is a one-time prototype rewrite at runtime,
  so there is no build-step apparatus riding along.
- No HMR in production — every dev-only call site is statically erased,
  verified by grepping the shipped bundle.

What a kilobyte buys you in practice is **auditability**. You can read
the entire engine before lunch and know — not trust, *know* — what
happens on every property access of every instance you create. When
something surprises you, the surface area of possible causes fits in one
file. And the runtime consequences fall out of the same subtraction:

<CreationBench />

That's a real three-level class hierarchy hosting a composable —
instantiated 100,000 times in a few milliseconds, because creating an
ivue instance is a plain `new` that allocates one object and nothing
else.

> Perfection is achieved, not when there is nothing more to add, but when
> there is nothing left to take away.

The subtraction is the product. [Principles](/guide/principles) lists
what survived it.
