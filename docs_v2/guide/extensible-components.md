---
title: Extensible Components
description: 'Classes extend — so props, emits and slots must extend with them. The params/defaults architecture: typed props + plain defaults merged by propsWithDefaults(), ExtractEmitTypes for emits, ExtendSlots for wrappable slots.'
relatedPosts: [ship-the-variant-keep-the-tuning, the-options-api-everyone-wanted, inheritance-exile]
---

# Extensible Components

ivue components are classes, and classes extend. A `ContactField` that
extends the choose-field machinery needs its **entire surface** to extend
with it — props inherited, re-defaulted and grown; emits carried through;
slots wrappable rather than replaced.
Vue's `withDefaults(defineProps<T>())` macro cannot express that: its
defaults are locked inside a compiler transform, invisible to any wrapper.

This page describes the **params/defaults architecture** the advanced
field components use: every prop declared once as a type, every default
declared once as a plain value, and `propsWithDefaults()` merging them
into a standard Vue props object — one that a child component can spread,
re-default, and grow.

## The shape

Three declarations per component, each doing exactly one job:

```ts
// ChooseFieldProps.ts (excerpt)
import type { ExtractPropTypes, PropType } from 'vue';
import {
  definePropTypes,
  propsWithDefaults,
  type ExtractEmitTypes,
  type ExtractPropDefaultTypes,
} from 'ivue';

/** 1 — the TYPES: a defineComponent-style object, no defaults inside.
 *  The identity call preserves `required: true` literals that a bare
 *  const would widen to boolean. */
export const chooseFieldParamsTypes = definePropTypes({
  multiple: { type: Boolean as PropType<boolean> },
  useChips: { type: Boolean as PropType<boolean> },
  inputDebounce: { type: Number as PropType<number> },
  fetchPath: { type: String as PropType<string> },
  fetchRowsPerPage: { type: Number as PropType<number> },
  optionLabelPriority: { type: Array as PropType<string[]> },
});

/** 2 — the DEFAULTS: plain values, typed against the types object. */
export const chooseFieldParamsDefaults: ExtractPropDefaultTypes<
  typeof chooseFieldParamsTypes
> = {
  multiple: false,
  useChips: false,
  inputDebounce: 250,
  fetchPath: '',
  fetchRowsPerPage: 20,
  optionLabelPriority: ['label', 'name', 'value', 'id'],
};

/** 3 — the MERGE: a standard Vue props object, ready for defineProps. */
export const chooseFieldProps = propsWithDefaults(
  chooseFieldParamsDefaults,
  chooseFieldParamsTypes,
);
export type IChooseFieldProps = ExtractPropTypes<typeof chooseFieldProps>;
```

## Extension is the point

Because the types and defaults are plain, inspectable objects, a wrapping
component composes its props surface by spread — inherit everything,
override the defaults that define its specialization, add its own:

```ts
// ContactFieldProps.ts — extends the choose-field surface
export const contactFieldParamsTypes = {
  ...chooseFieldParamsTypes,
  /** Compact display mode: smaller avatar, name only, denser rows. */
  compact: { type: Boolean as PropType<boolean> },
};

export const contactFieldParamsDefaults: ExtractPropDefaultTypes<
  typeof contactFieldParamsTypes
> = {
  ...chooseFieldParamsDefaults,
  fetchPath: '/contact',                              // its endpoint
  optionLabelPriority: ['name', 'email', 'id'],       // its label rules
  optionDescriptionPriority: ['role', 'company'],     // its captions
  compact: false,                                     // its own prop
};

export const contactFieldParams = propsWithDefaults(
  contactFieldParamsDefaults,
  contactFieldParamsTypes,
);
```

This is the props-side mirror of `class $ContactField extends
ChooseField.$Class` — the class hierarchy and the props hierarchy extend
together. See it live in the
[Advanced Select Field example](/examples/choose-field), where
`ContactField.vue` constructs the subclass instance and hands it to the
base SFC through the `runner` prop: one object drives the base's
behavior and the wrapper's decoration.

`propsWithDefaults` is **non-mutating** by design: spreading a types map
shares the inner `{ type }` descriptor objects, so an in-place
implementation would silently rewrite the base component's defaults when
the child applies different ones. Each descriptor is copied — the base
surface is never touched by its children.

## Two tiers, one seam

Where the contract is *authored* varies with its size; where it is
*read* never does. Every consumer, SFC and subclass reads the contract
from the component's namespace — `ChooseField.props`,
`ChooseField.emits`, `ChooseField.Props` — which carries it beside the
class in canonical order (identity, values, types):

- **Small contracts** (roughly under fifteen props) are authored inline
  in the namespace, the way the
  [virtual scroller](/examples/horizontal-scroller) does it.
- **Large surfaces** earn a sibling props file — `ChooseFieldProps.ts`
  is easier to open, navigate and review than a 300-line block welded
  to a 650-line class. The props file is imported ONLY by its own class
  file and by extending contract files (`ContactFieldProps.ts` spreads
  `ChooseFieldProps.ts`); the namespace re-exports it 1:1, and that
  re-export block is the seam's table of contents.

File placement is expression; the one-seam rule is the invariant.

## Why not `withDefaults(defineProps<T>())`?

Vue's macro form is right for small, terminal components. It stops
scaling exactly where extensible components begin:

- **Macro defaults aren't data.** They're locked inside a compiler
  transform — a wrapper cannot import them, spread them, or override
  three of them.
- **Object and array defaults become factory noise.** In the macro form
  every non-primitive default must be a function. `propsWithDefaults`
  handles it once: objects and arrays are wrapped in cloning factories
  automatically (via `structuredClone`; pass a custom cloner for exotic
  values), primitives pass through untouched.
- **`ExtractPropDefaultTypes` keeps the pair honest**: the defaults object
  must provide a correctly-typed value for every declared OPTIONAL type,
  so a new prop without a default is a compile error, not a runtime
  surprise. Props declared `required: true` are filtered out of the check
  automatically (they can never carry a default), and a deliberately
  default-free optional prop is declared `key: undefined` — the ruling
  lives in the defaults object, not in a type expression.

## Emits and slots, same discipline

Emits are declared as an object of validators and converted to the emit
function's type by `ExtractEmitTypes`; slots interfaces extend a wrapped
component's slots with `before--`/`after--` prefixed variants via
`ExtendSlots`, which is what lets a wrapping component inject content
around every inherited slot without redeclaring any of them:

```ts
export const chooseFieldEmits = {
  'update:model-value': (newValue: any) => true,
  remove: (removed: { index: number; value: any }) => true,
};
export type IChooseFieldEmits = ExtractEmitTypes<typeof chooseFieldEmits>;
```

## Where to see it at scale

The [Advanced Select Field](/examples/choose-field) and
[Advanced Media Uploader](/examples/media-field) are built entirely on
this pattern — their props files are the production-grade reference, and
each class consumes every prop through plain prop-getters per the
[standard](/guide/standard).

The [Horizontal Scroller: 1M Items](/examples/horizontal-scroller)
example shows the pattern paired with class extension: the subclass
spreads the base scroller's `propsTypes` and `propsDefaults`, overrides
a single default, and its namespace carries the whole contract — types,
defaults, merged props, emits — beside the class. The measured account
of what that buys is
[Ship the variant, keep the tuning](/blog/ship-the-variant-keep-the-tuning).
