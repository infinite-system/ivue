---
title: 'The field, not the rules'
description: There are two ways to get good code — police it with rules, or reshape the field so bad design has nowhere to stand. ivue and its invariants flip JavaScript's defaults one by one, until the degenerate moves stop existing as moves. 144,000 lines of agent-built proof.
date: 2026-08
---

# The field, not the rules

<BlogPostDate />

![The field, not the rules](/blog/the-field-not-the-rules.png)

There are two ways to get good code out of a codebase.

The first is **rules**: style guides, review checklists, lint warnings,
onboarding docs. Rules assume the bad moves stay available and ask
everyone, politely and forever, not to make them. Every rule is a
standing tax — it must be taught, remembered, enforced, and re-litigated
in every code review until the end of the project. Rules police a space
that remains dangerous.

The second is **the field**: change what can be expressed, so the bad
moves stop existing as moves. Nobody reviews for the mistake because the
mistake has no syntax. Nobody remembers the discipline because there is
nothing to remember — the shortest path and the correct path are the
same path.

> A convention says "please don't." A field says "there is no such
> move." The first is ethics. The second is physics.

ivue started as a reactivity engine. What it turned into — together with
the invariants built around it — is a field change: a deliberate
reshaping of JavaScript's possibility space, flipping the substrate's
defaults one by one until sound design became the path of least
resistance.

## The inversion table

Each row is one default of stock JavaScript, inverted:

| stock JavaScript defaults to… | the reshaped field defaults to… |
| ----------------------------- | ------------------------------- |
| eager evaluation at module load | nothing exists until first access |
| unbound methods — `this` is the caller's problem | bound methods, stable identity |
| references resolve at import time | references resolve at first touch |
| module-level state as the path of least resistance | state has no legal home outside a class |
| import cycles as runtime landmines | cycles structurally inert |
| caching manual, ad-hoc, everywhere | caching a rare, census-able annotation |

None of these is a rule someone follows. Each is what the code *does*
when nobody is trying. A ref-getter cannot allocate before first read —
laziness is not a discipline, it is the mechanism. An ivue method
arrives bound because the engine binds it at the prototype — passing
`box.grow` as a handler simply works, and the entire class of
`this`-loss bugs becomes unwritable. A cross-module reference inside a
method body resolves when the method runs — long after every module has
loaded — so the [oldest structural wound in
JavaScript](/blog/circular-imports-dissolved) closes not because anyone
is careful but because load-time reads stopped being expressible.

## Enforcement is what makes it a field

Inside [Invar](/examples/invar) — the terminal IDE that AI agents built
on ivue — the inversions are not aspirational. They are gated by AST
checks that run with the test suite: no eager module-level `const`
holding state, no loose functions floating outside classes, no
load-time reads across modules. Everything lives inside classes;
everything defers; everything loads on demand.

That gate is the line between a style and a field. A style guide bends
under deadline pressure — one exception, then five, then the guide is
archaeology. An AST check does not bend. Code that expresses the old
defaults doesn't get merged, so the field's curvature holds at 144,000
lines exactly as it held at ten.

> Constraints you must remember will eventually be forgotten.
> Constraints built into the field cannot be.

The census numbers are what holding looks like: [372 files in a deeply
cyclic domain, zero value-import cycles](/blog/circular-imports-dissolved),
zero `forwardRef`-style workarounds, zero load-order rules. Across the
editor's reactive core, [three `computed()` calls](/engine) — each one a
deliberate, documented purchase. Not because agents were disciplined.
Because the alternatives were not reachable.

## Removing expressiveness — where it was useless

"Less expressive" sounds like a loss. Look at what was actually removed:

- The ability to read another module's value before loading finished.
- The ability to scatter mutable state across module scope.
- The ability to pass a method and silently lose its `this`.
- The ability to allocate reactive machinery for values nobody reads.

Every one of these is **degenerate freedom** — a way to say something
that was never worth saying. No feature was lost; a class of regrets
was. What remains is a smaller language that can express everything the
domain needs and nothing it apologizes for. The same subtraction that
took the engine to [98 lines](/blog/one-kilobyte-feature), applied one
level up — to the possibility space itself.

This is an old idea wearing new tools. Type systems made illegal states
unrepresentable in *data*. The field makes illegal designs
unrepresentable in *architecture* — load order, binding, state
placement, cache policy — the layer where projects actually rot.

## Why agents thrive on it

The strangest evidence came from watching the fleet work.
[Agents produced patterns the author never wrote](/blog/patterns-the-author-never-wrote) —
capability classes, reactive control planes, structures no example ever
showed them. That is not obedience. Obedience reproduces the training
examples; it does not exceed them.

The explanation is the field. An agent exploring a rule-based codebase
must model the rules *and* the ways they bend — its search space is full
of moves that compile today and rot tomorrow. An agent exploring a
constrained field can search **aggressively**, because every reachable
point is structurally sound. Constrain the space and exploration becomes
safe; make exploration safe and you get emergence instead of entropy.

> Rules cap how bad the code can get. A field raises how good it can
> get — by making the search space safe to explore at full speed.

That inversion — constraints as an accelerant, not a brake — is the part
worth sitting with. The [AI-era argument](/blog/reactive-framework-for-the-ai-era)
usually stops at "agents need guardrails." The field goes further:
agents need a *geometry*, and given one, they build things their
operators didn't specify and couldn't have. The proof is not a claim
about the future. It is [running software](/examples/invar).

## The claim, plainly

We did not write better JavaScript. We changed what JavaScript defaults
to — evaluation time, binding, state placement, resolution order — and
then removed the expressiveness that only ever produced regret. The
game plays differently because the board is shaped differently.

Rules are what you need when the field is wrong. Fix the field, and the
rules dissolve into it — unenforced, unremembered, and unbroken.

Start with [What is ivue?](/guide/introduction), see the defaults up
close in the [Standard](/guide/standard), or read what this field made
[buildable](/blog/what-becomes-buildable).
