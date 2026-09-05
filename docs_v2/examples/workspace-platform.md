---
title: 'Example: Workspace Platform'
description: 'A ClickUp-scale interactive workspace built from ivue domain classes: list and board views, filtering, workload, task editing, comments, and activity over one coherent graph.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [the-object-graph-they-took, what-becomes-buildable, reactive-is-all-you-need]
---

<script setup>
import ExampleWorkspacePlatform from '../.vitepress/theme/components/examples/ExampleWorkspacePlatform.vue'
</script>

# Workspace Platform

**A serious application graph, not a counter enlarged with CSS.**

Orbit is a compact ClickUp-style workspace with four projects, five members,
and a connected task graph. Switch between list and board views, filter by
person or priority, drag cards between statuses, create a task, open its detail
panel, edit fields, complete checklist items, and add a comment. Every surface
updates from the same ivue objects.

<ClientOnly>
  <ExampleWorkspacePlatform />
</ClientOnly>

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Fworkspace-platform%2FWorkspace.ts&path=%2F%23%2Fworkspace-platform">Open in StackBlitz ⚡</a>

## One graph, several interfaces

The example deliberately renders the same task objects through independent
surfaces:

- The sidebar selects a project and derives its task count.
- List and board views reorganize the same `Task.Class` instances.
- Filters combine project, priority, assignee, tags, title, and id.
- The workload panel derives hours from every incomplete assigned task.
- The detail drawer edits the selected task directly.
- Task actions append to the workspace activity stream.

No view synchronizes a duplicate copy. Moving a board card changes its task's
`status` ref; list groups, progress, workload, and activity derive the result.

## Domain ownership stays visible

`Workspace` owns collection membership and application selection. Each
`Task` owns its mutable fields and retains its workspace owner for related
lookups and activity:

```ts
class $Task {
  constructor(
    readonly workspace: Task.Owner,
    seed: TaskSeed,
    dueDate: string,
  ) {}

  get status() {
    return ref<TaskStatus>('backlog');
  }

  get assignee() {
    return this.workspace.memberById(this.assigneeId.value);
  }

  setStatus(status: TaskStatus) {
    this.status.value = status;
    this.workspace.recordActivity(/* ... */);
  }
}
```

The relationship is explicit. ivue supplies reactivity and stable class
namespaces; it does not hide ownership behind a store registry or injection
container.

## Each template has one logic owner

The domain graph does not push view behavior back into `<script setup>`.
Each behavioral surface has its own small ivue class: `TaskList.Class` owns
list actions, `TaskBoard.Class` owns drag state, and `TaskDetails.Class` owns
form state and DOM-event normalization. Their SFCs only wire the class to the
template:

```ts
const props = defineProps<{ task: Task.Model }>();
const details = new TaskDetails.Class(props);
const { comment } = details;
```

Adding behavior means updating or extending that class, not growing a second
layer of free functions beside it. Domain ownership and view ownership remain
separate, but neither is ambiguous.

## Costs follow the state shape

Scalar task fields use `ref` getters. Collection membership uses
`shallowRef` because additions and removals replace the array, while each task
already owns its reactive fields. Aggregates remain plain getters:

```ts
get filteredTasks() {
  return this.projectTasks.filter((task) => {
    if (this.priorityFilter.value !== 'all' &&
        task.priority.value !== this.priorityFilter.value) return false;

    return task.title.value.toLowerCase().includes(this.search.value);
  });
}
```

There is no computed allocated for every possible dashboard number. A getter
derives when a rendered surface reads it, and Vue tracks the leaf refs reached
by that execution.

## The namespace seam is already installed

Every domain constructor uses the same upgrade-ready shape:

```ts
export namespace Task {
  export const $Class = $Task;
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;
}
```

The workspace constructs `new Task.Class(...)`, never the hidden declaration.
Tests or a future boot-time kernel can select an extension without rewriting
consumers.

## Related guide pages

- [Modules & Imports](/guide/modules) — circular imports dissolved by late reads through the namespace.
- [Namespace Pattern](/guide/namespace-pattern) — `$Class`, `Class`, and the types derived from them.
- [Components & Templates](/guide/components) — one template, one logic owner; the state destructure.
- [Reactive State](/guide/state) — ref-getters, plain getters, the `$`-prefixed cache.

## The source

::: code-group
<<< ../../examples/playground/src/examples/workspace-platform/Workspace.ts [Workspace.ts]
<<< ../../examples/playground/src/examples/workspace-platform/Task.ts [Task.ts]
<<< ../../examples/playground/src/examples/workspace-platform/Member.ts [Member.ts]
<<< ../../examples/playground/src/examples/workspace-platform/Project.ts [Project.ts]
<<< ../../examples/playground/src/examples/workspace-platform/WorkspacePlatformExample.ts [App model]
<<< ../../examples/playground/src/examples/workspace-platform/WorkspacePlatformExample.vue [App template]
<<< ../../examples/playground/src/examples/workspace-platform/TaskList.ts [List model]
<<< ../../examples/playground/src/examples/workspace-platform/TaskList.vue [List template]
<<< ../../examples/playground/src/examples/workspace-platform/TaskBoard.ts [Board model]
<<< ../../examples/playground/src/examples/workspace-platform/TaskBoard.vue [Board template]
<<< ../../examples/playground/src/examples/workspace-platform/TaskDetails.ts [Detail model]
<<< ../../examples/playground/src/examples/workspace-platform/TaskDetails.vue [Detail template]
<<< @/.vitepress/theme/components/examples/ExampleWorkspacePlatform.vue [docs template]
:::
