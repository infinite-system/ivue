---
title: 'r/vuejs launch post'
description: 'The r/vuejs self-post: the Options API angle for the Vue crowd.'
channel: reddit
date: 2026-08
---

# r/vuejs launch post

**Title:**

> The Options API everyone actually wanted: after three years of reduction, plain TypeScript classes with full Vue reactivity — 1.1 kB, zero deps

**Body:**

What we loved about the Options API was never the buckets — it was
that a component had ANATOMY. You could open a stranger's file and
know where state, derivations, and actions lived. What killed it was
that the anatomy was fake: a plain-object DSL pretending to be a
class, with proxy `this`, mixin collisions, and options TypeScript
fought for years. The Composition API fixed the machinery and gave up
the anatomy — and setup-soup is the scar tissue.

The anatomy was in the language the whole time. It's the class:

```ts
class $Cart {
  get items() { return shallowRef<CartItem[]>([]) }   // state
  get subtotal() {                                    // derived — plain getter,
    return this.items.value.reduce(sum, 0)            // ZERO bytes per instance
  }
  addItem(item: CartItem) {                           // action — lazy-bound,
    this.items.value = [...this.items.value, item]    // stable identity
  }
}
export const Cart = Reactive($Cart)
```

`this` is just `this`. `extends`/`super` work on derivations (the
Options API never delivered that). Instances are plain objects —
creation measures 55–253× faster than `reactive(new X())` or
composable factories. And it's built ON the Composition API: `ref`,
`watch`, lifecycle hooks, any composable — all work inside the
constructor. And where composables compose into opaque closure
scopes, constrained classes compose into a live OBJECT GRAPH — your
whole app becomes an inspectable structure of entities holding
entities, which is exactly what large codebases (and AI agents) need
to navigate.

And the classic class-era wounds are closed structurally, each with
its own measured write-up:

- **`this.method` safe to pass** — lazy-bound once, stable identity;
  no `.bind()`, no arrow wrappers, handlers unsubscribe cleanly
- **Circular imports dissolved** — cross-module references resolve at
  first access, after every module has loaded; any import order works
- **Initialization order solved** — constructors run in setup context;
  no `init()` rituals, no undefined-dependency races
- **Shared stores that can't fork or race** — the piece that turns the
  above into bulletproof modules

All of it landed without the library growing or slowing: the core is
still 1.1 kB and creation got FASTER as problems were solved — the
tell of deriving solutions from invariants instead of inventing
features. Invariants delete code; features accumulate it.

Overview with all the receipts: https://ivue.dev/blog/introducing-ivue

The deeper story is that solving classes properly for instances forced
a second transform for static/capability classes, and last week the
final piece landed — the full write-up walks every value kind in code:

- https://ivue.dev/blog/the-options-api-everyone-wanted
- https://ivue.dev/blog/bulletproof-class-modules

1.1 kB gzipped, zero dependencies, 100% coverage, and the whole
operating manual ships as one document that works for humans and AI
agents alike (a 94k-line terminal IDE was built on it by agents).

If the frontier interests you regardless of whether you'd use ivue,
the blog is the running record — every claim measured, misses
included. There's a one-line signup on https://ivue.dev/blog/.
