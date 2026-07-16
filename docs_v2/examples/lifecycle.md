---
title: 'Example: $watch & $stopEffects'
description: 'An instance-scoped watcher started, stopped and disposed by hand — the lifecycle surface for instances that outlive components, driven live.'
---

<script setup>
import DemoTeardown from '../.vitepress/theme/components/DemoTeardown.vue'
</script>

# $watch & $stopEffects

`Sensor` manages its own watcher: `start()` registers a `$watch` in the
instance's lazily created effect scope, `stop()` disposes just that watcher,
and `dispose()` calls `$stopEffects()` — the scope stops and every cached
cell is dropped, so state re-materializes fresh on the next access.

<ClientOnly>
  <DemoTeardown />
</ClientOnly>

## What to notice

- **The scope is lazy.** An instance that never calls `$watch` allocates no
  effect scope at all.
- **Dispose is total.** After `$stopEffects()`, the old cells are gone;
  touching any ref-getter materializes a fresh cell.
- The watch callback delegates to a method (`onTempChanged`) — the
  thin-closure rule keeps logic named on the prototype and directly testable.

## The source

::: code-group
<<< ../../examples/playground/src/examples/lifecycle/Sensor.ts [Sensor.ts]
<<< ../../examples/playground/src/examples/lifecycle/LifecycleExample.vue [LifecycleExample.vue]
:::

<a class="feature-inline-link" href="https://stackblitz.com/github/infinite-system/ivue/tree/main/examples/playground?file=src%2Fexamples%2Flifecycle%2FSensor.ts&initialPath=%2F%23%2Flifecycle" target="_blank" rel="noreferrer">Open in StackBlitz ⚡</a>
— the playground boots with this example's route and file active.
