---
title: 'Example: Lifecycle & Teardown'
description: 'Both instance lifetimes, live: a component-owned Ticker whose constructor runs in setup (plain watch, onMounted, an interval released by dispose()), and an outliving Sensor whose $watch is started, suspended, resumed and disposed by hand.'
relatedPosts: [rented-objects, reactivity-is-an-allocator, organs-not-skeletons]
---

<script setup>
import DemoTeardown from '../.vitepress/theme/components/DemoTeardown.vue'
</script>

# Lifecycle & Teardown

A Reactive instance has exactly two lifetimes it can have, and each one has
a complete toolbox. This example runs both in one route.

## Lives and dies with the component

`Ticker`'s constructor runs where you `new` it. Constructed in
`<script setup>`, that is inside the component's setup, so its plain
`watch()` and its `onMounted` / `onUnmounted` hooks register against the
mounting component. The interval it starts is a non-Vue resource the
engine cannot know about, so an ordinary `dispose()` method releases it and
the unmount hook delegates there. Nothing calls `$stopEffects()`, because
the component owns every effect.

## Outlives the component

`Sensor` manages its own watcher: `start()` registers a `$watch` in the
instance's lazily created effect scope, `stop()` disposes just that
watcher, `suspend()` calls `$stopEffects({ reset: false })` so the watchers
stop but every cached cell keeps its value, and `dispose()` calls
`$stopEffects()`, where the scope stops and every cached cell is dropped,
so state re-materializes fresh on the next access.

Its constructor carries the bridge from the guide,
`getCurrentScope() && onScopeDispose(() => this.dispose())`: constructed
inside a component, disposal rides that component's unmount; constructed
anywhere else, the line is a no-op and the owner disposes by hand. The
docs demo below writes no unmount hook because of it.

<ClientOnly>
  <DemoTeardown />
</ClientOnly>

## What to notice

- **The scope is lazy.** A Sensor that never calls `$watch` allocates no
  effect scope at all; Ticker never allocates one, its effects are the
  component's.
- **Suspend keeps the state.** After `suspend()`, `fired` and `last change`
  hold their values while the slider no longer triggers the watcher, and
  `start()` resumes in a fresh scope where the counter left off.
- **Dispose is total, and terminal for existing bindings.** After
  `$stopEffects()` the old cells are gone; the next access materializes
  fresh ones. Consumers that destructured the old cells are detached by
  design. Stop-and-resume is what `suspend()` is for.
- **Cleanup is a method, never a hook.** Both classes release resources
  through `dispose()`. ivue auto-calls nothing, so there is no reserved
  name to remember and the same method serves a component's unmount hook,
  the `onScopeDispose` bridge, and an explicit owner alike.
- **Watch callbacks delegate to methods** (`onTick`, `onTempChanged`), the
  thin-closure rule that keeps logic named on the prototype and directly
  testable.

## Related guide pages

- [Lifecycle & Teardown](/guide/lifecycle-teardown) — the two lifetimes,
  `$watch`, `$stopEffects` and its `reset: false` form, richer cleanup as
  an ordinary method, the `onScopeDispose` bridge.
- [Composables & Stores](/guide/composables) — who owns a composable's
  effects, and why a store never registers lifecycle hooks.
- [Computed & Watch](/guide/computed-watch) — plain `watch` versus
  `$watch`, and the thin-closure rule.

## The source

::: code-group
<<< ../../examples/playground/src/examples/lifecycle/LifecycleExample.ts [example]
<<< ../../examples/playground/src/examples/lifecycle/Ticker.ts [Ticker.ts]
<<< ../../examples/playground/src/examples/lifecycle/Sensor.ts [Sensor.ts]
<<< @/.vitepress/theme/components/DemoTeardown.vue [template]
:::

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Flifecycle%2FSensor.ts&path=%2F%23%2Flifecycle">Open in StackBlitz ⚡</a>
— the playground boots with this example's route and file active.
