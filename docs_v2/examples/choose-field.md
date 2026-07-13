---
title: 'Example: Advanced Select Field'
description: 'A production-grade QSelect wrapper — server search, pagination, dataset variants, chips, create-new-option — whose reactive core is 54 plain getters and exactly one computed.'
aside: false
pageClass: benchmarks-wide examples-page
---

<script setup>
import ExampleChooseField from '../.vitepress/theme/components/examples/ExampleChooseField.vue'
</script>

# Advanced Select Field

A select field the way production apps actually need it: debounced
server-side search, page-based infinite scroll, switchable dataset
variants, chips with removal, inline creation of missing options, icon and
description rendering, and extensible `before--`/`after--` slots around
every inherited QSelect slot. It is a **Quasar-based extension** — one
ivue class driving one SFC around Quasar's `QSelect` — and the working
proof that ivue slots straight into an existing UI framework rather than
replacing it. Extracted from a production application built on ivue, with
the app's service layer swapped for the playground's
[ServerApi](#the-backend-path).

Eight configurations of the same class, live — from a static plain list to
avatar-chip multi-select with backend search:

<ClientOnly>
  <ExampleChooseField />
</ClientOnly>

<a class="feature-inline-link" href="https://stackblitz.com/github/infinite-system/ivue/tree/main/examples/playground?file=src%2Fexamples%2Ffields%2Fchoose-field%2FChooseField.ts&initialPath=%2F%23%2Fchoose-field" target="_blank" rel="noreferrer">Open in StackBlitz ⚡</a>
— boots the playground on this example's route with the class open.

## The performance story

The class exposes **54 derived values as plain getters and exactly one
`computed()`** — the writable model proxy, which earns its ~300 bytes as
the destructurable `v-model` handle. In the composable or options-API
idiom, each of those 54 derivations is a `computed()` allocated **per
instance**: a form with ten selects carries ~540 computed refs before the
user types a key. Here they cost **zero bytes per instance** — plain
getters on a shared prototype, reactive through leaf tracking, re-derived
only when their inputs change and a consumer is watching. That is beyond
what a hand-written Quasar wrapper gives you, and it falls out of the
[standard](/guide/standard) rather than out of effort.

## What to notice in the playground

- **Search hits the backend.** Typing sends the same
  `filters=name ILIKE '%…%'` expression a PostgreSQL backend consumes —
  the in-browser mock evaluates the identical grammar, so swapping in a
  real server changes nothing.
- **Client-search variant** filters the already-fetched list in a plain
  getter — compare the two side by side.
- **Variants** switch the field between server-filtered datasets
  (people / companies) without remounting.
- **Create** appears when nothing matches; it POSTs and selects the new
  row.
- **The hint breathes.** The hint line is spaced like a native Quasar
  field's — a small thing that most wrappers get wrong.

## The source

::: code-group
<<< ../../examples/playground/src/examples/fields/choose-field/ChooseField.ts [ChooseField.ts]
<<< ../../examples/playground/src/examples/fields/choose-field/ChooseField.vue [ChooseField.vue]
<<< ../../examples/playground/src/examples/fields/choose-field/ChooseFieldProps.ts [ChooseFieldProps.ts]
<<< ../../examples/playground/src/examples/fields/choose-field/ContactField.vue [ContactField.vue]
<<< ../../examples/playground/src/examples/fields/choose-field/ContactFieldProps.ts [ContactFieldProps.ts]
<<< ../../examples/playground/src/examples/fields/choose-field/ChooseFieldExample.vue [demo route]
:::

The props architecture — one typed params object, one plain defaults
object, merged by `propsWithDefaults()` — has its own guide:
[Props with Defaults](/guide/props-defaults).

## The backend path

The field talks to [`ServerApi`](https://github.com/infinite-system/ivue/blob/main/examples/playground/src/examples/fields/server/ServerApi.ts),
a transport-pluggable gateway. The playground installs the in-browser mock
(localStorage rows, the same filter grammar); a real deployment installs
`httpTransport(baseUrl)` against
[`server-node/server.ts`](https://github.com/infinite-system/ivue/blob/main/examples/playground/server-node/server.ts)
— a TypeScript Express reference implementation with the generic filtered
/ sorted / paginated list endpoint this field consumes.
