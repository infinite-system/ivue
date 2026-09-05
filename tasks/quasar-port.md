# Quasar → ivue port — a Vapor-ready component library from a proven one

**Status: potential (post-release). Not started. The census that
motivates it is done: `tasks/quasar-census/`.**

## The idea

Bootstrap a component library by translating Quasar's logic into ivue
classes instead of designing one from scratch. Quasar (MIT, v2.30.0,
79 component directories, 222 component source files) is written as
`defineComponent` + `setup()` + `h()` render functions, with shared
behavior in composables. That is already the ivue shape wearing
function syntax, so the port is a translation, not a redesign.

Two things the port gets that Quasar cannot reach from where it is:

1. **Vapor mode.** Vapor compiles TEMPLATES to DOM operations. An
   `h()` render function has nothing for the Vapor compiler to
   compile, so every Quasar component is locked to the VDOM path.
   Getting there means rewriting every render — the same work as the
   port. The port writes templates from day one and keeps no
   `render()` methods.
2. **An order of magnitude fewer computeds.** Quasar declares 667
   `computed()`; the port needs about 50 (`tasks/quasar-census/`).
   A QBtn instance carries 28 computeds, 14 of them from a router-link
   composable that runs on buttons that never link. Composition by
   function can only share behavior by RUNNING it; a base-class getter
   never read costs nothing.

## Why ivue is the right host

- **The model never touches the render target.** A class owns state,
  derivations, and handlers; the SFC is wiring only. The same class
  runs under a VDOM template or a `<script setup vapor>` template, so
  the library is compile-target agnostic while Vapor's component API
  settles.
- **Their composables are base classes.** Quasar already does prop
  inheritance by hand: `useFieldProps` is spread into each field's
  `props`, `useFieldEmits` into its emits. That is the static-getter
  chain (`static get propsTypes()` / `propsDefaults` / `emits`) with
  the spreads deleted. `use-field.js` (780 lines) becomes `Field`; the
  playground's `fields/Field.ts` with its `static runner()` resolver
  is the seed.
- **Setup bodies are constructors.** Local refs → ref-getters,
  computeds → plain getters, handlers → methods, `watch` stays in the
  constructor (component-scoped). The gate's wiring-only rule catches
  anything left in `<script setup>`.
- **CSS ports verbatim.** Sass and class names are the bulk of a
  component library's volume and need no translation.

## The translation table

| Quasar | port |
| --- | --- |
| `useXProps` object spread | `static get propsTypes()` on the base class; subclass re-declares `props` only when it ADDS props |
| `useXEmits` array spread | `static get emits()` |
| `const x = computed(() => …)` | `get x() { … }` plain getter (keep `computed()` only on the census keep list) |
| `computed({ get, set })` | native `get x() / set x(value)` accessor pair |
| `const x = ref(v)` in setup | `get x() { return ref(v) }` |
| `watch(someComputed, fn)` | `watch(() => this.x, (…) => this.onX(…))` in the constructor |
| `useX(props, …)` returning `{ a, b }` | `extends X.$Class` (behavior) or `protected get $x()` (hosted composable) |
| `provide(key, computed)` | `provide(key, this)` — children read the instance |
| `h('div', { class: classes.value }, …)` | a `<template>` reading `model.classes` |
| `$q` (`useQuasar()`) | `Platform.Class.use()` — a `$`-static singleton |
| module-level constants | `static` knobs on the class |
| `export default createComponent({ name, props, emits, setup })` | one `X.ts` (single-file model) + one `X.vue` (wiring + template) |

## Sequence

1. **Platform kernel first** — every component reaches for it:
   `$q` (platform, screen, dark, lang, iconSet) as `$`-static
   singletons; `use-size`, `use-align`, `use-dark`, `use-id`,
   `use-split-attrs` as base classes or `$`-hosted composables;
   the `ripple` directive as a static (like `MediaField.focusDirective`).
2. **The field chain** — `QField` → `QInput` → `QSelect`. This is where
   Quasar's hand-rolled inheritance is heaviest (`use-field` 780 lines,
   `QInput` 599, `QSelect` 2,059) and where the static-getter chain
   pays most. Measure here before going wider (see Receipts).
3. **The leaf set** — QBtn, QIcon, QItem, QCheckbox, QRadio, QToggle,
   QChip, QBadge, QAvatar. Per-row hot components; the per-instance
   computed count (QBtn 28 → 0) is the memory receipt.
4. **Layout** — QLayout, QHeader, QFooter, QDrawer, QPage,
   QPageContainer, QToolbar. Long-lived models that outlive views —
   the outliving-instance pattern with `$watch` + `dispose()`.
5. **Volume** — the remaining ~60 components, ground by agents under
   the gate the way Invar was. Each component: port, `npm run gate`,
   typecheck, mount-and-drive smoke, commit.
6. **Vapor** — flip templates to `<script setup vapor>` once 3.6's
   Transition / KeepAlive / Teleport coverage is confirmed; re-bench.

## Receipts to collect before anything is said in public

- **Computed count** per component, Quasar vs port (the census gives
  the Quasar side; the port side is a grep).
- **Lines** of the field chain before and after: `use-field` +
  `QInput` + `QSelect` = 3,438 lines today. If the classes come out
  shorter with the spreads gone, that number is the post.
- **Bytes per instance** for QBtn: 28 computeds × measured
  per-computed cost on Vue 3.6 vs 0. Measure, do not multiply.
- **Creation time** for 10k QBtn / QInput instances, Quasar vs port,
  same Vue, same machine.
- **Gzipped size** of the field chain's JS, both sides.

## Testability — the model is tested without a DOM

Quasar's 143 test files mount a component 4,115 times across ~836
cases; `QBtn.test.js` alone calls `mount(QBtn)` 64 times for 53 cases.
There is no other way to reach a `defineComponent`'s logic: every
derivation lives inside `setup()`, so every assertion needs a mounted
wrapper, a DOM, and a render.

In the port every derivation is a prototype member. A test constructs
`new QBtn.Class(props)` with a plain object and asserts on
`button.classes`, `button.isDisabled`, `button.attrs` directly — no
mount, no jsdom, no `wrapper.find`. Consequences:

- **Two test layers, split by what they prove.** Model tests (the
  bulk) run the class against every prop combination at closure speed
  and can be exhaustive — a QSelect with 60 props gets its option
  scope, filter, and keyboard navigation tested as methods, not as
  DOM events. Template tests (few) mount once per component and prove
  the wiring: the destructure is total, the names bind, the events
  fire the methods.
- **Aggressive by construction.** Property-based and table-driven
  tests are cheap when the subject is a method on an object; they are
  prohibitive when each case needs a mount. The port's coverage target
  is 100 % on models, gate-enforced, the way the engine is.
- **Inheritance tests once.** `Field`'s behavior is tested on `Field`;
  `QInput` tests only what it adds. Quasar re-mounts `use-field`
  behavior through every field component's suite.
- **The gate is a test.** `npm run gate` over the port is a structural
  test every component passes before its first unit test is written.

Receipt to collect: cases and wall-clock for the field chain's suite,
Quasar's mount-based vs the port's model-based, same assertions.

## Constraints

- MIT: keep Quasar's license and copyright notices; say plainly where
  the logic came from. This is a port, not a rebrand.
- Every ported class passes the gate unmodified — no exceptions added
  to the checker for the port's sake. If the port needs a new rule,
  that is a finding about the standard, recorded in LESSONS.md.
- No `render()` methods, no `h()` in classes — templates only, or the
  Vapor claim dies.
- Vue 3.6 (alien-signals) from the start; the docs benchmarks still
  stamped 3.5 get re-run in the same session (see memory:
  `vue-3-6-alien-signals-plan`).
- Two names, one thing: a ported component keeps Quasar's public prop
  and emit names so migration is a find-and-replace of the import.

## Open questions

- Templates vs Quasar's slot-heavy render functions: QSelect and
  QTable pass dozens of scoped slots through. Templates express that
  with `<slot name="…" v-bind="scope">`; confirm nothing needs
  `h()`-only tricks (render caching via `use-render-cache`).
- Directives (`touch-pan`, `touch-swipe`, `ripple`, `scroll`) — port
  as statics on the classes that use them, or as a small directives
  module? Statics keep the single-file model; a module keeps them
  reusable outside the library. Decide at step 1.
- Name. Not "Quasar"; the identity line is "Quasar's logic, ivue's
  shape, Vapor's renderer", and the name should carry the third.
