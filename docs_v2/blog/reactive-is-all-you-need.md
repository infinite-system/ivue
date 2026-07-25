---
title: 'Reactive() is all you need'
description: Store libraries, composable factories, service layers, emitters, DI containers — the state-management zoo reduces to plain classes and one prototype transform. The roles were never different things; they were one thing with different lifetimes.
date: 2026-07
---

# Reactive() is all you need

![Reactive() is all you need](/blog/reactive-is-all-you-need.png)

The most influential machine-learning paper of the last decade is
famous for its title before its math. *Attention Is All You Need*
didn't claim attention was magic — it claimed the **zoo was
unnecessary**: the recurrent networks, the convolutional encoders, the
task-specific architectures bolted together per problem could all be
replaced by one primitive, repeated.

Frontend state management has a zoo of its own. A mature Vue
application typically carries a store library for shared state, a
composable convention for reusable logic, a service layer for
"business logic," an event emitter for cross-module signals, and some
flavor of dependency injection to wire it together. Five categories.
Five APIs, five lifecycle stories, five sets of documentation, five
ways a new team member can put code in the wrong place.

The claim of this post is the paper's claim: the zoo is unnecessary.
Every one of those categories is the same three needs wearing
different uniforms — **state, derivations of state, and actions that
mutate state** — plus one honest variable: *how long the thing lives*.

## The zoo, reduced

Hold a `Reactive()` class against each category and watch the
category dissolve:

| the category | what it actually is | as a Reactive class |
| --- | --- | --- |
| store | shared state + derivations + actions, app lifetime | a module-singleton instance |
| composable | state + derivations + actions, caller's lifetime | the same class, constructed where you need it |
| service | actions around injected dependencies | methods + [`$`-getter injections](/guide/modules#injecting-stores-and-composables-the-slot) |
| view-model | state + derivations bound to one component | the same class, constructed in `setup()` |
| domain entity | state + derivations + actions, data lifetime | the same class, thousands of instances |

Five rows, one right-hand column. The categories were never different
*kinds* of thing — they were one kind of thing at different
**lifetimes**, and the ecosystem shipped a separate library for each
lifetime because no primitive spanned them.

`Reactive()` spans them. The constructor runs synchronously wherever
you `new` — construct in `setup()` and plain `watch`/`onMounted`
register against the component; construct at module scope and
[`$watch`](/guide/lifecycle-teardown) registers in the instance's own
detached scope, disposed by an owner calling `$stopEffects()`. Same
class, both lifetimes, chosen at the call site — the one variable that
was ever real is the one you control directly.

## What each library was compensating for

Each cage in the zoo exists because plain classes historically
couldn't do the job:

- **Store libraries** exist because sharing a reactive object across
  components needed framework blessing. A Reactive instance is a plain
  object with cached Refs — export it from a module and it is shared,
  no plugin, no `install()`.
- **Composable factories** exist because logic reuse needed a function
  scope to hold refs. A class holds them on the prototype pattern
  instead — with inheritance, `instanceof`, and
  [circular-import immunity](/guide/modules) the closure never had.
- **Service layers with DI** exist because classes constructed eagerly
  couldn't safely touch stores at load time. The `$`-getter resolves
  dependencies on **first access**, after everything is installed —
  injection without a container.
- **Event emitters** exist to signal across modules without coupling.
  A watcher on a ref *is* that signal, with teardown owned by
  [`$stopEffects()`](/guide/lifecycle-teardown) instead of a manual
  `off()` bookkeeping ledger.

None of these libraries was a mistake. Each was the correct patch for
a missing primitive. The primitive stopped being missing.

## Proof by existence

This is not a thought experiment. [Invar](https://github.com/infinite-system/invar),
the terminal code editor
[built almost entirely by AI agents](/blog/agents-built-an-editor), is
25,890 lines with **no store library, no DI container, no emitter, no
composable layer**: 42 `Reactive()` classes cover every stateful role
in the table above, 34 [`Static()`](/guide/modules) seams cover the
stateless capabilities, and the whole model layer underneath is
[1.1 kB](/blog/one-kilobyte-feature). The
[20,000,000-cell spreadsheet](/blog/twenty-million-cells) runs the
same way. So does every demo on this site.

## What "all" does not mean

A claim shaped like this one earns its keep by what it rules out, so
here is the boundary, stated plainly:

- **Rendering is not ivue's job.** Vue owns templates and the DOM;
  OpenTUI owns Invar's framebuffer. `Reactive()` is the model layer
  under a renderer, not a renderer.
- **The static side has its own transform.** Stateless capability
  classes — function bags behind a replaceable seam — belong to
  `Static()`, which has no instance dimension.
- **Persistence, routing, and I/O stay themselves.** The claim
  collapses the *state-architecture middle layer* — the five-category
  zoo between your data and your renderer — not your HTTP client.

Inside that boundary, the reduction is total: if the thing holds
reactive state, derives from it, or mutates it, it is a plain class
with one transform applied, and its only design decision is its
lifetime.

## One kilobyte because one idea

The engine is [1.1 kB](/blog/one-kilobyte-feature) for the same reason
the transformer outlived the zoo it replaced: removing categories
removes machinery. No store plugin, no injection tokens, no emitter
registry, no composable-context rules — one transform over one class
shape, applied identically at every lifetime.

The paper's lesson was never that attention was powerful. It was that
the specialized architectures were **redundant** — that one primitive,
honestly scaled, covered what a zoo of them had been covering badly.

Your state management has been telling you the same thing.
`Reactive()` is all you need.
