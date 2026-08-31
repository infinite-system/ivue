---
layout: home
title: 'ivue — Plain classes. Full reactivity. One kilobyte.'
titleTemplate: false
description: 'ivue turns native TypeScript classes into fine-grained Vue 3 reactivity. No proxy per instance, no decorators, no component coupling, nothing paid until first access.'

features:
  - title: Native class API
    details: extends, super, getters, setters, private fields. Real inheritance, encapsulation and polymorphism, all reactive.
  - title: Zero-cost creation
    details: Instances are plain objects. A million of them take 22 ms — 6 to 132× faster than the alternatives. &nbsp;<a class="feature-inline-link" href="/guide/performance">Performance by Design&nbsp;→</a>
  - title: One kilobyte
    details: 1.1kb gzipped. Zero dependencies. 100% test coverage. Stripped to the load-bearing core — an API you can hold in your head.
  - title: Store or ViewModel
    details: The same class serves as a global store, a component ViewModel, or a domain model. One mental model everywhere.
  - title: Composition API, fully compatible
    details: Composables plug in through $-getters. The entire Vue ecosystem works inside your classes.
  - title: TypeScript first
    details: Writable ref-getters, fully typed instances, precise inference. The type system shaped the engine's design.
---

<div class="ix">

<section class="ix-statband">

<div class="ix-stats">
  <div class="ix-stat"><div class="n">1.1kb</div><div class="l">the whole engine, gzipped</div></div>
  <div class="ix-stat"><div class="n">0</div><div class="l">dependencies</div></div>
  <div class="ix-stat"><div class="n">100%</div><div class="l">test coverage, every metric</div></div>
  <div class="ix-stat"><div class="n">22 ms</div><div class="l">to create 1 million instances</div></div>
</div>

</section>

<section class="ix-quote">

> Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.

<cite>Antoine de Saint-Exupéry</cite>

</section>

<section>

## Hard problems, solved together

<p class="lead">Each of these sank earlier class-reactivity attempts. Solving one or two is easy. ivue ships all of them as one coherent design.</p>

<div class="ix-moat">
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Bound methods</strong>
      <p><code>this.method</code> is always correct, always the same reference. The wrapper-arrow era ends.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Reactive inheritance</strong>
      <p>Deep <code>super.x.value</code> chains resolve level-safe. Reactivity flows through every layer.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Development parity</strong>
      <p>The same class identity, direct method binding, and engine branches run in development and production.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Circular import immunity</strong>
      <p>The namespace pattern resolves mutual references in any load order.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Writable getter types</strong>
      <p>Ref-returning getters type as writable. Instances are fully inferred.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Total memory control</strong>
      <p>Cells exist only when observed; <code>$stopEffects</code> releases or suspends them. Pure data pays nothing.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Minimal memory footprint</strong>
      <p>Derivations are shared prototype getters, not per-instance allocations.</p>
    </div>
  </div>
  <div class="cell">
    <span class="ck" aria-hidden="true"></span>
    <div class="tx">
      <strong>Hot paths</strong>
      <p>Reads hoist to native ref speed with one line where it matters.</p>
    </div>
  </div>
</div>

</section>

<section>

## One idea, carried through

<div class="ix-idea">

<div>

<p class="lead ix-idea__p">
<code>Reactive()</code> transforms a class once — the prototype, not the
instances. Ref-getters become state, created on first touch. Plain getters
re-derive on every read, reactive with zero allocation. Methods bind once,
to the right <code>this</code>. Instances stay ordinary objects: a plain
<code>new</code>, no proxy, nothing paid until first access.
</p>

<p class="lead ix-idea__p">
Everything else falls out of that one move — inheritance, development parity,
deterministic teardown, speed. Not features bolted on; consequences of
where things live.
</p>

<p class="lead ix-idea__link">
<a href="/guide/principles">Read the Fundamental Principles →</a>
</p>

</div>

<div class="ix-code-window">
  <div class="ix-code-window__chrome">
    <span class="ix-code-window__lights" aria-hidden="true">
      <span></span><span></span><span></span>
    </span>
    <strong>Cart.ts</strong>
  </div>

```ts:no-line-numbers
import { Reactive } from 'ivue'
import { ref } from 'vue'

class $Cart {
  get items() {
    return ref<{ price: number }[]>([])
  }
  get total() {
    return this.items.value.reduce((sum, item) => sum + item.price, 0)
  }
  add(price: number) {
    this.items.value.push({ price })
  }
}

export namespace Cart {
  export const $Class = $Cart // raw — children `extends` this
  export let Class = Reactive($Class) // reactive — you `new` this
  export type Instance = typeof Class.Instance // expose & reactive() interop
}

const cart = new Cart.Class()
```

</div>

</div>

</section>

<section>

<div class="ix-standard-hero">

<p class="ix-standard-hero__eyebrow">The Standard</p>

## One Standard — for humans and AI

<div class="ix-idea ix-standard">

<div>

<p class="lead ix-idea__p">
Every class on this site is written one way. The
<strong>Standard Operating Manual</strong> defines that way — the full class
template, the SFC wiring, every DO and NEVER — one canonical document that
reads as a guide and executes as an instruction set.
</p>

<p class="lead ix-idea__p">
Read it once, and you can review any ivue code on sight. Install it once,
and your AI agent writes canonical ivue from the first prompt.
</p>

<p class="ix-standard-hero__actions">
<a class="ix-standard-hero__cta" href="/guide/standard">Read the Standard →</a>
</p>

</div>

<div class="ix-code-window">
  <div class="ix-code-window__chrome">
    <span class="ix-code-window__lights" aria-hidden="true">
      <span></span><span></span><span></span>
    </span>
    <strong>Terminal</strong>
  </div>

```sh:no-line-numbers
# install ivue
npm i ivue

# teach your Claude Code
npx ivue skill

# + Cursor, Codex, Gemini…
npx ivue skill --all
```

</div>

</div>

</div>

</section>

<section>

## Start here

<div class="ix-start">
  <a href="/guide/introduction">
    <div class="t">What is ivue?</div>
    <div class="d">The idea in five minutes: plain classes, full reactivity, nothing else.</div>
    <span class="go">Read →</span>
  </a>
  <a href="/engine">
    <div class="t">The Engine</div>
    <div class="d">How one prototype transformation turns getters into lazy refs — the whole runtime, explained.</div>
    <span class="go">Look inside →</span>
  </a>
  <a href="/guide/getting-started">
    <div class="t">Getting Started</div>
    <div class="d">Install, write your first reactive class, use it in a component.</div>
    <span class="go">Build →</span>
  </a>
  <a href="/examples/">
    <div class="t">Examples</div>
    <div class="d">From a counter to a 20-million-cell grid — every example live, with its real source.</div>
    <span class="go">Explore →</span>
  </a>
  <a href="/examples/stackblitz">
    <div class="t">StackBlitz Playground</div>
    <div class="d">The whole example collection booted in your browser — edit anything, watch it react.</div>
    <span class="go">Open ⚡</span>
  </a>
  <a href="/guide/benchmarks">
    <div class="t">Interactive Benchmarks</div>
    <div class="d">Creation, dispatch, formula grids and a million-cell sheet — measured live, in your browser.</div>
    <span class="go">Run →</span>
  </a>
</div>

</section>

<section class="ix-end">

## Performance numbers

<p class="lead">Measured, not promised.</p>

<p class="lead">
<a href="/guide/model-layer">ivue vs the World →</a> — ivue against the alternatives, head to head.<br />
<a href="/guide/performance">Performance by Design →</a> — method and full tables.<br />
<a href="/guide/benchmarks">Interactive Benchmarks →</a> — five live benchmarks, running in your browser.
</p>

<p class="benchmark-legend">Best measured result among fully reactive implementations. Non-reactive controls mark the floor. <BenchmarkWinner placement="after" /></p>

<PerfSlider>

<div>

### Creating 1,000,000 instances

| | time | ivue is |
| --- | --- | --- |
| **ivue `new Class()`** | <strong>21.7 ms <BenchmarkWinner placement="after" /></strong> | <span class="ix-base">the baseline</span> |
| composable factory | 139 ms | **6.4× faster** |
| native `reactive()` | 470 ms | **22× faster** |
| eager class engine (unreleased v1) | 2,861 ms | **132× faster** |

<p class="foot">Refs and computeds do not exist until first access. Median of runs with every instance retained.</p>

</div>

<div>

### Memory heap at 100,000 instances

| | per live instance | 100k total |
| --- | --- | --- |
| **ivue class, 30 getters** | <strong>3.7 KB <BenchmarkWinner placement="after" /></strong> | <span class="ix-base">364 MB <BenchmarkWinner placement="after" /></span> |
| composable, 30 closures | 8.0 KB | 781 MB |
| `reactive()`, fields + getters | 10.4 KB | 1.02 GB |
| composable, 30 computeds | 19.7 KB | 1.93 GB |

<p class="foot">Every instance observed by its own effect — live, not at-rest. Derivations live on the prototype; they weigh nothing per instance.</p>

</div>

<div>

### Proxy-free reads

| access path | **ivue raw** | shallow proxy | `reactive()` |
| --- | ---: | ---: | ---: |
| plain derived getter | <strong><BenchmarkWinner />23.4 ns</strong> | 68.2 ns | 125.1 ns |
| ref-getter access | <strong><BenchmarkWinner />9.6 ns</strong> | 47.0 ns | 72.4 ns |
| method access | <strong><BenchmarkWinner />3.8 ns</strong> | 42.3 ns | 68.5 ns |

<p class="foot">Node 22, V8, Vue 3.5, 10-million-iteration loops. A direct closure ref remains faster than a dotted read; stable ivue refs and methods hoist once outside a hot loop.</p>

</div>

<div>

### What a live cell costs at rest

| | bytes/cell | what the cell is |
| --- | --- | --- |
| composable (idiomatic Vue) | ~758 | closures + eager ref/computeds |
| ivue instance grid | ~67 | plain object + lazy overlay |
| plain JavaScript object, no reactivity | ~40 | `{ row, col, raw }` |
| **ivue flyweight columnar** | <strong>4.7 <BenchmarkWinner placement="after" /></strong> | 1 B kind + 8 B Float64, shared |

<p class="foot">Measured end-to-end on live grids up to 20,000,000 cells — fully reactive at 8.5× below the plain-object floor. The receipts run in your browser: <a href="/guide/benchmarks">Interactive Benchmarks →</a></p>

</div>

</PerfSlider>

<p class="invar-note">
Invar is an <strong>alpha, experimental project</strong> — a proving ground for ivue
beyond the web, and an experiment in <strong>agentic development</strong>: the entire
editor was built by AI agents using the ivue skill as their base discipline, with
every module governed by explicit invariants contracts. The
source is open as a
study-scale example of ivue architecture — module seams, namespace exports,
flyweight state, and lifecycle discipline, all in one real codebase.
</p>

</section>

<section class="ix-section invar-production">

## Beyond the web, at scale

<p class="lead invar-lead">
<a href="/examples/invar">Invar</a> — a full terminal IDE
built entirely on ivue: <strong>340+ ivue classes</strong> — nearly 200
<code>Static()</code> capability classes and about 80 <code>Reactive()</code>
models — driving the editor, workspace search,
tasks, terminals, and agents — in a Bun process with no DOM. Every frame below is
real output from the running app, rendered cell-for-cell from its PTY grid.
</p>

<PerfSlider>

<figure class="invar-figure">
  <img src="/invar-editor.svg" alt="Invar editor with file tree and structure outline" loading="lazy" />
  <figcaption>The editor — file tree, syntax-highlighted source, structure outline.</figcaption>
</figure>

<figure class="invar-figure">
  <img src="/invar-search.svg" alt="Invar workspace search with streaming results, tasks pane, and terminal" loading="lazy" />
  <figcaption>Workspace search streaming ripgrep results — click a match, land on the line.</figcaption>
</figure>

<figure class="invar-figure">
  <img src="/invar-find.svg" alt="Invar in-file find bar with live matches" loading="lazy" />
  <figcaption>In-file find — live match highlighting, case, whole-word, and regex toggles.</figcaption>
</figure>

<figure class="invar-figure">
  <img src="/invar-quickopen.svg" alt="Invar Quick Open fuzzy file picker" loading="lazy" />
  <figcaption>Quick Open — fuzzy go-to-file with exact-basename ranking.</figcaption>
</figure>

<figure class="invar-figure">
  <img src="/invar-tasks.svg" alt="Invar tasks pane beside a terminal running the task tracker" loading="lazy" />
  <figcaption>The agent fleet's task dashboard — one shared renderer for pane and CLI.</figcaption>
</figure>

</PerfSlider>

</section>

<section class="ix-newsletter-hero">

<div class="ix-spotlight" aria-hidden="true"></div>

## The future of JavaScript, delivered

<p class="lead ix-newsletter-hero__lead">
The <a href="/blog/">ivue blog</a> documents the frontier as it is
built: the architecture behind ivue, the patterns AI agents write with
it, and the measured numbers behind every claim — from
<a href="/blog/the-options-api-everyone-wanted">the class JavaScript
was always waiting for</a> to
<a href="/blog/bulletproof-class-modules">Bulletproof class modules</a>.
</p>

<BlogDripShowcase />

<p class="ix-newsletter-hero__cadence">
The whole blog lands in your inbox in {{ $archiveDays }} days — one post every other day, at your local morning.
</p>

<NewsletterQuickJoin placement="home-hero" align="center" />

<p class="ix-newsletter-hero__note">
The whole archive is open — <a href="/blog/">browse the blog →</a>
</p>

</section>

</div>
