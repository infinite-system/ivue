---
title: 'Pause the watchers, keep the state'
description: "An object's lifecycle has a third state between alive and reset: suspended — side effects silent, data intact. ivue 2.4 adds it as one option on the existing verb, and the resume half costs no API at all."
tags: [engine, patterns]
relatedPosts: [disposal-is-a-reset, reactivity-is-an-allocator, twenty-million-cells, the-thinnest-possible-layer]
date: 2026-08
---

# Pause the watchers, keep the state

![Pause the watchers, keep the state](/blog/pause-watchers-keep-the-state.png)

<BlogPostDate />

[Disposal is a reset](/blog/disposal-is-a-reset) told the story of
`$stopEffects()`: one verb that stops an instance's watchers, frees
its cells, and leaves the object in its pre-touch state, ready to
live again. Full death, cleanly conjugated.

But writing it down exposed a bundling. The verb performs two acts —
**silencing** (stop the effects) and **forgetting** (clear the state)
— and nothing says they must travel together. Sometimes the right
death is smaller: an entity leaves the visible world but keeps its
data; a feed pauses its rendering while its buffer stays warm; a
model is archived mid-thought and must wake up exactly where it
stopped. Silence, without forgetting.

ivue 2.4.0 unbundles them, as one option on the verb that already
existed:

```ts
session.$stopEffects();                 // stop + forget (unchanged)
session.$stopEffects({ reset: false }); // stop the watchers ONLY
```

With `{ reset: false }` every watcher dies at once — same scope, same
precision — but no cache is touched. Cell identity persists, current
values persist, and surviving computeds keep evaluating.

## The part that had to be checked

That last claim was the design's one real hazard. Cells materialize
in whatever effect scope is active at first touch — so a `computed()`
first read inside the instance's own `$watchEffect` is *born inside
the scope being stopped*. If stopped scopes dragged their computeds
into permanent staleness, keep-state mode would be a silent-corruption
factory.

Measured instead of assumed: on Vue 3.5.41 **and** on 3.6.0-rc.5 —
the alien-signals rewrite, where exactly this machinery changed — a
computed born in a stopped scope keeps evaluating correctly on read,
and a *new* watcher in a fresh scope tracks it and fires. Pull-based
derivations outlive their birth scope. The option is safe on both
engines, verified before it shipped.

## Resume costs no API

The resume half of the lifecycle needed no engine surface at all —
only a convention the
[standard](/guide/standard) now teaches: watchers live behind a
`startWatchers()` method, and the constructor calls it once.

```ts
class $Feed {
  constructor() {
    this.startWatchers();
  }

  startWatchers() {
    this.$watchEffect(() => this.render());
  }

  suspend() {
    this.$stopEffects({ reset: false }); // watchers die, state stays
  }

  resume() {
    this.startWatchers(); // fresh scope, same cells
  }

  render() {
    /* ... */
  }
}
```

`resume()` is just `startWatchers()` again — the same method the
constructor already used, now running in a fresh lazy scope over the
same cells. One option flag plus one convention, and the whole
suspend/resume lifecycle exists. Nothing was designed for it; it fell
out of pieces that already had one job each.

## Three states, one verb

The lifecycle now reads as three states with honest names:

| state | watchers | cells | how you get there |
| --- | --- | --- | --- |
| **alive** | live | live | `new`, or any touch |
| **suspended** | dead | intact, current values | `$stopEffects({ reset: false })` |
| **reset** | dead | cleared — next touch re-initializes | `$stopEffects()` |

Suspended is the state for windowing *side effects* over retained
data — the complement of what
[the flyweight grid](/blog/twenty-million-cells) does with memory.
There, reactive cells exist only for observed rows; here, watchers
exist only for *active* entities, while their state stays resident.
Both are the same invariant pointed at different resources:
everything costs proportional to what's engaged, nothing costs
proportional to what exists.

The price of the whole feature: one options parameter, two new specs
(198 total, coverage still 100%), and **13 bytes** of gzipped engine.
The core stands at 1,125 bytes. Silence, forgetting, and the space
between them — still [one kilobyte](/blog/one-kilobyte-feature).
