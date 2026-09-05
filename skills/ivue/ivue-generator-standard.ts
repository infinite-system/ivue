/**
 * ivue-generator-standard.ts — the invariant-methodology extension of the
 * ivue Standard gate, built the same way a house gate is: check getters,
 * `checks` appending them, `proofs` spreading their constitution entries.
 * The extension mechanism eating its own cooking.
 *
 * The base gate (`ivue-standards-check.ts`) is ivue-only. This subclass
 * adds the ten generator-header checks — test files open with the
 * generator sentinel header, claims bind to tests one-to-one,
 * impossibilities carry exact negative proofs, contract pointers resolve —
 * the discipline of the invariants / invariant-spec-tests skills. Opt in
 * by extending THIS class in your house gate instead of the base:
 *
 *   class $HouseGate extends GeneratorStandard.$Class { ... }
 *
 * Run standalone:
 *
 *   vite-node skills/ivue/ivue-generator-standard.ts -- \
 *     --source-root src --test-glob 'src/**\/*.test.ts'
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { Static } from '../../lib/Static';
import { CheckStandard } from './ivue-standards-check';

class $GeneratorStandard extends CheckStandard.$Class {
  static get invariants_a_test_file_opens_with_its_generator_header(): CheckStandard.StandardCheck {
    return this.defineCheck('invariants_a_test_file_opens_with_its_generator_header', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) findings.push(this.finding(this.invariants_a_test_file_opens_with_its_generator_header, unit, 1, `no \`${this.$grammar.GENERATOR}\` header — the test file opens with its generator header, before any import`));
        else if (!header.firstContent) findings.push(this.finding(this.invariants_a_test_file_opens_with_its_generator_header, unit, 1, 'the generator header is not the first content — nothing precedes it, imports follow it'));
      }
      return findings;
    });
  }

  static get invariants_a_generator_header_carries_both_registers_in_order(): CheckStandard.StandardCheck {
    return this.defineCheck('invariants_a_generator_header_carries_both_registers_in_order', (context) => {
      const findings: CheckStandard.Finding[] = [];
      const grammar = this.$grammar;
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        const line = unit.lines.findIndex((text) => text.includes(grammar.GENERATOR)) + 1;
        if (unit.text.split(grammar.GENERATOR).length > 2) findings.push(this.finding(this.invariants_a_generator_header_carries_both_registers_in_order, unit, line, `duplicate \`${grammar.GENERATOR}\` sentinel`));
        if (!header.bothRegisters) findings.push(this.finding(this.invariants_a_generator_header_carries_both_registers_in_order, unit, line, `missing \`${grammar.GENERATOR_DESCRIBED}\` register`));
        else if (!header.orderedRegisters) findings.push(this.finding(this.invariants_a_generator_header_carries_both_registers_in_order, unit, line, `\`${grammar.GENERATOR_DESCRIBED}\` must follow \`${grammar.GENERATOR}\``));
        if (!header.goal) findings.push(this.finding(this.invariants_a_generator_header_carries_both_registers_in_order, unit, line, 'the formal register needs a `Goal:` line'));
        if (!header.impossibilities.size) findings.push(this.finding(this.invariants_a_generator_header_carries_both_registers_in_order, unit, line, 'the formal register needs at least one `Impossible if true:` line'));
      }
      return findings;
    });
  }

  static get invariants_a_header_symbol_is_declared_in_the_sibling_source(): CheckStandard.StandardCheck {
    return this.defineCheck('invariants_a_header_symbol_is_declared_in_the_sibling_source', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        let subjectTexts: string[] = [];
        if (header.subjects.length) {
          let broken = false;
          for (const subject of header.subjects) {
            const candidates = [resolve(dirname(unit.path), subject.path), resolve(context.cwd, subject.path)];
            const found = candidates.find(existsSync);
            if (!found) {
              findings.push(this.finding(this.invariants_a_header_symbol_is_declared_in_the_sibling_source, unit, subject.line, `Subject path does not exist: ${subject.path}`));
              broken = true;
              continue;
            }
            subjectTexts.push(readFileSync(found, 'utf8'));
          }
          if (broken) continue;
        } else {
          const sourcePath = this.siblingSourcePath(unit.path);
          if (!existsSync(sourcePath)) {
            findings.push(this.finding(this.invariants_a_header_symbol_is_declared_in_the_sibling_source, unit, 1, `no sibling source \`${basename(sourcePath)}\` for this test file's header symbols — name the source with a \`Subject:\` line, or colocate the test`));
            continue;
          }
          subjectTexts = [readFileSync(sourcePath, 'utf8')];
        }
        const subjectDescription = header.subjects.length ? header.subjects.map((subject) => basename(subject.path)).join(', ') : basename(this.siblingSourcePath(unit.path));
        for (const { symbol, line } of header.domainClaims.values()) {
          if (!subjectTexts.some((text) => this.declaredInSource(text, symbol)))
            findings.push(this.finding(this.invariants_a_header_symbol_is_declared_in_the_sibling_source, unit, line, `header symbol \`${symbol}\` is not declared in ${subjectDescription}`));
        }
      }
      return findings;
    });
  }

  static get invariants_a_claim_annotation_sits_directly_above_its_test(): CheckStandard.StandardCheck {
    return this.defineCheck('invariants_a_claim_annotation_sits_directly_above_its_test', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        for (const proof of this.parseProofs(unit, header)) {
          if (!proof.bound) findings.push(this.finding(this.invariants_a_claim_annotation_sits_directly_above_its_test, unit, proof.line, 'proof annotation must sit directly above a test (an optional doc comment may sit between)'));
        }
      }
      return findings;
    });
  }

  static get invariants_header_claims_and_annotated_tests_match_one_to_one(): CheckStandard.StandardCheck {
    return this.defineCheck('invariants_header_claims_and_annotated_tests_match_one_to_one', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        const proofs = this.parseProofs(unit, header).filter((proof) => proof.bound && proof.type === 'domain');
        const proved = new Set<string>();
        for (const proof of proofs) {
          const key = `${proof.symbol} — ${proof.claim}`;
          if (header.domainClaims.has(key)) proved.add(key);
          else if (!header.impossibilities.has(proof.claim ?? '')) findings.push(this.finding(this.invariants_header_claims_and_annotated_tests_match_one_to_one, unit, proof.line, `annotated test claim is absent from the header: ${key}`));
        }
        for (const [key, { line }] of header.domainClaims) {
          if (!proved.has(key)) findings.push(this.finding(this.invariants_header_claims_and_annotated_tests_match_one_to_one, unit, line, `header ${this.$grammar.DOMAIN} has no annotated test: ${key}`));
        }
      }
      return findings;
    });
  }

  static get invariants_an_impossibility_is_proved_by_an_exact_negative_test(): CheckStandard.StandardCheck {
    return this.defineCheck('invariants_an_impossibility_is_proved_by_an_exact_negative_test', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        const proofs = this.parseProofs(unit, header).filter((proof) => proof.bound);
        const proved = new Set<string>();
        for (const proof of proofs) {
          if (proof.type === 'impossible') {
            if (header.impossibilities.has(proof.claim ?? '')) {
              proved.add(proof.claim ?? '');
              if (!header.domainSymbols.has(proof.symbol ?? '')) findings.push(this.finding(this.invariants_an_impossibility_is_proved_by_an_exact_negative_test, unit, proof.line, `impossibility proof symbol \`${proof.symbol}\` is absent from the header`));
            } else if (header.domainClaims.has(`${proof.symbol} — ${proof.claim}`)) findings.push(this.finding(this.invariants_an_impossibility_is_proved_by_an_exact_negative_test, unit, proof.line, `an invariant is labeled as an impossibility: ${proof.claim}`));
            else findings.push(this.finding(this.invariants_an_impossibility_is_proved_by_an_exact_negative_test, unit, proof.line, `impossibility text is not exact — no header line reads: ${proof.claim}`));
          }
          if (proof.type === 'domain' && header.impossibilities.has(proof.claim ?? ''))
            findings.push(this.finding(this.invariants_an_impossibility_is_proved_by_an_exact_negative_test, unit, proof.line, `an impossibility is labeled as an invariant: ${proof.claim}`));
        }
        for (const [claim, line] of header.impossibilities) {
          if (!proved.has(claim)) findings.push(this.finding(this.invariants_an_impossibility_is_proved_by_an_exact_negative_test, unit, line, `Impossible if true has no annotated negative test: ${claim}`));
        }
      }
      return findings;
    });
  }

  static get invariants_a_contract_pointer_resolves_and_is_proved(): CheckStandard.StandardCheck {
    return this.defineCheck('invariants_a_contract_pointer_resolves_and_is_proved', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        const proofs = this.parseProofs(unit, header).filter((proof) => proof.bound && proof.type === 'record');
        const provedNames = new Set(proofs.map((proof) => this.headingSlug(proof.name ?? '')));
        for (const link of header.contractLinks) {
          if (!link.anchor) {
            findings.push(this.finding(this.invariants_a_contract_pointer_resolves_and_is_proved, unit, link.line, `contract link \`${link.file}\` needs a record anchor`));
            continue;
          }
          const candidates = [resolve(dirname(unit.path), link.file), resolve(context.cwd, link.file)];
          const slugs = candidates.map((candidate) => this.contractSlugs(candidate)).find((set) => set !== null) ?? null;
          if (!slugs) {
            findings.push(this.finding(this.invariants_a_contract_pointer_resolves_and_is_proved, unit, link.line, `contract not found: ${link.file}`));
            continue;
          }
          if (!slugs.has(link.anchor)) {
            findings.push(this.finding(this.invariants_a_contract_pointer_resolves_and_is_proved, unit, link.line, `anchor \`#${link.anchor}\` does not resolve in ${link.file}`));
            continue;
          }
          if (!provedNames.has(link.anchor)) findings.push(this.finding(this.invariants_a_contract_pointer_resolves_and_is_proved, unit, link.line, `header contract-record pointer has no annotated test: ${link.anchor}`));
        }
        for (const proof of proofs) {
          if (!header.contractLinks.some((link) => link.anchor === this.headingSlug(proof.name ?? ''))) findings.push(this.finding(this.invariants_a_contract_pointer_resolves_and_is_proved, unit, proof.line, `annotated record is absent from the header: ${proof.name}`));
        }
      }
      return findings;
    });
  }

  static get invariants_a_source_tripwire_resolves_to_its_sibling_header(): CheckStandard.StandardCheck {
    return this.defineCheck('invariants_a_source_tripwire_resolves_to_its_sibling_header', (context) => {
      const findings: CheckStandard.Finding[] = [];
      const grammar = this.$grammar;
      const SYMBOL_ONLY = new RegExp(`^\\s*//\\s*${grammar.DOMAIN}:\\s*([^—\\n]+?)\\s*$`);
      for (const unit of context.sources) {
        const testPath = unit.path.replace(/\.ts$/, '.test.ts');
        let siblingSymbols: Set<string> | null = null;
        unit.lines.forEach((line, index) => {
          if (!line.includes(`${grammar.DOMAIN}:`)) return;
          const symbolOnly = SYMBOL_ONLY.exec(line);
          if (!symbolOnly) {
            findings.push(this.finding(this.invariants_a_source_tripwire_resolves_to_its_sibling_header, unit, index + 1, `source tripwires carry only the symbol: \`// ${grammar.DOMAIN}: <symbol>\``));
            return;
          }
          if (siblingSymbols === null) {
            siblingSymbols = existsSync(testPath) ? this.parseHeader(this.toUnit(context.cwd, testPath)).domainSymbols : new Set();
          }
          if (!siblingSymbols.has(symbolOnly[1].trim()))
            findings.push(this.finding(this.invariants_a_source_tripwire_resolves_to_its_sibling_header, unit, index + 1, `tripwire \`${symbolOnly[1].trim()}\` has no header claim in ${basename(testPath)}`));
        });
        if (unit.text.includes(grammar.GENERATOR)) findings.push(this.finding(this.invariants_a_source_tripwire_resolves_to_its_sibling_header, unit, unit.lines.findIndex((line) => line.includes(grammar.GENERATOR)) + 1, `\`${grammar.GENERATOR}\` belongs at the top of the sibling test file, not in source`));
      }
      return findings;
    });
  }

  static get invariants_a_test_caveat_derives_from_a_tested_claim(): CheckStandard.StandardCheck {
    return this.defineCheck('invariants_a_test_caveat_derives_from_a_tested_claim', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present || !header.described) continue;
        const symbols = [...header.domainSymbols];
        const startLine = unit.lines.findIndex((line) => line.includes(this.$grammar.GENERATOR_DESCRIBED)) + 1;
        const sentences = header.described.replace(/^\s*\*\s?/gm, '').split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (!/\b(?:must|never|always|only|cannot)\b/i.test(sentence)) continue;
          if (/Open question:/i.test(sentence)) continue;
          if (symbols.some((symbol) => sentence.includes(symbol))) continue;
          findings.push(this.finding(this.invariants_a_test_caveat_derives_from_a_tested_claim, unit, startLine, `described-register caveat names no header symbol — a constraint the tests do not reach is a claim without a proof: "${sentence.trim().slice(0, 90)}"`));
        }
      }
      return findings;
    });
  }

  static get invariants_two_test_files_do_not_share_one_generator_header(): CheckStandard.StandardCheck {
    return this.defineCheck('invariants_two_test_files_do_not_share_one_generator_header', (context) => {
      const findings: CheckStandard.Finding[] = [];
      const normalized = new Map<string, CheckStandard.SourceUnit>();
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        let text = `${header.goal}\n${header.described}`.replace(/\s+/g, ' ').trim();
        for (const symbol of header.domainSymbols) text = text.replaceAll(symbol, '<symbol>');
        text = text.replaceAll(basename(unit.path).replace(/\.test\.ts$/, ''), '<file>');
        if (!text) continue;
        const twin = normalized.get(text);
        if (twin) findings.push(this.finding(this.invariants_two_test_files_do_not_share_one_generator_header, unit, 1, `generator header is a template twin of ${twin.relativePath} — a Goal that fits another file with the name swapped is not a Goal`));
        else normalized.set(text, unit);
      }
      return findings;
    });
  }

  static get checks(): readonly CheckStandard.StandardCheck[] {
    return [
      ...super.checks,
      this.invariants_a_test_file_opens_with_its_generator_header,
      this.invariants_a_generator_header_carries_both_registers_in_order,
      this.invariants_a_header_symbol_is_declared_in_the_sibling_source,
      this.invariants_a_claim_annotation_sits_directly_above_its_test,
      this.invariants_header_claims_and_annotated_tests_match_one_to_one,
      this.invariants_an_impossibility_is_proved_by_an_exact_negative_test,
      this.invariants_a_contract_pointer_resolves_and_is_proved,
      this.invariants_a_source_tripwire_resolves_to_its_sibling_header,
      this.invariants_a_test_caveat_derives_from_a_tested_claim,
      this.invariants_two_test_files_do_not_share_one_generator_header,
    ];
  }

  static get proofs(): Readonly<Record<string, CheckStandard.CheckProof>> {
    const fixture = this.$fixtures;
    const grammar = this.$grammar;
    const contractName = `demo${grammar.CONTRACT_SUFFIX}`;
    const box = { 'src/Box.ts': fixture.validClass };
    const boxAndTest = { ...box, 'src/Box.test.ts': fixture.validTest };
    const crate = (text: string) => text.replaceAll('Box', 'Crate');
    const pointerTest = (pointer: string, annotation: string) =>
      fixture.validTest
        .replace('Impossible if true:', `${pointer}\nImpossible if true:`)
        .replace(`// ${grammar.IMPOSSIBLE}: $Box — height decreases without a grow call\ntest('height never decreases on its own'`, `${annotation}// ${grammar.IMPOSSIBLE}: $Box — height decreases without a grow call\ntest('height never decreases on its own'`);
    return {
      ...super.proofs,
      'invariants_a_test_file_opens_with_its_generator_header': {
        claim: 'If a file is a test, then its first content is the generator header',
        impossibility: 'a file breaking invariants_a_test_file_opens_with_its_generator_header passes the gate',
        red: [{
          files: {
            ...box,
            'src/Box.test.ts': fixture.validTest.slice(fixture.validTest.indexOf('import { expect')),
            'src/Crate.ts': crate(fixture.validClass),
            'src/Crate.test.ts': crate(`import { expect, test } from 'vitest';\n${fixture.validTest}`),
          },
          expectFindings: [/opens with its generator header, before any import/, /not the first content/],
          expectCount: 2,
        }],
        green: [{ files: boxAndTest }],
      },
      'invariants_a_generator_header_carries_both_registers_in_order': {
        claim: 'If a header exists, then it has one Goal, the formal register, at least one Impossible if true, and the described register after the formal one',
        impossibility: 'a file breaking invariants_a_generator_header_carries_both_registers_in_order passes the gate',
        red: [{
          files: {
            ...box,
            'src/Box.test.ts': fixture.validTest.replace(`${grammar.GENERATOR}\nGoal:`, `${grammar.GENERATOR_DESCRIBED}\nThe $Box prose.\n${grammar.GENERATOR}\nGoal:`).replace(`\n${grammar.GENERATOR_DESCRIBED}\nThe $Box height is the only mutable state, so growth is the single write path the tests must hold.\n`, '\n'),
            'src/Crate.ts': crate(fixture.validClass),
            'src/Crate.test.ts': crate(fixture.validTest.replace('Goal: Prove the box grows by exactly one height unit per grow call and that height never moves on its own.\n', '').replace('Impossible if true: height decreases without a grow call\n', '').replace(`// ${grammar.IMPOSSIBLE}: $Box — height decreases without a grow call\n`, '')),
          },
          expectFindings: [/must follow/, /needs a `Goal:` line/, /at least one `Impossible if true:`/],
        }],
        green: [{ files: boxAndTest }],
      },
      'invariants_a_header_symbol_is_declared_in_the_sibling_source': {
        claim: 'If a header names a symbol, then the named Subject or the same-named sibling source declares it',
        impossibility: 'a file breaking invariants_a_header_symbol_is_declared_in_the_sibling_source passes the gate',
        red: [
          { files: { ...box, 'src/Box.test.ts': fixture.validTest.replaceAll('$Box —', '$Crate —') }, expectFindings: [/`\$Crate` is not declared in Box\.ts/] },
          { files: { ...box, 'src/Box.test.ts': fixture.validTest.replace('Goal:', 'Subject: Missing.ts\nGoal:') }, expectFindings: [/Subject path does not exist: Missing\.ts/] },
        ],
        green: [
          { files: boxAndTest },
          { files: { ...box, 'specs/Growth.test.ts': fixture.validTest.replace('Goal:', 'Subject: src/Box.ts\nGoal:') }, options: { testGlobs: ['specs/**/*.test.ts'] } },
        ],
      },
      'invariants_a_claim_annotation_sits_directly_above_its_test': {
        claim: 'If a proof annotation is written, then a test follows it directly, an optional doc comment between',
        impossibility: 'a file breaking invariants_a_claim_annotation_sits_directly_above_its_test passes the gate',
        red: [{ files: { ...box, 'src/Box.test.ts': fixture.validTest.replace(`// ${grammar.DOMAIN}: $Box — If grow is called, then height increases by one\ntest('grow`, `// ${grammar.DOMAIN}: $Box — If grow is called, then height increases by one\nconst seed = 1;\ntest('grow`) }, expectFindings: [/must sit directly above a test/] }],
        green: [{ files: { ...box, 'src/Box.test.ts': fixture.validTest.replace(`// ${grammar.DOMAIN}: $Box — If grow is called, then height increases by one\ntest('grow`, `// ${grammar.DOMAIN}: $Box — If grow is called, then height increases by one\n/** The spec: one grow, one unit. */\ntest('grow`) } }],
      },
      'invariants_header_claims_and_annotated_tests_match_one_to_one': {
        claim: 'If a header states a domain claim, then an annotated test proves it, and every annotated claim is in the header',
        impossibility: 'a file breaking invariants_header_claims_and_annotated_tests_match_one_to_one passes the gate',
        red: [{ files: { ...box, 'src/Box.test.ts': fixture.validTest.replace(`// ${grammar.DOMAIN}: $Box — If grow is called, then height increases by one\ntest('grow`, `// ${grammar.DOMAIN}: $Box — If grow is called, then height doubles\ntest('grow`) }, expectFindings: [/has no annotated test/, /absent from the header/] }],
        green: [{ files: boxAndTest }],
      },
      'invariants_an_impossibility_is_proved_by_an_exact_negative_test': {
        claim: 'If a header states an impossibility, then a negative test carries its exact text and a header symbol',
        impossibility: 'a file breaking invariants_an_impossibility_is_proved_by_an_exact_negative_test passes the gate',
        red: [{
          files: {
            ...box,
            'src/Box.test.ts': fixture.validTest.replace(`// ${grammar.IMPOSSIBLE}: $Box — height decreases without a grow call`, `// ${grammar.IMPOSSIBLE}: $Box — height decreases spontaneously`),
            'src/Crate.ts': crate(fixture.validClass),
            'src/Crate.test.ts': crate(fixture.validTest.replace(`// ${grammar.IMPOSSIBLE}: $Box — height decreases without a grow call`, `// ${grammar.DOMAIN}: $Box — height decreases without a grow call`)),
          },
          expectFindings: [/impossibility text is not exact/, /has no annotated negative test/, /an impossibility is labeled as an invariant/],
        }],
        green: [{ files: boxAndTest }],
      },
      'invariants_a_contract_pointer_resolves_and_is_proved': {
        claim: 'If a header links a contract record, then the anchor resolves and an annotated test proves it',
        impossibility: 'a file breaking invariants_a_contract_pointer_resolves_and_is_proved passes the gate',
        red: [{
          files: {
            [contractName]: fixture.demoContract,
            ...box,
            'src/Box.test.ts': pointerTest(`[A box never shrinks by itself](../${contractName}#a-box-never-grows)`, ''),
            'src/Crate.ts': crate(fixture.validClass),
            'src/Crate.test.ts': crate(pointerTest(`[A box never shrinks by itself](../${contractName}#a-box-never-shrinks-by-itself)`, '')),
          },
          expectFindings: [/does not resolve/, /pointer has no annotated test/],
        }],
        green: [{
          files: {
            [contractName]: fixture.demoContract,
            ...box,
            'src/Box.test.ts': pointerTest(`[A box never shrinks by itself](../${contractName}#a-box-never-shrinks-by-itself)`, `// ${grammar.RECORD}: A box never shrinks by itself (${contractName})\n`),
          },
        }],
      },
      'invariants_a_source_tripwire_resolves_to_its_sibling_header': {
        claim: 'If source carries a domain tripwire, then it names only a symbol the sibling header claims',
        impossibility: 'a file breaking invariants_a_source_tripwire_resolves_to_its_sibling_header passes the gate',
        red: [{ files: { 'src/Box.ts': fixture.validClass.replace('  grow() {', `  // ${grammar.DOMAIN}: $Crate\n  grow() {`), 'src/Box.test.ts': fixture.validTest }, expectFindings: [/tripwire `\$Crate` has no header claim in Box\.test\.ts/] }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace('  grow() {', `  // ${grammar.DOMAIN}: $Box\n  grow() {`), 'src/Box.test.ts': fixture.validTest } }],
      },
      'invariants_a_test_caveat_derives_from_a_tested_claim': {
        claim: 'If the described register constrains, then the constraint names a header symbol',
        impossibility: 'a file breaking invariants_a_test_caveat_derives_from_a_tested_claim passes the gate',
        red: [{ files: { ...box, 'src/Box.test.ts': fixture.validTest.replace('so growth is the single write path the tests must hold.', 'so growth is the single write path the tests must hold. Width must never change after construction.') }, expectFindings: [/Width must never change/] }],
        green: [{ files: boxAndTest }],
      },
      'invariants_two_test_files_do_not_share_one_generator_header': {
        claim: 'If two test files exist, then their Goal and described registers differ beyond their own symbol names',
        impossibility: 'a file breaking invariants_two_test_files_do_not_share_one_generator_header passes the gate',
        red: [{ files: { ...boxAndTest, 'src/Crate.ts': crate(fixture.validClass), 'src/Crate.test.ts': crate(fixture.validTest) }, expectFindings: [/template twin/] }],
        green: [{
          files: {
            ...boxAndTest,
            'src/Crate.ts': crate(fixture.validClass),
            'src/Crate.test.ts': crate(fixture.validTest)
              .replace('Goal: Prove the box grows by exactly one height unit per grow call and that height never moves on its own.', 'Goal: Prove a crate reports the area its width and height imply, and nothing else moves it.')
              .replace('The $Crate height is the only mutable state, so growth is the single write path the tests must hold.', 'Area is derived on every read; the $Crate class holds no cached area to drift.'),
          },
        }],
      },
    };
  }
}

export namespace GeneratorStandard {
  export const $Class = Static($GeneratorStandard);
  export let Class = $Class;

  // Registers this gate as the CLI entry — superseding the base gate's own
  // registration, because the entry module evaluates last.
  CheckStandard.bootstrapCli(Class);
}
