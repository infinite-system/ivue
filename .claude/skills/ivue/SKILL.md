---
name: ivue
description: Use when writing or editing ivue `Reactive()` classes, converting a Vue component or composable to ivue, or resolving any `.value`-in-template, `defineExpose`/`reactive()` instance-typing, `ReactiveInstance`/`Instance`, `$watch`/`$watchEffect`, or namespace-export question — the operating manual for Vue 3 class-based reactivity where state is ref-getters, derived values are plain getters, and Refs/Computeds are `.value` everywhere.
---

# ivue `Reactive`

Author reactive Vue 3 logic as a plain `class $X`, then export `Class = Reactive($Class)` through `namespace X`.
The engine transforms the prototype once: ref-returning getters become cached
Refs/Computeds, plain getters de-optimize to native getters (reactive via leaf
tracking), methods become stable bound functions. Instances stay plain objects.
Follow the rules below exactly — every deviation is either a compile error or a
silent no-op at runtime.

## Setup — ivue must be installed

`import { Reactive } from 'ivue'` resolves only when the package is a
dependency. Before writing ivue code, check `package.json` for `ivue`; if it
is missing, install it with the project's package manager:

```sh
npm install ivue   # or: yarn add ivue / pnpm add ivue / bun add ivue
```

Some apps vendor the engine instead — a local module such as
`src/utils/ivue.ts` re-exporting `Reactive`. If one exists, import from that
path and skip the install; never add the dependency alongside a vendored copy.

## The class template (copy this shape)

```ts
import { Reactive } from 'ivue'; // in this app: 'src/utils/ivue'
import {
  ref,
  shallowRef,
  computed,
  watch,
  onMounted,
  toRef,
  type Ref,
} from 'vue';
import { useProjectStore } from 'src/stores/project.store';

class $Box {
  // Constructor runs SYNCHRONOUSLY where you `new` — in setup() that
  // means the constructor body IS setup code, and the whole toolbox
  // works here:
  // - plain watch/watchEffect land in the COMPONENT's scope (reaped
  //   on unmount);
  // - lifecycle hooks (onMounted, onUnmounted, …) register against
  //   the mounting component — full lifecycle access, zero wiring;
  // - callbacks delegate to methods (the thin-closure rule).
  // (this.$watch is ONLY for instances that OUTLIVE the component —
  // see the singleton variant below. Lifecycle hooks NEVER belong in
  // those.)
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

  // MUTABLE STATE — getter returning ref()/shallowRef(). `this` is
  // RAW: read AND write via .value. shallowRef for big structures you
  // REPLACE wholesale.
  get height() {
    return ref(4);
  }
  get rows() {
    return shallowRef<Row[]>([]);
  } // deep mutations do NOT trigger

  // TEMPLATE-REF TARGET — a ref(null); the SFC destructures it for
  // ref="boxEl".
  get boxEl() {
    return ref<HTMLElement | null>(null);
  }

  // PROPS Pattern — plain getters, one per prop the class consumes.
  // Reactively tracked through the props proxy (leaf tracking).
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

  // The pattern's extra capability: refine the SUPPLIED prop into
  // the prop the template actually needs — mixing other props, state,
  // and constants, all still leaf-tracked. The template reads the
  // refinement, never the raw prop; the prop is an INPUT to the
  // model, not wired to the view.
  get displayTitle() {
    return this.title || `Box ${this.width}×${this.height.value}`;
  }

  // DERIVED — PLAIN getter, NO computed().
  // Reactive via leaf tracking; 0 bytes/instance.
  get area() {
    // prop × ref — both leaf-tracked
    return this.width * this.height.value;
  }
  get widthPx() {
    return this.width + 'px';
  }

  // computed() — SURGICAL opt-in only: expensive work,
  // render-suppression by value-equality, or a stable ref handle for
  // watch/props (~300 bytes/instance). THIN closures (see "computed()
  // and watch callbacks delegate to methods"): the computed only
  // dials a method — logic stays on the prototype, directly testable,
  // minimum footprint.
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
    // A native `get x() / set x(value)` accessor pair works too;
    // pick the computed form when the member must be a ref handle
    // (v-model target, watch source, destructured state binding).
  }

  // STORE / COMPOSABLE — `$`-getter caches WHOLE, forever, per
  // instance. Resolves on first touch (after Pinia/app ready);
  // circular-import safe.
  private get $project() {
    return useProjectStore();
  }
  get projectId() {
    return this.$project.projectId;
  }

  // CONSTANTS / CONFIG — plain fields ONLY. A plain field written
  // from a method triggers NOTHING (no Ref/Computed, no dependency
  // edge). Never store mutable state here.
  baseWidth = 400;

  // METHODS — plain; engine-binds to raw (stable identity, safe as
  // handlers). Reactive-closure bodies above delegate HERE (the
  // thin-closure rule).
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
  export let Class = Reactive($Class); // reactive — you `new` this
  // the type of every unwrapping surface (defineExpose, reactive())
  export type Instance = typeof Class.Instance;
}
```

### The optional `Model` line (domain entity graphs)

When classes hold and pass RAW instances of each other — entity
collections, method parameters, factory returns — the namespace grows a
fourth line:

```ts
export namespace Task {
  export const $Class = $Task;
  export let Class = Reactive($Class);
  // raw-instance type — collections, parameters, returns
  export type Model = InstanceType<typeof Class>;
  // the type of every unwrapping surface (defineExpose, reactive())
  export type Instance = typeof Class.Instance;
}
```

`Model` is the raw-instance type (Refs stay Refs; `.value` access) —
use it for `shallowRef<Task.Model[]>` collections and
`workloadPercent(member: Member.Model)` parameters. `Instance` remains
ONLY for unwrapping surfaces (defineExpose, reactive(), template refs);
never type a raw collection with it.

## The SFC wiring template (copy this shape)

```vue
<script lang="ts" setup>
import { Box } from './Box';

const props = withDefaults(defineProps<BoxProps>(), { width: 400 });
const emit = defineEmits<BoxEmits>();

// ONE raw instance — the same object drives template, emits
// payloads, and expose. No reactive() wrapper, no unwrap view. The
// constructor runs init in setup context.
const box = new Box.Class(props, emit);

// THE STATE DESTRUCTURE — one statement, grouped. Every Ref/Computed
// the template touches is listed here; each binding IS the cached
// cell (stable identity), and setup bindings unwrap uniformly in
// EVERY template position. NEVER destructure plain getters or
// methods (snapshots a dead value).
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

// Type the expose surface through Instance — it strips readonly so
// ref-writes typecheck.
defineExpose(box as Box.Instance);
</script>

<template>
  <!-- State bindings — reads AND writes compiler-unwrapped.
       fahrenheit is the writable computed: v-model writes through
       its setter. -->
  <input
    ref="boxEl"
    v-model.number="fahrenheit"
    :disabled="box.isDisabled"
  />
  <div v-if="height > 4">
    {{ box.displayTitle }} — {{ celsius }}°C is {{ fahrenheit }}°F
  </div>
  <ul :style="{ width: box.widthPx }">
    <li v-for="row in sortedRows" :key="row.id">{{ row.name }}</li>
  </ul>
  <!-- Plain getters and methods: DOTTED on the instance, no .value -->
  <button @click="box.grow()">grow — area {{ box.area }}</button>
</template>
```

## One template, one logic owner

Every behavioral SFC has exactly one ivue class as its template logic owner.
`<script setup>` is the wiring boundary only:

- import dependencies;
- call compiler macros (`defineProps`, `defineEmits`, `defineExpose`);
- construct `new X.Class(...)` once;
- destructure the Ref/Computed bindings the template consumes.

Do not place component-local `ref`, `computed`, `watch`, lifecycle hooks, or
free functions beside that instance. State belongs in ref-getters, derivations
belong in plain getters, setup work belongs in the constructor, and event
handlers belong in methods — even when the handler only normalizes a DOM event
before delegating to a domain model.

When building on a class-backed component, **extend its class, not its
`<script setup>`**. Add behavior to the existing class when it belongs to the
same component contract. When it is a real specialization, subclass the raw
class and publish the normal namespace:

```ts
class $SearchBox extends Box.$Class {
  clearSearch() {
    this.search.value = '';
  }
}

export namespace SearchBox {
  export const $Class = $SearchBox;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

Never create a parallel behavior layer of setup functions around an existing
class. That splits ownership, hides behavior from inheritance, and makes the
template depend on two architectures.

A genuinely markup-only leaf may remain classless; do not manufacture an
empty class for static presentation. The moment the component owns state,
derivation, setup behavior, or an event handler, it has crossed the boundary
and needs one class.

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
- **The remaining `.value` boundary:** top-level component state is
  destructured and auto-unwrapped. Collection items and slot props are nested
  values, so Vue does not auto-unwrap their Ref fields; use
  `item.title.value`. This is ivue's principal syntax tradeoff, preserving
  direct, allocation-free reads where lists are hottest.
- Perf escape (measured): a METHOD called in a render-hot path (per row of
  a large v-for) may be destructured — methods are identity-stable and the
  hoisted call runs at closure speed (~1.4 vs ~4 ns dotted). Reserve it for
  profiled hot paths; everywhere else methods stay dotted (the naming signal).
- **Instance-swapping components keep dotted access**: if the component
  replaces its instance (`model.value = new X.Class()`), destructured
  bindings would go stale — don't destructure what you swap.
- **Don't shadow props.** A destructured state binding with the same name as
  a `defineProps` prop silently shadows it in the template (setup bindings
  win). Rare by construction: the class consumes props through prop-getters,
  so prop-derived values stay DOTTED (`box.width`, `box.widthPx`) and never
  compete with state-binding names.
- **No logic in template expressions — name it as a derived getter.**
  `v-if="items.length && !loading && mode === 'edit'"` is an anti-pattern:
  the condition has no name, duplicates across call sites, and its pieces
  can't be tested. Every combination, comparison or ternary lives on the
  class as a PLAIN getter whose name says what the condition MEANS —
  `v-if="box.canEditItems"`. When the condition takes an argument (per-item
  in a `v-for`), the same rule wears its method form —
  `v-if="media.fileExists(index)"` — still a name, still no inline logic.
  In ordinary Vue this discipline costs a `computed()` per condition, so
  nobody keeps it; here a named plain getter costs zero bytes, so there is
  no excuse. Templates read as prose: bindings, names, and events — never
  expressions.

## The outliving instance (module singleton, entity)

For an instance that OUTLIVES any component — a module singleton, an entity
created in a callback — watchers go in the instance's OWN scope, and the
owner of its lifetime disposes it:

```ts
class $Session {
  get user() {
    return ref<User | null>(null);
  }

  // Outliving instance: $watch/$watchEffect register in the
  // instance's lazy effectScope — there is no component scope here
  // to reap plain watch.
  constructor() {
    this.$watch(
      () => this.user.value,
      (user, previousUser) => this.onUserChanged(user, previousUser),
    );
    this.$watchEffect(() => this.persist());
    // If constructed INSIDE some scope, auto-wire teardown instead:
    //   getCurrentScope() && onScopeDispose(() => this.$stopEffects());
  }

  // CLEANUP composes as an ORDINARY method — no hooks, no reserved
  // names, ivue never auto-calls your code. Do the non-Vue work
  // (sockets, listeners from composables), then reset the engine.
  dispose() {
    this.disconnect();
    this.$stopEffects();
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
  export let Class = Reactive($Class); // reactive — you `new` this
  // the type of every unwrapping surface (defineExpose, reactive())
  export type Instance = typeof Class.Instance;
}

// The owner disposes — the class's own method, like any other:
session.dispose();
```

## DO / NEVER

| DO | NEVER |
| --- | --- |
| ✅ `class $X` + `export namespace X { $Class; Class = Reactive($Class); Instance }` | ❌ export a bare `Reactive(class {...})` for anything that grows a parent/dependent |
| ✅ mutable state = `get x() { return ref(v) }` | ❌ put mutable state in a plain field — writes trigger nothing |
| ✅ `.value` for every Ref/Computed inside the class and in the script body | ❌ write `this.x = v` for a Ref/Computed in the class — it clobbers the ref or no-ops |
| ✅ derive with a PLAIN getter | ❌ wrap every derivation in `computed()` — pays ~300 bytes/instance for nothing |
| ✅ `computed()` only for expensive / render-suppressing / stable-handle needs | ❌ reach for `computed()` by default |
| ✅ inject stores via `private get $store() { return useStore() }` | ❌ `store = useStore()` field initializer — runs at construction, breaks tests/SSR/cycles |
| ✅ `new X.Class(props, emit)` — raw instance everywhere | ❌ wrap in `reactive(instance)` or any shallow-unwrap view as the standard |
| ✅ destructure ALL template-touched Refs/Computeds + element refs, grouped | ❌ destructure plain getters or methods — snapshots a dead value / loses nothing but clarity |
| ✅ state bindings in templates; dotted `box.x` only for plain getters/methods | ❌ reach a Ref through the instance in a template — `v-if="box.someRef"` is always-truthy |
| ✅ `defineExpose(box as X.Instance)` | ❌ `defineExpose(box)` raw — readonly-accessor writes will type-error for consumers |
| ✅ constructor runs init; register hooks/watchers there | ❌ add an `init()` method expecting auto-call — ivue never calls it |
| ✅ plain `watch` in component-scoped constructors; `$watch` + a `$stopEffects` dispose path for outliving instances | ❌ default to `this.$watch` in a component-scoped class — its scope silently outlives unmount |
| ✅ compose cleanup as an ordinary method — `dispose() { /* non-Vue cleanup */ this.$stopEffects(); }` | ❌ expect a teardown hook — ivue auto-calls NOTHING (no `init()`, no `stopEffects()`) |

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

| Error / symptom | Fix |
| --- | --- |
| ❌ `Cannot assign to 'x' because it is a read-only property` (on an exposed/`reactive()`/template-ref surface) | ✅ type that surface through `X.Instance` |
| ❌ `Type 'boolean' is not assignable to type 'Ref<boolean>'` | ✅ missing `.value` on a Ref/Computed write — `x.flag.value = true` |
| ❌ `'X' is possibly null` on a template ref in a watch getter | ✅ add `?.` — `watch(() => x.boxEl.value?.foo, cb)` |
| ❌ template write crashes / no-ops at runtime on the raw instance | ✅ you wrote `x.Ref/Computed = v`; write `x.Ref/Computed.value = v` |

## Watch rules — and WHICH watch

| the instance is…                                              | use                                                                                           |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| component-scoped (created in `setup()`)                       | plain `watch` / `watchEffect` — the component scope stops them on unmount                     |
| component-outliving (module singleton, created in a callback) | `this.$watch` / `this.$watchEffect` — the instance's lazy scope; disposed by `$stopEffects()` |

- `watch(() => instance.plainGetter, cb)` works on a RAW instance — no `reactive()`
  wrapper, no Ref/Computed needed. The getter body runs inside the watcher's effect, so
  its leaf reads subscribe directly (non-intuitive but structural).
- The source MUST be the FUNCTION form. `watch(instance.plainGetter, cb)` passes a
  dead snapshot and never fires.
- `$stopEffects()` stops the instance scope and clears cached Refs/Computeds;
  instances that never `$watch` allocate no scope. There are NO hooks — richer
  cleanup is an ordinary method that does its work and then calls
  `$stopEffects()` itself. Every outliving instance needs an OWNER that calls
  it — or, when constructed inside some scope, auto-wire:
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

## Circular references resolve by construction

The hoisted-namespace + getter convention makes late cross-module references
safe without ordering discipline or `forwardRef`-style workarounds:

- Cross-references (`new Other.Class()` in a method, a store read in a
  `$`-getter) resolve at FIRST ACCESS, when every module in the cycle has
  long finished loading — any load order works.
- Each file calls `Reactive()` on its own class safely: it is idempotent per
  prototype level; a shared ancestor is transformed once, by
  whichever file loads first.
- Eager top-level dereferences can still fail; the convention keeps
  cross-references inside late method and getter bodies. Circular `extends`
  stays impossible because it evaluates at load time and both parents cannot
  exist first.

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
  // the cast keeps <T> available at `new` sites
  export let Class = Reactive($Class) as unknown as typeof $Class;
  export type Instance<T extends BaseItem> =
    ReactiveInstance<$Scroller<T>>;
}
// consumer of a template ref: ShallowUnwrapRef<Scroller.Instance<T>>
```

## computed() and watch callbacks delegate to methods

A reactive closure is cached per instance. Keep that closure as a small
pointer to behavior on the prototype: **closures connect; methods contain
logic.**

```ts
// ✅ THIN — the closure only delegates; logic stays named and testable
get sortedItems() {
  return computed(() => this.sortItems());
}
sortItems() {
  return [...this.items.value].sort(byPrice);
}

// ✅ same rule for watch callbacks wired in constructors
watch(value, (newValue, oldValue) =>
  this.onValueChanged(newValue, oldValue),
);

// ❌ FAT — logic is anonymous and duplicated inside the cached closure
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
// ❌ const v = this.cellVersions.get(k);
// ✅ const versionRef = this.cellVersions.get(cellKey);

// ❌ for (let r = r1; r <= r2; r++)
// ✅ for (let row = startRow; row <= endRow; row++)

// ❌ watch(c, (nv, ov) => …)
// ✅ watch(value, (newValue, oldValue) => this.onChanged(…))
```

## Keyed reactivity — the third state shape

Ref-getters express NAMED members; `shallowRef` expresses wholesale-replaced
structures. When state is KEYED — sparse, unbounded, indexed by ids or
coordinates unknown until runtime (cells by (row,col), entities by id, rows
of a stream) — a getter per key is impossible. Hold **collections of
reactive primitives as plain values** and materialize per observation:

```ts
class $Sheet {
  // Plain readonly fields — the COLLECTIONS aren't reactive;
  // their VALUES are.
  private readonly cellVersions = new Map<number, Ref<number>>();

  /**
   * READ path: get-OR-CREATE, then subscribe — observation
   * materializes.
   */
  private trackCell(cellKey: number): void {
    let versionRef = this.cellVersions.get(cellKey);
    if (!versionRef) {
      versionRef = ref(0);
      this.cellVersions.set(cellKey, versionRef);
    }
    // subscribes whatever effect is currently running
    void versionRef.value;
  }

  /**
   * WRITE path: PEEK-ONLY — unobserved keys allocate nothing,
   * notify no one.
   */
  private bumpCell(cellKey: number): void {
    const versionRef = this.cellVersions.get(cellKey);
    if (versionRef) versionRef.value++;
  }
}
```

The read/write ASYMMETRY is the pattern: reads get-or-create (cost is priced
by observation), while writes to unobserved keys allocate no signal. Rules that keep it honest:

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
  everything (methods stay bound and `$watch` works).

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
  return Math.floor(this.virtualTop / ROW_HEIGHT);
}

/** A doc comment needs air — blank line before it. */
get offsetY() {
  const windowTop = this.virtualTop - this.startRow * ROW_HEIGHT;
  return this.scrollTop.value - windowTop;
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
- [ ] `<script setup>` is wiring only: no component-local Ref/Computed, watcher, lifecycle hook, or free function beside the class instance; extend an existing class-backed component through its class, never through parallel setup behavior.
- [ ] The SFC destructures ALL template-touched Refs/Computeds + element refs (grouped: state refs / computed refs / element refs); templates use state bindings and dotted access ONLY for plain getters/methods — no Ref reached through the instance in a template, no state name shadowing a prop.
- [ ] Template expressions carry NO logic — every `&&`/`||`/comparison/ternary condition is a NAMED plain getter, or a NAMED method when it takes an argument (`v-if="box.canEditItems"`, `v-if="media.fileExists(index)"` — never `v-if="a && b"`).
- [ ] Nothing but Refs/Computeds/element-ref targets is destructured (never plain getters/methods); v-for item cells stay dotted with `.value`; instance-swapping components don't destructure at all.
- [ ] `defineExpose(x as X.Instance)`; consumers type the ref as `ShallowUnwrapRef<X.Instance>`.
- [ ] Watch sources are the FUNCTION form; component-scoped constructors use plain `watch`/`watchEffect`; `this.$watch`/`this.$watchEffect` only for component-outliving instances — each with a dispose path (`$stopEffects()` owner or `onScopeDispose` auto-wire).
- [ ] Lifecycle hooks / init logic live in the constructor (no `init()` expecting auto-call); template refs guarded with `?.` where read pre-mount.
- [ ] Every `computed()`/constructor-watch CALLBACK delegates to a method (`computed(() => this.recalculate())`) — no logic inlined in reactive closures; the arrow form, never `computed(this.method)`.
- [ ] Identifiers are unfolded to domain words (`row`/`col`/`cell`/`cellValue`/`versionRef`…), loop indices and specs included — no single-letter names, no name meaning different things in different methods.
- [ ] Keyed/sparse state uses the Map-of-refs shape (get-or-create on read, peek-only bump on write, explicit release path) — never one getter per key, never a deep `reactive()` collection.
- [ ] Spacing carries meaning: declaration-like getters contiguous within their group; blank lines only where a doc comment / multi-line body / category boundary begins; methods always separated.
