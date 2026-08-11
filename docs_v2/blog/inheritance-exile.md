---
title: "Inheritance didn't deserve the exile"
description: 'The composition-over-inheritance recoil corrected an abuse, then outlawed a tool. Reactive super chains show what it cost.'
date: 2026-07
---

# Inheritance didn't deserve the exile

<BlogPostDate />

![Inheritance didn't deserve the exile](/blog/inheritance-exile.png)

"Composition over inheritance" began as a correction to a real disease —
ten-level hierarchies where changing a base class rippled fear through a
codebase. The correction was right. The sentence that followed was not:
somewhere along the way, *preferring* composition became *outlawing*
inheritance, and frontend spent a decade rebuilding inheritance's use
cases — shared behavior, refinement, specialization — out of spread
operators and convention.

Here is what the exile cost, in one working example. A pricing chain:
`Product` knows its price, `SaleProduct` refines the total through
`super`, `TaxedProduct` refines it again — three classes in three files,
every level reactive, every level usable on its own:

```ts
class $TaxedProduct extends SaleProduct.$Class {
  get taxRate() {
    return ref(0.1);
  }
  get total(): number {
    return super.total * (1 + this.taxRate.value); // reactive through the chain
  }
}
```

`total` is a **plain-getter chain** — three levels deep, zero `computed()`
allocations — and writing to the *grandparent's* ref re-derives the whole
thing. Each level also appends its own line to a receipt through ordinary
`super.receipt()` calls. Live, from the exact files the docs ship:

<DemoInheritance />

Try expressing that with composition: you'll write the plumbing that
`extends` is. Refinement of behavior through layers *is* inheritance's
home turf — the abuse was depth without design, not the mechanism.

The engine's part is making it safe where earlier attempts collapsed:
each `(prototype, key)` pair caches under its own symbol, so a parent's
computed and a child's same-name computed coexist on one instance instead
of colliding — `super.x.value` just works, at any depth
([Inheritance & super](/guide/inheritance)).

Use composition where parts assemble. Use inheritance where behavior
*refines*. Owning both is the point of having a language with classes in
it.
