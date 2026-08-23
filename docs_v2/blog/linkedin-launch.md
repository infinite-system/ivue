---
title: 'LinkedIn launch post'
description: 'The LinkedIn launch post, personal voice — the discovery arc.'
private: true
channel: linkedin
date: 2026-08
---

# LinkedIn launch post

Ten years ago, every framework bet on classes. Five years ago, every
framework abandoned them. I spent the last three years convinced both
moves misread the evidence.

The bugs were real — `this` binding, mixin collisions, initialization
order, singletons forking under subclassing. But the diagnosis was
wrong. Classes weren't broken; they were UNCONSTRAINED — ten ways to
do everything, and unconstrained variation is a bug farm. Functions
won because they shipped with definitive constraints. Nobody had
found the equivalent constraints for classes.

So I went looking for them — not "what feature replaces classes?"
but "what is the invariant shape of a class in JavaScript?" Find the
true constraints and hold them, and everything unlocks at once: less
code, more capability.

What fell out surprised me more than anyone:

→ Reactive(): plain TypeScript classes with full Vue 3 reactivity.
State is a getter returning ref(). A derived value is a plain getter —
zero bytes per instance, and extends/super work on it. 1.1 kB gzipped,
zero dependencies.

→ Static(): the same constraints, applied to capability classes —
and it wasn't designed, it was DISCOVERED. Solving the instance side
forced its dual into existence.

→ Along the way, the classic wounds closed one by one, each
measured: this.method finally safe to pass, circular imports
dissolved, initialization order solved in userland. And every fix
made the library SMALLER or faster, never bigger — the tell of
deriving from invariants instead of inventing features. The core is
still 1.1 kB after all of it.

→ Last week, the final seam: shared stores that construct across
modules without racing imports or forking under subclassing. The
whole system is now memoizable at every scope — instance, receiver,
shared — with polymorphism, inheritance, and performance intact.

And the payoff functions can't structurally offer: the application
becomes a live object graph — entities holding entities, stores
referencing stores — inspectable end to end. Closures compose into
opaque scopes; constrained classes compose into a graph. That is what
composables lack, and what both humans and AI agents need to navigate
a large system.

The numbers are measured, not promised: creating 100,000 instances
runs 55–253× faster than the alternatives; a 20,000,000-cell
spreadsheet holds 4.7 bytes per cell; a 94,000-line terminal IDE was
built on it — by AI agents, following the same one-page standard
human contributors use.

The full story:

- Introducing ivue (start here) — https://ivue.dev/blog/introducing-ivue
- The Options API everyone actually wanted — https://ivue.dev/blog/the-options-api-everyone-wanted
- Bulletproof class modules — https://ivue.dev/blog/bulletproof-class-modules
- Reactive() and Static() — discovered, not invented — https://ivue.dev/blog/discovered-not-invented

More is coming — this is a reduction still in progress, and the blog
documents it as it happens: patterns, numbers, and the misses too.
Whether ivue becomes your tool or not, the frontier is worth watching:
https://ivue.dev/blog/ (one-line signup at the top).

\#JavaScript #TypeScript #VueJS #SoftwareArchitecture #OpenSource
