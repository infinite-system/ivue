---
title: Design & Philosophy
description: The hard problems ivue solves — cheap instantiation, cheap bound methods, reactive inheritance, cross-file HMR, circular imports, writable-getter types — and why solving them together is the achievement.
---

# Design & Philosophy

ivue makes classes a first-class way to build Vue reactivity — a real reactive
unit, not a component wrapper — with no penalty. Getting there meant solving a set
of problems that actively fight each other, each one hard in its own right. ivue
solves them all, and charges a single, erasable cost for the lot.

## The problems ivue solves

Every item below has sunk a class-reactivity attempt on its own. Most projects that
tried nailed one or two and shipped the rest with rough edges. ivue solves the whole
set.

| Problem | Why it's hard | In ivue |
|---|---|---|
| **Per-instance cost** | A `reactive()` proxy per object is expensive; eager computeds pay for every property up front. | <span class="iv-ck" aria-hidden="true"></span> Instances are **plain**, refs/computeds are lazy → **55–250× cheaper to create.** |
| **Cheap bound methods** | Bind per instance and you allocate a function per method per object; don't bind and `this` breaks on detach. | <span class="iv-ck" aria-hidden="true"></span> Methods stay on the prototype, **bound lazily on first use and cached** → cheap, correct, referentially stable. |
| **Reactive reads** | Any indirection over a raw ref costs something. | <span class="iv-ck" aria-hidden="true"></span> `this.x.value` through a getter — **~5× a raw ref, hoistable to native speed**. The one cost, and it's erasable. |
| **Reactive inheritance** | Prototype-based reactivity collides cached Refs/Computeds and breaks `super`. | <span class="iv-ck" aria-hidden="true"></span> **Deep computed chains with `super.x.value`**, reactivity propagating through every level. |
| **Cross-file class HMR** | Editing a parent in another file desyncs prototype links and identities. | <span class="iv-ck" aria-hidden="true"></span> An idempotent, per-file transform **survives HMR**: behavior edits graft onto live instances. |
| **Circular imports** | Mutual class references throw `Cannot access 'X' before initialization`. | <span class="iv-ck" aria-hidden="true"></span> The namespace pattern **resolves references in any load order**. |
| **Writable-getter types** | `get x()` is *read-only* in TypeScript. | <span class="iv-ck" aria-hidden="true"></span> Mapped types **re-declare ref-returning getters as writable** — the requirement that produced the circular-safe module shape. |
| **Deterministic teardown** | Track and stop every effect per instance, with no cost for those that have none. | <span class="iv-ck" aria-hidden="true"></span> `$watch` + `$stopEffects` — scoped cleanup, **zero cost for instances that never watch**. |

## Why it's hard: the problems fight each other

The reason the *set* stayed unsolved is that they
**interact**. The prototype transform that enables inheritance is the same mechanism
that breaks identity, HMR, and types. The caching that makes reads cheap is what
makes `super` and teardown tricky. The types you need for writable getters dictate
how you're even allowed to export the class.

Solving them in isolation is trivial. Solving them so they *all hold at once* —
cheaply, with a single residual cost and no exceptions bolted on — is the real
problem, and it is very hard. When one structure makes every constraint true
simultaneously, you've found the invariant instead of patching symptoms. 

### One of them, in full: bound methods

> **Everyone underestimates this one.** 

In plain JavaScript, Vue, React you cannot pass `this.method` around — you write `() => this.method()` or
`this.method.bind(this)` at every call site, and the day someone forgets, `this` is
`undefined` at runtime and the bug ships. 

**The problem becomes two-fold:**

If you bind each method in the constructor instead and you allocate a fresh function per method per instance that's another tax and you lose the shared prototype.

If you use arrow class functions as arrow functions are bound by default you get the same per-instance closures overhead and you lose
prototype override.


ivue ends the whole saga: methods live on the prototype, get
bound **lazily** on first access, and are **cached** on the instance — so `this.method`
is always correct, always the same reference, and costs one bind only for the methods
you actually use. The `() => this.method()` wrapper, and the class of bug behind it,
is gone.

## Why the field left classes

Two forces pushed the ecosystem off classes, and both **are** the difficulty — not
a substitute for it.

**Inheritance got abused.** Deep, fragile hierarchies gave OOP a bad name, and
"composition over inheritance" was the recoil. But the recoil threw out the class,
not just the misuse.

**Classes were hard to make work well — and that's the real reason.** React's own
Hooks motivation says it outright: classes "confuse both people and machines" —
`this` binding is a constant source of bugs; you *remember* to bind your handlers or
`this` is `undefined` at runtime. That's before you add reactive state, the
per-instance cost, and the `() => this.method()` tax at every call site. Making a
class behave *cheaply and correctly* was hard enough that the entire field walked
away rather than solve it.

Logic reuse and decorator vs TypeScript friction piled on. But the difficulty was the ground
under all of it. **ivue is the answer to that difficulty** — the exact problems that
drove people off classes, binding and per-instance cost and reactive inheritance,
are the ones the [table above](#the-problems-ivue-solves) closes, without the two
mistakes that doomed the earlier attempts: **no decorators**, and **no class as
component**.

## Class ≠ component

The old class approaches made one fatal error: they **welded the class to the
component**. In `vue-class-component` and React class components, the class *was* the
component — bound to lifecycle, render, and props-as-`this`. You could never have a
plain reactive *model* that wasn't also a framework component. React drowned in it:
binding, lifecycle sprawl, HOC hell.

ivue's first decision undoes exactly that:

> **A class is a reactive unit — a store, a view-model, a domain entity — usable
> anywhere. It is never itself a component.**

## Work with JavaScript's grain

The old attempts fought the language. ivue works with it: no decorators; state is a
getter returning `ref()` / `computed()`; a one-time prototype rewrite instead of a
compile-time macro; plain instances instead of a proxy each.

The types even paid a dividend. Surfacing the *writable* instance type requires
exporting a **`const`** (whose type carries the remapping), not the class directly:

```ts
export namespace Thing {
  export const $Class = $Thing
  export const Class = Reactive($Class)
  export type Instance = typeof Class.Instance
}
```

A TypeScript `namespace` compiles to a **hoisted `var`** — precisely what makes
[circular imports resolve in any order](/guide/modules). The type requirement forced
a module shape that was also circular-safe. One constraint's solution paying off
another's is the mark of a design built on an invariant, not a pile of patches.

## Classes for structure, composables for units

ivue is not anti-composable — it runs *on* composables. They're the building blocks
inside classes:

```ts
class $Pointer {
  private get $mouse() { return useMouse() } // a composable, hosted
  get x() { return this.$mouse.x }   // cached ref
  get y() { return this.$mouse.y }   // cached ref
}
const Pointer = Reactive($Pointer);
const { x, y } = new Pointer();
<template>
Mouse: {{ x }}, {{ y }}
</template>
```

The class contributes what composables lack — identity, structure, inheritance,
encapsulation. The composable contributes small, reusable logic. The ecosystem's
decade of composable work isn't ivue's rival; it's its substrate.

## Built for structure at scale

ivue is at its best where reactive state is **structured, plentiful, and
inheritance-shaped** — entities, editors, graphs, virtual-scrolled lists — and where
you want real OOP in your reactivity: polymorphic, `super`-callable, cached
derivations across an inheritance chain, which signal frameworks don't attempt.
Composables still handle small, local logic — and ivue hosts them when they do.

For the formal treatment of every guarantee, see [Invariants](/reference/invariants).
