---
name: invariant-spec-tests
description: >-
  How to write a check that proves something — a test is a SPEC: the generator
  expressed for this implementation. Covers the spec discipline (one test per
  component or caveat, name = property, annotation = claim, specs grow while
  defects stay flat) and the assertion rules — smokes, probes, matrix rows,
  regression tests. Complements drive-pty (how to DRIVE) and the invariants
  skill (which owns the generator header form). Use when authoring or
  reviewing any test, smoke, harness probe, or verification section of a
  report. Every rule here was bought by a real failure.
---

# invariant-spec-tests — writing checks that can actually fail

Every rule below was harvested from a real incident. Do not extend this file
with taste; extend it only for a failure that actually happened.

## 0. A test is a spec — the generator expressed for this implementation

The generator header at the top of `X.test.ts` (form: invariants skill,
"Generator architecture") states the CLAIMS. The tests beneath it are the
SPEC: the generator expressed for this implementation. The two prove each
other, and the checker holds both directions (#678).

- COMPONENTS. Every `// domain-invariant:` line and every contract-record
  pointer in the header is one component of the generator. Each component
  has at least one test. A component with no test is unproven; a test whose
  claim is not in the header is an unexplained assertion. Both are findings.
- CAVEATS. The `=== GENERATOR-DESCRIBED ===` prose carries the caveats that
  narrow the possibility space to THIS implementation ("the cache is keyed
  by path, not by content"; "resets are for tests only"). A caveat that
  constrains behavior needs a test. A caveat without a test is a wish.
- IMPOSSIBILITIES. Every `Impossible if true` line is a negative test by
  construction. Write it as one: plant the impossible state, assert the
  refusal.
- FORM. The test name states the property as a sentence. The annotation
  directly above names the claim it proves. No spec list anywhere else.
  The header's Goal and described registers follow the invariants skill's
  bar: a Goal that would fit another file with the name swapped is not a
  Goal, and prose that fits every file belongs in none.
- PROSE. When the test code does not make the spec obvious (why this
  boundary, why this fixture, which caveat this expresses), a detailed doc
  comment above the test explains it, under the annotation. Every sentence
  of that comment derives from the generator: a comment that introduces a
  claim absent from the header is the same finding as a test without a
  claim. There is no file-level spec-prose register.
- DIRECTION. For NEW behavior, the CLAIM precedes the implementation it
  governs (git is the witness; refinements are new commits, honest
  history). Code may precede tests — the inner loop stands: assertions
  prevent regression, they do not discover fixes. A claim that first
  appears with its implementation is a description, not a spec.
- BOTH ARMS LIVE IN THE SPEC. The impossibility test is the PERMANENT red
  arm: it constructs the approach to the forbidden state and asserts the
  refusal with its reason, forever — generator and impossibility, the
  same duality as the header itself. For checks, parsers, and guards,
  keep the violating fixture in the repo: one named test proves the bad
  fixture is caught on its reason, one proves the clean fixture is
  silent; both run every gate. The TRANSIENT plant (mutate, watch red,
  revert) is only for the residue where red requires editing shipped
  code; it is named in the report AS transient, with its red evidence —
  a transient plant where a fixture pair was possible is a finding.
- GROWTH. The invariant: spec count may grow only while defects stay flat.
  Add a test only when it proves a component or caveat not yet proven. When
  a defect appears, the first question is which component or caveat had no
  spec. If none was missing, the generator itself is wrong: refine the
  header first, then write the test that proves the refinement.

## 1. Choose the observable the user sees

- Assert CONTENT, not chrome. A frame title can switch while the body stays
  stale.
- When the claim is VISUAL, assert colors — `screen.cell(row,col)` gives
  foreground/background. A text-only check cannot see "the inputs lose
  color".
- When the claim is about TEARDOWN or startup noise, read the RAW OUTPUT
  (`driver.recordedOutput()`), not the grid — errors print after the
  alternate screen exits.
- When the claim is a SEQUENCE, wait on the graph; when the claim is
  "the user sees X", the final assert stays on the screen — a model-only
  check goes green while the screen is broken.
- Know which SURFACE owns the state: a right-dock panel changes the right
  dock — asserting the left pane proves nothing.

## 2. Born-red, with the plant ASSERTED

- A check is trusted only after it failed on the defect it claims to catch.
  PREFER THE RED THAT STAYS: a committed violating fixture with a named
  catches-it test and a named clean-is-silent test, both permanent, both
  run every gate. Only where red requires mutating shipped code: plant the
  defect, watch RED on the position/value (not on a timeout), remove,
  watch GREEN, and name the plant as transient in the report — a transient
  plant where a fixture pair was possible is a finding.
- The plant must be PROVEN APPLIED — grep for it after planting. A replace
  that silently changes nothing births a green, worthless check.
- The red arm asserts WHY it failed, not just THAT it failed.
- A passing delete-test may mean DEAD CODE, not a working guard — confirm
  the deleted thing was load-bearing.

## 3. Waits are conditions that are FALSE right now

- Before writing any wait ask: is this false at this moment? A wait on text
  painted both before and after the change is pre-satisfied and returns a
  stale frame.
- Absence waits must follow a presence wait, or they verify nothing.
- Never widen a timeout and never pace with sleeps — both convert a defect
  into a slower version of itself. A wait that fails only under aggregate
  load is a WAIT-SHAPE defect, not a flaky machine.
- Waits compare JSON — pass typed values, never the string 'false'.

## 4. Enumerate the fixture space — zero states first

- The states to cover come from the SURFACE, not from the last failure:
  zero of the thing, one, many, ALL removed, re-entry after empty. The
  launch-with-no-folder path shipped broken because no fixture ever
  launched without a folder.
- Persisted state needs a SECOND LAUNCH: launch 1 exercises the reader
  against old data; only launch 2 exercises what launch 1 wrote.
- Scale parity: drive small AND the 100,000-line fixture; per-frame work
  must not grow with content.

## 5. Read the command's own exit, never a wrapper's

- `timeout cmd | tail` reports tail's exit. `wrapper && echo` reports the
  echo's. Capture the command's own status or read a sentinel the command
  itself wrote.
- A check that can only fail toward "pass" is a decoration; supply both
  arms — the PRESENT arm proves it can see, the ABSENT arm proves it can
  be silent. Two arms agreeing means the instrument is broken: report
  THAT, never a number.

## 6. Kind-match the verification set

- The set must contain an instrument OF THE KIND the claim is about: a
  paint claim needs a cell/color assert, a gesture claim needs real input
  bytes, a persistence claim needs a second launch, a performance claim
  needs a paired measurement. "bun test green" verifies no visual claim.
- Assert after EVERY step, not at the end — an end-state assert cannot say
  which step corrupted state that later self-healed.
- Name what the check does NOT cover in one line. Silent partial coverage
  reads as total.

## Self-check before shipping any new check

0. Which header component or caveat does this test prove, and is that
   claim written directly above it? Read the header's Goal alone: can you
   tell which mechanism this is without the file name? Delete each formal
   line in your head: does the Goal stop being reachable? Does the Goal
   need any claim the header does not carry?
1. Can I name the defect this check catches, and did I watch it catch it?
2. Is the observable the one a user would point at?
3. Is every wait false at the moment it starts?
4. Which zero/empty state does this cover — and which does it skip, said
   out loud?
5. Whose exit code am I actually reading?
