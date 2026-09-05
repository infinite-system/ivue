---
title: Extensible Components
description: 'Classes extend — so props, emits and slots must extend with them. The contract lives on the class as static getters (types + defaults fused by propsWithDefaults, emits), a subclass extends it with super, and the namespace carries only identity and the types derived from the class.'
relatedPosts: [ban-private, ship-the-variant-keep-the-tuning, the-options-api-everyone-wanted, inheritance-exile]
---

# Extensible Components

ivue components are classes, and classes extend. A `ContactField` that
extends the choose-field machinery needs its **entire surface** to extend
with it — props inherited, re-defaulted and grown; emits carried through;
slots wrappable rather than replaced.
Vue's `withDefaults(defineProps<T>())` macro cannot express that: its
defaults are locked inside a compiler transform, invisible to any wrapper.

So the contract is **plain data, carried by the class as static
getters** — and it extends the way the class extends: with `super`.

## The class carries the contract

A class file has three residents: imports, the class, the namespace.
The contract is three static getters on the class, each doing exactly
one job, plus emits — here as shipped in the
[text marquee](/examples/virtual-scroller#a-book-as-one-scrolling-line):

```ts
// TextMarquee.ts (class excerpt)
class $TextMarquee {
  /** 1 — the TYPES: a defineComponent-style object, no defaults inside. */
  static get propsTypes() {
    return definePropTypes({
      /** The full text — newlines and all; the marquee one-lines it. */
      text: { type: String as PropType<string>, required: true },
      /** Glide speed. The default is a comfortable reading glide. */
      pxPerSecond: { type: Number as PropType<number> },
      targetChars: { type: Number as PropType<number> }
    });
  }

  /** 2 — the DEFAULTS: plain values, typed against the types object
   *  (`text` is required — filtered out of the check automatically). */
  static get propsDefaults(): ExtractPropDefaultTypes<typeof $TextMarquee.propsTypes> {
    return {
      pxPerSecond: 50,
      targetChars: 400
    };
  }

  /** 3 — the FUSION: a standard Vue props object, ready for defineProps.
   *  Reads through the receiver, so a subclass's `props` fuses ITS own
   *  types and defaults. */
  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: TextMarquee.Props) {}
}

export namespace TextMarquee {
  /* Identity */

  export const $Class = Static($TextMarquee); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /* Types — DERIVED from the class, never hand-duplicated */

  export type Props = ExtractPropTypes<typeof $Class.props>;
}
```

Each piece earns its place:

- **`definePropTypes({...})`** is an identity call with one job: in a bare
  object literal, TypeScript widens `required: true` to `boolean`; generic
  inference through the call preserves the literal, which the defaults
  check below depends on.
- **`ExtractPropDefaultTypes<typeof $TextMarquee.propsTypes>`** keeps the
  pair honest: every optional prop must appear in the defaults, so a new
  prop without a default is a compile error. Required props are filtered
  out of the check automatically (they can never carry a default), and a
  deliberately default-free optional prop is declared `key: undefined` —
  the ruling stated in the defaults object itself.
- **`propsWithDefaults(this.propsDefaults, this.propsTypes)`** fuses the
  pair into a defineComponent-style props object. Object and array
  defaults are wrapped in cloning factories automatically
  (`structuredClone`; pass a custom cloner for exotic values); primitives
  pass through untouched. Because it reads `this`, the one line written in
  the base fuses a subclass's own types and defaults when read as
  `Child.props`.
- **`Props`** is derived with `ExtractPropTypes` from the class — defaulted
  props come out non-optional, default-free ones optional, and nothing is
  ever hand-duplicated.
- **`Static($TextMarquee)`** anchors the class because it declares
  statics — the same anchor rule every capability class follows; it costs
  nothing on getters and gives a `$`-prefixed static its compute-once
  cache.

The SFC is pure wiring against the seam. The macros receive the RUNTIME
objects through `Class` — the mutable slot — so a global override that
swaps the class swaps its contract with it, and no compiler macro ever
resolves a cross-file type:

```ts
const props = defineProps(TextMarquee.Class.props); // inferred — no cast
const emit = defineEmits(TextMarquee.Class.emits) as TextMarquee.Emits;
```

A **generic** component adds exactly one cast — the type parameter a
runtime map cannot carry, grafted back over the one prop that needs it.
The [Horizontal Scroller example](/examples/horizontal-scroller) is the
full canonical reference for that layer.

## Extension is the point

Because the contract is a set of static getters, a subclass composes its
surface the way it composes behavior — `super`, then override what
defines the specialization, with the reason on the line. The horizontal
scroller's whole props story, as shipped:

```ts
// HorizontalVirtualScroller.ts (class excerpt)
class $HorizontalVirtualScroller<T extends BaseItem> extends VirtualScroller.$Class<T> {
  static override get propsDefaults(): typeof VirtualScroller.$Class.propsDefaults {
    return {
      ...super.propsDefaults,
      assumedSize: 300 // cards are ~hundreds of px wide where rows are tens tall
    };
  }
}
```

Every prop inherited, one default overridden, and nothing else to
write: `props` and `emits` are inherited whole, and `props` fuses the
new defaults because it reads through the receiver. This is the
contract-side mirror of `extends VirtualScroller.$Class` — the class
hierarchy and the contract hierarchy are the SAME hierarchy, so neither
can drift from the other.

`propsWithDefaults` is **non-mutating** by design: spreading a types map
shares the inner `{ type }` descriptor objects, so an in-place
implementation would silently rewrite the base component's defaults when
the child applies different ones. Each descriptor is copied — the base
surface is never touched by its children.

## Why the namespace holds no values

The namespace used to be a plausible home for the contract as `const`
data. It fails the moment the class extends: a namespace `const` is not
inherited, cannot be overridden with `super`, and does not move when
`Class` is reassigned — so the class was extensible and its contract was
not, two worlds under one name. On the class, the contract gets class
mechanics for free: inheritance, `override` checked by the compiler,
and one swap point. The namespace keeps what only a namespace can hold —
`$Class`, `Class`, and the TYPES derived from them.

## Adding props, not just re-tuning them

A subclass that ADDS a prop overrides `propsTypes` (spreading `super`),
overrides `propsDefaults` for the new key, and re-declares the one
fusion line so its derived `Props` type widens — a static's return type
is not polymorphic in TypeScript, so the base's `props` would type as
the base contract. `ContactField` is the shipped case: the choose-field
contract preconfigured for contacts, plus one prop of its own:

```ts
// ContactField.ts (class excerpt)
class $ContactField extends ChooseField.$Class {
  static override get propsTypes() {
    return definePropTypes({
      ...super.propsTypes,
      /** Compact display mode: smaller avatar, name only, denser rows. */
      compact: { type: Boolean as PropType<boolean> },
    });
  }

  static override get propsDefaults(): ExtractPropDefaultTypes<typeof $ContactField.propsTypes> {
    return {
      ...super.propsDefaults,
      useChips: true,                                // chips on
      optionLabelPriority: ['name', 'email', 'id'],  // its label rules
      compact: false,                                // its own prop
    };
  }

  /** Re-declared so `ContactField.Props` carries `compact`. */
  static override get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }
}
```

Everything else — the SFC, the example route, any consumer — speaks
`ContactField.Class.props`, `ContactField.Class.emits`,
`ContactField.Props`. A shared base surface is a base class, never a
spread-in constant: `ChooseField` extends `Field`, whose statics declare
the QField passthrough every field shares (model, label, hint, density,
states), and inherits them the way it inherits behavior.

## Emits and slots, same discipline

Emits are declared as a static getter returning an object of validators
— data, like the props — and the emit function's type is derived by
`ExtractEmitTypes`:

```ts
class $ChooseField extends Field.$Class {
  static get emits() {
    return {
      'update:model-value': (newValue: any) => true,
      remove: (removed: { index: number; value: any }) => true,
    };
  }
}

export namespace ChooseField {
  export type Emits = ExtractEmitTypes<typeof $Class.emits>;
}
```

Slots interfaces extend a wrapped component's slots with
`before--`/`after--` prefixed variants via `ExtendSlots`, which is what
lets a wrapping component inject content around every inherited slot
without redeclaring any of them:

```ts
export namespace ChooseField {
  export type Slots = ExtendSlots<QSelectSlots>;
}
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
[Advanced Media Uploader](/examples/media-field) are the large-surface
reference — forty-prop contracts as static getters, a shared `Field`
base, and class extension driven through the `runner` mechanism, with
each class consuming every prop through plain prop-getters per the
[standard](/guide/standard).

The [Horizontal Scroller: 1M Items](/examples/horizontal-scroller) is
the generic-typing reference: one default re-tuned through `super`, and
the `Props<T>` graft for the type parameter a runtime map cannot carry. The
measured account of what the whole system buys is
[Ship the variant, keep the tuning](/blog/ship-the-variant-keep-the-tuning).

## See it running

- [Advanced Select Field](/examples/choose-field) — a 45-prop contract, extended by ContactField.
- [Advanced Media Uploader](/examples/media-field) — an uploader and its class-extended tile variant.
- [Virtual Scroller: 1M Items](/examples/virtual-scroller) — a million rows, a handful of divs.
- [Horizontal Scroller: 1M Items](/examples/horizontal-scroller) — the vertical class rotated, one default re-tuned.
