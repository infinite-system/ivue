---
title: The Options API everyone actually wanted
description: What people loved about the Options API was anatomy — a component you could read. The anatomy was fake. The class is the real one, and it was in the language all along.
date: 2026-08
tags: [javascript, patterns, philosophy]
relatedPosts: [introducing-ivue, the-object-should-tell-the-truth, organs-not-skeletons, the-object-graph-they-took, reactive-is-all-you-need]
---

# The Options API everyone actually wanted

![The Options API everyone actually wanted](/blog/the-options-api-everyone-wanted.png)

<BlogPostDate />

What people loved about the Options API was never the `data` /
`computed` / `methods` buckets themselves. It was that a component had
**anatomy**. You could open a stranger's file and know where the state
lived, where the derivations lived, where the actions lived — before
reading a single line of logic.

What killed it was that the anatomy was fake: a plain-object DSL
*pretending* to be a class. `this` was a runtime proxy TypeScript
fought for years. One logical concern got shredded across three
buckets. Reuse meant mixins — shallow option merging, name collisions,
properties appearing on `this` from files you'd never opened. And none
of it existed outside a component: the "class" had no instances you
could hold, test, or share.

The Composition API fixed reuse and typing by giving up the anatomy.
`setup()` is honest — plain functions, real closures — but it comes
with no shape at all, and setup-soup is the scar tissue: every team
reinvents its own ordering conventions because the structure the
Options API *promised* is gone again.

ivue's observation is that the anatomy everyone wanted was sitting in
the language the whole time. **The class is the Options API with the
pretending removed** — every bucket comes back as a member kind, and
every fake guarantee becomes a real one:

::: code-group

```js [Options API]
export default {
  data() {
    return { count: 0 };
  },
  computed: {
    double() {
      return this.count * 2; // `this` is a proxy; typing it took years
    },
  },
  methods: {
    increment() {
      this.count++;
    },
  },
};
```

```ts [ivue]
// counter.ts
import { Reactive } from 'ivue';
import { ref } from 'vue';

class $Counter {
  // data → a getter returning ref(); read and write via .value
  get count() {
    return ref(0);
  }

  // computed → a PLAIN getter: reactive via leaf tracking, zero
  // bytes per instance — no computed() unless the work is expensive
  get double() {
    return this.count.value * 2;
  }

  // methods → methods; the engine binds them lazily on the prototype
  increment() {
    this.count.value++;
  }
}

export namespace Counter {
  export const $Class = $Counter; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
```

:::

Same anatomy, real substrate. And the substrate is where "beyond it"
stops being a slogan:

- **`this` is just `this`.** Native TypeScript, no proxy gymnastics,
  no `ThisType` machinery. Methods pass safely because the engine
  binds them lazily, once, with stable identity.
- **Derivations participate in inheritance.** A computed is a getter,
  and getters understand `extends` and `super` — subclass a store and
  override one derivation. The Options API had mixins; it never had
  this.
- **The buckets cost nothing.** An Options API component allocates its
  computed watchers per instance. An ivue plain getter lives on the
  prototype: zero bytes per instance, reactive through the leaves it
  reads. The admin dashboard in ivue's own repository runs eleven
  models and a router-backed store on **zero** `computed()` calls —
  the surgical opt-in simply never earns its ~300 bytes there.
- **Instances exist outside components.** The same class conventions
  run ivue.dev's newsletter Worker — schedulers, delivery, an OAuth
  signer — with no component in sight. The Options API's anatomy was
  component-bound; a class is just an object you can `new`, hold,
  test, and pass anywhere.

The scope claim, once and honestly: ivue does not replace the
Composition API — it is *built on it*. `ref()`, `watch()`, lifecycle
hooks, any composable — they all work inside the constructor, which
runs synchronously in setup context. The Composition API is the
machinery; the class is the missing structure.

So the lineage reads cleanly: the Options API promised anatomy and
faked it. The Composition API delivered honest machinery and dropped
the anatomy. The class keeps both promises at once — which is why it
feels less like a third paradigm and more like the one everyone was
asking for the whole time.

Start with the shape itself: [The Standard](/guide/standard).
