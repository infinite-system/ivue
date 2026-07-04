---
title: Migrating from v1
description: A mechanical map from ivue v1 to v2 — and the minimal recipe. Convert only mutable state to ref-getters, leave derived getters plain, expose to templates through the iuse() shallow view, memoize surgically with computed().
---

# Migrating from v1

v1 and v2 express the same idea. The mechanical differences are small and
predictable — and smaller than they first look: **only mutable state requires
conversion.** Derived getters stay getters, methods change only where they touch
converted state, and a migrated component's template can stay byte-identical.

## The core change

| v1                                      | v2                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `ivue(MyClass, ...args)`                | `new MyClass()` (after `Reactive(MyClass)`)                                       |
| state field `x = iref(0)`               | getter `get x() { return ref(0) }`                                                |
| read `inst.x`                           | read `inst.x.value`                                                               |
| derived getter (auto-became a computed) | stays a **plain getter** — `computed()` is a per-getter opt-in, not a requirement |

```ts
// v1
class Counter {
  count = iref(0);
  get double() {
    return this.count * 2;
  }
  inc() {
    this.count++;
  }
}
const c = ivue(Counter);
c.count; // 0
```

```ts
// v2 — `double` is NOT wrapped in computed(); it only gained `.value`
// where it reads the converted state.
class $Counter {
  get count() {
    return ref(0);
  }
  get double() {
    return this.count.value * 2;
  }
  inc() {
    this.count.value++;
  }
}
const Counter = Reactive($Counter);
const c = new Counter();
c.count.value; // 0
```

## The minimal recipe

Conversion effort scales with a class's **mutable-state surface**, not its line
count. Member by member:

| member kind                                | work needed                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| mutable state field                        | → `get x() { return ref(init) }` + `.value` at use sites — **the only mandatory churn** |
| derived getter                             | keep as a plain getter; touch only lines that read converted state                      |
| getter/setter pair                         | keep — the engine de-optimizes it and preserves the setter                              |
| method                                     | edit only lines that touch converted state                                              |
| constants, config objects, injected stores | keep as plain fields                                                                    |
| template-ref holder                        | → `get el() { return ref(null) }`, destructured off the raw instance in the SFC         |

Why plain derived getters stay fully reactive: on first access the engine sees
the getter return a non-ref and **de-optimizes** it back to a native prototype
getter — from then on it is ordinary JavaScript. Vue's tracking
never needed a `computed()` node in the middle: when a render effect calls the
getter chain, execution is synchronous inside that effect, so every reactive
**leaf** it reads — props, refs via `.value`, reactive objects, stores —
subscribes the effect directly. A source changes → the effect re-runs → the
getters re-derive. Dependencies are re-collected on every run, so conditional
branches always track the branch they last took.

::: tip Validated at scale
A 2,100-line production player class migrated by converting ~25 state fields.
Its ~60 derived getters and the component's entire template needed no changes.
:::

## Derive-on-render, memoize surgically

Plain derived getters give a component a **React-like render model**: each time
a render runs, everything it touches is re-derived from current state — no
staleness, no cache invalidation to reason about. Unlike React, **Vue's
fine-grained invalidation still decides _when_ a render happens**, so only
components whose dependencies changed re-derive at all. You get React's
simplicity inside the render, Vue's precision around it.

Then tighten surgically — `computed()` is your `useMemo`. Wrap a getter when:

- the derivation is genuinely **expensive** (filtering/sorting large arrays,
  heavy string building);
- an unchanged result should **suppress re-renders** — a Vue 3.4+ computed stops
  propagation when the recomputed value is equal, a plain getter cannot;
- you need a **stable ref identity** to hand to `watch`, a prop, or a composable.

The measured trade (2M-op benchmarks): when a dependency actually changed, a
plain-getter chain and a computed chain cost about the same (~300 ns — the
computed swaps re-derivation cost for graph bookkeeping). The computed only wins
the **clean** read — ~2 ns cache hit vs ~120 ns re-derivation — which in a
template amortizes to microseconds per render. Meanwhile every eager
`computed()` is a per-instance allocation paid at creation, read or not.
Default to plain; memoize where a profile or a render-suppression need says so.

## The template boundary: `iuse()`

Templates want to read state without `.value` and let `v-model` write into
refs. That sugar does **not** require `reactive()` — wrapping the instance in
a deep reactive proxy re-introduces exactly the per-read proxy cost v2 avoids.
Use `iuse()` instead: a shallow ref-unwrapping view, the same treatment Vue
gives a `setup()` return, at a fraction of the cost.

```vue
<script setup>
import { iuse } from 'ivue'

const raw = new Player.Class(props, model, emit)
const player = iuse(raw) // shallow view — the instance stays completely raw
player.init() // v2 has no auto-init — call lifecycle explicitly in setup

// Template-ref targets: getters on the RAW instance return the actual refs.
const { scroller, videoEl } = raw
defineExpose(player)
</script>
```

What each member kind does through the view:

- **ref-returning getters** — auto-unwrapped on read; assignment redirects
  into `.value`, so `v-model="player.menuShown"` works.
- **plain derived getters** — run on the raw instance inside the reading
  effect. They are reactive **by leaf tracking alone**: the render effect
  subscribes to the refs/props/stores the getter reads. No wrapper of any
  kind was ever what made them reactive.
- **methods** — engine-bound to the raw instance. The view answers
  `__v_raw`, so `toRaw()` sees straight through it.

A template that only binds refs, computeds, and methods (no plain getters)
can skip the view entirely — destructure off the raw instance and let
setup-return unwrapping do the rest. Plain getters are the reason `iuse()`
exists: destructuring them would snapshot a dead value.

::: warning Earlier revisions of this guide suggested `reactive(raw)` here
That works, but pays Vue's deep-proxy tax on every template read and
deep-wraps returned objects. `iuse()` replaces it. Migrating is one line.
:::

## Two passes

1. **Correctness pass — this is the whole migration.** Convert state fields to
   ref-getters and let the type-checker walk you to every `.value` site
   (`Ref<number>` arithmetic errors surface every miss). Replace raw `watch()`
   with `this.$watch`. Verify behavior; ship.
2. **Perf pass — optional, later.** Profile. Wrap the few hot or
   render-suppressing derived getters in `computed()`. A local, per-getter
   decision — nothing else moves.

Adopt `Reactive()` for brand-new classes immediately; migrate existing v1
classes opportunistically as you touch them.

## What v2 drops on purpose

- **`init()`** — no auto-call; use the constructor, or call your own `init()`
  explicitly from `setup()` (lifecycle belongs to the component).
- **`.toRefs()`** — unnecessary: getters already _are_ refs, so
  `const { count } = raw` gives you the ref directly.
- **`.clone()` / `propsWithDefaults` deep clone** — not built into the core. v2
  ships `propsWithDefaults(defaults, typed, cloner?)` using `structuredClone` by
  default, with a `cloner` override (pass lodash `cloneDeep` for class-instance
  or function defaults). Port `clone()` yourself if you rely on it.

## What v2 adds

- **`$watch`** — scoped watcher (use instead of raw `watch`).
- **`$stopEffects`** — deterministic teardown.
- the **namespace module pattern** — cross-file hierarchies + circular-import
  safety ([Modules](/guide/modules)).

## Behavioral notes

- Instances are **plain** (`isReactive(inst) === false`) and stay plain: the
  template reads them through the `iuse()` shallow view. All reads and writes
  resolve to one raw-anchored store per instance.
- A getter at one level + setter at another are **not merged** (native JS
  semantics). Use a single getter returning a writable computed instead
  ([Inheritance](/guide/inheritance#one-difference-from-native-js-and-v1)).
- Mutable state **must** live in ref cells. A plain field written from a method
  (a raw write) triggers nothing — no dependency edge exists. The plain fields
  that remain after migration should be constants and configuration.
