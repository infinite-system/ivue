# ivue invariants

The living contract for the `ivue` engine: `Reactive()` (`lib/Reactive.ts`), `Static()` (`lib/Static.ts`), and `LazyShared` (`lib/LazyShared.ts`). Records are unnumbered; the name is the identifier and is referenced verbatim by code annotations (`// invariant: <name> (ivue.invariants.md)`) and by the derived prose at `docs_v2/reference/invariants.md`.

Two kinds of records, and the split is load-bearing:

- **Reality-based invariants** are forced by how JavaScript and Vue actually work. They are discovered, not chosen; a record that is reality only inside ivue and decided at a wider scope names that scope in `Renegotiable at`.
- **Chosen invariants** are the engine's own disciplines. Each could be otherwise and still be coherent; the system depends on it not drifting.

Chosen invariants stand on reality invariants, never the reverse.

## Generator

The records below are gears. This section is the mechanism they form, in
invariant form, so a scan of this file alone carries the deep picture.

STUDY ALSO: [The Invariants Behind ivue](docs_v2/reference/invariants.md) —
the prose narrative of this mechanism for readers of the site: why each
gear exists, what it rules out, and where the method comes from. Read it
for orientation; this contract carries the falsifiable core.

### One prototype transform gives plain classes full reactivity

**Invariant:** If a class's prototype is transformed once — ref-returning getters into lazily cached cells, plain getters into native getters, methods into lazily bound functions, every cell keyed on the raw instance — then its instances are plain objects with full Vue reactivity, real inheritance, and zero per-instance cost until first access, and the same class runs in every environment.

**Scope:** The `ivue` engine: `Reactive()` for instance classes, `Static()` and `LazyShared` for the static side, and the namespace authoring convention that carries classes across modules. The goal vector is class-based application models with no proxy wrapper and no coordination between files.

**Components:** One per gear, each delete-testable:
- [Every engine cache lives on the raw instance](#every-engine-cache-lives-on-the-raw-instance) — why one `(instance, key)` has one cell whatever `this` the engine is entered through.
- [Reactive returns the class it was given](#reactive-returns-the-class-it-was-given) — why `instanceof`, equality, and benchmarks see one identity.
- [A prototype level is transformed at most once](#a-prototype-level-is-transformed-at-most-once) — why hierarchies converge regardless of import order.
- [A member materializes once per instance](#a-member-materializes-once-per-instance) — why watchers stay attached and methods are safe handlers.
- [Construction does no reactive work](#construction-does-no-reactive-work) — why creation cost does not scale with members declared.
- [A plain-value getter erases its own wrapper](#a-plain-value-getter-erases-its-own-wrapper) — why derivations cost zero bytes and `computed()` is opt-in.
- [Members resolve across the whole prototype chain](#members-resolve-across-the-whole-prototype-chain) — why `super` and overrides behave as in native classes.
- [Teardown stops watchers and drops only engine cells](#teardown-stops-watchers-and-drops-only-engine-cells) — why models can outlive components and be released deterministically.
- [A dollar getter caches its whole result forever](#a-dollar-getter-caches-its-whole-result-forever) — why composables and stores resolve once, late, and cycle-safe.
- [One class path runs in every environment](#one-class-path-runs-in-every-environment) — why what is measured is what ships.
- [Cross-module class references resolve in any load order](#cross-module-class-references-resolve-in-any-load-order) — why mutual references between class modules do not crash.
- [Each class transforms at load time in its own module](#each-class-transforms-at-load-time-in-its-own-module) — why a hierarchy can live in many files with no manifest.
- [Static returns a bound subclass and leaves the raw class untouched](#static-returns-a-bound-subclass-and-leaves-the-raw-class-untouched) — why static capability classes get stable handlers and a replaceable `Class` slot.
- [A static dollar getter caches once per receiver](#a-static-dollar-getter-caches-once-per-receiver) — why per-class derivation follows each subclass's own overrides.
- [A shared store lives in a LazyShared static readonly field](#a-shared-store-lives-in-a-lazyshared-static-readonly-field) — why a registry is one per process and never races an import cycle.

**Mechanism:** Raw anchoring makes every cell canonical; once-only transformation and identity preservation make the transform composable across files and load orders; lazy materialization and wrapper erasure move every cost to first access and delete the cost that never earns itself; per-level symbols keep inheritance native; scoped teardown makes release explicit; the namespace convention pushes every cross-module read to the latest moment. The static side repeats the same discipline one level up: per-receiver symbols for binding and memos, one cell for shared state.

**Generates:** The ivue Standard (`skills/ivue/SKILL.md`): ref-getters, plain getters, surgical `computed()`, `$`-getter stores, the namespace export, `$stopEffects` disposal; the creation, hot-call, derivation, and disposal benchmarks in `bench/`; the flyweight and formula-grid examples; this contract's gate checks.

**Impossible if true:** A `Reactive()` class whose instances need a proxy to be reactive. Creation cost that grows with the number of getters declared. A multi-file hierarchy that depends on import order. A benchmark number that includes a development-only code path.

**Evidence:** The Evidence fields of the fifteen component records — `lib/Reactive.ts`, `lib/Static.ts`, `lib/LazyShared.ts`, the four vitest suites under `lib/__tests__/` at 100% coverage, and `bench/`.

**Verification:** `npx vitest run lib/__tests__/Reactive.vitest.spec.ts lib/__tests__/ReactiveAdversarial.vitest.spec.ts lib/__tests__/Static.vitest.spec.ts lib/__tests__/LazyShared.vitest.spec.ts` green, then `node .claude/skills/invariants/scripts/check_invariants.mjs --all --refs` clean.

**Status:** provisional

**Last refined:** 2026-08-25

## Reality-based invariants

### Every engine cache lives on the raw instance

**Invariant:** If the engine touches an instance through any `this` — the raw object, a Vue `reactive()` proxy, or a foreign proxy such as a component expose proxy — then every cell it reads or writes (ref, computed, bound method, effect scope, back-pointer) is a property of `toRaw(instance)`, never of a proxy.

**Scope:** Every getter and method installed by `Reactive()`, and the `$watch` / `$watchEffect` / `$stopEffects` helpers. Applies to instances used directly, wrapped in `reactive()`, or reached through `defineExpose`.

**Renegotiable at:** Vue's reactivity model — a `reactive()` proxy wraps symbol-keyed object reads in `reactive(raw)` and `toRaw()` cannot see through non-Vue proxies. If Vue changed either, the mechanism (not the guarantee) would change.

**Mechanism:** Every engine entry point calls `resolveRaw(this)` (`lib/Reactive.ts:51`): `toRaw()` first, then the `RAW` back-pointer (`Symbol.for('ivue.raw')`, stamped once on the raw at `lib/Reactive.ts:57` and `:67`), normalized with `toRaw()` for deep-wrapped reads. Because caches key on the raw, one `(instance, key)` has exactly one cell regardless of the access path.

**Generates:** The self pattern in components (`defineExpose(model as X.Instance)` and the raw instance drive one state); `$stopEffects` finding every cell it must delete; stable watchers across proxy and raw reads.

**Rejected alternatives:** Cache on `this` as received — a `reactive()` read and a raw read then hold two refs for one property, and a method bound to the deep-wrapped `this` crashes on `this.x.value`.

**Evidence:** `lib/Reactive.ts:51-68` (`resolveRaw`), `:87`, `:117`, `:236`, `:273` (every entry calls it). Tests: "works when the instance IS wrapped in reactive() (toRaw anchoring)", "a method first-accessed through reactive() AFTER the pointer is stamped still binds to the raw (no cache poisoning)", "resolves the true raw through an opaque foreign proxy (component expose-proxy shape)", "tears down the raw instance when invoked through a Vue proxy".

**Impossible if true:** `reactive(instance).count !== instance.count` for a ref-getter; a write through the proxy landing on a cell a raw read does not see; `this.x.value` throwing inside a method first accessed through a proxy; `$stopEffects()` called on the proxy leaving a cell alive on the raw.

**Verification:** `npx vitest run lib/__tests__/Reactive.vitest.spec.ts -t "toRaw anchoring|no cache poisoning|opaque foreign proxy"` and `npx vitest run lib/__tests__/ReactiveAdversarial.vitest.spec.ts -t "through a Vue proxy"`

**Status:** provisional

**Last refined:** 2026-08-25

### Cross-module class references resolve in any load order

**Invariant:** If two class modules reference each other only through late reads — `new Other.Class()` inside getter or method bodies, `Other.$Class` only in `extends` of a non-cyclic parent — then both modules load and run in either import order without `Cannot access 'X' before initialization`.

**Scope:** Modules that export a class through the namespace pattern (`export namespace X { export const $Class …; export let Class = Reactive($Class) }`) and read other namespaces at first access, not at module load or in field initializers. Circular inheritance (`A extends B` and `B extends A`) is outside this record and impossible in any language.

**Renegotiable at:** TypeScript's `namespace` emit (a hoisted `var` filled by an IIFE) and ECMAScript module evaluation order. A TypeScript release that emitted `const` or `class` for namespaces would move this to a build-time check.

**Mechanism:** A `namespace` compiles to `export var X; (function (X) { … })(X || (X = {}))`, so the binding exists from the first instant of evaluation and is never in the temporal dead zone; the member read `X.Class` happens inside a method body, at call time, when every module in the cycle has finished loading (`docs_v2/guide/modules.md` — "Circular references resolve by construction").

**Generates:** "A's methods use B, B's methods use A" as a supported shape; the `$`-getter store slot (`private get $store() { return useStore() }`) resolving after Pinia and the app exist; per-file class hierarchies without an import-order manifest.

**Rejected alternatives:** `export const Class = Reactive(class …)` — a `const` read mid-cycle throws; a registry that resolves names to classes at runtime — a second identity system beside the module graph.

**Open question:** Add a two-module vitest case (A imports B, B imports A, each constructs the other in a method) run under both import orders, so the guarantee is proven by the suite rather than by the emit inspection alone.

**Evidence:** `node -e` emit inspection below (TypeScript 5.9 emits `export var Thing;`); `docs_v2/guide/modules.md:122-170`; the `workspace-platform` example classes (`examples/playground/src/examples/workspace-platform/*.ts`) all use the pattern.

**Impossible if true:** `Cannot access 'X' before initialization` thrown by a namespace binding read inside a method body; a namespace module whose emitted binding is `const` or `class`; two modules that load in one order and crash in the other while obeying the late-read rule.

**Verification:** `node -e "const ts=require('typescript');console.log(ts.transpileModule('export namespace Thing { export const \$Class = 1; export let Class = 2 }',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText)"` prints `export var Thing;` followed by an IIFE

**Status:** provisional

**Last refined:** 2026-08-25

## Chosen invariants

### Reactive returns the class it was given

**Invariant:** If `Reactive(Class)` is called, then it transforms `Class.prototype` in place and returns `Class` itself — the same constructor identity in development, tests, SSR, and production.

**Scope:** The return value of `Reactive()` and the identity of every instance's constructor and prototype chain. Does not cover `Static()`, which returns a subclass by design (see `Static returns a subclass and leaves the raw class untouched`).

**Mechanism:** `Reactive()` mutates the prototype chain with `defineProperty` and ends with `return targetClass` (`lib/Reactive.ts:303`); no wrapper class, no construct proxy, no environment branch exists in the file.

**Generates:** `Reactive(X) === X`; `instanceof` and `prototype` lineage intact after transformation; the namespace pattern's `$Class` (raw, for `extends`) and `Class` (`Reactive($Class)`, for `new`) sharing one identity; benchmarks that measure the shipped class, not a dev proxy.

**Rejected alternatives:** Return a subclass or a construct `Proxy` — two identities for one declaration; `instanceof` and equality diverge across modules; a dev-only identity that production never runs.

**Evidence:** `lib/Reactive.ts:172-304` (no wrapper; `return targetClass`). Tests: "returns the SAME class reference (mutates in place, no wrapper)", "instances are plain (NOT a reactive proxy) — the core perf invariant".

**Impossible if true:** `Reactive(X) !== X`; `new (Reactive(X))() instanceof X === false`; a class identity that differs between `import.meta.env.DEV` and production.

**Verification:** `npx vitest run lib/__tests__/Reactive.vitest.spec.ts -t "returns the SAME class reference|instances are plain"`

**Status:** provisional

**Last refined:** 2026-08-25

### A prototype level is transformed at most once

**Invariant:** If `Reactive()` reaches a prototype level — directly, through a repeated call, or through any number of subclasses — then that level's own getters and methods are converted exactly once, and the `$watch` / `$watchEffect` / `$stopEffects` trio is installed exactly once per class.

**Scope:** Every prototype in the chain from the target class up to (excluding) `Object.prototype`; every module that calls `Reactive()` on a class or its descendants, in any load order.

**Mechanism:** The chain is walked base to child; a level carrying an own `PROCESSED` marker (`Symbol.for('ivue.processed')`) is skipped (`lib/Reactive.ts:189`), and the marker is defined after conversion with the level's cache symbols as its value (`:214`). The helper trio is guarded by `hasOwn(prototype, '$stopEffects')` (`:225`). `Symbol.for` makes the markers agree across duplicate bundled copies of the engine.

**Generates:** Per-file authoring — a base transformed in `Base.ts` is skipped when `Child.ts` transforms itself; diamond and shared-base hierarchies converge regardless of import order; `$stopEffects` knowing exactly which symbols each level may cache.

**Rejected alternatives:** A module-level `WeakSet` of processed classes — a second bundled engine copy has its own set and double-wraps; a class-level flag — a child's flag does not stop the base from being re-walked.

**Evidence:** `lib/Reactive.ts:186-217`, `:225`. Tests: "calling Reactive twice on the same class is safe and a no-op the 2nd time", "Reactive(Parent) then Reactive(Child) skips the already-processed parent proto", "$stopEffects is injected only once (idempotent re-Reactive)".

**Impossible if true:** A getter whose descriptor `get` is the engine wrapper around another engine wrapper; two `$stopEffects` own properties on one prototype chain; a base class whose getters behave differently depending on which subclass module loaded first.

**Verification:** `npx vitest run lib/__tests__/Reactive.vitest.spec.ts -t "idempotence|injected only once"`

**Status:** provisional

**Last refined:** 2026-08-25

### A member materializes once per instance

**Invariant:** If a ref-returning getter or a method is read on an instance, then the first read creates its cell — the returned Ref/Computed, or the bound function — and every later read on that instance returns the identical object.

**Scope:** Every getter that returns a Ref (`ref`, `shallowRef`, `computed`) and every prototype method converted by `Reactive()`, per instance. Plain-value getters are outside this record (see `A plain-value getter erases its own wrapper`).

**Mechanism:** Each `(prototype, key)` gets a fresh `Symbol(key)` at transform time (`lib/Reactive.ts:202`, `:206`); the getter caches the Ref under it on the raw and short-circuits on a hit (`:120`, `:134`); the method getter caches `originalFn.bind(raw)` under it (`:88`). Distinct symbols per level mean a child override and its `super` never share a cell.

**Generates:** `watch(() => instance.total.value, …)` staying attached across reads; methods safe to pass as event handlers and to compare by identity; the template state destructure (`const { count } = model`) binding the live cell; `super.x.value` reading the parent's cell, not the child's.

**Rejected alternatives:** Cache under the string key on the instance — a child override and its parent collide on one name; recompute per read — every read drops the previous watcher's target.

**Evidence:** `lib/Reactive.ts:77-94`, `:106-165`, `:198-209`. Tests: "caches the SAME ref instance across accesses (stable identity)", "different instances get different ref instances", "returns a stable, bound function across accesses (referential equality)", "super computed and child computed are cached under different symbols (no collision)", "every level caches its own computed under a distinct symbol (no shadow collision)".

**Impossible if true:** `instance.count !== instance.count` for a ref-getter; `instance.increment !== instance.increment`; a watcher on `() => instance.x.value` going silent after an unrelated read of `instance.x`; `super.summary` inside a child getter resolving to the child's own cell.

**Verification:** `npx vitest run lib/__tests__/Reactive.vitest.spec.ts -t "stable identity|referential equality|different symbols|distinct symbol"`

**Status:** provisional

**Last refined:** 2026-08-25

### Construction does no reactive work

**Invariant:** If `new Class()` runs on a `Reactive()` class, then only the user's constructor executes — no proxy is created, no ref, computed, bound method, or effect scope is allocated until the first read of that member.

**Scope:** Instance creation for every `Reactive()` class. Reactive cells appear per member on first access (see `A member materializes once per instance`); the effect scope appears on the first `$watch` / `$watchEffect` (see the teardown record).

**Mechanism:** All engine behavior lives in prototype getters installed once per class (`lib/Reactive.ts:83`, `:155`); the engine never calls `reactive()` on an instance and has no constructor hook. The scope is created lazily at `:238` / `:253`.

**Generates:** Creation cost that does not scale with the number of reactive members declared; 100k instances allocating in ~0.7 ms on Vue 3.5 (`bench/creation.bench.ts`, `bench/README.md`); flyweight and grid models that instantiate millions of plain objects.

**Rejected alternatives:** Eager per-instance wrapping (the v1 `ivue(Class)` engine, `lib/ivue.ts`) — ~169 ms per 100k instances and cost proportional to declared members.

**Evidence:** `lib/Reactive.ts:172-304` (no instance work in `Reactive()`), `bench/creation.bench.ts:6-25`. Tests: "instances are plain (NOT a reactive proxy) — the core perf invariant", "pure-data instances never allocate a scope (zero overhead)".

**Impossible if true:** `Object.getOwnPropertySymbols(new Class())` non-empty before any member read; `isReactive(new Class()) === true`; creation time growing with the number of getters declared on the class.

**Verification:** `npx vitest run lib/__tests__/Reactive.vitest.spec.ts -t "instances are plain|never allocate a scope"`; `npm run bench -- bench/creation.bench.ts`

**Status:** provisional

**Last refined:** 2026-08-25
### A plain-value getter erases its own wrapper

**Invariant:** If a converted getter returns a non-Ref value on its first read (and its name does not start with `$`), then the engine redefines that prototype property as a thin native getter, and every later read on every instance of that prototype runs the original getter with no cache lookup.

**Scope:** Every getter converted by `Reactive()` whose first result is not a Ref. The redefinition is per prototype level, so it happens once per class, on whichever instance reads first. Setters paired with the getter are kept.

**Mechanism:** In the wrapper (`lib/Reactive.ts:116-153`), a non-Ref result takes the `defineProperty(proto, key, …)` branch at `:138-149`, installing `get() { return originalGetter.call(resolveRaw(this)) }` and the original setter. The wrapper object is then unreachable from the prototype.

**Generates:** Plain derived getters as the default authoring mode (0 bytes per instance, re-derived inside whatever effect reads them); `computed()` as a surgical opt-in; the derivation benchmarks in `bench/derived-vs-computed.mjs`.

**Rejected alternatives:** Cache the plain value as if it were a ref — stale reads and a fake reactive identity; keep the wrapper and re-check `isRef` per read — a permanent per-read tax on the most common member kind.

**Evidence:** `lib/Reactive.ts:132-150`. Tests: "getter returning a plain value de-opts back to a native getter (no setter)", "getter+setter returning a plain value de-opts but keeps the setter wired", "native accessor pair over reactive state stays fully reactive (no computed)", "plain-getter (de-opt) super-chains resolve through 4 levels".

**Impossible if true:** A plain-value getter whose prototype descriptor still has the engine wrapper after one read; `Object.getOwnPropertySymbols(instance)` gaining a symbol from reading a plain-value getter; a plain-value getter returning a stale value after its inputs changed inside an effect.

**Verification:** `npx vitest run lib/__tests__/Reactive.vitest.spec.ts -t "de-opts|native accessor pair|plain-getter \(de-opt\)"`

**Status:** provisional

**Last refined:** 2026-08-25

### Members resolve across the whole prototype chain

**Invariant:** If a class hierarchy is transformed, then getters and methods at every level resolve as in native classes — `super.x` and `super.x.value` reach the parent's own cell, overrides at different levels cooperate, and no two levels share a cache for the same name.

**Scope:** Every prototype level of a `Reactive()` class, at any depth, including levels transformed in other modules and chains that do not bottom out at `Object.prototype`.

**Mechanism:** The transform walks base to child and gives each `(prototype, key)` its own `Symbol(key)` (`lib/Reactive.ts:186-209`), so a base `summary` and a child `summary` cache under different symbols on the same raw instance. `super.summary` invokes the parent level's getter, which reads the parent's symbol.

**Generates:** Inheritance and polymorphism as ordinary class features; per-file hierarchies (`class $Child extends Parent.$Class`); a child computed aggregating ancestor refs and re-running when an ancestor ref changes.

**Rejected alternatives:** Cache under the property name — parent and child clobber each other and `super.x` returns the child's cell (an infinite loop or the wrong layer).

**Evidence:** `lib/Reactive.ts:198-209`. Tests: "resolves getters across a 3-level chain with super.x.value", "super computed and child computed are cached under different symbols (no collision)", "inherited methods bind correctly", "computed super-chains resolve through 4 levels", "mutating an ANCESTOR ref re-runs the full computed chain (reactivity through inheritance)", "each level resolves correctly as a standalone instance", "super method calls chain through 3 levels", "handles a chain that bottoms out at null (no Object.prototype)".

**Impossible if true:** `super.x` inside a child getter returning the child's own value; a parent read changing what a child's same-named getter returns; a 4-level chain where one level's computed reads another level's cell.

**Verification:** `npx vitest run lib/__tests__/Reactive.vitest.spec.ts -t "inheritance|super|bottoms out at null"`

**Status:** provisional

**Last refined:** 2026-08-25

### Teardown stops watchers and drops only engine cells

**Invariant:** If `instance.$stopEffects()` is called, then the instance's lazily created effect scope is stopped and deleted, every cell the engine cached on the instance is deleted (unless `{ reset: false }`), no consumer-owned property or symbol is touched, and no user method is called.

**Scope:** The `$watch`, `$watchEffect`, and `$stopEffects` helpers on every `Reactive()` class. The scope exists only after the first `$watch` / `$watchEffect`; instances that never watch never allocate one. Cleanup of non-Vue resources is the consumer's ordinary method that calls `$stopEffects()` itself.

**Mechanism:** `$watch` / `$watchEffect` run inside `raw[SCOPE] ??= effectScope(true)` (`lib/Reactive.ts:238`, `:253`). `$stopEffects` (`:268-300`) stops that scope in a `try`, then in `finally` deletes `SCOPE` and walks child to base deleting exactly the symbols each level's `PROCESSED` marker lists (`:287-296`); `RAW` is not in any list and survives. The next read re-materializes a fresh cell (see `A member materializes once per instance`).

**Generates:** Component-outliving models (`session.dispose()` = own cleanup + `$stopEffects()`); suspend/resume via `{ reset: false }` + a fresh `startWatchers()`; the measured disposal numbers in `bench/disposal-vs-vue*.mjs` (retained leak 4.7 MB vs 85 MB when a reference is held).

**Rejected alternatives:** A teardown hook the engine calls — ivue never runs user code; `computed.effect.stop()` per cell — gone in Vue 3.5, and lazy computeds are collected once dereferenced anyway; deleting every own symbol — destroys consumer-owned symbols.

**Evidence:** `lib/Reactive.ts:231-300`. Tests: "clears cached computeds so they re-materialize fresh after teardown", "deletes cached bound methods without error", "never auto-calls user methods on teardown — no hooks, by design", "skips the RAW symbol while iterating (no crash on the raw anchor)", "{ reset: false } stops watchers but every cached cell survives", "$stopEffects stops watchers created via $watch", "pure-data instances never allocate a scope (zero overhead)", "reuses the same scope across multiple $watch calls"; adversarial: "teardown clears only engine cache keys — consumer symbols survive", "can allocate a fresh watcher scope after teardown", "richer cleanup composes as an ordinary method calling $stopEffects".

**Impossible if true:** A `$watch` callback firing after `$stopEffects()`; a consumer's own symbol-keyed property missing after teardown; `$stopEffects()` invoking a method the class defines; a pure-data instance owning an `ivue.scope` symbol; `RAW` missing after teardown.

**Verification:** `npx vitest run lib/__tests__/Reactive.vitest.spec.ts -t "teardown|\\$watch|scope"` and `npx vitest run lib/__tests__/ReactiveAdversarial.vitest.spec.ts -t "teardown|fresh watcher scope|richer cleanup"`

**Status:** provisional

**Last refined:** 2026-08-25

### A dollar getter caches its whole result forever

**Invariant:** If a converted getter's name starts with `$`, then its body runs once per instance on first read and the returned value — Ref or not, even `undefined` — is stored and returned on every later read of that instance.

**Scope:** Every `Reactive()` getter whose key begins with `$`, on every instance. Static `$`-getters have their own per-receiver rule under `Static()` (see the static records).

**Mechanism:** `cacheWhole = key[0] === '$'` at `lib/Reactive.ts:114`; the `cacheWhole` branch at `:126-130` stores the result under the member's symbol before the `isRef` check, so the plain-value erasure never applies to it.

**Generates:** The composable/store slot — `get $mouse() { return useMouse() }`, `private get $project() { return useProjectStore() }` — resolved on first touch (after Pinia/app is ready), circular-import safe, one instance per model.

**Rejected alternatives:** Detect "composable-shaped" results heuristically — no reliable signature; an explicit decorator or registry — a second API where a naming prefix already carries the intent.

**Evidence:** `lib/Reactive.ts:113-130`. Tests: "caches the WHOLE result forever, even non-refs (composable/service pattern)"; adversarial: "caches an undefined $-singleton result instead of rerunning it".

**Impossible if true:** A `$`-getter body running twice on one instance; `instance.$service !== instance.$service`; a `$`-getter that returned `undefined` re-running on the next read.

**Verification:** `npx vitest run lib/__tests__/Reactive.vitest.spec.ts -t "cacheWhole|WHOLE result"` and `npx vitest run lib/__tests__/ReactiveAdversarial.vitest.spec.ts -t "undefined \\$-singleton"`

**Status:** provisional

**Last refined:** 2026-08-25

### One class path runs in every environment

**Invariant:** If code runs a `Reactive()` class, then development, tests, SSR, and production execute the same transformed prototype — the engine contains no environment check, class registry, construct proxy, or hot-reload classifier.

**Scope:** `lib/Reactive.ts`, `lib/Static.ts`, `lib/LazyShared.ts` as shipped. Module replacement during development is Vite's and Vue's: they re-evaluate the module and reconstruct the owning component, so an instance always carries state and behavior from one class generation.

**Mechanism:** The engine files reference no `import.meta.env`, `process.env`, `__DEV__`, or `import.meta.hot`; `Reactive()` has a single code path ending in `return targetClass` (see `Reactive returns the class it was given`). Nothing exists that could branch by environment.

**Generates:** Benchmarks that measure what ships; identical `instanceof` and identity semantics in tests and production; no dev-only proxy layer for HMR.

**Rejected alternatives:** A dev-time class registry that hot-swaps prototypes on edit (the v1 `lib/ivue.ts` approach) — a hybrid instance mixing old state with new behavior, and a dev-only identity production never sees.

**Enforcement:** review-time — the constraint is an absence across three files; the Verification grep is the mechanical guard, and a guarding negative test is the next step (see Open question).

**Open question:** Add a vitest case that asserts the engine source contains no environment token, so the guard runs with the suite instead of by hand.

**Evidence:** `grep -n "import.meta.env\|process.env\|__DEV__\|import.meta.hot" lib/Reactive.ts lib/Static.ts lib/LazyShared.ts` returns nothing (checked 2026-08-25). Test: "returns the SAME class reference (mutates in place, no wrapper)".

**Impossible if true:** An `import.meta.env`, `process.env`, or `import.meta.hot` reference inside `lib/Reactive.ts`, `lib/Static.ts`, or `lib/LazyShared.ts`; a class whose transformed prototype differs between a vitest run and a production bundle; an instance whose constructor came from a different class generation than its prototype.

**Verification:** `grep -c "import.meta.env\|process.env\|__DEV__\|import.meta.hot" lib/Reactive.ts lib/Static.ts lib/LazyShared.ts` prints `0` for each file

**Status:** provisional

**Last refined:** 2026-08-25
### Each class transforms at load time in its own module

**Invariant:** If every class module runs `Reactive($Class)` as its own top-level side effect, then a hierarchy spread over any number of files is fully transformed after all modules load — each prototype level exactly once, by whichever module reaches it first — with no coordination between files.

**Scope:** Every module exporting a `Reactive()` class through the namespace pattern, including parent, grandparent, and child in separate files, and modules re-evaluated by Vite during development.

**Mechanism:** The `Class = Reactive($Class)` line executes at module load; because a level already carrying `PROCESSED` is skipped (see `A prototype level is transformed at most once`) and the class identity is unchanged (see `Reactive returns the class it was given`), a base transformed in `Base.ts` is skipped when `Child.ts` walks its chain, and the child still inherits the installed getters through the shared prototype.

**Generates:** The per-file authoring convention (one class per module, each calling `Reactive()` on itself); development module replacement that needs no custom class runtime — Vite re-evaluates the module and Vue reconstructs the owning component with the new hierarchy as one generation.

**Rejected alternatives:** One central `Reactive()` call over the whole hierarchy — an import-order manifest every new class must join; transforming in the constructor — per-instance cost and a race with subclasses.

**Evidence:** Tests: "Reactive(Parent) then Reactive(Child) skips the already-processed parent proto", "calling Reactive twice on the same class is safe and a no-op the 2nd time"; example modules `examples/playground/src/examples/workspace-platform/Project.ts:22-24`, `TaskList.ts:32-34`.

**Impossible if true:** A multi-file hierarchy with one level left untransformed after all modules load; an inherited getter double-wrapped after a module reload; a child module that must import its grandparent's module for the transform to complete.

**Verification:** `npx vitest run lib/__tests__/Reactive.vitest.spec.ts -t "idempotence"`

**Status:** provisional

**Last refined:** 2026-08-25

### Static returns a bound subclass and leaves the raw class untouched

**Invariant:** If `Static($X)` is called, then it returns a subclass of `$X` whose visible static methods are lazily bound per receiver with stable identity, and `$X` itself keeps native static behavior.

**Scope:** `Static()` from `ivue/extras` (`lib/Static.ts`) over stateless capability classes; the returned class is the namespace's `$Class` anchor (`export const $Class = Static($X); export let Class = Reactive($Class)`). Instance reactivity is `Reactive()`'s domain — `Static()` has no instance dimension.

**Mechanism:** `Static()` creates `class extends targetClass {}` (`lib/Static.ts:46`) and walks the static chain up to `Function.prototype` (`:49-53`), redefining each method as a getter that binds on first read and caches under a per-receiver own symbol `ivue.staticBound.<key>` (`:60-79`). A symbol own property, never the method name, means a parent-first read cannot install a parent-bound method where a subclass lookup would find it.

**Generates:** Static methods safe to retain as callbacks (routers, watchers, command handlers); the mutable `Class` slot a kernel or plugin can replace while consumers keep calling `X.Class.method`; `Static(Reactive($Class))` composition for classes needing both contracts.

**Rejected alternatives:** Bind by rewriting the raw class's statics — the raw class loses native behavior and `extends $Class` inherits the rewrite; cache under the method name — a parent-first read installs the parent's bound function on the subclass's chain.

**Evidence:** `lib/Static.ts:45-107`. Tests: "returns a subclass and leaves the raw class untouched", "binds methods lazily with stable identity, safe to detach", "walks the static inheritance chain; child overrides win", "binds symbol-keyed static methods with the same discipline", "method binding is order-correct: parent read first, child dispatch intact", "method binding is order-correct: child read first, parent unaffected", "composes with Reactive(): Static(Reactive($Class)) grants both contracts", "the anchor shape: $Class = Static($X), Class = Reactive($Class)".

**Impossible if true:** `Static($X) === $X`; `$X.method` returning a bound function after `Static($X)` ran; `Sub.method` dispatching to the parent's body because the parent was read first; `X.Class.method !== X.Class.method`.

**Verification:** `npx vitest run lib/__tests__/Static.vitest.spec.ts -t "subclass|stable identity|inheritance chain|symbol-keyed|order-correct|composes|anchor shape"`

**Status:** provisional

**Last refined:** 2026-08-25

### A static dollar getter caches once per receiver

**Invariant:** If a get-only static accessor named with a `$` prefix is read through a `Static()` class, then its body runs once per receiver class and later reads through that class return the stored value — each class in a hierarchy derives its own value through its own overrides, in any read order.

**Scope:** Get-only static accessors whose name starts with `$` on `Static()` classes and their subclasses. Non-`$` static getters stay live; accessor pairs with a setter are untouched. The `$` prefix promises stable identity per receiver, not immutability.

**Mechanism:** `Static()` redefines the getter to store the result under `Symbol.for('ivue.staticCache.<key>')` as an own property of `this` behind an `Object.hasOwn` guard (`lib/Static.ts:80-102`). `hasOwn` never walks the prototype chain, so a parent's cache cannot shadow a subclass and a subclass's first read runs the getter with its own overrides in place.

**Generates:** Per-class memo tables and tuning derived from static config; the shared-store rule that follows from it — a registry must NOT live in a `$` getter, because per-receiver caching forks it (see `A shared store lives in a LazyShared static readonly field`).

**Rejected alternatives:** Cache on the declaring class and let subclasses inherit — a subclass that overrides an input still reads the parent's stale derivation; a module-level `WeakMap` — the same value for every receiver, which is the shared-store case, not the per-class one.

**Evidence:** `lib/Static.ts:80-102`. Tests: "computes a $-getter exactly once per receiver", "is order-correct: parent read first, child override still wins", "is order-correct: child read first, parent unaffected", "promises stable identity, not immutability — memo tables mutate freely", "caches primitive results too", "leaves non-$ getters live — knobs re-read every time", "leaves accessor pairs with a setter untouched", "a subclass overriding the $-getter itself wins", "walks the raw inheritance chain — ancestor $-getters cache per receiver".

**Impossible if true:** A `$` static getter body running twice for one receiver; `Sub.$config` returning the parent's derivation after the parent was read first; a non-`$` static getter returning a cached value; `Sub.$table === Parent.$table` for a per-receiver memo.

**Verification:** `npx vitest run lib/__tests__/Static.vitest.spec.ts -t "\\$-getter|\\$-cached|order-correct|stable identity, not immutability|primitive results|knobs|accessor pairs"`

**Status:** provisional

**Last refined:** 2026-08-25

### A shared store lives in a LazyShared static readonly field

**Invariant:** If a static class owns state shared by every receiver (a registry, a ledger, a backend), then that state is held in a `static readonly` field whose value is a `LazyShared` cell — never in a `$` static getter and never in an eager field initializer that constructs another namespace's class.

**Scope:** Shared stores on `Static()` classes across ivue and consumer code that follows the standard. Per-class memos and config belong to `$` getters (see `A static dollar getter caches once per receiver`); dependency-free constants may stay eager fields.

**Mechanism:** The field eagerly stores the cell — a thunk evaluates nothing at module load, so it is cycle-safe; `LazyShared#value` (`lib/LazyShared.ts:44-61`) runs the thunk on first read, after every module in any import cycle has loaded, and memoizes inside the cell, so no receiver (subclass included) can fork it. A thunk that reads its own cell throws a named cycle error (`:46-51`), and a failed construction leaves the cell retryable (`:53-58`).

**Generates:** One registry per process regardless of how many subclasses read it; `LazyShared` shipping from `ivue/extras`; the Standard's rule "shared store = static readonly LazyShared field, per-class derivation = `$` getter".

**Rejected alternatives:** `static get $registry()` — per-receiver caching silently forks the registry per subclass; `static readonly registry = new Registry.Class()` — constructs at module load and races the import cycle; a module-level singleton variable — cannot be reset for tests or recomposed by a kernel.

**Evidence:** `lib/LazyShared.ts:37-71`. Tests: "evaluates nothing at definition, constructs once, shares the result", "every receiver converges on the ONE singleton — forking the access path is harmless", "even a per-receiver $-cache over the cell returns the same singleton", "reset drops the value and the next read constructs again", "a thunk cycle throws a named error and leaves the cell retryable", "a throwing thunk does not poison the cell — the next read retries".

**Impossible if true:** `Sub.store !== Parent.store` for a `LazyShared`-held store; the store's constructor running at module load; a thunk cycle surfacing as a bare `RangeError: Maximum call stack size exceeded`; a cell staying broken after its thunk threw once.

**Verification:** `npx vitest run lib/__tests__/LazyShared.vitest.spec.ts`

**Status:** provisional

**Last refined:** 2026-08-25
