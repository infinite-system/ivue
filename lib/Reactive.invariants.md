# `Reactive.ts` — Invariants

This document is the structural specification of `Reactive.ts` (ivue "v2"): the
guarantees the implementation maintains, _why_ each one holds, and — crucially —
what each one makes **impossible**. An invariant that only says what _can_ happen
is a description; an invariant that also says what _cannot_ happen is a contract
you can test against. Each entry below lists both.

`Reactive(Class)` reduces to a single idea:

> **Transform a plain class's prototype exactly once so that its getters become
> lazily-cached reactive cells and its methods become lazily-bound functions —
> while the instances themselves stay plain objects with zero per-instance
> reactive cost.**

Everything else is a consequence of making that idea safe under inheritance,
proxies, hot-reload, and circular imports.

References name functions and tests rather than line numbers — symbols
survive edits, line numbers don't. Tests are in
`lib/__tests__/Reactive.vitest.spec.ts` (core) and
`lib/__tests__/ReactiveHmr.vitest.spec.ts` (hot-swap).

---

## Runtime invariants (intrinsic to `Reactive()`)

### Identity preservation

**Statement.** `Reactive(Class)` returns ONE stable identity for the class's
whole lifetime. In test/SSR/prod that is the _same_ constructor it was given
(mutated in place — never a wrapper or subclass). In Vite dev serve (HMR
armed — see _Hot-swap continuity_) it is a construct-trap proxy over that
same constructor: a deliberate, dev-only exception whose entire purpose is to
make the identity survive module re-executions too.

**Mechanism.** The function transforms `Class.prototype` in place and returns
`targetClass` (prod/test) or the registered proxy (dev serve, `hmrActive()`).

**Guarantees.** `Reactive(X) === X` outside dev serve. In every environment:
`instanceof` works (the proxy exposes the same `prototype`), the raw class
and the reactive class share one prototype lineage — which is what lets a
child `extends ParentRawClass` and still inherit the reactive behaviour (see
_Inheritance & `super` fidelity_ and the namespace-split invariant, both
below) — and repeated `Reactive(X)` calls return the identical object.

**Impossible if true.** There can be no "reactive copy" with a divergent
prototype; you can never end up with two class identities for one declaration
— **not even across hot updates**; `x instanceof Class` cannot break after
transformation.

**Test.** _identity & return value › returns the SAME class reference_ (the
classic contract; HMR-armed identity is covered by
_ReactiveHmr › preserves identity, state and updates behavior_).

---

### Idempotent, process-once prototype transformation

**Statement.** Each prototype level in the chain is transformed at most once,
regardless of how many times `Reactive()` is called or through how many subclasses
a base is reached.

**Mechanism.** Per-prototype `PROCESSED` symbol flag; the chain loop in
`Reactive()` skips any prototype already carrying it and marks each level
after processing. The chain is walked base→child (`chain.reverse()`) so
ancestors are always settled before descendants.

**Guarantees.** Calling `Reactive()` again is a safe no-op. A base class
transformed in its own module is **not** re-transformed when a child in another
module calls `Reactive()` on itself — the child's chain walk hits the base's
`PROCESSED` flag and skips it. This is the property that makes the per-file
authoring pattern (see _Module-load-time, per-file composable transformation_,
below) correct.

**Impossible if true.** A getter cannot be double-wrapped (which would otherwise
nest caches or re-run the de-opt logic on an already-restored getter); the
`$stopEffects` method cannot be installed twice; diamond/shared-base layouts
cannot produce inconsistent transformation depending on load order.

**Tests.** _idempotence (PROCESSED flag) › calling Reactive twice …_ and
_… then Reactive(Child) skips the already-processed parent proto_.

---

### Raw-anchored single source of truth

**Statement.** All per-instance state created by the engine — cached refs,
cached computeds, bound methods, and the `RAW` back-pointer — lives on
`toRaw(this)`, never on a Vue reactive proxy of the instance.

**Mechanism.** Every engine entry point — method get/set, computed getter,
de-opted getter/setter, `$watch`, `$stopEffects` — resolves the true raw via
`resolveRaw()`: try `toRaw(this)` first (unwraps a genuine Vue
reactive chain in one step, and stamps the per-instance `RAW` back-pointer on
the raw), then fall back to the back-pointer for anything `toRaw()` cannot see
through — chiefly Vue's component **expose proxy**, which does not answer
`__v_raw`. The pointer itself is normalized with `toRaw()` on the way out,
because a symbol-keyed OBJECT read through a reactive proxy comes back
deep-wrapped (`reactive(raw)`). Caches are keyed by per-prototype symbols (see
_Stable lazy identity_ and _Inheritance & `super` fidelity_, below).

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

**Tests.** _lazy-bound methods › works when the instance IS wrapped in reactive() (toRaw anchoring)_;
_raw resolution through proxy chains (resolveRaw) › a method first-accessed
through reactive() AFTER the pointer is stamped still binds to the raw (no
cache poisoning)_; _… › resolves the true raw through an opaque foreign proxy
(component expose-proxy shape)_.

---

### Stable lazy identity

**Statement.** Each reactive getter is materialized at most once per instance and
returns the identical ref/computed on every subsequent read; each method returns
the identical bound function on every access.

**Mechanism.** The computed getter (`convertToLazyComputed`) caches under a
symbol and short-circuits on `if (superKey in raw) return raw[superKey]`.
The method getter (`convertToLazyBoundMethod`) caches the bound function on
first access the same way.

**Guarantees.** Referential stability. A `watch(() => instance.area.value, …)` stays
attached because `instance.area` is always the same computed. A method is safe to pass
as an event handler or a dependency because its identity does not change between
renders.

**Impossible if true.** A property cannot return a fresh ref on each read (which
would drop watchers and break two-way bindings); `instance.method !== instance.method`
cannot happen.

**Tests.** _lazy reactive getters › caches the SAME ref instance across accesses_;
_lazy-bound methods › returns a stable, bound function across accesses_.

---

### Pay-for-what-you-use materialization

**Statement.** Construction performs zero reactive work. No proxy is created, no
ref/computed is allocated, no method is bound until first access of that member.

**Mechanism.** All work happens in prototype getters defined by
`convertToLazyComputed` / `convertToLazyBoundMethod`; `new Class()` only runs the
user constructor. Instances are never passed to `reactive()` by the engine.

**Guarantees.** Creating N instances costs N plain `new` calls. Instances that are
created but never touched (off-screen list items, pooled entities) carry
essentially no reactive overhead. _(Measured: 100k instances allocate in ~0.7ms
vs ~37–43ms for `reactive()`/composables and ~169ms for ivue v1.)_

**Impossible if true.** Instantiation cost cannot scale with the number of
reactive members declared on the class; an unused getter cannot allocate a
computed.

**Test.** _identity & return value › instances are plain (NOT a reactive proxy)_
(asserts `isReactive(instance) === false` and `toRaw(instance) === instance`).

---

### Self-erasing overhead (de-optimization)

**Statement.** A getter that returns a _non-ref_ plain value is detected on first
access and the engine's wrapper is removed — the original getter is restored on
the prototype for all future instances.

**Mechanism.** In the computed getter, the `else` branch (not `isRef(result)`)
redefines the prototype property back to a thin getter that calls
`originalGetter.call(resolveRaw(this))`, preserving the setter if one
exists.

**Guarantees.** Getters used for plain derived values converge toward native
getter cost; you do not pay reactive-cell machinery for non-reactive getters. The
restored getter still routes through `toRaw(this)` so it remains proxy-safe.

**Impossible if true.** A plain-value getter cannot keep paying the wrapper /
symbol-cache overhead on every instance forever; it cannot be cached as a fake
"ref".

**Tests.** _self-optimizing de-optimization › getter returning a plain value
de-opts …_ (with and without a setter).

---

### Inheritance & `super` fidelity

**Statement.** Getters and methods resolve correctly across the full prototype
chain, including `super.x` / `super.x.value`, with no collision between a parent's
cached cell and a child's.

**Mechanism.** During processing, each `(prototype, key)` is assigned a fresh
`Symbol(key)` in the `Reactive` loop. Because every prototype level is processed
independently, `Base.prototype`'s cache for `summary` and `Child.prototype`'s
cache for `summary` live under different symbols on the same instance. Chain
processed base→child (see _Idempotent, process-once prototype transformation_,
above). (Earlier versions memoized these symbols in a per-prototype `SK_MAP`; a
fresh `Symbol(key)` per level is inherently collision-free and needs no map.)

**Guarantees.** A child computed can call `super.summary.value` and receive the
_parent's_ cell, not its own — enabling the demo's
`{Leaf>(Mid>[Base:div])}` style chains. Overridden getters/setters at different
levels cooperate exactly as in native classes.

**Impossible if true.** `super.x` cannot resolve back to the child's own cached
value (which would infinite-loop or return the wrong layer); a parent and child
sharing a property name cannot clobber each other's cache.

**Tests.** _inheritance & super chains › resolves getters across a 3-level chain
with super.x.value_; _… cached under different symbols (no collision)_.

---

### Deterministic teardown (scope-based)

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
after teardown re-materializes it fresh (per _Stable lazy identity_, above, the
cache simply refills on next access). **Pure-data instances that never call
`$watch` allocate no scope at all** — teardown stays pay-for-what-you-use (see
_Pay-for-what-you-use materialization_, above).

**Why scope-based, not `effect.stop()`.** In Vue 3.5+, `computed().effect.stop` no
longer exists, and refs/lazy-computeds need no explicit stop — they are collected
once dereferenced (clearing the cache suffices). The only thing that genuinely
needs stopping is user-created watchers, which is exactly what the effect scope
owns. So the engine stops the _scope_, not individual cells.

**Impossible if true.** A `$watch`-registered watcher cannot survive
`$stopEffects()`; teardown cannot leave the `RAW` anchor in a broken state; the
helpers cannot be installed twice from a double `Reactive()` call.

**Tests.** _$watch + lazy effect scope › a watcher … fires on change*, *… stops
watchers created via $watch_, _… pure-data instances never allocate a scope_, _…
reuses the same scope_; _$stopEffects teardown › clears cached computeds …_, _…
deletes cached bound methods …_, _… calls a user-defined stopEffects() hook_, _…
injected only once_.

---

### `$`-prefixed singletons

**Statement.** A getter whose name starts with `$` is cached _whole, forever_ on
first access — even if its result is not a ref.

**Mechanism.** `cacheWhole = key[0] === '$'` in `convertToLazyComputed`;
when set, the result is stored and returned without the `isRef` check.

**Guarantees.** The canonical "create this composable/service exactly once per
instance" slot, e.g. `get $mouse() { return useMouse() }`. The original getter
runs once; later reads return the same object.

**Impossible if true.** A `$`-getter cannot re-run its body on each access (which
would create a new composable/subscription every read).

**Test.** _$-prefixed singletons › caches the WHOLE result forever_.

---

### Hot-swap continuity (HMR — dev serve only)

**The invariant underneath** (this section's generator): **closures freeze at
creation; prototype lookups stay live.** Everything a live instance reaches
through a lookup evaluated at call time — prototype members, method slots,
its own cached refs — can be swapped under it; everything captured into a
closure at creation time cannot. Every mechanism below (grafting, slots,
tombstones, frozen-cache escalation) and the companion authoring convention
(thin computeds that delegate to methods — see
`docs_v2/guide/computed-watch.md`, "Point the computed at a method") is a direct
consequence of which side of that line a piece of code lives on.

**Statement.** When a self-accepting class module re-executes under Vite dev
serve, the new class is **grafted onto the canonical identity**: live
instances keep all their state and immediately run the new behaviour; new
instances are built by the latest constructor. Constructor-level edits
(ctor body, field initializers, statics) escalate AUTOMATICALLY: the graft
diffs a constructor signature and the module's accept callback
(`ivueHotUpdate`) invalidates the module, remounting just the owning
components — which rebuild through the construct trap with the new
constructor. No second class identity ever exists; a full page reload is
never required. Everywhere else (test, SSR,
prod) this machinery does not exist at runtime — call sites are gated on the
statically-replaceable `import.meta.env.DEV`, so production bundles contain
**zero** HMR code (verified by grepping `dist/` after a build).

**Mechanism.** A `globalThis` registry keyed by class name (or explicit
`hmrId`) marks the first registration canonical; `hmrGraft()` re-runs the
per-member processing on the canonical prototype with the donor's raw
descriptors, REUSING per-(prototype, key) symbols so per-instance caches
survive; method calls route through per-key SLOTS so bound references handed
out long ago (event listeners) run new code; a construct-trap proxy builds
new instances with the latest constructor. Identity symbols are
`Symbol.for` — any partial module re-execution agrees with old stamps.

**Guarantees.** This is _more_ than Vue's own HMR can offer: Vue must reset
component state on any script edit (setup is an opaque closure); ivue's
syntactic state/behaviour split lets behaviour edits land on live instances
with state intact. Edits a graft cannot express escalate to the
same surgical remount: inlined-`computed` bodies and `$`-singletons (their
closures are cached per instance — detected by signature), and member kind
flips (method ↔ getter — the cache is re-keyed so shapes never mix).
Removed members are tombstoned (last implementation stays reachable) so
frozen closures never crash in the escalation window. Unsafe grafts
(inheritance chains, suspected name collisions) are refused loudly and
degrade to reload-needed — never to corruption. Un-accepting modules still graft when their component boundary
reloads, so stale-class ghosts are impossible either way.

**Impossible if true.** Two class identities for one declaration across hot
updates; a hot update that silently resets live instance state; a listener
holding a bound method that keeps running stale code after an edit; any HMR
instruction reaching a production bundle.

**Test.** `lib/__tests__/ReactiveHmr.vitest.spec.ts` — graft semantics,
state preservation, bound-reference continuity, latest-constructor
instances, constructor/frozen-cache escalation discrimination, tombstoned
removals (including the live-found "unthin" crash as a named regression),
kind-flip re-keying, direct-method-reference grafting, statics, and the
collision/inheritance refusal paths. The Vite plugin that injects module
self-acceptance lives in `lib/hmr-plugin.ts`.

---

## Module & import invariants (the companion namespace convention)

These are not lines of code inside `Reactive()`; they are properties of the
**authoring convention** the engine is designed to be used with, made _correct_ by
the runtime invariants above (chiefly identity preservation and idempotent,
process-once transformation). They are the reason `Reactive.ts` handles
cross-file hierarchies and circular imports gracefully where ivue v1 does not.

The convention (see `demo/components/{BaseElement,Container,InteractiveBox}.ts`):

```ts
class $Thing extends Parent.$Class {
  /* getters return ref()/computed() */
}

export namespace Thing {
  export const $Class = $Thing; // RAW class — used by children to `extends`
  export const Class = Reactive($Thing); // REACTIVE class — used to `new`
  export type Instance = typeof Class.Instance;
}
```

A TypeScript `namespace` compiles to a **hoisted `var` populated by an IIFE**:

```js
export var Thing;
((Thing) => {
  Thing.$Class = $Thing;
  Thing.Class = Reactive($Thing);
})(Thing || (Thing = {}));
```

### Module-load-time, per-file composable transformation

**Statement.** Each class is transformed in its own module at load time, and the
transformations compose across files without coordination — shared ancestors are
transformed once, by whichever module loads first.

**Mechanism.** `Reactive($Thing)` runs as the module's top-level side effect.
Because of idempotent, process-once transformation and identity preservation
(both above), a base transformed in `Base.ts` and reached again through
`Child.ts`'s chain walk is detected as `PROCESSED` and skipped — yet `Child`
still inherits the already-installed reactive getters via the shared prototype.

**Guarantees.** Parent, grandparent, and child classes can live in **separate
files**. Editing one file re-runs only that module's `Reactive()` call, which is
idempotent, so hot-module-replacement does not desynchronize the chain. (ivue v1
builds its accessor maps per `ivue()` call keyed by class identity at _instantiation_
time; when only one file in a multi-file hierarchy hot-reloads, class identities
and prototype links across the boundary fall out of sync — which is why v1
hierarchies are kept in a single file.)

**Impossible if true.** A multi-file hierarchy cannot end up partially
transformed; re-running a module cannot double-wrap an inherited getter.

---

### Raw/reactive split over a hoisted namespace object → circular-import & HMR robustness

**Statement.** Exposing the class through a namespace object as two members —
`$Class` (raw, for `extends`) and `Class` (reactive, for `new`) — lets
cross-referencing modules resolve each other regardless of load order.

**Mechanism.** The namespace binding is a **hoisted `var`** (proven above), not a
`const`/`class` (which sit in the temporal dead zone during circular evaluation).
So an importer always receives a live reference to the namespace _object_; it
reads `.Class` / `.$Class` **lazily**, at the point of use. Method bodies that do
`new Other.Class()` run at call time, by which point every namespace is fully
populated — so "A's methods use B, B's methods use A" cycles resolve cleanly in
either load order.

**Guarantees.** The common form of circular dependency between domain classes
(mutual _references_, the kind that normally throws `Cannot access 'X' before
initialization`) is eliminated. Combined with identity preservation, the same
constructor identity is used everywhere, so `instanceof` and clone/equality
checks stay consistent across modules.

**Impossible if true.** A mutual cross-reference between two class modules cannot
throw a TDZ / "before initialization" error purely due to import ordering.

**Scope limit (honest boundary).** This solves circular _references_, not circular
_inheritance_. `class $A extends B.$Class` still evaluates `B.$Class` at A's load
time, so a true `A extends B` / `B extends A` cycle is still impossible — but that
is logically impossible in any language, not a limitation of this pattern.

---

## Known limits / scope boundaries

These are deliberately listed so the invariants above are not over-read:

1. **Use `$watch` for tracked teardown** (see _Deterministic teardown
   (scope-based)_, above). Watchers registered with the engine's `$watch` are
   owned by the instance's effect scope and stopped by `$stopEffects`. A **raw**
   `watch()`/`watchEffect()` created directly (e.g. the demo `Container.ts` calls
   `watch(...)` in `init()`) is _not_ in that scope and leaks unless you create it
   via `this.$watch(...)` or your own `effectScope`. For component-scoped
   instances, the active component scope already stops synchronously-created
   watchers on unmount, so `$stopEffects` is optional there.
2. **Computeds rely on GC, not `stop()`** (see _Deterministic teardown
   (scope-based)_, above). Lazy computeds are collected once dereferenced (and
   use lazy subscription in Vue 3.5), so the engine does not call `effect.stop()`
   on them; clearing the cache + dropping the instance is enough.
3. **Circular inheritance** (see _Raw/reactive split over a hoisted namespace
   object_, above). Only cross-references are solved; circular `extends` remains
   impossible by construction.
4. **`.value` ergonomics.** Reactive state is accessed with `.value` outside of a
   `reactive()`/template auto-unwrap context. This is the one ergonomic cost
   relative to ivue v1's proxy model.
5. **Hot-swap is class-granular** (see _Hot-swap continuity_, above). A
   self-accepting module's NON-class exports (helpers, constants) are served
   stale to modules that imported them before the edit — the classic
   self-accept caveat. Keep Reactive classes in dedicated modules (the
   namespace convention already does this) or opt the file out of
   self-acceptance. Removed members are tombstoned in dev, so a deleted
   member remains callable (last implementation) until a remount — dev-only
   residue, never in production or tests.

---

## Coverage

`lib/__tests__/Reactive.vitest.spec.ts` + `lib/__tests__/ReactiveHmr.vitest.spec.ts`
(150 tests) — **100% statements, 100% functions, 100% lines** of
`lib/Reactive.ts`, branches 97%. The remaining partial branches are named,
not ignored: the environment-constant HMR arming gate
(`import.meta.env.DEV` / `TEST` / `import.meta.hot` are fixed values inside
any given environment) and `?? fallback` arms unreachable under test
(descriptor reads on own keys, anonymous-class name fallbacks). Every
reachable behavioral branch — including every `resolveRaw` path, every graft
path, and both escalation signatures — is exercised.
