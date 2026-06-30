# Computed & Watch

## Computed

Covered in [Reactive State](/guide/state#computed) — a getter returning
`computed()`. Two things worth repeating:

- It's **cached** and recomputes only when its dependencies change.
- Each instance and each inheritance level caches its own computed under a
  distinct key, so overrides and `super` never collide
  ([Inheritance](/guide/inheritance)).

```ts
class $Cart {
  get items() { return ref<{ price: number }[]>([]) }
  get total() {
    return computed(() => this.items.value.reduce((s, i) => s + i.price, 0))
  }
}
```

## Watch

Use the engine-injected **`this.$watch`** to react to changes. It has the same
signature as Vue's `watch`, but registers the watcher in the instance's effect
scope so [`$stopEffects`](/guide/teardown) can clean it up.

```ts
class $Search {
  get query() { return ref('') }
  get results() { return ref<string[]>([]) }

  constructor() {
    this.$watch(
      () => this.query.value,
      (q) => { this.results.value = runSearch(q) },
      { debounce: 0 },
    )
  }
}
```

::: warning Use `this.$watch`, not a raw `watch()`
A raw `watch()` / `watchEffect()` created in a method is **not** owned by the
instance's scope and won't be stopped by `$stopEffects` — it leaks unless you
stop it yourself. Prefer `this.$watch`. (If the instance is created during a
component's `setup()`, watchers created synchronously there are also stopped by
the component on unmount.)
:::

`$watch` returns Vue's stop handle, so you can stop a single watcher without
tearing down the instance:

```ts
const stop = this.$watch(() => this.query.value, onChange)
// ...later
stop()
```

## watchEffect-style

Need `watchEffect`? Run it inside the same scope by calling Vue's `watchEffect`
from within a `$watch`-style helper, or create your own `effectScope`. For most
cases `this.$watch(source, cb)` is enough — see
[Teardown](/guide/teardown) for the full lifecycle.
