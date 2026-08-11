---
title: 'Invar — a terminal IDE built on ivue'
description: 'The largest ivue application in existence: a full terminal IDE — editor, workspace search, tasks, terminals, agents — running on ivue classes in a Bun process with no DOM. 94,054 source lines, 345 classes, 35 invariant contracts, zero import cycles.'
pageClass: examples-page
---

# Invar — a terminal IDE built on ivue

[Invar](https://github.com/infinite-system/invar) is the largest ivue
application in existence: a full terminal IDE — editor, file tree,
workspace search, find/replace, git, tasks, terminals, LSP, and agent
integration — built **entirely on ivue classes**, running under
Bun in a terminal with no DOM and no Vue components.
The same `Reactive()` and `Static()` that drive the browser examples on
this site drive every keystroke of it; only the paint target changed.

Invar is an **alpha, experimental project** — a proving ground for ivue
beyond the web, and an experiment in *agentic development*: AI agents
wrote almost all of it, using [the ivue skill](/guide/standard) as their
base discipline, with every module governed by explicit invariant
contracts and a merge gate that enforces them. The story of how that
worked is a series on the blog, starting with
[Introducing Invar](/blog/introducing-invar) and
[AI agents built an editor](/blog/agents-built-an-editor).

## The frames below are real

Every screenshot on this page is live output from the running app —
rendered cell-for-cell from its PTY grid to SVG, per-cell colors and
styles intact. Nothing is mocked and nothing is captured; the images are
queries against the program's own state.

<PerfSlider>

<figure class="invar-figure">
  <img src="/invar-editor.svg" alt="Invar editor with file tree and structure outline" loading="lazy" />
  <figcaption>The editor — file tree, syntax-highlighted source, structure outline.</figcaption>
</figure>

<figure class="invar-figure">
  <img src="/invar-search.svg" alt="Invar workspace search with streaming results, tasks pane, and terminal" loading="lazy" />
  <figcaption>Workspace search streaming ripgrep results — click a match, land on the line.</figcaption>
</figure>

<figure class="invar-figure">
  <img src="/invar-find.svg" alt="Invar in-file find bar with live matches" loading="lazy" />
  <figcaption>In-file find — live match highlighting, case, whole-word, and regex toggles.</figcaption>
</figure>

<figure class="invar-figure">
  <img src="/invar-quickopen.svg" alt="Invar Quick Open fuzzy file picker" loading="lazy" />
  <figcaption>Quick Open — fuzzy go-to-file with exact-basename ranking.</figcaption>
</figure>

<figure class="invar-figure">
  <img src="/invar-tasks.svg" alt="Invar tasks pane beside a terminal running the task tracker" loading="lazy" />
  <figcaption>The agent fleet's task dashboard — one shared renderer for pane and CLI.</figcaption>
</figure>

</PerfSlider>

## The numbers

Counted from the open repository, 2026-08-11 (its own deterministic
census script plus AST checkers; source excludes tests):

```
source lines                94,054   across 372 files, 37 modules
classes                        345   100% namespace-pattern conforming
Reactive() classes              79
Static() capability classes    198
invariant contracts             35   (~14,000 lines)
value-import cycles              0   (Tarjan over the import graph)
computed() calls                10   (memoization is opt-in)
module-level variables           0
```

Those zeros are not tidiness — they are the ivue discipline holding at
scale, mechanically enforced on every merge. How each one is achieved
has its own deep dive:
[zero import cycles](/blog/circular-imports-dissolved),
[zero module-level state](/blog/module-level-state),
[ten computed() in 94k lines](/blog/reactivity-is-an-allocator).

## What to study in the source

Invar is open as a study-scale example of ivue architecture — the
patterns from this site's guides, applied at three orders of magnitude:

- **The [namespace pattern](/guide/namespace-pattern) everywhere** —
  345 classes, one export shape, cross-module references that resolve
  at first access.
- **79 [`Reactive()`](/guide/standard) classes,
  198 [`Static()` capability classes](/guide/static)** —
  file system, subprocesses, PTY file descriptors, and native library
  handles behind `$`-cached static getters.
- **The [flyweight pattern](/guide/flyweight)** rendering
  editor text at O(viewport) — the same architecture as the
  [20-million-cell grid](/examples/flyweight-grid), driving a real
  editor.
- **Reactivity as resource governor** — SQLite connections, LSP
  servers, and timers that [exist only while
  observed](/blog/reactivity-is-an-allocator).
- **Invariant contracts** — every module ships a `*.invariants.md`
  stating what must hold, what is impossible if it does, and how it is
  verified: [uniformity as an instrument](/blog/uniformity-is-an-instrument).

**[github.com/infinite-system/invar](https://github.com/infinite-system/invar)** —
clone it, run `bun start`, and read the modules with the guides open
beside them.
