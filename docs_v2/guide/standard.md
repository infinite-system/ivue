---
title: The Standard
description: The complete ivue operating manual — annotated class and SFC templates, DO/NEVER table, the unwrapping-surface typing invariant, watch rules, thin-closure delegation, naming guidelines, keyed reactivity, and the review checklist. The same manual we ship to AI agents.
---

# The Standard

This page ships to AI coding agents verbatim, as the `/ivue` skill —
[`.claude/skills/ivue/SKILL.md`](https://github.com/infinite-system/ivue/blob/main/.claude/skills/ivue/SKILL.md)
— because the instructions that make an agent write correct ivue turn out
to be exactly the reference a human wants open in a second tab. Everything
here is production-proven; the _why_ behind each rule lives in the guide
chapters.

# ivue (`Reactive`) — Operating Manual

Author reactive Vue 3 logic as a plain `class $X`, then export `Class = Reactive($Class)` through `namespace X`.
The engine transforms the prototype once: ref-returning getters become cached
Refs/Computeds, plain getters de-optimize to native getters (reactive via leaf
tracking), methods become stable bound functions. Instances stay plain objects.
Follow the rules below exactly — every deviation is either a compile error or a
silent no-op at runtime.

## The class template (copy this shape)

```ts
import { Reactive } from 'ivue'; // in this app: 'src/utils/ivue'
import { ref, shallowRef, computed, watch, onMounted, toRef, type Ref } from 'vue';
import { useProjectStore } from 'src/stores/project.store';

class $Box {
  // Constructor runs SYNCHRONOUSLY where you `new` — in setup() that means
  // the constructor body IS setup code, and the whole toolbox works here:
  // - plain watch/watchEffect land in the COMPONENT's scope (reaped on unmount);
  // - lifecycle hooks (onMounted, onUnmounted, …) register against the
  //   mounting component — full lifecycle access, zero wiring;
  // - callbacks delegate to methods (the thin-closure rule).
  // (this.$watch is ONLY for instances that OUTLIVE the component — see
  // the singleton variant below. Lifecycle hooks NEVER belong in those.)
  constructor(
    public props: BoxProps,
    public emit: BoxEmits,
  ) {
    watch(
      () => this.height.value,
      (height, oldHeight) => this.onResize(height, oldHeight),
    );
    onMounted(() => this.focusBox());
  }

  // MUTABLE STATE — getter returning ref()/shallowRef(). `this` is RAW: read
  // AND write via .value. shallowRef for big structures you REPLACE wholesale.
  get height() {
    return ref(4);
  }
  get rows() {
    return shallowRef<Row[]>([]);
  } // deep mutations do NOT trigger

  // TEMPLATE-REF TARGET — a ref(null); the SFC destructures it for ref="boxEl".
  get boxEl() {
    return ref<HTMLElement | null>(null);
  }

  // PROPS — plain getters, one per prop the class consumes.
  // Reactively tracked through the props proxy (leaf tracking). THE pattern for props.
  get width() {
    return this.props.width;
  }
  get title() {
    return this.props.title;
  }
  get isDisabled() {
    return this.props.disabled;
  }
  get items() {
    return toRef(() => this.props.items);
  } // when you need a ref handle

  // DERIVED — PLAIN getter, NO computed().
  // Reactive via leaf tracking; 0 bytes/instance.
  get area() {
    return this.width * this.height.value; // prop × ref — both leaf-tracked
  }
  get widthPx() {
    return this.width + 'px';
  }

  // computed() — SURGICAL opt-in only: expensive work, render-suppression by
  // value-equality, or a stable ref handle for watch/props (~300 bytes/instance).
  // THIN closures (see "computed() and watch callbacks delegate to methods"):
  // the computed only dials a method — logic stays on the
  // prototype, hot-graftable, minimum footprint.
  get sortedRows() {
    return computed(() => this.sortRows());
  }
  get celsius() {
    return ref(20);
  }
  get fahrenheit() {
    return computed({
      get: () => this.celsiusToFahrenheit(),
      set: (fahrenheit: number) => this.setFromFahrenheit(fahrenheit),
    }); // writable computed — the only way to give a COMPUTED a setter.
    // A native `get x() / set x(value)` accessor pair works too; pick the
    // computed form when the member must be a ref handle (v-model target,
    // watch source, destructured state binding).
  }

  // STORE / COMPOSABLE — `$`-getter caches WHOLE, forever, per instance.
  // Resolves on first touch (after Pinia/app ready); circular-import safe.
  private get $project() {
    return useProjectStore();
  }
  get projectId() {
    return this.$project.projectId;
  }

  // CONSTANTS / CONFIG — plain fields ONLY. A plain field written from a method
  // triggers NOTHING (no Ref/Computed, no dependency edge). Never store mutable state here.
  baseWidth = 400;

  // METHODS — plain; engine-binds to raw (stable identity, safe as handlers).
  // Reactive-closure bodies above delegate HERE (the thin-closure rule).
  grow() {
    this.height.value++;
  }

  focusBox() {
    this.boxEl.value?.focus();
  }

  sortRows() {
    return [...this.rows.value].sort(byScore);
  }

  celsiusToFahrenheit() {
    return (this.celsius.value * 9) / 5 + 32;
  }
  setFromFahrenheit(fahrenheit: number) {
    this.celsius.value = ((fahrenheit - 32) * 5) / 9;
  }

  onResize(height: number, oldHeight: number) {
    /* ... */
  }
}

export namespace Box {
  export const $Class = $Box; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
```

## The SFC wiring template (copy this shape)

```vue
<script lang="ts" setup>
import { Box } from './Box';

const props = withDefaults(defineProps<BoxProps>(), { width: 400 });
const emit = defineEmits<BoxEmits>();

// ONE raw instance — the same object drives template, emits payloads, expose.
// No reactive() wrapper, no unwrap view. Constructor runs init in setup context.
const box = new Box.Class(props, emit);

// THE STATE DESTRUCTURE — one statement, grouped. Every Ref/Computed the
// template touches is listed here; each binding IS the cached cell (stable
// identity), and setup bindings unwrap uniformly in EVERY template position.
// NEVER destructure plain getters or methods (snapshots a dead value).
const {
  // state refs
  height,
  celsius,
  // computed refs
  sortedRows,
  fahrenheit,
  // element refs
  boxEl,
} = box;

// Type the expose surface through Instance — it strips readonly so ref-writes typecheck.
defineExpose(box as Box.Instance);
</script>

<template>
  <!-- State bindings — reads AND writes compiler-unwrapped.
       fahrenheit is the writable computed: v-model writes through its setter. -->
  <input ref="boxEl" v-model.number="fahrenheit" :disabled="box.isDisabled" />
  <div v-if="height > 4">
    {{ box.title }} — {{ celsius }}°C is {{ fahrenheit }}°F
  </div>
  <ul :style="{ width: box.widthPx }">
    <li v-for="row in sortedRows" :key="row.id">{{ row.name }}</li>
  </ul>
  <!-- Plain getters and methods: DOTTED on the instance, no .value -->
  <button @click="box.grow()">grow — area {{ box.area }}</button>
</template>
```

The template's two access styles carry meaning: **a state binding = a destructured Ref/Computed**, **dotted `box.x` = a derivation or an
action** (plain getter / method) — the class's own anatomy, visible at the
call site. Rules that keep it clean:

- The destructure is TOTAL: every Ref/Computed the template touches is
  destructured; a Ref is NEVER reached through the instance in the template
  (interpolating `box.someRef` renders via display-unwrap, but
  `v-if="box.someRef"` is always-truthy — the seam the total destructure abolishes).
- In the `<script setup>` BODY, destructured bindings are refs — use
  `.value` there as everywhere else. Inside `<template>` only, the compiler
  unwraps them.
- **v-for item cells stay dotted with `.value`** (`cell.raw.value`) — you
  cannot destructure a thousand collection items; the destructure governs
  the component's own instance state.
- **Instance-swapping components keep dotted access**: if the component
  replaces its instance (`model.value = new X.Class()`), destructured
  bindings would go stale — don't destructure what you swap.
- **Don't shadow props.** A destructured state binding with the same name as
  a `defineProps` prop silently shadows it in the template (setup bindings
  win). Rare by construction: the class consumes props through prop-getters,
  so prop-derived values stay DOTTED (`box.width`, `box.widthPx`) and never
  compete with state-binding names.

## The outliving instance (module singleton, entity)

For an instance that OUTLIVES any component — a module singleton, an entity
created in a callback — watchers go in the instance's OWN scope, and the
owner of its lifetime disposes it:

```ts
class $Session {
  get user() {
    return ref<User | null>(null);
  }

  // Outliving instance: $watch/$watchEffect register in the instance's lazy
  // effectScope — there is no component scope here to reap plain watch.
  constructor() {
    this.$watch(
      () => this.user.value,
      (user, previousUser) => this.onUserChanged(user, previousUser),
    );
    this.$watchEffect(() => this.persist());
    // If constructed INSIDE some scope, auto-wire teardown instead:
    //   getCurrentScope() && onScopeDispose(() => this.$stopEffects());
  }

  // Optional hook — $stopEffects() calls this FIRST: put non-Vue cleanup
  // here (sockets, listeners from composables first-touched after setup).
  stopEffects() {
    this.disconnect();
  }

  onUserChanged(user: User | null, previousUser: User | null) {
    /* ... */
  }
  persist() {
    /* ... */
  }
  disconnect() {
    /* ... */
  }
}

export namespace Session {
  export const $Class = $Session; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

// The owner disposes: stops the scope, runs stopEffects(), clears caches.
session.$stopEffects();
```

## DO / NEVER

| DO                                                                           | NEVER                                                                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `class $X` + `export namespace X { $Class; Class = Reactive($Class); Instance }` | export a bare `Reactive(class {...})` for anything that grows a parent/dependent       |
| mutable state = `get x() { return ref(v) }`                                  | put mutable state in a plain field — writes trigger nothing                            |
| `.value` for every Ref/Computed inside the class and in the script body       | write `this.x = v` for a Ref/Computed in the class — it clobbers the ref or no-ops     |
| derive with a PLAIN getter                                                   | wrap every derivation in `computed()` — pays ~300 bytes/instance for nothing           |
| `computed()` only for expensive / render-suppressing / stable-handle needs   | reach for `computed()` by default                                                      |
| inject stores via `private get $store() { return useStore() }`               | `store = useStore()` field initializer — runs at construction, breaks tests/SSR/cycles |
| `new X.Class(props, emit)` — raw instance everywhere                         | wrap in `reactive(instance)` or any shallow-unwrap view as the standard                    |
| destructure ALL template-touched Refs/Computeds + element refs, grouped | destructure plain getters or methods — snapshots a dead value / loses nothing but clarity |
| state bindings in templates; dotted `box.x` only for plain getters/methods | reach a Ref through the instance in a template — `v-if="box.someRef"` is always-truthy |
| `defineExpose(box as X.Instance)`                                            | `defineExpose(box)` raw — readonly-accessor writes will type-error for consumers       |
| constructor runs init; register hooks/watchers there                         | add an `init()` method expecting auto-call — ivue never calls it                         |
| plain `watch` in component-scoped constructors; `$watch` + a `$stopEffects` dispose path for outliving instances | default to `this.$watch` in a component-scoped class — its scope silently outlives unmount |

## The unwrapping-surface typing invariant

Vue's expose proxy and `reactive()` unwrap ref READS and redirect ref WRITES
into `.value` at runtime — but TypeScript keeps get-only accessors `readonly`
through its homomorphic unwrap types. So a surface typed from the raw class
FORBIDS writes the runtime allows. `Instance` (= `ReactiveInstance`, i.e.
`typeof Class.Instance`) strips readonly via its writable-getter remap. It is
the TYPE of every unwrapping surface.

- Producing an exposed instance: `defineExpose(box as X.Instance)`.
- Consuming a template ref to it: `ShallowUnwrapRef<X.Instance>`
  (generic: `ShallowUnwrapRef<X.Instance<T>>`).
- Wrapping at an interop boundary: `reactive(instance as X.Instance)` (concession, not the standard).

Across expose, verified live: reads arrive unwrapped; ref-writes DO redirect
(there is a write path); methods arrive engine-bound to raw; and PLAIN GETTERS
STAY FULLY REACTIVE — `watch(() => ref.value.someDerived, cb)` fires on leaf
change. What does NOT survive: setup-time snapshots (`const v = ref.value.x`),
plain data fields (never reactive), pre-mount null (template refs are null
until mount — use `?.` in watch getters).

### Common compile errors → fixes

| Error / symptom                                                                                             | Fix                                                      |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `Cannot assign to 'x' because it is a read-only property` (on an exposed/`reactive()`/template-ref surface) | type that surface through `X.Instance`                   |
| `Type 'boolean' is not assignable to type 'Ref<boolean>'`                                                   | missing `.value` on a Ref/Computed write — `x.flag.value = true` |
| `'X' is possibly null` on a template ref in a watch getter                                                  | add `?.` — `watch(() => x.boxEl.value?.foo, cb)`            |
| template write crashes / no-ops at runtime on the raw instance                                              | you wrote `x.Ref/Computed = v`; write `x.Ref/Computed.value = v`         |

## Watch rules — and WHICH watch

| the instance is…                                              | use                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| component-scoped (created in `setup()`)                        | plain `watch` / `watchEffect` — the component scope stops them on unmount                         |
| component-outliving (module singleton, created in a callback)  | `this.$watch` / `this.$watchEffect` — the instance's lazy scope; disposed by `$stopEffects()`     |

- `watch(() => instance.plainGetter, cb)` works on a RAW instance — no `reactive()`
  wrapper, no Ref/Computed needed. The getter body runs inside the watcher's effect, so
  its leaf reads subscribe directly (non-intuitive but structural).
- The source MUST be the FUNCTION form. `watch(instance.plainGetter, cb)` passes a
  dead snapshot and never fires.
- `$stopEffects()` stops the instance scope, runs your optional `stopEffects()`
  hook, then clears cached Refs/Computeds; instances that never `$watch` allocate no
  scope. Every outliving instance needs an OWNER that calls it — or, when
  constructed inside some scope, auto-wire:
  `getCurrentScope() && onScopeDispose(() => this.$stopEffects());`
- Do NOT default to `this.$watch` in a component-scoped constructor: the
  component scope cannot see the instance scope, so without `$stopEffects`
  wiring that watcher outlives unmount.
- Lifecycle hooks (`onMounted`, `onUnmounted`, …) follow the same split: the
  constructor runs synchronously where you `new`, so in a component-scoped
  class they register against the mounting component — full setup toolbox.
  Component-coupled classes ONLY; never in stores/entities that outlive
  components. If the class is also constructed outside components, guard:
  `getCurrentInstance() && onMounted(() => this.onMount());`
- Watch CALLBACKS delegate to methods (the thin-closure rule):
  `watch(source, (newValue, oldValue) => this.onChanged(newValue, oldValue))`.

## Circular imports: immune by construction

The hoisted-namespace + getter convention makes cross-module cycles a
non-event — no ordering discipline, no `forwardRef`-style workarounds:

- Cross-references (`new Other.Class()` in a method, a store read in a
  `$`-getter) resolve at FIRST ACCESS, when every module in the cycle has
  long finished loading — any load order works.
- Each file calls `Reactive()` on its own class safely: it is idempotent per
  prototype level and HMR-safe; a shared ancestor is transformed once, by
  whichever file loads first.
- The one thing that stays impossible is circular `extends` — it evaluates
  at load time, and is logically impossible in any language, not a limit of
  the pattern.

## Generic classes (brief)

`ReactiveClass<C>` cannot carry `<T>` through (no higher-kinded types), but
`Reactive(X) === X` by identity — so cast `Class` back to the raw
constructor and apply `ReactiveInstance` explicitly for `Instance`:

```ts
class $Scroller<T extends BaseItem> {
  get items() {
    return ref<T[]>([]);
  }
}

export namespace Scroller {
  export const $Class = $Scroller;
  export const Class = Reactive($Class) as unknown as typeof $Class; // keeps <T> at `new` sites
  export type Instance<T extends BaseItem> = ReactiveInstance<$Scroller<T>>;
}
// consumer of a template ref: ShallowUnwrapRef<Scroller.Instance<T>>
```

## computed() and watch callbacks delegate to methods (HMR-streamlined)

A reactive closure's body is FROZEN at creation — it is cached per instance
and no hot update can reach inside it. A prototype lookup is evaluated at
call time — it stays live forever. So: **closures are pointers; logic lives
in methods.**

```ts
// ✅ THIN — the closure only dials a method; edits hot-graft onto LIVE
//    instances with all state preserved
get sortedItems() {
  return computed(() => this.sortItems());
}
sortItems() {
  return [...this.items.value].sort(byPrice);
}

// ✅ same rule for watch callbacks wired in constructors
watch(value, (newValue, oldValue) => this.onValueChanged(newValue, oldValue));

// ❌ FAT — logic frozen into a per-instance closure: editing this body
//    forces a component remount (the engine detects it and escalates —
//    never silently stale — but you lose live-state grafting)
get sortedItems() {
  return computed(() => [...this.items.value].sort(byPrice));
}
```

Also buys: guaranteed-minimum memory (the thin closure captures nothing but
the instance — a fat closure silently pins any getter-scope local for the
instance's lifetime) and direct testability (`instance.sortItems()`).
Reactivity is unaffected — reads inside the method are tracked through the
computed's evaluation exactly as if inlined.

Do NOT "optimize" the arrow away to `computed(this.sortItems)`: it works
(ivue methods are lazy-bound) but Vue 3.4+ passes the previous value as the
getter's first argument, so a method that later gains an optional parameter
silently receives stale data. Always the arrow.

`$`-prefixed singleton getters are frozen caches too — keep their bodies to
a single composable/service call (`return useThing()`), nothing more.

## Naming: unfold to the domain

Readable code is the product. In ivue classes the class shape already reads
like prose — don't ruin it with letter soup:

- **No single-letter or abbreviated identifiers** — including loop indices
  and callback parameters. `row`/`col`, not `r`/`c`; `cell`, `cellValue`,
  `entry`, `versionRef`, `aggregate`, `newValue`/`oldValue`, not
  `c`/`v`/`e`/`agg`/`nv`/`ov`.
- **The one-letter-many-meanings failure mode is the reason.** A file where
  `c` means cell in one method, column in the next, and cellValue in a
  third makes every reader re-derive the type system in their head. Named
  after the domain, the ambiguity cannot exist.
- **Booleans are predicates** (`isFineTier`, `hasModel`); counts say what
  they count (`observerRuns`, `releasedCount`); prior values are
  `originalX`/`previousX`, not `old`/`prev` alone.
- Abbreviate only when the abbreviation IS the domain term (`px`, `id`,
  `fx`, A1-notation like `startRow`/`endCol`).
- Tests are code — the same rules apply to specs.

```ts
// ❌ before                          // ✅ after
const v = this.cellVersions.get(k);   const versionRef = this.cellVersions.get(cellKey);
for (let r = r1; r <= r2; r++)        for (let row = startRow; row <= endRow; row++)
watch(c, (nv, ov) => …)               watch(value, (newValue, oldValue) => this.onChanged(…))
```

## Keyed reactivity — the third state shape

Ref-getters express NAMED members; `shallowRef` expresses wholesale-replaced
structures. When state is KEYED — sparse, unbounded, indexed by ids or
coordinates unknown until runtime (cells by (row,col), entities by id, rows
of a stream) — a getter per key is impossible. Hold **collections of
reactive primitives as plain values** and materialize per observation:

```ts
class $Sheet {
  // Plain readonly fields — the COLLECTIONS aren't reactive; their VALUES are.
  private readonly cellVersions = new Map<number, Ref<number>>();

  /** READ path: get-OR-CREATE, then subscribe — observation materializes. */
  private trackCell(cellKey: number): void {
    let versionRef = this.cellVersions.get(cellKey);
    if (!versionRef) {
      versionRef = ref(0);
      this.cellVersions.set(cellKey, versionRef);
    }
    void versionRef.value; // subscribes whatever effect is currently running
  }

  /** WRITE path: PEEK-ONLY — unobserved keys allocate nothing, notify no one. */
  private bumpCell(cellKey: number): void {
    const versionRef = this.cellVersions.get(cellKey);
    if (versionRef) versionRef.value++;
  }
}
```

The read/write ASYMMETRY is the pattern: reads get-or-create (cost is priced
by observation), writes peek (existence is free). Rules that keep it honest:

- Ground truth lives in plain storage (typed arrays, Maps); the refs are
  VERSION SIGNALS, not value holders — bump to invalidate, readers re-derive.
- Per-key cached computeds follow the same shape (`Map<key, ComputedRef>`),
  bodies delegating to methods (the thin-closure rule), and MUST have an explicit release/
  eviction path — keyed overlays cannot GC on their own (the Map holds
  strong refs; attached watchers subscribe permanently).
- Coarse tiers are the same pattern at lower resolution: one ref covering
  many keys (a block of rows, a whole-collection version counter) for
  subscribers that span many keys — one integer where naive design puts a
  million nodes.
- No wrapper needed: `ref()`/`computed()` are first-class values from
  `@vue/reactivity`; Maps of them inside a `Reactive()` class compose with
  everything (methods stay bound, HMR grafts, `$watch` works).

| state shape                  | expression                                            |
| ---------------------------- | ----------------------------------------------------- |
| named members                | `get x() { return ref(v) }`                           |
| wholesale-replaced structure | `get rows() { return shallowRef<Row[]>([]) }`         |
| keyed / sparse / unbounded   | `Map<key, Ref>` + get-or-create track, peek-only bump |

Same invariant at three granularities — nothing exists until observed: getters
price MEMBERS, keyed collections price KEYS. (Proven at 20M cells / 4.7
bytes each — see the flyweight grid.)

## Spacing is information

Contiguity says "same kind of thing"; a blank line says "the kind changes,
or complexity rises." Spend the signal deliberately — a blanket
newline-between-everything rule makes air mean nothing.

```ts
// state block — CONTIGUOUS: reads as the instance's STATE TABLE
get sheet() {
  return shallowRef<Sheet | null>(null);
}
get scrollTop() {
  return ref(0);
}
get editing() {
  return ref<{ row: number; col: number } | null>(null);
}

// derived block — contiguous: the windowing math as ONE visual unit
get totalHeight() {
  return Math.min(this.naturalHeight, MAX_SCROLL_HEIGHT);
}
get startRow() {
  return Math.max(0, Math.floor(this.virtualTop / ROW_HEIGHT) - OVERSCAN);
}

/** A doc comment needs air — blank line before it. */
get offsetY() {
  return this.scrollTop.value - (this.virtualTop - this.startRow * ROW_HEIGHT);
}
```

- **Declaration-like getters** (state refs, one-expression deriveds):
  contiguous within their group — a `get x() { return ref(0) }` is morally
  a field, and fields read as a struct-like table you absorb at a glance.
  The GROUP is the unit, not the member.
- **Blank line the moment a member carries a doc comment or multi-line
  logic** — comments and paragraphs of code need air.
- **Blank line + `// --- section ---` banner between categories**
  (state → derived → methods) — the boundary that actually matters.
- **Methods: always separated** — they are paragraphs, not table rows.

Not machine-enforceable (linters can't tell a ref-getter from a method, and
Prettier expands getters past the single-line exemptions) — hold it as a
convention and check it in review.

## Self-review checklist (run over your ivue diff)

- [ ] Every mutable state member is `get x() { return ref(...) }` — no mutable plain fields.
- [ ] Inside the class, every Ref/Computed read/write uses `.value`; plain fields are constants/config only.
- [ ] Derived values are PLAIN getters; `computed()` appears only for expensive / render-suppressing / stable-handle cases.
- [ ] Stores/composables are injected via `private get $store() { return useStore() }`, not field initializers.
- [ ] The class is exported through the namespace (`$Class` / `Class = Reactive($Class)` / `Instance`); generics cast `Class` and hand-apply `ReactiveInstance` to `Instance<T>`.
- [ ] The SFC does `new X.Class(...)` once — no `reactive()` wrapper, no unwrap view.
- [ ] The SFC destructures ALL template-touched Refs/Computeds + element refs (grouped: state refs / computed refs / element refs); templates use state bindings and dotted access ONLY for plain getters/methods — no Ref reached through the instance in a template, no state name shadowing a prop.
- [ ] Nothing but Refs/Computeds/element-ref targets is destructured (never plain getters/methods); v-for item cells stay dotted with `.value`; instance-swapping components don't destructure at all.
- [ ] `defineExpose(x as X.Instance)`; consumers type the ref as `ShallowUnwrapRef<X.Instance>`.
- [ ] Watch sources are the FUNCTION form; component-scoped constructors use plain `watch`/`watchEffect`; `this.$watch`/`this.$watchEffect` only for component-outliving instances — each with a dispose path (`$stopEffects()` owner or `onScopeDispose` auto-wire).
- [ ] Lifecycle hooks / init logic live in the constructor (no `init()` expecting auto-call); template refs guarded with `?.` where read pre-mount.
- [ ] Every `computed()`/constructor-watch CALLBACK delegates to a method (`computed(() => this.recalculate())`) — no logic inlined in reactive closures; the arrow form, never `computed(this.method)`.
- [ ] Identifiers are unfolded to domain words (`row`/`col`/`cell`/`cellValue`/`versionRef`…), loop indices and specs included — no single-letter names, no name meaning different things in different methods.
- [ ] Keyed/sparse state uses the Map-of-refs shape (get-or-create on read, peek-only bump on write, explicit release path) — never one getter per key, never a deep `reactive()` collection.
- [ ] Spacing carries meaning: declaration-like getters contiguous within their group; blank lines only where a doc comment / multi-line body / category boundary begins; methods always separated.
