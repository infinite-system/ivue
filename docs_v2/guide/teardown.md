---
title: Teardown
description: $watch registers watchers in a lazy per-instance effect scope; $stopEffects stops it, runs your hook, and clears caches — with zero cost for pure-data instances.
---

# Teardown

`Reactive()` injects two helpers on every class: **`$watch`** and
**`$stopEffects`**. Together they give deterministic cleanup with zero cost for
instances that never need it.

## `$watch`

Same signature as Vue's `watch`, but it registers the watcher in the instance's
**lazily-created** effect scope:

```ts
class $Player {
  get hp() { return ref(100) }
  constructor() {
    this.$watch(() => this.hp.value, (hp) => {
      if (hp <= 0) this.die()
    })
  }
  die() { /* ... */ }
}
```

The scope is allocated **only on the first `$watch` call**. A pure-data instance
that never watches allocates no scope at all — so creating millions of them stays
free.

## `$stopEffects`

Call it to dispose an instance:

```ts
inst.$stopEffects()
```

It does three things, in order:

1. runs your `stopEffects()` method if you defined one (extra cleanup hook),
2. stops the effect scope — **every** watcher created via `$watch`,
3. clears all cached refs/computeds/methods so the instance can be collected.

After teardown, accessing a member re-materializes it fresh.

## Auto-cleanup with the component

If an instance lives and dies with a component, wire it to the component's scope
so teardown is automatic on unmount:

```ts
import { getCurrentScope, onScopeDispose } from 'vue'

class $Widget {
  constructor() {
    getCurrentScope() && onScopeDispose(() => this.$stopEffects())
  }
}
```

## Why not just `effect.stop()`?

Under Vue 3.5+, `computed().effect.stop` no longer exists, and lazy computeds /
refs don't need explicit stopping — they're collected once the instance is
dereferenced. The only thing that genuinely needs stopping is **user watchers**,
which is exactly what the effect scope owns. So ivue stops the *scope*, not
individual cells — correct, and nothing to leak.

::: tip Rule of thumb
Create watchers with `this.$watch`. Call `$stopEffects()` (or wire
`onScopeDispose`) when the instance outlives its creating component. Pure-data
models need nothing.
:::
