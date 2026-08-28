---
title: 'Example: $watch & $stopEffects'
description: 'An instance-scoped watcher started, stopped and disposed by hand — the lifecycle surface for instances that outlive components, driven live.'
relatedPosts: [rented-objects, reactivity-is-an-allocator]
---

<script setup>
import DemoTeardown from '../.vitepress/theme/components/DemoTeardown.vue'
</script>

# $watch & $stopEffects

`Sensor` manages its own watcher: `start()` registers a `$watch` in the
instance's lazily created effect scope, `stop()` disposes just that watcher,
`suspend()` calls `$stopEffects({ reset: false })` — the watchers stop but
every cached cell keeps its value — and `dispose()` calls `$stopEffects()`,
where the scope stops and every cached cell is dropped, so state
re-materializes fresh on the next access.

<ClientOnly>
  <DemoTeardown />
</ClientOnly>

## What to notice

- **The scope is lazy.** An instance that never calls `$watch` allocates no
  effect scope at all.
- **Suspend keeps the state.** After `suspend()`, `fired` and `last change`
  hold their values while the slider no longer triggers the watcher —
  `{ reset: false }` stops the scope only. `start()` resumes in a fresh
  scope and the counter continues where it left off.
- **Dispose is total — and terminal for existing bindings.** After
  `$stopEffects()`, the old cells are gone; the next access materializes
  fresh ones. Consumers that destructured the old cells (this pane
  included) are detached from the fresh ones by design — dispose ends an
  instance's life for its current consumers. Stop-and-resume is what
  `suspend()` is for.
- The watch callback delegates to a method (`onTempChanged`) — the
  thin-closure rule keeps logic named on the prototype and directly testable.

## The source

::: code-group
<<< ../../examples/playground/src/examples/lifecycle/Sensor.ts [Sensor.ts]
<<< ../../examples/playground/src/examples/lifecycle/LifecycleExample.vue [LifecycleExample.vue]
:::

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Flifecycle%2FSensor.ts&path=%2F%23%2Flifecycle">Open in StackBlitz ⚡</a>
— the playground boots with this example's route and file active.
