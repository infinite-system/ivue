---
title: Invariants
description: The structural specification of the Reactive() engine — every guarantee, why it holds, and what it makes impossible.
outline: [2, 3]
---

# Invariants

This is the structural specification of the `Reactive()` engine: the guarantees the
implementation maintains, *why* each holds, and — crucially — what each makes
**impossible**. An invariant that only says what *can* happen is a description; one
that also says what *cannot* is a contract you can test against.

`Reactive(Class)` reduces to a single idea:

> Transform a plain class's prototype exactly once so that its getters become
> lazily-cached reactive cells and its methods become lazily-bound functions —
> while the instances stay plain objects with zero per-instance reactive cost.

Everything else is a consequence of making that idea safe under inheritance,
proxies, hot-reload, and circular imports.

::: info Source
A cleaned version of the in-repo spec at
[`lib/Reactive.invariants.md`](https://github.com/infinite-system/ivue/blob/main/lib/Reactive.invariants.md).
Tests live in `lib/__tests__/Reactive.vitest.spec.ts` (100% statements / branches /
functions / lines).
:::

## Runtime invariants

Intrinsic to `Reactive()` itself.

### Identity preservation

> `Reactive(Class)` returns the *same* constructor it was given — mutated in place,
> never a wrapper or subclass.

It transforms `Class.prototype` and hands the class back unchanged, so
`Reactive(X) === X` and `instanceof` still works. The raw class and the reactive
class share one prototype lineage — which is what lets a child `extends ParentRawClass`
and still inherit the reactive behaviour (see *Inheritance & super fidelity* and
*Circular-import & HMR robustness*).

**Rules out** — two class identities for one declaration; a "reactive copy" with a
divergent prototype; `x instanceof Class` breaking after transformation.

### Idempotent, process-once transformation

> Each prototype level is transformed at most once — however many times `Reactive()`
> is called, and through however many subclasses a base is reached.

A per-prototype `PROCESSED` flag makes the chain loop skip anything already
transformed, and the chain is walked base → child so ancestors settle first. Calling
`Reactive()` again is a safe no-op; a base transformed in its own module is skipped
when a child in another module transforms itself — which is what makes the per-file
authoring pattern correct.

**Rules out** — double-wrapped getters; `$stopEffects` installed twice; diamond /
shared-base layouts transforming differently by load order.

### Raw-anchored single source of truth

> Every cache the engine creates — refs, computeds, bound methods, the back-pointer
> — lives on `toRaw(this)`, never on a reactive proxy of the instance.

Each getter and method resolves `toRaw(this)` first and keys its cache by
per-prototype symbols. So whether you use an instance directly or wrap it in
`reactive(new Class())`, reads and writes land on one canonical cell per
`(instance, key)`. Through a proxy Vue also auto-unwraps a returned ref, so you read
it without `.value` — but it's still the same cell on the raw object.

**Rules out** — two different refs for one property via proxy-vs-raw access; a proxy
write landing on a different cell than a raw read; caches leaking onto the proxy and
escaping teardown.

### Stable lazy identity

> Each getter materializes once per instance and returns the identical ref/computed
> thereafter; each method returns the identical bound function on every access.

The computed getter caches under a symbol and short-circuits on a hit; the method
getter caches its bound function on first access. That referential stability is what
keeps `watch(() => inst.area.value, …)` attached and makes a method safe to pass as
an event handler.

**Rules out** — a property handing back a fresh ref each read (which would drop
watchers and break two-way bindings); `inst.method !== inst.method`.

### Pay-for-what-you-use materialization

> Construction does zero reactive work — no proxy, no ref, no computed, no bound
> method until the first access of that member.

Everything happens in prototype getters; `new Class()` only runs your constructor,
and the engine never passes an instance to `reactive()`. So N instances cost N plain
`new` calls, and instances created but never touched carry essentially no overhead.
*(Measured: 100k instances allocate in ~0.7 ms, vs ~37–43 ms for `reactive()` /
composables and ~169 ms for ivue v1.)*

**Rules out** — instantiation cost scaling with the number of reactive members
declared; an unused getter allocating a computed.

### Self-erasing overhead

> A getter that returns a plain (non-ref) value is detected on first access, and the
> engine's wrapper is removed — the native getter is restored on the prototype for
> all future instances.

When the first read sees a non-ref, it redefines the property back to a thin native
getter (still routed through `toRaw(this)`, and keeping the setter if one exists).
Getters used for plain derived values converge to native cost — you don't pay
reactive machinery for non-reactive getters.

**Rules out** — a plain-value getter paying wrapper/cache overhead forever; a plain
value cached as a fake "ref".

### Inheritance & super fidelity

> Getters and methods resolve correctly across the whole prototype chain, including
> `super.x` / `super.x.value`, with no collision between a parent's cached cell and a
> child's.

Each `(prototype, key)` gets a fresh `Symbol(key)` during processing, so a base's
`summary` and a child's `summary` cache under different symbols on the same instance.
A child computed can call `super.summary.value` and get the *parent's* cell, not its
own; overrides at different levels cooperate exactly as in native classes.

**Rules out** — `super.x` resolving back to the child's own value (an infinite loop
or the wrong layer); a parent and child sharing a name clobbering each other's cache.

### Deterministic teardown

> The engine installs two helpers per class, once: `$watch` registers watchers in a
> lazily-created per-instance effect scope, and `$stopEffects()` stops that scope,
> runs a user `stopEffects()` hook, and drops every cached cell.

`$watch` does `(raw[SCOPE] ??= effectScope(true)).run(() => watch(...))` — the scope
exists only after the first `$watch`. `$stopEffects` runs your hook, stops the scope
if there is one, then deletes every cache symbol (keeping the `RAW` anchor).
Re-accessing a member afterward re-materializes it fresh, and **instances that never
`$watch` allocate no scope at all**.

Why a scope and not `effect.stop()`: in Vue 3.5+ `computed().effect.stop` is gone,
and refs / lazy-computeds are collected once dereferenced. The only thing that
genuinely needs stopping is user watchers — exactly what the scope owns.

**Rules out** — a `$watch`-registered watcher surviving `$stopEffects()`; teardown
breaking the `RAW` anchor; the helpers installed twice.

### `$`-prefixed singletons

> A getter whose name starts with `$` is cached *whole, forever* on first access —
> even when its result isn't a ref.

The `$` prefix flips a "cache whole" flag, so the result is stored and returned
without the `isRef` check. It's the canonical "create this composable/service once
per instance" slot — `get $mouse() { return useMouse() }` runs once, and later reads
return the same object.

**Rules out** — a `$`-getter re-running its body on each access (a new composable /
subscription every read).

## Module & import invariants

Not lines of code inside `Reactive()`, but properties of the **authoring convention**
the engine is designed for — made correct by the runtime invariants above (chiefly
*Identity preservation* and *Idempotent transformation*). They're why v2 handles
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

### Module-load-time, per-file transformation

> Each class is transformed in its own module at load time, and the transforms
> compose across files with no coordination — shared ancestors transform once, by
> whichever module loads first.

`Reactive($Thing)` runs as the module's top-level side effect. Because the transform
is idempotent and identity-preserving, a base already transformed in `Base.ts` is
detected and skipped when a child's chain walk reaches it — yet the child still
inherits the installed getters through the shared prototype. So parent, grandparent
and child can live in separate files, and editing one re-runs only that module's
(idempotent) `Reactive()` call, so HMR never desyncs the chain. (v1 builds its maps
at instantiation time keyed by identity; when one file in a multi-file hierarchy
reloads, identities across the boundary fall out of sync — which is why v1
hierarchies live in one file.)

**Rules out** — a multi-file hierarchy ending up partially transformed; a module
reload double-wrapping an inherited getter.

### Circular-import & HMR robustness

> Exposing the class as two namespace members — `$Class` (raw, for `extends`) and
> `Class` (reactive, for `new`) — lets cross-referencing modules resolve each other
> in any load order.

The namespace binding is a hoisted `var`, not a `const` / `class` in the temporal
dead zone, so an importer always gets a live reference to the namespace *object* and
reads `.Class` / `.$Class` lazily at the point of use. Method bodies that do
`new Other.Class()` run at call time, by which point every namespace is populated —
so "A's methods use B, B's use A" resolves either way. Combined with identity
preservation, one constructor identity is used everywhere, so `instanceof` and
equality stay consistent across modules.

**Rules out** — a mutual cross-reference between two class modules throwing
`Cannot access 'X' before initialization` purely from import order.

*Scope limit:* this solves circular *references*, not circular *inheritance* —
`class $A extends B.$Class` still evaluates `B.$Class` at A's load time, so a true
`A extends B` / `B extends A` cycle is impossible (in any language, not just here).

## Known limits

Listed deliberately, so the invariants above aren't over-read:

1. **Use `$watch` for tracked teardown.** A **raw** `watch()` / `watchEffect()`
   created directly is not in the instance's scope and leaks unless you use
   `this.$watch(...)` or your own `effectScope`. For component-scoped instances, the
   active component scope already stops synchronously-created watchers on unmount.
2. **Computeds rely on GC, not `stop()`.** Lazy computeds are collected once
   dereferenced (and use lazy subscription in Vue 3.5), so the engine doesn't call
   `effect.stop()` on them — clearing the cache and dropping the instance is enough.
3. **Circular inheritance.** Only cross-references are solved; circular `extends`
   remains impossible by construction.
4. **`.value` ergonomics.** Reactive state is read with `.value` outside a
   `reactive()` / template auto-unwrap context — the one ergonomic cost relative to
   v1's proxy model.
