---
title: "Release what the GC can't"
description: "The garbage collector's contract ends at reachability: one retained reference — an event bus, a stray closure, devtools — and your unmounted component's 85 MB stays forever. We measured what happens when the model can empty itself instead: 4.7 MB. The leak keeps the husk. It doesn't keep the memory."
tags: [memory, patterns]
relatedPosts: [total-memory-control, disposal-is-a-reset, derivations-are-free, pause-watchers-keep-the-state, twenty-million-cells]
date: 2026-08
---

# Release what the GC can't

![Release what the GC can't](/blog/release-what-the-gc-cant.png)

<BlogPostDate />

The garbage collector's contract is exactly one sentence: *what
nothing can reach, I will collect.* Everyone reads it as a promise.
It's worth reading it as a limit — because the sentence says nothing
about what happens when something **can** still reach your object.

And something usually can. An event-bus subscription nobody
unregistered. A closure captured by a debounced handler that hasn't
fired yet. A devtools panel holding component references. A parent
that kept the child's exposed instance past unmount. None of these
are exotic; every one of them is a Tuesday. The moment one exists,
the GC's contract is void for that object — and for everything the
object holds.

The question is what "everything the object holds" amounts to. So we
measured it.

## The measurement

Ten thousand real components — full templates, mounted with
`createApp`, torn down by Vue's own `app.unmount()` — each holding an
8 KB list behind a `shallowRef` plus a derivation subscribed to a
shared store ref. About 76 MB of payload across the app. Two shapes:
the conventional composable, and an ivue class whose constructor adds
one line of defense:

```ts
constructor() {
  onUnmounted(() => this.$stopEffects());
}
```

Then the axis that decides everything: does anything retain the model
objects after unmount? Production build, Node 26, heap measured after
forced GC; Vue 3.5.41 and 3.6.0-rc.5 agree within noise. The script
is `bench/disposal-vs-vue-components.mjs` in the repo.

| residual heap after unmount | composable, default unmount | ivue + `$stopEffects()` |
| --- | --- | --- |
| nothing retains the models | 1.4 MB | 0.1 MB |
| one reference retains them | **85.1 MB** | **4.7 MB** |

Read the first row first, because it clears Vue completely: **when
nothing leaks, Vue's default unmount is total.** The component scope
stops the watchers, the render effect dies, the instance becomes
unreachable, and 76 MB of payload comes back on the next collection.
No ritual is required. If someone tells you every component needs a
manual teardown call, this row is the refutation.

The second row is the one the GC's contract can't help you with. One
retained reference per model — the event bus, the closure, the
panel — and the composable shape keeps **85 MB, permanently**. Not
until the next store update: we wrote to the shared ref after unmount
and nothing was released. Not until some cleanup pass: there is none.
Until the retaining reference itself is found and dropped — which is
the one thing a leak, by definition, doesn't do.

The ivue shape, identically retained and identically leaked, keeps
4.7 MB. **Eighteen times less.** The leak is still there. It just
isn't holding anything anymore.

## Why Vue can't release it

This is not a bug in Vue, and `onScopeDispose` can't fix it. It's
[the fusion of name and storage](/blog/total-memory-control) doing
exactly what it always does.

A composable's state lives in closure variables: `const list =
shallowRef(bigData)`. The closure holds the ref; the ref holds the
data; the retained object holds the closure. Vue's teardown —
component unmount, `effectScope().stop()` — ends *subscriptions*:
watchers stop firing, effects unlink. But no API exists that can
reach into a closure and clear its captures, because closures are
opaque by design. The same privacy that protects the state makes it
unreleasable. Vue can stop your object from *reacting*. It cannot
make your object *let go*.

An ivue instance's state lives behind [ref-getters](/guide/standard)
— cells the engine created, cached, and **registered**. The engine
holds the ledger of every cell it materialized, so
`$stopEffects()` can do what no closure allows: walk the ledger, stop
the watchers, and delete the cells themselves. The instance survives
— methods intact, getters intact — but it holds nothing. Touch it
again and [state re-materializes from the
initializers](/blog/disposal-is-a-reset). The retained object is a
husk with a blueprint, not a warehouse.

## The leak charges rent

The 85 MB isn't even the whole bill. A live object graph isn't just
resident — it's *traced*. Every major collection walks everything
reachable, and 85 MB of leaked models is 85 MB of graph to walk,
every time, for the life of the page.

We timed the GC passes. With the composable's leak in place,
collections ran 16–23 ms; with the ivue husks, 7–12 ms —
**collections themselves ran two to three times faster**, because
clearing the cells shrinks the live graph the collector has to trace.
A leak isn't a one-time loss of memory. It's rent, paid on every
collection, forever. Defensive disposal cancels the lease even when
it can't evict the tenant.

And the cost of the defense: `$stopEffects()` measured at about
**1.2 µs per instance** — 12 ms across all ten thousand unmounts.

## The pattern — and its boundary

The pattern is one line in the constructor of a **heavy,
component-owned** model:

```ts
import { Reactive } from 'ivue';
import { ref, shallowRef, onUnmounted } from 'vue';

class $MediaLibrary {
  // A model worth defending: real payload behind the cells.
  get assets() {
    return shallowRef<Asset[]>([]);
  }
  get selectedId() {
    return ref<string | null>(null);
  }

  constructor() {
    // Defensive disposal: when the view dies, empty the cells —
    // whatever else might still be holding the instance.
    onUnmounted(() => this.$stopEffects());
  }
}

export namespace MediaLibrary {
  export const $Class = $MediaLibrary; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  // the type of every unwrapping surface (defineExpose, reactive())
  export type Instance = typeof Class.Instance;
}
```

Now the boundary, stated once and precisely, because a defense
applied in the wrong place is just a different bug:

- **This is not a mandate.** The unretained row of the table is the
  proof: for a well-formed component, Vue's unmount already reclaims
  everything, and the line is a no-op. Adding it everywhere trains
  people to believe it's load-bearing when it's a seatbelt. Reserve
  it for models with real payload — the ones where a leak would cost
  megabytes, not bytes.
- **Only for component-owned instances.** If the instance
  deliberately outlives the view — exposed to a parent that keeps it,
  stored in a collection, handed to a singleton — this line would
  wipe live state on unmount. Those instances follow the ownership
  rule instead: the owner of the lifetime calls `dispose()` when the
  lifetime actually ends.
- **Measure teardown with the production build.** In development,
  Vue's devtools replay buffer briefly pins every unmounted component
  (it drains after a few seconds). Our first run "found" a 166 MB
  leak that was entirely this artifact. Heap claims about teardown
  made against the dev build are claims about the buffer.

## The contract you actually get

The GC decides *when* memory comes back, and only for objects nothing
holds. Disposal as an API — on the live object, cells cleared by the
engine that created them — adds the clause the collector never
offered:

> Reachability is no longer the last word. A leaked model keeps its
> name, its methods, its blueprint — and loses its warehouse. The
> leak keeps the husk. It doesn't keep the memory.

Measured on Node 26, Vue 3.5.41 and 3.6.0-rc.5, production build,
10,000 mounted components torn down by `app.unmount()` — the script
is `bench/disposal-vs-vue-components.mjs` in
[the repo](https://github.com/infinite-system/ivue).
