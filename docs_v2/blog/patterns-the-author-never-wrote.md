---
title: 'Patterns the author never wrote'
description: Invar is full of ivue patterns that ivue's author never used by hand — the mtime-keyed blame cache, observation-owned connections, the pull floor. Agents derived them from the 845-line Standard Operating Manual. The difference between a catalog and a generator is that a generator produces instances its author never enumerated.
date: 2026-08
tags: [agents, patterns, invar]
---

# Patterns the author never wrote

<BlogPostDate />

![Patterns the author never wrote](/blog/patterns-the-author-never-wrote.png)

There is a strange admission buried in the Invar story, and it is
worth more than all the line counts: the codebase is full of ivue
patterns that **ivue's author never used by hand**.

The [blame cache keyed on file mtime](/blog/reactivity-is-an-allocator).
The SQLite connection whose existence is decided by a pane's
visibility. The pull floor under the notify channel. The motion
heartbeat gated on a spinner inside the painted window. None of
these existed in any ivue codebase before agents wrote them. The
author of the library — three years into it — had never once
expressed them. The agents were not shown these patterns.

They were shown something smaller.

## A catalog can only be remixed

Consider what the agents were actually given: the
[Standard Operating Manual](/guide/standard) — 845 lines, five
thousand words — plus the invariant contracts the fleet accumulates as it
works. Not a pattern library. Not a corpus of prior applications.
The manual states the model: mutable state is a getter returning a
ref; ground truth stays plain; identity is stable; derivations are
plain getters; every resource has an owner; closures are pointers
and logic lives on the prototype.

Here is the test that distinguishes what kind of document that is.
If it were a **catalog** — twelve examples, imitate them — then
everything downstream would be a remix of the twelve. Whatever
appeared in Invar would be the author's own usage, echoed at scale.
Recognizable. Derivative in the literal sense.

What appeared instead were correct expressions of the model in
situations the manual never mentions: git subprocesses, file
descriptors, language-server lifecycles, animation clocks. That is
the signature of the other kind of document:

> A catalog can only be remixed. A generator produces instances its
> author never enumerated — that is not a bonus property, it is the
> definition. Theorems the axiom-writer never proved are what
> axioms are *for*.

## The tell: derivations that need the model, not the examples

One detail proves the difference beyond argument. Invar's LSP
client, on disposal, deliberately does *not* call `$stopEffects()` —
with a comment explaining why: the class owns no watchers, and
calling it would clear the cached getter cells and discard the
terminal `disposed` status that later reads must still see.

Trace what that sentence requires. It requires knowing that
[`$stopEffects()` clears cached cells](/guide/lifecycle-teardown) —
an engine mechanic. It requires noticing this class has no effects
to stop — a local fact. And it requires connecting both to
*subprocess teardown ordering* — a domain the ivue docs do not
discuss. That three-way combination exists nowhere in the manual,
nowhere in the docs, nowhere in the author's own code. You cannot
imitate your way to it. You can only **reason** to it from a model
you actually hold.

The components, to be clear, are old engineering — mtime caches,
generation counters, debounce floors are classics with decades of
prior art, and the agents' training surely contains them all. The
derivation is not the classic itself; it is the *placement*: knowing
that in this substrate the mtime cache lives behind a `$`-cached
static getter, publishes through a revision signal, and evicts on
the observed set. Old knowledge, correctly threaded through a model
the training data had never seen — because the model was months old
and one page long.

## The chess clause

The person who fixed the rules of chess played a vanishing fraction
of the legal games — and that is not a gap in the work. It is the
point of rules. Nobody thinks the inventor must demonstrate every
combination for the combinations to be real; the rules are finished
precisely when the games no longer need their author.

> The generator is finished when it produces things its author has
> never seen. Until then it is documentation. After that it is a
> substrate.

Three years of [reduction](/blog/three-years-to-reduce) compressed
a reactive class model into a structure small enough to hand over
whole. The fortnight that followed was other minds — stochastic
ones — playing games the author never played, inside rules that
made the good games easy to find and the bad ones
[impossible to write](/blog/the-constraint-that-unlocks). Some of
those games were better than any the author had on file. That is
not the author being surpassed. That is the reduction *working*.

## The honest half: derivation needs selection

Left alone, this story overclaims, so here is the counterweight.
Agents are stochastic rule-followers — they derive wrong things
with the same fluency as right ones. The derivations that fill
Invar survived because the other half of the system *selected*
them: 35 invariant contracts, AST censuses with positive controls,
a merge gate that rejects what the model contradicts. Just this
week, a census caught a contract asserting an observation gate the
code had lost — drift happens, and the machinery is why it stays
small.

So the division of labor is exact. The generator gives direction:
which expressions are even candidates. The harness gives selection:
which candidates survive contact. Generation without selection
drifts; selection without generation has nothing to choose from.
The fortnight took both — and the fleet has begun closing the loop
itself, minting its own invariants ("a notify channel cannot report
its own silence") and validating them across domains the author
never connected. The generator is generating generators.

## What this asks of your documentation

The transferable lesson is not about ivue. Anyone writing skills,
manuals, or conventions for agents is choosing, sentence by
sentence, between the two kinds of document. Examples teach
imitation; models teach derivation. The test is already available
to run on your own docs:

> If your agents only ever do what your examples show, you wrote a
> catalog. If they do things you never showed them — and those
> things are *correct* — you wrote a generator.

And none of it is hidden: the manual is 845 lines, the derived
patterns sit [in the tree](/blog/reactivity-is-an-allocator) cited
by file and line, and the contracts that selected them
[run on every merge](/blog/the-zeros-didnt-move). Check any of it.

Three years to write five thousand words. Machines took it from
there — to places the five thousand words never went, which is how
you know they said something.
