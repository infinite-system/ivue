/*
=== GENERATOR ===
Goal: A Standard gate that cannot certify itself — every one of its thirty-seven checks is proven able to fail on a planted defect and to pass on the conforming form, by tests that call the exact function the command line runs.
// domain-invariant: exactlyOneReactiveSourceIsInstalled — Exactly one Reactive source is installed: if the gate runs over a checkout, then it finds exactly one engine (an ivue dependency or one vendored Reactive), never zero and never two
// domain-invariant: aPublicClassPublishesItsNamespaceManifest — A public class publishes its namespace manifest: if a file declares a dollar-prefixed class, then it exports a namespace with dollar-Class, Class, and Instance for reactive classes, and no behavior is exported directly
// domain-invariant: aClassFileIsNamedAfterItsClass — A class file is named after its class: if a file declares dollar-X, then the file is X.ts and the namespace is X
// domain-invariant: aClassFileHoldsOnlyImportsClassNamespaceAndTypes — A class file holds only imports class namespace and types: if a file is a class file, then its top level is imports, the class, its namespace, and type declarations, nothing else
// domain-invariant: behaviorLivesOnThePrototypeNotInFields — Behavior lives on the prototype not in fields: if a class member is a function, then it is a method, never a function-valued field
// domain-invariant: constructionGoesThroughTheNamespaceClassSlot — Construction goes through the namespace Class slot: if an instance is created, then it is new X.Class, never new dollar-X, new X.dollar-Class, or reactive(new …)
// domain-invariant: theAnchorIsStaticOnlyWhenStaticsExist — The anchor is Static only when statics exist: if a class declares static members, then its anchor is Static(dollar-X), and if it declares none, then its anchor is the raw class
// domain-invariant: staticBindsMethodsAndCachesDollarGettersPerReceiver — Static binds methods and caches dollar getters per receiver: if the consumer's Static transforms a class, then its static methods are bound with stable identity and its dollar getters run once per receiver class
// domain-invariant: aSharedStoreIsAStaticReadonlyField — A shared store is a static readonly field: if a static holds shared state, then the field is readonly, and a dependency constructed at load lives in a LazyShared cell
// domain-invariant: staticReadsGoThroughSelfNotTheBaseClass — Static reads go through self not the base class: if instance code reads its own statics, then it reads this.self, never the base class name or a per-site constructor cast
// domain-invariant: mutableStateIsARefReturningGetter — Mutable state is a ref-returning getter: if a class holds mutable state, then it is a getter returning ref or shallowRef, never a mutable plain field
// domain-invariant: aRefIsReadAndWrittenThroughValue — A Ref is read and written through value: if class code writes a Ref getter, then it writes .value, never assigns over the getter
// domain-invariant: aDerivationIsAPlainGetterUnlessComputedIsJustified — A derivation is a plain getter unless computed is justified: if a getter allocates a computed, then a stated reason (expensive, render-suppression, stable-handle) sits above it
// domain-invariant: aComposableIsInjectedByAOneCallDollarGetter — A composable is injected by a one-call dollar getter: if a class uses a composable or store, then a dollar getter returns the one call, never an eager field
// domain-invariant: instanceTypesOnlyUnwrappingSurfaces — Instance types only unwrapping surfaces: if a raw collection or parameter is typed, then it uses Model, and if an unwrapping surface is typed, then it uses Instance
// domain-invariant: aComponentHasOneModelOwner — A component has one model owner: if a component has behavior, then exactly one class instance owns it and the script setup carries no parallel reactive behavior
// domain-invariant: theStateDestructureIsTotal — The state destructure is total: if a template touches a Ref, then that Ref is destructured, no plain getter or method is destructured, and no state binding shadows a prop
// domain-invariant: templateExpressionsCarryNoLogic — Template expressions carry no logic: if a template expression is written, then it is a named read, a method call, or a structural branch, never a comparison, ternary, negation, or built string
// domain-invariant: watchLifetimeMatchesTheInstanceOwner — Watch lifetime matches the instance owner: if a class is component-scoped, then it uses plain watch, and if it outlives components, then it uses dollar-watch with a dispose path
// domain-invariant: aReactiveClosureDelegatesToOneMethod — A reactive closure delegates to one method: if a computed or watch callback is written, then it is one arrow delegating to one method
// domain-invariant: aStoreIsUsedLazilyAndSwappedAtTheClassSlot — A store is used lazily and swapped at the Class slot: if shared state is published, then it constructs lazily behind use() and is never drilled as a prop or constructor argument
// domain-invariant: keyedStateCreatesOnReadAndPeeksOnWrite — Keyed state creates on read and peeks on write: if a class holds a Map of refs, then reads get-or-create, writes peek, and a release path exists
// domain-invariant: aGenericReactiveClassCastsItsConstructor — A generic reactive class casts its constructor: if a reactive class is generic, then Class is cast back to typeof dollar-Class and Instance applies ReactiveInstance by hand
// domain-invariant: crossModuleClassReadsHappenInsideBodies — Cross-module Class reads happen inside bodies: if a module reads another namespace's Class, then it does so inside a getter or method body, never at module evaluation
// domain-invariant: declarationsUseFullDescriptiveNames — Declarations use full descriptive names: if a name is declared in source or tests, then it is a domain word, never a single letter or a banned abbreviation
// domain-invariant: classMembersAreOrderedAndSpaced — Class members are ordered and spaced: if a class is written, then statics precede the constructor, the constructor precedes getters, methods come last and are separated by blank lines
// domain-invariant: aTestFileOpensWithItsGeneratorHeader — A test file opens with its generator header: if a file is a test, then its first content is the generator header
// domain-invariant: aGeneratorHeaderCarriesBothRegistersInOrder — A generator header carries both registers in order: if a header exists, then it has one Goal, the formal register, at least one Impossible if true, and the described register after the formal one
// domain-invariant: aHeaderSymbolIsDeclaredInTheSiblingSource — A header symbol is declared in the sibling source: if a header names a symbol, then the sibling source declares it
// domain-invariant: aClaimAnnotationSitsDirectlyAboveItsTest — A claim annotation sits directly above its test: if a proof annotation is written, then a test follows it directly
// domain-invariant: headerClaimsAndAnnotatedTestsMatchOneToOne — Header claims and annotated tests match one to one: if a header states a domain invariant, then an annotated test proves it, and every annotated claim is in the header
// domain-invariant: anImpossibilityIsProvedByAnExactNegativeTest — An impossibility is proved by an exact negative test: if a header states an impossibility, then an impossible-if-true test carries its exact text and a header symbol
// domain-invariant: aContractPointerResolvesAndIsProved — A contract pointer resolves and is proved: if a header links a contract record, then the anchor resolves and an annotated test proves it
// domain-invariant: aSourceTripwireResolvesToItsSiblingHeader — A source tripwire resolves to its sibling header: if source carries a domain-invariant tripwire, then it names only a symbol the sibling header claims
// domain-invariant: aTestCaveatDerivesFromATestedClaim — A test caveat derives from a tested claim: if the described register constrains, then the constraint names a header symbol
// domain-invariant: thePopulationAndSkipListAreExact — The population and skip-list are exact: if the gate runs, then it refuses zero files, unmatched globs, unknown check names, duplicate and stale skips
// domain-invariant: twoTestFilesDoNotShareOneGeneratorHeader — Two test files do not share one generator header: if two test files exist, then their Goal and described registers differ beyond their own symbol names
Impossible if true: a file breaking Exactly one Reactive source is installed passes the gate
Impossible if true: a file breaking A public class publishes its namespace manifest passes the gate
Impossible if true: a file breaking A class file is named after its class passes the gate
Impossible if true: a file breaking A class file holds only imports class namespace and types passes the gate
Impossible if true: a file breaking Behavior lives on the prototype not in fields passes the gate
Impossible if true: a file breaking Construction goes through the namespace Class slot passes the gate
Impossible if true: a file breaking The anchor is Static only when statics exist passes the gate
Impossible if true: a file breaking Static binds methods and caches dollar getters per receiver passes the gate
Impossible if true: a file breaking A shared store is a static readonly field passes the gate
Impossible if true: a file breaking Static reads go through self not the base class passes the gate
Impossible if true: a file breaking Mutable state is a ref-returning getter passes the gate
Impossible if true: a file breaking A Ref is read and written through value passes the gate
Impossible if true: a file breaking A derivation is a plain getter unless computed is justified passes the gate
Impossible if true: a file breaking A composable is injected by a one-call dollar getter passes the gate
Impossible if true: a file breaking Instance types only unwrapping surfaces passes the gate
Impossible if true: a file breaking A component has one model owner passes the gate
Impossible if true: a file breaking The state destructure is total passes the gate
Impossible if true: a file breaking Template expressions carry no logic passes the gate
Impossible if true: a file breaking Watch lifetime matches the instance owner passes the gate
Impossible if true: a file breaking A reactive closure delegates to one method passes the gate
Impossible if true: a file breaking A store is used lazily and swapped at the Class slot passes the gate
Impossible if true: a file breaking Keyed state creates on read and peeks on write passes the gate
Impossible if true: a file breaking A generic reactive class casts its constructor passes the gate
Impossible if true: a file breaking Cross-module Class reads happen inside bodies passes the gate
Impossible if true: a file breaking Declarations use full descriptive names passes the gate
Impossible if true: a file breaking Class members are ordered and spaced passes the gate
Impossible if true: a file breaking A test file opens with its generator header passes the gate
Impossible if true: a file breaking A generator header carries both registers in order passes the gate
Impossible if true: a file breaking A header symbol is declared in the sibling source passes the gate
Impossible if true: a file breaking A claim annotation sits directly above its test passes the gate
Impossible if true: a file breaking Header claims and annotated tests match one to one passes the gate
Impossible if true: a file breaking An impossibility is proved by an exact negative test passes the gate
Impossible if true: a file breaking A contract pointer resolves and is proved passes the gate
Impossible if true: a file breaking A source tripwire resolves to its sibling header passes the gate
Impossible if true: a file breaking A test caveat derives from a tested claim passes the gate
Impossible if true: a file breaking The population and skip-list are exact passes the gate
Impossible if true: a file breaking Two test files do not share one generator header passes the gate

=== GENERATOR-DESCRIBED ===
Direction of use: every test below writes a small fixture checkout into a
temporary directory and calls runStandardGate — the same function the CLI's
main() calls — so a green here is a green on the command line, and a helper
that passed on its own would prove nothing. Red arms plant the defect the
check exists to catch and assert the finding by check name; green arms hold
the conforming form from skills/ivue/SKILL.md and assert silence for that
one check only, so a fixture may be red on an unrelated check without
weakening the proof. The runtime probe (staticBindsMethodsAndCachesDollarGettersPerReceiver)
takes the engine's own Static in its green arm and an identity transform in
its red arm, which is how a runtime contract gets a planted failure without
editing the engine. Population refusals (thePopulationAndSkipListAreExact) are
GateUsageError throws, the gate's exit 2 — the one place a red is an error,
not a finding, because passing over nothing must be impossible.
*/
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { Static } from '../../lib/Static';
import {
  CHECKS,
  GateUsageError,
  aClaimAnnotationSitsDirectlyAboveItsTest,
  aClassFileHoldsOnlyImportsClassNamespaceAndTypes,
  aClassFileIsNamedAfterItsClass,
  aComponentHasOneModelOwner,
  aComposableIsInjectedByAOneCallDollarGetter,
  aContractPointerResolvesAndIsProved,
  aDerivationIsAPlainGetterUnlessComputedIsJustified,
  aGeneratorHeaderCarriesBothRegistersInOrder,
  aGenericReactiveClassCastsItsConstructor,
  aHeaderSymbolIsDeclaredInTheSiblingSource,
  aPublicClassPublishesItsNamespaceManifest,
  aReactiveClosureDelegatesToOneMethod,
  aRefIsReadAndWrittenThroughValue,
  aSharedStoreIsAStaticReadonlyField,
  aSourceTripwireResolvesToItsSiblingHeader,
  aStoreIsUsedLazilyAndSwappedAtTheClassSlot,
  aTestCaveatDerivesFromATestedClaim,
  aTestFileOpensWithItsGeneratorHeader,
  anImpossibilityIsProvedByAnExactNegativeTest,
  behaviorLivesOnThePrototypeNotInFields,
  classMembersAreOrderedAndSpaced,
  constructionGoesThroughTheNamespaceClassSlot,
  crossModuleClassReadsHappenInsideBodies,
  declarationsUseFullDescriptiveNames,
  exactlyOneReactiveSourceIsInstalled,
  headerClaimsAndAnnotatedTestsMatchOneToOne,
  instanceTypesOnlyUnwrappingSurfaces,
  keyedStateCreatesOnReadAndPeeksOnWrite,
  main,
  mutableStateIsARefReturningGetter,
  runStandardGate,
  staticBindsMethodsAndCachesDollarGettersPerReceiver,
  staticReadsGoThroughSelfNotTheBaseClass,
  templateExpressionsCarryNoLogic,
  theAnchorIsStaticOnlyWhenStaticsExist,
  thePopulationAndSkipListAreExact,
  theStateDestructureIsTotal,
  twoTestFilesDoNotShareOneGeneratorHeader,
  watchLifetimeMatchesTheInstanceOwner,
  type Finding,
  type GateOptions,
  type StandardCheck,
} from './check-standard';

// The grammar's tokens, assembled at runtime: fixtures below are DATA, and a
// literal sentinel or annotation in them would read as this file's own header
// or proof to the invariants checker.
const SENTINEL = ['===', 'GENERATOR', '==='].join(' ');
const DESCRIBED = ['===', 'GENERATOR-DESCRIBED', '==='].join(' ');
const DOMAIN = 'domain-' + 'invariant';
const IMPOSSIBLE = 'impossible-if-' + 'true';
const INVARIANT = 'inv' + 'ariant';

// ---------------------------------------------------------------------------
// fixture checkout: files under src/, an ivue dependency, the real Static

const checkouts: string[] = [];
afterEach(() => {
  for (const checkout of checkouts.splice(0)) rmSync(checkout, { recursive: true, force: true });
});

function checkout(files: Record<string, string>, manifest: Record<string, unknown> = { name: 'consumer', dependencies: { ivue: '^2.4.0' } }): string {
  const root = mkdtempSync(join(tmpdir(), 'ivue-gate-'));
  checkouts.push(root);
  writeFileSync(join(root, 'package.json'), JSON.stringify(manifest));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

function gate(files: Record<string, string>, overrides: Partial<GateOptions> = {}, manifest?: Record<string, unknown>) {
  const root = checkout(files, manifest);
  const hasTests = Object.keys(files).some((path) => path.endsWith('.test.ts'));
  return runStandardGate({
    cwd: root,
    sourceRoots: ['src'],
    testGlobs: hasTests ? ['src/**/*.test.ts'] : [],
    staticImplementation: Static,
    ...overrides,
  });
}

function findingsFor(check: StandardCheck, findings: Finding[]): Finding[] {
  return findings.filter((entry) => entry.check === check.name);
}

const VALID_CLASS = `import { ref, watch } from 'vue';
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

const VALID_TEST = `/*
${SENTINEL}
Goal: Prove the box grows by exactly one height unit per grow call and that height never moves on its own.
// ${DOMAIN}: $Box — If grow is called, then height increases by one
Impossible if true: height decreases without a grow call

${DESCRIBED}
The $Box height is the only mutable state, so growth is the single write path the tests must hold.
*/
import { expect, test } from 'vitest';
import { Box } from './Box';

// ${DOMAIN}: $Box — If grow is called, then height increases by one
test('grow raises height by one', () => {
  const box = new Box.Class({ width: 2 });
  box.grow();
  expect(box.height.value).toBe(5);
});

// ${IMPOSSIBLE}: $Box — height decreases without a grow call
test('height never decreases on its own', () => {
  const box = new Box.Class({ width: 2 });
  expect(box.height.value).toBe(4);
});
`;

const VALID_SFC = `<script setup lang="ts">
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

// the manifest itself: thirty-seven checks, every one enforced
test('the manifest names thirty-seven enforced checks by sentence', () => {
  expect(CHECKS).toHaveLength(37);
  expect(CHECKS.every((entry) => entry.enforced)).toBe(true);
  expect(CHECKS.every((entry) => /^[A-Z][A-Za-z0-9 -]+$/.test(entry.name))).toBe(true);
  expect(new Set(CHECKS.map((entry) => entry.name)).size).toBe(37);
});

// ---------------------------------------------------------------------------
// 1 Exactly one Reactive source is installed

// impossible-if-true: exactlyOneReactiveSourceIsInstalled — a file breaking Exactly one Reactive source is installed passes the gate
test('rejects dependency plus vendored Reactive', () => {
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Reactive.ts': 'export function Reactive<C>(targetClass: C): C { return targetClass; }\n' });
  expect(findingsFor(exactlyOneReactiveSourceIsInstalled, result.findings)[0]?.message).toMatch(/2 Reactive sources/);
});

// domain-invariant: exactlyOneReactiveSourceIsInstalled — Exactly one Reactive source is installed: if the gate runs over a checkout, then it finds exactly one engine (an ivue dependency or one vendored Reactive), never zero and never two
test('accepts one installed or vendored Reactive source', () => {
  const installed = gate({ 'src/Box.ts': VALID_CLASS });
  expect(findingsFor(exactlyOneReactiveSourceIsInstalled, installed.findings)).toEqual([]);
  const vendored = gate({ 'src/Box.ts': VALID_CLASS, 'src/ivue.ts': "export { Reactive } from '../engine/Reactive';\n" }, {}, { name: 'consumer' });
  expect(findingsFor(exactlyOneReactiveSourceIsInstalled, vendored.findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 2 A public class publishes its namespace manifest

// impossible-if-true: aPublicClassPublishesItsNamespaceManifest — a file breaking A public class publishes its namespace manifest passes the gate
test('rejects a public class without its complete namespace manifest', () => {
  const missingInstance = VALID_CLASS.replace('  export type Instance = typeof Class.Instance;\n', '');
  const result = gate({
    'src/Box.ts': missingInstance,
    'src/Tools.ts': 'export const tools = { run() { return 1; } };\n',
  });
  const findings = findingsFor(aPublicClassPublishesItsNamespaceManifest, result.findings);
  expect(findings.map((entry) => entry.message)).toEqual([
    expect.stringMatching(/lacks `export type Instance/),
    expect.stringMatching(/behavioral object is exported directly/),
  ]);
});

// domain-invariant: aPublicClassPublishesItsNamespaceManifest — A public class publishes its namespace manifest: if a file declares a dollar-prefixed class, then it exports a namespace with dollar-Class, Class, and Instance for reactive classes, and no behavior is exported directly
test('accepts reactive static and plain manifests', () => {
  const staticClass = `import { Static } from 'ivue/extras';

class $Format {
  static orDash(value: string | null) {
    return value ?? '—';
  }
}

export namespace Format {
  export const $Class = Static($Format);
  export let Class = $Class;
}
`;
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Format.ts': staticClass });
  expect(findingsFor(aPublicClassPublishesItsNamespaceManifest, result.findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 3 A class file is named after its class

// impossible-if-true: aClassFileIsNamedAfterItsClass — a file breaking A class file is named after its class passes the gate
test('rejects a class whose file class and namespace names differ', () => {
  const result = gate({ 'src/Crate.ts': VALID_CLASS });
  expect(findingsFor(aClassFileIsNamedAfterItsClass, result.findings)[0]?.message).toMatch(/`Crate\.ts` declares `\$Box`/);
});

// domain-invariant: aClassFileIsNamedAfterItsClass — A class file is named after its class: if a file declares dollar-X, then the file is X.ts and the namespace is X
test('accepts an eponymous class file', () => {
  expect(findingsFor(aClassFileIsNamedAfterItsClass, gate({ 'src/Box.ts': VALID_CLASS }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 4 A class file holds only imports class namespace and types

// impossible-if-true: aClassFileHoldsOnlyImportsClassNamespaceAndTypes — a file breaking A class file holds only imports class namespace and types passes the gate
test('rejects behavior or data outside the class seam', () => {
  const result = gate({ 'src/Box.ts': `${VALID_CLASS}\nconst DEFAULT_WIDTH = 4;\nexport function widen(box: Box.Instance) { return box.area; }\n` });
  expect(findingsFor(aClassFileHoldsOnlyImportsClassNamespaceAndTypes, result.findings)).toHaveLength(2);
});

// domain-invariant: aClassFileHoldsOnlyImportsClassNamespaceAndTypes — A class file holds only imports class namespace and types: if a file is a class file, then its top level is imports, the class, its namespace, and type declarations, nothing else
test('accepts imports class namespace and trailing types', () => {
  const result = gate({ 'src/Box.ts': `${VALID_CLASS}\nexport type BoxSeed = { width: number };\nexport interface BoxEmits { (event: 'grown'): void }\n` });
  expect(findingsFor(aClassFileHoldsOnlyImportsClassNamespaceAndTypes, result.findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 5 Behavior lives on the prototype not in fields

// impossible-if-true: behaviorLivesOnThePrototypeNotInFields — a file breaking Behavior lives on the prototype not in fields passes the gate
test('rejects a function-valued class field', () => {
  const result = gate({ 'src/Box.ts': VALID_CLASS.replace('  grow() {\n    this.height.value++;\n  }', '  grow = () => {\n    this.height.value++;\n  };') });
  expect(findingsFor(behaviorLivesOnThePrototypeNotInFields, result.findings)[0]?.message).toMatch(/`grow` is a function-valued field/);
});

// domain-invariant: behaviorLivesOnThePrototypeNotInFields — Behavior lives on the prototype not in fields: if a class member is a function, then it is a method, never a function-valued field
test('accepts a prototype method', () => {
  expect(findingsFor(behaviorLivesOnThePrototypeNotInFields, gate({ 'src/Box.ts': VALID_CLASS }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 6 Construction goes through the namespace Class slot

// impossible-if-true: constructionGoesThroughTheNamespaceClassSlot — a file breaking Construction goes through the namespace Class slot passes the gate
test('rejects raw construction and standard-path reactive wrapping', () => {
  const factory = `import { reactive } from 'vue';
import { Box, $Box } from './Box';

class $BoxFactory {
  makeRaw() {
    return new $Box({ width: 1 });
  }

  makeAnchor() {
    return new Box.$Class({ width: 1 });
  }

  makeWrapped() {
    return reactive(new Box.Class({ width: 1 }));
  }
}

export namespace BoxFactory {
  export const $Class = $BoxFactory;
  export let Class = $Class;
}
`;
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/BoxFactory.ts': factory });
  expect(findingsFor(constructionGoesThroughTheNamespaceClassSlot, result.findings)).toHaveLength(3);
});

// domain-invariant: constructionGoesThroughTheNamespaceClassSlot — Construction goes through the namespace Class slot: if an instance is created, then it is new X.Class, never new dollar-X, new X.dollar-Class, or reactive(new …)
test('accepts new Namespace Class construction', () => {
  const factory = `import { Box } from './Box';

class $BoxFactory {
  make() {
    return new Box.Class({ width: 1 });
  }
}

export namespace BoxFactory {
  export const $Class = $BoxFactory;
  export let Class = $Class;
}
`;
  expect(findingsFor(constructionGoesThroughTheNamespaceClassSlot, gate({ 'src/Box.ts': VALID_CLASS, 'src/BoxFactory.ts': factory }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 7 The anchor is Static only when statics exist

const STATIC_CLASS = `import { Static } from 'ivue/extras';

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

// impossible-if-true: theAnchorIsStaticOnlyWhenStaticsExist — a file breaking The anchor is Static only when statics exist passes the gate
test('rejects a statics-bearing raw anchor and a statics-free Static anchor', () => {
  const rawAnchor = STATIC_CLASS.replace('export const $Class = Static($Clock);', 'export const $Class = $Clock;');
  const staticFree = VALID_CLASS.replace("import { Reactive } from 'ivue';", "import { Reactive } from 'ivue';\nimport { Static } from 'ivue/extras';").replace('export const $Class = $Box;', 'export const $Class = Static($Box);');
  const result = gate({ 'src/Clock.ts': rawAnchor, 'src/Box.ts': staticFree });
  expect(findingsFor(theAnchorIsStaticOnlyWhenStaticsExist, result.findings).map((entry) => entry.file).sort()).toEqual(['src/Box.ts', 'src/Clock.ts']);
});

// domain-invariant: theAnchorIsStaticOnlyWhenStaticsExist — The anchor is Static only when statics exist: if a class declares static members, then its anchor is Static(dollar-X), and if it declares none, then its anchor is the raw class
test('accepts honest static reactive and plain anchors', () => {
  expect(findingsFor(theAnchorIsStaticOnlyWhenStaticsExist, gate({ 'src/Clock.ts': STATIC_CLASS, 'src/Box.ts': VALID_CLASS }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 8 Static binds methods and caches dollar getters per receiver

// impossible-if-true: staticBindsMethodsAndCachesDollarGettersPerReceiver — a file breaking Static binds methods and caches dollar getters per receiver passes the gate
test('fails when Static does not bind methods or cache dollar getters per receiver', () => {
  const identity = <Class extends new (...arguments_: any[]) => any>(targetClass: Class) => targetClass;
  const result = gate({ 'src/Box.ts': VALID_CLASS }, { staticImplementation: identity });
  const messages = findingsFor(staticBindsMethodsAndCachesDollarGettersPerReceiver, result.findings).map((entry) => entry.message);
  expect(messages).toEqual(expect.arrayContaining([expect.stringMatching(/does not bind static methods/), expect.stringMatching(/does not cache a dollar getter once per receiver/)]));
  const unloaded = gate({ 'src/Box.ts': VALID_CLASS }, { staticImplementation: null });
  expect(findingsFor(staticBindsMethodsAndCachesDollarGettersPerReceiver, unloaded.findings)[0]?.message).toMatch(/could not be loaded/);
});

// domain-invariant: staticBindsMethodsAndCachesDollarGettersPerReceiver — Static binds methods and caches dollar getters per receiver: if the consumer's Static transforms a class, then its static methods are bound with stable identity and its dollar getters run once per receiver class
test('passes binding caching and subclass receiver probes', () => {
  expect(findingsFor(staticBindsMethodsAndCachesDollarGettersPerReceiver, gate({ 'src/Box.ts': VALID_CLASS }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 9 A shared store is a static readonly field

// impossible-if-true: aSharedStoreIsAStaticReadonlyField — a file breaking A shared store is a static readonly field passes the gate
test('rejects a mutable shared store and dependencyful eager field', () => {
  const registry = `import { Static } from 'ivue/extras';
import { Box } from './Box';

class $Registry {
  static formatters = new Map<string, Intl.DateTimeFormat>();
  static readonly defaultBox = new Box.Class({ width: 1 });
}

export namespace Registry {
  export const $Class = Static($Registry);
  export let Class = $Class;
}
`;
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Registry.ts': registry });
  expect(findingsFor(aSharedStoreIsAStaticReadonlyField, result.findings).map((entry) => entry.message)).toEqual([
    expect.stringMatching(/mutable shared store/),
    expect.stringMatching(/constructs another namespace's class at module load/),
  ]);
});

// domain-invariant: aSharedStoreIsAStaticReadonlyField — A shared store is a static readonly field: if a static holds shared state, then the field is readonly, and a dependency constructed at load lives in a LazyShared cell
test('accepts readonly shared store and LazyShared dependency', () => {
  const registry = `import { LazyShared, Static } from 'ivue/extras';
import { Box } from './Box';

class $Registry {
  static readonly formatters = new Map<string, Intl.DateTimeFormat>();
  static readonly sharedBox = new LazyShared(() => new Box.Class({ width: 1 }));
}

export namespace Registry {
  export const $Class = Static($Registry);
  export let Class = $Class;
}
`;
  expect(findingsFor(aSharedStoreIsAStaticReadonlyField, gate({ 'src/Box.ts': VALID_CLASS, 'src/Registry.ts': registry }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 10 Static reads go through self not the base class

const SELF_CLASS = (reads: string) => `import { Reactive } from 'ivue';
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

// impossible-if-true: staticReadsGoThroughSelfNotTheBaseClass — a file breaking Static reads go through self not the base class passes the gate
test('rejects base-pinned namespace and per-site constructor casts', () => {
  const result = gate({ 'src/Tooltip.ts': SELF_CLASS('return $Tooltip.DELAY_MS + (this.constructor as typeof $Tooltip).DELAY_MS;') });
  expect(findingsFor(staticReadsGoThroughSelfNotTheBaseClass, result.findings)).toHaveLength(2);
});

// domain-invariant: staticReadsGoThroughSelfNotTheBaseClass — Static reads go through self not the base class: if instance code reads its own statics, then it reads this.self, never the base class name or a per-site constructor cast
test('accepts self reads hoists and fixed-base skip', () => {
  const result = gate({ 'src/Tooltip.ts': SELF_CLASS('const self = this.self;\n    return self.DELAY_MS + self.DELAY_MS;') });
  expect(findingsFor(staticReadsGoThroughSelfNotTheBaseClass, result.findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 11 Mutable state is a ref-returning getter

// impossible-if-true: mutableStateIsARefReturningGetter — a file breaking Mutable state is a ref-returning getter passes the gate
test('rejects a mutable plain state field', () => {
  const result = gate({ 'src/Box.ts': VALID_CLASS.replace('  get height() {', '  count = 0;\n\n  get height() {') });
  expect(findingsFor(mutableStateIsARefReturningGetter, result.findings)[0]?.message).toMatch(/`count` is a mutable plain field/);
});

// domain-invariant: mutableStateIsARefReturningGetter — Mutable state is a ref-returning getter: if a class holds mutable state, then it is a getter returning ref or shallowRef, never a mutable plain field
test('accepts ref and shallowRef state getters', () => {
  const withRows = VALID_CLASS.replace("import { ref, watch } from 'vue';", "import { ref, shallowRef, watch } from 'vue';").replace('  get width() {', '  get rows() {\n    return shallowRef<number[]>([]);\n  }\n  get width() {');
  expect(findingsFor(mutableStateIsARefReturningGetter, gate({ 'src/Box.ts': withRows }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 12 A Ref is read and written through value

// impossible-if-true: aRefIsReadAndWrittenThroughValue — a file breaking A Ref is read and written through value passes the gate
test('rejects a raw Ref write and instance-template Ref read', () => {
  const rawWrite = VALID_CLASS.replace('    this.height.value++;', '    this.height = 9;');
  const result = gate({ 'src/Box.ts': rawWrite });
  expect(findingsFor(aRefIsReadAndWrittenThroughValue, result.findings)[0]?.message).toMatch(/assigns over a Ref getter/);
});

// domain-invariant: aRefIsReadAndWrittenThroughValue — A Ref is read and written through value: if class code writes a Ref getter, then it writes .value, never assigns over the getter
test('accepts value writes and destructured template bindings', () => {
  expect(findingsFor(aRefIsReadAndWrittenThroughValue, gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.vue': VALID_SFC }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 13 A derivation is a plain getter unless computed is justified

// impossible-if-true: aDerivationIsAPlainGetterUnlessComputedIsJustified — a file breaking A derivation is a plain getter unless computed is justified passes the gate
test('rejects unjustified or fat computed derivation', () => {
  const unjustified = VALID_CLASS.replace("import { ref, watch } from 'vue';", "import { computed, ref, watch } from 'vue';").replace('  get area() {\n    return this.width * this.height.value;\n  }', '  get area() {\n    return computed(() => this.width * this.height.value);\n  }');
  const result = gate({ 'src/Box.ts': unjustified });
  expect(findingsFor(aDerivationIsAPlainGetterUnlessComputedIsJustified, result.findings)[0]?.message).toMatch(/without a stated reason/);
  expect(findingsFor(aReactiveClosureDelegatesToOneMethod, result.findings)[0]?.message).toMatch(/carries logic/);
});

// domain-invariant: aDerivationIsAPlainGetterUnlessComputedIsJustified — A derivation is a plain getter unless computed is justified: if a getter allocates a computed, then a stated reason (expensive, render-suppression, stable-handle) sits above it
test('accepts a plain getter and justified thin computed', () => {
  const justified = VALID_CLASS.replace("import { ref, watch } from 'vue';", "import { computed, ref, watch } from 'vue';").replace('  grow() {', '  // computed: expensive — sorts every row\n  get sortedRows() {\n    return computed(() => this.sortRows());\n  }\n\n  sortRows() {\n    return [this.area];\n  }\n\n  grow() {');
  expect(findingsFor(aDerivationIsAPlainGetterUnlessComputedIsJustified, gate({ 'src/Box.ts': justified }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 14 A composable is injected by a one-call dollar getter

// impossible-if-true: aComposableIsInjectedByAOneCallDollarGetter — a file breaking A composable is injected by a one-call dollar getter passes the gate
test('rejects an eager composable field and fat dollar getter', () => {
  const eager = VALID_CLASS.replace('  get height() {', "  mouse = useMouse();\n\n  private get $project() {\n    const store = useProjectStore();\n    store.warm();\n    return store;\n  }\n\n  get height() {").replace("import { ref, watch } from 'vue';", "import { ref, watch } from 'vue';\nimport { useMouse } from '@vueuse/core';\nimport { useProjectStore } from './stores';");
  const result = gate({ 'src/Box.ts': eager });
  expect(findingsFor(aComposableIsInjectedByAOneCallDollarGetter, result.findings).map((entry) => entry.message)).toEqual([expect.stringMatching(/runs at construction/), expect.stringMatching(/does more than one call/)]);
});

// domain-invariant: aComposableIsInjectedByAOneCallDollarGetter — A composable is injected by a one-call dollar getter: if a class uses a composable or store, then a dollar getter returns the one call, never an eager field
test('accepts a one-call dollar getter', () => {
  const lazy = VALID_CLASS.replace('  get height() {', '  private get $project() {\n    return useProjectStore();\n  }\n\n  get height() {').replace("import { ref, watch } from 'vue';", "import { ref, watch } from 'vue';\nimport { useProjectStore } from './stores';");
  expect(findingsFor(aComposableIsInjectedByAOneCallDollarGetter, gate({ 'src/Box.ts': lazy }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 15 Instance types only unwrapping surfaces

// impossible-if-true: instanceTypesOnlyUnwrappingSurfaces — a file breaking Instance types only unwrapping surfaces passes the gate
test('rejects Instance in a raw collection and Model on an unwrap surface', () => {
  const shelf = `import { shallowRef } from 'vue';
import { Reactive } from 'ivue';
import { Box } from './Box';

class $Shelf {
  get boxes() {
    return shallowRef<Box.Instance[]>([]);
  }

  widest(box: Box.Instance) {
    return box.area;
  }
}

export namespace Shelf {
  export const $Class = $Shelf;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
`;
  const sfc = VALID_SFC.replace('defineExpose(box as Box.Instance);', 'defineExpose(box as Box.Model);');
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Shelf.ts': shelf, 'src/Box.vue': sfc });
  const messages = findingsFor(instanceTypesOnlyUnwrappingSurfaces, result.findings).map((entry) => entry.message);
  expect(messages).toHaveLength(3);
  expect(messages.filter((message) => /`Box\.Instance` types a raw graph position/.test(message))).toHaveLength(2);
  expect(messages.filter((message) => /`Box\.Model` on an unwrapping surface/.test(message))).toHaveLength(1);
});

// domain-invariant: instanceTypesOnlyUnwrappingSurfaces — Instance types only unwrapping surfaces: if a raw collection or parameter is typed, then it uses Model, and if an unwrapping surface is typed, then it uses Instance
test('accepts Model raw graphs and Instance unwrap surfaces', () => {
  const box = VALID_CLASS.replace('  export type Instance = typeof Class.Instance;', '  export type Model = InstanceType<typeof Class>;\n  export type Instance = typeof Class.Instance;');
  const shelf = `import { shallowRef } from 'vue';
import { Reactive } from 'ivue';
import { Box } from './Box';

class $Shelf {
  get boxes() {
    return shallowRef<Box.Model[]>([]);
  }

  widest(box: Box.Model) {
    return box.area;
  }
}

export namespace Shelf {
  export const $Class = $Shelf;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
`;
  expect(findingsFor(instanceTypesOnlyUnwrappingSurfaces, gate({ 'src/Box.ts': box, 'src/Shelf.ts': shelf, 'src/Box.vue': VALID_SFC }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 16 A component has one model owner

// impossible-if-true: aComponentHasOneModelOwner — a file breaking A component has one model owner passes the gate
test('rejects parallel setup behavior and two model constructions', () => {
  const sfc = VALID_SFC.replace("const box = new Box.Class(props);", "import { ref, watch } from 'vue';\nconst box = new Box.Class(props);\nconst spare = new Box.Class(props);\nconst open = ref(false);\nwatch(open, () => box.grow());\nfunction toggle() { open.value = !open.value; }");
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.vue': sfc });
  expect(findingsFor(aComponentHasOneModelOwner, result.findings).map((entry) => entry.message)).toEqual(expect.arrayContaining([
    expect.stringMatching(/second model is constructed/),
    expect.stringMatching(/`ref\(\)` in `<script setup>`/),
    expect.stringMatching(/`watch\(\)` in `<script setup>`/),
    expect.stringMatching(/free function `toggle`/),
  ]));
});

// domain-invariant: aComponentHasOneModelOwner — A component has one model owner: if a component has behavior, then exactly one class instance owns it and the script setup carries no parallel reactive behavior
test('accepts one wiring-only model owner', () => {
  expect(findingsFor(aComponentHasOneModelOwner, gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.vue': VALID_SFC }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 17 The state destructure is total

// impossible-if-true: theStateDestructureIsTotal — a file breaking The state destructure is total passes the gate
test('rejects missing Ref binding plain getter destructure and prop shadow', () => {
  const sfc = `<script setup lang="ts">
import { Box } from './Box';

const props = defineProps<{ width: number }>();
const box = new Box.Class(props);
const { area, grow, width } = box;

defineExpose(box as Box.Instance);
</script>

<template>
  <div v-if="box.height">{{ area }}</div>
  <button @click="grow()">{{ width }}</button>
</template>
`;
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.vue': sfc });
  expect(findingsFor(theStateDestructureIsTotal, result.findings).map((entry) => entry.message)).toEqual(expect.arrayContaining([
    expect.stringMatching(/`area` is a plain getter/),
    expect.stringMatching(/`grow` is a method/),
    expect.stringMatching(/`width` shadows the prop/),
    expect.stringMatching(/`box\.height` reaches a Ref through the instance/),
  ]));
});

// domain-invariant: theStateDestructureIsTotal — The state destructure is total: if a template touches a Ref, then that Ref is destructured, no plain getter or method is destructured, and no state binding shadows a prop
test('accepts total grouped Ref destructure', () => {
  expect(findingsFor(theStateDestructureIsTotal, gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.vue': VALID_SFC }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 18 Template expressions carry no logic

// impossible-if-true: templateExpressionsCarryNoLogic — a file breaking Template expressions carry no logic passes the gate
test('rejects a template comparison ternary or built string', () => {
  const sfc = VALID_SFC.replace('<div v-if="height > 0">{{ box.area }}</div>', '<div v-if="height > 0 && box.area">{{ box.area ? \'big\' : \'small\' }}</div>\n  <span :title="`Box ${box.area}`">{{ !height }}</span>');
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.vue': sfc });
  expect(findingsFor(templateExpressionsCarryNoLogic, result.findings).map((entry) => entry.message)).toEqual([
    expect.stringMatching(/`&&` expression/),
    expect.stringMatching(/a ternary/),
    expect.stringMatching(/a built string/),
    expect.stringMatching(/a negation/),
  ]);
});

// domain-invariant: templateExpressionsCarryNoLogic — Template expressions carry no logic: if a template expression is written, then it is a named read, a method call, or a structural branch, never a comparison, ternary, negation, or built string
test('accepts named getters methods and structural branches', () => {
  const sfc = VALID_SFC.replace('<div v-if="height > 0">{{ box.area }}</div>', '<div v-if="box.hasHeight">{{ box.area }}</div>\n  <ul><li v-for="row in box.rows" :key="row.id" :class="{ wide: box.isWide(row) }">{{ row.name }}</li></ul>');
  expect(findingsFor(templateExpressionsCarryNoLogic, gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.vue': sfc }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 19 Watch lifetime matches the instance owner

// impossible-if-true: watchLifetimeMatchesTheInstanceOwner — a file breaking Watch lifetime matches the instance owner passes the gate
test('rejects component dollar watch and outliving plain watch', () => {
  const componentDollar = VALID_CLASS.replace('    watch(\n      () => this.height.value,', '    this.$watch(\n      () => this.height.value,');
  const session = `import { ref, watch } from 'vue';
import { Reactive } from 'ivue';

class $Session {
  constructor() {
    watch(() => this.user.value, (user) => this.onUser(user));
  }

  get user() {
    return ref<string | null>(null);
  }

  onUser(user: string | null) {
    return user;
  }
}

export namespace Session {
  export const $Class = $Session;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  let singleton: Instance | null = null;
  export function use(): Instance {
    return (singleton ??= new Class());
  }
}
`;
  const result = gate({ 'src/Box.ts': componentDollar, 'src/Box.vue': VALID_SFC, 'src/Session.ts': session });
  expect(findingsFor(watchLifetimeMatchesTheInstanceOwner, result.findings).map((entry) => entry.message)).toEqual(expect.arrayContaining([
    expect.stringMatching(/constructed in a component's setup but uses `this\.\$watch`/),
    expect.stringMatching(/no dispose path/),
    expect.stringMatching(/outlives components .* but uses plain `watch`/),
  ]));
});

// domain-invariant: watchLifetimeMatchesTheInstanceOwner — Watch lifetime matches the instance owner: if a class is component-scoped, then it uses plain watch, and if it outlives components, then it uses dollar-watch with a dispose path
test('accepts scoped watch and owned dollar-watch cleanup', () => {
  const session = `import { ref } from 'vue';
import { Reactive } from 'ivue';

class $Session {
  constructor() {
    this.$watch(() => this.user.value, (user) => this.onUser(user));
  }

  get user() {
    return ref<string | null>(null);
  }

  onUser(user: string | null) {
    return user;
  }

  dispose() {
    this.$stopEffects();
  }
}

export namespace Session {
  export const $Class = $Session;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  let singleton: Instance | null = null;
  export function use(): Instance {
    return (singleton ??= new Class());
  }
}
`;
  expect(findingsFor(watchLifetimeMatchesTheInstanceOwner, gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.vue': VALID_SFC, 'src/Session.ts': session }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 20 A reactive closure delegates to one method

// impossible-if-true: aReactiveClosureDelegatesToOneMethod — a file breaking A reactive closure delegates to one method passes the gate
test('rejects an inline computed or watch body and direct method getter', () => {
  const fat = VALID_CLASS.replace("import { ref, watch } from 'vue';", "import { computed, ref, watch } from 'vue';").replace('      (newHeight, oldHeight) => this.onResize(newHeight, oldHeight),', '      (newHeight) => {\n        if (newHeight > 10) this.grow();\n      },').replace('  grow() {', '  // computed: expensive\n  get doubled() {\n    return computed(this.grow);\n  }\n\n  grow() {');
  const result = gate({ 'src/Box.ts': fat });
  expect(findingsFor(aReactiveClosureDelegatesToOneMethod, result.findings).map((entry) => entry.message)).toEqual([expect.stringMatching(/watch callback carries logic/), expect.stringMatching(/passes the method directly/)]);
});

// domain-invariant: aReactiveClosureDelegatesToOneMethod — A reactive closure delegates to one method: if a computed or watch callback is written, then it is one arrow delegating to one method
test('accepts one arrow delegate to one method', () => {
  expect(findingsFor(aReactiveClosureDelegatesToOneMethod, gate({ 'src/Box.ts': VALID_CLASS }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 21 A store is used lazily and swapped at the Class slot

// impossible-if-true: aStoreIsUsedLazilyAndSwappedAtTheClassSlot — a file breaking A store is used lazily and swapped at the Class slot passes the gate
test('rejects a shared model prop and eager singleton', () => {
  const eager = `${VALID_CLASS}\nexport const store = new Box.Class({ width: 1 });\n`;
  const sfc = VALID_SFC.replace('defineProps<{ width: number }>()', 'defineProps<{ width: number; app: Box.Instance }>()');
  const result = gate({ 'src/Box.ts': eager, 'src/Box.vue': sfc });
  expect(findingsFor(aStoreIsUsedLazilyAndSwappedAtTheClassSlot, result.findings).map((entry) => entry.message)).toEqual(expect.arrayContaining([
    expect.stringMatching(/constructs a singleton at module load/),
    expect.stringMatching(/prop `app: Box\.Instance` drills a shared model/),
  ]));
});

// domain-invariant: aStoreIsUsedLazilyAndSwappedAtTheClassSlot — A store is used lazily and swapped at the Class slot: if shared state is published, then it constructs lazily behind use() and is never drilled as a prop or constructor argument
test('accepts lazy use dollar injection and Class-slot swap', () => {
  const store = VALID_CLASS.replace('  export type Instance = typeof Class.Instance;\n}', '  export type Instance = typeof Class.Instance;\n\n  let singleton: Instance | null = null;\n  export function use(): Instance {\n    return (singleton ??= new Class({ width: 1 }));\n  }\n}');
  const consumer = VALID_SFC.replace('const box = new Box.Class(props);', 'const box = Box.use();');
  expect(findingsFor(aStoreIsUsedLazilyAndSwappedAtTheClassSlot, gate({ 'src/Box.ts': store, 'src/Box.vue': consumer }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 22 Keyed state creates on read and peeks on write

const KEYED_CLASS = (writePath: string, release: string) => `import { ref, type Ref } from 'vue';
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

// impossible-if-true: keyedStateCreatesOnReadAndPeeksOnWrite — a file breaking Keyed state creates on read and peeks on write passes the gate
test('rejects create-on-write and an overlay without release', () => {
  const createOnWrite = 'bumpCell(cellKey: number): void {\n    let versionRef = this.cellVersions.get(cellKey);\n    if (!versionRef) {\n      versionRef = ref(0);\n      this.cellVersions.set(cellKey, versionRef);\n    }\n    versionRef.value++;\n  }\n';
  const result = gate({ 'src/Sheet.ts': KEYED_CLASS(createOnWrite, '') });
  expect(findingsFor(keyedStateCreatesOnReadAndPeeksOnWrite, result.findings).map((entry) => entry.message)).toEqual([expect.stringMatching(/no release path/), expect.stringMatching(/write path `bumpCell` creates entries/)]);
});

// domain-invariant: keyedStateCreatesOnReadAndPeeksOnWrite — Keyed state creates on read and peeks on write: if a class holds a Map of refs, then reads get-or-create, writes peek, and a release path exists
test('accepts create-on-read peek-on-write and eviction', () => {
  const peek = 'bumpCell(cellKey: number): void {\n    const versionRef = this.cellVersions.get(cellKey);\n    if (versionRef) versionRef.value++;\n  }\n';
  const release = '\n  releaseCell(cellKey: number): void {\n    this.cellVersions.delete(cellKey);\n  }\n';
  expect(findingsFor(keyedStateCreatesOnReadAndPeeksOnWrite, gate({ 'src/Sheet.ts': KEYED_CLASS(peek, release) }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 23 A generic reactive class casts its constructor

const GENERIC_CLASS = (classLine: string, instanceLine: string) => `import { ref } from 'vue';
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

// impossible-if-true: aGenericReactiveClassCastsItsConstructor — a file breaking A generic reactive class casts its constructor passes the gate
test('rejects erased generic Class and raw Instance alias', () => {
  const result = gate({ 'src/Scroller.ts': GENERIC_CLASS('export let Class = Reactive($Class);', 'export type Instance = typeof Class.Instance;') });
  expect(findingsFor(aGenericReactiveClassCastsItsConstructor, result.findings).map((entry) => entry.message)).toEqual([expect.stringMatching(/`Class` erases <T>/), expect.stringMatching(/`Instance` must carry <T>/)]);
});

// domain-invariant: aGenericReactiveClassCastsItsConstructor — A generic reactive class casts its constructor: if a reactive class is generic, then Class is cast back to typeof dollar-Class and Instance applies ReactiveInstance by hand
test('accepts constructor cast and ReactiveInstance alias', () => {
  expect(findingsFor(aGenericReactiveClassCastsItsConstructor, gate({ 'src/Scroller.ts': GENERIC_CLASS('export let Class = Reactive($Class) as unknown as typeof $Class;', 'export type Instance<T> = ReactiveInstance<$Scroller<T>>;') }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 24 Cross-module Class reads happen inside bodies

// impossible-if-true: crossModuleClassReadsHappenInsideBodies — a file breaking Cross-module Class reads happen inside bodies passes the gate
test('rejects a top-level cross-module Class read', () => {
  const shelf = `import { Reactive } from 'ivue';
import { Box } from './Box';

const BoxClass = Box.Class;

class $Shelf {
  make() {
    return new BoxClass({ width: 1 });
  }
}

export namespace Shelf {
  export const $Class = $Shelf;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
`;
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Shelf.ts': shelf });
  expect(findingsFor(crossModuleClassReadsHappenInsideBodies, result.findings)[0]?.message).toMatch(/`Box\.Class` is read at module evaluation/);
});

// domain-invariant: crossModuleClassReadsHappenInsideBodies — Cross-module Class reads happen inside bodies: if a module reads another namespace's Class, then it does so inside a getter or method body, never at module evaluation
test('accepts method and getter body reads', () => {
  const shelf = `import { Reactive } from 'ivue';
import { Box } from './Box';

class $Shelf extends Box.$Class {
  make() {
    return new Box.Class({ width: 1 });
  }
}

export namespace Shelf {
  export const $Class = $Shelf;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
`;
  expect(findingsFor(crossModuleClassReadsHappenInsideBodies, gate({ 'src/Box.ts': VALID_CLASS, 'src/Shelf.ts': shelf }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 25 Declarations use full descriptive names

// impossible-if-true: declarationsUseFullDescriptiveNames — a file breaking Declarations use full descriptive names passes the gate
test('rejects one-letter and banned abbreviated declarations in source and tests', () => {
  const terse = VALID_CLASS.replace('  onResize(newHeight: number, oldHeight: number) {\n    return newHeight - oldHeight;\n  }', '  onResize(nv: number, e: number) {\n    const inst = nv - e;\n    return inst;\n  }');
  const test = VALID_TEST.replace("test('height never decreases on its own', () => {", "test('height never decreases on its own', (_) => {");
  const result = gate({ 'src/Box.ts': terse, 'src/Box.test.ts': test });
  expect(findingsFor(declarationsUseFullDescriptiveNames, result.findings).map((entry) => `${entry.file}:${entry.message.split('`')[1]}`)).toEqual(['src/Box.test.ts:_', 'src/Box.ts:nv', 'src/Box.ts:e', 'src/Box.ts:inst']);
});

// domain-invariant: declarationsUseFullDescriptiveNames — Declarations use full descriptive names: if a name is declared in source or tests, then it is a domain word, never a single letter or a banned abbreviation
test('accepts full names and declared domain terms', () => {
  const domain = VALID_CLASS.replace('  grow() {', '  offset(px: number, id: string) {\n    return `${id}:${px}`;\n  }\n\n  grow() {');
  expect(findingsFor(declarationsUseFullDescriptiveNames, gate({ 'src/Box.ts': domain, 'src/Box.test.ts': VALID_TEST }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 26 Class members are ordered and spaced

// impossible-if-true: classMembersAreOrderedAndSpaced — a file breaking Class members are ordered and spaced passes the gate
test('rejects a late static misplaced constructor and collapsed method spacing', () => {
  const disordered = VALID_CLASS.replace('class $Box {\n  constructor', 'class $Box {\n  get spare() {\n    return ref(0);\n  }\n\n  constructor').replace('  grow() {\n    this.height.value++;\n  }\n\n  onResize', '  static get LIMIT() {\n    return 9;\n  }\n\n  grow() {\n    this.height.value++;\n  }\n  onResize');
  const result = gate({ 'src/Box.ts': disordered });
  expect(findingsFor(classMembersAreOrderedAndSpaced, result.findings).map((entry) => entry.message)).toEqual([
    expect.stringMatching(/the constructor follows a getter or field/),
    expect.stringMatching(/a static member follows a getter or field/),
    expect.stringMatching(/`onResize` is not separated from the previous method/),
  ]);
});

// domain-invariant: classMembersAreOrderedAndSpaced — Class members are ordered and spaced: if a class is written, then statics precede the constructor, the constructor precedes getters, methods come last and are separated by blank lines
test('accepts ordered grouped members with semantic spacing', () => {
  const ordered = VALID_CLASS.replace('class $Box {\n  constructor', 'class $Box {\n  static get LIMIT() {\n    return 9;\n  }\n\n  constructor');
  expect(findingsFor(classMembersAreOrderedAndSpaced, gate({ 'src/Box.ts': ordered }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 27 A test file opens with its generator header

// impossible-if-true: aTestFileOpensWithItsGeneratorHeader — a file breaking A test file opens with its generator header passes the gate
test('rejects a test file without a generator header', () => {
  const headerless = VALID_TEST.slice(VALID_TEST.indexOf('import { expect'));
  const late = `import { expect, test } from 'vitest';\n${VALID_TEST}`;
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': headerless, 'src/Crate.ts': VALID_CLASS.replaceAll('Box', 'Crate'), 'src/Crate.test.ts': late.replaceAll('Box', 'Crate') });
  expect(findingsFor(aTestFileOpensWithItsGeneratorHeader, result.findings).map((entry) => entry.message)).toEqual([expect.stringMatching(/opens with its generator header, before any import/), expect.stringMatching(/not the first content/)]);
});

// domain-invariant: aTestFileOpensWithItsGeneratorHeader — A test file opens with its generator header: if a file is a test, then its first content is the generator header
test('accepts a test whose header is first content', () => {
  expect(findingsFor(aTestFileOpensWithItsGeneratorHeader, gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': VALID_TEST }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 28 A generator header carries both registers in order

// impossible-if-true: aGeneratorHeaderCarriesBothRegistersInOrder — a file breaking A generator header carries both registers in order passes the gate
test('rejects duplicate reversed or incomplete generator registers', () => {
  const reversed = VALID_TEST.replace(`${SENTINEL}\nGoal:`, `${DESCRIBED}\nThe $Box prose.\n${SENTINEL}\nGoal:`).replace(`\n${DESCRIBED}\nThe $Box height is the only mutable state, so growth is the single write path the tests must hold.\n`, '\n');
  const incomplete = VALID_TEST.replace('Goal: Prove the box grows by exactly one height unit per grow call and that height never moves on its own.\n', '').replace('Impossible if true: height decreases without a grow call\n', '').replace(`// ${IMPOSSIBLE}: $Box — height decreases without a grow call\n`, '');
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': reversed, 'src/Crate.ts': VALID_CLASS.replaceAll('Box', 'Crate'), 'src/Crate.test.ts': incomplete.replaceAll('Box', 'Crate') });
  expect(findingsFor(aGeneratorHeaderCarriesBothRegistersInOrder, result.findings).map((entry) => entry.message)).toEqual(expect.arrayContaining([
    expect.stringMatching(/must follow/),
    expect.stringMatching(/needs a `Goal:` line/),
    expect.stringMatching(/at least one `Impossible if true:`/),
  ]));
});

// domain-invariant: aGeneratorHeaderCarriesBothRegistersInOrder — A generator header carries both registers in order: if a header exists, then it has one Goal, the formal register, at least one Impossible if true, and the described register after the formal one
test('accepts Goal formal described and Impossible registers', () => {
  expect(findingsFor(aGeneratorHeaderCarriesBothRegistersInOrder, gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': VALID_TEST }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 29 A header symbol is declared in the sibling source

// impossible-if-true: aHeaderSymbolIsDeclaredInTheSiblingSource — a file breaking A header symbol is declared in the sibling source passes the gate
test('rejects a header symbol absent from sibling source', () => {
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': VALID_TEST.replaceAll('$Box —', '$Crate —') });
  expect(findingsFor(aHeaderSymbolIsDeclaredInTheSiblingSource, result.findings)[0]?.message).toMatch(/`\$Crate` is not declared in Box\.ts/);
  // a Subject line that names a missing path is refused, not silently skipped
  const wrongSubject = VALID_TEST.replace('Goal:', 'Subject: Missing.ts\nGoal:');
  const subjectResult = gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': wrongSubject });
  expect(findingsFor(aHeaderSymbolIsDeclaredInTheSiblingSource, subjectResult.findings)[0]?.message).toMatch(/Subject path does not exist: Missing\.ts/);
});

// domain-invariant: aHeaderSymbolIsDeclaredInTheSiblingSource — A header symbol is declared in the sibling source: if a header names a symbol, then the sibling source declares it
test('accepts a declared sibling symbol', () => {
  expect(findingsFor(aHeaderSymbolIsDeclaredInTheSiblingSource, gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': VALID_TEST }).findings)).toEqual([]);
  // a Subject line resolves symbols against the named source (non-colocated
  // layout); no sibling exists and the check still passes
  const subjectTest = VALID_TEST.replace('Goal:', 'Subject: src/Box.ts\nGoal:');
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'specs/Growth.test.ts': subjectTest }, { testGlobs: ['specs/**/*.test.ts'] });
  expect(findingsFor(aHeaderSymbolIsDeclaredInTheSiblingSource, result.findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 30 A claim annotation sits directly above its test

// impossible-if-true: aClaimAnnotationSitsDirectlyAboveItsTest — a file breaking A claim annotation sits directly above its test passes the gate
test('rejects an annotation not directly above its test', () => {
  const drifted = VALID_TEST.replace(`// ${DOMAIN}: $Box — If grow is called, then height increases by one\ntest('grow`, `// ${DOMAIN}: $Box — If grow is called, then height increases by one\nconst seed = 1;\ntest('grow`);
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': drifted });
  expect(findingsFor(aClaimAnnotationSitsDirectlyAboveItsTest, result.findings)[0]?.message).toMatch(/must sit directly above a test/);
});

// domain-invariant: aClaimAnnotationSitsDirectlyAboveItsTest — A claim annotation sits directly above its test: if a proof annotation is written, then a test follows it directly
test('accepts annotation optional doc comment and test', () => {
  const documented = VALID_TEST.replace(`// ${DOMAIN}: $Box — If grow is called, then height increases by one\ntest('grow`, `// ${DOMAIN}: $Box — If grow is called, then height increases by one\n/** The spec: one grow, one unit. */\ntest('grow`);
  expect(findingsFor(aClaimAnnotationSitsDirectlyAboveItsTest, gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': documented }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 31 Header claims and annotated tests match one to one

// impossible-if-true: headerClaimsAndAnnotatedTestsMatchOneToOne — a file breaking Header claims and annotated tests match one to one passes the gate
test('rejects an unproved header claim and an undeclared test claim', () => {
  const mismatched = VALID_TEST.replace(`// ${DOMAIN}: $Box — If grow is called, then height increases by one\ntest('grow`, `// ${DOMAIN}: $Box — If grow is called, then height doubles\ntest('grow`);
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': mismatched });
  expect(findingsFor(headerClaimsAndAnnotatedTestsMatchOneToOne, result.findings).map((entry) => entry.message)).toEqual([expect.stringMatching(/has no annotated test/), expect.stringMatching(/absent from the header/)]);
});

// domain-invariant: headerClaimsAndAnnotatedTestsMatchOneToOne — Header claims and annotated tests match one to one: if a header states a domain invariant, then an annotated test proves it, and every annotated claim is in the header
test('accepts exact claim-to-test coverage both ways', () => {
  expect(findingsFor(headerClaimsAndAnnotatedTestsMatchOneToOne, gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': VALID_TEST }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 32 An impossibility is proved by an exact negative test

// impossible-if-true: anImpossibilityIsProvedByAnExactNegativeTest — a file breaking An impossibility is proved by an exact negative test passes the gate
test('rejects missing mislabeled or non-exact impossibility proof', () => {
  const inexact = VALID_TEST.replace(`// ${IMPOSSIBLE}: $Box — height decreases without a grow call`, `// ${IMPOSSIBLE}: $Box — height decreases spontaneously`);
  const mislabeled = VALID_TEST.replace(`// ${IMPOSSIBLE}: $Box — height decreases without a grow call`, `// ${DOMAIN}: $Box — height decreases without a grow call`);
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': inexact, 'src/Crate.ts': VALID_CLASS.replaceAll('Box', 'Crate'), 'src/Crate.test.ts': mislabeled.replaceAll('Box', 'Crate') });
  expect(findingsFor(anImpossibilityIsProvedByAnExactNegativeTest, result.findings).map((entry) => entry.message)).toEqual(expect.arrayContaining([
    expect.stringMatching(/impossibility text is not exact/),
    expect.stringMatching(/has no annotated negative test/),
    expect.stringMatching(/an impossibility is labeled as an invariant/),
  ]));
});

// domain-invariant: anImpossibilityIsProvedByAnExactNegativeTest — An impossibility is proved by an exact negative test: if a header states an impossibility, then an impossible-if-true test carries its exact text and a header symbol
test('accepts exact negative proof with a header symbol', () => {
  expect(findingsFor(anImpossibilityIsProvedByAnExactNegativeTest, gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': VALID_TEST }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 33 A contract pointer resolves and is proved

const CONTRACT = `# demo invariants

## Reality-based invariants

### A box never shrinks by itself

**Invariant:** If no grow call happens, then height stays.

**Status:** provisional

## Chosen invariants
`;

const CONTRACT_TEST = (pointer: string, annotation: string) =>
  VALID_TEST.replace('Impossible if true:', `${pointer}\nImpossible if true:`).replace(
    `// ${IMPOSSIBLE}: $Box — height decreases without a grow call\ntest('height never decreases on its own'`,
    `${annotation}// ${IMPOSSIBLE}: $Box — height decreases without a grow call\ntest('height never decreases on its own'`,
  );

// impossible-if-true: aContractPointerResolvesAndIsProved — a file breaking A contract pointer resolves and is proved passes the gate
test('rejects a broken record pointer and unproved contract claim', () => {
  const broken = CONTRACT_TEST('[A box never shrinks by itself](../demo.invariants.md#a-box-never-grows)', '');
  const unproved = CONTRACT_TEST('[A box never shrinks by itself](../demo.invariants.md#a-box-never-shrinks-by-itself)', '');
  const result = gate({ 'demo.invariants.md': CONTRACT, 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': broken, 'src/Crate.ts': VALID_CLASS.replaceAll('Box', 'Crate'), 'src/Crate.test.ts': unproved.replaceAll('Box', 'Crate') });
  expect(findingsFor(aContractPointerResolvesAndIsProved, result.findings).map((entry) => entry.message)).toEqual(expect.arrayContaining([expect.stringMatching(/does not resolve/), expect.stringMatching(/pointer has no annotated test/)]));
});

// domain-invariant: aContractPointerResolvesAndIsProved — A contract pointer resolves and is proved: if a header links a contract record, then the anchor resolves and an annotated test proves it
test('accepts a resolved anchored record with annotated proof', () => {
  const proved = CONTRACT_TEST('[A box never shrinks by itself](../demo.invariants.md#a-box-never-shrinks-by-itself)', `// ${INVARIANT}: A box never shrinks by itself (demo.invariants.md)\n`);
  expect(findingsFor(aContractPointerResolvesAndIsProved, gate({ 'demo.invariants.md': CONTRACT, 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': proved }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 34 A source tripwire resolves to its sibling header

// impossible-if-true: aSourceTripwireResolvesToItsSiblingHeader — a file breaking A source tripwire resolves to its sibling header passes the gate
test('rejects a source tripwire without its sibling header claim', () => {
  const tripwired = VALID_CLASS.replace('  grow() {', `  // ${DOMAIN}: $Crate\n  grow() {`);
  const result = gate({ 'src/Box.ts': tripwired, 'src/Box.test.ts': VALID_TEST });
  expect(findingsFor(aSourceTripwireResolvesToItsSiblingHeader, result.findings)[0]?.message).toMatch(/tripwire `\$Crate` has no header claim in Box\.test\.ts/);
});

// domain-invariant: aSourceTripwireResolvesToItsSiblingHeader — A source tripwire resolves to its sibling header: if source carries a domain-invariant tripwire, then it names only a symbol the sibling header claims
test('accepts a symbol-only tripwire that resolves', () => {
  const tripwired = VALID_CLASS.replace('  grow() {', `  // ${DOMAIN}: $Box\n  grow() {`);
  expect(findingsFor(aSourceTripwireResolvesToItsSiblingHeader, gate({ 'src/Box.ts': tripwired, 'src/Box.test.ts': VALID_TEST }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 35 A test caveat derives from a tested claim

// impossible-if-true: aTestCaveatDerivesFromATestedClaim — a file breaking A test caveat derives from a tested claim passes the gate
test('rejects a constraining caveat with no test claim', () => {
  const caveat = VALID_TEST.replace('so growth is the single write path the tests must hold.', 'so growth is the single write path the tests must hold. Width must never change after construction.');
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': caveat });
  expect(findingsFor(aTestCaveatDerivesFromATestedClaim, result.findings)[0]?.message).toMatch(/Width must never change/);
});

// domain-invariant: aTestCaveatDerivesFromATestedClaim — A test caveat derives from a tested claim: if the described register constrains, then the constraint names a header symbol
test('accepts prose derived from a tested claim', () => {
  expect(findingsFor(aTestCaveatDerivesFromATestedClaim, gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': VALID_TEST }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 36 The population and skip-list are exact

// impossible-if-true: thePopulationAndSkipListAreExact — a file breaking The population and skip-list are exact passes the gate
test('rejects zero files unmatched globs and stale skips', () => {
  const empty = checkout({ 'src/.keep': '' });
  expect(() => runStandardGate({ cwd: empty, sourceRoots: ['src'], testGlobs: [], staticImplementation: Static })).toThrow(GateUsageError);
  const populated = checkout({ 'src/Box.ts': VALID_CLASS });
  expect(() => runStandardGate({ cwd: populated, sourceRoots: ['src'], testGlobs: ['src/**/*.test.ts'], staticImplementation: Static })).toThrow(/test glob matches no file/);
  writeFileSync(join(populated, 'skips.tsv'), `src/Box.ts\tNo such check\treason\n`);
  expect(() => runStandardGate({ cwd: populated, sourceRoots: ['src'], testGlobs: [], skipListPath: 'skips.tsv', staticImplementation: Static })).toThrow(/unknown check name/);
  writeFileSync(join(populated, 'skips.tsv'), `src/Box.ts\tA class file is named after its class\tfirst\nsrc/Box.ts\tA class file is named after its class\tsecond\n`);
  expect(() => runStandardGate({ cwd: populated, sourceRoots: ['src'], testGlobs: [], skipListPath: 'skips.tsv', staticImplementation: Static })).toThrow(/duplicate skip/);
  writeFileSync(join(populated, 'skips.tsv'), `src/Box.ts\tA class file is named after its class\tnever fires here\nsrc/Gone.ts\tA class file is named after its class\tfile removed\n`);
  const stale = runStandardGate({ cwd: populated, sourceRoots: ['src'], testGlobs: [], skipListPath: 'skips.tsv', staticImplementation: Static });
  expect(findingsFor(thePopulationAndSkipListAreExact, stale.findings).map((entry) => entry.message)).toEqual([expect.stringMatching(/no longer fires on src\/Box\.ts/), expect.stringMatching(/src\/Gone\.ts does not exist/)]);
});

// domain-invariant: thePopulationAndSkipListAreExact — The population and skip-list are exact: if the gate runs, then it refuses zero files, unmatched globs, unknown check names, duplicate and stale skips
test('accepts discovered roots tests and exact reasoned skips', () => {
  const root = checkout({ 'src/Crate.ts': VALID_CLASS, 'src/Crate.test.ts': VALID_TEST, 'skips.tsv': 'src/Crate.ts\tA class file is named after its class\tlegacy file name kept for the public import path\n' });
  const result = runStandardGate({ cwd: root, sourceRoots: ['src'], testGlobs: ['src/**/*.test.ts'], skipListPath: 'skips.tsv', staticImplementation: Static });
  expect(result.sources).toEqual(['src/Crate.ts']);
  expect(result.tests).toEqual(['src/Crate.test.ts']);
  expect(result.suppressed.map((entry) => entry.check)).toEqual([aClassFileIsNamedAfterItsClass.name]);
  expect(findingsFor(thePopulationAndSkipListAreExact, result.findings)).toEqual([]);
  expect(findingsFor(aClassFileIsNamedAfterItsClass, result.findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// 37 Two test files do not share one generator header

// impossible-if-true: twoTestFilesDoNotShareOneGeneratorHeader — a file breaking Two test files do not share one generator header passes the gate
test('rejects two planted header twins', () => {
  const result = gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': VALID_TEST, 'src/Crate.ts': VALID_CLASS.replaceAll('Box', 'Crate'), 'src/Crate.test.ts': VALID_TEST.replaceAll('Box', 'Crate') });
  expect(findingsFor(twoTestFilesDoNotShareOneGeneratorHeader, result.findings)[0]?.message).toMatch(/template twin of src\/Box\.test\.ts/);
});

// domain-invariant: twoTestFilesDoNotShareOneGeneratorHeader — Two test files do not share one generator header: if two test files exist, then their Goal and described registers differ beyond their own symbol names
test('accepts two distinct Goals', () => {
  const distinct = VALID_TEST.replaceAll('Box', 'Crate').replace('Goal: Prove the box grows by exactly one height unit per grow call and that height never moves on its own.', 'Goal: Prove a crate reports the area its width and height imply, and nothing else moves it.').replace('The $Crate height is the only mutable state, so growth is the single write path the tests must hold.', 'Area is derived on every read; the $Crate class holds no cached area to drift.');
  expect(findingsFor(twoTestFilesDoNotShareOneGeneratorHeader, gate({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': VALID_TEST, 'src/Crate.ts': VALID_CLASS.replaceAll('Box', 'Crate'), 'src/Crate.test.ts': distinct }).findings)).toEqual([]);
});

// ---------------------------------------------------------------------------
// the CLI is the same function: main() → runStandardGate

test('the command line runs the same gate and maps outcomes to exit codes', async () => {
  const root = checkout({ 'src/Box.ts': VALID_CLASS, 'src/Box.test.ts': VALID_TEST });
  const errors: string[] = [];
  const original = console.error;
  console.error = (line: string) => errors.push(line);
  try {
    expect(await main(['--source-root', 'src', '--test-glob', 'src/**/*.test.ts'], root)).toBe(0);
    expect(await main(['--source-root', 'src', '--test-glob', 'src/**/*.nothing.ts'], root)).toBe(2);
    writeFileSync(join(root, 'src/Box.ts'), VALID_CLASS.replace('  grow() {\n    this.height.value++;\n  }', '  grow = () => {\n    this.height.value++;\n  };'));
    expect(await main(['--source-root', 'src', '--test-glob', 'src/**/*.test.ts'], root)).toBe(1);
  } finally {
    console.error = original;
  }
  expect(errors.some((line) => line.includes(behaviorLivesOnThePrototypeNotInFields.name))).toBe(true);
});
