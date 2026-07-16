---
title: Static Classes for Node
description: A 39-line experimental transform gives Node capability classes lazy-bound static methods while namespaces and late getters remove circular initialization order.
search: false
---

# Static Classes for Node

::: warning Current exploration
This page applies the namespace invariant outside Vue. The implementation is
tracked and tested in this repository, but it is not part of the ivue package.
:::

> Solve circularity, passable methods, and inheritance. Let the Node process
> owner solve restart.

Most backend modules are function bags. A static capability class preserves
that allocation-free shape while adding native inheritance and `super`. The
namespace supplies a late provider address. `Static()` adds one missing
property: a static method remains correct when a router, queue, or event
emitter retains it as a callback.

## The complete scope

| Included | Owned elsewhere |
|---|---|
| Circular-import safety through late reads | File watching and process restart |
| Stable, passable static methods | Live module invalidation |
| Native static inheritance and `super` | State migration between code generations |
| Boot-time and test-time `Class` selection | Request-, tenant-, or session-scoped DI |
| Deterministic plugin composition before startup | HTTP, database, socket, and worker lifetimes |

This boundary keeps the runtime smaller than the problems it solves.

## The actual transform

The implementation below is the repository's tested source, included directly
so this page and the executable code cannot diverge.

<<< ../../experiments/node-namespace/Static.ts

Source and evidence:

- [`Static.ts`](https://github.com/infinite-system/ivue/blob/main/experiments/node-namespace/Static.ts)
- [`Static.vitest.spec.ts`](https://github.com/infinite-system/ivue/blob/main/experiments/node-namespace/Static.vitest.spec.ts)
- [`benchmark.ts`](https://github.com/infinite-system/ivue/blob/main/experiments/node-namespace/benchmark.ts)
- [`RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/experiments/node-namespace/RESULTS.md)

`Static()` creates a thin selected subclass. It leaves the declared class
untouched, walks its static inheritance chain, and installs one lazy accessor
for every visible method. The first read binds the method to the selected
class and overwrites that accessor with the bound function.

After first access, there is no transform path left in the call:

```text
first read: getter → bind → own data property
later read: own data property
later call: ordinary bound function
```

## The canonical module

```ts
import { Static } from './Static';
import { Users } from './Users';

class $Orders {
  static get Users() {
    return Users.Class;
  }

  static submit(request: OrderRequest) {
    return this.Users.find(request.params.userId);
  }
}

export namespace Orders {
  export const $Class = $Orders; // raw — declared inheritance extends this
  export let Class = Static($Class); // selected — callbacks read this
}
```

The getter delays the cross-module read until behavior runs. `Static()` makes
the selected method passable:

```ts
router.post('/orders', Orders.Class.submit);
```

Route registration performs the first method read. The router receives one
stable function whose `this` remains `Orders.Class`.

## Raw inheritance, selected execution

Children extend `$Class`, then create their own selected class:

```ts
class $PriorityOrders extends Orders.$Class {
  static override submit(request: OrderRequest) {
    audit(request);
    return super.submit(request);
  }
}

export namespace PriorityOrders {
  export const $Class = $PriorityOrders;
  export let Class = Static($Class);
}
```

The distinction is structural:

- `$Class` is the untouched declaration and native `super` foundation.
- `Class` is the selected callback-safe execution surface.

Creating the selected subclass instead of rewriting `$Class` preserves static
`super` receiver semantics. A bound base method must never replace the method
that a future child expects to inherit.

## Composition finishes before callbacks escape

A kernel composes raw classes, then applies `Static()` once to the final
selection:

```ts
let SelectedOrders = Orders.$Class;

for (const extendOrders of orderExtensions) {
  SelectedOrders = extendOrders(SelectedOrders);
}

Orders.Class = Static(SelectedOrders);
router.post('/orders', Orders.Class.submit);
```

Boot order is therefore explicit:

```text
load modules
→ compose raw classes
→ select each Static() class
→ register retained callbacks
→ listen
```

`Class` is mutable as a composition slot, not as a runtime feature flag.
Plugins never toggle after callback registration. Changing the plugin set
restarts the process and produces a new sealed generation.

An already retained method belongs to that selected class generation. Changing
`Orders.Class` later does not rewrite a callback stored inside the router. A
normal process restart runs composition and route registration again, keeping
one coherent generation without a live dispatch layer.

## Measured cost

Measured on Node 26.3.1 / V8 14.6 on the repository's Linux VM. Each steady
sample performs 20,000,000 observable calls; the benchmark rotates call forms
for 45 rounds and reports the median.

| Call form | Median | Cost per call |
|---|---:|---:|
| Native dotted static method | 33.475 ms | 1.674 ns |
| `Static()` dotted method | 33.523 ms | 1.676 ns |
| `Static()` detached method | 33.337 ms | 1.667 ns |

The one-time path is measured across 50,000 distinct one-method classes:

| One-time operation | Cost per class |
|---|---:|
| Create selected class and lazy accessors | 1.276 µs |
| First read, bind, materialize, and invoke | 0.465 µs |

The source is 39 readable lines. Bundled and minified with esbuild 0.16.17,
it is 880 bytes raw and 445 bytes with filename-free `gzip -9 -n`. Run the
exact workload with:

```sh
npm run bench:node-namespace
```

These are measurements, not a cross-engine promise. The architectural result
is that steady execution contains only ordinary JavaScript classes and bound
functions.

## Deliberate boundaries

### Static privacy

Use TypeScript `private static` for class-internal data that a method reads
through polymorphic `this`:

```ts
class $Orders {
  private static sequence = 0;

  static nextId() {
    return ++this.sequence;
  }
}

export namespace Orders {
  export const $Class = $Orders;
  export let Class = Static($Class);
}
```

TypeScript `private` is an authoring-time access rule. At runtime the member is
an ordinary inherited property, so `Orders.Class.nextId()` works with the
selected subclass. Use `protected static` instead when subclasses or plugins
must access the member directly.

Use a module-scoped variable or function when privacy must also hold at
runtime. Static capability classes primarily hold behavior, so module scope or
the composition root is usually the clearest owner for private capability
data.

Native static `#private` has a narrower role. A selected class is a subclass of
`$Class`, while a native private member brands only its declaring class. A
method that evaluates `this.#privateMember` therefore rejects the selected
subclass receiver:

```ts
class $Orders {
  static #sequence = 0;

  static nextId() {
    return ++this.#sequence; // incompatible with subclass selection
  }
}
```

This is native JavaScript inheritance behavior, not something `Static()`
should disguise. Native static private state remains valid when the method
accesses its declaring class lexically:

```ts
class $Orders {
  static #sequence = 0;

  static nextId() {
    return ++$Orders.#sequence; // valid, deliberately non-polymorphic
  }
}
```

The standard is: avoid `this.#member` in static capability classes. Use
TypeScript `private` for polymorphic class encapsulation, `protected` for
extension points, and module scope for runtime-private state. Instance
`#private` fields are unaffected.

### Stateful objects

Sessions, actors, streams, and resource-owning workers have identity and
lifetime. They remain ordinary instance classes with explicit owners. A static
capability transform is not an instance container.

ORM model classes such as Objection models also represent stateful instances
and participate in a framework-owned static protocol. They may use the
namespace and late `Related.Class` reads to remove relation circularity, but
their selected slot remains `let Class = $Class`; do not pass them through
`Static()`. The [Objection model pattern](/guide/namespace-pattern?experiment=1#objection-models-use-the-namespace-without-static)
shows the complete form.

### Contextual providers

One mutable namespace slot represents one application-wide selection. If a
provider varies by request, tenant, or session, pass that context explicitly or
use scoped DI.

### Live replacement

Lazy binding makes a callback safe; it intentionally fixes that callback to
one selected class. Following future `Class` assignments requires either a
forwarding closure on every call or owner reconstruction. This experiment uses
owner reconstruction through normal Node restart.

## The resulting backend grammar

```text
one module capability
→ one raw static class
→ one canonical namespace
→ dependencies read through getters
→ one selected Static() class
→ ordinary callbacks
```

The [Namespace Pattern](/guide/namespace-pattern?experiment=1) defines the
smaller invariant. [Node Development by Restart](/guide/node-class-hmr?experiment=1)
explains why this experiment stops before inventing a hot-module runtime.
