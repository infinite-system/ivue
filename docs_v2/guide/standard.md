---
title: The Standard (Operating Manual)
description: The complete ivue operating manual — annotated class and SFC templates, DO/NEVER table, the unwrapping-surface typing law with error fixes, watch rules, and a review checklist. The same manual we ship to AI agents.
---

# The Standard — ivue Operating Manual

This page is the library's operating manual, verbatim. It is the same
document we ship to AI coding agents as the `/ivue` skill
(`.claude/skills/ivue/SKILL.md`) — because the instructions that make an
agent write correct ivue turn out to be exactly the reference a human
wants open in a second tab. Everything here is production-proven; the
*why* behind each rule lives in the guide chapters.

# ivue (`Reactive`) — Operating Manual

Author reactive Vue 3 logic as a plain `class $X`, then export `Reactive($X)`.
The engine transforms the prototype once: ref-returning getters become cached
Refs/Computeds, plain getters de-optimize to native getters (reactive via leaf
tracking), methods become stable bound functions. Instances stay plain objects.
Follow the rules below exactly — every deviation is either a compile error or a
silent no-op at runtime.

## 1. The class template (copy this shape)

```ts
import { Reactive } from 'ivue'; // in this app: 'src/utils/ivue'
import { ref, shallowRef, computed, toRef, type Ref } from 'vue';
import { useProjectStore } from 'src/stores/project.store';

class $Box {
  // Constructor IS init — there is no init() method. Args are props/model/emit.
  // Lifecycle hooks + watchers registered here run in setup() context.
  constructor(
    public props: BoxProps,
    public emit: BoxEmits,
  ) {
    this.$watch(
      () => this.w.value,
      (w) => this.onResize(w),
    ); // scoped watcher
  }

  // MUTABLE STATE — getter returning ref()/shallowRef(). `this` is RAW: read
  // AND write via .value. shallowRef for big structures you REPLACE wholesale.
  get w() {
    return ref(4);
  }
  get rows() {
    return shallowRef<Row[]>([]);
  } // deep mutations do NOT trigger

  // TEMPLATE-REF TARGET — a ref(null); the SFC destructures it for ref="el".
  get el() {
    return ref<HTMLElement | null>(null);
  }

  // PROPS — plain getters; tracked through the props proxy (leaf tracking).
  get width() {
    return this.props.width;
  }
  get items() {
    return toRef(() => this.props.items);
  } // when you need a ref handle

  // DERIVED — PLAIN getter, NO computed(). Reactive via leaf tracking; 0 bytes/instance.
  get area() {
    return this.w.value * this.rows.value.length;
  }
  get widthPx() {
    return this.width + 'px';
  }

  // computed() — SURGICAL opt-in only: expensive work, render-suppression by
  // value-equality, or a stable ref handle for watch/props (~300 bytes/instance).
  get sorted() {
    return computed(() => [...this.rows.value].sort(byScore));
  }
  get celsius() {
    return ref(20);
  }
  get fahrenheit() {
    return computed({
      get: () => (this.celsius.value * 9) / 5 + 32,
      set: (f: number) => {
        this.celsius.value = ((f - 32) * 5) / 9;
      },
    }); // writable computed = the ONLY way to pair a get+set on one member
  }

  // STORE / COMPOSABLE — `$`-getter caches WHOLE, forever, per instance (A9).
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
  grow() {
    this.w.value++;
  }
  onResize(w: number) {
    /* ... */
  }
}

// NAMESPACE EXPORT — $Class = raw (children `extends` it); Class = Reactive()
// (you `new` it — same constructor by identity); Instance = the writable type.
export namespace Box {
  export const $Class = $Box;
  export const Class = Reactive($Box);
  export type Instance = typeof Class.Instance;
}
```

## 2. The SFC wiring template (copy this shape)

```vue
<script lang="ts" setup>
import { Box } from './Box';

const props = withDefaults(defineProps<BoxProps>(), { width: 400 });
const model = defineModel<Data>('modelValue', { required: true });
const emit = defineEmits(['change']);

// ONE raw instance — the same object drives template, emits payloads, expose.
// No reactive() wrapper, no unwrap view. Constructor runs init in setup context.
const box = new Box.Class(props, model, emit);

// Destructure ONLY template-ref targets — the getter returns the stable ref itself.
const { el } = box;

// Type the expose surface through Instance — it strips readonly so ref-writes typecheck.
defineExpose(box as Box.Instance);
</script>

<template>
  <!-- Refs/Computeds are .value — reads AND writes (compiler-checked) -->
  <q-menu v-model="box.open.value" :target="box.anchor.value" />
  <div v-if="box.open.value" :style="{ width: box.widthPx }">
    {{ box.title }}
  </div>
  <!-- Plain getters and methods: plain access, NO .value -->
  <button @click="box.grow()">grow {{ box.area }}</button>
  <input ref="el" />
</template>
```

## 3. DO / NEVER

| DO                                                                           | NEVER                                                                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `class $X` + `export namespace X { $Class; Class = Reactive($X); Instance }` | export a bare `Reactive(class {...})` for anything that grows a parent/dependent       |
| mutable state = `get x() { return ref(v) }`                                  | put mutable state in a plain field — writes trigger nothing                            |
| read/write Refs/Computeds with `.value` inside the class AND in templates             | write `this.x = v` / `box.x = v` for a Ref/Computed — it clobbers the ref or no-ops            |
| derive with a PLAIN getter                                                   | wrap every derivation in `computed()` — pays ~300 bytes/instance for nothing           |
| `computed()` only for expensive / render-suppressing / stable-handle needs   | reach for `computed()` by default                                                      |
| inject stores via `private get $store() { return useStore() }`               | `store = useStore()` field initializer — runs at construction, breaks tests/SSR/cycles |
| `new X.Class(props, emit)` — raw instance everywhere                         | wrap in `reactive(inst)` or an `iuse()`/unwrap view as the standard                    |
| destructure ONLY `ref="el"` targets                                          | destructure plain getters — snapshots a dead value                                     |
| `defineExpose(box as X.Instance)`                                            | `defineExpose(box)` raw — readonly-accessor writes will type-error for consumers       |
| constructor runs init; register hooks/watchers there                         | add an `init()` method expecting auto-call — ivue never calls it                         |

## 4. The unwrapping-surface typing law

Vue's expose proxy and `reactive()` unwrap ref READS and redirect ref WRITES
into `.value` at runtime — but TypeScript keeps get-only accessors `readonly`
through its homomorphic unwrap types. So a surface typed from the raw class
FORBIDS writes the runtime allows. `Instance` (= `ReactiveInstance`, i.e.
`typeof Class.Instance`) strips readonly via its writable-getter remap. It is
the TYPE of every unwrapping surface.

- Producing an exposed instance: `defineExpose(box as X.Instance)`.
- Consuming a template ref to it: `ShallowUnwrapRef<X.Instance>`
  (generic: `ShallowUnwrapRef<Scroller.Instance<T>>`).
- Wrapping at an interop boundary: `reactive(inst as X.Instance)` (concession, not the standard).

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
| `'X' is possibly null` on a template ref in a watch getter                                                  | add `?.` — `watch(() => x.el.value?.foo, cb)`            |
| template write crashes / no-ops at runtime on the raw instance                                              | you wrote `x.Ref/Computed = v`; write `x.Ref/Computed.value = v`         |

## 5. Watch rules

- `watch(() => inst.plainGetter, cb)` works on a RAW instance — no `reactive()`
  wrapper, no Ref/Computed needed. The getter body runs inside the watcher's effect, so
  its leaf reads subscribe directly (non-intuitive but structural).
- The source MUST be the FUNCTION form. `watch(inst.plainGetter, cb)` passes a
  dead snapshot and never fires.
- Inside `setup()`, plain `watch` / `watchEffect` are fine — the component scope
  stops synchronously-created watchers on unmount.
- For instances that OUTLIVE their component (module singletons, entities made
  in callbacks or async code): use `this.$watch` / `this.$watchEffect`. These
  register in a shared lazy per-instance `effectScope`, torn down by
  `$stopEffects()` (which also runs a user `stopEffects()` hook and clears
  cached Refs/Computeds). Pure-data instances that never watch allocate no scope.
- NEVER wrap `watchEffect` inside `$watch` — `$watchEffect` is the symmetric primitive.
- Wire component-lifecycle instances to auto-teardown:
  `getCurrentScope() && onScopeDispose(() => this.$stopEffects())`.

## 6. Generics + circular imports (brief)

Generic class — `ReactiveClass<C>` cannot carry `<T>` (no higher-kinded types),
but `Reactive(X) === X` by identity, so cast `Class` back to the raw
constructor and apply `ReactiveInstance` explicitly for `Instance`:

```ts
class $Scroller<T extends BaseItem> {
  get items() {
    return ref<T[]>([]);
  }
}

export namespace Scroller {
  export const $Class = $Scroller;
  export const Class = Reactive($Scroller) as unknown as typeof $Scroller; // keeps <T> at `new` sites
  export type Instance<T extends BaseItem> = ReactiveInstance<$Scroller<T>>;
}
// consumer of a template ref: ShallowUnwrapRef<Scroller.Instance<T>>
```

Circular imports — the hoisted-namespace + getter convention is immune by
construction: cross-references (`new Other.Class()` in a method) resolve at
first access, when every module is loaded. Circular `extends` remains
impossible (it evaluates at load time — logically impossible in any language).
Each file calls `Reactive()` on its own class safely: it is idempotent per
prototype level and HMR-safe; a shared ancestor is transformed once, by
whichever file loads first.

## 7. Self-review checklist (run over your ivue diff)

- [ ] Every mutable state member is `get x() { return ref(...) }` — no mutable plain fields.
- [ ] Inside the class, every Ref/Computed read/write uses `.value`; plain fields are constants/config only.
- [ ] Derived values are PLAIN getters; `computed()` appears only for expensive / render-suppressing / stable-handle cases.
- [ ] Stores/composables are injected via `private get $store() { return useStore() }`, not field initializers.
- [ ] The class is exported through the namespace (`$Class` / `Class = Reactive($X)` / `Instance`); generics cast `Class` and hand-apply `ReactiveInstance` to `Instance<T>`.
- [ ] The SFC does `new X.Class(...)` once — no `reactive()` wrapper, no unwrap view.
- [ ] Every template Ref/Computed access uses `.value` (reads AND writes: `v-model`, `v-if`, `:prop`, `@click(...args.value)`); plain getters/methods are plain.
- [ ] Only `ref="..."` targets are destructured off the instance.
- [ ] `defineExpose(x as X.Instance)`; consumers type the ref as `ShallowUnwrapRef<X.Instance>`.
- [ ] Watch sources are the FUNCTION form; `this.$watch`/`this.$watchEffect` used for component-outliving instances; no `watchEffect` wrapped in `$watch`.
- [ ] Lifecycle hooks / init logic live in the constructor (no `init()` expecting auto-call); template refs guarded with `?.` where read pre-mount.
