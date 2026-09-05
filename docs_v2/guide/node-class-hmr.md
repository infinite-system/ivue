---
title: Node Development by Restart
description: The namespace pattern makes class modules load coherently; an existing Node watcher can own code replacement without a second runtime for hot code swapping.
search: false
relatedPosts: [what-javascript-becomes, circular-imports-dissolved]
---

# Node Development by Restart

::: warning Current exploration
This page defines the development boundary for the experimental Node namespace
model. It is not an ivue package feature.
:::

> A runtime should own only the problems the host runtime does not already
> solve.

The Node namespace model solves authoring structure: circular dependencies
resolve late, static methods are passable, inheritance remains native, and
boot composition selects one class. A normal Node watcher already solves the
remaining development event by restarting the process after an edit.

```text
edit
→ watcher stops the process
→ Node loads one fresh module graph
→ namespaces compose
→ routes retain methods from that generation
→ application runs
```

The production and development application execute the same class paths. The
watcher changes process lifetime, not class semantics.

## Why this already improves class reload

Class-heavy module graphs often fail before an application can restart
cleanly. An eager cross-module class read observes an uninitialized binding,
or a static initializer performs work before its dependency exists.

The namespace grammar removes those eager value edges:

```ts
static get Users() {
  return Users.Class;
}
```

Imports may remain circular because dependency values are read only when
behavior runs. A fresh Node process can therefore evaluate the graph in any
module order permitted by the same late-read invariant.

Normal restart is not a fallback around broken class modules. The namespace
shape makes normal restart dependable again.

## The cost of keeping the process alive

Live class HMR inside Node requires much more than assigning a new constructor.
A complete system must own:

- file watching and transitive module invalidation;
- stable identities across re-evaluated module namespace objects;
- transactional evaluation and rollback;
- plugin recomposition against each new foundation;
- callbacks already retained by routers, queues, and emitters;
- active asynchronous frames from the previous generation;
- explicit reconstruction and disposal of stateful instances;
- static initialization, native private brands, and top-level side effects;
- a cold-start verification path that catches hidden startup failures.

That machinery becomes a second module runtime. It has its own correctness
surface, tests, compatibility constraints, and maintenance cost. The namespace
pattern makes such a runtime possible, but possibility does not make it part of
the minimal backend contract.

## One generation is the coherence boundary

A process restart keeps constructor wiring, static fields, closures,
inheritance, private brands, retained callbacks, and process-owned resources
within one evaluated generation. No old object receives behavior from a new
declaration.

This is the same ownership principle used by ivue development: the framework
or process owner reconstructs the owning boundary. The class transform does
not implement a parallel replacement engine.

## Resource lifetime remains explicit

Restart discards in-memory resources. Development applications should make
their important state reproducible through fixtures, external databases,
seeded sessions, or explicit boot scripts.

Some systems have multi-minute warmup, irreplaceable in-memory investigations,
or long-lived connections that make process preservation unusually valuable.
Those systems may justify a managed module runner. That is a separate product
with explicit resource, dispatch, and state-migration contracts. It is not a
hidden obligation of every class module.

## The reduction boundary

| Capability | Owner |
|---|---|
| Circular-import safety | Namespace getters and late method bodies |
| Passable static callbacks | `Static()` first-read binding |
| Inheritance and `super` | Raw `$Class` declarations |
| Plugin selection | Boot-time kernel composition |
| Source-file watching | Existing Node development tool |
| Code replacement | Process restart |
| Durable state | External resource owner |
| Request-varying provider choice | Explicit context or scoped DI |

Removing live HMR preserves every selected capability. Adding it would expand
scope without strengthening the namespace invariant.

## The retained possibility

The namespace's stable object and mutable `Class` slot remain useful seams for
tests and boot-time plugins. They also provide the canonical identity a future
live runtime would require. Nothing in the reduced design prevents a separate
system from exploring that direction.

The default remains smaller:

```text
namespace + late getters + Static() + restart
```

The [Namespace Pattern](/guide/namespace-pattern) explains the
cross-runtime invariant. [Static() — Capability Classes](/guide/static)
contains the working transform, tests, benchmarks, and exact scope.

## See it running

- [Invar — Terminal IDE](/examples/invar) — 108,000 lines of it in production.
