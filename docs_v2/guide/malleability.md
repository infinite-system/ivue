---
title: Infinite Malleability
description: Replace any part of any component tree — a view, a class, a section, a knob, a declared prop or event — at any depth, from outside, without editing a file. One static on the class holds the roles; one seam shape passes one entry; an override is a subclass written as data.
relatedPosts: [runtime-props-all-along, ship-the-variant-keep-the-tuning, the-options-api-everyone-wanted]
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

Pick an override below. The tree is a gallery of code snippets, each a
head, a syntax-coloured block and a foot. The same `Gallery.vue` renders
every override: the head becomes an editor tab bar, the foot a status
bar, the colour engine swaps from shiki to highlight.js, the theme, the
line numbers and the fold arrive as knobs. Nothing is passed down but
the entry at each seam.

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

The ten-year-old version: every component keeps a list of the parts it
is made of. To change a part, you hand the component a different list.
Nobody rewires anything, and the original list is still there for
everyone else.

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
      Head: { vue: CardHeadView },
      Body: { vue: CardBodyView },
      Frame: { vue: FrameView },
      Code: { namespace: Code, vue: CodeView },
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
  :is="model.kit.Code.vue"
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
      Head: { vue: FancyHeadView },
      Body: { vue: GroupedBodyView },
      Frame: { vue: FancyFrameView },
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
  <component :is="model.kit.Head.vue" :kit="model.kit.Head" :model="model" />
  <component :is="model.kit.Body.vue" :kit="model.kit.Body" :model="model" />
  <component :is="model.kit.Frame.vue" :kit="model.kit.Frame" :model="model">
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

## Knobs without a class

An entry may carry `props`, the consumer's values for that role. `kit`
is a declared prop, so `this.props.kit.props.cap` is an ordinary tracked
read, and each class decides in its getters which props the kit may
tune.

```ts
// Code.ts — three getters, three decisions
/** a prop the kit may tune: the consumer's value first, then what the parent passed */
get cap(): number | null {
  return this.props.kit?.props?.cap ?? this.props.cap;
}

/** a prop the kit cannot touch — on purpose: the code is the parent's */
get code(): string {
  return this.props.code;
}

/** a prop that exists only through the kit — the path says so */
get theme(): string | undefined {
  return this.props.kit?.props?.theme;
}
```

The path is the documentation. A getter that names both is a knob the
author opened, a getter that names only the kit is a prop the class has
only through the kit, a getter that names only Vue's prop is closed on
purpose. Forcing a closed prop is a getter override on a derived class,
the ordinary move. Nothing is merged, layered or proxied, and Vue's
props object is exactly the one the class has always read.

## A widened contract reaches Vue

Props and emits in Vue belong to the component object, fixed once when
the module loads. A subclass that adds a `theme` prop or a `select`
event knows about them; the compiled base view does not. So when an
entry names a widened namespace, `resolve` pairs it with a rewrapped
vue: a fresh component object with the base view's `setup` and
`render` and the derived class's `props` and `emits`.

```ts
// the same view over a widened contract — one small object, once per derived role
static view(view: Component, namespace: Kit.Namespace): Component {
  const Class = namespace.Class;
  return { ...vue, props: Class.props, emits: Class.emits };
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
tab.

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

## Where it stands

The kit is measured, not promised: twenty specs mount the fixture tree
under a dev-mode Vue 3.5 and assert every claim on this page, including
the ones about Vue. What is not yet exercised is Vapor, and the first
production tree to be converted is the
[AI chat example](/examples/ai-chat), whose plan lives in the repository
as `tasks/ai-chat-kit.md`.

> **Hold the seam and everything above it becomes replaceable.**
