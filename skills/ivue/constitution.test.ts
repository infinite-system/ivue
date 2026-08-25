/*
=== GENERATOR ===
Subject: check-standard.ts
Goal: Prove the gate's constitution is data a subclass inherits and extends — every manifest check travels with its claim, its impossibility, and both proof arms, and a gate that grows a check without them refuses itself.
// domain-invariant: $CheckStandard — If a check is in the manifest, then its proofs entry carries the claim, the impossibility, and at least one red and one green arm
// domain-invariant: $CheckStandard — If a red arm's fixture runs through the gate, then its check reports the expected finding
// domain-invariant: $CheckStandard — If a green arm's fixture runs through the gate, then its check stays silent
// domain-invariant: $CheckStandard — If a subclass overrides or adds a check getter, then the manifest, the skip-list validation, and the proofs follow the receiving class
Impossible if true: a check enters the manifest without a red and a green proof arm
Impossible if true: a file breaking a manifest check passes the gate

=== GENERATOR-DESCRIBED ===
The $CheckStandard class carries its own proof kit as per-receiver static
data, so an agent extending someone's gate inherits thirty-eight proven
checks and is refused the moment it adds a thirty-ninth without arms —
the discipline teaches itself to whoever extends it. The driver below
runs every arm through the same run() the command line uses; hand-written
tests here carry the meta-claims, and the per-check claims live in the
proof data where prove() reads them.
*/
import { expect, test } from 'vitest';
import { Static } from '../../lib/Static';
import * as Gate from './check-standard';

// domain-invariant: $CheckStandard — If a check is in the manifest, then its proofs entry carries the claim, the impossibility, and at least one red and one green arm
test('the shipped constitution is complete for every manifest check', () => {
  const GateClass = Gate.CheckStandard.Class;
  expect(GateClass.checks.length).toBe(38);
  const report = GateClass.prove({ completenessOnly: true });
  expect(report.problems).toEqual([]);
  for (const check of GateClass.checks) {
    const proof = GateClass.proofs[check.name];
    expect(proof, check.name).toBeDefined();
    expect(proof.claim).toMatch(/^If .+, then .+/);
    expect(proof.impossibility.length).toBeGreaterThan(0);
    expect(proof.red.length).toBeGreaterThan(0);
    expect(proof.green.length).toBeGreaterThan(0);
  }
});

// domain-invariant: $CheckStandard — If a red arm's fixture runs through the gate, then its check reports the expected finding
// domain-invariant: $CheckStandard — If a green arm's fixture runs through the gate, then its check stays silent
// impossible-if-true: $CheckStandard — a file breaking a manifest check passes the gate
test('every red arm produces its named finding and every green arm stays silent', () => {
  const report = Gate.CheckStandard.Class.prove();
  expect(report.problems).toEqual([]);
  expect(report.ran.red).toBeGreaterThanOrEqual(38);
  expect(report.ran.green).toBeGreaterThanOrEqual(38);
});

test('prove isolates one check when asked', () => {
  const GateClass = Gate.CheckStandard.Class;
  const report = GateClass.prove({ only: 'A Ref is read and written through value' });
  expect(report.problems).toEqual([]);
  expect(report.ran.red).toBe(1);
  expect(report.ran.green).toBe(1);
  const unknown = GateClass.prove({ only: 'No such check' });
  expect(unknown.problems.some((problem) => problem.includes('No such check'))).toBe(true);
  expect(unknown.ran.red + unknown.ran.green).toBe(0);
});

// impossible-if-true: $CheckStandard — a check enters the manifest without a red and a green proof arm
test('an armless check is refused by its own constitution', () => {
  class $ArmlessGate extends Gate.CheckStandard.$Class {
    static get houseRuleWithoutArms(): Gate.StandardCheck {
      return { name: 'A house rule without arms', enforced: true, run: () => [] };
    }

    static get checks(): readonly Gate.StandardCheck[] {
      return [...super.checks, this.houseRuleWithoutArms];
    }
  }
  const ArmlessGate = Static($ArmlessGate);
  const report = ArmlessGate.prove({ completenessOnly: true });
  expect(report.problems.some((problem) => problem.includes('A house rule without arms'))).toBe(true);
});

// domain-invariant: $CheckStandard — If a subclass overrides or adds a check getter, then the manifest, the skip-list validation, and the proofs follow the receiving class
test('a house gate extends the manifest and its constitution through the receiver', () => {
  const houseCheck: Gate.StandardCheck = {
    name: 'A source file stays under nine hundred lines',
    enforced: true,
    run: (context) =>
      context.sources
        .filter((unit) => unit.lines.length > 900)
        .map((unit) => ({ check: 'A source file stays under nine hundred lines', file: unit.relativePath, line: 1, message: `${unit.lines.length} lines — split the module` })),
  };
  const longFile = `${'// filler\n'.repeat(901)}export type Filler = number;\n`;
  class $HouseGate extends Gate.CheckStandard.$Class {
    static get houseRule(): Gate.StandardCheck {
      return houseCheck;
    }

    static get checks(): readonly Gate.StandardCheck[] {
      return [...super.checks, this.houseRule];
    }

    static get proofs(): Readonly<Record<string, Gate.CheckProof>> {
      return {
        ...super.proofs,
        [houseCheck.name]: {
          check: houseCheck,
          claim: 'If a source file exceeds nine hundred lines, then the gate names it',
          impossibility: 'a nine-hundred-line source file passes the gate',
          red: [{ files: { 'src/Long.ts': longFile }, expectFindings: [/90\d lines — split the module/] }],
          green: [{ files: { 'src/Short.ts': 'export type Short = number;\n' } }],
        },
      };
    }
  }
  const HouseGate = Static($HouseGate);
  // the manifest follows the receiver…
  expect(HouseGate.checks.map((check) => check.name)).toContain(houseCheck.name);
  // …the constitution follows the receiver (39 proven checks, zero problems)…
  const report = HouseGate.prove();
  expect(report.problems).toEqual([]);
  expect(report.ran.red).toBeGreaterThanOrEqual(39);
  // …and the base class is untouched: no house rule leaks upward
  expect(Gate.CheckStandard.Class.checks.map((check) => check.name)).not.toContain(houseCheck.name);
});
