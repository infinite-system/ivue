---
title: 'What becomes buildable'
description: 'Frameworks made views cheap. ivue makes models cheap — big, long-lived, externally legible. Five categories of software that were blocked on exactly that: whole-dataset apps in the browser, software modified while it runs, agent-operable apps, reactive control planes, and architecture that cannot rot.'
date: 2026-08
---

# What becomes buildable

<BlogPostDate />

![What becomes buildable](/blog/what-becomes-buildable.png)

Every framework generation made *views* cheaper — faster diffing,
finer signals, less re-rendering. The model layer never got the same
gift: models stayed expensive to make big, tied to component
lifetimes, and opaque to everything outside the render loop. A lot
of software you'd like to build was never blocked on rendering. It
was blocked on models being **expensive, mortal, or opaque**.

ivue's whole design attacks exactly those three, so it's worth
naming what that opens — five categories, each unlocked by a
specific property.

## 1. Whole-dataset applications in the browser

**Unlocked by: cost proportional to what's observed.**

The intractable thing about a spreadsheet, a gigabyte log explorer,
or a genome browser was never painting it — virtual scrolling solved
that years ago. It was *modeling* it: mainstream reactivity charges
per entity that exists (a proxy here, a computed there, a
subscription each), so a million-row model collapses before first
paint, and everyone retreats to server paging and dead snapshots.

ivue charges per entity **observed**. Derivations are shared
prototype getters at zero bytes per instance; state materializes on
first touch; the [flyweight pattern](/guide/flyweight) drops per-cell
cost to [4.7 bytes across twenty million live
cells](/blog/twenty-million-cells). The consequence is an
architecture that used to be a joke: *the entire dataset is the
client-side model, fully reactive.* Excel-class spreadsheets. Log
viewers over raw gigabytes. Timeline and audio editors. BI tools
that pivot the actual data, locally. This one isn't a prediction —
the grid and the million-row scroller run on this site.

## 2. Software that's modified while it runs

**Unlocked by: the live class slot and identity-preserving
transforms.**

```ts
export let Class = Reactive($Class); // let — a live, mutable slot
```

That one keyword is the Smalltalk image made shippable: the next
call always lands in the newest version of the class, method edits
graft onto live instances with state intact, and implementations
swap under a running system. [Invar's sealed
kernel](/examples/invar) is the disciplined form — plugins fold
subclasses over class slots before boot, then the kernel freezes.

The category this reopens: **deeply extensible software**. In-app
plugin ecosystems with real typed classes instead of stringly
config. User-extensible tools at the level Excel macros hinted at.
Live A/B of *implementations*, not just flags. The JS ecosystem gave
this up when state got imprisoned inside component scope; objects
that outlive everything bring it back.

## 3. Agent-operable software, by construction

**Unlocked by: the legible object graph.**

Making software drivable by machines has always meant one of two bad
options: screen-scraping (brittle) or hand-building an automation
API that forever lags the UI (expensive). An ivue application's
model *is* the API:

```ts
workspaceSet.active.editor.selectLine(42)
```

One navigable graph — [the one the ecosystem
abandoned](/blog/the-object-graph-they-took) — path-addressable,
with no publish tax, the same state the UI renders. Invar runs on
this today: agents drive it, verify their own work against it, and
its test oracle is the model itself.

> Apps born with their machine interface. The copilot reads and
> writes the exact state the user is looking at, automation stops
> breaking on redesigns, and every app is one adapter away from
> being an MCP server.

Software that wants agents inside it — which is rapidly becoming
all software — currently pays a second-API tax to get there. Here
the interface falls out of the architecture.

## 4. Reactive control planes

**Unlocked by: observation-owned resources.**

In [Invar's backend](/blog/reactivity-is-an-allocator), database
connections, language-server processes, and timers exist only while
something observes them — reactivity working as the *allocator*,
with a pull floor underneath for correctness. Generalize that and
you get a systems discipline: process supervisors, dev-tool daemons,
home-automation and fleet dashboards where "what should be running"
is **derived state** instead of imperative choreography.

This is Erlang's supervision insight expressed in TypeScript, with
a reactive graph as the supervisor. It was intractable for a plain
reason: backend code never had a reactivity substrate, and frontend
reactivity was never trusted near file descriptors. Both halves of
that objection are now dead in one codebase.

## 5. Architecture that cannot rot

**Unlocked by: the invariants layer — contracts, censuses, gates.**

Any codebase touched by enough hands erodes. Review vigilance stops
scaling at some contributor count; "the architecture" degrades into
a wiki page nobody obeys. The discipline built around ivue turns
architecture into something *executable*: invariant contracts
stating what must hold, AST censuses counting violations, merge
gates that reject what the model contradicts —
[uniformity as a measuring instrument](/blog/uniformity-is-an-instrument),
[zeros that hold while the codebase triples](/blog/the-zeros-didnt-move).

What that opens is a contributor scale that used to be
self-defeating: agent fleets as a normal construction method, teams
where the structure carries the care instead of the reviewers,
software in regulated domains whose properties are proven
continuously rather than audited annually. This is the multiplier
on the other four — big, live, legible models are only safe to
build *by many hands* when the discipline is mechanical.

## The shape of it

One sentence version: **frameworks made views cheap; ivue makes
models cheap** — big models, long-lived models, externally legible
models — and each category above is a product family that was
blocked on exactly one of those costs. One more we suspect but
haven't proven: local-first sync should get simpler on
identity-stable plain objects, where CRDT merging never fights a
proxy for object identity — a hypothesis waiting for its builder.

The substrate is [1.1 kB](/blog/one-kilobyte-feature), the
[Standard](/guide/standard) teaches it to your team and your
agents in one document, and the proof-of-scale
[runs a full IDE](/examples/invar). Pick a door.
