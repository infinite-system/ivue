---
title: 'Your props were runtime props all along'
description: 'Vue compiles every type-based props declaration back into a runtime one, and the step is lossy: element types vanish, imported types become null, validators cannot exist. Declare the runtime contract yourself, on the model, and nothing is erased.'
date: 2026-09
tags: [props, patterns, architecture]
relatedPosts: [props-inherit-now, single-file-models, the-options-api-everyone-wanted, ban-private]
---

# Your props were runtime props all along

![Your props were runtime props all along](/blog/runtime-props-all-along.png)

<BlogPostDate />

This is what you write:

```ts
defineProps<{ items: Item[]; mode: MediaSortMode }>();
```

This is what ships:

```js
props: { items: { type: Array, required: true }, mode: { type: null, required: true } }
```

There is no type-based props system in Vue at runtime. There is one
props system, the runtime one, and `<script setup>` puts a compiler in
front of it that reads your type literal and writes the runtime
declaration for you. The type was never the contract. It was a request
for one, and the compiler fills in what it can.

> Types describe a contract. Values keep it.

This post is about what the compiler loses in that step, why the loss is
the whole reason to declare the runtime contract yourself, and where the
contract belongs once you do.

## What the compiler emits

Every line below was produced by running `@vue/compiler-sfc` 3.5 over a
one-line `<script setup lang="ts">` and reading the `props` object it
emitted.

| you write | the compiler ships | what is gone |
| --- | --- | --- |
| `width: number` | `{ type: Number, required: true }` | nothing |
| `size: number \| string` | `{ type: [Number, String] }` | nothing |
| `size?: number` with default `32` | `{ type: Number, default: 32 }` | nothing |
| `items: Item[]` | `{ type: Array }` | the element type |
| `items: T[]` in a generic component | `{ type: Array }` | the element type |
| `mode: MediaSortMode` imported from another file | `{ type: null }` | the whole check |

The first three rows are the happy path, and they are the rows every
tutorial shows. The last three are what happens to a real component. An
array of anything is an array. A generic is an array. A type the compiler
cannot see into becomes `null`, which is Vue's spelling of "accept
anything", so a prop declared with your most carefully named domain type
gets no runtime check at all.

Said plainly: the compiler turns your type into a checklist. When it
cannot read the type, it writes "anything" on that line and moves on.

Two more things cannot survive the step because they were never in the
type to begin with. A validator, the function that says a `size` must be
positive, has no type-level spelling, so type-based props cannot declare
one. And a default for an object or array prop must be a factory, which
`withDefaults` handles by rewriting your literal into one. Both are
runtime facts about the contract that the type-based form can only
approximate.

## Where the emitted object lives

The compiled `props` object is real. Import the component and it is
sitting on the definition, and you can spread it into another
component's runtime props. That is how Quasar shares a field contract
across its inputs, with an object spread per component.

But look at what you are spreading. It is the post-erasure object. The
`Item[]` is already an `Array`. The imported type is already `null`. The
TypeScript side that made the declaration precise is gone, because it
never lived in the same place as the value. So a contract shared this way
is shared untyped, and a variant that extends it types itself by hand or
not at all.

> The type and the value were declared in one place and then stored in
> two, and only one of them can be reused.

That split is the actual problem. Not that types are bad, and not that
runtime declarations are verbose. The problem is a contract whose typed
half and whose checked half live in different worlds, so that anything
that reads one cannot see the other.

## Declare the value, derive the type

ivue, a 1.1 kB class layer over Vue's reactivity, puts the contract on
the model class as static getters and derives the TypeScript type from
the value. One declaration, two readers, nothing stored twice.

```ts
class $MediaField extends Field.$Class {
  static override get propsTypes() {
    return definePropTypes({
      ...super.propsTypes,
      items: { type: Array as PropType<MediaField.Item[]>, required: true },
      mode: { type: String as PropType<MediaField.SortMode>, default: 'newest' },
      size: { type: Number, default: 32, validator: (size: number) => size > 0 },
    });
  }
}

export namespace MediaField {
  export type Props = ExtractPropTypes<typeof $Class.props>;
}
```

Read what each line kept that the compiler would have dropped. The array
prop knows its element type, because `PropType<Item[]>` is carried on the
value and `ExtractPropTypes` reads it back. The imported union is a
`String` with the exact literal type attached, not `null`. The validator
exists. The default is a value the class owns, not a literal a macro
rewrote.

And the SFC does what an SFC should, which is wire:

```vue
<script setup lang="ts">
import { MediaField } from './MediaField';

const props = defineProps(MediaField.Class.props);
const emit = defineEmits(MediaField.Class.emits);

const media = new MediaField.Class(props, emit);
</script>
```

`defineProps` with a runtime object is the form Vue always supported.
It is not a fallback. It is the form the compiler was translating into
the whole time, written once by hand where it can be typed, reused,
and read.

## What a contract-as-value can do

Once the contract is a value on a class, every reader you could want has
it, and none of them needed a compiler.

- **A variant extends it.** `...super.propsTypes` plus three keys. The
  compiler checks the override, and forty-five props arrive in the child
  without a spread. That was the [previous post](/blog/props-inherit-now),
  with the receipts.
- **A test reads it.** `ContactAvatar.Class.propsDefaults.size` is `32`
  in a test with no component mounted. A type-based default is
  unreachable from outside the SFC.
- **A knobs panel reads it.** The defaults are the panel's initial
  values and the types are its control kinds, straight off the class.
  Nothing that starts as a type can do this, because a type is gone
  before the panel runs.
- **An agent reads it.** A model that writes a variant imports the class
  and enumerates the contract as data. It does not parse a type literal
  out of a `.vue` file and guess.
- **A renderer swap does not touch it.** The contract is on the class,
  not in a macro, so the same model runs under a template, a render
  function, or a Vapor template. Type-based props exist only inside the
  compiler pass that reads them.

None of these is a feature that was designed. Each is what happens when a
contract is a value: values can be read.

## Why Vue chose types, and where that stays right

Vue's choice was correct for the architecture Vue assumed. In
`<script setup>` the component is the owner of its own contract. Nothing
extends it, nothing else reads it, and the props are consumed by the
template in the same file. Under that assumption the type literal is the
shortest thing that works, and the lossy compile costs little because
nobody downstream needed the lost information.

That assumption also marks the boundary of the standard. A markup-only
leaf with one prop has no model, and type-based props are the right form
for it. The moment a component owns state, derivation, or a handler, it
has a model, the model owns the contract, and the contract is a value.

## The cost

Runtime declarations are longer. `Array as PropType<Item[]>` is a cast a
type literal never asks for, and a forty-prop contract is forty of them.
Inside a generic component the cast is the only way to name `T`, so the
compiler helps less there, not more.

That is the whole price. Against it: nothing erased, nothing declared
twice, and a contract that four kinds of reader can use without asking
the compiler for permission.

Types describe the contract. Values keep it.
