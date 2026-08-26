/**
 * invariants-check.ts — the invariant-methodology checker, repo-agnostic.
 *
 * Verifies the generator-header discipline in ANY codebase — TypeScript,
 * Rust, Python, C, Go, or anything a profile can describe: test files open
 * with a generator header, claims bind to tests one to one, impossibilities
 * carry exact negative proofs, contract pointers resolve, source tripwires
 * point at real claims.
 *
 * The methodology is a COMMENT grammar, so the core is language-neutral;
 * only the binding to code varies, and that variance lives in LANGUAGE
 * PROFILES (data): comment leads, the test-boundary pattern, the
 * declaration pattern, test-file naming. Add a language by adding a
 * profile row; subclass only when a profile cannot express the shape:
 *
 *   class $HouseCheck extends InvariantsCheck.$Class {
 *     static get languages() { return [...super.languages, myProfile]; }
 *   }
 *
 * Runs under Bun (or any TS-transforming runner):
 *
 *   bun invariants-check.ts --source-root src --test-glob 'src/**\/*_test.rs'
 *   bun invariants-check.ts --list
 *   bun invariants-check.ts --prove [check_name]
 *
 * Checks carry ONE snake_case identity (getter name = finding label =
 * skip token = severity key), each with claim + impossibility + red and
 * green fixture arms in the languages it guards; --prove runs them all.
 */
// TODO(ivue >= 2.4.1): import { Static } from 'ivue/extras' — the published
// build predates the Static() re-wrap fix (ivue@28c27d8); until it ships,
// this repo's engine copy is the source.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { Static } from '../../../../lib/Static';

// ---------------------------------------------------------------------------
// public types

export interface Finding {
  check: string;
  file: string;
  line: number;
  message: string;
}

/** How one language binds the comment grammar to its code. */
export interface LanguageProfile {
  name: string;
  extensions: string[];
  /** line-comment openers, longest first */
  commentLeads: string[];
  /** block-comment delimiter pairs (docstrings count) */
  blockComments: [string, string][];
  /** a line that BEGINS a test (the attribute/keyword line) */
  testPattern: RegExp;
  /** a pattern proving `symbol` is declared in a source file; null = word-boundary presence */
  declares: ((symbol: string) => RegExp) | null;
  /** stem suffixes/prefixes that mark conventional test files (Foo.test.ts, foo_test.rs, test_foo.py) */
  testStemSuffixes: string[];
  testStemPrefixes: string[];
}

export interface CheckerOptions {
  cwd: string;
  sourceRoots: string[];
  testGlobs: string[];
  skipListPath?: string;
  warnChecks?: string[];
  offChecks?: string[];
}

export interface CheckerResult {
  findings: Finding[];
  warnings: Finding[];
  suppressed: Finding[];
  sources: string[];
  tests: string[];
  off: string[];
}

export interface Check {
  name: string;
  run(context: CheckerContext): Finding[];
}

export interface ProofArm {
  files: Record<string, string>;
  options?: Partial<CheckerOptions>;
  expectFindings?: (RegExp | string)[];
  expectCount?: number;
  expectThrows?: RegExp;
}

export interface Proof {
  claim: string;
  impossibility: string;
  red: ProofArm[];
  green: ProofArm[];
}

export interface ProveReport {
  problems: string[];
  ran: { red: number; green: number };
}

export interface Unit {
  path: string;
  relativePath: string;
  text: string;
  lines: string[];
  profile: LanguageProfile;
}

export interface CheckerContext {
  cwd: string;
  sources: Unit[];
  tests: Unit[];
}

interface Header {
  present: boolean;
  firstContent: boolean;
  goal: string;
  described: string;
  orderedRegisters: boolean;
  bothRegisters: boolean;
  duplicateSentinel: boolean;
  subjects: { path: string; line: number }[];
  domainClaims: Map<string, { symbol: string; claim: string; line: number }>;
  domainSymbols: Set<string>;
  impossibilities: Map<string, number>;
  contractLinks: { text: string; file: string; anchor: string; line: number }[];
  endLine: number;
}

interface Annotation {
  type: 'domain' | 'impossible' | 'record';
  symbol?: string;
  claim?: string;
  name?: string;
  line: number;
  bound: boolean;
}

interface SkipRow {
  path: string;
  check: string;
  reason: string;
  line: number;
}

// ---------------------------------------------------------------------------
// the checker — statics only; getters carry data, methods carry behavior

class $InvariantsCheck {
  static readonly EXCLUDED_DIRECTORIES = new Set(['node_modules', 'dist', 'build', 'target', '.git', '__pycache__', '.venv', 'vendor']);

  /** The language profiles — the whole per-language surface. Extend or
   * override this getter to teach the checker a new ecosystem. */
  static get languages(): readonly LanguageProfile[] {
    return [
      {
        name: 'typescript',
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
        commentLeads: ['//', '*'],
        blockComments: [['/*', '*/']],
        testPattern: /\b(?:test|it)(?:\.[A-Za-z]+)?\s*\(/,
        declares: (symbol) => new RegExp(`(?:class|function|interface|type|enum|namespace|const|let|var)\\s+${escapeRegExp(symbol)}\\b`),
        testStemSuffixes: ['.test', '.spec'],
        testStemPrefixes: [],
      },
      {
        name: 'rust',
        extensions: ['.rs'],
        commentLeads: ['///', '//!', '//'],
        blockComments: [['/*', '*/']],
        testPattern: /^\s*#\[[\w:]*test(?:\]|\()/,
        declares: (symbol) => new RegExp(`(?:fn|struct|enum|trait|mod|const|static|type|impl(?:<[^>]*>)?)\\s+${escapeRegExp(symbol)}\\b`),
        testStemSuffixes: ['_test', '_tests'],
        testStemPrefixes: [],
      },
      {
        name: 'python',
        extensions: ['.py'],
        commentLeads: ['#'],
        blockComments: [['"""', '"""'], ["'''", "'''"]],
        testPattern: /^\s*(?:async\s+)?def\s+test_\w+/,
        declares: (symbol) => new RegExp(`(?:def|class)\\s+${escapeRegExp(symbol)}\\b|^${escapeRegExp(symbol)}\\s*=`, 'm'),
        testStemSuffixes: ['_test'],
        testStemPrefixes: ['test_'],
      },
      {
        name: 'c',
        extensions: ['.c', '.h', '.cc', '.cpp', '.hpp'],
        commentLeads: ['//', '*'],
        blockComments: [['/*', '*/']],
        testPattern: /^\s*(?:static\s+)?void\s+test_\w+\s*\(|^\s*TEST[A-Z_]*\s*\(/,
        declares: null, // C declaration grammar is context-heavy — word-boundary presence
        testStemSuffixes: ['_test', '_tests'],
        testStemPrefixes: ['test_'],
      },
      {
        name: 'go',
        extensions: ['.go'],
        commentLeads: ['//'],
        blockComments: [['/*', '*/']],
        testPattern: /^\s*func\s+Test\w+/,
        declares: (symbol) => new RegExp(`(?:func|type|var|const)\\s+(?:\\([^)]*\\)\\s+)?${escapeRegExp(symbol)}\\b`),
        testStemSuffixes: ['_test'],
        testStemPrefixes: [],
      },
    ];
  }

  /** Fallback for a test file whose extension no profile claims: comment
   * grammar with common leads, and any code line can be a test boundary. */
  static get fallbackProfile(): LanguageProfile {
    return {
      name: 'generic',
      extensions: [],
      commentLeads: ['//', '#', '*', '--', ';'],
      blockComments: [['/*', '*/']],
      testPattern: /\S/,
      declares: null,
      testStemSuffixes: ['_test', '.test', '.spec'],
      testStemPrefixes: ['test_'],
    };
  }

  /** Default severity rulings ({ check_name: 'error' | 'warn' | 'off' });
   * everything unlisted is an error. */
  static get severities(): Readonly<Record<string, 'error' | 'warn' | 'off'>> {
    return {};
  }

  // The grammar's tokens, assembled at runtime: this file is itself scanned
  // by invariant tooling, and a literal sentinel would read as a header.
  static get $grammar() {
    const GENERATOR = ['===', 'GENERATOR', '==='].join(' ');
    const GENERATOR_DESCRIBED = ['===', 'GENERATOR-DESCRIBED', '==='].join(' ');
    const DOMAIN = 'domain-' + 'invariant';
    const IMPOSSIBLE = 'impossible-if-' + 'true';
    const RECORD = 'inv' + 'ariant';
    return {
      GENERATOR,
      GENERATOR_DESCRIBED,
      DOMAIN,
      IMPOSSIBLE,
      RECORD,
      CONTRACT_SUFFIX: `.${RECORD}s.md`,
      DOMAIN_LINE: new RegExp(`^${DOMAIN}:\\s*(.+?)\\s+—\\s+(.+?)\\s*$`),
      DOMAIN_SYMBOL_ONLY: new RegExp(`^${DOMAIN}:\\s*([^—]+?)\\s*$`),
      IMPOSSIBLE_LINE: new RegExp(`^${IMPOSSIBLE}:\\s*(.+?)\\s+—\\s+(.+?)\\s*$`),
      RECORD_LINE: new RegExp(`^${RECORD}:\\s*([^(]+?)\\s*\\(([^)]*\\.${RECORD}s\\.md)\\)`),
      CONTRACT_LINK: new RegExp(`\\[([^\\]]+)\\]\\(([^)\\s]*\\.${RECORD}s\\.md)(#[^)\\s]*)?\\)`, 'g'),
    };
  }

  // -------------------------------------------------------------------------
  // the checks — the getter name IS the check's one snake_case identity

  static get a_test_file_opens_with_its_generator_header(): Check {
    return this.defineCheck('a_test_file_opens_with_its_generator_header', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) findings.push(this.finding(this.a_test_file_opens_with_its_generator_header, unit, 1, `no \`${this.$grammar.GENERATOR}\` header — a test file opens with its generator header, before any code`));
        else if (!header.firstContent) findings.push(this.finding(this.a_test_file_opens_with_its_generator_header, unit, 1, 'the generator header is not the first content — nothing but comments may precede it'));
      }
      return findings;
    });
  }

  static get a_generator_header_carries_both_registers_in_order(): Check {
    return this.defineCheck('a_generator_header_carries_both_registers_in_order', (context) => {
      const findings: Finding[] = [];
      const grammar = this.$grammar;
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        const line = unit.lines.findIndex((text) => text.includes(grammar.GENERATOR)) + 1;
        if (header.duplicateSentinel) findings.push(this.finding(this.a_generator_header_carries_both_registers_in_order, unit, line, `duplicate \`${grammar.GENERATOR}\` sentinel`));
        if (!header.bothRegisters) findings.push(this.finding(this.a_generator_header_carries_both_registers_in_order, unit, line, `missing \`${grammar.GENERATOR_DESCRIBED}\` register`));
        else if (!header.orderedRegisters) findings.push(this.finding(this.a_generator_header_carries_both_registers_in_order, unit, line, `\`${grammar.GENERATOR_DESCRIBED}\` must follow \`${grammar.GENERATOR}\``));
        if (!header.goal) findings.push(this.finding(this.a_generator_header_carries_both_registers_in_order, unit, line, 'the formal register needs a `Goal:` line'));
        if (!header.impossibilities.size) findings.push(this.finding(this.a_generator_header_carries_both_registers_in_order, unit, line, 'the formal register needs at least one `Impossible if true:` line'));
      }
      return findings;
    });
  }

  static get a_header_symbol_is_declared_in_the_subject_source(): Check {
    return this.defineCheck('a_header_symbol_is_declared_in_the_subject_source', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present || !header.domainClaims.size) continue;
        let subjectTexts: string[] = [];
        let subjectLabel = '';
        if (header.subjects.length) {
          let broken = false;
          for (const subject of header.subjects) {
            const candidates = [resolve(dirname(unit.path), subject.path), resolve(context.cwd, subject.path)];
            const found = candidates.find(existsSync);
            if (!found) {
              findings.push(this.finding(this.a_header_symbol_is_declared_in_the_subject_source, unit, subject.line, `Subject path does not exist: ${subject.path}`));
              broken = true;
              continue;
            }
            subjectTexts.push(readFileSync(found, 'utf8'));
          }
          if (broken) continue;
          subjectLabel = header.subjects.map((subject) => basename(subject.path)).join(', ');
        } else {
          const sibling = this.siblingSource(context, unit);
          if (!sibling) {
            findings.push(this.finding(this.a_header_symbol_is_declared_in_the_subject_source, unit, 1, 'no sibling source found for this test file — name the source with a `Subject:` line, or colocate the test with its subject'));
            continue;
          }
          subjectTexts = [sibling.text];
          subjectLabel = basename(sibling.path);
        }
        for (const { symbol, line } of header.domainClaims.values()) {
          if (!subjectTexts.some((text) => this.declaredIn(text, symbol, unit.profile)))
            findings.push(this.finding(this.a_header_symbol_is_declared_in_the_subject_source, unit, line, `header symbol \`${symbol}\` is not declared in ${subjectLabel}`));
        }
      }
      return findings;
    });
  }

  static get a_claim_annotation_sits_directly_above_its_test(): Check {
    return this.defineCheck('a_claim_annotation_sits_directly_above_its_test', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        for (const annotation of this.parseAnnotations(unit, header)) {
          if (!annotation.bound) findings.push(this.finding(this.a_claim_annotation_sits_directly_above_its_test, unit, annotation.line, 'an annotation must sit directly above a test (comments may sit between)'));
        }
      }
      return findings;
    });
  }

  static get header_claims_and_annotated_tests_match_one_to_one(): Check {
    return this.defineCheck('header_claims_and_annotated_tests_match_one_to_one', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        const bound = this.parseAnnotations(unit, header).filter((annotation) => annotation.bound && annotation.type === 'domain');
        const proved = new Set<string>();
        for (const annotation of bound) {
          const key = `${annotation.symbol} — ${annotation.claim}`;
          if (header.domainClaims.has(key)) proved.add(key);
          else if (!header.impossibilities.has(annotation.claim ?? '')) findings.push(this.finding(this.header_claims_and_annotated_tests_match_one_to_one, unit, annotation.line, `annotated test claim is absent from the header: ${key}`));
        }
        for (const [key, { line }] of header.domainClaims) {
          if (!proved.has(key)) findings.push(this.finding(this.header_claims_and_annotated_tests_match_one_to_one, unit, line, `header ${this.$grammar.DOMAIN} has no annotated test: ${key}`));
        }
      }
      return findings;
    });
  }

  static get an_impossibility_is_proved_by_an_exact_negative_test(): Check {
    return this.defineCheck('an_impossibility_is_proved_by_an_exact_negative_test', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        const bound = this.parseAnnotations(unit, header).filter((annotation) => annotation.bound);
        const proved = new Set<string>();
        for (const annotation of bound) {
          if (annotation.type === 'impossible') {
            if (header.impossibilities.has(annotation.claim ?? '')) {
              proved.add(annotation.claim ?? '');
              if (!header.domainSymbols.has(annotation.symbol ?? '')) findings.push(this.finding(this.an_impossibility_is_proved_by_an_exact_negative_test, unit, annotation.line, `impossibility proof symbol \`${annotation.symbol}\` is absent from the header`));
            } else if (header.domainClaims.has(`${annotation.symbol} — ${annotation.claim}`)) findings.push(this.finding(this.an_impossibility_is_proved_by_an_exact_negative_test, unit, annotation.line, `an invariant is labeled as an impossibility: ${annotation.claim}`));
            else findings.push(this.finding(this.an_impossibility_is_proved_by_an_exact_negative_test, unit, annotation.line, `impossibility text is not exact — no header line reads: ${annotation.claim}`));
          }
          if (annotation.type === 'domain' && header.impossibilities.has(annotation.claim ?? ''))
            findings.push(this.finding(this.an_impossibility_is_proved_by_an_exact_negative_test, unit, annotation.line, `an impossibility is labeled as an invariant: ${annotation.claim}`));
        }
        for (const [claim, line] of header.impossibilities) {
          if (!proved.has(claim)) findings.push(this.finding(this.an_impossibility_is_proved_by_an_exact_negative_test, unit, line, `Impossible if true has no annotated negative test: ${claim}`));
        }
      }
      return findings;
    });
  }

  static get a_contract_pointer_resolves_and_is_proved(): Check {
    return this.defineCheck('a_contract_pointer_resolves_and_is_proved', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        const records = this.parseAnnotations(unit, header).filter((annotation) => annotation.bound && annotation.type === 'record');
        const provedNames = new Set(records.map((annotation) => this.headingSlug(annotation.name ?? '')));
        for (const link of header.contractLinks) {
          if (!link.anchor) {
            findings.push(this.finding(this.a_contract_pointer_resolves_and_is_proved, unit, link.line, `contract link \`${link.file}\` needs a record anchor`));
            continue;
          }
          const candidates = [resolve(dirname(unit.path), link.file), resolve(context.cwd, link.file)];
          const slugs = candidates.map((candidate) => this.contractSlugs(candidate)).find((set) => set !== null) ?? null;
          if (!slugs) {
            findings.push(this.finding(this.a_contract_pointer_resolves_and_is_proved, unit, link.line, `contract not found: ${link.file}`));
            continue;
          }
          if (!slugs.has(link.anchor)) {
            findings.push(this.finding(this.a_contract_pointer_resolves_and_is_proved, unit, link.line, `anchor \`#${link.anchor}\` does not resolve in ${link.file}`));
            continue;
          }
          if (!provedNames.has(link.anchor)) findings.push(this.finding(this.a_contract_pointer_resolves_and_is_proved, unit, link.line, `header contract-record pointer has no annotated test: ${link.anchor}`));
        }
        for (const annotation of records) {
          if (!header.contractLinks.some((link) => link.anchor === this.headingSlug(annotation.name ?? ''))) findings.push(this.finding(this.a_contract_pointer_resolves_and_is_proved, unit, annotation.line, `annotated record is absent from the header: ${annotation.name}`));
        }
      }
      return findings;
    });
  }

  static get a_source_tripwire_resolves_to_a_test_header(): Check {
    return this.defineCheck('a_source_tripwire_resolves_to_a_test_header', (context) => {
      const findings: Finding[] = [];
      const grammar = this.$grammar;
      for (const unit of context.sources) {
        let claimedSymbols: Set<string> | null = null;
        unit.lines.forEach((line, index) => {
          if (!line.includes(`${grammar.DOMAIN}:`)) return;
          const stripped = this.stripLead(line, unit.profile);
          const symbolOnly = grammar.DOMAIN_SYMBOL_ONLY.exec(stripped);
          if (!symbolOnly) {
            findings.push(this.finding(this.a_source_tripwire_resolves_to_a_test_header, unit, index + 1, `source tripwires carry only the symbol: \`${grammar.DOMAIN}: <symbol>\``));
            return;
          }
          if (claimedSymbols === null) claimedSymbols = this.symbolsClaimedFor(context, unit);
          if (!claimedSymbols.has(symbolOnly[1].trim()))
            findings.push(this.finding(this.a_source_tripwire_resolves_to_a_test_header, unit, index + 1, `tripwire \`${symbolOnly[1].trim()}\` has no header claim in any test covering this file`));
        });
        if (unit.text.includes(grammar.GENERATOR)) findings.push(this.finding(this.a_source_tripwire_resolves_to_a_test_header, unit, unit.lines.findIndex((line) => line.includes(grammar.GENERATOR)) + 1, `\`${grammar.GENERATOR}\` belongs at the top of the test file, not in source`));
      }
      return findings;
    });
  }

  static get a_test_caveat_derives_from_a_tested_claim(): Check {
    return this.defineCheck('a_test_caveat_derives_from_a_tested_claim', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present || !header.described) continue;
        const symbols = [...header.domainSymbols];
        const startLine = unit.lines.findIndex((line) => line.includes(this.$grammar.GENERATOR_DESCRIBED)) + 1;
        const sentences = header.described.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (!/\b(?:must|never|always|only|cannot)\b/i.test(sentence)) continue;
          if (/Open question:/i.test(sentence)) continue;
          if (symbols.some((symbol) => sentence.includes(symbol))) continue;
          findings.push(this.finding(this.a_test_caveat_derives_from_a_tested_claim, unit, startLine, `described-register caveat names no header symbol — a constraint the tests do not reach is a claim without a proof: "${sentence.trim().slice(0, 90)}"`));
        }
      }
      return findings;
    });
  }

  static get two_test_files_do_not_share_one_generator_header(): Check {
    return this.defineCheck('two_test_files_do_not_share_one_generator_header', (context) => {
      const findings: Finding[] = [];
      const normalized = new Map<string, Unit>();
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        let text = `${header.goal}\n${header.described}`.replace(/\s+/g, ' ').trim();
        for (const symbol of header.domainSymbols) text = text.replaceAll(symbol, '<symbol>');
        text = text.replaceAll(this.testStem(unit), '<file>');
        if (!text) continue;
        const twin = normalized.get(text);
        if (twin) findings.push(this.finding(this.two_test_files_do_not_share_one_generator_header, unit, 1, `generator header is a template twin of ${twin.relativePath} — a Goal that fits another file with the name swapped is not a Goal`));
        else normalized.set(text, unit);
      }
      return findings;
    });
  }

  static get the_population_and_skip_list_are_exact(): Check {
    // enforced by run() itself; its findings and refusals carry this name
    return this.defineCheck('the_population_and_skip_list_are_exact', () => []);
  }

  /** The manifest — reads through `this`, so overrides and additions on a
   * subclass flow into it. */
  static get checks(): readonly Check[] {
    return [
      this.a_test_file_opens_with_its_generator_header,
      this.a_generator_header_carries_both_registers_in_order,
      this.a_header_symbol_is_declared_in_the_subject_source,
      this.a_claim_annotation_sits_directly_above_its_test,
      this.header_claims_and_annotated_tests_match_one_to_one,
      this.an_impossibility_is_proved_by_an_exact_negative_test,
      this.a_contract_pointer_resolves_and_is_proved,
      this.a_source_tripwire_resolves_to_a_test_header,
      this.a_test_caveat_derives_from_a_tested_claim,
      this.two_test_files_do_not_share_one_generator_header,
      this.the_population_and_skip_list_are_exact,
    ];
  }

  static get checkNames(): ReadonlySet<string> {
    return new Set(this.checks.map((entry) => entry.name));
  }

  // shared multi-language proof fixtures, grammar tokens interpolated
  static get $fixtures() {
    const grammar = this.$grammar;
    const rustSource = `pub struct Rect {
    pub width: u32,
    pub height: u32,
}

pub fn area(rect: &Rect) -> u32 {
    rect.width * rect.height
}
`;
    const rustTest = `// ${grammar.GENERATOR}
// Subject: geometry.rs
// Goal: Prove area multiplies width by height and never invents a negative quantity.
// ${grammar.DOMAIN}: area — If a rect has width and height, then area is their product
// Impossible if true: area returns less than zero
//
// ${grammar.GENERATOR_DESCRIBED}
// The area function is pure arithmetic over unsigned fields.

use super::*;

// ${grammar.DOMAIN}: area — If a rect has width and height, then area is their product
#[test]
fn area_multiplies() {
    assert_eq!(area(&Rect { width: 3, height: 4 }), 12);
}

// ${grammar.IMPOSSIBLE}: area — area returns less than zero
#[test]
fn area_is_unsigned() {
    assert!(area(&Rect { width: 0, height: 9 }) == 0);
}
`;
    const pythonSource = `class Budget:
    def __init__(self, limit):
        self.limit = limit
        self.spent = 0

    def spend(self, amount):
        self.spent += amount
        return self.limit - self.spent
`;
    const pythonTest = `# ${grammar.GENERATOR}
# Subject: budget.py
# Goal: Prove spending draws down the remaining budget and remaining never grows on its own.
# ${grammar.DOMAIN}: Budget — If spend is called, then remaining shrinks by the amount
# Impossible if true: remaining grows without a refund
#
# ${grammar.GENERATOR_DESCRIBED}
# The Budget class holds one counter; spend is the single write path.

from budget import Budget

# ${grammar.DOMAIN}: Budget — If spend is called, then remaining shrinks by the amount
def test_spend_draws_down():
    assert Budget(10).spend(4) == 6

# ${grammar.IMPOSSIBLE}: Budget — remaining grows without a refund
def test_remaining_never_grows():
    budget = Budget(10)
    assert budget.spend(0) == 10
`;
    const cSource = `#include "parser.h"

int parse_digit(char input) {
    if (input < '0' || input > '9') return -1;
    return input - '0';
}
`;
    const cTest = `/*
${grammar.GENERATOR}
Subject: parser.c
Goal: Prove parse_digit maps characters to their digit value and rejects everything else.
${grammar.DOMAIN}: parse_digit — If the input is a digit character, then its numeric value returns
Impossible if true: a non-digit character parses successfully

${grammar.GENERATOR_DESCRIBED}
The parser has one entry point; rejection is the negative space of the digit range.
*/
#include "parser.h"
#include <assert.h>

// ${grammar.DOMAIN}: parse_digit — If the input is a digit character, then its numeric value returns
void test_parses_digits(void) {
    assert(parse_digit('7') == 7);
}

// ${grammar.IMPOSSIBLE}: parse_digit — a non-digit character parses successfully
void test_rejects_letters(void) {
    assert(parse_digit('x') == -1);
}
`;
    const tsSource = `export class Box {
  height = 4;

  grow() {
    this.height += 1;
  }
}
`;
    const tsTest = `/*
${grammar.GENERATOR}
Goal: Prove the box grows by exactly one unit per call and height never moves on its own.
${grammar.DOMAIN}: Box — If grow is called, then height increases by one
Impossible if true: height decreases without a grow call

${grammar.GENERATOR_DESCRIBED}
The Box height is the only mutable state, so growth is the single write path the tests hold.
*/
import { expect, test } from 'vitest';
import { Box } from './Box';

// ${grammar.DOMAIN}: Box — If grow is called, then height increases by one
test('grow raises height by one', () => {
  const box = new Box();
  box.grow();
  expect(box.height).toBe(5);
});

// ${grammar.IMPOSSIBLE}: Box — height decreases without a grow call
test('height never decreases on its own', () => {
  expect(new Box().height).toBe(4);
});
`;
    const recordWord = `${grammar.RECORD[0].toUpperCase()}${grammar.RECORD.slice(1)}`;
    const demoContract = `# demo contract

## Reality-based ${grammar.RECORD}s

### A box never shrinks by itself

**${recordWord}:** If no grow call happens, then height stays.

**Status:** provisional
`;
    return { rustSource, rustTest, pythonSource, pythonTest, cSource, cTest, tsSource, tsTest, demoContract };
  }

  /** The constitution: every check's claim, impossibility, and proof arms —
   * fixtures span the languages the checker guards. */
  static get proofs(): Readonly<Record<string, Proof>> {
    const fixture = this.$fixtures;
    const grammar = this.$grammar;
    const contractName = `demo${grammar.CONTRACT_SUFFIX}`;
    const rust = { 'src/geometry.rs': fixture.rustSource, 'src/geometry_test.rs': fixture.rustTest };
    const python = { 'src/budget.py': fixture.pythonSource, 'src/budget_test.py': fixture.pythonTest };
    const c = { 'src/parser.c': fixture.cSource, 'src/parser_test.c': fixture.cTest };
    const ts = { 'src/Box.ts': fixture.tsSource, 'src/Box.test.ts': fixture.tsTest };
    const RUST_GLOB = { testGlobs: ['src/**/*_test.rs'] };
    const PY_GLOB = { testGlobs: ['src/**/*_test.py'] };
    const C_GLOB = { testGlobs: ['src/**/*_test.c'] };
    const TS_GLOB = { testGlobs: ['src/**/*.test.ts'] };
    const ALL_GLOB = { testGlobs: ['src/**/*_test.rs', 'src/**/*_test.py', 'src/**/*_test.c', 'src/**/*.test.ts'] };
    return {
      'a_test_file_opens_with_its_generator_header': {
        claim: 'If a file is a test, then its first content is the generator header, in that language’s own comment syntax',
        impossibility: 'a headerless test file passes the checker',
        red: [{
          files: { ...rust, 'src/geometry_test.rs': fixture.rustTest.replace(`// ${grammar.GENERATOR}\n`, ''), 'src/budget.py': fixture.pythonSource, 'src/budget_test.py': `import budget\n${fixture.pythonTest}` },
          options: { testGlobs: ['src/**/*_test.rs', 'src/**/*_test.py'] },
          expectFindings: [/no `.*GENERATOR.*` header/, /not the first content/],
          expectCount: 2,
        }],
        green: [{ files: { ...rust, ...python, ...c, ...ts }, options: ALL_GLOB }],
      },
      'a_generator_header_carries_both_registers_in_order': {
        claim: 'If a header exists, then it carries one Goal, at least one impossibility, and the described register after the formal one',
        impossibility: 'a header missing a register or a Goal passes the checker',
        red: [{
          files: { ...python, 'src/budget_test.py': fixture.pythonTest.replace('# Goal: Prove spending draws down the remaining budget and remaining never grows on its own.\n', '').replace(`#\n# ${grammar.GENERATOR_DESCRIBED}\n# The Budget class holds one counter; spend is the single write path.\n`, '') },
          options: PY_GLOB,
          expectFindings: [/needs a `Goal:` line/, /missing `.*GENERATOR-DESCRIBED.*` register/],
        }],
        green: [{ files: python, options: PY_GLOB }],
      },
      'a_header_symbol_is_declared_in_the_subject_source': {
        claim: 'If a header names a symbol, then the Subject file or the sibling source declares it under that language’s grammar',
        impossibility: 'a header claiming an undeclared symbol passes the checker',
        red: [{
          files: { ...rust, 'src/geometry_test.rs': fixture.rustTest.replaceAll('area —', 'perimeter —') },
          options: RUST_GLOB,
          expectFindings: [/`perimeter` is not declared in geometry\.rs/],
        }],
        green: [
          { files: rust, options: RUST_GLOB },
          { files: ts, options: TS_GLOB },
        ],
      },
      'a_claim_annotation_sits_directly_above_its_test': {
        claim: 'If an annotation is written, then the language’s test boundary follows it directly, comments allowed between',
        impossibility: 'an annotation floating above non-test code passes the checker',
        red: [{
          files: { ...c, 'src/parser_test.c': fixture.cTest.replace(`// ${grammar.DOMAIN}: parse_digit — If the input is a digit character, then its numeric value returns\nvoid test_parses_digits`, `// ${grammar.DOMAIN}: parse_digit — If the input is a digit character, then its numeric value returns\nstatic int fixture_digit = 7;\nvoid test_parses_digits`) },
          options: C_GLOB,
          expectFindings: [/must sit directly above a test/],
        }],
        green: [{ files: c, options: C_GLOB }],
      },
      'header_claims_and_annotated_tests_match_one_to_one': {
        claim: 'If a header states a domain claim, then an annotated test proves it, and every annotated claim is in the header',
        impossibility: 'a header claim without an annotated test passes the checker',
        red: [{
          files: { ...ts, 'src/Box.test.ts': fixture.tsTest.replace(`// ${grammar.DOMAIN}: Box — If grow is called, then height increases by one\ntest('grow`, `// ${grammar.DOMAIN}: Box — If grow is called, then height doubles\ntest('grow`) },
          options: TS_GLOB,
          expectFindings: [/has no annotated test/, /absent from the header/],
        }],
        green: [{ files: ts, options: TS_GLOB }],
      },
      'an_impossibility_is_proved_by_an_exact_negative_test': {
        claim: 'If a header states an impossibility, then a negative test carries its exact text and a header symbol',
        impossibility: 'an impossibility without an exact negative proof passes the checker',
        red: [{
          files: { ...python, 'src/budget_test.py': fixture.pythonTest.replace(`# ${grammar.IMPOSSIBLE}: Budget — remaining grows without a refund`, `# ${grammar.IMPOSSIBLE}: Budget — remaining grows spontaneously`) },
          options: PY_GLOB,
          expectFindings: [/impossibility text is not exact/, /has no annotated negative test/],
        }],
        green: [{ files: python, options: PY_GLOB }],
      },
      'a_contract_pointer_resolves_and_is_proved': {
        claim: 'If a header links a contract record, then the anchor resolves and an annotated test proves it',
        impossibility: 'a dangling or unproved contract pointer passes the checker',
        red: [{
          files: {
            [contractName]: fixture.demoContract,
            ...ts,
            'src/Box.test.ts': fixture.tsTest.replace('Impossible if true:', `[A box never shrinks by itself](../${contractName}#a-box-never-grows)\nImpossible if true:`),
          },
          options: TS_GLOB,
          expectFindings: [/does not resolve/],
        }],
        green: [{
          files: {
            [contractName]: fixture.demoContract,
            ...ts,
            'src/Box.test.ts': fixture.tsTest
              .replace('Impossible if true:', `[A box never shrinks by itself](../${contractName}#a-box-never-shrinks-by-itself)\nImpossible if true:`)
              .replace(`// ${grammar.IMPOSSIBLE}: Box — height decreases without a grow call\ntest('height never decreases on its own'`, `// ${grammar.RECORD}: A box never shrinks by itself (${contractName})\n// ${grammar.IMPOSSIBLE}: Box — height decreases without a grow call\ntest('height never decreases on its own'`),
          },
          options: TS_GLOB,
        }],
      },
      'a_source_tripwire_resolves_to_a_test_header': {
        claim: 'If source carries a domain tripwire, then a test covering that file claims the symbol in its header',
        impossibility: 'a tripwire naming an unclaimed symbol passes the checker',
        red: [{
          files: { ...rust, 'src/geometry.rs': fixture.rustSource.replace('pub fn area', `// ${grammar.DOMAIN}: perimeter\npub fn area`) },
          options: RUST_GLOB,
          expectFindings: [/tripwire `perimeter` has no header claim/],
        }],
        green: [{ files: { ...rust, 'src/geometry.rs': fixture.rustSource.replace('pub fn area', `// ${grammar.DOMAIN}: area\npub fn area`) }, options: RUST_GLOB }],
      },
      'a_test_caveat_derives_from_a_tested_claim': {
        claim: 'If the described register constrains, then the constraint names a header symbol',
        impossibility: 'an untested constraint in the described register passes the checker',
        red: [{
          files: { ...ts, 'src/Box.test.ts': fixture.tsTest.replace('the single write path the tests hold.', 'the single write path the tests hold. Width must never change after construction.') },
          options: TS_GLOB,
          expectFindings: [/Width must never change/],
        }],
        green: [{ files: ts, options: TS_GLOB }],
      },
      'two_test_files_do_not_share_one_generator_header': {
        claim: 'If two test files exist, then their Goal and described registers differ beyond their own symbols and file names',
        impossibility: 'template-twin headers pass the checker',
        red: [{
          files: { ...python, 'src/ledger.py': fixture.pythonSource.replaceAll('Budget', 'Ledger'), 'src/ledger_test.py': fixture.pythonTest.replaceAll('Budget', 'Ledger').replaceAll('budget', 'ledger') },
          options: PY_GLOB,
          expectFindings: [/template twin/],
        }],
        green: [{
          files: { ...python, 'src/ledger.py': fixture.pythonSource.replaceAll('Budget', 'Ledger'), 'src/ledger_test.py': fixture.pythonTest.replace('# Goal: Prove spending draws down the remaining budget and remaining never grows on its own.', '# Goal: Prove a ledger records every entry once and totals are the sum of what was recorded.').replace('# The Budget class holds one counter; spend is the single write path.', '# Ledger entries are append-only; the total is derived on every read.').replaceAll('Budget', 'Ledger').replaceAll('budget', 'ledger') },
          options: PY_GLOB,
        }],
      },
      'the_population_and_skip_list_are_exact': {
        claim: 'If the checker runs, then it refuses zero files, unmatched globs, unknown check names, duplicate and stale skips, and unknown severity overrides',
        impossibility: 'a checker run over nothing reports a pass',
        red: [
          { files: { 'src/.keep': '' }, options: { testGlobs: [] }, expectThrows: /no files discovered/ },
          { files: rust, options: { testGlobs: ['src/**/*_test.go'] }, expectThrows: /test glob matches no file/ },
          // test-shaped files exist but no glob names them — refuse loudly,
          // never silently check 0 test files
          { files: rust, options: { testGlobs: [] }, expectThrows: /test-shaped file.*no --test-glob/ },
          { files: { ...rust, 'skips.json': JSON.stringify([{ path: 'src/geometry.rs', check: 'no_such_check', reason: 'x' }]) }, options: { ...RUST_GLOB, skipListPath: 'skips.json' }, expectThrows: /unknown check name/ },
          { files: { ...rust, 'skips.json': JSON.stringify([{ path: 'src/geometry_test.rs', check: 'a_test_caveat_derives_from_a_tested_claim', reason: 'never fires' }]) }, options: { ...RUST_GLOB, skipListPath: 'skips.json' }, expectFindings: [/stale skip/] },
          { files: rust, options: { ...RUST_GLOB, warnChecks: ['no_such_check'] }, expectThrows: /unknown check name/ },
        ],
        green: [
          {
            files: { ...rust, 'src/geometry_test.rs': fixture.rustTest.replace('// Goal: Prove area multiplies width by height and never invents a negative quantity.\n', ''), 'skips.json': JSON.stringify([{ path: 'src/geometry_test.rs', check: 'a_generator_header_carries_both_registers_in_order', reason: 'goal pending a naming ruling' }]) },
            options: { ...RUST_GLOB, skipListPath: 'skips.json' },
          },
          // a bare glob (no slash) matches by file name at any depth
          { files: rust, options: { testGlobs: ['*_test.rs'] } },
        ],
      },
    };
  }

  // -------------------------------------------------------------------------
  // behavior — methods

  static defineCheck(name: string, run: (context: CheckerContext) => Finding[]): Check {
    return { name, run };
  }

  static finding(check: Check, unit: Unit, line: number, message: string): Finding {
    return { check: check.name, file: unit.relativePath, line, message };
  }

  static profileFor(path: string): LanguageProfile | null {
    const extension = extname(path).toLowerCase();
    return this.languages.find((profile) => profile.extensions.includes(extension)) ?? null;
  }

  /** Strip one leading comment lead (and surrounding space) from a line. */
  static stripLead(line: string, profile: LanguageProfile): string {
    let text = line.trim();
    for (const [open, close] of profile.blockComments) {
      if (text.startsWith(open)) text = text.slice(open.length).trim();
      if (text.endsWith(close)) text = text.slice(0, -close.length).trim();
    }
    for (const lead of [...profile.commentLeads].sort((a, b) => b.length - a.length)) {
      if (text.startsWith(lead)) return text.slice(lead.length).trim();
    }
    return text;
  }

  /** The contiguous comment region at the top of the file: blank lines,
   * lead-prefixed lines, and block-comment bodies. Returns its end index
   * (exclusive, 0-based) — the first code line. */
  static leadingCommentEnd(unit: Unit): number {
    let inBlock: string | null = null;
    for (let index = 0; index < unit.lines.length; index++) {
      const trimmed = unit.lines[index].trim();
      if (inBlock) {
        if (trimmed.includes(inBlock)) inBlock = null;
        continue;
      }
      if (trimmed === '') continue;
      const opener = unit.profile.blockComments.find(([open]) => trimmed.startsWith(open));
      if (opener) {
        const rest = trimmed.slice(opener[0].length);
        if (!rest.includes(opener[1])) inBlock = opener[1];
        continue;
      }
      if (unit.profile.commentLeads.some((lead) => trimmed.startsWith(lead))) continue;
      return index;
    }
    return unit.lines.length;
  }

  static parseHeader(unit: Unit): Header {
    const grammar = this.$grammar;
    const header: Header = {
      present: false,
      firstContent: false,
      goal: '',
      described: '',
      orderedRegisters: false,
      bothRegisters: false,
      duplicateSentinel: false,
      subjects: [],
      domainClaims: new Map(),
      domainSymbols: new Set(),
      impossibilities: new Map(),
      contractLinks: [],
      endLine: 0,
    };
    const sentinelIndex = unit.lines.findIndex((line) => line.includes(grammar.GENERATOR));
    if (sentinelIndex === -1) return header;
    header.present = true;
    header.duplicateSentinel = unit.text.split(grammar.GENERATOR).length > 2;
    const regionEnd = this.leadingCommentEnd(unit);
    header.firstContent = sentinelIndex < regionEnd;
    header.endLine = regionEnd;
    let describedIndex = -1;
    for (let index = sentinelIndex; index < regionEnd; index++) {
      if (unit.lines[index].includes(grammar.GENERATOR_DESCRIBED)) {
        describedIndex = index;
        break;
      }
    }
    header.bothRegisters = describedIndex !== -1 || unit.text.includes(grammar.GENERATOR_DESCRIBED);
    header.orderedRegisters = describedIndex > sentinelIndex;
    const formalEnd = describedIndex === -1 ? regionEnd : describedIndex;
    for (let index = sentinelIndex + 1; index < formalEnd; index++) {
      const stripped = this.stripLead(unit.lines[index], unit.profile);
      const line = index + 1;
      const goal = /^Goal:\s*(.+\S)\s*$/.exec(stripped);
      if (goal) {
        header.goal = goal[1];
        continue;
      }
      const subject = /^Subject:\s*(.+\S)\s*$/.exec(stripped);
      if (subject) {
        for (const path of subject[1].split(/[\s,]+/).filter(Boolean)) header.subjects.push({ path, line });
        continue;
      }
      const domain = grammar.DOMAIN_LINE.exec(stripped);
      if (domain) {
        const symbol = domain[1].trim();
        const claim = domain[2].trim();
        header.domainClaims.set(`${symbol} — ${claim}`, { symbol, claim, line });
        header.domainSymbols.add(symbol);
        continue;
      }
      const impossible = /^Impossible if true:\s*(.+\S)\s*$/.exec(stripped);
      if (impossible) header.impossibilities.set(impossible[1].trim(), line);
      for (const link of stripped.matchAll(grammar.CONTRACT_LINK)) {
        header.contractLinks.push({ text: link[1], file: link[2], anchor: (link[3] ?? '').slice(1), line });
      }
    }
    if (describedIndex !== -1) {
      const describedLines: string[] = [];
      for (let index = describedIndex + 1; index < regionEnd; index++) describedLines.push(this.stripLead(unit.lines[index], unit.profile));
      header.described = describedLines.join('\n').trim();
    }
    return header;
  }

  /** Annotations below the header bind to the next test boundary; comment
   * lines (and blanks) may sit between — any other code breaks the bind. */
  static parseAnnotations(unit: Unit, header: Header): Annotation[] {
    const grammar = this.$grammar;
    const annotations: Annotation[] = [];
    let pending: Annotation[] = [];
    for (let index = header.endLine; index < unit.lines.length; index++) {
      const raw = unit.lines[index];
      const trimmed = raw.trim();
      const isComment = trimmed === '' || unit.profile.commentLeads.some((lead) => trimmed.startsWith(lead)) || unit.profile.blockComments.some(([open, close]) => trimmed.startsWith(open) || trimmed.endsWith(close));
      const stripped = this.stripLead(raw, unit.profile);
      const domain = grammar.DOMAIN_LINE.exec(stripped);
      if (domain && isComment) {
        pending.push({ type: 'domain', symbol: domain[1].trim(), claim: domain[2].trim(), line: index + 1, bound: false });
        continue;
      }
      const impossible = grammar.IMPOSSIBLE_LINE.exec(stripped);
      if (impossible && isComment) {
        pending.push({ type: 'impossible', symbol: impossible[1].trim(), claim: impossible[2].trim(), line: index + 1, bound: false });
        continue;
      }
      const record = grammar.RECORD_LINE.exec(stripped);
      if (record && isComment) {
        pending.push({ type: 'record', name: record[1].trim(), line: index + 1, bound: false });
        continue;
      }
      if (!pending.length) continue;
      if (isComment) continue;
      if (unit.profile.testPattern.test(raw)) {
        for (const annotation of pending) annotation.bound = true;
      }
      annotations.push(...pending);
      pending = [];
    }
    annotations.push(...pending);
    return annotations;
  }

  static declaredIn(sourceText: string, symbol: string, profile: LanguageProfile): boolean {
    if (!profile.declares) return new RegExp(`\\b${escapeRegExp(symbol)}\\b`).test(sourceText);
    return profile.declares(symbol).test(sourceText);
  }

  /** The test file's stem with its language's test suffix/prefix removed. */
  static testStem(unit: Unit): string {
    let stem = basename(unit.path, extname(unit.path));
    for (const suffix of unit.profile.testStemSuffixes) if (stem.endsWith(suffix)) return stem.slice(0, -suffix.length);
    for (const prefix of unit.profile.testStemPrefixes) if (stem.startsWith(prefix)) return stem.slice(prefix.length);
    return stem;
  }

  /** The same-directory source whose stem matches the test's reduced stem. */
  static siblingSource(context: CheckerContext, testUnit: Unit): Unit | null {
    const stem = this.testStem(testUnit);
    const directory = dirname(testUnit.path);
    return context.sources.find((unit) => dirname(unit.path) === directory && basename(unit.path, extname(unit.path)) === stem) ?? null;
  }

  /** Every symbol claimed for a source file: its sibling test's header,
   * plus any scanned test whose Subject names it. */
  static symbolsClaimedFor(context: CheckerContext, sourceUnit: Unit): Set<string> {
    const symbols = new Set<string>();
    for (const test of context.tests) {
      const header = this.parseHeader(test);
      if (!header.present) continue;
      const isSibling = this.siblingSource(context, test)?.path === sourceUnit.path;
      const isSubject = header.subjects.some((subject) => {
        const candidates = [resolve(dirname(test.path), subject.path), resolve(context.cwd, subject.path)];
        return candidates.includes(sourceUnit.path);
      });
      if (isSibling || isSubject) for (const symbol of header.domainSymbols) symbols.add(symbol);
    }
    return symbols;
  }

  static headingSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  static contractSlugs(path: string): Set<string> | null {
    if (!existsSync(path)) return null;
    const slugs = new Set<string>();
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const heading = /^###\s+(.+\S)\s*$/.exec(line);
      if (heading) slugs.add(this.headingSlug(heading[1]));
    }
    return slugs;
  }

  static globToRegExp(glob: string): RegExp {
    let pattern = '';
    for (let index = 0; index < glob.length; index++) {
      const character = glob[index];
      if (character === '*') {
        if (glob[index + 1] === '*') {
          index++;
          if (glob[index + 1] === '/') index++;
          pattern += '(?:.*/)?';
        } else pattern += '[^/]*';
      } else if (character === '?') pattern += '[^/]';
      else pattern += character.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp(`^${pattern}$`);
  }

  static *walk(directory: string): Generator<string> {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (this.EXCLUDED_DIRECTORIES.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) yield* this.walk(path);
      else if (entry.isFile()) yield path;
    }
  }

  static toUnit(cwd: string, path: string, profile: LanguageProfile): Unit {
    const text = readFileSync(path, 'utf8');
    return { path, relativePath: relative(cwd, path).replaceAll('\\', '/'), text, lines: text.split('\n'), profile };
  }

  static resolveSeverities(options: CheckerOptions): Map<string, 'warn' | 'off'> {
    const known = this.checkNames;
    const resolved = new Map<string, 'warn' | 'off'>();
    for (const [name, severity] of Object.entries(this.severities)) {
      if (!known.has(name)) throw new InvariantsCheck.UsageError(`severities: unknown check name "${name}" — --list names every check`);
      if (severity !== 'error') resolved.set(name, severity);
    }
    for (const [flag, severity] of [['warnChecks', 'warn'], ['offChecks', 'off']] as const) {
      for (const name of options[flag] ?? []) {
        if (!known.has(name)) throw new InvariantsCheck.UsageError(`${flag}: unknown check name "${name}" — --list names every check`);
        resolved.set(name, severity);
      }
    }
    return resolved;
  }

  static readSkipList(cwd: string, path: string): SkipRow[] {
    const absolute = isAbsolute(path) ? path : resolve(cwd, path);
    if (!existsSync(absolute)) throw new InvariantsCheck.UsageError(`skip-list not found: ${path}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(absolute, 'utf8'));
    } catch (error) {
      throw new InvariantsCheck.UsageError(`skip-list ${path}: not valid JSON (${(error as Error).message}) — the skip list is a JSON array of { path, check, reason }`);
    }
    if (!Array.isArray(parsed)) throw new InvariantsCheck.UsageError(`skip-list ${path}: the skip list is a JSON array of { path, check, reason }`);
    const rows: SkipRow[] = [];
    const seen = new Set<string>();
    const known = this.checkNames;
    parsed.forEach((entry, index) => {
      const label = `skip-list ${path} entry ${index + 1}`;
      if (typeof entry !== 'object' || entry === null) throw new InvariantsCheck.UsageError(`${label}: an entry is an object — { path, check, reason }`);
      const { path: rowPath, check, reason } = entry as Record<string, unknown>;
      for (const [field, value] of [['path', rowPath], ['check', check], ['reason', reason]] as const) {
        if (typeof value !== 'string' || !value.trim()) throw new InvariantsCheck.UsageError(`${label}: "${field}" is a non-empty string — { path, check, reason }`);
      }
      if (!known.has(check as string)) throw new InvariantsCheck.UsageError(`${label}: unknown check name "${check}" — --list names every check`);
      const key = `${rowPath} ${check}`;
      if (seen.has(key)) throw new InvariantsCheck.UsageError(`${label}: duplicate skip for ${rowPath} / ${check}`);
      seen.add(key);
      rows.push({ path: (rowPath as string).trim().replaceAll('\\', '/'), check: (check as string).trim(), reason: (reason as string).trim(), line: index + 1 });
    });
    return rows;
  }

  /** Discover, check, apply the skip-list. Throws UsageError on a refused population. */
  static run(options: CheckerOptions): CheckerResult {
    const cwd = resolve(options.cwd);
    if (!options.sourceRoots.length) throw new InvariantsCheck.UsageError('at least one --source-root is required');
    // a bare glob (no slash) matches by file name at any depth
    const testMatchers = options.testGlobs.map((glob) => ({ glob, regexp: this.globToRegExp(glob), bare: !glob.includes('/') }));
    const matchesTest = (relativePath: string) => testMatchers.some((matcher) => matcher.regexp.test(matcher.bare ? basename(relativePath) : relativePath));
    const sources: Unit[] = [];
    const tests: Unit[] = [];
    let unnamedTestShaped = 0;
    for (const root of options.sourceRoots) {
      const absoluteRoot = isAbsolute(root) ? root : resolve(cwd, root);
      if (!existsSync(absoluteRoot) || !statSync(absoluteRoot).isDirectory()) throw new InvariantsCheck.UsageError(`source root is not a directory: ${root}`);
      for (const path of this.walk(absoluteRoot)) {
        const relativePath = relative(cwd, path).replaceAll('\\', '/');
        const profile = this.profileFor(path);
        if (matchesTest(relativePath)) {
          tests.push(this.toUnit(cwd, path, profile ?? this.fallbackProfile));
          continue;
        }
        if (!profile) continue;
        // test-shaped files not matched by a glob are neither sources nor
        // silently checked — the population is explicit
        const stem = basename(path, extname(path));
        const testShaped = profile.testStemSuffixes.some((suffix) => stem.endsWith(suffix)) || profile.testStemPrefixes.some((prefix) => stem.startsWith(prefix));
        if (testShaped) {
          unnamedTestShaped++;
          continue;
        }
        sources.push(this.toUnit(cwd, path, profile));
      }
    }
    if (!sources.length && !tests.length) throw new InvariantsCheck.UsageError(`no files discovered under ${options.sourceRoots.join(', ')} — refusing to pass over nothing`);
    if (!testMatchers.length && unnamedTestShaped) throw new InvariantsCheck.UsageError(`${unnamedTestShaped} test-shaped file(s) discovered but no --test-glob given — name your tests (e.g. --test-glob '**/*_test.rs') so they enter the population`);
    for (const matcher of testMatchers) {
      if (!tests.some((unit) => matcher.regexp.test(matcher.bare ? basename(unit.relativePath) : unit.relativePath))) throw new InvariantsCheck.UsageError(`test glob matches no file: ${matcher.glob}`);
    }
    const skips = options.skipListPath ? this.readSkipList(cwd, options.skipListPath) : [];
    const severities = this.resolveSeverities(options);

    const context: CheckerContext = { cwd, sources, tests };
    const raw: Finding[] = [];
    for (const entry of this.checks) {
      if (severities.get(entry.name) === 'off') continue;
      raw.push(...entry.run(context));
    }

    const findings: Finding[] = [];
    const warnings: Finding[] = [];
    const suppressed: Finding[] = [];
    const used = new Set<SkipRow>();
    for (const item of raw) {
      const row = skips.find((skip) => skip.check === item.check && skip.path === item.file);
      if (row) {
        used.add(row);
        suppressed.push(item);
      } else if (severities.get(item.check) === 'warn') warnings.push(item);
      else findings.push(item);
    }
    for (const row of skips) {
      if (!used.has(row)) {
        const message = existsSync(resolve(cwd, row.path))
          ? `stale skip: "${row.check}" no longer fires on ${row.path} — remove the row`
          : `stale skip: ${row.path} does not exist — remove the row`;
        findings.push({ check: this.the_population_and_skip_list_are_exact.name, file: options.skipListPath ?? 'skip-list', line: row.line, message });
      }
    }
    const byPlace = (first: Finding, second: Finding) => first.file.localeCompare(second.file) || first.line - second.line;
    findings.sort(byPlace);
    warnings.sort(byPlace);
    return {
      findings,
      warnings,
      suppressed,
      sources: sources.map((unit) => unit.relativePath),
      tests: tests.map((unit) => unit.relativePath),
      off: this.checks.filter((entry) => severities.get(entry.name) === 'off').map((entry) => entry.name),
    };
  }

  /** Run the receiver's constitution: every check's red and green arms
   * through run(). `only` isolates one check. Severity-neutral except for
   * arms that explicitly test severity. */
  static prove(options?: { completenessOnly?: boolean; only?: string }): ProveReport {
    const problems: string[] = [];
    const ran = { red: 0, green: 0 };
    const proofs = this.proofs;
    const selected = options?.only ? this.checks.filter((entry) => entry.name === options.only) : this.checks;
    if (options?.only && !selected.length) problems.push(`prove: unknown check name "${options.only}" — --list names every check`);
    if (!options?.only) {
      for (const name of Object.keys(proofs)) {
        if (!this.checks.some((entry) => entry.name === name)) problems.push(`proof without a manifest check: ${name}`);
      }
    }
    for (const check of selected) {
      const asGetter = (this as unknown as Record<string, Check | undefined>)[check.name];
      if (asGetter?.name !== check.name) problems.push(`${check.name}: the name is not its getter — one snake_case form is the whole identity`);
      const proof = proofs[check.name];
      if (!proof) {
        problems.push(`${check.name}: no constitution entry — a check carries its claim, impossibility, and both proof arms`);
        continue;
      }
      if (!/^If .+, then .+/.test(proof.claim)) problems.push(`${check.name}: the claim is not an if-then`);
      if (!proof.impossibility) problems.push(`${check.name}: no impossibility`);
      if (!proof.red.length) problems.push(`${check.name}: no red arm — a check that cannot fail proves nothing`);
      if (!proof.green.length) problems.push(`${check.name}: no green arm — silence on the conforming form is half the proof`);
      if (options?.completenessOnly) continue;
      for (const [kind, arms] of [['red', proof.red], ['green', proof.green]] as const) {
        for (const arm of arms) {
          const checkout = mkdtempSync(join(tmpdir(), 'invariants-check-proof-'));
          try {
            for (const [path, text] of Object.entries(arm.files)) {
              mkdirSync(dirname(join(checkout, path)), { recursive: true });
              writeFileSync(join(checkout, path), text);
            }
            const runOptions: CheckerOptions = { cwd: checkout, sourceRoots: ['src'], testGlobs: [], ...arm.options };
            const armTestsSeverity = !!arm.options && ('warnChecks' in arm.options || 'offChecks' in arm.options);
            let findings: Finding[] = [];
            let thrown: Error | null = null;
            try {
              const result = this.run(runOptions);
              findings = result.findings.filter((item) => item.check === check.name);
              if (!armTestsSeverity) findings = [...findings, ...result.warnings.filter((item) => item.check === check.name)];
            } catch (error) {
              thrown = error as Error;
            }
            if (arm.expectThrows) {
              if (!thrown || !arm.expectThrows.test(thrown.message)) problems.push(`${check.name} ${kind} arm: expected a refusal matching ${arm.expectThrows} — got ${thrown ? thrown.message : `${findings.length} finding(s)`}`);
            } else if (thrown) {
              problems.push(`${check.name} ${kind} arm: the checker threw: ${thrown.message}`);
            } else if (kind === 'red') {
              for (const expected of arm.expectFindings ?? []) {
                const pattern = typeof expected === 'string' ? new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : expected;
                if (!findings.some((item) => pattern.test(item.message))) problems.push(`${check.name} red arm: no finding matches ${pattern}`);
              }
              if (!arm.expectFindings?.length && !findings.length) problems.push(`${check.name} red arm: the planted defect produced no finding`);
              if (arm.expectCount !== undefined && findings.length !== arm.expectCount) problems.push(`${check.name} red arm: expected ${arm.expectCount} finding(s), got ${findings.length}`);
            } else if (findings.length) {
              problems.push(`${check.name} green arm: the conforming form produced ${findings.length} finding(s): ${findings[0].message}`);
            }
            ran[kind === 'red' ? 'red' : 'green']++;
          } finally {
            rmSync(checkout, { recursive: true, force: true });
          }
        }
      }
    }
    return { problems, ran };
  }

  static async main(argv: string[], cwd = process.cwd()): Promise<number> {
    const HELP = `invariants-check — the invariant-methodology checker, repo-agnostic

usage:
  invariants-check --source-root <dir> [--source-root <dir>…]
                   [--test-glob '<glob>' …]     which files are tests
                   [--skip-list <path>]         a JSON array of { path, check, reason }
  invariants-check --list                       print every check name and severity
  invariants-check --prove ['<check_name>']     run the checker's own constitution

Languages: ${this.languages.map((profile) => profile.name).join(', ')} — extend the
languages getter (a profile is data) for anything else.
Exit: 0 clean · 1 findings · 2 usage.`;
    const sourceRoots: string[] = [];
    const testGlobs: string[] = [];
    let skipListPath: string | undefined;
    for (let index = 0; index < argv.length; index++) {
      const argument = argv[index];
      const value = () => {
        const next = argv[++index];
        if (next === undefined) throw new InvariantsCheck.UsageError(`${argument} needs a value`);
        return next;
      };
      try {
        if (argument === '--help' || argument === '-h') {
          console.log(HELP);
          return 0;
        } else if (argument === '--list') {
          if (argv.length > 1) throw new InvariantsCheck.UsageError('--list takes no other arguments');
          for (const entry of this.checks) console.log(`${(this.severities[entry.name] ?? 'error').padEnd(7)} ${entry.name}`);
          return 0;
        } else if (argument === '--prove') {
          const next = argv[index + 1];
          const only = next !== undefined && !next.startsWith('--') ? argv[++index] : undefined;
          if (sourceRoots.length || testGlobs.length || skipListPath || index + 1 < argv.length)
            throw new InvariantsCheck.UsageError('--prove runs the constitution over its own fixture checkouts — it does not combine with a checker run');
          const report = this.prove(only ? { only } : undefined);
          for (const problem of report.problems) console.error(problem);
          console.log(`invariants-check --prove${only ? ` "${only}"` : ''}: ${report.ran.red} red arm(s), ${report.ran.green} green arm(s), ${report.problems.length} problem(s)`);
          return report.problems.length ? 1 : 0;
        } else if (argument === '--source-root') sourceRoots.push(value());
        else if (argument === '--test-glob') testGlobs.push(value());
        else if (argument === '--skip-list') skipListPath = value();
        else throw new InvariantsCheck.UsageError(`unknown argument: ${argument}`);
      } catch (error) {
        console.error(`invariants-check: ${(error as Error).message}`);
        return 2;
      }
    }
    let result: CheckerResult;
    try {
      result = this.run({ cwd, sourceRoots, testGlobs, skipListPath });
    } catch (error) {
      if (error instanceof InvariantsCheck.UsageError) {
        console.error(`invariants-check: ${error.message}`);
        return 2;
      }
      throw error;
    }
    for (const item of result.findings) console.error(`${item.file}:${item.line}: [${item.check}] ${item.message}`);
    for (const item of result.warnings) console.error(`warn: ${item.file}:${item.line}: [${item.check}] ${item.message}`);
    console.log(
      `invariants-check: ${result.sources.length} source file(s), ${result.tests.length} test file(s), ` +
        `${result.findings.length} finding(s), ${result.warnings.length} warning(s), ${result.suppressed.length} suppressed by skip-list`,
    );
    if (result.off.length) console.log(`off by config (${result.off.length}): ${result.off.join(' · ')}`);
    return result.findings.length ? 1 : 0;
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export namespace InvariantsCheck {
  export const $Class = Static($InvariantsCheck);
  export let Class = $Class;

  export class UsageError extends Error {}

  // Entry detection that survives every runner and subclass files: the flags
  // say a checker CLI was invoked; registration order says which class —
  // the entry module registers last, and beforeExit fires only after the
  // whole module graph has evaluated.
  let selectedCliGate: { main(argv: string[]): Promise<number> } | null = null;

  export function bootstrapCli(gate: { main(argv: string[]): Promise<number> }): void {
    const cliArguments = process.argv.slice(2);
    const invokedAsCli =
      !process.env.VITEST &&
      cliArguments.some((argument) => ['--source-root', '--test-glob', '--skip-list', '--list', '--prove', '--help', '-h'].includes(argument));
    if (!invokedAsCli) return;
    const isFirstRegistration = selectedCliGate === null;
    selectedCliGate = gate;
    if (isFirstRegistration)
      process.once('beforeExit', () => {
        // a live timer holds the loop open while main runs: Bun exits before
        // draining microtasks scheduled from a beforeExit handler
        const keepAlive = setInterval(() => {}, 1000);
        void selectedCliGate!.main(cliArguments).then((code) => {
          clearInterval(keepAlive);
          process.exit(code);
        });
      });
  }

  bootstrapCli(Class);
}
