---
title: Bulletproof class modules
description: LazyShared seals the last seam — the full Reactive() + Static() system is now memoizable at every scope, with polymorphism, inheritance, and performance intact. Every value kind, shown in full code.
date: 2026-08
tags: [architecture, javascript, patterns]
---

# Bulletproof class modules

<BlogPostDate />

![Bulletproof class modules](/blog/bulletproof-class-modules.png)

Every value a class module can hold wants three things at once: to be
**computed once** (memoized at the right scope), to stay **overridable**
(polymorphism and inheritance keep working), and to cost **nothing it
didn't earn** (no allocation before first use, no tax after). JavaScript
gives you no help reconciling the three — eager statics race module
loading, per-instance caching bloats objects, and anything cached too
early stops respecting subclasses.

ivue's architecture has been closing that triangle one seam at a time.
With `LazyShared`, the last seam is sealed: the combined `Reactive()` +
`Static()` system now memoizes at **every scope a value can live in**,
without giving up late binding anywhere. This post walks the whole
map — every value kind, in code.

> Bulletproof does not mean "carefully avoided." It means the failure
> modes are unrepresentable: there is no way to write the forked
> registry, the load-order race, or the stale `this` — each value kind
> has exactly one home, and every home is safe by construction.

## The map

| the value is… | use a | memoized | inheritance |
| --- | --- | --- | --- |
| mutable state | ref-getter | per instance, on first touch | subclass overrides the getter |
| a derivation | plain getter | never allocated — prototype only | `super` works; zero bytes to inherit |
| an expensive derivation | `computed()` thin closure | per instance | body delegates to an overridable method |
| a store or composable | instance `$`-getter | per instance, forever | resolves at first touch, after cycles |
| a method | plain method | bound lazily, per receiver | stable identity, safe to detach |
| a tunable static | live static getter | never — deliberately fresh | the override IS the feature |
| a static memo | `$`-static getter | per receiver | subclass derives through its overrides |
| a shared registry | `static readonly` field | one reference | inherited, never receiver-cached |
| shared AND constructed | `LazyShared` cell | one value, built on first read | every receiver converges on it |

Nine value kinds, nine homes, no judgment calls left at the call site.
The rest of this post is the map, executed.

## The instance scope — `Reactive()`

The first five rows live on one class. Everything here is lazy — an
instance is a plain object at construction, and each member
materializes only when something reads it:

```ts
// cart.ts
import { Reactive } from 'ivue';
import { ref, shallowRef, computed } from 'vue';
import { useSessionStore } from './session.store';

class $Cart {
  // MUTABLE STATE — ref-getters. The Ref allocates on FIRST TOUCH and
  // is cached per instance from then on; an untouched member costs
  // nothing. Read and write via .value.
  get items() {
    return shallowRef<CartItem[]>([]);
  }
  get couponCode() {
    return ref('');
  }

  // DERIVATION — a PLAIN getter. Never allocated: it lives on the
  // prototype, costs zero bytes per instance, and is reactive through
  // the leaves it reads. This is the workhorse — in ivue's own admin
  // dashboard, ~170 of these do all derivation with zero computed().
  get subtotal() {
    return this.items.value.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }
  get isEmpty() {
    return this.items.value.length === 0;
  }

  // EXPENSIVE DERIVATION — computed(), the surgical opt-in (~300
  // bytes/instance buys value-caching between dependency changes).
  // The closure is THIN: it only dials a method, so the logic stays
  // on the prototype — testable directly, overridable by subclasses.
  get sortedItems() {
    return computed(() => this.sortItems());
  }

  // STORE / COMPOSABLE — the `$`-getter caches WHOLE, per instance,
  // forever. It runs on first touch — long after every module in any
  // import cycle has loaded — which is why circular imports are a
  // non-event in this architecture.
  private get $session() {
    return useSessionStore();
  }
  get discount() {
    return this.$session.memberDiscount;
  }

  // METHODS — plain. The engine binds each one lazily, once, on first
  // access, with stable identity: safe to detach, pass to listeners,
  // and compare. You pay one bind per method you actually use.
  addItem(item: CartItem) {
    this.items.value = [...this.items.value, item];
  }

  sortItems() {
    return [...this.items.value].sort(byPrice);
  }
}

export namespace Cart {
  export const $Class = $Cart; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
```

Inheritance is not a special case at this scope, because derivations
are *getters* — real language members that understand `extends` and
`super`:

```ts
// wholesale-cart.ts
import { Reactive } from 'ivue';
import { Cart } from './cart';

class $WholesaleCart extends Cart.$Class {
  // override ONE derivation; every other member is inherited at zero
  // bytes — the prototype chain IS the reuse mechanism
  get subtotal() {
    return super.subtotal * this.wholesaleFactor;
  }

  wholesaleFactor = 0.8;
}

export namespace WholesaleCart {
  export const $Class = $WholesaleCart;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

## The receiver scope — `Static()`

Rows six and seven belong to capability classes — function bags for
git, files, parsers, clocks: never constructed, only called and
swapped. `Static()` (from `ivue/extras`) gives their statics the same
two properties instances enjoy: lazily bound methods with stable
identity, and `$`-prefixed getters that compute **once per receiver**:

```ts
// git-commands.ts
import { Static } from 'ivue/extras';

class $GitCommands {
  // TUNABLE STATIC — a LIVE getter, no $ prefix: never cached, so a
  // subclass or test double overrides it and everything derived from
  // it follows
  static get binary() {
    return 'git';
  }

  // STATIC MEMO — the $ prefix makes this compute once PER RECEIVER.
  // The base class derives one environment; a subclass that overrides
  // `binary` derives its OWN through the override. Forking on
  // subclass is the feature here.
  static get $environment() {
    return { GIT: this.binary, LC_ALL: 'C' };
  }

  // METHOD — bound lazily to the RECEIVING class; detachable, stable
  static stage(path: string) {
    return this.run([this.binary, 'add', '--', path]);
  }
}

export namespace GitCommands {
  export const $Class = Static($GitCommands); // anchor — children `extends` this
  export let Class = $Class; // selection — kernels/tests swap this
}
```

Polymorphism at this scope is receiver polymorphism, and the memo
respects it:

```ts
class $SandboxGit extends GitCommands.$Class {
  static get binary() {
    return '/sandbox/bin/git'; // override the knob…
  }
}

// …and the per-receiver cache derives THROUGH the override:
$SandboxGit.$environment.GIT; // '/sandbox/bin/git'
GitCommands.Class.$environment.GIT; // 'git' — each receiver, its own memo
```

## Reading your own statics — `self`

Instance code reading its class's statics crosses JavaScript's least
ergonomic boundary: instance members and static members live on two
parallel inheritance chains that never touch, and the only runtime
bridge — `this.constructor` — is typed as bare `Function`. The
standard is one cast per class, named `self`, and direct reads at
every call site:

```ts
class $Tooltip {
  static get TOOLTIP_DWELL_SECONDS() {
    return 0.4; // stays overridable — subclasses and tests change it
  }

  protected get self() {
    return this.constructor as typeof $Tooltip;
  }

  show() {
    this.dwellTimer.start(this.self.TOOLTIP_DWELL_SECONDS);
  }
}
```

`this.constructor` is the *actual* class, so the read is late-bound: a
subclass setting `0.1` is honored everywhere, including inside
`$`-caches computed from it. In hot paths the same hoisting discipline
that governs refs and methods applies — and refunds more than it
costs:

```ts
recalculate() {
  const self = this.self; // one read; the engine treats the class as
  for (const row of this.rows.value) {
    // a loop constant from here — measured ~0.4 ns/iteration,
    // CHEAPER than an inline cast per read (~4 ns)
    row.height = self.ROW_HEIGHT * self.DENSITY_FACTOR;
  }
}
```

## The shared scope — where it used to break

Rows eight and nine are the seam this architecture just sealed. A
shared store — a registry, a ledger, one-per-process by contract —
breaks BOTH earlier tools, each in its own way.

**Break one: the per-receiver cache forks it.**

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

// the base registers ten commands…
CommandRegistry.Class.register('open', openCommand);

// …and a subclass — a test double, a kernel variant — sees NONE of
// them: its first read of $commands derived a fresh, empty Map
class $TestRegistry extends CommandRegistry.$Class {}
$TestRegistry.$commands.size; // 0. Nothing throws. Nothing warns.
```

The failure is silent, load-order-dependent, and surfaces far from
the declaration that caused it.

**The fix is a static field** — one reference on the declaring class,
inherited through the prototype chain, never receiver-cached:

```ts
class $CommandRegistry {
  protected static readonly sharedCommands = new Map<string, Command>();

  static get $commands() {
    return this.sharedCommands; // the field IS the pin
  }
}

class $TestRegistry extends CommandRegistry.$Class {}
$TestRegistry.$commands === CommandRegistry.Class.$commands; // true
```

**Break two: the field races module load.** A field initializer runs
while modules are still loading. A bare `new Map()` is safe — it
depends on nothing. But the moment the initializer constructs another
module's class, the load-order dragon is back:

```ts
class $SearchRegistry {
  // ❌ runs at module load — SearchBackend's module may not have
  // finished loading; in an import cycle this is a coin flip
  protected static readonly sharedBackend = new SearchBackend.Class();
}
```

The instance world solves exactly this with `$`-getters that defer to
first touch. The static world can't — its `$`-getter forks. The seam
needs both properties at once: **load-lazy and unforkable.**

## `LazyShared` — the last seam

That two-property specification is the entire design. The
implementation is small enough to print — this is the real source,
from `ivue/extras`:

```ts
export class LazyShared<T> {
  constructor(private readonly make: () => T) {}

  private constructed = false;
  private constructing = false;
  private stored: T | null = null;

  get value(): T {
    if (!this.constructed) {
      if (this.constructing) {
        throw new Error(
          'LazyShared thunk cycle: this cell is read inside its own ' +
            'construction. Break the dependency between the two thunks.',
        );
      }
      this.constructing = true;
      try {
        this.stored = this.make();
        this.constructed = true;
      } finally {
        this.constructing = false;
      }
    }
    return this.stored as T;
  }

  /** Drop the constructed value; the next read constructs again. */
  reset(): void {
    this.constructed = false;
    this.stored = null;
  }
}
```

Usage is the static-field form with the cell in the field:

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

Each step is safe on its own terms. Storing the cell eagerly is safe —
a thunk evaluates nothing at load; the field holds a closure and two
flags. Running the thunk on first read is safe — by then every module
in every import cycle has finished loading, so it may freely construct
other namespaces' classes. And sharing is safe because the memoized
value lives *inside* the cell, never on a receiving class.

The cell is engine-agnostic — it seals the shared scope for BOTH
transforms. A `Static()` capability class uses it as above; a class
that carries reactive instances *and* statics composes the transforms
and gets the same guarantee on its static side:

```ts
// settings.ts — reactive instances AND a sealed shared static
import { Reactive } from 'ivue';
import { Static, LazyShared } from 'ivue/extras';
import { ref } from 'vue';

class $Settings {
  protected static readonly sharedStorage = new LazyShared(
    () => new StorageBackend.Class(),
  );
  protected static get $storage() {
    return this.sharedStorage.value; // one backend, every receiver
  }

  // …while instances stay fully reactive
  get theme() {
    return ref<'light' | 'dark'>('dark');
  }

  persist() {
    this.self.$storage.save('theme', this.theme.value);
  }

  protected get self() {
    return this.constructor as typeof $Settings;
  }
}

export namespace Settings {
  export const $Class = Static($Settings); // anchor the statics…
  export let Class = Reactive($Class); // …then the instance transform
  export type Instance = typeof Class.Instance;
}
```

One class, all nine rows available at once — reactive state on the
instances, per-receiver memos and the sealed shared store on the
statics, `self` bridging the two chains.

That last property is the one that seals the seam: **forking the
access path is harmless, because there is nothing forkable at the end
of it.** This is test-proven in ivue's suite — subclass receivers, and
even per-receiver `$`-caches layered over the cell, converge on the
one singleton:

```ts
let constructionCount = 0;

class $Registry {
  protected static readonly sharedEntries = new LazyShared(() => {
    constructionCount += 1;
    return new Map<string, number>();
  });
  static get $entries() {
    return this.sharedEntries.value; // a per-receiver cache… of the ONE value
  }
}
const Registry = Static($Registry);
class $SubRegistry extends Registry {}
const SubRegistry = Static($SubRegistry);

Registry.$entries.set('planted', 7);
SubRegistry.$entries === Registry.$entries; // true
SubRegistry.$entries.get('planted'); // 7
constructionCount; // 1 — one construction, ever
```

Even failure is engineered rather than left to chance:

```ts
// a cycle between cells is a NAMED, retryable error — not a stack overflow
const cellA = new LazyShared((): number => cellB.value + 1);
const cellB = new LazyShared((): number => cellA.value + 1);
cellA.value; // throws: 'LazyShared thunk cycle: …'

// and a throwing thunk never poisons the cell — the next read retries
let attempts = 0;
const cell = new LazyShared(() => {
  attempts += 1;
  if (attempts === 1) throw new Error('backend not ready');
  return 'ready';
});
try { cell.value; } catch {} // first read: the real error, surfaced
cell.value; // 'ready' — construction retried, then memoized
```

`reset()` completes the story as the test seam: a spec that needs a
fresh shared store resets the cell instead of reaching into module
state.

## What was never given up

**Polymorphism.** Every memo in the map is late-bound to its receiver:
`$`-statics derive through subclass overrides, methods bind to the
receiving class, `self` reads resolve to the actual constructor. The
one value that must NOT respect the receiver — the shared store — is
exactly the one whose state lives outside receiver-space. The rule and
its exception are the same principle read in both directions.

**Inheritance.** Derivations are getters, so `extends` and `super`
work on them. Statics anchor once at `$Class` and children extend it
bare — a subclass overriding one knob inherits working caches, bound
methods, and the shared stores, with no re-wrapping. Nothing in the
memoization layer treats a subclass as a special case.

**Performance.** Memoization here is not a cache bolted on — it is the
allocation model. Instances are plain objects; derivations cost zero
bytes each; nothing computes before first use, which is why creating
100,000 instances measures 55–253× faster than the alternatives
([Performance by Design](/guide/performance)). The residual taxes are
measured, and each has a one-line refund — hoist the `$`-cache read,
hoist `const self = this.self` — landing at fractions of a nanosecond
per iteration, cheaper than the unhoisted "fast" form.

## Why this matters beyond ivue

The triangle — memoized, overridable, pay-per-use — is not an ivue
problem. It is what every module system with classes eventually
fights: singletons that break under subclassing, initializers that
break under circular imports, caches that break polymorphism. The
usual answer is discipline — conventions, lint rules, review
vigilance.

The architecture's answer is structural. Each value kind gets a home
whose guarantees are enforced by the engine or by the shape itself,
and the homes compose — which is why the whole map fits in one table
and the newest piece is forty lines. Discipline you maintain;
structure you inherit.

The reference lives in the guide:
[Caches, Registries & `self`](/guide/caches-and-registries) — and the
system it completes is [The Standard](/guide/standard).
