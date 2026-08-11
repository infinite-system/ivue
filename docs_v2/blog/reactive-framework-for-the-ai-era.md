---
title: 'Reactive framework for the AI era'
description: Frameworks were designed for human authors — expressiveness, flexibility, choice. The author changed. When agents write most of the code, the ranking of framework virtues inverts — uniformity beats expressiveness, construction beats vigilance, and an engine small enough to hold in one head fits whole into one context window.
date: 2026-08
---

# Reactive framework for the AI era

<BlogPostDate />

![Reactive framework for the AI era](/blog/reactive-framework-for-the-ai-era.png)

Every framework you know was designed for a human author. The
virtues frameworks compete on — expressiveness, flexibility, freedom
of style, a rich menu of ways to do each thing — are virtues *for a
person*: they respect taste, they accommodate teams that disagree,
they make the language feel roomy.

The author is changing. On a growing share of real codebases, most
lines are written by agents — and for a stochastic author, the
ranking of framework virtues does not shift. It **inverts**.

> A human author is served by what a framework lets you express. A
> stochastic author is served by what a framework makes impossible.

ivue was not designed for agents — it was
[reduced over three years](/blog/three-years-to-reduce) for humans
who were tired of variance. But reduction and the AI era arrived at
the same doorstep, and it is worth being precise about why.

## What a stochastic author actually needs

An agent is a stochastic rule-follower:
fluent, tireless, and drifting. Every property below exists to
convert drift into something harmless, visible, or impossible.

**One way to do each thing.** Where a framework offers five idioms,
a human picks a favorite; an agent samples all five across a
codebase, and every seam between idioms is a place reasoning can
slip. ivue has one class shape, one export form, one wiring pattern —
which is why uniformity works as an instrument: against total
sameness, an agent's deviation is high-contrast, catchable by an AST
check instead of a careful reviewer.

**Correctness by construction, not vigilance.** The classic
review-burden failure classes — unbound `this`, initialization
order, circular imports, leaked watchers, module-level state — are
exactly the mistakes a tireless generator makes tirelessly. ivue's
answer is never "be careful": methods bind
lazily and permanently, cycles resolve by construction, teardown
is deterministic. A failure class an agent
cannot express is a failure class nobody has to catch.

**A standard small enough to transmit whole.** The entire discipline
fits in the [779-line Standard Operating
Manual](/guide/standard) — installable into an agent with one
command:

```sh
npx ivue skill        # Claude Code
npx ivue skill --all  # + Cursor, Codex, Gemini…
```

And here the [catalog-versus-generator
distinction](/blog/patterns-the-author-never-wrote) becomes
economic. A big framework transmits as examples, and examples teach
imitation. A small model transmits as *rules*, and rules teach
derivation — agents holding the ivue standard produced correct
patterns its own author had never written. You cannot fit a
sprawling API into a context window and have it survive; you can
fit a generator.

**Legibility at runtime.** An ivue application is one navigable
object graph — `workspaceSet.active.editor.selectLine` — with no
store indirection between the agent and the state. In
[Invar](/examples/invar), that graph is queryable *from outside the
process* by dotted path: agents verify their own work by asking the
program, not by parsing screenshots. When the object tells the truth, the agent can read it.

**Edits that land on live state.** ivue's thin-closure rule means
logic lives on the prototype, so an agent's edit
hot-grafts onto running instances — state intact, no remount, production semantics. The
agent-edit-verify loop runs against the live app instead of a
restart cycle.

## Small is a context-window property now

For years, 1.1 kB read as a bundle-size brag. In the AI era it
means something better: **the entire engine fits in one head — any
head.** A human holds the whole runtime model; an agent holds it
*perfectly*, with room left for your actual domain. Every kilobyte
of framework API is context an agent spends on the tool instead of
the problem — and every behavior too subtle to state in a rule is a
behavior agents will get differently each time.

> An API you can hold in your head is an API an agent can hold in
> its context — whole, with no paraphrase loss. Small stopped being
> a flex. It became a bandwidth requirement.

## The evidence is not hypothetical

This argument has a running proof: a full
terminal IDE — 94,054 source lines, 345 classes, built by an agent
fleet in twenty days on this exact substrate. The discipline numbers held while it tripled: zero import
cycles, zero module-level state, ten `computed()` calls, one
hundred percent class-shape conformance — each zero enforced
mechanically, on every merge. And the part that matters most for
this article's claim: the agents were not imitating examples. They derived patterns no human had shown them, because what they
were given was not a catalog but a model.

## The human counterweight

None of this is a framework *against* people. Read the list again —
one idiom, structural guarantees, a small API, legible state,
verifiable conventions — that is what senior engineers have begged
for on human teams for decades. Agents did not create these
virtues; they removed the tolerance for their absence. A human can
compensate for variance with experience and care, indefinitely and
expensively. An agent cannot compensate, so the structure has to —
and once the structure does, humans get the same gift: code where the care lives in the shape, not in the reviewer.

The claim is economic, and it is blunt: every unit of variance is
tokens an agent spends fighting the framework instead of building
your product — and the tempo data says that exchange rate is
steep.

## What frameworks compete on now

For thirty years, frameworks competed on what they let you express.
That contest assumed the scarce resource was human effort, and
expressiveness saved it. The scarce resources now are context,
verifiability, and drift-resistance — and those are won by
subtraction: fewer idioms, fewer bytes, fewer possible mistakes.

ivue got there by accident of honesty — three years of deleting
everything that did not have to exist, finished
the same day the agents arrived. The
result is a reactive framework whose entire contract an agent can
hold, whose violations a script can see, and whose failure classes
are not reviewed away but *gone*.

That is what "for the AI era" means here. Not a chatbot in the
docs. A substrate an agent cannot hold wrong.
