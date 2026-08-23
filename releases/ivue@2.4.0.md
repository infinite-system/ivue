# ivue@2.4.0

Feature release — one option on one verb, zero breaking changes:
`$stopEffects` learns to stop the watchers **without forgetting the
state**, and the suspend/resume lifecycle falls out of a convention
the standard already half-taught.

## `$stopEffects({ reset: false })` — silence without forgetting

The default call is unchanged — stop the instance's effect scope and
clear every cached cell, so the next touch re-materializes fresh
([disposal is a reset](https://ivue.dev/blog/disposal-is-a-reset)).
The new option unbundles the two acts:

```ts
session.$stopEffects();                 // stop + clear (unchanged)
session.$stopEffects({ reset: false }); // stop the watchers ONLY
```

With `{ reset: false }` every watcher dies, but cell identity and
current values persist: surviving computeds keep evaluating (verified
on Vue 3.5.41 **and** 3.6.0-rc.5 — a computed born inside the stopped
scope stays readable and re-watchable), and a later `$watch` allocates
a fresh scope over the same cells.

## The suspend/resume convention

Register watchers in a `startWatchers()` method the constructor calls
— not inline in the constructor — and the whole lifecycle is two
one-liners, with no new engine surface for the second half:

```ts
class $Feed {
  constructor() {
    this.startWatchers();
  }

  startWatchers() {
    this.$watchEffect(() => this.render());
  }

  suspend() {
    this.$stopEffects({ reset: false }); // watchers die, state stays
  }

  resume() {
    this.startWatchers(); // fresh scope, same cells
  }
}
```

The convention is now in the Standard Operating Manual's
outliving-instance template, the watch rules, the
[API reference](https://ivue.dev/api/#instance-stopeffects-options), and
[Lifecycle & Teardown](https://ivue.dev/guide/lifecycle-teardown).

## Also in the box

- The implementation guards the cache-walk inside `finally` rather
  than returning early — a throwing `scope.stop()` can never be
  swallowed.
- Two new lifecycle specs (196 → 198 tests); engine and extras
  coverage stays 100%.

## Numbers

- Core `ivue` entry: 1,125 bytes gzipped (+13 bytes for the option) —
  1.1 kB, zero dependencies.
- Full suite passes on Vue 3.5.41 and 3.6.0-rc.5 unchanged.
