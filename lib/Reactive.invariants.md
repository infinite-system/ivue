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
`targetClass` unchanged (`return targetClass as any`, line 213).

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
line 163; marked at lines 182–186). The chain is walked base→child
(`chain.reverse()`, line 158) so ancestors are always settled before descendants.

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

**Mechanism.** Method getter resolves `const raw = this[RAW] ?? (this[RAW] = toRaw(this))`
(line 52); computed getter and `$stopEffects` use `toRaw(this)` (lines 89, 196).
Caches are keyed by per-prototype symbols (A4/A7).

**Guarantees.** Whether an instance is used directly (`new Class()`) or wrapped in
`reactive(new Class())`, reads and writes resolve to one canonical storage and
one cached cell per `(instance, key)`. Through a proxy, Vue additionally
auto-unwraps a returned ref, so you read the value without `.value`; the
underlying cell is still the same one on the raw object.

**Impossible if true.** You cannot get two different refs for the same property on
the same instance via proxy-vs-raw access; a write through the proxy cannot
silently land on a different cell than a read through the raw object; caches
cannot leak onto the proxy and escape teardown.

**Test.** *lazy-bound methods › works when the instance IS wrapped in reactive() (toRaw anchoring)*.

---

### A4. Stable lazy identity

**Statement.** Each reactive getter is materialized at most once per instance and
returns the identical ref/computed on every subsequent read; each method returns
the identical bound function on every access.

**Mechanism.** Computed getter caches under a symbol and short-circuits on
`if (superKey in raw) return raw[superKey]` (line 92, store at 106). Method getter
caches the bound function: `raw[superKey] ?? (raw[superKey] = originalFn.bind(raw))`
(line 53).

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
`originalGetter.call(toRaw(this))` (lines 107–124), preserving the setter if one
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

**Mechanism.** `getSuperKey(proto, key)` allocates a **per-prototype** symbol map
(`SK_MAP`, created shadowing parents at lines 27–34) and a distinct `Symbol(key)`
per prototype level (line 36). So `Base.prototype`'s cache for `summary` and
`Child.prototype`'s cache for `summary` live under different symbols on the same
instance. Chain processed base→child (A2).

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

### A8. Deterministic teardown

**Statement.** `$stopEffects()` releases every per-instance reactive cell the
engine cached, and is installed exactly once per class.

**Mechanism.** Injected only if absent (`if (!prototypeHasOwnProperty(targetClass.prototype, $stopEffects)`,
line 190). It calls a user `stopEffects()` hook if present (line 197), then
iterates the raw object's own symbols, skips `RAW` (line 202), stops any cell that
exposes `effect.stop()` (lines 204–206), and deletes every cache symbol (line 207).

**Guarantees.** Cached computeds/methods are dropped so they become
garbage-collectable; a class can expose its own `stopEffects()` for extra cleanup;
re-accessing a member after teardown re-materializes it fresh (A4 resets).

**Impossible if true.** Teardown cannot leave the `RAW` anchor in a broken state;
it cannot run twice from a double `Reactive()` call.

**Scope limit (see "Known limits").** Under **Vue 3.5+**, `computed().effect.stop`
no longer exists, so the `effect.stop()` call is skipped for computeds — teardown
becomes "clear the cache" rather than "force-stop the effect". Raw `watch()` calls
created inside `init()`/constructors are **not** tracked by `$stopEffects` at all.

**Tests.** *$stopEffects teardown › clears cached computeds …*, *… deletes cached
bound methods …*, *… calls a user-defined stopEffects() hook*, *… invokes
effect.stop() when a cached value exposes one*, *… injected only once*.

---

### A9. `$`-prefixed singletons

**Statement.** A getter whose name starts with `$` is cached *whole, forever* on
first access — even if its result is not a ref.

**Mechanism.** `cacheWhole = key[0] === '$'` (line 74); when set, the result is
stored and returned without the `isRef` check (lines 98–102).

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

1. **Vue 3.5 teardown (A8).** `computed().effect.stop` was removed in Vue 3.5, so
   `$stopEffects` clears caches but does not force-stop computed effects. For hard
   teardown of *subscriptions* (render effects, watchers), rely on component
   unmount or wrap effects in an `effectScope`.
2. **Untracked `watch()` (A8).** Raw `watch()`/`watchEffect()` created in
   `init()`/constructor bodies (e.g. demo `Container.ts`) are not registered with
   `$stopEffects` and will leak unless created inside an `effectScope` whose stop
   you call. Recommended hardening: create per-instance effects in a scope and
   stop it from a user `stopEffects()` hook.
3. **Circular inheritance (B11).** Only cross-references are solved; circular
   `extends` remains impossible by construction.
4. **`.value` ergonomics.** Reactive state is accessed with `.value` outside of a
   `reactive()`/template auto-unwrap context. This is the one ergonomic cost
   relative to ivue v1's proxy model.

---

## Coverage

`lib/__tests__/Reactive.vitest.spec.ts` — 39 tests, **100% of functions and
99.45% of lines** of `lib/Reactive.ts`. The single uncovered line (the `: undefined`
getter fallback in the de-opt `defineProperty`) is structurally unreachable: the
de-opt branch only executes inside a getter that, by definition, exists.
