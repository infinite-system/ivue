---
title: "Your objects are rented from the framework"
description: If your domain logic only exists while a component is mounted, you don't own your objects — you lease them. On evicting the landlord.
date: 2026-07
tags: [philosophy, javascript]
relatedPosts: [the-object-graph-they-took, what-becomes-buildable, organs-not-skeletons, reactive-is-all-you-need]
---

# Your objects are rented from the framework

![Your objects are rented from the framework](/blog/rented-objects.png)

<BlogPostDate />

Here is a test you can run on any Vue codebase in thirty seconds: find the
order, the invoice, the document — the *thing* your product is actually
about — and ask where it lives. In most codebases the answer is: nowhere.
It exists as fragments — a composable here, a pinia slice there, props
threaded four levels down — and every fragment's lifetime is chained to
whatever component happens to be mounted. Close the tab panel, and your
"order" ceases to exist.

That's not architecture. That's renting.

A domain object deserves what every object in every other kind of software
has had for fifty years: **identity, state, behavior, and a lifetime it
owns**. The reason frontend gave that up isn't philosophical — it's that
making a class reactive used to cost too much: a proxy per object, eager
computeds per field, `this` breaking in every handler. So the field
normalized statelessness and called it a virtue.

ivue re-prices the deal. An instance is a plain object; nothing allocates
until first access; derivations live once, on the prototype. The measured
consequence: **one million live class instances in 22 ms and 3.7 KB each
under observation** — populations that OOM every alternative pattern on
the same machine. At that price, your order can simply *be an object*
again — watchable, derivable, inheritable — constructed where you choose,
disposed when you say:

```ts
class $Order {
  get items() {
    return shallowRef<OrderItem[]>([]);
  }
  get total() {
    return this.items.value.reduce((sum, item) => sum + item.price, 0);
  }
}
```

Lifetime is a choice, not a sentence. Construct in a component and the
component reaps everything; construct in a module and the instance
outlives every mount, with `$stopEffects()` as the deterministic end.
Watch teardown behave, live:

<DemoTeardown />

The eviction notice, formally: [ivue vs the World](/guide/model-layer) —
the head-to-head against every other way of owning objects. Then read
[Lifecycle & Teardown](/guide/lifecycle-teardown) and take your objects
back.
