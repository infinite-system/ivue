---
title: 'Example: Plain getter vs computed()'
description: 'The same derivation both ways — a plain getter that re-derives per render and a memoized computed() — with live run counters proving whose body runs when.'
relatedPosts: [computed-is-a-cache, the-object-should-tell-the-truth]
---

<script setup>
import DemoDerived from '../.vitepress/theme/components/DemoDerived.vue'
</script>

# Plain getter vs computed()

One class, one dependency (`celsius`), two derivations: `fahrenheit` is a
plain getter, `status` is a `computed()`. The run counters under each value
show exactly when each body executes.

<ClientOnly>
  <DemoDerived />
</ClientOnly>

## What to notice

- **Drag the slider**: `celsius` is a dependency of both, so both bodies
  run — memoization never skips a real dependency change.
- **Click re-render**: the plain getter re-derives (that is its deal — zero
  bytes, re-run per render) while the computed body stays frozen. That skip
  is what its ~300 bytes per instance buy.
- The run counters are **plain fields** — incrementing them inside getter
  bodies is side-effect-free for the reactive graph.

## The source

::: code-group
<<< ../../examples/playground/src/examples/derived/Thermo.ts [Thermo.ts]
<<< ../../examples/playground/src/examples/derived/DerivedExample.vue [DerivedExample.vue]
:::

<a class="feature-inline-link" href="/examples/stackblitz?file=src%2Fexamples%2Fderived%2FThermo.ts&path=%2F%23%2Fderived">Open in StackBlitz ⚡</a>
— the playground boots with this example's route and file active.
