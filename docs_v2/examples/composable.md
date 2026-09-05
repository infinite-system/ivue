---
title: 'Example: Composables in classes'
description: 'Both directions of the composable seam, live: useMouse hosted privately inside a class through a $-getter, and an undo-history class published behind a one-line useUndoHistory() composable face.'
relatedPosts: [organs-not-skeletons, derivations-are-free]
---

<script setup>
import DemoPointer from '../.vitepress/theme/components/DemoPointer.vue'
import DemoUndoHistory from '../.vitepress/theme/components/DemoUndoHistory.vue'
</script>

# Composables in classes

A composable and an ivue class package the same reactive primitives in two
containers, and the two meet at one seam that runs in both directions. This
page runs both.

## Hosting: a composable inside a class

`Pointer` hosts `useMouse` behind a protected `$`-getter: the composable is
created once, on the first read, and cached for the life of the instance.
The public surface is two refs, `x` and `y`, plus two plain-getter
readouts.

<ClientOnly>
  <DemoPointer />
</ClientOnly>

- **The composable is an implementation detail.** Swap `useMouse` for any
  other source of coordinates and no consumer changes.
- **Scope-correct teardown.** The instance is constructed in setup, so
  `$mouse` materializes inside the component's scope and its listeners are
  cleaned up on unmount.

## Publishing: a class behind a composable face

`useUndoHistory()` is one line: `return new UndoHistory.Class()`. A
consumer who only knows composables calls it and destructures, and gets a
class underneath: lazy state, plain-getter derivations (`canUndo`,
`canRedo`, `positionLabel` cost zero bytes per instance), and
a model that can be subclassed or swapped without touching a caller.

The demo edits a grocery list. Each operation records one labeled
snapshot; undo, redo and the step rail move the history's cursor, and a
branch you undo past is dropped by the next operation, the way every
editor's history behaves. `GroceryList` hosts the same `UndoHistory`
class behind a `$`-getter, which is the hosting direction again, one
level up.

<ClientOnly>
  <DemoUndoHistory />
</ClientOnly>

- **The face costs one function.** The class is the unit; the composable is
  its calling convention for the ecosystem.
- **Every derivation is a plain getter.** A composable version would pay a
  `computed()` for each of `canUndo`, `canRedo`, `depth`, `positionLabel`.

## Related guide pages

- [Composables & Stores](/guide/composables) — the two architectures, the
  `$`-getter, who owns a composable's effects, publishing class logic
  behind `use()`.
- [Reactive State](/guide/state) — `$`-prefixed getters as cached
  containers.
- [Lifecycle & Teardown](/guide/lifecycle-teardown) — why first touch in
  setup is what ties a composable's listeners to the component.

## The source

::: code-group
<<< ../../examples/playground/src/examples/composable/Pointer.ts [Pointer.ts]
<<< ../../examples/playground/src/examples/composable/UndoHistory.ts [UndoHistory.ts]
<<< ../../examples/playground/src/examples/composable/useUndoHistory.ts [useUndoHistory.ts]
<<< ../../examples/playground/src/examples/composable/GroceryList.ts [GroceryList.ts]
<<< ../../examples/playground/src/examples/composable/ComposableExample.ts [ComposableExample.ts]
<<< ../../examples/playground/src/examples/composable/ComposableExample.vue [ComposableExample.vue]
:::

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Fcomposable%2FUndoHistory.ts&path=%2F%23%2Fcomposable">Open in StackBlitz ⚡</a>
— the playground boots with this example's route and file active.
