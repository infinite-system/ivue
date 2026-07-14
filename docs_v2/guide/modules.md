---
title: Modules & Imports
description: The namespace pattern is the standard way to export ivue classes. Cross-file hierarchies, hot-reload that never desyncs, and circular cross-references resolved at first access — plus $-getters for store injection.
---

# Modules & Imports

**Export every class through the namespace pattern.** It costs three lines. In
return you get cross-file inheritance, hot-reload that never desyncs, and
circular cross-references that resolve after module initialization.

## The pattern

Each class file exports a namespace with two members. The **raw** class is for
extending. The **reactive** class is for instantiating:

```ts
// BaseElement.ts
import { Reactive } from 'ivue';
import { ref, computed } from 'vue';

class $BaseElement {
  get opacity() {
    return ref(1);
  }
  get summary() {
    return computed(() => `[${this.opacity.value}]`);
  }
}

export namespace BaseElement {
  export const $Class = $BaseElement; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
```

```ts
// Container.ts
import { Reactive } from 'ivue';
import { BaseElement } from './BaseElement';

class $Container extends BaseElement.$Class {
  get summary() {
    return computed(() => `Container >> ${super.summary.value}`);
  }
}

export namespace Container {
  export const $Class = $Container;
  export const Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

```ts
const container = new Container.Class();
container.summary.value; // "Container >> [1]"
```

Use this shape for every class module. Codebases don't stay small: classes
grow parents, split into files, and start referencing each other. The
namespace costs the same three lines on day one, and it never needs migrating
later.

## Why each file calls Reactive()

`Reactive()` is **idempotent**. When `Container` is processed, its prototype
chain includes `$BaseElement` — already transformed in its own file. The
engine detects that and skips it. Every file can safely call `Reactive()` on
its own class. Shared ancestors are processed exactly once, by whichever file
loads first.

This is also why ivue hierarchies survive **cross-file hot-reload**. Editing one
file re-runs only that file's `Reactive()` call, which is a no-op on
already-processed ancestors.

## Circular references resolve by construction

A module cycle only crashes when a cross-module reference **executes too
early**. There are three moments a reference can execute:

| moment           | example                                       | in a cycle        |
| ---------------- | --------------------------------------------- | ----------------- |
| module load      | `extends B.$Class`, top-level `new B.Class()` | can crash         |
| construction     | field initializer `store = useStore()`        | can crash         |
| **first access** | **getter and method bodies**                  | **safe after initialization** |

In the ivue convention, application code first accesses the relationship
after the modules finish loading. So the
whole strategy is one idea: **move every cross-module reference to the latest
possible moment.** Three mechanisms conspire to do it:

**1. The binding is safe to hold early.** A TypeScript `namespace` compiles to
a hoisted `var` filled in by an IIFE:

```js
export var Container;
((C) => {
  C.$Class = $Container;
  C.Class = Reactive(C.$Class);
})(Container || (Container = {}));
```

A hoisted `var` exists from the first instant of module evaluation. A `const`
or `class` binding read mid-cycle throws
`Cannot access 'X' before initialization`. The namespace never does.

**2. The dereference is late.** You don't hold `B.Class` at load time — you
write `new B.Class()` inside a method body. The member is read at call time,
through a live binding, when everything is loaded. This is what actually
resolves "A's methods use B, B's methods use A", in **any load order**.

**3. The authoring convention finishes the job.** In ivue, state and
derivations are _getters_ — bodies that run on first access, not at load, not
even at construction. The convention itself pushes the entire surface of a
class to the safest rung of the ladder. Immunity doesn't come from one trick;
it comes from the whole pattern making every dangerous moment late.

::: info Scope
This solves circular _references_ expressed through late getter and method
bodies — the common application case. An eager top-level read can still fail,
and the convention deliberately excludes it. Circular _inheritance_
(`A extends B` and `B extends A`) remains impossible because both parents
would have to exist first.
:::

## Injecting stores and composables: the `$` slot

A getter whose name starts with `$` is cached **whole, forever, per instance**
on first access. That makes it the standard slot for stores and composables:

```ts
class $Order {
  private get $project() {
    return useProjectStore();
  }
  private get $user() {
    return useUserStore();
  }

  get canShip() {
    return computed(() => this.$project.isActive && this.$user.isVerified);
  }
}
```

Compare it to a field initializer, `project = useProjectStore()`:

- **The field runs at construction.** The class cannot be instantiated before
  Pinia is installed — which bites in tests, SSR entry order, and module-scope
  singletons. The `$`-getter resolves on first touch, when the app is
  certainly ready.
- **The field is rung two of the ladder above.** The `$`-getter is rung
  three: a store module and a class module can import each other freely.
- **Nothing is paid until used.** An instance that never touches the store
  never resolves it.
- Pinia stores are singletons, so caching one per instance changes nothing —
  you just skip the lookup on every later read.

::: warning Two caveats
**SSR singletons.** A `$`-getter caches per instance, forever. Per-component
and per-request instances are safe. A _module-level_ singleton instance in SSR
would trap the first request's store and leak it to every later request — the
standard cross-request rule for module state, not a new hazard.

**Effect-creating composables.** `get $mouse() { return useMouse() }` may be
first-touched after `setup()` finishes. Its listeners then live outside the
component's scope — own their cleanup in your `stopEffects()` hook so
[`$stopEffects`](/guide/lifecycle-teardown) tears them down.
:::

## Generic classes

TypeScript cannot carry a generic parameter through a wrapping call — there
are no higher-kinded types. So this loses `T`:

```ts
// ✗ T collapses to its constraint (BaseItem) at every `new` site
export const Scroller = Reactive(
  class $Scroller<T extends BaseItem> {
    /* ... */
  },
);
```

The fix comes from the engine's identity guarantee: `Reactive(X)` returns the
**same constructor** it was given, transformed in place. So export the class
directly, and call `Reactive()` as a side effect:

```ts
// ✓ the exported binding keeps <T> fully intact
export class Scroller<T extends BaseItem> {
  get items() {
    return ref<T[]>([]);
  }
  pick(index: number) {
    return this.items.value[index];
  }
}

Reactive(Scroller); // transform in place — identity preserved

const s = new Scroller<PostItem>(); // T flows through untouched
```

Runtime is identical to any other `Reactive()` class. The one trade-off is in
typing: the instance type is the plain class, so `$watch` and `$stopEffects`
don't appear on it. If a generic class needs them, cast at the call site:

```ts
(s as ReactiveInstance<Scroller<PostItem>>).$stopEffects();
```

Inside a namespace, keep the standard shape — call `Reactive()` inline and
cast `Class` back to the raw constructor type so `<T>` survives; `Instance`
applies `ReactiveInstance` explicitly (a generic `typeof Class.Instance`
cannot exist without higher-kinded types):

```ts
class $Scroller<T extends BaseItem> {
  /* ... */
}

export namespace Scroller {
  export const $Class = $Scroller;
  export const Class = Reactive($Class) as unknown as typeof $Class;
  export type Instance<T extends BaseItem> = ReactiveInstance<$Scroller<T>>;
}
```

The cast is sound because of identity preservation: `Reactive($Scroller)`
returns `$Scroller` itself, so the runtime value already IS the raw
constructor — only the collapsed return TYPE is being corrected.

There is no `ReactiveGeneric` helper, on purpose: without higher-kinded types
it would need per-arity overloads and still couldn't infer `T` through — pure
ceremony over the same cast.

## One-off classes

A truly standalone class — no inheritance, no cycles, one consumer — can skip
the ceremony and wrap inline:

```ts
export default Reactive(
  class Counter {
    get count() {
      return ref(0);
    }
    increment() {
      this.count.value++;
    }
  },
);
```

It works, and it stays correct. But classes have a habit of growing parents
and dependents. The namespace costs three lines and never needs migrating.
When in doubt, use the standard.
