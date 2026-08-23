---
title: 'X launch thread'
description: 'The nine-tweet launch thread — segments split on horizontal rules, character counts annotated in dev.'
channel: x
date: 2026-08
---

# X launch thread

Every framework bet on classes. Then every framework abandoned
them. Both moves misread the evidence — the bugs were real, but they
were the frameworks' bugs, not the language's. 🧵

---

this-binding, mixin hell, forked singletons, init-order races —
real bugs, wrong diagnosis. Classes weren't broken, they were
UNCONSTRAINED: ten ways to do everything. Functions won because they
shipped with constraints. Nobody had found the constraints for
classes.

---

So: find them. What is the invariant SHAPE of a class in
JavaScript — what must be true for full reactivity, memoization at
every scope, inheritance? Hold those constraints and you don't design
features. They fall out.

---

What fell out: Reactive() — plain TS classes, full Vue 3
reactivity, 1.1 kB. State = ref-getter. Derived = plain getter, ZERO
bytes/instance, extends/super work. 100k instances create 55–253×
faster than the alternatives.
https://ivue.dev/blog/introducing-ivue

---

The classic wounds closed one by one, each with a measured
write-up: this.method finally safe to pass. Circular imports
dissolved. Initialization order solved in userland. Shared stores
that can't fork or race — bulletproof modules, earned not named.

---

Then its dual appeared (not invented): Static(), same constraints
on capability classes. And last week the final seam sealed — shared
stores, unforkable and load-safe. The whole memoization map fits in
one table: https://ivue.dev/blog/bulletproof-class-modules

---

And after all of it the core is STILL 1.1 kB, and faster than
when it started. Invariants delete code; features accumulate it.
That's the whole method.

---

The payoff closures can't offer: your app becomes a live OBJECT
GRAPH — entities holding entities, stores referencing stores,
inspectable end to end. That's what composables lack, and what humans
AND agents need to navigate a big system.

---

A 94,000-line terminal IDE has been built on this — by AI agents,
following the same one-document standard humans use. More is coming.
The blog documents the reduction as it happens, measured numbers only:
https://ivue.dev/blog/
