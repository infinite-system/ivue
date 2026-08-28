---
title: 'Example: Horizontal Scroller — 1M Items'
description: 'The production virtual scroller rotated sideways by subclassing: eight overridden axis seams, every prop inherited by spread, the tuned scroll physics unchanged. One million cards, a handful of divs — and the file is the reference for the namespace-as-contract standard, generic typing included.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [ship-the-variant-keep-the-tuning, a-million-rows-twelve-divs]
---

<script setup>
import ExampleHorizontalScroller from '../.vitepress/theme/components/examples/ExampleHorizontalScroller.vue'
</script>

# Horizontal scroller: 1,000,000 cards, the vertical class sideways

<ClientOnly>
  <ExampleHorizontalScroller />
</ClientOnly>

This is not a second scroller. It is the
[vertical 1M scroller](/examples/virtual-scroller) — the same tuned
class, with the same prefix-sum cursor, origin rebasing, creep
integrator and seek pipeline — **subclassed** through its eight axis
seams. Every place the base class touches a DOM dimension or a gesture
axis is a `protected` getter or method; the subclass overrides exactly
those — each one carrying the `override` keyword, which TypeScript's
`noImplicitOverride` option makes mandatory, so a seam can never be
overridden silently or orphaned by a base rename — and the hand-tuned
80% runs sideways, unchanged. This one subclass powers three shipped
surfaces: the card strip above, the home page's blog drip, and — composed
with a pure text chunker — [a ~400k-character book scrolling as one
line](/examples/virtual-scroller#a-book-as-one-scrolling-line). The full
story is in [Ship the variant, keep the
tuning](/blog/ship-the-variant-keep-the-tuning).

## The reference for the module standard

`HorizontalVirtualScroller.ts` doubles as the canonical shape of an ivue
module. A class file has exactly three residents — imports, the class,
and the **namespace, which carries everything else** in canonical
section order:

- **Identity** — `$Class` (raw, for children to extend), `Class`
  (`Reactive()`, for you to `new`), `Instance` (the unwrapping-surface
  type).
- **Values** — the component contract as plain data: `propsTypes`,
  `propsDefaults`, the merged `props` (via
  [`propsWithDefaults`](/guide/extensible-components)), `emits`. Being
  data is what lets a subclass compose its surface by **spread** —
  every prop inherited, one default overridden, with the reason on the
  line.
- **Types** — all **derived** from the values (`Props`, `Emits`,
  `Slots`, `Exposed`), never hand-duplicated. Constants a module keeps
  to itself live in the namespace un-exported: private to the file, no
  module-level residue.

- **Generic typing** — the part that makes this the FULL canonical
  example: the scroller is a generic component (`<T extends BaseItem>`),
  and the namespace pattern carries the generic through every layer TS
  makes awkward. `Reactive()` returns the same constructor, but its
  return type cannot carry `<T>` (TypeScript has no higher-kinded
  types), so `Class` is cast back to the raw constructor type to keep
  `new VirtualScroller.Class<T>()` fully generic, and `Instance<T>`
  applies `ReactiveInstance` by hand. A runtime props map cannot carry
  a type parameter either, so `Props<T>` grafts it back over the one
  prop that needs it: `Omit<ExtractPropTypes<typeof props>,
  'modelValue'> & { modelValue: T[] }`. `Exposed<T>` closes the loop
  for template refs.

The SFC is pure wiring against that contract — and generic wiring:
`<script setup generic="T extends BaseItem">` hands the runtime `props`
object to `defineProps` (no compiler macro ever resolves a cross-file
type) and one cast recovers the precision the runtime map cannot carry:

```ts
const props = defineProps(
  VirtualScroller.props
) as unknown as VirtualScroller.Props<T>;
```

The state destructure is the only other thing in `<script setup>`.

## The source

The subclass first — the two files that ARE the horizontal scroller —
then the base machinery they inherit, exactly as running above:

::: code-group
<<< ../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.ts [HorizontalVirtualScroller.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.vue [HorizontalVirtualScroller.vue]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScroller.ts [VirtualScroller.ts]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScroller.vue [VirtualScroller.vue]
<<< ../../examples/playground/src/examples/virtual-scroller/VirtualScrollerItem.vue [VirtualScrollerItem.vue]
<<< @/.vitepress/theme/components/examples/HorizontalScrollerExample.ts [example]
<<< @/.vitepress/theme/components/examples/ExampleHorizontalScroller.vue [template]
:::

The example model is docs code — and it is written to the same standard
the page teaches: one class, one namespace, the million-card builder
and its caption bank living inside the namespace (the captions
un-exported, private to the file).

## What to notice

- **Cards in the DOM** stays at the window size across a million cards
  — and every card has a different natural width (the caption decides
  it), so the width map is genuinely measured, not assumed.
- **A plain vertical wheel scrolls the page.** The strip obeys `deltaX`
  only — shift+wheel and horizontal trackpad swipes drive it. A
  horizontal element that hijacks vertical scrolling is how you make
  readers hate a page.
- **The bar under the cards drags in progress space** — the thumb
  renders `position / (extent − container)`, and its drag is the exact
  inverse, so it lands where it points, including the true end.
- **The glide hands off, both ways.** A forward flick decays *to* the
  glide speed and the creep adopts the scroll at that exact speed —
  it never stalls to zero and restarts. The slider changes speed
  mid-glide; the integrator reads the live value every frame.

Wheel through a million cards above, then read the two files that made
it possible — that ratio is the page's whole argument.
