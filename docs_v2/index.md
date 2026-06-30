---
layout: home

hero:
  name: ivue
  text: Reactive classes for Vue 3
  tagline: Write plain classes. Get fine-grained reactivity. Pay nothing per instance.
  image:
    src: /logo.svg
    alt: ivue
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Why v2
      link: /guide/introduction
    - theme: alt
      text: GitHub
      link: https://github.com/infinite-system/ivue

features:
  - icon: 🧬
    title: Real classes
    details: Native class, extends, super, getters and methods. No proxy wrapping the instance — it's just an object.
  - icon: ⚡
    title: Zero-cost creation
    details: Refs and computeds materialize lazily on first access. Creating a million instances costs a million plain `new` calls.
  - icon: 🎯
    title: Fine-grained reactivity
    details: You choose ref, shallowRef or computed per property. Nothing is reactive until you make it so.
  - icon: 🧩
    title: Deep inheritance
    details: Parent → grandparent computed chains and `super.x.value` resolve exactly like native classes.
  - icon: 🔗
    title: Circular-import safe
    details: The namespace module pattern resolves cross-references in any load order, and survives cross-file HMR.
  - icon: 🧹
    title: Deterministic teardown
    details: $watch registers in a lazy effect scope; $stopEffects stops it. Pure-data instances allocate no scope at all.
---

<div style="max-width: 760px; margin: 64px auto 0; padding: 0 24px;">

## The one idea

`Reactive()` transforms a class **once**: its getters become lazily-cached reactive
cells, its methods become lazily-bound functions — and instances stay **plain
objects**. You declare state as getters that return `ref()` / `computed()`, and
read it with `.value`.

```ts
import { Reactive } from 'ivue'
import { ref, computed } from 'vue'

class $Counter {
  get count() { return ref(0) }
  get double() { return computed(() => this.count.value * 2) }
  inc() { this.count.value++ }
}

export const Counter = Reactive($Counter)

const c = new Counter()
c.inc()
c.count.value   // 1
c.double.value  // 2
```

That's the whole model. Everything else — inheritance, watching, teardown,
performance — falls out of it.

<div style="margin-top: 28px;">
  <span class="pill">100% test coverage</span>&nbsp;
  <span class="pill">no dependencies</span>&nbsp;
  <span class="pill">Vue 3.5 ready</span>
</div>

</div>
