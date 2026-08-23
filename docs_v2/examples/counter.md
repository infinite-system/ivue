---
title: 'Example: Counter'
description: 'Your first ivue class — one ref, a plain-getter derivation, two methods — running live, with the exact playground source on the page.'
relatedPosts: [introducing-ivue, the-whole-story-in-small-words]
---

<script setup>
import DemoCounter from '../.vitepress/theme/components/DemoCounter.vue'
</script>

# Counter

The smallest complete ivue class: one piece of mutable state, one derived
value, two actions. `count` is a ref-getter, `double` is a plain getter — no
`computed()` — and the methods write through `.value`.

<ClientOnly>
  <DemoCounter />
</ClientOnly>

## What to notice

- **`double` allocates nothing.** It is a plain getter, re-derived on
  render — zero bytes per instance, fully reactive through leaf tracking.
- **Methods are engine-bound.** `counter.increment` is safe to pass as a
  handler directly; its identity is stable.

## The source

The demo above runs these exact files from the playground:

::: code-group
<<< ../../examples/playground/src/examples/counter/Counter.ts [Counter.ts]
<<< ../../examples/playground/src/examples/counter/CounterExample.vue [CounterExample.vue]
:::

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Fcounter%2FCounter.ts&path=%2F%23%2Fcounter">Open in StackBlitz ⚡</a>
— the playground boots with this example's route and file active.
