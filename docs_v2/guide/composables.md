---
title: Composables & Stores
description: "How Vue 3 composables, stores, and ivue classes fit together: the two architectures for reactive logic, the $-getter that caches a composable per instance, who owns a composable's effects, and how to publish class logic behind a composable-shaped API."
relatedPosts: [computed-is-a-cache, derivations-are-free, total-memory-control, the-object-graph-they-took]
---

# Composables & Stores

A **composable** is Vue's unit of reusable reactive logic: a function —
`useMouse()`, `useLocalStorage()`, `useProjectStore()` — that creates refs,
computeds, watchers, and sometimes lifecycle hooks, and returns them as an
object. Whatever scope is active when you call it owns the effects it
registers. It is the standard currency of the Vue ecosystem, and ivue is a
first-class consumer of it.

This page covers the whole relationship: how the two architectures differ,
how a class hosts a composable, who owns its effects, and how to hand class
logic back to composable consumers.

## Two architectures, one reactivity

A composable and an ivue class package the same primitives — refs,
computeds, watchers — in two different containers:

| | composable | ivue class |
| --- | --- | --- |
| container | a closure — variables captured by the returned object | an instance — cells cached behind prototype getters |
| state exists | the moment the function runs, all of it | on first read, cell by cell ([lazy](/blog/total-memory-control)) |
| derivations | `computed()` per derived value, ~300 B each, per call | plain getters, [0 bytes, shared on the prototype](/blog/derivations-are-free) |
| structure | none — composition by calling other composables | `extends`, `super`, `private`, overridable members |
| the surface | the returned object, fixed at return time | the class's public members, refinable by subclass |
| release | drop every reference and wait for GC | that, or [`$stopEffects()` on a live instance](/blog/release-what-the-gc-cant) |

Neither is wrong. A composable is the natural shape for a small leaf of
reusable behavior — track the mouse, debounce a value, read a media query.
The class is the natural shape when state has structure and population:
models, documents, editors, entities in collections. The architectures
meet because **classes host composables** — the ecosystem's leaves plug
into structured models without losing anything.

## Consuming a composable: the `$`-getter

The one convention: a class holds a composable behind a **protected getter
whose name starts with `$`**, and the engine caches the entire returned
object on first touch — once per instance, for the instance's whole life.

```ts
// Pointer.ts
import { Reactive } from 'ivue';
import { useMouse } from '@vueuse/core';

class $Pointer {
  // the composable is an implementation detail — created on first
  // touch, cached WHOLE, held for the life of the instance
  protected get $mouse() {
    return useMouse();
  }

  // the public surface: refined, not forwarded
  get x() {
    return this.$mouse.x;
  }
  get y() {
    return this.$mouse.y;
  }
}

export namespace Pointer {
  export const $Class = $Pointer; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
```

Three things carry the pattern:

- **The `$` prefix is a naming signal.** It marks "this getter returns a
  cached container" — a composable, a store, a service. Reading
  `this.$mouse` anywhere in the class costs one cache hit; `useMouse()`
  runs exactly once per instance.
- **A getter, never a field initializer.** `mouse = useMouse()` runs at
  construction — eagerly, before the app may be ready, inside every test
  that touches the class, and at module-evaluation order's mercy in a
  [circular import](/guide/modules). The getter defers the call to first
  use, which dissolves all three problems at once.
- **`private` means the composable never leaks.** Consumers of `Pointer`
  see `x` and `y`. The composable behind them is swappable — a subclass or
  a test can override `$mouse` and every dependent getter follows, because
  the surface is refinement getters, not the raw return object.

The same shape consumes a Pinia store or any `useX()` service. And when
the shared thing is yours, the store itself is an ivue class — that is
the next section.

### The simplest form: call it in the constructor

In a class a component constructs, the constructor body IS the
component's setup. A composable the class always needs, that is cheap to
create and belongs to that component's scope, can be called there and
kept on a field:

```ts
// BlogPostNav.ts — the older/newer post cards under an article
import { useRoute } from 'vitepress';

class $BlogPostNav {
  constructor() {
    this.route = useRoute();
  }

  protected readonly route: ReturnType<typeof useRoute>;

  get isBlogPost() {
    return /^\/blog\/.+/.test(this.route.path);
  }
}
```

This is the simplest host there is, and it is correct because the call
happens inside setup, after `super()`, on an instance a component owns.
It is not the field-initializer form the standard bans: `route =
useRoute()` as a class field runs before the constructor body, in every
test that touches the class, and at module order's mercy in a cycle.

The `$`-getter is the same call made lazy. Reach for it when the
composable may not be needed on every instance, when it must resolve
after the app is ready (a store), when the class outlives a component,
or when a subclass or a test should be able to override it. Reach for
the constructor when none of that applies and the route, the i18n
instance or the theme is simply part of what the class is.

### Caching a module-global once per class: the static `$`-getter

The same `$` convention works on statics, and there it caches once per
class instead of once per instance. Anything expensive that comes from
outside the class — a module-level data import, a filtered view of it,
a parsed table — sits behind a `static get $name()` and is built the
first time any instance reads it, then shared by all of them. The same
file:

```ts
// BlogPostNav.ts
import { Static } from 'ivue/extras';
import { data as allPosts } from '../../../blog/blog.data.mjs';

class $BlogPostNav {
  /** the public archive, newest-first, built once per class */
  static get $posts(): BlogPostNav.Post[] {
    return (allPosts as BlogPostNav.Post[]).filter((post) => !post.private);
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $BlogPostNav;
  }

  get currentIndex() {
    return this.self.$posts.findIndex((post) => post.url === this.route.path);
  }
}

export namespace BlogPostNav {
  export const $Class = Static($BlogPostNav); // anchored — the class has statics
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

`allPosts` is a build-time data import that every article page shares.
Filtering it per instance would repeat the work on every mount;
filtering it at module evaluation would run before anything asked and
pin the import order. The static `$`-getter does it on first touch, once
per class, and a subclass gets its own cached copy because `Static()`
caches per receiver. The rules for these getters are on the
[statics page](/guide/static#cached-static-getters).

## Stores: a singleton behind `use()`

Shared application state — session, navigation, toasts, the current
user — is a **store**: one ivue class, one instance, published behind a
`use()` function. The store IS a composable to its consumers; the
singleton is an implementation detail of `use()`:

```ts
// app/AppStore.ts — the store IS an ivue class; a static owns the singleton
import { Reactive } from 'ivue';
import { Static } from 'ivue/extras';
import { ref } from 'vue';

class $AppStore {
  // The ONE instance, as a `$`-static: constructed on first read, after
  // the app exists, and cached on the receiver. It constructs through the
  // namespace slot, so a test double swapped into `Class` is what gets
  // built — the store has one receiver, the slot, so nothing forks.
  protected static get $shared(): AppStore.Instance {
    return new AppStore.Class();
  }

  static use(): AppStore.Instance {
    return this.$shared;
  }

  get authenticated() {
    return ref(false);
  }

  notify(message: string) {
    /* ... */
  }
}

export namespace AppStore {
  export const $Class = Static($AppStore); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — use() does the one `new`
  export type Instance = typeof Class.Instance;
}
```

Consumers never receive the store — they reach for it. A model injects
it through the same `$`-getter as any composable; a component calls
`use()` directly:

```ts
// any model — the `$`-getter caches the store per instance, forever
class $SubscribersModel {
  protected get $app() {
    return AppStore.Class.use();
  }

  async refresh() {
    try {
      /* ... */
    } catch (error) {
      this.$app.reportFailure(error);
    }
  }
}
```

```vue
<script lang="ts" setup>
// any component — call use() directly; no prop, no provide/inject
import { AppStore } from '../app/AppStore';

const app = AppStore.Class.use();
const { authenticated } = app;
</script>

<template>
  <button v-if="authenticated" @click="app.logout()">Lock</button>
</template>
```

Why this exact shape:

- **`use()` is lazy.** The singleton constructs on first touch, after
  the app exists — module-load order and
  [circular imports](/guide/modules) stay non-events. It lives in a
  `static readonly` cell, never in the namespace: a namespace `let` is a
  parallel world no subclass can reach, and the gate refuses it.
- **The `$`-getter is the injection point.** A model names its
  dependency once; every method reads `this.$app` at cache-hit cost,
  with no constructor plumbing and no prop-drilling.
- **Tests swap the slot, not the callers.** Assign
  `AppStore.Class = $TestStore` before the first `use()` and every
  consumer, calling `AppStore.Class.use()`, gets the double through the
  same seam.
- **A store outlives components by definition.** Its watchers use
  `this.$watch` / `this.$watchEffect`, never plain `watch`, and
  lifecycle hooks never belong in it — see
  [Lifecycle & Teardown](/guide/lifecycle-teardown).

The full specification — including when to pass props instead — lives in
[the standard](/guide/standard#the-store-pattern-a-singleton-behind-use-injected-by-getter).

## Who owns the composable's effects

A composable's watchers, listeners, and lifecycle hooks belong to whatever
scope is active **when it first runs** — and with a `$`-getter, that is the
moment of **first touch**, not construction. This is the one rule that
needs deliberate handling:

- **Component-owned instance, scope-carrying composable** (it registers
  listeners, watchers, or lifecycle hooks — `useMouse` does): touch it in
  the constructor. The constructor runs synchronously inside `setup()`, so
  the composable lands in the component's scope and unmount reaps its
  effects — Vue owns the lifetime, nothing to write. Destructuring
  `{ x, y }` in setup does the same job here, but the constructor touch
  states the intent and survives a template refactor that stops reading
  `x` early:

```ts
class $Pointer {
  constructor() {
    // first touch INSIDE setup — useMouse's listeners land in the
    // component scope and die on unmount
    void this.$mouse;
  }

  protected get $mouse() {
    return useMouse();
  }
  /* ... */
}
```

- **Pure-data composable** (returns refs/computeds, registers nothing):
  no rule needed. Let it materialize whenever it's first read — laziness
  is free here.
- **Outliving instance** (a store, an entity that survives components):
  a scope-carrying composable touched from an active component would tie
  its effects to that component's lifetime — the wrong owner. Touch it
  from the instance's own world instead (inside `startWatchers()` or any
  method running under `$watch`'s scope), and it dies with
  [`$stopEffects()`](/guide/lifecycle-teardown) when the owner disposes.
  When a composable insists on lifecycle hooks (`onMounted` inside it), it
  simply cannot live in an outliving instance — wrap the DOM-bound part in
  the component and pass values in.

## Publishing class logic as a composable

Interop runs the other way too. A class published behind a `use()`
function IS a composable to its consumers — same call shape, same
destructure, class internals:

```ts
// UndoHistory.ts — the class: lazy state, plain-getter derivations
class $UndoHistory {
  get entries() {
    return shallowRef<UndoHistory.Snapshot[]>([{ label: 'start', items: [] }]);
  }
  get cursor() {
    return ref(0);
  }
  get canUndo() {
    return this.cursor.value > 0;
  }

  push(label: string, items: readonly string[]) {
    /* ... */
  }
  undo() {
    /* ... */
  }
}

export namespace UndoHistory {
  export const $Class = $UndoHistory; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance;
}
```

```ts
// useUndoHistory.ts — the composable face: one instance per call, like
// any useX(). Its own module, because a class file holds only its class.
import { UndoHistory } from './UndoHistory';

export function useUndoHistory() {
  return new UndoHistory.Class();
}
```

```vue
<script lang="ts" setup>
import { useUndoHistory } from './useUndoHistory';

const history = useUndoHistory();
const { cursor } = history;
</script>

<template>
  <button :disabled="!history.canUndo" @click="history.undo()">Undo</button>
</template>
```

A consumer who only knows composables uses it without learning anything —
and quietly gets the class architecture's prices: lazy state, zero-byte
derivations, and a model that can be subclassed, tested through
[the class seam](/guide/inheritance), and disposed deterministically. For
an app-wide singleton, the same face returns one shared instance — that is
exactly the [store pattern above](#stores-a-singleton-behind-use).

## Choosing the container

- **Write a composable** when the logic is a small, structureless leaf —
  one interaction, one browser API, one derived stream — and it will be
  consumed by many unrelated components.
- **Write a class** when the logic is a model: it has state with shape,
  derivations worth naming, methods that belong to it, or it exists in
  populations (rows, tabs, players).
- **Host, don't rewrite.** The ecosystem's composables — VueUse, Pinia
  stores, your own `useX()` — plug into classes through one `$`-getter.
  Rewriting a working composable as a class buys nothing; wrapping it in
  one buys structure, privacy, and a refinable surface.
- **Publish models behind `use()`** when consumers expect the composable
  shape. The face costs one function; the internals stay a class.

## See it running

- [Lifecycle & Teardown](/examples/lifecycle) — both lifetimes live, Ticker and Sensor.
- [Composables in classes](/examples/composable) — `useMouse` hosted, `useUndoHistory()` published.
- [Pinia Store Alternative](/examples/class-store) — one shared instance behind `use()`.
