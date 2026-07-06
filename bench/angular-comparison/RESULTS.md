# Angular Signals vs. ivue vs. hand-rolled vanilla vs. plain POJO

A narrow, targeted follow-up to `demo/grid/RESULTS.md`: does Angular's
Signals API (`signal()`, `computed()`) — the framework most associated with
class-oriented, fine-grained reactivity — already close the gap
[The Reactive Model Layer](../../docs_v2/guide/model-layer.md) describes?
And if you'd rather not reach for a library at all, how close can a
competent hand-rolled vanilla class get? Three questions, all answered
empirically below: per-instance allocation cost, whether a derived value
composes across a subclass boundary, and — for the vanilla arm — whether
that composition is actually _safe_, not just structurally possible.

This is a Node.js microbenchmark (`process.memoryUsage()`, `--expose-gc`),
not the browser/Playwright protocol `demo/grid` uses — noted so the two
aren't confused as the same measurement regime. Kept in its own
`package.json` (own `@angular/core` + `vue` dependencies) so it never
touches the main library's dependency tree. The vanilla arm needs neither
dependency — it's plain JS.

## Machine

- Parallels VM, **aarch64** (Apple-silicon host), 16 vCPU
- Linux 6.8.0-134-generic
- Node v26.3.1 · `@angular/core` 22.0.5 · Vue 3.5.x
- ivue imported from the real build artifact, `dist/index.es.js` — not the
  TypeScript source — so the number reflects what a consumer actually gets

## Protocol (`bench.mjs`)

One cell shape, four arms, identical logic:

- **raw**: one input value
- **value**: `raw + '!'` — the one "hot" derivation, memoized on every arm
  that memoizes at all
- **display**, **isEmpty**, **cssClass**: three more derived values chained
  off `value`/`raw` — memoized on the Angular arm (idiomatic — every
  Angular Signals doc example declares derived state as `computed()`
  fields) and on the vanilla arm (manual dirty-flag caching — see below),
  left as **plain getters** on the ivue arm (the ivue idiom: memoize only
  what's actually hot)

100,000 instances are constructed and **never read** — this isolates
per-instance allocation cost from recomputation cost. `global.gc()` runs
before and after construction; the delta divided by 100,000 is the
per-cell figure. Two passes are shown (cold, then JIT-settled/warm);
they agree closely, so no averaging beyond that was needed.

## The vanilla arm: what a competent developer writes by hand, no library

`VanillaCell` has no dependency at all — just private fields and manual
dirty-flag invalidation, the way most JS/React codebases actually
memoize a derived value without reaching for a reactive library:

```js
class VanillaCell {
  #raw = '';
  #value = '';
  #valueDirty = true;
  // …and one more cached slot + dirty flag per derived value

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

Getters and setters carry the _logic_ here, not fields — which matters for
inheritance (below). But every cached value and every dirty flag is still
a real private field, assigned at construction, for every instance,
whether the getter is ever read or not.

## Results (representative run; two passes shown in the script output)

| arm                                                    |      bytes/cell |      heap @ 100k | creation @ 100k |
| ------------------------------------------------------ | --------------: | ---------------: | --------------: |
| Angular signals, 4 eager `computed()` fields           | 2,152.3–2,152.5 |         215.2 MB |    72.1–78.5 ms |
| **ivue**, 1 `computed()` + 3 plain getters, never read |   **23.6–24.0** | **2.36–2.40 MB** |  **1.0–1.1 ms** |
| Vanilla, manual dirty-flag (no library)                |            96.1 |          9.61 MB |      1.9–2.8 ms |
| Plain POJO, fields actually assigned                   |       64.0–64.3 |     6.40–6.43 MB |      1.3–1.8 ms |

**~90× less memory, ~55–70× faster creation**, ivue vs. Angular, for an
identical shape. **~4× less memory, ~2× faster creation**, ivue vs. the
best hand-rolled vanilla version — the library-free baseline is a real
improvement over Angular, but still can't touch ivue's laziness.

### Why ivue comes in _under_ the POJO floor

Not a measurement artifact: the `PlainCell` control assigns real values to
five fields at construction (`raw = ''`, `value = ''`, `isEmpty = true`,
…) — those values cost bytes. An untouched ivue instance has **zero own
properties** — nothing is assigned anywhere, because nothing has been
read. It is lighter than "doing nothing," because it does even less than
that: a POJO still commits to a shape; an ivue instance commits to nothing
until asked.

### Why vanilla costs more than even the plain POJO

`VanillaCell` needs 9 fields per instance (`raw` plus 4 cached values
_plus_ 4 dirty flags) against `PlainCell`'s 5 — manual memoization is
strictly more state than no memoization at all, because the dirty flag
itself has to live somewhere. It still beats Angular by a wide margin
(96.1 B vs. 2,152.3 B) because there's no signal/computed node, dependency
list, or subscriber set — just booleans. What it can't do, that ivue can,
is _not allocate a slot in the first place_ for a member nobody ever
reads: private class fields are declared upfront in the class body, so
every instance pays for every slot, touched or not.

### Why Angular is _heavier_ than Vue's own eager composables

`demo/grid/RESULTS.md` measured Vue composables (eager `computed()` per
instance) at ~756–773 bytes/cell for a comparable shape. Angular's four
computed fields cost ~538 bytes each here — the same allocate-per-instance
policy composables use, with somewhat higher per-node overhead. Angular's
Signals did not change _when_ allocation happens, only _how_ dependencies
are tracked once something exists.

## Inheritance — Angular (`inherit-test.mjs`)

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
anything. `Base`'s contribution (`+ 10`) never runs; only `Sub`'s survives.

This is not a defect specific to Angular — it is what happens to _any_
reactive primitive declared as a class field rather than a class getter,
in any framework.

## Inheritance — hand-rolled vanilla (`vanilla-inherit-test.mjs`)

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
Angular's fields can't do. But `Sub`'s own cache has no way to _know_ it
transitively depends on `Base`'s `a`, because there is no dependency
graph, only whatever invalidation edges were hand-written. The fix is to
re-declare `set a(v)` in `Sub` purely to propagate the invalidation one
level down — extra ceremony, and a silent correctness bug (not a crash;
`s.total` just quietly returns the wrong number) if a single edge like
this is missed anywhere in a real class hierarchy.

ivue's engine has no invalidation edges to wire, because there is no
manual dirty flag: reads happen inside Vue's reactivity system, which
tracks the _real_ dependency at the moment it's read, automatically,
however deep the `super` chain goes.

## Scope

This is not a verdict on Angular the framework, or a claim that hand-rolled
memoization is never worth writing — Angular brings routing, forms, a
mature DI container, and a decade of production hardening ivue does not
have, and a one-off vanilla class with a single derived value is often the
right amount of ceremony. The comparison is scoped narrowly, to three
things this bench measures: per-instance allocation policy, whether a
derived value composes across an inheritance boundary, and — where it
does compose — whether that composition is safe from silent staleness
without a real dependency graph.

## Reproduce

```bash
cd bench/angular-comparison
npm install
npm run bench                  # memory + creation comparison, all 4 arms
npm run inherit-test           # Angular field-clobbering demonstration
npm run vanilla-inherit-test   # vanilla stale-cache demonstration (buggy + fixed)
```
