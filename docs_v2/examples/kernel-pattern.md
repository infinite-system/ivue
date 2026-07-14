---
title: 'Example: Plugin Kernel'
description: 'Construction binds to a name, not a class. A plugin extends any class through a ~40-line registry; boot seals the graph — super chains, reactive getters and inheritance all follow, with zero lookup at the call site.'
aside: false
pageClass: benchmarks-wide examples-page
---

<script setup>
import ExampleKernel from '../.vitepress/theme/components/examples/ExampleKernel.vue'
</script>

# Plugin Kernel

A plugin system is usually a large piece of infrastructure — a dependency
injection container, decorators, tokens, hierarchical injectors, lifecycle
wiring. Here it is one object with four methods, because the substrate
underneath carries the weight.

The one idea: **construction binds to a name, not a class.** A class opts in;
plugins re-register the name with an extended class; at boot the kernel
*seals* the graph — composing every plugin and re-parenting every
`extends`-chain — so `new Tab.Class()` always produces the fully-extended
class, `super` and reactive state intact, and **zero lookup at the call
site** (it reads a live binding the kernel rewrote).

Toggle a plugin — each toggle is a mini-reboot (reset → register → seal →
rebuild), the exact production flow. Watch `PinnedTab` inherit `Tab`'s
plugins even though it was declared before them:

<ClientOnly>
  <ExampleKernel />
</ClientOnly>

<a class="feature-inline-link" href="https://stackblitz.com/github/infinite-system/ivue/tree/main/examples/playground?file=src%2Fexamples%2Fkernel-pattern%2Fkernel.ts&initialPath=%2F%23%2Fkernel-pattern" target="_blank" rel="noreferrer">Open in StackBlitz ⚡</a>

## The whole kernel

Not an excerpt — the entire registry:

<<< ../../examples/playground/src/examples/kernel-pattern/kernel.ts

## Opting a class in — two deltas

An extensible class is an ordinary ivue class with exactly two changes:
`Class` becomes `let` (the live binding the kernel rewrites), and one
`kernel.defineClass` line. **Nothing at any call site changes** —
`new Tab.Class(...)` and `extends Tab.$Class` are identical to a plain
class; `Tab.Class` is now a namespace property read at construction, so it
follows whatever the plugins registered:

<<< ../../examples/playground/src/examples/kernel-pattern/Tab.ts

## Plugins stack; children follow

A plugin extends whatever class it's handed — composed at seal, chaining
through `super`:

<<< ../../examples/playground/src/examples/kernel-pattern/plugins.ts

`PinnedTab extends Tab.$Class`. Because JavaScript freezes a subclass's
parent at declaration, a plugin registered later wouldn't reach it — so at
`sealClassGraph()` the kernel discovers the `extends` edge from the real
prototype hierarchy and **re-parents** `PinnedTab` onto the composed `Tab`
(`Object.setPrototypeOf`, once, at boot — `super` follows dynamically). The
freeze becomes irrelevant; inheritance follows the plugins regardless of
load order.

## What to notice

- **`new Tab.Class()` never looks anything up.** It reads the live binding;
  after boot it's monomorphic, as fast as a hardcoded class.
- **The priority plugin overrides `accent`** — a plugin changes behavior and
  derived values, and a *pinned* tab inherits that override through the
  re-parented chain.
- **`kernel.getClassGraph()`** (the panel above) is the dependency graph,
  discovered from the hierarchy — metadata for devtools, never consulted at
  runtime.
- **Toggling reseals.** In production you register once, `seal()` once, and
  reboot on a plugin change — the same coarse model as reloading an editor
  window after enabling an extension.

## The source

::: code-group
<<< ../../examples/playground/src/examples/kernel-pattern/PinnedTab.ts [PinnedTab.ts]
<<< ../../examples/playground/src/examples/kernel-pattern/KernelExample.ts [KernelExample.ts]
<<< ../../examples/playground/src/examples/kernel-pattern/KernelExample.vue [KernelExample.vue]
:::

This is the frontend half of a full-stack substrate: the same kernel routes
construction on the server, so one plugin extends a model *and* its field in
one package — the argument the
[VS Code post](/blog/vscode-hand-rolled-decade) makes at length.
