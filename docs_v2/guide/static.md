---
title: Static() — Capability Classes
description: The static-side sibling of Reactive(), from ivue/extras — stateless capability classes behind a replaceable namespace slot, with lazily-bound methods and $-cached static getters, order-correct per receiver.
relatedPosts: [module-level-state, discovered-not-invented, the-test-is-a-subclass]
---

# `Static()` — Capability Classes

Applications are not made only of stateful models. Around them lives a
second population: **capability classes** — stateless bags of functions
for the file system, git commands, parsers, clipboards, clocks. They
hold no instance state, are never constructed, and exist to be *called*
— and swapped: by a test double, a plugin, a platform variant.

`Static()` is the transform for that population — the static-side
sibling of `Reactive()`. It ships from the separate `ivue/extras` entry
so the primary `ivue` entry stays the bare engine:

```ts
import { Static } from 'ivue/extras';
```

[Invar](/examples/invar), the terminal IDE
[built by AI agents on ivue](/blog/agents-built-an-editor), runs its
entire capability layer — files, git, parsers, clipboard, status — on
this one seam shape, applied uniformly across the codebase.

## The shape

```ts
// GitCommands.ts
import { Static } from 'ivue/extras';

class $GitCommands {
  // a LIVE knob — subclasses override it, so NO $ prefix
  static get binary() {
    return 'git';
  }

  // derived ONCE per receiving class — the $ prefix is the API
  static get $environment() {
    return { GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C' };
  }

  // methods bind lazily to the receiving class — detachable, stable
  static stage(path: string) {
    return this.run(['add', '--', path]);
  }

  static run(argumentList: readonly string[]) {
    return execute(this.binary, argumentList, this.$environment);
  }
}

export namespace GitCommands {
  // the ANCHOR: wrapped once, at definition — children `extends` this
  export const $Class = Static($GitCommands);
  export let Class = $Class; // selected — you call this; kernels/tests swap it
}
```

**The rule: wrap at the anchor.** A class that declares static members
publishes a `Static()`-wrapped `$Class`, so everything downstream —
subclasses, test doubles, plugin extensions — inherits working
semantics just by extending it. Classes with nothing static to
transform skip the wrapper entirely (`$Class = $X`), which is why
`Static()` lives in `ivue/extras` and costs the core path nothing.

Consumers call through the namespace — `GitCommands.Class.stage(path)`
— and because `Class` is a **mutable binding read late**, the whole
capability stays replaceable: a kernel, a plugin, or a test installs a
different class and every call site follows, with no dependency-object
threading.

`Static()` returns a *subclass* of the raw class — the raw declaration
is never touched. The wrapped subclass **is** the anchor: `const`, so
inheritance always pins one immutable foundation regardless of what a
kernel or test later installs into the mutable `Class` slot.

## Methods: bound lazily, stable forever

`Class.method` is the same function on every read, bound to the
receiving class — safe to detach, hand to a router, keep in a registry:

```ts
const stage = GitCommands.Class.stage;
stage('src/index.ts'); // `this` intact — dispatches through the class
```

Binding is **per receiver**: a subclass that overrides `binary` gets
methods bound to *itself*, so `this.binary` inside `run()` sees the
override — in any read order. (The bound function is cached under a
symbol own-property of the receiver, never under the method name, so a
parent's cache can never shadow a subclass through the prototype
chain.)

## `$`-cached static getters

A get-only static accessor whose name starts with `$` becomes a
**compute-once-per-receiver cache**: the getter body runs on the first
read through a given class, and every later read returns the same
value.

The `$` prefix promises **stable identity per receiver — nothing
more**. Whether the cached value is immutable configuration or a
deliberately mutable memo table is your design; the engine does not
freeze it:

```ts
class $LineWrap {
  // an immutable config table — computed once, read forever
  static get $defaults() {
    return { column: 80, hangingIndent: 2 };
  }

  // a MUTABLE memo table — also a legitimate $-cache: the cache is
  // the table's IDENTITY, and the table's contents are yours to manage
  static get $widthMemo() {
    return new Map<string, number>();
  }
}
```

Two rules keep the population honest:

- **Knobs are not caches.** A static getter that must stay live — a
  parameter a test subclass overrides, a value that must be fresh per
  read — must **not** use the `$` prefix. The prefix is the author's
  explicit compute-once marker, exactly as it is for instance
  `$`-getters in `Reactive()`.
- **Caching is per receiver.** When a subclass overrides an input,
  `Sub.$x` derives through the override and `Sub.$x !== Base.$x`.
  Compare by value, or through one receiver.

## Hot paths: hoist once — and why

The bound method itself is **plain-function speed**. Measured in
Chromium on a 9,000,000-call loop (fresh page per variant, dedicated
loops, medians of five): a module function ran 31.7 ms, a hoisted
bound method 30.0 ms — identical within noise. The only per-call cost
is reading the method **through the accessor inside the loop**: the
same loop calling `Class.method()` on every iteration ran 84.6 ms,
because each read replays the own-property guard that makes the
per-receiver binding above correct.

So the discipline is the same as [hot ref reads](/guide/performance),
and the reason is the read, never the call. At any ordinary call
frequency none of this is visible; in a genuinely hot loop,
destructure the methods once, outside the loop:

```ts
// one accessor read per method — a LATE read of the mutable slot,
// so a subclass swapped into `Class` is still honored
const { isDataCol, numDataValue } = FlyweightLogic.Class;
for (let row = 0; row < ROWS_1M; row++) {
  const value = numDataValue(row, col); // plain-function speed
}
```

The same applies to `$`-cached getters — hoist the value once
(`const defaults = LineWrap.Class.$defaults;`) and the loop pays
nothing. Two boundaries keep the hoist honest: it lives **inside the
function** (a module-scope hoist would capture today's `Class` forever
and never see a swap), and it is never `$Class` — the raw class skips
the per-receiver binding, which is the capability seam itself.

This is the shape the [20M-cell flyweight grid](/examples/flyweight-grid)
seeds with — measured at 77–82 ms for the full fill, at or better than
the plain-module functions it replaced.

## Testing: the seam is the harness

Capability classes need no mock framework — the namespace publishes
both exports a test needs:

```ts
// override one knob — NO wrapper needed: the anchor's semantics are
// inherited, and the cache derives through the override per receiver
class SandboxGit extends GitCommands.$Class {
  static override get binary() {
    return '/opt/sandbox/git';
  }
}

// swap the whole capability at the seam — the double OVERRIDES a
// method (a new declaration), so it is wrapped where it is installed
class $RecordingGit extends GitCommands.$Class {
  static override run(argumentList: readonly string[]) {
    return record(argumentList);
  }
}
GitCommands.Class = Static($RecordingGit);
```

Because the anchor is already wrapped, the common double — overriding a
live knob — needs nothing at all: inherited methods bind to the
double, inherited `$`-caches derive through its overrides, in any read
order. Only a double that *declares or overrides* transformable
members (new methods, new `$`-getters) passes through `Static()`
itself — new declarations always need processing, and the seam-swap
line is where that naturally happens. Nothing ever extends the mutable
`Class` slot: an `extends` clause is an eager snapshot, so it would
pin the child to whatever generation a kernel or the previous test had
installed — inheritance silently ordered by load order, the disease
this pattern exists to cure.

The substitute is a full citizen, type-checked against the same
contract as the real thing — stub drift is a compile error. The full
doctrine, with its third strength (planting defects as positive
controls), is
[The test is a subclass](/blog/the-test-is-a-subclass).

## The backend: Node capability classes

Nothing above is Vue-specific — `Static()` imports no Vue and runs
anywhere JavaScript does. On a Node backend, where most modules are
function bags, the same shape becomes the default module grammar. Two
additions complete it.

**Dependency getters read the live slot.** A capability reaches
another capability through a static getter, so the cross-module read
happens when behavior runs — never while the module graph is
initializing. Imports may be circular; nothing reads eagerly:

```ts
class $Orders {
  static get Users() {
    return Users.Class; // late — and always the SELECTED class
  }

  static submit(request: OrderRequest) {
    return this.Users.find(request.params.userId);
  }
}
```

**Retained callbacks are safe — and belong to one generation.**
Because methods bind lazily with stable identity, direct registration
works:

```ts
router.post('/orders', Orders.Class.submit);
```

The router receives one stable function whose `this` is the class
selected *at registration time*. A later `Class` assignment does not
rewrite a callback already stored inside the router — so boot
composition finishes before callbacks escape:

```text
load modules → compose raw classes → select each Static() class
→ register retained callbacks → listen
```

`Class` is mutable as a **composition slot**, not a runtime feature
flag: a kernel starts from `$Class`, applies extensions, and calls
`Static()` once on the composed result. Changing the plugin set
restarts the process and produces a new sealed generation — why the
pattern deliberately stops before a custom reload runtime is
[Node Development by Restart](/guide/node-class-hmr?experiment=1).

**One privacy rule.** Avoid `this.#member` in static capability
classes: native static `#private` brands only its declaring class, and
the selected class is a subclass, so polymorphic access rejects it.
Use TypeScript `private static` for polymorphic encapsulation
(an authoring-time rule — the selected subclass dispatches fine),
`protected static` for extension points, and module scope for state
that must be private at runtime.

One boundary carries over unchanged: a namespace slot is **one
application-wide answer**. When a provider varies by request, tenant,
or session, pass that context explicitly or use scoped DI — the
pattern replaces the container for global selection only.

## Composing with `Reactive()`

`$` semantics are **granted by the transform** — a raw class or a
class only passed through `Reactive()` keeps native static-getter
behavior, exactly as an unwrapped class's *instance* `$`-getters
aren't cached either. A class that needs instance reactivity **and**
static `$`-caches uses the same anchor rule — wrap the statics at the
anchor, apply `Reactive()` to it:

```ts
export namespace Settings {
  // the anchor: statics wrapped once, at definition
  export const $Class = Static($Settings);
  // Reactive() transforms the prototype in place — Class === $Class
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

Instances of `Class` carry full reactive semantics (the prototype
chain is transformed in place, teardown included); the static surface
carries binding and `$`-caching; and children extending `$Class`
inherit both worlds' foundations.

## The boundary

- **Stateful classes belong to `Reactive()`.** `Static()` operates on
  the single class object and has no instance dimension — never wrap
  a class whose purpose is to be constructed.
- **Accessor pairs with a setter and non-`$` getters are untouched** —
  they are your live surface.
- The exact per-member contract lives in the
  [API reference](/api/#static-class-—-from-ivue-extras).
