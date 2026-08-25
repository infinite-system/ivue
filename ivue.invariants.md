# ivue invariants

The living contract for the `ivue` engine: `Reactive()` (`lib/Reactive.ts`), `Static()` (`lib/Static.ts`), and `LazyShared` (`lib/LazyShared.ts`). Records are unnumbered; the name is the identifier and is referenced verbatim by code annotations (`// invariant: <name> (ivue.invariants.md)`) and by the derived prose at `docs_v2/reference/invariants.md`.

Two kinds of records, and the split is load-bearing:

- **Reality-based invariants** are forced by how JavaScript and Vue actually work. They are discovered, not chosen; a record that is reality only inside ivue and decided at a wider scope names that scope in `Renegotiable at`.
- **Chosen invariants** are the engine's own disciplines. Each could be otherwise and still be coherent; the system depends on it not drifting.

Chosen invariants stand on reality invariants, never the reverse.

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
