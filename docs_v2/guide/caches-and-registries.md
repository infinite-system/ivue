---
title: Caches, Registries & self
description: Where a class's static values live — per-receiver $-caches, shared static-field registries, LazyShared cells for cross-module construction — and how instance code reads them through self.
relatedPosts: [module-level-state, the-test-is-a-subclass, initialization-order-solved]
---

# Caches, Registries & `self`

A class accumulates static values: memo tables, tuning constants,
registries, shared services. They look alike at the declaration site —
and they are not alike. One of them must fork when the class is
subclassed; another must never fork; a third cannot even be constructed
at the time the file loads. This page is the map: four storage forms,
one read idiom, and the decision that picks between them. The forms are
production-proven — [Invar](/examples/invar)'s 108,000 lines run on
exactly these shapes.

> A static value has one axis that matters: does a subclass get its own
> copy? For a memo, forking is the feature. For a registry, forking is
> the bug.

## The fork trap

`Static()` makes `$`-prefixed static getters
[compute-once-per-receiver caches](/guide/static#cached-static-getters):
the getter body runs once for the base class, and once again for every
subclass that reads it. That is precisely right for memos and per-class
tuning — a subclass that overrides an input derives its own cache
through the override.

Now put a *registry* in one:

```ts
class $CommandRegistry {
  // ❌ looks like a cache, behaves like a fork bomb
  static get $commands() {
    return new Map<string, Command>();
  }

  static register(name: string, command: Command) {
    this.$commands.set(name, command);
  }
}
```

Every receiver gets its own Map. The base class registers ten commands;
a subclass — a test double, a kernel variant, anything that says
`extends` — reads `this.$commands` and receives a **fresh, empty Map**.
Nothing throws. The subclass simply cannot see what the base registered,
and registrations made through the subclass are invisible to everyone
else. The failure is silent, load-order-dependent, and shows up far from
the declaration that caused it.

## Registries: the static field is the pin

A shared store lives in a `static readonly` **field** on the declaring
class. A field is one reference, inherited through the prototype chain,
never receiver-cached — so every access path resolves to the same
object, subclasses included:

```ts
class $CommandRegistry {
  protected static readonly sharedCommands = new Map<string, Command>();

  static get $commands() {
    return this.sharedCommands; // the field IS the pin
  }

  static register(name: string, command: Command) {
    this.$commands.set(name, command);
  }
}
```

The `$`-getter may stay — per-receiver caching over the field is
harmless, because what every receiver caches is the *same reference*.
The field is what guarantees it. This is the form for registries,
ledgers, and any table where "one per process" is the contract.

## The load-order boundary

The static field has one constraint of its own: **its initializer runs
at module load**, while other modules in the import graph may not have
finished loading. A dependency-free value — a bare `new Map()`, a
literal, a `Set` — is always safe. But the moment the initializer
constructs another module's class, it races the import cycle:

```ts
class $SearchRegistry {
  // ❌ runs at module load — SearchBackend's module may not exist yet
  protected static readonly sharedBackend = new SearchBackend.Class();
}
```

This is the same hazard the whole ivue convention exists to avoid —
[cross-module references resolve at first access, never at load
time](/guide/namespace-pattern) — reappearing on the static side. The
instance world solves it with `$`-getters; the static world cannot,
because the `$`-getter forks. Both properties are needed at once:
**load-lazy and unforkable**.

## `LazyShared`: shared and constructed

`LazyShared` (from `ivue/extras`) is the cell that has both properties.
The field eagerly stores the *cell*; the cell holds an inert thunk; the
value constructs on first read; the memoized result lives inside the
cell:

```ts
import { LazyShared } from 'ivue/extras';

class $SearchRegistry {
  protected static readonly sharedBackend = new LazyShared(
    () => new SearchBackend.Class(),
  );

  protected static get $backend() {
    return this.sharedBackend.value;
  }
}
```

Each step is safe on its own terms:

- **Storing the cell eagerly is safe** — a thunk evaluates nothing at
  module load; the field holds a closure and two flags.
- **Running the thunk on first read is safe** — by the time any code
  calls `$backend`, every module in every import cycle has finished
  loading, so the thunk may freely construct other namespaces' classes.
- **Sharing is safe** — memoization mutates state *inside* the cell,
  never a property of the receiving class. Every access path converges
  on the one constructed singleton: subclass receivers share the
  inherited field, and even a per-receiver `$`-cache over the cell
  caches the same `value` in every receiver. Forking the access path is
  harmless because there is nothing forkable at the end of it.

Two failure modes are engineered rather than left to chance:

- **A thunk cycle throws a named error.** If cell A's thunk reads cell
  B and B's thunk reads A, the read throws
  `LazyShared thunk cycle: …` instead of a bare stack overflow — the
  message names the repair (break the dependency between the two
  thunks).
- **A throwing thunk never poisons the cell.** Construction that fails
  (a backend not ready, a cycle mid-refactor) leaves the cell
  retryable: the next read runs the thunk again.

The full surface is three members:

| member | role |
| --- | --- |
| `new LazyShared(make)` | store the thunk — nothing evaluates |
| `.value` | construct on first read, memoized thereafter |
| `.reset()` | drop the value; next read constructs again — tests and process recomposition, never production flow |

`.reset()` is the test seam: a spec that needs a fresh shared store
resets the cell instead of reaching into module state.

## Reading your own statics: `self`

The storage forms above are the write side. The read side has a gap of
its own: instance code that reads its class's statics. JavaScript keeps
instance members and static members on two separate inheritance chains,
and the only runtime bridge is `this.constructor` — which TypeScript
types as bare `Function`, forcing a cast at every read.

The standard is one cast per class, named `self`:

```ts
class $Tooltip {
  static get TOOLTIP_DWELL_SECONDS() {
    return 0.4; // stays overridable — no $ prefix, so subclasses and tests can change it
  }

  protected get self() {
    return this.constructor as typeof $Tooltip;
  }

  show() {
    this.dwellTimer.start(this.self.TOOLTIP_DWELL_SECONDS);
  }
}
```

`this.constructor` is the *actual* class — the subclass when subclassed
— so reads are late-bound: a subclass overriding the knob is honored,
and per-receiver `$`-caches resolve through the right receiver. The
cast is declared once, beside the statics it types, instead of asserted
at every call site — where a copy-pasted wrong class name would
typecheck silently against the wrong statics.

Three rules keep `self` sharp:

- **One read → inline; two or more reads, or any loop → hoist.** The
  `self` getter costs ~2 ns per read over an inline cast (measured on
  Node 26, 20 million reads through the production build). Noise for a
  single read — but in loops, hoist it once:
  ```ts
  recalculate() {
    const self = this.self; // one line, one read
    for (const row of this.rows.value) {
      row.height = self.ROW_HEIGHT * self.DENSITY_FACTOR;
    }
  }
  ```
  The hoisted form measures *faster* than inline casts (~0.4 ns per
  iteration vs ~4 ns) — the engine hoists the class as a loop constant.
- **A subclass that adds statics redeclares `self`** with its own
  `typeof $Sub` — a covariant override. A subclass that only tunes
  inherited statics needs nothing; `self` is already late-bound.
- **`self` is not the namespace slot.** `this.self` is the class the
  instance was constructed from; `Namespace.Class` is the live, mutable
  slot a kernel may have re-pointed since. Receiver statics — constants,
  per-class tuning, `$`-caches — read through `self`; late-bound
  capability dispatch reads through the namespace.

An instance getter over a static earns its place when it genuinely
derives — mixing in instance state or transforming the value. A plain
read stays a direct `this.self.X` at the call site, so the knob keeps
one name and one override surface: the static.

## The decision table

| the value is… | form |
| --- | --- |
| a memo or per-class tuning — forking on subclass is wanted | `$`-cached static getter |
| a shared registry or ledger, dependency-free to build | `static readonly` field (the pin) |
| shared AND constructs another module's class | `static readonly` field holding a `LazyShared` cell |
| read from instance code | `this.self.X` — hoisted `const self = this.self` in loops |

Every row is the same invariant wearing a different constraint: **one
value, one owner, one override surface** — and construction deferred to
first use, never module load.

The narrative form of this page — the full transform map across
`Reactive()` and `Static()`, every scope in working code — is
[Bulletproof class modules](/blog/bulletproof-class-modules).
