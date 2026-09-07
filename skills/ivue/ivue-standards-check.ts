/**
 * The ivue Standard gate — an ivue Static() class.
 *
 * Checks a consumer's class sources and test files against the rules of
 * the ivue operating manual (skills/ivue/SKILL.md). Portable by
 * construction: the only inputs are source roots, test globs, and a
 * reasoned skip-list — no repository names, no paths of its own.
 *
 *   vite-node node_modules/ivue/skills/ivue/check-standard.ts -- \
 *     --source-root src --test-glob 'src/**\/*.test.ts' --skip-list ivue-standards-skip.json
 *
 * Every check has ONE identity: a snake_case declarative sentence
 * (a_class_file_is_named_after_its_class). The same string is the static
 * getter's name, the finding label, the skip-list "check" token, and the
 * severities key — search or replace one form and you have touched every
 * site; prove() refuses a check whose name is not its own getter.
 * The gate carries its own CONSTITUTION as data: `proofs` maps every
 * check to its claim, its impossibility, and permanent red and green
 * fixture arms, and `prove()` runs every arm through the same `run()`
 * the command line uses. All of it reads through `this`, so a subclass
 * that overrides or adds a check getter changes the manifest, the
 * skip-list vocabulary, and the constitution in one gesture:
 *
 *   class $HouseGate extends CheckStandard.$Class {
 *     static get house_rule(): CheckStandard.StandardCheck { … }
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
// the gate class — statics only; getters carry data, methods carry behavior

class $CheckStandard {
  static readonly EXCLUDED_DIRECTORIES = new Set(['node_modules', 'dist', '.git']);

  static readonly TEMPLATE_IGNORED_DIRECTIVES = new Set(['slot', 'pre', 'cloak', 'once', 'memo']);

  static readonly BANNED_NAMES = new Set([
    'inst', 'qty', 'agg', 'nv', 'ov', 'val', 'arr', 'obj', 'fn', 'cb', 'el', 'evt', 'tmp', 'idx', 'err',
    'num', 'str', 'ctx', 'res', 'msg', 'cnt', 'len', 'ret', 'prev', 'old', 'ci', 'ri',
  ]);

  static readonly DOMAIN_TERMS = new Set(['px', 'id', 'fx', 'x', 'y', 'z']);

  static readonly COMPUTED_JUSTIFICATIONS = ['expensive', 'render-suppression', 'stable-handle'];

  static readonly SETUP_STATE_CALLS = new Set(['ref', 'shallowRef', 'reactive', 'computed', 'watch', 'watchEffect']);

  static readonly LIFECYCLE_HOOKS = new Set(['onMounted', 'onUnmounted', 'onBeforeMount', 'onBeforeUnmount', 'onUpdated', 'onActivated', 'onDeactivated']);

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

  static get exactly_one_reactive_source_is_installed(): CheckStandard.StandardCheck {
    return this.defineCheck('exactly_one_reactive_source_is_installed', (context) => {
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

  static get a_public_class_publishes_its_namespace_manifest(): CheckStandard.StandardCheck {
    return this.defineCheck('a_public_class_publishes_its_namespace_manifest', (context) => {
      const findings: CheckStandard.Finding[] = [];
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

  static get a_class_file_is_named_after_its_class(): CheckStandard.StandardCheck {
    return this.defineCheck('a_class_file_is_named_after_its_class', (context) => {
      const findings: CheckStandard.Finding[] = [];
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

  static get a_class_file_holds_only_imports_class_namespace_and_types(): CheckStandard.StandardCheck {
    return this.defineCheck('a_class_file_holds_only_imports_class_namespace_and_types', (context) => {
      const findings: CheckStandard.Finding[] = [];
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
          // `interface $Box extends ReactiveHelpers {}` merges the engine's
          // helpers into the class's own instance type — it is the class's
          // second half, not a type outside the namespace
          if (ts.isInterfaceDeclaration(statement) && statement.name.text === classFile.rawName) continue;
          if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isEnumDeclaration(statement)) {
            findings.push(this.finding(this.a_class_file_holds_only_imports_class_namespace_and_types, unit, this.lineOf(unit, statement), `\`${statement.name.text}\` is a type outside the namespace — every type a class file declares is a member of \`namespace ${classFile.publicName}\` (export type / interface), read as \`${classFile.publicName}.${statement.name.text}\``));
            continue;
          }
          if (ts.isExportDeclaration(statement) && statement.isTypeOnly) continue;
          findings.push(this.finding(this.a_class_file_holds_only_imports_class_namespace_and_types, unit, this.lineOf(unit, statement), 'behavior or data outside the class seam — move it into the class (static get / method) or its namespace'));
        }
      }
      return findings;
    });
  }

  static get the_namespace_holds_identity_and_types_only(): CheckStandard.StandardCheck {
    return this.defineCheck('the_namespace_holds_identity_and_types_only', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile?.namespace?.body || !ts.isModuleBlock(classFile.namespace.body)) continue;
        for (const statement of classFile.namespace.body.statements) {
          if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isEnumDeclaration(statement)) continue;
          if (ts.isExportDeclaration(statement) && statement.isTypeOnly) continue;
          if (ts.isVariableStatement(statement)) {
            const names = statement.declarationList.declarations.map((declaration) => (ts.isIdentifier(declaration.name) ? declaration.name.text : '?'));
            const identity = names.every((name) => name === '$Class' || name === 'Class');
            if (identity) continue;
            findings.push(this.finding(this.the_namespace_holds_identity_and_types_only, unit, this.lineOf(unit, statement), `\`${names.join(', ')}\` is runtime data in namespace ${classFile.publicName} — a parallel world the class mechanics cannot reach (not inherited, not overridable, not swapped with Class); move it onto the class as a static getter`));
            continue;
          }
          if (ts.isFunctionDeclaration(statement)) {
            findings.push(this.finding(this.the_namespace_holds_identity_and_types_only, unit, this.lineOf(unit, statement), `\`${statement.name?.text ?? 'function'}\` is behavior in namespace ${classFile.publicName} — move it onto the class as a static method`));
            continue;
          }
          findings.push(this.finding(this.the_namespace_holds_identity_and_types_only, unit, this.lineOf(unit, statement), `namespace ${classFile.publicName} holds a runtime statement — the namespace is \`$Class\`, \`Class\` and types only`));
        }
      }
      return findings;
    });
  }

  static get behavior_lives_on_the_prototype_not_in_fields(): CheckStandard.StandardCheck {
    return this.defineCheck('behavior_lives_on_the_prototype_not_in_fields', (context) => {
      const findings: CheckStandard.Finding[] = [];
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

  static get construction_goes_through_the_namespace_class_slot(): CheckStandard.StandardCheck {
    return this.defineCheck('construction_goes_through_the_namespace_class_slot', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const unit of context.sources) {
        this.forEachDescendant(unit.ast, (node) => {
          if (ts.isNewExpression(node)) {
            const callee = node.expression;
            if (ts.isIdentifier(callee) && callee.text.startsWith('$'))
              findings.push(this.finding(this.construction_goes_through_the_namespace_class_slot, unit, this.lineOf(unit, node), `\`new ${callee.text}()\` constructs the raw class — construct \`${callee.text.slice(1)}.Class\``));
            if (ts.isPropertyAccessExpression(callee) && callee.name.text === '$Class')
              findings.push(this.finding(this.construction_goes_through_the_namespace_class_slot, unit, this.lineOf(unit, node), `\`new ${callee.getText(unit.ast)}()\` constructs the anchor — construct \`.Class\``));
          }
          // `reactive(new X.Class())` bare is the proxy-on-the-standard-path
          // mistake; `reactive(new X.Class() as X.Instance)` is the sanctioned
          // interop form (a store's optional reactive() view) — the cast is
          // what makes the unwrapped writes typecheck, so its presence is
          // the signal that the author chose the concession knowingly.
          if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'reactive' && node.arguments[0] && ts.isNewExpression(node.arguments[0]))
            findings.push(this.finding(this.construction_goes_through_the_namespace_class_slot, unit, this.lineOf(unit, node), '`reactive(new …)` wraps an instance without the Instance cast — instances are raw; a reactive() view is `reactive(new X.Class() as X.Instance)`'));
        });
      }
      return findings;
    });
  }

  static get the_anchor_is_static_only_when_statics_exist(): CheckStandard.StandardCheck {
    return this.defineCheck('the_anchor_is_static_only_when_statics_exist', (context) => {
      const findings: CheckStandard.Finding[] = [];
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

  static get static_binds_methods_and_caches_dollar_getters_per_receiver(): CheckStandard.StandardCheck {
    return this.defineCheck('static_binds_methods_and_caches_dollar_getters_per_receiver', (context) => {
      const unit: CheckStandard.SourceUnit | undefined = context.sources[0];
      const probe = (message: string): CheckStandard.Finding => ({ check: 'static_binds_methods_and_caches_dollar_getters_per_receiver', file: 'ivue/extras', line: 0, message: `${message} (probed from ${unit?.relativePath ?? 'the gate'})` });
      const StaticUnderTest = context.staticImplementation;
      if (!StaticUnderTest) return [probe('`Static` could not be loaded from ivue/extras — the runtime probe did not run')];
      const findings: CheckStandard.Finding[] = [];
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

  static get a_shared_store_is_a_static_readonly_field(): CheckStandard.StandardCheck {
    return this.defineCheck('a_shared_store_is_a_static_readonly_field', (context) => {
      const findings: CheckStandard.Finding[] = [];
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

  static get a_derived_static_getter_is_lower_camel_case(): CheckStandard.StandardCheck {
    return this.defineCheck('a_derived_static_getter_is_lower_camel_case', (context) => {
      const findings: CheckStandard.Finding[] = [];
      const isLiteral = (expression: ts.Expression): boolean => {
        if (ts.isNumericLiteral(expression) || ts.isStringLiteralLike(expression) || ts.isRegularExpressionLiteral(expression) || expression.kind === ts.SyntaxKind.TrueKeyword || expression.kind === ts.SyntaxKind.FalseKeyword) return true;
        if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.MinusToken) return isLiteral(expression.operand);
        if (ts.isBinaryExpression(expression)) return isLiteral(expression.left) && isLiteral(expression.right);
        if (ts.isParenthesizedExpression(expression)) return isLiteral(expression.expression);
        if (ts.isArrayLiteralExpression(expression)) return expression.elements.every((element) => ts.isExpression(element) && isLiteral(element));
        if (ts.isObjectLiteralExpression(expression)) return expression.properties.every((property) => ts.isPropertyAssignment(property) && isLiteral(property.initializer));
        if (ts.isAsExpression(expression)) return isLiteral(expression.expression);
        // A reference to another SCREAMING constant — `this.X`, `Other.Class.X` — is
        // a constant too: a knobs tree composed of parts' constants stays a constant.
        if (ts.isPropertyAccessExpression(expression)) return /^[A-Z][A-Z0-9_]*$/.test(expression.name.text) && expression.name.text.includes('_');
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
          findings.push(this.finding(this.a_derived_static_getter_is_lower_camel_case, unit, this.lineOf(unit, member), `static get ${name}() derives its value — a derived getter is lowerCamel (\`${camel}\`); SCREAMING_SNAKE is for tunable constants: literals, or other SCREAMING constants composed`));
        }
      }
      return findings;
    });
  }

  static get static_reads_go_through_self_not_the_base_class(): CheckStandard.StandardCheck {
    return this.defineCheck('static_reads_go_through_self_not_the_base_class', (context) => {
      const findings: CheckStandard.Finding[] = [];
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

  static get mutable_state_is_a_ref_returning_getter(): CheckStandard.StandardCheck {
    return this.defineCheck('mutable_state_is_a_ref_returning_getter', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        // A plain namespace class (no Reactive) holds plain state — there
        // is no reactivity for a field write to trigger.
        if (!classFile?.isReactive) continue;
        for (const member of classFile.rawClass.members) {
          if (!ts.isPropertyDeclaration(member) || this.isStaticMember(member) || this.isReadonlyMember(member) || this.isDeclaredMember(member)) continue;
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

  static get a_ref_is_read_and_written_through_value(): CheckStandard.StandardCheck {
    return this.defineCheck('a_ref_is_read_and_written_through_value', (context) => {
      const findings: CheckStandard.Finding[] = [];
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

  static get a_derivation_is_a_plain_getter_unless_computed_is_justified(): CheckStandard.StandardCheck {
    return this.defineCheck('a_derivation_is_a_plain_getter_unless_computed_is_justified', (context) => {
      const findings: CheckStandard.Finding[] = [];
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

  static get a_composable_is_injected_by_a_one_call_dollar_getter(): CheckStandard.StandardCheck {
    return this.defineCheck('a_composable_is_injected_by_a_one_call_dollar_getter', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        for (const member of classFile.rawClass.members) {
          if (ts.isPropertyDeclaration(member) && member.initializer && ts.isCallExpression(member.initializer) && ts.isIdentifier(member.initializer.expression) && /^use[A-Z]/.test(member.initializer.expression.text))
            findings.push(this.finding(this.a_composable_is_injected_by_a_one_call_dollar_getter, unit, this.lineOf(unit, member), `\`${this.memberName(member)} = ${member.initializer.expression.text}()\` runs at construction — inject it as \`protected get $${this.memberName(member)}() { return ${member.initializer.expression.text}() }\``));
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

  static get instance_types_only_unwrapping_surfaces(): CheckStandard.StandardCheck {
    return this.defineCheck('instance_types_only_unwrapping_surfaces', (context) => {
      const findings: CheckStandard.Finding[] = [];
      const RAW_CONTAINERS = new Set(['Array', 'ReadonlyArray', 'Map', 'Set', 'WeakMap', 'ref', 'shallowRef', 'Ref', 'ShallowRef']);
      const inspect = (unit: CheckStandard.SourceUnit, report: (line: number, message: string) => void) => {
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

  static get a_component_has_one_model_owner(): CheckStandard.StandardCheck {
    return this.defineCheck('a_component_has_one_model_owner', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const component of context.components) {
        if (!component.script) continue;
        const constructions = this.modelConstructions(component);
        for (const extra of constructions.slice(1)) findings.push(this.componentFinding(this.a_component_has_one_model_owner, component, this.componentLine(component, extra.node), `a second model is constructed (\`${extra.variable}\`) — one template, one logic owner`));
      }
      return findings;
    });
  }

  static get script_setup_is_wiring_only(): CheckStandard.StandardCheck {
    return this.defineCheck('script_setup_is_wiring_only', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const component of context.components) {
        if (!component.script) continue;
        for (const statement of component.script.ast.statements) {
          if (ts.isFunctionDeclaration(statement))
            findings.push(this.componentFinding(this.script_setup_is_wiring_only, component, this.componentLine(component, statement), `free function \`${statement.name?.text ?? ''}\` beside the model — behavior belongs on the class as a method`));
          this.forEachDescendant(statement, (node) => {
            if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || !this.SETUP_STATE_CALLS.has(node.expression.text)) return;
            if (this.isInsideClassBody(node)) return;
            findings.push(this.componentFinding(this.script_setup_is_wiring_only, component, this.componentLine(component, node), `\`${node.expression.text}()\` in \`<script setup>\` — component-local reactive behavior beside the class; state, derivations and watchers live in the class`));
          });
        }
      }
      return findings;
    });
  }

  static get a_lifecycle_hook_delegates_to_one_method(): CheckStandard.StandardCheck {
    return this.defineCheck('a_lifecycle_hook_delegates_to_one_method', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const component of context.components) {
        if (!component.script) continue;
        this.forEachDescendant(component.script.ast, (node) => {
          if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || !this.LIFECYCLE_HOOKS.has(node.expression.text)) return;
          if (this.isInsideClassBody(node)) return;
          // A hook that delegates ONE call to the model is the wiring an
          // outliving store needs (its constructor may run outside any
          // component) — thin bridge allowed, logic is not.
          if (node.arguments.length === 1 && this.thinModelDelegation(node.arguments[0])) return;
          findings.push(this.componentFinding(this.a_lifecycle_hook_delegates_to_one_method, component, this.componentLine(component, node), `\`${node.expression.text}()\` in \`<script setup>\` carries logic — a hook may only delegate one call to the model (\`${node.expression.text}(() => model.method())\`); logic lives in a method`));
        });
      }
      return findings;
    });
  }

  static get the_state_destructure_is_total(): CheckStandard.StandardCheck {
    return this.defineCheck('the_state_destructure_is_total', (context) => {
      const findings: CheckStandard.Finding[] = [];
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

  static get template_expressions_carry_no_logic(): CheckStandard.StandardCheck {
    return this.defineCheck('template_expressions_carry_no_logic', (context) => {
      const findings: CheckStandard.Finding[] = [];
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

  static get watch_lifetime_matches_the_instance_owner(): CheckStandard.StandardCheck {
    return this.defineCheck('watch_lifetime_matches_the_instance_owner', (context) => {
      const findings: CheckStandard.Finding[] = [];
      const componentScoped = new Set<string>();
      for (const component of context.components) for (const construction of this.modelConstructions(component)) componentScoped.add(construction.namespace);
      // A class constructed INSIDE a component-scoped class (its constructor
      // or a `$`-getter touched there) shares that component's lifetime —
      // the host is the seam; close over hosts to a fixpoint.
      const constructedInside = new Map<string, Set<string>>();
      const constructedElsewhere = new Set<string>();
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        this.forEachDescendant(unit.ast, (node) => {
          if (!ts.isNewExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'Class' || !ts.isIdentifier(node.expression.expression)) return;
          const constructed = node.expression.expression.text;
          let ancestor: ts.Node | undefined = node.parent;
          while (ancestor && ancestor !== classFile?.rawClass) ancestor = ancestor.parent;
          if (classFile && ancestor === classFile.rawClass) {
            if (!constructedInside.has(classFile.publicName)) constructedInside.set(classFile.publicName, new Set());
            constructedInside.get(classFile.publicName)!.add(constructed);
          } else constructedElsewhere.add(constructed);
        });
        if (classFile?.namespace?.body && ts.isModuleBlock(classFile.namespace.body) && classFile.namespace.body.statements.some((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === 'use')) constructedElsewhere.add(classFile.publicName);
        if (classFile && classFile.rawClass.members.some((member) => ts.isMethodDeclaration(member) && this.isStaticMember(member) && this.memberName(member) === 'use')) constructedElsewhere.add(classFile.publicName);
      }
      let grew = true;
      while (grew) {
        grew = false;
        for (const [host, constructed] of constructedInside) {
          if (!componentScoped.has(host)) continue;
          for (const name of constructed) if (!componentScoped.has(name)) { componentScoped.add(name); grew = true; }
        }
      }
      const outliving = new Set<string>(constructedElsewhere);
      for (const [host, constructed] of constructedInside) if (!componentScoped.has(host)) for (const name of constructed) outliving.add(name);
      for (const unit of context.sources) {
        const classFile = this.classFileOf(unit);
        if (!classFile) continue;
        const name = classFile.publicName;
        let usesDollarWatch = false;
        let usesPlainWatch = false;
        let hasDisposePath = false;
        let hasScopeBridge = false;
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
            if (callee.text === 'onScopeDispose') {
              hasDisposePath = true;
              hasScopeBridge = true;
            }
          }
        });
        const isComponentScoped = componentScoped.has(name) && !outliving.has(name);
        const isOutliving = outliving.has(name);
        // the guide's bridge — `getCurrentScope() && onScopeDispose(() =>
        // this.dispose())` — is the sanctioned way for an outliving-shaped
        // class to be constructed inside a component as well
        if (isComponentScoped && usesDollarWatch && !hasScopeBridge) findings.push(this.finding(this.watch_lifetime_matches_the_instance_owner, unit, dollarLine, `${classFile.rawName} is constructed in a component's setup but uses \`this.$watch\` — its scope would outlive unmount; use plain \`watch\` (the component scope reaps it)`));
        if (isOutliving && usesPlainWatch) findings.push(this.finding(this.watch_lifetime_matches_the_instance_owner, unit, plainLine, `${classFile.rawName} outlives components (constructed outside setup) but uses plain \`watch\` — there is no component scope to reap it; use \`this.$watch\``));
        if (usesDollarWatch && !hasDisposePath) findings.push(this.finding(this.watch_lifetime_matches_the_instance_owner, unit, dollarLine, `${classFile.rawName} registers \`$watch\` effects but has no dispose path — call \`$stopEffects()\` from an owner method, or auto-wire \`onScopeDispose\``));
      }
      return findings;
    });
  }

  static get a_reactive_closure_delegates_to_one_method(): CheckStandard.StandardCheck {
    return this.defineCheck('a_reactive_closure_delegates_to_one_method', (context) => {
      const findings: CheckStandard.Finding[] = [];
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

  static get a_store_is_used_lazily_and_swapped_at_the_class_slot(): CheckStandard.StandardCheck {
    return this.defineCheck('a_store_is_used_lazily_and_swapped_at_the_class_slot', (context) => {
      const findings: CheckStandard.Finding[] = [];
      for (const unit of context.sources) {
        this.forEachDescendant(unit.ast, (node) => {
          if (ts.isNewExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'Class' && !this.isInsideFunctionBody(node))
            findings.push(this.finding(this.a_store_is_used_lazily_and_swapped_at_the_class_slot, unit, this.lineOf(unit, node), `\`${node.getText(unit.ast)}\` constructs a singleton at module load — publish it behind \`use()\` (\`singleton ??= new Class()\`) so it constructs on first touch and tests can swap the \`Class\` slot first`));
          if (ts.isParameter(node) && node.type && ts.isConstructorDeclaration(node.parent)) {
            const tail = this.qualifiedTail(node.type);
            if (tail && (tail.member === 'Instance' || tail.member === 'Model') && ts.isIdentifier(node.name) && /^(app|store|session|root|shell)$/i.test(node.name.text))
              findings.push(this.finding(this.a_store_is_used_lazily_and_swapped_at_the_class_slot, unit, this.lineOf(unit, node), `constructor takes the shared model \`${node.name.text}: ${tail.namespace}.${tail.member}\` — reach for it with \`protected get $${node.name.text}() { return ${tail.namespace}.use() }\``));
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

  static get keyed_state_creates_on_read_and_peeks_on_write(): CheckStandard.StandardCheck {
    return this.defineCheck('keyed_state_creates_on_read_and_peeks_on_write', (context) => {
      const findings: CheckStandard.Finding[] = [];
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

  static get a_generic_reactive_class_casts_its_constructor(): CheckStandard.StandardCheck {
    return this.defineCheck('a_generic_reactive_class_casts_its_constructor', (context) => {
      const findings: CheckStandard.Finding[] = [];
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

  static get cross_module_class_reads_happen_inside_bodies(): CheckStandard.StandardCheck {
    return this.defineCheck('cross_module_class_reads_happen_inside_bodies', (context) => {
      const findings: CheckStandard.Finding[] = [];
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
          if (node.name.text === '$Class') {
            // `extends X.$Class` — also through a cast, `extends (X.$Class as typeof X.$Class)<T>`,
            // which a generic subclass needs to keep its type parameter
            let heritage: ts.Node = node.parent;
            while (heritage && (ts.isAsExpression(heritage) || ts.isParenthesizedExpression(heritage))) heritage = heritage.parent;
            if (heritage && ts.isExpressionWithTypeArguments(heritage)) return;
          }
          if (this.isInsideFunctionBody(node)) return;
          findings.push(this.finding(this.cross_module_class_reads_happen_inside_bodies, unit, this.lineOf(unit, node), `\`${node.getText(unit.ast)}\` is read at module evaluation — read it inside a getter or method body (any load order then resolves)`));
        });
      }
      return findings;
    });
  }

  static get declarations_use_full_descriptive_names(): CheckStandard.StandardCheck {
    return this.defineCheck('declarations_use_full_descriptive_names', (context) => {
      const findings: CheckStandard.Finding[] = [];
      const inspect = (unit: CheckStandard.SourceUnit) => {
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
      // a `v-for` alias is a declaration the template makes — same rule
      for (const component of context.components) {
        for (const alias of component.forAliases) {
          for (const name of alias.names) {
            const bare = name.replace(/^[$_]+/, '');
            if (name === '_' || (bare.length === 1 && !this.DOMAIN_TERMS.has(bare)) || this.BANNED_NAMES.has(bare.toLowerCase()))
              findings.push(this.componentFinding(this.declarations_use_full_descriptive_names, component, alias.line, `\`${name}\` as a \`v-for\` alias — unfold to the domain word (row, cell, column, index…); single letters and abbreviations are not names`));
          }
        }
      }
      return findings;
    });
  }

  static get class_members_are_ordered_and_spaced(): CheckStandard.StandardCheck {
    return this.defineCheck('class_members_are_ordered_and_spaced', (context) => {
      const findings: CheckStandard.Finding[] = [];
      const rank = (member: ts.ClassElement): number => {
        if (this.isStaticMember(member)) return 0;
        if (ts.isConstructorDeclaration(member)) return 1;
        // a `declare` member is a type statement (the engine installs the
        // value at Reactive()); it reads first, with the statics
        if (ts.isPropertyDeclaration(member) && this.isDeclaredMember(member)) return 0;
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










  static get the_population_and_skip_list_are_exact(): CheckStandard.StandardCheck {
    // enforced by run() itself; its findings and refusals carry this name
    return this.defineCheck('the_population_and_skip_list_are_exact', () => []);
  }


  /** The manifest, in the Standard's order — reads through `this`, so a
   * subclass's overridden or added check getters flow into it. */
  static get checks(): readonly CheckStandard.StandardCheck[] {
    return [
      this.exactly_one_reactive_source_is_installed,
      this.a_public_class_publishes_its_namespace_manifest,
      this.a_class_file_is_named_after_its_class,
      this.a_class_file_holds_only_imports_class_namespace_and_types,
      this.the_namespace_holds_identity_and_types_only,
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
      this.script_setup_is_wiring_only,
      this.a_lifecycle_hook_delegates_to_one_method,
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
      this.the_population_and_skip_list_are_exact,
    ];
  }

  /** The skip-list vocabulary — per receiver, so house checks are skippable too. */
  static get checkNames(): ReadonlySet<string> {
    return new Set(this.checks.map((entry) => entry.name));
  }

  /** Default severity rulings — a house gate ships its team's here
   * ({ check_name: 'error' | 'warn' | 'off' }). 'error' is the default for
   * every check, so listing a check at 'error' is an explicit no-op — a
   * menu entry waiting to be flipped. The programmatic warnChecks /
   * offChecks options override per run. */
  static get severities(): Readonly<Record<string, 'error' | 'warn' | 'off'>> {
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
  protected readonly cellVersions = new Map<number, Ref<number>>();

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
      'exactly_one_reactive_source_is_installed': {
        claim: 'If the gate runs over a checkout, then it finds exactly one engine, an ivue dependency or one vendored Reactive, never zero and never two',
        impossibility: 'a file breaking exactly_one_reactive_source_is_installed passes the gate',
        red: [{ files: { ...box, 'src/Reactive.ts': 'export function Reactive<C>(targetClass: C): C { return targetClass; }\n' }, expectFindings: [/2 Reactive sources/] }],
        green: [
          { files: box },
          { files: { ...box, 'src/ivue.ts': "export { Reactive } from '../engine/Reactive';\n" }, manifest: { name: 'consumer' } },
        ],
      },
      'a_public_class_publishes_its_namespace_manifest': {
        claim: 'If a file declares a dollar-prefixed class, then it exports a namespace with dollar-Class, Class, and Instance for reactive classes, and no behavior is exported directly',
        impossibility: 'a file breaking a_public_class_publishes_its_namespace_manifest passes the gate',
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
      'a_class_file_is_named_after_its_class': {
        claim: 'If a file declares dollar-X, then the file is X.ts and the namespace is X',
        impossibility: 'a file breaking a_class_file_is_named_after_its_class passes the gate',
        red: [{ files: { 'src/Crate.ts': fixture.validClass }, expectFindings: [/`Crate\.ts` declares `\$Box`/] }],
        // Widget.ts declares a private helper class FIRST — the file's
        // identity is the class matching the file name, not the first class.
        green: [{ files: { ...box, 'src/Widget.ts': "class $WidgetPart {\n  spin() {\n    return 1;\n  }\n}\n\nclass $Widget {\n  get part() {\n    return new $WidgetPart();\n  }\n}\n\nexport namespace Widget {\n  export const $Class = $Widget;\n  export let Class = $Class;\n}\n" } }],
      },
      'a_class_file_holds_only_imports_class_namespace_and_types': {
        claim: 'If a file is a class file, then its top level is imports, the class, and its namespace, nothing else — every type it declares is a namespace member',
        impossibility: 'a file breaking a_class_file_holds_only_imports_class_namespace_and_types passes the gate',
        red: [{ files: { 'src/Box.ts': `${fixture.validClass}\nconst DEFAULT_WIDTH = 4;\nexport function widen(box: Box.Instance) { return box.area; }\nexport type BoxSeed = { width: number };\n` }, expectFindings: [/outside the class seam/, /`BoxSeed` is a type outside the namespace/], expectCount: 3 }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace('  export type Instance = typeof Class.Instance;\n', '  export type Instance = typeof Class.Instance;\n  export type Seed = { width: number };\n  export interface Emits {\n    (event: \'grown\'): void;\n  }\n') } }, { files: { 'src/Box.ts': fixture.validClass.replace("import { Reactive } from 'ivue';", "import { Reactive, type ReactiveHelpers } from 'ivue';").replace('    watch(\n      () => this.height.value,', '    getCurrentScope() && onScopeDispose(() => this.$stopEffects());\n    this.$watch(\n      () => this.height.value,').replace("import { ref, watch } from 'vue';", "import { getCurrentScope, onScopeDispose, ref, watch } from 'vue';").replace('\nexport namespace Box {', '\ninterface $Box extends ReactiveHelpers {}\n\nexport namespace Box {') } }],
      },
      'the_namespace_holds_identity_and_types_only': {
        claim: 'If a class file has a namespace, then the namespace holds $Class, Class, and type declarations, never runtime data or behavior (which live on the class as statics)',
        impossibility: 'a file breaking the_namespace_holds_identity_and_types_only passes the gate',
        red: [{ files: { 'src/Box.ts': fixture.validClass.replace('  export type Instance = typeof Class.Instance;\n', '  export type Instance = typeof Class.Instance;\n  export const DEFAULT_WIDTH = 4;\n  const SEEDS = [1, 2];\n  export function widen(box: Box.Instance) {\n    return box.area + SEEDS.length;\n  }\n') }, expectFindings: [/`DEFAULT_WIDTH` is runtime data in namespace Box/, /`SEEDS` is runtime data/, /`widen` is behavior in namespace Box/], expectCount: 3 }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace('  export type Instance = typeof Class.Instance;\n', '  export type Instance = typeof Class.Instance;\n  export type Model = InstanceType<typeof Class>;\n  export interface Seed {\n    width: number;\n  }\n') } }],
      },
      'behavior_lives_on_the_prototype_not_in_fields': {
        claim: 'If a class member is a function, then it is a method, never a function-valued field',
        impossibility: 'a file breaking behavior_lives_on_the_prototype_not_in_fields passes the gate',
        red: [{ files: { 'src/Box.ts': fixture.validClass.replace('  grow() {\n    this.height.value++;\n  }', '  grow = () => {\n    this.height.value++;\n  };') }, expectFindings: [/`grow` is a function-valued field/] }],
        green: [{ files: box }],
      },
      'construction_goes_through_the_namespace_class_slot': {
        claim: 'If an instance is created, then it is new X.Class, never new dollar-X, new X.dollar-Class, or bare reactive-wrapped construction; reactive(new X.Class() as X.Instance) is the sanctioned view',
        impossibility: 'a file breaking construction_goes_through_the_namespace_class_slot passes the gate',
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
        }, {
          // the sanctioned reactive() view: the Instance cast marks the concession
          files: {
            ...box,
            'src/BoxView.ts': "import { reactive } from 'vue';\nimport { Box } from './Box';\n\nclass $BoxView {\n  make() {\n    return reactive(new Box.Class({ width: 1 }) as Box.Instance);\n  }\n}\n\nexport namespace BoxView {\n  export const $Class = $BoxView;\n  export let Class = $Class;\n}\n",
          },
        }],
      },
      'the_anchor_is_static_only_when_statics_exist': {
        claim: 'If a class declares static members, then its anchor is Static of the raw class, and if it declares none, then its anchor is the raw class itself',
        impossibility: 'a file breaking the_anchor_is_static_only_when_statics_exist passes the gate',
        red: [{
          files: {
            'src/Clock.ts': fixture.staticClass.replace('export const $Class = Static($Clock);', 'export const $Class = $Clock;'),
            'src/Box.ts': fixture.validClass.replace("import { Reactive } from 'ivue';", "import { Reactive } from 'ivue';\nimport { Static } from 'ivue/extras';").replace('export const $Class = $Box;', 'export const $Class = Static($Box);'),
          },
          expectCount: 2,
        }],
        green: [{ files: { 'src/Clock.ts': fixture.staticClass, ...box } }],
      },
      'static_binds_methods_and_caches_dollar_getters_per_receiver': {
        claim: "If the consumer's Static transforms a class, then its static methods are bound with stable identity and its dollar getters run once per receiver class",
        impossibility: 'a file breaking static_binds_methods_and_caches_dollar_getters_per_receiver passes the gate',
        red: [
          { files: box, options: { staticImplementation: (<Class,>(targetClass: Class) => targetClass) as CheckStandard.StaticTransform }, expectFindings: [/does not bind static methods/, /does not cache a dollar getter once per receiver/] },
          { files: box, options: { staticImplementation: null }, expectFindings: [/could not be loaded/] },
        ],
        green: [{ files: box }],
      },
      'a_shared_store_is_a_static_readonly_field': {
        claim: 'If a static holds shared state, then the field is readonly, and a dependency constructed at load lives in a LazyShared cell',
        impossibility: 'a file breaking a_shared_store_is_a_static_readonly_field passes the gate',
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
      'a_derived_static_getter_is_lower_camel_case': {
        claim: 'If a static getter derives its value from other members or classes, then its name is lowerCamel, and SCREAMING_SNAKE remains for tunable constants: literals, or other SCREAMING constants composed',
        impossibility: 'a file breaking a_derived_static_getter_is_lower_camel_case passes the gate',
        red: [{ files: { 'src/Clock.ts': fixture.staticClass.replace('  static now() {', '  static get SCAN_LIMIT_HOURS() {\n    return Number(this.$zone.length) * 24;\n  }\n\n  static now() {') }, expectFindings: [/derives its value — a derived getter is lowerCamel \(`scanLimitHours`\)/] }],
        green: [{ files: { 'src/Clock.ts': fixture.staticClass.replace('  static now() {', '  static get RETRY_LIMIT() {\n    return 3;\n  }\n\n  static get EMAIL_PATTERN() {\n    return /a+b/;\n  }\n\n  static get KNOBS() {\n    return { retries: this.RETRY_LIMIT, pattern: Clock.Class.EMAIL_PATTERN };\n  }\n\n  static get scanLimitHours() {\n    return Number(this.$zone.length) * 24;\n  }\n\n  static now() {') } }],
      },
      'static_reads_go_through_self_not_the_base_class': {
        claim: 'If instance code reads its own statics, then it reads this.self, never the base class name or a per-site constructor cast',
        impossibility: 'a file breaking static_reads_go_through_self_not_the_base_class passes the gate',
        red: [{ files: { 'src/Tooltip.ts': fixture.selfClass('return $Tooltip.DELAY_MS + (this.constructor as typeof $Tooltip).DELAY_MS;') }, expectCount: 2 }],
        green: [{ files: { 'src/Tooltip.ts': fixture.selfClass('const self = this.self;\n    return self.DELAY_MS + self.DELAY_MS;') } }],
      },
      'mutable_state_is_a_ref_returning_getter': {
        claim: 'If a class holds mutable state, then it is a getter returning ref or shallowRef, never a mutable plain field',
        impossibility: 'a file breaking mutable_state_is_a_ref_returning_getter passes the gate',
        red: [{ files: { 'src/Box.ts': fixture.validClass.replace('  get height() {', '  count = 0;\n\n  get height() {') }, expectFindings: [/`count` is a mutable plain field/] }],
        // Db.ts is a PLAIN namespace class (no Reactive) — plain mutable
        // fields are its legitimate state; nothing reactive to trigger.
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace("import { ref, watch } from 'vue';", "import { ref, shallowRef, watch } from 'vue';").replace('  get width() {', '  get rows() {\n    return shallowRef<number[]>([]);\n  }\n  get width() {'), 'src/Db.ts': "class $Db {\n  connectionCount = 0;\n\n  open() {\n    this.connectionCount++;\n  }\n}\n\nexport namespace Db {\n  export const $Class = $Db;\n  export let Class = $Class;\n}\n" } }, { files: { 'src/Box.ts': fixture.validClass.replace('class $Box {\n', 'class $Box {\n  declare $watch: typeof watch;\n\n') } }],
      },
      'a_ref_is_read_and_written_through_value': {
        claim: 'If class code writes a Ref getter, then it writes .value, never assigns over the getter',
        impossibility: 'a file breaking a_ref_is_read_and_written_through_value passes the gate',
        red: [{ files: { 'src/Box.ts': fixture.validClass.replace('    this.height.value++;', '    this.height = 9;') }, expectFindings: [/assigns over a Ref getter/] }],
        green: [{ files: { ...box, 'src/Box.vue': fixture.validSfc } }],
      },
      'a_derivation_is_a_plain_getter_unless_computed_is_justified': {
        claim: 'If a getter allocates a computed, then a stated reason, expensive or render-suppression or stable-handle, sits above it',
        impossibility: 'a file breaking a_derivation_is_a_plain_getter_unless_computed_is_justified passes the gate',
        red: [{ files: { 'src/Box.ts': fixture.validClass.replace("import { ref, watch } from 'vue';", "import { computed, ref, watch } from 'vue';").replace('  get area() {\n    return this.width * this.height.value;\n  }', '  get area() {\n    return computed(() => this.width * this.height.value);\n  }') }, expectFindings: [/without a stated reason/] }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace("import { ref, watch } from 'vue';", "import { computed, ref, watch } from 'vue';").replace('  grow() {', '  // computed: expensive — sorts every row\n  get sortedRows() {\n    return computed(() => this.sortRows());\n  }\n\n  sortRows() {\n    return [this.area];\n  }\n\n  grow() {') } }],
      },
      'a_composable_is_injected_by_a_one_call_dollar_getter': {
        claim: 'If a class uses a composable or store, then a dollar getter returns the one call, never an eager field',
        impossibility: 'a file breaking a_composable_is_injected_by_a_one_call_dollar_getter passes the gate',
        red: [{ files: { 'src/Box.ts': fixture.validClass.replace('  get height() {', "  mouse = useMouse();\n\n  private get $project() {\n    const store = useProjectStore();\n    store.warm();\n    return store;\n  }\n\n  get height() {").replace("import { ref, watch } from 'vue';", "import { ref, watch } from 'vue';\nimport { useMouse } from '@vueuse/core';\nimport { useProjectStore } from './stores';") }, expectFindings: [/runs at construction/, /does more than one call/] }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace('  get height() {', '  private get $project() {\n    return useProjectStore();\n  }\n\n  get height() {').replace("import { ref, watch } from 'vue';", "import { ref, watch } from 'vue';\nimport { useProjectStore } from './stores';") } }],
      },
      'instance_types_only_unwrapping_surfaces': {
        claim: 'If a raw collection or parameter is typed, then it uses Model, and if an unwrapping surface is typed, then it uses Instance',
        impossibility: 'a file breaking instance_types_only_unwrapping_surfaces passes the gate',
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
      'a_component_has_one_model_owner': {
        claim: 'If a component constructs models, then exactly one instance owns its template',
        impossibility: 'a file breaking a_component_has_one_model_owner passes the gate',
        red: [{
          files: { ...box, 'src/Box.vue': fixture.validSfc.replace('const box = new Box.Class(props);', 'const box = new Box.Class(props);\nconst spare = new Box.Class(props);') },
          expectFindings: [/second model is constructed \(`spare`\)/],
          expectCount: 1,
        }],
        green: [{ files: { ...box, 'src/Box.vue': fixture.validSfc } }],
      },
      'script_setup_is_wiring_only': {
        claim: 'If a component has a model, then its script setup declares no parallel state, derivation, watcher, or free function',
        impossibility: 'a file breaking script_setup_is_wiring_only passes the gate',
        red: [{
          files: { ...box, 'src/Box.vue': fixture.validSfc.replace('const box = new Box.Class(props);', "import { ref, watch } from 'vue';\nconst box = new Box.Class(props);\nconst open = ref(false);\nwatch(open, () => box.grow());\nfunction toggle() { open.value = !open.value; }") },
          expectFindings: [/`ref\(\)` in `<script setup>`/, /`watch\(\)` in `<script setup>`/, /free function `toggle`/],
          expectCount: 3,
        }],
        green: [{ files: { ...box, 'src/Box.vue': fixture.validSfc } }],
      },
      'a_lifecycle_hook_delegates_to_one_method': {
        claim: 'If a lifecycle hook is registered in script setup, then its whole body delegates one call to the model',
        impossibility: 'a file breaking a_lifecycle_hook_delegates_to_one_method passes the gate',
        red: [{
          files: { ...box, 'src/Box.vue': fixture.validSfc.replace('const box = new Box.Class(props);', "import { onMounted } from 'vue';\nconst box = new Box.Class(props);\nonMounted(() => {\n  box.grow();\n  box.grow();\n});") },
          expectFindings: [/`onMounted\(\)` in `<script setup>` carries logic/],
          expectCount: 1,
        }],
        // the thin bridge an outliving store needs: one call, nothing else
        green: [{ files: { ...box, 'src/Box.vue': fixture.validSfc.replace("const { height } = box;", "const { height } = box;\n\nonMounted(() => box.grow());").replace("import { Box } from './Box';", "import { onMounted } from 'vue';\nimport { Box } from './Box';") } }],
      },
      'the_state_destructure_is_total': {
        claim: 'If a template touches a Ref, then that Ref is destructured, no plain getter or method is destructured, and no state binding shadows a prop',
        impossibility: 'a file breaking the_state_destructure_is_total passes the gate',
        red: [{
          files: {
            ...box,
            'src/Box.vue': "<script setup lang=\"ts\">\nimport { Box } from './Box';\n\nconst props = defineProps<{ width: number }>();\nconst box = new Box.Class(props);\nconst { area, grow, width } = box;\n\ndefineExpose(box as Box.Instance);\n</script>\n\n<template>\n  <div v-if=\"box.height\">{{ area }}</div>\n  <button @click=\"grow()\">{{ width }}</button>\n</template>\n",
          },
          expectFindings: [/`area` is a plain getter/, /`grow` is a method/, /`width` shadows the prop/, /reaches a Ref through the instance/],
        }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace("import { ref, watch } from 'vue';", "import { ref, watch, type Ref } from 'vue';").replace('  get width() {', '  get forwardedHeight(): Ref<number> {\n    return this.height;\n  }\n  get width() {'), 'src/Box.vue': fixture.validSfc.replace('const { height } = box;', 'const { height, forwardedHeight } = box;') } }, { files: { ...box, 'src/Box.vue': fixture.validSfc } }],
      },
      'template_expressions_carry_no_logic': {
        claim: 'If a template expression is written, then it is a named read, a method call, or a structural branch, never a comparison, ternary, negation, or built string',
        impossibility: 'a file breaking template_expressions_carry_no_logic passes the gate',
        red: [{
          files: { ...box, 'src/Box.vue': fixture.validSfc.replace('<div v-if="height > 0">{{ box.area }}</div>', '<div v-if="height > 0 && box.area">{{ box.area ? \'big\' : \'small\' }}</div>\n  <span :title="`Box ${box.area}`">{{ !!height }}</span>') },
          expectFindings: [/`&&` expression/, /a ternary/, /a built string/, /a negation/],
          expectCount: 4,
        }],
        // a bare `!` on a NAMED read (state binding, getter, or method call)
        // stays name-level — only unnamed compound logic is flagged
        green: [{ files: { ...box, 'src/Box.vue': fixture.validSfc.replace('<div v-if="height > 0">{{ box.area }}</div>', '<div v-if="box.hasHeight">{{ box.area }}</div>\n  <span v-if="!box.hasHeight">empty</span>\n  <ul><li v-for="row in box.rows" :key="row.id" :class="{ wide: box.isWide(row), narrow: !box.isWide(row) }">{{ row.name }}</li></ul>') } }],
      },
      'watch_lifetime_matches_the_instance_owner': {
        claim: 'If a class is component-scoped, then it uses plain watch, and if it outlives components, then it uses dollar-watch with a dispose path',
        impossibility: 'a file breaking watch_lifetime_matches_the_instance_owner passes the gate',
        red: [{
          files: {
            'src/Box.ts': fixture.validClass.replace('    watch(\n      () => this.height.value,', '    this.$watch(\n      () => this.height.value,'),
            'src/Box.vue': fixture.validSfc,
            'src/Session.ts': "import { ref, watch } from 'vue';\nimport { Reactive } from 'ivue';\n\nclass $Session {\n  constructor() {\n    watch(() => this.user.value, (user) => this.onUser(user));\n  }\n\n  get user() {\n    return ref<string | null>(null);\n  }\n\n  onUser(user: string | null) {\n    return user;\n  }\n}\n\nexport namespace Session {\n  export const $Class = $Session;\n  export let Class = Reactive($Class);\n  export type Instance = typeof Class.Instance;\n\n  let singleton: Instance | null = null;\n  export function use(): Instance {\n    return (singleton ??= new Class());\n  }\n}\n",
          },
          expectFindings: [/constructed in a component's setup but uses `this\.\$watch`/, /no dispose path/, /outlives components .* but uses plain `watch`/],
        }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace("import { ref, watch } from 'vue';", "import { getCurrentScope, onScopeDispose, ref, watch } from 'vue';").replace('    watch(\n      () => this.height.value,', '    getCurrentScope() && onScopeDispose(() => this.$stopEffects());\n    this.$watch(\n      () => this.height.value,'), 'src/Box.vue': fixture.validSfc } }, { files: { ...box, 'src/Host.ts': "import { Reactive } from 'ivue';\nimport { Box } from './Box';\n\nclass $Host {\n  constructor() {\n    void this.$box;\n  }\n\n  protected get $box() {\n    return new Box.Class({ width: 2 });\n  }\n}\n\nexport namespace Host {\n  export const $Class = $Host;\n  export let Class = Reactive($Class);\n  export type Instance = typeof Class.Instance;\n}\n", 'src/Host.vue': "<script setup lang=\"ts\">\nimport { Host } from './Host';\n\nconst host = new Host.Class();\n\ndefineExpose(host as Host.Instance);\n</script>\n\n<template>\n  <div />\n</template>\n" } }, {
          files: {
            ...box,
            'src/Box.vue': fixture.validSfc,
            'src/Session.ts': "import { ref } from 'vue';\nimport { Reactive } from 'ivue';\n\nclass $Session {\n  constructor() {\n    this.$watch(() => this.user.value, (user) => this.onUser(user));\n  }\n\n  get user() {\n    return ref<string | null>(null);\n  }\n\n  onUser(user: string | null) {\n    return user;\n  }\n\n  dispose() {\n    this.$stopEffects();\n  }\n}\n\nexport namespace Session {\n  export const $Class = $Session;\n  export let Class = Reactive($Class);\n  export type Instance = typeof Class.Instance;\n\n  let singleton: Instance | null = null;\n  export function use(): Instance {\n    return (singleton ??= new Class());\n  }\n}\n",
          },
        }],
      },
      'a_reactive_closure_delegates_to_one_method': {
        claim: 'If a computed or watch callback is written, then it is one arrow delegating to one method',
        impossibility: 'a file breaking a_reactive_closure_delegates_to_one_method passes the gate',
        red: [{
          files: { 'src/Box.ts': fixture.validClass.replace("import { ref, watch } from 'vue';", "import { computed, ref, watch } from 'vue';").replace('      (newHeight, oldHeight) => this.onResize(newHeight, oldHeight),', '      (newHeight) => {\n        if (newHeight > 10) this.grow();\n      },').replace('  grow() {', '  // computed: expensive\n  get doubled() {\n    return computed(this.grow);\n  }\n\n  grow() {') },
          expectFindings: [/watch callback carries logic/, /passes the method directly/],
        }],
        green: [{ files: box }],
      },
      'a_store_is_used_lazily_and_swapped_at_the_class_slot': {
        claim: 'If shared state is published, then it constructs lazily behind use and is never drilled as a prop or constructor argument',
        impossibility: 'a file breaking a_store_is_used_lazily_and_swapped_at_the_class_slot passes the gate',
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
      'keyed_state_creates_on_read_and_peeks_on_write': {
        claim: 'If a class holds a Map of refs, then reads get-or-create, writes peek, and a release path exists',
        impossibility: 'a file breaking keyed_state_creates_on_read_and_peeks_on_write passes the gate',
        red: [{ files: { 'src/Sheet.ts': fixture.keyedClass('bumpCell(cellKey: number): void {\n    let versionRef = this.cellVersions.get(cellKey);\n    if (!versionRef) {\n      versionRef = ref(0);\n      this.cellVersions.set(cellKey, versionRef);\n    }\n    versionRef.value++;\n  }\n', '') }, expectFindings: [/no release path/, /write path `bumpCell` creates entries/] }],
        green: [{ files: { 'src/Sheet.ts': fixture.keyedClass('bumpCell(cellKey: number): void {\n    const versionRef = this.cellVersions.get(cellKey);\n    if (versionRef) versionRef.value++;\n  }\n', '\n  releaseCell(cellKey: number): void {\n    this.cellVersions.delete(cellKey);\n  }\n') } }],
      },
      'a_generic_reactive_class_casts_its_constructor': {
        claim: 'If a reactive class is generic, then Class is cast back to typeof dollar-Class and Instance applies ReactiveInstance by hand',
        impossibility: 'a file breaking a_generic_reactive_class_casts_its_constructor passes the gate',
        red: [{ files: { 'src/Scroller.ts': fixture.genericClass('export let Class = Reactive($Class);', 'export type Instance = typeof Class.Instance;') }, expectFindings: [/`Class` erases <T>/, /`Instance` must carry <T>/] }],
        green: [{ files: { 'src/Scroller.ts': fixture.genericClass('export let Class = Reactive($Class) as unknown as typeof $Class;', 'export type Instance<T> = ReactiveInstance<$Scroller<T>>;') } }],
      },
      'cross_module_class_reads_happen_inside_bodies': {
        claim: "If a module reads another namespace's Class, then it does so inside a getter or method body, never at module evaluation",
        impossibility: 'a file breaking cross_module_class_reads_happen_inside_bodies passes the gate',
        red: [{
          files: { ...box, 'src/Shelf.ts': "import { Reactive } from 'ivue';\nimport { Box } from './Box';\n\nconst BoxClass = Box.Class;\n\nclass $Shelf {\n  make() {\n    return new BoxClass({ width: 1 });\n  }\n}\n\nexport namespace Shelf {\n  export const $Class = $Shelf;\n  export let Class = Reactive($Class);\n  export type Instance = typeof Class.Instance;\n}\n" },
          expectFindings: [/`Box\.Class` is read at module evaluation/],
        }],
        green: [{
          // main.ts exports nothing — a composition root evaluates after its
          // whole import graph, so its module-evaluation Class read is safe
          files: { ...box, 'src/Shelf.ts': "import { Reactive } from 'ivue';\nimport { Box } from './Box';\n\nclass $Shelf extends Box.$Class {\n  make() {\n    return new Box.Class({ width: 1 });\n  }\n}\n\nexport namespace Shelf {\n  export const $Class = $Shelf;\n  export let Class = Reactive($Class);\n  export type Instance = typeof Class.Instance;\n}\n", 'src/main.ts': "import { Box } from './Box';\n\nconst rootBox = new Box.Class({ width: 1 });\nvoid rootBox.area;\n" },
        }, {
          // a generic subclass keeps its type parameter by extending through a cast —
          // `extends (X.$Class as typeof X.$Class)<T>` is still the heritage read
          files: { ...box, 'src/Shelf.ts': "import { Reactive } from 'ivue';\nimport { Box } from './Box';\n\nclass $Shelf<T> extends (Box.$Class as typeof Box.$Class) {\n  make(item: T) {\n    return item;\n  }\n}\n\nexport namespace Shelf {\n  export const $Class = $Shelf;\n  export let Class = Reactive($Class);\n  export type Instance = typeof Class.Instance;\n}\n" },
        }],
      },
      'declarations_use_full_descriptive_names': {
        claim: 'If a name is declared in source or tests, then it is a domain word, never a single letter or a banned abbreviation',
        impossibility: 'a file breaking declarations_use_full_descriptive_names passes the gate',
        red: [{
          files: {
            'src/Box.ts': fixture.validClass.replace('  onResize(newHeight: number, oldHeight: number) {\n    return newHeight - oldHeight;\n  }', '  onResize(nv: number, e: number) {\n    const inst = nv - e;\n    return inst;\n  }'),
            'src/Box.test.ts': fixture.validTest.replace("test('height never decreases on its own', () => {", "test('height never decreases on its own', (_) => {"),
          },
          expectFindings: [/`nv`/, /`e`/, /`inst`/, /`_`/],
          expectCount: 4,
        }, {
          // a `v-for` alias is a declaration too
          files: { ...box, 'src/Box.vue': fixture.validSfc.replace('<button @click="box.grow()">grow</button>', '<ul><li v-for="(r, i) in box.rows" :key="i">{{ r }}</li></ul>\n  <button @click="box.grow()">grow</button>') },
          expectFindings: [/`r` as a `v-for` alias/, /`i` as a `v-for` alias/],
          expectCount: 2,
        }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace('  grow() {', '  offset(px: number, id: string) {\n    return `${id}:${px}`;\n  }\n\n  grow() {'), 'src/Box.test.ts': fixture.validTest } }, { files: { ...box, 'src/Box.vue': fixture.validSfc.replace('<button @click="box.grow()">grow</button>', '<ul><li v-for="(row, index) in box.rows" :key="index">{{ row }}</li></ul>\n  <button @click="box.grow()">grow</button>') } }],
      },
      'class_members_are_ordered_and_spaced': {
        claim: 'If a class is written, then statics precede the constructor, the constructor precedes getters, methods come last and are separated by blank lines',
        impossibility: 'a file breaking class_members_are_ordered_and_spaced passes the gate',
        red: [{
          files: { 'src/Box.ts': fixture.validClass.replace('class $Box {\n  constructor', 'class $Box {\n  get spare() {\n    return ref(0);\n  }\n\n  constructor').replace('  grow() {\n    this.height.value++;\n  }\n\n  onResize', '  static get LIMIT() {\n    return 9;\n  }\n\n  grow() {\n    this.height.value++;\n  }\n  onResize') },
          expectFindings: [/the constructor follows a getter or field/, /a static member follows a getter or field/, /`onResize` is not separated from the previous method/],
          expectCount: 3,
        }],
        green: [{ files: { 'src/Box.ts': fixture.validClass.replace('class $Box {\n  constructor', 'class $Box {\n  static get LIMIT() {\n    return 9;\n  }\n\n  constructor') } }],
      },
      'the_population_and_skip_list_are_exact': {
        claim: 'If the gate runs, then it refuses zero files, unmatched globs, unknown check names, duplicate and stale skips, and unknown or conflicting severity overrides',
        impossibility: 'a file breaking the_population_and_skip_list_are_exact passes the gate',
        red: [
          { files: { 'src/.keep': '' }, expectThrows: /no source files discovered/ },
          { files: box, options: { testGlobs: ['src/**/*.test.ts'] }, expectThrows: /test glob matches no file/ },
          { files: { ...box, 'skips.json': JSON.stringify([{ path: 'src/Box.ts', check: 'No such check', reason: 'reason' }]) }, options: { skipListPath: 'skips.json' }, expectThrows: /unknown check name/ },
          { files: { ...box, 'skips.json': JSON.stringify([{ path: 'src/Box.ts', check: 'a_class_file_is_named_after_its_class', reason: 'first' }, { path: 'src/Box.ts', check: 'a_class_file_is_named_after_its_class', reason: 'second' }]) }, options: { skipListPath: 'skips.json' }, expectThrows: /duplicate skip/ },
          { files: { ...box, 'skips.json': JSON.stringify([{ path: 'src/Box.ts', check: 'a_class_file_is_named_after_its_class', reason: 'never fires here' }, { path: 'src/Gone.ts', check: 'a_class_file_is_named_after_its_class', reason: 'file removed' }]) }, options: { skipListPath: 'skips.json' }, expectFindings: [/no longer fires on src\/Box\.ts/, /src\/Gone\.ts does not exist/] },
          { files: { ...box, 'skips.json': 'src/Box.ts\tA class file is named after its class\treason\n' }, options: { skipListPath: 'skips.json' }, expectThrows: /a JSON array of \{ path, check, reason \}/ },
          { files: { ...box, 'skips.json': JSON.stringify([{ path: 'src/Box.ts', check: 'a_class_file_is_named_after_its_class' }]) }, options: { skipListPath: 'skips.json' }, expectThrows: /entry 1: .*reason/ },
          { files: box, options: { warnChecks: ['No such check'] }, expectThrows: /unknown check name/ },
          { files: box, options: { warnChecks: ['a_class_file_is_named_after_its_class'], offChecks: ['a_class_file_is_named_after_its_class'] }, expectThrows: /both warn and off/ },
        ],
        // Crate.ts deliberately declares $Box — the naming check fires and
        // the skip row suppresses it, proving a used skip is not stale.
        // Crate.ts deliberately declares $Box — the naming check fires and
        // the JSON row suppresses it, proving a used skip is not stale
        green: [
          { files: { 'src/Crate.ts': fixture.validClass, 'src/Crate.test.ts': fixture.validTest, 'skips.json': JSON.stringify([{ path: 'src/Crate.ts', check: 'a_class_file_is_named_after_its_class', reason: 'legacy file name kept for the public import path' }], null, 2) }, options: { skipListPath: 'skips.json' } },
          // demoted to warn: the breach reports as a warning, blocks nothing
          { files: { 'src/Crate.ts': fixture.validClass, 'src/Crate.test.ts': fixture.validTest }, options: { warnChecks: ['a_class_file_is_named_after_its_class'] }, expectWarnings: [/`Crate\.ts` declares `\$Box`/] },
          // off: the check does not run at all — no finding, no warning
          { files: { 'src/Crate.ts': fixture.validClass, 'src/Crate.test.ts': fixture.validTest }, options: { offChecks: ['a_class_file_is_named_after_its_class'] } },
        ],
      },
    };
  }

  // -------------------------------------------------------------------------
  // behavior — methods (async welcome here; the getters above carry data)

  static defineCheck(name: string, run: (context: CheckStandard.GateContext) => CheckStandard.Finding[]): CheckStandard.StandardCheck {
    return { name, enforced: true, run };
  }

  static finding(check: CheckStandard.StandardCheck, unit: CheckStandard.SourceUnit, line: number, message: string): CheckStandard.Finding {
    return { check: check.name, file: unit.relativePath, line, message };
  }

  static componentFinding(check: CheckStandard.StandardCheck, component: CheckStandard.ComponentUnit, line: number, message: string): CheckStandard.Finding {
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

  static toUnit(cwd: string, path: string): CheckStandard.SourceUnit {
    const text = readFileSync(path, 'utf8');
    return {
      path,
      relativePath: relative(cwd, path).replaceAll('\\', '/'),
      text,
      lines: text.split('\n'),
      ast: ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
    };
  }

  static lineOf(unit: CheckStandard.SourceUnit, node: ts.Node): number {
    return unit.ast.getLineAndCharacterOfPosition(node.getStart(unit.ast)).line + 1;
  }

  static collectTemplateExpressions(nodes: TemplateChildNode[], into: CheckStandard.TemplateExpression[], aliases: CheckStandard.ForAliases[] = []): void {
    const aliasNames = (text: string) => text.match(/[A-Za-z_$][\w$]*/g) ?? [];
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
            const source = /^([\s\S]*?)\s+(?:in|of)\s+([\s\S]+)$/.exec(code);
            if (!source) continue;
            aliases.push({ names: aliasNames(source[1]), line: property.exp.loc.start.line });
            code = source[2];
          }
          into.push({ code, line: property.exp.loc.start.line, kind: property.name });
        }
        this.collectTemplateExpressions(element.children, into, aliases);
      } else if (node.type === NodeTypes.IF) {
        for (const branch of node.branches) {
          if (branch.condition && branch.condition.type === NodeTypes.SIMPLE_EXPRESSION) into.push({ code: branch.condition.content, line: branch.loc.start.line, kind: 'if' });
          this.collectTemplateExpressions(branch.children, into, aliases);
        }
      } else if (node.type === NodeTypes.FOR) {
        if (node.source.type === NodeTypes.SIMPLE_EXPRESSION) into.push({ code: node.source.content, line: node.loc.start.line, kind: 'for' });
        const names = [node.valueAlias, node.keyAlias, node.objectIndexAlias].flatMap((alias) => (alias && alias.type === NodeTypes.SIMPLE_EXPRESSION ? aliasNames(alias.content) : []));
        if (names.length) aliases.push({ names, line: node.loc.start.line });
        this.collectTemplateExpressions(node.children, into, aliases);
      }
    }
  }

  static toComponent(cwd: string, path: string): CheckStandard.ComponentUnit {
    const text = readFileSync(path, 'utf8');
    const { descriptor } = parseSfc(text, { filename: path });
    const scriptBlock = descriptor.scriptSetup;
    const scriptLine = scriptBlock ? scriptBlock.loc.start.line : 0;
    const script: CheckStandard.SourceUnit | null = scriptBlock
      ? {
          path,
          relativePath: relative(cwd, path).replaceAll('\\', '/'),
          text: scriptBlock.content,
          lines: scriptBlock.content.split('\n'),
          ast: ts.createSourceFile(path, scriptBlock.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
        }
      : null;
    const expressions: CheckStandard.TemplateExpression[] = [];
    const forAliases: CheckStandard.ForAliases[] = [];
    if (descriptor.template) {
      const templateAst = parseTemplate(descriptor.template.content, { comments: false });
      this.collectTemplateExpressions(templateAst.children, expressions, forAliases);
      const offset = descriptor.template.loc.start.line - 1;
      for (const expression of expressions) expression.line += offset;
      for (const alias of forAliases) alias.line += offset;
    }
    return { path, relativePath: relative(cwd, path).replaceAll('\\', '/'), text, script, scriptLine, expressions, forAliases };
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

  static componentLine(component: CheckStandard.ComponentUnit, node: ts.Node): number {
    return component.script ? this.lineOf(component.script, node) + component.scriptLine - 1 : 1;
  }

  /** `const box = new Box.Class(…)` bindings in a component's script setup. */
  static modelConstructions(component: CheckStandard.ComponentUnit): { variable: string; namespace: string; node: ts.Node }[] {
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
  static propNames(component: CheckStandard.ComponentUnit): Set<string> {
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

  static classFileOf(unit: CheckStandard.SourceUnit): CheckStandard.ClassFile | null {
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

  static classFileByNamespace(context: CheckStandard.GateContext, namespace: string): CheckStandard.ClassFile | null {
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

  /** `declare` on a class member: a type-only statement with no runtime —
   *  how a class names the `$watch` / `$stopEffects` the engine installs. */
  static isDeclaredMember(member: ts.ClassElement): boolean {
    return !!ts.getModifiers(member as ts.HasModifiers)?.some((modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword);
  }

  static memberName(member: ts.ClassElement): string {
    return member.name && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) ? member.name.text : '';
  }

  static isFunctionLike(node: ts.Node | undefined): boolean {
    return !!node && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));
  }

  /** True when the node sits inside a class body declared in script setup. */
  static isInsideClassBody(node: ts.Node): boolean {
    for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
      if (ts.isClassDeclaration(current) || ts.isClassExpression(current)) return true;
    }
    return false;
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

  /** `Ref<…>`, `ShallowRef<…>`, `ComputedRef<…>`, `WritableComputedRef<…>` as a
   *  declared return type. */
  static isRefTypeNode(type: ts.TypeNode): boolean {
    return ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName) && ['Ref', 'ShallowRef', 'ComputedRef', 'WritableComputedRef'].includes(type.typeName.text);
  }

  static refFactoryName(expression: ts.Expression | undefined): string | null {
    if (!expression || !ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) return null;
    const name = expression.expression.text;
    return ['ref', 'shallowRef', 'computed', 'toRef'].includes(name) ? name : null;
  }

  /** Getter names of a class whose body returns a Ref factory call, or
   *  that declare a Ref return type — a FORWARDED cell (`get x(): Ref<number>
   *  { return this.$mouse.x }`) is the same cell as its source, and the
   *  annotation is how the author says so. */
  static refGetterNames(rawClass: ts.ClassDeclaration): Set<string> {
    const names = new Set<string>();
    for (const member of rawClass.members) {
      if (!ts.isGetAccessorDeclaration(member) || !member.body) continue;
      const returned = member.body.statements.find(ts.isReturnStatement);
      if (returned && this.refFactoryName(returned.expression)) names.add(this.memberName(member));
      else if (member.type && this.isRefTypeNode(member.type)) names.add(this.memberName(member));
    }
    return names;
  }

  static forEachDescendant(node: ts.Node, visit: (node: ts.Node) => void): void {
    visit(node);
    node.forEachChild((child) => this.forEachDescendant(child, visit));
  }

  static importedBindings(unit: CheckStandard.SourceUnit): Set<string> {
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

  static parseHeader(unit: CheckStandard.SourceUnit): CheckStandard.GeneratorHeader {
    const grammar = this.$grammar;
    const text = unit.text;
    const header: CheckStandard.GeneratorHeader = {
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

  static parseProofs(unit: CheckStandard.SourceUnit, header: CheckStandard.GeneratorHeader): CheckStandard.ProofAnnotation[] {
    const grammar = this.$grammar;
    const proofs: CheckStandard.ProofAnnotation[] = [];
    let pending: CheckStandard.ProofAnnotation[] = [];
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
  static resolveSeverities(options: CheckStandard.GateOptions): Map<string, 'warn' | 'off'> {
    const known = this.checkNames;
    const resolved = new Map<string, 'warn' | 'off'>();
    for (const [name, severity] of Object.entries(this.severities)) {
      if (!known.has(name)) throw new CheckStandard.GateUsageError(`severities: unknown check name "${name}" — --list names every check`);
      if (severity !== 'error') resolved.set(name, severity);
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

  static readSkipList(cwd: string, path: string): CheckStandard.SkipRow[] {
    const absolute = isAbsolute(path) ? path : resolve(cwd, path);
    if (!existsSync(absolute)) throw new CheckStandard.GateUsageError(`skip-list not found: ${path}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(absolute, 'utf8'));
    } catch (error) {
      throw new CheckStandard.GateUsageError(`skip-list ${path}: not valid JSON (${(error as Error).message}) — the skip list is a JSON array of { path, check, reason }`);
    }
    if (!Array.isArray(parsed)) throw new CheckStandard.GateUsageError(`skip-list ${path}: the skip list is a JSON array of { path, check, reason }`);
    const rows: CheckStandard.SkipRow[] = [];
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
  static run(options: CheckStandard.GateOptions): CheckStandard.GateResult {
    const cwd = resolve(options.cwd);
    if (!options.sourceRoots.length) throw new CheckStandard.GateUsageError('at least one --source-root is required');
    const testMatchers = options.testGlobs.map((glob) => ({ glob, regexp: this.globToRegExp(glob) }));
    const sources: CheckStandard.SourceUnit[] = [];
    const tests: CheckStandard.SourceUnit[] = [];
    const components: CheckStandard.ComponentUnit[] = [];
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

    const context: CheckStandard.GateContext = {
      cwd,
      sourceRoots: options.sourceRoots.map((root) => (isAbsolute(root) ? root : resolve(cwd, root))),
      sources,
      tests,
      components,
      testGlobs: options.testGlobs,
      staticImplementation: options.staticImplementation ?? null,
    };
    const raw: CheckStandard.Finding[] = [];
    for (const entry of this.checks) {
      if (!entry.enforced || severities.get(entry.name) === 'off') continue;
      raw.push(...entry.run(context));
    }

    const findings: CheckStandard.Finding[] = [];
    const warnings: CheckStandard.Finding[] = [];
    const suppressed: CheckStandard.Finding[] = [];
    const used = new Set<CheckStandard.SkipRow>();
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
    const byPlace = (first: CheckStandard.Finding, second: CheckStandard.Finding) => first.file.localeCompare(second.file) || first.line - second.line;
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
  static prove(options?: { completenessOnly?: boolean; only?: string }): CheckStandard.ProveReport {
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
      const asGetter = (this as unknown as Record<string, CheckStandard.StandardCheck | undefined>)[check.name];
      if (asGetter?.name !== check.name) problems.push(`${check.name}: the name is not its getter — one snake_case form is the whole identity (getter, finding label, skip token, severity key)`);
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
            const gateOptions: CheckStandard.GateOptions = {
              cwd: checkout,
              sourceRoots: ['src'],
              testGlobs: hasTests ? ['src/**/*.test.ts'] : [],
              staticImplementation: Static,
              ...arm.options,
            };
            if (arm.options && 'staticImplementation' in arm.options) gateOptions.staticImplementation = arm.options.staticImplementation ?? null;
            // Proofs establish what a check DETECTS; severity is only how a
            // detection is REPORTED. So unless this arm explicitly tests
            // severity (its options carry warnChecks/offChecks), a receiver's
            // own severities getter must not bend the arm: the check's
            // warnings fold back into its findings.
            const armTestsSeverity = !!arm.options && ('warnChecks' in arm.options || 'offChecks' in arm.options);
            let findings: CheckStandard.Finding[] = [];
            let warnings: CheckStandard.Finding[] = [];
            let thrown: Error | null = null;
            try {
              const result = this.run(gateOptions);
              findings = result.findings.filter((item) => item.check === check.name);
              // warnings stay unfiltered: a severity arm demotes ANOTHER
              // check, so its warning carries that check's name
              warnings = result.warnings;
              if (!armTestsSeverity) {
                findings = [...findings, ...result.warnings.filter((item) => item.check === check.name)];
                warnings = [];
              }
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
  ivue-standards-check --source-root <dir> [--source-root <dir>…]
                 --test-glob '<glob>' [--test-glob '<glob>'…]
                 [--skip-list <path>]   a JSON array of { path, check, reason }
  ivue-standards-check --list                 print every check name and severity
  ivue-standards-check --prove ['<check name>']   run the gate's own constitution
                                        (name it to isolate one check's arms)

Exit: 0 clean · 1 findings · 2 usage (zero files, unmatched glob, unknown check
name, duplicate or stale skip row). Paths in findings are relative to the cwd.`;
    const sourceRoots: string[] = [];
    const testGlobs: string[] = [];
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
          if (argv.length > 1) throw new CheckStandard.GateUsageError('--list takes no other arguments');
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
          console.log(`ivue-standards-check --prove${only ? ` "${only}"` : ''}: ${report.ran.red} red arm(s), ${report.ran.green} green arm(s), ${report.problems.length} problem(s)`);
          return report.problems.length ? 1 : 0;
        } else if (argument === '--source-root') sourceRoots.push(value());
        else if (argument === '--test-glob') testGlobs.push(value());
        else if (argument === '--skip-list') skipListPath = value();
        else throw new CheckStandard.GateUsageError(`unknown argument: ${argument}`);
      } catch (error) {
        console.error(`ivue-standards-check: ${(error as Error).message}`);
        return 2;
      }
    }
    let result: CheckStandard.GateResult;
    try {
      result = this.run({ cwd, sourceRoots, testGlobs, skipListPath, staticImplementation: Static });
    } catch (error) {
      if (error instanceof CheckStandard.GateUsageError) {
        console.error(`ivue-standards-check: ${error.message}`);
        return 2;
      }
      throw error;
    }
    for (const item of result.findings) console.error(`${item.file}:${item.line}: [${item.check}] ${item.message}`);
    for (const item of result.warnings) console.error(`warn: ${item.file}:${item.line}: [${item.check}] ${item.message}`);
    console.log(
      `ivue-standards-check: ${result.sources.length} source file(s), ${result.tests.length} test file(s), ` +
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

  /* Types — the gate's public vocabulary, one seam */

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
    /** programmatic severity overrides (the declarative home is the gate
     * class's `severities` getter): demoted to warnings — reported, never
     * blocking … */
    warnChecks?: string[];
    /** … or disabled — not executed, announced in the summary */
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
    /** every `v-for` alias (value, key, index) with the line it is declared on */
    forAliases: ForAliases[];
  }

  export interface ForAliases {
    names: string[];
    line: number;
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

  export interface ClassFile {
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

  export interface GeneratorHeader {
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

  export interface ProofAnnotation {
    type: 'domain' | 'impossible' | 'record';
    symbol?: string;
    claim?: string;
    name?: string;
    contractPath?: string;
    line: number;
    bound: boolean;
  }

  export interface SkipRow {
    path: string;
    check: string;
    reason: string;
    line: number;
  }


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
    // beforeExit, not setImmediate: vite-node evaluates modules with async
    // gaps, so a macrotask scheduled during the FIRST module's eval can fire
    // before later modules register. beforeExit only fires once the whole
    // graph has evaluated and the loop drained — the last registrant has won.
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
