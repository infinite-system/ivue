---
title: The Reactive Model Layer
description: 'Vue has state solutions at two scales — component-scoped composables and singleton stores. ivue adds the missing third: a domain model of thousands of live entities inside Vue reactivity, at plain-object prices.'
---

# The Reactive Model Layer

Vue's ecosystem answers "where does state live?" at exactly two scales:

| scale                  | tool         | shape                                |
| ---------------------- | ------------ | ------------------------------------ |
| component-scoped       | composables  | a bag of refs per component instance |
| app-wide singletons    | Pinia stores | one reactive object per concern      |
| **many live entities** | **—**        | _(the gap)_                          |

Nothing serves the third scale: **a domain model** — ten thousand rows,
a hundred thousand spreadsheet cells, every node in an editor graph — where
each entity should be individually reactive: watchable, derivable,
inheritable. This page is about why that gap exists, and why ivue happens
to close it.

## Why the gap is structural

It isn't a missing library; it's an allocation policy. A composable is a
closure — every `ref()` and `computed()` inside it **must** allocate at
call time, per instance. Measured end-to-end on a virtualized grid
(composable-per-cell vs. an ivue class vs. a non-reactive POJO control;
full protocol and machine notes in `demo/grid/RESULTS.md`):

| model built from                  | 100k cells | 1M cells    | marginal cost   |
| --------------------------------- | ---------- | ----------- | --------------- |
| composable, eager `computed()`    | 77.3 MB    | 757.7 MB    | 756 B/cell      |
| **ivue class**                    | **5.7 MB** | **41.7 MB** | **40.0 B/cell** |
| plain POJO (non-reactive control) | 4.5 MB     | 40.5 MB     | 40.0 B/cell     |

This is a lean cell (one input Ref, a handful of derived values, one hot
formula promoted to `computed()`) — real spreadsheet cells tend to carry
more derived state, which widens the gap further. Even at this modest
shape, the composable model is already most of a gigabyte at 1M rows: not
technically impossible to allocate, but expensive enough — in heap,
in GC pauses, in the stampede every sort/filter/paste re-triggers — that
it dictates the rest of the architecture. Which is why every serious
big-model Vue app makes the same move: **exile the model from
reactivity.** Plain POJOs, hand-rolled dirty tracking, a custom recompute
engine — and Vue demoted to a paint layer over it. (This is how
production web spreadsheets are actually built.)

Virtualization does not rescue the composable model: it caps _mounted
components_, but a model outlives the viewport — formulas reference
off-screen entities, sorting touches every row, an edited entity's state
must survive scrolling away. The model exists at full size no matter what
the DOM does. So the fork, before ivue, was:

1. **Reactive model** → gigabytes at entity scale.
2. **Plain-data model** → tractable memory, but Vue reactivity is _gone_
   from the model. No `watch` on an entity. No derived values. You write
   your own dependency engine.

## The natural rebuttal: just lazy-load the composable cells

A fair objection to the fork above: option 1 doesn't have to be _eager_.
Keep a plain-data backing store (the arm-C floor below), materialize
composable cells only around the viewport, and evict them as they scroll
away. Memory solved — reactivity kept. Right?

Try to build it, and you're reinventing ivue's laziness by hand, at much
higher cost:

- **A synchronization protocol.** Every materialize is a copy-in from the
  backing store; every evict is a copy-out. You now own a coherence
  contract — never lose a write in the gap between them. This is a
  database buffer pool, hand-built inside a view-model.
- **An identity crisis.** A `watch()` attached to an evicted cell's ref
  dies silently. The cell that scrolls back into view is a _different
  object_ — every watcher, every equality check, every selection
  reference across an eviction boundary quietly breaks.
- **The formula hole.** `SUM(A1:A25000)` touches 25,000 cells regardless
  of the viewport. Either the formula forces mass materialization (the
  memory spike returns, now with churn on every recalc), or it reads the
  backing store directly — at which point recalc isn't reactive anymore
  and you're back to hand-rolled dirty tracking. The model exits Vue
  through the side door you just built.

Every one of these mechanisms is real engineering — it's what production
web spreadsheets actually do. And every line of it exists _solely_ to work
around eager allocation cost.

An ivue instance is that lazy overlay, built into the object itself, for
free. An untouched member costs nothing to begin with, so there is no
second representation to synchronize, no eviction to schedule, no watcher
that dies at a boundary — the instance a watcher attaches to is the
instance forever. And a whole-column formula just reads `.value` through
a million cells, live, because the cells are already there, resting at
the floor. Measured end-to-end on a 1,000,000-cell virtualized grid (composable vs.
ivue vs. a non-reactive POJO control; full protocol, machine notes, and
raw numbers in `demo/grid/RESULTS.md` in this repository):

|                                   | marginal heap per added cell | at 1M cells |
| --------------------------------- | ---------------------------- | ----------- |
| composable, eager                 | 756 B/cell                   | 757.7 MB    |
| **ivue**                          | **40.0 B/cell**              | **41.7 MB** |
| plain POJO (non-reactive control) | 40.0 B/cell                  | 40.5 MB     |

**ivue's marginal cost matches the non-reactive POJO to the byte.** An
unrendered ivue cell is, for memory purposes, indistinguishable from a
plain object that was never going to be reactive at all — except it is.
That is what "no eviction policy required" means in a number: there is
nothing worth reclaiming.

The one place this doesn't fully dissolve: at some scale the _data_
itself — not the reactivity graph — outgrows a single tab, and needs
server-backed windowing. That is true identically in every architecture.
ivue's contribution is that the reactive layer is never the reason you get
there — at 40 bytes marginal, reactivity rides along at the floor no
matter how far the data scales.

## The third option

An ivue class is the missing shape: **every entity fully inside Vue
reactivity, at plain-object cost.** The engine's laziness is what makes it
possible — a member costs nothing until first read, so the untouched
majority of a huge model is carried as nearly-inert plain objects, while
the entities you actually look at materialize exactly the Refs they use.

```ts
// cell.ts — one spreadsheet cell, one of 100,000
import { computed, ref } from 'vue';
import { Reactive } from 'ivue';

class $Cell {
  constructor(
    public sheet: Sheet.Instance,
    public key: string,
  ) {}

  get raw() {
    return ref('');
  } // what the user typed
  get editing() {
    return ref(false);
  }

  // hot path, real dependency graph -> promoted to computed():
  // memoized, watchable, and equality-stops propagation
  get value() {
    return computed(() => evaluate(this.raw.value, this.sheet));
  }

  // everything else: plain getters — zero bytes per cell, re-derived
  // on read, reactive through leaf tracking
  get display() {
    return format(this.value.value);
  }
  get isFormula() {
    return this.raw.value.startsWith('=');
  }
  get cssClass() {
    return this.isFormula ? 'cell--formula' : 'cell--plain';
  }
}

export namespace Cell {
  export const $Class = $Cell;
  export const Class = Reactive($Cell);
  export type Instance = typeof Class.Instance;
}
```

Creating 100,000 of these is a few milliseconds of plain `new` calls. A
cell nobody scrolls to never allocates a single Ref. And yet the whole
model is live:

```ts
// anywhere — a cell is watchable like any Vue source,
// including its PLAIN getters (leaf tracking, no wrapper needed):
watch(() => grid.cell('B7').display, syncToServer);

// the formula engine subscribes to exactly the cells a formula reads,
// because computed() collects real dependencies:
grid.cell('C1').raw.value = '=SUM(A1:A99999)';
```

The per-member policy is the part no other pattern offers: `value` pays
~500 bytes for memoization because formula graphs are genuinely hot;
`display` and `cssClass` pay nothing because they are nanosecond string
work. **You choose the price per member, per class — not per app.**

## Isn't this just what Angular Signals already do?

Angular is the framework most associated with class-oriented, fine-grained
reactivity, so it's a fair question. Measured directly — same machine,
identical cell shape (one raw value, four derived values chained off it,
one memoized, never read; full protocol, machine notes, and a reproducible
script in `bench/angular-comparison/RESULTS.md` in this repository):

|                                            | bytes/cell | creation, 100k cells |
| ------------------------------------------ | ---------: | -------------------: |
| Angular, 4 eager `computed()` fields       |      2,152 |             73–79 ms |
| **ivue**, 1 `computed()` + 3 plain getters |     **24** |       **1.1–1.4 ms** |
| plain POJO (fields actually assigned)      |         64 |           1.8–2.1 ms |

**~90× less memory, ~55–70× faster creation.** Two things explain it.
First, Angular's idiomatic pattern is the same one Vue composables use:
`signal()`/`computed()` declared as **class fields** allocate at
construction, per instance, whether the field is ever read or not —
Signals changed how dependencies are _tracked_, not _when_ they're
_allocated_. Second, the sharper number: an untouched ivue instance has
**zero own properties** — nothing assigned, anywhere — so it comes in
under even a plain object that dutifully stores its field values. There is
nothing worth reclaiming, because nothing was ever allocated.

Fields have a second cost, past memory: **they don't survive
inheritance.**

```ts
class Base {
  a = signal(1);
  total = computed(() => this.a() + 10);
}
class Sub extends Base {
  b = signal(2);
  total = computed(() => this.b() + 100); // looks like an override — isn't
}

new Sub().total(); // 102 — Base's contribution is gone, silently
```

A class field is an own-property assigned in the constructor, never a
prototype member — `Sub.prototype` never held `total`; neither did
`Base.prototype`. There is no `super.total` to call, so the second
declaration doesn't override the first, it just clobbers it on the
instance. This isn't an Angular bug — it's what happens to _any_ reactive
primitive declared as a field rather than a getter, in any framework. ivue
getters are real prototype members, so `super.x.value` composes across as
many subclass levels as the model needs (invariant A7, "Inheritance &
`super` fidelity," in `lib/Reactive.invariants.md`) — the getter placement
is the whole difference.

One more shape of the same idea: Angular's dependency injection has a
real, documented escape hatch for circular references between injectables
— `forwardRef(() => Service)` — because its DI graph resolves eagerly
enough that a cycle can crash without it. ivue never needed an equivalent.
Not because cycles are resolved more cleverly, but because the namespace
pattern ([Modules & Imports](/guide/modules)) makes the failure mode
unreachable in the first place — a hoisted `var` binding exists before any
cross-module reference is ever dereferenced. A tool that defuses a bomb is
not the same as a room the bomb can't be planted in.

This is a narrow claim, held to the same discipline as the rest of this
page: Angular Signals are a genuine, recent, directionally-correct move
toward fine-grained reactivity — evidence the industry is converging on
this idea, not evidence against it. The comparison above is scoped to the
reactive primitive's allocation policy and inheritance composability, not
a verdict on Angular the framework, which brings routing, forms, and a
decade of production hardening ivue does not have.

## What a model layer requires — and where it comes from

None of this was bolted on for models; each requirement is an engine
invariant doing double duty:

| a model layer needs                 | the invariant that provides it                               |
| ----------------------------------- | ------------------------------------------------------------ |
| thousands of cheap instances        | lazy materialization — construction is plain `new`           |
| entity hierarchies across files     | prototype-level idempotent `Reactive()`, `super` fidelity    |
| entities referencing each other     | namespace exports — circular imports resolve at first access |
| watch any entity, any derived value | leaf tracking — plain getters are valid `watch` sources      |
| stable handles for hot paths        | per-member `computed()` promotion                            |
| deterministic disposal              | `$stopEffects` + the lazy per-instance scope                 |
| survives every proxy boundary       | raw anchoring + the `Instance` typing law                    |

## Boundaries — where this claim does _not_ apply

- **Singletons don't care.** One settings store with sixty computeds is
  31 KB, total. Keep using Pinia for app-wide concerns; the model layer is
  for _populations_ of entities.
- **Data is not reduced.** The strings, numbers and ASTs your entities hold
  cost the same everywhere — the measured 13–18× (19× marginal, per cell)
  is the _reactivity graph share_, on top of identical data.
- **Promote sparingly.** Turn every plain getter into `computed()` and you
  have rebuilt the eager model, byte for byte. The win is the default,
  not the engine alone.

## The claim, precisely

> **ivue makes the model layer a first-class citizen of Vue reactivity —
> 100,000 live entities for the price of plain objects.**

It is the only arrangement where the _whole_ model stays inside Vue's
reactivity at plain-data prices: reactive-model Vue pays gigabytes,
plain-model Vue pays with hand-rolled dirty tracking, ivue pays neither.
The [performance page](/guide/performance) has the measured receipts; the
[Components & Templates](/guide/components) page has the wiring; the rest
of this guide has the discipline that keeps the price low.
