# r/vuejs launch post

**Title:**

> The Options API everyone actually wanted: plain TypeScript classes with full Vue 3 reactivity, in 1.1 kB

**Body:**

I spent three years on one question: every framework bet on classes, then every framework dropped them. Why?

The bugs were real. `this` binding, mixin collisions, initialization order, decorators that broke on every TypeScript upgrade. But the diagnosis was wrong. Classes weren't broken, they were UNCONSTRAINED. Ten ways to do everything, and unconstrained variation is a bug farm. Functions won because they arrived with constraints. Nobody went looking for the ones classes need.

Something similar happened to the Options API. What we liked was never the buckets, it was that a component had a shape: you opened someone else's file and knew where state, derived values and actions lived. But the shape was fake. A plain object pretending to be a class, a proxied `this`, types TypeScript fought for years. Composition fixed the machinery and gave up the shape. Setup soup is the scar.

The shape was in the language the whole time.

```ts
class $Cart {
  get items() { 
    return shallowRef<CartItem[]>([]) 
  } // state: a ref-getter, cached per instance
  get subtotal() { 
    return this.items.value.reduce(sum, 0) 
  }  // derived: a plain getter, 0 bytes per instance
  addItem(item: CartItem) { 
    this.items.value = [...this.items.value, item] 
  }  // action: bound once, stable
}

export namespace Cart {
  export const Class = Reactive($Cart)
}
```

Sketching that shape is the easy part. Class reactivity has been attempted plenty of times, and each attempt died on one of the problems below. As a set they fight each other: the prototype transform that gives you inheritance is the same one that makes identity and types hard. The caching that makes reads cheap is what breaks `super` and teardown. Any one of them is easy alone. Getting them all to hold at once is where the three years went.

- **Bound methods.** `this.method` is always correct and always the same reference. Bind per instance and you allocate a function per method per object; don't bind and `this` breaks on detach. Here they stay on the prototype, bound on first use and cached after.
- **Reactive inheritance.** Deep `super.x.value` chains resolve level-safe, reactivity flowing through every layer. Prototype-based reactivity normally collides cached refs and breaks `super` outright.
- **Circular imports.** No more `Cannot access 'X' before initialization`, on first load or when hot reload reshuffles the order. Mutual references resolve whatever the load order.
- **Writable getter types.** `get x()` is read-only in TypeScript. Ref-returning getters re-declare as writable, and instances stay fully inferred.
- **Deterministic teardown.** `$stopEffects` scopes cleanup to the instance, and an instance that never watches allocates no effect scope at all.
- **Development parity.** One execution path in every environment, so what you measure locally is what ships.

`extends` and `super` work on derived values, which the Options API never managed. Instances stay plain objects, so creating 100k of them measures 55 to 253 times faster than `reactive(new X())` or a composable factory.

There is no ceiling to hit here. A ref-getter is a Vue ref, and a derived value is a native getter with no cache cell to allocate, so it costs less than `computed` rather than more. Build an entire app out of these and you come out ahead, not behind.

Most of your `computed`s go with it. In the Composition API a derived value almost always becomes `computed()`, and every one of those allocates a cache cell and a node in the dependency graph, per instance. Here it is a plain getter: reactive through the refs it reads, and nothing to own. `computed` stays for the three cases that earn it, which are expensive work, suppressing a render by value equality, and needing a stable ref handle. The largest codebase built this way, 108,000 lines of it, uses about ten `computed`s in total.

It adds no machinery of its own. `ref`, `watch`, lifecycle hooks and any composable you already use work inside the constructor, because the constructor runs in setup. So you can convert one component and leave the rest alone, or write the whole app this way. Nothing underneath changes either way.

The payoff shows up at scale. Composables compose into closures you can't see into. Constrained classes compose into an object graph you can walk, entities holding entities, a subclass specializing one node of it. Which turned out to matter for agents as much as for us. That 108,000-line codebase is a terminal IDE, and AI agents wrote it, following the same one page of rules a human reads. The shape gives them fewer ways to be wrong.

There is one page of rules, and if you don't hold them you get the old class mess back. The one people trip on first is in the template: you destructure the refs, never the plain getters, because a destructured getter is a dead snapshot. And some of you will bounce off the word "class" alone. That reflex was earned. It just isn't aimed at the right thing.

Three years in, the core is still 1.1 kB gzipped, zero dependencies, 100% coverage, and it creates instances faster than it did at the start. That isn't luck. It is what reasoning from what must be true does to a codebase: invariants delete code, features accumulate it.

`npm i ivue`, then convert one component. That is the whole trial: the file gets shorter, and the next person who opens it knows where everything lives. Docs, the benchmark method behind the numbers, and the demos, which are better opened than described: https://ivue.dev

What kept you on the Options API, or what pushed you off it? I have an answer for most of them by now, and I want the cases I haven't seen.
