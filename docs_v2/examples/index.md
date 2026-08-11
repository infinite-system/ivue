---
title: Examples
description: 'Every ivue example lives in one deployable playground app — each docs page imports the same files the app runs, and one StackBlitz link boots them all.'
---

# Examples

Every example on this site is a real, running component — and they all live
in **one app**: the
[playground on GitHub](https://github.com/infinite-system/ivue/tree/main/examples/playground).
Each docs page below embeds its example live and shows the exact playground
files as code; StackBlitz boots the whole collection from GitHub, so every
push redeploys everything.

<a class="feature-inline-link" href="/examples/stackblitz">Open the whole playground in StackBlitz ⚡</a>

Or use the [embedded StackBlitz Playground](/examples/stackblitz) without
leaving the docs.

## Run the playground locally

The same app is in the repository, with every example in one navigable
workspace:

```bash
git clone https://github.com/infinite-system/ivue.git
cd ivue
npm install
npm run dev:playground
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`),
then use the app's sidebar to switch between examples. Edit the classes or
templates and Vite will update the running playground.

## Start small

<div class="ix-example-list">

- **[Counter](/examples/counter)** — your first class: one ref, a
  plain-getter derivation, two methods.
- **[Plain getter vs computed()](/examples/derived)** — the same derivation
  both ways, with live run counters proving whose body runs when.
- **[$watch & $stopEffects](/examples/lifecycle)** — an instance-scoped
  watcher started, stopped and disposed by hand.
- **[Inheritance chain](/examples/inheritance)** — three files, three
  levels, one instance; `total` refines through `super.total` with zero
  computeds.
- **[Composable in a class](/examples/pointer)** — `useMouse` hosted
  privately; consumers see two refs and nothing else.

</div>

## Full-complexity

<div class="ix-example-list">

- **[Pinia Store Alternative](/examples/class-store)** — a class-based alternative to
  Pinia stores; optional reactive() view, fully typed.
- **[Workspace Platform](/examples/workspace-platform)** — a ClickUp-scale
  application graph with list and board views, filters, workload, task editing,
  comments, and activity over the same ivue domain objects.
- **[Extensible Kernel](/examples/extensible-kernel)** — construction binds to a
  namespaced class key, so plugins extend notifications and their children.
- **[Advanced Select Field](/examples/choose-field)** — a Quasar-based
  extension: server search, pagination, variants, chips, create-new — one
  class, 54 plain getters, one computed.
- **[Advanced Media Uploader](/examples/media-field)** — a Quasar-based
  extension: uploads, preexisting-media hydration, lightbox — plus a
  class-extended square-tile variant.
- **[Virtual scroller on Lenis](/examples/virtual-scroller)** — 1,000,000
  rows, a handful of divs; scrolling itself is virtual.
- **[The formula grid](/examples/formula-grid)** — real Excel-syntax
  formulas over a virtualized million-cell sheet, dependency graph
  discovered by Vue.
- **[The flyweight grid](/examples/flyweight-grid)** — 20,000,000 cells,
  fully reactive at 4.7 bytes per cell.
- **[Benchmarks](/guide/benchmarks)** — creation, method dispatch, the
  formula grid and the cell-grid comparison, run live in your browser.

</div>
