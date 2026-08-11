---
title: 'AI agents built a 26,000-line code editor on ivue'
description: A working terminal code editor, written almost entirely by AI agents — zero cycle-breaking hacks, one computed() in the whole codebase, one wiring seam. What a substrate is worth when the author is a machine.
date: 2026-07
---

# AI agents built a 26,000-line code editor on ivue

<BlogPostDate />

![AI agents built a 26,000-line code editor on ivue](/blog/agents-built-an-editor.png)

There is a terminal code editor called
[Invar](/examples/invar) — named after
the iron–nickel alloy engineered in 1896 to have near-zero thermal
expansion; precision clocks were built from it because **it does not
drift**. The editor has a file tree, a real
text editor with word wrap and emoji-aware columns, fuzzy go-to-file,
find & replace, a git panel with side-by-side diffs and staging, LSP
hover cards, a command palette, and tabs. It runs on Bun, renders
through a terminal framebuffer, and its entire model layer is ivue.

It was built almost entirely by AI agents, in 292 commits. And the
measurements it produces are the point of this post.

Counted over the repository (all `src/**/*.ts`, July 2026): 153
TypeScript files, 25,890 lines including its 57 test files. 42 classes
export through `Reactive()`. 34 stateless capability classes export
through `Static()`. And two counts that would run to dozens in most
codebases this size:

- Lazy imports or comment-marked workarounds that exist to break
  circular dependencies: **zero**.
- Derivation caches — `computed()` calls: **one**, in the entire
  editor.

Those numbers are not tidiness. They are the substrate doing work.

## No DOM anywhere

First, the quiet result: there is no Vue component, no SFC, and no DOM
in this program. ivue drives a terminal — classes hold state in
ref-getters, watchers repaint the cells that changed, and Vue's
reactivity runs as pure signal machinery under a framebuffer.

ivue was never a component accessory. It is a model layer that happens
to plug into Vue templates when templates exist. An editor that ships
without a single component is the strongest form of that claim.

## The author changed, so the substrate math changed

Almost nobody hand-writes 26,000 lines anymore. The economics of
software authorship have shifted to agents — and agents change what a
substrate is worth, because agents are **stochastic rule-followers**.
Ask one to follow a convention and it complies at some rate slightly
below 100%. Per edit, the gap is negligible. Over hundreds of commits,
a per-edit violation rate compounds into a certainty.

That splits every safety property into two kinds:

> Discipline-based safety degrades with scale. Construction-based
> safety doesn't.

A rule that says *be careful about import cycles* is discipline: it
fails stochastically, and a large codebase takes enough edits to make
the failure guaranteed. A pattern where the dangerous moment
structurally cannot occur is construction: its violation rate is zero
no matter how many edits land, because there is nothing to violate.

The wider ecosystem shows what discipline costs at scale. Interactive
apps built on coarse-grained re-rendering evolve the same organs under
pressure, in public: hand-rolled external stores with selector
subscriptions to escape subtree re-renders, hundreds of memoization
call sites, and finally a compiler whose job is to automate the
memoization. Automating a tax is real progress — but it is not the
same as the tax not existing. Fine-grained reactivity — the model
Solid.js runs on, the model Svelte 5's runes adopted, the model Vue
itself is moving toward with Vapor — has no such tax to automate. In
ivue, a ref change re-runs exactly the effects that read it, and a
derivation is a plain getter — re-run on tracked reads, costing zero
bytes per instance.

That is why the editor contains exactly one `computed()` in 26,000 lines.
Its gutter diff map caches behind `computed()` because alignment is
document-sized work while cursor repaints are frequent — and the call
site carries a comment saying precisely that. One cache, opted into
surgically, with a written justification; every other derivation in
the editor is a plain getter. That is
[the doctrine](/blog/computed-is-a-cache) — `computed()` is a cache,
not a derivation — surviving contact with a real editor, at a ratio of
one to everything else.

## Cycles can't happen, so no one fights them

The deeper zero is the circular one. Module cycles are the classic
scale disease: `Cannot access 'X' before initialization`, files created
solely to host a constant that two modules both need, lazy imports
buried inside functions with a comment explaining which cycle they
break. Every one of those artifacts is discipline — a patch applied at
one edge of the import graph, by someone who got bitten there.

The [namespace pattern](/guide/modules) removes the disease instead of
treating bites. Every cross-module reference is late-bound — getter
bodies, method bodies, a `Static()` seam — so nothing reads another
module's value while modules are still initializing. The import graph
can contain cycles that never manifest, because binding happens at call
time, not load time.

The property is **per-edge**, and that makes it scale-invariant: it
holds identically at 5,000 lines and 500,000, because each reference is
still late-bound regardless of how many exist. The editor's git, workspace,
editor, and UI modules reference each other freely across 153 files.
Chains like *workspace → active tab → editor → viewport* compose
through the graph without a single ordering concern — and the grep for
cycle workarounds returns zero, after 292 commits by authors who were
never once told to be careful.

For an agent fleet, this is the whole ballgame. An agent that hits a
cycle failure burns a session diagnosing initialization order — and
every workaround it lands becomes **context tax on every future
session**, which must rediscover the hack, understand why it exists,
and preserve it. An invariant that holds by construction costs zero
context, forever. The cheapest thing an agent can maintain is a
codebase where the failure class isn't in its world.

## One seam, applied 34 times

The editor's stateless capabilities — file system access, git commands,
parsers, clocks, clipboard, status channels — all export through the
same three-line shape:

```ts
export namespace Files {
  export const $Class = $Files; // raw — children `extends` this
  export let Class = Static($Class); // bound — you call this
}
```

[`Static()`](/guide/static) binds the class's methods lazily with
stable identity, and the mutable `Class` slot stays replaceable — by a
test double, a plugin, a fork — with no dependency-object threading. A
human team might debate whether one uniform seam beats a bespoke,
explicitly-typed injection shape per subsystem. For an agent the
question dissolves: applying one known pattern is the thing it does at
the highest fidelity, and 34 identical seams cost less to write,
verify, and gate than 34 designed ones. The project enforces the seam with a
static-analysis check in its merge gate, so the uniformity is
construction too, not habit.

## Gates instead of vigilance

The same philosophy runs through how the editor verifies itself. Each module
carries a colocated invariants contract — the load-bearing rules of its
domain, each stating what becomes impossible if the rule holds. A merge
gate verifies them by driving the real user path: injecting input,
reading the rendered framebuffer, and blocking any commit that
regresses a contract. Not "the agents were careful" — the gate makes
carelessness unmergeable.

That is one lesson generalized: never trust discipline where you can
install construction. Choose substrates where the failure classes are
absent, write contracts for what remains, and let gates — not
vigilance — hold the line. Agents thrive under exactly this regime,
because it converts quality from a per-edit probability into a
structural fact.

## Where the gate came from

The part no grep can show: the discipline was not installed on day
one. The editor is built semi-autonomously — agents write nearly all
of the code, and one person steers. The steering has a single,
repeated shape: at every decision, push the work toward its
*invariants* — the rules of the domain that hold regardless of
implementation, each stated with what becomes impossible if it holds.
Out of that repetition the project's structure crystallized: the
colocated contracts, then the merge gate that verifies them by driving
the real user path, then the static checks that enforce the seam. The
agents built their own quality infrastructure, because the guidance
kept demanding a standard the infrastructure is the cheapest way to
meet.

That is the general recipe this project demonstrates, and none of it
is editor-specific. Pick a substrate whose failure classes are absent
by construction. State the domain's invariants explicitly. Let agents
generate against them, and let gates — not vigilance — hold the line.
The human contribution concentrates where it is irreplaceable: knowing
*which* rules are load-bearing. The result here is 25,890 lines with
one cache, zero cycle workarounds, and zero apologies — an editor that
holds its shape under heat, like the alloy it is named for.

The model layer under all of it is
[1.1 kB](/blog/one-kilobyte-feature).

---

*The numbers in this post are measured, not promised: file, line,
commit, and call-site counts come from `find`, `wc`, `git log`, and
`grep` over [the editor's repository](https://github.com/infinite-system/invar)
in July 2026 — run them yourself. The reactivity and
teardown claims about ivue itself are the engine's
[documented invariants](/reference/invariants), verified by its test
suite at 100% coverage.*
