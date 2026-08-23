---
title: 'r/javascript launch post'
description: 'The r/javascript self-post: the language angle — classes were never constrained.'
channel: reddit
date: 2026-08
---

# r/javascript launch post

**Title:**

> Classes didn't fail JavaScript — they were never constrained. Three years finding the invariant shape of a JS class, and what fell out.

**Body:**

Around 2016, every major framework bet on classes. By 2020, every
major framework had abandoned them. React went hooks, Vue went
composables, and the verdict entered folklore: classes "confuse both
people and machines."

I think the industry drew the right conclusion from the wrong
diagnosis, and I spent three years testing that hunch.

**The wrong diagnosis**

The bugs were absolutely real: `this` detaching from methods the
moment you pass them, mixin name collisions, initialization-order
races, singletons silently forking under subclassing, circular
imports blowing up at load time. But none of those are *class* bugs.
They're **unconstrained-variation** bugs. A JavaScript class gives you
ten ways to do everything — state in fields or getters or constructor
assignments; methods bound with `.bind()` or arrow fields or wrapper
closures; initialization eager, lazy, or in an `init()` you hope
someone calls; shared state in statics, module scope, or a DI
container. Every codebase picks a different subset. Every pairing of
subsets breeds a new bug.

Functions won because they shipped with constraints. A closure has
one way to capture, one way to call, no `this`, no inheritance to
misuse. Less variation, fewer bugs — a completely rational trade.

But notice what the trade gave up: nobody went looking for the
missing **constraint set for classes**. The question "what must be
TRUE for a plain class to be safe?" was never answered — it was
abandoned.

**The constraints, found**

Answer it and the constraints turn out to be small, and each one
kills a whole bug family:

*Mutable state is a getter returning a ref.* Read and write through
`.value`. The cell allocates on first touch and is cached per
instance — untouched members cost literally nothing:

    class $Cart {
      get items() {
        return shallowRef([]);
      }
    }

*A derived value is a plain getter.* Not a memo, not a wrapper — a
prototype getter. Zero bytes per instance, and because it is a REAL
language member, `extends` and `super` work on it:

    get subtotal() {
      return this.items.value.reduce(sumPrices, 0);
    }

    // subclass overrides ONE derivation, inherits everything else free
    class $WholesaleCart extends $Cart {
      get subtotal() {
        return super.subtotal * 0.8;
      }
    }

*Methods bind lazily, once, on the prototype.* First access installs
a bound function with stable identity. Detach it, pass it to a
listener, compare it — `this` is always right, and no per-instance
closure allocation happened up front. The `() => this.method()`
wrapper era simply ends.

*Cross-module references resolve at first access, never at load.*
Constructors and getters name other modules' classes freely; by the
time any code RUNS, every module in every import cycle has finished
loading. Circular imports stop being a topology you manage and start
being a non-event.

*Shared state lives outside receiver-space.* This is the one
JavaScript makes genuinely hard, because the language keeps instance
members and static members on two inheritance chains that never
touch. Per-receiver caching forks a registry under subclassing
(subclass reads it, gets a fresh empty Map, nothing throws). Eager
static fields race module loading. The constraint: a shared store is
one `static readonly` field holding a lazy cell — the field is inert
at load, the value constructs on first read after all cycles resolve,
and the memo lives INSIDE the cell, so every access path (subclass
receivers included) converges on one singleton. The whole mechanism
is ~40 lines.

**What falls out**

Hold those constraints and you don't design features — they fall out.
Two transforms cover everything: `Reactive()` for instance classes,
`Static()` for capability classes (function bags for git, parsers,
clocks — never constructed, only called and swapped). I didn't plan
the second one; solving the first forced it into existence.

And here is the part that made me trust the method: every solved
problem made the library SMALLER or faster, never bigger. The core is
1.1 kB gzipped, zero dependencies, after all of it. Invariants delete
code; features accumulate it.

The capability you get back — the one closures structurally cannot
offer — is that your application becomes a live, inspectable **object
graph**: entities holding entities, stores referencing stores,
subclasses specializing nodes. Closures compose into opaque scopes; a
constrained class graph can be walked, by a human or by an AI agent.
A 94,000-line terminal IDE has been built on exactly that, by agents
following the same one-document standard human contributors use.

**Receipts** (every claim has a measured write-up):

- The full memoization map, every value kind in code:
  https://ivue.dev/blog/bulletproof-class-modules
- `this.method`, finally safe to pass:
  https://ivue.dev/blog/this-method-era
- Circular imports, dissolved:
  https://ivue.dev/blog/circular-imports-dissolved
- The overview: https://ivue.dev/blog/introducing-ivue

Numbers: creating 100k instances measures 55-253x faster than
reactive wrappers or factory functions (methodology in the docs); a
20,000,000-cell spreadsheet demo holds 4.7 bytes per cell; 100% test
coverage.

Reactivity substrate is Vue 3's signals under the hood (refs and
watchers work natively inside constructors), but the constraint set
is a JavaScript claim, not a framework one — the same classes run a
backend Worker and a terminal app with no DOM in sight.

Where it loses, since a fair post names its costs: collection items
keep an explicit `.value` on their refs, and a lazily-bound method
call measures ~4ns vs ~1.4ns for a raw closure — hoist it in a hot
loop and the difference vanishes. The docs benchmark the misses too.

If watching this reduction unfold interests you regardless of whether
you'd ever use it, the blog is the running record — measured numbers
only: https://ivue.dev/blog/
