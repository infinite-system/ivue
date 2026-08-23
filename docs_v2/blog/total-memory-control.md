---
title: 'Total memory control'
description: "In Vue, a ref exists the moment its line runs — name and storage are the same thing. Put the ref behind a getter and they separate: existence itself becomes a managed resource. One indirection, and memory has an API."
tags: [memory, philosophy]
relatedPosts: [twenty-million-cells, derivations-are-free, pause-watchers-keep-the-state, disposal-is-a-reset, one-kilobyte-feature, the-thinnest-possible-layer]
date: 2026-08
---

# Total memory control

![Total memory control](/blog/total-memory-control.png)

<BlogPostDate />

Look at these two lines long enough and a whole memory model falls
out of the difference:

```ts
const count = ref(0);      // Vue: the ref exists NOW

get count() {              // ivue: the ref exists WHEN ASKED
  return ref(0);
}
```

They look like a style choice. They are different physics.

## Name and storage, fused

In the first line, the name *is* the storage. The moment `setup()` or
a composable runs, the cell exists — it must, because the binding and
the ref are the same thing. And from that fusion, three consequences
follow that no discipline can undo:

- You cannot **defer** it. Fifty refs in a class of state means fifty
  allocations at construction, touched or not.
- You cannot **release** it. The closure holds it, the template holds
  it, and nothing can enumerate a closure's captures — the same
  privacy that protects the state makes its memory unreachable.
- You cannot **rebuild** it. There is no "again"; the line already
  ran.

Vue gives you full control over two things: **values** (what a ref
contains) and **subscriptions** (`effectScope` — what reacts to it).
The third axis — **existence**, whether the cell is there at all — is
simply not on the console. It was decided the moment the code ran.

## One indirection

Put the ref behind a getter and the name detaches from the storage.
The *name* is a prototype getter — permanent, shared by every
instance, zero bytes each. The *cell* is an own-property behind it,
created on first read, cached by the engine under a key it
registered. `session.user` is always a valid sentence; whether a ref
currently backs it is a separate, managed fact.

That one move puts the third axis on the console. Existence now has
states, and an owner controls the transitions:

| the cell is… | how it got there |
| --- | --- |
| **absent** | constructed but never touched — costs nothing |
| **present** | first read materialized it |
| **silenced but intact** | `$stopEffects({ reset: false })` — watchers dead, value held |
| **released** | `$stopEffects()` — deleted, collectable |
| **rebuilt** | the next touch, per cell — only what's read returns |

The last row carries the finest grain: after a reset, touching three
members of a fifty-member class re-materializes exactly three cells.
Memory doesn't come back as a block. It comes back as observations.

## The advanced form: keyed flyweight reactivity

Per-member existence is the *entry* level. The same indirection goes
one grain finer when the getter's cell is not a single ref but a
**keyed store** — [keyed version signals](/guide/keyed-version-signals):
signals indexed by ids or coordinates that aren't known until
runtime. Now existence is controlled per *key*: reading cell
`(1_048_202, F)` materializes a signal for exactly that coordinate;
writing to an unobserved key costs nothing at all; and the overlay
evicts as observation moves away.

Take it all the way down and you get the
[flyweight pattern](/guide/flyweight): ground truth in columnar typed
arrays, disposable facades per render, and a sparse reactive overlay
that exists only where the viewport looks —
[20,000,000 live formula-capable cells in 89 MB](/blog/twenty-million-cells),
memory that never grows past what's on screen. One logical grid of
twenty million reactive values; a few hundred actual signals at any
moment. That is existence control at its natural limit: not "which
members have cells" but "which *observations* do."

## Paid once, collected four times

Here is the part I keep returning to: none of this was designed as a
memory feature. The getter indirection was the original lazy-creation
decision — and its consequences have been arriving in installments
ever since, each one looking like a separate capability:

- **Creation is nearly free** — cells don't exist yet, so
  [100,000 instances construct 55–253× faster](/guide/performance)
  than reactive wrappers. That was the first dividend.
- **Whole datasets fit in a browser** — the keyed flyweight form
  above, where [20,000,000 cells hold 4.7 bytes each](/blog/twenty-million-cells).
  Same indirection, second dividend.
- **Teardown is precise** — the engine registered every cache key it
  may install, so [disposal deletes exactly what it created](/blog/disposal-is-a-reset),
  at every level of the inheritance chain. Third.
- **Suspend/resume exists** — silencing and forgetting
  [separate into two acts](/blog/pause-watchers-keep-the-state) because
  storage was never welded to subscriptions. Fourth.

Four capabilities, one cause. That is what it means to find a real
invariant instead of adding a feature: you pay for the indirection
once, and it keeps handing you consequences years later — some of
which you only recognize when you write them down.

## The closure kept a secret

None of this is a defeat of Vue — every cell is Vue's own `ref()`,
every subscription Vue's own effect. The control comes entirely from
*placement*: own-properties are enumerable and deletable; closure
captures are not. The closure's great virtue — privacy — turns out to
have a price nobody itemized: it fuses a value's name, its storage,
and its lifetime into one indivisible thing. Fine at component scale,
where unmount collects everything. Decisive at domain scale, where
models outlive views and twenty million of anything must answer for
its bytes.

> The name is grammar; the cell is memory. Keep them separate, and
> memory costs what observation costs — nothing more, ever.

One getter. That was the whole trick, three years ago. It is still
paying.
