---
title: 'The stack got faster. We changed nothing.'
description: 'Vue 3.6 rewrites reactivity on alien signals; Vapor mode removes the virtual DOM. ivue changes nothing and gets faster on both sides — measured on the RC, and already running 94,000 lines in production.'
tags: [performance, engine]
relatedPosts: [measured-not-promised, one-kilobyte-feature, twenty-million-cells, computed-is-a-cache, reactivity-is-an-allocator]
date: 2026-08
---

# The stack got faster. We changed nothing.

![The stack got faster. We changed nothing.](/blog/the-stack-got-faster.png)

<BlogPostDate />

Vue 3.6 is in release candidate. Under its hood is the largest change
the reactivity system has had since Vue 3 shipped: the tracking engine
is rewritten on [alien signals](https://github.com/stackblitz/alien-signals),
the fastest signal implementation in the ecosystem's benchmarks. On the
other side of the stack, Vapor mode compiles templates that update the
DOM directly, with no virtual DOM between the data and the pixels.

Here is what ivue had to change to be ready for both:

Nothing.

## The position, not the effort

That is not a boast about porting speed. It is a consequence of where
ivue deliberately sits. The engine owns **no reactivity of its own** —
no tracking, no scheduler, no signal graph. A class's state getters
return Vue's own `ref()`; derivations track through Vue's own effect
machinery; `watch` is Vue's `watch`. ivue is a *shape* over the
substrate: one prototype transform that decides where state lives and
when it materializes, and then gets out of the way.

Hold that position and substrate upgrades arrive as pure profit. When
Vue swaps its tracking engine, every ivue class in existence is
running on alien signals the moment the dependency updates — same
code, same standard, same 1.1&nbsp;kB.

> The thinner the layer, the more of the platform's progress it
> inherits for free.

## Measured on the release candidate

The full ivue test suite — 196 tests, 100% coverage — passes on
`vue@3.6.0-rc.5` without touching a line. Same machine, same script,
production build, median of three runs (Node 26):

| operation | Vue 3.5.41 | Vue 3.6.0-rc.5 | change |
| --- | --- | --- | --- |
| create 100,000 instances | 3.9 ms | 3.9 ms | unchanged — creation never depended on tracking |
| first tracked read across all 100,000 | 20.6 ms | 13.2 ms | **~1.6× faster** |
| 2,000,000 hot derived reads | 47.4 ms | 43.7 ms | ~8% faster |
| 100,000 writes through an effect | 8.6 ms | 8.4 ms | within noise |

The row that moves most is the one that matters most at scale: the
**first tracked read**, where lazy cells materialize and dependencies
register. That is exactly the path ivue leans on — nothing allocates
until first touch, so the cost of a large instance population *is* the
cost of first touches. Alien signals cuts more than a third off that cost; ivue's own creation row doesn't move because it was already
nearly free, by design rather than by engine.

And this is not only a benchmark claim.
[Invar](/examples/invar) — 94,000 lines, 345 classes, a full terminal
IDE — has been running its entire model layer on the 3.6 release
candidate's reactivity in production, daily. Not because every corner
of 3.6 is final, but because the reactivity core is the only part the
backend consumes — and it holds.

## No DOM required

That last point generalizes. Invar's process is a Bun backend with no
DOM in sight: files, git, terminals, an editor's text model — all ivue
classes, all tracked by Vue's signal graph, none of it rendering
anything. Reactivity as a dependency engine for *systems*, not just
views.

Which means the alien-signals upgrade is not a frontend story. Every
backend running the standard inherits the same faster graph — the
same week it lands, for the same effort: none.

## Vapor, on the other side

Vapor mode attacks the other half of the stack: templates compile to
direct DOM updates, no virtual DOM, no diffing. And the model layer's
contract with the view is exactly the contract Vapor consumes — refs
and getters, [destructured once in setup](/guide/standard), read by
the template. Nothing in the standard touches the renderer, so the
same class that drives a virtual-DOM component drives a Vapor one.

The stack is improving from both ends — signals below, rendering
above — and the model layer between them stays one kilobyte, because
it never claimed either end's job.

## The bet, restated

Three years ago the bet was that a class layer should *ride* the
platform's reactivity rather than own one. Every engine the substrate
swaps in, every renderer the compiler removes, tests that bet again.
So far the score is: zero migrations, zero shims, and speed that
shows up in the benchmarks before we've done anything to deserve it.

The bench script is
[in the repository](https://github.com/infinite-system/ivue/blob/main/bench/substrate-swap.mjs) — rerun
it on your machine when the RC goes stable. That's the standing
invitation of this blog: measured, not promised.
