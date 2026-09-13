# Kit — Invariants

The living contract for `Kit.ts`, the template axis of a malleable
component tree: a model declares the roles its subtree composes as data
on its class, a seam renders a role's view and hands it the role's entry,
and an override is a subclass whose kit names other entries. Records are
unnumbered; the name is the identifier and is referenced verbatim by code
annotations (`// invariant: <name> (examples/playground/src/kit/kit.invariants.md)`)
and by the generator header of the colocated `Kit.test.ts`.

The fixtures under `fixtures/` are the proving tree: `Panel` above `Card`
above three sections and a `Code` leaf, and `Strip`, a container whose view
renders its kit's `order` and feeds its items through a bound role, every
view a `<script setup>` SFC with a class contract. They exist for the spec and for the design task
`tasks/ai-chat-kit.md`, which this file's records govern.

## Generator

### A tree is malleable when every seam carries one entry and every class reads only its own kit

**Invariant:** If every model declares its roles as `static get $kit()`, every seam is `<component :is="model.kit.Role.view" v-bind="model.seam(Role)" />` — a container looping that seam over its kit's `order` — every view constructs the class its entry names, and every model reads its kit from its own class, then any role at any depth can be swapped, derived, tuned, fed, inserted, dropped or moved from outside by a patch that names roles and never positions, and no patch reaches a tree that did not ask for it.

**Scope:** `Kit.ts` and every class that declares `$kit`. Vue 3.5, the reactive-proxy runtime; Vapor is not exercised.

**Components:**

- [A class reads only its own kit](#a-class-reads-only-its-own-kit) — why a subclass never inherits its parent's cached kit.
- [An override never reaches another tree](#an-override-never-reaches-another-tree) — why `resolve` and `derive` build and never write.
- [The entry crosses the seam](#the-entry-crosses-the-seam) — why a swap keeps the parent's listeners and slot content.
- [A derived contract reaches Vue](#a-derived-contract-reaches-vue) — why a widened class comes with a rewrapped view.
- [Kit props reach the getters an author opens](#kit-props-reach-the-getters-an-author-opens) — why a consumer's values travel as a prop and never into props.
- [Props and emits are fixed per component object](#props-and-emits-are-fixed-per-component-object) — the reality the rewrapped view answers.
- [An order is edited only through relations against names](#an-order-is-edited-only-through-relations-against-names) — why a container's children are data a layer edits without a copy, and why a list is refused.
- [A bind is a projection the layer above extends](#a-bind-is-a-projection-the-layer-above-extends) — why what a child receives is on the entry and composes through `inherited`.
- [A second write to one field is reported never merged](#a-second-write-to-one-field-is-reported-never-merged) — why several layers stay readable.

**Mechanism:** `Static()` caches a `$`-prefixed static getter once per receiver through an own-property guard, so `$kit` costs one build per class and a subclass builds its own. Two paths, treated differently. The derive path runs once per kit at load: `resolve` walks a kit, derives the namespace of every entry with a `subkit` and rewraps its view; `derive` extends the base's `$Class` with a `$kit` that is the base's merged with the patch, resolves the patch's `order` relations against the base's list, composes a patch's `bind` over the base's, and leaves the chain (`derivedFrom`, `patch`, `layer`) on the namespace it returns; `view` copies a compiled SFC's fields under a class's `props` and `emits`. Its output is plain frozen objects and arrays a render indexes directly. The render path runs per role per render and is `seam` alone: two property reads, one object for an unbound role, one seam object and one `inherited` closure for a bound one, no array method, no intermediate array. Reading a chain back — the contacts, the printed tree — is `KitInspect.ts`, which imports `Kit.ts` and never the reverse, and which the render path never imports.

**Generates:** The colocated `Kit.test.ts`; the design in `tasks/ai-chat-kit.md` and the "The kit" section of `tasks/malleable-architecture.md`; the conversion of the AI chat example, when it comes.

**Impossible if true:** A base kit changed by reading an override's kit. A view constructing anything but its entry's namespace `Class`. A kit value reaching a prop no getter opened. A widened prop or event unknown to the view that renders the widened class. A layer holding a container's list, or a container naming a role in its template.

**Evidence:** `Kit.test.ts`, 29 specs, every one mounting or constructing real fixtures, six of them compile-time (`@ts-expect-error` arms tsc holds); `KitInspect.test.ts`, 3 specs over the chain.

**Verification:** `npx vitest run examples/playground/src/kit` green, then `node .claude/skills/invariants/scripts/check_invariants.mjs --all --refs` clean, then `npm run gate:docs` at zero findings.

**Status:** provisional

**Last refined:** 2026-09-11

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

**Last refined:** 2026-09-13

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

**Scope:** `Kit.Class.derive`, `resolve`, `view`, `merge`, `mergeEntry`, `freeze`. Every override at every depth, including one resolved from data at runtime. A role holds an entry or a map of roles (`MessagePartToolCall`'s cards by tool name under `Tools`); `isEntry` tells them apart, and `merge` and `freeze` recurse into a map. A `subkit` arrives only through a patch — `mergeEntry` derives the child there; `resolve` is the one-line form for a subclass file that writes a `subkit` reach by hand, the form the malleability guide shows.

**Mechanism:** `merge` reads the base kit through the base class (so it is the base's cached object) and spreads into fresh objects; `derive` extends `namespace.$Class` and returns `{ ...namespace, $Class, Class }`; `view` copies the compiled SFC object; `freeze` freezes the map, every entry and the order but stops at a namespace (its `Class` slot is the global override), a view (Vue's object) and a `props` bag (the consumer's). A props-only patch derives nothing; a namespace-only patch rewraps the kept view; a subkit derives the child namespace inside `mergeEntry` and rewraps the view over it.

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

**Scope:** `Kit.Class.vue`, called by `resolveEntry` for a derived namespace and by `mergeEntry` for a patch that names a namespace and keeps the view; also callable by hand for an override literal.

**Mechanism:** Stands on [Props and emits are fixed per component object](#props-and-emits-are-fixed-per-component-object). A compiled SFC is a plain object of a few fields (`setup`, `render`, `props`, `emits`, `__name`, `__scopeId`, `__file`, `__hmrId`), so a copy with two fields replaced is a component with the same template and a different declared contract. Vue defaults only the props a view declared, and `nestedProps` never writes a top-level prop, so a derived default for an undeclared prop never applies either.

**Generates:** The `ThemedCode` fixture (a `theme` prop, a `select` event) and its rewrapped view; the "widened contract" extension in `tasks/ai-chat-kit.md`.

**Rejected alternatives:** `Object.create(view)` with own `props` and `emits` — Vue reads component options as own keys and the prototype-backed view renders nothing at all (test: "a view made by Object.create over the base does not render at all"); writing the widened `props` onto the shared view — it would widen every tree that names the view, and inside one app Vue's per-app cache of normalized options ignores the write after the first mount anyway (test: "widening a shared view's props in place after its first mount changes nothing Vue reads, inside one app"). Across apps the write is honored, which is why identity, not the cache, is the load-bearing reason.

**Evidence:** `Kit.test.ts`: "the rewrapped view is a fresh object with every base field, the class's props and emits, and the scope id", "a prop only the derived class declares arrives through the rewrapped view and falls through as an attribute on the base view", "an event only the derived class declares emits cleanly through the rewrapped view and warns through the base view".

**Impossible if true:** A widened prop arriving in `props` through the base view. A rewrapped view missing a field the base had. The base view's declared contract changing.

**Verification:** `npx vitest run examples/playground/src/kit -t "reaches Vue"`

**Status:** provisional

**Last refined:** 2026-09-10

### Kit props reach the getters an author opens

**Invariant:** If an entry carries `props`, then the class reads them only where a getter says so — a setting is a getter; a base class reads its own props and is closed to the kit; a layer is a subclass whose getter reads the entry and falls back to `super` (`this.props.kit?.props?.cap ?? super.cap`), so the kit wins where a layer opened it and nowhere else — and a prop no layer owns stays live to the parent. The fixture `Code` opens its getters in place (`?? this.props.cap`) to keep the spec small; the layer form is the same read one class up.

**Scope:** Every kit-rendered class. `Kit.ts` has no hand in it: `kit` is a declared prop, so the read is an ordinary tracked read through Vue's props proxy. Vue's props are readonly at the top level in dev, so no value can be written into props from outside the parent; a runtime that allowed the write would not change the ruling, which is that the getter is the class's word on what a prop means.

**Mechanism:** The entry arrives as the `kit` prop like any other prop. Vue refuses a top-level write into props with a warning, so no merge into props exists, and `nestedProps` keeps its one-argument form. Forcing a prop the author did not open is a getter override on a derived class, the ordinary move.

**Generates:** The three getter shapes on `Code.ts`; the `DenseCard` override in the spec; the rule "a setting is a getter, override is `super`, a layer is a subclass"; the docs demo's `ConfiguredCode` layer over a closed `Code`.

**Rejected alternatives:** A proxy over props at the view or in a helper — a second props mechanism, and `this.props` stops being Vue's object; a derived class carrying `propsDefaults` — Vue defaults at the boundary first, so the values never applied to declared props; `Object.create` over Vue's props — a new identity for `this.props`; a `v-bind` of the entry's props at the seam — order-dependent and forgettable; a generated opener (`derive(Code, { open: [...] })`) — a mechanism to spare a getter, which costs more than the getter and cannot compute.

**Evidence:** `Kit.test.ts`: "a tunable reads the kit first, an extension reads only the kit, a closed prop never reads it", "a prop the kit does not own stays live to the parent; one the kit owns stays the kit's", "Vue refuses a top-level write into props".

**Impossible if true:** A kit value reaching a prop no getter opened. A kit value written into Vue's props. A parent's later value for an unowned prop not seen by the class.

**Verification:** `npx vitest run examples/playground/src/kit -t "getters an author opens"`

**Status:** provisional

**Last refined:** 2026-09-11

### An order is edited only through relations against names

**Invariant:** If a container's kit carries `order` and a patch edits it, then the patch names roles and their neighbours — `after`, `before`, `without`, `move` — and never a list; every relation lands against its anchor by name once the list holds the anchor, an inserted role anchoring a later relation of the same patch; two layers on one anchor land in derivation order, the outer layer nearest the anchor; and a list, a name the order lacks, a role named twice in one patch, relations that contradict each other, a re-insert of a present role, or a placed role no entry declares throws at derive time — and, for a top-level patch whose base kit is typed, fails to compile first: an anchor is a base role or one the patch declares, a removal or a move names a base role, an inserted name is one the patch declares, and a later layer's base includes the roles an earlier layer added.

**Scope:** `Kit.Class.derive` over any kit with `order`; `merge`, `order`, `placing`, `apply`, `relationsOf`; the types `Kit.OrderPatch`, `Kit.Checked`, `Kit.Derived`. Below a `subkit` the added names are open to the types and the runtime check holds the line. The container's template is `<template v-for="role in model.kit.order" :key="role"><component v-if="model.shows(role)" :is="model.kit[role].view" v-bind="model.seam(role)" /></template>`; presence is `shows(role)`, a named method a layer overrides with a `super` fallback, never a bind. A markup leaf between roles is a tag role — an entry whose `view` is a tag name and has no `namespace`; a wrapper around a subset is a container role with an order of its own.

**Mechanism:** A held list is a snapshot: a role upstream adds later vanishes from every layer that holds one, and two such layers cannot compose. A relation names what it knows and nothing else, so an upstream addition lands where upstream put it. `order` guards first — a list, a base with no order, a role named twice, a move against itself — then walks: every pass applies each relation whose anchor stands in the list and is not itself waiting to be placed (a removal's anchor is its own role), and a pass that applies nothing throws with the relations it could not place — a name the order lacks, or relations that wait on each other, which is what a cycle is; `apply` is the one operation — take the role out for a removal or a move, place it for a move or an insert. There is no separate cycle search: the stall is the refusal. `merge` checks every role the resolved order names against the resolved entries. At compile time `derive` holds a literal patch to `Kit.Checked<Space, P>`: the patch's own keys are the names it may insert, the base kit's roles the names it may remove or move, and a derived namespace's kit type carries the added roles forward.

**Generates:** The `ChatMessage` row as a container of six roles; the Bubbles, Minimal and Compact trees as patches (`examples/playground/src/examples/ai-chat/variants/ChatVariants.ts`); the `Strip` fixture; the design `tasks/malleable-templates.md`.

**Rejected alternatives:** A layer writing the full order — a snapshot that drops upstream roles and cannot compose; appending at a missing anchor and carrying on — hides a false assumption; a priority number per patch — per-seam priorities are the tangle; key order of a `subkit` as list order — membership and sequence are different facts; parts and sections as one loop — they differ by the seam's `item` and `key`, and the difference is the contract; dropping `before` — the first position has no predecessor to be after.

**Evidence:** `Kit.test.ts`: "after, before, without and move resolve against names, and the mounted strip renders the resolved order", "two layers on one anchor land in derivation order, the outer layer nearest the anchor, and a third layer sees both", "a list, a missing anchor, a missing role, a cycle, a role named twice, an undeclared role and a re-insert are each refused at derive time", "a tag role renders its element with the bind and nothing else, and a tag view passes through view() unwrapped", "a patch refuses an anchor the base lacks, an inserted name it does not declare, and a list; and a later layer knows the roles an earlier one added" (compile-time); `ChatMessage.test.ts`: "bubbles, minimal and compact are patches over the order — nothing copied, the shipped row untouched".

**Impossible if true:** A derived kit whose `order` came from a list in a patch. A relation against a name the order lacks resolving silently. A container's template naming one of its sections. A resolved `order` that is anything but a plain frozen array of strings.

**Verification:** `npx vitest run examples/playground/src/kit -t "relations against names"`

**Status:** provisional

**Last refined:** 2026-09-11

### A bind is a projection the layer above extends

**Invariant:** If an entry carries `bind`, then what its role's view receives is `bind({ model, item, key, inherited })` — one argument, names never positions; `item` and `key` are the list's under a list container and `undefined` under a section container; `inherited()` takes no arguments and is the layer below's bind closed over the same seam, the default `{ model, kit }` when no layer bound — and a role with a class always receives its entry beside what the bind returned, so its view constructs the class the kit names; a role without `bind` receives `{ model, kit }` and no seam object is built; a tag role receives only what its bind says.

**Scope:** `Kit.Class.seam`, called by every container's `seam(role, item?, key?)`; `mergeEntry` for the composition; `Kit.Class.entry` and the types `Kit.Bound`, `Kit.Exact`, `Kit.EntryCheck` for the contract. A bind reads and returns: it never creates state, calls a composable, or writes to the model — heavy logic stays on the class and a bind composes named getters and methods. It runs inside the container's render, so every read it makes is tracked by that render, as an inline binding's was; `seam` is the render path and allocates nothing beyond the object the role receives, the seam and the one `inherited` closure the design requires (measured: about 1 ns per unbound call, 6 ns per bound call and 25 ns per bound call through two layers, one million calls, Node 26).

**Mechanism:** `seam` reads the entry and nothing else — a container never branches on a role's name because the kit already is the table keyed by role. `mergeEntry` wraps a patch's bind so that its seam's `inherited` runs the base's bind on a copy of the seam whose `inherited` is the layer below's; a chain of layers nests the wrap, so each layer's `inherited` is the layer below's resolved bind and the innermost is the seam's default. `seam` writes `kit: entry` onto the bind's result for a role with a namespace — the entry crosses the seam by construction, not by every bind author remembering it. The types: an entry written as `Kit.Class.entry(View, Namespace, { bind })` infers its namespace, so `Kit.Bound<N>` — `Partial<PropsOf<N>> & Attrs`, with `PropsOf` read off the namespace's constructor — is what the bind must return, and `Kit.Exact` refuses a key that is neither a prop nor an attribute; `Owner` and `Item` arrive from the kit's declared type. A subkit's binds see the child's instance as `model` (`Kit.ModelOf<N>`), read off the parent entry's namespace. `bind` is a method signature, not a property: a method's parameter compares bivariantly, so an entry whose bind names its owner still assigns to the loose `Kit.Entry` a view's `kit` prop declares; and `Seam.item` is `Item` itself, never a conditional over it, or the parameter's variance is unmeasurable and the same assignment fails.

**Generates:** The parts loop of `ChatMessage` (`bind: this.bindPart` on every part entry, the part as the seam's item); the Compact tree's dressed foot; `props` on an entry stays a different thing — pulled by the child through `?? super`, where `bind` is pushed by the parent.

**Rejected alternatives:** A `seam` that switches on the role name — a lookup table keyed by role, duplicated from the kit, unpatchable; a separate `attrs` field — a fragment of `bind`, since props, attrs and listeners are one `v-bind` object; positional bind arguments — a later field would touch every bind; presence through `bind` — a bind returns props, and a role that is not there has none to return; a wrapper that swaps `inherited` on the one seam object and restores it as the layer below runs, to spare the copy — a bind that calls `inherited()` twice gets the default on the second call instead of the layer below (test: "a layer's bind may call inherited() twice"); one `Kit.Of` with an item map per role in place of `Kit.Of` beside `Kit.Roles` — a container that is a section container and a list container at once (a row with sections and parts) is `Of<Sections, Owner> & Roles<Parts, Owner, Part>`, one `order` over the sections and one item over the parts, and a per-role item map would put the contract in a type argument no seam names.

**Evidence:** `Kit.test.ts`: "seam() hands an unbound role { model, kit }, a bound class role its entry beside the bind, and a tag role only the bind", "two layers over a bound role compose through inherited, and the mounted items carry every layer", "shows() decides presence: the base hides the foot over no items, a layer overrides it with a super fallback", "a typed entry refuses a wrong prop name and a subkit bind refuses a field its model lacks; the right names compile" (compile-time); `ChatMessage.test.ts`: "seam() hands a section the model and its entry, and a part its entry beside the bind — one method, no role named".

**Impossible if true:** A bound role with a class rendering without its entry. A layer's `inherited()` returning anything but the layer below's bind over the same seam. A seam object allocated for an unbound role.

**Verification:** `npx vitest run examples/playground/src/kit -t "the layer above extends"`

**Status:** provisional

**Last refined:** 2026-09-11

### A second write to one field is reported never merged

**Invariant:** If a patch replaces a field (`view`, `namespace`, `props`) of an entry a layer below already replaced, or moves a role a layer below already moved, then the chain `derive` leaves on the namespace names the contact and every layer that wrote it in derivation order — `KitInspect.Class.conflicts` lists it, `report` warns on the console or throws when `strict` — and the last write wins; a `bind` over a `bind` and an insert beside another are composition, not contacts; the shipped base is not a layer, so a first replacement is silent; `derive` itself stays silent, because the report is a reading of the chain and not the render path.

**Scope:** `KitInspect.ts` — `layers`, `conflicts`, `report`, `writesOf`, `tree` — over every chain `[p1, p2, p3].reduce(derive, Base)`; imported by specs and a dev panel, never by `Kit.ts` and never on the app's render path. Precedence is derivation order alone: later wins everywhere, the way a later stylesheet or a subclass wins. The app resolves a contact as the last layer, and the report shows that it did. `derivedFrom`, `patch` and `layer` on every derived namespace are what `tree` reads to print the resolved tree: each seam's position, role, view, class, bind, and the layer that set each.

**Mechanism:** Every derived namespace carries the patch it is and, when `derive` was given one, a name (else `layer N` by its place in the chain); `writesOf` flattens a patch to keys — `Message.Head.view`, `Message#move:Foot` — and `conflicts` counts the layers per key over the whole chain, exempting `.bind` and inserted positions. `tree` computes each layer's keys once and hands the map down, so a tree over a chat-sized kit is linear in the patches, not quadratic. A class prints by its raw name: `Static()` names the class it wrapped on the bound subclass under its own `STATIC_RAW` key, and `derive`'s subclass is anonymous, so `className` unwraps the first and steps over the second until a named class stands — no class name inside `Static()` is known here. Nothing is merged: `mergeEntry` still spreads the patch over the base, so the report describes what happened and changes nothing.

**Rejected alternatives:** A priority number per patch or per seam — a second ordering to reconcile with the chain; silent last-wins — the diagram nobody can read after thirty plugins; merging two views — there is no such thing.

**Evidence:** `KitInspect.test.ts`: "a view written twice warns with both layers in order, throws when strict, and the last write wins", "a role moved twice is a contact, an insert beside another is not, a bind over a bind is not, and a nested write is keyed by its path", "tree() prints every seam with its position, view, class, bind and the layer that set each".

**Impossible if true:** Two layers replacing one field with no line in the report. A strict report returning over a contact. A printed tree that cannot say which layer set a seam's view. `Kit.ts` importing `KitInspect.ts`.

**Verification:** `npx vitest run examples/playground/src/kit/KitInspect.test.ts`

**Status:** provisional

**Last refined:** 2026-09-11

### A kit declares one level

**Invariant:** If a class composes others, then its kit declares exactly the roles its own template renders — an entry per role, an `order` when the template loops, a role map when one role dispatches by an external name — and nothing below that level; the class an entry names declares the next level in its own kit; the tree is classes pointing at namespaces and is never written as one nested object; and a view that loops over seams is a compositor with a class of its own, never a classless leaf whose roles a parent declares for it. `KitContainer` is that class's base: the kit and `seam` inherited, `roleOf` and `keyOf` the two facts a list supplies, `entryOf` the one a dispatch supplies, `viewOf` and `propsOf` derived, `entry()` attaching the container's `bindEntry` to every entry it builds.

**Scope:** every compositor. `subkit` is the only place one kit mentions another's roles, and it edits them — a patch downward, never a declaration. A role map (`Tools`, keyed by tool name) is owned by the compositor whose template dispatches into it; a map never has a class of its own, which is the test: if what sits below would need a class, it is a child and declares itself.

**Mechanism:** one level per class means a patch names a role and a `subkit` for the next level, a class swap replaces a whole subtree, `derive` on a leaf never touches a root, and `KitInspect.tree` reads the tree back by walking `namespace` to `$kit` to `namespace`. `MessagePartList` is the case that closed it: the row once held `roleOf`, `keyOf`, the kind table and the part bind on behalf of a classless list view; as a compositor it owns them, the row is sections only, and the row feeds it through one bind.

**Generates:** `KitContainer.ts`; the folder rule (`Compositor.Role.vue` for a classless leaf, `Family.Role.ts` for a classed role, a subfolder where a role is itself a compositor); `KitInspect.misordered`, since a kit read as a template is declared in the sequence its `order` renders.

**Rejected alternatives:** a `children` field on an entry — a third kind of thing under an entry, a branch in every walk, and `subkit` with the opposite meaning; a `Parts` map on the row holding the part roles — kept the row declaring roles it does not render; a per-class kit object carrying `propsOf` and friends — a seam needs the model, so either the template names it twice or an object is allocated per row, and the kit stops being data; mixin capabilities — the kit is the essence of a compositor, one base per essence, everything else held.

**Evidence:** `MessagePartList.test.ts`; `ChatMessage.test.ts`: "seam() hands a section the model and its entry, and the parts list what it renders"; `ConfiguredChat.test.ts`: "every hand-written kit in the chat declares its sections in the sequence its order renders them"; `KitInspect.test.ts`: "misordered() names a kit whose declaration reads in another sequence than its order".

**Impossible if true:** A kit declaring a role its own template does not render. A root object that knows a whole tree. A patch that needs a path. A view looping over seams whose roles a parent declares for it. A `children` field on an entry.

**Verification:** `npx vitest run examples/playground/src/examples/ai-chat/message examples/playground/src/kit/KitInspect.test.ts examples/playground/src/examples/ai-chat/ConfiguredChat.test.ts`

**Status:** provisional

**Last refined:** 2026-09-13

## Impossibility boundary — what these invariants forbid

If the invariants hold, none of these can exist in a correct state:

- a subclass rendering its parent's sections because it read a cached kit that was not its own
- a base kit, namespace or view changed by resolving an override
- a seam that passes anything but the entry, or a view that constructs a class its entry did not name
- a listener or slot lost by swapping the component behind a seam
- a widened prop or event unknown to the view that renders the widened class
- a kit value in Vue's props, or in a getter that did not read it
- a layer holding a container's list, a relation against a name that is not there resolving silently, or a container's template naming one of its sections
- a bound role with a class rendering without its entry, or a layer's `inherited()` returning anything but the layer below's bind
- two layers replacing one field with no line in the report
- a kit that declares a role its own template does not render, a root object that knows a whole tree, a patch that needs a path, or a looping view whose roles a parent declares for it

A change that introduces any of the above is breaking an invariant, not
adding a feature — re-derive from here before writing it.
