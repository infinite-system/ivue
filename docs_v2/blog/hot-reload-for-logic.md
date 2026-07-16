---
title: 'Development should run production'
description: A dev-only proxy can preserve state across edits, but it also creates a second execution model. ivue lets Vue own reconstruction so development exercises the production engine directly.
date: 2026-07
---

# Development should run production

![Development should run production](/blog/hot-reload-for-logic.png)

Hot module replacement is seductive because every piece of state it preserves
feels like progress. That convenience has a price when a library must introduce
a different runtime to provide it.

A class-grafting engine needs a stable class registry, a construct proxy, live
method slots, source signatures, collision detection, private-brand detection,
and rules for deciding which edits can mutate a living object. Development then
runs through machinery production never executes.

ivue takes the smaller contract:

> Development executes the production engine. Vue owns the reconstruction
> boundary after a script edit.

`Reactive()` transforms and returns the input class in every environment.
Methods use the same direct lazy bind. Construction uses the same native `new`.
Instances remain the same plain objects.

```ts
const counter = new Counter.Class();

counter.increment === counter.increment; // true
counter instanceof Counter.Class; // true
```

There is no development class proxy hidden behind either expression.

When a template changes, Vue applies its normal state-preserving template HMR.
When a class or component script changes, Vite reaches the Vue boundary and Vue
reconstructs the affected owner. Constructor wiring, refs, computeds, bound
methods, inheritance, and native private brands all come from one class
generation.

That reconstruction loses component-owned state after a script edit. It also
removes the harder failure: a hybrid object whose old state and closures run
against a partially replaced prototype.

The same reduction improves performance work. A benchmark opened under the dev
server exercises ivue's production construction and method-dispatch path. Vue's
development diagnostics still exist, but ivue adds no proxy or live-slot branch
that must be disabled before measuring the library itself.

The setup is simply Vue's setup:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});
```

This is less magical and more exact. Hot reload remains a development transport;
it does not become a second class runtime. The full ownership behavior is in
[Development & HMR](/guide/hmr).
