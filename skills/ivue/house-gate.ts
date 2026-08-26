/**
 * house-gate.ts — a WORKING example of extending the ivue Standard gate.
 *
 * Copy this file into your repo, rename the class, and point the imports
 * at the package (`ivue/extras` and `ivue/skills/ivue/check-standard`) —
 * here they are relative because this file lives beside the engine.
 *
 * The whole recipe is three getters:
 *
 *   1. a check getter        — the rule itself, named by its sentence;
 *   2. `checks`              — appends it to the inherited manifest;
 *   3. `proofs`              — spreads its constitution entry (claim,
 *                              impossibility, red arm, green arm) over
 *                              the inherited ones.
 *
 * Everything else is inherited through the receiver: run(), the CLI, the
 * skip-list vocabulary, and prove() — which REFUSES the house check if
 * you skip step 3. Try it:
 *
 *   npm run gate:house -- --list
 *   npm run gate:house -- --prove 'A source file stays under nine hundred lines'
 *   npm run gate:house -- --prove
 *   npm run gate:house -- --source-root src --test-glob 'src/**\/*.test.ts'
 */
import { Static } from '../../lib/Static';
import { CheckStandard, type CheckProof, type StandardCheck } from './check-standard';

class $HouseGate extends CheckStandard.$Class {
  // A literal tunable constant — SCREAMING_SNAKE per the Standard. If a
  // deeper subclass pinches it, rename the check so the sentence stays true.
  static get MAX_SOURCE_LINES() {
    return 900;
  }

  static get a_source_file_stays_under_nine_hundred_lines(): StandardCheck {
    return this.defineCheck('A source file stays under nine hundred lines', (context) =>
      context.sources
        .filter((unit) => unit.lines.length > this.MAX_SOURCE_LINES)
        .map((unit) => this.finding(this.a_source_file_stays_under_nine_hundred_lines, unit, 1, `${unit.lines.length} lines — split the module`)),
    );
  }

  static get checks(): readonly StandardCheck[] {
    return [...super.checks, this.a_source_file_stays_under_nine_hundred_lines];
  }

  static get proofs(): Readonly<Record<string, CheckProof>> {
    return {
      ...super.proofs,
      [this.a_source_file_stays_under_nine_hundred_lines.name]: {
        claim: 'If a source file exceeds nine hundred lines, then the gate names it',
        impossibility: 'a source file over nine hundred lines passes the gate',
        red: [{ files: { 'src/Long.ts': `${'// filler\n'.repeat(901)}export type Filler = number;\n` }, expectFindings: [/lines — split the module/] }],
        green: [{ files: { 'src/Short.ts': 'export type Short = number;\n' } }],
      },
    };
  }
}

export namespace HouseGate {
  export const $Class = Static($HouseGate);
  export let Class = $Class;

  // Registers this gate as the CLI entry — superseding the base gate's own
  // registration, because the entry module evaluates last.
  CheckStandard.bootstrapCli(Class);
}
