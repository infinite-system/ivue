# ivue@2.0.0 — plain classes, full reactivity, 1.1 kB

ivue 2.0 is a ground-up rewrite. `Reactive(Class)` transforms a class's
prototype **in place** — once, idempotently — and returns the same
constructor. Instances are plain JavaScript objects: no proxies, no
wrappers, no per-instance machinery. State materializes lazily on first
access, and everything the engine does fits in **1.1 kB gzipped**.

```ts
import { Reactive } from 'ivue';
import { ref } from 'vue';

class $Counter {
  get count() {
    return ref(0);
  }
  increment() {
    this.count.value++;
  }
}

export namespace Counter {
  export const $Class = $Counter; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance;
}
```

### Breaking

- **The v1 runtime is removed.** `ivue()` and every v1 export are gone
  from the package; `Reactive()` is the engine. v1 returned a proxy that
  unwrapped refs on read — v2 hands you the **raw instance**, and
  Refs/Computeds are `.value` everywhere, exactly like the rest of Vue.
  Migrating: mutable state becomes ref-returning getters, derivations
  become plain getters, `ivue(Class, args)` becomes `new X.Class(args)`,
  and templates destructure the refs they touch. The full authoring
  standard lives at <https://ivue.dev/guide/standard>.

### The engine

- **Ref-getters become cached Refs/Computeds** — created on first
  access, the same object forever after. Plain getters stay native
  prototype getters and are reactive through leaf tracking, costing
  zero bytes per instance.
- **Methods are lazily-bound and referentially stable** — safe as event
  handlers, `instance.method === instance.method` always.
- **`$watch` / `$watchEffect`** register watchers in the instance's own
  lazily-created detached scope — for instances that outlive components.
  Pure-data instances allocate no scope at all.
- **`$stopEffects()`** is deterministic teardown: it stops the scope and
  drops every cached cell, returning the instance to its
  pre-first-touch state. There are no hooks: ivue never auto-calls your
  code; richer cleanup is an ordinary method that does its work and
  then calls `$stopEffects()`.
- **Inheritance, generics, and circular imports** are first-class: the
  namespace pattern gives cross-file hierarchies and mutual references
  that resolve at first access, in any load order.
- `propsWithDefaults()` and a complete typing surface
  (`ReactiveInstance`, `ReactiveClass`, `typeof Class.Instance`) round
  out the API.

### For AI-assisted teams

`npx ivue skill` installs the ivue operating manual into your agent
tooling (`npx ivue skill --all` equips every detected tool) — the same
standard humans read at <https://ivue.dev/guide/standard>.

### Measured

On the reference benchmark (100k instances, Vue 3.5): construction is
**55–253× faster** than reactive-proxy and composable-factory
equivalents — creation does no reactive work, so it is near-free. Live,
reproducible benchmarks: <https://ivue.dev/guide/benchmarks>.

Build: **1,112 B gzipped**. Tests: 169, at **100% coverage** on every
metric. Docs: <https://ivue.dev>.
