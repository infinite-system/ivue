# Kit — Invariants

The living contract for `Kit.ts`, the template axis of a malleable
component tree: a model declares the roles its subtree composes as data
on its class, a seam renders a role's view and hands it the role's entry,
and an override is a subclass whose kit names other entries. Records are
unnumbered; the name is the identifier and is referenced verbatim by code
annotations (`// invariant: <name> (examples/playground/src/kit/kit.invariants.md)`)
and by the generator header of the colocated `Kit.test.ts`.

The fixtures under `fixtures/` are the proving tree: `Panel` above `Card`
above three sections and a `Code` leaf, every view a `<script setup>` SFC
with a class contract. They exist for the spec and for the design task
`tasks/ai-chat-kit.md`, which this file's records govern.

## Generator

### A tree is malleable when every seam carries one entry and every class reads only its own kit

**Invariant:** If every model declares its roles as `static get $kit()`, every seam is `<component :is="model.kit.Role.view" :kit="model.kit.Role" …props />`, every view constructs the class its entry names, and every model reads its kit from its own class, then any role at any depth can be swapped, derived or tuned from outside by a subclass, and no swap reaches a tree that did not ask for it.

**Scope:** `Kit.ts` and every class that declares `$kit`. Vue 3.5, the reactive-proxy runtime; Vapor is not exercised.

**Components:**
- [A class reads only its own kit](#a-class-reads-only-its-own-kit) — why a subclass never inherits its parent's cached kit.
- [An override never reaches another tree](#an-override-never-reaches-another-tree) — why `resolve` and `derive` build and never write.
- [The entry crosses the seam](#the-entry-crosses-the-seam) — why a swap keeps the parent's listeners and slot content.
- [A derived contract reaches Vue](#a-derived-contract-reaches-vue) — why a widened class comes with a rewrapped view.
- [Kit props reach the getters an author opens](#kit-props-reach-the-getters-an-author-opens) — why a consumer's values travel as a prop and never into props.
- [Props and emits are fixed per component object](#props-and-emits-are-fixed-per-component-object) — the reality the rewrapped view answers.

**Mechanism:** `Static()` caches a `$`-prefixed static getter once per receiver through an own-property guard, so `$kit` costs one build per class and a subclass builds its own. `resolve` walks a kit, derives the namespace of every entry with a `subkit` and rewraps its view; `derive` extends the base's `$Class` with a `$kit` that is the base's merged with the patch; `view` copies a compiled SFC's fields under a class's `props` and `emits`. Every function reads the base and returns new objects; a resolved kit is frozen in shape.

**Generates:** The colocated `Kit.test.ts`; the design in `tasks/ai-chat-kit.md` and the "The kit" section of `tasks/malleable-architecture.md`; the conversion of the AI chat example, when it comes.

**Impossible if true:** A base kit changed by reading an override's kit. A view constructing anything but its entry's namespace `Class`. A kit value reaching a prop no getter opened. A widened prop or event unknown to the view that renders the widened class.

**Evidence:** `Kit.test.ts`, 20 specs, every one mounting or constructing real fixtures.

**Verification:** `npx vitest run examples/playground/src/kit` green, then `node .claude/skills/invariants/scripts/check_invariants.mjs --all --refs` clean, then `npm run gate:docs` at zero findings.

**Status:** provisional

**Last refined:** 2026-09-10

## Reality-based invariants

### Props and emits are fixed per component object

**Invariant:** If a compiled SFC declares `defineProps(X.Class.props)` and `defineEmits(X.Class.emits)`, then those are fixed `props` and `emits` fields on one component object, evaluated once when the module loads; a prop or event a class adds later is unknown to that object, so a parent's value for it falls through as an attribute, the class's default for it never applies, and emitting it warns.

**Scope:** Every view in a kit-rendered tree. Vue 3.5's compiler and runtime.

**Renegotiable at:** Vue — the macros are compile-time, the options are per component definition, and normalized options are cached per component object.

**Mechanism:** `<script setup>` compiles the two macros into the component's options; the compiler rejects a setup-scope reference in either argument. Vue applies declared defaults at the boundary and treats undeclared keys as attributes; `nestedProps` writes only inside nested objects, never a top-level prop, so no class-side default reaches an undeclared prop either.

**Generates:** [A derived contract reaches Vue](#a-derived-contract-reaches-vue) — the rewrapped view is the only way a widened class's contract is declared.

**Evidence:** `Kit.test.ts`: "a prop only the derived class declares arrives through the rewrapped view and falls through as an attribute on the base view" (the base-view arm), "an event only the derived class declares emits cleanly through the rewrapped view and warns through the base view" (the warning arm).

**Impossible if true:** A prop only a subclass declares arriving in `props` through the base view. A subclass's default applying to a prop the view never declared.

**Verification:** `npx vitest run examples/playground/src/kit -t "falls through as an attribute|warns through the base view"`

**Status:** provisional

**Last refined:** 2026-09-10

## Chosen invariants

### A class reads only its own kit

**Invariant:** If a model reads `this.self.$kit`, then it gets the kit its own class declares — built once by that class's getter and cached on that class — and never a parent's, whatever order the classes were read in.

**Scope:** Every class with a `static get $kit()`, anchored by `Static()`. The identity promised is per class: a subclass that inherits the getter gets an equal kit of its own, and the entries inside it are fresh literals, not the parent's objects.

**Mechanism:** `Static()` wraps a `$`-prefixed static getter so that a read through receiver `R` stores the result as an own property of `R` under a symbol and returns it thereafter; `Object.hasOwn` never walks the constructor chain. `super.$kit` inside a subclass's getter runs the parent's getter body for the subclass receiver, which is why untouched entries are equal and not identical.

**Generates:** `get kit() { return this.self.$kit }` on every composing model; the `Kit.Class.cached` helper the design once had, deleted because the engine already does this.

**Rejected alternatives:** A `WeakMap` keyed by class inside `Kit` — a second cache for a thing `Static()` caches; a static field written through `this` — read through the static prototype chain, it hands a subclass its parent's object.

**Evidence:** `Kit.test.ts`: "a subclass read after its parent gets its own kit, and the parent keeps its own", "a subclass read BEFORE its parent still builds its own kit", "a subclass without its own $kit gets an equal kit of its own".

**Impossible if true:** A subclass's `$kit` being its parent's object. A model constructed from a subclass rendering its parent's sections.

**Verification:** `npx vitest run examples/playground/src/kit -t "reads only its own kit"`

**Status:** provisional

**Last refined:** 2026-09-10

### An override never reaches another tree

**Invariant:** If an override's kit is read, then every derived namespace, rewrapped view and merged entry it produces is a new object, the base namespaces and views are unchanged, and an entry the override did not touch is the base's own object inside the resolved kit.

**Scope:** `Kit.Class.resolve`, `derive`, `view`, `merge`, `mergeEntry`, `deepFreeze`. Every override at every depth, including one resolved from data at runtime.

**Mechanism:** `merge` reads the base kit through the base class (so it is the base's cached object) and spreads into fresh objects; `derive` extends `namespace.$Class` and returns `{ ...namespace, $Class, Class }`; `view` copies the compiled SFC object; `resolve` freezes the result's maps and entries but stops at a namespace (its `Class` slot is the global override), a view (Vue's object) and a `props` bag (the consumer's). A props-only patch derives nothing; a namespace-only patch rewraps the kept view.

**Generates:** The `subkit` field on an entry; one nested literal per deep override instead of a chain of subclass files; the overlay ledger's runtime derivation in `tasks/malleable-architecture.md`.

**Rejected alternatives:** Mutating a shared view's `props` in place — every tree sees it, and Vue's option cache keyed by the object ignores it anyway; freezing views and namespaces — freezes Vue's objects and the slot the global override needs.

**Evidence:** `Kit.test.ts`: "a subkit two levels deep derives the path and leaves every base namespace exactly as it was", "a props-only patch derives nothing and rewraps nothing; a namespace-only patch rewraps the kept view", "a resolved kit is frozen in shape and open at its leaves, and the Class slot stays writable", "a derived class is a working ivue class", "two trees on one page keep their own kits".

**Impossible if true:** A base kit changed by reading an override's kit. A frozen namespace or view. A derived class whose cells are not cached or whose `self` reads the base's statics.

**Verification:** `npx vitest run examples/playground/src/kit -t "never reaches another tree|two trees"`

**Status:** provisional

**Last refined:** 2026-09-10

### The entry crosses the seam

**Invariant:** If a parent renders a role, then the seam is `<component :is="entry.view" :kit="entry" …props />` and nothing else travels; the view constructs `new (props.kit?.namespace.Class ?? Own.Class)(props)`; and a listener or slot content the parent attaches at the seam survives any swap of the view or the class behind it.

**Scope:** Every seam in a kit-rendered tree, sections included: a section's base view is a markup SFC over the parent's model that renders its own children, so a swap of a section may keep or rearrange them.

**Mechanism:** `<component :is>` attaches listeners and slots to the seam, not to the component behind it. The `kit` prop is declared on each class's own contract, typed to its namespace. A view mounted without a `kit` prop constructs its own class, so a docs demo or a spec needs no kit.

**Generates:** `defineProps(X.Class.props)` and the one `new` in every view; sections as roles (`Head`, `Body`, `Frame`); the `GroupedBody` fixture that renders from the model instead of the slot.

**Rejected alternatives:** A shell component per role — one more instance per seam and a second place to know the pair; passing a kit object or a bare class instead of the entry — the entry carries the class, the consumer's props and the reach below in one object; tag-name container defaults — a bound object lands on the element as an attribute and the base layer cannot carry the model.

**Evidence:** `Kit.test.ts`: "a view mounted with no kit constructs its own class", "a view handed an entry constructs that entry's Class, and the swapped sections render with slot and listener intact", "swapping the leaf's class through the kit keeps the body's listener at the seam", "an override two levels deep reaches the leaf through a real mount".

**Impossible if true:** A view constructing anything but its entry's namespace `Class`. A listener lost by swapping a child's view. Slot content lost by swapping a section.

**Verification:** `npx vitest run examples/playground/src/kit -t "crosses the seam"`

**Status:** provisional

**Last refined:** 2026-09-10

### A derived contract reaches Vue

**Invariant:** If a derived class declares a prop or an event its base did not, then the view that renders it is a fresh component object carrying the base view's fields and the derived class's `props` and `emits`, so the parent can pass the prop and the child can emit the event; through the unwrapped base view the widened contract is invisible on both sides — no value in, no default out, a dev warning on emit.

**Scope:** `Kit.Class.view`, called by `resolveEntry` for a derived namespace and by `mergeEntry` for a patch that names a namespace and keeps the view; also callable by hand for an override literal.

**Mechanism:** Stands on [Props and emits are fixed per component object](#props-and-emits-are-fixed-per-component-object). A compiled SFC is a plain object of a few fields (`setup`, `render`, `props`, `emits`, `__name`, `__scopeId`, `__file`, `__hmrId`), so a copy with two fields replaced is a component with the same template and a different declared contract. Vue defaults only the props a view declared, and `nestedProps` never writes a top-level prop, so a derived default for an undeclared prop never applies either.

**Generates:** The `ThemedCode` fixture (a `theme` prop, a `select` event) and its rewrapped view; the "widened contract" extension in `tasks/ai-chat-kit.md`.

**Rejected alternatives:** `Object.create(view)` with own `props` and `emits` — Vue reads component options as own keys and the prototype-backed view renders nothing at all (test: "a view made by Object.create over the base does not render at all"); writing the widened `props` onto the shared view — it would widen every tree that names the view, and inside one app Vue's per-app cache of normalized options ignores the write after the first mount anyway (test: "widening a shared view's props in place after its first mount changes nothing Vue reads, inside one app"). Across apps the write is honored, which is why identity, not the cache, is the load-bearing reason.

**Evidence:** `Kit.test.ts`: "the rewrapped view is a fresh object with every base field, the class's props and emits, and the scope id", "a prop only the derived class declares arrives through the rewrapped view and falls through as an attribute on the base view", "an event only the derived class declares emits cleanly through the rewrapped view and warns through the base view".

**Impossible if true:** A widened prop arriving in `props` through the base view. A rewrapped view missing a field the base had. The base view's declared contract changing.

**Verification:** `npx vitest run examples/playground/src/kit -t "reaches Vue"`

**Status:** provisional

**Last refined:** 2026-09-10

### Kit props reach the getters an author opens

**Invariant:** If an entry carries `props`, then the class reads them only where its own getters say so — `this.props.kit?.props?.cap ?? this.props.cap` opens `cap` to the kit and the kit wins, `this.props.kit?.props?.theme` is a prop the class has only through the kit, `this.props.code` is closed to it — and a prop the kit does not own stays live to the parent.

**Scope:** Every kit-rendered class. `Kit.ts` has no hand in it: `kit` is a declared prop, so the read is an ordinary tracked read through Vue's props proxy. Vue's props are readonly at the top level in dev, so no value can be written into props from outside the parent; a runtime that allowed the write would not change the ruling, which is that the getter is the class's word on what a prop means.

**Mechanism:** The entry arrives as the `kit` prop like any other prop. Vue refuses a top-level write into props with a warning, so no merge into props exists, and `nestedProps` keeps its one-argument form. Forcing a prop the author did not open is a getter override on a derived class, the ordinary move.

**Generates:** The three getter shapes on `Code.ts`; the `DenseCard` override in the spec; the rule "a kit reaches a prop only through a getter that reads it".

**Rejected alternatives:** A proxy over props at the view or in a helper — a second props mechanism, and `this.props` stops being Vue's object; a derived class carrying `propsDefaults` — Vue defaults at the boundary first, so the values never applied to declared props; `Object.create` over Vue's props — a new identity for `this.props`; a `v-bind` of the entry's props at the seam — order-dependent and forgettable.

**Evidence:** `Kit.test.ts`: "a tunable reads the kit first, an extension reads only the kit, a closed prop never reads it", "a prop the kit does not own stays live to the parent; one the kit owns stays the kit's", "Vue refuses a top-level write into props".

**Impossible if true:** A kit value reaching a prop no getter opened. A kit value written into Vue's props. A parent's later value for an unowned prop not seen by the class.

**Verification:** `npx vitest run examples/playground/src/kit -t "getters an author opens"`

**Status:** provisional

**Last refined:** 2026-09-10

## Impossibility boundary — what these invariants forbid

If the invariants hold, none of these can exist in a correct state:

- a subclass rendering its parent's sections because it read a cached kit that was not its own
- a base kit, namespace or view changed by resolving an override
- a seam that passes anything but the entry, or a view that constructs a class its entry did not name
- a listener or slot lost by swapping the component behind a seam
- a widened prop or event unknown to the view that renders the widened class
- a kit value in Vue's props, or in a getter that did not read it

A change that introduces any of the above is breaking an invariant, not
adding a feature — re-derive from here before writing it.
