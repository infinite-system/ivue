# Authoring guide — records and generators

Read before WRITING or refining records or generators (reviews don't need this file; the
annotation test and charset rules live in SKILL.md).

**Writing style — every field, graspable not clever.** The record is read mid-edit by
someone (human or AI) with thirty seconds, and consumed by the machinery: scope derivation
greps these files for identifiers, audits re-resolve the citations, Verification gets
executed. So:

- Short sentences, active voice, plain words. No metaphors, no wordplay — cleverness does
  not survive the trip into a debugging session.
- Use the codebase's **real identifiers** (actual file, function, table, env-var names),
  and the **same word for the same thing** every time — synonyms-for-elegance break the
  grep that makes content-implication scoping work.
- A field that runs past ~3 sentences is usually explaining two things: split into
  Components, or move the depth to a design doc and cite it.

Per field:
- **Invariant** — one if-then sentence: the "if" names the conditions, the "then" states
  what follows. States what IS, never "should".
- **Scope** — exact boundaries, such that a reader can answer "does this apply to X?" with
  yes or no.
- **Components** — one line each: name, then what it does.
- **Mechanism** — the causal bridge in 1–3 sentences: because <structure>, <behavior>.
  Name the actual code that embodies it.
- **Evidence** — pointers, not prose: `file:line`, test names, measurements. One step to
  follow.
- **Impossible if true** — concrete observable events that can never happen, phrased so a
  bug report could match them ("X receives prompt bytes after a refused resolution", not
  "inconsistency arises").
- **Verification** — a copy-paste-runnable command, or a mechanical inspection step.
- **Generates** — a list of concrete things (guards, rules, designs) that exist because
  this invariant holds.
- **Rejected alternatives** — one line per zombie: name the design, then the one reason it
  dies. No essays; the kill reason should fit the annotation test too.
- **Open question** — one line, present tense, answerable: what test or evidence would
  refine this record.

Meta-rule for every field: the contract is a **working instrument, not an archive** — git
is the archive. If content stops being load-bearing for a mid-edit reader, it leaves the
record.
