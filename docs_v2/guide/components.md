---
title: Components & Templates
description: How a Reactive class meets a Vue component — raw instance in setup, iuse() for the template, destructured template refs, defineExpose, and the measured cost of the boundary.
---

# Components & Templates

A Reactive instance is a plain object. Your `<script setup>` code holds it
**raw** — full speed, `.value` semantics, zero proxies. The template is the
one consumer that wants different ergonomics. This page is the canonical
wiring.

## The pattern

```vue
<script setup>
import { iuse } from 'ivue';
import { Player } from './Player';

const playerRaw = new Player.Class(props, model, emit);
playerRaw.init(); // lifecycle runs RAW-side — before any view exists

// Shallow ref-unwrapping view for the template: reads and v-models
// without .value; the instance underneath stays completely raw.
const player = iuse(playerRaw);

// Template-ref targets: getters on the RAW instance return the actual refs.
const { videoEl, scrollerEl } = playerRaw;

defineExpose(player);
</script>

<template>
  <!-- ref-getters: unwrapped reads, v-model writes land in .value -->
  <q-menu v-model="player.menuShown" />
  <!-- plain getters: reactive by leaf tracking — no wrapper involved -->
  <div :style="{ width: player.postWidthPx }">{{ player.title }}</div>
  <!-- methods: engine-bound to the raw instance -->
  <button @click="player.play()">Play</button>
  <video ref="videoEl" />
</template>
```

Three rules, in order:

1. **Setup code uses the raw instance.** Construct raw, call `init()` (and
   any other lifecycle) on `playerRaw` — every call is trap-free, and the
   engine's first access is guaranteed to happen raw-side.
2. **The template reads through `iuse(raw)`.** One shallow proxy, applied at
   the boundary only.
3. **Template refs destructure off the raw instance.** A ref-returning
   getter on raw returns the actual ref — exactly what `ref="..."` binding
   wants.

## Why the template needs a view at all

Vue has **four** ref-unwrapping mechanisms, and it's easy to credit the
wrong one:

| mechanism                                                        | scope                                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `<script setup>` binding unwrap (`proxyRefs` on the setup state) | **top-level bindings only** — `{{ foo }}` where `foo = ref()`          |
| compiler `isRef` assist for `v-model`                            | **bare identifiers only** — `v-model="foo"`, never `v-model="obj.foo"` |
| interpolation display unwrap (`toDisplayString`, Vue 3.5+)       | **`{{ }}` text output only** — no binding position gets it            |
| `reactive()` deep proxy unwrapping                               | any depth — but costs a deep proxy on every read                       |

The third one is the trap: `{{ player.someRef }}` renders the value, which
makes a quick visual check look like nested unwrapping works everywhere. It
doesn't — verified against 3.5.14, 3.5.39 (latest stable), and the
3.6.0-beta.17 via SSR renders: every actual binding position below receives
the naked Ref on all three versions.

A nested path like `player.menuShown` gets help from none of the cheap mechanisms:
the compiler emits a plain property read and a plain assignment. On a raw
instance, that read leaks the **Ref object** — and reads fail _silently_:

- `v-if="player.searchOpen"` — a Ref object is always truthy: branch
  permanently on
- `:target="player.menuElement"` — the component receives a Ref where it
  expects a string
- `player.scroller?.scrollElement` — property read **on the Ref itself** →
  `undefined`
- `player.items[i] = x` — indexes into the Ref object, not the array

Writes throw (`v-model` assignment to a getter-only accessor). `iuse()`
closes every one of these by construction: unwrap on read, redirect writes
into `.value`.

**Plain derived getters never needed any of this.** They return plain
values, and their reactivity is leaf tracking — the render effect executes
the getter and subscribes to the refs/props/stores it reads. That works
identically raw. In a real 89-binding production template, 80 bindings were
plain getters and methods; the view exists for the other 9.

## What `iuse()` is

A **shallow** ref-unwrapping proxy — the same treatment Vue gives a
`setup()` return, applied to the instance:

- ref-returning getters → unwrapped on read; assignment redirects to `.value`
- plain getters and methods → pass straight through, `this` = the raw instance
- answers `__v_raw`, so `toRaw()` (and the engine) see through it — no
  ordering hazards, no cache poisoning possible through the view

It is **not** `reactive()`: no deep conversion, returned objects are never
wrapped, and nothing about the instance changes — `isReactive(raw)` stays
`false`.

## The measured cost

Per property read (2M-op benchmark, Vue 3.5):

| access path          | raw     | through `iuse` | through `reactive()` |
| -------------------- | ------- | -------------- | -------------------- |
| plain derived getter | 13.7 ns | **24.3 ns**    | 75.4 ns              |
| ref-getter           | 4.1 ns  | **22.6 ns**    | 59.5 ns              |
| method               | 4.0 ns  | **22.1 ns**    | 60.3 ns              |

The `iuse` tax is ~10–18 ns per **template read** — roughly 3× cheaper than
`reactive()` — and template reads only happen during a render. A
150-binding template pays ~2 µs per render; a render that doesn't happen
(equality-stable computeds, unchanged props) pays nothing. In production
builds the render function is inlined into setup, so `iuse`'s trap is the
**only** proxy on the read path. (In dev, Vue's own setup-state proxy adds a
hop — for every component in the app, ivue or not.)

Class internals never pay: methods, watchers, and hot loops run on `this` =
raw at the left column's speed.

## When you can skip `iuse()`

If a template binds **only refs, computeds, and methods** — no plain
getters, no nested ref paths — destructure everything and let setup-binding
unwrapping do the work:

```vue
<script setup>
const scrollerRaw = new Scroller.Class(props, emit);
const { scrollElement, visibleItems, onScroll } = scrollerRaw;
defineExpose(scrollerRaw);
</script>
```

Destructured refs become top-level bindings (~2–3 ns reads — cheaper than
any proxy). Plain getters are the reason `iuse()` exists: destructuring one
snapshots a dead value.

The decision rule: **template binds plain getters or nested ref paths →
`iuse(raw)`; refs/computeds/methods only → destructure raw.** When in doubt,
`iuse` — it makes the ref/plain distinction unable to bite as the template
evolves, instead of merely currently-audited.

## defineExpose

Expose the `iuse` view (or the raw instance — Vue's expose proxy performs
its own top-level unwrapping either way). Parents then read unwrapped values
and call engine-bound methods:

```ts
const player = usePlayerRef.value; // from :ref
player.play(); // bound to the raw instance
player.createDrawerIsOpen; // unwrapped boolean
```

Cross-class access — one class holding another's exposed instance in a ref
(`this.scroller.value.startAutoPlay(...)`) — resolves through the same
chain; the engine's raw resolution sees through every layer.
