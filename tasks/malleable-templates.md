# Malleable templates — the role-tree design (2026-09-11)

Design note; nothing here is built yet except the seam anatomy that ships in `examples/playground/src/kit/Kit.ts`.
The full page with diagrams: https://claude.ai/code/artifact/a5f3444e-9716-41d6-8ffe-8d6d0357c615

## The shape in one line

A template is a tree of roles. A container renders `order`; a layer edits `order` only by relations against
names (`after`, `before`, `without`, `move`); a role's view is a component or a tag; the entry says what the
child receives through `bind({ model, item, key, inherited })`; a layer extends that through `inherited`;
precedence is the derivation chain, the app is the last subclass. Nothing is positional except the chain.

## The entry — five fields

`view` (an SFC or a tag name) · `namespace` (the class; absent for a tag role) · `props` (pulled by the child
through `?? super`) · `subkit` (the child's own roles) · `bind` (pushed by the parent).

## Decisions taken

- Relations, never an absolute list: `derive` refuses one. An anchor the base lacks throws at derive time.
- Two layers on the same anchor resolve by derivation order, outer last. A cycle inside one patch throws.
- Conditional roles: `v-if="model.shows(role)"` on the container's class; a layer overrides `shows` with `super`.
  Presence never comes from `bind`. `v-show` is `bind` returning a style; directives become roles.
- Views are single-root, so fallthrough works at every seam. Markup between roles is a tag role
  (`Rule: { view: 'hr' }`), a wrapper around a subset is a container role.
- `seamProps(role, item?, key?)` builds the seam and never branches on a name. Unbound roles allocate no seam.
- `bind` is a projection: reads and returns; never creates state, calls a composable, or writes. Heavy logic
  stays on the class; `bind` composes named getters. Testable without a mount.
- The seam is one object argument: `{ model, item, key, inherited }`; `inherited()` takes no arguments.
  Under a section container `item`/`key` are typed `undefined`.
- Types: `Kit.Of<Role, Owner, Item>` names the owner once; a child's `Props` come off its namespace
  (`ConstructorParameters<N['Class']>[0]`); a patch is held to the same contract.
- Plugins: `[p1, p2, p3].reduce(derive, Base)`; conflicts (same field written twice, a role moved twice)
  reported by `derive`, warning in dev, throw in strict; the app resolves them as the last layer.
  `derivedFrom` prints the resolved tree. Per-seam priorities are refused.
- Vapor: the shape uses only `<component :is>`, keyed `v-for`, `v-bind` object, `v-if`, slots — nothing vnode
  bound; under Vapor a seam becomes its own effect. Verify fallthrough on a dynamic single-root component
  and the mixed-tree interop cost on the 3.6 RC.

## Refused reductions (they deleted a distinction)

Parts and sections as one loop (different contracts, one seam field apart); dropping `before`; key order as
list order; an absolute `order` list; `seamProps` as a switch on role names; presence via `bind`.

## Build order

`ChatMessage` on `order` + `seamProps` first; Bubbles and Minimal become patches (`without: ['Gutter']`,
a Head entry); then a third variant nobody planned. If that third one is a patch and not a copy, extend the
kit spec (`kit.invariants.md`) with the relations, `bind`, and the conflict report, and move on to the next
container (tool card body, composer bar). The chat root stays literal: three children of three shapes.

## What did not survive contact (built 2026-09-11)

- The seam guarantees the entry. The part bind above returned `{ part, message, chat, key }` and no `kit`, which
  leaves every part view constructing its own class. `Kit.Class.seam` writes `kit: entry` onto the bind's result
  for any role with a namespace; a tag role gets only the bind. Containers delegate one line:
  `seamProps(role, item?, key?) { return Kit.Class.seam(this, this.kit[role], item, key) }`.
- A wrapper is layout, not a role. `ChatMessage.vue` had `<div class="ac-msg-body">` around the sections; a
  `v-for` over `order` cannot emit it and a container role for a `<div>` needs a class. The row is a CSS grid and
  the bubble tree's bubble is a `::before` inside the row's padding. `Await` is a row role, so it renders as a
  sibling of `Parts`, not inside it.
- `Kit.Roles` beside `Kit.Of`. The row is a section container and a list container at once; its kit is
  `Of<Sections, Owner> & Roles<Parts, Owner, Part>`. One `Of` with an item map per role was refused.
- `derive` is silent; reading a chain back is `KitInspect.ts`. `derive` leaves `derivedFrom`, `patch` and
  `layer` on the namespace; `KitInspect.Class.conflicts` lists the contacts, `report` warns or throws when
  strict, `tree` prints the resolved tree. `Kit.ts` never imports it and the render path never runs it.
- The types reach this far: an entry written as `Kit.Class.entry(Namespace, View, { bind })` holds its bind to
  the child's props and refuses a stray key; a subkit bind sees the child's instance; a top-level patch's order
  relations are checked against the base's roles and the patch's own, and a derived namespace's kit type carries
  the roles a layer added. Below a `subkit` the added names are open and the runtime check holds the line. The
  row's part entries stay plain literals: each part view declares `part` as its own kind while the seam's item is
  the union the kind→role lookup narrows at runtime. `Seam.key` is `string | number | undefined` under every
  container — a conditional on `Item` made the seam's variance unmeasurable.
- `bind` is a method signature in `Kit.Entry`, so a typed entry still assigns to the loose `Kit.Entry` a view's
  `kit` prop declares.
- A `without` of a role an earlier layer already removed throws (a name the order lacks); a `bind` written by
  two layers is composition, not a contact.
