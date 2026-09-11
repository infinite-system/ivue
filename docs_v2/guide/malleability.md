---
title: Infinite Malleability
description: Replace any part of any component tree — a view, a class, a section, a knob, a declared prop or event — at any depth, from outside, without editing a file. One static on the class holds the roles; one seam shape passes one entry; an override is a subclass written as data.
relatedPosts: [fix-the-scroller-never-open-the-selection, runtime-props-all-along, ship-the-variant-keep-the-tuning, the-options-api-everyone-wanted]
---

<script setup>
import LazyCodeGroup from '../.vitepress/theme/components/LazyCodeGroup.vue'
import ExampleMalleability from '../.vitepress/theme/components/examples/ExampleMalleability.vue'
</script>

# Infinite Malleability

Replace any part of any component tree from outside, at any depth,
without editing a file. The view of a role, the class behind it, a
section of a template, a knob the author exposed, even a prop or an
event the shipped class never declared. The tree the authors shipped
stays exactly as it was, and a second tree on the same page can differ
from the first in one leaf three levels down.

Pick an override below. The tree is a gallery of snippet cards, each a
head, a syntax-coloured block and a foot. The same `Gallery.vue` renders
every override: the head becomes an editor tab bar, the foot a status
bar, the colour engine swaps from shiki to highlight.js, and a
configuration layer opens the theme, the line numbers and the fold as
settings the entry turns. Nothing is passed down but the entry at each
seam.

<ExampleMalleability />

Nothing in that demo edits a file. Each override is a subclass of the
shipped root, written as one literal and derived at runtime. The tree
beside the render is the resolved kit read against the shipped one: a
struck name is what a role was, the arrow is what it is now, and the
files below the stage are the ones the override brought. The sections
match the block they frame because the card reads the theme off the
same entry the block reads it from.

> **A tree is malleable when every seam passes one entry and every
> class reads only its own kit.**

In plain terms: every component keeps a list of the parts it is made
of. To change a part, you hand the component a different list. Nobody
rewires anything, and the original list is still there for everyone
else.

## The four moves

ivue components are already [classes with their contract as data](/guide/extensible-components).
Infinite Malleability adds one more piece of data and one rule for
templates.

The samples below are from the spec's tree, whose files sit under
"The source" at the end; the demo's tree has the same shape with a
snippet card in place of the card.

**The kit is a static on the class.** A model that composes others
declares the roles its subtree needs as `static get $kit()`, a record of
entries. An entry names a role's view and, when the role has a class of
its own, the namespace that view constructs. Under `Static()` a
`$`-prefixed getter is built once per class and cached on that class, so
a subclass never sees its parent's kit.

```ts
// Card.ts — the roles a card composes
class $Card {
  static get $kit() {
    return {
      Head: { view: CardHeadView },
      Body: { view: CardBodyView },
      Frame: { view: FrameView },
      Code: { namespace: Code, view: CodeView },
    } satisfies Kit.Of<Card.Role>;
  }

  get kit() {
    return this.self.$kit;
  }
}
```

**Every seam has one shape.** A template never names a component it
composes. It renders the role's view and hands it the role's entry as
`kit`, then the child's own props.

```vue
<!-- CardBody.vue — the body renders the code blocks through the Code seam -->
<component
  :is="model.kit.Code.view"
  v-for="item in model.items"
  :key="item"
  :kit="model.kit.Code"
  :code="item"
  :cap="4"
  @copy="model.onCopy($event)"
/>
```

**The view constructs the class its entry names.** The SFC stays the
wiring the [standard](/guide/standard) describes: `defineProps` from the
class contract, one `new`, the destructure. The one line the kit adds
is which class gets constructed.

```vue
<!-- Code.vue -->
<script setup lang="ts">
import { Code } from './Code';

const props = defineProps(Code.Class.props);
const emit = defineEmits(Code.Class.emits) as Code.Emits;

const model = new (props.kit?.namespace.Class ?? Code.Class)(props, emit);
</script>
```

A view mounted with no `kit` prop constructs its own class, so a demo
or a spec needs no kit at all.

**An override is a subclass.** Spread `super.$kit` and replace the
entries you mean to. Because every model reads only its own class's
kit, pointing a role at a subclass swaps that whole subtree.

```ts
// FancyCard.ts — three sections swapped, the Code role kept
class $FancyCard extends Card.$Class {
  static override get $kit() {
    return {
      ...super.$kit,
      Head: { view: FancyHeadView },
      Body: { view: GroupedBodyView },
      Frame: { view: FancyFrameView },
    };
  }
}
```

That is the whole mechanism. Everything below is what falls out of it.

## Any depth, one literal

A swap three levels down would be three subclass files. An entry may
instead carry `subkit`, a patch over the roles below its namespace, and
`Kit.Class.resolve` turns every reach into a derived class once, when
the kit is first read. The nesting reads as the tree it describes.

```ts
// a themed code block under every card of a panel, from the panel's kit
class $ThemedPanel extends Panel.$Class {
  static override get $kit() {
    return Kit.Class.resolve({
      ...super.$kit,
      Card: { ...super.$kit.Card, subkit: { Code: { namespace: ThemedCode } } },
    });
  }
}
```

The same call works from data at runtime, which is what the demo above
does: `Kit.Class.derive(Panel, patch)` returns a namespace whose `$Class`
extends the shipped one, whose `Class` is `Reactive` of it, and whose
`$kit` is the shipped kit merged with the patch. What a subclass file
would export, without the file.

## Sections are roles too

A view's own sections, the head, the body, the footer, are entries
whose base views are small markup SFCs over the parent's model, each
rendering its own children. The card's view keeps only its skeleton.

```vue
<!-- Card.vue -->
<article class="card">
  <component :is="model.kit.Head.view" :kit="model.kit.Head" :model="model" />
  <component :is="model.kit.Body.view" :kit="model.kit.Body" :model="model" />
  <component :is="model.kit.Frame.view" :kit="model.kit.Frame" :model="model">
    <em class="slotted">{{ model.title }}</em>
  </component>
</article>
```

So a swap of any section brings a whole template, and it can rearrange:
the demo's `GroupedBody` ignores the body's order and renders the items
reversed from the model, through the same `Code` seam. Listeners and
slot content attach to the seam, not to the component behind it, so
the frame's slot and the body's `@copy` survive every swap. The cost is
one component instance per section per mounted card, the same order
the leaves already cost.

## A setting is a getter

A class reads its own props and nothing else. It is closed to the kit
by default, and the author never decides what is tunable.

```ts
// Code.ts — closed: reads what its parent passed, and only that
get theme(): Code.Theme {
  return this.props.theme;
}
```

Opening a setting is a layer: a subclass whose getter reads a source
and falls back to `super`. The kit's entry may carry `props`, and `kit`
is a declared prop, so `this.props.kit.props.theme` is an ordinary
tracked read.

```ts
// ConfiguredCode.ts — the layer: one getter per setting, the entry's word first
class $ConfiguredCode extends Code.$Class {
  override get theme(): Code.Theme {
    return this.props.kit?.props?.theme ?? super.theme;
  }

  override get maxLines(): number | null {
    return this.props.kit?.props?.maxLines ?? super.maxLines;
  }
}
```

The entry then names the layer and turns the knobs:

```ts
Code: { namespace: ConfiguredCode, props: { theme: 'dracula', maxLines: 8 } }
```

That is the whole rule, and it is deliberately not a mechanism. A
setting is a getter. Override is `super`. A layer is a subclass. What
falls out:

- **Layers stack by inheritance.** A user preference over an org
  policy over the shipped default is three subclasses, each `mine ?? super`.
  Precedence is inheritance order, the one thing every reader of a
  class already understands. No merge, no priority numbers.
- **The source is the layer's choice.** The entry's `props` is one
  source. A settings store is another, `this.$settings.theme ?? super.theme`.
  A URL parameter, a tenant record, an experiment bucket. Same getter
  shape, different left side. The kit decides which class sits at the
  seam; the class decides what it listens to.
- **A setting can be more than a lookup.** Clamp it, map it, combine
  two sources, log the read. It is one more line in the same getter.
- **Forcing a value is the same move.** A layer whose getter returns
  a constant reaches past anything the parent passed. Nothing is
  merged, layered or proxied, and Vue's props object is exactly the
  one the class has always read.

The demo's `Code` opens nothing. `ConfiguredCode` opens three settings,
and `HljsCode` stacks on it, so the engine swap keeps the knobs.

## Configuration at the seams

Put the two halves together and an application's settings stop being a
system of their own. A settings page and a theme engine are both a
patch over the root's kit.

- **A setting is an entry's prop.** Theme, density, line numbers, date
  format: each is a getter some layer opened, and the settings page
  writes the patch that turns it. No settings store threaded through
  props, no provide/inject, no global read from inside a component.
- **A feature flag is a namespace swap.** The new flow is a subclass
  named in the patch. On for this user, off for that one, both trees on
  one page if a support view needs it. Rolling back is dropping the
  entry.
- **A layout preference is a section swap.** Compact rows or cards,
  the sidebar left or right, a tab bar or a plain head. The patch names
  the view; nothing above it changes.
- **The persisted form is the patch itself.** One object per user,
  per organisation, per device, resolved against the shipped root at
  boot with `Kit.Class.derive`. Reset to defaults is the absence of a
  patch, not a migration.
- **Switching live is cheap.** A new patch derives a new root, the
  mount re-keys, and every derived class and rewrapped view is built
  once for that patch. The shipped classes are untouched throughout.

The boundary is honest: this covers what a tree looks like and which
class runs at each seam. A setting that changes what data flows, a
different API host, a different permission model, lives in the models
and the stores where it always did. The kit moves the presentation and
the composition axis out of the code and into data, which is most of
what a settings page ever was.

## A widened contract reaches Vue

Props and emits in Vue belong to the component object, fixed once when
the module loads. A subclass that adds a `theme` prop or a `select`
event knows about them; the compiled base view does not. So when an
entry names a widened namespace, `resolve` pairs it with a rewrapped
view: a fresh component object with the base view's `setup` and
`render` and the derived class's `props` and `emits`.

```ts
// the same view over a widened contract — one small object, once per derived role
static view(view: Component, namespace: Kit.Namespace): Component {
  const Class = namespace.Class;
  return { ...view, props: Class.props, emits: Class.emits };
}
```

The parent can pass `:theme`, the child can emit `select`, and the base
`.vue` file is never touched. Through the unwrapped base view the
widened contract is invisible on both sides, no value in, no default
out, a dev warning on emit. The spec pins both arms against a real
dev-mode Vue.

## Two scopes, one unit

A kit swaps a role for one subtree. The namespace's `let Class` slot,
the same slot every ivue class already exports, swaps what that class
constructs everywhere. Both act on the same object, the namespace, so
they compose instead of competing. A resolved kit freezes its own shape
and never a namespace, a view or a props bag.

## What never happens

Every function in `Kit` builds new objects and only reads the base. A
subclass's `$kit` is never its parent's object. A base kit, namespace or
view is never changed by resolving an override. Two trees on one page
never share a swap unless both asked for it through the `Class` slot.
The specs plant each of these and assert the refusal.

Two facts the design rests on were checked against Vue itself rather
than assumed. Mutating a shared view's `props` in place is ignored
inside one app after the first mount, because Vue caches a component's
normalized options per app by the object, and across apps it would
widen every tree, so identity is the load-bearing reason for the copy.
`Object.create` over a compiled view renders nothing at all, because
Vue reads component options as own keys.

## The source

The class behind it all, and the smaller tree the specs mount: a panel
above a card above three sections and a code leaf, chosen for proving
rather than for looks. The demo's own tree is under the demo, tab by
tab. On GitHub: [the kit and its spec tree](https://github.com/infinite-system/ivue/tree/main/examples/playground/src/kit)
and [the demo's tree](https://github.com/infinite-system/ivue/tree/main/docs_v2/.vitepress/theme/components/examples/malleability).

<LazyCodeGroup
  :files="[
    { path: 'examples/playground/src/kit/Kit.ts', label: 'Kit.ts' },
    { path: 'examples/playground/src/kit/fixtures/Panel.ts', label: 'Panel.ts' },
    { path: 'examples/playground/src/kit/fixtures/Panel.vue', label: 'Panel.vue' },
    { path: 'examples/playground/src/kit/fixtures/Card.ts', label: 'Card.ts' },
    { path: 'examples/playground/src/kit/fixtures/Card.vue', label: 'Card.vue' },
    { path: 'examples/playground/src/kit/fixtures/CardBody.vue', label: 'CardBody.vue' },
    { path: 'examples/playground/src/kit/fixtures/GroupedBody.vue', label: 'GroupedBody.vue' },
    { path: 'examples/playground/src/kit/fixtures/Code.ts', label: 'Code.ts' },
    { path: 'examples/playground/src/kit/fixtures/Code.vue', label: 'Code.vue' },
    { path: 'examples/playground/src/kit/fixtures/ThemedCode.ts', label: 'ThemedCode.ts' },
    { path: 'examples/playground/src/kit/fixtures/FancyCard.ts', label: 'FancyCard.ts' }
  ]"
/>

The demo component is written the same way, one class owning the
variants and the inspector, its view wiring only; the demo's tree is
the tab set under each override above.

<LazyCodeGroup
  :files="[
    { path: 'docs_v2/.vitepress/theme/components/examples/ExampleMalleability.ts', label: 'ExampleMalleability.ts' },
    { path: 'docs_v2/.vitepress/theme/components/examples/ExampleMalleability.vue', label: 'ExampleMalleability.vue' },
    { path: 'examples/playground/src/kit/Kit.test.ts', label: 'Kit.test.ts' },
    { path: 'examples/playground/src/kit/kit.invariants.md', label: 'kit.invariants.md' }
  ]"
/>

> **Hold the seam and everything above it becomes replaceable.**
