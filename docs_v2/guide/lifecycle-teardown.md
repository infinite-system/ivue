---
title: Lifecycle & Teardown
description: The constructor runs wherever you `new` — in setup that means plain watch(), onMounted and the whole lifecycle toolbox register against the component. For instances that outlive components, $watch and $stopEffects give deterministic teardown.
relatedPosts: [rented-objects, reactivity-is-an-allocator, organs-not-skeletons]
---

# Lifecycle & Teardown

A Reactive instance is a plain object — it has no lifecycle machinery of its
own. It doesn't need any: there are exactly two lifetimes an instance can
have, and each has a complete toolbox.

- **Lives and dies with a component** → the constructor *is* setup code:
  plain `watch`, `onMounted`, everything registers against the component.
- **Outlives its creating component** → `$watch` registers watchers in the
  instance's own detached scope, and `$stopEffects()` tears them down.

## The constructor runs where you `new` it

The constructor executes **synchronously in whatever context you construct
the instance**. `new` it during `<script setup>`, and the constructor body
runs inside the component's setup — the entire setup toolbox works there:

```ts
import { ref, watch, onMounted, onUnmounted } from 'vue';

class $Player {
  get status() {
    return ref<'idle' | 'playing'>('idle');
  }
  get videoEl() {
    return ref<HTMLVideoElement | null>(null);
  }

  constructor() {
    // plain watch — lands in the COMPONENT's scope, reaped on unmount
    watch(() => this.status.value, (status) => this.onStatusChange(status));

    // lifecycle hooks — register against the mounting component
    onMounted(() => this.videoEl.value?.play());
    onUnmounted(() => this.flushAnalytics());
  }

  onStatusChange(status: string) {
    /* ... */
  }
  flushAnalytics() {
    /* ... */
  }
}
```

Nothing here needs `$stopEffects()`: the component owns every effect and
hook, and unmount cleans them all up. The same applies to composables held
in [`$`-getters](/guide/state#prefixed-singletons) — they materialize on
first access, and when that first access is the component's
[state destructure](/guide/components), their listeners bind to the
component's scope too.

Two rules keep this shape honest:

- **Lifecycle hooks couple the class to a component — by choice.** That's
  the ViewModel shape, and it's exactly right for per-component classes. A
  store or domain entity that outlives components must not register
  lifecycle hooks; it uses `$watch` and an owner that disposes (the rest of
  this page).
- **Guard when the construction context varies.** If the same class is also
  constructed outside components (tests, module scope), a bare `onMounted`
  warns. Register conditionally:
  `getCurrentInstance() && onMounted(() => this.videoEl.value?.play())`.

## `$watch` — watchers that survive the component

Same signature as Vue's `watch`, but it registers the watcher in the
instance's **lazily-created, detached** effect scope — owned by the
instance, not by whatever component happened to construct it:

```ts
class $Enemy {
  get hp() {
    return ref(100)
  }
  constructor() {
    this.$watch(() => this.hp.value, (hp) => {
      if (hp <= 0) this.die()
    })
  }
  die() {
    /* ... */
  }
}
```

The scope is allocated **only on the first `$watch` call**. A pure-data instance
that never watches allocates no scope at all, so watcher infrastructure adds no
per-instance allocation to a population that never uses it.

## `$stopEffects`

Call it to dispose an instance:

```ts
instance.$stopEffects()
```

It does two things, in order:

1. stops the effect scope — **every** watcher created via `$watch` / `$watchEffect`,
2. clears all cached refs/computeds/methods so the instance can be collected.

There are **no hooks** — ivue never calls your code, at construction (no
auto-`init()`) or at teardown. Richer cleanup composes as an ordinary
method — see below.

After teardown, accessing a member re-materializes it fresh. The whole
lifecycle, live:

<DemoTeardown />

### Richer cleanup: an ordinary method, no hooks

Non-Vue resources — sockets, event listeners, timers, subscriptions from
composables — need cleanup the engine cannot know about. The pattern is
plain composition: a method of yours (call it `dispose()`, `cleanup()`,
whatever fits the domain) does its own work **first, while state is still
alive**, then resets the engine:

```ts
class $Session {
  get socket() {
    return ref<WebSocket | null>(null);
  }

  // an ordinary method — the owner calls it like any other
  dispose() {
    this.socket.value?.close();
    this.$stopEffects();
  }
}
```

No reserved names, no auto-calls, nothing to memorize: teardown is a call
you write, exactly like construction is a constructor you write. A generic
owner that only knows the engine API can still call `$stopEffects()`
directly — it just resets the reactive overlay and nothing else.

## Teardown is a full reset — deactivate, then re-activate

`$stopEffects()` does not only kill watchers — it returns the instance to
the **empty pre-first-touch state**. Computeds are dropped along with refs
(their cached cells are deleted, so they become collectable), and the
effect scope itself is discarded, so a later `$watch` allocates a fresh
one. Touching any member re-materializes it lazily, exactly like a
newly-constructed instance. Two consequences define how to use this:

- **Ref state is lost.** A re-materialized ref starts from its getter's
  initial value — durable truth must live outside the disposable overlay,
  in plain fields or a store.
- **The constructor does not re-run.** Watchers registered there stay
  dead; a re-armable instance registers them in a method instead.

That turns disposal into a repeatable **deactivate/re-activate cycle** —
the tool for windowing *reactivity* over a large retained model (a
million-row list where only visible rows deserve live effects):

```ts
// Row.ts
import { ref } from 'vue'
import { Reactive } from 'ivue'

class $Row {
  // GROUND TRUTH — a plain record: survives teardown, costs nothing
  constructor(public record: RowRecord) {}

  // overlay — re-seeds FROM the record on every re-materialization
  get isExpanded() {
    return ref(this.record.expanded)
  }

  // watchers live here, NOT in the constructor — so they can re-arm
  activate() {
    this.$watch(
      () => this.isExpanded.value,
      (expanded) => this.persist(expanded),
    )
  }

  persist(expanded: boolean) {
    this.record.expanded = expanded
  }

  deactivate() {
    this.$stopEffects()
  }
}

export namespace Row {
  export const $Class = $Row // raw — children `extends` this
  export let Class = Reactive($Class) // reactive — you `new` this
  // the type of every unwrapping surface (defineExpose, reactive())
  export type Instance = typeof Class.Instance
}
```

`deactivate()` drops the row to zero reactive weight — a plain object
holding a record pointer. `activate()` re-arms the watchers; the first
template touch re-materializes refs seeded from the record. The cycle
repeats indefinitely. This is the same invariant the
[flyweight grid](/guide/flyweight) pushes to its extreme: ground truth in
plain storage, reactivity as a disposable overlay priced by observation.

## Detached by design — and the bridge

The `$watch` scope is detached **on purpose** — so a component can construct
a long-lived instance (a session, a store) and unmount without killing its
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
Component-lifetime instance → plain `watch`/`watchEffect` and lifecycle hooks
in the constructor; the component cleans up. Outliving instance →
`this.$watch`/`this.$watchEffect` plus an owner that calls `$stopEffects()`
(or the `onScopeDispose` bridge). Pure-data models need nothing.
:::
