---
title: Modules & Imports
description: The $Class / Class namespace pattern — cross-file class hierarchies with working HMR, and circular imports that resolve in any load order.
---

# Modules & Imports

For multi-file class hierarchies, ivue v2 uses a small **namespace pattern** that
solves two problems at once: cross-file inheritance with working HMR, and
circular imports.

## The pattern

Each class file exports a namespace with two members — the **raw** class for
extending, and the **reactive** class for instantiating:

```ts
// base-element.ts
import { Reactive } from 'ivue'
import { ref, computed } from 'vue'

class $BaseElement {
  get opacity() { return ref(1) }
  get summary() { return computed(() => `[${this.opacity.value}]`) }
}

export namespace BaseElement {
  export const $Class = $BaseElement          // raw — children `extends` this
  export const Class = Reactive($BaseElement)  // reactive — you `new` this
  export type Instance = typeof Class.Instance
}
```

```ts
// container.ts
import { Reactive } from 'ivue'
import { BaseElement } from './base-element'

class $Container extends BaseElement.$Class {
  get summary() {
    return computed(() => `Container >> ${super.summary.value}`)
  }
}

export namespace Container {
  export const $Class = $Container
  export const Class = Reactive($Container)
  export type Instance = typeof Class.Instance
}
```

```ts
const c = new Container.Class()
c.summary.value // "Container >> [1]"
```

## Why each file calls `Reactive()`

`Reactive()` is **idempotent**. When `Container` is processed, its chain includes
`$BaseElement`, which was already transformed in its own file — ivue detects that
and skips it. So every file can safely call `Reactive()` on its own class; shared
ancestors are processed exactly once, by whichever file loads first.

This is also why v2 hierarchies survive **cross-file HMR**: editing one file
re-runs only that file's `Reactive()` call, which is a no-op on already-processed
ancestors. (ivue v1, which builds its reactivity at *instantiation* time, needs a
hierarchy in a single file to stay consistent under HMR.)

## Circular imports — solved

A TypeScript `namespace` compiles to a **hoisted `var`** populated by an IIFE:

```js
export var Container;
((C) => { C.$Class = $Container; C.Class = Reactive($Container) })(Container || (Container = {}))
```

Because the binding is a hoisted `var` (not a `const`/`class` in the temporal dead
zone) and you read `.Class` / `.$Class` **lazily** at the point of use, two files
that reference each other resolve in **any load order**:

```ts
// a.ts — A's method uses B
class $A { make() { return new B.Class() } }
// b.ts — B's method uses A
class $B { make() { return new A.Class() } }
```

This eliminates the classic `Cannot access 'X' before initialization` error for
mutual references.

::: info Scope
This solves circular *references* (the common case). It does not enable circular
*inheritance* (`A extends B` and `B extends A`) — that's impossible in any
language, not a limitation of the pattern.
:::

## Single-class shortcut

No inheritance, no circular imports? Skip the namespace and just wrap inline:

```ts
export const Counter = Reactive(class {
  get count() { return ref(0) }
  inc() { this.count.value++ }
})
```
