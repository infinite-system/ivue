---
venue: X
purpose: thread
lang: en
source: introducing-ivue
status: draft-for-review
---

# Your Vue objects can outlive the component that first used them

ivue, a **1.1 kB class layer over Vue's reactivity**, lets a plain TypeScript class be reactive state, a view-model, or a domain entity. The class is not the component. A component can construct it, but the object keeps its identity, methods, and lifetime.

```ts
class $Counter {
  get count() { return ref(0) }
  get double() { return this.count.value * 2 }
  increment() { this.count.value++ }
}
```

A getter that returns `ref()` becomes lazy state. It is created on first access and cached for that instance. A plain getter remains a plain getter: Vue tracks the leaf reads, so cheap derivations need no `computed()` allocation. Methods bind once and keep stable identity. Instances remain plain objects.

The useful rule is: pay for a capability when it is used.

Unread state does not allocate. A cheap derivation has no cache node. A hot path can avoid a proxy boundary. This is not minimal syntax. It is removing costs that would otherwise repeat per object or per read.

The receipts run in the browser on the shipped package:

- **1,000,000 instances in 22 ms**, with every instance retained; compared shapes took **6–132×** longer in that run.
- **100,000 observed instances in 364 MB**; closures used 2.1×, `reactive()` 2.8×, eager computeds 5.3× the heap in the compared model.
- **20,000,000 formula-capable cells at 4.7 bytes each**.

Hardware differs. The benchmark methods and runnable tests travel with the numbers.

Classes did not fail because objects are the wrong model. They failed when the class was welded to component lifecycle, when methods lost `this`, and when every reactive member paid eagerly. Those are design conditions, not a law of JavaScript.

The full post, live benchmarks, and install guide: https://ivue.dev/blog/introducing-ivue
