/**
 * The ivue Standard gate.
 *
 * Checks a consumer's class sources and test files against the rules of
 * the ivue operating manual (skills/ivue/SKILL.md). Portable by
 * construction: the only inputs are source roots, test globs, and a
 * reasoned skip-list — no repository names, no paths of its own.
 *
 *   vite-node skills/ivue/check-standard.ts -- --source-root src/modules \
 *     --test-glob 'src/modules/**\/*.test.ts' --skip-list standard-skips.tsv
 *
 * Every check is identified by a plain declarative NAME (a sentence).
 * The name is what the CLI prints, what a skip row names, and what the
 * gate's own test file claims and proves. The exported constant that
 * holds a check is the camel-case form of its name — the identifier the
 * test header binds its claims to.
 *
 * The gate refuses to run over nothing: zero discovered sources, a test
 * glob that matches no file, an unknown check name in the skip-list, a
 * duplicate skip row, or a skip row whose finding no longer fires are
 * all errors, never silent passes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { parse as parseSfc } from '@vue/compiler-sfc';
import { parse as parseTemplate, NodeTypes, type ElementNode, type TemplateChildNode } from '@vue/compiler-dom';

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
  /** the consumer's `Static` for the runtime probe; the CLI loads it from ivue/extras */
  staticImplementation?: StaticTransform | null;
}

export interface GateResult {
  findings: Finding[];
  suppressed: Finding[];
  sources: string[];
  tests: string[];
  unenforced: string[];
}

export class GateUsageError extends Error {}

export interface StandardCheck {
  /** The identity: a plain declarative sentence, used verbatim everywhere. */
  name: string;
  /** false = registered in the manifest but not enforced yet; the report says so. */
  enforced: boolean;
  run(context: GateContext): Finding[];
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
  /** the script setup block, or null when the component has none */
  script: SourceUnit | null;
  /** 1-based line of the script block's first line in the .vue file */
  scriptLine: number;
  expressions: TemplateExpression[];
}

export interface TemplateExpression {
  code: string;
  line: number;
  /** 'interpolation' | 'if' | 'for' | 'bind' | 'on' | 'model' | 'show' | other directive name */
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
  /** the consumer's `Static` for the runtime probe; null = could not be loaded */
  staticImplementation: StaticTransform | null;
}

// ---------------------------------------------------------------------------
// helpers: files

const EXCLUDED_DIRECTORIES = new Set(['node_modules', 'dist', '.git']);

function* walk(directory: string): Generator<string> {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

/** Minimal glob: `**` any depth, `*` within a segment, `?` one character. */
export function globToRegExp(glob: string): RegExp {
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

function toUnit(cwd: string, path: string): SourceUnit {
  const text = readFileSync(path, 'utf8');
  return {
    path,
    relativePath: relative(cwd, path).replaceAll('\\', '/'),
    text,
    lines: text.split('\n'),
    ast: ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
  };
}

function lineOf(unit: SourceUnit, node: ts.Node): number {
  return unit.ast.getLineAndCharacterOfPosition(node.getStart(unit.ast)).line + 1;
}

function finding(check: StandardCheck, unit: SourceUnit, line: number, message: string): Finding {
  return { check: check.name, file: unit.relativePath, line, message };
}

// ---------------------------------------------------------------------------
// helpers: single-file components

const TEMPLATE_IGNORED_DIRECTIVES = new Set(['slot', 'pre', 'cloak', 'once', 'memo']);

function collectTemplateExpressions(nodes: TemplateChildNode[], into: TemplateExpression[]): void {
  for (const node of nodes) {
    if (node.type === NodeTypes.INTERPOLATION && node.content.type === NodeTypes.SIMPLE_EXPRESSION) {
      into.push({ code: node.content.content, line: node.loc.start.line, kind: 'interpolation' });
    } else if (node.type === NodeTypes.ELEMENT) {
      const element = node as ElementNode;
      for (const property of element.props) {
        if (property.type !== NodeTypes.DIRECTIVE || !property.exp || property.exp.type !== NodeTypes.SIMPLE_EXPRESSION) continue;
        if (TEMPLATE_IGNORED_DIRECTIVES.has(property.name)) continue;
        let code = property.exp.content;
        if (property.name === 'for') {
          // `row in rows` / `(row, index) of rows` — only the source is an expression
          const source = /\s+(?:in|of)\s+([\s\S]+)$/.exec(code);
          if (!source) continue;
          code = source[1];
        }
        into.push({ code, line: property.exp.loc.start.line, kind: property.name });
      }
      collectTemplateExpressions(element.children, into);
    } else if (node.type === NodeTypes.IF) {
      for (const branch of node.branches) {
        if (branch.condition && branch.condition.type === NodeTypes.SIMPLE_EXPRESSION) into.push({ code: branch.condition.content, line: branch.loc.start.line, kind: 'if' });
        collectTemplateExpressions(branch.children, into);
      }
    } else if (node.type === NodeTypes.FOR) {
      if (node.source.type === NodeTypes.SIMPLE_EXPRESSION) into.push({ code: node.source.content, line: node.loc.start.line, kind: 'for' });
      collectTemplateExpressions(node.children, into);
    }
  }
}

function toComponent(cwd: string, path: string): ComponentUnit {
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
    collectTemplateExpressions(templateAst.children, expressions);
    const offset = descriptor.template.loc.start.line - 1;
    for (const expression of expressions) expression.line += offset;
  }
  return { path, relativePath: relative(cwd, path).replaceAll('\\', '/'), text, script, scriptLine, expressions };
}

/** A template expression parsed as one TypeScript expression (null when it does not parse). */
function parseExpression(code: string): ts.Expression | null {
  const file = ts.createSourceFile('expression.ts', `(${code});`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const statement = file.statements[0];
  if (!statement || !ts.isExpressionStatement(statement)) return null;
  let expression: ts.Expression = statement.expression;
  while (ts.isParenthesizedExpression(expression)) expression = expression.expression;
  return expression;
}

function componentLine(component: ComponentUnit, node: ts.Node): number {
  return component.script ? lineOf(component.script, node) + component.scriptLine - 1 : 1;
}

function componentFinding(check: StandardCheck, component: ComponentUnit, line: number, message: string): Finding {
  return { check: check.name, file: component.relativePath, line, message };
}

/** `const box = new Box.Class(…)` bindings in a component's script setup. */
function modelConstructions(component: ComponentUnit): { variable: string; namespace: string; node: ts.Node }[] {
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
function propNames(component: ComponentUnit): Set<string> {
  const names = new Set<string>();
  if (!component.script) return names;
  forEachDescendant(component.script.ast, (node) => {
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

// ---------------------------------------------------------------------------
// helpers: class files

interface ClassFile {
  unit: SourceUnit;
  rawClass: ts.ClassDeclaration;
  rawName: string; // `$Box`
  publicName: string; // `Box`
  namespace: ts.ModuleDeclaration | null;
  anchorInitializer: ts.Expression | null; // `$Class = …`
  classInitializer: ts.Expression | null; // `Class = …`
  hasInstanceType: boolean;
  isReactive: boolean;
  isStaticAnchored: boolean;
}

function topLevelStatements(unit: SourceUnit): readonly ts.Statement[] {
  return unit.ast.statements;
}

function classFileOf(unit: SourceUnit): ClassFile | null {
  const rawClass = topLevelStatements(unit).find(
    (statement): statement is ts.ClassDeclaration =>
      ts.isClassDeclaration(statement) && !!statement.name && statement.name.text.startsWith('$'),
  );
  if (!rawClass?.name) return null;
  const rawName = rawClass.name.text;
  const publicName = rawName.slice(1);
  const namespace =
    topLevelStatements(unit).find(
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

function classFileByNamespace(context: GateContext, namespace: string): ClassFile | null {
  for (const unit of context.sources) {
    const classFile = classFileOf(unit);
    if (classFile?.publicName === namespace) return classFile;
  }
  return null;
}

function isStatic(member: ts.ClassElement): boolean {
  return !!(ts.getCombinedModifierFlags(member as ts.Declaration) & ts.ModifierFlags.Static);
}

function isReadonly(member: ts.ClassElement): boolean {
  return !!(ts.getCombinedModifierFlags(member as ts.Declaration) & ts.ModifierFlags.Readonly);
}

function memberName(member: ts.ClassElement): string {
  return member.name && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) ? member.name.text : '';
}

function isFunctionLike(node: ts.Node | undefined): boolean {
  return !!node && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));
}

/** The single expression a thin closure delegates to, or null when it does more. */
function delegateCall(callback: ts.Expression): ts.CallExpression | null {
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

function refFactoryName(expression: ts.Expression | undefined): string | null {
  if (!expression || !ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) return null;
  const name = expression.expression.text;
  return ['ref', 'shallowRef', 'computed', 'toRef'].includes(name) ? name : null;
}

/** Getter names of a class whose body returns a Ref factory call. */
function refGetterNames(rawClass: ts.ClassDeclaration): Set<string> {
  const names = new Set<string>();
  for (const member of rawClass.members) {
    if (!ts.isGetAccessorDeclaration(member) || !member.body) continue;
    const returned = member.body.statements.find(ts.isReturnStatement);
    if (returned && refFactoryName(returned.expression)) names.add(memberName(member));
  }
  return names;
}

function forEachDescendant(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node);
  node.forEachChild((child) => forEachDescendant(child, visit));
}

function importedBindings(unit: SourceUnit): Set<string> {
  const names = new Set<string>();
  for (const statement of topLevelStatements(unit)) {
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

function qualifiedTail(typeNode: ts.TypeNode): { namespace: string; member: string } | null {
  if (!ts.isTypeReferenceNode(typeNode) || !ts.isQualifiedName(typeNode.typeName)) return null;
  const left = typeNode.typeName.left;
  return ts.isIdentifier(left) ? { namespace: left.text, member: typeNode.typeName.right.text } : null;
}

function isInsideFunctionBody(node: ts.Node): boolean {
  for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
    if (ts.isMethodDeclaration(current) || ts.isGetAccessorDeclaration(current) || ts.isSetAccessorDeclaration(current) || ts.isConstructorDeclaration(current) || ts.isArrowFunction(current) || ts.isFunctionExpression(current) || ts.isFunctionDeclaration(current)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// helpers: test-file generator headers (the grammar the /invariants skill owns)

// The grammar's tokens are assembled at runtime: this file is scanned by the
// invariants checker like any other source, and a literal sentinel or
// annotation here would read as a header or a tripwire of the gate itself.
const GENERATOR = ['===', 'GENERATOR', '==='].join(' ');
const GENERATOR_DESCRIBED = ['===', 'GENERATOR-DESCRIBED', '==='].join(' ');
const DOMAIN = 'domain-' + 'invariant';
const IMPOSSIBLE = 'impossible-if-' + 'true';
const RECORD = 'inv' + 'ariant';
const DOMAIN_LINE = new RegExp(`^\\s*(?://\\s*|\\*?\\s*)${DOMAIN}:\\s*(.+?)\\s+—\\s+(.+?)\\s*$`);
const IMPOSSIBLE_LINE = new RegExp(`^\\s*//\\s*${IMPOSSIBLE}:\\s*(.+?)\\s+—\\s+(.+?)\\s*$`);
const RECORD_LINE = new RegExp(`(?<![\\w-])${RECORD}:\\s*([^(\\n]+?)\\s*\\(([^)\\n]*\\.${RECORD}s\\.md)\\)`);
const TEST_CALL = /\b(?:test|it)(?:\.[A-Za-z]+)?\s*\(/;

interface GeneratorHeader {
  present: boolean;
  firstContent: boolean;
  goal: string;
  formal: string;
  described: string;
  orderedRegisters: boolean;
  bothRegisters: boolean;
  /** `Subject:` paths — the source files symbols resolve against; empty = same-named sibling */
  subjects: { path: string; line: number }[];
  domainClaims: Map<string, { symbol: string; claim: string; line: number }>;
  domainSymbols: Set<string>;
  impossibilities: Map<string, number>;
  contractLinks: { text: string; file: string; anchor: string; line: number }[];
  endLine: number; // 1-based line where the header block ends
}

function parseHeader(unit: SourceUnit): GeneratorHeader {
  const text = unit.text;
  const header: GeneratorHeader = {
    present: text.includes(GENERATOR),
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
  const sentinelIndex = text.indexOf(GENERATOR);
  const blockStart = text.lastIndexOf('/*', sentinelIndex);
  const blockEnd = text.indexOf('*/', sentinelIndex);
  if (blockStart < 0 || blockEnd < 0) return header;
  header.firstContent = text.slice(0, blockStart).trim() === '';
  const block = text.slice(blockStart, blockEnd + 2);
  header.endLine = text.slice(0, blockEnd + 2).split('\n').length;
  const describedIndex = block.indexOf(GENERATOR_DESCRIBED);
  const generatorIndex = block.indexOf(GENERATOR);
  header.bothRegisters = describedIndex >= 0;
  header.orderedRegisters = describedIndex > generatorIndex;
  header.formal = block.slice(generatorIndex + GENERATOR.length, describedIndex >= 0 ? describedIndex : undefined);
  header.described = describedIndex >= 0 ? block.slice(describedIndex + GENERATOR_DESCRIBED.length) : '';
  header.goal = /^\s*\*?\s*Goal:\s*(.+\S)\s*$/m.exec(header.formal)?.[1] ?? '';
  const formalStartLine = text.slice(0, blockStart + generatorIndex).split('\n').length;
  header.formal.split('\n').forEach((line, offset) => {
    const subject = /^\s*\*?\s*Subject:\s*(.+\S)\s*$/.exec(line);
    if (subject) {
      for (const path of subject[1].split(/[\s,]+/).filter(Boolean)) header.subjects.push({ path, line: formalStartLine + offset });
      return;
    }
    const domain = DOMAIN_LINE.exec(line);
    if (domain) {
      const symbol = domain[1].trim();
      const claim = domain[2].trim();
      header.domainClaims.set(`${symbol} — ${claim}`, { symbol, claim, line: formalStartLine + offset });
      header.domainSymbols.add(symbol);
    }
    const impossible = /^\s*\*?\s*Impossible if true:\s*(.+\S)\s*$/.exec(line);
    if (impossible) header.impossibilities.set(impossible[1].trim(), formalStartLine + offset);
    for (const link of line.matchAll(new RegExp(`\\[([^\\]]+)\\]\\(([^)\\s]*\\.${RECORD}s\\.md)(#[^)\\s]*)?\\)`, 'g'))) {
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

interface ProofAnnotation {
  type: 'domain' | 'impossible' | 'record';
  symbol?: string;
  claim?: string;
  name?: string;
  contractPath?: string;
  line: number;
  bound: boolean; // directly above a test (an optional doc comment between is fine)
}

function parseProofs(unit: SourceUnit, header: GeneratorHeader): ProofAnnotation[] {
  const proofs: ProofAnnotation[] = [];
  let pending: ProofAnnotation[] = [];
  let documentationOpen = false;
  for (let index = header.endLine; index < unit.lines.length; index++) {
    const line = unit.lines[index];
    if (documentationOpen) {
      if (line.includes('*/')) documentationOpen = false;
      continue;
    }
    const domain = DOMAIN_LINE.exec(line);
    if (domain && line.trimStart().startsWith('//')) {
      pending.push({ type: 'domain', symbol: domain[1].trim(), claim: domain[2].trim(), line: index + 1, bound: false });
      continue;
    }
    const impossible = IMPOSSIBLE_LINE.exec(line);
    if (impossible) {
      pending.push({ type: 'impossible', symbol: impossible[1].trim(), claim: impossible[2].trim(), line: index + 1, bound: false });
      continue;
    }
    const record = RECORD_LINE.exec(line);
    if (record && line.trimStart().startsWith('//')) {
      pending.push({ type: 'record', name: record[1].trim(), contractPath: record[2].trim(), line: index + 1, bound: false });
      continue;
    }
    if (pending.length && /^\s*\/\*\*/.test(line)) {
      documentationOpen = !line.includes('*/');
      continue;
    }
    if (pending.length && TEST_CALL.test(line)) {
      for (const proof of pending) proof.bound = true;
      proofs.push(...pending);
      pending = [];
      continue;
    }
    if (pending.length && line.trim() !== '') {
      proofs.push(...pending); // unbound: something other than a test followed
      pending = [];
    }
  }
  proofs.push(...pending);
  return proofs;
}

function headingSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

function contractSlugs(path: string): Set<string> | null {
  if (!existsSync(path)) return null;
  const slugs = new Set<string>();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const heading = /^###\s+(.+\S)\s*$/.exec(line);
    if (heading) slugs.add(headingSlug(heading[1]));
  }
  return slugs;
}

function declaredInSource(sourceText: string, symbol: string): boolean {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:class|function|interface|type|enum|namespace|const|let|var)\\s+${escaped}\\b`).test(
    sourceText,
  );
}

function siblingSourcePath(testPath: string): string {
  return testPath.replace(/\.test\.ts$/, '.ts');
}

const BANNED_NAMES = new Set([
  'inst', 'qty', 'agg', 'nv', 'ov', 'val', 'arr', 'obj', 'fn', 'cb', 'el', 'evt', 'tmp', 'idx', 'err',
  'num', 'str', 'ctx', 'res', 'msg', 'cnt', 'len', 'ret', 'prev', 'old',
]);
const DOMAIN_TERMS = new Set(['px', 'id', 'fx', 'x', 'y', 'z']); // the Standard's own list, plus coordinates

// ---------------------------------------------------------------------------
// the checks — one exported constant per check; the identifier is the
// camel-case form of the sentence name, which the gate's test header binds to

function check(name: string, run: (context: GateContext) => Finding[]): StandardCheck {
  return { name, enforced: true, run };
}

export const exactlyOneReactiveSourceIsInstalled = check(
  'Exactly one Reactive source is installed',
  (context) => {
    // a vendored engine, or a local re-export that IS the project's engine seam
    const vendored = context.sources.filter((unit) => /export\s+function\s+Reactive\s*[<(]/.test(unit.text) || /export\s*\{[^}]*\bReactive\b[^}]*\}\s*from/.test(unit.text));
    // the nearest package.json ABOVE each source root decides the dependency
    // (a monorepo's workspace manifest, not the repo root's); the ivue
    // package itself counts as its own source
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
      finding(
        exactlyOneReactiveSourceIsInstalled,
        unit,
        1,
        count === 0
          ? 'no Reactive source: neither an ivue dependency in package.json nor a vendored `export function Reactive`'
          : `${count} Reactive sources (dependency: ${dependency}; vendored: ${vendored.map((v) => v.relativePath).join(', ')}) — keep exactly one`,
      ),
    ];
  },
);

export const aPublicClassPublishesItsNamespaceManifest = check(
  'A public class publishes its namespace manifest',
  (context) => {
    const findings: Finding[] = [];
    for (const unit of context.sources) {
      const classFile = classFileOf(unit);
      if (classFile) {
        const { rawClass, publicName, namespace, anchorInitializer, classInitializer, isReactive, hasInstanceType } =
          classFile;
        const line = lineOf(unit, rawClass);
        if (!namespace) {
          findings.push(finding(aPublicClassPublishesItsNamespaceManifest, unit, line, `class ${classFile.rawName} has no \`export namespace ${publicName}\``));
          continue;
        }
        if (!anchorInitializer)
          findings.push(finding(aPublicClassPublishesItsNamespaceManifest, unit, lineOf(unit, namespace), `namespace ${publicName} lacks \`export const $Class = …\``));
        if (!classInitializer)
          findings.push(finding(aPublicClassPublishesItsNamespaceManifest, unit, lineOf(unit, namespace), `namespace ${publicName} lacks \`export let Class = …\``));
        if (isReactive && !hasInstanceType)
          findings.push(finding(aPublicClassPublishesItsNamespaceManifest, unit, lineOf(unit, namespace), `reactive namespace ${publicName} lacks \`export type Instance = typeof Class.Instance\``));
        continue;
      }
      // a file without a `$X` class may still export behavior directly — the
      // manifest is the only sanctioned public surface for behavior. A
      // `satisfies` / `as` / parenthesized wrapper does not hide the object.
      const unwrap = (expression: ts.Expression): ts.Expression => {
        let current = expression;
        while (ts.isSatisfiesExpression(current) || ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) current = current.expression;
        return current;
      };
      const isBehavioralObject = (expression: ts.Expression | undefined): boolean => {
        if (!expression) return false;
        const bare = unwrap(expression);
        return ts.isObjectLiteralExpression(bare) && bare.properties.some((property) => ts.isMethodDeclaration(property) || (ts.isPropertyAssignment(property) && isFunctionLike(property.initializer)));
      };
      for (const statement of topLevelStatements(unit)) {
        const exported = ts.getCombinedModifierFlags(statement as unknown as ts.Declaration) & ts.ModifierFlags.Export;
        if (ts.isClassDeclaration(statement) && exported)
          findings.push(finding(aPublicClassPublishesItsNamespaceManifest, unit, lineOf(unit, statement), 'a class is exported directly — publish `$X` through `export namespace X`'));
        if (ts.isExportAssignment(statement) && isBehavioralObject(statement.expression))
          findings.push(finding(aPublicClassPublishesItsNamespaceManifest, unit, lineOf(unit, statement), 'a behavioral object is exported directly — behavior belongs to a namespace Static class'));
        if (ts.isVariableStatement(statement) && exported) {
          for (const declaration of statement.declarationList.declarations) {
            if (isBehavioralObject(declaration.initializer))
              findings.push(finding(aPublicClassPublishesItsNamespaceManifest, unit, lineOf(unit, declaration), 'a behavioral object is exported directly — behavior belongs to a namespace Static class'));
          }
        }
      }
    }
    return findings;
  },
);

export const aClassFileIsNamedAfterItsClass = check('A class file is named after its class', (context) => {
  const findings: Finding[] = [];
  for (const unit of context.sources) {
    const classFile = classFileOf(unit);
    if (!classFile) continue;
    const stem = basename(unit.path).replace(/\.ts$/, '');
    if (stem !== classFile.publicName)
      findings.push(finding(aClassFileIsNamedAfterItsClass, unit, lineOf(unit, classFile.rawClass), `file \`${stem}.ts\` declares \`${classFile.rawName}\` — the file, class and namespace share one name`));
  }
  return findings;
});

export const aClassFileHoldsOnlyImportsClassNamespaceAndTypes = check(
  'A class file holds only imports class namespace and types',
  (context) => {
    const findings: Finding[] = [];
    for (const unit of context.sources) {
      const classFile = classFileOf(unit);
      if (!classFile) continue;
      let seenClass = false;
      let seenImportAfterCode = false;
      for (const statement of topLevelStatements(unit)) {
        if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
          if (seenClass && !seenImportAfterCode) {
            seenImportAfterCode = true;
            findings.push(finding(aClassFileHoldsOnlyImportsClassNamespaceAndTypes, unit, lineOf(unit, statement), 'imports come first'));
          }
          continue;
        }
        if (statement === classFile.rawClass) {
          seenClass = true;
          continue;
        }
        if (statement === classFile.namespace) {
          if (!seenClass) findings.push(finding(aClassFileHoldsOnlyImportsClassNamespaceAndTypes, unit, lineOf(unit, statement), `namespace ${classFile.publicName} precedes its class ${classFile.rawName}`));
          continue;
        }
        if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isEnumDeclaration(statement)) continue;
        if (ts.isExportDeclaration(statement) && statement.isTypeOnly) continue;
        findings.push(finding(aClassFileHoldsOnlyImportsClassNamespaceAndTypes, unit, lineOf(unit, statement), 'behavior or data outside the class seam — move it into the class (static get / method) or its namespace'));
      }
    }
    return findings;
  },
);

export const behaviorLivesOnThePrototypeNotInFields = check('Behavior lives on the prototype not in fields', (context) => {
  const findings: Finding[] = [];
  for (const unit of context.sources) {
    const classFile = classFileOf(unit);
    if (!classFile) continue;
    for (const member of classFile.rawClass.members) {
      if (ts.isPropertyDeclaration(member) && isFunctionLike(member.initializer))
        findings.push(finding(behaviorLivesOnThePrototypeNotInFields, unit, lineOf(unit, member), `\`${memberName(member)}\` is a function-valued field — write it as a method; the engine binds methods lazily`));
    }
  }
  return findings;
});

export const constructionGoesThroughTheNamespaceClassSlot = check(
  'Construction goes through the namespace Class slot',
  (context) => {
    const findings: Finding[] = [];
    for (const unit of context.sources) {
      forEachDescendant(unit.ast, (node) => {
        if (ts.isNewExpression(node)) {
          const callee = node.expression;
          if (ts.isIdentifier(callee) && callee.text.startsWith('$'))
            findings.push(finding(constructionGoesThroughTheNamespaceClassSlot, unit, lineOf(unit, node), `\`new ${callee.text}()\` constructs the raw class — construct \`${callee.text.slice(1)}.Class\``));
          if (ts.isPropertyAccessExpression(callee) && callee.name.text === '$Class')
            findings.push(finding(constructionGoesThroughTheNamespaceClassSlot, unit, lineOf(unit, node), `\`new ${callee.getText(unit.ast)}()\` constructs the anchor — construct \`.Class\``));
        }
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'reactive' && node.arguments[0] && ts.isNewExpression(node.arguments[0]))
          findings.push(finding(constructionGoesThroughTheNamespaceClassSlot, unit, lineOf(unit, node), '`reactive(new …)` wraps an instance — instances are raw; no proxy on the standard path'));
      });
    }
    return findings;
  },
);

export const theAnchorIsStaticOnlyWhenStaticsExist = check('The anchor is Static only when statics exist', (context) => {
  const findings: Finding[] = [];
  for (const unit of context.sources) {
    const classFile = classFileOf(unit);
    if (!classFile?.namespace || !classFile.anchorInitializer) continue;
    const hasStatics = classFile.rawClass.members.some((member) => isStatic(member) && !ts.isConstructorDeclaration(member));
    const anchorLine = lineOf(unit, classFile.anchorInitializer);
    if (hasStatics && !classFile.isStaticAnchored)
      findings.push(finding(theAnchorIsStaticOnlyWhenStaticsExist, unit, anchorLine, `${classFile.rawName} declares statics but the anchor is raw — \`export const $Class = Static(${classFile.rawName})\``));
    if (!hasStatics && classFile.isStaticAnchored)
      findings.push(finding(theAnchorIsStaticOnlyWhenStaticsExist, unit, anchorLine, `${classFile.rawName} declares no statics but the anchor is \`Static(…)\` — \`export const $Class = ${classFile.rawName}\``));
  }
  return findings;
});

export const staticBindsMethodsAndCachesDollarGettersPerReceiver = check(
  'Static binds methods and caches dollar getters per receiver',
  (context) => {
    // a runtime probe against the consumer's own Static(): the contract the
    // whole static side stands on, proven on every run rather than assumed
    const unit: SourceUnit | undefined = context.sources[0];
    const probe = (message: string): Finding => ({ check: staticBindsMethodsAndCachesDollarGettersPerReceiver.name, file: 'ivue/extras', line: 0, message: `${message} (probed from ${unit?.relativePath ?? 'the gate'})` });
    const Static = context.staticImplementation;
    if (!Static) return [probe('`Static` could not be loaded from ivue/extras — the runtime probe did not run')];
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
    const Anchor = Static($Probe);
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
  },
);

export const aSharedStoreIsAStaticReadonlyField = check('A shared store is a static readonly field', (context) => {
  const findings: Finding[] = [];
  for (const unit of context.sources) {
    const classFile = classFileOf(unit);
    if (!classFile) continue;
    for (const member of classFile.rawClass.members) {
      if (!ts.isPropertyDeclaration(member) || !isStatic(member) || !member.initializer) continue;
      const initializer = member.initializer;
      const storeShaped =
        ts.isNewExpression(initializer)
          ? !!initializer.expression && ts.isIdentifier(initializer.expression) && ['Map', 'Set', 'WeakMap', 'WeakSet', 'Array'].includes(initializer.expression.text)
          : ts.isObjectLiteralExpression(initializer) || ts.isArrayLiteralExpression(initializer);
      if (storeShaped && !isReadonly(member))
        findings.push(finding(aSharedStoreIsAStaticReadonlyField, unit, lineOf(unit, member), `static \`${memberName(member)}\` is a mutable shared store — declare it \`static readonly\``));
      const constructsNamespaceClass =
        ts.isNewExpression(initializer) &&
        ts.isPropertyAccessExpression(initializer.expression) &&
        initializer.expression.name.text === 'Class';
      if (constructsNamespaceClass)
        findings.push(finding(aSharedStoreIsAStaticReadonlyField, unit, lineOf(unit, member), `static \`${memberName(member)}\` constructs another namespace's class at module load — hold it in \`new LazyShared(() => …)\``));
    }
  }
  return findings;
});

export const staticReadsGoThroughSelfNotTheBaseClass = check('Static reads go through self not the base class', (context) => {
  const findings: Finding[] = [];
  for (const unit of context.sources) {
    const classFile = classFileOf(unit);
    if (!classFile) continue;
    for (const member of classFile.rawClass.members) {
      if (isStatic(member)) continue;
      forEachDescendant(member, (node) => {
        if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === classFile.rawName)
          findings.push(finding(staticReadsGoThroughSelfNotTheBaseClass, unit, lineOf(unit, node), `\`${node.getText(unit.ast)}\` pins the read to the base class — read \`this.self.${node.name.text}\``));
        if (ts.isAsExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'constructor' && node.expression.expression.kind === ts.SyntaxKind.ThisKeyword && !(ts.isGetAccessorDeclaration(member) && memberName(member) === 'self'))
          findings.push(finding(staticReadsGoThroughSelfNotTheBaseClass, unit, lineOf(unit, node), 'per-site `this.constructor as …` cast — declare `get self()` once and read through it'));
      });
    }
  }
  return findings;
});

export const mutableStateIsARefReturningGetter = check('Mutable state is a ref-returning getter', (context) => {
  const findings: Finding[] = [];
  for (const unit of context.sources) {
    const classFile = classFileOf(unit);
    if (!classFile) continue;
    for (const member of classFile.rawClass.members) {
      if (!ts.isPropertyDeclaration(member) || isStatic(member) || isReadonly(member)) continue;
      const initializer = member.initializer;
      const fromFactory =
        !!initializer &&
        ts.isCallExpression(initializer) &&
        ts.isPropertyAccessExpression(initializer.expression) &&
        initializer.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
        /^create[A-Z]/.test(initializer.expression.name.text);
      if (fromFactory || isFunctionLike(initializer)) continue; // factories are their own role; function fields are another check's finding
      findings.push(finding(mutableStateIsARefReturningGetter, unit, lineOf(unit, member), `\`${memberName(member)}\` is a mutable plain field — writes trigger nothing; declare \`get ${memberName(member)}() { return ref(…) }\``));
    }
  }
  return findings;
});

export const aRefIsReadAndWrittenThroughValue = check('A Ref is read and written through value', (context) => {
  const findings: Finding[] = [];
  for (const unit of context.sources) {
    const classFile = classFileOf(unit);
    if (!classFile) continue;
    const refGetters = refGetterNames(classFile.rawClass);
    if (!refGetters.size) continue;
    forEachDescendant(classFile.rawClass, (node) => {
      if (!ts.isBinaryExpression(node) || node.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
      const target = node.left;
      if (ts.isPropertyAccessExpression(target) && target.expression.kind === ts.SyntaxKind.ThisKeyword && refGetters.has(target.name.text))
        findings.push(finding(aRefIsReadAndWrittenThroughValue, unit, lineOf(unit, node), `\`this.${target.name.text} = …\` assigns over a Ref getter — write \`this.${target.name.text}.value = …\``));
    });
  }
  return findings;
});

const COMPUTED_JUSTIFICATIONS = ['expensive', 'render-suppression', 'stable-handle'];

export const aDerivationIsAPlainGetterUnlessComputedIsJustified = check(
  'A derivation is a plain getter unless computed is justified',
  (context) => {
    const findings: Finding[] = [];
    for (const unit of context.sources) {
      const classFile = classFileOf(unit);
      if (!classFile) continue;
      for (const member of classFile.rawClass.members) {
        if (!ts.isGetAccessorDeclaration(member) || !member.body) continue;
        const returned = member.body.statements.find(ts.isReturnStatement);
        if (!returned || refFactoryName(returned.expression) !== 'computed') continue;
        // the justification travels with the member: a leading comment naming
        // one of the three categories the Standard admits
        const leading = unit.text.slice(member.getFullStart(), member.getStart(unit.ast));
        const justified = COMPUTED_JUSTIFICATIONS.some((category) => leading.includes(category));
        if (!justified)
          findings.push(finding(aDerivationIsAPlainGetterUnlessComputedIsJustified, unit, lineOf(unit, member), `\`get ${memberName(member)}()\` allocates a computed without a stated reason — derive with a plain getter, or justify above it: \`// computed: expensive | render-suppression | stable-handle\``));
      }
    }
    return findings;
  },
);

export const aComposableIsInjectedByAOneCallDollarGetter = check(
  'A composable is injected by a one-call dollar getter',
  (context) => {
    const findings: Finding[] = [];
    for (const unit of context.sources) {
      const classFile = classFileOf(unit);
      if (!classFile) continue;
      for (const member of classFile.rawClass.members) {
        if (ts.isPropertyDeclaration(member) && member.initializer && ts.isCallExpression(member.initializer) && ts.isIdentifier(member.initializer.expression) && /^use[A-Z]/.test(member.initializer.expression.text))
          findings.push(finding(aComposableIsInjectedByAOneCallDollarGetter, unit, lineOf(unit, member), `\`${memberName(member)} = ${member.initializer.expression.text}()\` runs at construction — inject it as \`private get $${memberName(member)}() { return ${member.initializer.expression.text}() }\``));
        if (ts.isGetAccessorDeclaration(member) && memberName(member).startsWith('$') && member.body) {
          const statements = member.body.statements;
          const single = statements.length === 1 && ts.isReturnStatement(statements[0]) && !!statements[0].expression && (ts.isCallExpression(statements[0].expression) || ts.isNewExpression(statements[0].expression) || ts.isPropertyAccessExpression(statements[0].expression));
          if (!single)
            findings.push(finding(aComposableIsInjectedByAOneCallDollarGetter, unit, lineOf(unit, member), `\`get ${memberName(member)}()\` does more than one call — a dollar getter creates its singleton and nothing else`));
        }
      }
    }
    return findings;
  },
);

export const instanceTypesOnlyUnwrappingSurfaces = check('Instance types only unwrapping surfaces', (context) => {
  const findings: Finding[] = [];
  const RAW_CONTAINERS = new Set(['Array', 'ReadonlyArray', 'Map', 'Set', 'WeakMap', 'ref', 'shallowRef', 'Ref', 'ShallowRef']);
  const inspect = (unit: SourceUnit, report: (line: number, message: string) => void) => {
    forEachDescendant(unit.ast, (node) => {
      // `X.Instance` inside a raw graph: arrays, Map/Set values, refs, parameters
      if (ts.isTypeReferenceNode(node)) {
        const tail = qualifiedTail(node);
        if (tail?.member === 'Instance') {
          const parent = node.parent;
          const inArray = ts.isArrayTypeNode(parent);
          const inContainer = ts.isTypeReferenceNode(parent) && ts.isIdentifier(parent.typeName) && RAW_CONTAINERS.has(parent.typeName.text);
          const asParameter = ts.isParameter(parent) && !ts.isArrowFunction(parent.parent);
          if (inArray || inContainer || asParameter) report(lineOf(unit, node), `\`${tail.namespace}.Instance\` types a raw graph position (collection, ref, or parameter) — raw instances are \`${tail.namespace}.Model\`; \`Instance\` is for unwrapping surfaces only`);
        }
        if (tail?.member === 'Model') {
          const parent = node.parent;
          const inUnwrap = (ts.isAsExpression(parent) && ts.isCallExpression(parent.parent) && ts.isIdentifier(parent.parent.expression) && ['defineExpose', 'reactive'].includes(parent.parent.expression.text)) || (ts.isTypeReferenceNode(parent) && ts.isIdentifier(parent.typeName) && parent.typeName.text === 'ShallowUnwrapRef');
          if (inUnwrap) report(lineOf(unit, node), `\`${tail.namespace}.Model\` on an unwrapping surface — type it \`${tail.namespace}.Instance\` (strips readonly so ref writes typecheck)`);
        }
      }
      // defineExpose(model) without the Instance cast
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'defineExpose' && node.arguments[0] && ts.isIdentifier(node.arguments[0]))
        report(lineOf(unit, node), `\`defineExpose(${node.arguments[0].text})\` exposes the raw type — \`defineExpose(${node.arguments[0].text} as X.Instance)\``);
    });
  };
  for (const unit of context.sources) inspect(unit, (line, message) => findings.push(finding(instanceTypesOnlyUnwrappingSurfaces, unit, line, message)));
  for (const component of context.components) if (component.script) inspect(component.script, (line, message) => findings.push(componentFinding(instanceTypesOnlyUnwrappingSurfaces, component, line + component.scriptLine - 1, message)));
  return findings;
});

const SETUP_BEHAVIOR_CALLS = new Set(['ref', 'shallowRef', 'reactive', 'computed', 'watch', 'watchEffect', 'onMounted', 'onUnmounted', 'onBeforeMount', 'onBeforeUnmount', 'onUpdated', 'onActivated', 'onDeactivated']);

export const aComponentHasOneModelOwner = check('A component has one model owner', (context) => {
  const findings: Finding[] = [];
  for (const component of context.components) {
    if (!component.script) continue;
    const constructions = modelConstructions(component);
    if (constructions.length > 1)
      for (const extra of constructions.slice(1)) findings.push(componentFinding(aComponentHasOneModelOwner, component, componentLine(component, extra.node), `a second model is constructed (\`${extra.variable}\`) — one template, one logic owner`));
    for (const statement of component.script.ast.statements) {
      if (ts.isFunctionDeclaration(statement))
        findings.push(componentFinding(aComponentHasOneModelOwner, component, componentLine(component, statement), `free function \`${statement.name?.text ?? ''}\` beside the model — behavior belongs on the class as a method`));
      forEachDescendant(statement, (node) => {
        if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || !SETUP_BEHAVIOR_CALLS.has(node.expression.text)) return;
        // only top-level setup code counts (not inside a class the SFC happens to define)
        let inClass = false;
        for (let current: ts.Node | undefined = node.parent; current; current = current.parent) if (ts.isClassDeclaration(current) || ts.isClassExpression(current)) inClass = true;
        if (inClass) return;
        findings.push(componentFinding(aComponentHasOneModelOwner, component, componentLine(component, node), `\`${node.expression.text}()\` in \`<script setup>\` — component-local reactive behavior beside the class; state, derivations, watchers and hooks live in the class`));
      });
    }
  }
  return findings;
});

export const theStateDestructureIsTotal = check('The state destructure is total', (context) => {
  const findings: Finding[] = [];
  for (const component of context.components) {
    if (!component.script) continue;
    const props = propNames(component);
    for (const construction of modelConstructions(component)) {
      const classFile = classFileByNamespace(context, construction.namespace);
      if (!classFile) continue;
      const refGetters = refGetterNames(classFile.rawClass);
      const plainGetters = new Set<string>();
      const methods = new Set<string>();
      for (const member of classFile.rawClass.members) {
        if (isStatic(member)) continue;
        const name = memberName(member);
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
            const line = componentLine(component, element);
            if (plainGetters.has(source)) findings.push(componentFinding(theStateDestructureIsTotal, component, line, `\`${source}\` is a plain getter — destructuring snapshots a dead value; read \`${construction.variable}.${source}\` dotted`));
            if (methods.has(source)) findings.push(componentFinding(theStateDestructureIsTotal, component, line, `\`${source}\` is a method — keep it dotted (\`${construction.variable}.${source}()\`) unless a profiled hot path says otherwise`));
            if (props.has(bound)) findings.push(componentFinding(theStateDestructureIsTotal, component, line, `state binding \`${bound}\` shadows the prop of the same name in the template`));
          }
        }
      }
      for (const expression of component.expressions) {
        const parsed = parseExpression(expression.code);
        if (!parsed) continue;
        forEachDescendant(parsed, (node) => {
          if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === construction.variable && refGetters.has(node.name.text))
            findings.push(componentFinding(theStateDestructureIsTotal, component, expression.line, `\`${construction.variable}.${node.name.text}\` reaches a Ref through the instance (always truthy in \`v-if\`) — destructure \`${node.name.text}\` as a state binding`));
        });
      }
    }
  }
  return findings;
});

export const templateExpressionsCarryNoLogic = check('Template expressions carry no logic', (context) => {
  const findings: Finding[] = [];
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
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) return 'a negation';
    if (ts.isPostfixUnaryExpression(node) || (ts.isPrefixUnaryExpression(node) && node.operator !== ts.SyntaxKind.MinusToken)) return 'a mutation';
    if (ts.isNewExpression(node)) return 'construction';
    return null;
  };
  for (const component of context.components) {
    for (const expression of component.expressions) {
      const parsed = parseExpression(expression.code);
      if (!parsed) continue;
      let reported = false;
      forEachDescendant(parsed, (node) => {
        if (reported) return;
        const what = describe(node);
        if (!what) return;
        reported = true;
        findings.push(componentFinding(templateExpressionsCarryNoLogic, component, expression.line, `${what} in the template (\`${expression.code.trim().slice(0, 60)}\`) — name it as a plain getter (or a method when it takes an argument)`));
      });
    }
  }
  return findings;
});

export const watchLifetimeMatchesTheInstanceOwner = check('Watch lifetime matches the instance owner', (context) => {
  const findings: Finding[] = [];
  const componentScoped = new Set<string>();
  for (const component of context.components) for (const construction of modelConstructions(component)) componentScoped.add(construction.namespace);
  const outliving = new Set<string>();
  for (const unit of context.sources) {
    forEachDescendant(unit.ast, (node) => {
      if (!ts.isNewExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'Class' || !ts.isIdentifier(node.expression.expression)) return;
      // constructed anywhere but a component's setup = outlives a component
      outliving.add(node.expression.expression.text);
    });
    const classFile = classFileOf(unit);
    if (classFile?.namespace?.body && ts.isModuleBlock(classFile.namespace.body) && classFile.namespace.body.statements.some((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === 'use')) outliving.add(classFile.publicName);
  }
  for (const unit of context.sources) {
    const classFile = classFileOf(unit);
    if (!classFile) continue;
    const name = classFile.publicName;
    let usesDollarWatch = false;
    let usesPlainWatch = false;
    let hasDisposePath = false;
    let dollarLine = 0;
    let plainLine = 0;
    forEachDescendant(classFile.rawClass, (node) => {
      if (!ts.isCallExpression(node)) return;
      const callee = node.expression;
      if (ts.isPropertyAccessExpression(callee) && callee.expression.kind === ts.SyntaxKind.ThisKeyword) {
        if (callee.name.text === '$watch' || callee.name.text === '$watchEffect') {
          usesDollarWatch = true;
          dollarLine ||= lineOf(unit, node);
        }
        if (callee.name.text === '$stopEffects') hasDisposePath = true;
      }
      if (ts.isIdentifier(callee)) {
        if (callee.text === 'watch' || callee.text === 'watchEffect') {
          usesPlainWatch = true;
          plainLine ||= lineOf(unit, node);
        }
        if (callee.text === 'onScopeDispose') hasDisposePath = true;
      }
    });
    const isComponentScoped = componentScoped.has(name) && !outliving.has(name);
    const isOutliving = outliving.has(name);
    if (isComponentScoped && usesDollarWatch) findings.push(finding(watchLifetimeMatchesTheInstanceOwner, unit, dollarLine, `${classFile.rawName} is constructed in a component's setup but uses \`this.$watch\` — its scope would outlive unmount; use plain \`watch\` (the component scope reaps it)`));
    if (isOutliving && usesPlainWatch) findings.push(finding(watchLifetimeMatchesTheInstanceOwner, unit, plainLine, `${classFile.rawName} outlives components (constructed outside setup) but uses plain \`watch\` — there is no component scope to reap it; use \`this.$watch\``));
    if (usesDollarWatch && !hasDisposePath) findings.push(finding(watchLifetimeMatchesTheInstanceOwner, unit, dollarLine, `${classFile.rawName} registers \`$watch\` effects but has no dispose path — call \`$stopEffects()\` from an owner method, or auto-wire \`onScopeDispose\``));
  }
  return findings;
});

export const aReactiveClosureDelegatesToOneMethod = check('A reactive closure delegates to one method', (context) => {
  const findings: Finding[] = [];
  const reactiveCallees = new Set(['computed', 'watch', 'watchEffect', '$watch', '$watchEffect']);
  for (const unit of context.sources) {
    const classFile = classFileOf(unit);
    if (!classFile) continue;
    forEachDescendant(classFile.rawClass, (node) => {
      if (!ts.isCallExpression(node)) return;
      const callee = node.expression;
      const calleeName = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
      if (!reactiveCallees.has(calleeName)) return;
      // computed(fn) / computed({ get, set }); watch(source, fn); watchEffect(fn)
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
          findings.push(finding(aReactiveClosureDelegatesToOneMethod, unit, lineOf(unit, callback), `\`${calleeName}(${callback.getText(unit.ast)})\` passes the method directly — use the arrow form \`() => ${callback.getText(unit.ast)}()\``));
          continue;
        }
        if (!delegateCall(callback))
          findings.push(finding(aReactiveClosureDelegatesToOneMethod, unit, lineOf(unit, callback), `${calleeName} callback carries logic — delegate to one method: \`() => this.method(…)\``));
      }
    });
  }
  return findings;
});

export const aStoreIsUsedLazilyAndSwappedAtTheClassSlot = check(
  'A store is used lazily and swapped at the Class slot',
  (context) => {
    const findings: Finding[] = [];
    for (const unit of context.sources) {
      forEachDescendant(unit.ast, (node) => {
        // an eager singleton: `new X.Class()` evaluated at module load
        if (ts.isNewExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'Class' && !isInsideFunctionBody(node))
          findings.push(finding(aStoreIsUsedLazilyAndSwappedAtTheClassSlot, unit, lineOf(unit, node), `\`${node.getText(unit.ast)}\` constructs a singleton at module load — publish it behind \`use()\` (\`singleton ??= new Class()\`) so it constructs on first touch and tests can swap the \`Class\` slot first`));
        // a shared model drilled through a constructor
        if (ts.isParameter(node) && node.type && ts.isConstructorDeclaration(node.parent)) {
          const tail = qualifiedTail(node.type);
          if (tail && (tail.member === 'Instance' || tail.member === 'Model') && ts.isIdentifier(node.name) && /^(app|store|session|root|shell)$/i.test(node.name.text))
            findings.push(finding(aStoreIsUsedLazilyAndSwappedAtTheClassSlot, unit, lineOf(unit, node), `constructor takes the shared model \`${node.name.text}: ${tail.namespace}.${tail.member}\` — reach for it with \`private get $${node.name.text}() { return ${tail.namespace}.use() }\``));
        }
      });
    }
    for (const component of context.components) {
      if (!component.script) continue;
      forEachDescendant(component.script.ast, (node) => {
        if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'defineProps') return;
        const typeArgument = node.typeArguments?.[0];
        if (!typeArgument || !ts.isTypeLiteralNode(typeArgument)) return;
        for (const member of typeArgument.members) {
          if (!ts.isPropertySignature(member) || !member.type || !ts.isIdentifier(member.name)) continue;
          const tail = qualifiedTail(member.type);
          // a per-instance entity (a row, a task, a member) is legitimate prop
          // input; the tell for a drilled STORE is the prop's name, or a
          // namespace that names itself a store
          const storeShaped = /^(app|store|session|root|shell)$/i.test(member.name.text) || /Store$/.test(tail?.namespace ?? '');
          if (tail && (tail.member === 'Instance' || tail.member === 'Model') && storeShaped)
            findings.push(componentFinding(aStoreIsUsedLazilyAndSwappedAtTheClassSlot, component, componentLine(component, member), `prop \`${member.name.text}: ${tail.namespace}.${tail.member}\` drills a shared model — a store is reached with \`${tail.namespace}.use()\`, never passed down`));
        }
      });
    }
    return findings;
  },
);

export const keyedStateCreatesOnReadAndPeeksOnWrite = check('Keyed state creates on read and peeks on write', (context) => {
  const findings: Finding[] = [];
  const REF_TYPES = /\b(?:Ref|ShallowRef|ComputedRef|WritableComputedRef)\s*</;
  for (const unit of context.sources) {
    const classFile = classFileOf(unit);
    if (!classFile) continue;
    for (const member of classFile.rawClass.members) {
      if (!ts.isPropertyDeclaration(member)) continue;
      const declared = `${member.type?.getText(unit.ast) ?? ''} ${member.initializer?.getText(unit.ast) ?? ''}`;
      if (!/\bMap\s*</.test(declared) || !REF_TYPES.test(declared)) continue;
      const overlay = memberName(member);
      let releases = false;
      const writers: ts.MethodDeclaration[] = [];
      for (const method of classFile.rawClass.members) {
        if (!ts.isMethodDeclaration(method) || !method.body) continue;
        const body = method.body.getText(unit.ast);
        if (new RegExp(`this\\.${overlay}\\.(?:delete|clear)\\(`).test(body)) releases = true;
        if (/^(?:set|write|bump|update|put|apply|invalidate)/.test(memberName(method)) && new RegExp(`this\\.${overlay}\\.set\\(`).test(body)) writers.push(method);
      }
      if (!releases) findings.push(finding(keyedStateCreatesOnReadAndPeeksOnWrite, unit, lineOf(unit, member), `keyed overlay \`${overlay}\` has no release path — no method deletes or clears its entries; a Map of refs cannot GC on its own`));
      for (const writer of writers) findings.push(finding(keyedStateCreatesOnReadAndPeeksOnWrite, unit, lineOf(unit, writer), `write path \`${memberName(writer)}\` creates entries in \`${overlay}\` — writes PEEK (\`get(key)?.value++\`); only reads get-or-create`));
    }
  }
  return findings;
});

export const aGenericReactiveClassCastsItsConstructor = check('A generic reactive class casts its constructor', (context) => {
  const findings: Finding[] = [];
  for (const unit of context.sources) {
    const classFile = classFileOf(unit);
    if (!classFile?.namespace?.body || !classFile.rawClass.typeParameters?.length || !classFile.isReactive) continue;
    const classText = classFile.classInitializer?.getText(unit.ast) ?? '';
    if (!/as\s+unknown\s+as\s+typeof\s+\$\w+/.test(classText))
      findings.push(finding(aGenericReactiveClassCastsItsConstructor, unit, lineOf(unit, classFile.classInitializer ?? classFile.namespace), `generic ${classFile.rawName}: \`Class\` erases <T> — \`export let Class = Reactive($Class) as unknown as typeof $Class\``));
    const instanceAlias = ts.isModuleBlock(classFile.namespace.body) ? classFile.namespace.body.statements.find((statement): statement is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'Instance') : undefined;
    if (instanceAlias && (!instanceAlias.typeParameters?.length || !/ReactiveInstance\s*</.test(instanceAlias.type.getText(unit.ast))))
      findings.push(finding(aGenericReactiveClassCastsItsConstructor, unit, lineOf(unit, instanceAlias), `generic ${classFile.rawName}: \`Instance\` must carry <T> and apply ReactiveInstance by hand — \`export type Instance<T> = ReactiveInstance<${classFile.rawName}<T>>\``));
  }
  return findings;
});

export const crossModuleClassReadsHappenInsideBodies = check('Cross-module Class reads happen inside bodies', (context) => {
  const findings: Finding[] = [];
  for (const unit of context.sources) {
    const imported = importedBindings(unit);
    if (!imported.size) continue;
    forEachDescendant(unit.ast, (node) => {
      if (!ts.isPropertyAccessExpression(node) || !ts.isIdentifier(node.expression)) return;
      if (!imported.has(node.expression.text)) return;
      if (node.name.text !== 'Class' && node.name.text !== '$Class') return;
      if (node.parent && ts.isExpressionWithTypeArguments(node.parent) && node.name.text === '$Class') return; // extends X.$Class — the sanctioned load-time read
      if (isInsideFunctionBody(node)) return;
      findings.push(finding(crossModuleClassReadsHappenInsideBodies, unit, lineOf(unit, node), `\`${node.getText(unit.ast)}\` is read at module evaluation — read it inside a getter or method body (any load order then resolves)`));
    });
  }
  return findings;
});

export const declarationsUseFullDescriptiveNames = check('Declarations use full descriptive names', (context) => {
  const findings: Finding[] = [];
  const inspect = (unit: SourceUnit) => {
    forEachDescendant(unit.ast, (node) => {
      let identifier: ts.Identifier | null = null;
      if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) && ts.isIdentifier(node.name)) identifier = node.name;
      else if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node) || ts.isGetAccessorDeclaration(node)) && node.name && ts.isIdentifier(node.name)) identifier = node.name;
      if (!identifier) return;
      const name = identifier.text;
      const bare = name.replace(/^[$_]+/, '');
      const single = bare.length === 1 && !DOMAIN_TERMS.has(bare);
      const banned = BANNED_NAMES.has(bare.toLowerCase());
      if (name === '_' || single || banned)
        findings.push(finding(declarationsUseFullDescriptiveNames, unit, lineOf(unit, identifier), `\`${name}\` — unfold to the domain word (row, cell, newValue, event…); single letters and abbreviations are not names`));
    });
  };
  for (const unit of context.sources) inspect(unit);
  for (const unit of context.tests) inspect(unit);
  return findings;
});

export const classMembersAreOrderedAndSpaced = check('Class members are ordered and spaced', (context) => {
  const findings: Finding[] = [];
  const rank = (member: ts.ClassElement): number => {
    if (isStatic(member)) return 0;
    if (ts.isConstructorDeclaration(member)) return 1;
    if (ts.isPropertyDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) return 2;
    return 3; // methods
  };
  const rankName = ['a static member', 'the constructor', 'a getter or field', 'a method'];
  for (const unit of context.sources) {
    const classFile = classFileOf(unit);
    if (!classFile) continue;
    let highest = -1;
    let previous: ts.ClassElement | null = null;
    for (const member of classFile.rawClass.members) {
      const currentRank = rank(member);
      if (currentRank < highest)
        findings.push(finding(classMembersAreOrderedAndSpaced, unit, lineOf(unit, member), `${rankName[currentRank]} follows ${rankName[highest]} — order is statics, constructor, getters, methods`));
      highest = Math.max(highest, currentRank);
      if (previous && ts.isMethodDeclaration(member) && ts.isMethodDeclaration(previous)) {
        // the line before the method (or before its leading comments) must be blank
        const startLine = unit.ast.getLineAndCharacterOfPosition(member.getFullStart()).line;
        const previousEndLine = unit.ast.getLineAndCharacterOfPosition(previous.getEnd()).line;
        const between = unit.lines.slice(previousEndLine + 1, unit.ast.getLineAndCharacterOfPosition(member.getStart(unit.ast)).line);
        if (!between.some((line) => line.trim() === '') && startLine >= previousEndLine)
          findings.push(finding(classMembersAreOrderedAndSpaced, unit, lineOf(unit, member), `method \`${memberName(member)}\` is not separated from the previous method by a blank line — methods are paragraphs`));
      }
      previous = member;
    }
  }
  return findings;
});

export const aTestFileOpensWithItsGeneratorHeader = check('A test file opens with its generator header', (context) => {
  const findings: Finding[] = [];
  for (const unit of context.tests) {
    const header = parseHeader(unit);
    if (!header.present) findings.push(finding(aTestFileOpensWithItsGeneratorHeader, unit, 1, `no \`${GENERATOR}\` header — the test file opens with its generator header, before any import`));
    else if (!header.firstContent) findings.push(finding(aTestFileOpensWithItsGeneratorHeader, unit, 1, 'the generator header is not the first content — nothing precedes it, imports follow it'));
  }
  return findings;
});

export const aGeneratorHeaderCarriesBothRegistersInOrder = check(
  'A generator header carries both registers in order',
  (context) => {
    const findings: Finding[] = [];
    for (const unit of context.tests) {
      const header = parseHeader(unit);
      if (!header.present) continue;
      const line = unit.lines.findIndex((text) => text.includes(GENERATOR)) + 1;
      if (unit.text.split(GENERATOR).length > 2) findings.push(finding(aGeneratorHeaderCarriesBothRegistersInOrder, unit, line, `duplicate \`${GENERATOR}\` sentinel`));
      if (!header.bothRegisters) findings.push(finding(aGeneratorHeaderCarriesBothRegistersInOrder, unit, line, `missing \`${GENERATOR_DESCRIBED}\` register`));
      else if (!header.orderedRegisters) findings.push(finding(aGeneratorHeaderCarriesBothRegistersInOrder, unit, line, `\`${GENERATOR_DESCRIBED}\` must follow \`${GENERATOR}\``));
      if (!header.goal) findings.push(finding(aGeneratorHeaderCarriesBothRegistersInOrder, unit, line, 'the formal register needs a `Goal:` line'));
      if (!header.impossibilities.size) findings.push(finding(aGeneratorHeaderCarriesBothRegistersInOrder, unit, line, 'the formal register needs at least one `Impossible if true:` line'));
    }
    return findings;
  },
);

export const aHeaderSymbolIsDeclaredInTheSiblingSource = check(
  'A header symbol is declared in the sibling source',
  (context) => {
    const findings: Finding[] = [];
    for (const unit of context.tests) {
      const header = parseHeader(unit);
      if (!header.present) continue;
      // `Subject:` names the source file(s) the symbols resolve against;
      // absent means the same-named sibling
      let subjectTexts: string[] = [];
      if (header.subjects.length) {
        let broken = false;
        for (const subject of header.subjects) {
          const candidates = [resolve(dirname(unit.path), subject.path), resolve(context.cwd, subject.path)];
          const found = candidates.find(existsSync);
          if (!found) {
            findings.push(finding(aHeaderSymbolIsDeclaredInTheSiblingSource, unit, subject.line, `Subject path does not exist: ${subject.path}`));
            broken = true;
            continue;
          }
          subjectTexts.push(readFileSync(found, 'utf8'));
        }
        if (broken) continue;
      } else {
        const sourcePath = siblingSourcePath(unit.path);
        if (!existsSync(sourcePath)) {
          findings.push(finding(aHeaderSymbolIsDeclaredInTheSiblingSource, unit, 1, `no sibling source \`${basename(sourcePath)}\` for this test file's header symbols — name the source with a \`Subject:\` line, or colocate the test`));
          continue;
        }
        subjectTexts = [readFileSync(sourcePath, 'utf8')];
      }
      const subjectDescription = header.subjects.length ? header.subjects.map((subject) => basename(subject.path)).join(', ') : basename(siblingSourcePath(unit.path));
      for (const { symbol, line } of header.domainClaims.values()) {
        if (!subjectTexts.some((text) => declaredInSource(text, symbol)))
          findings.push(finding(aHeaderSymbolIsDeclaredInTheSiblingSource, unit, line, `header symbol \`${symbol}\` is not declared in ${subjectDescription}`));
      }
    }
    return findings;
  },
);

export const aClaimAnnotationSitsDirectlyAboveItsTest = check(
  'A claim annotation sits directly above its test',
  (context) => {
    const findings: Finding[] = [];
    for (const unit of context.tests) {
      const header = parseHeader(unit);
      if (!header.present) continue;
      for (const proof of parseProofs(unit, header)) {
        if (!proof.bound) findings.push(finding(aClaimAnnotationSitsDirectlyAboveItsTest, unit, proof.line, 'proof annotation must sit directly above a test (an optional doc comment may sit between)'));
      }
    }
    return findings;
  },
);

export const headerClaimsAndAnnotatedTestsMatchOneToOne = check(
  'Header claims and annotated tests match one to one',
  (context) => {
    const findings: Finding[] = [];
    for (const unit of context.tests) {
      const header = parseHeader(unit);
      if (!header.present) continue;
      const proofs = parseProofs(unit, header).filter((proof) => proof.bound && proof.type === 'domain');
      const proved = new Set<string>();
      for (const proof of proofs) {
        const key = `${proof.symbol} — ${proof.claim}`;
        if (header.domainClaims.has(key)) proved.add(key);
        else if (!header.impossibilities.has(proof.claim ?? '')) findings.push(finding(headerClaimsAndAnnotatedTestsMatchOneToOne, unit, proof.line, `annotated test claim is absent from the header: ${key}`));
      }
      for (const [key, { line }] of header.domainClaims) {
        if (!proved.has(key)) findings.push(finding(headerClaimsAndAnnotatedTestsMatchOneToOne, unit, line, `header ${DOMAIN} has no annotated test: ${key}`));
      }
    }
    return findings;
  },
);

export const anImpossibilityIsProvedByAnExactNegativeTest = check(
  'An impossibility is proved by an exact negative test',
  (context) => {
    const findings: Finding[] = [];
    for (const unit of context.tests) {
      const header = parseHeader(unit);
      if (!header.present) continue;
      const proofs = parseProofs(unit, header).filter((proof) => proof.bound);
      const proved = new Set<string>();
      for (const proof of proofs) {
        if (proof.type === 'impossible') {
          if (header.impossibilities.has(proof.claim ?? '')) {
            proved.add(proof.claim ?? '');
            if (!header.domainSymbols.has(proof.symbol ?? '')) findings.push(finding(anImpossibilityIsProvedByAnExactNegativeTest, unit, proof.line, `impossibility proof symbol \`${proof.symbol}\` is absent from the header`));
          } else if (header.domainClaims.has(`${proof.symbol} — ${proof.claim}`)) findings.push(finding(anImpossibilityIsProvedByAnExactNegativeTest, unit, proof.line, `an invariant is labeled as an impossibility: ${proof.claim}`));
          else findings.push(finding(anImpossibilityIsProvedByAnExactNegativeTest, unit, proof.line, `impossibility text is not exact — no header line reads: ${proof.claim}`));
        }
        if (proof.type === 'domain' && header.impossibilities.has(proof.claim ?? ''))
          findings.push(finding(anImpossibilityIsProvedByAnExactNegativeTest, unit, proof.line, `an impossibility is labeled as an invariant: ${proof.claim}`));
      }
      for (const [claim, line] of header.impossibilities) {
        if (!proved.has(claim)) findings.push(finding(anImpossibilityIsProvedByAnExactNegativeTest, unit, line, `Impossible if true has no annotated negative test: ${claim}`));
      }
    }
    return findings;
  },
);

export const aContractPointerResolvesAndIsProved = check('A contract pointer resolves and is proved', (context) => {
  const findings: Finding[] = [];
  for (const unit of context.tests) {
    const header = parseHeader(unit);
    if (!header.present) continue;
    const proofs = parseProofs(unit, header).filter((proof) => proof.bound && proof.type === 'record');
    const provedNames = new Set(proofs.map((proof) => headingSlug(proof.name ?? '')));
    for (const link of header.contractLinks) {
      if (!link.anchor) {
        findings.push(finding(aContractPointerResolvesAndIsProved, unit, link.line, `contract link \`${link.file}\` needs a record anchor`));
        continue;
      }
      const candidates = [resolve(dirname(unit.path), link.file), resolve(context.cwd, link.file)];
      const slugs = candidates.map(contractSlugs).find((set) => set !== null) ?? null;
      if (!slugs) {
        findings.push(finding(aContractPointerResolvesAndIsProved, unit, link.line, `contract not found: ${link.file}`));
        continue;
      }
      if (!slugs.has(link.anchor)) {
        findings.push(finding(aContractPointerResolvesAndIsProved, unit, link.line, `anchor \`#${link.anchor}\` does not resolve in ${link.file}`));
        continue;
      }
      if (!provedNames.has(link.anchor)) findings.push(finding(aContractPointerResolvesAndIsProved, unit, link.line, `header contract-record pointer has no annotated test: ${link.anchor}`));
    }
    for (const proof of proofs) {
      if (!header.contractLinks.some((link) => link.anchor === headingSlug(proof.name ?? ''))) findings.push(finding(aContractPointerResolvesAndIsProved, unit, proof.line, `annotated record is absent from the header: ${proof.name}`));
    }
  }
  return findings;
});

export const aSourceTripwireResolvesToItsSiblingHeader = check(
  'A source tripwire resolves to its sibling header',
  (context) => {
    const findings: Finding[] = [];
    const SYMBOL_ONLY = new RegExp(`^\\s*//\\s*${DOMAIN}:\\s*([^—\\n]+?)\\s*$`);
    for (const unit of context.sources) {
      const testPath = unit.path.replace(/\.ts$/, '.test.ts');
      let siblingSymbols: Set<string> | null = null;
      unit.lines.forEach((line, index) => {
        if (!line.includes(`${DOMAIN}:`)) return;
        const symbolOnly = SYMBOL_ONLY.exec(line);
        if (!symbolOnly) {
          findings.push(finding(aSourceTripwireResolvesToItsSiblingHeader, unit, index + 1, `source tripwires carry only the symbol: \`// ${DOMAIN}: <symbol>\``));
          return;
        }
        if (siblingSymbols === null) {
          siblingSymbols = existsSync(testPath) ? parseHeader(toUnit(context.cwd, testPath)).domainSymbols : new Set();
        }
        if (!siblingSymbols.has(symbolOnly[1].trim()))
          findings.push(finding(aSourceTripwireResolvesToItsSiblingHeader, unit, index + 1, `tripwire \`${symbolOnly[1].trim()}\` has no header claim in ${basename(testPath)}`));
      });
      if (unit.text.includes(GENERATOR)) findings.push(finding(aSourceTripwireResolvesToItsSiblingHeader, unit, unit.lines.findIndex((line) => line.includes(GENERATOR)) + 1, `\`${GENERATOR}\` belongs at the top of the sibling test file, not in source`));
    }
    return findings;
  },
);

export const aTestCaveatDerivesFromATestedClaim = check('A test caveat derives from a tested claim', (context) => {
  const findings: Finding[] = [];
  for (const unit of context.tests) {
    const header = parseHeader(unit);
    if (!header.present || !header.described) continue;
    const symbols = [...header.domainSymbols];
    const startLine = unit.lines.findIndex((line) => line.includes(GENERATOR_DESCRIBED)) + 1;
    const sentences = header.described.replace(/^\s*\*\s?/gm, '').split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      if (!/\b(?:must|never|always|only|cannot)\b/i.test(sentence)) continue;
      if (/Open question:/i.test(sentence)) continue;
      if (symbols.some((symbol) => sentence.includes(symbol))) continue;
      findings.push(finding(aTestCaveatDerivesFromATestedClaim, unit, startLine, `described-register caveat names no header symbol — a constraint the tests do not reach is a claim without a proof: "${sentence.trim().slice(0, 90)}"`));
    }
  }
  return findings;
});

export const thePopulationAndSkipListAreExact = check('The population and skip-list are exact', () => []); // enforced by runStandardGate itself; its findings carry this name

export const twoTestFilesDoNotShareOneGeneratorHeader = check(
  'Two test files do not share one generator header',
  (context) => {
    const findings: Finding[] = [];
    const normalized = new Map<string, SourceUnit>();
    for (const unit of context.tests) {
      const header = parseHeader(unit);
      if (!header.present) continue;
      let text = `${header.goal}\n${header.described}`.replace(/\s+/g, ' ').trim();
      for (const symbol of header.domainSymbols) text = text.replaceAll(symbol, '<symbol>');
      text = text.replaceAll(basename(unit.path).replace(/\.test\.ts$/, ''), '<file>');
      if (!text) continue;
      const twin = normalized.get(text);
      if (twin) findings.push(finding(twoTestFilesDoNotShareOneGeneratorHeader, unit, 1, `generator header is a template twin of ${twin.relativePath} — a Goal that fits another file with the name swapped is not a Goal`));
      else normalized.set(text, unit);
    }
    return findings;
  },
);

/** The manifest: every check the gate knows, in the Standard's order. */
export const CHECKS: readonly StandardCheck[] = [
  exactlyOneReactiveSourceIsInstalled,
  aPublicClassPublishesItsNamespaceManifest,
  aClassFileIsNamedAfterItsClass,
  aClassFileHoldsOnlyImportsClassNamespaceAndTypes,
  behaviorLivesOnThePrototypeNotInFields,
  constructionGoesThroughTheNamespaceClassSlot,
  theAnchorIsStaticOnlyWhenStaticsExist,
  staticBindsMethodsAndCachesDollarGettersPerReceiver,
  aSharedStoreIsAStaticReadonlyField,
  staticReadsGoThroughSelfNotTheBaseClass,
  mutableStateIsARefReturningGetter,
  aRefIsReadAndWrittenThroughValue,
  aDerivationIsAPlainGetterUnlessComputedIsJustified,
  aComposableIsInjectedByAOneCallDollarGetter,
  instanceTypesOnlyUnwrappingSurfaces,
  aComponentHasOneModelOwner,
  theStateDestructureIsTotal,
  templateExpressionsCarryNoLogic,
  watchLifetimeMatchesTheInstanceOwner,
  aReactiveClosureDelegatesToOneMethod,
  aStoreIsUsedLazilyAndSwappedAtTheClassSlot,
  keyedStateCreatesOnReadAndPeeksOnWrite,
  aGenericReactiveClassCastsItsConstructor,
  crossModuleClassReadsHappenInsideBodies,
  declarationsUseFullDescriptiveNames,
  classMembersAreOrderedAndSpaced,
  aTestFileOpensWithItsGeneratorHeader,
  aGeneratorHeaderCarriesBothRegistersInOrder,
  aHeaderSymbolIsDeclaredInTheSiblingSource,
  aClaimAnnotationSitsDirectlyAboveItsTest,
  headerClaimsAndAnnotatedTestsMatchOneToOne,
  anImpossibilityIsProvedByAnExactNegativeTest,
  aContractPointerResolvesAndIsProved,
  aSourceTripwireResolvesToItsSiblingHeader,
  aTestCaveatDerivesFromATestedClaim,
  thePopulationAndSkipListAreExact,
  twoTestFilesDoNotShareOneGeneratorHeader,
];

const CHECK_NAMES = new Set(CHECKS.map((entry) => entry.name));

// ---------------------------------------------------------------------------
// the gate

interface SkipRow {
  path: string;
  check: string;
  reason: string;
  line: number;
}

function readSkipList(cwd: string, path: string): SkipRow[] {
  const absolute = isAbsolute(path) ? path : resolve(cwd, path);
  if (!existsSync(absolute)) throw new GateUsageError(`skip-list not found: ${path}`);
  const rows: SkipRow[] = [];
  const seen = new Set<string>();
  readFileSync(absolute, 'utf8').split('\n').forEach((line, index) => {
    if (!line.trim() || line.startsWith('#')) return;
    const parts = line.split('\t');
    if (parts.length !== 3 || parts.some((part) => !part.trim()))
      throw new GateUsageError(`skip-list ${path}:${index + 1}: a row is path<TAB>check name<TAB>reason`);
    const [rowPath, checkName, reason] = parts.map((part) => part.trim());
    if (!CHECK_NAMES.has(checkName)) throw new GateUsageError(`skip-list ${path}:${index + 1}: unknown check name "${checkName}"`);
    const key = `${rowPath}\t${checkName}`;
    if (seen.has(key)) throw new GateUsageError(`skip-list ${path}:${index + 1}: duplicate skip for ${rowPath} / ${checkName}`);
    seen.add(key);
    rows.push({ path: rowPath.replaceAll('\\', '/'), check: checkName, reason, line: index + 1 });
  });
  return rows;
}

/** Discover, check, apply the skip-list. Throws GateUsageError on a refused population. */
export function runStandardGate(options: GateOptions): GateResult {
  const cwd = resolve(options.cwd);
  if (!options.sourceRoots.length) throw new GateUsageError('at least one --source-root is required');
  const testMatchers = options.testGlobs.map((glob) => ({ glob, regexp: globToRegExp(glob) }));
  const sources: SourceUnit[] = [];
  const tests: SourceUnit[] = [];
  const components: ComponentUnit[] = [];
  const isTest = (relativePath: string) => testMatchers.some((matcher) => matcher.regexp.test(relativePath));
  for (const root of options.sourceRoots) {
    const absoluteRoot = isAbsolute(root) ? root : resolve(cwd, root);
    if (!existsSync(absoluteRoot) || !statSync(absoluteRoot).isDirectory()) throw new GateUsageError(`source root is not a directory: ${root}`);
    for (const path of walk(absoluteRoot)) {
      if (path.endsWith('.vue')) {
        components.push(toComponent(cwd, path));
        continue;
      }
      if (!path.endsWith('.ts') || path.endsWith('.d.ts')) continue;
      const relativePath = relative(cwd, path).replaceAll('\\', '/');
      if (isTest(relativePath) || /\.(?:test|spec)\.ts$/.test(path)) {
        if (isTest(relativePath)) tests.push(toUnit(cwd, path));
        continue;
      }
      sources.push(toUnit(cwd, path));
    }
  }
  // test globs may also reach outside the source roots
  for (const matcher of testMatchers) {
    const base = matcher.glob.split(/[*?[]/)[0].replace(/\/[^/]*$/, '') || '.';
    const absoluteBase = resolve(cwd, base);
    if (!existsSync(absoluteBase)) continue;
    for (const path of walk(absoluteBase)) {
      const relativePath = relative(cwd, path).replaceAll('\\', '/');
      if (matcher.regexp.test(relativePath) && !tests.some((unit) => unit.path === path)) tests.push(toUnit(cwd, path));
    }
  }
  if (!sources.length) throw new GateUsageError(`no source files discovered under ${options.sourceRoots.join(', ')} — refusing to pass over nothing`);
  for (const matcher of testMatchers) {
    if (!tests.some((unit) => matcher.regexp.test(unit.relativePath))) throw new GateUsageError(`test glob matches no file: ${matcher.glob}`);
  }
  const skips = options.skipListPath ? readSkipList(cwd, options.skipListPath) : [];

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
  for (const entry of CHECKS) if (entry.enforced) raw.push(...entry.run(context));

  const findings: Finding[] = [];
  const suppressed: Finding[] = [];
  const used = new Set<SkipRow>();
  for (const item of raw) {
    const row = skips.find((skip) => skip.check === item.check && skip.path === item.file);
    if (row) {
      used.add(row);
      suppressed.push(item);
    } else findings.push(item);
  }
  for (const row of skips) {
    if (!used.has(row)) {
      const message = existsSync(resolve(cwd, row.path))
        ? `stale skip: "${row.check}" no longer fires on ${row.path} — remove the row`
        : `stale skip: ${row.path} does not exist — remove the row`;
      findings.push({ check: thePopulationAndSkipListAreExact.name, file: options.skipListPath ?? 'skip-list', line: row.line, message });
    }
  }
  findings.sort((first, second) => first.file.localeCompare(second.file) || first.line - second.line);
  return {
    findings,
    suppressed,
    sources: sources.map((unit) => unit.relativePath),
    tests: tests.map((unit) => unit.relativePath),
    unenforced: CHECKS.filter((entry) => !entry.enforced).map((entry) => entry.name),
  };
}

// ---------------------------------------------------------------------------
// CLI

const HELP = `ivue Standard gate — checks class sources and test files against skills/ivue/SKILL.md

usage:
  check-standard --source-root <dir> [--source-root <dir>…]
                 --test-glob '<glob>' [--test-glob '<glob>'…]
                 [--skip-list <path>]   rows: path<TAB>check name<TAB>reason
  check-standard --list                 print every check name

Exit: 0 clean · 1 findings · 2 usage (zero files, unmatched glob, unknown check
name, duplicate or stale skip row). Paths in findings are relative to the cwd.`;

/**
 * The consumer's `Static`, for the runtime probe: resolved from the cwd's
 * own dependency graph (`ivue/extras`), falling back to the engine source
 * when the gate runs inside the ivue repository itself. null = not loadable
 * (the probe then reports that, never a silent pass).
 */
export async function loadStaticImplementation(cwd: string): Promise<StaticTransform | null> {
  const candidates: string[] = [];
  try {
    candidates.push(createRequire(join(cwd, 'package.json')).resolve('ivue/extras'));
  } catch {
    /* not a dependency here */
  }
  candidates.push(resolve(cwd, 'lib/extras.ts'), resolve(dirname(new URL(import.meta.url).pathname), '../../lib/extras.ts'));
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      const loaded = (await import(pathToFileURL(candidate).href)) as { Static?: StaticTransform };
      if (typeof loaded.Static === 'function') return loaded.Static;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

export async function main(argv: string[], cwd = process.cwd()): Promise<number> {
  const sourceRoots: string[] = [];
  const testGlobs: string[] = [];
  let skipListPath: string | undefined;
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    const value = () => {
      const next = argv[++index];
      if (next === undefined) throw new GateUsageError(`${argument} needs a value`);
      return next;
    };
    try {
      if (argument === '--help' || argument === '-h') {
        console.log(HELP);
        return 0;
      } else if (argument === '--list') {
        for (const entry of CHECKS) console.log(`${entry.enforced ? 'enforced   ' : 'not yet    '} ${entry.name}`);
        return 0;
      } else if (argument === '--source-root') sourceRoots.push(value());
      else if (argument === '--test-glob') testGlobs.push(value());
      else if (argument === '--skip-list') skipListPath = value();
      else throw new GateUsageError(`unknown argument: ${argument}`);
    } catch (error) {
      console.error(`check-standard: ${(error as Error).message}`);
      return 2;
    }
  }
  let result: GateResult;
  try {
    const staticImplementation = await loadStaticImplementation(cwd);
    result = runStandardGate({ cwd, sourceRoots, testGlobs, skipListPath, staticImplementation });
  } catch (error) {
    if (error instanceof GateUsageError) {
      console.error(`check-standard: ${error.message}`);
      return 2;
    }
    throw error;
  }
  for (const item of result.findings) console.error(`${item.file}:${item.line}: [${item.check}] ${item.message}`);
  console.log(
    `check-standard: ${result.sources.length} source file(s), ${result.tests.length} test file(s), ` +
      `${result.findings.length} finding(s), ${result.suppressed.length} suppressed by skip-list`,
  );
  if (result.unenforced.length) console.log(`not enforced yet (${result.unenforced.length}): ${result.unenforced.join(' · ')}`);
  return result.findings.length ? 1 : 0;
}

// Entry detection that survives every runner: `node check-standard.js …`,
// `tsx check-standard.ts …`, and `vite-node check-standard.ts -- …` all leave
// the gate's own flags in argv; a test runner importing this module does not.
const cliArguments = process.argv.slice(2);
const invokedAsCli =
  !process.env.VITEST &&
  cliArguments.some((argument) => ['--source-root', '--test-glob', '--skip-list', '--list', '--help', '-h'].includes(argument));
if (invokedAsCli) void main(cliArguments).then((code) => process.exit(code));
