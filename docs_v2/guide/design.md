---
title: Design & Philosophy
description: The hard problems ivue solves together, from cheap instantiation and bound methods to reactive inheritance, production parity, circular imports and writable-getter types.
relatedPosts: [the-object-graph-they-took, the-options-api-everyone-wanted, win-by-reduction]
---

# Design & Philosophy

ivue makes a class a first-class way to build Vue reactivity. The class is a
reactive unit in its own right, usable anywhere. Getting there meant solving
problems that fight each other, each one hard on its own. One structure answers
the set. Behavior is shared on the prototype. State costs nothing until it
is observed. Instance access stays raw, with stable handles for hot paths.

## The problems ivue solves

Every item below has sunk a class-reactivity attempt on its own. Most
projects that tried nailed one or two and shipped the rest with rough edges.

<div class="iv-problems">
  <div class="iv-problem">
    <strong class="iv-problem__title">Per-instance cost</strong>
    <p class="iv-problem__hard"><span class="iv-x" aria-hidden="true"></span><span>A <code>reactive()</code> proxy per object is expensive. Eager computeds pay for every property up front.</span></p>
    <p class="iv-problem__solved"><span class="iv-ck" aria-hidden="true"></span><span>Instances are <strong>plain</strong>, refs/computeds are lazy → <strong>6 to 132× faster to create.</strong></span></p>
  </div>
  <div class="iv-problem">
    <strong class="iv-problem__title">Cheap bound methods</strong>
    <p class="iv-problem__hard"><span class="iv-x" aria-hidden="true"></span><span>Bind per instance and you allocate a function per method per object. Skip the bind and <code>this</code> breaks on detach.</span></p>
    <p class="iv-problem__solved"><span class="iv-ck" aria-hidden="true"></span><span>Methods stay on the prototype, <strong>bound lazily on first use and cached</strong> → cheap, correct, referentially stable.</span></p>
  </div>
  <div class="iv-problem">
    <strong class="iv-problem__title">Reactive reads</strong>
    <p class="iv-problem__hard"><span class="iv-x" aria-hidden="true"></span><span>A proxy makes every object read cross a runtime interception layer.</span></p>
    <p class="iv-problem__solved"><span class="iv-ck" aria-hidden="true"></span><span>Raw ivue access is <strong>3 to 18× faster than proxy-wrapped access</strong>. Stable refs and methods hoist to direct-handle speed.</span></p>
  </div>
  <div class="iv-problem">
    <strong class="iv-problem__title">Reactive inheritance</strong>
    <p class="iv-problem__hard"><span class="iv-x" aria-hidden="true"></span><span>Prototype-based reactivity collides cached Refs/Computeds and breaks <code>super</code>.</span></p>
    <p class="iv-problem__solved"><span class="iv-ck" aria-hidden="true"></span><span><strong>Deep computed chains with <code>super.x.value</code></strong>, reactivity propagating through every level.</span></p>
  </div>
  <div class="iv-problem">
    <strong class="iv-problem__title">Development parity</strong>
    <p class="iv-problem__hard"><span class="iv-x" aria-hidden="true"></span><span>A dev-only proxy or dispatch layer makes local behavior and performance differ from production.</span></p>
    <p class="iv-problem__solved"><span class="iv-ck" aria-hidden="true"></span><span><code>Reactive()</code> runs <strong>one execution path in every environment</strong>. Vue reconstructs the owner after script edits.</span></p>
  </div>
  <div class="iv-problem">
    <strong class="iv-problem__title">Circular imports hell</strong>
    <p class="iv-problem__hard"><span class="iv-x" aria-hidden="true"></span><span>Mutual class references throw <code>Cannot access 'X' before initialization</code>. It happens at first load, and again on hot reload when update order reshuffles.</span></p>
    <p class="iv-problem__solved"><span class="iv-ck" aria-hidden="true"></span><span>The namespace pattern and late dereference <strong>resolve circular cross-references in any load order</strong>.</span></p>
  </div>
  <div class="iv-problem">
    <strong class="iv-problem__title">Writable-getter types</strong>
    <p class="iv-problem__hard"><span class="iv-x" aria-hidden="true"></span><span><code>get x()</code> is <em>read-only</em> in TypeScript.</span></p>
    <p class="iv-problem__solved"><span class="iv-ck" aria-hidden="true"></span><span>Mapped types <strong>re-declare ref-returning getters as writable</strong>. This requirement produced the circular-safe module shape.</span></p>
  </div>
  <div class="iv-problem">
    <strong class="iv-problem__title">Deterministic teardown</strong>
    <p class="iv-problem__hard"><span class="iv-x" aria-hidden="true"></span><span>Track and stop every effect per instance, and charge nothing to instances that have none.</span></p>
    <p class="iv-problem__solved"><span class="iv-ck" aria-hidden="true"></span><span><code>$watch</code> and <code>$stopEffects</code> scope cleanup to the instance. An instance that never watches doesn't allocate a scope.</span></p>
  </div>
</div>

## Why it's hard: the problems fight each other

The *set* went unsolved because the problems **interact**. The prototype
transform that enables inheritance is the same mechanism that makes identity
and types difficult. The caching that makes reads cheap is what makes
`super` and teardown tricky. The types you need for writable getters dictate
how you're even allowed to export the class.

Solving them in isolation is trivial. The problem is holding them all at
once, cheaply, with no second proxy or object graph bolted on. When one
structure makes every constraint hold together, you have the invariant
rather than a patch.

### One of them, in full: bound methods

In plain JavaScript, Vue and React, passing `this.method` around loses
`this`. So you write `() => this.method()` or `this.method.bind(this)` at
every call site. The day someone forgets, `this` is `undefined` at runtime
and the bug ships.

Bind each method in the constructor and you allocate a fresh function per
method per instance. That is another tax, and the shared prototype is gone.

Use arrow class fields and you pay the same per-instance closure cost.
Overriding from a subclass stops working too.

In ivue the methods live on the prototype. First access binds one and
**caches** the bound copy on the instance. So `this.method` is correct everywhere and keeps the same
reference. A bind is paid for the methods you call. The `() => this.method()` wrapper goes, and the class of bug behind it
goes with it.

## The retreat from classes

**Inheritance got abused.** Deep, fragile hierarchies gave OOP a bad name,
and "composition over inheritance" was the recoil. But the recoil threw out
the class, not just the misuse.

**Classes were hard to make work well.** React's own Hooks motivation says
it outright: classes "confuse both people and machines." Binding `this` is a
constant source of bugs. You remember to bind your handlers, or `this` is
`undefined` at runtime. That is before you add reactive state, the
per-instance cost, and the `() => this.method()` tax at every call site.
Making a class behave *cheaply and correctly* was hard enough that the field
walked away instead.

Logic reuse and decorator friction with TypeScript piled on top. The
problems that drove people off classes are binding, per-instance cost and
reactive inheritance. Those are the ones the
[grid above](#the-problems-ivue-solves) closes. ivue also avoids the two
mistakes that doomed the earlier attempts: **no decorators**, and **no class
as component**.

## Class ≠ component

The old class approaches **welded the class to the component**. In
`vue-class-component` and React class components, the class was the
component, bound to lifecycle, render, and props-as-`this`. There was no way
to have a plain reactive *model* that was not also a framework component.
React drowned in it: binding, lifecycle sprawl, HOC hell.

ivue's first decision undoes exactly that:

> **A class is a reactive unit, usable anywhere. A store, a view-model, a
> domain entity. It is never itself a component.**

## Work with JavaScript's grain

The old attempts fought the language. ivue works with it, and uses no
decorators. State is a getter returning `ref()` or `computed()`. A one-time prototype
rewrite replaces a compile-time macro. Instances stay plain instead of each
one getting a proxy.

Exposing the *writable* instance type requires exporting a **`const`** whose
type carries the remapping, rather than the class directly:

```ts
export namespace Thing {
  export const $Class = $Thing
  export let Class = Reactive($Class)
  export type Instance = typeof Class.Instance
}
```

A TypeScript `namespace` compiles to a **hoisted `var`**, which is what
makes [circular imports resolve in any order](/guide/modules). The same module
shape the types required is also circular-safe. Two constraints, one
solution.

## Classes for structure, composables for units

ivue runs *on* composables. They are the building blocks inside classes:

```vue
<script setup lang="ts">
import { Reactive } from 'ivue'
import { useMouse } from '@vueuse/core'

class $Pointer {
  protected get $mouse() {
    return useMouse() // a composable, hosted
  }
  get x() {
    return this.$mouse.x // cached ref
  }
  get y() {
    return this.$mouse.y // cached ref
  }
}
const Pointer = Reactive($Pointer)

// the state destructure
const { x, y } = new Pointer()
</script>

<template>Mouse: {{ x }}, {{ y }}</template>
```

The class contributes identity, structure, inheritance and encapsulation.
The composable contributes small, reusable logic, and ivue hosts it.

## Built for structure at scale

ivue is at its best where reactive state is **structured, plentiful, and
inheritance-shaped**. Entities, editors, graphs, virtual-scrolled lists. It
is also where you want real OOP in your reactivity: polymorphic,
`super`-callable, cached derivations across an inheritance chain, which
signal frameworks don't attempt.

For the formal treatment of every guarantee, see
[The Invariants Behind ivue](/reference/invariants).

Constraints that have to hold together make a shape. Taken one at a time
they make patches.
