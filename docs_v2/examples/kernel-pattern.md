---
title: 'Example: Plugin Kernel'
description: 'Construction binds to a name, not a class — so a plugin extends any class through a 15-line registry, with super chains and reactive state intact. Anything extends anything.'
aside: false
pageClass: benchmarks-wide examples-page
---

<script setup>
import ExampleKernel from '../.vitepress/theme/components/examples/ExampleKernel.vue'
</script>

# Plugin Kernel

A plugin system is usually a large piece of infrastructure — a dependency
injection container, decorators, tokens, a registry, lifecycle wiring.
Here it is a `Map` with three methods, because the substrate underneath
carries the weight.

The one idea: **construction binds to a name, not a class.** Code that
needs a `Tab` asks the kernel for whatever is registered under `'Tab'` and
constructs that. A plugin re-registers the name with an *extended* class —
and every future construction produces the extension, with `super` chains,
reactive state, and methods all intact, because ivue inheritance is native
inheritance.

Toggle a plugin below, then add a tab. Plugins stack:

<ClientOnly>
  <ExampleKernel />
</ClientOnly>

<a class="feature-inline-link" href="https://stackblitz.com/github/infinite-system/ivue/tree/main/examples/playground?file=src%2Fexamples%2Fkernel-pattern%2Fkernel.ts&initialPath=%2F%23%2Fkernel-pattern" target="_blank" rel="noreferrer">Open in StackBlitz ⚡</a>
— boots the playground on this example's route with the kernel open.

## The whole kernel

Not an excerpt — this is the entire extension system:

<<< ../../examples/playground/src/examples/kernel-pattern/kernel.ts

## The convention: make(), not new

The app never names a concrete class. It resolves the registered name,
wraps it with `Reactive()` (idempotent — already-transformed ancestors are
skipped), and constructs:

```ts
export function makeTab(title: string): TabInstance {
  const TabClass = Reactive(kernel.get('Tab', $Tab));
  return new TabClass(title) as TabInstance;
}
```

Every call site says `makeTab(...)`. Because the binding is deferred to
construction time — the same first-touch principle behind ref-getters and
`$`-getter services — a plugin registered at any point changes what every
later `makeTab` produces, and the load-time module graph stays free of the
cycles a class-referencing registry would create.

## Plugins stack

A plugin is a function that extends whatever class it's handed. Applied in
sequence, they compose — each level chaining through `super`:

<<< ../../examples/playground/src/examples/kernel-pattern/plugins.ts

## What to notice

- **New tabs get the live class; existing tabs keep theirs.** Registering a
  name affects *future* constructions — honest late binding, not spooky
  re-classing. "Re-make all through kernel" reconstructs the existing tabs
  to retrofit the current plugin set.
- **`super.badges` chains through every plugin** — the priority and
  timestamp badges compose because each subclass calls up the chain
  ([Inheritance & super](/guide/inheritance)).
- **The priority plugin overrides `accent`** — a plugin changes behavior
  and derived values, not just adds data.
- **This is the frontend half.** The same kernel routes construction on the
  server too; a full-stack plugin extends a model *and* its field in one
  package. That's the substrate the
  [VS Code post](/blog/vscode-hand-rolled-decade) is about.

## The source

::: code-group
<<< ../../examples/playground/src/examples/kernel-pattern/Tab.ts [Tab.ts]
<<< ../../examples/playground/src/examples/kernel-pattern/KernelExample.ts [KernelExample.ts]
<<< ../../examples/playground/src/examples/kernel-pattern/KernelExample.vue [KernelExample.vue]
:::
