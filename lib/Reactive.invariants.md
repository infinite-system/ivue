# `Reactive.ts` — Invariants

This document is the structural specification of `Reactive.ts` (ivue "v2"): the
guarantees the implementation maintains, *why* each one holds, and — crucially —
what each one makes **impossible**. An invariant that only says what *can* happen
is a description; an invariant that also says what *cannot* happen is a contract
you can test against. Each entry below lists both.

`Reactive(Class)` reduces to a single idea:

> **Transform a plain class's prototype exactly once so that its getters become
> lazily-cached reactive cells and its methods become lazily-bound functions —
> while the instances themselves stay plain objects with zero per-instance
> reactive cost.**

Everything else is a consequence of making that idea safe under inheritance,
proxies, hot-reload, and circular imports.

Line references are to `lib/Reactive.ts`. Tests are in
`lib/__tests__/Reactive.vitest.spec.ts`.

---

## Part A — Runtime invariants (intrinsic to `Reactive()`)

### A1. Identity preservation

**Statement.** `Reactive(Class)` returns the *same* constructor it was given
(mutated in place), never a wrapper or subclass.

**Mechanism.** The function transforms `Class.prototype` and returns
`targetClass` unchanged (`return targetClass as any`, line 263).

**Guarantees.** `Reactive(X) === X`. `instanceof` still works. The raw class and
the reactive class share one prototype lineage, which is what lets a child
`extends ParentRawClass` and still inherit the reactive behaviour (see A7, B11).

**Impossible if true.** There can be no "reactive copy" with a divergent
prototype; you can never end up with two class identities for one declaration;
`x instanceof Class` cannot break after transformation.

**Test.** *identity & return value › returns the SAME class reference*.

---

### A2. Idempotent, process-once prototype transformation

**Statement.** Each prototype level in the chain is transformed at most once,
regardless of how many times `Reactive()` is called or through how many subclasses
a base is reached.

**Mechanism.** Per-prototype `PROCESSED` symbol flag; the chain loop skips any
prototype already carrying it (`if (prototypeHasOwnProperty(prototype, PROCESSED)) continue`,
line 191; marked at lines 212–217). The chain is walked base→child
(`chain.reverse()`, line 186) so ancestors are always settled before descendants.

**Guarantees.** Calling `Reactive()` again is a safe no-op. A base class
transformed in its own module is **not** re-transformed when a child in another
module calls `Reactive()` on itself — the child's chain walk hits the base's
`PROCESSED` flag and skips it. This is the property that makes the per-file
authoring pattern (B10) correct.

**Impossible if true.** A getter cannot be double-wrapped (which would otherwise
nest caches or re-run the de-opt logic on an already-restored getter); the
`$stopEffects` method cannot be installed twice; diamond/shared-base layouts
cannot produce inconsistent transformation depending on load order.

**Tests.** *idempotence (PROCESSED flag) › calling Reactive twice …* and
*… then Reactive(Child) skips the already-processed parent proto*.

---

### A3. Raw-anchored single source of truth

**Statement.** All per-instance state created by the engine — cached refs,
cached computeds, bound methods, and the `RAW` back-pointer — lives on
`toRaw(this)`, never on a Vue reactive proxy of the instance.

**Mechanism.** Every engine entry point — method get/set, computed getter,
de-opted getter/setter, `$watch`, `$stopEffects` — resolves the true raw via
`resolveRaw()` (lines 44–61): try `toRaw(this)` first (unwraps a genuine Vue
reactive chain in one step, and stamps the per-instance `RAW` back-pointer on
the raw), then fall back to the back-pointer for anything `toRaw()` cannot see
through — chiefly Vue's component **expose proxy**, which does not answer
`__v_raw`. The pointer itself is normalized with `toRaw()` on the way out,
because a symbol-keyed OBJECT read through a reactive proxy comes back
deep-wrapped (`reactive(raw)`). Caches are keyed by per-prototype symbols
(A4/A7).

Neither primitive suffices alone — `toRaw()` misses foreign proxies, and the
raw pointer read through a reactive proxy comes back wrapped. The engine once
used `this[RAW] ?? toRaw(this)` directly; after the pointer was stamped, the
first access of any OTHER method through the proxy bound that method to the
wrapped pointer and cached it on the true raw — poisoning the cache with
ref-unwrapping `this` semantics (`this.x.value` crashed for every caller
because `this.x` auto-unwrapped to the plain value).

**Guarantees.** Whether an instance is used directly (`new Class()`) or wrapped in
`reactive(new Class())`, reads and writes resolve to one canonical storage and
one cached cell per `(instance, key)`. Through a proxy, Vue additionally
auto-unwraps a returned ref, so you read the value without `.value`; the
underlying cell is still the same one on the raw object.

**Impossible if true.** You cannot get two different refs for the same property on
the same instance via proxy-vs-raw access; a write through the proxy cannot
silently land on a different cell than a read through the raw object; caches
cannot leak onto the proxy and escape teardown; a method (or computed closure)
cannot be bound to a ref-unwrapping proxy and cached — regardless of which
proxy chain (reactive wrapper, expose proxy) performed the first access.

**Tests.** *lazy-bound methods › works when the instance IS wrapped in reactive() (toRaw anchoring)*;
*raw resolution through proxy chains (resolveRaw) › a method first-accessed
through reactive() AFTER the pointer is stamped still binds to the raw (no
cache poisoning)*; *… › resolves the true raw through an opaque foreign proxy
(component expose-proxy shape)*.

---

### A4. Stable lazy identity

**Statement.** Each reactive getter is materialized at most once per instance and
returns the identical ref/computed on every subsequent read; each method returns
the identical bound function on every access.

**Mechanism.** Computed getter caches under a symbol and short-circuits on
`if (superKey in raw) return raw[superKey]` (line 122, store at 136). Method getter
caches the bound function: `raw[superKey] ?? (raw[superKey] = originalFn.bind(raw))`
(lines 80–81).

**Guarantees.** Referential stability. A `watch(() => inst.area.value, …)` stays
attached because `inst.area` is always the same computed. A method is safe to pass
as an event handler or a dependency because its identity does not change between
renders.

**Impossible if true.** A property cannot return a fresh ref on each read (which
would drop watchers and break two-way bindings); `inst.method !== inst.method`
cannot happen.

**Tests.** *lazy reactive getters › caches the SAME ref instance across accesses*;
*lazy-bound methods › returns a stable, bound function across accesses*.

---

### A5. Pay-for-what-you-use materialization

**Statement.** Construction performs zero reactive work. No proxy is created, no
ref/computed is allocated, no method is bound until first access of that member.

**Mechanism.** All work happens in prototype getters defined by
`convertToLazyComputed` / `convertToLazyBoundMethod`; `new Class()` only runs the
user constructor. Instances are never passed to `reactive()` by the engine.

**Guarantees.** Creating N instances costs N plain `new` calls. Instances that are
created but never touched (off-screen list items, pooled entities) carry
essentially no reactive overhead. *(Measured: 100k instances allocate in ~0.7ms
vs ~37–43ms for `reactive()`/composables and ~169ms for ivue v1.)*

**Impossible if true.** Instantiation cost cannot scale with the number of
reactive members declared on the class; an unused getter cannot allocate a
computed.

**Test.** *identity & return value › instances are plain (NOT a reactive proxy)*
(asserts `isReactive(inst) === false` and `toRaw(inst) === inst`).

---

### A6. Self-erasing overhead (de-optimization)

**Statement.** A getter that returns a *non-ref* plain value is detected on first
access and the engine's wrapper is removed — the original getter is restored on
the prototype for all future instances.

**Mechanism.** In the computed getter, the `else` branch (not `isRef(result)`)
redefines the prototype property back to a thin getter that calls
`originalGetter.call(resolveRaw(this))` (lines 140–151), preserving the setter if one
exists.

**Guarantees.** Getters used for plain derived values converge toward native
getter cost; you do not pay reactive-cell machinery for non-reactive getters. The
restored getter still routes through `toRaw(this)` so it remains proxy-safe.

**Impossible if true.** A plain-value getter cannot keep paying the wrapper /
symbol-cache overhead on every instance forever; it cannot be cached as a fake
"ref".

**Tests.** *self-optimizing de-optimization › getter returning a plain value
de-opts …* (with and without a setter).

---

### A7. Inheritance & `super` fidelity

**Statement.** Getters and methods resolve correctly across the full prototype
chain, including `super.x` / `super.x.value`, with no collision between a parent's
cached cell and a child's.

**Mechanism.** During processing, each `(prototype, key)` is assigned a fresh
`Symbol(key)` in the `Reactive` loop. Because every prototype level is processed
independently, `Base.prototype`'s cache for `summary` and `Child.prototype`'s
cache for `summary` live under different symbols on the same instance. Chain
processed base→child (A2). (Earlier versions memoized these symbols in a
per-prototype `SK_MAP`; a fresh `Symbol(key)` per level is inherently
collision-free and needs no map.)

**Guarantees.** A child computed can call `super.summary.value` and receive the
*parent's* cell, not its own — enabling the demo's
`{Leaf>(Mid>[Base:div])}` style chains. Overridden getters/setters at different
levels cooperate exactly as in native classes.

**Impossible if true.** `super.x` cannot resolve back to the child's own cached
value (which would infinite-loop or return the wrong layer); a parent and child
sharing a property name cannot clobber each other's cache.

**Tests.** *inheritance & super chains › resolves getters across a 3-level chain
with super.x.value*; *… cached under different symbols (no collision)*.

---

### A8. Deterministic teardown (scope-based)

**Statement.** The engine installs two helpers per class, exactly once: `$watch`
registers watchers in a lazily-created per-instance effect scope, and
`$stopEffects()` stops that scope, runs a user `stopEffects()` hook, and drops
every cached cell.

**Mechanism.** Both are injected only if absent (guarded by
`prototypeHasOwnProperty(targetClass.prototype, $stopEffects)`). `$watch` does
`(raw[SCOPE] ??= effectScope(true)).run(() => watch(...))` — the scope is
allocated on first use only. `$stopEffects` calls the user hook if present, calls
`raw[SCOPE].stop()` if a scope exists, then iterates the raw object's own symbols,
skips `RAW`, and deletes every cache symbol (including the scope).

**Guarantees.** Watchers created via `$watch` are stopped deterministically.
Cached refs/computeds/methods are dropped so they become garbage-collectable; a
class can expose its own `stopEffects()` for extra cleanup; re-accessing a member
after teardown re-materializes it fresh (A4 resets). **Pure-data instances that
never call `$watch` allocate no scope at all** — teardown stays pay-for-what-you-use
(A5).

**Why scope-based, not `effect.stop()`.** In Vue 3.5+, `computed().effect.stop` no
longer exists, and refs/lazy-computeds need no explicit stop — they are collected
once dereferenced (clearing the cache suffices). The only thing that genuinely
needs stopping is user-created watchers, which is exactly what the effect scope
owns. So the engine stops the *scope*, not individual cells.

**Impossible if true.** A `$watch`-registered watcher cannot survive
`$stopEffects()`; teardown cannot leave the `RAW` anchor in a broken state; the
helpers cannot be installed twice from a double `Reactive()` call.

**Tests.** *$watch + lazy effect scope › a watcher … fires on change*, *… stops
watchers created via $watch*, *… pure-data instances never allocate a scope*, *…
reuses the same scope*; *$stopEffects teardown › clears cached computeds …*, *…
deletes cached bound methods …*, *… calls a user-defined stopEffects() hook*, *…
injected only once*.

---

### A9. `$`-prefixed singletons

**Statement.** A getter whose name starts with `$` is cached *whole, forever* on
first access — even if its result is not a ref.

**Mechanism.** `cacheWhole = key[0] === '$'` (line 105); when set, the result is
stored and returned without the `isRef` check (lines 128–132).

**Guarantees.** The canonical "create this composable/service exactly once per
instance" slot, e.g. `get $mouse() { return useMouse() }`. The original getter
runs once; later reads return the same object.

**Impossible if true.** A `$`-getter cannot re-run its body on each access (which
would create a new composable/subscription every read).

**Test.** *$-prefixed singletons › caches the WHOLE result forever*.

---

## Part B — Module / import invariants (the companion namespace convention)

These are not lines of code inside `Reactive()`; they are properties of the
**authoring convention** the engine is designed to be used with, made *correct* by
the Part-A invariants (chiefly A1 identity-preservation and A2 process-once). They
are the reason `Reactive.ts` handles cross-file hierarchies and circular imports
gracefully where ivue v1 does not.

The convention (see `demo/components/{BaseElement,Container,InteractiveBox}.ts`):

```ts
class $Thing extends Parent.$Class { /* getters return ref()/computed() */ }

export namespace Thing {
  export const $Class = $Thing;          // RAW class — used by children to `extends`
  export const Class  = Reactive($Thing); // REACTIVE class — used to `new`
  export type Instance = typeof Class.Instance;
}
```

A TypeScript `namespace` compiles to a **hoisted `var` populated by an IIFE**:

```js
export var Thing;
((Thing) => {
  Thing.$Class = $Thing;
  Thing.Class  = Reactive($Thing);
})(Thing || (Thing = {}));
```

### B10. Module-load-time, per-file composable transformation

**Statement.** Each class is transformed in its own module at load time, and the
transformations compose across files without coordination — shared ancestors are
transformed once, by whichever module loads first.

**Mechanism.** `Reactive($Thing)` runs as the module's top-level side effect.
Because of A2 (process-once) and A1 (identity), a base transformed in `Base.ts`
and reached again through `Child.ts`'s chain walk is detected as `PROCESSED` and
skipped — yet `Child` still inherits the already-installed reactive getters via
the shared prototype.

**Guarantees.** Parent, grandparent, and child classes can live in **separate
files**. Editing one file re-runs only that module's `Reactive()` call, which is
idempotent, so hot-module-replacement does not desynchronize the chain. (ivue v1
builds its accessor maps per `ivue()` call keyed by class identity at *instantiation*
time; when only one file in a multi-file hierarchy hot-reloads, class identities
and prototype links across the boundary fall out of sync — which is why v1
hierarchies are kept in a single file.)

**Impossible if true.** A multi-file hierarchy cannot end up partially
transformed; re-running a module cannot double-wrap an inherited getter.

---

### B11. Raw/reactive split over a hoisted namespace object → circular-import & HMR robustness

**Statement.** Exposing the class through a namespace object as two members —
`$Class` (raw, for `extends`) and `Class` (reactive, for `new`) — lets
cross-referencing modules resolve each other regardless of load order.

**Mechanism.** The namespace binding is a **hoisted `var`** (proven above), not a
`const`/`class` (which sit in the temporal dead zone during circular evaluation).
So an importer always receives a live reference to the namespace *object*; it
reads `.Class` / `.$Class` **lazily**, at the point of use. Method bodies that do
`new Other.Class()` run at call time, by which point every namespace is fully
populated — so "A's methods use B, B's methods use A" cycles resolve cleanly in
either load order.

**Guarantees.** The common form of circular dependency between domain classes
(mutual *references*, the kind that normally throws `Cannot access 'X' before
initialization`) is eliminated. Combined with A1, the same constructor identity is
used everywhere, so `instanceof` and clone/equality checks stay consistent across
modules.

**Impossible if true.** A mutual cross-reference between two class modules cannot
throw a TDZ / "before initialization" error purely due to import ordering.

**Scope limit (honest boundary).** This solves circular *references*, not circular
*inheritance*. `class $A extends B.$Class` still evaluates `B.$Class` at A's load
time, so a true `A extends B` / `B extends A` cycle is still impossible — but that
is logically impossible in any language, not a limitation of this pattern.

---

## Known limits / scope boundaries

These are deliberately listed so the invariants above are not over-read:

1. **Use `$watch` for tracked teardown (A8).** Watchers registered with the
   engine's `$watch` are owned by the instance's effect scope and stopped by
   `$stopEffects`. A **raw** `watch()`/`watchEffect()` created directly (e.g. the
   demo `Container.ts` calls `watch(...)` in `init()`) is *not* in that scope and
   leaks unless you create it via `this.$watch(...)` or your own `effectScope`.
   For component-scoped instances, the active component scope already stops
   synchronously-created watchers on unmount, so `$stopEffects` is optional there.
2. **Computeds rely on GC, not `stop()` (A8).** Lazy computeds are collected once
   dereferenced (and use lazy subscription in Vue 3.5), so the engine does not call
   `effect.stop()` on them; clearing the cache + dropping the instance is enough.
3. **Circular inheritance (B11).** Only cross-references are solved; circular
   `extends` remains impossible by construction.
4. **`.value` ergonomics.** Reactive state is accessed with `.value` outside of a
   `reactive()`/template auto-unwrap context. This is the one ergonomic cost
   relative to ivue v1's proxy model.

---

## Coverage

`lib/__tests__/Reactive.vitest.spec.ts` — **100% statements, 100% branches, 100%
functions, 100% lines** of `lib/Reactive.ts` (including every `resolveRaw`
branch, via the *raw resolution through proxy chains* regression tests). The dead defensive branches that
previously blocked full coverage (the `originalGetter ? … : undefined` fallbacks,
the redundant `!desc` guards, and the `getSuperKey` memoization) were removed by
construction during the refactor rather than ignored.
