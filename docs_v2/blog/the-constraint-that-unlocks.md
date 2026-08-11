---
title: 'The constraint that unlocks'
description: 'Initialization order is a solved problem in four languages and an unsolved one in the most-used language on earth. One idiom and a 200-line checker close the gap — and pay three more dividends.'
date: 2026-07
---

# The constraint that unlocks

<BlogPostDate />

![The constraint that unlocks](/blog/the-constraint-that-unlocks.png)

Every JavaScript developer has met the bug. Module A imports B, B
imports A, and one of them reads `undefined` where a class should be —
or throws a temporal-dead-zone error, or quietly receives half an
`exports` object. The stack trace points somewhere innocent. The fix is
usually to shuffle imports until the symptom moves out of sight.

Here is the part almost nobody says out loud: **Java has the same
disease.** Java happily compiles and runs circular class references —
the JVM resolves them lazily — but let two static initializers read
each other mid-initialization and you observe `null` and `0` where
values should be, silently, no error. Different syntax, same failure:
*reading during initialization*. The two most deployed languages in
history both hand you this footgun and both call it your fault.

## Who actually solved it

Survey the languages that don't have this bug, and a pattern falls out.
There are exactly two ingredients, and every clean language has at
least one:

**Ban cycles at module granularity.** Go refuses package cycles at
compile time. Rust refuses crate cycles. OCaml refuses cyclic modules.
Java itself — one level up, in JPMS — refuses cyclic *modules* while
tolerating cyclic classes. Go's version has a beautiful consequence:
because the package graph is acyclic, `init()` order is topologically
determined. Acyclicity is what *makes* initialization order
well-defined. The two problems were always one problem.

**Make initialization demand-time.** Swift quietly has the best default
in the industry: every global is lazily initialized on first access, by
language rule. Rust has no life-before-main at all — statics are
compile-time constants or explicitly lazy. Haskell is lazy everywhere
for pure values. Erlang resolves module references at *call time*, so
its import graph barely exists as a load-order concept.

Each language holds one ingredient firmly and pays somewhere else —
Haskell solves initialization but cyclic modules need `hs-boot`
ceremony; Go bans cycles but package `init()` still runs before main.
And JavaScript? JavaScript has **neither** ingredient. Cycles are
legal, module evaluation is eager, and the traps are always armed.

## The retrofit

[Invar](/examples/invar) — the terminal editor
that [AI agents built](/blog/agents-built-an-editor) on
[ivue](/guide/introduction) — runs on both ingredients, in plain
TypeScript, with no language extension. The recipe is two rules.

**Rule one: the module graph is acyclic.** Not as a wish — as a
structure. Every file holds one class, so the import graph *is* the
dependency graph, and a cycle has nowhere to hide. Modules layer;
lower layers never import upward. This is Go's compile-time guarantee
achieved by grammar.

**Rule two: never read a cross-boundary dependency during
construction.** This is the late-read discipline, and it is the whole
initialization cure in one sentence. A constructor that reads another
module's state runs at initialization time — whatever order modules
happened to load in, that's the value you cached, forever. A getter
that reads the same state runs at *demand* time, when everything that
exists, exists:

```ts
class $Workspace {
  // WRONG — initialization-time read. Whatever `editorSource` held at
  // construction is frozen into this field for the object's lifetime.
  activeEditor = this.ports.editorSource.active;

  // RIGHT — demand-time read. Resolves when asked, never before.
  protected get activeEditor() {
    return this.ports.editorSource.active;
  }
}
```

This is not theoretical hygiene. Mid-campaign, one converted class
cached a wrap-width ref in its constructor — initialization-time read —
and word-wrap silently broke for every document opened after the first.
The referee's byte-level gate caught it; the fix was moving one read
from a field to a getter. The disease and the cure, four lines apart.

Swift makes globals lazy by fiat. Rust makes you write `OnceLock`.
The late-read getter is JavaScript's version, and with
[Reactive classes](/blog/reactive-is-all-you-need) it is not even a
sacrifice — a getter over reactive state is *live*, so the demand-time
read is also always the current read.

## The unlock

Here is why this post is not called "a workaround for circular
imports." Swift's lazy globals solve initialization and give you
nothing else. The late-read getter solves initialization and then
keeps paying:

**It is the test seam.** A protected getter is an override point. Want
to count how often a document measures line widths? Subclass it,
override one getter, count. No mocking framework, no injection
container — the discipline that fixes initialization *is* the
dependency injection.

**It is the hot-swap point.** Every class in the system is published
through a mutable binding — `export let Class` — and consumed through
late reads. Nothing cached a constructor at initialization time, so
[swapping an implementation at runtime](/blog/hot-reload-for-logic)
is safe by construction, not by luck.

**It keeps the graph reshapeable.** When no object froze another
object's address at birth, you can cut any subtree of the
[object graph](/blog/the-object-graph-they-took) and re-hang it
elsewhere, and every reference resolves correctly at the next read.
Invar's entire pane system was restructured twice in one week —
thousands of lines each time — at the cost of the diff, because
nothing anywhere held a stale reference by design.

One constraint, four payoffs. That asymmetry is the signature of a
real invariant rather than a coding tip: it doesn't just prevent the
failure class it was aimed at, it generates capabilities nobody
designed into it.

## The referee makes it law

None of this survives as culture. Conventions decay under deadline
pressure and new contributors — and AI agents writing most of the code
makes "just remember not to" a fantasy. So the rules are enforced the
way Go enforces its package rule: mechanically, before anything lands.

A ~200-line AST checker parses every file and rejects, at the merge
gate, module-level state that should live on a class, detached
functions with no extension seam, constructor shapes that invite
early reads, and files whose import structure hides the dependency
graph. Sixteen structural rules, every module enforced, every commit.
The checker took an afternoon. It is the difference between "our team
prefers late reads" and "an initialization-order bug cannot merge."

## The claim, sized honestly

Nothing here required inventing new computer science — Go, Rust,
Swift, and Erlang each proved one ingredient at language scale. The
contribution is narrower and, we think, more useful: **the most-used
language on earth can have Swift-grade initialization safety and
Go-grade graph discipline today, retrofitted by one idiom and one
small checker, with no committee and no compiler fork.** And unlike
the native versions, this one hands back a test seam, a hot-swap
point, and a permanently reshapeable object graph as change.

The constraint costs a getter where you wanted a field.
It unlocks everything else.
