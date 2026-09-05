---
title: The Standard Operating Manual
description: The complete ivue operating manual — annotated class and SFC templates, DO/NEVER table, the unwrapping-surface typing invariant, watch rules, thin-closure delegation, naming guidelines, keyed reactivity, and the review checklist. The same manual we ship to AI agents.
relatedPosts: [ban-private, reactive-framework-for-the-ai-era, uniformity-is-a-measuring-device, patterns-the-author-never-wrote]
---

# The Standard Operating Manual

This page ships to AI coding agents verbatim, as the `/ivue` skill —
[`.claude/skills/ivue/SKILL.md`](https://github.com/infinite-system/ivue/blob/main/.claude/skills/ivue/SKILL.md)
— because the instructions that make an agent write correct ivue turn out
to be exactly the reference a human wants open in a second tab. Everything
here is production-proven; the _why_ behind each rule lives in the guide
chapters.

::: info Install it as a skill
One command copies this exact document into your project, version-locked
to the ivue you have installed — agents pick it up from
`.claude/skills/ivue/`:

```sh
npm install ivue        # first — the CLI ships inside the package
npx ivue skill          # Claude Code — .claude/skills/ivue/
npx ivue skill --all    # + every agent whose footprint exists in the repo
```

The content is identical for every agent — only the discovery format
differs. `--all` detects what you use (`.cursor/`, `.github/`, `AGENTS.md`)
and never scaffolds a tool you don't; `--cursor`, `--copilot` and
`--agents` (alias `--codex` — Codex CLI, Windsurf and Gemini CLI all read
`AGENTS.md`) install their target explicitly.
Evaluating before adopting? `npx degit infinite-system/ivue/.claude/skills/ivue .claude/skills/ivue` grabs the latest from the repo instead.
:::

The architecture this manual encodes — every scope memoized, with
polymorphism, inheritance, and performance intact — is argued in
narrative form, full code included, in
[Bulletproof class modules](/blog/bulletproof-class-modules). The blog
is an extension of these docs, not a side channel.

<p class="skill-begins" aria-hidden="true"><span>Skill begins</span></p>

# ivue `Reactive`

Author reactive Vue 3 logic as a plain `class $X`, then export `Class = Reactive($Class)` through `namespace X`.
The engine transforms the prototype once: ref-returning getters become cached
Refs/Computeds, plain getters de-optimize to native getters (reactive via leaf
tracking), methods become stable bound functions. Instances stay plain objects.
Follow the rules below exactly — every deviation is either a compile error or a
silent no-op at runtime.

The manual reads in three parts: the **`Reactive()` instance world**
(the class and SFC templates, ownership, typing, watches, stores, keyed
state), the **static world** (`Static()`, shared stores, and reading
your own statics — everything from `ivue/extras`), and the **style
contract** (naming, spacing, the self-review checklist).

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
  protected get $project() {
    return useProjectStore();
  }
  get projectId() {
    return this.$project.projectId;
  }

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

A class with NO static members exports exactly this shape. Only a class
that DECLARES statics anchors them — `export const $Class =
Static($Box)` — and reads them from instance code through `self`; both
live in the static-world sections below.

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

## The class carries the WHOLE contract; the namespace is identity and types

A class FILE is a SINGLE-FILE MODEL — the model-side twin of the
single-file component. It has exactly three residents: imports, the
class, the namespace. The component contract — prop types, prop defaults, their
fusion, emits, and every tuning constant — lives ON THE CLASS as static
getters, beside the state and behavior it governs. The namespace holds
identity and TYPES only, every type DERIVED from `$Class`. Two worlds
would make a class half extensible: a `const` in a namespace cannot be
overridden by a subclass, is not inherited, and does not swap with
`Class` under a global override — so a runtime declaration never lives
there.

- **Contract (on the class, static)** — `static get propsTypes()`
  (defineComponent-style, no defaults, returned through
  `definePropTypes({...})` so the `required: true` literal survives
  `typeof`); `static get propsDefaults()` (plain values, annotated
  `ExtractPropDefaultTypes<typeof $X.propsTypes>` — required props are
  filtered out of the check automatically, and a deliberately
  default-free optional prop is declared `key: undefined`, stating the
  ruling in data); `static get props()` — the ONE fusion line,
  `propsWithDefaults(this.propsDefaults, this.propsTypes)`, reading
  through the receiver so a subclass's `props` fuses ITS types and
  defaults; `static get emits()` (object-declared validators). Tuning
  constants are plain static getters too — live knobs a subclass or test
  double overrides; the `$` prefix stays reserved for compute-once caches.
  Types and defaults stay two members ON PURPOSE: a variant re-tunes
  defaults without re-typing.
- **Identity (namespace)** — `$Class` (raw, for children to extend),
  `Class` (`Reactive()`, for you to `new`), `Instance` (and `Model` when
  used).
- **Types (namespace)** — DERIVED from the class, never hand-duplicated:
  `Props` is `ExtractPropTypes<typeof $Class.props>` (a generic component
  grafts its parameter back over the one prop a runtime map cannot
  carry: `Omit<ExtractPropTypes<typeof $Class.props>, 'modelValue'> &
  { modelValue: T[] }`); `Emits` is `ExtractEmitTypes<typeof
  $Class.emits>`; `Slots`; `Exposed` is `ShallowUnwrapRef<Instance>`.
  Domain types the contract refers to (an item shape, a variant preset)
  live here as namespace types; the class reads them as `X.Item`.

Combined — the canonical file, everything above in one shape:

```ts
// Box.ts — the whole module: imports, the class, the namespace. Nothing else.
import type { ExtractPropTypes, PropType, ShallowUnwrapRef } from 'vue';
import {
  definePropTypes,
  propsWithDefaults,
  Reactive,
  type ExtractEmitTypes,
  type ExtractPropDefaultTypes,
} from 'ivue';
import { Static } from 'ivue/extras';

class $Box {
  /* Contract — STATIC: owned by the class, extended with `super` */

  /** 1 — the TYPES: a defineComponent-style object, no defaults inside.
   *  definePropTypes is an identity call that keeps `required: true` a
   *  LITERAL — a bare object widens it to boolean, which would blind the
   *  defaults check below. */
  static get propsTypes() {
    return definePropTypes({
      title: { type: String as PropType<string>, required: true },
      size: { type: Number as PropType<number> },
      maxHeight: { type: Number as PropType<number> },
      disabled: { type: Boolean as PropType<boolean> },
    });
  }

  /** 2 — the DEFAULTS: plain values, typed against the types object.
   *  Required props (`title`) are filtered out of the check
   *  automatically; every OPTIONAL prop must appear — `undefined` is the
   *  explicit "no default ON PURPOSE" ruling, stated in data. */
  static get propsDefaults(): ExtractPropDefaultTypes<typeof $Box.propsTypes> {
    return {
      size: this.defaultSize,
      maxHeight: undefined, // unset = unbounded — deliberately default-free
      disabled: false,
    };
  }

  /** 3 — the FUSION: a standard Vue props object, ready for defineProps.
   *  Reads through the receiver — a subclass's `props` fuses ITS own
   *  types and defaults. Written once per hierarchy; a subclass that ADDS
   *  props re-declares this one line so its derived `Props` widens (a
   *  static's return type is not polymorphic). */
  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  static get emits() {
    return {
      close: (title: string) => true,
    };
  }

  /** A tuning constant: a LIVE static knob (no `$`), overridable. */
  static get defaultSize() {
    return 400;
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Box;
  }

  // Type positions resolve non-positionally — the class names its own
  // namespace's derived types freely.
  constructor(
    public props: Box.Props,
    public emit: Box.Emits,
  ) {}

  get title() {
    return this.props.title;
  }

  get sizeLabel() {
    return `${this.props.size}px`;
  }

  close() {
    this.emit('close', this.props.title);
  }
}

export namespace Box {
  /* Identity */

  export const $Class = Static($Box); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /* Types — DERIVED from the class's statics, never hand-duplicated */

  export type Props = ExtractPropTypes<typeof $Class.props>;
  export type Emits = ExtractEmitTypes<typeof $Class.emits>;

  export interface Slots {
    default: (scope: { title: string }) => any;
  }

  /** What consumers hold through a template ref (expose unwraps refs). */
  export type Exposed = ShallowUnwrapRef<Instance>;
}
```

The SFC is pure wiring against the seam, and it reads the contract
through `Class` — the mutable slot — so a global override swaps the
contract together with the runner. The macros receive RUNTIME objects,
so no compiler macro ever resolves a cross-file type:

```ts
const props = defineProps(Box.Class.props); // non-generic: the type is inferred
const emit = defineEmits(Box.Class.emits) as Box.Emits;
defineSlots<Box.Slots>();
// generic components cast the one graft:
// defineProps(X.Class.props) as unknown as X.Props<T>
```

A subclass extends its contract the way it extends behavior — with
`super`, overriding only what defines the specialization, with the
reason on the line. Re-tuning a default needs ONE override; adding a
prop needs the types override plus the one-line `props` re-declaration:

```ts
class $CardBox extends Box.$Class {
  static override get propsDefaults(): typeof Box.$Class.propsDefaults {
    return {
      ...super.propsDefaults,
      size: 300, // cards are hundreds of px wide; rows were tens tall
    };
  }
}

class $TaggedBox extends Box.$Class {
  static override get propsTypes() {
    return definePropTypes({
      ...super.propsTypes,
      tag: { type: String as PropType<string> },
    });
  }
  static override get propsDefaults(): ExtractPropDefaultTypes<typeof $TaggedBox.propsTypes> {
    return { ...super.propsDefaults, tag: '' };
  }
  static override get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes); // widens TaggedBox.Props
  }
}
```

The anchor rule is unchanged and now reaches every component class: a
class that DECLARES statics — and the contract is statics — anchors at
`$Class` with `Static()` (`export const $Class = Static($Box)`), and so
does a subclass that overrides one. A subclass that only inherits stays
raw. The anchor costs nothing on getters (native reads) and is what
gives a `$`-cached static its compute-once semantics.

**One seam, any size.** A contract of forty documented props is still
authored on its class — a static getter scrolls like any other member,
and a sibling `XProps.ts` would be the parallel world again (a second
runtime owner the class mechanics cannot reach). Shared base surfaces
are a base CLASS (`class $ChooseField extends Field.$Class`), never a
spread-in const: inheritance is the only composition the contract uses.

**Overrides say so out loud.** `noImplicitOverride` is on: every member
that overrides a base member carries the `override` keyword
(`protected override get offsetSize() { ... }`). A silent override
refuses to compile, and a base rename breaks every subclass at the
exact overriding member instead of quietly orphaning it.

**`private` is banned — visibility is a three-tier semantic.** ivue's
core promise is extend-don't-fork, and `private` is the one keyword
that structurally revokes it: a subclass that needs a private member
has exactly one option, copy the file. TypeScript's `private` is
compile-time advisory anyway — it protects nothing at runtime and
forbids only the legitimate extender. So every member picks its tier
by AUDIENCE:

| tier | audience | meaning |
| --- | --- | --- |
| `public` | templates & consumers | the component/module surface |
| `protected` | subclasses | a seam of the hierarchy — reachable to extend, invisible to templates and consumers (TS enforces this) |
| `private` | nobody | banned — "must hide it even from subclasses" is a design smell; resolve by naming and documenting the member |

The pairing with `noImplicitOverride` is what makes protected-everything
safe rather than fragile: every subclass touchpoint is annotated
`override`, so a base renaming or removing a protected seam breaks
every extender's BUILD at the exact member — seam drift is loud, never
silent. (Both halves are load-bearing: `protected` opens every seam,
the tsconfig makes changing one detectable.)

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
- **The rule covers EVERY binding kind, not just `v-if`** — the common
  leaks are display strings, disabled states, and class objects:

  | leaked into the template | derived on the class |
  | --- | --- |
  | interpolating `sending ? 'Sending…' : 'Send to ' + recipients.length` | interpolating `model.sendButtonLabel` |
  | `:disabled="!model.canSend \|\| sending"` | `:disabled="model.sendDisabled"` |
  | `:class="{ active: view === tab.name }"` | `:class="{ active: app.isOpen(tab.name) }"` |
  | `row.name \|\| '—'` in a `v-for` cell | `Format.Class.orDash(row.name)` |
  | `:style` width from `(day.count / peak) * 100 + '%'` | `:style` width from `model.barWidth(day)` |

  Each right-hand form is a prototype member: unit-testable without
  mounting anything, greppable by name, typed, and hot-graftable. The
  one thing that stays in the template is STRUCTURE — `v-if`/`v-else`
  branching on a named condition or a data field (`v-if="entry.nextSlug"`)
  and `v-for` over a collection. Branching on data is structure;
  COMPUTING with data is logic, and logic lives on the class.

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
  // WATCHERS live behind a method, not inline in the constructor —
  // the constructor calls it once, and the instance can RESTART its
  // watchers after a keep-state stop (see suspend() below).
  constructor() {
    this.startWatchers();
    // If constructed INSIDE some scope, auto-wire teardown instead:
    //   getCurrentScope() && onScopeDispose(() => this.$stopEffects());
  }

  startWatchers() {
    this.$watch(
      () => this.user.value,
      (user, previousUser) => this.onUserChanged(user, previousUser),
    );
    this.$watchEffect(() => this.persist());
  }

  // SUSPEND / RESUME: { reset: false } stops the watchers ONLY — every
  // cached cell survives with its current value. startWatchers() in a
  // fresh scope resumes. (Default $stopEffects() also CLEARS the cells:
  // the next touch re-runs initializers — disposal is a reset.)
  suspend() {
    this.$stopEffects({ reset: false });
  }
  resume() {
    this.startWatchers();
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
| ✅ inject stores via `protected get $store() { return useStore() }` | ❌ `store = useStore()` field initializer — runs at construction, breaks tests/SSR/cycles |
| ✅ `new X.Class(props, emit)` — raw instance everywhere | ❌ wrap in `reactive(instance)` or any shallow-unwrap view as the standard |
| ✅ destructure ALL template-touched Refs/Computeds + element refs, grouped | ❌ destructure plain getters or methods — snapshots a dead value / loses nothing but clarity |
| ✅ state bindings in templates; dotted `box.x` only for plain getters/methods | ❌ reach a Ref through the instance in a template — `v-if="box.someRef"` is always-truthy |
| ✅ labels, disabled states, and class conditions as named getters/methods (`model.sendButtonLabel`, `model.sendDisabled`) | ❌ ternaries, `\|\|`/`&&` chains, comparisons, or string-building inside template expressions |
| ✅ `defineExpose(box as X.Instance)` | ❌ `defineExpose(box)` raw — readonly-accessor writes will type-error for consumers |
| ✅ constructor runs init; register hooks/watchers there | ❌ add an `init()` method expecting auto-call — ivue never calls it |
| ✅ plain `watch` in component-scoped constructors; `$watch` + a `$stopEffects` dispose path for outliving instances | ❌ default to `this.$watch` in a component-scoped class — its scope silently outlives unmount |
| ✅ compose cleanup as an ordinary method — `dispose() { /* non-Vue cleanup */ this.$stopEffects(); }` | ❌ expect a teardown hook — ivue auto-calls NOTHING (no `init()`, no `stopEffects()`) |
| ✅ a class with static members anchors them: `const $Class = Static($X)` (`ivue/extras`) | ❌ `extends X.Class` — the mutable slot is an eager snapshot of one generation; always extend `$Class` |
| ✅ `protected` for every internal member — subclasses reach every seam | ❌ `private` anywhere in an ivue class — it forbids only the legitimate extender |
| ✅ instance code reads its own statics through `this.self` (the one cast per class); hoist `const self = this.self` for 2+ reads or any loop | ❌ per-site `(this.constructor as typeof $X)` casts — each one is an unchecked class-name assertion |

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
- `$stopEffects()` stops the instance scope and clears cached Refs/Computeds
  (the next touch re-materializes — disposal is a reset);
  `$stopEffects({ reset: false })` stops the WATCHERS only — every cached
  cell survives with its current value, and `startWatchers()` in a fresh
  scope resumes (the suspend/resume pattern above);
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

## The store pattern: a singleton behind `use()`, injected by `$`-getter

Shared application state (session, navigation, toasts, the current user)
is a STORE — one ivue class published as a module singleton — never a
model passed down as a prop. Prop-drilling a shared model
(`<ChildView :app="app" />`, `constructor(public app: AppModel.Instance)`)
threads one object through every component and constructor signature it
crosses; the store pattern deletes the thread.

```ts
// app/AppStore.ts — the store IS an ivue class; `use()` owns the singleton
class $AppStore {
  get authenticated() {
    return ref(false);
  }

  notify(message: string) {
    /* ... */
  }
}

export namespace AppStore {
  export const $Class = $AppStore;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  let singleton: Instance | null = null;
  export function use(): Instance {
    return (singleton ??= new Class());
  }
}
```

Consumers never receive it — they REACH for it:

```ts
// any model — the `$`-getter caches the store per instance, forever
class $SubscribersModel {
  protected get $app() {
    return AppStore.use();
  }

  async refresh() {
    try {
      /* ... */
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }
}
```

```vue
<script setup lang="ts">
// any component — call use() directly; no prop, no provide/inject
import { AppStore } from '../app/AppStore';

const app = AppStore.use();
const { authenticated } = app;
</script>

<template>
  <button v-if="authenticated" @click="app.logout()">Lock</button>
</template>
```

Why this shape and not alternatives:

- **`use()` is lazy** — the singleton constructs on first touch, after the
  app exists, so module-load order and circular imports stay non-events
  (the same late-read property as every cross-module reference).
- **The `$`-getter is the injection point** — cached whole, per instance,
  on first read. A model names its dependency once; every method reads
  `this.$app` with zero lookup cost and zero constructor plumbing.
- **Tests swap the slot, not the callers** — `AppStore.Class = $TestStore`
  before the first `use()` (or reset the singleton) and every consumer
  gets the double through the same seam.
- A store is component-OUTLIVING by definition: watchers inside it use
  `this.$watch`/`$watchEffect`, never plain `watch`, and lifecycle hooks
  never belong in it.
- Pass PROPS for what is genuinely per-instance input (a row, a slug, a
  config knob). Reach for the STORE for what is genuinely shared. A prop
  named `app`, `store`, or `session` is the tell that a store is being
  drilled.

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
  protected readonly cellVersions = new Map<number, Ref<number>>();

  /**
   * READ path: get-OR-CREATE, then subscribe — observation
   * materializes.
   */
  protected trackCell(cellKey: number): void {
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
  protected bumpCell(cellKey: number): void {
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

## `Static()` — the static-side sibling (from `ivue/extras`)

`Reactive()` owns instances. Stateless CAPABILITY classes — function bags for
files, git, parsers, clocks: never constructed, only called and swapped — use
`Static()` from the `ivue/extras` entry (separate, so core stays the engine):

- **Static methods bind lazily with stable identity** — detachable, safe as a
  router/queue/listener callback, bound to the RECEIVING class.
- **Get-only statics named `$…` compute once PER RECEIVER.** The `$` prefix
  promises stable identity, NOT immutability — a mutable memo table is a
  legitimate `$`-cache. Non-`$` static getters stay LIVE: the settings a
  subclass or test double overrides.
- **A SHARED STORE never lives in receiver-space.** Per-receiver caching
  means a subclass reading `this.$store` silently forks a fresh copy — the
  registry-fork trap. The store is a `static readonly` FIELD on the
  declaring class — one reference, inherited through the prototype chain,
  never receiver-cached — so every receiver read (`this.$store`,
  `this.constructor.$store`) resolves to the one store with no special
  case anywhere; the `$`-getter pins by returning the field:
  ```ts
  class $Registry {
    protected static readonly sharedRegistrations = new Map<object, Registration>();
    protected static get $registrations() {
      return this.sharedRegistrations; // the field IS the pin
    }
  }
  ```
  Two questions place every static value:

  1. **Should a subclass get its own copy?** Yes → per-receiver
     `$`-cache. That is what memos and per-class tuning want: forking on
     subclass is the feature. No → it is a SHARED store (a registry, a
     ledger — forking is the bug), and it lives in a `static readonly`
     field as above.
  2. **Shared store: can its initializer run at module load?** A field
     initializer runs while modules are still loading, so it may only
     hold a dependency-free value — a bare `new Map()`, a literal. The
     moment construction needs ANOTHER module's class, the field holds a
     `LazyShared` cell instead (`import { LazyShared } from
     'ivue/extras'`), and the `$`-getter reads through it:
     ```ts
     protected static readonly sharedBackend = new LazyShared(
       () => new SearchBackend.Class(),
     );
     protected static get $backend() {
       return this.sharedBackend.value;
     }
     ```
     Each step is safe on its own terms. Storing the cell eagerly is
     safe because a thunk evaluates nothing at load. Running the thunk
     on first read is safe because by then every import cycle has
     resolved. And sharing is safe because the memoized value lives
     INSIDE the cell — every access path, subclass receivers and
     per-receiver `$`-caches over the cell included, converges on the
     one constructed singleton.

THE ANCHOR RULE — a class that declares static members wraps them ONCE, at
`$Class`, so subclasses and test doubles inherit working semantics by
extending `$Class` bare:

```ts
import { Static } from 'ivue/extras';

class $GitCommands {
  static get binary() {
    return 'git'; // LIVE knob — no $ prefix
  }
  static get $environment() {
    return { LC_ALL: 'C' }; // computed once per receiver
  }
  static stage(path: string) {
    return this.run(['add', '--', path]); // `this` = receiving class
  }
}

export namespace GitCommands {
  export const $Class = Static($GitCommands); // anchor — wrap HERE
  export let Class = $Class; // selection — kernels/tests swap this
}
```

Statics AND reactive instances on one class — anchor the statics, then
`Reactive()`:

```ts
export namespace Settings {
  export const $Class = Static($Settings);
  export let Class = Reactive($Class); // in-place: Class === $Class
  export type Instance = typeof Class.Instance;
}
```

No static members → no wrapper: `$Class = $X`, the standard form unchanged.

**Hot loops read the method through the accessor — hoist it, not the
class.** The bound method itself is plain-function speed (measured,
Chromium, 9M calls, fresh page per variant: module function 31.7 ms,
hoisted bound method 30.0 ms); the ONLY per-call cost is re-reading it
through the accessor inside the loop (84.6 ms same loop — the
own-property guard that buys per-receiver binding). Ordinary call
frequency never notices. In a million-call loop, destructure once,
INSIDE the function:

```ts
// one accessor read per method — a late read of the mutable slot,
// so a swapped-in subclass is still honored
const { isDataCol, numDataValue } = FlyweightLogic.Class;
for (let row = 0; row < ROWS_1M; row++) sum += numDataValue(row, col) ?? 0;
```

Never hoist at module scope (captures today's `Class` forever, blind to
swaps) and never reach for `$Class` as a "fast path" — the raw class
skips per-receiver binding, which is the capability seam itself.

## Reading your own statics — the ladder

`Reactive(X) === X`, so a namespace's `Class` slot IS the base class. A getter
that reads statics through it therefore hard-binds to the base and silently
IGNORES a subclass override — the exact opposite of what a live (non-`$`)
static getter is for:

```ts
// ❌ three members, a double cast, and the override never applies
protected get Tooltip() {
  return Tooltip.Class as unknown as typeof $Tooltip;
}
public static get TOOLTIP_DWELL_SECONDS() { return 0.4; }
protected get tooltipDwellSeconds() {
  return this.Tooltip.TOOLTIP_DWELL_SECONDS;   // base value forever
}
```

Measured: a subclass setting `0.1` still reads `0.4` through this shape.

Take the first rung that applies:

1. **Nothing outside the instance reads it** → delete the static. A plain
   instance getter is zero bytes per instance and natively overridable:
   ```ts
   protected get tooltipDwellSeconds() { return 0.4; }
   ```
2. **Something outside reads it** (a test overriding the knob, another class)
   → keep the static and read it through **`self`** — the one cast per
   class, declared beside the statics it types — DIRECTLY at each call
   site:
   ```ts
   protected get self() {
     return this.constructor as typeof $Tooltip;
   }

   show() {
     this.dwellTimer.start(this.self.TOOLTIP_DWELL_SECONDS);
   }
   ```
   An instance getter over a static earns its place when it genuinely
   derives — mixing in instance state or transforming the value; a
   plain read stays a direct `this.self.X` at the call site, so the
   knob keeps one name and one override surface (the static).
   `this.constructor` is the actual class — the subclass when subclassed,
   and an engine class that INHERITS `$Class` for a plain reactive
   instance — so statics resolve late-bound in both cases.
   TypeScript types `constructor` as bare
   `Function`, so ONE cast is unavoidable; `self` is where it lives.
   Never scatter per-site `(this.constructor as typeof $X)` casts: each
   is an unchecked assertion that the class name is right, and the
   copy-paste error it invites typechecks silently against the wrong
   statics. Rules that keep `self` honest:
   - **Plain getter, never `$self`** — a `$`-cache would spend a
     per-instance slot on what `this.constructor` hands back for free.
   - **One read → `this.self.X` inline. Two or more reads, or any
     loop → hoist:** `const self = this.self;` as the first line, then
     `self.X` throughout. Measured (Node 26): the de-opted `self` getter
     costs ~2 ns/read over an inline cast — noise for a single read —
     while the hoisted form runs at ~0.4 ns/iter in loops, CHEAPER than
     the inline cast, because the engine hoists the class as a loop
     constant.
   - **A subclass that adds statics redeclares `self`** with its own
     `typeof $Sub` (a covariant override); a subclass that only tunes
     inherited statics needs nothing — `self` is already late-bound.
   - **`self` is NOT the namespace slot.** `this.self` is the class you
     were constructed from; `Namespace.Class` is the live mutable slot a
     kernel may have re-pointed since. Receiver statics (constants,
     per-class tuning, `$`-caches) read through `self`; late-bound
     capability dispatch reads through `Namespace.Class`. Blurring them
     trades typo bugs for staleness bugs.
3. **Overriding must NOT happen** → name the class directly,
   `$Tooltip.TOOLTIP_DWELL_SECONDS`, and let the code say so.

Never introduce a `protected get <ClassName>()` self-reference getter. It is a
cast wearing a getter costume: it looks live and is not — `self` is its
honest replacement.

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

## Spacing is information

Contiguity says "same kind of thing"; a blank line says "the kind changes,
or complexity rises." Spend the signal deliberately — a blanket
newline-between-everything rule makes air mean nothing.

Class members use one order: static members → constructor → state getters →
prop getters → derived getters → methods. The constructor is the first
instance member. Comments and invariant annotations can precede the member
they describe.

Constants use one form per role:

| Role | Form |
| --- | --- |
| Tunable or overridable class constant | `static get SCREAMING_SNAKE_CASE()` |
| Protocol or byte constant on a hot path, never overridden | `static readonly SCREAMING_SNAKE_CASE` with a one-line hot-path comment |
| Contributor or pane identity data | Instance `readonly lowerCamelCase` field |
| Extensible constructed dependency | Field assigned from a prototype `createX()` factory method |
| Any other supposed constant | Defect: choose the real role or remove it |

Read live statics through the receiving class. JavaScript dispatches getter
and prototype method overrides while a parent constructor runs. A subclass
field initializer runs only after `super()` returns. It cannot change parent
construction. This mechanism makes getters safe tunables and `createX()`
methods safe construction seams.

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
- [ ] Inside the class, every Ref/Computed read/write uses `.value`; every plain field matches one role in the constants table.
- [ ] Derived values are PLAIN getters; `computed()` appears only for expensive / render-suppressing / stable-handle cases.
- [ ] Stores/composables are injected via `protected get $store() { return useStore() }`, not field initializers.
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
- [ ] Static members are anchored (`const $Class = Static($X)`); `$`-prefixed static getters are compute-once-per-receiver caches, non-`$` statics stay live knobs, and inheritance extends `$Class` — never the mutable `Class`.
- [ ] Million-call loops over a `Static()` class destructure the bound methods once inside the function (never module-scope, never `$Class`); `Class.method()` stays the form everywhere else.
- [ ] Instance reads of own statics go through `this.self` (declared once per class needing it, cast to `typeof $X`, plain getter never `$self`); 2+ reads or loops hoist `const self = this.self`; no per-site `this.constructor` casts; `Namespace.Class` reads stay reserved for late-bound capability dispatch.
- [ ] Static members precede the constructor; the constructor precedes state, prop, and derived getters; methods come last.
- [ ] Spacing carries meaning: declaration-like getters contiguous within their group; blank lines only where a doc comment / multi-line body / category boundary begins; methods always separated.
- [ ] The class carries the WHOLE contract as static getters (`propsTypes`, `propsDefaults`, the one-line `props` fusion, `emits`, tuning knobs) and the namespace holds identity and types ONLY, every type derived from `$Class`; no module-level consts beside imports/class/namespace, no `const` contract data in the namespace (a parallel world the class mechanics cannot reach), no sibling `XProps.ts`; the SFC reads `X.Class.props` / `X.Class.emits`; a subclass extends the contract with `super` and re-declares the fusion line only when it ADDS props.
- [ ] Every member that overrides a base member carries `override` (with `noImplicitOverride` enabled).
- [ ] No `private` members — internal members are `protected` (three-tier visibility: public = consumer surface, protected = hierarchy seam, private = banned).
