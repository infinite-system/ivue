---
title: "this.method, finally safe to pass"
description: A decade of () => this.method() wrappers, .bind(this) rituals, and shipped undefined-this bugs — ended by binding methods lazily, once, on the prototype.
date: 2026-07
---

# this.method, finally safe to pass

![this.method, finally safe to pass](/blog/this-method-era.png)

React's Hooks announcement named the enemy honestly: classes "confuse
both people and machines," and the star witness was `this`. Pass
`this.handleClick` to a button and `this` is `undefined` at runtime. So a
generation learned the rituals: `.bind(this)` in constructors (one
allocated function per method per instance — there goes your prototype),
arrow-function class fields (same cost, plus you lose overriding), or the
`() => this.method()` wrapper at every call site, waiting for the one
place someone forgets.

The entire bug class comes from one fact: JavaScript methods don't carry
their object. Every workaround pays per-instance memory to compensate.

ivue's answer costs nothing until used and nothing extra after: methods
stay on the prototype, and on **first access** the engine binds and
caches the bound function on the instance. From then on:

```ts
const counter = new Counter()

const { increment } = counter   // detached — still correct
increment()                     // works: this === counter

counter.increment === counter.increment // true — stable identity, forever
```

Correct `this`, referential stability (event listeners unsubscribe
cleanly, `v-on` handlers never re-bind, memoized children don't
re-render), and you pay one bind per method you *actually use*. The live
counter on the homepage hero runs exactly this — and here, with the
buttons wired straight to dotted methods, no wrappers anywhere:

<DemoCounter />

One honest footnote from our own benchmarks: a bound function call
measures ~4 ns against ~1.4 ns for a raw closure — and if a hot loop ever
cares, hoisting the method (`const grow = instance.grow`) reaches closure
speed, because identity stability is what makes hoisting safe
([Hot loops](/guide/performance#hot-loops)).

The wrapper era produced millions of arrow functions that exist only to
say "yes, really, that object." Let them go: [Reactive
State — Methods](/guide/state#methods).
