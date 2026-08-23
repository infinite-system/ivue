---
title: 'The object graph they took from you'
description: Frontend never proved object graphs wrong — it fled two mechanical defects, then canonized the flight as philosophy. Fix the defects and workspaceSet.active.editor.selectLine() comes home.
date: 2026-07
tags: [philosophy, javascript]
---

# The object graph they took from you

<BlogPostDate />

![The object graph they took from you](/blog/the-object-graph-they-took.png)

Read this expression slowly:

```ts
workspaceSet.active.editor.selectLine(42);
```

It reads like the domain because it *is* the domain: a set of
workspaces, the active one, its editor, an action. No store lookup, no
ID passed to a selector, no hook ceremony. Every hop is a plain
property; the method at the end arrives already bound.

Most frontend codebases cannot write that sentence. Not because
object graphs were proven wrong — nobody ever proved that — but
because two mechanical defects made them unreliable, and the ecosystem
fled. Then it did something stranger: it canonized the flight as
philosophy.

## The two defects

**Defect one: module-cycle initialization order.** Domain models are
cyclic by nature. A workspace holds editors; an editor knows its
workspace. Put those classes in two files — where they belong — and
the imports form a cycle. In JavaScript's module system, a class
binding read before its module finishes evaluating throws
`Cannot access 'X' before initialization`. Whether that happens
depends on **load order**, which depends on entry points and bundler
whims. The graph worked on Tuesday and crashed after a refactor moved
an import line.

**Defect two: unbound methods.** Detach a method from its object —
hand it to an event listener, a callback, an array of handlers — and
`this` falls off. Every team patched it per-site: arrow-function
fields here, `.bind(this)` there, a wrapper closure somewhere else.
Every patch was a small tax, and forgetting one was a runtime bug.

Neither defect was ever fixed. So the ecosystem routed around them.

## The flight

Each workaround was locally reasonable:

- **Flatten the model into stores.** No cross-references between
  classes if there are no classes — just one bag of state per domain
  noun.
- **Pass IDs instead of references.** `editor.workspace` is a cycle
  risk; `editor.workspaceId` plus a lookup is "safe."
- **Select instead of navigate.** If state is flat, reaching anything
  means a selector: find the active workspace, join it to its editor,
  memoize the join.
- **Atomize logic into closure factories.** A function scope can't
  have a `this` problem if there is no `this`.

Stack the workarounds and you get the architecture a generation
learned as *best practice*: state normalized like a database, logic in
composable functions, entities referenced by ID, every relationship
reassembled at read time by selector code that exists only because the
references were confiscated. The industry name for the result is the
**anemic domain model** — data in one flat bag, behavior in another —
and in frontend it stopped being an anti-pattern and became the
default. Not because anyone chose it on the merits. Because hop two of
a real object graph could throw depending on import order.

![The confiscated graph: severed references drifting as dim, flat, isolated points — and the same nodes re-linked into one coherent structure, the path from root to leaf lit end to end](/blog/art/the-object-graph-they-took-art-1.png)

## The homecoming

Both defects die by construction in ivue's
[namespace pattern](/guide/modules):

- **Cycles never manifest** because every cross-module reference is
  late-bound — getter bodies, method bodies, first access. The import
  graph can contain cycles; nothing reads another module's value while
  modules are still initializing. The property is **per-edge**, so
  depth is unlimited: hop five is exactly as safe as hop one, because
  each dereference resolves at call time.
- **Methods arrive bound** because the engine lazily binds them to the
  raw instance with stable identity — `instance.method` is the same
  function every read, safe to detach, hand to a listener, keep in a
  registry.

And reactivity rides the same hops. State is `ref()` at the leaves,
`.value` at the reads — and tracking follows whatever property path
the read takes, at any depth:

```ts
// WorkspaceSet.ts
import { Reactive } from 'ivue';
import { shallowRef } from 'vue';
import { Workspace } from './Workspace';

class $WorkspaceSet {
  get workspaces() {
    return shallowRef<Workspace.Model[]>([]);
  }
  get activeIndex() {
    return shallowRef(0);
  }

  // a plain getter — the graph hop IS the derivation
  get active() {
    return this.workspaces.value[this.activeIndex.value];
  }
}

export namespace WorkspaceSet {
  export const $Class = $WorkspaceSet; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  // the type of every unwrapping surface (defineExpose, reactive())
  export type Instance = typeof Class.Instance;
}
```

A watcher that reads `workspaceSet.active.editor.cursorLine.value`
subscribes to the active index, the workspace list, and the cursor —
the whole path — because the reads happened inside its effect. Switch
workspaces and it re-fires; no selector was written, no subscription
managed. Two primitives, any depth. Much of what ships under the name
"state management" is scaffolding around the missing graph.

## Proof at depth

[Invar](/examples/invar), the terminal
editor [built by AI agents on ivue](/blog/agents-built-an-editor),
navigates its domain exactly this way. These are production lines from
its composition root, quoted verbatim:

```ts
// RootView.ts — a reactive leaf read, four hops deep
editorArea.title = workspaceSet.active.editor.hasDocument.value
  ? workspaceSet.active.editor.title
  : 'Editor';

// RootView.ts — five hops, crossing TWO namespaces in one expression
languageForActive: () =>
  LanguageRegistry.Class.forPath(workspaceSet.active.editor.document.path),
```

Look at what each line takes for granted. The first reads a `ref` leaf
(`hasDocument.value`) through three graph hops and a plain-getter
derivation (`title`) beside it — inside a paint effect, so the title
re-renders when the active workspace changes, the editor swaps, *or*
the document opens. Nobody wrote a selector for that; the reads are
the subscription. The second navigates the workspace graph AND
dereferences a second module's replaceable
[`Static()`](/guide/static) seam — `LanguageRegistry.Class` — in the
same expression. Under eager binding, that line is a load-order
lottery ticket. Late-bound, it is just a sentence.

They are two of **75 multi-hop call sites** counted across the
editor's 153 files (grep, July 2026), written across 292 commits by
authors who were never once bitten by initialization order. The fear
was about the defects. It was never about the shape.

## What stays true

A claim this shaped earns its keep by what it rules out, so here is
what stays ruled out:

- **Circular `extends` stays impossible** — a class can't be its own
  ancestor. That is logic, not a limitation; no pattern restores it.
- **Eager top-level reads stay dangerous** — `new B.Class()` at module
  scope executes at load time, inside the danger window. The
  convention works because it makes every reference *late*; it does
  not bless eager ones.
- **Normalization keeps its real jobs.** Deduplicating a server cache
  and syncing entities by ID across a wire are storage problems, and
  ID-keyed maps solve them well. The correction is narrower: your
  *runtime domain model* — the thing your logic navigates — no longer
  has to be flattened in fear.

## The triptych

This is the third confiscation ivue reverses, and the corrections
compose. [Inheritance was exiled](/blog/inheritance-exile) for the
sins of its abusers — the philosophy correction.
[Objects were rented](/blog/rented-objects) from framework lifetimes —
the lifetime correction. And the graph itself was taken — the
composition correction. Put them back together and you get the thing
frontend quietly stopped believing it deserved: a rich, reactive,
navigable domain model, in plain classes, at any depth.

`workspaceSet.active.editor.selectLine(42)` — welcome home.
