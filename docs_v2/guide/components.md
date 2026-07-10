---
title: Components & Templates
description: The settled standard — raw instance in setup, one grouped destructure of the state manifest (refs, computeds, element refs), naked state and dotted behavior in templates, and every unwrapping surface typed through Instance.
---

# Components & Templates

A Reactive instance is a plain object. One rule governs every surface you
control:

> **Destructure the state manifest — every Ref/Computed the template touches,
> plus element refs — in one grouped statement. Templates use naked bindings
> for state, dotted access for plain getters and methods. A Ref is never
> reached through the instance in a template.**

```vue
<script setup>
import { Player } from './Player'

const player = new Player.Class(props, model, emit)

// THE STATE MANIFEST — the component's reactive signature, in one place.
const {
  // state
  menuShown,
  volume,
  // computeds
  sortedChapters,
  // element refs
  videoEl,
  scrollerEl,
} = player

defineExpose(player as Player.Instance)
</script>

<template>
  <!-- naked bindings = state cells; compiler-unwrapped in EVERY position -->
  <q-menu v-model="menuShown" />
  <div v-if="menuShown">{{ volume }} · {{ sortedChapters.length }}</div>
  <!-- dotted = derivations and actions (plain getters / methods) -->
  <div :style="{ width: player.postWidthPx }">{{ player.title }}</div>
  <button @click="player.play()">Play</button>
  <video ref="videoEl" />
</template>
```

The two access styles carry meaning: **naked identifier = a state cell**,
**dotted `player.x` = a derivation or an action**. That is the class's own
anatomy — ref-getters vs plain getters vs methods — made visible at the call
site. And it stays legible because the manifest is small by construction:
under the [plain-getter doctrine](/guide/computed-watch) a class carries few
Refs/Computeds and many derived getters, and only the former are listed. In
the `<script setup>` **body**, destructured bindings are refs — `.value`
there, as everywhere outside a template.

## The rules that keep it clean

- **The manifest is total.** Every Ref/Computed the template touches is
  destructured; none is ever reached through the instance in a template.
  This is load-bearing, not stylistic: Vue's conveniences unwrap
  instance-reached refs in *some* positions only — `{{ player.someRef }}`{v-pre}
  renders via display-unwrap while `v-if="player.someRef"` is always-truthy.
  Destructured setup bindings unwrap **uniformly in every position**, so the
  total-manifest rule abolishes the seam rather than memorizing it.
- **Never destructure plain getters or methods.** A plain getter owns no
  Ref — destructuring snapshots a dead value. Methods lose nothing but the
  naming signal. Both stay dotted.
- **v-for item cells stay dotted with `.value`** (`cell.raw.value`) — a
  thousand collection items cannot be destructured; the manifest governs the
  component's own instance.
- **Instance-swapping components don't destructure.** If the component
  replaces its instance (`model.value = new X.Class()`), bindings would go
  stale — keep dotted access there.
- **Don't shadow props.** A state binding named like a `defineProps` prop
  silently shadows it (setup bindings win). Rare by construction: the class
  consumes props through prop-getters, so prop-derived values stay dotted
  (`player.width`, `player.widthPx`) and never compete with state names.

## How the standard got here

Every regime was tried on a 2,100-line production component:

| regime | verdict |
| --- | --- |
| `reactive(instance)` in setup | rejected — deep-proxy tax (~75ns/read), deep-wraps returned objects |
| a shallow unwrap view (`proxyRefs`-style) | rejected — TS keeps get-only accessors `readonly` through the unwrap types; template writes error |
| destructure **everything** | rejected — plain derived getters own no Ref/Computed; destructuring snapshots dead values, and 60+ derived getters make a hand-maintained monster |
| raw + `.value` in templates | the previous standard — sound and compiler-checked, but it taxed every template read and marked *ref-ness* rather than the distinction that matters |
| **raw + the state manifest** | **the standard** — naked state / dotted behavior, uniform unwrap in all positions, zero runtime cost, and the manifest doubles as the component's state signature |

What changed between the last two rows is the [plain-getter
doctrine](/guide/computed-watch): once derivations stopped being computeds,
the destructure list shrank from "everything" to "the state surface" — small
enough to be a feature. The rejected regimes stay rejected for the same
measured reasons as before.

## defineExpose and the expose surface

Vue delivers an exposed instance to parents through its **expose proxy**,
which is `proxyRefs`-based. Verified behavior:

- **reads of ref/computed getters arrive unwrapped** (`exposed.open` is a
  `boolean`);
- **writes to ref-backed members redirect into `.value`** — `exposed.open =
  true` lands in the underlying ref (there IS a write path);
- **methods arrive engine-bound to the raw instance**;
- **plain derived getters remain fully reactive**: their bodies execute
  inside the *reader's* effect, so leaf tracking passes straight through
  the proxy. `watch(() => playerRef.value.someDerivedPx, cb)` works — it
  fires whenever the getter's actual leaves change.

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

Prefer not wrapping at all — the raw instance plus the state manifest is the
standard; `reactive()` at a boundary is an interop concession, not a pattern.

## The one mental model

- **Class + script body**: Refs/Computeds are `.value`; plain getters and
  methods are plain. The compiler checks every miss.
- **Template**: naked bindings are state (the manifest); dotted access is
  behavior (plain getters, methods). No Ref through the instance, ever.
- **Public side** (expose, `reactive()` interop): unwrapped reads, ref
  writes redirect, methods bind raw, derived getters stay live — typed
  through `Instance`.

All three are Vue's own semantics, stated honestly instead of hidden.
