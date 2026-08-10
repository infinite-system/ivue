---
title: Computed Seed Pattern
description: A ref-getter whose initial value is derived through the instance's own logic — lazy, inheritance-aware, and valid from the first read. State born obeying its contract.
---

# Computed Seed Pattern — state born valid

A ref-getter's body runs **once, at first touch, with full `this`**. That
means the seed of a state member can be *computed* — through the
instance's options, its derived getters, even its overridable methods —
instead of being a literal:

```ts
class $SplitterModel {
  constructor(readonly options: SplitterModelOptions) {}

  /** Always inside [minimumSize, maximumSize] — even an out-of-range
   *  initialSize starts valid, because the seed is pre-clamped. */
  get size() {
    return ref(this.clamp(this.options.initialSize));
  }

  get mode() {
    return this.options.mode ?? 'cells';
  }

  get minimumSize(): number {
    // Bounds may be LIVE — number or function, resolved at call time.
    if (typeof this.options.minimumSize === 'function') {
      return this.options.minimumSize();
    }
    return this.options.minimumSize ?? 0;
  }

  protected clamp(size: number): number {
    return Math.max(this.minimumSize, Math.min(this.maximumSize, size));
  }
}
```

One line — `ref(this.clamp(this.options.initialSize))` — stacks three
properties that closure-based reactivity cannot express.

## 1. The seed is derived through the object's own logic, lazily

The ref does not exist at construction. When the first reader touches
`size`, the seed runs with the whole instance available: `clamp()` reads
`minimumSize`/`maximumSize` — which may themselves be **functions**
resolved live — through `mode`, which is derived from other options. The
initial value flows through the instance's real derivation chain.

The composable equivalent is eager and hand-threaded:

```ts
// Regular Vue — every piece wired by hand, at call time, eagerly:
const size = ref(clamp(options.initialSize, resolveMin(options), resolveMax(options)));
```

Every call site re-assembles the wiring, and if a bound is dynamic you
are already restructuring.

## 2. State initialization participates in inheritance

Because the ref-getter lives on the **prototype**, a subclass that
overrides `clamp()` — or just `minimumSize` — changes the *birth value*
of the inherited state member:

```ts
class $RatioSplitter extends SplitterModel.$Class {
  // The inherited `size` member now seeds through THIS clamp.
  protected override clamp(size: number): number {
    return Math.max(0, Math.min(1, super.clamp(size)));
  }
}
```

A composable cannot do this at all: its state is sealed inside a closure
the moment it is called. Here, state members are effectively **virtual**
— JavaScript dispatches the override even though the getter was declared
on the parent.

## 3. The invariant holds from birth

"A reported size stays within its bounds" is true on the **first read**.
There is no mount-time watcher fixing up an out-of-range persisted value,
no window where the state is briefly invalid, no
`onMounted(() => (size.value = clamp(size.value)))` repair step. A whole
class of startup bugs — state that is wrong until something corrects it —
is deleted, because the correcting logic runs *inside* the seed.

This is the pattern's sharpest use: **re-hydrating persisted state.** A
value saved last session under different bounds (a smaller window, an
older config) passes through the live contract on its way in:

```ts
get panelWidth() {
  return ref(this.clamp(this.settings.readNumber('panelWidth', 30)));
}
```

## The boundary: a seed runs once

The seed expression is **not tracked**. It runs inside `ref()` creation,
at first touch, and never again — later changes to its inputs do *not*
re-run it. That is the point (it is *state*, owned by writers from then
on), but it is also the line between this pattern and a `computed()`:

| You want | Use |
| --- | --- |
| An initial value derived through instance logic, then owned by writers | **Computed seed** — `get x() { return ref(this.derive(...)) }` |
| A value that continuously re-derives from its inputs | `computed()` or a plain getter |

If you find yourself wanting the seed to "update when options change,"
you wanted a `computed()` — or a writable computed if users also set it.

One timing note: *whoever touches first, materializes*. The seed runs in
the first reader's context — in practice irrelevant (the seed reads only
instance state), but keep seeds free of side effects and environment
assumptions, exactly as you would a constructor.

## Where it comes from

Distilled from [Invar](https://github.com/infinite-system/invar)'s
`SplitterModel` — a pure, renderer-free drag model whose contract
("a reported size stays within its live effective bounds") is enforced by
invariant records, with the computed seed guaranteeing the contract from
the first read. The full class —
[`SplitterModel.ts`](https://github.com/infinite-system/invar/blob/main/src/modules/layout/SplitterModel.ts)
— is ~150 lines and unit-tests with plain numbers.
