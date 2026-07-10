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
full protocol and machine notes in [`demo/grid/RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/demo/grid/RESULTS.md)):

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
the floor — proven by a working
[100k-cell spreadsheet with real Excel formulas](/guide/benchmarks#the-formula-grid-real-formulas-discovered-dependencies)
whose dependency graph Vue discovers on its own.
Measured end-to-end on a 1,000,000-cell virtualized grid (composable vs.
ivue vs. a non-reactive POJO control; full protocol, machine notes, and
raw numbers in [`demo/grid/RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/demo/grid/RESULTS.md)):

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
  export const Class = Reactive($Class);
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
script in
[`bench/model-layer-comparison/RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/bench/model-layer-comparison/RESULTS.md)):

|                                            | bytes/cell | creation, 100k cells |
| ------------------------------------------ | ---------: | -------------------: |
| Angular, 4 eager `computed()` fields       |      2,152 |             72–79 ms |
| **ivue**, 1 `computed()` + 3 plain getters |     **24** |       **1.0–1.1 ms** |
| plain POJO (fields actually assigned)      |         64 |           1.3–2.1 ms |

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
many subclass levels as the model needs ("Inheritance & `super` fidelity"
in [`lib/Reactive.invariants.md`](https://github.com/infinite-system/ivue/blob/main/lib/Reactive.invariants.md)) — the getter placement is the whole
difference.

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

## Or skip the library entirely — how close does hand-rolled JS get?

React has no equivalent to `attach a memoized value to an arbitrary
class` — no `ref()`/`signal()`/`computed()` to reach for outside a
component's own render cycle. So the honest "bare React, no library"
baseline isn't a framework at all: it's a hand-rolled class with manual
dirty-flag caching, the pattern a competent developer actually writes.
Same protocol as above, same machine, same cell shape (full detail in the
same
[`bench/model-layer-comparison/RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/bench/model-layer-comparison/RESULTS.md)):

|                                            | bytes/cell | creation, 100k cells |
| ------------------------------------------ | ---------: | -------------------: |
| Vanilla, manual dirty-flag (no library)    |         96 |           1.9–2.8 ms |
| **ivue**, 1 `computed()` + 3 plain getters |     **24** |       **1.0–1.1 ms** |
| plain POJO (fields actually assigned)      |         64 |           1.3–2.1 ms |

```js
class VanillaCell {
  #raw = '';
  #value = '';
  #valueDirty = true;
  // …one more cached slot + dirty flag per derived value

  get raw() {
    return this.#raw;
  }
  set raw(v) {
    this.#raw = v;
    this.#valueDirty = true; // …and every OTHER dependent flag, by hand
  }
  get value() {
    if (this.#valueDirty) {
      this.#value = this.#raw + '!';
      this.#valueDirty = false;
    }
    return this.#value;
  }
  // …
}
```

**~4× less memory, ~2× faster creation than the best hand-rolled
version** — a real result, but a much narrower gap than Angular's, and
worth taking at face value: hand-rolled vanilla is a genuinely
lightweight pattern, ~22× lighter than Angular, because there's no
signal-node or dependency-list machinery, just booleans. What it can't
do, that ivue can, is skip declaring a slot in the first place: every
cached value _and_ every dirty flag is still a real private field,
assigned at construction — 9 of them per cell here — so every instance
pays for every slot whether it's ever read or not. That's also why
vanilla costs more than the plain POJO floor: manual memoization is
strictly more state than no memoization at all, because the dirty flag
itself has to live somewhere. ivue is the only arm that pays for nothing
until something is actually read.

Vanilla's getters/setters carry the logic, not fields — so, unlike
Angular, `super.total` genuinely resolves; structurally, it composes
across inheritance. But the first honest attempt at writing that
composition (not a contrived example — the actual first draft of the
test) produced a silent stale value: a subclass's cache has no way to
_know_ it transitively depends on a value two levels up unless every
setter along the way is manually re-overridden to propagate invalidation.
Miss one edge and the derived value just quietly returns the wrong
number — no crash, no warning, no test failure unless you happened to
assert on that exact value. ivue has no edges to wire by hand, because
there's no manual dirty flag: a read happens inside Vue's reactivity
system, which discovers the _real_ dependency at read time, however deep
the `super` chain runs.

This is not an argument against writing a one-off memoized getter by
hand — for a single derived value in one class, it's often the right
amount of ceremony, and the code above is genuinely close to ivue on
memory. The comparison is scoped to what happens as that pattern scales:
more derived values, more subclass levels, more places a dependency edge
can be missed.

## What about MobX?

MobX is the library most associated with "classes plus observables" —
arguably ivue's closest spiritual ancestor. Its recommended default,
`makeAutoObservable(this)` in the constructor, is measured the same way
(full protocol in
[`bench/model-layer-comparison/RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/bench/model-layer-comparison/RESULTS.md)):

|                                            | bytes/cell | creation, 100k cells |
| ------------------------------------------ | ---------: | -------------------: |
| MobX, `makeAutoObservable`                 |      3,706 |           249–297 ms |
| **ivue**, 1 `computed()` + 3 plain getters |     **24** |       **0.8–1.1 ms** |
| plain POJO (fields actually assigned)      |         64 |           1.2–1.7 ms |

**~154× less memory than MobX — heavier than Angular, and by a wide
margin the slowest arm measured anywhere in this comparison, Angular
included.** The reason is structural, not incidental: `makeAutoObservable`
has to _introspect_ `this` at construction — walk its own properties and
its prototype's getters, and classify each one as observable, computed,
or a plain method — for every single instance, every time. Angular's
fields and Svelte's compiled runes both pay a fixed per-field allocation;
MobX pays a runtime classification cost _on top of_ allocation, which is
why it's not just heavier but categorically slower to construct than
everything else measured.

Inheritance is where MobX's default API stops being usable at all:

```js
class Base {
  a = 1;
  constructor() {
    makeAutoObservable(this);
  }
  get total() {
    return this.a + 10;
  }
}
class Sub extends Base {
  b = 2;
  constructor() {
    super();
    makeAutoObservable(this);
  }
  get total() {
    return super.total + this.b + 100;
  }
}

new Sub();
// [MobX] 'makeAutoObservable' can only be used for
// classes that don't have a superclass
```

That's not a bug report — it's MobX's own documented restriction, thrown
immediately, on every subclass, unconditionally. There is an escape
hatch: `makeObservable(this, { total: computed })` in `Base`, and
`makeObservable(this, { total: override })` in `Sub`, does compose
correctly (`total` re-derives to the right value after a base-level
write). But it costs exactly the ceremony you'd expect — every subclass
must explicitly re-declare an annotation for every inherited member it
touches, using MobX's own `override` marker, at every level of the
hierarchy, forever.

Credit where due: refusing outright is more honest than Angular's silent
clobbering — nobody ships a MobX class hierarchy that quietly loses data
without noticing the thrown error first. But it means MobX's flagship
ergonomic feature, `makeAutoObservable`, is unavailable the moment a
model needs inheritance at all — precisely the shape a domain model
layer needs most.

## What about Svelte 5's runes in classes?

Svelte 5 added universal reactivity — `$state`/`$derived` work inside a
plain class, not just inside a component, a real documented feature
("universal reactivity"), and the closest thing to ivue's own bet that
any mainstream framework currently ships. Same protocol, same machine
(full detail in the same
[`bench/model-layer-comparison/RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/bench/model-layer-comparison/RESULTS.md)):

|                                            | bytes/cell | creation, 100k cells |
| ------------------------------------------ | ---------: | -------------------: |
| Svelte 5, `$state`/`$derived`              |        880 |             20–22 ms |
| **ivue**, 1 `computed()` + 3 plain getters |     **24** |       **0.8–1.1 ms** |
| plain POJO (fields actually assigned)      |         64 |           1.2–1.7 ms |

**~37× less memory, ~20–27× faster creation.** Lighter than Angular or
MobX by a wide margin, and the mechanism is visible in what the compiler
actually emits. Source:

```js
class Cell {
  raw = $state('');
  value = $derived(this.raw + '!');
}
```

Compiled output (excerpt):

```js
class Cell {
  #raw = $.state('');
  get raw() {
    return $.get(this.#raw);
  }
  set raw(v) {
    $.set(this.#raw, v, true);
  }
  #value = $.derived(() => this.raw + '!');
  get value() {
    return $.get(this.#value);
  }
}
```

The compiler lowers every rune field to a **real prototype getter/setter**
— not a raw field the way Angular's source stays. That single choice is
why Svelte is the _only other arm in this whole comparison, besides ivue,
that composes correctly across inheritance_: `super.total` resolves
through the prototype exactly like a native getter, and because the
underlying `$derived` is a genuine reactive computation — not a
hand-maintained dirty flag — it re-derives correctly on its own. Verified
live: after a base-level write, a subclass's derived total updates from
113 to 117, no staleness, no manual wiring, no thrown error.

What the compiler doesn't change is _when_ the underlying signal gets
allocated. `#raw` and `#value` are still private class fields — real
per-instance storage, declared upfront in the class body — so
`$.state()`/`$.derived()` run at construction for every instance, whether
the getter is ever touched or not. Compiling away the ergonomics of
writing runes as fields doesn't compile away the timing of allocation;
only ivue's lazy, first-access materialization does that. Put plainly:
**Svelte 5 is the one framework with classes that got the inheritance
half of this argument right independently** — proof the industry can
arrive at "getters, not fields" without a runtime prototype transform at
all. It just hasn't (yet) made the other half — laziness — free.

## What about Solid.js?

Solid.js is famously the leanest fine-grained reactive engine in the JS
ecosystem — often at the top of render/DOM-update benchmarks — so it's
the sharpest test of this whole argument. One wrinkle first: **Solid has
no class-based reactivity idiom at all.** There's no `signal()` or `ref()`
to attach to a field; Solid's own docs use plain factory functions, and
even distinguish an unmemoized "derived signal" (a plain function) from
`createMemo` (for expensive derivations) — the _exact same plain-vs-memoized
split ivue makes_, arrived at independently. So the fair comparison isn't
a class — it's Solid's own idiom, a factory function, benchmarked the same
way (full protocol in
[`bench/model-layer-comparison/RESULTS.md`](https://github.com/infinite-system/ivue/blob/main/bench/model-layer-comparison/RESULTS.md)):

|                                            | bytes/cell | creation, 100k cells |
| ------------------------------------------ | ---------: | -------------------: |
| Solid.js, `createMemo` + 3 plain functions |        985 |             16–23 ms |
| **ivue**, 1 `computed()` + 3 plain getters |     **24** |       **0.7–1.1 ms** |
| plain POJO (fields actually assigned)      |         64 |           1.3–2.5 ms |

**~41× less memory than Solid** — and this is the one genuinely
surprising number in the entire comparison: Solid lands _heavier than
Svelte 5_, despite using ivue's own philosophy and despite its reputation.
The reason isn't a knock on Solid's engine — it's the factory-function
idiom itself:

```js
function createSolidCell() {
  const [raw, setRaw] = createSignal('');
  const value = createMemo(() => raw() + '!'); // the one hot value
  const display = () => value().toUpperCase(); // plain function
  // …
  return { raw, setRaw, value, display /* … */ };
}
```

Every call allocates a fresh set of closures — `raw`, `setRaw`, `value`,
and every plain-function derivation — because a closure captures its own
scope on every invocation. A class getter is defined **once**, on the
prototype, shared by every instance that will ever exist; a closure is
defined **fresh, per call, forever**. That's the same tax Vue's own
composables pay (measured on `demo/grid`), and it's intrinsic to
factory-function authoring, not specific to Solid. On top of that,
`createMemo` still allocates a real computation node per instance — the
same allocate-at-construction policy Angular's fields and Svelte's
compiled backing fields share.

Solid's design point is components — many short-lived signals, created
and torn down with the DOM nodes that own them, read very often over a
short lifetime. A model layer is the opposite shape: comparatively few
reads, but potentially millions of long-lived instances. Solid simply
has no authoring surface built for that shape, because it has no
classes at all.

Inheritance doesn't apply in the usual sense either, and that's not a
weakness — it's a different answer to the same question. Composition in
Solid happens by one factory function calling another and reading its
return value:

```js
function createSub() {
  const base = createBase();
  const [b, setB] = createSignal(2);
  const total = createMemo(() => base.total() + b() + 100);
  return { ...base, b, setB, total };
}
```

There's no class to clobber, so this composes correctly by construction —
Solid's tracking is based on which signals are _actually read_, not on
any class or `super` mechanism. Verified live: a base-level write
propagates correctly through to the composed total, no staleness, no
special handling required. The tradeoff is everything classes buy
elsewhere — polymorphism, method overriding, one shared type across a
hierarchy — which factory composition doesn't offer by design.

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
