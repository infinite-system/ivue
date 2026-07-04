---
title: Modules & Imports
description: The namespace pattern is the standard way to export ivue classes. Cross-file hierarchies, hot-reload that never desyncs, and circular imports that cannot break — plus $-getters for store injection.
---

# Modules & Imports

**Export every class through the namespace pattern.** It costs three lines. In
return you get cross-file inheritance, hot-reload that never desyncs, and
immunity to circular imports.

## The pattern

Each class file exports a namespace with two members. The **raw** class is for
extending. The **reactive** class is for instantiating:

```ts
// base-element.ts
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
  export const Class = Reactive($BaseElement); // reactive — you `new` this
  export type Instance = typeof Class.Instance;
}
```

```ts
// container.ts
import { Reactive } from 'ivue';
import { BaseElement } from './base-element';

class $Container extends BaseElement.$Class {
  get summary() {
    return computed(() => `Container >> ${super.summary.value}`);
  }
}

export namespace Container {
  export const $Class = $Container;
  export const Class = Reactive($Container);
  export type Instance = typeof Class.Instance;
}
```

```ts
const c = new Container.Class();
c.summary.value; // "Container >> [1]"
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

This is also why v2 hierarchies survive **cross-file hot-reload**. Editing one
file re-runs only that file's `Reactive()` call, which is a no-op on
already-processed ancestors. (v1 builds its reactivity at _instantiation_
time, so a v1 hierarchy has to live in a single file to stay consistent under
HMR.)

## Circular imports: immune by construction

A circular import only crashes when a cross-module reference **executes too
early**. There are exactly three moments a reference can execute:

| moment           | example                                       | in a cycle        |
| ---------------- | --------------------------------------------- | ----------------- |
| module load      | `extends B.$Class`, top-level `new B.Class()` | can crash         |
| construction     | field initializer `store = useStore()`        | can crash         |
| **first access** | **getter and method bodies**                  | **never crashes** |

By first access, every module in the cycle finished loading long ago. So the
whole strategy is one idea: **move every cross-module reference to the latest
possible moment.** Three mechanisms conspire to do it:

**1. The binding is safe to hold early.** A TypeScript `namespace` compiles to
a hoisted `var` filled in by an IIFE:

```js
export var Container;
((C) => {
  C.$Class = $Container;
  C.Class = Reactive($Container);
})(Container || (Container = {}));
```

A hoisted `var` exists from the first instant of module evaluation. A `const`
or `class` binding read mid-cycle throws
`Cannot access 'X' before initialization`. The namespace never does.

**2. The dereference is late.** You don't hold `B.Class` at load time — you
write `new B.Class()` inside a method body. The member is read at call time,
through a live binding, when everything is loaded. This is what actually
resolves "A's methods use B, B's methods use A", in **any load order**.

**3. The authoring convention finishes the job.** In v2, state and
derivations are _getters_ — bodies that run on first access, not at load, not
even at construction. The convention itself pushes the entire surface of a
class to the safest rung of the ladder. Immunity doesn't come from one trick;
it comes from the whole pattern making every dangerous moment late.

::: info Scope
This solves circular _references_ — the common case. It does not enable
circular _inheritance_ (`A extends B` and `B extends A`). That is impossible
in any language, not a limitation of the pattern.
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
[`$stopEffects`](/guide/teardown) tears them down.
:::

## One-off classes

A truly standalone class — no inheritance, no cycles, one consumer — can skip
the ceremony and wrap inline:

```ts
export default Reactive(
  class Counter {
    get count() {
      return ref(0);
    }
    inc() {
      this.count.value++;
    }
  },
);
```

It works, and it stays correct. But classes have a habit of growing parents
and dependents. The namespace costs three lines and never needs migrating.
When in doubt, use the standard.
