---
title: Props with Defaults
description: 'The params/defaults component architecture — one typed props object, one plain defaults object, merged by propsWithDefaults() — that scales a component to dozens of props without drowning in ceremony.'
---

# Props with Defaults

A component with five props doesn't need architecture. A component with
forty — a select field with server fetch, search, pagination, variants,
chips and creation — does. This page describes the **params/defaults
pattern** the advanced field components use: every prop declared once as a
type, every default declared once as a plain value, and `propsWithDefaults()`
merging them into a standard Vue props object.

## The shape

Three declarations per component, each doing exactly one job:

```ts
// ChooseFieldProps.ts (excerpt)
import type { ExtractPropTypes, PropType } from 'vue';
import {
  propsWithDefaults,
  type ExtractEmitTypes,
  type ExtractPropDefaultTypes,
} from 'ivue';

/** 1 — the TYPES: a defineComponent-style object, no defaults inside. */
export const chooseFieldParamsTypes = {
  multiple: { type: Boolean as PropType<boolean> },
  useChips: { type: Boolean as PropType<boolean> },
  inputDebounce: { type: Number as PropType<number> },
  fetchPath: { type: String as PropType<string> },
  fetchRowsPerPage: { type: Number as PropType<number> },
  optionLabelPriority: { type: Array as PropType<string[]> },
};

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

## Why not `withDefaults(defineProps<T>())`?

Vue's macro form is right for small components. It stops scaling exactly
where big components begin:

- **Defaults become expressions.** Object and array defaults must be
  factory functions in the macro form. In a forty-prop component that is
  forty wrappers of noise. `propsWithDefaults` handles it once: objects and
  arrays are wrapped in cloning factories automatically (via
  `structuredClone`; pass a custom cloner for exotic values), primitives
  pass through untouched.
- **The defaults stop being data.** A plain defaults object is inspectable,
  spreadable and reusable — a wrapper component can import the base
  component's defaults and override three of them. Macro defaults are
  locked inside a compiler transform.
- **Composability.** Props objects merge by spread. The contact field's
  props are `{ ...chooseFieldProps, ...contactParams }` — one line of
  reuse the macro form cannot express.
- **`ExtractPropDefaultTypes` keeps the two objects honest**: the defaults
  object must provide a correctly-typed value for every declared type, so a
  new prop without a default is a compile error, not a runtime surprise.

## Emits and slots, same discipline

Emits are declared as an object of validators and converted to the emit
function's type by `ExtractEmitTypes`; slots interfaces extend a Quasar
component's slots with `before--`/`after--` prefixed variants via
`ExtendSlots`, which is what lets a wrapping component inject extra
content around every inherited slot without redeclaring any of them:

```ts
export const chooseFieldEmits = {
  'update:model-value': (newValue: any) => true,
  remove: (removed: { index: number; value: any }) => true,
};
export type IChooseFieldEmits = ExtractEmitTypes<typeof chooseFieldEmits>;
```

## Where to see it at scale

The [Advanced Select Field](/examples/choose-field) and
[Advanced Media Uploader](/examples/media-field) are built entirely on this
pattern — their props files are the production-grade reference, and the
class consumes every prop through plain prop-getters per the
[standard](/guide/standard).
