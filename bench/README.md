# Benchmarks

Headless, reproducible micro-benchmarks comparing the two ivue engines against
native Vue 3 patterns. They back the numbers quoted in the
[Performance docs](../docs_v2/guide/performance.md).

## Run

```sh
npm run bench          # runs every *.bench.ts once and prints comparisons
```

Under the hood this is `vitest bench --run` (tinybench). Bench files are **not**
picked up by `npm test` / `npm run coverage`.

## What each file measures

| File | Workload |
|---|---|
| `creation.bench.ts` | create 1000 instances, no access (pure allocation) |
| `first-read.bench.ts` | construct + read one computed (`area.value`) |
| `hot-calls.bench.ts` | 10k reads of reactive state — direct vs getter-indirected vs hoisted |
| `inheritance.bench.ts` | deep 4-level hierarchy: create, `super` chain, ancestor-ref computed |

All engines use the same "Box" shape (`models.ts`): two reactive values, a derived
`area`, an `update()` method.

## How to read it

- **Creation:** ivue v2 wins big — instances are plain, refs/computeds are lazy.
- **First read / hot reads:** a native composable edges v2, because v2 routes each
  `this.x.value` through a getter (`toRaw` + cache lookup) while a composable reads
  a closure ref directly. `hot-calls.bench.ts` includes a *hoisted* variant
  (`const w = this.w`) showing how to recover native-speed reads in hot loops.

Numbers are machine- and load-dependent; treat them as ratios, not absolutes.
