---
name: invariants
description: >-
  IBR invariant analysis of a posed change, question, or design against a project's recorded
  invariant contracts (*.invariants.md). Scope is DERIVED from the posed subject (touched paths
  + content-implication), never assumed. Use when asked to "check the invariants", "does this
  break/violate an invariant", "invariant-check this diff/merge/idea", BEFORE implementing a
  feature or design in a governed area (pose the plan — prevention is the cheapest use of
  this skill), to audit a merge against
  a subsystem's load-bearing rules, to validate a contract file, to audit the contract layer
  itself for staleness ("check the invariants", "is the contract still true?" — runs the
  checker + a freshness sweep against current code), or to bootstrap an invariants contract
  for a project or subsystem that has none. Verdicts distinguish violated vs stressed
  (holds only under a new unstated assumption) vs refines (the recorded statement itself should
  improve). Propose-only: never edits contracts or code without confirmation. Portable across
  repos, languages, and frameworks.
---

# /invariants [posed] [--scope a,b] [--depth verify|adversarial] [--check] [--audit] [--bootstrap]

Hold a posed subject up against every recorded invariant it implicates — and hold the
invariants up against reality (the code) at the same time. The contract file is *claims*; the
code is *reality*; disagreements in either direction are findings. Three outcomes are
first-class: the posed thing **aligns**, it **breaks** an invariant, or it **refines** one —
reveals the recorded statement was too narrow or wrong, and proposes the sharper shape.

**The unit of analysis is not a subsystem.** It is the posed change plus every invariant it
implicates. Subsystems are merely where invariants live.

**The mission:** this skill is the persistence-and-enforcement layer that keeps AI-developed
code from going brittle. Contracts carry constraints across sessions (each of which starts
amnesiac); annotations deliver them at the exact point of edit; reviews catch violations;
audits catch drift. Used consistently, the codebase accumulates structure instead of
entropy — every loop below exists to serve that.

Method authority: IBR. If the full framework is needed (contested verdict, deep reduction,
formal audit), load it via the `/ibr` skill; the compact cycle embedded
in step 4 is the operational core.

## Arguments

- **posed** — what is being checked, auto-detected by shape:
  - a **git ref or range** (`fdbea1a07`, `main..branch`, `HEAD~3..`) → change mode: read the
    full diff + commit messages
  - **free text** → question / proposed-design / pre-implementation mode ("what if identity
    came from an env var?", "I'm about to add bulk delete to the importer") — checking a plan
    BEFORE code exists is the cheapest run this skill has. Its verdicts are also the most
    evaporable: persist them — a dangerous plan-shape becomes a `Rejected alternatives`
    line, an accepted caution becomes an `Open question`, proposed in the same run
  - **empty** → the working-tree diff (staged + unstaged); if clean, the most recent merge
    commit; if that's ambiguous, ask. Disambiguation vs audit: audit-phrasing ("check the
    invariants", "is the contract still true?") means `--audit` even with a dirty tree;
    change-phrasing ("review this", "did I break anything") means the diff; truly ambiguous → ask
- **--scope a[,b]** — override/narrow the derived scope (names matching `<name>.invariants.md`).
  A correction flag, not the primary interface.
- **--depth** — buys independent verification, not extra care (the default single pass is already the full-rigor analysis):
  - _(default)_ single-pass, every verdict evidence-grounded in current code
  - **verify** — additionally spawn one independent subagent per implicated invariant to
    re-derive its verdict from the code with no shared reasoning
  - **adversarial** — verifiers are told to REFUTE each verdict (a verdict survives only if
    refutation fails), plus a completeness critic that sweeps the shadow set and the diff for
    invariants the main pass missed
- **--check** — mechanical validation only: run the bundled checker (see The checker)
  with `--all` (schema) and `--refs` (annotation drift, test-header proofs,
  source tripwires, and generator membership); report; no semantic analysis.
- **--audit** — freshness audit of the contract layer itself, no posed change needed. This
  is the mode for "check the invariants" / "is the contract stale?" (see Audit mode).
- **--survey** — cold-start step for an uncodified repo: enumerate candidate subsystems
  from STRUCTURE ONLY (directory tree, import graph, git churn — no file-reading, cheap by
  construction), rank by blast radius / churn×dependency / irreversibility, list up to 25
  with detail on the top 10. The human selects; the selection is recorded as a chosen
  record in the root `project.invariants.md` ("Core subsystems are contract-governed" —
  Scope lists them, Verification: re-run --survey and compare). Bootstrap then runs ONE
  subsystem at a time, hardest-first, never all at once.
- **--score** — the invariant score: audit mode plus a fold. Read `references/score.md`
  (rubric v1) BEFORE scoring. Two rules hold even unloaded: (1) the score is monotone in
  governed surface — less contract = lower score; no contracts = UNSCORED, never a number;
  (2) a score without its audit evidence attached is invalid. Headline is depth × breadth,
  never collapsed. Mechanical components come from the checker's `--score` JSON.
- **--bootstrap** — distill a new contract for a subsystem that has none (see Bootstrap
  mode). `--depth` composes with the main procedure, `--audit`, and `--score` only; it does
  not apply to `--check`, `--survey`, or `--bootstrap`.

## Procedure

### 1. Find the contracts

1. Enumerate `*.invariants.md` **in the checkout you're in** (`git rev-parse --show-toplevel`),
   excluding `node_modules` and any OTHER checkouts nested under it. Sibling worktrees (e.g.
   under a `.claude/worktrees/`-style dir) shadow every file — exclude them. From inside a
   worktree, its own files ARE current reality — never reach over to the main checkout's copies.
2. Also accept an explicitly supplied contract path. Every repo should carry a root
   `project.invariants.md` — the global contract: repo-wide invariants, the greenfield
   floor for new modules, and the governance record naming the chosen core subsystems
   (written by `--survey`). Small projects may use it as their only contract. The naming convention is
   always `<name>.invariants.md` — the name is the subsystem or project, nothing more (no
   `-architecture` or other suffixes).
3. If none exists: offer `--bootstrap`; do not create anything unrequested.

### 2. Derive scope

1. From the posed subject, derive implicated contracts three ways — union them:
   - **Annotation-implication:** `invariant:` annotations in touched code (see Code
     annotations below) implicate their named invariants directly — the strongest signal;
     the code itself declares what governs it.
   - **Path-implication:** for each file the diff touches, walk up the directory tree; any
     `*.invariants.md` at or above it is in scope.
   - **Content-implication:** grep every contract for the _terms the posed subject moves_ —
     identifiers, env keys, hostnames, table/column names, service names, function names.
     Path-touch alone misses conceptual reach; this is where seam violations hide.
2. **Greenfield floor:** new files/directories with no annotations, no upward contract, and
   fresh vocabulary implicate nothing by the three channels — so they get a floor instead:
   the NEAREST ancestor contract (walk up until one exists, else the root contract) plus
   every "X lives ONLY in Y" (sole-home/absence) invariant in scope-adjacent contracts,
   since new modules are exactly where forbidden capabilities get re-introduced. A report
   claiming "no contracts implicated" for new code must state which floor it checked.
3. For pure-text posed subjects: match the question's vocabulary against contract contents;
   ask only if genuinely ambiguous.
4. **Open the report by stating the derived scope and the evidence for it** — which files,
   implicated by which paths/terms — so a bad guess is loud and correctable with `--scope`.

### 3. Load the invariants

- **Mechanical first:** run the bundled checker (see The checker) with `--all` and
  `--refs` before any semantic work. Malformed records and orphaned annotations are
  findings in their own right (stale-class), reported alongside the analysis — a contract
  that doesn't parse can't gate anything.
- Parse each in-scope contract into named invariants. Canonical records follow the schema
  below; **respect local formats** (narrative or compact styles) — parse them as best-effort
  records and note they are non-canonical.
- Carry each invariant's **kind** — it constrains verdict semantics. Kind is DERIVED, not
  a schema field (writing `**Kind:**` into a record fails validation): the section carries
  it (`## Reality-based invariants` vs `## Chosen invariants`), and within reality, the
  presence of `Renegotiable at` distinguishes renegotiable from absolute. "Tagged" means
  derivable from those two signals; "untagged" means a local-format file where they are
  absent:
  - **Reality — absolute**: forced by how the world/tools actually work (physics, DNS, cookie
    jars, databases). Discovered, never chosen; renegotiable nowhere.
  - **Reality — renegotiable at a wider scope**: reality inside this subsystem, chosen at a
    wider one (a consumer's contract, a platform guarantee). The record names the wider scope.
  - **Chosen**: an intentional discipline, adopted and held consistently. Could be otherwise
    and still coherent; the system depends on it not drifting. ("Designed" is an accepted
    legacy alias.)
  - When a file doesn't tag kind, infer it and say so — it changes what a violation means.
  - The dependency rule: **chosen invariants stand on reality invariants, never the
    reverse.** A chosen invariant contradicting a reality invariant is itself a finding.
- Read the contract's Generator section and any linked standalone generator for composition
  context. A change can stress a mechanism while each gear survives alone. The records stay
  the truth; where a generator disagrees, the finding is against the generator.
- Build the **shadow set**: load-bearing rules stated in code comments, `*.design.md`, or
  readmes of the scoped folders but absent from any contract. Grep for `invariant`, `must
  not`, `never`, `always`, `load-bearing`, `guarantee`. Shadow invariants get analyzed like
  recorded ones AND reported as promotion candidates.

### 4. Analyze — one verdict per implicated invariant

Before any verdict, verify the invariant itself still holds in current code — a stale entry
is a finding in its own right. Also run the **vacuity test** on the record: a field that
cannot fail is not doing its job — an `Impossible if true` no bug report could ever match
("the system behaves incorrectly"), a `Verification` that verifies nothing (`true`, a
command unrelated to the claim), Evidence that exists but demonstrates nothing. The schema
checker validates shape only; vacuous-but-nonempty fields pass it. A vacuous field is a
`refines`-class finding — the record is not yet an invariant.

| verdict        | meaning                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| `untouched`    | not implicated — list compactly at the end, never padded with prose                                             |
| `upheld`       | implicated and respected — cite evidence (`file:line`)                                                          |
| `strengthened` | the posed thing makes violations harder or structurally impossible                                              |
| `stressed`     | holds only under a **new unstated assumption** — name the assumption, name the environment/case where it fails  |
| `violated`     | concrete failure scenario (inputs/state → broken outcome) + evidence                                            |
| `refines`      | the posed thing reveals the recorded statement is too narrow or wrong — propose the sharper wording             |
| `discovered`   | the posed thing embodies a load-bearing rule not yet recorded — propose the entry (see step 5)                  |
| `stale`        | the invariant no longer matches the code, independent of the posed change                                       |

Kind-aware semantics:

- **Reality (absolute):** `violated` is always a bug — the remedy is fixing the code (as a
  report demand, not a unilateral act); the invariant is not up for a vote. `refines` means
  mis-discovered — state the truer version.
- **Reality (renegotiable at wider scope):** a violation is a **coordination point** — name
  who sits at the wider scope (consumer, CI, another team) and what renegotiation looks like
  (versioning, migration, sign-off). Not fixable unilaterally, not vetoable locally.
- **Chosen:** a violation may be drift (fix it) **or** a legitimate re-choice — present it
  as a decision: what the discipline currently prevents, what re-choosing re-opens, what the
  replacement discipline would be. Never silently bless either side.

**Downgrade discipline (the gate's honest weak point):** every verdict that converts a
would-be `violated` into something that passes — `stressed`, `refines`, a chosen
"legitimate re-choice", a renegotiable "coordination point" — is high-stakes BY DEFINITION,
because the party choosing the verdict is the party that wants the change to pass. Each
downgrade must: name the evidence that distinguishes it from a violation, appear in the
report explicitly AS a downgrade, and — for gate-relevant cases — run under
`--depth verify` — and this escalation is SELF-APPLIED: the executor spawns the independent
verification for downgraded verdicts even when the user passed no `--depth` flag
("gate-relevant" = anything that changes PASS/BLOCKED). A downgrade without named evidence
is a violation wearing a verdict it chose for itself.
**The self-disarm path is a downgrade too:** if the posed change itself deletes or breaks a
record's Verification/Evidence artifacts, the record's failed re-verification was
MANUFACTURED by the change — treat it as `violated` with the restore-the-artifact remedy
(the audit's deletion guard applies at the gate, not only in audits), never as a quiet
`stale` that unblocks the gate.

For contested or high-stakes verdicts, run the compact IBR cycle audit the frame and find the
actual bottleneck · strip assumptions unsupported by evidence · construct the smallest
counterexample that breaks the candidate · run the generation test across valid cases · run
the impossibility test against the stated boundary · reconstruct the strongest serious rival
reading · state the surviving scope. Tag every finding with its severity — **fatal**
(defeats the change as stated), **scoping** (narrows it; restate scope and proceed), or
**flag** (record and move on) — and never present a flag with fatal rhetoric.

`stressed` is the verdict class reviews miss most. Calibration: a change that converts a
stack's identity to a shared-loopback hostname violates nothing but stresses an
identity-reflects-reality invariant under the unstated assumption "the browser shares the
stack's loopback" — false for a VM-hosted stack, invisible to violation-only analysis.

### 5. Reverse pass

Does the posed thing **embody an invariant not yet recorded**? A change that introduces a
discipline deserves a proposed entry in the contract's own format and kind taxonomy. Also
check the posed thing's _own_ internal consistency: does it hold the invariant it implies
everywhere it touches?

### 6. Report, then propose (never apply)

1. **Scope statement** — contracts in scope + why (step 2.3).
2. **Verdict table** — every implicated invariant, one line each, worst verdicts first.
3. **Detail** — only for `stressed` / `violated` / `refines` / `discovered` / `stale`:
   evidence, failure scenario or assumption, severity tag, and for renegotiable-reality who
   must be in the room.
4. **Shadow findings** — unrecorded invariants encountered, promotion candidates.
   (Boundary with `discovered`: shadow = found stated in code comments/docs during step 3;
   `discovered` = embodied by the posed change itself, step 5. If both apply, report once,
   as `discovered`.)
5. **Proposed edits** — concrete diff-style proposals across all three layers: contract
   records (refined wordings, new entries from the reverse pass, stale corrections, kind
   tags), missing/relocated annotations, and generator updates. **Adapt to each file's local
   format**; suggest (never impose) the canonical schema for files that lack structure.
   Apply only on explicit confirmation. Never modify enforcing code itself — findings about
   code are report items, not fixes.
   **Dependency ripple:** when a `refines` narrows or corrects a **reality** record, every
   chosen record standing on it is implicated by definition (the dependency rule) — re-derive
   each chosen record in the same contract (and generator compositions if one exists) against
   the refined wording in the same review; a reality refinement with unexamined dependents
   is an incomplete proposal.
   **Rename ripple:** names are coupled across contract, annotations, and generator links —
   a confirmed rename is applied together with every reference to it, in the same change
   (enumerate references by GREPPING for the old name and its slug across the checkout —
   `--refs` only lists breakage, not live references; after applying, re-run `--refs`: zero
   problems is the done condition, and it now validates contract-links in every md file,
   not just Generator sections and standalone files). Never apply a rename bare.
6. **Final verdict** — `PASS`, or `BLOCKED` naming each fatal finding. BLOCKED means: a
   `violated` verdict stands (the record's boundary is breached in substance — a vacuous or
   narrow `Impossible if true` wording does not rules-lawyer a real breach into PASS; fix
   the field via `refines` AND treat the breach on its merits) and no re-choice or
   renegotiation has been **accepted by the human in this confirmation** — tabled is not
   accepted; a proposed replacement discipline or a named coordination owner does not
   unblock anything until the human explicitly accepts it and the decision is recorded in
   the contract. `established` status makes this unconditional; for a
   `provisional` record, first re-verify it (Evidence real + Verification passing = treat
   as established for this gate; a provisional record that fails re-verification cannot
   block, but its failure is itself a `stale` finding). **Fix the code before changing the
   verdict; never edit an invariant to rescue an implementation** — "fix the code" names
   the remedy the report demands, not an action to take without confirmation.

**Proposals do not persist across sessions** (by design — no side queues, no drift-prone
pending files; an unconfirmed proposal is re-derived next time, and that cost is accepted).
Two things DO persist: a **declined design proposal** is recorded, with its reason, as a
`Rejected alternatives` line during the same confirmation — so the system never re-proposes
alternatives the human refused. **Scope of the ratchet: designs only, never reality.**
Findings that report a mismatch with reality (`stale`, `violated`, orphans) are NEVER
suppressed by a past decline — while the mismatch persists they reappear in every run,
marked "previously declined <date>", at flag severity. A fatigued "no" may defer a fix; it
must not be able to switch the detector off; and a confirmed rename ships
atomically with all its references (the rename-ripple rule) so a session dying mid-ripple
leaves detectable orphans, never silent drift.

Report length must track severity. A clean run gets ONE line — carrying provenance like the
audit one-liner: "all N implicated invariants upheld (K downgrades independently re-derived,
depth: <used>)" — a run that skipped independent verification must be distinguishable from
one that did it ("all N implicated invariants upheld, evidence checked" alone is not) — never a paragraph per upheld invariant. Padded all-clears teach
the reader to skim, and then a long report stops meaning "something is wrong".

## The record schema (canonical)

One contract file per subsystem, named `<subsystem>.invariants.md` and colocated next to the
code it governs (colocation is what makes path-implication work), or one
`<project>.invariants.md` at the root for a small project. Two sections in this order:
`## Reality-based invariants`, then `## Chosen invariants` (`## Designed invariants` is an
accepted legacy alias).

Each record:

```markdown
### A non-ready route cannot transmit

**Invariant:** If <scoped conditions hold>, then <what follows, independent of preference>.

**Scope:** Exact conditions, subsystem, boundaries.

**Renegotiable at:** <wider scope owner> — reality-kind records only; omit when absolute.

**Components:** Only when the invariant is compound (a violation could hit one part without the others). One line per part, each delete-testable — if nothing breaks when it's removed, it isn't a component. Omit for atomic invariants.

**Mechanism:** The bridge — why the constraint produces the observed behavior.

**Generates:** What this invariant produces/derives downstream (designs, rules, guards). Optional but prized — an invariant that generates nothing is a description.

**Rejected alternatives:** Optional zombie-defense against re-litigation. One line per killed rival: `<alternative> — <why it dies>`. Admit only alternatives that are actually tempting (already proposed once, or obviously going to recur); prune a line when its temptation dies. Not a history — git is the archive.

**Open question:** Optional, at most ONE line: the current frontier of doubt — what would refine or narrow this record, so doubt aims there instead of re-breaking the settled. Replace when answered; never append.

**Evidence:** Code, tests, traces, measurements, or reproducible observations. Cite precisely.

**Impossible if true:** The concrete negative boundary — what can never be observed while this holds. This field is what makes the record falsifiable; a record without it is not an invariant yet.

**Verification:** A reproducible command or inspection method.

**Status:** provisional | established

**Last refined:** YYYY-MM-DD
```

**Invariants are unnumbered.** The name is the identifier: unique within the file, carried
by section membership (not an ID letter). Reference invariants **by name, never by
number** — numbers are position-addressed and rot when a contract reorders or grows; names
travel intact across documents and time. (Numbered headings in older contracts — `PREFIX-R001 — Name` style — still parse,
with a migration note.)

**Naming style — plain declarative, not clever.**

- **Form:** a short declarative sentence stating the rule — subject + verb + constraint,
  plain words, concrete things (route, identity, cache — not abstractions). 3–9 words;
  needing more usually means the invariant is compound (use Components) or the precision
  belongs in the Invariant field. The name carries the gist; the if-then carries the spec.
- **The annotation test (the gate):** someone seeing ONLY the name at an enforcement point
  must get the gist of what not to break. "A non-ready route cannot transmit" passes;
  "Loud Over Silent" fails — a slogan that needs its body to decode is a lookup, not a
  constraint. A name failing this test is a `refines` candidate in audits and reviews.
- **Sentence case**, not Title Case. The name is a sentence, and code annotations match the
  heading byte-for-byte — the casing with fewer decisions produces fewer orphans.
- **Charset: letters, digits, spaces, word-internal hyphens only** — no commas, quotes,
  apostrophes, or dashes-as-punctuation (write "cannot", not "can't"). Load-bearing reason:
  annotations match byte-exactly, and quotes/dashes are exactly the characters editors
  silently rewrite (straight quote → curly, `--` → em-dash) — visually identical,
  byte-different, producing orphans that look correct on screen. Secondary reason: on this
  charset every platform's heading-anchor algorithm agrees with the canonical slug, so
  generator links click through everywhere.
- **Unique per file in slug-space** (case- and punctuation-folded) — slugs are reference
  identity. The checker enforces uniqueness as an error; charset violations are
  informational notes by design (legacy tolerance) — new names must comply.
**Writing style:** before writing or refining any record or generator, read
`references/authoring.md` — the per-field style guide (graspable-not-clever, real
identifiers, one-if-then, pointers-not-prose). Non-negotiable core, always in force: fields
are read mid-edit by someone with thirty seconds AND consumed by machinery (grep, citation
re-resolution, executed Verification) — plain, concrete, exact.

Category boundary: never rewrite a reality invariant by preference or to admit a change —
refine it only when evidence falsifies or narrows it. Change a chosen invariant only
through an explicit decision recording rationale, compatibility impact, and verification.
Never record speculation as `established`. Every invariant is provisional in the IBR sense
even when its status is `established`.

## The checker

`scripts/check_invariants.mjs` lives **inside this skill's folder** — locate it relative to
this SKILL.md; never assume a copy at the target repo's root, and never copy it into target
repos (one script, one truth). Single-file Node >=18, zero dependencies — works in any
environment, no Claude harness required (`--help` prints usage).

```bash
node <this-skill-dir>/scripts/check_invariants.mjs PATH    # one contract
node <this-skill-dir>/scripts/check_invariants.mjs --all   # every contract in the checkout
node <this-skill-dir>/scripts/check_invariants.mjs --refs  # annotation drift + coverage
```

Invoke it from anywhere inside the target checkout: `--all`/`--refs` root themselves at the
checkout's git toplevel and print `root …` so a wrong root is loud; pass ROOT explicitly to
override or when outside git. Exit codes: 0 clean · 1 findings · 2 usage/IO (including
`--all` finding zero contracts) — CI-able as-is. `--version` prints the version (one number covers checker and schema together):
copies of this skill travel by zip with no update channel, so when two machines disagree
about a contract's validity, compare versions FIRST — an older checker rejecting a newer
optional field (or missing a newer rule) is skew, not a real finding. CRLF/BOM are
normalized; fenced code blocks, HTML comments, and inline code spans are inert; field
values may wrap onto continuation lines and are read in full.

**Know its blind spots** (and reconcile them against step 1's manual enumeration):
- It skips `node_modules/`, `.git/`, `.claude/`, `scripts/retired-smokes/`,
  and any nested checkout (a directory with its own `.git` — printed as a
  `note:`). A contract living under `.claude/` is visible to manual
  enumeration but invisible to the checker, permanently — flag the
  divergence. Retired smokes are deliberately outside live annotation and
  contract coverage.
- Contract diffs deserve fence-vigilance: fencing a record's lines makes it INERT (the
  checker notes fenced record-shaped headings) — review a fence appearing around a record
  as a deletion, because for enforcement it is one. Likewise a new `.git` directory
  appearing in a subtree exempts that subtree (nested-checkout skip) — treat that diff as
  gate-relevant.
- It prints `note:` lines for nearly everything it cannot see: near-miss filenames (contract-shaped
  but not matching the glob — rename or confirm), skipped symlinks, files over 2MB, and
  nested checkouts. Treat every note as a finding to triage, not decoration. Annotation-shaped
  comments that don't parse (typo'd suffix, wrong brackets) are hard failures, as are
  pathless `invariant: Name` comments in code files; binary files and rendered `.svg` images
  mentioning `invariant:` draw a note (a screenshot of a code editor is output, not
  annotation-bearing source). Local-format contracts used as annotation targets draw a loose-harvest note.
- Non-canonical (local-format) files are `SKIP`ped, not failed — **every SKIP line is a
  migration-candidate finding**, and CI that wants a hard format gate passes `--strict`
  (with `--all`), which turns SKIPs into failures. The test suite sits alongside
(`node --test <this-skill-dir>/scripts/check_invariants.test.mjs` — target the file, not
the directory; directory mode would also execute the checker itself).

## Integration events — the unverified moments

A merge, cherry-pick, or rebase recombines contract-side and code-side changes **with no
session invoked and no textual conflict required**: a contract sharpened on one branch and
code written against the old wording on another merge cleanly into a violated state; a
`Status: established` promotion merged from a branch that never saw the record's new text
fabricates authority the gate then trusts. Git merges lines, not meaning.

Rules:
- After any integration that touched contracts, annotations, or annotated code: run the
  checker (`--all` and `--refs`) AND pose the integration itself (`merge-base..HEAD`) as a
  review. Put the mechanical layer in CI **on PR/merge** — not as a pre-commit hook
  (multi-step rename ripples and WIP records make pre-commit gates fire mid-work and train
  people into `--no-verify`, which removes the gate entirely).
- A `Status` promotion and a change to the same record's substance arriving from different
  branches = an unverified promotion: re-verify the record or propose demotion before
  trusting `established` at the gate.

## Code annotations — the reverse pointers

The contract points at code (Mechanism, Evidence). Code points back with an annotation
comment at each enforcement point, in whatever comment syntax the language uses:

```
# invariant: A non-ready route cannot transmit (patch-bay.invariants.md)
```

- **Format:** `invariant: <exact invariant name> (<repo-relative contract path>)` — one per
  line; the name must match the contract heading byte-for-byte (names, never numbers; a
  legacy Title Case heading is matched as written).
- **Where:** the enforcement points — the guard, chokepoint, or structure the invariant's
  Mechanism names; the exact places where a future edit would start violating. Not every
  usage site: an annotation states a constraint the code can't show on its own; scattering
  it everywhere is noise that trains readers to skip it.
- **Why:** annotated code is self-declaring. A diff touching it implicates the named
  invariant directly (step 2), and a developer or AI editing the spot inherits the "why"
  exactly where they would otherwise simplify the load-bearing thing away. This is what
  keeps AI-developed code from going brittle: the constraints travel with the code.
- **Write them:** when authoring or reviewing code that enforces a recorded invariant,
  propose the annotation alongside. Bootstrap mode proposes annotations for each mined
  invariant's enforcement points.
- **Drift check:** the bundled checker's `--refs` mode scans the repo for
  annotations and fails on orphans — names or contract paths that no longer resolve
  (renamed invariant, moved contract). An orphaned annotation is a `stale`-class finding.
  Run it alongside the contract checks.
- **Location rot** (the drift `--refs` cannot see): an annotation whose name still resolves
  but whose surrounding code no longer enforces that invariant is actively misleading —
  it teaches the next editor a false constraint. When reviewing or auditing annotated code,
  confirm the code still does what the annotation claims; propose removing or relocating
  the comment if not. A `stale`-class finding.
- **Coverage check:** the same `--refs` run prints `coverage` lines for canonical records
  no annotation references (informational — some invariants have no single code
  enforcement point). **Coverage proves a pointer exists somewhere, not that it sits at an
  enforcement point** — an annotation in a stray text file satisfies the checker; only
  location-rot review (below) validates placement. Records with
  `**Enforcement:** review-time …` are exempt from coverage by design (the honest home for
  no-locus invariants — see the triage ladder). During audits and reviews, treat uncovered invariants as work:
  find their enforcement points and propose the missing annotations. Absence of reverse
  pointers is how contracts and code drift apart silently.
- **Absence anchors:** an invariant enforced by a capability *deliberately not existing*
  (often the strongest enforcement) is annotated at the **boundary** — the file or module
  where a future editor would naturally introduce the forbidden capability. The comment
  guards the empty space: state the prohibition and where the capability legitimately
  lives. Annotate **both sides of the seam** for "X lives ONLY in Y" invariants: at Y (sole
  home — why it exists separately) and at the tempting wrong location (not here — see Y).
  This is the highest-leverage annotation class: it sits exactly where a violating edit
  would begin.
- **Coverage triage — the ladder.** Read the uncovered invariant's Mechanism and take the
  first rung that applies: names code → propose the annotation (real work). Enforced by an
  absence with a few natural insertion sites → propose absence anchors at the boundary,
  both sides of the seam. Distributed absence or discipline with no locus (a naming rule,
  "nothing anywhere may call X") → propose the guarding negative test (the test IS the
  enforcement point, and it's code), or record `**Enforcement:** review-time — <one-line
  reason>` ("no code locus" is an accepted equivalent phrase) in the record itself: it
  persists the triage decision and exempts the record from coverage reporting. Exemptions
  are NOT permanent: the checker prints them (`coverage-exempt` lines) and flags exempt
  records whose Mechanism names code; audits re-litigate every exemption — if a chokepoint
  now exists, the exemption is stale. And an annotation proposal is legitimate only where
  the record's **Mechanism names that site** — if it doesn't, refine Mechanism first; that
  is the gate against annotating to silence coverage. Never scatter anchor comments just to satisfy
  coverage — that is the metric degrading the architecture.

## Generator architecture

An invariant is a gear: one irreducible conceptual constraint from reality or choice. A
generator is the mechanism: gears combined with a direction-of-use vector and indexed by
goal. The same gears pointed at another goal form another generator. A spec is the
implemented extraction that the generator produces for one use. A bare invariant never
produces a spec.

Spec count may grow only while defects stay flat. Flat defects show that the mechanism
constrains the space. Defect growth shows that the generator leaks.

A generator is itself an invariant: a record whose Components are other invariants and
whose Scope carries the goal. It gets the full record form — Mechanism, Evidence,
Verification, and its own `Impossible if true` boundary. A generator with no impossibility
is a description, not a mechanism.

A `*.invariants.md` is the subsystem contract — gears plus the mechanism in record form;
a `*.generator.md` is PROSE ONLY — the narrative, evidence arc, and ladder for a graduated
mechanism (its links are still checked; its content never gates and never claims record
membership). The generator record's Components are the only generator-coverage membership.
Never give a contract
the generator suffix. Never put gear records in a generator file.

The division of readers: an AI scanning the contract alone gets the deep falsifiable
picture; the prose generator is for human plus AI when full context is needed. Every
contract Generator section ADVERTISES its prose file with a STUDY ALSO pointer that says
when to read it. Reference implementation: `engineering.invariants.md` (the generator
record "Primitives compound capability while defects stay flat") with
`engineering.generator.md` as its prose.

| Layer | Required shape |
| --- | --- |
| Standalone generator | `<home>.generator.md`; prose only; one graduated mechanism with one stable goal or class identity. |
| Contract generator | Top `## Generator` section: two to four lines of orientation prose, the STUDY ALSO pointer, then the mechanism as a full invariant record (goal in Scope; Components listing each gear with a one-line why, delete-testable; Impossible if true). |
| Test-file generator header | The FIRST block of `<file>.test.ts`: two registers, formal then described. Proofs are the tests beneath it. |
| Line annotation | The unchanged tripwire at each enforcement point. |

Graduate a contract mechanism when any one condition holds: it exceeds one screen, spans
contracts, is embodied by a load-bearing class, or gains a second distinct goal. Keep a
two-line goal summary and link in the contract after graduation. Use the mechanism's most
concrete stable home in its filename: goal-named or class-named.

Claims, proofs, and tripwires have three roles and two homes. A claim (the generator:
goal, domain-invariants, impossibility) lives beside its proof, in the TEST file, because
that is the only place the two can be checked against each other. A tripwire (the line
annotation) lives at the enforcement point, in the SOURCE file. The source carries no
generator block. The colocated test is the structural pointer from source to claims.

The generator header is the test file's constitution and its FIRST content — before
imports, before the first test:

```ts
/*
=== GENERATOR ===
Goal: ...
The formal register: pointers to contract records, never restatements.
[A contract record](path.invariants.md#a-contract-record)
// domain-invariant: <symbol> — <one-line if-then>
Impossible if true: <the local mechanism's negative space>

=== GENERATOR-DESCRIBED ===
The prose register: why this shape, the direction of use, what a fresh
session must not simplify away. Never gates; never restates the formal part.
*/

// domain-invariant: <symbol> — <the if-then this test proves>
test('<the property, stated as a sentence>', ...)

// impossible-if-true: <symbol> — <the exact Impossible if true text>
test('<the negative property, stated as a sentence>', ...)

// invariant: <record name> (<contract path>)
test('<the property, stated as a sentence>', ...)
```

The Goal line is the generator's purpose: what the mechanism produces and the tension it
resolves, in the module's own domain words (rows, panes, tokens, matches — never "behavior",
"consistency", or "this file"). The test: read the Goal alone — a reader must know which
mechanism this is without the file name; a Goal that fits another file with the name swapped
is not a Goal. The described register says only what the formal lines cannot (why this
shape and not the obvious alternative, the direction of use, the caveat a fresh session
would simplify away, `Open question:` lines for what the tests do not reach); a sentence
that fits every file belongs in no file.

An optional `Subject:` line in the formal register names the source file(s) the header's
symbols resolve against (one or more paths; a cross-source or contract-only proof may name
none). When absent, the same-named sibling source is the subject. The checker verifies the
line when present and applies the sibling default when not.

The Goal and the formal register cohere in both directions — for the file's OWN claims. A
contract-record link is a hosted-proof binding to an external generator: it must have an
annotated test in the file (the bijection), and it is exempt from the Goal-deletion test —
the goal it serves is the record's, not this file's. The rule below binds domain-invariant
and impossibility lines: the Goal is the index that turns
these gears into this mechanism, so every formal line is load-bearing for the Goal (delete
it and the Goal is no longer reachable — if the Goal survives, the line belongs to another
mechanism or the Goal is too narrow), and the Goal is reachable from the formal lines alone
(if it needs a claim the header does not carry, a component is missing or the Goal
overreaches). The described register carries the direction of use — how these gears combine
toward this goal — which is why it cannot be templated. Impossible if the header coheres: a
formal line whose deletion leaves the Goal intact; a Goal that needs a claim the header lacks.

Every test that proves a claim carries the claim's annotation directly above it. The
test name states the property. There is no spec register: a proof binding written as a
row would only repeat the test name beside it. Proof coverage is the checker's question:
a header claim with no annotated test, or an annotated test whose claim is not in the
header, is a finding.

The two registers mirror the doc layers: formal (falsifiable) is the contract's record,
described (prose) is the generator file. One structure at two scopes.

Rules the checker holds:

- A header domain-invariant names a symbol declared in the SIBLING source
  (`X.test.ts` claims about `X.ts`).
- Every header domain-invariant, contract-record pointer, and `Impossible if true` line has
  at least one annotated test in the same file. An impossibility proof uses
  `// impossible-if-true: <symbol> — <exact text>`, with a symbol declared by the header.
  Domain-invariant and impossibility annotations never prove each other's claims.
- A `// domain-invariant:` tripwire in source resolves to a header line in its sibling test.
- `=== GENERATOR ===` in a non-test `.ts` file is a migration finding.

Keep upstream records as references. Header prose owns only what no upstream record owns.
Keep line annotations at their enforcement points. Use single-star glob forms inside the
block because a star-slash closes it.

A domain-invariant stays local only while nothing across the seam depends on it. Promote it
to a full contract record as soon as a second file or subsystem depends on it.

**References — standard markdown links; the anchor is the identity.**

```markdown
[A non-ready route cannot transmit](patch-bay.invariants.md#a-non-ready-route-cannot-transmit)
[the non-ready rule][pb-nr]          <- alias text is legal; identity lives in the anchor

[pb-nr]: patch-bay.invariants.md#a-non-ready-route-cannot-transmit
```

- Every contract-targeting link **must carry an anchor**: `#slug(record name)`. Slug rule:
  lowercase · strip everything but letters/digits/spaces/hyphens · spaces become `-`
  (identical to GitHub's rendered heading anchors, so links click through).
- Outside `Components`, an italic record name is prose, not a dependency. `--refs` rejects it.
  Use a Markdown link with the record anchor. A same-contract link may use `#record-anchor`.
- Link text is free (aliases welcome) with one guard: text that is verbatim a DIFFERENT
  record's name than the anchor's is an error — objectively misleading. Style: first
  mention in a doc uses the full record name; aliases must still gesture at the content.
- Import-style definitions (one key per referenced record, block at the bottom) are the
  recommended form — the definitions block reads as the doc's imports, and a second
  contract appearing there makes a crossed domain boundary visible.
- **Write-time rule:** when adding or editing a link — especially after copying one —
  resolve the anchor and confirm it names the record the sentence means. A free alias
  over a wrong-but-valid anchor is invisible to the checker; only this habit and the
  audit catch it.
- The checker (`--refs`) validates every generator link mechanically: anchors resolve,
  link text does not name another record, and reference keys exist. It reports records that
  no generator record lists in its Components field. Links in prose companions still resolve
  and count as links, but they do not claim membership.

Keep only live composition. History lives in git. A new gear enters the contract before the
generator can use it.

`<name>.lattice.md` remains accepted as the reflective legacy form. It is correct when the
structure is discovered rather than engineered, as in the ethics investigation that gave
the form its name. Engineering repositories use `<name>.generator.md`.

## Audit mode

`--audit`, or invoked with phrasing like "check the invariants" / "is the contract stale?"
with no change in flight. The posed subject is **the contract layer itself**: the file is
claims, the code is reality — verify the claims wholesale.

1. **Mechanical:** the bundled checker (see The checker) with `--all` (schema) and
   `--refs` (annotation drift). Any failure is a finding; fix-proposals go in the report.
   If `project.invariants.md` carries a governance record, open with the breadth status:
   "core subsystems: N of M governed" (compare its Scope list against existing contracts).
2. **Staleness sweep** — for every invariant in scope (default: all canonical contracts;
   at scale prefer `--scope` subsets audited stalest-first by contract git-history — and a
   partial audit MUST name which contracts it covered and which it deferred):
   - Confirm the record's **Evidence and Mechanism citations still resolve**: cited files
     exist, named symbols/guards are still present, referenced tests still exist. Existence
     is not proof — a citation that resolves but demonstrates nothing is the vacuity test's
     territory (main procedure step 4); apply it here too.
   - Run each record's **Verification** command when it is cheap and read-only; with
     `--depth verify`, run all of them (including test suites) and spawn independent
     verifiers per invariant.
   - Spot-check annotated enforcement points for **location rot**: the annotation resolves
     but the code around it no longer enforces the invariant — propose removal/relocation.
   - Verdict per invariant: `upheld` (evidence checked) / `stale` (no longer matches code)
     / `refines` (reality reveals a sharper statement) / `violated` (the code actively
     breaks it right now — audits can find live breaches, not just documentation drift).
     `discovered` may also arise here and in step 5; all verdicts share the main table's
     definitions.
   - **Status transitions:** propose `provisional` → `established` when Evidence cites real
     artifacts, Verification runs green, and the record has survived review pressure; propose
     the demotion when Verification no longer runs or Evidence has rotted. **Before proposing
     a demotion, check whether the enforcement artifact was simply deleted** (a test removed
     in an unrelated cleanup): restoring the artifact is the preferred proposal — demote only
     when the claim itself lost support. Weakening records because their guards were
     carelessly deleted is the system injuring itself through its own rules. Status changes
     are proposals like any other edit.
3. **Annotation coverage** — the checker's `--refs` prints `coverage <file>: no annotations reference: …`
   for canonical records with zero reverse pointers. For each such invariant (and for every
   invariant in local-format contracts, which the script cannot cover-check), locate its
   enforcement points from the Mechanism/Evidence citations and **propose the missing
   annotation comments** as concrete insertions. A contract whose code carries no reverse
   pointers is unprotected against the next editing session.
4. **Format migration** — non-canonical contracts (reported `SKIP … local format`) get a
   full migration proposal to the canonical schema: records, kinds, all eight fields
   (mining Mechanism/Evidence/Verification from the prose and the code it describes),
   preserving the original's voice in the Invariant statements. Propose-only, like
   everything else.
5. **Generator check** — the checker already validated anchors mechanically (audit step 1); the
   judgment share: for each link, confirm the surrounding prose describes the record its
   anchor actually names — a free alias meaning a different record is a `stale`-class
   finding the machine cannot see. Then: every composition claim still follows from the
   current records (a claim that no longer follows is `stale`); a rule found here but
   absent from the records is a `discovered` that must move into the contract.
6. **Report** with the usual discipline: a fully-fresh contract layer gets ONE line —
   and that line must state what was actually done: "N records: K verifications executed,
   J confirmed by citation-resolution only — all upheld, annotations resolve." An audit
   that ran nothing must be distinguishable from an audit that verified everything; spend
   detail only on `stale` / `refines` and mechanical failures. Propose contract edits;
   apply only on confirmation.

Run this periodically (or in CI via the mechanical layer) — a contract only stabilizes a
codebase while it is itself true.

## Bootstrap mode

For a wholly uncodified repo, run `--survey` first (see Arguments) — selection before
depth; tokens go to the hardest, most fundamental systems, never to every submodule.
When a scoped subsystem has design docs / code but no contract (never automatic; on request
or accepted offer): mine `*.design.md`, readmes, and code comments for the load-bearing
rules; name each per the naming style (plain declarative sentence — the annotation test);
classify each as reality-absolute / reality-renegotiable-at / chosen; write
`<subsystem>.invariants.md` **next to the subsystem's code**, from
`references/contract-template.md`; include the dependency rule; mark everything `provisional`
until evidence upgrades it. Before minting records, check ancestor and sibling contracts (path-implication upward) for
overlapping or conflicting records — reference or extend them instead of duplicating.
The request to bootstrap authorizes the work, not the write — and confirm in CHUNKS:
present records in small batches (~5, grouped by topic), each batch confirmed separately;
a wall-of-text confirmation at the moment the human knows least is how vacuous records
become baseline. Everything enters as `provisional`; the first audit re-runs the vacuity
test on bootstrapped records. Add the bounded Generator section when the contract reaches
two records. Graduate it only when a split trigger applies. Once two or more subsystem
contracts exist, a cross-contract project mechanism normally graduates to
`project.generator.md`; the survey's import graph is its first draft. Prize impossibility
statements — they give the contract teeth.

## Known limits — what this system cannot enforce

Stated so adopters weigh residual risk instead of assuming coverage that isn't there.
Mitigations are named; none of these limits is secretly solved elsewhere.

1. **Invocation itself is not enforced.** A session that never invokes this skill reviews
   nothing, and no artifact records that a merge went unreviewed. Mitigations: annotations
   (constraints reach the editor even without invocation), the mechanical layer in CI
   (`--all --strict` + `--refs`), and a standing instruction in the harness/agent config to
   check governed areas before changing them. The mission paragraph's "used consistently"
   is a real conditional — this skill cannot make itself be used.
2. **Semantic verdicts are self-reported.** The checker validates shape; verdicts, severity
   tags, scope derivation, and the PASS/BLOCKED gate are produced by the same intelligence
   whose change is being judged. Mitigations: the downgrade discipline (step 4), `--depth
   verify`/`adversarial` for independent re-derivation, and the human confirmation gate.
   None of these is proof — a determined-or-lazy reviewer plus a rubber-stamping human can
   still pass a bad change. The system raises the cost of self-deception; it cannot make it
   impossible.
3. **Coverage proves pointers, not enforcement.** `--refs` green means names resolve —
   not that annotations sit at real enforcement points, and not that enforcement works.
   Location-rot review and the vacuity test are judgment work, done only when audits and
   reviews actually run.
4. **Human confirmation is the trust anchor, and it fatigues.** Everything propose-only
   converges on one person reading proposals. Keep proposals few, small, and severity-
   ranked (the report discipline exists for exactly this); a wall of proposals is how the
   anchor breaks.
5. **Audit recency is not persisted.** No artifact records when the last semantic audit
   ran; `Last refined` tracks edits, not verification. Rely on CI cadence for the
   mechanical layer and calendar discipline for the semantic one.
6. **Single-repo by construction.** Annotations and generator links resolve only against
   contracts inside the current checkout — code in one repo cannot reference a platform
   contract living in another. The workaround (vendoring a copy) creates an unsynced
   duplicate; if you vendor, treat the copy as read-only and re-vendor on upstream change.
   Relatedly: vendored code copied WITHOUT its `.git` is walked as first-class content —
   its contracts validate as yours and its records pollute coverage; keep vendored trees
   out of the checkout or behind their own `.git`.
7. **Concurrent sessions on one checkout can cross-trip the checker.** An audit running
   during another session's rename ripple sees transient orphans (red, not green — it
   fails safe, but it cries wolf). No lock exists; coordinate sessions or expect
   intermittent noise.
8. **Scope derivation degrades with generator size.** Content-implication over shared
   vocabulary implicates broadly as contracts multiply; prefer the diff's rarest, most
   specific identifiers when grepping, and audit stalest-first (via each contract's git
   history) rather than everything-always.

## Rules

- Scope derived, never assumed; stated loudly at the top of every report.
- Rigor is constant; `--depth` buys independence and refutation, not care.
- Evidence or it isn't a verdict: every non-`untouched` verdict cites current code.
- The contract is claims; the code is reality; disagreements are findings — in both directions.
- Propose-only: no edits to contracts or code without explicit confirmation.
- Never merge automatically. Never soften a fatal finding to keep a report pleasant.
- Language-, framework-, repository-, worktree-, and subsystem-neutral.
