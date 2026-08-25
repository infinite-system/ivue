---
title: The Invariants Behind ivue
description: The structural specification of the Reactive() engine — every guarantee, why it holds, and what it makes impossible.
outline: [2, 3]
relatedPosts: [the-field-not-the-rules, win-by-reduction, uniformity-is-a-measuring-device]
---

# The Invariants Behind ivue

This page explains the guarantees the `ivue` engine maintains: what each one
promises, _why_ it holds, and what it makes **impossible**. An invariant that
only says what _can_ happen is a description; one that also says what
_cannot_ is a contract you can test against.

`Reactive(Class)` reduces to a single idea:

> Transform a plain class's prototype exactly once so that its getters become
> lazily cached Refs/Computeds and its methods become lazily bound functions —
> while the instances stay plain objects with zero per-instance reactive cost.

Everything else is a consequence of making that idea safe under inheritance,
proxies, environment parity, and circular imports.

::: info The contract is the source of truth
The formal records live in
[`ivue.invariants.md`](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#one-prototype-transform-gives-plain-classes-full-reactivity)
at the repository root — one record per guarantee, with its scope, mechanism,
evidence (`lib/` line pointers and named test cases), a runnable verification
command, and the concrete events that can never be observed while it holds. A
checker validates the file and its links on every run. This page is the prose
companion: it reads in order and explains; the records gate. Where the two
disagree, the record wins and this page is corrected.
:::

Every heading below is a record's exact name, and each section ends with a
link to its record. The engine implementation is
[`lib/Reactive.ts`](https://github.com/infinite-system/ivue/blob/main/lib/Reactive.ts),
with [`lib/Static.ts`](https://github.com/infinite-system/ivue/blob/main/lib/Static.ts) and
[`lib/LazyShared.ts`](https://github.com/infinite-system/ivue/blob/main/lib/LazyShared.ts)
for the static side; the core and adversarial suites beside them maintain 100%
statement, branch, function, and line coverage.

## The mechanism

The contract opens with one generator record — the mechanism the fifteen
guarantees form together:

> **One prototype transform gives plain classes full reactivity.** If a class's
> prototype is transformed once — ref-returning getters into lazily cached
> cells, plain getters into native getters, methods into lazily bound
> functions, every cell keyed on the raw instance — then its instances are
> plain objects with full Vue reactivity, real inheritance, and zero
> per-instance cost until first access, and the same class runs in every
> environment.

Its impossibility boundary is the short version of this whole page: a
`Reactive()` class whose instances need a proxy to be reactive; creation cost
that grows with the number of getters declared; a multi-file hierarchy that
depends on import order; a benchmark number that includes a development-only
code path. If any of those is ever observed, a guarantee below has broken.

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#one-prototype-transform-gives-plain-classes-full-reactivity)

## Reality-based invariants

Two guarantees are forced by how JavaScript and Vue actually work. ivue did
not choose them; it discovered them and built on them. Each is _reality inside
ivue_ and decided at a wider scope — the record names that scope.

### Every engine cache lives on the raw instance

> Whatever `this` the engine is entered through — the raw object, a Vue
> `reactive()` proxy, or a foreign proxy such as a component expose proxy —
> every cell it reads or writes lives on `toRaw(instance)`, never on a proxy.

Each getter and method calls `resolveRaw(this)`: it asks Vue's `toRaw()`
first, then falls back to an engine back-pointer for proxy layers `toRaw()`
cannot see through. Caches use per-prototype symbols. So whether an instance
is used directly, wrapped in `reactive()`, or reached through `defineExpose`,
every path lands on one canonical Ref/Computed per `(instance, key)`. This is
reality because a `reactive()` proxy wraps symbol-keyed reads and `toRaw()`
cannot unwrap non-Vue proxies — a cache on the proxy would be a cache per
proxy.

**Rules out** — two different refs for one property via proxy-vs-raw access; a
proxy write landing on a different cell than a raw read; `this.x.value`
throwing inside a method first accessed through a proxy.

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#every-engine-cache-lives-on-the-raw-instance)

### Cross-module class references resolve in any load order

> Two class modules that reference each other only through late reads —
> `new Other.Class()` inside getter or method bodies — load and run in either
> import order.

A TypeScript `namespace` compiles to a hoisted `var` filled by an IIFE, so the
binding exists from the first instant of module evaluation and is never in the
temporal dead zone. The member read `Other.Class` happens inside a method
body, at call time, when every module in the cycle has finished loading. This
is what resolves "A's methods use B, B's methods use A". It is reality at the
scope of TypeScript's emit and ECMAScript module evaluation; ivue's namespace
convention is the discipline that stays inside it. See
[Modules & Imports](/guide/modules) for the practical guide.

**Rules out** — `Cannot access 'X' before initialization` from a namespace read
in a method body; two modules that load in one order and crash in the other
while obeying the late-read rule.

_Scope limit:_ this solves circular _references_, not circular _inheritance_ —
`class $A extends B.$Class` still evaluates `B.$Class` at A's load time, so a
true `A extends B` / `B extends A` cycle is impossible (in any language, not
just here).

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#cross-module-class-references-resolve-in-any-load-order)

## Chosen invariants

The remaining guarantees are the engine's own disciplines. Each could be
otherwise and still be coherent; the system depends on it not drifting, and
every one stands on the two reality-based invariants above.

### Reactive returns the class it was given

> `Reactive(Class)` transforms `Class.prototype` in place and returns `Class`
> itself — the same constructor identity in development, tests, SSR, and
> production.

There is no wrapper class, no construct proxy, and no environment branch: the
function ends with `return targetClass`. `instanceof` and the prototype
lineage remain intact, and the namespace pattern's `$Class` (raw, for
`extends`) and `Class` (reactive, for `new`) share one identity.

**Rules out** — `Reactive(X) !== X`; a "reactive copy" with a divergent
prototype; a class identity that differs between development and production.

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#reactive-returns-the-class-it-was-given)

### A prototype level is transformed at most once

> However a transform re-reaches its own work — a repeated `Reactive()` call,
> any number of subclasses, any load order, or `Static()` re-wrapping a
> subclass of a class it already wrapped — each member converts once per seam,
> and the transform's runtime residue is never mistaken for user API.

On the `Reactive()` side, a per-prototype `PROCESSED` marker makes the chain
walk skip anything already transformed, and the chain is walked base → child
so ancestors settle first. The marker's value is the list of that level's
cache symbols, which is what lets teardown remove exactly the engine's cells.
Calling `Reactive()` again is a safe no-op; a base transformed in its own
module is skipped when a child in another module transforms itself — which is
what makes the per-file authoring pattern correct. On the `Static()` side the
wrap walk skips its own bind and cache symbols, so wrapping a subclass after
the parent has been read still binds every member to the subclass — the
double-wrap pattern (`class $Sub extends Parent.$Class` … `Static($Sub)`) is
safe in any read order.

**Rules out** — double-wrapped getters; `$stopEffects` installed twice;
diamond / shared-base layouts transforming differently by load order; a
re-wrapped `Static` subclass whose member runs with its parent as receiver.

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#a-prototype-level-is-transformed-at-most-once)

### A member materializes once per instance

> The first read of a ref-returning getter or a method creates its cell — the
> Ref/Computed, or the bound function — and every later read on that instance
> returns the identical object.

Each `(prototype, key)` gets its own `Symbol(key)` at transform time; the
getter caches under it and short-circuits on a hit, and the method getter
caches its bound function the same way. That referential stability is what
keeps `watch(() => instance.area.value, …)` attached and makes a method safe
to pass as an event handler.

**Rules out** — a property handing back a fresh ref each read (which would drop
watchers and break two-way bindings); `instance.method !== instance.method`.

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#a-member-materializes-once-per-instance)

### Construction does no reactive work

> `new Class()` runs only your constructor — no proxy, no ref, no computed, no
> bound method, no effect scope until the first read of that member.

Everything happens in prototype getters installed once per class; the engine
never passes an instance to `reactive()` and has no constructor hook. So N
instances cost N plain `new` calls, and instances created but never touched
carry essentially no overhead. _(Measured: 100k instances allocate in ~0.7 ms,
vs ~37–43 ms for `reactive()` / composables and ~169 ms for an eager class
engine — `bench/creation.bench.ts`, Vue 3.5.)_

**Rules out** — instantiation cost scaling with the number of reactive members
declared; an unused getter allocating a computed.

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#construction-does-no-reactive-work)

### A plain-value getter erases its own wrapper

> A getter that returns a plain (non-ref) value is detected on its first read,
> and the engine's wrapper is removed — the native getter is restored on the
> prototype for all future instances.

When the first read sees a non-ref, the engine redefines the property back to
a thin native getter (still routed through `toRaw(this)`, and keeping the
setter if one exists). Getters used for plain derived values converge to
native cost — you never pay reactive machinery for non-reactive getters.

This invariant is what makes **plain derived getters the recommended authoring
mode**: derive with ordinary getters (zero bytes per instance, re-derived
inside whatever effect reads them), and opt into `computed()` only where
memoization earns its allocation.

**Rules out** — a plain-value getter paying wrapper/cache overhead forever; a
plain value cached as a fake "ref".

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#a-plain-value-getter-erases-its-own-wrapper)

### Members resolve across the whole prototype chain

> Getters and methods resolve correctly across the entire prototype chain,
> including `super.x` / `super.x.value`, with no collision between a parent's
> cached cell and a child's.

Because each `(prototype, key)` has its own symbol, a base's `summary` and a
child's `summary` cache under different symbols on the same instance. A child
computed can call `super.summary.value` and get the _parent's_ cell, not its
own; overrides at different levels cooperate exactly as in native classes.

**Rules out** — `super.x` resolving back to the child's own value (an infinite
loop or the wrong layer); a parent and child sharing a name clobbering each
other's cache.

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#members-resolve-across-the-whole-prototype-chain)

### Teardown stops watchers and drops only engine cells

> `$watch` and `$watchEffect` register watchers in a lazily created
> per-instance effect scope; `$stopEffects()` stops that scope and drops every
> cached cell — touching no consumer-owned property and calling no user
> method.

`$watch` does `(raw[SCOPE] ??= effectScope(true)).run(() => watch(...))` — the
scope exists only after the first `$watch`, so instances that never watch
allocate no scope at all. `$stopEffects` stops the scope if there is one, then
deletes exactly the cache symbols each prototype level registered (keeping the
`RAW` anchor). `{ reset: false }` stops the watchers only and keeps every cell.
Richer cleanup is an ordinary method that does its own work and then calls
`$stopEffects()` itself. Re-accessing a member afterward re-materializes it
fresh.

Why a scope and not `effect.stop()`: in Vue 3.5+ `computed().effect.stop` is
gone, and refs / lazy computeds are collected once dereferenced. The only
thing that genuinely needs stopping is user watchers — exactly what the scope
owns.

**Rules out** — a `$watch`-registered watcher surviving `$stopEffects()`;
teardown breaking the `RAW` anchor or a consumer's own symbol; the helpers
installed twice.

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#teardown-stops-watchers-and-drops-only-engine-cells)

### A dollar getter caches its whole result forever

> A getter whose name starts with `$` is cached _whole, forever_ on first
> access — even when its result isn't a ref, even when it is `undefined`.

The `$` prefix flips a "cache whole" flag, so the result is stored and returned
without the `isRef` check. It is the canonical "create this composable or
service once per instance" slot — `get $mouse() { return useMouse() }` runs
once, and later reads return the same object.

**Rules out** — a `$`-getter re-running its body on each access (a new
composable / subscription every read).

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#a-dollar-getter-caches-its-whole-result-forever)

### One class path runs in every environment

> Development, tests, SSR, and production execute one `Reactive()` class
> path.

The engine contains no environment check, class registry, construct proxy,
method dispatch slot, or hot-reload classifier. Vite and Vue own module
replacement and reconstruct the affected component after script edits. Each
instance therefore carries state, constructor wiring, closures, private
brands, and prototype behavior from one class generation.

**Rules out** — development-only class identity; benchmark results that
include an ivue-only dev proxy; a hybrid instance combining old state with new
class behavior; an environment branch inside `Reactive()`.

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#one-class-path-runs-in-every-environment)

### Each class transforms at load time in its own module

> Every class module runs `Reactive($Class)` as its own top-level side
> effect, and the transforms compose across files with no coordination —
> shared ancestors transform once, by whichever module loads first.

```ts
export namespace Thing {
  export const $Class = $Thing; // RAW class — children `extends` this
  export let Class = Reactive($Class); // REACTIVE class — you `new` this
  export type Instance = typeof Class.Instance;
}
```

Because the transform is idempotent and identity-preserving, a base already
transformed in `Base.ts` is detected and skipped when a child's chain walk
reaches it — yet the child still inherits the installed getters through the
shared prototype. So parent, grandparent and child can live in separate files,
and a module reload applies the newly evaluated hierarchy as one generation.

**Rules out** — a multi-file hierarchy ending up partially transformed; a
module reload double-wrapping an inherited getter.

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#each-class-transforms-at-load-time-in-its-own-module)

### Static returns a bound subclass and leaves the raw class untouched

> `Static($X)` returns a subclass of `$X` whose visible static methods are
> lazily bound per receiver with stable identity; `$X` itself keeps native
> static behavior.

`Static()` walks the static chain and redefines each method as a getter that
binds on first read and caches under a per-receiver symbol — never under the
method name, so a parent-first read cannot install a parent-bound method
where a subclass lookup would find it. The returned class is the namespace's
`$Class` anchor: `export const $Class = Static($X); export let Class =
Reactive($Class)`. Static capability classes get handlers that are safe to
retain, and a `Class` slot a kernel or plugin can replace.

**Rules out** — `Static($X) === $X`; `Sub.method` dispatching to the parent's
body because the parent was read first; `X.Class.method !== X.Class.method`.

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#static-returns-a-bound-subclass-and-leaves-the-raw-class-untouched)

### A static dollar getter caches once per receiver

> A get-only static accessor named with a `$` prefix runs once per receiver
> class; each class in a hierarchy derives its own value through its own
> overrides, in any read order.

The result is stored as an own property of the receiver behind an
`Object.hasOwn` guard, which never walks the prototype chain — so a parent's
cache can never shadow a subclass. The `$` prefix promises stable identity per
receiver, not immutability: a memo table may mutate freely. Non-`$` static
getters stay live; accessor pairs with a setter are untouched.

**Rules out** — a `$` static getter body running twice for one receiver;
`Sub.$config` returning the parent's derivation after the parent was read
first.

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#a-static-dollar-getter-caches-once-per-receiver)

### A shared store lives in a LazyShared static readonly field

> State shared by every receiver of a static class — a registry, a ledger, a
> backend — is held in a `static readonly` field whose value is a `LazyShared`
> cell; never in a `$` static getter, never in an eager initializer that
> constructs another namespace's class.

A `$` getter would fork the store per subclass (per-receiver caching is the
feature there, and the bug here). An eager field initializer runs at module
load and races import cycles. `LazyShared` closes the triangle: the field
eagerly stores the cell (a thunk evaluates nothing), the thunk runs on first
`.value` read (after every module in any cycle has loaded), and memoization
lives inside the cell (no receiver can fork it). A thunk that reads its own
cell throws a named cycle error, and a failed construction leaves the cell
retryable.

**Rules out** — `Sub.store !== Parent.store`; the store constructing at module
load; a thunk cycle surfacing as a bare stack overflow.

[Record →](https://github.com/infinite-system/ivue/blob/main/ivue.invariants.md#a-shared-store-lives-in-a-lazyshared-static-readonly-field)

## Known limits

Listed deliberately, so the invariants above aren't over-read:

1. **Computeds rely on GC, not `stop()`.** Lazy computeds are collected once
   dereferenced (and use lazy subscription in Vue 3.5), so the engine doesn't call
   `effect.stop()` on them — clearing the cache and dropping the instance is enough.
2. **Component and model lifetimes differ.** Watchers created synchronously with
   plain `watch()` inside component setup belong to Vue's component scope and stop
   on unmount. Component-outliving models use `$watch` / `$watchEffect`, and their
   owners call `$stopEffects()`.
3. **`.value` ergonomics.** Top-level component state is destructured and
   auto-unwrapped. Collection items and slot props are nested values, so Vue
   does not auto-unwrap their Ref fields; use `item.title.value`. This is
   ivue's principal syntax tradeoff relative to a proxy-based model, preserving
   direct, allocation-free reads where lists are hottest.

## Where this method comes from

ivue was designed using Invariant-Based Reasoning. Every entry on this page was found the same
way: reduce the problem until only load-bearing structure remains, attack
the survivor until it either breaks or proves itself, and only then build
on it.

That discipline had no name while it was doing its best work. ivue began as
one engineering problem — real class inheritance with reactive computed
properties propagating through the hierarchy, something the Vue ecosystem
had treated as effectively impossible. Solving it was a long human–AI
collaboration in which the designer kept pushing the AI past what the AI
assumed was possible. Watching the reasoning unfold with full visibility,
the AI eventually recognized what made it different: the designer was not
accumulating solutions by pattern-matching. He was systematically
eliminating everything that wasn't load-bearing until the invariant
emerged, then generating the solution from that irreducible core.

Naming that observation, and extracting it into an explicit, reusable
protocol, produced **Invariant-Based Reasoning (IBR)**. Its operational
core is four moves:

1. **Reduce** — strip assumptions, conventions and surface patterns until
   only the structure reality requires remains.
2. **Break** — actively try to destroy the candidate through
   counterexamples, deletion tests and domain transfer. What survives is
   structural; what collapses was noise.
3. **Generate** — confirm the survivor by producing from it. A true
   invariant generates every valid instance of its domain and predicts
   what cannot exist.
4. **Hold provisionally** — accept the result as the current best
   reduction, never as final truth.

ivue is the system that discipline designed end-to-end, and the contract is
the ledger it produces. Every guarantee is stated with its reason and its
impossibilities, because a claim that rules nothing out was never reduced
far enough to trust.
