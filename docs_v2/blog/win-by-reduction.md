---
title: "Win by reduction. Win by construction."
description: The strongest architecture does not manage complexity more efficiently. It removes the conditions that create it, then makes the remaining guarantees structural.
date: 2026-07
---

# Win by reduction. Win by construction.

<BlogPostDate />

![Complexity collapsing into a small, load-bearing structure](/blog/win-by-reduction.png)

Software engineering usually treats complexity as a fact of life. Once a
system has dependency cycles, lifecycle ambiguity, indirection, caches,
registries, and initialization order, the next task is to build machinery
that manages them reliably.

That direction can produce excellent machinery. It can also leave the
original question unasked: **which of these problems still exists after the
architecture is reduced to what the domain requires?**

ivue follows the other direction.

> Do not solve a removable problem more efficiently. Remove the condition
> that creates it.

## Win by reduction

Reduction is not minimalism for its own sake. It means deleting an assumption
and checking whether the required behavior survives. If it does, the
assumption was carrying complexity rather than capability.

A reactive model needs state, derivation, behavior, composition, and a clear
lifetime. It does not inherently need every instance to be a proxy. It does
not require every derived value to own a cache node. It does not require
cross-module references to execute while modules initialize. It does not
require a plugin registry to remain in every runtime call.

Remove those assumptions and familiar problems contract:

- **Plain instances remove the proxy layer.** The object retains its native
  identity, prototype, inheritance, and property semantics.
- **Plain getters remove automatic cache allocation.** A derivation is a
  tracked read. It pays for a cache only when repeated work makes caching
  valuable.
- **Lazy members remove unused allocation.** A member that is never read
  never materializes.
- **Late namespace references remove eager module coordination.** Methods and
  getters resolve collaborators when behavior runs, after module evaluation,
  so ordinary cross-module cycles stop being initialization-order puzzles.
- **Boot-time plugin composition removes steady-state dispatch.** Plugins
  shape the class before instances are constructed; normal method calls stay
  normal method calls.
- **Explicit ownership removes lifecycle guessing.** The code that creates a
  long-lived object also owns its teardown.

The result is not a larger solution compressed into fewer characters. The
larger solution is absent because fewer problems remain.

This is why ivue can be small without asking the application to become small.
The generator is compact; what it generates can be enormous.

## Win by construction

Reduction finds the smaller structure. Construction turns that structure into
guarantees.

A convention is strongest when following it makes an entire category of
failure unavailable. The guarantee does not depend on every developer
remembering a warning at the exact right moment. The program's shape carries
it.

Consider an ivue module:

```ts
// Workspace.ts
import { ref } from 'vue';
import { Reactive } from 'ivue';
import { Documents } from './Documents';

class $Workspace {
  get activeDocument() {
    return Documents.byId(this.activeDocumentId.value);
  }

  openDocument(documentId: string) {
    this.activeDocumentId.value = documentId;
  }

  private get activeDocumentId() {
    return ref('welcome');
  }
}

export namespace Workspace {
  export const $Class = $Workspace; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // exposed instance type
}

export const workspace = new Workspace.Class();
```

Those three namespace lines are deliberately boring. Every module exposes the
same three roles: raw class, reactive constructor, and instance type. A module
adds a shared instance when its domain needs one. A method can refer to another
namespace without eagerly reading it during module evaluation. The local file
shape produces a global dependency structure.

The impossibilities are more important than the syntax:

- A lazy member that is never read cannot allocate per-instance state.
- A plain getter cannot secretly own a memoization node.
- A raw class instance cannot pay a per-instance proxy traversal cost.
- A sealed plugin cannot add registry dispatch to every method call.
- A stable handle stored before a hot loop cannot perform a getter lookup
  inside that loop.
- A late method or getter reference cannot fail merely because the referenced
  module appears later in an import cycle.

That last boundary is precise. Eager top-level reads are still eager, and
JavaScript cannot form a circular `extends` chain. Construction removes
ordinary behavioral circularity; it does not repeal module semantics.

## The cheapest coordination is the coordination you no longer need

Circular initialization bugs are often described as a technical nuisance.
At team scale they are a coordination tax. Someone must understand which
module runs first, which value is partially initialized, which import is safe
only through a particular path, and which harmless refactor changes the load
order. The cost appears in debugging sessions, review hesitation, onboarding,
and architectural workarounds.

Three predictable namespace lines per file are visible cost. The debugging
they displace is unbounded cost.

That trade becomes even more important when software is produced by a mix of
experienced developers, newcomers, and coding agents. A coherent architecture
cannot depend on everyone holding the whole import graph in working memory.
Local code must preserve the global rules by default.

This is not permission to generate code without judgment. It is a better
substrate for judgment. Humans and tools can spend their attention on the
domain because module coherence is encoded in the method, getter, and
namespace shapes they already use.

## Reduction also changes the performance question

Framework performance is often discussed as the cost of executing framework
machinery. Reduction asks whether the machinery needs to execute at all.

An unread member costs no allocation. An uncached derivation owns no cache. A
plain instance has no proxy boundary. A plugin applied at boot has no
steady-state lookup. A stable ref or bound method can be hoisted once, leaving
the hot loop with the same direct handle ordinary JavaScript would use.

The remaining read costs are visible and erasable. Code can keep the
convenient property surface for ordinary work and store a stable handle where
a measured hot path requires it. Boot work is paid once; instance and read
work multiply across the population.

That is the scale argument. It is not that every ivue expression is free. It
is that costs correspond to explicit capabilities, unused capabilities do not
materialize, and recurring indirection can be removed from the paths where it
matters.

## A different kind of ambition

The most durable engineering wins rarely look like a bigger pile of
machinery. They look obvious after the reduction is complete.

Plain classes already provide identity, inheritance, encapsulation, and
native dispatch. Vue already provides fine-grained reactive primitives and
tracking. JavaScript modules already provide live bindings. ivue aligns those
structures so each one keeps doing its native job.

No brute force. No clever runtime maze. No framework imitation of facilities
the language already owns.

> Beat complexity by making it unnecessary. Beat failure by making it
> structurally unavailable.

That is what it means to win by reduction, then win by construction.

Continue with [Modules & Imports](/guide/modules),
[Performance](/guide/performance), and the live
[Extensible Kernel](/examples/extensible-kernel) to see the same idea applied to
module graphs, hot paths, and boot-time plugin composition.
