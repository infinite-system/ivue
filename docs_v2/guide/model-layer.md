---
title: The Reactive Model Layer
description: "Vue has state solutions at two scales — component-scoped composables and singleton stores. ivue adds the missing third: a domain model of thousands of live entities inside Vue reactivity, at plain-object prices."
---

# The Reactive Model Layer

Vue's ecosystem answers "where does state live?" at exactly two scales:

| scale | tool | shape |
| --- | --- | --- |
| component-scoped | composables | a bag of refs per component instance |
| app-wide singletons | Pinia stores | one reactive object per concern |
| **many live entities** | **—** | *(the gap)* |

Nothing serves the third scale: **a domain model** — ten thousand rows,
a hundred thousand spreadsheet cells, every node in an editor graph — where
each entity should be individually reactive: watchable, derivable,
inheritable. This page is about why that gap exists, and why ivue happens
to close it.

## Why the gap is structural

It isn't a missing library; it's an allocation policy. A composable is a
closure — every `ref()` and `computed()` inside it **must** allocate at
call time, per instance. Measured (Vue 3.5, an entity shape of 10 refs +
60 derived values):

| model built from | heap per entity | 100k entities |
| --- | --- | --- |
| composables, eager `computed()` | 31.1 KB | **~3 GB** |
| composables, plain closures | 12.8 KB | ~1.3 GB |
| **ivue class** | **1.7 KB touched / ~0.15 KB untouched** | **~15–20 MB** |

At entity counts, eager allocation is not slow — it is *excluded*. Which
is why every serious big-model Vue app makes the same move: **exile the
model from reactivity.** Plain POJOs, hand-rolled dirty tracking, a
custom recompute engine — and Vue demoted to a paint layer over it. (This
is how production web spreadsheets are actually built.)

Virtualization does not rescue the composable model: it caps *mounted
components*, but a model outlives the viewport — formulas reference
off-screen entities, sorting touches every row, an edited entity's state
must survive scrolling away. The model exists at full size no matter what
the DOM does. So the fork, before ivue, was:

1. **Reactive model** → gigabytes at entity scale.
2. **Plain-data model** → tractable memory, but Vue reactivity is *gone*
   from the model. No `watch` on an entity. No derived values. You write
   your own dependency engine.

## The third option

An ivue class is the missing shape: **every entity fully inside Vue
reactivity, at plain-object cost.** The engine's laziness is what makes it
possible — a member costs nothing until first read, so the untouched
majority of a huge model is carried as nearly-inert plain objects, while
the entities you actually look at materialize exactly the Refs they use.

```ts
// cell.ts — one spreadsheet cell, one of 100,000
import { computed, ref } from 'vue'
import { Reactive } from 'ivue'

class $Cell {
  constructor(public sheet: Sheet.Instance, public key: string) {}

  get raw() { return ref('') }            // what the user typed
  get editing() { return ref(false) }

  // hot path, real dependency graph -> promoted to computed():
  // memoized, watchable, and equality-stops propagation
  get value() {
    return computed(() => evaluate(this.raw.value, this.sheet))
  }

  // everything else: plain getters — zero bytes per cell, re-derived
  // on read, reactive through leaf tracking
  get display() { return format(this.value.value) }
  get isFormula() { return this.raw.value.startsWith('=') }
  get cssClass() { return this.isFormula ? 'cell--formula' : 'cell--plain' }
}

export namespace Cell {
  export const $Class = $Cell
  export const Class = Reactive($Cell)
  export type Instance = typeof Class.Instance
}
```

Creating 100,000 of these is a few milliseconds of plain `new` calls. A
cell nobody scrolls to never allocates a single Ref. And yet the whole
model is live:

```ts
// anywhere — a cell is watchable like any Vue source,
// including its PLAIN getters (leaf tracking, no wrapper needed):
watch(() => grid.cell('B7').display, syncToServer)

// the formula engine subscribes to exactly the cells a formula reads,
// because computed() collects real dependencies:
grid.cell('C1').raw.value = '=SUM(A1:A99999)'
```

The per-member policy is the part no other pattern offers: `value` pays
~500 bytes for memoization because formula graphs are genuinely hot;
`display` and `cssClass` pay nothing because they are nanosecond string
work. **You choose the price per member, per class — not per app.**

## What a model layer requires — and where it comes from

None of this was bolted on for models; each requirement is an engine
invariant doing double duty:

| a model layer needs | the invariant that provides it |
| --- | --- |
| thousands of cheap instances | lazy materialization — construction is plain `new` |
| entity hierarchies across files | prototype-level idempotent `Reactive()`, `super` fidelity |
| entities referencing each other | namespace exports — circular imports resolve at first access |
| watch any entity, any derived value | leaf tracking — plain getters are valid `watch` sources |
| stable handles for hot paths | per-member `computed()` promotion |
| deterministic disposal | `$stopEffects` + the lazy per-instance scope |
| survives every proxy boundary | raw anchoring + the `Instance` typing law |

## Boundaries — where this claim does *not* apply

- **Singletons don't care.** One settings store with sixty computeds is
  31 KB, total. Keep using Pinia for app-wide concerns; the model layer is
  for *populations* of entities.
- **Data is not reduced.** The strings, numbers and ASTs your entities hold
  cost the same everywhere — the ~50× is the *reactivity graph share*.
- **Promote sparingly.** Turn every plain getter into `computed()` and you
  have rebuilt the eager model, byte for byte. The win is the default,
  not the engine alone.

## The claim, precisely

> **ivue makes the model layer a first-class citizen of Vue reactivity —
> 100,000 live entities for the price of plain objects.**

It is the only arrangement where the *whole* model stays inside Vue's
reactivity at plain-data prices: reactive-model Vue pays gigabytes,
plain-model Vue pays with hand-rolled dirty tracking, ivue pays neither.
The [performance page](/guide/performance) has the measured receipts; the
[Components & Templates](/guide/components) page has the wiring; the rest
of this guide has the discipline that keeps the price low.
