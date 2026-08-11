---
title: 'Reduction to modularity, vibe-coded'
description: In one day, AI agents extracted a monolith's git, markdown, file tree, settings, and keybindings into plugins behind enforced boundaries — directed by one human talking casually. The care didn't come from the model. It was moved into the structure.
date: 2026-07
---

# Reduction to modularity, vibe-coded

<BlogPostDate />

![Reduction to modularity, vibe-coded](/blog/reduction-to-modularity.png)

Modularizing a working application is the kind of refactor that is
usually done meticulously, by senior humans, over a quarter: draw the
boundaries, argue about them in design review, migrate one subsystem
at a time, hold the line in code review forever after.

On July 26, 2026, the [Invar](/examples/invar)
editor went through that entire arc in one day — 76 commits on main,
every one behind a mechanical merge gate — and the human directing it
was, in his own words, *vibe coding it*. Messages like "the glyph for
git is kinda sucky though" and "browsing commits is not fun and doesnt
work properly" went in; gated, invariant-recorded architecture came
out.

What landed, in order:

- **Workspace became a pure canvas.** Git state, diff state, and
  markdown left the host. 43 scattered mode checks collapsed into 2
  capability questions. `grep -icE "diff|markdown"` over the host
  returns 0, and a boundary check in the gate fails any commit where
  host code names a plugin.
- **The plugin kinds got named** — and the taxonomy was tested against
  every existing citizen before it was trusted. *Contributors* push
  registrations into the canvas. *Providers* answer typed questions.
  *Hosted runtimes* exchange an owned stream with one reactive owner.
  One authority per boundary contract, with recorded impossibilities:
  a provider cannot paint; a contributor cannot answer position
  queries; a runtime cannot touch the reactive graph directly.
- **The file tree became a plugin** — after the reduction forced an
  honest split: document opening is host furniture (Quick Open,
  tabs, and navigation never consulted the tree), the tree view is a
  contributor. A zero-plugin build has no sidebar and that is now a
  literal, recorded claim rather than a slogan.
- **Plugins got their own settings and keybindings.** Not a manifest
  file format — typed registrations on the existing contribution
  context. Plugin bindings form a registry layer above the host floor
  and below user rebinds; a plugin that tries to register a *reserved*
  chord is refused at registration. The acceptance test overshot:
  the count of source-control lines in the host keybinding table went
  from 13 to **0**.
- **Keyboard ownership got its invariant**: the focused surface owns
  the keystroke; the host claims a minimal reserved set, each chord
  carrying a written warrant. Every F-key was retired for modifier
  chords — and every replacement was *proven to arrive* through a real
  PTY on both terminal parser generations, because measuring the
  codebase's own claims found three of them false, including the one
  the whole F-key design had rested on.

The same day also produced structural code folding (folding and word
wrap now contribute to one shared line-to-row generator, because two
mappings consulted by different consumers *will* disagree), inline AI
rewrites through a swappable provider port, two operating-system-level
root causes in the PTY layer, and a machine-wide scheduling lock that
turned a fog of "flaky tests" into a two-way classifier: load flakes
versus real intermittent defects with nowhere left to hide.

## The trick is that there is no trick

Nothing about the model changed at midnight. What made casual
direction produce architecture-grade output is that **the
meticulousness humans usually supply by vigilance had been moved into
the substrate**, in three layers.

**The invariant contracts are the design review.** The repository
carries 32 recorded invariants, each with a scope, a mechanism, and —
the load-bearing part — an *impossible-if-true* list. "A claim may not
derive its occupancy from the aggregate it feeds" exists because an
extraction produced a boot-time cycle once; now every later extraction
is checked against it mechanically. A human architect applies such
rules by remembering them in review. Here, forgetting is not an
available failure mode.

**The gate converts vibes into evidence.** Every landing runs the
type checker, 1,500+ unit tests, ~60 driven PTY smokes that operate
the real program through a real terminal, a plugin-boundary scan, a
coverage ratchet that refuses undeclared assertion loss, and a
performance trend detector with a positive control. The human can
afford to say "something is nagging the scrolling" precisely because
the system demands the fix arrive with paired measurements and a
ratchet. Loose input is affordable when output discipline is
mechanical.

**ivue removes the failure class that punishes speed hardest.** The
classic modularization killer is the mysterious initialization-order
bug — works unless module A loads before module B. The `Static()` /
`Reactive()` namespace discipline resolves members at call time, not
import time, so there is no hidden load order to get wrong; attach
order is explicit data in the plugin contracts. The two dependency
cycles the extractions did produce failed *instantly and loudly* — a
stack overflow at boot, caught by a smoke, fix site in the trace.
The bugs that remain are the debuggable kind. Velocity stops
compounding into swamp.

## The part the human still does

Reading that day's transcript, the human's contribution is not
carefulness — it is *judgment at the reduction points*. Deciding that
document-opening is host furniture but the tree view is not. Deciding
the capsule vision waits until the architecture is refined, but its
simple core (per-workspace agents that resume their sessions) folds
into the extraction. Vetoing a glyph. Noticing that browsing commits
"is not fun."

Everything below that judgment line — the boundary enforcement, the
proof that a chord actually arrives, the check that a hover doesn't
paint one row too low, the discipline of never landing on a red
without proving the red pre-existed — is structure. And structure,
unlike vigilance, doesn't get tired at 4 a.m., which is incidentally
when several of these landings happened.

That is the actual demonstration. Not that an AI can write a lot of
code — that is old news. That **reduction to modularity, the most
meticulous work in software, survives being directed casually when
the care lives in contracts, gates, and a substrate that makes
carelessness fail loudly instead of mysteriously.**

The greps are in the repo. Run them.
