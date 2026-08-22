---
title: "JavaScript's most-linted features are its superpower"
description: "JavaScript's most-linted properties — mutable bindings, late-bound dispatch — are the raw material for swappability no static language can reach and no dynamic language ever made safe."
date: 2026-07
tags: [javascript, philosophy]
---

# JavaScript's most-linted features are its superpower

<BlogPostDate />

![JavaScript's most-linted features are its superpower](/blog/most-linted-superpower.png)

[Last time](/blog/initialization-order-solved) we showed how one idiom
and a small checker gave JavaScript the initialization-order safety of
Swift and the graph discipline of Go. This post makes the stronger
claim that fell out of writing that one: the properties of JavaScript
that two decades of style guides taught you to suppress — mutable
bindings, late-bound dispatch, open objects — are precisely the
material out of which you build something no other mainstream stack
can assemble. The linters were sanding off the superpower.

## What the pattern actually is

Every class in [Invar](/examples/invar) is
published through a namespace with a **mutable binding**:

```ts
class $TextDocument {
  protected get lineMeasurer() { ... }   // every member: a seam
}

export namespace TextDocument {
  export const $Class = $TextDocument;   // the original, always reachable
  export let Class = Reactive($Class);   // the LIVE binding — swappable
}
```

Two "bad practices" are doing all the work. `export let` — a mutable
module binding, the thing import-hygiene lint rules exist to prevent —
means the class *itself* can be rebound at runtime, and every consumer
that reads it late gets the replacement. And prototype dispatch — the
dynamic lookup static-language people call overhead — means a subclass
override wins everywhere, instantly, no recompilation, no injection
container, no seam that somebody had to remember to design.

Testability stops being infrastructure and becomes a one-liner:

```ts
class CountingTextDocument extends TextDocument.$Class {
  measurementCount = 0;
  protected override measureLineDisplayWidth(line: string) {
    this.measurementCount += 1;
    return super.measureLineDisplayWidth(line);
  }
}
```

That is a real test from Invar's suite — it proved a width cache did
exactly two measurements across five hundred lines. No mocking
framework. No DI ceremony. Subclass anything, override one member,
observe. The [protected floor](/blog/inheritance-exile) — no `private`
anywhere, enforced by AST — is what guarantees the door is never
locked.

## Why Rust and Go cannot follow

This is not a jab; it is a design consequence they chose on purpose,
for goals that are real. But it is worth being precise.

**Rust monomorphizes.** Call sites are resolved and frozen at compile
time. "Swap the implementation" exists only where someone pre-designed
a `dyn Trait` seam; rebinding a *type* at runtime is not a concept the
language has. A test double requires the seam to have been planned at
every boundary you ever want to fake.

**Go has no inheritance at all.** Subclass-and-override does not
exist. Test seams exist exactly where a function accepted an interface
parameter — extensibility is opt-in, per call site, in advance.
Concrete types are sealed by nature, not by keyword.

In both languages, the set of extension points is decided when the
code is written. In this pattern, the set of extension points is
*every member of every class*, decided never, open always. The JVM
sits in the middle — dynamic enough underneath (classloaders, agents,
proxies) that heavy tooling can emulate some of this, but always
against the grain of `private`/`final` culture, always at 10× the
ceremony.

## The honest carve-out — and the real claim

Smalltalk, Ruby, and Python people are entitled to clear their
throats here: fully dynamic languages have always had raw
swappability. Open classes, monkey-patching, Smalltalk's live image —
the *capability* is old. Two things were always missing, and they are
why monkey-patching became a slur instead of a method.

First, **nothing proved the swap was safe**. No static layer checked
that the replacement had the right shape; no referee checked that
behavior survived. Freedom without verification curdles into chaos,
and the community response was cultural prohibition — the same move,
ironically, that JavaScript made with its lint rules.

Second, **nothing made the swap live**. Replacing an object in Ruby
does not update anything that depends on it. There is no mainstream
fine-grained reactivity in any of those runtimes — no way for the
consumers of a swapped object to *notice*.

Now count what has to compose, and where it can: a fully late-bound
runtime (JS has Smalltalk-grade dynamism); a gradual static type
system over it (TypeScript proves the replacement is shape-compatible
*at compile time* — a type-checked monkey-patch); a fine-grained
reactivity engine (ivue's [Reactive classes](/blog/reactive-is-all-you-need)
mean a swapped object's consumers update on the next read — reactive
inheritance, which no dynamic language has); JIT performance
([twenty million cells](/blog/twenty-million-cells) says enough); and
a mechanical referee — the
[AST grammar and the gate](/blog/the-whole-story-in-small-words) —
that makes total openness survivable at fleet scale.

Static languages cannot reach the capability. Dynamic languages had
the capability and never made it safe or live. JavaScript is the only
place all five layers exist to compose — and the first four were
already there, waiting, labeled as technical debt.

## The inversion, stated plainly

For twenty years the profession treated JavaScript as a language you
survive: freeze the bindings, ban the patching, wrap the dynamism in
functional ceremony until it behaves like a stricter language. The
result was a stack that had paid for total late-bound flexibility and
then spent the entire budget imitating languages that never had it.

The alternative was never "discipline versus freedom." It was moving
the discipline out of the language and into the referee — let the
checker enforce the shape, let the gate prove the behavior, and let
the language finally do the thing it was uniquely built to do: stay
open, stay live, stay swappable. The weakness was the strength.
It just needed a witness.
