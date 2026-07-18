---
title: 'Example: Pinia Store Alternative'
description: 'A class-based alternative to Pinia stores — useProjectStore() returns one shared ivue instance, with an optional reactive() view typed through Store.Instance.'
aside: false
pageClass: benchmarks-wide examples-page
---

<script setup>
import ExampleClassStore from '../.vitepress/theme/components/examples/ExampleClassStore.vue'
</script>

# Pinia Store Alternative

**A class-based alternative to Pinia stores.**

A global store needs three things: shared state, derived values, and
actions. An ivue class already is all three — so the entire store
machinery reduces to a **singleton composable**:

```ts
let store: InstanceType<typeof ProjectStore.Class> | undefined;

export function useProjectStore() {
  return (store ??= new ProjectStore.Class());
}
```

No Pinia, no `defineStore`, no plugin registration. Every component that
calls `useProjectStore()` receives the same instance; state written in one
panel renders in every other.

Three independent components below share the store with zero props between
them — type a task in the first panel and watch the other two react:

<ClientOnly>
  <ExampleClassStore />
</ClientOnly>

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Fclass-store%2FProjectStore.ts&path=%2F%23%2Fclass-store">Open in StackBlitz ⚡</a>
— boots the playground on this example's route with the store class open.

## The optional reactive() view

Some teams prefer store reads without `.value`. The same singleton wraps in
`reactive()` — refs auto-unwrap on read **and** write — and the cast
through `ProjectStore.Instance` is load-bearing: it strips the `readonly`
TypeScript puts on get-only accessors, so writes typecheck exactly as they
behave at runtime ([the unwrapping-surface invariant](/guide/standard#the-unwrapping-surface-typing-invariant)):

```ts
export function useProjectStoreReactive() {
  return reactive(useProjectStore() as ProjectStore.Instance);
}
```

```ts
const project = useProjectStoreReactive();

project.projectName = 'Artemis'; // ref write, no .value
project.filter = 'done';         // typechecks because of Instance
```

Both views read and write the SAME cells — pick per consumer, not per app.

## What to notice

- **The store outlives components**, so its constructor uses
  `this.$watchEffect` (the instance's own effect scope), not plain
  `watchEffect` — the [lifecycle rule](/guide/lifecycle-teardown) for
  outliving instances.
- **Derivations are plain getters** (`completedCount`, `progressPercent`,
  `visibleTasks`) — every consumer reads live values, zero computeds
  allocated.
- **The third panel writes `project.projectName` with no `.value`** — the
  `reactive()` view at work, fully typed.

## The source

::: code-group
<<< ../../examples/playground/src/examples/class-store/ProjectStore.ts [ProjectStore.ts]
<<< ../../examples/playground/src/examples/class-store/TaskBoard.vue [TaskBoard.vue]
<<< ../../examples/playground/src/examples/class-store/ProjectStats.vue [ProjectStats.vue]
<<< ../../examples/playground/src/examples/class-store/ReactiveViewPanel.vue [ReactiveViewPanel.vue]
<<< ../../examples/playground/src/examples/class-store/ClassStoreExample.vue [demo route]
:::
