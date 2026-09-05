---
title: 'Single-file models'
description: 'Vue gave the view one file. ivue gives the model one file: state, derivation, behavior, contract and knobs on a class, extended by inheritance and nothing else. The conversion deleted four files, and the shape is now something a gate can check.'
date: 2026-09
tags: [patterns, architecture, agents]
relatedPosts: [ship-the-variant-keep-the-tuning, ban-private, the-options-api-everyone-wanted, inheritance-exile]
---

# Single-file models

![Single-file models](/blog/single-file-models.png)

<BlogPostDate />

A Vue single-file component is one file that is the whole view: template,
script, style. Ask a Vue developer where a component's markup lives and
they point at one file. Ask where its *model* lives, the state and logic
and the props contract, and the pointing gets vaguer. A composable here, a
props object there, defaults locked inside a compiler macro.

ivue puts the model in one file too. A class file has three residents:
imports, the class, the namespace. Everything the component is, other
than its markup, lives on the class, and a child class changes only what
is different. We call it a single-file model, the model-side twin of the
SFC.

> The SFC gave the view one file. The single-file model gives the logic one file.

This post is the last cut that got it there, what the cut deleted, and
why the shape is now closed.

## The half-extensible class

ivue classes were already extensible: state is a getter returning a ref,
derived values are plain getters, behavior is methods, and a subclass
overrides any of them with `super` in reach. The props contract was not
on the class. It sat beside it, in the namespace, as data:

```ts
export namespace TextMarquee {
  export const $Class = $TextMarquee;
  export let Class = Reactive($Class);

  export const propsTypes = definePropTypes({ /* … */ });
  export const propsDefaults = { pxPerSecond: 50, targetChars: 400 };
  export const props = propsWithDefaults(propsDefaults, propsTypes);
}
```

That looked tidy and it was a parallel world. A namespace `const` is not
inherited. A subclass cannot override it with `super`. And when a global
override reassigns `Class`, the `const` stays where it was, so the runner
swapped and the contract did not. The class was extensible and its
contract was not: one name, two architectures.

The tell was in the subclasses. Every variant re-spread the parent's
maps by hand:

```ts
export const propsTypes = { ...VirtualScroller.propsTypes };
export const propsDefaults = { ...VirtualScroller.propsDefaults, assumedSize: 300 };
export const props = propsWithDefaults(propsDefaults, propsTypes);
```

Three lines to change one number, and nothing checked that the spread
kept up with the parent. Large contracts had drifted into sibling
`XProps.ts` modules with their own re-export blocks. The shape had grown a
second owner.

## The cut

Ask what must be true for the contract to extend the way the class
extends. It has to be a class member. That is the whole answer, and it
lands on static getters:

```ts
class $TextMarquee {
  /** 1 — the TYPES, no defaults inside. */
  static get propsTypes() {
    return definePropTypes({
      text: { type: String as PropType<string>, required: true },
      pxPerSecond: { type: Number as PropType<number> },
      targetChars: { type: Number as PropType<number> }
    });
  }

  /** 2 — the DEFAULTS, checked against the types. */
  static get propsDefaults(): ExtractPropDefaultTypes<typeof $TextMarquee.propsTypes> {
    return { pxPerSecond: 50, targetChars: 400 };
  }

  /** 3 — the FUSION, written once, read through the receiver. */
  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  /** A tuning knob: a live static a subclass or test double overrides. */
  static get minimumChunkWidth() {
    return 60;
  }
}

export namespace TextMarquee {
  export const $Class = Static($TextMarquee);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export type Props = ExtractPropTypes<typeof $Class.props>;
}
```

The namespace kept what only a namespace can hold: `$Class`, `Class`,
and the types derived from them. It carries no runtime of its own
anymore. The SFC reads the contract through the mutable slot:

```ts
const props = defineProps(TextMarquee.Class.props);
```

Which closes the seam at both ends. Swap `Class` under a global override
and the contract travels with the runner, because it was never anywhere
else.

## What extension looks like now

The horizontal scroller inherits every prop of the vertical one and
changes one default. That is now one override, and `props` needs no
mention because it reads `this`:

```ts
class $HorizontalVirtualScroller<T extends BaseItem> extends VirtualScroller.$Class<T> {
  static override get propsDefaults(): typeof VirtualScroller.$Class.propsDefaults {
    return {
      ...super.propsDefaults,
      assumedSize: 300 // cards are hundreds of px wide; rows were tens tall
    };
  }
}
```

The contact field adds a prop of its own to the choose-field contract.
That is the types override, the defaults override, and the fusion line
re-declared once so the derived `Props` type widens (a static's return
type is not polymorphic in TypeScript):

```ts
class $ContactField extends ChooseField.$Class {
  static override get propsTypes() {
    return definePropTypes({
      ...super.propsTypes,
      compact: { type: Boolean as PropType<boolean> }
    });
  }

  static override get propsDefaults(): ExtractPropDefaultTypes<typeof $ContactField.propsTypes> {
    return { ...super.propsDefaults, useChips: true, compact: false };
  }

  static override get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }
}
```

`noImplicitOverride` is on, so every one of those `override` keywords is
checked. Rename a prop in the base and every child that re-tunes it
fails to compile at the exact line. The class hierarchy and the contract
hierarchy are the same hierarchy, so neither can drift from the other.

The plain version: everything a component is lives in one file, and a
child file says only what is different.

## What the cut deleted

The conversion covered every component in the playground that had a
contract: the text marquee, both scrollers, the media uploader and its
extended variant, the choose field and the contact field.

| removed | replaced by |
| --- | --- |
| `ChooseFieldProps.ts`, `ContactFieldProps.ts`, `MediaFieldProps.ts` | statics on the class |
| `field-kit.ts`, a shared `baseFieldProps` constant | a `Field` base class the fields extend |
| the namespace `Values` section and its re-export blocks | nothing |
| a module-level sentinel constant | a static knob on the class |

Four files gone, and the playground came out at the same line count it
went in at: 714 lines added, 726 removed. The contract did not get
shorter. It moved to where it could be inherited. A shared base surface
became a base class, because inheritance is the only composition the
contract uses, and a base class is the only kind of sharing that
extends.

The standards gate that checks every ivue class already had the rule
that decides the last question: a class that declares a static anchors
with `Static()`. The contract is statics, so component classes anchor.
That cost nothing on getters, and it is what gives a `$`-prefixed static
its compute-once cache.

## Why this is the last shape

Run the deletion test on it. Remove the statics from the class and the
contract stops extending. Remove the namespace and there is no mutable
`Class` slot to swap, and no home for types. Add a props module back and
there is a second owner. Add a namespace `const` back and there is a
parallel world. Nothing is removable without losing something, and
nothing is addable without a second mechanism.

That is the signature of a form that has finished reducing, and it is
why a gate can verify it. The check is not "does this file look
organized." It is: three residents, statics for every runtime
declaration, derived types in the namespace, `X.Class.props` in the SFC.
An agent writing a new component either produces that shape or fails
the gate, which is the same property that let agents build a
[94,000-line editor](/blog/agents-built-an-editor) on the class standard
without the shape drifting.

The engine underneath did not change. Still 1.1 kB, still the same
`Reactive()` call. What changed is that the model now has the one thing
the view has had since Vue 2: a file that is all of it.

Classes extend. Now everything on them does.
