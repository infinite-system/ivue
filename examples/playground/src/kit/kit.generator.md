# The kit — generator, what fell out, what was refused

The record of how the kit reached its shape: the one invariant everything
derives from, the forms it generates, the forms that were tried and did not
survive, and the facts about TypeScript, Vue and the engine that were found
along the way. The contract that binds the code to specs is
`kit.invariants.md`; this file is the reasoning behind it, kept so the
refused forms are not rediscovered and the accepted ones are not re-argued.

Every claim below was executed: the specs named are in the tree, the
numbers were measured, the type behaviours were reproduced with `tsc` and
`vue-tsc`, and the browser behaviours were driven with Playwright on the
docs page.

## The generator

> A component's composition is data the class declares, one level deep; a
> patch edits that data by name; every seam reads an entry and never a role's
> name.

Everything else is a consequence. Written out:

- A class that composes others declares `static get $kit()`: an entry per
  role and, when the template loops, an `order`. Nothing below that level —
  the class an entry names declares the next level in its own kit.
- An entry is four fields: `view`, `namespace`, `props`, `bind`. Each says
  something true of its role alone.
- A container's template is one loop: `<component :is="model.kit[role].view"
v-bind="model.seam(role)" />` over `model.kit.order`. It names no role.
- A patch is a record with the same shape as a kit, merged over it by name.
  `order` is edited through relations against names — `after`, `before`,
  `without`, `move` — never a list. `subkit` reaches the next level.
- Every compositor extends `KitContainer`. It inherits `kit` and `seam`, and
  supplies for a list the two facts a list owns: `roleOf` and `keyOf`.

## What it generates

### One shape at four scales

A layer is a subclass. An entry shadows an entry. A relation shadows a
position. A patch shadows a kit. `?? super` at every scale: a subclass's
getter falls back to `super`, a layer's bind extends `inherited()`, a
derived kit's order is the base's with relations applied. Nothing in the
system is positional except the chain of layers, and the chain is data
`derive` leaves on the namespace (`derivedFrom`, `patch`, `layer`), so
`KitInspect` can read it back.

### The file tree is the kit

A file is named by its position in the kit: the compositor whose `$kit`
names the role, a dot, the role key exactly as `order` spells it, a second
dot and a variant name when the file is an alternate view for that role. A
compositor's own three files carry its bare class name. A class file whose
stem is dotted declares the class the stem spells with its dots removed —
`MessagePart.Text.ts` declares `$MessagePartText` — and the standards gate
reads a dotted stem that way. Folders are kebab-case and named after the
family they hold; a subfolder appears exactly where a role is itself a
compositor.

```
message/
  ChatMessage.ts / .vue / .test.ts        the compositor
  ChatMessage.Header.vue                  a classless leaf: role Header of ChatMessage
  ChatMessage.Header.Bubble.vue           an alternate view for the same role
  message-parts/
    MessagePartList.ts / .vue             the list: a compositor of its own
    MessagePart.ts                        the family's shared Props
    MessagePart.Text.ts / .vue            role Text, class $MessagePartText
    tool-calls/
      ToolCall.ts                         the base of the calls
      ToolCall.Header.vue                 a classless leaf of ToolCall
      ToolCall.Bash.ts / .vue             role Bash, class $ToolCallBash
```

Browsing the folder, the prefix says who composes the file, the segment
after the dot is the string a patch author writes in `without` or `move`,
and a name with two dots is a variant. Grepping a role, reading the folder
and printing `KitInspect.tree` agree without a comment. The first word is
the family, so quick-open by name never collides: `MessagePart.Text`, not
`Text`.

A record type a class renders is not the class and keeps its own name:
`SessionLog.TextPart` is the log's record, `MessagePartText` renders it.
Who wrote a message is its `speaker`; `role` means a kit role everywhere.

### A kit is read as its template

Its entries are declared in the sequence `order` renders them, `view`
first in every entry — what renders, then what runs it, then what it
receives. `KitInspect.misordered` reports a hand-written kit declared in
another sequence, and the chat asserts its whole tree clean. A derived
layer is exempt: `merge` appends what a patch inserts.

### Presence is the leaf's own

A leaf's root carries `v-if` on a named getter of the model:

```vue
<footer v-if="model.hasReceipt" class="ac-msg-foot">{{ model.receiptLabel }}</footer>
```

The container's loop carries no `v-if`. A layer changes presence the way it
changes any fact of the model — override the getter with a `super`
fallback. The one cost is that a hidden role still mounts and renders a
comment; for the row that is three classless leaves and, while a row is a
stub, one list instance over an empty array.

### A bind is a named static

```ts
static bindPart({ model, item }: Kit.Seam<$MessagePartList, SessionLog.Part>): MessagePart.Props {
  return { part: item, chat: model.chat, message: model.message };
}
```

and the kit names it on every entry it feeds: `bind: this.bindPart`. The
`$kit` getter runs once per class with `this` as that class, so a subclass
that overrides `bindPart` with `...super.bindPart(seam)` changes what every
part receives without redeclaring the kit; the base kit keeps its own
function. An inline arrow can never be extended. A bind with an annotated
return refuses a wrong key at its `return`; a patch's inline bind is checked
by `derive` through `Checked`.

### What a child receives is declared on its entry

Nothing crosses a seam by markup. A `<component>` seam carries `:is` and
`v-bind` and nothing else, because an attribute on a seam is the one thing
no patch can reach. Constants a consumer sets go in `props` and the child
reads them through its own getters (`this.props.kit.props.cap`); anything
that depends on the model or the item goes in `bind`.

### A dispatch is a list

The tool-call part renders one `<component>` chosen by tool name. It is a
`KitContainer` whose `roleOf` picks a card — exact name, then a family by
prefix or pattern, then the generic card — and the thirteen cards are flat
roles beside the three families. `entryOf`, `viewOf` and `propsOf` fall
out. A list of one is still a list.

### Plugins compose by data

`[p1, p2, p3].reduce(derive, Base)`; later wins, the way a later stylesheet
wins. A field two layers both replace is a contact `KitInspect.conflicts`
names with both layers in order; `report` warns or throws when strict. A
bind over a bind and an insert beside another are composition, not
contacts. A subkit reaches any depth — the row spec proves a chat patch
swapping one part view two levels down, with the list's own bind kept and
every shipped kit untouched.

## The standard, as rules

The operational form of everything above, written to be lifted into the
ivue skill as-is: each line is a rule an agent follows without the argument
behind it, and the argument is in this file when it is questioned.

**A compositor**

- A class that renders other classes extends `KitContainer.$Class<X.Roles,
Item>` and declares `static override get $kit(): X.Roles`. The return type
  is declared, never inferred and never `satisfies`.
- `X.Roles` names each entry's namespace: `Kit.Of<Role, $X>` for classless
  sections, `Kit.Entry<$X, Item, typeof Child>` per classed role, `& { order:
readonly Role[] }` when the template loops.
- The kit declares exactly the roles the class's own template renders — one
  level. A view that loops over seams is a compositor with a class of its
  own.
- Entries are declared in the sequence `order` renders them, `view` first
  in every entry: `{ view, namespace, props, bind }`.
- The container's template is `<template v-for="role in model.kit.order"
:key="role"><component :is="model.kit[role].view" v-bind="model.seam(role)"
/></template>` and nothing else. A list renders `<component
v-for="(item, at) in model.items" :key="model.keyOf(item, at)"
:is="model.viewOf(item)" v-bind="model.propsOf(item, at)" />`.
- A list supplies `roleOf(item)` and `keyOf(item, at)` as overrides; a kit
  with one entry role supplies neither. A dispatch is a list of one whose
  `roleOf` picks by an external name.
- `this.self` is the one cast per class and it is `protected override`.
- The constructor calls `super()` first.

**An entry**

- `view` is the SFC, or a tag name for a markup role.
- `namespace` is the child's namespace object; absent for a tag role, so a
  view reads `props.kit?.namespace?.Class` cast to its own `typeof X.Class |
undefined`.
- `props` holds constants the consumer sets; the child reads them through
  its own getters, never as component props.
- `bind` is a named static of the compositor, `bind: this.bindX`, with a
  `Kit.Seam<$X, Item>` parameter and an annotated return — the child's
  `Props`, or `Kit.Bound<typeof Child>` when an attribute rides along. Never
  an inline arrow in a base kit.
- What a child receives is on its entry. A seam's `<component>` carries
  `:is` and `v-bind` and never an attribute.

**A leaf**

- A classless leaf is `Compositor.Role.vue`, declares `defineProps<X.
SectionProps>()`, and reads the model dotted. A variant is
  `Compositor.Role.Variant.vue`.
- A leaf's root carries its own `v-if` on a named getter of the model.
  Presence is never in the kit and never in the container.
- A classed role is `Family.Role.ts` beside `Family.Role.vue`, its class
  named by the stem with dots removed, its view constructing `new
((props.kit?.namespace?.Class as typeof X.Class | undefined) ??
X.Class)(props)`.

**A layer**

- A layer is `Kit.Class.derive(Base, patch, 'name')`. A patch has a kit's
  shape; `order` takes `after`, `before`, `without`, `move` against names;
  `subkit` reaches the next level; a bind in a patch is inline and composes
  through `inherited()`.
- A layer that must change a getter, a bind or `roleOf` is a subclass of
  the raw `$Class` with `override` and a `super` fallback, patched in
  through `namespace:`.
- Plugins are `[p1, p2, p3].reduce(derive, Base)`; `KitInspect.report`
  names every field two layers wrote; `KitInspect.tree` prints the resolved
  tree with the layer that set each seam.

**Naming**

- A kit role is a role; who wrote a message is a `speaker`. A record type a
  class renders keeps its own name.
- Folders are kebab-case families; the first word of every file is its
  family, so quick-open never collides.

**Checks**

- `tsc` on the playground and `vue-tsc` pinned (`npx -y -p vue-tsc@2 -p
typescript@5`) both clean; the standards gate; the contract checker;
  and the page driven after any change to a render path.

## The type layer, as it actually behaves

- **`$kit` declares its return type.** `static get $kit(): X.Roles`, with
  `Roles` naming each entry's namespace (`Kit.Entry<$X, Item, typeof
Child>`). The `satisfies` form keeps the literal's inferred type, which
  carries each view's concrete SFC component type; a classless leaf's props
  name `X.Instance`, whose `kit` is that literal — TS2615, `circularly
references itself in mapped type`. Only `vue-tsc` sees it, because the
  cycle closes through `.vue` files; plain `tsc` on the playground is clean
  either way.
- **`vue-tsc` runs pinned or not at all.** `npx -y -p vue-tsc@2 -p
typescript@5 vue-tsc --noEmit -p examples/playground/tsconfig.json`. An
  unpinned `npx vue-tsc` resolves TypeScript 7 and dies on `./lib/tsc`. On
  `main` it crashes inside TypeScript and prints no errors, which is not
  zero errors — read a run to its end.
- **A wrong key in a bind is refused by freshness, not by index
  signatures.** An object literal is checked for excess keys while it is
  fresh, at the point it meets a declared type. A static or function with an
  annotated return — `Child.Props`, or `Kit.Bound<typeof Child>` when an
  attribute rides along — refuses `cod` for `code` at the `return`. The one
  form that lets it through is an inline arrow with no return annotation:
  its return type is inferred first, the literal is no longer fresh, and
  function assignability never checks excess keys. That form is exactly a
  patch's inline bind, and `derive` checks those through `Checked`.
- **`Kit.View` admits a generic SFC.** `vue-tsc` types a `<script setup
generic="T">` component as a function of its type parameter, not a
  `Component`; the virtual scroller is one and five kits name it.
- **`Entry.namespace` is optional** because a tag role has none, so a view
  reads `props.kit?.namespace?.Class`, cast to its own `typeof X.Class |
undefined`.
- **A widening subclass redeclares for the type.** `declare props:
Themed.Props; declare emit: Themed.Emits;` — no field, no initializer,
  and every `this.props` read and `this.emit` call below is typed to the
  subclass, because a bag with one more optional field and an emit that
  takes one more event both assign to the base's.
- **A shared bind is typed loosely on purpose.** `bindPart` serves six part
  classes whose props each name their own kind; the seam's item is the
  union `roleOf` narrows at runtime, so no single class can check it. The
  list's `Roles` is `Kit.Roles<Role, $MessagePartList, SessionLog.Part>`
  and the entries are plain literals.
- **`KitContainer.self` is a statics contract**, `{ $kit }`, so every
  subclass's own `self` — its whole constructor — narrows it without
  conflict. `Composer.Model` is the raw class type, not
  `InstanceType<typeof Class>`, or the kit that names the picker cycles.

## The engine fact this uncovered

`super.method()` in a static override recursed under `Static()`. Every
bound method was cached under `Symbol.for('ivue.staticBound.<name>')` — one
registered symbol per name, shared by every accessor of that name in a
hierarchy. A child's `static override greet() { return super.greet() }` read
the parent's accessor with `this` as the child, found the child's own bound
override already cached under the shared key, and called itself. The same
latent defect sat under `$`-caches, where `super.$kit` could return the
child's cached value. The fix is one unregistered symbol per accessor, with
the re-wrap guard skipping `STATIC_RAW` and the issued keys explicitly. The
engine spec `super reaches the parent under Static()` binds it in both read
orders; coverage stays 100% on every metric; core 1,095 B gzipped, extras
882 B. It was found by proving that `bind: this.bindPart` extends through
`super` — the shape that makes a named bind the true one.

## What was refused, and why each failed

Every one of these was built or argued far enough to see the branch it
added. They are recorded so the argument is not had twice.

- **Nested children in one object** (`children: {…}` on an entry, or a
  `Parts` map on the row holding the part roles). A third kind of thing
  under an entry, a branch in every walk, and `subkit` with the opposite
  meaning. The invariant is one level per class; a view that loops over
  seams is a compositor with a class of its own, never a classless leaf
  whose roles a parent declares for it. `MessagePartList` is the case that
  closed it: the row once held `roleOf`, `keyOf`, the kind table and the
  part bind on behalf of a classless list view.
- **A role map under one key** (`Tools`, the cards by tool name). The last
  reason a kit held anything but entries, and a branch in `merge`, `freeze`
  and the inspector (`isEntry` and three recursions). A flat set of roles
  keyed by the same names dispatches through `roleOf` with no map; the
  concept left the kit entirely.
- **Dispatch by data** (`takes` on the entry; the first entry whose
  predicate holds renders the item, the one without is the fallback). Built,
  specified, reverted. Dispatch is one total function with a precedence and a
  fallback — a fact of the container, like `keyOf` — and splitting it across
  entries scattered that function into thirteen predicates whose composition
  was implicit: declaration order decided precedence, absence of a field
  marked the fallback, and a layer that had to win narrowed someone else's
  predicate. More concepts, and `roleFor` returned `string` where `roleOf`
  returned the typed `Role` union.
- **Presence on the entry** (`shows: (row) => row.hasReceipt`). Presence
  composes — a layer wants "the base rule, and not in compact density" —
  and a single replaceable predicate cannot; giving it an `inherited` makes
  it a second `bind`, and a bind returning a boolean is the hidden `v-if`
  refused at the start. Presence in a `shows(role)` switch on the container
  composed through `super` but was the one place a compositor still named
  its roles in code, and existed only to serve a protocol the loop had to
  call. The leaf's own root `v-if` on a named getter deletes the protocol.
- **A container-wide default bind** (`bindEntry`, injected by
  `this.entry()`). A hidden default: reading `MessagePartList:
this.entry(View, NS)` you could not see the entry was bound, and a second
  list role with different props would have received the wrong ones
  silently. The entry names its bind.
- **`KitContainer.entry()` as an alias of `Kit.Class.entry`.** One name per
  thing.
- **`Kit.Class.entry(...)` at all.** It existed to refuse a wrong key in an
  inline bind by inferring the bind's result and running `Exact` over its
  keys. A named static with an annotated return gets that refusal from
  freshness, and an inline bind belongs in a patch, where `derive` checks
  it. One rule, no helper. The explanation first given for keeping it —
  that `Attrs`'s template-literal index signatures suppress the check — was
  wrong and was replaced after a probe showed a `Bound`-annotated static
  refusing the key.
- **A per-class kit object carrying `propsOf` and friends** instead of a
  base class. A seam needs the model, so either the template names it twice
  or an object is allocated per row, and the kit stops being data. Mixin
  capabilities were the earlier form of the same wish; the kit is the
  essence of a compositor, one base per essence, everything else held.
- **A held form** (a compositor that does not extend `KitContainer` and
  writes `seam` by hand). A hedge with no instance behind it. If a domain
  base ever appears, the domain base extends the container.
- **`namespace` renamed to `model`** on the entry. `model` already names the
  instance in every seam (`{ model, kit }`), in `X.Model` and in
  `Kit.ModelOf<N>`; the field holds the namespace, and one word for two
  things inside one seam is the failure the docs refuse.
- **`Role` renamed** for the kit primitive. `Slot` is Vue's word for a
  position filled by template code at the usage site, and the standard
  already calls `Class` the live slot; `Seam` is the crossing; `Part` is the
  chat's domain; `Position` is what `order` assigns. A role is a named
  position exactly one actor plays at a time and a patch recasts, which is
  the substitution semantics. The collision was the chat's author field,
  which became `speaker`.
- **Default exports for namespaces.** Every class file has a sibling `.vue`
  whose only export is default, so `import { X }` / `import XView from
'./X.vue'` tells the reader which of the pair a line imports; default for
  both forces an alias at every call site, and default imports let each
  file invent a name.
- **Slots as the sections.** Slot content is template code in one file, not
  data; a layer cannot fill a slot, and two plugins cannot compose slot
  fragments. Slots remain a possible third lever — a dynamic slot per role
  with the kit as fallback, filled inline at one usage site and composing
  with nothing — designed and not built.
- **Whole-row swap** instead of role trees. More readable when one author
  owns every variant, and it fails the moment two independent layers both
  want to change the row, because layer B must copy layer A's copy.
- **`bindEntry` typed loosely, `this.entry` typed loosely.** Both forms are
  gone with the helpers they served.

## Measured

Same harness both columns, median of five warm runs, Node 26 under
`vite-node`; the script is `Kit.bench.js` beside the code.

| op                                          | before the reduction |   after |
| ------------------------------------------- | -------------------: | ------: |
| seam, unbound                               |               1.8 ns |  1.5 ns |
| seam, bound, one layer                      |               6.2 ns |  6.4 ns |
| seam, bound, two layers                     |              86.6 ns | 78.6 ns |
| order, clean, three relations               |               468 ns |  294 ns |
| order, cycle refused                        |               5.6 µs |  2.8 µs |
| derive, 3 entries + 1 relation over 8 roles |               5.9 µs |  5.1 µs |

`derive` runs once per class at module load — three times in the chat's
lifetime. What a row pays per render is `seam` once per visible role, and
Vue's own vnode creation for one `<component :is>` is on the order of a
microsecond, so the kit is under 3% of a row's render.

## Bugs the substrate found when driven

None of these were visible in the unit specs; all three appeared the first
time the docs page was driven with Playwright after the compositor split.

- Every loaded message had no speaker, the gutter threw on the avatar
  letter, and the broken render froze the scroller's window so rows
  vanished on scroll. The page files on disk carry `role` because the
  sample generator wrote them before the rename; `ChatApi.page()` now
  adopts a record at the boundary, recursively, since 186 nested sub-thread
  messages carry it too. The index file has its own boundary in `index()`.
- A streaming reply did not grow on screen. The parts list received the
  same array object while it grew in place, and nothing in the list's
  render read the chat's revision — the row used to. The list's `parts`
  getter reads it now.
- Every row was up to 84 px taller than its content. A later stylesheet
  rule set `gap: 12px` on the row grid, which is a row gap as well as a
  column gap, and the grid pre-declared eight auto tracks; empty tracks
  still get their gaps. The gaps are column-only and the tracks are
  implicit.

The lesson is procedural: a change to the render path is not verified
until the page is driven.

## What remains open

- Composition across independent authors has been exercised by three
  variants from one author. The claim rests on the mechanism; a second
  author's plugin is the test that decides it.
- The dynamic-slot lever for one-off overrides at a usage site is designed
  and not built.
- Adding a part kind is a subclass of the list overriding `roleOf` with
  `super`, patched in through `MessagePartList: { namespace: PluginPartList,
subkit: { Image: … } }` — two named moves, explicit and typed. That is
  the accepted shape after dispatch-by-data was reverted.
- During a fast wheel burst the DOM briefly holds over a hundred rows
  before settling; the window widens while measurements land. It predates
  the kit and belongs to the scroller.
- Eighteen `vue-tsc` errors remain in `ChooseField`, the scroller and the
  props-contract example, files the kit work does not touch.
- The naming rule, the `$kit` return-type rule, `declare` widening and the
  `vue-tsc` invocation live in code, in this file and in LESSONS.md. The
  ivue skill and the malleability guide do not yet say them.
