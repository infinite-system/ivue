---
title: Development & HMR
description: ivue uses one Reactive() execution path in development, test, SSR, and production. Vite and Vue rebuild the owning component after class-module edits, keeping every class generation coherent without any dev-only runtime.
---

# Development & HMR

> Development runs the production engine: same class, same direct method
> binding, same branches, same performance semantics.

ivue requires no HMR plugin. Use the normal Vue plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});
```

When a class module changes, Vite follows the import graph to an accepting Vue
boundary. Vue reconstructs the affected component and its setup-owned class
instance. When no narrower boundary can accept the update, Vite reloads the
page.

Every class edit — whatever it touches — follows that same coherent
lifecycle. The new instance contains one generation of state, constructor
wiring, closures, and prototype behavior; ivue never combines old instance
state with a newly evaluated class body.

## Template edits still preserve state

Vue owns SFC template HMR. Editing only a template updates its render function
while Vue preserves component state where its normal HMR rules permit it.

Editing the class or component script rebuilds the affected owner. This matches
the lifecycle developers already receive from ordinary Vue setup code:

```text
template edit     → Vue updates rendering and preserves state
class/script edit → Vue reconstructs the affected owner
unsafe boundary   → Vite reloads the page
```

No ivue-specific configuration changes that pipeline.

## Production parity

`Reactive()` has one implementation across environments:

| Property | Development | Test / SSR | Production |
|---|---|---|---|
| Returned constructor | input class | input class | input class |
| Construction | native `new` | native `new` | native `new` |
| Instance | plain object | plain object | plain object |
| Method binding | direct lazy bind | direct lazy bind | direct lazy bind |

Vue's own development build and Vite still provide their normal diagnostics
and module graph. The ivue engine adds no development-only execution path.
Benchmarks run during development therefore exercise the same ivue class
semantics as a production build.

## Ownership determines the reload boundary

A class constructed in component setup belongs to that component. Vue unmounts
the owner, runs its normal cleanup, and constructs the replacement.

An instance that outlives components needs an explicit owner in ordinary code
and during development. Its owner calls `$stopEffects()` when replacing or
disposing it:

```ts
let session = new Session.Class();

function replaceSession() {
  session.$stopEffects();
  session = new Session.Class();
}
```

Module singletons and process-wide browser resources may push an update to a
page reload. That is the honest boundary when no component owns their complete
lifecycle. Durable development state belongs in a store, persistence layer, or
an explicitly managed external resource rather than in a partially upgraded
class instance.

## Bound methods remain safe within one generation

ivue methods are lazily bound and referentially stable:

```ts
button.addEventListener('click', counter.increment);

counter.increment === counter.increment; // true
```

When Vue rebuilds the owner, cleanup removes callbacks retained by the old
owner and the new owner registers methods from the new instance. Constructor
callbacks and computed closures continue to delegate through thin closures for
clarity, direct testing, and minimum captured state.

## Troubleshooting the ordinary HMR pipeline

HMR remains a pipeline: editor → file watcher → Vite websocket → module graph →
Vue boundary. If an edit does not appear:

1. confirm Vite logs the file change;
2. inspect the browser console for an invalidation or reload message;
3. confirm the importing component is mounted;
4. check reverse proxies and remote development hosts for websocket support;
5. reload once to distinguish a transport failure from application behavior.

A remote page may load successfully while its HMR websocket is blocked. That
transport issue is independent of ivue because ivue installs no HMR transport
or accept boundary of its own.
