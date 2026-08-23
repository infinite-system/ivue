---
title: 'Inexpressible failure, expressible intent'
description: "Code is ugly exactly where it encodes constraints that aren't the program's own. Make the alien failure modes inexpressible and succinctness isn't a style you apply — it's what's left."
tags: [philosophy, architecture]
relatedPosts: [circular-imports-dissolved, the-object-graph-they-took, the-field-not-the-rules, win-by-reduction, what-javascript-becomes]
date: 2026-08
---

# Inexpressible failure, expressible intent

![Inexpressible failure, expressible intent](/blog/inexpressible-failure-expressible-intent.png)

<BlogPostDate />

Ugly code does not come from bad programmers. It comes from somewhere
much more specific, and once you see the source you can never unsee
it:

> Code is ugly exactly where it encodes constraints that are not the
> program's own.

Every program has an intent with a *shape* — a customer holds orders,
an order knows its customer, a workspace owns an editor, the editor
reaches back. That shape is a graph, and it belongs to the domain. The
notation's whole job is to trace it. When the code reads the way the
domain thinks, we call it beautiful, and we're not being sentimental —
we're measuring something: **the residual distance between the shape
of the intent and the shape of the text.**

## The alien constraint

Now watch where the distance comes from. For fifteen years, JavaScript
module code has been shaped by a constraint that appears nowhere in
any program's intent: **evaluation order**. No specification ever
contained the sentence "and module B must finish evaluating before
module A." The loader's bookkeeping imposed it anyway — a mine field
laid by ordinary `export` of ordinary classes, where a reference that
is *meaningful* in the domain is *fatal* in the text, depending on
which file the bundler happened to walk first.

The failure was expressible, so every team wrote code whose only
purpose was to not express it:

- barrel files with load-order rituals in the README
- `forwardRef(() => OrderService)` — a wrapper whose entire meaning is
  "please read this later"
- entities holding `workspaceId` instead of the workspace, plus the
  selector layer that re-joins what the reference already joined
- flattened stores, because a flat bag of state cannot form the cycles
  the domain formed naturally
- `init()` methods and DI ceremonies sequencing what the language
  wouldn't

None of that code expresses intent. All of it expresses *fear* — the
routing around a failure mode the substrate left open. Multiply it
across a codebase and you get the familiar texture of enterprise
JavaScript: correct, defensive, and ugly, because half the text is
about the loader and none of the domain is about the loader.

## The reversal

The fix is not discipline — discipline is more routing. The fix is to
make the failure **inexpressible**. In the
[namespace convention](/guide/namespace-pattern), every cross-module
reference is late — getter bodies, method bodies, first access — so
no read can occur while the graph is still loading. Not "is avoided."
*Cannot occur.* The mine field isn't cleared; the geometry that made
mines possible is gone —
[measured at 372 files with a deeply cyclic domain graph](/blog/circular-imports-dissolved).

And here is the part that makes it an essay about beauty rather than
safety: when the failure becomes unwritable, the routing code doesn't
get cleaned up. It becomes **meaningless** — there is nothing left for
it to route around. What remains is the direct notation:

```ts
// the domain sentence, written as the domain thinks it
workspaceSet.active.editor.selectLine(42);
```

versus the same intent written in fear:

```ts
const workspace = workspaceStore.byId(activeWorkspaceId.value);
const editor = editorStore.byId(workspace?.editorId ?? '');
if (editor) editorActions.selectLine(editor.id, 42);
```

The second version is not worse engineering. It was *correct*
engineering for a substrate where the first version could throw
depending on import order. Change the substrate and the second version
loses its reason to exist — every line of it was distance between
intent and text, paid to a constraint that had nothing to do with
either.

## Succinctness is a remainder

This inverts how we usually talk about clean code. Succinctness is not
a style you apply at the end — no amount of taste turns the second
snippet into the first while the failure stays expressible. It is a
**remainder**: what's left when the alien constraints are deleted and
the notation collapses onto the intent. The
[whole-program consequence](/blog/the-object-graph-they-took) is that
the application becomes one connected graph — entities holding
entities, stores referencing stores, expression uninterrupted by seams
that exist only because a loader once needed them.

The same logic runs through every piece of the
[standard](/guide/standard): unbound `this` made inexpressible, so the
wrapper-closure era ends; forked singletons made inexpressible, so
defensive DI ceremony ends; initialization races made inexpressible,
so `init()` rituals end. Each removal doesn't just delete a bug class.
It deletes the *prose that feared it* — and the code that remains is
shorter, flatter, and reads like the domain, because for the first
time it contains nothing else.

> Beauty in code is not decoration. It is the absence of anything
> alien.

That is [the field, not the rules](/blog/the-field-not-the-rules),
seen from the aesthetic side: reshape the space so the degenerate
moves don't exist, and what people write inside it comes out clean —
not because everyone became disciplined, but because there is nothing
ugly left to say.
