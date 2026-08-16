---
title: 'Module-level state is a bug'
description: The most normal line in JavaScript — const cache = new Map() at module scope — is an eager, global, unownable singleton with no seam. Static() replaces it with one declaration that is lazy, inheritable, overridable, and test-isolated. A 94,000-line codebase runs on zero module-level functions and zero module-level variables.
date: 2026-08
tags: [javascript, architecture]
---

# Module-level state is a bug

<BlogPostDate />

![Module-level state is a bug](/blog/module-level-state.png)

This is the most normal line in JavaScript:

```ts
const cache = new Map();
```

It sits at the top of a module, above the exports, in essentially
every codebase ever written. A memo table here, a registry there, a
lazily-filled lookup, a singleton client, a pool. Nobody reviews it.
Nobody flags it. It is so universal it has become invisible.

Read it slowly and it is a remarkable set of decisions to make in
five words. That line declares state that is **eager** — allocated
the moment anything imports the module, whether or not it is ever
used. **Process-global** — one instance, forever, shared by every
consumer including every test that ever touches the module.
**Unowned** — it belongs to a *file*, so no class, no receiver, no
hierarchy has any relationship to it. And **sealed** — nothing can
override it, specialize it, or substitute it, because module scope
has no seam.

That last property built an industry. `vi.mock`, `jest.mock`, proxy
loaders, dependency-injection containers with module-shaped tokens —
enormous machinery whose job is to intercept a module *at the loader*
because the state inside it cannot be reached any other way.

> Mocking frameworks are not testing tools. They are patches for
> state that lives where no seam can reach it.

## JavaScript's two containers

The language has always offered exactly two long-lived homes for
state: the **module** and the **class**. The ecosystem chose the
module — and it is worth being precise about why, because the reason
has expired.

The class was always the better container *in kind*. A class has a
name that appears in types. It has a hierarchy — subclasses exist,
and they can specialize what they inherit. It has a receiver — code
inside it knows *who* it is running as. And it has a seam by
construction: override the member.

What the class lacked was one property module scope had by accident:
somewhere to put state without ceremony. A `static property = new
Map()` initializer is *also* eager — it runs when the class is
defined, which is load time again. A hand-rolled lazy static —
getter, backing field, null check, per-subclass bugs — is the kind
of eight-line ritual nobody repeats four hundred times. So state
went to the module, and every property in the paragraph above came
with it.

[`Static()`](/guide/static) supplies the missing piece. Wrap a class
once, and every `$`-prefixed static getter becomes **evaluated on
first read, cached per receiver, inheritable, and overridable** —
one declaration:

```ts
import { Static } from 'ivue/extras';

class $WrapIndex {
  // Lazy, owned, per-class, replaceable — and it reads like a getter
  // because it is one. First read runs the body; every later read
  // returns the same Map. `$` marks the contract: stable identity.
  protected static get $segmentsByLine(): Map<number, WrapSegment[]> {
    const segmentsByLine = new Map<number, WrapSegment[]>();
    return segmentsByLine;
  }
}

export namespace WrapIndex {
  export const $Class = Static($WrapIndex); // anchor — children `extends` this
  export let Class = $Class; // the published capability class
}
```

The module-level `const` and this getter hold the same Map. Every
other property differs:

> The module is a file. Files don't inherit, don't specialize, don't
> appear in a type, and don't know who is asking. The class was
> always the better container — it just couldn't store anything
> lazily until now.

## The ladder — what actually lives in these getters

The pattern would be a curiosity if it only held memo tables. What
makes it a substrate is that *one declaration form* absorbs every
kind of module-level state a real system accumulates.
[Invar](/blog/introducing-invar) — the 94,000-line terminal IDE
built on ivue — runs 78 of these getters. A ladder of real cases,
smallest to strangest:

**A memo table.** The wrap index above is Invar's own text-layout
cache — a `WeakMap` from document to its line-wrap projection, so
entries vanish with their documents. Nothing allocates until the
first document wraps a line.

**A platform object that is expensive to build.** Unicode-correct
cursor movement needs `Intl.Segmenter`, and constructing one is not
free:

```ts
class $TextSegmentation {
  protected static get $graphemeSegmenter(): Intl.Segmenter {
    const graphemeSegmenter = new Intl.Segmenter(undefined, {
      granularity: 'grapheme',
    });
    return graphemeSegmenter;
  }
}
```

Built on the first keystroke that needs it, owned by the class that
understands it, and — because it is a getter on a hierarchy — a
subclass in a test can hand back a stub segmenter without any loader
tricks.

**A native library handle.** Invar's PTY layer binds `libc` through
Bun's foreign-function interface — `dlopen`, symbol table, the
works — inside a `$`-getter. A *shared C library* as a lazily-cached
static property: opened once, on first terminal spawn, never in a
process that doesn't open a terminal.

**The import itself.** This one rewires how you think about
dependencies:

```ts
class $TypeScriptStructureAnalyzer {
  // The compiler is a 40 MB dependency. It loads once, on the first
  // structural query — and NEVER in a session that doesn't analyze
  // TypeScript. The cached value is the promise itself.
  protected static get $typescriptPromise(): Promise<typeof import('typescript')> {
    return import('typescript');
  }
}
```

A dynamic `import()` is already lazy, but calling it twice loads
twice into two promises. Cached under a `$`-getter, the *promise*
becomes the singleton. Module-level top-level `await` — the
ecosystem's usual answer — would put the 40 MB load back on the
import-time clock for everyone.

**The whole mutable snapshot.** Invar's status channel keeps its
entire published state — the object observers read — as one
`$`-cached static. The `$` contract is **stable identity, not
immutability**: the object is mutated freely; what is guaranteed is
that every reader, forever, is looking at *the same object*. That is
exactly the contract a live snapshot needs, and exactly what a
module-level `let` cannot promise once tests and workers enter the
picture.

One form. Five completely different kinds of state. That collapse of
variety is the point — where a conventional codebase has module
constants, init functions, DI registrations, singleton getters, and
`let instance: T | null = null` guards, this one has a getter with a
`$` on it, everywhere, [and the uniformity itself becomes an
instrument](/blog/uniformity-is-an-instrument).

## Per-receiver: the property module scope cannot have at any price

`Static()` caches **per receiver**. When a subclass reads an
inherited `$`-getter, the getter body runs again *for the subclass*,
and the result is cached on the subclass — sibling classes never
share a table by accident, and a child that wants its own pool
simply has one.

Module scope cannot express this. There is one file, therefore one
`Map`, therefore every consumer shares — the file has no notion of
"who is asking." The receiver-following cache is what turns storage
into an *inheritance-aware* facility, and it is what makes the test
story collapse into [the test is a subclass](/blog/the-test-is-a-subclass):

```ts
class $RecordingSegmentation extends TextSegmentation.$Class {
  protected static get $graphemeSegmenter(): Intl.Segmenter {
    return buildInstrumentedSegmenter();
  }
}
```

No `vi.mock`, no loader interception, no restore-after-each
bookkeeping. The fake is a full citizen — the compiler type-checks
it against the real member — and the real class's cache is never
touched, because the subclass has its own. The entire mocking
industry exists to simulate, at the loader, the seam this getter has
by construction.

## Measured at zero

The strong form of the claim is not "prefer this." It is that a
serious codebase can run with **no module-level state at all** — and
one does. Invar's conventions are machine-enforced by AST census
(checkers that must first detect a planted violation before their
pass counts — a boundary check that cannot fail is worse than none).
Counted 2026-08-11, over 94,054 source lines and 372 files:

```
module-level functions:      0
module-level variables:      0
$-cached static getters:    78
Reactive() classes:         79
Static() capability classes: 198
```

The zero is stricter than it had to be. The pattern's real target
is **state, not constants** — a frozen
lookup table at module scope harms nobody. Invar draws the line past
even that: its validation constants — regular expressions, a
reserved-name `Set` — live as static getters on the class that
validates with them, so the metric is not "zero state, with constant
exceptions." It is zero module-level declarations outright, held
there by a grammar check that counts every violation by AST. The
moment a value is written after load, or a test wishes it were
different, it already belongs to a class — and here, everything
does.

And the substrate is load-bearing enough that Invar *verifies it at
boot*: startup constructs a throwaway class with a `$TABLE` getter,
wraps it in `Static()`, and refuses to launch if two reads return
different objects — with an error message telling you your
`node_modules` is stale. An application that checks its language
extension is present before it agrees to run.

## The cost, honestly

`Static()` is opt-in from [`ivue/extras`](/guide/static) — 493 B
gzipped, measured on the published 2.2.1 build, with no dependency
on Vue or anything else; the identical idiom runs in Invar's
backend modules under Bun. The discipline it asks for: the wrapper
must sit at the namespace's `$Class` anchor so subclasses inherit
the transform, and `$` must be read as what it is — **a stable-
identity contract, not a freeze**. The getter body runs once per
receiver; if the body reads something that changes later, the cache
holds the first answer, by design. State that must *react* belongs
in [instance getters returning refs](/guide/state) — this pattern is
the storage layer beneath that, not a substitute for it.

## The flip

For thirty years, "where does long-lived state go?" had a default
answer so ingrained it stopped looking like a decision. The default
was wrong — not fatally, but *taxably*: eager when it could be lazy,
global when it should be owned, sealed when it needed a seam, and
propped up by an entire tooling genre built to pry files open at the
loader.

One small transform moves the answer from the file to the class,
and every one of those properties inverts at once. The measure of
the flip is that a hundred-thousand-line system runs at **zero** —
and boots by proving it.

State wants an owner. Now it can afford one.
