# Node Namespace Experiment Results

Measured on Node 26.3.1 / V8 14.6 on the repository's Linux VM. The benchmark
runs 20,000,000 calls per sample, rotates the three call forms for 45 rounds,
and reports the median. Every method mutates class-owned state so the work
remains observable.

| Call form | Median | Cost per call |
|---|---:|---:|
| Native dotted static method | 33.475 ms | 1.674 ns |
| `Static()` dotted method | 33.523 ms | 1.676 ns |
| `Static()` detached method | 33.337 ms | 1.667 ns |

The one-time path uses 50,000 distinct one-method classes to rise above timer
resolution:

| One-time operation | Cost per class |
|---|---:|
| Create the selected `Static()` subclass and install lazy accessors | 1.276 µs |
| First method read, bind, materialize, and invoke | 0.465 µs |

The transform source is 39 readable lines. Bundled and minified with esbuild
0.16.17, it is 880 bytes raw and 445 bytes with filename-free `gzip -9 -n`.

Run the benchmark from the repository root:

```sh
npm run bench:node-namespace
```

The benchmark measures this implementation directly:

- [`Static.ts`](./Static.ts)
- [`benchmark.ts`](./benchmark.ts)
- [`Static.vitest.spec.ts`](./Static.vitest.spec.ts)

These are measured results, not a cross-engine performance promise. The
structural guarantee is smaller: every used method performs one bind and one
property materialization, then remains an ordinary bound function.
