# PROJECT architecture invariants

This is the living architecture contract for PROJECT. Replace PROJECT with the project or
subsystem name, and replace the provisional examples with evidence-backed invariants.
Invariants are **unnumbered** — the name is the identifier, unique within this file, and
referenced by name (never by number). Name in plain declarative style: a short sentence
stating the rule (subject + verb + constraint, 3–9 words, sentence case, letters/digits/spaces/hyphens
only, concrete things not abstractions) — someone seeing only the name in a code comment should get the gist of
what not to break. "A non-ready route cannot transmit", not "Loud Over Silent". The file records two kinds of
invariants, and the split is itself load-bearing:

- **Reality-based invariants** are constraints discovered from how the world and
  the tools actually work. You can only _discover_ them; ignoring one breaks the system
  regardless of preference. Refine them only when evidence narrows or falsifies their scope;
  never rewrite them merely to admit a preferred change. A reality invariant that is only
  reality *inside* this subsystem — chosen at a wider scope (a consumer's contract, a platform
  guarantee) — carries a **Renegotiable at:** field naming that scope.
- **Chosen invariants** are intentional disciplines adopted and held
  consistently to keep the system coherent. Each _could_ be different and still coherent, but
  the system depends on it not drifting. Change one only through an explicit decision that
  records rationale, compatibility impact, and verification.

The dependency only ever points one way: **chosen invariants stand on reality invariants,
never the reverse.**

Write every field graspable, not clever: short active sentences, the codebase's real
identifiers (the tooling greps and re-resolves these), the same word for the same thing,
no metaphors. Invariant = one if-then. Evidence = pointers (`file:line`, test names).
Impossible-if-true = concrete events a bug report could match. Verification =
copy-paste-runnable.

Every invariant is provisional in the IBR sense even when its status is `established`. A
review must classify implicated invariants as untouched, upheld, strengthened, stressed,
violated, refines, discovered, or stale. Violations block approval until the code is fixed or
a chosen invariant is explicitly replaced — never edit an invariant to rescue an
implementation.

## Reality-based invariants

### State the rule as a short plain sentence

**Invariant:** If the scoped operational conditions hold, then state the behavior that follows independently of preference.

**Scope:** Name the exact conditions, subsystem, and boundaries.

**Renegotiable at:** Omit this field when the constraint is absolute; otherwise name the wider scope that owns it (e.g. "frontend API contract — version + migration + sign-off").

**Components:** Optional — only when the invariant is compound. Name each load-bearing part on one line; each must be delete-testable (if nothing breaks when it's removed, it isn't a component). Omit for atomic invariants.

**Mechanism:** Explain the bridge from the constraint to the observed behavior.

**Generates:** List what this invariant produces downstream — the designs, rules, and guards that exist because it holds. Optional but prized: an invariant that generates nothing is a description.

**Rejected alternatives:** Optional zombie-defense: one line per tempting-but-killed design (`<alternative> — <why it dies>`). Only recurring temptations; git holds the full history.

**Open question:** Optional, at most one line: the current frontier of doubt — what would refine this record. Replace when answered; never append.

**Enforcement:** Optional. `review-time — <one-line reason>` for invariants with no code locus (distributed disciplines): persists the coverage-triage decision and exempts the record from annotation-coverage reporting.

**Evidence:** Cite code, tests, traces, logs, measurements, or reproducible observations.

**Impossible if true:** State the concrete negative boundary that would falsify this invariant — what can never be observed while it holds.

**Verification:** Provide a reproducible command or inspection method.

**Status:** provisional

**Last refined:** 2026-07-19

## Chosen invariants

### State the discipline as a short plain sentence

**Invariant:** If the project operates within this design, then state the property the design must preserve.

**Scope:** Name the components and conditions governed by the decision.

**Mechanism:** Explain how the design rule preserves coherence or prevents invalid states.

**Generates:** List the concrete behaviors, guards, or structures this discipline produces.

**Evidence:** Cite the architecture decision and any tests or behavior already enforcing it.

**Impossible if true:** State what the design must make impossible.

**Verification:** Provide a reproducible command or review method.

**Status:** provisional

**Last refined:** 2026-07-19

## Impossibility boundary — what these invariants forbid

Optional closing section: one line per forbidden state, each naming the invariant that forbids
it. A change that introduces any of them is breaking an invariant, not adding a feature —
re-derive from the contract before writing it.
