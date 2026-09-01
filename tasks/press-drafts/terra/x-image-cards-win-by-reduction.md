---
venue: X
purpose: card-text
lang: en
source: win-by-reduction
status: draft-for-review
---

## Card 1 — Make fewer problems exist

ivue, a **1.1 kB class layer over Vue's reactivity**, starts with a question: does this cost need to exist?

An unread state member should not allocate.
A cheap derivation should not own a cache.
A module reference should not run while modules load.

Delete the condition, then measure what remains.

## Card 2 — State can arrive on first use

State lives behind a getter that returns a Vue ref.

The cell appears when code first reads it.
Never read it: it never exists.

The object knows its possible state without paying for every possibility at construction.

## Card 3 — A derivation is a question

A plain getter reads reactive leaves.
Vue tracks those reads.

So a cheap answer needs no `computed()` box.

Cache only when repeat work earns it. Invalidation is work too.

## Card 4 — Construction is the test

Reduction finds the smaller shape.
Construction makes the boundary real.

An unread lazy member cannot allocate.
A plain getter cannot secretly own a cache node.
A late reference cannot fail merely because another module loaded later.

Make the failure unavailable.

Read the methods and limits: https://ivue.dev/blog/win-by-reduction
