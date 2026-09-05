---
title: Props & Defaults
description: 'A component contract is a value on the class: prop types, defaults and validators as static getters, the TypeScript type derived from them. Why runtime props are the standard here, what the compiler erases from type-based props, and where the type-based form still belongs.'
relatedPosts: [runtime-props-all-along, props-inherit-now, single-file-models, ship-the-variant-keep-the-tuning]
---

# Props & Defaults

In ivue a component's contract is a value on its class. The prop types,
the defaults, the validators and the emits are static getters, and the
TypeScript types are derived from them. This page states the rule, shows
the shape, and says why the runtime form is the standard when Vue's own
`<script setup>` moved to the type-based one.

> Types describe a contract. Values keep it.

## The shape

Three static getters, one derived type. The SFC hands the fused object
to `defineProps` and constructs the class.

```ts
import type { ExtractPropTypes, PropType } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive } from 'ivue';
import { Static } from 'ivue/extras';

class $Badge {
  static get propsTypes() {
    return definePropTypes({
      label: { type: String, required: true },
      tone: { type: String as PropType<Badge.Tone> },
      size: { type: Number, validator: (size: number) => size > 0 },
      rounded: { type: Boolean },
    });
  }

  static get propsDefaults() {
    return { tone: 'success' as Badge.Tone, size: 14, rounded: false };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: Badge.Props) {}
}

export namespace Badge {
  export const $Class = Static($Badge);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export type Tone = 'neutral' | 'success' | 'danger';
  export type Props = ExtractPropTypes<typeof $Class.props>;
}
```

```vue
<script lang="ts" setup>
import { Badge } from './Badge';

const props = defineProps(Badge.Class.props);

const badge = new Badge.Class(props as Badge.Props);
</script>
```

The pieces, and what each one is for:

- **`propsTypes`** is the runtime declaration Vue checks: constructor,
  `required`, `validator`. `PropType<T>` attaches the exact TypeScript
  type to a value, so an array prop knows its element type and a string
  prop can carry a literal union.
- **`propsDefaults`** is a plain object of values. `propsWithDefaults`
  fuses it into the types and wraps object and array defaults in
  factories, the way Vue requires.
- **`props`** is the fused object the SFC uses. A subclass that only
  re-tunes defaults inherits it. A subclass that adds a prop re-declares
  it, because a static getter's return type is not polymorphic.
- **`Props`** is derived with `ExtractPropTypes`, so the type and the
  value can never disagree. Nothing is declared twice.
- **`emits`** follows the same rule as a static getter returning the
  emits object, and every emit fires through a method so a subclass can
  override the moment it fires.

## What type-based props lose

Vue's `<script setup>` accepts `defineProps<{ … }>()` and compiles the
type literal into a runtime declaration. The runtime declaration is what
ships. The type is an input to the compiler, and the compiler keeps what
it can read.

| you write | the compiler ships | gone |
| --- | --- | --- |
| `width: number` | `{ type: Number, required: true }` | nothing |
| `items: Item[]` | `{ type: Array }` | the element type |
| `mode: SortMode` imported from another file | `{ type: null }` | the runtime check |
| a validator | nothing | it cannot be expressed as a type |

Measured on `@vue/compiler-sfc` 3.5. The compiled object is real and sits
on the component definition, but it is the post-erasure object, untyped,
and owned by that one SFC. The [article](/blog/runtime-props-all-along)
walks the receipts.

Declaring the runtime form yourself, on the class, is not a fallback.
It is the form the compiler was translating into all along, written
once where it can be typed, reused, and read.

## What a value can do that a type cannot

- **Inherit.** `...super.propsTypes` plus the new keys. A variant of a
  forty-five prop component re-declares nothing. The four moves, re-tune,
  add, narrow, share, are on [Extensible Components](/guide/extensible-components).
- **Validate.** `validator` is a function on the declaration. Vue calls
  it in development, and so can a test or a panel.
- **Be read.** `Badge.Class.propsDefaults.size` is `14` in a test with no
  component mounted. A knobs panel seeds its controls from the defaults
  and picks control kinds from the types. An agent writing a variant
  imports the class and enumerates the contract as data.
- **Outlive the renderer.** The contract is on the class, not inside a
  compiler macro, so the same model runs under a template, a render
  function, or a Vapor template.

## Where type-based props still belong

Vue chose the type-based form for the architecture it assumed: the SFC
owns its contract, nothing extends it, and the props are consumed in the
same file. That is still right for a markup-only leaf with a prop or
two. Such a leaf has no class, and `defineProps<{ … }>()` is the shortest
correct thing.

The boundary is the same one the whole standard uses. A component that
owns state, derivation, or a handler has a model. The model owns the
contract, and the contract is a value.

## The cost

`Array as PropType<Item[]>` is a cast a type literal never asks for.
Inside a generic component that cast is the only way to name `T`, so the
compiler helps less there, not more. That is the whole price, against a
contract that is never erased and never declared twice.

## See it running

- [Props contract & knobs](/examples/props-and-defaults) — a knobs panel, a validator verdict and an inheritance ledger, all read off two classes' statics.
- [Advanced Select Field](/examples/choose-field) — a forty-five prop contract, extended by a variant that adds three.
- [Horizontal Scroller](/examples/horizontal-scroller) — the vertical scroller's contract with one default re-tuned.
