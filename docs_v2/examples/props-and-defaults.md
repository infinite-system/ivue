---
title: 'Example: Props contract & knobs'
description: 'A component contract that is a value: prop types, defaults and a validator as statics on the class. A knobs panel, an inheritance ledger and a validity check are all read off the statics — nothing is hand-listed.'
relatedPosts: [runtime-props-all-along, props-inherit-now, single-file-models]
---

<script setup>
import ExamplePropsContract from '../.vitepress/theme/components/examples/ExamplePropsContract.vue'
</script>

# Props contract & knobs

`Badge` declares its contract as three static getters: the prop types, the
defaults, and the fused `props` object the SFC hands to `defineProps`.
`IconBadge` extends it with `super`, adds one prop and re-tunes one default.
The panel below is not a list someone typed. Every knob, every default,
the validator verdict and the inheritance ledger are read off the classes
at runtime.

<ClientOnly>
  <ExamplePropsContract />
</ClientOnly>

### What to notice

- **The knobs come from the class.** `Badge.Class.propsTypes` decides the
  control kind, `Badge.Class.propsDefaults` seeds the value, and
  `Badge.Class.propsChoices`, a live static knob, supplies the choices.
  Add a prop to the class and a knob appears.
- **The validator is a value.** Pick `size` `0`. The panel calls the
  same function Vue would call, and says so. A type-based prop cannot
  declare one.
- **The ledger is a diff of two contracts.** Inherited, added and re-tuned
  are computed from the two classes' statics, not written down.
- **Three renders, one contract.** The base with the knob values, the
  variant with the same values plus its icon, and the variant left to its
  own defaults, where `size` is `16` because the child said so.

## The base contract

::: code-group
<<< ../../examples/playground/src/examples/props-contract/Badge.ts [Badge.ts]
<<< ../../examples/playground/src/examples/props-contract/Badge.vue [Badge.vue]
:::

## The extended contract

`...super.propsTypes` and `...super.propsDefaults`, then the one addition
and the one re-tune. `props` is re-declared because the child adds a prop
and a static's return type is not polymorphic.

::: code-group
<<< ../../examples/playground/src/examples/props-contract/IconBadge.ts [IconBadge.ts]
<<< ../../examples/playground/src/examples/props-contract/IconBadge.vue [IconBadge.vue]
:::

## Playground wrapper

The route model reads the statics and owns the knob values. The template
binds names only.

::: code-group
<<< ../../examples/playground/src/examples/props-contract/PropsContractExample.ts [example]
<<< ../../examples/playground/src/examples/props-contract/PropsContractExample.vue [template]
:::

## Related guide pages

- [Props & defaults](/guide/props-and-defaults) — the principle: declare the value, derive the type.
- [Extensible Components](/guide/extensible-components) — the four moves a contract can make on a base.
- [Inheritance & super](/guide/inheritance) — how `super` reaches the base contract.
