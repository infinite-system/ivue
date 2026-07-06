---
title: Components & Templates
description: The settled standard — raw instance in setup, Refs/Computeds are .value everywhere, destructure only template-ref targets, and type every unwrapping surface (defineExpose, reactive) through Instance.
---

# Components & Templates

A Reactive instance is a plain object. One rule governs every surface you
control:

> **Members live on the instance. Refs/Computeds are `.value` —
> class, setup, and template alike. Destructure only what Vue itself
> requires: template-ref targets.**

```vue
<script setup>
import { Player } from './Player'

const player = new Player.Class(props, model, emit)

// Template-ref targets are the ONE destructure Vue requires:
const { videoEl, scrollerEl } = player

defineExpose(player as Player.Instance)
</script>

<template>
  <!-- Refs/Computeds: .value, reads and writes — compiler-checked -->
  <q-menu v-model="player.menuShown.value" :target="player.menuElement.value" />
  <!-- plain derived getters and methods: plain access -->
  <div :style="{ width: player.postWidthPx }">{{ player.title }}</div>
  <button @click="player.play()">Play</button>
  <video ref="videoEl" />
</template>
```

## Why no wrapper

Every unwrapping wrapper hides `.value`, and every hiding creates a seam.
All the candidates were tried on a 2,100-line production component:

| regime | how it failed |
| --- | --- |
| `reactive(instance)` in setup | deep-proxy tax (~75ns/read) and deep-wrapping of returned objects |
| a shallow unwrap view (`proxyRefs`-style) | TS marks get-only accessors `readonly`; the homomorphic unwrap types preserve it — template writes error, curable only with stacked type machinery |
| destructure everything | plain derived getters own no Ref/Computed — destructuring snapshots a dead value; the template splits into two namespaces with a hand-maintained list |
| **raw + `.value`** | **nothing** — every miss is a compile error; zero runtime cost; zero upkeep |

`.value` is not noise; it is the local, machine-checked marker that a member
is live state. Vue's own unwrapping conveniences (setup-binding unwrap,
the compiler's `v-model` assist for bare identifiers, interpolation display
unwrap) each cover one position only and mask the seams between them — a
`{{ player.someRef }}`{v-pre} that *renders* correctly sits right next to a
`v-if` that would silently always pass. Refusing to hide `.value` dissolves
the entire class of problems.

## defineExpose and the expose surface

Vue delivers an exposed instance to parents through its **expose proxy**,
which is `proxyRefs`-based. Verified behavior:

- **reads of ref/computed getters arrive unwrapped** (`exposed.open` is a
  `boolean`);
- **writes to ref-backed members redirect into `.value`** — `exposed.open =
  true` lands in the underlying ref (there IS a write path);
- **methods arrive engine-bound to the raw instance**;
- **plain derived getters remain fully reactive**: their bodies execute
  inside the *reader\'s* effect, so leaf tracking passes straight through
  the proxy. `watch(() => playerRef.value.someDerivedPx, cb)` works — it
  fires whenever the getter\'s actual leaves change.

The typing must match that runtime. TS marks get-only accessors `readonly`
and the unwrap types preserve it — so an exposed surface typed from the raw
class *forbids* writes the runtime allows. `Instance`
(`typeof Class.Instance`, i.e. `ReactiveInstance`) strips the readonly via
its writable-getter remap. Hence the rule:

```ts
defineExpose(player as Player.Instance)
```

and for a consumer holding the ref, the surface type is:

```ts
import type { ShallowUnwrapRef } from 'vue'
type PlayerExposed = ShallowUnwrapRef<Player.Instance>
```

(Generic classes: `ShallowUnwrapRef<Scroller.Instance<T>>`.)

What genuinely does NOT survive expose — the folklore, scoped correctly:

1. **Snapshots**: `const x = ref.value.someGetter` at setup is a dead value.
   Read inside the effect, every run.
2. **Plain data fields** (constants, config): never reactive anywhere — no
   leaves, nothing to track.
3. **Pre-mount null**: template refs are `null` until mount — use `?.` in
   watch getters.

## reactive() interop

Wrapping an instance in `reactive()` works (state is raw-anchored, one Ref/Computed
per member regardless of access path), and the same typing law applies: the
runtime proxy unwraps reads and redirects ref writes, so type the wrapped
value through `Instance` or writes will hit preserved-readonly errors:

```ts
const r = reactive(inst as Player.Instance) // writes typecheck as they behave
```

Prefer not wrapping at all — the raw instance plus `.value` is the standard;
`reactive()` at a boundary is an interop concession, not a pattern.

## The one mental model

- **Owner side** (class, setup, own template): Refs/Computeds are `.value`; plain
  getters and methods are plain. One namespace, marker at the use site,
  enforced by the compiler.
- **Public side** (expose, `reactive()` interop): unwrapped reads, ref
  writes redirect, methods bind raw, derived getters stay live — typed
  through `Instance`.

Both sides are Vue\'s own semantics, stated honestly instead of hidden.
