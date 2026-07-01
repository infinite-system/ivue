---
title: Invariants
description: The structural specification of the Reactive() engine — every guarantee, its mechanism, what it makes impossible, and the test that proves it.
outline: [2, 3]
---

# Invariants

This is the structural specification of the `Reactive()` engine: the guarantees the
implementation maintains, *why* each one holds, and — crucially — what each one
makes **impossible**. An invariant that only says what *can* happen is a
description; an invariant that also says what *cannot* happen is a contract you can
test against. Each entry below lists both.

`Reactive(Class)` reduces to a single idea:

> **Transform a plain class's prototype exactly once so that its getters become
> lazily-cached reactive cells and its methods become lazily-bound functions —
> while the instances themselves stay plain objects with zero per-instance
> reactive cost.**

Everything else is a consequence of making that idea safe under inheritance,
proxies, hot-reload, and circular imports.

::: info Source
This mirrors the in-repo spec at
[`lib/Reactive.invariants.md`](https://github.com/infinite-system/ivue/blob/main/lib/Reactive.invariants.md),
which is kept alongside the source. Tests live in `lib/__tests__/Reactive.vitest.spec.ts`
(100% statements / branches / functions / lines).
:::

## Part A — Runtime invariants

Intrinsic to `Reactive()` itself.

### A1 · Identity preservation

**Statement.** `Reactive(Class)` returns the *same* constructor it was given
(mutated in place), never a wrapper or subclass.

**Mechanism.** The function transforms `Class.prototype` and returns the class
unchanged.

**Guarantees.** `Reactive(X) === X`. `instanceof` still works. The raw class and
the reactive class share one prototype lineage, which is what lets a child
`extends ParentRawClass` and still inherit the reactive behaviour (see A7, B11).

**Impossible if true.** There can be no "reactive copy" with a divergent prototype;
you can never end up with two class identities for one declaration; `x instanceof Class`
cannot break after transformation.

### A2 · Idempotent, process-once transformation

**Statement.** Each prototype level in the chain is transformed at most once,
regardless of how many times `Reactive()` is called or through how many subclasses
a base is reached.

**Mechanism.** A per-prototype `PROCESSED` symbol flag; the chain loop skips any
prototype already carrying it. The chain is walked base → child so ancestors are
always settled before descendants.

**Guarantees.** Calling `Reactive()` again is a safe no-op. A base class transformed
in its own module is **not** re-transformed when a child in another module calls
`Reactive()` on itself — the child's chain walk hits the base's `PROCESSED` flag and
skips it. This is what makes the per-file authoring pattern (B10) correct.

**Impossible if true.** A getter cannot be double-wrapped; `$stopEffects` cannot be
installed twice; diamond/shared-base layouts cannot transform inconsistently
depending on load order.

### A3 · Raw-anchored single source of truth

**Statement.** All per-instance state the engine creates — cached refs, cached
computeds, bound methods, the `RAW` back-pointer — lives on `toRaw(this)`, never on
a Vue reactive proxy of the instance.

**Mechanism.** Every getter/method resolves `toRaw(this)` first and keys its cache
by per-prototype symbols (A4/A7).

**Guarantees.** Whether an instance is used directly (`new Class()`) or wrapped in
`reactive(new Class())`, reads and writes resolve to one canonical storage and one
cached cell per `(instance, key)`. Through a proxy, Vue additionally auto-unwraps a
returned ref, so you read the value without `.value`; the underlying cell is the
same one on the raw object.

**Impossible if true.** You cannot get two different refs for the same property via
proxy-vs-raw access; a write through the proxy cannot land on a different cell than
a read through the raw object; caches cannot leak onto the proxy and escape
teardown.

### A4 · Stable lazy identity

**Statement.** Each reactive getter is materialized at most once per instance and
returns the identical ref/computed on every later read; each method returns the
identical bound function on every access.

**Mechanism.** The computed getter caches under a symbol and short-circuits on a
cache hit; the method getter caches the bound function on first access.

**Guarantees.** Referential stability. A `watch(() => inst.area.value, …)` stays
attached because `inst.area` is always the same computed. A method is safe as an
event handler or dependency because its identity never changes between renders.

**Impossible if true.** A property cannot return a fresh ref on each read (which
would drop watchers and break two-way bindings); `inst.method !== inst.method`
cannot happen.

### A5 · Pay-for-what-you-use materialization

**Statement.** Construction performs zero reactive work. No proxy is created, no
ref/computed is allocated, no method is bound until the first access of that member.

**Mechanism.** All work happens in prototype getters; `new Class()` only runs the
user constructor. Instances are never passed to `reactive()` by the engine.

**Guarantees.** Creating N instances costs N plain `new` calls. Instances created
but never touched (off-screen list items, pooled entities) carry essentially no
reactive overhead. *(Measured: 100k instances allocate in ~0.7 ms vs ~37–43 ms for
`reactive()`/composables and ~169 ms for ivue v1.)*

**Impossible if true.** Instantiation cost cannot scale with the number of reactive
members declared on the class; an unused getter cannot allocate a computed.

### A6 · Self-erasing overhead

**Statement.** A getter that returns a *non-ref* plain value is detected on first
access and the engine's wrapper is removed — the original getter is restored on the
prototype for all future instances.

**Mechanism.** When the first access sees a non-ref result, it redefines the
prototype property back to a thin native getter (routed through `toRaw(this)`),
preserving the setter if one exists.

**Guarantees.** Getters used for plain derived values converge toward native getter
cost; you don't pay reactive-cell machinery for non-reactive getters.

**Impossible if true.** A plain-value getter cannot keep paying wrapper/cache
overhead forever; it cannot be cached as a fake "ref".

### A7 · Inheritance & `super` fidelity

**Statement.** Getters and methods resolve correctly across the full prototype
chain, including `super.x` / `super.x.value`, with no collision between a parent's
cached cell and a child's.

**Mechanism.** During processing, each `(prototype, key)` is assigned a fresh
`Symbol(key)`. Because every level is processed independently, a base's cache for
`summary` and a child's cache for `summary` live under different symbols on the same
instance. (Earlier versions memoized these symbols in a map; a fresh `Symbol` per
level is inherently collision-free and needs none.)

**Guarantees.** A child computed can call `super.summary.value` and receive the
*parent's* cell, not its own. Overridden getters/setters at different levels
cooperate exactly as in native classes.

**Impossible if true.** `super.x` cannot resolve back to the child's own cached
value (which would infinite-loop or return the wrong layer); a parent and child
sharing a property name cannot clobber each other's cache.

### A8 · Deterministic teardown (scope-based)

**Statement.** The engine installs two helpers per class, once: `$watch` registers
watchers in a lazily-created per-instance effect scope, and `$stopEffects()` stops
that scope, runs a user `stopEffects()` hook, and drops every cached cell.

**Mechanism.** `$watch` does `(raw[SCOPE] ??= effectScope(true)).run(() => watch(...))`
— the scope is allocated on first use only. `$stopEffects` runs the user hook if
present, stops the scope if one exists, then deletes every cache symbol (skipping
the `RAW` anchor).

**Guarantees.** Watchers created via `$watch` are stopped deterministically. Cached
cells are dropped so they become collectable; re-accessing a member after teardown
re-materializes it fresh (A4 resets). **Pure-data instances that never call `$watch`
allocate no scope at all** — teardown stays pay-for-what-you-use (A5).

**Why scope-based, not `effect.stop()`.** In Vue 3.5+, `computed().effect.stop` no
longer exists, and refs/lazy-computeds need no explicit stop — they're collected
once dereferenced. The only thing that genuinely needs stopping is user watchers,
which is exactly what the effect scope owns. So the engine stops the *scope*, not
individual cells.

**Impossible if true.** A `$watch`-registered watcher cannot survive `$stopEffects()`;
teardown cannot break the `RAW` anchor; the helpers cannot be installed twice.

### A9 · `$`-prefixed singletons

**Statement.** A getter whose name starts with `$` is cached *whole, forever* on
first access — even if its result is not a ref.

**Mechanism.** A `$` prefix sets a "cache whole" flag; the result is stored and
returned without the `isRef` check.

**Guarantees.** The canonical "create this composable/service once per instance"
slot, e.g. `get $mouse() { return useMouse() }`. The getter runs once; later reads
return the same object.

**Impossible if true.** A `$`-getter cannot re-run its body on each access (which
would create a new composable/subscription every read).

## Part B — Module / import invariants

These aren't lines of code inside `Reactive()`; they're properties of the
**authoring convention** the engine is designed for, made *correct* by the Part-A
invariants (chiefly A1 identity and A2 process-once). They're why v2 handles
cross-file hierarchies and circular imports where v1 doesn't. See
[Modules & Imports](/guide/modules) for the practical guide.

```ts
export namespace Thing {
  export const $Class = $Thing          // RAW class — children `extends` this
  export const Class  = Reactive($Thing) // REACTIVE class — you `new` this
  export type Instance = typeof Class.Instance
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

### B10 · Module-load-time, per-file transformation

**Statement.** Each class is transformed in its own module at load time, and the
transformations compose across files without coordination — shared ancestors are
transformed once, by whichever module loads first.

**Mechanism.** `Reactive($Thing)` runs as the module's top-level side effect.
Because of A2 (process-once) and A1 (identity), a base transformed in `Base.ts` and
reached again through a child's chain walk is detected as `PROCESSED` and skipped —
yet the child still inherits the installed reactive getters via the shared
prototype.

**Guarantees.** Parent, grandparent and child can live in **separate files**.
Editing one file re-runs only that module's `Reactive()` call, which is idempotent,
so HMR doesn't desynchronize the chain. (v1 builds its accessor maps at
*instantiation* time keyed by class identity; when one file in a multi-file
hierarchy hot-reloads, identities across the boundary fall out of sync — which is
why v1 hierarchies live in a single file.)

**Impossible if true.** A multi-file hierarchy cannot end up partially transformed;
re-running a module cannot double-wrap an inherited getter.

### B11 · Circular-import & HMR robustness

**Statement.** Exposing the class through a namespace object as two members —
`$Class` (raw, for `extends`) and `Class` (reactive, for `new`) — lets
cross-referencing modules resolve each other regardless of load order.

**Mechanism.** The namespace binding is a **hoisted `var`**, not a `const`/`class`
(which sit in the temporal dead zone during circular evaluation). An importer always
receives a live reference to the namespace *object* and reads `.Class` / `.$Class`
**lazily**, at the point of use. Method bodies that do `new Other.Class()` run at
call time, by which point every namespace is fully populated — so "A's methods use
B, B's methods use A" cycles resolve in either order.

**Guarantees.** The common form of circular dependency between domain classes
(mutual *references* that normally throw `Cannot access 'X' before initialization`)
is eliminated. Combined with A1, one constructor identity is used everywhere, so
`instanceof` and equality checks stay consistent across modules.

**Impossible if true.** A mutual cross-reference between two class modules cannot
throw a TDZ error purely due to import ordering.

**Scope limit.** This solves circular *references*, not circular *inheritance*.
`class $A extends B.$Class` still evaluates `B.$Class` at A's load time, so a true
`A extends B` / `B extends A` cycle is impossible — but that's impossible in any
language, not a limitation of the pattern.

## Known limits

Listed deliberately, so the invariants above aren't over-read:

1. **Use `$watch` for tracked teardown.** A **raw** `watch()`/`watchEffect()`
   created directly is not in the instance's scope and leaks unless you use
   `this.$watch(...)` or your own `effectScope`. For component-scoped instances, the
   active component scope already stops synchronously-created watchers on unmount.
2. **Computeds rely on GC, not `stop()`.** Lazy computeds are collected once
   dereferenced (and use lazy subscription in Vue 3.5), so the engine doesn't call
   `effect.stop()` on them — clearing the cache and dropping the instance is enough.
3. **Circular inheritance.** Only cross-references are solved; circular `extends`
   remains impossible by construction.
4. **`.value` ergonomics.** Reactive state is read with `.value` outside a
   `reactive()`/template auto-unwrap context — the one ergonomic cost relative to
   v1's proxy model.
