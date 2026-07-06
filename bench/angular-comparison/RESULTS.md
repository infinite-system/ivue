# Angular Signals vs. ivue vs. plain POJO — comparison bench

A narrow, targeted follow-up to `demo/grid/RESULTS.md`: does Angular's
Signals API (`signal()`, `computed()`) — the framework most associated with
class-oriented, fine-grained reactivity — already close the gap
[The Reactive Model Layer](../../docs_v2/guide/model-layer.md) describes?
Two questions, both answered empirically below: per-instance allocation
cost, and whether a derived value composes across a subclass boundary.

This is a Node.js microbenchmark (`process.memoryUsage()`, `--expose-gc`),
not the browser/Playwright protocol `demo/grid` uses — noted so the two
aren't confused as the same measurement regime. Kept in its own
`package.json` (own `@angular/core` + `vue` dependencies) so it never
touches the main library's dependency tree.

## Machine

- Parallels VM, **aarch64** (Apple-silicon host), 16 vCPU
- Linux 6.8.0-134-generic
- Node v26.3.1 · `@angular/core` 22.0.5 · Vue 3.5.x
- ivue imported from the real build artifact, `dist/index.es.js` — not the
  TypeScript source — so the number reflects what a consumer actually gets

## Protocol (`bench.mjs`)

One cell shape, three arms, identical logic:

- **raw**: one input value
- **value**: `raw + '!'` — the one "hot" derivation, memoized on every arm
- **display**, **isEmpty**, **cssClass**: three more derived values chained
  off `value`/`raw` — memoized on the Angular arm (idiomatic — every
  Angular Signals doc example declares derived state as `computed()`
  fields), left as **plain getters** on the ivue arm (the ivue idiom:
  memoize only what's actually hot)

100,000 instances are constructed and **never read** — this isolates
per-instance allocation cost from recomputation cost. `global.gc()` runs
before and after construction; the delta divided by 100,000 is the
per-cell figure. Two passes are shown (cold, then JIT-settled/warm);
they agree closely, so no averaging beyond that was needed.

## Results (representative run; two passes shown in the script output)

| arm                                                    |      bytes/cell |      heap @ 100k | creation @ 100k |
| ------------------------------------------------------ | --------------: | ---------------: | --------------: |
| Angular signals, 4 eager `computed()` fields           | 2,152.3–2,152.5 |         215.2 MB |    72.6–78.5 ms |
| **ivue**, 1 `computed()` + 3 plain getters, never read |   **23.6–24.0** | **2.36–2.40 MB** |  **1.1–1.4 ms** |
| Plain POJO, fields actually assigned                   |            64.1 |          6.41 MB |      1.8–2.1 ms |

**~90× less memory, ~55–70× faster creation**, ivue vs. Angular, for an
identical shape.

### Why ivue comes in _under_ the POJO floor

Not a measurement artifact: the `PlainCell` control assigns real values to
five fields at construction (`raw = ''`, `value = ''`, `isEmpty = true`,
…) — those values cost bytes. An untouched ivue instance has **zero own
properties** — nothing is assigned anywhere, because nothing has been
read. It is lighter than "doing nothing," because it does even less than
that: a POJO still commits to a shape; an ivue instance commits to nothing
until asked.

### Why Angular is _heavier_ than Vue's own eager composables

`demo/grid/RESULTS.md` measured Vue composables (eager `computed()` per
instance) at ~756–773 bytes/cell for a comparable shape. Angular's four
computed fields cost ~538 bytes each here — the same allocate-per-instance
policy composables use, with somewhat higher per-node overhead. Angular's
Signals did not change _when_ allocation happens, only _how_ dependencies
are tracked once something exists.

## Inheritance (`inherit-test.mjs`)

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
in any framework. ivue's getters are real prototype members, so
`super.x.value` composes across as many subclass levels as needed (see
"Inheritance & `super` fidelity" in
[`lib/Reactive.invariants.md`](../../lib/Reactive.invariants.md)) — the
getter placement is the whole difference.

## Scope

This is not a verdict on Angular the framework — it brings routing, forms,
a mature DI container, and a decade of production hardening ivue does not
have. The comparison is scoped narrowly, to the two things this bench
measures: the reactive primitive's per-instance allocation policy, and
whether a derived value composes across an inheritance boundary.

## Reproduce

```bash
cd bench/angular-comparison
npm install
npm run bench          # memory + creation comparison
npm run inherit-test   # inheritance-clobbering demonstration
```
