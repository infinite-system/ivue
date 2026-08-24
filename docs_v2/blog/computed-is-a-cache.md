---
title: "computed() is a cache, not a derivation"
description: Vue's derivation primitive was always the tracked read. Memoizing everything by default was never neutral — it was just unexamined.
date: 2026-07
tags: [engine, performance]
relatedPosts: [derivations-are-free, introducing-ivue, one-kilobyte-feature, the-object-should-tell-the-truth, measured-not-promised]
---

# computed() is a cache, not a derivation

![computed() is a cache, not a derivation](/blog/computed-is-a-cache.png)

<BlogPostDate />

Ask a Vue developer how to derive a value and the answer arrives before
the question ends: `computed()`. It's in every tutorial, every codebase,
every muscle. It is also — structurally — the wrong default.

Vue's actual derivation primitive is the **tracked read**. Any function
that reads reactive state inside an effect subscribes to that state without
creating a separate derivation node. That's the whole engine. `computed()` is a
*cache* bolted on top: ~300–400 bytes per instance, allocated at creation,
paid whether the value is ever read or not, in exchange for memoization
you almost never need on `firstName + ' ' + lastName`.

In ivue, a derivation is a plain getter:

```ts
class $Box {
  get width() {
    return ref(4);
  }
  get height() {
    return ref(3);
  }
  get area() {
    return this.width.value * this.height.value; // 0 bytes per instance
  }
}
```

`area` lives once, on the prototype. Whatever effect reads it — a render,
a watcher — subscribes to `width` and `height` directly through it. It can
never be stale, because it never stores anything. Watch the two behaviors
side by side — the plain getter re-derives freely; the computed's body
only runs when its dependency changes:

<DemoDerived />

The bill for the conventional default, measured: at 100,000 live
instances of the same shape, the composable-with-eager-computeds pattern
holds **5.3× the heap** of the plain-getter class. Reserve `computed()`
for the three cases that earn its bytes — genuinely expensive work,
render suppression on equal values, a stable ref handle — and let the
tracked read do what it always did.

The full argument, with the engine internals:
[The Engine](/engine). The claim is
measured, not rhetorical.
