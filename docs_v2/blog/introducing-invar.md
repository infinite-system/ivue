---
title: 'Introducing Invar'
description: 'A full IDE that lives in your terminal — file tree, git, LSP autocomplete, integrated AI agents that can watch your shell — built almost entirely by AI agents under a mechanical referee, on one kilobyte of ivue.'
date: 2026-07
---

# Introducing Invar

![Introducing Invar](/blog/introducing-invar.png)

Invar is a code editor that lives entirely in your terminal. Not a
text editor with syntax colors — an IDE: file tree, buffer tabs, a
git panel with staged/unstaged flows and side-by-side diffs, blame,
commit history, language intelligence with hover, diagnostics,
go-to-definition and caret-anchored autocomplete, an integrated
terminal with staged command execution, image preview (yes, in the
terminal), audio narration of AI responses if you want it — and AI
agents as first-class citizens of the workspace, not a bolted-on
chat box.

It is named after the alloy that does not deform when heated.
Both readings are intended: the codebase is governed by written
**invariants**, and the editor is engineered to be the
**lowest-heat** way to edit code — it never pays for work you
did not ask for.

## What it feels like

You open it in any terminal, over any SSH connection, in about the
time it takes your shell prompt to draw. Everything on screen is
reachable two ways, by rule: every keyboard action has a visible
mouse path, and the mouse paths are real — click a splitter and drag
it, click the layouts button and pick a preset, click the gear, click
the ✕. The rule exists because terminal keyboard handling across
emulators is the flaky channel, so the mouse is the reliability
floor — a philosophy you feel most when something else is broken and
Invar isn't.

Scrolling glides with momentum physics tuned like an instrument — a
lone wheel notch moves precisely, a sustained fling accelerates, a
reversal stops and turns, deterministically. Tab switching is
instant on files of any size, because every hot path is O(viewport):
the editor renders the window you can see and maintains exact
aggregate knowledge (like the widest line in the document) through
localized bookkeeping instead of full scans. Twenty-six thousand
lines of TypeScript, and the idle CPU cost is zero — a frame renders
only when something changed.

## The agent is a citizen, not a plugin

Invar embeds real coding agents — Claude and Codex today — behind one
backend seam. The agent pane is a pane like any other: it splits
beside the terminal, reorders, queues your messages while a turn runs,
cancels with Escape, and tells you honestly when a backend has gone
quiet. The agent can type a command into your terminal — animated,
staged, waiting for *you* to press Enter — and with the terminal
observer it can *watch your shell*: command boundaries and exit codes
flow to it as structured, redacted events, and a footer control picks
the policy — respond to every command, only to failures, or accumulate
context silently so your next question already knows what happened.
Everything it sees passes a redactor first; passwords and secrets
never reach a model.

## How it was built is the actual headline

[AI agents wrote almost all of it](/blog/agents-built-an-editor).
Not as a stunt — as the operating model. On the heaviest day so far,
a fleet of builder agents landed some fifty changes to main in
twenty-four hours: new features, physics tuning, a codebase-wide
structural conversion, regression hunts — with zero regressions
shipped. That throughput is not a property of the agents. It is a
property of the method:

**Written invariants.** Every module carries a contract file stating
what must always hold, what it generates, and what becomes impossible
if it is true. Agents read them, extend them, and are judged
against them.

**A grammar, enforced by AST.** Every production file has the same
shape — one class, uniform member discipline, everything overridable,
[no initialization-order traps](/blog/the-constraint-that-unlocks),
a colocated test. A ~200-line checker rejects violations at the gate.
Uniform shape is what makes a fleet of independent builders converge
instead of drift.

**The referee.** Nothing lands without the full gate: type check,
grammar check, invariant-contract check, ~1,300 unit tests, and a
registry of fifty-plus *driven* smokes — a real PTY, a terminal
emulator as oracle, byte-level assertions on the actual screen. Not
"the function returned the right value" — "the pixel-cell at the
splitter is hover-lit when the mouse is there."

The result is software where the [object graph](/blog/the-object-graph-they-took)
has been restructured wholesale multiple times in a single week, at
the cost of the diff, because the
[architecture cannot tangle](/blog/the-brick-the-editor-the-referee)
and the referee proves each reshape changed nothing it shouldn't.

## On one kilobyte

All of it stands on [ivue](/guide/introduction) — about a kilobyte of
reactive engine. Plain TypeScript classes, made live: state is
reactive, inheritance works and stays reactive through `super` chains,
every member is an override seam, and the one coarse render effect
repaints exactly when a signal it read has changed. There is no
framework in Invar in the usual sense — no store, no reducer, no
render tree to reconcile. There are objects, telling the truth,
and a loop that asks them what changed.

Invar is the existence proof we built for a set of claims that sound
like slogans until you watch them hold under load: that classes plus
a referee beat functions plus convention; that total extensibility is
affordable when behavior is mechanically proven; that JavaScript's
[dynamism is a strength](/blog/the-weakness-was-the-strength) once it
has a witness; and that an AI fleet with written contracts can build
and maintain real software faster than the industry believes — without
the quality collapse the industry predicts.

The repo is open. Read the invariants files first — they are the
truest documentation any of our software has ever had — then watch
the gate run. The editor is what it produces.

**[github.com/infinite-system/invar](https://github.com/infinite-system/invar)**
