---
name: ibr
description: >-
  Load Invariant-Based Reasoning (IBR) as the session's reasoning engine. Use when the user
  invokes /ibr, says "use IBR", "reason with IBR", "IBR this", asks to "find the invariant of X",
  "reduce X to its invariant", requests a reduction session, a reasoning audit, a Two-Axis
  reconstruction, an impossibility boundary, or wants any problem attacked by structural
  reduction rather than convention. Loads the full framework, then applies it operationally —
  it does not explain the framework unless asked.
---

# /ibr [problem]

Load the IBR framework and operate with it.

## Load

**First check whether the framework is already in context.** It often is: injected via
`--append-system-prompt-file`, loaded by an earlier `/ibr` this session, or pasted into the
conversation. Telltales: the "Invariant-Based Reasoning (IBR) — Framework" document with its
axioms (Reality Has Invariants, The Breaking Principle, Scope…), the Wielder Principle, the
Truth-Over-Self-Protection Invariant. If present, **do not read the file again** — a second
copy pollutes context and adds nothing. Confirm in one line that the framework is already
loaded and proceed to Operate.

Otherwise, read `IBR.md` from this skill's directory — the framework travels with the
skill. If the user supplies a path explicitly, read that instead (even if a copy is already
in context — an explicit path means they want that specific version).

Read it completely. It is the method authority; this file only governs invocation.

## Operate

- **With a target** (`/ibr <problem>`, or `/ibr` invoked while work is in flight — the
  work is the target): apply the framework to it immediately — frame audit and bottleneck
  first, then the reduction cycle, then the generation/impossibility tests. Deliver the
  result, not a tour of the method.
- **Bare invocation**: confirm the framework is loaded in one line, then: "What's on your mind?"
- **Reason with IBR internally; speak natural language by default.** Surface axioms, operators,
  audit labels, or IBR vocabulary only when the user asks for the structure (a proof, a Two-Axis
  reconstruction, an audit trail) or when a framework term is genuinely the clearest way to say
  the thing.
- Apply the framework; do not analyze, summarize, or propose improvements to it unless that is
  the task.
- Honor the Objection Severity tiers in all critique: tag findings fatal / scoping / flag, and
  never present a flag with fatal rhetoric.
- The Wielder Principle applies to you: state how far your reduction actually reached, hold
  results as provisional, and mark what would falsify them.

## Companion

- `/invariants` — IBR operationalized for codebases: audits changes against a project's
  recorded invariant contracts (`*.invariants.md`), with its own checker, annotation, and
  audit machinery. **Route by target:** a codebase or architecture → `/invariants`;
  anything else → `/ibr`.
- The handoff runs both ways. `/invariants` names this skill as its method authority for
  contested verdicts and deep reductions. In the other direction: when an `/ibr` reduction
  lands on a load-bearing rule **about code**, do not leave it in conversation — switch to
  `/invariants` and propose it as a `discovered` contract record, where it gains
  enforcement instead of evaporating when the session ends.
