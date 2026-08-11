---
title: "The editor tripled. The zeros didn't move."
description: Three days after we measured Invar at 26,000 lines, it passed 69,000 — 396 commits in three days, six new organs, a multi-provider agent harness. Every discipline metric we published held. A follow-up with the greps re-run.
date: 2026-07
---

# The editor tripled. The zeros didn't move.

<BlogPostDate />

![The editor tripled. The zeros didn't move.](/blog/the-zeros-didnt-move.png)

Three days ago we published
[measurements of Invar](/blog/agents-built-an-editor) — the terminal
IDE that AI agents build under written contracts and a mechanical
referee: 25,890 lines, 153 files, 292 commits, zero cycle-breaking
workarounds, one `computed()`.

The fair skeptical response was: *sure — at 26,000 lines. Discipline
is cheap when the codebase is young. Come back when it's big.*

It took three days to get big. **396 commits later** (158 of them in
one 24-hour stretch), Invar stands at **68,936 lines of TypeScript
across 390 files** — 49,393 of source, 19,543 of tests — with six new
subsystems, including the
[native agent harness](/blog/introducing-invar) with four provider
integrations and a text-to-speech narration engine. The codebase
grew 2.7× in the time it takes most teams to review one pull request.

So we re-ran every grep from the first post, on the tripled animal.
All counts measured 2026-07-26, reproducible from
[the repository](https://github.com/infinite-system/invar).

## The re-run

| discipline metric | at 26k lines | at 69k lines |
| --- | ---: | ---: |
| cycle-breaking workarounds (lazy imports, "breaks cycle" files) | 0 | **0** |
| memoization calls (`useMemo`/`useCallback`/equivalents) | 0 | **0** |
| lint suppressions (`eslint-disable`) | — | **0** |
| type suppressions (`@ts-ignore`/`@ts-expect-error`) | — | **1** |
| `computed()` in the entire codebase | 1 | **2** |
| multi-hop object-graph call sites (`workspaceSet.active…`) | 75 | **239** |
| colocated invariants contracts | 14 | **20** (7,053 lines) |
| tests | 384 | **1,371** (16,087 assertions, zero failing) |

Three of these numbers deserve their footnotes, because the footnotes
are the point.

**The one type suppression** is in a *test* — a deliberate
`@ts-expect-error` asserting that the type system **rejects** an
unkeyed read it must reject. It is not a suppression; it is a negative
type test. The single exception in 69,000 lines exists to verify a
rule.

**The second `computed()`** follows the same doctrine as
[the first](/blog/agents-built-an-editor): a revision-fold cache on a
pane's render version — document-sized work reused across frequent
repaints, opted into surgically. Derivation caches grew from one to
two while the codebase grew by 43,000 lines. Everything else remains
[plain getters](/blog/computed-is-a-cache).

**The 239 deep chains** are the
[object graph](/blog/the-object-graph-they-took) claim, stress-tested:
multi-hop navigation more than tripled alongside the code, written by
agents that have still never once been bitten by initialization
order. Per-edge immunity is scale-invariant — that was the theory;
this is the third data point on the curve.

## What the growth actually was

Not padding — organs. Since the first measurement, the fleet shipped
the native agent pane (session, transcript projection with search,
composer, permission membrane), **four agent provider integrations**
— Claude over the CLI's structured event stream and over the SDK,
Codex two ways — behind one backend seam with a registry, plus two
scripted doubles that let the entire harness verify with no network
and no API key. A narration module speaks agent responses through a
swappable text-to-speech seam. Image preview renders pictures in the
terminal. Search, navigation, and diagnostics became modules. Each
arrived with its invariants contract, mirroring the module before it.

One seam shape, applied again and again — the pattern the
[first post](/blog/agents-built-an-editor) called an agent-economics
win, now measured at **94 `Static()` seams and 61 `Reactive()`
classes**.

## The referee debugged itself

The most instructive artifact of the three days isn't a feature. Mid
sprint, the fleet ran a reliability census on its own merge gate:
pulled every gate log on disk — **121 runs, 97 green, 33 rescued
retries** — and instead of shipping past the flakes, taxonomized
them. Four fragility classes fell out: clock-bound absence windows,
vacuous predicates, bare sleeps, and pipe backpressure.

Then came the reduction. All four classes are **one defect in
different costumes: a wait that is not a condition** — a test that
pauses instead of observing the state it is about to assert. The fix
was doctrinal, not case-by-case: every wait in the harness must be a
predicate the pre-action state cannot satisfy.

And the fleet drew a meta-lesson worth quoting verbatim, because it
is the whole contracts philosophy compressed:

> An invariant whose positive content is right but whose
> impossibility set is narrow protects nothing — the mistakes it
> fails to forbid are the ones people make.

The gate's existing rule had banned one wrong shape of waiting; the
two shapes it didn't name were both written. So the rule's *negative
space* was widened to forbid all three, with the legitimate
exceptions named. A test-reliability bug became a sharper law. That
is what it looks like when the referee is subject to its own regime.

The verification apparatus is now **39,493 lines** — the smokes,
drivers, and gate approaching the size of the source they verify. A
ratio like that is usually found in avionics. Here it is what lets
158 commits land in a day without a human reading most of them.

## What this settles

The first post argued that agents are stochastic rule-followers, so
**discipline-based safety degrades with scale while
construction-based safety doesn't**. That was one measurement at one
size. Now there are two sizes, 2.7× apart, and the discipline metrics
are flat: the zeros held, the exceptions stayed countable on one
hand, and each exception carries its justification in writing.

Vigilance dilutes as lines multiply — that is arithmetic. What
doesn't dilute is structure: cycles that cannot manifest, methods
that cannot unbind, waits that cannot pass vacuously, changes that
cannot merge unverified. Invar's velocity is not the interesting
number. Interesting is that **velocity and drift finally decoupled**
— the speed limit is the referee, not the typist.

The greps are one clone away. Run them at whatever size the editor
has reached by the time you read this — that's the experiment, and
so far it only goes one way.
