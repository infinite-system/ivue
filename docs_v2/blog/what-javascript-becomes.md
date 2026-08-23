---
title: 'What JavaScript becomes'
description: Managed-runtime linking from the JVM, live-image classes from Erlang and Smalltalk, receiver-aware static storage no static language can express, and transparent reactive objects — one language ends up holding all four, and holds them in userland. The capstone of the series.
date: 2026-08
tags: [javascript, philosophy]
relatedPosts: [circular-imports-dissolved, module-level-state, most-linted-superpower, initialization-order-solved, the-object-graph-they-took, what-becomes-buildable]
---

# What JavaScript becomes

<BlogPostDate />

![What JavaScript becomes](/blog/what-javascript-becomes.png)

Two articles on this blog prove two properties.
[Circular imports, dissolved](/blog/circular-imports-dissolved)
shows a 371-file codebase whose value-import graph measures zero
cycles while its domain stays fully cyclic.
[Module-level state is a bug](/blog/module-level-state) shows the
same codebase running on zero module-level declarations, its every
long-lived value owned by a class.

This article asks what those properties add up to — because the
answer is not "JavaScript, tidied." Put the discipline's pieces
side by side with the languages that pioneered each one, and a
stranger claim comes into focus:

> Each capability exists somewhere — in the JVM, in Erlang, in
> Scala, in Smalltalk. The conjunction exists nowhere else. And
> nowhere else can it be added without a new compiler.

Language by language, then.

## Java and C#: the linking model, acquired — then passed

Java never had an import-cycle problem. Not because Java engineers
were disciplined, but because a Java class is a **declaration**,
not a script. The JVM loads classes lazily and runs a class's
initialization at its *first active use* — order emerges from
demand. A JavaScript module is the opposite kind of thing: a
program that executes when loaded, in an order the loader must
choose. Everything painful about cycles follows from that one
difference.

The [namespace pattern](/guide/namespace-pattern) converts
JavaScript modules into declaration-like units. The import pulls in
a symbol table; every cross-module evaluation waits for first
touch. That is the JVM's linking model, acquired as a usage
convention — no classloader required.

Then JavaScript passes them. Neither Java nor C# has **late static
binding**: a static member resolves against the class named at the
call site, period — override a static in a subclass and dispatch
does not follow the receiver. PHP found this painful enough that it
added the `static::` keyword in 5.3 just to get receiver-following
statics. JavaScript has had them natively forever — `this` inside a
static method *is* the receiving class — and
[`Static()`](/guide/static) turns that from a curiosity into a
storage system: `$`-cached getters materialize **per receiver**, so
every subclass owns its own lazily-built copy of the static state.
A statically-compiled language cannot express this; its static
references are burned in at compile time.

## Python: the same wound, treated per symptom

Python is the honest comparison, because Python has JavaScript's
exact disease: a module is an executed script, cycles meet
half-initialized modules, and programs crash on
`AttributeError: partially initialized module`. Python's official
remedy is to move the `import` statement *inside the function that
needs it* — deferring the reference to call time.

Look closely: that is the same medicine the namespace pattern
prescribes — access-time resolution. The difference is the regimen.
Python applies it per crash site, after the crash, as a documented
exception to normal style. The namespace pattern applies it to
every cross-module reference, before any crash, as the normal style
itself. One language takes the cure symptom by symptom; the other
is immunized.

## Scala and Kotlin: the lazy object, extended

Scala's `object` and Kotlin's `by lazy` are the closest relatives
of the `$`-cached static getter: singletons initialized on first
touch, by language design. If the discipline stopped there, this
section would read "JavaScript catches up to Scala."

It does not stop there. A Scala `object` is terminal — it is an
endpoint of the language, not a member of a hierarchy. Subclasses
of a class do not each receive their own copy of companion-object
state; there is one object, full stop. The per-receiver cache
inverts that: the static storage *follows the inheritance tree*,
materializing separately for each class that reads it. A capability
class and its test subclass hold independent tables by
construction — which is why
[the test is a subclass](/blog/the-test-is-a-subclass) works with
no mocking machinery. That storage semantic — lazy singletons,
*per node of the hierarchy* — is not a port of anything. It has no
original.

## Erlang and Smalltalk: the live image

This is the sleeper. Read the namespace's second line again:

```ts
export let Class = Reactive($Class); // let — a LIVE, mutable slot
```

A **mutable class slot, resolved at access time** is structurally
the thing Erlang built a telecom empire on: hot code replacement,
where the next call lands in the newest version of the module. It
is also Smalltalk's live image, where classes are ordinary objects
a running system can rebind. Invar's sealed kernel is this property
used deliberately — plugins fold subclasses over the slot before
boot, then the kernel freezes — and
[development itself](/guide/hmr) uses the same
property continuously: edit a method, and live instances answer
with the new body, state intact.

Java and C# fake pieces of this with bytecode agents and
edit-and-continue debuggers — privileged tooling, bolted to the
runtime. In JavaScript it is an assignment statement.

## The axis with no comparison: reactivity in the object model

Every language above stops at the same line: none of them can make
an ordinary object *observable* without ceremony. C# ships
`INotifyPropertyChanged` — the object must announce its own changes,
by hand, property by property. Python's descriptor protocol can
host observable attributes (traitlets does), but through base-class
ceremony and explicit change publication. In both, observation is
something an object must be *written for*.

JavaScript's object model is interceptable at the property level —
getters and prototypes all the way down. That is what lets
[`Reactive()`](/guide/standard) transform a plain class **in
place** — same identity, instances stay plain objects — and hand
back a graph where reads subscribe and writes notify, with the
class none the wiser. The consequences compound in a way that is
easy to miss: the *same* class graph that solved linking and
storage above is also the observation graph. That is why an
external process can query
[any state by dotted path](/blog/agents-built-an-editor), why one
coarse render effect can drive a whole IDE, and why
[the object graph came back](/blog/the-object-graph-they-took)
without a performance bill. One structure, three roles.

![Four language lineages — JVM/CLR linking, PHP receiver statics, Erlang/Smalltalk hot swap, Scala/Kotlin lazy singletons — converging into plain JavaScript, all in userland](/blog/art/what-javascript-becomes-diagram-1.png)

## The scorecard

| capability | who pioneered it | how they got it | JavaScript, with the discipline |
| --- | --- | --- | --- |
| lazy, order-free class linking | JVM / CLR | language spec + classloader | namespace pattern — a convention |
| receiver-following statics | PHP (`static::`) | a 5.3 language change | native `this`, plus `Static()` storage |
| per-hierarchy lazy static state | — | no original exists | `$`-cached getters, per receiver |
| hot-swappable classes | Erlang, Smalltalk | privileged runtime support | `export let Class` — an assignment |
| lazy singletons | Scala, Kotlin | `object`, `by lazy` | `$`-getters — same semantics |
| transparent reactive objects | — | closest: ceremony-based (C#, Python) | `Reactive()` — in place, identity kept |

Every row that reads "language change" or "runtime support" on the
left reads "userland" on the right. That asymmetry is the actual
finding:

> The properties JavaScript is mocked for — mutable prototypes,
> getters on anything, dynamic `this`, open classes — are exactly
> the degrees of freedom the discipline is built from. The
> dynamism was never a weakness. It was unclaimed capability,
> waiting for a discipline.

And the door does not swing the other way. Java cannot adopt the
namespace pattern idiomatically — holding classes in mutable slots
means surrendering `new`, constructor typing, and paying reflection
at every site. Scala cannot add per-receiver companion state —
objects sit outside dispatch. Each of those languages would need a
*language change* to acquire what JavaScript acquires with an
export shape and a getter convention. Meanwhile the discipline is
enforceable today, mechanically:
[Invar](/blog/introducing-invar) gates every one of these
conventions with AST censuses — a stricter dialect of JavaScript,
run without forking the language, [measured at
zero](/blog/the-zeros-didnt-move) continuously.

## A conjunction, not a coronation

This claims a combination of properties — Java keeps its type
system, Erlang keeps its concurrency, and a discipline only holds
where it is enforced, which is why the gates are part of the
result. With the scope set, the sentence stands: **the scripting language everyone mocked ends up as
the only mainstream language holding managed-runtime linking,
live-image classes, receiver-aware static storage, and transparent
reactive objects at once — and it holds them in userland.** The
languages that pioneered each property cannot reach the
conjunction. The language with no compiler, no linker, and no
blessed runtime walks into it — carried by
[one kilobyte](/blog/one-kilobyte-feature) of discipline.

That is what JavaScript becomes. It was always allowed to. It was
just never asked.
