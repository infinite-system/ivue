---
title: 'Example: Pinia Store Alternative'
description: 'A class-based alternative to Pinia stores — ProjectStore.Class.use() returns one shared ivue instance, injected into other classes through a cached $-getter, with an optional reactive() view.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [templates-with-nothing-to-debug, reactive-is-all-you-need, module-level-state, rented-objects]
---

<script setup>
import ExampleClassStore from '../.vitepress/theme/components/examples/ExampleClassStore.vue'
</script>

# Pinia Store Alternative

**A class-based alternative to Pinia stores.**

A global store needs three things: shared state, derived values, and
actions. An ivue class already is all three — so the entire store
machinery reduces to **one static on the class that owns the singleton**:

```ts
class $ProjectStore {
  protected static readonly shared = new LazyShared<ProjectStore.Instance>(
    () => new ProjectStore.Class(),
  );

  static use(): ProjectStore.Instance {
    return this.shared.value;
  }

  // …state, derivations, actions
}

export namespace ProjectStore {
  export const $Class = Static($ProjectStore); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance;
}
```

No Pinia, no `defineStore`, no plugin registration, and nothing in the
namespace but identity and types. Every component that calls
`ProjectStore.Class.use()` receives the same instance; state written in one
panel renders in every other. `LazyShared` runs its thunk on first touch,
after the app exists, so module-load order and circular imports stay
non-events. It constructs through the namespace slot, so a test double
swapped into `Class` is what gets built. And because the singleton is a
`static readonly` field rather than a `$`-cached static, every receiver —
the class, a subclass, the double — resolves to the same cell.

Three independent components below share the store with zero props between
them — type a task in the first panel and watch the other two react:

<ClientOnly>
  <ExampleClassStore />
</ClientOnly>

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Fclass-store%2FProjectStore.ts&path=%2F%23%2Fclass-store">Open in StackBlitz ⚡</a>
— boots the playground on this example's route with the store class open.

## Injecting the store into other classes

Components call `use()` directly in setup. Other **classes** — view
models, entities, capability classes — reach the store through a cached
`$`-getter instead of receiving it as a constructor argument:

```ts
class $TaskBoardModel {
  // resolved on first touch, cached per instance, circular-import safe
  protected get $project() {
    return ProjectStore.Class.use();
  }

  get remainingLabel() {
    return `${this.$project.visibleTasks.length} tasks in view`;
  }

  completeAll() {
    for (const task of this.$project.visibleTasks) {
      this.$project.toggleTask(task.id);
    }
  }
}
```

This is what keeps shared state out of prop chains: no
`<ChildView :store="store" />`, no `constructor(public store: …)`
threading one object through every signature it crosses. A prop named
`store`, `app`, or `session` is the tell that a store is being drilled —
pass props for genuinely per-instance input (a row, a slug, a config
knob), and reach for the store for what is genuinely shared.

Tests swap the seam, not the callers: install a double with
`ProjectStore.Class = Reactive($TestProjectStore)` before the first
`use()` and every consumer receives it through the same getter.

## The optional reactive() view

Some teams prefer store reads without `.value`. The same singleton wraps in
`reactive()` — refs auto-unwrap on read **and** write. `use()` returns the
`ProjectStore.Instance` type, and that typing is load-bearing: it strips
the `readonly` TypeScript puts on get-only accessors, so writes typecheck
exactly as they behave at runtime
([the unwrapping-surface invariant](/guide/standard#the-unwrapping-surface-typing-invariant)).
It is one more static on the class:

```ts
class $ProjectStore {
  // …the statics above, plus:
  static useReactive() {
    return reactive(this.use());
  }
}
```

```ts
const project = ProjectStore.Class.useReactive();

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

## Related guide pages

- [Composables & Stores](/guide/composables) — hosting and publishing composables; stores behind `use()`.
- [Lifecycle & Teardown](/guide/lifecycle-teardown) — the two lifetimes, `$stopEffects`, the bridge.
- [Modules & Imports](/guide/modules) — circular imports dissolved by late reads through the namespace.
- [Caches, Registries & self](/guide/caches-and-registries) — shared stores, `LazyShared`, reading statics through `self`.

## The source

::: code-group
<<< ../../examples/playground/src/examples/class-store/ProjectStore.ts [ProjectStore.ts]
<<< ../../examples/playground/src/examples/class-store/TaskBoard.ts [TaskBoard.ts]
<<< ../../examples/playground/src/examples/class-store/TaskBoard.vue [TaskBoard.vue]
<<< ../../examples/playground/src/examples/class-store/ProjectStats.vue [ProjectStats.vue]
<<< ../../examples/playground/src/examples/class-store/ReactiveViewPanel.vue [ReactiveViewPanel.vue]
<<< ../../examples/playground/src/examples/class-store/ClassStoreExample.vue [template]
:::
