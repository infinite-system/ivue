---
title: Node Class HMR — Runtime Design
description: A design for replacing static capability classes inside a live Node.js process, with explicit owner reconstruction reserved for stateful instance services.
search: false
---

# Node Class HMR — Runtime Design

::: warning Current exploration
This page specifies a possible runtime. It does not describe a released ivue
feature or a required part of using ivue.
:::

> Keep the process and its resources alive. Replace the selected capability;
> rebuild an owner only when the application genuinely owns instances.

A Node development server often restarts its process after one source edit.
That discards HTTP listeners, database pools, authenticated sockets, in-memory
fixtures, warmed caches, and the exact state that exposed a bug.

The namespace invariant permits a smaller response. Most backend modules are
function bags, so their canonical class uses static methods. A hot update
re-evaluates the module, recomposes its plugins, and assigns the new class to
the existing namespace object's mutable `Class` slot.

No service instance exists to migrate. No method needs binding. No prototype
needs mutation.

## Static capability classes are the default

```ts
class $Orders {
  static get Users() {
    return Users.Class;
  }

  static submit(userId: string) {
    return this.Users.find(userId);
  }
}

export namespace Orders {
  export let Class = $Orders;
}
```

The class is an inheritable function bag. Its static dependency getter reads
another canonical class after module initialization. `Class` remains the
single provider-selection seam.

Routes retain a thin namespace closure:

```ts
router.post('/orders', (request) =>
  Orders.Class.submit(request.params.userId),
);
```

Every request reads the current class and invokes `submit` with the correct
static `this`. Kernel composition and hot replacement are visible without
route re-registration.

## Static replacement is the primary hot path

```text
file change
   ↓
module runner evaluates a donor generation
   ↓
adapter discovers the donor's exported class namespace
   ↓
kernel composes plugins from the new raw class
   ↓
canonicalNamespace.Class = selectedDonorClass
   ↓
the next namespace closure observes the new generation
```

An asynchronous call already executing continues in the function generation
it entered. The next route dispatch reads the new `Class` slot. This matches
JavaScript's normal execution model and requires no mutation of active frames.

Static replacement handles edits to methods, getters, inheritance, static
private fields, and class initialization coherently because the complete
constructor object changes as one unit. State that must survive an update
lives outside that replaceable class.

## The canonical object is the stable identity

A re-evaluated module creates a fresh TypeScript namespace object. Existing
importers still hold the object from the accepted generation. The runtime
therefore registers one canonical namespace object and treats later module
evaluations as donors.

Stable ids derive from ownership:

```text
canonical module URL + exported namespace name
```

For example:

```text
file:///app/orders/Orders.ts#Orders
```

The registry lives under `Symbol.for(...)` on `globalThis`, allowing every
module generation to reach the same map:

```ts
interface CapabilityEntry {
  id: string;
  canonicalNamespace: { Class: ClassConstructor };
  latestNamespace: { Class: ClassConstructor };
  rawClass: ClassConstructor;
  selectedClass: ClassConstructor;
}
```

The first evaluation contributes the canonical namespace. A donor evaluation
contributes a new raw class. The kernel recomposes that raw class and assigns
the result to `canonicalNamespace.Class`. The module runner also ensures donor
imports resolve through canonical capability objects, so late dependency reads
converge on one runtime graph.

Class names alone are insufficient ids. Unrelated modules may both declare
`$Service`, while module ownership and export name remain unambiguous.

## Kernel composition precedes publication

Plugins extend the donor class before the update becomes observable:

```ts
kernel.registerClass('app/Orders', (Base) =>
  class AuditedOrders extends Base {
    static submit(userId: string) {
      audit(userId);
      return super.submit(userId);
    }
  },
);
```

The kernel retains plugin definitions independently from module generations.
For every donor it starts from the donor's raw class, applies the registered
extensions in deterministic order, and publishes one selected class.

The update is transactional. A donor that fails evaluation or composition
does not change the canonical `Class` slot.

## Retained callbacks need no binding layer

Static methods are not automatically bound. This direct registration loses
static `this` when the method uses it and freezes the selected implementation:

```ts
router.post('/orders', Orders.Class.submit);
```

The namespace closure is the complete adapter:

```ts
router.post('/orders', (request) =>
  Orders.Class.submit(request.params.userId),
);
```

The closure is allocated once during route registration. Each invocation pays
one canonical object-property read before entering application behavior. It
requires no per-class transform, per-method cache, proxy, bound function, or
live dispatch slot.

A direct method reference is acceptable when the method never uses `this` and
the runtime does not promise live provider replacement. The static-first HMR
contract uses namespace closures because they preserve both semantics.

## Process resources live outside replaceable classes

Static capability classes contain behavior, not durable mutable state:

```text
process root
├── HTTP listener
├── database pool
├── socket registry
├── class registry + kernel
└── replaceable static capabilities
```

Capabilities late-read or receive resources owned by the process root. They do
not open listeners, create pools, or mutate global state at module top level.
Replacing `Orders.Class` therefore changes behavior without discarding the
resources that behavior uses.

This boundary improves shutdown and testing even when HMR is disabled.

## Stateful instances are the exceptional path

Some backend objects have genuine identity or lifetime: sessions, actors,
state machines, stream processors, and resource-owning workers. Those classes
use instance methods and an explicit owner:

```ts
kernel.mount('app/OrderWorker', {
  namespace: OrderWorker,
  create: () => new OrderWorker.Class(),
  dispose: (worker) => worker.dispose(),
});
```

The runtime reconstructs these owners instead of combining an old object with a
new class declaration.

### Selective owner rebuild

Constructor work, instance field initializers, arrow-function fields, native
`#private` brands, member-kind changes, and inheritance changes require a new
object. The kernel pauses dispatch, captures explicitly migratable state,
disposes the old owner, constructs the replacement, swaps the owner reference,
and resumes dispatch.

The runtime does not search the heap for instances. Ownership remains explicit
because only the owner knows lifetime, disposal, and valid state migration.

## Update classification

| Edit | Static capability | Stateful instance class |
|---|---|---|
| Method body | Replace selected class | Rebuild owner |
| Getter body | Replace selected class | Rebuild owner |
| Added or removed member | Replace selected class | Rebuild owner |
| Constructor or instance field | Usually unused | Rebuild owner |
| Native `#private` member | Replace selected class | Rebuild owner |
| Method ↔ accessor | Replace selected class | Rebuild owner |
| Inheritance change | Recompose and replace | Recompose and rebuild |
| Top-level constant or free function | Reload accepting dependents or reject |
| Top-level side effect | Explicit dispose/accept lifecycle or restart |
| Native addon, Node flag, environment contract | Restart process |

Static replacement is intentionally broad. With no instances to preserve, the
complete class object is the safest and simplest unit of behavior.

## Node module execution

Node's ESM cache is URL-based. Importing one file with distinct query strings
evaluates distinct module generations, which is sufficient for a proof of
concept. It is not a complete long-session runtime: every query URL is another
module identity, and native ESM exposes no general eviction API for an already
evaluated graph. See Node's
[ES module URL behavior](https://nodejs.org/api/esm.html#urls).

Node exposes synchronous `resolve` and `load` customization through
[`module.registerHooks()`](https://nodejs.org/api/module.html#moduleregisterhooksoptions).
Those hooks can register before application code, transform TypeScript or
JavaScript, attach stable metadata, and redirect future loads. They do not
provide an invalidatable application module graph by themselves.

A development adapter therefore uses a managed module runner. Two viable
substrates are:

- a small runner that owns evaluation, dependency edges, and invalidation;
- [Vite's environment and module-runner APIs](https://vite.dev/guide/api-environment-instances),
  whose execution contract includes explicit invalidation before re-execution.

The namespace registry and kernel remain independent from that choice.

## Discovery requires no author boilerplate

The loader sees each evaluated module namespace. An exported value qualifies
as a capability namespace when it is an object with a constructable `Class`
member. The adapter performs the equivalent of:

```ts
acceptClassNamespace({
  id: `${canonicalUrl}#Orders`,
  namespace: evaluatedModule.Orders,
});
```

Application modules keep the two-line namespace export. Stable ids, donor
registration, invalidation, and acceptance belong to the runtime adapter.
Explicit ids remain an escape hatch for generated modules and ownership
aliases.

## In-flight work defines the atomicity boundary

Replacing a slot cannot replace a function frame already executing. A strict
runtime commits between dispatches:

```ts
await kernel.dispatch('app/Orders', () =>
  Orders.Class.submit(userId),
);
```

Updates queue while the capability has active dispatches and commit when its
active count reaches zero. A simpler first implementation permits an old async
frame to finish while new requests enter the new class.

Long-lived streams and WebSockets need an explicit policy: allow future
operations to observe new dependencies, reconnect the stream, or pin it to one
generation. No generic runtime can infer the correct choice.

## Circularity and HMR share one late read

Static dependency getters read `Other.Class` when behavior executes. The same
read solves two problems:

- startup cycles resolve after module initialization;
- hot updates and plugins become visible after `Class` changes.

A top-level constructor snapshot loses both properties. One authoring grammar
therefore provides circular safety and live provider selection together.

## Front-to-back universal runtime

```text
shared namespace invariant
├── browser: Reactive() + Vue component ownership
├── server default: static class replacement
├── server stateful: explicit owner rebuild
├── plugins: boot-time class composition
└── development: environment-specific module runner
```

The browser and server do not share a state engine. They share smaller rules
for canonical identity, dependency timing, composition, and replacement. Each
adapter retains only the machinery its runtime requires.

## Implications for AI development

The backend grammar gives an AI agent a narrow valid solution space:

- one static capability class per module by default;
- one mutable namespace constructor;
- dependency classes read through static getters;
- no top-level dependency dereference or process side effect;
- namespace closures at retained callback boundaries;
- explicit instances only for real state and ownership.

A hot runtime preserves the conditions needed to verify an edit. The agent can
change behavior, call a running endpoint, inspect the result, and iterate
without reconstructing an authenticated session or warmed dataset.

Hot verification never replaces cold verification. A preserved process can
hide startup defects. Automation starts a clean process and runs the complete
test suite before accepting a change.

## Validation plan

The design is incomplete until adversarial tests establish these boundaries:

1. Evaluate mutually importing capabilities in every load order.
2. Replace static classes repeatedly while old route closures remain live.
3. Recompose every registered plugin against each donor foundation.
4. Prove failed evaluation and composition leave the selected class untouched.
5. Refuse unrelated capabilities that collide by local class name.
6. Exercise asynchronous calls across both permissive and queued commits.
7. Preserve process resources across hundreds of capability replacements.
8. Rebuild constructor, field, `#private`, and inheritance edits for instances.
9. Verify disposal failures cannot strand an owner halfway through a swap.
10. Cold-start the final graph after every hot-path scenario.

## Implementation sequence

The design reduces into four independently testable layers:

1. **Static class core:** canonical namespaces, donor registration, plugin
   recomposition, and transactional `Class` replacement.
2. **Node runner:** file watching, module generations, dependency invalidation,
   stable export ids, and evaluation rollback.
3. **Instance extension:** explicit owners, disposal, reconstruction, state
   migration, and dispatch boundaries.
4. **Universal adapters:** share the namespace and composition core with
   Vite/Vue while keeping environment lifecycles separate.

The static class core works without the instance extension. That ordering
preserves the reduction rather than making exceptional stateful services define
the whole backend runtime.

The [Namespace Pattern](/guide/namespace-pattern?experiment=1) defines the
author-facing invariant. The repository's
[`node-namespace` skill](https://github.com/infinite-system/ivue/blob/main/.claude/skills/node-namespace/SKILL.md)
turns it into a repeatable backend coding discipline for AI agents.
