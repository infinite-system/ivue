# Invariant Score — rubric v1

Read this file before running `--score`. The score is **audit mode plus a fold**: it is
invalid without the audit evidence attached, and it is UNSCORED (never a number) when no
contracts exist. Rubric version: **v1** — scores are comparable only within one rubric
version; state `rubric v1` in every report.

## What the score measures

The health of the **contract system**, not code quality directly. It is trustworthy exactly
to the degree the contracts are (the Wielder Principle, quantified). Same-repo-over-time is
the product; cross-repo comparison is mostly meaningless and reports must say so if asked.
**The trend is the signal, not the level** — always show the previous score when computable
(the deterministic half can be recomputed against any past git revision on demand).

## Headline: depth × breadth — never collapsed

- **Depth** — health of what is governed: the six factors below, over existing contracts.
- **Breadth** — coverage of what SHOULD be governed: `governed / chosen` from the governance
  record in `project.invariants.md` (see SKILL: Survey). No governance record → breadth is
  reported as "no survey on record — run `--survey`".

Report form: `Depth B+ · Breadth 9/15 · rubric v1 (prev: B, 8/15)` plus the factor table,
the audit evidence, and **the three actions that would most raise the score** (the steering
gradient — mandatory, ranked by effect).

## The six depth factors

Each factor gets a band A–F. **Component floors: any factor at D or F caps the headline one
band above it** — reds cannot be averaged away.

| factor | source | computed from |
| --- | --- | --- |
| Mechanical integrity | checker (deterministic) | `--all --refs` exit state; orphan count; untriaged notes |
| Governed surface | checker + tree (deterministic) | fraction of chosen subsystems with contracts; annotation presence at Mechanism-named sites |
| Falsifiability | audit (judgment) | % sampled records whose Impossible-if-true could match a bug report AND whose Verification actually verifies the claim (vacuity test) |
| Freshness | audit + git (mixed) | stale/refines verdict rate; citation resolution; Last-refined age vs subsystem churn |
| Verification health | execution (deterministic) | % of Verification commands green when run (cheap ones always; all under `--depth verify`) |
| Composition | checker + audit (mixed) | generator link validity; dependency-ripple debt (reality refines with unexamined dependents) |

Deterministic factors come from `check_invariants.mjs --score` (JSON). Judgment factors
come from the audit YOU just ran — never from assertion. Label each factor `[mech]` or
`[judgment]` in the table so readers know which half is reproducible.

## Band thresholds (v1)

A: no findings beyond flags, coverage triaged, verifications green.
B: scoping findings exist but none unresolved past one audit; minor coverage debt.
C: stale records or coverage debt outstanding across audits; vacuity found in samples.
D: violated/orphans present, or verification failures, or governance record ignored.
F: mechanical layer red and unaddressed.

## Anti-gaming rules (these ARE the score)

1. **Monotone in governed surface.** Deleting records, demoting contracts to local format,
   or stuffing `Enforcement:` exemptions LOWERS Governed surface and Falsifiability. A repo
   that ungoverns itself scores worse, never better.
2. **No score without work.** Every number cites the audit run that produced it (counts:
   K verifications executed, J citation-only, sample size for vacuity). A bare scalar is a
   fabrication — refuse to emit one.
3. **False precision is false structure.** Bands and ratios only; no decimals.
4. **Floors, not averages** (above).
5. Score requests on an unsurveyed repo → offer `--survey`, do not improvise a breadth.
