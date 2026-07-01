---
title: Design & Philosophy
description: Why the ecosystem left classes, what it actually got wrong (coupling class to component), and how ivue re-integrates classes into Vue reactivity by working with JavaScript's grain.
---

# Design & Philosophy

ivue exists to answer one question honestly: **can classes be a first-class way to
build Vue reactivity — not a component wrapper, but a real reactive unit — without
paying for it?** The short version is yes, but only if you solve several problems
at once. This page is the reasoning behind the engine.

## Why the ecosystem left classes

It's tempting to say classes were abandoned because they were slow or because
reactive inheritance was hard. That's mostly a myth. The real reasons were:

- **Logic reuse.** Composables compose stateful logic across unrelated components;
  mixins and class inheritance couldn't do that cleanly. This was the dominant
  motivation, and it's an *organization* argument, not a performance one.
- **TypeScript ergonomics.** The class approaches of the era (`vue-class-component`,
  `vue-property-decorator`) leaned on **experimental decorators**, and decorator-based
  typing was fragile and unstable. Note the culprit: not TypeScript — TypeScript
  predates Vue and Vue 3 is *written* in it — but **decorators specifically**.
- **A design philosophy.** "Composition over inheritance" is a deliberate,
  decades-old stance, not a concession. Deep hierarchies have real downsides.

So composables didn't win by solving performance, inheritance, or HMR. They won by
being better at *their* problem — ad-hoc logic reuse and clean TS — which was never
the problem classes were uniquely good at. Classes were left on the table for
reasons that had little to do with reactivity mechanics.

## The mistake that actually soured people

The class approaches made one concrete error: **they welded the class to the
component.** In `vue-class-component` and React class components, the class *was*
the component — bound to lifecycle, render, and props-as-`this`. You couldn't have
a plain reactive *model* that wasn't also a framework component. React especially
drowned in it: binding, lifecycle sprawl, higher-order-component hell.

ivue's first design decision is to undo exactly this:

> **A class is a reactive unit — a store, a view-model, a domain entity — usable
> anywhere. It is never itself a component.**

That single decoupling is why classes feel good in ivue and felt heavy before.

## Work with JavaScript's grain

The old attempts fought the language (decorators, proxies-per-instance, `this`
gymnastics). ivue works *with* it:

- **No decorators.** State is a getter returning `ref()` / `computed()`. The
  transform is a one-time prototype rewrite, not a compile-time macro.
- **Plain instances.** No `reactive()` proxy per object; reactivity is the refs you
  return, materialized lazily. That's where the creation speed comes from.
- **Types make getters writable.** A bare `get x()` is *read-only* in TypeScript.
  ivue's mapped types detect getters that return a `Ref` and re-declare those keys
  as writable, so `inst.x.value = …` type-checks.

That last point produced an unexpected gift. Surfacing the corrected instance type
requires exporting a **`const`** (whose type carries the writable remapping) rather
than the class directly:

```ts
export namespace Thing {
  export const $Class = $Thing
  export const Class  = Reactive($Thing)
  export type Instance = typeof Class.Instance
}
```

A TypeScript `namespace` compiles to a **hoisted `var`** — which is exactly what
makes [circular imports resolve in any order](/guide/modules). The *type*
requirement forced a module shape that *happened* to be circular-safe. Solving one
constraint paid off another — the signature of a design that found its invariant
rather than patching symptoms.

## Classes for structure, composables for units

ivue is not anti-composable. The opposite: composables are the **building blocks
inside** classes.

```ts
class $Pointer {
  get $mouse() { return useMouse() }   // a composable, hosted
  get x() { return this.$mouse.x }
}
```

The class contributes what composables lack — identity, structure, inheritance,
encapsulation. The composable contributes what it's great at — small, reusable
logic that doesn't need to be a class. The decade of ecosystem work on composables
isn't ivue's rival; it's ivue's substrate.

## Solve the conjunction, not the pieces

Any one of these is easy: make instantiation cheap, *or* make inheritance work,
*or* keep methods cheap, *or* survive HMR, *or* get the types right. The hard part
is all of them **at once**, because the constraints fight — the prototype transform
that enables inheritance is the same thing that usually breaks identity and HMR.

Finding a single structure that satisfies every constraint with only a tiny
residual cost is what "finding the invariant" means. ivue's residual cost is one
thing: reads go through a getter, so `this.x.value` is a little slower than a raw
closure ref — erasable in [hot loops](/guide/performance#hot-loops) by hoisting.
Everything else is paid for.

## Where ivue fits

Honestly: it's a power tool, not a universal default.

- **Reach for ivue** when you have *structured, many-instance, inheritance-shaped*
  reactive state — entities, editors, graphs, virtual-scrolled lists — and you want
  real OOP in your reactivity.
- **Reach for plain composables** for small, local, ad-hoc logic reuse. ivue won't
  fight you there — it'll host them.

ivue didn't beat composition; it re-opened a road the ecosystem left for unrelated
reasons, and paved it — decoupled from the component, aligned with the language, and
correct across the whole set of problems at once. For a deeper, formal treatment of
the guarantees, see [Invariants](/reference/invariants).
