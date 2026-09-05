---
venue: HN launch thread, r/vuejs, r/javascript, r/typescript, r/webdev, r/programming, lobste.rs, the r/vuejs AMA, every podcast pre-read
purpose: post
lang: en
source: NEW (W13 objection bank) — receipts drawn from introducing-ivue, one-kilobyte-feature, performance/benchmarks docs, ban-private, the-stack-got-faster, twenty-million-cells, agents-built-an-editor
status: draft-for-review
---

# Every hostile question, answered with a number

ivue is a 1.1 kB class layer over Vue 3's reactivity: plain TypeScript
classes become fully reactive, and instances stay plain objects.

This is the answer bank for launch threads. Rules for using it:

- **Numbers or a link. Never an adjective.** If an answer here has no
  number and no link, it is not finished — fix it before pasting.
- **Concede first when the hit is fair.** Every concession below is
  real. Shipping our own criticism is why the HN first comment names
  two weaknesses on purpose.
- **Scope, don't inflate.** Most objections are not wrong; they are
  right about a smaller domain than they claim. Name the domain.
- Paste-length is 2–4 sentences. If a reply needs more, it needs a
  link instead.

Source numbers, all reproducible: engine **1,146 B gzipped**
(`gzip -c dist/index.es.js | wc -c`), **209 tests at 100% coverage on
every metric**, zero runtime dependencies, MIT, peer dependency
`vue ^3.2.0`.

---

## 1. "Classes in 2026? The industry moved on."

The industry moved on for a reason worth respecting: unconstrained
classes are a bug farm — `this` broke when you passed a method,
binding allocated per method per instance, and mixins collided. ivue
is the constraint set that closes each of those structurally: methods
lazy-bind once on the prototype with stable identity, state is
ref-getters, derivations are plain getters that `extends` and `super`
understand. The claim is not "classes were fine"; it is "classes were
unconstrained, and the constraints were findable"
(https://ivue.dev/blog/introducing-ivue).

## 2. "Just use Pinia."

Pinia is a store; ivue is an entity substrate — they answer different
questions and compose fine (a store is injected through a `$`-getter,
one line). The difference shows at population: a domain model of
100,000 live, individually observed instances costs 3.7 KB each in
ivue versus 10.4 KB under `reactive()` and 19.7 KB with eager
`computed()` per derivation (Vue 3.5, Node 22, gc-forced heap deltas —
https://ivue.dev/guide/performance). If your shared state is one
singleton with thirty computeds, that whole argument is worth ~20 KB
and you should keep using Pinia.

## 3. "Proxies are fast now — this optimizes nothing."

Proxies are close to free at rest; the cost lands when something
observes the object, because dependency storage is allocated for every
tracked key. Measured per read over 10-million-iteration loops (Node
22, Vue 3.5): a plain derived getter on a raw ivue instance is
23.4 ns, the same read through a shallow-unwrap proxy is 68.2 ns, and
through `reactive()` 125.1 ns; method access is 3.8 ns versus 42.3 and
68.5 ns. ivue's move is not a faster proxy — it is no proxy on the
read path (https://ivue.dev/guide/performance).

## 4. "1.1 kB is a vanity metric — nobody's bundle is size-bound."

Correct, and we do not argue otherwise: 1.1 kB is not a performance
claim, it is a **surface-area** claim. The number that matters is what
it buys — a whole reactive class layer with no runtime dependencies,
no build step, no decorators, and no dev-only code path, so
development, test, SSR and production run the identical engine
(https://ivue.dev/guide/hmr). If the engine needed 40 kB to do this,
the reduction would have failed and the design would be worth less.

## 5. "Bus factor one. Single maintainer, no company."

True, and it is the strongest objection on this list. What is
mitigable is mitigated: MIT, zero runtime dependencies, 1,146 B of
engine you could read in an afternoon, 209 tests at 100% coverage, and
a public standard document that specifies the whole contract
(https://ivue.dev/guide/standard). A 1.1 kB dependency you can fork
and understand is a materially different risk from a 40 kB one you
cannot — but the risk is real and we are not going to talk you out
of it.

## 6. "AI wrote this."

Split it honestly: the engine and the standard are human work — three
years of reduction — and **Invar**, the 108,000-line terminal IDE, was
built almost entirely by AI agents following that standard. That
second part is the receipt, not the authorship claim: the point of the
IDE is that a constrained substrate is agent-legible, measured as one
`computed()` and one wiring seam across the whole codebase
(https://ivue.dev/blog/agents-built-an-editor). Every number on the
site names its method so you never have to take an author's word,
machine or human.

## 7. "SSR story?"

`Reactive()` has one implementation across development, test, SSR and
production — same constructor, native `new`, plain instance, no
dev-only dispatch layer (https://ivue.dev/guide/hmr#production-parity).
The one real SSR hazard is the ordinary one, and the docs state it:
a **module-level singleton instance** leaks state across requests, so
per-request or per-component instances are the rule and stores are
reached through `use()`, not held at module scope
(https://ivue.dev/guide/modules). Nothing about that is
ivue-specific — it is the same rule Pinia states for its own
singletons.

## 8. "You're coupled to Vue internals. 3.6 will break you."

It ran on the 3.6 release candidate unchanged: **196/196 tests
passing, first tracked reads ~1.6× faster** on the alien-signals
rewrite (https://ivue.dev/blog/the-stack-got-faster). That is the
structural bet paying out — ivue is built **on** the public reactivity
primitives (`ref`, `computed`, `watch`, `effectScope`), not on
internals, so a core rewrite arrives as free speed rather than a
migration. Peer dependency is `vue ^3.2.0`.

## 9. "Another state management library."

It manages no state. There is no store type, no action, no mutation,
no plugin bus, no devtools protocol — `Reactive()` transforms a class
prototype once and returns the same constructor you passed in. If it
were a state library it would need an API surface; instead the API is
one function and a naming convention, which is why the whole engine is
1,146 B (https://ivue.dev/guide/introduction).

## 10. "Why not just composables?"

Use composables — ivue runs on them, and any composable works inside
the constructor. The gap they leave is **anatomy plus population**: a
closure-based factory allocates its derivations per instance, so 30
plain closures cost 8.0 KB per live instance against 3.7 KB for
prototype getters, and closures compose into opaque scopes instead of
an inspectable object graph (https://ivue.dev/guide/model-layer). For
one component's local state, a composable is the right answer and
ivue adds nothing.

## 11. "Decorators do this already."

Decorators do it with per-instance machinery and a build step; ivue
does it with a prototype transform, no compiler support, and no
metadata. Concretely: a freshly constructed ivue instance measures
32.2 bytes against 31.9 bytes for a bare `{ id }` object literal —
**1.01×** — because every getter, computed and method is shared
prototype structure paid once per class (Node 26, `--expose-gc`,
100,000 instances). Decorator-based reactivity cannot reach that floor
because it installs per-instance state at construction.

## 12. "TC39 signals will make this obsolete."

The signals proposal is at **Stage 1**, and it standardizes the
primitive layer — the exact layer ivue does not implement. ivue is the
grammar above the primitives (class shape, laziness, inheritance,
teardown), so native signals landing would replace Vue's core beneath
it the way alien-signals already did: unchanged code, 196/196 tests,
faster reads. We wrote down which properties native signals should
take from this work
(https://ivue.dev/blog/what-native-signals-should-steal).

## 13. "100% coverage is easy on 1 kB."

Fair — and stated the other way, the honest version of the claim is
that a 1.1 kB engine is small enough that 100% coverage on statements,
branches, functions and lines is achievable at all: 209 tests across
seven files (`Reactive.ts`, `Static.ts`, `ivue.ts`, `kernel.ts`,
`extras.ts`, `LazyShared.ts`, `index.ts`). The number that is not easy
is the one downstream: Invar, 108,000 lines built on it by agents, with
its own suite at 100% coverage. Coverage is a floor claim, never a
correctness claim — we do not present it as one.

## 14. "License and stewardship?"

MIT, no CLA, no dual-license, no company that could re-license it out
from under you. Version 2.5.0 is published on npm with releases
documented per version, including the exact measured engine size and
test count per release (https://ivue.dev/releases). Zero runtime
dependencies means the supply-chain surface is the peer dependency on
Vue itself.

## 15. "No DevTools support."

Concession, no spin: there is no ivue DevTools plugin. What you get is
the plainer thing — instances are ordinary objects, so Vue DevTools
and the browser console show them directly, with the refs that have
actually been materialized visible on the instance and nothing hidden
behind a proxy trap. A dedicated inspector for the lazy-cell ledger is
a real gap and an open idea
(https://ivue.dev/blog/what-native-signals-should-steal), not a
shipped feature.

## 16. "Migration cost from Pinia is too high."

There is no migration: a Pinia store keeps working, and an ivue class
reaches it through one line — `protected get $store() { return
useStore() }`. Adoption is per-file, and the usual first move is one
component's logic, not a store rewrite
(https://ivue.dev/guide/getting-started). If a store later becomes an
ivue class, it publishes the same `use()` singleton shape, so
consumers change nothing (https://ivue.dev/guide/modules).

## 17. "What happens when Vue changes its reactivity internals?"

That already happened — Vue 3.6 rewrote `@vue/reactivity` on alien
signals, and ivue rode it unchanged with 196/196 tests and faster
first tracked reads (https://ivue.dev/blog/the-stack-got-faster). The
reason is a boundary choice: ivue calls only public primitives, so an
internal rewrite is Vue's problem and our benchmark. If Vue removed
`ref`/`computed`/`effectScope` from its public surface, ivue would
break — and so would every composable ever written.

## 18. "Reactive classes leak memory."

Every reactive system holds strong references, so one retained
reference keeps a graph alive — the GC's contract ends at
reachability. ivue's answer is that the model can empty itself:
`$stopEffects()` stops the instance scope and clears its cached cells,
which measured 85 MB retained versus 4.7 MB after reset in the leak
scenario (https://ivue.dev/blog/release-what-the-gc-cant). The
tradeoff is explicit: component-scoped instances are reaped by the
component, and anything that outlives a component needs a named owner
that calls it (https://ivue.dev/guide/lifecycle-teardown).

## 19. "Keyed reactivity at 20M cells is a stunt."

It is a demo of one invariant — nothing costs until it is observed —
and the invariant is documented as a reusable pattern, not a trick:
20,000,000 live cells in ~89 MB, **4.7 bytes per cell**, which is 8.5×
below a plain `{ row, col, raw }` object with no reactivity at all
(https://ivue.dev/guide/flyweight). You can build it in your browser
on the benchmarks page and watch the memory number yourself. The same
keyed-version-signal pattern runs the 1,000,000-row scroller in twelve
divs, which is production code, not a demo.

## 20. "Benchmarks are always rigged."

Correct as a prior, which is why the load-bearing ones run **in your
browser, on the shipped engine**:
https://ivue.dev/guide/benchmarks. Every number names its method
(engine, scale, runs, how the heap was read), the full protocol is
published at
https://ivue.dev/guide/benchmarks#methodology, and the controlled runs
report the median of 3–7 runs with one fresh page load per arm. Where
ivue loses, the docs print that too: a bound method call is ~4 ns
against ~1.4 ns for a raw closure.

## 21. "Is this TypeScript-only?"

The engine is plain JavaScript and works without TypeScript — getters
returning `ref()`, plain getters, methods, `Reactive()`. Two of the
standard's guarantees are compiler-enforced, though, so TS is where
the design pays fully: `noImplicitOverride` turns every subclass
touchpoint into a build error on a base rename, and the
`Instance`/`ReactiveInstance` types are what make writes through an
exposed surface typecheck (https://ivue.dev/guide/standard). In JS you
keep the runtime behavior and lose the loud-seam guarantee.

## 22. "Why should I care about the method behind it?"

Because it is the reason the numbers exist. Each of these was derived
by asking what must be true rather than adding a feature — and the
audit is mechanical: **invariants delete code, features accumulate
it**. The engine gained lazy state, method binding, inheritance,
teardown, watch APIs and a static-side dual while staying at 1.1 kB
and getting faster (https://ivue.dev/blog/win-by-reduction).

---

## The two weaknesses we volunteer

Never let a critic find these first — they are in the HN first comment
on purpose:

1. **`v-for` item cells keep explicit `.value`.** Top-level component
   state is destructured and auto-unwrapped; nested collection items
   are not, so a row cell reads `item.title.value`. This is the
   deliberate tradeoff that preserves allocation-free reads where
   lists are hottest.
2. **A bound method call is ~4 ns against ~1.4 ns for a raw closure.**
   Hoisting recovers it in profiled hot paths (destructure the method
   once inside the function); everywhere else it is noise, and the
   docs benchmark the miss.

## The three sentences that end most threads

- "Run it yourself — the benchmarks execute in your browser on the
  shipped engine: https://ivue.dev/guide/benchmarks"
- "Here is the whole contract in one document:
  https://ivue.dev/guide/standard"
- "That is a fair hit. Here is the number for it:" — then the number.
