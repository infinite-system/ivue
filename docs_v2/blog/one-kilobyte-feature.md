---
title: "One kilobyte is a feature"
description: 1.1 kB is not a compression achievement — it is what remains when a design stops needing machinery. Small enough to read, small enough to trust.
date: 2026-07
---

# One kilobyte is a feature

<BlogPostDate />

![One kilobyte is a feature](/blog/one-kilobyte-feature.png)

The whole ivue engine — lazy state, method binding, reactive inheritance
with `super`, teardown, and `$watch` — ships as **1,120 bytes gzipped**.
Zero dependencies. 100% test coverage, every metric, every file.

That number is not a compression trophy. It's a *diagnosis*. Size is what
a design weighs after you stop paying for machinery it never needed:

- No proxy per instance — instances are plain objects, so there is no
  proxy code.
- No eager anything — state materializes on first access, so there is no
  scheduler for work that never happens.
- No compiler — the transform is a one-time prototype rewrite at runtime,
  so there is no build-step apparatus riding along.
- No second development engine — local work exercises the same class identity,
  native construction, and direct method binding as production.

What a kilobyte buys you in practice is **auditability**. You can read
the entire engine before lunch and know — not trust, *know* — what
happens on every property access of every instance you create. When
something surprises you, the surface area of possible causes fits in one
file.

Zero dependencies extends the same property down the supply chain: there
is no transitive tree to audit, no lockfile churn, no upgrade that breaks
you from three levels below. The engine you read today is the engine that
runs next year. And the runtime consequences fall out of the same
subtraction.

## The model behind the benchmark

The benchmark below creates 100,000 instances — so here is exactly what
it creates, in full. `InteractiveBox` is a three-level `Reactive()`
hierarchy: reactive state at every level, `computed()` overrides that
chain through `super`, a writable computed, a hosted `useMouse()`
composable, and shared global state. These are the benchmark's actual
source files (`$` is `computed`, aliased):

::: code-group

```ts [model/InteractiveBox.ts]
import { useMouse } from '@vueuse/core';
import { computed, ref, shallowRef } from 'vue';
import { Reactive } from 'ivue';
import { Container, GlobalTheme } from './Container';

class $InteractiveBox extends Container.$Class {
  id: number;

  constructor(props: { id: number }) {
    super();
    this.id = props.id;
  }

  // Hosted composable — the private getter caches the hook per instance
  private get $mouse() {
    return useMouse();
  }

  get mouseX() {
    return this.$mouse.x;
  }
  get mouseY() {
    return this.$mouse.y;
  }

  get width() {
    return ref(100);
  }

  get height() {
    return ref(100);
  }

  get depth() {
    return shallowRef(10);
  }

  // Accessing the imported global state
  get globalTheme() {
    return GlobalTheme;
  }

  get area() {
    return computed(() => this.width.value * this.height.value);
  }

  // Override chains up: InteractiveBox -> Container -> BaseElement
  get diagnosticSummary() {
    return computed(
      () =>
        `[Box #${this.id} Area:${this.area.value}] >> ` +
        super.diagnosticSummary.value
    );
  }

  // Writable computed: get + set paired on one member
  get label() {
    return computed({
      get: () => `Box-${this.id} (${this.width.value}x${this.height.value})`,
      set: (val: string) => {
        const num = parseInt(val.replace(/\D/g, ''));
        if (!isNaN(num)) this.width.value = num;
      },
    });
  }

  refreshState() {
    super.refreshState(); // updates Base opacity, Container padding
    this.width.value = Math.floor(Math.random() * 500);
    this.height.value = Math.floor(Math.random() * 500);
    return true;
  }

  // The method benchmark hammers this: reactive reads inside math
  calculatePhysics() {
    return Math.sqrt(
      Math.pow(this.width.value, 2) + Math.pow(this.height.value, 2)
    ) * Math.random();
  }

  get typeChain() {
    return super.typeChain + ' -> InteractiveBox';
  }
}

export namespace InteractiveBox {
  export const $Class = $InteractiveBox;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

```ts [model/Container.ts]
import { computed, ref, watch } from 'vue';
import { Reactive } from 'ivue';
import { BaseElement } from './BaseElement';

// A shared global state (simulating global config)
export const GlobalTheme = ref({
  primaryColor: 'blue',
  scaleFactor: 1.0,
});

class $Container extends BaseElement.$Class {
  get padding() {
    return ref(10);
  }

  get scale() {
    return ref(1);
  }

  get layoutMode() {
    return ref('flex');
  }

  // INHERITANCE: overriding the computed — `super.diagnosticSummary.value`
  // carries reactivity up the chain
  get diagnosticSummary() {
    return computed(
      () =>
        `{Container: pad=${this.padding.value}} >> ` +
        super.diagnosticSummary.value
    );
  }

  // A computed derived from local state
  get layoutString() {
    return computed(
      () => `Display: ${this.layoutMode.value} | Scale: ${this.scale.value}`
    );
  }

  // Overriding the update method
  refreshState() {
    super.refreshState();
    this.padding.value = Math.floor(Math.random() * 50);
    this.scale.value = parseFloat((Math.random() * 2).toFixed(2));
    this.layoutMode.value = Math.random() > 0.5 ? 'grid' : 'flex';
  }

  get typeChain() {
    return super.typeChain + ' -> Container';
  }
}

export namespace Container {
  export const $Class = $Container;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

```ts [model/BaseElement.ts]
import { computed, ref } from 'vue';
import { Reactive } from 'ivue';

class $BaseElement {
  // A simple reactive state for the base element
  get opacity() {
    return ref(1.0);
  }

  get tag() {
    return ref('div');
  }

  // A computed property that will be overridden by children
  get diagnosticSummary() {
    return computed(() => `[Base: ${this.tag.value} (Op: ${this.opacity.value})]`);
  }

  // A basic update method
  refreshState() {
    this.opacity.value = parseFloat(Math.random().toFixed(2));
  }

  // A getter to test static inheritance chains
  get typeChain() {
    return 'BaseElement';
  }
}

export namespace BaseElement {
  export const $Class = $BaseElement; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
```

:::

Three levels, ~200 lines, nothing toy about it. Now create 100,000 of
them:

<CreationBench />

Every `new InteractiveBox.Class({ id })` allocates one plain object and
nothing else — no proxy, no eager cells, no scheduler. Look at what an
instance actually holds after construction: **one own property**,
`id`. Every other member across all three levels — the refs, the
computeds, the hosted composable — is a getter on the prototype, shared
by all 100,000 instances and weighing **zero bytes per instance** until
something reads it.

And that is measurable, not rhetorical. 100,000 plain `{ id }` object
literals against 100,000 `InteractiveBox` instances, heap delta after GC:

| 100,000 of…                    | heap      | per instance |
| ------------------------------ | --------- | ------------ |
| `{ id }` object literal        | 3.04 MB   | 31.9 bytes   |
| `new InteractiveBox.Class({ id })` | 3.08 MB | 32.2 bytes   |

The entire three-level reactive hierarchy costs **1.01×** a bare object
literal at creation. (Measured on Node 26 with `--expose-gc`, 100k
instances, stable across runs.) That is why creation is measured in
milliseconds: the work simply isn't there.

> Perfection is achieved, not when there is nothing more to add, but when
> there is nothing left to take away.

The subtraction is the product. [Fundamental Principles](/guide/principles) lists
what survived it.
