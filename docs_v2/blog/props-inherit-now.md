---
title: 'Props inherit now'
description: 'A component contract that extends like a class: a variant re-tunes a default in one override, adds a prop in three, narrows a type, shares a base surface, and the compiler checks every line. What that makes possible, with the shipped receipts.'
date: 2026-09
tags: [patterns, architecture, agents]
relatedPosts: [single-file-models, ship-the-variant-keep-the-tuning, ban-private, the-options-api-everyone-wanted, inheritance-exile]
---

# Props inherit now

![Props inherit now](/blog/props-inherit-now.png)

<BlogPostDate />

Classes extend. State, derived values, methods: a child class overrides
any of them with `super` in reach, and the compiler checks the override.
Props never did. In every Vue component ever written, the contract was
the one part of the component that could not inherit.

The usual shape is a `withDefaults(defineProps<T>())` macro. The types
are a compile-time interface. The defaults are locked inside a compiler
transform. Neither is a value another file can import, spread, or
override three keys of. So a variant of a forty-prop component
re-declares forty props by hand, or falls through to untyped `$attrs`
and hopes. Either way the parent and the variant have two contracts
that nothing keeps in step.

> Props were the last part of a component that could not inherit.

In ivue the contract is three static getters on the class, and a child
class extends it the way it extends behavior. This post is about what
that buys, with the code that shipped.

## The four moves

Every extensible contract is one of four moves on a base. All four are
live in the [playground fields](/examples/choose-field).

**Re-tune.** The horizontal scroller inherits every prop of the vertical
one and changes one number. One override, and nothing else to write:

```ts
class $HorizontalVirtualScroller<T extends VirtualScroller.BaseItem> extends VirtualScroller.$Class<T> {
  static override get propsDefaults(): typeof VirtualScroller.$Class.propsDefaults {
    return {
      ...super.propsDefaults,
      assumedSize: 300 // cards are hundreds of px wide; rows were tens tall
    };
  }
}
```

**Add.** The contact field is the choose field preconfigured for people.
It adds one prop of its own and re-tunes eleven inherited defaults:
chips on, server search and pagination on, contact-shaped label and
description priorities. Forty-five inherited props, twelve lines of
difference, and the whole class file is 142 lines:

```ts
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
      useChips: true,
      roundChips: true,
      fetchSearch: true,
      fetchPagination: true,
      fetchRowsPerPage: 8,
      optionLabelPriority: ['name', 'email', 'id'],
      compact: false,
    };
  }

  static override get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }
}
```

**Narrow.** The media uploader inherits the field base's `modelValue`,
typed `any` there because every field models something different, and
narrows it to what a media field can hold. Same key, tighter type, one
line:

```ts
static override get propsTypes() {
  return definePropTypes({
    ...super.propsTypes,
    /** Narrowed from the base's `any`: rows, ids, a mix, or null. */
    modelValue: { type: [Object, Array, String] as PropType<MediaField.Model> },
    // …the eleven media-specific params
  });
}
```

**Share.** The nine props every field passes through to Quasar's
`QField` (model, label, hint, density, the disabled and readonly
states, loading, outlined, and the runner) are declared once, on a
`Field` base class. The choose field and the media uploader extend it
and never mention them. A shared surface is a base class, not a
constant spread into each contract.

| class | inherits | adds | re-tunes |
| --- | --- | --- | --- |
| `Field` | 0 | 9 | 0 |
| `ChooseField` | 9 | 36 | 0 |
| `ContactField` | 45 | 1 | 11 |
| `MediaField` | 9 | 11 | 1 (narrows `modelValue`) |

The plain version: a child says only what is different, and the
compiler checks that it still fits.

## What the compiler checks

Extension is only worth having if it cannot drift. Four small pieces of
machinery make each move safe, and each one is a compile error, not a
convention.

- **A prop without a default is an error.** The defaults getter is
  annotated `ExtractPropDefaultTypes<typeof $X.propsTypes>`, which
  requires every optional prop to appear. Add `compact` to the types
  and forget its default: the file does not compile. Required props are
  filtered out of the check, and a deliberately default-free prop is
  declared `key: undefined`, a decision stated in data.
- **`required: true` survives.** `definePropTypes()` is an identity
  call whose only job is generic inference. A bare object literal widens
  `required: true` to `boolean`, which would blind the defaults check.
- **The base surface is never mutated.** Spreading a types map shares
  the inner descriptor objects. `propsWithDefaults` copies each one
  before applying a child's defaults, so re-tuning a default in a child
  cannot rewrite the parent's.
- **Every override says so.** `noImplicitOverride` is on. Rename a
  prop in the base and every child that re-tunes it fails to compile at
  the exact line. The class hierarchy and the contract hierarchy are the
  same hierarchy.

And the resolved TypeScript type is never written by hand.
`ContactField.Props` is `ExtractPropTypes<typeof $Class.props>`, so the
one thing a child has to remember when it adds a prop is to re-declare
the fusion line, because a static's return type is not polymorphic. A
child that only re-tunes does not even do that.

## Runtime props, and what type-based props gave up

Vue chose type-based props. `defineProps<Props>()` reads an interface,
and the compiler turns it into a runtime declaration for you. It is
concise, and for a terminal component it is the right call. It also
gives up four things, all of them at once:

- **The contract is not a value.** An interface cannot be imported at
  runtime, spread, inspected, or handed to a function. Nothing outside
  the compiler can see what a component accepts.
- **Defaults are not a value either.** `withDefaults()` locks them in a
  transform. A variant cannot read the parent's defaults, so it cannot
  re-tune one. Object and array defaults need hand-written factories.
- **Cross-file types are a compiler problem.** The macro has to resolve
  `Props` across imports at build time, with rules about what shapes it
  can follow. A runtime object never asks the compiler to do that.
- **Nothing is checkable at runtime.** Types erase. A tool that wants to
  verify a contract, render one, or compare two has nothing to read.

Runtime props keep all four, and lose nothing on the type side, because
the types are derived from the values instead of the other way round.
`ExtractPropTypes<typeof $Class.props>` is the resolved contract as the
class receives it, with defaulted props non-optional. And the defaults
are extractable on their own: `typeof $ContactField.propsDefaults` is a
type, and `ExtractPropDefaultTypes<typeof $ContactField.propsTypes>` is
the check that every optional prop has one. A test asserts a default. A
docs page renders a props table from the object the component actually
uses, never a copy. A gate diffs two contracts.

The use that matters most is an interface built ON the defaults. A
property panel, a design tool, an agent harness that lets a person or a
model tune a live component: each needs every knob shown with its
initial value already in place. `X.Class.propsDefaults` is that panel's
data, read at runtime from the component itself, so `thumbnailSize`
opens at 132 and `fetchRowsPerPage` at 8 without anyone copying a number
out of the source. A subclass's panel shows the subclass's defaults,
because the getter reads through the receiver. Type-based props cannot
do this at all: the defaults exist only inside a compiler transform,
and at runtime there is nothing left to read. The shell can compare an
arriving runner's `Class.props` against the declared set at mount and
warn on a mismatch, a tripwire type-based props cannot offer because
there is nothing there to compare.

The compiler still does its job. It does it on data you own.

## What it makes possible

**A component becomes a family.** One choose field, and a contact
field, a country field, a tag field, each a page of differences over
one implementation. Nothing about that is new in class design. What is
new is that the family's props are part of the inheritance, so the
variants stay typed and stay in step. The ContactField file is 142
lines because the other 858 are inherited, contract included.

**A variant is a diff.** When an AI agent generates a variant, the
output is a subclass whose contract states its deltas. A reviewer reads
twelve lines and sees exactly what changed. A gate can check the shape.
That is the property that let agents build a
[108,000-line editor](/blog/agents-built-an-editor) on this standard
without the components drifting apart: the diff is the format, and the
compiler holds the base still.

**Test doubles re-tune, not mock.** A test subclass overrides one
default or one tuning knob and the rest of the contract comes along.
No fixture that re-declares a surface it does not care about.

**The contract swaps with the runner.** The SFC reads
`X.Class.props`, and `Class` is a mutable slot. Reassign it and the
component's inputs move with its logic, in one place. Before, the
contract was a `const` beside the class and only half of the component
moved.

**Extension has direction.** A child can widen (add), narrow (a
tighter type), or re-tune. It cannot silently remove, because the base
type flows through `super`. That asymmetry is the same one that makes
subclassing safe for behavior: a consumer written against the base
keeps working against every child.

## The cost

Two lines a child pays that a namespace `const` did not: the `override`
keyword, and the re-declared fusion line when a child adds props. Both
are the compiler seeing the seam. There is no runtime cost. The getter
reads happen once, when the SFC is defined, and the engine underneath is
still 1.1 kB.

Vue 3 only, and only for components written as ivue classes. A plain
`withDefaults` component stays what it is.

## Where the line ends

Ask what a component is: markup, state, derivation, behavior, contract.
Four of those extended by inheritance for as long as ivue has existed.
The contract was the holdout, carried as data beside the class, spread
by hand, checked by nobody. Moving it onto the class did not add a
feature. It removed an exception.

Props inherit now. Nothing on a component is left that does not.
