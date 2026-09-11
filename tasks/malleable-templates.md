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
