# Angular, MobX, Svelte 5, Solid.js, hand-rolled vanilla, and plain POJO vs. ivue

A narrow, targeted follow-up to `demo/grid/RESULTS.md`: does any existing
class-oriented reactive primitive — Angular Signals, MobX's observables,
Svelte 5's runes-in-classes, or Solid.js's signals — already close the gap
[The Reactive Model Layer](../../docs_v2/guide/model-layer.md) describes?
And if you'd rather not reach for a library at all, how close can a
competent hand-rolled vanilla class get? Every arm is answered on the same
two axes: per-instance allocation cost, and whether a derived value
composes correctly across a subclass (or, for Solid, a function-composed)
boundary.

This is a Node.js microbenchmark (`process.memoryUsage()`, `--expose-gc`),
not the browser/Playwright protocol `demo/grid` uses — noted so the two
aren't confused as the same measurement regime. Kept in its own
`package.json` (own `@angular/core` + `mobx` + `svelte` + `solid-js` +
`vue` dependencies) so none of it touches the main library's dependency
tree. The vanilla arm needs no dependency at all — it's plain JS.

## Machine

- Parallels VM, **aarch64** (Apple-silicon host), 16 vCPU
- Linux 6.8.0-134-generic
- Node v26.3.1 · `@angular/core` 22.0.5 · `mobx` 6.16.1 · `svelte` 5.56.4 ·
  `solid-js` 1.9.14 · Vue 3.5.x
- ivue imported from the real build artifact, `dist/index.es.js` — not the
  TypeScript source — so the number reflects what a consumer actually gets
- **Solid.js gotcha, caught before trusting any number:** Node's default
  `require`/`import` resolution picks solid-js's **SSR build**
  (`dist/server.cjs`) under the `"node"` export condition — a non-reactive
  stub (SSR renders once; `createMemo()` silently never re-runs under it).
  Verified this live (a memo read the same stale value before and after a
  signal write) before discovering the cause. Fixed with
  `node --conditions=browser`, which forces the real client engine — the
  one actual users get. `npm run bench` already passes this flag.

## Protocol (`bench.mjs`)

One cell shape, seven arms, identical logic:

- **raw**: one input value
- **value**: `raw + '!'` — the one "hot" derivation, memoized on every arm
  that memoizes at all
- **display**, **isEmpty**, **cssClass**: three more derived values chained
  off `value`/`raw` — memoized on every arm except ivue and Solid, which
  leave them as **plain getters/functions** (the ivue idiom: memoize only
  what's actually hot — Solid's own docs draw the exact same distinction,
  calling an unmemoized derivation a "derived signal"). MobX's
  `makeAutoObservable` infers every getter as `computed` automatically —
  there is no "leave it plain" option in that API.

Six arms are classes, constructed with `new`. **Solid has no class-based
reactivity idiom at all** — no `ref()`/`signal()` to attach to a field —
so its arm is a factory _function_ (`createSolidCell()`), benchmarked with
the same measurement, just without `new`.

100,000 instances are constructed and **never read** — this isolates
per-instance allocation cost from recomputation cost. `global.gc()` runs
before and after construction; the delta divided by 100,000 is the
per-cell figure. Two passes are shown (cold, then JIT-settled/warm);
they agree closely, so no averaging beyond that was needed.

## The arms

**MobX** (`MobxCell`) — `makeAutoObservable(this)` in the constructor,
the API MobX's own docs recommend by default. It introspects the instance
at construction time to classify every member (observable / computed /
action) — a per-instance "scan and build" cost a prototype-transform
engine never pays.

**Angular** (`AngularCell`) — `signal()`/`computed()` declared as class
fields, exactly as every Angular Signals doc example shows.

**Svelte 5** (`SvelteCell`, compiled from `svelte-cell.svelte.js`) —
`$state`/`$derived` inside a plain class, a real documented Svelte 5
feature ("universal reactivity"). Requires the compiler; see
`compile-svelte.mjs`. The compiler lowers each rune field to a private
backing field **plus a real prototype getter/setter**:

```js
// svelte-cell.svelte.js, as authored
export class SvelteCell {
  raw = $state('');
  value = $derived(this.raw + '!');
  // …
}
```

```js
// svelte-cell.compiled.mjs, as generated (excerpt)
export class SvelteCell {
  #raw = $.state('');
  get raw() {
    return $.get(this.#raw);
  }
  set raw(value) {
    $.set(this.#raw, value, true);
  }
  #value = $.derived(() => this.raw + '!');
  get value() {
    return $.get(this.#value);
  }
  // …
}
```

**Solid.js** (`createSolidCell()`) — `createSignal`/`createMemo`, Solid's
own idiom, as a factory function rather than a class (Solid has no other
option). One memo for the hot value, three plain functions for the rest —
mirroring ivue's own plain-vs-memoized split, which Solid's docs draw
independently:

```js
function createSolidCell() {
  const [raw, setRaw] = createSignal('');
  const value = createMemo(() => raw() + '!'); // the one hot value
  const display = () => value().toUpperCase(); // plain function
  const isEmpty = () => raw().length === 0; // plain function
  const cssClass = () => (isEmpty() ? 'empty' : 'filled'); // plain function
  return { raw, setRaw, value, display, isEmpty, cssClass };
}
```

**Vanilla** (`VanillaCell`) — hand-rolled manual dirty-flag memoization, no
dependency, the pattern a competent developer writes in bare JS/React
(React has no `ref()`/`signal()` equivalent to attach to an arbitrary
class, so this is the honest "bare React" baseline).

**ivue** (`IvueCell`) — 1 `computed()` for the hot value, 3 plain getters.

**POJO** (`PlainCell`) — the non-reactive floor; fields assigned, nothing
reactive at all.

## Results (representative run; two passes shown in the script output)

| arm                                                    |      bytes/cell |      heap @ 100k | creation @ 100k |
| ------------------------------------------------------ | --------------: | ---------------: | --------------: |
| MobX, `makeAutoObservable`                             | 3,705.3–3,706.1 |   370.5–370.6 MB |  248.6–333.3 ms |
| Angular signals, 4 eager `computed()` fields           | 2,151.0–2,151.3 |   215.1–215.2 MB |    67.4–79.3 ms |
| **Solid.js, `createMemo` + 3 plain functions**         |     984.3–984.6 |     98.4–98.5 MB |    16.3–22.9 ms |
| Svelte 5 runes, `$state`/`$derived`                    |     880.2–880.4 |          88.0 MB |    16.3–22.2 ms |
| Vanilla, manual dirty-flag (no library)                |       95.8–96.1 |     9.58–9.61 MB |      1.9–2.8 ms |
| Plain POJO, fields actually assigned                   |       64.0–64.1 |     6.40–6.41 MB |      1.2–1.7 ms |
| **ivue**, 1 `computed()` + 3 plain getters, never read |   **23.9–24.0** | **2.39–2.40 MB** |  **0.8–1.1 ms** |

Ranked worst to best on memory, ivue is **~154×** lighter than MobX,
**~90×** lighter than Angular, **~41×** lighter than Solid.js, **~37×**
lighter than Svelte 5, and **~4×** lighter than the best hand-rolled
vanilla version — for an identical shape, every time. On creation speed
the same ordering roughly holds: MobX is slowest by a wide margin (its
per-instance introspection cost shows up directly as ~250–330ms per 100k,
worse than every other reactive arm combined), Angular is real but
smaller library overhead, Solid and Svelte land close together, vanilla
and POJO are close to native, and ivue is fastest of all — faster even
than the non-reactive POJO control (below).

**The one genuinely surprising result in this whole comparison:** Solid
is _heavier_ than Svelte 5, despite Solid's reputation as the leanest
fine-grained reactive engine in the JS ecosystem, and despite using the
exact same "memoize only the hot value" philosophy as ivue. See below for
why.

### Why MobX is the heaviest and the slowest

`makeAutoObservable` has to inspect `this` at construction — walk its own
properties and its prototype's getters, decide what's observable vs.
computed vs. a plain method — for **every single instance**, every time.
Every other arm here either declares its reactive shape once on a
prototype (ivue, Svelte's compiler) or pays a fixed per-field allocation
(Angular's fields) — MobX pays a runtime classification cost on top of
allocation, which is why it is not just heavier but categorically slower
to construct than everything else measured, including Angular.

### Why Svelte 5 is lighter than Angular and MobX, but still not ivue

The compiler generates real getters, so there's no field-clobbering
problem (see inheritance, below) — but the underlying `$.state()` /
`$.derived()` call for every rune field still runs at construction, for
every instance, because the private backing field holding that node is a
real class field, declared upfront. Compiling away the ergonomics of
writing `$state`/`$derived` as fields doesn't compile away _when_ the
node is allocated — only ivue's lazy, per-member, first-access
materialization does that.

### Why Solid.js is heavier than Svelte 5, despite the reputation

Solid's individual signal reads are famously fast — routinely at or near
the top of `js-framework-benchmark`'s DOM-update numbers. But that
benchmark measures render/update throughput for component trees, not
per-instance allocation cost for a persistent domain model, which is what
this bench isolates. Two costs stack up here that Solid's component-render
story never has to pay:

1. **No prototype to share logic on.** `createSolidCell()` is a factory
   function — every call allocates 6 fresh closures (`raw`, `setRaw`,
   `value`, `display`, `isEmpty`, `cssClass`), because a closure captures
   its own scope every time it's created. A class getter is defined once,
   on the prototype, for every instance that will ever exist; a closure is
   defined fresh, per call, forever. This is the same tax Vue's own
   composables pay (`demo/grid/RESULTS.md`'s "composable" arm), and it is
   intrinsic to the factory-function idiom, not specific to Solid.
2. **A real computation node per memo, same as everywhere else.**
   `createMemo` allocates an internal reactive node (dependency tracking,
   owner/cleanup linkage) at call time, same allocation-per-instance
   policy as Angular's fields or Svelte's compiled backing fields.

Solid's genuinely excellent design point is components: many short-lived
signals, created and disposed with the DOM nodes that own them, read
extremely often, over a component's lifetime. A model layer is the
opposite shape — comparatively few reads, but potentially millions of
long-lived instances — and Solid has no authoring surface (no classes)
built for that shape at all. This is not a criticism of Solid; it's a
different design point, optimized for a different axis.

### Why ivue comes in _under_ the POJO floor

Not a measurement artifact: the `PlainCell` control assigns real values to
five fields at construction (`raw = ''`, `value = ''`, `isEmpty = true`,
…) — those values cost bytes. An untouched ivue instance has **zero own
properties** — nothing is assigned anywhere, because nothing has been
read. It is lighter than "doing nothing," because it does even less than
that: a POJO still commits to a shape; an ivue instance commits to
nothing until asked.

### Why vanilla costs more than even the plain POJO

`VanillaCell` needs 9 fields per instance (`raw` plus 4 cached values
_plus_ 4 dirty flags) against `PlainCell`'s 5 — manual memoization is
strictly more state than no memoization at all, because the dirty flag
itself has to live somewhere. It still beats every library arm here by a
wide margin because there's no signal/computed node, dependency list, or
subscriber set — just booleans. What it can't do, that ivue can, is _not
allocate a slot in the first place_ for a member nobody ever reads.

## Inheritance

Five very different outcomes for "does a derived value compose correctly
across a class boundary?" — from silent data corruption to genuinely
correct. Solid doesn't have classes at all, so "inheritance" isn't the
right question for it — the comparable question is whether _function
composition_ (one factory calling another) composes safely, which is a
structurally different guarantee, not a weaker one:

| arm                            | composes?                     | how                                                                                                                        |
| ------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **MobX**, `makeAutoObservable` | **hard error**                | refuses to run at all on any class with a superclass                                                                       |
| **Angular**, fields            | **silently wrong**            | subclass field clobbers the parent's; `Base`'s contribution vanishes, no error                                             |
| **Vanilla**, hand-rolled       | **silently wrong by default** | `super.total` resolves structurally, but the cache goes stale unless every setter is manually re-wired                     |
| **Svelte 5**, compiled runes   | **correct**                   | compiler-generated prototype getters + real reactive derivation — `super.total` re-derives live                            |
| **Solid.js**, function factory | **correct, different shape**  | no classes to clobber — one factory calls another and reads its return value; real signals track correctly by construction |
| **ivue**                       | **correct**                   | prototype getters + engine-tracked reactivity — `super.x.value` composes across any depth                                  |

### MobX (`mobx-inherit-test.mjs`)

```
--- makeAutoObservable: hard refusal on any superclass ---
THREW: [MobX] 'makeAutoObservable' can only be used for classes that don't have a superclass

--- makeObservable + explicit override: works, at the cost of re-annotating every level ---
s.total = 113 (expect 113 = 1 + 10 + 2 + 100)
after s.a = 5, s.total = 117 (expect 117)
```

The API MobX recommends by default cannot be used on any class hierarchy
at all — not a bug, a documented restriction. The escape hatch,
`makeObservable(this, {...})` with every member explicitly annotated,
does work, but every subclass must re-declare an annotation for every
inherited member it touches, using MobX's own `override` marker for
anything a parent already annotated. Correct, but with real, compounding
ceremony per level.

### Angular (`inherit-test.mjs`)

```
s.total() = 102
Sub.prototype has own "total"?    false
instance has own "total"?         true
Base.prototype has own "total"?   false
```

`signal()`/`computed()` declared as class fields are **own-properties
assigned in the constructor** — never prototype members. `Sub`'s `total`
field doesn't override `Base`'s; it silently replaces it on the instance,
because there is no shared prototype slot for `super.total` to mean
anything. `Base`'s contribution (`+ 10`) never runs; only `Sub`'s
survives. This is not a defect specific to Angular — it is what happens
to _any_ reactive primitive declared as a class field rather than a class
getter, in any framework that chooses fields as the authoring surface.

### Vanilla (`vanilla-inherit-test.mjs`)

Vanilla's getters/setters _are_ real prototype members — unlike Angular's
fields, `super.total` genuinely resolves. Structurally, it composes. The
honest result below is not a contrived example; it is the actual first
draft of this test, run as written:

```
--- naive attempt: composes structurally, but silently goes stale ---
s.total = 113 (expect 113 = 1 + 10 + 2 + 100)
after s.a = 5, s.total = 113 (expect 117 — got the STALE cached value:
Sub never learned that a Base-level write should invalidate ITS cache too)

--- corrected: every setter that feeds an inherited derivation must be
    re-overridden to propagate invalidation ---
s.total = 113 (expect 113)
after s.a = 5, s.total = 117 (expect 117 — now correct, at the cost of
re-wiring every inherited dependency by hand)
```

`Sub.total` correctly calls `super.total` — the getter-based composition
Angular's fields and MobX's default API can't do. But `Sub`'s own cache
has no way to _know_ it transitively depends on `Base`'s `a`, because
there is no dependency graph, only whatever invalidation edges were
hand-written. The fix is extra ceremony, and a silent correctness bug
(not a crash — `s.total` just quietly returns the wrong number) if a
single edge like this is missed anywhere in a real class hierarchy.

### Svelte 5 (`svelte-inherit-test.mjs`)

```
s.total = 113 (expect 113 = 1 + 10 + 2 + 100)
after s.a = 5, s.total = 117 (expect 117 — correctly re-derived through super.total, not stale)
```

The one arm besides ivue that gets class-based inheritance right, and the
reason is structural: the compiler lowers `$derived` fields to real
prototype getters wrapping a genuine reactive derivation, not a
hand-maintained dirty flag. `super.total` resolves through the prototype
chain exactly like a native getter, and because the underlying reactivity
is real (not manually invalidated), it re-derives correctly — no edge to
forget.

### Solid.js (`solid-compose-test.mjs`)

```
s.total() = 113 (expect 113 = 1 + 10 + 2 + 100)
after setA(5): 117 (expect 117)
```

There is no class hierarchy here to clobber or refuse — `createSub()`
just calls `createBase()` and reads its `total` signal inside its own
`createMemo`. Because Solid's tracking is based on which signals are
_actually read_ during a computation, not on any class or getter
mechanism, this composes correctly with zero special handling — the same
underlying guarantee real reactivity gives Svelte and ivue, arrived at
without classes or `super` at all. The tradeoff is what classes buy you
elsewhere — polymorphism, method overriding, a single shared type — none
of which factory-function composition offers by design.

### ivue

`super.x.value` composes across any depth because ivue's engine
transforms getters — real prototype members — and tracks the actual
dependency at read time, the same mechanism Svelte's compiler arrives at
independently, minus the eager per-instance allocation.

## Scope

This is not a verdict on any of these frameworks as a whole — Angular
brings routing, forms, and a DI container; MobX has a mature ecosystem
and a simpler mental model for many apps; Svelte 5 is a genuinely
excellent, actively-evolving reactivity design; Solid.js is (rightly)
famous for render/DOM-update performance, a different axis than the one
this bench isolates; and a one-off vanilla class with a single derived
value is often the right amount of ceremony. The comparison is scoped
narrowly, to two things this bench measures: per-instance allocation
policy, and whether a derived value composes correctly across a class (or
function-composition) boundary.

## Reproduce

```bash
cd bench/model-layer-comparison
npm install
npm run bench                  # memory + creation comparison, all 7 arms
npm run inherit-test           # Angular field-clobbering demonstration
npm run vanilla-inherit-test   # vanilla stale-cache demonstration (buggy + fixed)
npm run mobx-inherit-test      # MobX hard-refusal + explicit-override demonstration
npm run compile-svelte         # regenerate the compiled Svelte output (after editing .svelte.js sources)
npm run svelte-inherit-test    # Svelte 5 correct-composition demonstration
npm run solid-compose-test     # Solid.js function-composition demonstration
```
