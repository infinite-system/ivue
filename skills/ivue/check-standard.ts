/**
 * The ivue Standard gate — an ivue Static() class.
 *
 * Checks a consumer's class sources and test files against the rules of
 * the ivue operating manual (skills/ivue/SKILL.md). Portable by
 * construction: the only inputs are source roots, test globs, and a
 * reasoned skip-list — no repository names, no paths of its own.
 *
 *   vite-node node_modules/ivue/skills/ivue/check-standard.ts -- \
 *     --source-root src --test-glob 'src/**\/*.test.ts' --skip-list skips.json
 *
 * Every check is identified by a plain declarative NAME (a sentence);
 * the static getter that holds it is the snake_case form of that name.
 * The gate carries its own CONSTITUTION as data: `proofs` maps every
 * check to its claim, its impossibility, and permanent red and green
 * fixture arms, and `prove()` runs every arm through the same `run()`
 * the command line uses. All of it reads through `this`, so a subclass
 * that overrides or adds a check getter changes the manifest, the
 * skip-list vocabulary, and the constitution in one gesture:
 *
 *   class $HouseGate extends CheckStandard.$Class {
 *     static get house_rule(): StandardCheck { … }
 *     static get checks() { return [...super.checks, this.house_rule]; }
 *     static get proofs() { return { ...super.proofs, [this.house_rule.name]: … }; }
 *   }
 *
 * …and a check added without both proof arms is refused by `prove()` —
 * the discipline travels with the gate.
 *
 * The gate refuses to run over nothing: zero discovered sources, a test
 * glob that matches no file, an unknown check name in the skip-list, a
 * duplicate skip row, or a skip row whose finding no longer fires are
 * all errors, never silent passes.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { parse as parseTemplate, NodeTypes, type ElementNode, type TemplateChildNode } from '@vue/compiler-dom';
import { Static } from '../../lib/Static';

// ---------------------------------------------------------------------------
// public types

export interface Finding {
  check: string;
  file: string;
  line: number;
  message: string;
}

export type StaticTransform = <Class extends new (...arguments_: any[]) => any>(targetClass: Class) => Class;

export interface GateOptions {
  cwd: string;
  sourceRoots: string[];
  testGlobs: string[];
  skipListPath?: string;
  /** checks demoted to warnings for this run — reported, never blocking */
  warnChecks?: string[];
  /** checks disabled for this run — not executed, announced in the summary */
  offChecks?: string[];
  /** the `Static` used by the runtime probe; defaults to this package's own */
  staticImplementation?: StaticTransform | null;
}

export interface GateResult {
  /** blocking findings — checks at severity error */
  findings: Finding[];
  /** findings from checks demoted to warn — reported, never blocking */
  warnings: Finding[];
  suppressed: Finding[];
  sources: string[];
  tests: string[];
  unenforced: string[];
  /** checks turned off for this run — announced, never silent */
  off: string[];
}

export interface StandardCheck {
  /** The identity: a plain declarative sentence, used verbatim everywhere. */
  name: string;
  /** false = registered in the manifest but not enforced yet; the report says so. */
  enforced: boolean;
  run(context: GateContext): Finding[];
}

/** One permanent proof fixture: a small checkout the gate runs over. */
export interface CheckProofArm {
  /** repo-relative path → file text; sources under `src/` by convention */
  files: Record<string, string>;
  /** package.json for the fixture checkout (default: an ivue consumer) */
  manifest?: Record<string, unknown>;
  /** GateOptions overrides for this arm (e.g. a broken staticImplementation) */
  options?: Partial<GateOptions>;
  /** red arms: each pattern must match at least one of the check's findings */
  expectFindings?: (RegExp | string)[];
  /** red arms: exact number of findings the check must produce */
  expectCount?: number;
  /** arms with warn-demoted checks: each pattern must match a warning */
  expectWarnings?: (RegExp | string)[];
  /** red arms for population refusals: run() must throw matching this */
  expectThrows?: RegExp;
}

/** A check's constitution entry: its claim, its boundary, and both arms. */
export interface CheckProof {
  claim: string;
  impossibility: string;
  red: CheckProofArm[];
  green: CheckProofArm[];
}

export interface ProveReport {
  problems: string[];
  ran: { red: number; green: number };
}

export interface SourceUnit {
  path: string;
  relativePath: string;
  text: string;
  lines: string[];
  ast: ts.SourceFile;
}

/** A `.vue` single-file component: its script setup as TS plus every template expression. */
export interface ComponentUnit {
  path: string;
  relativePath: string;
  text: string;
  script: SourceUnit | null;
  /** 1-based line of the script block's first line in the .vue file */
  scriptLine: number;
  expressions: TemplateExpression[];
}

export interface TemplateExpression {
  code: string;
  line: number;
  kind: string;
}

export interface GateContext {
  cwd: string;
  /** absolute source roots, as discovered */
  sourceRoots: string[];
  sources: SourceUnit[];
  tests: SourceUnit[];
  components: ComponentUnit[];
  testGlobs: string[];
  staticImplementation: StaticTransform | null;
}

interface ClassFile {
  unit: SourceUnit;
  rawClass: ts.ClassDeclaration;
  rawName: string;
  publicName: string;
  namespace: ts.ModuleDeclaration | null;
  anchorInitializer: ts.Expression | null;
  classInitializer: ts.Expression | null;
  hasInstanceType: boolean;
  isReactive: boolean;
  isStaticAnchored: boolean;
}

interface GeneratorHeader {
  present: boolean;
  firstContent: boolean;
  goal: string;
  formal: string;
  described: string;
  orderedRegisters: boolean;
  bothRegisters: boolean;
  subjects: { path: string; line: number }[];
  domainClaims: Map<string, { symbol: string; claim: string; line: number }>;
  domainSymbols: Set<string>;
  impossibilities: Map<string, number>;
  contractLinks: { text: string; file: string; anchor: string; line: number }[];
  endLine: number;
}

interface ProofAnnotation {
  type: 'domain' | 'impossible' | 'record';
  symbol?: string;
  claim?: string;
  name?: string;
  contractPath?: string;
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
// the gate class — statics only; getters carry data, methods carry behavior

class $CheckStandard {
  static readonly EXCLUDED_DIRECTORIES = new Set(['node_modules', 'dist', '.git']);

  static readonly TEMPLATE_IGNORED_DIRECTIVES = new Set(['slot', 'pre', 'cloak', 'once', 'memo']);

  static readonly BANNED_NAMES = new Set([
    'inst', 'qty', 'agg', 'nv', 'ov', 'val', 'arr', 'obj', 'fn', 'cb', 'el', 'evt', 'tmp', 'idx', 'err',
    'num', 'str', 'ctx', 'res', 'msg', 'cnt', 'len', 'ret', 'prev', 'old',
  ]);

  static readonly DOMAIN_TERMS = new Set(['px', 'id', 'fx', 'x', 'y', 'z']);

  static readonly COMPUTED_JUSTIFICATIONS = ['expensive', 'render-suppression', 'stable-handle'];

  static readonly SETUP_BEHAVIOR_CALLS = new Set(['ref', 'shallowRef', 'reactive', 'computed', 'watch', 'watchEffect', 'onMounted', 'onUnmounted', 'onBeforeMount', 'onBeforeUnmount', 'onUpdated', 'onActivated', 'onDeactivated']);

  static readonly TEST_CALL = /\b(?:test|it)(?:\.[A-Za-z]+)?\s*\(/;

  // The grammar's tokens, assembled at runtime and cached once per
  // receiver: this file is scanned by the invariants checker like any
  // other source, and a literal sentinel or annotation here would read
  // as a header or a tripwire of the gate itself.
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
      DOMAIN_LINE: new RegExp(`^\\s*(?://\\s*|\\*?\\s*)${DOMAIN}:\\s*(.+?)\\s+—\\s+(.+?)\\s*$`),
      IMPOSSIBLE_LINE: new RegExp(`^\\s*//\\s*${IMPOSSIBLE}:\\s*(.+?)\\s+—\\s+(.+?)\\s*$`),
      RECORD_LINE: new RegExp(`(?<![\\w-])${RECORD}:\\s*([^(\\n]+?)\\s*\\(([^)\\n]*\\.${RECORD}s\\.md)\\)`),
      CONTRACT_LINK: new RegExp(`\\[([^\\]]+)\\]\\(([^)\\s]*\\.${RECORD}s\\.md)(#[^)\\s]*)?\\)`, 'g'),
    };
  }

  // -------------------------------------------------------------------------
  // the checks — the getter name is the snake_case of the sentence name

  static get exactly_one_reactive_source_is_installed(): StandardCheck {
    return this.defineCheck('Exactly one Reactive source is installed', (context) => {
      const vendored = context.sources.filter((unit) => /export\s+function\s+Reactive\s*[<(]/.test(unit.text) || /export\s*\{[^}]*\bReactive\b[^}]*\}\s*from/.test(unit.text));
      const manifests = new Set<string>();
      for (const root of context.sourceRoots) {
        let directory = root;
        for (let depth = 0; depth < 8; depth++) {
          const manifest = join(directory, 'package.json');
          if (existsSync(manifest)) {
            manifests.add(manifest);
            break;
          }
          const parent = dirname(directory);
          if (parent === directory) break;
          directory = parent;
        }
      }
      let dependency = false;
      for (const manifest of manifests) {
        const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
        if (parsed.name === 'ivue' || parsed.dependencies?.ivue || parsed.devDependencies?.ivue) dependency = true;
      }
      const count = vendored.length + (dependency ? 1 : 0);
      if (count === 1) return [];
      const unit = vendored[0] ?? context.sources[0];
      return [
        this.finding(this.exactly_one_reactive_source_is_installed, unit, 1,
          count === 0
            ? 'no Reactive source: neither an ivue dependency in package.json nor a vendored `export function Reactive`'
            : `${count} Reactive sources (dependency: ${dependency}; vendored: ${vendored.map((entry) => entry.relativePath).join(', ')}) — keep exactly one`),
      ];
    });
  }

  static get a_public_class_publishes_its_namespace_manifest(): StandardCheck {
    return this.defineCheck('A public class publishes its namespace manifest', (context) => {
      const findings: Finding[] = [];
      const unwrap = (expression: ts.Expression): ts.Expression => {
        let current = expression;
        while (ts.isSatisfiesExpression(current) || ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) current = current.expression;
        return current;
      };
      const isBehavioralObject = (expression: ts.Expression | undefined): boolean => {
        if (!expression) return false;
        const bare = unwrap(expression);
        return ts.isObjectLiteralExpression(bare) && bare.properties.some((property) => ts.isMethodDeclaration(property) || (ts.isPropertyAssignment(property) && this.isFunctionLike(property.initializer)));
      };
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (classFile) {
          const { rawClass, publicName, namespace, anchorInitializer, classInitializer, isReactive, hasInstanceType } = classFile;
          const line = this.lineOf(unit, rawClass);
          if (!namespace) {
            findings.push(this.finding(this.a_public_class_publishes_its_namespace_manifest, unit, line, `class ${classFile.rawName} has no \`export namespace ${publicName}\``));
            continue;
          }
          if (!anchorInitializer)
            findings.push(this.finding(this.a_public_class_publishes_its_namespace_manifest, unit, this.lineOf(unit, namespace), `namespace ${publicName} lacks \`export const $Class = …\``));
          if (!classInitializer)
            findings.push(this.finding(this.a_public_class_publishes_its_namespace_manifest, unit, this.lineOf(unit, namespace), `namespace ${publicName} lacks \`export let Class = …\``));
          if (isReactive && !hasInstanceType)
            findings.push(this.finding(this.a_public_class_publishes_its_namespace_manifest, unit, this.lineOf(unit, namespace), `reactive namespace ${publicName} lacks \`export type Instance = typeof Class.Instance\``));
          continue;
        }
        for (const statement of unit.ast.statements) {
          const exported = ts.getCombinedModifierFlags(statement as unknown as ts.Declaration) & ts.ModifierFlags.Export;
          if (ts.isClassDeclaration(statement) && exported)
            findings.push(this.finding(this.a_public_class_publishes_its_namespace_manifest, unit, this.lineOf(unit, statement), 'a class is exported directly — publish `$X` through `export namespace X`'));
          if (ts.isExportAssignment(statement) && isBehavioralObject(statement.expression))
            findings.push(this.finding(this.a_public_class_publishes_its_namespace_manifest, unit, this.lineOf(unit, statement), 'a behavioral object is exported directly — behavior belongs to a namespace Static class'));
          if (ts.isVariableStatement(statement) && exported) {
            for (const declaration of statement.declarationList.declarations) {
              if (isBehavioralObject(declaration.initializer))
                findings.push(this.finding(this.a_public_class_publishes_its_namespace_manifest, unit, this.lineOf(unit, declaration), 'a behavioral object is exported directly — behavior belongs to a namespace Static class'));
            }
          }
        }
      }
      return findings;
    });
  }

  static get a_class_file_is_named_after_its_class(): StandardCheck {
    return this.defineCheck('A class file is named after its class', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        const stem = basename(unit.path).replace(/\.ts$/, '');
        if (stem !== classFile.publicName)
          findings.push(this.finding(this.a_class_file_is_named_after_its_class, unit, this.lineOf(unit, classFile.rawClass), `file \`${stem}.ts\` declares \`${classFile.rawName}\` — the file, class and namespace share one name`));
      }
      return findings;
    });
  }

  static get a_class_file_holds_only_imports_class_namespace_and_types(): StandardCheck {
    return this.defineCheck('A class file holds only imports class namespace and types', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        let seenClass = false;
        let seenImportAfterCode = false;
        for (const statement of unit.ast.statements) {
          if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
            if (seenClass && !seenImportAfterCode) {
              seenImportAfterCode = true;
              findings.push(this.finding(this.a_class_file_holds_only_imports_class_namespace_and_types, unit, this.lineOf(unit, statement), 'imports come first'));
            }
            continue;
          }
          if (statement === classFile.rawClass) {
            seenClass = true;
            continue;
          }
          if (statement === classFile.namespace) {
            if (!seenClass) findings.push(this.finding(this.a_class_file_holds_only_imports_class_namespace_and_types, unit, this.lineOf(unit, statement), `namespace ${classFile.publicName} precedes its class ${classFile.rawName}`));
            continue;
          }
          if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isEnumDeclaration(statement)) continue;
          if (ts.isExportDeclaration(statement) && statement.isTypeOnly) continue;
          findings.push(this.finding(this.a_class_file_holds_only_imports_class_namespace_and_types, unit, this.lineOf(unit, statement), 'behavior or data outside the class seam — move it into the class (static get / method) or its namespace'));
        }
      }
      return findings;
    });
  }

  static get behavior_lives_on_the_prototype_not_in_fields(): StandardCheck {
    return this.defineCheck('Behavior lives on the prototype not in fields', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        for (const member of classFile.rawClass.members) {
          if (ts.isPropertyDeclaration(member) && this.isFunctionLike(member.initializer))
            findings.push(this.finding(this.behavior_lives_on_the_prototype_not_in_fields, unit, this.lineOf(unit, member), `\`${this.memberName(member)}\` is a function-valued field — write it as a method; the engine binds methods lazily`));
        }
      }
      return findings;
    });
  }

  static get construction_goes_through_the_namespace_class_slot(): StandardCheck {
    return this.defineCheck('Construction goes through the namespace Class slot', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        this.forEachDescendant(unit.ast, (node) => {
          if (ts.isNewExpression(node)) {
            const callee = node.expression;
            if (ts.isIdentifier(callee) && callee.text.startsWith('$'))
              findings.push(this.finding(this.construction_goes_through_the_namespace_class_slot, unit, this.lineOf(unit, node), `\`new ${callee.text}()\` constructs the raw class — construct \`${callee.text.slice(1)}.Class\``));
            if (ts.isPropertyAccessExpression(callee) && callee.name.text === '$Class')
              findings.push(this.finding(this.construction_goes_through_the_namespace_class_slot, unit, this.lineOf(unit, node), `\`new ${callee.getText(unit.ast)}()\` constructs the anchor — construct \`.Class\``));
          }
          if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'reactive' && node.arguments[0] && ts.isNewExpression(node.arguments[0]))
            findings.push(this.finding(this.construction_goes_through_the_namespace_class_slot, unit, this.lineOf(unit, node), '`reactive(new …)` wraps an instance — instances are raw; no proxy on the standard path'));
        });
      }
      return findings;
    });
  }

  static get the_anchor_is_static_only_when_statics_exist(): StandardCheck {
    return this.defineCheck('The anchor is Static only when statics exist', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile?.namespace || !classFile.anchorInitializer) continue;
        const hasStatics = classFile.rawClass.members.some((member) => this.isStaticMember(member) && !ts.isConstructorDeclaration(member));
        const anchorLine = this.lineOf(unit, classFile.anchorInitializer);
        if (hasStatics && !classFile.isStaticAnchored)
          findings.push(this.finding(this.the_anchor_is_static_only_when_statics_exist, unit, anchorLine, `${classFile.rawName} declares statics but the anchor is raw — \`export const $Class = Static(${classFile.rawName})\``));
        if (!hasStatics && classFile.isStaticAnchored)
          findings.push(this.finding(this.the_anchor_is_static_only_when_statics_exist, unit, anchorLine, `${classFile.rawName} declares no statics but the anchor is \`Static(…)\` — \`export const $Class = ${classFile.rawName}\``));
      }
      return findings;
    });
  }

  static get static_binds_methods_and_caches_dollar_getters_per_receiver(): StandardCheck {
    return this.defineCheck('Static binds methods and caches dollar getters per receiver', (context) => {
      const unit: SourceUnit | undefined = context.sources[0];
      const probe = (message: string): Finding => ({ check: 'Static binds methods and caches dollar getters per receiver', file: 'ivue/extras', line: 0, message: `${message} (probed from ${unit?.relativePath ?? 'the gate'})` });
      const StaticUnderTest = context.staticImplementation;
      if (!StaticUnderTest) return [probe('`Static` could not be loaded from ivue/extras — the runtime probe did not run')];
      const findings: Finding[] = [];
      let cacheRuns = 0;
      class $Probe {
        static get $cache() {
          cacheRuns++;
          return { receiver: this };
        }
        static method() {
          return this;
        }
      }
      const Anchor = StaticUnderTest($Probe);
      const detached = Anchor.method;
      if (detached !== Anchor.method) findings.push(probe('`Static` does not keep method identity stable across reads'));
      if (detached() !== Anchor) findings.push(probe('`Static` does not bind static methods to the receiving class'));
      const first = Anchor.$cache;
      if (first !== Anchor.$cache || cacheRuns !== 1) findings.push(probe('`Static` does not cache a dollar getter once per receiver'));
      class Sub extends Anchor {}
      const subCache = Sub.$cache;
      if (subCache === first || subCache.receiver !== Sub || cacheRuns !== 2) findings.push(probe('`Static` lets a parent dollar-cache shadow a subclass receiver'));
      if (Sub.method() !== Sub) findings.push(probe('`Static` binds a subclass method to the parent'));
      return findings;
    });
  }

  static get a_shared_store_is_a_static_readonly_field(): StandardCheck {
    return this.defineCheck('A shared store is a static readonly field', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        for (const member of classFile.rawClass.members) {
          if (!ts.isPropertyDeclaration(member) || !this.isStaticMember(member) || !member.initializer) continue;
          const initializer = member.initializer;
          const storeShaped =
            ts.isNewExpression(initializer)
              ? !!initializer.expression && ts.isIdentifier(initializer.expression) && ['Map', 'Set', 'WeakMap', 'WeakSet', 'Array'].includes(initializer.expression.text)
              : ts.isObjectLiteralExpression(initializer) || ts.isArrayLiteralExpression(initializer);
          if (storeShaped && !this.isReadonlyMember(member))
            findings.push(this.finding(this.a_shared_store_is_a_static_readonly_field, unit, this.lineOf(unit, member), `static \`${this.memberName(member)}\` is a mutable shared store — declare it \`static readonly\``));
          const constructsNamespaceClass =
            ts.isNewExpression(initializer) &&
            ts.isPropertyAccessExpression(initializer.expression) &&
            initializer.expression.name.text === 'Class';
          if (constructsNamespaceClass)
            findings.push(this.finding(this.a_shared_store_is_a_static_readonly_field, unit, this.lineOf(unit, member), `static \`${this.memberName(member)}\` constructs another namespace's class at module load — hold it in \`new LazyShared(() => …)\``));
        }
      }
      return findings;
    });
  }

  static get a_derived_static_getter_is_lower_camel_case(): StandardCheck {
    return this.defineCheck('A derived static getter is lower camel case', (context) => {
      const findings: Finding[] = [];
      const isLiteral = (expression: ts.Expression): boolean => {
        if (ts.isNumericLiteral(expression) || ts.isStringLiteralLike(expression) || ts.isRegularExpressionLiteral(expression) || expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword) return true;
        if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.MinusToken) return isLiteral(expression.operand);
        if (ts.isBinaryExpression(expression)) return isLiteral(expression.left) && isLiteral(expression.right);
        if (ts.isParenthesizedExpression(expression)) return isLiteral(expression.expression);
        if (ts.isArrayLiteralExpression(expression)) return expression.elements.every((element) => ts.isExpression(element) && isLiteral(element));
        if (ts.isObjectLiteralExpression(expression)) return expression.properties.every((property) => ts.isPropertyAssignment(property) && isLiteral(property.initializer));
        if (ts.isAsExpression(expression)) return isLiteral(expression.expression);
        return false;
      };
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        for (const member of classFile.rawClass.members) {
          if (!ts.isGetAccessorDeclaration(member) || !this.isStaticMember(member) || !member.body) continue;
          const name = this.memberName(member);
          if (!/^[A-Z][A-Z0-9_]*$/.test(name) || !name.includes('_')) continue;
          const returned = member.body.statements.find(ts.isReturnStatement)?.expression;
          if (returned && isLiteral(returned)) continue;
          const camel = name.toLowerCase().replace(/_(\w)/g, (whole, letter: string) => letter.toUpperCase());
          findings.push(this.finding(this.a_derived_static_getter_is_lower_camel_case, unit, this.lineOf(unit, member), `static get ${name}() derives its value — a derived getter is lowerCamel (\`${camel}\`); SCREAMING_SNAKE is for literal tunable constants`));
        }
      }
      return findings;
    });
  }

  static get static_reads_go_through_self_not_the_base_class(): StandardCheck {
    return this.defineCheck('Static reads go through self not the base class', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        for (const member of classFile.rawClass.members) {
          if (this.isStaticMember(member)) continue;
          this.forEachDescendant(member, (node) => {
            if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === classFile.rawName)
              findings.push(this.finding(this.static_reads_go_through_self_not_the_base_class, unit, this.lineOf(unit, node), `\`${node.getText(unit.ast)}\` pins the read to the base class — read \`this.self.${node.name.text}\``));
            if (ts.isAsExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'constructor' && node.expression.expression.kind === ts.SyntaxKind.ThisKeyword && !(ts.isGetAccessorDeclaration(member) && this.memberName(member) === 'self'))
              findings.push(this.finding(this.static_reads_go_through_self_not_the_base_class, unit, this.lineOf(unit, node), 'per-site `this.constructor as …` cast — declare `get self()` once and read through it'));
          });
        }
      }
      return findings;
    });
  }

  static get mutable_state_is_a_ref_returning_getter(): StandardCheck {
    return this.defineCheck('Mutable state is a ref-returning getter', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        // A plain namespace class (no Reactive) holds plain state — there
        // is no reactivity for a field write to trigger.
        if (!classFile?.isReactive) continue;
        for (const member of classFile.rawClass.members) {
          if (!ts.isPropertyDeclaration(member) || this.isStaticMember(member) || this.isReadonlyMember(member)) continue;
          const initializer = member.initializer;
          const fromFactory =
            !!initializer &&
            ts.isCallExpression(initializer) &&
            ts.isPropertyAccessExpression(initializer.expression) &&
            initializer.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
            /^create[A-Z]/.test(initializer.expression.name.text);
          if (fromFactory || this.isFunctionLike(initializer)) continue;
          findings.push(this.finding(this.mutable_state_is_a_ref_returning_getter, unit, this.lineOf(unit, member), `\`${this.memberName(member)}\` is a mutable plain field — writes trigger nothing; declare \`get ${this.memberName(member)}() { return ref(…) }\``));
        }
      }
      return findings;
    });
  }

  static get a_ref_is_read_and_written_through_value(): StandardCheck {
    return this.defineCheck('A Ref is read and written through value', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        const refGetters = this.refGetterNames(classFile.rawClass);
        if (!refGetters.size) continue;
        this.forEachDescendant(classFile.rawClass, (node) => {
          if (!ts.isBinaryExpression(node) || node.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
          const target = node.left;
          if (ts.isPropertyAccessExpression(target) && target.expression.kind === ts.SyntaxKind.ThisKeyword && refGetters.has(target.name.text))
            findings.push(this.finding(this.a_ref_is_read_and_written_through_value, unit, this.lineOf(unit, node), `\`this.${target.name.text} = …\` assigns over a Ref getter — write \`this.${target.name.text}.value = …\``));
        });
      }
      return findings;
    });
  }

  static get a_derivation_is_a_plain_getter_unless_computed_is_justified(): StandardCheck {
    return this.defineCheck('A derivation is a plain getter unless computed is justified', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        for (const member of classFile.rawClass.members) {
          if (!ts.isGetAccessorDeclaration(member) || !member.body) continue;
          const returned = member.body.statements.find(ts.isReturnStatement);
          if (!returned || this.refFactoryName(returned.expression) !== 'computed') continue;
          const leading = unit.text.slice(member.getFullStart(), member.getStart(unit.ast));
          const justified = this.COMPUTED_JUSTIFICATIONS.some((category) => leading.includes(category));
          if (!justified)
            findings.push(this.finding(this.a_derivation_is_a_plain_getter_unless_computed_is_justified, unit, this.lineOf(unit, member), `\`get ${this.memberName(member)}()\` allocates a computed without a stated reason — derive with a plain getter, or justify above it: \`// computed: expensive | render-suppression | stable-handle\``));
        }
      }
      return findings;
    });
  }

  static get a_composable_is_injected_by_a_one_call_dollar_getter(): StandardCheck {
    return this.defineCheck('A composable is injected by a one-call dollar getter', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        for (const member of classFile.rawClass.members) {
          if (ts.isPropertyDeclaration(member) && member.initializer && ts.isCallExpression(member.initializer) && ts.isIdentifier(member.initializer.expression) && /^use[A-Z]/.test(member.initializer.expression.text))
            findings.push(this.finding(this.a_composable_is_injected_by_a_one_call_dollar_getter, unit, this.lineOf(unit, member), `\`${this.memberName(member)} = ${member.initializer.expression.text}()\` runs at construction — inject it as \`private get $${this.memberName(member)}() { return ${member.initializer.expression.text}() }\``));
          if (ts.isGetAccessorDeclaration(member) && this.memberName(member).startsWith('$') && member.body) {
            const statements = member.body.statements;
            const single = statements.length === 1 && ts.isReturnStatement(statements[0]) && !!statements[0].expression && (ts.isCallExpression(statements[0].expression) || ts.isNewExpression(statements[0].expression) || ts.isPropertyAccessExpression(statements[0].expression));
            if (!single)
              findings.push(this.finding(this.a_composable_is_injected_by_a_one_call_dollar_getter, unit, this.lineOf(unit, member), `\`get ${this.memberName(member)}()\` does more than one call — a dollar getter creates its singleton and nothing else`));
          }
        }
      }
      return findings;
    });
  }

  static get instance_types_only_unwrapping_surfaces(): StandardCheck {
    return this.defineCheck('Instance types only unwrapping surfaces', (context) => {
      const findings: Finding[] = [];
      const RAW_CONTAINERS = new Set(['Array', 'ReadonlyArray', 'Map', 'Set', 'WeakMap', 'ref', 'shallowRef', 'Ref', 'ShallowRef']);
      const inspect = (unit: SourceUnit, report: (line: number, message: string) => void) => {
        this.forEachDescendant(unit.ast, (node) => {
          if (ts.isTypeReferenceNode(node)) {
            const tail = this.qualifiedTail(node);
            if (tail?.member === 'Instance') {
              const parent = node.parent;
              const inArray = ts.isArrayTypeNode(parent);
              const inContainer = ts.isTypeReferenceNode(parent) && ts.isIdentifier(parent.typeName) && RAW_CONTAINERS.has(parent.typeName.text);
              const asParameter = ts.isParameter(parent) && !ts.isArrowFunction(parent.parent);
              if (inArray || inContainer || asParameter) report(this.lineOf(unit, node), `\`${tail.namespace}.Instance\` types a raw graph position (collection, ref, or parameter) — raw instances are \`${tail.namespace}.Model\`; \`Instance\` is for unwrapping surfaces only`);
            }
            if (tail?.member === 'Model') {
              const parent = node.parent;
              const inUnwrap = (ts.isAsExpression(parent) && ts.isCallExpression(parent.parent) && ts.isIdentifier(parent.parent.expression) && ['defineExpose', 'reactive'].includes(parent.parent.expression.text)) || (ts.isTypeReferenceNode(parent) && ts.isIdentifier(parent.typeName) && parent.typeName.text === 'ShallowUnwrapRef');
              if (inUnwrap) report(this.lineOf(unit, node), `\`${tail.namespace}.Model\` on an unwrapping surface — type it \`${tail.namespace}.Instance\` (strips readonly so ref writes typecheck)`);
            }
          }
          if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'defineExpose' && node.arguments[0] && ts.isIdentifier(node.arguments[0]))
            report(this.lineOf(unit, node), `\`defineExpose(${node.arguments[0].text})\` exposes the raw type — \`defineExpose(${node.arguments[0].text} as X.Instance)\``);
        });
      };
      for (const unit of context.sources) inspect(unit, (line, message) => findings.push(this.finding(this.instance_types_only_unwrapping_surfaces, unit, line, message)));
      for (const component of context.components) if (component.script) inspect(component.script, (line, message) => findings.push(this.componentFinding(this.instance_types_only_unwrapping_surfaces, component, line + component.scriptLine - 1, message)));
      return findings;
    });
  }

  static get a_component_has_one_model_owner(): StandardCheck {
    return this.defineCheck('A component has one model owner', (context) => {
      const findings: Finding[] = [];
      for (const component of context.components) {
        if (!component.script) continue;
        const constructions = this.modelConstructions(component);
        if (constructions.length > 1)
          for (const extra of constructions.slice(1)) findings.push(this.componentFinding(this.a_component_has_one_model_owner, component, this.componentLine(component, extra.node), `a second model is constructed (\`${extra.variable}\`) — one template, one logic owner`));
        for (const statement of component.script.ast.statements) {
          if (ts.isFunctionDeclaration(statement))
            findings.push(this.componentFinding(this.a_component_has_one_model_owner, component, this.componentLine(component, statement), `free function \`${statement.name?.text ?? ''}\` beside the model — behavior belongs on the class as a method`));
          this.forEachDescendant(statement, (node) => {
            if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || !this.SETUP_BEHAVIOR_CALLS.has(node.expression.text)) return;
            let inClass = false;
            for (let current: ts.Node | undefined = node.parent; current; current = current.parent) if (ts.isClassDeclaration(current) || ts.isClassExpression(current)) inClass = true;
            if (inClass) return;
            // A lifecycle hook that delegates ONE call to the model is the
            // wiring an outliving store needs (its constructor may run
            // outside any component) — thin bridge allowed, logic is not.
            if (node.expression.text.startsWith('on') && node.arguments.length === 1 && this.thinModelDelegation(node.arguments[0])) return;
            findings.push(this.componentFinding(this.a_component_has_one_model_owner, component, this.componentLine(component, node), `\`${node.expression.text}()\` in \`<script setup>\` — component-local reactive behavior beside the class; state, derivations, watchers and hooks live in the class`));
          });
        }
      }
      return findings;
    });
  }

  static get the_state_destructure_is_total(): StandardCheck {
    return this.defineCheck('The state destructure is total', (context) => {
      const findings: Finding[] = [];
      for (const component of context.components) {
        if (!component.script) continue;
        const props = this.propNames(component);
        for (const construction of this.modelConstructions(component)) {
          const classFile = this.classFileByNamespace(context, construction.namespace);
          if (!classFile) continue;
          const refGetters = this.refGetterNames(classFile.rawClass);
          const plainGetters = new Set<string>();
          const methods = new Set<string>();
          for (const member of classFile.rawClass.members) {
            if (this.isStaticMember(member)) continue;
            const name = this.memberName(member);
            if (ts.isGetAccessorDeclaration(member) && !refGetters.has(name)) plainGetters.add(name);
            if (ts.isMethodDeclaration(member)) methods.add(name);
          }
          for (const statement of component.script.ast.statements) {
            if (!ts.isVariableStatement(statement)) continue;
            for (const declaration of statement.declarationList.declarations) {
              if (!ts.isObjectBindingPattern(declaration.name) || !declaration.initializer || !ts.isIdentifier(declaration.initializer) || declaration.initializer.text !== construction.variable) continue;
              for (const element of declaration.name.elements) {
                const bound = ts.isIdentifier(element.name) ? element.name.text : '';
                const source = element.propertyName && ts.isIdentifier(element.propertyName) ? element.propertyName.text : bound;
                const line = this.componentLine(component, element);
                if (plainGetters.has(source)) findings.push(this.componentFinding(this.the_state_destructure_is_total, component, line, `\`${source}\` is a plain getter — destructuring snapshots a dead value; read \`${construction.variable}.${source}\` dotted`));
                if (methods.has(source)) findings.push(this.componentFinding(this.the_state_destructure_is_total, component, line, `\`${source}\` is a method — keep it dotted (\`${construction.variable}.${source}()\`) unless a profiled hot path says otherwise`));
                if (props.has(bound)) findings.push(this.componentFinding(this.the_state_destructure_is_total, component, line, `state binding \`${bound}\` shadows the prop of the same name in the template`));
              }
            }
          }
          for (const expression of component.expressions) {
            const parsed = this.parseExpression(expression.code);
            if (!parsed) continue;
            this.forEachDescendant(parsed, (node) => {
              if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === construction.variable && refGetters.has(node.name.text))
                findings.push(this.componentFinding(this.the_state_destructure_is_total, component, expression.line, `\`${construction.variable}.${node.name.text}\` reaches a Ref through the instance (always truthy in \`v-if\`) — destructure \`${node.name.text}\` as a state binding`));
            });
          }
        }
      }
      return findings;
    });
  }

  static get template_expressions_carry_no_logic(): StandardCheck {
    return this.defineCheck('Template expressions carry no logic', (context) => {
      const findings: Finding[] = [];
      const isNamedRead = (expression: ts.Expression): boolean => {
        if (ts.isIdentifier(expression) || expression.kind === ts.SyntaxKind.ThisKeyword) return true;
        if (ts.isPropertyAccessExpression(expression)) return isNamedRead(expression.expression);
        if (ts.isCallExpression(expression))
          return isNamedRead(expression.expression) && expression.arguments.every((argument) => isNamedRead(argument) || ts.isNumericLiteral(argument) || ts.isStringLiteralLike(argument));
        return false;
      };
      const describe = (node: ts.Node): string | null => {
        if (ts.isConditionalExpression(node)) return 'a ternary';
        if (ts.isBinaryExpression(node)) {
          const kind = node.operatorToken.kind;
          if (kind === ts.SyntaxKind.EqualsToken) return 'an assignment';
          if (kind === ts.SyntaxKind.PlusToken) return 'string building or arithmetic';
          if (kind === ts.SyntaxKind.InKeyword) return null;
          return `a \`${node.operatorToken.getText()}\` expression`;
        }
        if (ts.isTemplateExpression(node)) return 'a built string';
        if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken)
          return isNamedRead(node.operand) ? null : 'a negation'; // `!name` reads as a name; `!` on compound logic does not
        if (ts.isPostfixUnaryExpression(node) || (ts.isPrefixUnaryExpression(node) && node.operator !== ts.SyntaxKind.MinusToken)) return 'a mutation';
        if (ts.isNewExpression(node)) return 'construction';
        return null;
      };
      for (const component of context.components) {
        for (const expression of component.expressions) {
          const parsed = this.parseExpression(expression.code);
          if (!parsed) continue;
          let reported = false;
          this.forEachDescendant(parsed, (node) => {
            if (reported) return;
            const what = describe(node);
            if (!what) return;
            reported = true;
            findings.push(this.componentFinding(this.template_expressions_carry_no_logic, component, expression.line, `${what} in the template (\`${expression.code.trim().slice(0, 60)}\`) — name it as a plain getter (or a method when it takes an argument)`));
          });
        }
      }
      return findings;
    });
  }

  static get watch_lifetime_matches_the_instance_owner(): StandardCheck {
    return this.defineCheck('Watch lifetime matches the instance owner', (context) => {
      const findings: Finding[] = [];
      const componentScoped = new Set<string>();
      for (const component of context.components) for (const construction of this.modelConstructions(component)) componentScoped.add(construction.namespace);
      const outliving = new Set<string>();
      for (const unit of context.sources) {
        this.forEachDescendant(unit.ast, (node) => {
          if (!ts.isNewExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'Class' || !ts.isIdentifier(node.expression.expression)) return;
          outliving.add(node.expression.expression.text);
        });
        const classFile = this.classFileOf(unit);
        if (classFile?.namespace?.body && ts.isModuleBlock(classFile.namespace.body) && classFile.namespace.body.statements.some((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === 'use')) outliving.add(classFile.publicName);
      }
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        const name = classFile.publicName;
        let usesDollarWatch = false;
        let usesPlainWatch = false;
        let hasDisposePath = false;
        let dollarLine = 0;
        let plainLine = 0;
        this.forEachDescendant(classFile.rawClass, (node) => {
          if (!ts.isCallExpression(node)) return;
          const callee = node.expression;
          if (ts.isPropertyAccessExpression(callee) && callee.expression.kind === ts.SyntaxKind.ThisKeyword) {
            if (callee.name.text === '$watch' || callee.name.text === '$watchEffect') {
              usesDollarWatch = true;
              dollarLine ||= this.lineOf(unit, node);
            }
            if (callee.name.text === '$stopEffects') hasDisposePath = true;
          }
          if (ts.isIdentifier(callee)) {
            if (callee.text === 'watch' || callee.text === 'watchEffect') {
              usesPlainWatch = true;
              plainLine ||= this.lineOf(unit, node);
            }
            if (callee.text === 'onScopeDispose') hasDisposePath = true;
          }
        });
        const isComponentScoped = componentScoped.has(name) && !outliving.has(name);
        const isOutliving = outliving.has(name);
        if (isComponentScoped && usesDollarWatch) findings.push(this.finding(this.watch_lifetime_matches_the_instance_owner, unit, dollarLine, `${classFile.rawName} is constructed in a component's setup but uses \`this.$watch\` — its scope would outlive unmount; use plain \`watch\` (the component scope reaps it)`));
        if (isOutliving && usesPlainWatch) findings.push(this.finding(this.watch_lifetime_matches_the_instance_owner, unit, plainLine, `${classFile.rawName} outlives components (constructed outside setup) but uses plain \`watch\` — there is no component scope to reap it; use \`this.$watch\``));
        if (usesDollarWatch && !hasDisposePath) findings.push(this.finding(this.watch_lifetime_matches_the_instance_owner, unit, dollarLine, `${classFile.rawName} registers \`$watch\` effects but has no dispose path — call \`$stopEffects()\` from an owner method, or auto-wire \`onScopeDispose\``));
      }
      return findings;
    });
  }

  static get a_reactive_closure_delegates_to_one_method(): StandardCheck {
    return this.defineCheck('A reactive closure delegates to one method', (context) => {
      const findings: Finding[] = [];
      const reactiveCallees = new Set(['computed', 'watch', 'watchEffect', '$watch', '$watchEffect']);
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        this.forEachDescendant(classFile.rawClass, (node) => {
          if (!ts.isCallExpression(node)) return;
          const callee = node.expression;
          const calleeName = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
          if (!reactiveCallees.has(calleeName)) return;
          const callbacks: ts.Expression[] = [];
          if (calleeName === 'computed' && node.arguments[0]) {
            const argument = node.arguments[0];
            if (ts.isObjectLiteralExpression(argument)) {
              for (const property of argument.properties) if (ts.isPropertyAssignment(property) && property.initializer) callbacks.push(property.initializer);
            } else callbacks.push(argument);
          } else if (calleeName.endsWith('watch') && node.arguments[1]) callbacks.push(node.arguments[1]);
          else if (calleeName.endsWith('watchEffect') && node.arguments[0]) callbacks.push(node.arguments[0]);
          for (const callback of callbacks) {
            if (ts.isPropertyAccessExpression(callback) && callback.expression.kind === ts.SyntaxKind.ThisKeyword) {
              findings.push(this.finding(this.a_reactive_closure_delegates_to_one_method, unit, this.lineOf(unit, callback), `\`${calleeName}(${callback.getText(unit.ast)})\` passes the method directly — use the arrow form \`() => ${callback.getText(unit.ast)}()\``));
              continue;
            }
            if (!this.delegateCall(callback))
              findings.push(this.finding(this.a_reactive_closure_delegates_to_one_method, unit, this.lineOf(unit, callback), `${calleeName} callback carries logic — delegate to one method: \`() => this.method(…)\``));
          }
        });
      }
      return findings;
    });
  }

  static get a_store_is_used_lazily_and_swapped_at_the_class_slot(): StandardCheck {
    return this.defineCheck('A store is used lazily and swapped at the Class slot', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        this.forEachDescendant(unit.ast, (node) => {
          if (ts.isNewExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'Class' && !this.isInsideFunctionBody(node))
            findings.push(this.finding(this.a_store_is_used_lazily_and_swapped_at_the_class_slot, unit, this.lineOf(unit, node), `\`${node.getText(unit.ast)}\` constructs a singleton at module load — publish it behind \`use()\` (\`singleton ??= new Class()\`) so it constructs on first touch and tests can swap the \`Class\` slot first`));
          if (ts.isParameter(node) && node.type && ts.isConstructorDeclaration(node.parent)) {
            const tail = this.qualifiedTail(node.type);
            if (tail && (tail.member === 'Instance' || tail.member === 'Model') && ts.isIdentifier(node.name) && /^(app|store|session|root|shell)$/i.test(node.name.text))
              findings.push(this.finding(this.a_store_is_used_lazily_and_swapped_at_the_class_slot, unit, this.lineOf(unit, node), `constructor takes the shared model \`${node.name.text}: ${tail.namespace}.${tail.member}\` — reach for it with \`private get $${node.name.text}() { return ${tail.namespace}.use() }\``));
          }
        });
      }
      for (const component of context.components) {
        if (!component.script) continue;
        this.forEachDescendant(component.script.ast, (node) => {
          if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'defineProps') return;
          const typeArgument = node.typeArguments?.[0];
          if (!typeArgument || !ts.isTypeLiteralNode(typeArgument)) return;
          for (const member of typeArgument.members) {
            if (!ts.isPropertySignature(member) || !member.type || !ts.isIdentifier(member.name)) continue;
            const tail = this.qualifiedTail(member.type);
            const storeShaped = /^(app|store|session|root|shell)$/i.test(member.name.text) || /Store$/.test(tail?.namespace ?? '');
            if (tail && (tail.member === 'Instance' || tail.member === 'Model') && storeShaped)
              findings.push(this.componentFinding(this.a_store_is_used_lazily_and_swapped_at_the_class_slot, component, this.componentLine(component, member), `prop \`${member.name.text}: ${tail.namespace}.${tail.member}\` drills a shared model — a store is reached with \`${tail.namespace}.use()\`, never passed down`));
          }
        });
      }
      return findings;
    });
  }

  static get keyed_state_creates_on_read_and_peeks_on_write(): StandardCheck {
    return this.defineCheck('Keyed state creates on read and peeks on write', (context) => {
      const findings: Finding[] = [];
      const REF_TYPES = /\b(?:Ref|ShallowRef|ComputedRef|WritableComputedRef)\s*</;
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        for (const member of classFile.rawClass.members) {
          if (!ts.isPropertyDeclaration(member)) continue;
          const declared = `${member.type?.getText(unit.ast) ?? ''} ${member.initializer?.getText(unit.ast) ?? ''}`;
          if (!/\bMap\s*</.test(declared) || !REF_TYPES.test(declared)) continue;
          const overlay = this.memberName(member);
          let releases = false;
          const writers: ts.MethodDeclaration[] = [];
          for (const method of classFile.rawClass.members) {
            if (!ts.isMethodDeclaration(method) || !method.body) continue;
            const body = method.body.getText(unit.ast);
            if (new RegExp(`this\\.${overlay}\\.(?:delete|clear)\\(`).test(body)) releases = true;
            if (/^(?:set|write|bump|update|put|apply|invalidate)/.test(this.memberName(method)) && new RegExp(`this\\.${overlay}\\.set\\(`).test(body)) writers.push(method);
          }
          if (!releases) findings.push(this.finding(this.keyed_state_creates_on_read_and_peeks_on_write, unit, this.lineOf(unit, member), `keyed overlay \`${overlay}\` has no release path — no method deletes or clears its entries; a Map of refs cannot GC on its own`));
          for (const writer of writers) findings.push(this.finding(this.keyed_state_creates_on_read_and_peeks_on_write, unit, this.lineOf(unit, writer), `write path \`${this.memberName(writer)}\` creates entries in \`${overlay}\` — writes PEEK (\`get(key)?.value++\`); only reads get-or-create`));
        }
      }
      return findings;
    });
  }

  static get a_generic_reactive_class_casts_its_constructor(): StandardCheck {
    return this.defineCheck('A generic reactive class casts its constructor', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile?.namespace?.body || !classFile.rawClass.typeParameters?.length || !classFile.isReactive) continue;
        const classText = classFile.classInitializer?.getText(unit.ast) ?? '';
        if (!/as\s+unknown\s+as\s+typeof\s+\$\w+/.test(classText))
          findings.push(this.finding(this.a_generic_reactive_class_casts_its_constructor, unit, this.lineOf(unit, classFile.classInitializer ?? classFile.namespace), `generic ${classFile.rawName}: \`Class\` erases <T> — \`export let Class = Reactive($Class) as unknown as typeof $Class\``));
        const instanceAlias = ts.isModuleBlock(classFile.namespace.body) ? classFile.namespace.body.statements.find((statement): statement is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'Instance') : undefined;
        if (instanceAlias && (!instanceAlias.typeParameters?.length || !/ReactiveInstance\s*</.test(instanceAlias.type.getText(unit.ast))))
          findings.push(this.finding(this.a_generic_reactive_class_casts_its_constructor, unit, this.lineOf(unit, instanceAlias), `generic ${classFile.rawName}: \`Instance\` must carry <T> and apply ReactiveInstance by hand — \`export type Instance<T> = ReactiveInstance<${classFile.rawName}<T>>\``));
      }
      return findings;
    });
  }

  static get cross_module_class_reads_happen_inside_bodies(): StandardCheck {
    return this.defineCheck('Cross-module Class reads happen inside bodies', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.sources) {
        const imported = this.importedBindings(unit);
        if (!imported.size) continue;
        // A module that exports nothing is a composition root (main.ts): its
        // import graph settles before it evaluates and no module can import
        // it into a cycle, so its module-evaluation Class reads are safe.
        const exportsAnything = unit.ast.statements.some(
          (statement) =>
            ts.isExportAssignment(statement) ||
            ts.isExportDeclaration(statement) ||
            !!(ts.getCombinedModifierFlags(statement as unknown as ts.Declaration) & ts.ModifierFlags.Export),
        );
        if (!exportsAnything) continue;
        this.forEachDescendant(unit.ast, (node) => {
          if (!ts.isPropertyAccessExpression(node) || !ts.isIdentifier(node.expression)) return;
          if (!imported.has(node.expression.text)) return;
          if (node.name.text !== 'Class' && node.name.text !== '$Class') return;
          if (node.parent && ts.isExpressionWithTypeArguments(node.parent) && node.name.text === '$Class') return;
          if (this.isInsideFunctionBody(node)) return;
          findings.push(this.finding(this.cross_module_class_reads_happen_inside_bodies, unit, this.lineOf(unit, node), `\`${node.getText(unit.ast)}\` is read at module evaluation — read it inside a getter or method body (any load order then resolves)`));
        });
      }
      return findings;
    });
  }

  static get declarations_use_full_descriptive_names(): StandardCheck {
    return this.defineCheck('Declarations use full descriptive names', (context) => {
      const findings: Finding[] = [];
      const inspect = (unit: SourceUnit) => {
        this.forEachDescendant(unit.ast, (node) => {
          let identifier: ts.Identifier | null = null;
          if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) && ts.isIdentifier(node.name)) identifier = node.name;
          else if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node) || ts.isGetAccessorDeclaration(node)) && node.name && ts.isIdentifier(node.name)) identifier = node.name;
          if (!identifier) return;
          const name = identifier.text;
          const bare = name.replace(/^[$_]+/, '');
          const single = bare.length === 1 && !this.DOMAIN_TERMS.has(bare);
          const banned = this.BANNED_NAMES.has(bare.toLowerCase());
          if (name === '_' || single || banned)
            findings.push(this.finding(this.declarations_use_full_descriptive_names, unit, this.lineOf(unit, identifier), `\`${name}\` — unfold to the domain word (row, cell, newValue, event…); single letters and abbreviations are not names`));
        });
      };
      for (const unit of context.sources) inspect(unit);
      for (const unit of context.tests) inspect(unit);
      return findings;
    });
  }

  static get class_members_are_ordered_and_spaced(): StandardCheck {
    return this.defineCheck('Class members are ordered and spaced', (context) => {
      const findings: Finding[] = [];
      const rank = (member: ts.ClassElement): number => {
        if (this.isStaticMember(member)) return 0;
        if (ts.isConstructorDeclaration(member)) return 1;
        if (ts.isPropertyDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) return 2;
        return 3;
      };
      const rankName = ['a static member', 'the constructor', 'a getter or field', 'a method'];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        let highest = -1;
        let previous: ts.ClassElement | null = null;
        for (const member of classFile.rawClass.members) {
          const currentRank = rank(member);
          if (currentRank < highest)
            findings.push(this.finding(this.class_members_are_ordered_and_spaced, unit, this.lineOf(unit, member), `${rankName[currentRank]} follows ${rankName[highest]} — order is statics, constructor, getters, methods`));
          highest = Math.max(highest, currentRank);
          if (previous && ts.isMethodDeclaration(member) && ts.isMethodDeclaration(previous)) {
            const startLine = unit.ast.getLineAndCharacterOfPosition(member.getFullStart()).line;
            const previousEndLine = unit.ast.getLineAndCharacterOfPosition(previous.getEnd()).line;
            const between = unit.lines.slice(previousEndLine + 1, unit.ast.getLineAndCharacterOfPosition(member.getStart(unit.ast)).line);
            if (!between.some((line) => line.trim() === '') && startLine >= previousEndLine)
              findings.push(this.finding(this.class_members_are_ordered_and_spaced, unit, this.lineOf(unit, member), `method \`${this.memberName(member)}\` is not separated from the previous method by a blank line — methods are paragraphs`));
          }
          previous = member;
        }
      }
      return findings;
    });
  }

  static get a_test_file_opens_with_its_generator_header(): StandardCheck {
    return this.defineCheck('A test file opens with its generator header', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) findings.push(this.finding(this.a_test_file_opens_with_its_generator_header, unit, 1, `no \`${this.$grammar.GENERATOR}\` header — the test file opens with its generator header, before any import`));
        else if (!header.firstContent) findings.push(this.finding(this.a_test_file_opens_with_its_generator_header, unit, 1, 'the generator header is not the first content — nothing precedes it, imports follow it'));
      }
      return findings;
    });
  }

  static get a_generator_header_carries_both_registers_in_order(): StandardCheck {
    return this.defineCheck('A generator header carries both registers in order', (context) => {
      const findings: Finding[] = [];
      const grammar = this.$grammar;
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        const line = unit.lines.findIndex((text) => text.includes(grammar.GENERATOR)) + 1;
        if (unit.text.split(grammar.GENERATOR).length > 2) findings.push(this.finding(this.a_generator_header_carries_both_registers_in_order, unit, line, `duplicate \`${grammar.GENERATOR}\` sentinel`));
        if (!header.bothRegisters) findings.push(this.finding(this.a_generator_header_carries_both_registers_in_order, unit, line, `missing \`${grammar.GENERATOR_DESCRIBED}\` register`));
        else if (!header.orderedRegisters) findings.push(this.finding(this.a_generator_header_carries_both_registers_in_order, unit, line, `\`${grammar.GENERATOR_DESCRIBED}\` must follow \`${grammar.GENERATOR}\``));
        if (!header.goal) findings.push(this.finding(this.a_generator_header_carries_both_registers_in_order, unit, line, 'the formal register needs a `Goal:` line'));
        if (!header.impossibilities.size) findings.push(this.finding(this.a_generator_header_carries_both_registers_in_order, unit, line, 'the formal register needs at least one `Impossible if true:` line'));
      }
      return findings;
    });
  }

  static get a_header_symbol_is_declared_in_the_sibling_source(): StandardCheck {
    return this.defineCheck('A header symbol is declared in the sibling source', (context) => {
      const findings: Finding[] = [];
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
              findings.push(this.finding(this.a_header_symbol_is_declared_in_the_sibling_source, unit, subject.line, `Subject path does not exist: ${subject.path}`));
              broken = true;
              continue;
            }
            subjectTexts.push(readFileSync(found, 'utf8'));
          }
          if (broken) continue;
        } else {
          const sourcePath = this.siblingSourcePath(unit.path);
          if (!existsSync(sourcePath)) {
            findings.push(this.finding(this.a_header_symbol_is_declared_in_the_sibling_source, unit, 1, `no sibling source \`${basename(sourcePath)}\` for this test file's header symbols — name the source with a \`Subject:\` line, or colocate the test`));
            continue;
          }
          subjectTexts = [readFileSync(sourcePath, 'utf8')];
        }
        const subjectDescription = header.subjects.length ? header.subjects.map((subject) => basename(subject.path)).join(', ') : basename(this.siblingSourcePath(unit.path));
        for (const { symbol, line } of header.domainClaims.values()) {
          if (!subjectTexts.some((text) => this.declaredInSource(text, symbol)))
            findings.push(this.finding(this.a_header_symbol_is_declared_in_the_sibling_source, unit, line, `header symbol \`${symbol}\` is not declared in ${subjectDescription}`));
        }
      }
      return findings;
    });
  }

  static get a_claim_annotation_sits_directly_above_its_test(): StandardCheck {
    return this.defineCheck('A claim annotation sits directly above its test', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        for (const proof of this.parseProofs(unit, header)) {
          if (!proof.bound) findings.push(this.finding(this.a_claim_annotation_sits_directly_above_its_test, unit, proof.line, 'proof annotation must sit directly above a test (an optional doc comment may sit between)'));
        }
      }
      return findings;
    });
  }

  static get header_claims_and_annotated_tests_match_one_to_one(): StandardCheck {
    return this.defineCheck('Header claims and annotated tests match one to one', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        const proofs = this.parseProofs(unit, header).filter((proof) => proof.bound && proof.type === 'domain');
        const proved = new Set<string>();
        for (const proof of proofs) {
          const key = `${proof.symbol} — ${proof.claim}`;
          if (header.domainClaims.has(key)) proved.add(key);
          else if (!header.impossibilities.has(proof.claim ?? '')) findings.push(this.finding(this.header_claims_and_annotated_tests_match_one_to_one, unit, proof.line, `annotated test claim is absent from the header: ${key}`));
        }
        for (const [key, { line }] of header.domainClaims) {
          if (!proved.has(key)) findings.push(this.finding(this.header_claims_and_annotated_tests_match_one_to_one, unit, line, `header ${this.$grammar.DOMAIN} has no annotated test: ${key}`));
        }
      }
      return findings;
    });
  }

  static get an_impossibility_is_proved_by_an_exact_negative_test(): StandardCheck {
    return this.defineCheck('An impossibility is proved by an exact negative test', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        const proofs = this.parseProofs(unit, header).filter((proof) => proof.bound);
        const proved = new Set<string>();
        for (const proof of proofs) {
          if (proof.type === 'impossible') {
            if (header.impossibilities.has(proof.claim ?? '')) {
              proved.add(proof.claim ?? '');
              if (!header.domainSymbols.has(proof.symbol ?? '')) findings.push(this.finding(this.an_impossibility_is_proved_by_an_exact_negative_test, unit, proof.line, `impossibility proof symbol \`${proof.symbol}\` is absent from the header`));
            } else if (header.domainClaims.has(`${proof.symbol} — ${proof.claim}`)) findings.push(this.finding(this.an_impossibility_is_proved_by_an_exact_negative_test, unit, proof.line, `an invariant is labeled as an impossibility: ${proof.claim}`));
            else findings.push(this.finding(this.an_impossibility_is_proved_by_an_exact_negative_test, unit, proof.line, `impossibility text is not exact — no header line reads: ${proof.claim}`));
          }
          if (proof.type === 'domain' && header.impossibilities.has(proof.claim ?? ''))
            findings.push(this.finding(this.an_impossibility_is_proved_by_an_exact_negative_test, unit, proof.line, `an impossibility is labeled as an invariant: ${proof.claim}`));
        }
        for (const [claim, line] of header.impossibilities) {
          if (!proved.has(claim)) findings.push(this.finding(this.an_impossibility_is_proved_by_an_exact_negative_test, unit, line, `Impossible if true has no annotated negative test: ${claim}`));
        }
      }
      return findings;
    });
  }

  static get a_contract_pointer_resolves_and_is_proved(): StandardCheck {
    return this.defineCheck('A contract pointer resolves and is proved', (context) => {
      const findings: Finding[] = [];
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        const proofs = this.parseProofs(unit, header).filter((proof) => proof.bound && proof.type === 'record');
        const provedNames = new Set(proofs.map((proof) => this.headingSlug(proof.name ?? '')));
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
        for (const proof of proofs) {
          if (!header.contractLinks.some((link) => link.anchor === this.headingSlug(proof.name ?? ''))) findings.push(this.finding(this.a_contract_pointer_resolves_and_is_proved, unit, proof.line, `annotated record is absent from the header: ${proof.name}`));
        }
      }
      return findings;
    });
  }

  static get a_source_tripwire_resolves_to_its_sibling_header(): StandardCheck {
    return this.defineCheck('A source tripwire resolves to its sibling header', (context) => {
      const findings: Finding[] = [];
      const grammar = this.$grammar;
      const SYMBOL_ONLY = new RegExp(`^\\s*//\\s*${grammar.DOMAIN}:\\s*([^—\\n]+?)\\s*$`);
      for (const unit of context.sources) {
        const testPath = unit.path.replace(/\.ts$/, '.test.ts');
        let siblingSymbols: Set<string> | null = null;
        unit.lines.forEach((line, index) => {
          if (!line.includes(`${grammar.DOMAIN}:`)) return;
          const symbolOnly = SYMBOL_ONLY.exec(line);
          if (!symbolOnly) {
            findings.push(this.finding(this.a_source_tripwire_resolves_to_its_sibling_header, unit, index + 1, `source tripwires carry only the symbol: \`// ${grammar.DOMAIN}: <symbol>\``));
            return;
          }
          if (siblingSymbols === null) {
            siblingSymbols = existsSync(testPath) ? this.parseHeader(this.toUnit(context.cwd, testPath)).domainSymbols : new Set();
          }
          if (!siblingSymbols.has(symbolOnly[1].trim()))
            findings.push(this.finding(this.a_source_tripwire_resolves_to_its_sibling_header, unit, index + 1, `tripwire \`${symbolOnly[1].trim()}\` has no header claim in ${basename(testPath)}`));
        });
        if (unit.text.includes(grammar.GENERATOR)) findings.push(this.finding(this.a_source_tripwire_resolves_to_its_sibling_header, unit, unit.lines.findIndex((line) => line.includes(grammar.GENERATOR)) + 1, `\`${grammar.GENERATOR}\` belongs at the top of the sibling test file, not in source`));
      }
      return findings;
    });
  }

  static get a_test_caveat_derives_from_a_tested_claim(): StandardCheck {
    return this.defineCheck('A test caveat derives from a tested claim', (context) => {
      const findings: Finding[] = [];
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
          findings.push(this.finding(this.a_test_caveat_derives_from_a_tested_claim, unit, startLine, `described-register caveat names no header symbol — a constraint the tests do not reach is a claim without a proof: "${sentence.trim().slice(0, 90)}"`));
        }
      }
      return findings;
    });
  }

  static get the_population_and_skip_list_are_exact(): StandardCheck {
    // enforced by run() itself; its findings and refusals carry this name
    return this.defineCheck('The population and skip-list are exact', () => []);
  }

  static get two_test_files_do_not_share_one_generator_header(): StandardCheck {
    return this.defineCheck('Two test files do not share one generator header', (context) => {
      const findings: Finding[] = [];
      const normalized = new Map<string, SourceUnit>();
      for (const unit of context.tests) {
        const header = this.parseHeader(unit);
        if (!header.present) continue;
        let text = `${header.goal}\n${header.described}`.replace(/\s+/g, ' ').trim();
        for (const symbol of header.domainSymbols) text = text.replaceAll(symbol, '<symbol>');
        text = text.replaceAll(basename(unit.path).replace(/\.test\.ts$/, ''), '<file>');
        if (!text) continue;
        const twin = normalized.get(text);
        if (twin) findings.push(this.finding(this.two_test_files_do_not_share_one_generator_header, unit, 1, `generator header is a template twin of ${twin.relativePath} — a Goal that fits another file with the name swapped is not a Goal`));
        else normalized.set(text, unit);
      }
      return findings;
    });
  }

  /** The manifest, in the Standard's order — reads through `this`, so a
   * subclass's overridden or added check getters flow into it. */
  static get checks(): readonly StandardCheck[] {
    return [
      this.exactly_one_reactive_source_is_installed,
      this.a_public_class_publishes_its_namespace_manifest,
      this.a_class_file_is_named_after_its_class,
      this.a_class_file_holds_only_imports_class_namespace_and_types,
      this.behavior_lives_on_the_prototype_not_in_fields,
      this.construction_goes_through_the_namespace_class_slot,
      this.the_anchor_is_static_only_when_statics_exist,
      this.static_binds_methods_and_caches_dollar_getters_per_receiver,
      this.a_shared_store_is_a_static_readonly_field,
      this.a_derived_static_getter_is_lower_camel_case,
      this.static_reads_go_through_self_not_the_base_class,
      this.mutable_state_is_a_ref_returning_getter,
      this.a_ref_is_read_and_written_through_value,
      this.a_derivation_is_a_plain_getter_unless_computed_is_justified,
      this.a_composable_is_injected_by_a_one_call_dollar_getter,
      this.instance_types_only_unwrapping_surfaces,
      this.a_component_has_one_model_owner,
      this.the_state_destructure_is_total,
      this.template_expressions_carry_no_logic,
      this.watch_lifetime_matches_the_instance_owner,
      this.a_reactive_closure_delegates_to_one_method,
      this.a_store_is_used_lazily_and_swapped_at_the_class_slot,
      this.keyed_state_creates_on_read_and_peeks_on_write,
      this.a_generic_reactive_class_casts_its_constructor,
      this.cross_module_class_reads_happen_inside_bodies,
      this.declarations_use_full_descriptive_names,
      this.class_members_are_ordered_and_spaced,
      this.a_test_file_opens_with_its_generator_header,
      this.a_generator_header_carries_both_registers_in_order,
      this.a_header_symbol_is_declared_in_the_sibling_source,
      this.a_claim_annotation_sits_directly_above_its_test,
      this.header_claims_and_annotated_tests_match_one_to_one,
      this.an_impossibility_is_proved_by_an_exact_negative_test,
      this.a_contract_pointer_resolves_and_is_proved,
      this.a_source_tripwire_resolves_to_its_sibling_header,
      this.a_test_caveat_derives_from_a_tested_claim,
      this.the_population_and_skip_list_are_exact,
      this.two_test_files_do_not_share_one_generator_header,
    ];
  }

  /** The skip-list vocabulary — per receiver, so house checks are skippable too. */
  static get checkNames(): ReadonlySet<string> {
    return new Set(this.checks.map((entry) => entry.name));
  }

  /** Default severity overrides — a house gate ships its team's rulings here
   * ({ 'Check name': 'warn' | 'off' }); everything else is an error. The
   * command line's --warn/--off override per run. */
  static get severities(): Readonly<Record<string, 'warn' | 'off'>> {
    return {};
  }

  // shared proof fixtures, assembled once per receiver (grammar tokens
  // interpolated at runtime so scanners never read them as this file's own)
  static get $fixtures() {
    const grammar = this.$grammar;
    const validClass = `import { ref, watch } from 'vue';
import { Reactive } from 'ivue';

class $Box {
  constructor(public props: { width: number }) {
    watch(
      () => this.height.value,
      (newHeight, oldHeight) => this.onResize(newHeight, oldHeight),
    );
  }

  get height() {
    return ref(4);
  }
  get width() {
    return this.props.width;
  }
  get area() {
    return this.width * this.height.value;
  }

  grow() {
    this.height.value++;
  }

  onResize(newHeight: number, oldHeight: number) {
    return newHeight - oldHeight;
  }
}

export namespace Box {
  export const $Class = $Box;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
`;
    const validTest = `/*
${grammar.GENERATOR}
Goal: Prove the box grows by exactly one height unit per grow call and that height never moves on its own.
// ${grammar.DOMAIN}: $Box — If grow is called, then height increases by one
Impossible if true: height decreases without a grow call

${grammar.GENERATOR_DESCRIBED}
The $Box height is the only mutable state, so growth is the single write path the tests must hold.
*/
import { expect, test } from 'vitest';
import { Box } from './Box';

// ${grammar.DOMAIN}: $Box — If grow is called, then height increases by one
test('grow raises height by one', () => {
  const box = new Box.Class({ width: 2 });
  box.grow();
  expect(box.height.value).toBe(5);
});

// ${grammar.IMPOSSIBLE}: $Box — height decreases without a grow call
test('height never decreases on its own', () => {
  const box = new Box.Class({ width: 2 });
  expect(box.height.value).toBe(4);
});
`;
    const validSfc = `<script setup lang="ts">
import { Box } from './Box';

const props = defineProps<{ width: number }>();
const box = new Box.Class(props);
const { height } = box;

defineExpose(box as Box.Instance);
</script>

<template>
  <div v-if="height > 0">{{ box.area }}</div>
  <button @click="box.grow()">grow</button>
</template>
`;
    const staticClass = `import { Static } from 'ivue/extras';

class $Clock {
  static get $zone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  static now() {
    return Date.now();
  }
}

export namespace Clock {
  export const $Class = Static($Clock);
  export let Class = $Class;
}
`;
    const selfClass = (reads: string) => `import { Reactive } from 'ivue';
import { Static } from 'ivue/extras';

class $Tooltip {
  static get DELAY_MS() {
    return 200;
  }

  get self() {
    return this.constructor as typeof $Tooltip;
  }

  get delay() {
    ${reads}
  }
}

export namespace Tooltip {
  export const $Class = Static($Tooltip);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
`;
    const keyedClass = (writePath: string, release: string) => `import { ref, type Ref } from 'vue';
import { Reactive } from 'ivue';

class $Sheet {
  private readonly cellVersions = new Map<number, Ref<number>>();

  trackCell(cellKey: number): void {
    let versionRef = this.cellVersions.get(cellKey);
    if (!versionRef) {
      versionRef = ref(0);
      this.cellVersions.set(cellKey, versionRef);
    }
    void versionRef.value;
  }

  ${writePath}
${release}}

export namespace Sheet {
  export const $Class = $Sheet;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
`;
    const genericClass = (classLine: string, instanceLine: string) => `import { ref } from 'vue';
import { Reactive, type ReactiveInstance } from 'ivue';

class $Scroller<T> {
  get items() {
    return ref<T[]>([]);
  }
}

export namespace Scroller {
  export const $Class = $Scroller;
  ${classLine}
  ${instanceLine}
}
`;
    const recordWord = `${grammar.RECORD[0].toUpperCase()}${grammar.RECORD.slice(1)}`;
    const demoContract = `# demo contract

## Reality-based ${grammar.RECORD}s

### A box never shrinks by itself

**${recordWord}:** If no grow call happens, then height stays.

**Status:** provisional

## Chosen ${grammar.RECORD}s
`;
    return { validClass, validTest, validSfc, staticClass, selfClass, keyedClass, genericClass, demoContract };
  }

  /** The constitution: every check's claim, impossibility, and both
   * permanent proof arms — per receiver, extended alongside `checks`. */
  static get proofs(): Readonly<Record<string, CheckProof>> {
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
      'Exactly one Reactive source is installed': {
        claim: 'If the gate runs over a checkout, then it finds exactly one engine, an ivue dependency or one vendored Reactive, never zero and never two',
        impossibility: 'a file breaking Exactly one Reactive source is installed passes the gate',
        red: [{ files: { ...box, 'src/Reactive.ts': 'export function Reactive<C>(targetClass: C): C { return targetClass; }\n' }, expectFindings: [/2 Reactive sources/] }],
        green: [
          { files: box },
          { files: { ...box, 'src/ivue.ts': "export { Reactive } from '../engine/Reactive';\n" }, manifest: { name: 'consumer' } },
        ],
      },
      'A public class publishes its namespace manifest': {
        claim: 'If a file declares a dollar-prefixed class, then it exports a namespace with dollar-Class, Class, and Instance for reactive classes, and no behavior is exported directly',
        impossibility: 'a file breaking A public class publishes its namespace manifest passes the gate',
        red: [{
          files: {
            'src/Box.ts': fixture.validClass.replace('  export type Instance = typeof Class.Instance;\n', ''),
            'src/Tools.ts': 'interface Handler { run(): number }\nexport default { run() { return 1; } } satisfies Handler;\n',
          },
          expectFindings: [/lacks `export type Instance/, /behavioral object is exported directly/],
          expectCount: 2,
        }],
        green: [{
          files: {
            ...box,
            'src/Format.ts': "import { Static } from 'ivue/extras';\n\nclass $Format {\n  static orDash(value: string | null) {\n    return value ?? '—';\n  }\n}\n\nexport namespace Format {\n  export const $Class = Static($Format);\n  export let Class = $Class;\n}\n",
            'src/Store.ts': "class $Store {\n  private readonly rows: string[] = [];\n\n  save(row: string) {\n    this.rows.push(row);\n  }\n}\n\nexport namespace Store {\n  export const $Class = $Store;\n  export let Class = $Class;\n}\n",
          },
        }],
      },
      'A class file is named after its class': {
        claim: 'If a file declares dollar-X, then the file is X.ts and the namespace is X',
        impossibility: 'a file breaking A class file is named after its class passes the gate',
        red: [{ files: { 'src/Crate.ts': fixture.validClass }, expectFindings: [/`Crate\.ts` declares `\$Box`/] }],
        // Widget.ts declares a private helper class FIRST — the file's
        // identity is the class matching the file name, not the first class.
        green: [{ files: { ...box, 'src/Widget.ts': "class $WidgetPart {\n  spin() {\n    return 1;\n  }\n}\n\nclass $Widget {\n  get part() {\n    return new $WidgetPart();\n  }\n}\n\nexport namespace Widget {\n  export const $Class = $Widget;\n  export let Class = $Class;\n}\n" } }],
      },
      'A class file holds only imports class namespace and types': {
        claim: 'If a file is a class file, then its top level is imports, the class, its namespace, and type declarations, nothing else',
        impossibility: 'a file breaking A class file holds only imports class namespace and types passes the gate',
        red: [{ files: { 'src/Box.ts': `${fixture.validClass}\nconst DEFAULT_WIDTH = 4;\nexport function widen(box: Box.Instance) { return box.area; }\n` }, expectFindings: [/outside the class seam/], expectCount: 2 }],
        green: [{ files: { 'src/Box.ts': `${fixture.validClass}\nexport type BoxSeed = { width: number };\nexport interface BoxEmits { (event: 'grown'): void }\n` } }],
      },
      'Behavior lives on the prototype not in fields': {
        claim: 'If a class member is a function, then it is a method, never a function-valued field',
        impossibility: 'a file breaking Behavior lives on the prototype not in fields passes the gate',
        red: [{ files: { 'src/Box.ts': fixture.validClass.replace('  grow() {\n    this.height.value++;\n  }', '  grow = () => {\n    this.height.value++;\n  };') }, expectFindings: [/`grow` is a function-valued field/] }],
        green: [{ files: box }],
      },
      'Construction goes through the namespace Class slot': {
        claim: 'If an instance is created, then it is new X.Class, never new dollar-X, new X.dollar-Class, or reactive-wrapped construction',
        impossibility: 'a file breaking Construction goes through the namespace Class slot passes the gate',
        red: [{
          files: {
            ...box,
            'src/BoxFactory.ts': "import { reactive } from 'vue';\nimport { Box, $Box } from './Box';\n\nclass $BoxFactory {\n  makeRaw() {\n    return new $Box({ width: 1 });\n  }\n\n  makeAnchor() {\n    return new Box.$Class({ width: 1 });\n  }\n\n  makeWrapped() {\n    return reactive(new Box.Class({ width: 1 }));\n  }\n}\n\nexport namespace BoxFactory {\n  export const $Class = $BoxFactory;\n  export let Class = $Class;\n}\n",
          },
          expectCount: 3,
        }],
        green: [{
          files: {
            ...box,
            'src/BoxFactory.ts': "import { Box } from './Box';\n\nclass $BoxFactory {\n  make() {\n    return new Box.Class({ width: 1 });\n  }\n}\n\nexport namespace BoxFactory {\n  export const $Class = $BoxFactory;\n  export let Class = $Class;\n}\n",
          },
        }],
      },
      'The anchor is Static only when statics exist': {
        claim: 'If a class declares static members, then its anchor is Static of the raw class, and if it declares none, then its anchor is the raw class itself',
        impossibility: 'a file breaking The anchor is Static only when statics exist passes the gate',
        red: [{
          files: {
            'src/Clock.ts': fixture.staticClass.replace('export const $Class = Static($Clock);', 'export const $Class = $Clock;'),
            'src/Box.ts': fixture.validClass.replace("import { Reactive } from 'ivue';", "import { Reactive } from 'ivue';\nimport { Static } from 'ivue/extras';").replace('export const $Class = $Box;', 'export const $Class = Static($Box);'),
          },
          expectCount: 2,
        }],
        green: [{ files: { 'src/Clock.ts': fixture.staticClass, ...box } }],
      },
      'Static binds methods and caches dollar getters per receiver': {
        claim: "If the consumer's Static transforms a class, then its static methods are bound with stable identity and its dollar getters run once per receiver class",
        impossibility: 'a file breaking Static binds methods and caches dollar getters per receiver passes the gate',
        red: [
          { files: box, options: { staticImplementation: (<Class,>(targetClass: Class) => targetClass) as StaticTransform }, expectFindings: [/does not bind static methods/, /does not cache a dollar getter once per receiver/] },
          { files: box, options: { staticImplementation: null }, expectFindings: [/could not be loaded/] },
        ],
        green: [{ files: box }],
      },
      'A shared store is a static readonly field': {
        claim: 'If a static holds shared state, then the field is readonly, and a dependency constructed at load lives in a LazyShared cell',
        impossibility: 'a file breaking A shared store is a static readonly field passes the gate',
        red: [{
          files: {
            ...box,
            'src/Registry.ts': "import { Static } from 'ivue/extras';\nimport { Box } from './Box';\n\nclass $Registry {\n  static formatters = new Map<string, Intl.DateTimeFormat>();\n  static readonly defaultBox = new Box.Class({ width: 1 });\n}\n\nexport namespace Registry {\n  export const $Class = Static($Registry);\n  export let Class = $Class;\n}\n",
          },
          expectFindings: [/mutable shared store/, /constructs another namespace's class at module load/],
        }],
        green: [{
          files: {
            ...box,
            'src/Registry.ts': "import { LazyShared, Static } from 'ivue/extras';\nimport { Box } from './Box';\n\nclass $Registry {\n  static readonly formatters = new Map<string, Intl.DateTimeFormat>();\n  static readonly sharedBox = new LazyShared(() => new Box.Class({ width: 1 }));\n}\n\nexport namespace Registry {\n  export const $Class = Static($Registry);\n  export let Class = $Class;\n}\n",
          },
        }],
      },
      'A derived static getter is lower camel case': {
        claim: 'If a static getter derives its value from other members or classes, then its name is lowerCamel, and SCREAMING_SNAKE remains for literal tunable constants',
        impossibility: 'a file breaking A derived static getter is lower camel case passes the gate',
        red: [{ files: { 'src/Clock.ts': fixture.staticClass.replace('  static now() {', '  static get SCAN_LIMIT_HOURS() {\n    return Number(this.$zone.length) * 24;\n  }\n\n  static now() {') }, expectFindings: [/derives its value — a derived getter is lowerCamel \(`scanLimitHours`\)/] }],
        green: [{ files: { 'src/Clock.ts': fixture.staticClass.replace('  static now() {', '  static get RETRY_LIMIT() {\n    return 3;\n  }\n\n  static get EMAIL_PATTERN() {\n    return /a+b/;\n  }\n\n  static get scanLimitHours() {\n    return Number(this.$zone.length) * 24;\n  }\n\n  static now() {') } }],
      },
      'Static reads go through self not the base class': {
        claim: 'If instance code reads its own statics, then it reads this.self, never the base class name or a per-site constructor cast',
        impossibility: 'a file breaking Static reads go through self not the base class passes the gate',
        red: [{ files: { 'src/Tooltip.ts': fixture.selfClass('return $Tooltip.DELAY_MS + (this.constructor as typeof $Tooltip).DELAY_MS;') }, expectCount: 2 }],
        green: [{ files: { 'src/Tooltip.ts': fixture.selfClass('const self = this.self;\n    return self.DELAY_MS + self.DELAY_MS;') } }],
      },
      'Mutable state is a ref-returning getter': {
        claim: 'If a class holds mutable state, then it is a getter returning ref or shallowRef, never a mutable plain field',
        impossibility: 'a file breaking Mutable state is a ref-returning getter passes the gate',
        red: [{ files: { 'src/Box.ts': fixture.validClass.replace('  get height() {', '  count = 0;\n\n  get height() {') }, expectFindings: [/`count` is a mutable plain field/] }],
        // Db.ts is a PLAIN namespace class (no Reactive) — plain mutable
        // fields are its legitimate state; nothing reactive to trigger.
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace("import { ref, watch } from 'vue';", "import { ref, shallowRef, watch } from 'vue';").replace('  get width() {', '  get rows() {\n    return shallowRef<number[]>([]);\n  }\n  get width() {'), 'src/Db.ts': "class $Db {\n  connectionCount = 0;\n\n  open() {\n    this.connectionCount++;\n  }\n}\n\nexport namespace Db {\n  export const $Class = $Db;\n  export let Class = $Class;\n}\n" } }],
      },
      'A Ref is read and written through value': {
        claim: 'If class code writes a Ref getter, then it writes .value, never assigns over the getter',
        impossibility: 'a file breaking A Ref is read and written through value passes the gate',
        red: [{ files: { 'src/Box.ts': fixture.validClass.replace('    this.height.value++;', '    this.height = 9;') }, expectFindings: [/assigns over a Ref getter/] }],
        green: [{ files: { ...box, 'src/Box.vue': fixture.validSfc } }],
      },
      'A derivation is a plain getter unless computed is justified': {
        claim: 'If a getter allocates a computed, then a stated reason, expensive or render-suppression or stable-handle, sits above it',
        impossibility: 'a file breaking A derivation is a plain getter unless computed is justified passes the gate',
        red: [{ files: { 'src/Box.ts': fixture.validClass.replace("import { ref, watch } from 'vue';", "import { computed, ref, watch } from 'vue';").replace('  get area() {\n    return this.width * this.height.value;\n  }', '  get area() {\n    return computed(() => this.width * this.height.value);\n  }') }, expectFindings: [/without a stated reason/] }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace("import { ref, watch } from 'vue';", "import { computed, ref, watch } from 'vue';").replace('  grow() {', '  // computed: expensive — sorts every row\n  get sortedRows() {\n    return computed(() => this.sortRows());\n  }\n\n  sortRows() {\n    return [this.area];\n  }\n\n  grow() {') } }],
      },
      'A composable is injected by a one-call dollar getter': {
        claim: 'If a class uses a composable or store, then a dollar getter returns the one call, never an eager field',
        impossibility: 'a file breaking A composable is injected by a one-call dollar getter passes the gate',
        red: [{ files: { 'src/Box.ts': fixture.validClass.replace('  get height() {', "  mouse = useMouse();\n\n  private get $project() {\n    const store = useProjectStore();\n    store.warm();\n    return store;\n  }\n\n  get height() {").replace("import { ref, watch } from 'vue';", "import { ref, watch } from 'vue';\nimport { useMouse } from '@vueuse/core';\nimport { useProjectStore } from './stores';") }, expectFindings: [/runs at construction/, /does more than one call/] }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace('  get height() {', '  private get $project() {\n    return useProjectStore();\n  }\n\n  get height() {').replace("import { ref, watch } from 'vue';", "import { ref, watch } from 'vue';\nimport { useProjectStore } from './stores';") } }],
      },
      'Instance types only unwrapping surfaces': {
        claim: 'If a raw collection or parameter is typed, then it uses Model, and if an unwrapping surface is typed, then it uses Instance',
        impossibility: 'a file breaking Instance types only unwrapping surfaces passes the gate',
        red: [{
          files: {
            ...box,
            'src/Shelf.ts': "import { shallowRef } from 'vue';\nimport { Reactive } from 'ivue';\nimport { Box } from './Box';\n\nclass $Shelf {\n  get boxes() {\n    return shallowRef<Box.Instance[]>([]);\n  }\n\n  widest(box: Box.Instance) {\n    return box.area;\n  }\n}\n\nexport namespace Shelf {\n  export const $Class = $Shelf;\n  export let Class = Reactive($Class);\n  export type Instance = typeof Class.Instance;\n}\n",
            'src/Box.vue': fixture.validSfc.replace('defineExpose(box as Box.Instance);', 'defineExpose(box as Box.Model);'),
          },
          expectFindings: [/types a raw graph position/, /`Box\.Model` on an unwrapping surface/],
          expectCount: 3,
        }],
        green: [{
          files: {
            'src/Box.ts': fixture.validClass.replace('  export type Instance = typeof Class.Instance;', '  export type Model = InstanceType<typeof Class>;\n  export type Instance = typeof Class.Instance;'),
            'src/Shelf.ts': "import { shallowRef } from 'vue';\nimport { Reactive } from 'ivue';\nimport { Box } from './Box';\n\nclass $Shelf {\n  get boxes() {\n    return shallowRef<Box.Model[]>([]);\n  }\n\n  widest(box: Box.Model) {\n    return box.area;\n  }\n}\n\nexport namespace Shelf {\n  export const $Class = $Shelf;\n  export let Class = Reactive($Class);\n  export type Instance = typeof Class.Instance;\n}\n",
            'src/Box.vue': fixture.validSfc,
          },
        }],
      },
      'A component has one model owner': {
        claim: 'If a component has behavior, then exactly one class instance owns it and the script setup carries no parallel reactive behavior',
        impossibility: 'a file breaking A component has one model owner passes the gate',
        red: [{
          files: { ...box, 'src/Box.vue': fixture.validSfc.replace('const box = new Box.Class(props);', "import { onMounted, ref, watch } from 'vue';\nconst box = new Box.Class(props);\nconst spare = new Box.Class(props);\nconst open = ref(false);\nwatch(open, () => box.grow());\nonMounted(() => { open.value = !open.value; });\nfunction toggle() { open.value = !open.value; }") },
          expectFindings: [/second model is constructed/, /`ref\(\)` in `<script setup>`/, /`watch\(\)` in `<script setup>`/, /`onMounted\(\)` in `<script setup>`/, /free function `toggle`/],
        }],
        // a lifecycle hook that DELEGATES one call to the model is wiring,
        // not parallel behavior — the bridge an outliving store needs
        green: [{ files: { ...box, 'src/Box.vue': fixture.validSfc.replace("const { height } = box;", "const { height } = box;\n\nonMounted(() => box.grow());").replace("import { Box } from './Box';", "import { onMounted } from 'vue';\nimport { Box } from './Box';") } }],
      },
      'The state destructure is total': {
        claim: 'If a template touches a Ref, then that Ref is destructured, no plain getter or method is destructured, and no state binding shadows a prop',
        impossibility: 'a file breaking The state destructure is total passes the gate',
        red: [{
          files: {
            ...box,
            'src/Box.vue': "<script setup lang=\"ts\">\nimport { Box } from './Box';\n\nconst props = defineProps<{ width: number }>();\nconst box = new Box.Class(props);\nconst { area, grow, width } = box;\n\ndefineExpose(box as Box.Instance);\n</script>\n\n<template>\n  <div v-if=\"box.height\">{{ area }}</div>\n  <button @click=\"grow()\">{{ width }}</button>\n</template>\n",
          },
          expectFindings: [/`area` is a plain getter/, /`grow` is a method/, /`width` shadows the prop/, /reaches a Ref through the instance/],
        }],
        green: [{ files: { ...box, 'src/Box.vue': fixture.validSfc } }],
      },
      'Template expressions carry no logic': {
        claim: 'If a template expression is written, then it is a named read, a method call, or a structural branch, never a comparison, ternary, negation, or built string',
        impossibility: 'a file breaking Template expressions carry no logic passes the gate',
        red: [{
          files: { ...box, 'src/Box.vue': fixture.validSfc.replace('<div v-if="height > 0">{{ box.area }}</div>', '<div v-if="height > 0 && box.area">{{ box.area ? \'big\' : \'small\' }}</div>\n  <span :title="`Box ${box.area}`">{{ !!height }}</span>') },
          expectFindings: [/`&&` expression/, /a ternary/, /a built string/, /a negation/],
          expectCount: 4,
        }],
        // a bare `!` on a NAMED read (state binding, getter, or method call)
        // stays name-level — only unnamed compound logic is flagged
        green: [{ files: { ...box, 'src/Box.vue': fixture.validSfc.replace('<div v-if="height > 0">{{ box.area }}</div>', '<div v-if="box.hasHeight">{{ box.area }}</div>\n  <span v-if="!box.hasHeight">empty</span>\n  <ul><li v-for="row in box.rows" :key="row.id" :class="{ wide: box.isWide(row), narrow: !box.isWide(row) }">{{ row.name }}</li></ul>') } }],
      },
      'Watch lifetime matches the instance owner': {
        claim: 'If a class is component-scoped, then it uses plain watch, and if it outlives components, then it uses dollar-watch with a dispose path',
        impossibility: 'a file breaking Watch lifetime matches the instance owner passes the gate',
        red: [{
          files: {
            'src/Box.ts': fixture.validClass.replace('    watch(\n      () => this.height.value,', '    this.$watch(\n      () => this.height.value,'),
            'src/Box.vue': fixture.validSfc,
            'src/Session.ts': "import { ref, watch } from 'vue';\nimport { Reactive } from 'ivue';\n\nclass $Session {\n  constructor() {\n    watch(() => this.user.value, (user) => this.onUser(user));\n  }\n\n  get user() {\n    return ref<string | null>(null);\n  }\n\n  onUser(user: string | null) {\n    return user;\n  }\n}\n\nexport namespace Session {\n  export const $Class = $Session;\n  export let Class = Reactive($Class);\n  export type Instance = typeof Class.Instance;\n\n  let singleton: Instance | null = null;\n  export function use(): Instance {\n    return (singleton ??= new Class());\n  }\n}\n",
          },
          expectFindings: [/constructed in a component's setup but uses `this\.\$watch`/, /no dispose path/, /outlives components .* but uses plain `watch`/],
        }],
        green: [{
          files: {
            ...box,
            'src/Box.vue': fixture.validSfc,
            'src/Session.ts': "import { ref } from 'vue';\nimport { Reactive } from 'ivue';\n\nclass $Session {\n  constructor() {\n    this.$watch(() => this.user.value, (user) => this.onUser(user));\n  }\n\n  get user() {\n    return ref<string | null>(null);\n  }\n\n  onUser(user: string | null) {\n    return user;\n  }\n\n  dispose() {\n    this.$stopEffects();\n  }\n}\n\nexport namespace Session {\n  export const $Class = $Session;\n  export let Class = Reactive($Class);\n  export type Instance = typeof Class.Instance;\n\n  let singleton: Instance | null = null;\n  export function use(): Instance {\n    return (singleton ??= new Class());\n  }\n}\n",
          },
        }],
      },
      'A reactive closure delegates to one method': {
        claim: 'If a computed or watch callback is written, then it is one arrow delegating to one method',
        impossibility: 'a file breaking A reactive closure delegates to one method passes the gate',
        red: [{
          files: { 'src/Box.ts': fixture.validClass.replace("import { ref, watch } from 'vue';", "import { computed, ref, watch } from 'vue';").replace('      (newHeight, oldHeight) => this.onResize(newHeight, oldHeight),', '      (newHeight) => {\n        if (newHeight > 10) this.grow();\n      },').replace('  grow() {', '  // computed: expensive\n  get doubled() {\n    return computed(this.grow);\n  }\n\n  grow() {') },
          expectFindings: [/watch callback carries logic/, /passes the method directly/],
        }],
        green: [{ files: box }],
      },
      'A store is used lazily and swapped at the Class slot': {
        claim: 'If shared state is published, then it constructs lazily behind use and is never drilled as a prop or constructor argument',
        impossibility: 'a file breaking A store is used lazily and swapped at the Class slot passes the gate',
        red: [{
          files: {
            'src/Box.ts': `${fixture.validClass}\nexport const store = new Box.Class({ width: 1 });\n`,
            'src/Box.vue': fixture.validSfc.replace('defineProps<{ width: number }>()', 'defineProps<{ width: number; app: Box.Instance }>()'),
          },
          expectFindings: [/constructs a singleton at module load/, /prop `app: Box\.Instance` drills a shared model/],
        }],
        green: [{
          files: {
            'src/Box.ts': fixture.validClass.replace('  export type Instance = typeof Class.Instance;\n}', '  export type Instance = typeof Class.Instance;\n\n  let singleton: Instance | null = null;\n  export function use(): Instance {\n    return (singleton ??= new Class({ width: 1 }));\n  }\n}'),
            'src/Box.vue': fixture.validSfc.replace('const box = new Box.Class(props);', 'const box = Box.use();'),
          },
        }],
      },
      'Keyed state creates on read and peeks on write': {
        claim: 'If a class holds a Map of refs, then reads get-or-create, writes peek, and a release path exists',
        impossibility: 'a file breaking Keyed state creates on read and peeks on write passes the gate',
        red: [{ files: { 'src/Sheet.ts': fixture.keyedClass('bumpCell(cellKey: number): void {\n    let versionRef = this.cellVersions.get(cellKey);\n    if (!versionRef) {\n      versionRef = ref(0);\n      this.cellVersions.set(cellKey, versionRef);\n    }\n    versionRef.value++;\n  }\n', '') }, expectFindings: [/no release path/, /write path `bumpCell` creates entries/] }],
        green: [{ files: { 'src/Sheet.ts': fixture.keyedClass('bumpCell(cellKey: number): void {\n    const versionRef = this.cellVersions.get(cellKey);\n    if (versionRef) versionRef.value++;\n  }\n', '\n  releaseCell(cellKey: number): void {\n    this.cellVersions.delete(cellKey);\n  }\n') } }],
      },
      'A generic reactive class casts its constructor': {
        claim: 'If a reactive class is generic, then Class is cast back to typeof dollar-Class and Instance applies ReactiveInstance by hand',
        impossibility: 'a file breaking A generic reactive class casts its constructor passes the gate',
        red: [{ files: { 'src/Scroller.ts': fixture.genericClass('export let Class = Reactive($Class);', 'export type Instance = typeof Class.Instance;') }, expectFindings: [/`Class` erases <T>/, /`Instance` must carry <T>/] }],
        green: [{ files: { 'src/Scroller.ts': fixture.genericClass('export let Class = Reactive($Class) as unknown as typeof $Class;', 'export type Instance<T> = ReactiveInstance<$Scroller<T>>;') } }],
      },
      'Cross-module Class reads happen inside bodies': {
        claim: "If a module reads another namespace's Class, then it does so inside a getter or method body, never at module evaluation",
        impossibility: 'a file breaking Cross-module Class reads happen inside bodies passes the gate',
        red: [{
          files: { ...box, 'src/Shelf.ts': "import { Reactive } from 'ivue';\nimport { Box } from './Box';\n\nconst BoxClass = Box.Class;\n\nclass $Shelf {\n  make() {\n    return new BoxClass({ width: 1 });\n  }\n}\n\nexport namespace Shelf {\n  export const $Class = $Shelf;\n  export let Class = Reactive($Class);\n  export type Instance = typeof Class.Instance;\n}\n" },
          expectFindings: [/`Box\.Class` is read at module evaluation/],
        }],
        green: [{
          // main.ts exports nothing — a composition root evaluates after its
          // whole import graph, so its module-evaluation Class read is safe
          files: { ...box, 'src/Shelf.ts': "import { Reactive } from 'ivue';\nimport { Box } from './Box';\n\nclass $Shelf extends Box.$Class {\n  make() {\n    return new Box.Class({ width: 1 });\n  }\n}\n\nexport namespace Shelf {\n  export const $Class = $Shelf;\n  export let Class = Reactive($Class);\n  export type Instance = typeof Class.Instance;\n}\n", 'src/main.ts': "import { Box } from './Box';\n\nconst rootBox = new Box.Class({ width: 1 });\nvoid rootBox.area;\n" },
        }],
      },
      'Declarations use full descriptive names': {
        claim: 'If a name is declared in source or tests, then it is a domain word, never a single letter or a banned abbreviation',
        impossibility: 'a file breaking Declarations use full descriptive names passes the gate',
        red: [{
          files: {
            'src/Box.ts': fixture.validClass.replace('  onResize(newHeight: number, oldHeight: number) {\n    return newHeight - oldHeight;\n  }', '  onResize(nv: number, e: number) {\n    const inst = nv - e;\n    return inst;\n  }'),
            'src/Box.test.ts': fixture.validTest.replace("test('height never decreases on its own', () => {", "test('height never decreases on its own', (_) => {"),
          },
          expectFindings: [/`nv`/, /`e`/, /`inst`/, /`_`/],
          expectCount: 4,
        }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace('  grow() {', '  offset(px: number, id: string) {\n    return `${id}:${px}`;\n  }\n\n  grow() {'), 'src/Box.test.ts': fixture.validTest } }],
      },
      'Class members are ordered and spaced': {
        claim: 'If a class is written, then statics precede the constructor, the constructor precedes getters, methods come last and are separated by blank lines',
        impossibility: 'a file breaking Class members are ordered and spaced passes the gate',
        red: [{
          files: { 'src/Box.ts': fixture.validClass.replace('class $Box {\n  constructor', 'class $Box {\n  get spare() {\n    return ref(0);\n  }\n\n  constructor').replace('  grow() {\n    this.height.value++;\n  }\n\n  onResize', '  static get LIMIT() {\n    return 9;\n  }\n\n  grow() {\n    this.height.value++;\n  }\n  onResize') },
          expectFindings: [/the constructor follows a getter or field/, /a static member follows a getter or field/, /`onResize` is not separated from the previous method/],
          expectCount: 3,
        }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace('class $Box {\n  constructor', 'class $Box {\n  static get LIMIT() {\n    return 9;\n  }\n\n  constructor') } }],
      },
      'A test file opens with its generator header': {
        claim: 'If a file is a test, then its first content is the generator header',
        impossibility: 'a file breaking A test file opens with its generator header passes the gate',
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
      'A generator header carries both registers in order': {
        claim: 'If a header exists, then it has one Goal, the formal register, at least one Impossible if true, and the described register after the formal one',
        impossibility: 'a file breaking A generator header carries both registers in order passes the gate',
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
      'A header symbol is declared in the sibling source': {
        claim: 'If a header names a symbol, then the named Subject or the same-named sibling source declares it',
        impossibility: 'a file breaking A header symbol is declared in the sibling source passes the gate',
        red: [
          { files: { ...box, 'src/Box.test.ts': fixture.validTest.replaceAll('$Box —', '$Crate —') }, expectFindings: [/`\$Crate` is not declared in Box\.ts/] },
          { files: { ...box, 'src/Box.test.ts': fixture.validTest.replace('Goal:', 'Subject: Missing.ts\nGoal:') }, expectFindings: [/Subject path does not exist: Missing\.ts/] },
        ],
        green: [
          { files: boxAndTest },
          { files: { ...box, 'specs/Growth.test.ts': fixture.validTest.replace('Goal:', 'Subject: src/Box.ts\nGoal:') }, options: { testGlobs: ['specs/**/*.test.ts'] } },
        ],
      },
      'A claim annotation sits directly above its test': {
        claim: 'If a proof annotation is written, then a test follows it directly, an optional doc comment between',
        impossibility: 'a file breaking A claim annotation sits directly above its test passes the gate',
        red: [{ files: { ...box, 'src/Box.test.ts': fixture.validTest.replace(`// ${grammar.DOMAIN}: $Box — If grow is called, then height increases by one\ntest('grow`, `// ${grammar.DOMAIN}: $Box — If grow is called, then height increases by one\nconst seed = 1;\ntest('grow`) }, expectFindings: [/must sit directly above a test/] }],
        green: [{ files: { ...box, 'src/Box.test.ts': fixture.validTest.replace(`// ${grammar.DOMAIN}: $Box — If grow is called, then height increases by one\ntest('grow`, `// ${grammar.DOMAIN}: $Box — If grow is called, then height increases by one\n/** The spec: one grow, one unit. */\ntest('grow`) } }],
      },
      'Header claims and annotated tests match one to one': {
        claim: 'If a header states a domain claim, then an annotated test proves it, and every annotated claim is in the header',
        impossibility: 'a file breaking Header claims and annotated tests match one to one passes the gate',
        red: [{ files: { ...box, 'src/Box.test.ts': fixture.validTest.replace(`// ${grammar.DOMAIN}: $Box — If grow is called, then height increases by one\ntest('grow`, `// ${grammar.DOMAIN}: $Box — If grow is called, then height doubles\ntest('grow`) }, expectFindings: [/has no annotated test/, /absent from the header/] }],
        green: [{ files: boxAndTest }],
      },
      'An impossibility is proved by an exact negative test': {
        claim: 'If a header states an impossibility, then a negative test carries its exact text and a header symbol',
        impossibility: 'a file breaking An impossibility is proved by an exact negative test passes the gate',
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
      'A contract pointer resolves and is proved': {
        claim: 'If a header links a contract record, then the anchor resolves and an annotated test proves it',
        impossibility: 'a file breaking A contract pointer resolves and is proved passes the gate',
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
      'A source tripwire resolves to its sibling header': {
        claim: 'If source carries a domain tripwire, then it names only a symbol the sibling header claims',
        impossibility: 'a file breaking A source tripwire resolves to its sibling header passes the gate',
        red: [{ files: { 'src/Box.ts': fixture.validClass.replace('  grow() {', `  // ${grammar.DOMAIN}: $Crate\n  grow() {`), 'src/Box.test.ts': fixture.validTest }, expectFindings: [/tripwire `\$Crate` has no header claim in Box\.test\.ts/] }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace('  grow() {', `  // ${grammar.DOMAIN}: $Box\n  grow() {`), 'src/Box.test.ts': fixture.validTest } }],
      },
      'A test caveat derives from a tested claim': {
        claim: 'If the described register constrains, then the constraint names a header symbol',
        impossibility: 'a file breaking A test caveat derives from a tested claim passes the gate',
        red: [{ files: { ...box, 'src/Box.test.ts': fixture.validTest.replace('so growth is the single write path the tests must hold.', 'so growth is the single write path the tests must hold. Width must never change after construction.') }, expectFindings: [/Width must never change/] }],
        green: [{ files: boxAndTest }],
      },
      'The population and skip-list are exact': {
        claim: 'If the gate runs, then it refuses zero files, unmatched globs, unknown check names, duplicate and stale skips, and unknown or conflicting severity overrides',
        impossibility: 'a file breaking The population and skip-list are exact passes the gate',
        red: [
          { files: { 'src/.keep': '' }, expectThrows: /no source files discovered/ },
          { files: box, options: { testGlobs: ['src/**/*.test.ts'] }, expectThrows: /test glob matches no file/ },
          { files: { ...box, 'skips.json': JSON.stringify([{ path: 'src/Box.ts', check: 'No such check', reason: 'reason' }]) }, options: { skipListPath: 'skips.json' }, expectThrows: /unknown check name/ },
          { files: { ...box, 'skips.json': JSON.stringify([{ path: 'src/Box.ts', check: 'A class file is named after its class', reason: 'first' }, { path: 'src/Box.ts', check: 'A class file is named after its class', reason: 'second' }]) }, options: { skipListPath: 'skips.json' }, expectThrows: /duplicate skip/ },
          { files: { ...box, 'skips.json': JSON.stringify([{ path: 'src/Box.ts', check: 'A class file is named after its class', reason: 'never fires here' }, { path: 'src/Gone.ts', check: 'A class file is named after its class', reason: 'file removed' }]) }, options: { skipListPath: 'skips.json' }, expectFindings: [/no longer fires on src\/Box\.ts/, /src\/Gone\.ts does not exist/] },
          { files: { ...box, 'skips.json': 'src/Box.ts\tA class file is named after its class\treason\n' }, options: { skipListPath: 'skips.json' }, expectThrows: /a JSON array of \{ path, check, reason \}/ },
          { files: { ...box, 'skips.json': JSON.stringify([{ path: 'src/Box.ts', check: 'A class file is named after its class' }]) }, options: { skipListPath: 'skips.json' }, expectThrows: /entry 1: .*reason/ },
          { files: box, options: { warnChecks: ['No such check'] }, expectThrows: /unknown check name/ },
          { files: box, options: { warnChecks: ['A class file is named after its class'], offChecks: ['A class file is named after its class'] }, expectThrows: /both warn and off/ },
        ],
        // Crate.ts deliberately declares $Box — the naming check fires and
        // the skip row suppresses it, proving a used skip is not stale.
        // Crate.ts deliberately declares $Box — the naming check fires and
        // the JSON row suppresses it, proving a used skip is not stale
        green: [
          { files: { 'src/Crate.ts': fixture.validClass, 'src/Crate.test.ts': fixture.validTest, 'skips.json': JSON.stringify([{ path: 'src/Crate.ts', check: 'A class file is named after its class', reason: 'legacy file name kept for the public import path' }], null, 2) }, options: { skipListPath: 'skips.json' } },
          // demoted to warn: the breach reports as a warning, blocks nothing
          { files: { 'src/Crate.ts': fixture.validClass, 'src/Crate.test.ts': fixture.validTest }, options: { warnChecks: ['A class file is named after its class'] }, expectWarnings: [/`Crate\.ts` declares `\$Box`/] },
          // off: the check does not run at all — no finding, no warning
          { files: { 'src/Crate.ts': fixture.validClass, 'src/Crate.test.ts': fixture.validTest }, options: { offChecks: ['A class file is named after its class'] } },
        ],
      },
      'Two test files do not share one generator header': {
        claim: 'If two test files exist, then their Goal and described registers differ beyond their own symbol names',
        impossibility: 'a file breaking Two test files do not share one generator header passes the gate',
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

  // -------------------------------------------------------------------------
  // behavior — methods (async welcome here; the getters above carry data)

  static defineCheck(name: string, run: (context: GateContext) => Finding[]): StandardCheck {
    return { name, enforced: true, run };
  }

  static finding(check: StandardCheck, unit: SourceUnit, line: number, message: string): Finding {
    return { check: check.name, file: unit.relativePath, line, message };
  }

  static componentFinding(check: StandardCheck, component: ComponentUnit, line: number, message: string): Finding {
    return { check: check.name, file: component.relativePath, line, message };
  }

  /** Minimal glob: `**` any depth, `*` within a segment, `?` one character. */
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

  static toUnit(cwd: string, path: string): SourceUnit {
    const text = readFileSync(path, 'utf8');
    return {
      path,
      relativePath: relative(cwd, path).replaceAll('\\', '/'),
      text,
      lines: text.split('\n'),
      ast: ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
    };
  }

  static lineOf(unit: SourceUnit, node: ts.Node): number {
    return unit.ast.getLineAndCharacterOfPosition(node.getStart(unit.ast)).line + 1;
  }

  static collectTemplateExpressions(nodes: TemplateChildNode[], into: TemplateExpression[]): void {
    for (const node of nodes) {
      if (node.type === NodeTypes.INTERPOLATION && node.content.type === NodeTypes.SIMPLE_EXPRESSION) {
        into.push({ code: node.content.content, line: node.loc.start.line, kind: 'interpolation' });
      } else if (node.type === NodeTypes.ELEMENT) {
        const element = node as ElementNode;
        for (const property of element.props) {
          if (property.type !== NodeTypes.DIRECTIVE || !property.exp || property.exp.type !== NodeTypes.SIMPLE_EXPRESSION) continue;
          if (this.TEMPLATE_IGNORED_DIRECTIVES.has(property.name)) continue;
          let code = property.exp.content;
          if (property.name === 'for') {
            const source = /\s+(?:in|of)\s+([\s\S]+)$/.exec(code);
            if (!source) continue;
            code = source[1];
          }
          into.push({ code, line: property.exp.loc.start.line, kind: property.name });
        }
        this.collectTemplateExpressions(element.children, into);
      } else if (node.type === NodeTypes.IF) {
        for (const branch of node.branches) {
          if (branch.condition && branch.condition.type === NodeTypes.SIMPLE_EXPRESSION) into.push({ code: branch.condition.content, line: branch.loc.start.line, kind: 'if' });
          this.collectTemplateExpressions(branch.children, into);
        }
      } else if (node.type === NodeTypes.FOR) {
        if (node.source.type === NodeTypes.SIMPLE_EXPRESSION) into.push({ code: node.source.content, line: node.loc.start.line, kind: 'for' });
        this.collectTemplateExpressions(node.children, into);
      }
    }
  }

  static toComponent(cwd: string, path: string): ComponentUnit {
    const text = readFileSync(path, 'utf8');
    const { descriptor } = parseSfc(text, { filename: path });
    const scriptBlock = descriptor.scriptSetup;
    const scriptLine = scriptBlock ? scriptBlock.loc.start.line : 0;
    const script: SourceUnit | null = scriptBlock
      ? {
          path,
          relativePath: relative(cwd, path).replaceAll('\\', '/'),
          text: scriptBlock.content,
          lines: scriptBlock.content.split('\n'),
          ast: ts.createSourceFile(path, scriptBlock.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
        }
      : null;
    const expressions: TemplateExpression[] = [];
    if (descriptor.template) {
      const templateAst = parseTemplate(descriptor.template.content, { comments: false });
      this.collectTemplateExpressions(templateAst.children, expressions);
      const offset = descriptor.template.loc.start.line - 1;
      for (const expression of expressions) expression.line += offset;
    }
    return { path, relativePath: relative(cwd, path).replaceAll('\\', '/'), text, script, scriptLine, expressions };
  }

  /** A template expression parsed as one TypeScript expression (null when it does not parse). */
  static parseExpression(code: string): ts.Expression | null {
    const file = ts.createSourceFile('expression.ts', `(${code});`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const statement = file.statements[0];
    if (!statement || !ts.isExpressionStatement(statement)) return null;
    let expression: ts.Expression = statement.expression;
    while (ts.isParenthesizedExpression(expression)) expression = expression.expression;
    return expression;
  }

  static componentLine(component: ComponentUnit, node: ts.Node): number {
    return component.script ? this.lineOf(component.script, node) + component.scriptLine - 1 : 1;
  }

  /** `const box = new Box.Class(…)` bindings in a component's script setup. */
  static modelConstructions(component: ComponentUnit): { variable: string; namespace: string; node: ts.Node }[] {
    const constructions: { variable: string; namespace: string; node: ts.Node }[] = [];
    if (!component.script) return constructions;
    for (const statement of component.script.ast.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        const initializer = declaration.initializer;
        if (initializer && ts.isNewExpression(initializer) && ts.isPropertyAccessExpression(initializer.expression) && initializer.expression.name.text === 'Class' && ts.isIdentifier(initializer.expression.expression) && ts.isIdentifier(declaration.name))
          constructions.push({ variable: declaration.name.text, namespace: initializer.expression.expression.text, node: declaration });
      }
    }
    return constructions;
  }

  /** Names declared by `defineProps<{ … }>()` / `withDefaults(defineProps<{ … }>(), …)`. */
  static propNames(component: ComponentUnit): Set<string> {
    const names = new Set<string>();
    if (!component.script) return names;
    this.forEachDescendant(component.script.ast, (node) => {
      if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'defineProps') return;
      const typeArgument = node.typeArguments?.[0];
      if (typeArgument && ts.isTypeLiteralNode(typeArgument)) {
        for (const member of typeArgument.members) if (member.name && ts.isIdentifier(member.name)) names.add(member.name.text);
      }
      const argument = node.arguments[0];
      if (argument && ts.isObjectLiteralExpression(argument)) {
        for (const property of argument.properties) if (property.name && ts.isIdentifier(property.name)) names.add(property.name.text);
      }
    });
    return names;
  }

  static classFileOf(unit: SourceUnit): ClassFile | null {
    const dollarClasses = unit.ast.statements.filter(
      (statement): statement is ts.ClassDeclaration =>
        ts.isClassDeclaration(statement) && !!statement.name && statement.name.text.startsWith('$'),
    );
    // The file's identity is the class matching the file name; a private
    // helper class declared first must not usurp it. First class as fallback.
    const stem = basename(unit.path).replace(/\.ts$/, '');
    const rawClass = dollarClasses.find((declaration) => declaration.name!.text === `$${stem}`) ?? dollarClasses[0];
    if (!rawClass?.name) return null;
    const rawName = rawClass.name.text;
    const publicName = rawName.slice(1);
    const namespace =
      unit.ast.statements.find(
        (statement): statement is ts.ModuleDeclaration =>
          ts.isModuleDeclaration(statement) &&
          ts.isIdentifier(statement.name) &&
          statement.name.text === publicName,
      ) ?? null;
    let anchorInitializer: ts.Expression | null = null;
    let classInitializer: ts.Expression | null = null;
    let hasInstanceType = false;
    if (namespace?.body && ts.isModuleBlock(namespace.body)) {
      for (const statement of namespace.body.statements) {
        if (ts.isVariableStatement(statement)) {
          for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name)) continue;
            if (declaration.name.text === '$Class') anchorInitializer = declaration.initializer ?? null;
            if (declaration.name.text === 'Class') classInitializer = declaration.initializer ?? null;
          }
        }
        if (ts.isTypeAliasDeclaration(statement) && statement.name.text === 'Instance') hasInstanceType = true;
      }
    }
    const calls = (expression: ts.Expression | null, callee: string) =>
      !!expression &&
      ts.isCallExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === callee;
    return {
      unit,
      rawClass,
      rawName,
      publicName,
      namespace,
      anchorInitializer,
      classInitializer,
      hasInstanceType,
      isReactive: calls(classInitializer, 'Reactive'),
      isStaticAnchored: calls(anchorInitializer, 'Static'),
    };
  }

  static classFileByNamespace(context: GateContext, namespace: string): ClassFile | null {
    for (const unit of context.sources) {
      const classFile = this.classFileOf(unit);
      if (classFile?.publicName === namespace) return classFile;
    }
    return null;
  }

  static isStaticMember(member: ts.ClassElement): boolean {
    return !!(ts.getCombinedModifierFlags(member as ts.Declaration) & ts.ModifierFlags.Static);
  }

  static isReadonlyMember(member: ts.ClassElement): boolean {
    return !!(ts.getCombinedModifierFlags(member as ts.Declaration) & ts.ModifierFlags.Readonly);
  }

  static memberName(member: ts.ClassElement): string {
    return member.name && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) ? member.name.text : '';
  }

  static isFunctionLike(node: ts.Node | undefined): boolean {
    return !!node && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));
  }

  /** True when an arrow does nothing but call one method on one binding —
   * `() => app.probe()` — the only body a script-setup lifecycle hook may have. */
  static thinModelDelegation(callback: ts.Expression | ts.Node): boolean {
    if (!ts.isArrowFunction(callback)) return false;
    let body: ts.Node | undefined = callback.body;
    if (ts.isBlock(body)) {
      if (body.statements.length !== 1) return false;
      const only = body.statements[0];
      body = ts.isReturnStatement(only) ? only.expression : ts.isExpressionStatement(only) ? only.expression : undefined;
    }
    if (!body) return false;
    if (ts.isAwaitExpression(body)) body = body.expression;
    return ts.isCallExpression(body) && ts.isPropertyAccessExpression(body.expression) && ts.isIdentifier(body.expression.expression);
  }

  /** The single expression a thin closure delegates to, or null when it does more. */
  static delegateCall(callback: ts.Expression): ts.CallExpression | null {
    if (!ts.isArrowFunction(callback)) return null;
    let body: ts.Node | undefined = callback.body;
    if (ts.isBlock(body)) {
      if (body.statements.length !== 1) return null;
      const only = body.statements[0];
      body = ts.isReturnStatement(only) ? only.expression : ts.isExpressionStatement(only) ? only.expression : undefined;
    }
    if (!body) return null;
    if (ts.isAwaitExpression(body)) body = body.expression;
    if (!ts.isCallExpression(body)) return null;
    const callee = body.expression;
    const isThisMethod =
      ts.isPropertyAccessExpression(callee) &&
      callee.expression.kind === ts.SyntaxKind.ThisKeyword;
    return isThisMethod ? body : null;
  }

  static refFactoryName(expression: ts.Expression | undefined): string | null {
    if (!expression || !ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) return null;
    const name = expression.expression.text;
    return ['ref', 'shallowRef', 'computed', 'toRef'].includes(name) ? name : null;
  }

  /** Getter names of a class whose body returns a Ref factory call. */
  static refGetterNames(rawClass: ts.ClassDeclaration): Set<string> {
    const names = new Set<string>();
    for (const member of rawClass.members) {
      if (!ts.isGetAccessorDeclaration(member) || !member.body) continue;
      const returned = member.body.statements.find(ts.isReturnStatement);
      if (returned && this.refFactoryName(returned.expression)) names.add(this.memberName(member));
    }
    return names;
  }

  static forEachDescendant(node: ts.Node, visit: (node: ts.Node) => void): void {
    visit(node);
    node.forEachChild((child) => this.forEachDescendant(child, visit));
  }

  static importedBindings(unit: SourceUnit): Set<string> {
    const names = new Set<string>();
    for (const statement of unit.ast.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
      if (statement.importClause.isTypeOnly) continue;
      const { name, namedBindings } = statement.importClause;
      if (name) names.add(name.text);
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        for (const element of namedBindings.elements) if (!element.isTypeOnly) names.add(element.name.text);
      }
      if (namedBindings && ts.isNamespaceImport(namedBindings)) names.add(namedBindings.name.text);
    }
    return names;
  }

  static qualifiedTail(typeNode: ts.TypeNode): { namespace: string; member: string } | null {
    if (!ts.isTypeReferenceNode(typeNode) || !ts.isQualifiedName(typeNode.typeName)) return null;
    const left = typeNode.typeName.left;
    return ts.isIdentifier(left) ? { namespace: left.text, member: typeNode.typeName.right.text } : null;
  }

  static isInsideFunctionBody(node: ts.Node): boolean {
    for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
      if (ts.isMethodDeclaration(current) || ts.isGetAccessorDeclaration(current) || ts.isSetAccessorDeclaration(current) || ts.isConstructorDeclaration(current) || ts.isArrowFunction(current) || ts.isFunctionExpression(current) || ts.isFunctionDeclaration(current)) return true;
    }
    return false;
  }

  static parseHeader(unit: SourceUnit): GeneratorHeader {
    const grammar = this.$grammar;
    const text = unit.text;
    const header: GeneratorHeader = {
      present: text.includes(grammar.GENERATOR),
      firstContent: false,
      goal: '',
      formal: '',
      described: '',
      orderedRegisters: false,
      bothRegisters: false,
      subjects: [],
      domainClaims: new Map(),
      domainSymbols: new Set(),
      impossibilities: new Map(),
      contractLinks: [],
      endLine: 0,
    };
    if (!header.present) return header;
    const sentinelIndex = text.indexOf(grammar.GENERATOR);
    const blockStart = text.lastIndexOf('/*', sentinelIndex);
    const blockEnd = text.indexOf('*/', sentinelIndex);
    if (blockStart < 0 || blockEnd < 0) return header;
    header.firstContent = text.slice(0, blockStart).trim() === '';
    const block = text.slice(blockStart, blockEnd + 2);
    header.endLine = text.slice(0, blockEnd + 2).split('\n').length;
    const describedIndex = block.indexOf(grammar.GENERATOR_DESCRIBED);
    const generatorIndex = block.indexOf(grammar.GENERATOR);
    header.bothRegisters = describedIndex >= 0;
    header.orderedRegisters = describedIndex > generatorIndex;
    header.formal = block.slice(generatorIndex + grammar.GENERATOR.length, describedIndex >= 0 ? describedIndex : undefined);
    header.described = describedIndex >= 0 ? block.slice(describedIndex + grammar.GENERATOR_DESCRIBED.length) : '';
    header.goal = /^\s*\*?\s*Goal:\s*(.+\S)\s*$/m.exec(header.formal)?.[1] ?? '';
    const formalStartLine = text.slice(0, blockStart + generatorIndex).split('\n').length;
    header.formal.split('\n').forEach((line, offset) => {
      const subject = /^\s*\*?\s*Subject:\s*(.+\S)\s*$/.exec(line);
      if (subject) {
        for (const path of subject[1].split(/[\s,]+/).filter(Boolean)) header.subjects.push({ path, line: formalStartLine + offset });
        return;
      }
      const domain = grammar.DOMAIN_LINE.exec(line);
      if (domain) {
        const symbol = domain[1].trim();
        const claim = domain[2].trim();
        header.domainClaims.set(`${symbol} — ${claim}`, { symbol, claim, line: formalStartLine + offset });
        header.domainSymbols.add(symbol);
      }
      const impossible = /^\s*\*?\s*Impossible if true:\s*(.+\S)\s*$/.exec(line);
      if (impossible) header.impossibilities.set(impossible[1].trim(), formalStartLine + offset);
      for (const link of line.matchAll(grammar.CONTRACT_LINK)) {
        header.contractLinks.push({
          text: link[1],
          file: link[2],
          anchor: (link[3] ?? '').slice(1),
          line: formalStartLine + offset,
        });
      }
    });
    return header;
  }

  static parseProofs(unit: SourceUnit, header: GeneratorHeader): ProofAnnotation[] {
    const grammar = this.$grammar;
    const proofs: ProofAnnotation[] = [];
    let pending: ProofAnnotation[] = [];
    let documentationOpen = false;
    for (let index = header.endLine; index < unit.lines.length; index++) {
      const line = unit.lines[index];
      if (documentationOpen) {
        if (line.includes('*/')) documentationOpen = false;
        continue;
      }
      const domain = grammar.DOMAIN_LINE.exec(line);
      if (domain && line.trimStart().startsWith('//')) {
        pending.push({ type: 'domain', symbol: domain[1].trim(), claim: domain[2].trim(), line: index + 1, bound: false });
        continue;
      }
      const impossible = grammar.IMPOSSIBLE_LINE.exec(line);
      if (impossible) {
        pending.push({ type: 'impossible', symbol: impossible[1].trim(), claim: impossible[2].trim(), line: index + 1, bound: false });
        continue;
      }
      const record = grammar.RECORD_LINE.exec(line);
      if (record && line.trimStart().startsWith('//')) {
        pending.push({ type: 'record', name: record[1].trim(), contractPath: record[2].trim(), line: index + 1, bound: false });
        continue;
      }
      if (pending.length && /^\s*\/\*\*/.test(line)) {
        documentationOpen = !line.includes('*/');
        continue;
      }
      if (pending.length && this.TEST_CALL.test(line)) {
        for (const proof of pending) proof.bound = true;
        proofs.push(...pending);
        pending = [];
        continue;
      }
      if (pending.length && line.trim() !== '') {
        proofs.push(...pending);
        pending = [];
      }
    }
    proofs.push(...pending);
    return proofs;
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

  static declaredInSource(sourceText: string, symbol: string): boolean {
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:class|function|interface|type|enum|namespace|const|let|var)\\s+${escaped}\\b`).test(
      sourceText,
    );
  }

  static siblingSourcePath(testPath: string): string {
    return testPath.replace(/\.test\.ts$/, '.ts');
  }

  /** The skip list is a JSON array of { path, check, reason } — named
   * fields, no invisible delimiters. Every entry must name a real check
   * and carry a reason; duplicates are refused. */
  /** The run's final severity per check: the receiver's `severities`
   * defaults, overridden by the run's --warn/--off. Unknown names and a
   * check assigned both warn and off are refused. */
  static resolveSeverities(options: GateOptions): Map<string, 'warn' | 'off'> {
    const known = this.checkNames;
    const resolved = new Map<string, 'warn' | 'off'>();
    for (const [name, severity] of Object.entries(this.severities)) {
      if (!known.has(name)) throw new CheckStandard.GateUsageError(`severities: unknown check name "${name}" — --list names every check`);
      resolved.set(name, severity);
    }
    for (const [flag, severity] of [['--warn', 'warn'], ['--off', 'off']] as const) {
      const names = flag === '--warn' ? options.warnChecks : options.offChecks;
      for (const name of names ?? []) {
        if (!known.has(name)) throw new CheckStandard.GateUsageError(`${flag}: unknown check name "${name}" — --list names every check`);
        resolved.set(name, severity);
      }
    }
    for (const name of options.warnChecks ?? []) {
      if ((options.offChecks ?? []).includes(name)) throw new CheckStandard.GateUsageError(`"${name}" is both warn and off — pick one severity`);
    }
    return resolved;
  }

  static readSkipList(cwd: string, path: string): SkipRow[] {
    const absolute = isAbsolute(path) ? path : resolve(cwd, path);
    if (!existsSync(absolute)) throw new CheckStandard.GateUsageError(`skip-list not found: ${path}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(absolute, 'utf8'));
    } catch (error) {
      throw new CheckStandard.GateUsageError(`skip-list ${path}: not valid JSON (${(error as Error).message}) — the skip list is a JSON array of { path, check, reason }`);
    }
    if (!Array.isArray(parsed)) throw new CheckStandard.GateUsageError(`skip-list ${path}: the skip list is a JSON array of { path, check, reason }`);
    const rows: SkipRow[] = [];
    const seen = new Set<string>();
    const knownNames = this.checkNames;
    parsed.forEach((entry, index) => {
      const label = `skip-list ${path} entry ${index + 1}`;
      if (typeof entry !== 'object' || entry === null) throw new CheckStandard.GateUsageError(`${label}: an entry is an object — { path, check, reason }`);
      const { path: rowPath, check: checkName, reason } = entry as Record<string, unknown>;
      for (const [field, value] of [['path', rowPath], ['check', checkName], ['reason', reason]] as const) {
        if (typeof value !== 'string' || !value.trim()) throw new CheckStandard.GateUsageError(`${label}: "${field}" is a non-empty string — { path, check, reason }`);
      }
      if (!knownNames.has(checkName as string)) throw new CheckStandard.GateUsageError(`${label}: unknown check name "${checkName}" — --list names every check`);
      const key = `${rowPath}\u0000${checkName}`;
      if (seen.has(key)) throw new CheckStandard.GateUsageError(`${label}: duplicate skip for ${rowPath} / ${checkName}`);
      seen.add(key);
      rows.push({ path: (rowPath as string).trim().replaceAll('\\', '/'), check: (checkName as string).trim(), reason: (reason as string).trim(), line: index + 1 });
    });
    return rows;
  }

  /** Discover, check, apply the skip-list. Throws GateUsageError on a refused population. */
  static run(options: GateOptions): GateResult {
    const cwd = resolve(options.cwd);
    if (!options.sourceRoots.length) throw new CheckStandard.GateUsageError('at least one --source-root is required');
    const testMatchers = options.testGlobs.map((glob) => ({ glob, regexp: this.globToRegExp(glob) }));
    const sources: SourceUnit[] = [];
    const tests: SourceUnit[] = [];
    const components: ComponentUnit[] = [];
    const isTest = (relativePath: string) => testMatchers.some((matcher) => matcher.regexp.test(relativePath));
    for (const root of options.sourceRoots) {
      const absoluteRoot = isAbsolute(root) ? root : resolve(cwd, root);
      if (!existsSync(absoluteRoot) || !statSync(absoluteRoot).isDirectory()) throw new CheckStandard.GateUsageError(`source root is not a directory: ${root}`);
      for (const path of this.walk(absoluteRoot)) {
        if (path.endsWith('.vue')) {
          components.push(this.toComponent(cwd, path));
          continue;
        }
        if (!path.endsWith('.ts') || path.endsWith('.d.ts')) continue;
        const relativePath = relative(cwd, path).replaceAll('\\', '/');
        if (isTest(relativePath) || /\.(?:test|spec)\.ts$/.test(path)) {
          if (isTest(relativePath)) tests.push(this.toUnit(cwd, path));
          continue;
        }
        sources.push(this.toUnit(cwd, path));
      }
    }
    for (const matcher of testMatchers) {
      const base = matcher.glob.split(/[*?[]/)[0].replace(/\/[^/]*$/, '') || '.';
      const absoluteBase = resolve(cwd, base);
      if (!existsSync(absoluteBase)) continue;
      for (const path of this.walk(absoluteBase)) {
        const relativePath = relative(cwd, path).replaceAll('\\', '/');
        if (matcher.regexp.test(relativePath) && !tests.some((unit) => unit.path === path)) tests.push(this.toUnit(cwd, path));
      }
    }
    if (!sources.length) throw new CheckStandard.GateUsageError(`no source files discovered under ${options.sourceRoots.join(', ')} — refusing to pass over nothing`);
    for (const matcher of testMatchers) {
      if (!tests.some((unit) => matcher.regexp.test(unit.relativePath))) throw new CheckStandard.GateUsageError(`test glob matches no file: ${matcher.glob}`);
    }
    const skips = options.skipListPath ? this.readSkipList(cwd, options.skipListPath) : [];
    const severities = this.resolveSeverities(options);

    const context: GateContext = {
      cwd,
      sourceRoots: options.sourceRoots.map((root) => (isAbsolute(root) ? root : resolve(cwd, root))),
      sources,
      tests,
      components,
      testGlobs: options.testGlobs,
      staticImplementation: options.staticImplementation ?? null,
    };
    const raw: Finding[] = [];
    for (const entry of this.checks) {
      if (!entry.enforced || severities.get(entry.name) === 'off') continue;
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
      unenforced: this.checks.filter((entry) => !entry.enforced).map((entry) => entry.name),
      off: this.checks.filter((entry) => severities.get(entry.name) === 'off').map((entry) => entry.name),
    };
  }

  /** Run the receiver's whole constitution: every check's red and green
   * arms through run(), refusing a manifest whose check lacks them.
   * `only` isolates one check by name — its arms and nothing else. */
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
      const proof = proofs[check.name];
      if (!proof) {
        problems.push(`${check.name}: no constitution entry — a manifest check carries its claim, impossibility, and both proof arms`);
        continue;
      }
      if (!/^If .+, then .+/.test(proof.claim)) problems.push(`${check.name}: the claim is not an if-then`);
      if (!proof.impossibility) problems.push(`${check.name}: no impossibility`);
      if (!proof.red.length) problems.push(`${check.name}: no red arm — a check that cannot fail proves nothing`);
      if (!proof.green.length) problems.push(`${check.name}: no green arm — silence on the conforming form is half the proof`);
      if (options?.completenessOnly) continue;
      for (const [kind, arms] of [['red', proof.red], ['green', proof.green]] as const) {
        for (const arm of arms) {
          const checkout = mkdtempSync(join(tmpdir(), 'ivue-gate-proof-'));
          try {
            writeFileSync(join(checkout, 'package.json'), JSON.stringify(arm.manifest ?? { name: 'consumer', dependencies: { ivue: '*' } }));
            for (const [path, text] of Object.entries(arm.files)) {
              mkdirSync(dirname(join(checkout, path)), { recursive: true });
              writeFileSync(join(checkout, path), text);
            }
            const hasTests = Object.keys(arm.files).some((path) => path.endsWith('.test.ts'));
            const gateOptions: GateOptions = {
              cwd: checkout,
              sourceRoots: ['src'],
              testGlobs: hasTests ? ['src/**/*.test.ts'] : [],
              staticImplementation: Static,
              ...arm.options,
            };
            if (arm.options && 'staticImplementation' in arm.options) gateOptions.staticImplementation = arm.options.staticImplementation ?? null;
            let findings: Finding[] = [];
            let warnings: Finding[] = [];
            let thrown: Error | null = null;
            try {
              const result = this.run(gateOptions);
              findings = result.findings.filter((item) => item.check === check.name);
              // warnings stay unfiltered: a severity arm demotes ANOTHER
              // check, so its warning carries that check's name
              warnings = result.warnings;
            } catch (error) {
              thrown = error as Error;
            }
            if (arm.expectThrows) {
              if (!thrown || !arm.expectThrows.test(thrown.message)) problems.push(`${check.name} ${kind} arm: expected a refusal matching ${arm.expectThrows} — got ${thrown ? thrown.message : `${findings.length} finding(s)`}`);
            } else if (thrown) {
              problems.push(`${check.name} ${kind} arm: the gate threw: ${thrown.message}`);
            } else {
              for (const expected of arm.expectWarnings ?? []) {
                const pattern = typeof expected === 'string' ? new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : expected;
                if (!warnings.some((item) => pattern.test(item.message))) problems.push(`${check.name} ${kind} arm: no warning matches ${pattern}`);
              }
              if (!arm.expectWarnings?.length && warnings.length) problems.push(`${check.name} ${kind} arm: unexpected warning(s): ${warnings[0].message}`);
              if (kind === 'red') {
                for (const expected of arm.expectFindings ?? []) {
                  const pattern = typeof expected === 'string' ? new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : expected;
                  if (!findings.some((item) => pattern.test(item.message))) problems.push(`${check.name} red arm: no finding matches ${pattern}`);
                }
                if (!arm.expectFindings?.length && !findings.length) problems.push(`${check.name} red arm: the planted defect produced no finding`);
                if (arm.expectCount !== undefined && findings.length !== arm.expectCount) problems.push(`${check.name} red arm: expected ${arm.expectCount} finding(s), got ${findings.length}`);
              } else if (findings.length) {
                problems.push(`${check.name} green arm: the conforming form produced ${findings.length} finding(s): ${findings[0].message}`);
              }
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
    const HELP = `ivue Standard gate — checks class sources and test files against skills/ivue/SKILL.md

usage:
  check-standard --source-root <dir> [--source-root <dir>…]
                 --test-glob '<glob>' [--test-glob '<glob>'…]
                 [--skip-list <path>]   a JSON array of { path, check, reason }
  check-standard --list                 print every check name and severity
  check-standard … --warn '<check name>' --off '<check name>'
                 demote a check to a warning / turn it off for this run
                 (repeatable; a house gate ships defaults in its severities getter)
  check-standard --prove ['<check name>']   run the gate's own constitution
                                        (name it to isolate one check's arms)

Exit: 0 clean · 1 findings · 2 usage (zero files, unmatched glob, unknown check
name, duplicate or stale skip row). Paths in findings are relative to the cwd.`;
    const sourceRoots: string[] = [];
    const testGlobs: string[] = [];
    const warnChecks: string[] = [];
    const offChecks: string[] = [];
    let skipListPath: string | undefined;
    for (let index = 0; index < argv.length; index++) {
      const argument = argv[index];
      const value = () => {
        const next = argv[++index];
        if (next === undefined) throw new CheckStandard.GateUsageError(`${argument} needs a value`);
        return next;
      };
      try {
        if (argument === '--help' || argument === '-h') {
          console.log(HELP);
          return 0;
        } else if (argument === '--list') {
          for (const entry of this.checks) {
            const severity = this.severities[entry.name];
            const label = !entry.enforced ? 'not yet' : (severity ?? 'error');
            console.log(`${label.padEnd(11)} ${entry.name}`);
          }
          return 0;
        } else if (argument === '--prove') {
          const next = argv[index + 1];
          const only = next !== undefined && !next.startsWith('--') ? argv[++index] : undefined;
          if (sourceRoots.length || testGlobs.length || skipListPath || index + 1 < argv.length)
            throw new CheckStandard.GateUsageError('--prove runs the constitution over its own fixture checkouts — it does not combine with --source-root, --test-glob, or --skip-list');
          const report = this.prove(only ? { only } : undefined);
          for (const problem of report.problems) console.error(problem);
          console.log(`check-standard --prove${only ? ` "${only}"` : ''}: ${report.ran.red} red arm(s), ${report.ran.green} green arm(s), ${report.problems.length} problem(s)`);
          return report.problems.length ? 1 : 0;
        } else if (argument === '--source-root') sourceRoots.push(value());
        else if (argument === '--test-glob') testGlobs.push(value());
        else if (argument === '--skip-list') skipListPath = value();
        else if (argument === '--warn') warnChecks.push(value());
        else if (argument === '--off') offChecks.push(value());
        else throw new CheckStandard.GateUsageError(`unknown argument: ${argument}`);
      } catch (error) {
        console.error(`check-standard: ${(error as Error).message}`);
        return 2;
      }
    }
    let result: GateResult;
    try {
      result = this.run({ cwd, sourceRoots, testGlobs, skipListPath, warnChecks, offChecks, staticImplementation: Static });
    } catch (error) {
      if (error instanceof CheckStandard.GateUsageError) {
        console.error(`check-standard: ${error.message}`);
        return 2;
      }
      throw error;
    }
    for (const item of result.findings) console.error(`${item.file}:${item.line}: [${item.check}] ${item.message}`);
    for (const item of result.warnings) console.error(`warn: ${item.file}:${item.line}: [${item.check}] ${item.message}`);
    console.log(
      `check-standard: ${result.sources.length} source file(s), ${result.tests.length} test file(s), ` +
        `${result.findings.length} finding(s), ${result.warnings.length} warning(s), ${result.suppressed.length} suppressed by skip-list`,
    );
    if (result.off.length) console.log(`off by config (${result.off.length}): ${result.off.join(' · ')}`);
    if (result.unenforced.length) console.log(`not enforced yet (${result.unenforced.length}): ${result.unenforced.join(' · ')}`);
    return result.findings.length ? 1 : 0;
  }
}

export namespace CheckStandard {
  export const $Class = Static($CheckStandard);
  export let Class = $Class;

  export class GateUsageError extends Error {}

  // Entry detection that survives every runner AND subclass gates. The
  // flags in argv say a gate CLI was invoked (`vite-node <gate>.ts -- …`
  // leaves them there; a test runner importing this module does not; the
  // runner strips the script path, so argv cannot say WHICH gate). Module
  // evaluation order says which: imports evaluate before the entry, so the
  // entry's bootstrap registers LAST — a house gate importing this file
  // supersedes this registration before the deferred main runs.
  let selectedCliGate: { main(argv: string[]): Promise<number> } | null = null;

  export function bootstrapCli(gate: { main(argv: string[]): Promise<number> }): void {
    const cliArguments = process.argv.slice(2);
    const invokedAsCli =
      !process.env.VITEST &&
      cliArguments.some((argument) => ['--source-root', '--test-glob', '--skip-list', '--list', '--prove', '--help', '-h'].includes(argument));
    if (!invokedAsCli) return;
    const isFirstRegistration = selectedCliGate === null;
    selectedCliGate = gate;
    if (isFirstRegistration) setImmediate(() => void selectedCliGate!.main(cliArguments).then((code) => process.exit(code)));
  }

  bootstrapCli(Class);
}
