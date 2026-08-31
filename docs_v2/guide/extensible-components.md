---
title: Extensible Components
description: 'Classes extend — so props, emits and slots must extend with them. The two-tier contract system: the namespace carries the whole component contract as plain data (types + defaults merged by propsWithDefaults, emits, derived types), authored inline for small surfaces and in a sibling props file for large ones.'
relatedPosts: [ban-private, ship-the-variant-keep-the-tuning, the-options-api-everyone-wanted, inheritance-exile]
---

# Extensible Components

ivue components are classes, and classes extend. A `ContactField` that
extends the choose-field machinery needs its **entire surface** to extend
with it — props inherited, re-defaulted and grown; emits carried through;
slots wrappable rather than replaced.
Vue's `withDefaults(defineProps<T>())` macro cannot express that: its
defaults are locked inside a compiler transform, invisible to any wrapper.

So the contract is **plain data, carried by the component's namespace**
beside the class — and it extends the way the class extends: by spread.

## The namespace carries the contract

A component's namespace holds everything the component is, in canonical
section order: **Identity** (`$Class` / `Class` / `Instance`), **Values**
(the contract as data), **Types** (derived from the values, never written
twice). The values are three declarations, each doing exactly one job —
here as shipped in the [text marquee](/examples/virtual-scroller#a-book-as-one-scrolling-line):

```ts
// TextMarquee.ts (namespace excerpt)
export namespace TextMarquee {
  /* Identity */

  export const $Class = $TextMarquee; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /* Values */

  /** 1 — the TYPES: a defineComponent-style object, no defaults inside. */
  export const propsTypes = definePropTypes({
    /** The full text — newlines and all; the marquee one-lines it. */
    text: { type: String as PropType<string>, required: true },
    /** Glide speed. The default is a comfortable reading glide. */
    pxPerSecond: { type: Number as PropType<number> },
    targetChars: { type: Number as PropType<number> }
  });

  /** 2 — the DEFAULTS: plain values, typed against the types object
   *  (`text` is required — filtered out of the check automatically). */
  export const propsDefaults: ExtractPropDefaultTypes<typeof propsTypes> = {
    pxPerSecond: 50,
    targetChars: 400
  };

  /** 3 — the MERGE: a standard Vue props object, ready for defineProps. */
  export const props = propsWithDefaults(propsDefaults, propsTypes);

  /* Types */

  /** Resolved props — DERIVED from the merged runtime object. */
  export type Props = ExtractPropTypes<typeof props>;
}
```

Each piece earns its place:

- **`definePropTypes({...})`** is an identity call with one job: in a bare
  object const, TypeScript widens `required: true` to `boolean`; generic
  inference through the call preserves the literal, which the defaults
  check below depends on.
- **`ExtractPropDefaultTypes<typeof propsTypes>`** keeps the pair honest:
  every optional prop must appear in the defaults, so a new prop without
  a default is a compile error. Required props are filtered out of the
  check automatically (they can never carry a default), and a
  deliberately default-free optional prop is declared `key: undefined` —
  the ruling stated in the defaults object itself.
- **`propsWithDefaults(propsDefaults, propsTypes)`** merges the pair into
  a defineComponent-style props object. Object and array defaults are
  wrapped in cloning factories automatically (`structuredClone`; pass a
  custom cloner for exotic values); primitives pass through untouched.
- **`Props`** is derived with `ExtractPropTypes` — defaulted props come
  out non-optional, default-free ones optional, and nothing is ever
  hand-duplicated.

The SFC is pure wiring against the seam. The macros receive the RUNTIME
objects, so no compiler macro ever resolves a cross-file type:

```ts
const props = defineProps(TextMarquee.props); // inferred — no cast
const emit = defineEmits(TextMarquee.emits) as TextMarquee.Emits;
```

A **generic** component adds exactly one cast — the type parameter a
runtime map cannot carry, grafted back over the one prop that needs it.
The [Horizontal Scroller example](/examples/horizontal-scroller) is the
full canonical reference for that layer.

## Extension is the point

Because the types and defaults are plain, inspectable namespace data, a
subclass composes its surface the way it composes behavior — spread the
parent's maps, override what defines the specialization, with the reason
on the line. The horizontal scroller's whole props story, as shipped:

```ts
// HorizontalVirtualScroller.ts (namespace excerpt)
export const propsTypes = { ...VirtualScroller.propsTypes };
export const propsDefaults = {
  ...VirtualScroller.propsDefaults,
  assumedSize: 300 // cards are ~hundreds of px wide where rows are tens tall
};
export const props = propsWithDefaults(propsDefaults, propsTypes);
export const emits = VirtualScroller.emits;
```

Every prop inherited, one default overridden. This is the props-side
mirror of `class $HorizontalVirtualScroller extends
VirtualScroller.$Class` — the class hierarchy and the contract hierarchy
extend together, and neither can drift from the other because both are
compositions of the same parent data.

`propsWithDefaults` is **non-mutating** by design: spreading a types map
shares the inner `{ type }` descriptor objects, so an in-place
implementation would silently rewrite the base component's defaults when
the child applies different ones. Each descriptor is copied — the base
surface is never touched by its children.

## Two tiers, one seam

Where the contract is *authored* varies with its size; where it is
*read* never does. Every consumer, SFC and subclass reads the contract
from the namespace — that is the invariant. The file layout has two
expressions of it:

**Tier 1 — inline in the namespace** (the default). A contract of
roughly fifteen props or fewer lives in the namespace's Values section,
as `TextMarquee` and the scrollers do above. One file, three residents:
imports, the class, the namespace.

**Tier 2 — a sibling props file** for large surfaces. `ChooseField`
declares ~40 documented props; as a namespace section that would be a
300-line block welded to a 650-line class. So the contract is authored
in `ChooseFieldProps.ts` — easier to open, navigate and diff — and the
namespace **re-exports it 1:1**, becoming the seam's table of contents:

```ts
// ChooseField.ts (namespace excerpt)
export namespace ChooseField {
  /* Identity */

  export const $Class = $ChooseField; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance;

  /* Values — the contract, authored in ChooseFieldProps.ts (tier 2). */

  export const paramsTypes = chooseFieldParamsTypes;
  export const paramsDefaults = chooseFieldParamsDefaults;
  export const params = chooseFieldParams;
  export const props = chooseFieldProps;
  export const emits = chooseFieldEmits;

  /* Types */

  export type Props = ChooseFieldProps;
  export type Emits = ChooseFieldEmits;
  export type Slots = ChooseFieldSlots;
}
```

The props file is **private to the module family**: only its own class
file and extending contract files import it. `ContactFieldProps.ts`
spreads `ChooseFieldProps.ts` — contract extends contract, mirroring
class extends class:

```ts
// ContactFieldProps.ts — extends the choose-field surface
export const contactFieldParamsTypes = definePropTypes({
  ...chooseFieldParamsTypes,
  /** Compact display mode: smaller avatar, name only, denser rows. */
  compact: { type: Boolean as PropType<boolean> },
});

export const contactFieldParamsDefaults: ExtractPropDefaultTypes<
  typeof contactFieldParamsTypes
> = {
  ...chooseFieldParamsDefaults,
  useChips: true,                                // chips on
  optionLabelPriority: ['name', 'email', 'id'],  // its label rules
  compact: false,                                // its own prop
};
```

Everything else — the SFC, the example route, any consumer — speaks
`ContactField.props`, `ContactField.emits`, `ContactField.Props`. A
reader never needs to know which tier a component chose; the namespace
reads identically either way. File placement is expression; the
one-seam rule is the invariant.

## Emits and slots, same discipline

Emits are declared as an object of validators — data, like the props —
and the emit function's type is derived by `ExtractEmitTypes`:

```ts
export const chooseFieldEmits = {
  'update:model-value': (newValue: any) => true,
  remove: (removed: { index: number; value: any }) => true,
};
export type ChooseFieldEmits = ExtractEmitTypes<typeof chooseFieldEmits>;
```

Slots interfaces extend a wrapped component's slots with
`before--`/`after--` prefixed variants via `ExtendSlots`, which is what
lets a wrapping component inject content around every inherited slot
without redeclaring any of them:

```ts
export type ChooseFieldSlots = ExtendSlots<QSelectSlots>;
```

## Why not `withDefaults(defineProps<T>())`?

Vue's macro form is right for small, terminal components. It stops
scaling exactly where extensible components begin:

- **Macro defaults aren't data.** They're locked inside a compiler
  transform — a wrapper cannot import them, spread them, or override
  three of them.
- **Macro types are compile-time-only.** `defineProps<T>()` makes the
  compiler resolve `T` across files, a build-fragile step the runtime
  props object never needs.
- **Object and array defaults become factory noise.** In the macro form
  every non-primitive default must be a function; `propsWithDefaults`
  handles the wrapping once, centrally.

## Where to see it at scale

The [Advanced Select Field](/examples/choose-field) and
[Advanced Media Uploader](/examples/media-field) are the tier-2
reference — large authored contracts, namespace re-exports, and class
extension driven through the `runner` mechanism, with each class
consuming every prop through plain prop-getters per the
[standard](/guide/standard).

The [Horizontal Scroller: 1M Items](/examples/horizontal-scroller) is
the tier-1 and generic-typing reference: contract inline in the
namespace, surface composed by spread, one default overridden, and the
`Props<T>` graft for the type parameter a runtime map cannot carry. The
measured account of what the whole system buys is
[Ship the variant, keep the tuning](/blog/ship-the-variant-keep-the-tuning).
