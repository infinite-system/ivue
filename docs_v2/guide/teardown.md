---
title: Teardown
description: $watch registers watchers in a lazy per-instance effect scope; $stopEffects stops it, runs your hook, and clears caches — with zero cost for pure-data instances.
---

# Teardown

`Reactive()` injects three helpers on every class: **`$watch`**, **`$watchEffect`**, and
**`$stopEffects`**. Together they give deterministic cleanup with zero cost for
instances that never need it.

## `$watch`

Same signature as Vue's `watch`, but it registers the watcher in the instance's
**lazily-created, detached** effect scope — owned by the instance, not by
whatever component happened to construct it:

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
instance.$stopEffects()
```

It does three things, in order:

1. runs your `stopEffects()` method if you defined one (extra cleanup hook),
2. stops the effect scope — **every** watcher created via `$watch` / `$watchEffect`,
3. clears all cached refs/computeds/methods so the instance can be collected.

After teardown, accessing a member re-materializes it fresh. The whole
lifecycle, live:

<DemoTeardown />

## Auto-cleanup with the component

If an instance lives and dies with one component, it doesn't need `$watch` at
all. Use plain `watch`/`watchEffect` in the constructor: constructed during
setup, those land in the **component's** effect scope, and Vue reaps them on
unmount. Nothing to wire, nothing to call:

```ts
import { watch } from 'vue'

class $Widget {
  constructor() {
    watch(() => this.hp.value, (hp) => this.onHpChange(hp)) // dies with the component
  }
}
```

The `$watch` scope is detached **by design** — so a component can construct a
long-lived instance (a session, a store) and unmount without killing its
watchers. The price of that freedom is that unmount never cleans a `$watch`;
some owner must call `$stopEffects()`.

For a class that uses `$watch` because *some* owners keep it alive longer, but
is *also* created inside components, bridge the two worlds in the constructor:

```ts
import { getCurrentScope, onScopeDispose } from 'vue'

class $Session {
  constructor() {
    getCurrentScope() && onScopeDispose(() => this.$stopEffects())
  }
}
```

When a component scope is there, disposal rides its unmount; when there isn't
one, the line is a no-op and the explicit owner calls `$stopEffects()`.

## Why not just `effect.stop()`?

Under Vue 3.5+, `computed().effect.stop` no longer exists, and lazy computeds /
refs don't need explicit stopping — they're collected once the instance is
dereferenced. The only thing that genuinely needs stopping is **user watchers**,
which is exactly what the effect scope owns. So ivue stops the *scope*, not
individual Refs/Computeds — correct, and nothing to leak.

::: tip Rule of thumb
Component-lifetime instance → plain `watch`/`watchEffect` in the constructor;
the component cleans up. Outliving instance → `this.$watch`/`this.$watchEffect`
plus an owner that calls `$stopEffects()` (or the `onScopeDispose` bridge).
Pure-data models need nothing.
:::
