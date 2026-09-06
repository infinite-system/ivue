/*
=== GENERATOR ===
Subject: ivue-standards-check.ts ivue-generator-standard.ts
Goal: Prove the gate's constitution is data a subclass inherits and extends — every manifest check travels with its claim, its impossibility, and both proof arms, and a gate that grows a check without them refuses itself.
// domain-invariant: $CheckStandard — If a check is in the manifest, then its proofs entry carries the claim, the impossibility, and at least one red and one green arm
// domain-invariant: $CheckStandard — If a red arm's fixture runs through the gate, then its check reports the expected finding
// domain-invariant: $CheckStandard — If a green arm's fixture runs through the gate, then its check stays silent
// domain-invariant: $CheckStandard — If a subclass overrides or adds a check getter, then the manifest, the skip-list validation, and the proofs follow the receiving class
Impossible if true: a check enters the manifest without a red and a green proof arm
Impossible if true: a file breaking a manifest check passes the gate

=== GENERATOR-DESCRIBED ===
The $CheckStandard class carries its own proof kit as per-receiver static
data, so an agent extending someone's gate inherits the proven
checks and is refused the moment it adds one more without arms —
the discipline teaches itself to whoever extends it. The driver below
runs every arm through the same run() the command line uses; hand-written
tests here carry the meta-claims, and the per-check claims live in the
proof data where prove() reads them.
*/
import { expect, test } from 'vitest';
import { Static } from '../../lib/Static';
import * as Gate from './ivue-standards-check';
import { GeneratorStandard } from './ivue-generator-standard';

// domain-invariant: $CheckStandard — If a check is in the manifest, then its proofs entry carries the claim, the impossibility, and at least one red and one green arm
test('the shipped constitution is complete for every manifest check', () => {
  const GateClass = Gate.CheckStandard.Class;
  expect(GateClass.checks.length).toBe(31);
  const report = GateClass.prove({ completenessOnly: true });
  expect(report.problems).toEqual([]);
  for (const check of GateClass.checks) {
    // one form everywhere: the check's name IS its getter's name
    expect((GateClass as unknown as Record<string, Gate.StandardCheck>)[check.name]?.name).toBe(check.name);
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
  expect(report.ran.red).toBeGreaterThanOrEqual(30);
  expect(report.ran.green).toBeGreaterThanOrEqual(30);
});

test('the generator standard is the extension mechanism eating its own cooking', () => {
  // ten methodology checks arrive the same way a house check does:
  // getters + checks + proofs on a subclass — fully proven, opt-in
  const GeneratorClass = GeneratorStandard.Class;
  expect(GeneratorClass.checks.length).toBe(41);
  const report = GeneratorClass.prove({ completenessOnly: true });
  expect(report.problems).toEqual([]);
  // the base stays ivue-only: no header check leaks upward
  // the methodology checks wear their jurisdiction as a prefix
  expect(Gate.CheckStandard.Class.checks.map((check) => check.name)).not.toContain('invariants_a_test_file_opens_with_its_generator_header');
  expect(GeneratorClass.checks.map((check) => check.name)).toContain('invariants_a_test_file_opens_with_its_generator_header');
  expect(GeneratorClass.checks.filter((check) => check.name.startsWith('invariants_')).length).toBe(10);
});

test('prove isolates one check when asked', () => {
  const GateClass = Gate.CheckStandard.Class;
  const report = GateClass.prove({ only: 'a_ref_is_read_and_written_through_value' });
  expect(report.problems).toEqual([]);
  expect(report.ran.red).toBe(1);
  expect(report.ran.green).toBe(1);
  const unknown = GateClass.prove({ only: 'No such check' });
  expect(unknown.problems.some((problem) => problem.includes('No such check'))).toBe(true);
  expect(unknown.ran.red + unknown.ran.green).toBe(0);
});

test('the CLI refuses to combine --prove with a gate run', async () => {
  const GateClass = Gate.CheckStandard.Class;
  expect(await GateClass.main(['--prove', '--source-root', '../../'])).toBe(2);
  expect(await GateClass.main(['--source-root', 'src', '--prove'])).toBe(2);
});

// impossible-if-true: $CheckStandard — a check enters the manifest without a red and a green proof arm
test('an armless check is refused by its own constitution', () => {
  class $ArmlessGate extends Gate.CheckStandard.$Class {
    static get a_house_rule_without_arms(): Gate.StandardCheck {
      return { name: 'a_house_rule_without_arms', enforced: true, run: () => [] };
    }

    static get checks(): readonly Gate.StandardCheck[] {
      return [...super.checks, this.a_house_rule_without_arms];
    }
  }
  const ArmlessGate = Static($ArmlessGate);
  const report = ArmlessGate.prove({ completenessOnly: true });
  expect(report.problems.some((problem) => problem.includes('a_house_rule_without_arms'))).toBe(true);
});

// domain-invariant: $CheckStandard — If a subclass overrides or adds a check getter, then the manifest, the skip-list validation, and the proofs follow the receiving class
test('a house gate extends the manifest and its constitution through the receiver', () => {
  const houseCheck: Gate.StandardCheck = {
    name: 'a_source_file_stays_under_nine_hundred_lines',
    enforced: true,
    run: (context) =>
      context.sources
        .filter((unit) => unit.lines.length > 900)
        .map((unit) => ({ check: 'a_source_file_stays_under_nine_hundred_lines', file: unit.relativePath, line: 1, message: `${unit.lines.length} lines — split the module` })),
  };
  const longFile = `${'// filler\n'.repeat(901)}export type Filler = number;\n`;
  class $HouseGate extends Gate.CheckStandard.$Class {
    static get a_source_file_stays_under_nine_hundred_lines(): Gate.StandardCheck {
      return houseCheck;
    }

    static get checks(): readonly Gate.StandardCheck[] {
      return [...super.checks, this.a_source_file_stays_under_nine_hundred_lines];
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
  expect(report.ran.red).toBeGreaterThanOrEqual(31);
  // …and the base class is untouched: no house rule leaks upward
  expect(Gate.CheckStandard.Class.checks.map((check) => check.name)).not.toContain(houseCheck.name);
});
