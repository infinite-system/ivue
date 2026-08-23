---
title: 'Example: Composable in a class'
description: 'useMouse hosted privately inside a class through a $-getter — consumers destructure two refs and never see the composable.'
relatedPosts: [organs-not-skeletons]
---

<script setup>
import DemoPointer from '../.vitepress/theme/components/DemoPointer.vue'
</script>

# Composable in a class

`Pointer` hosts `useMouse` behind a private `$`-getter: the composable is
created once, on the first read, and cached for the life of the instance.
The public surface is two refs — `x` and `y`.

<ClientOnly>
  <DemoPointer />
</ClientOnly>

## What to notice

- **The composable is an implementation detail.** Swap `useMouse` for any
  other source of coordinates and no consumer changes.
- **Scope-correct teardown.** The component's state destructure materializes
  `$mouse` inside setup, so its listeners are cleaned up on unmount.

## The source

::: code-group
<<< ../../examples/playground/src/examples/pointer/Pointer.ts [Pointer.ts]
<<< ../../examples/playground/src/examples/pointer/PointerExample.vue [PointerExample.vue]
:::

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Fpointer%2FPointer.ts&path=%2F%23%2Fpointer">Open in StackBlitz ⚡</a>
— the playground boots with this example's route and file active.
