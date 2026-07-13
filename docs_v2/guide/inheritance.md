---
title: Inheritance & super
description: A real three-file hierarchy under the namespace pattern — plain-getter chains through super, same-name computeds that never collide, a receipt built level by level, and import cycles solved by construction.
---

# Inheritance & `super`

Reactive classes inherit like native classes — any depth, across files.
Refs, plain getters, computeds, methods and `super` all resolve correctly
through the chain, because instances **are** native objects with a
transformed prototype chain.

The best way to see it is a hierarchy doing real work — a pricing chain.
`Product` knows its price. `SaleProduct` applies a discount. `TaxedProduct`
adds tax. Each level refines `total` through `super` and appends its own
line to the receipt.

## Three levels, three files

Each file exports the [namespace pattern](/guide/modules): the raw class for
extending, the reactive class for instantiating.

::: code-group

```ts [Product.ts]
// Product.ts
import { Reactive } from 'ivue';
import { ref } from 'vue';

class $Product {
  get title() {
    return ref('Mechanical keyboard');
  }
  get price() {
    return ref(48);
  }

  get total(): number {
    return this.price.value;
  }

  receipt(): string[] {
    return [`${this.title.value} — $${this.price.value.toFixed(2)}`];
  }
}

export namespace Product {
  export const $Class = $Product; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
```

```ts [SaleProduct.ts]
// SaleProduct.ts
import { Reactive } from 'ivue';
import { ref } from 'vue';
import { Product } from './Product';

class $SaleProduct extends Product.$Class {
  get discount() {
    return ref(0.2);
  }

  get total(): number {
    return super.total * (1 - this.discount.value);
  }

  receipt(): string[] {
    return [
      ...super.receipt(),
      `sale −${Math.round(this.discount.value * 100)}%`,
    ];
  }
}

export namespace SaleProduct {
  export const $Class = $SaleProduct;
  export const Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

```ts [TaxedProduct.ts]
// TaxedProduct.ts
import { Reactive } from 'ivue';
import { ref } from 'vue';
import { SaleProduct } from './SaleProduct';

class $TaxedProduct extends SaleProduct.$Class {
  get taxRate() {
    return ref(0.1);
  }

  get total(): number {
    return super.total * (1 + this.taxRate.value);
  }

  receipt(): string[] {
    return [
      ...super.receipt(),
      `tax +${Math.round(this.taxRate.value * 100)}%`,
      `due — $${this.total.toFixed(2)}`,
    ];
  }
}

export namespace TaxedProduct {
  export const $Class = $TaxedProduct;
  export const Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

:::

Each level is made of the three shapes every ivue class is made of, and each
shape chains through `super` natively: **state** as ref-getters (`price`,
`discount`, `taxRate` — each level owns its own), a **derivation** as a plain
getter (`total` — each level refines `super.total`), and a **method**
(`receipt` — each level extends `super.receipt()`).

## One instance, every level live

```ts
const product = new TaxedProduct.Class();

product.total     // 42.24 — 48 × 0.80 × 1.10
product.receipt();
// [ 'Mechanical keyboard — $48.00',
//   'sale −20%',
//   'tax +10%',
//   'due — $42.24' ]

product.price.value = 60;     // write to the GRANDPARENT's ref
product.total                 // 52.80 — the whole chain re-derived

product.discount.value = 0.5; // write to the middle level
product.total                 // 33.00
```

Look at what `total` is: a **plain-getter chain**, three levels deep, zero
`computed()` allocations, nothing stored per instance — and fully reactive.
Any effect that reads `product.total` reads `price`, `discount` and
`taxRate` underneath and subscribes to all three, straight through the
chain ([derive with plain getters](/guide/state#derived-values-plain-getters-first)).
A template showing the receipt re-renders on a write to any level:

<DemoInheritance />

The demo runs the exact three files above — they live in the
[playground](https://github.com/infinite-system/ivue/tree/main/examples/playground)
as `Product.ts`, `SaleProduct.ts` and `TaxedProduct.ts` and are imported the
same way you would in an app.

## Each level is a complete class

A middle class isn't scaffolding — it's a usable reactive class of its own:

```ts
const saleProduct = new SaleProduct.Class();

saleProduct.total     // 38.40 — discounted, never taxed
saleProduct.receipt() // two lines, not four
```

## Same-name computeds never collide

When levels *do* memoize — an expensive derivation refined at more than one
level — the child's computed calls the parent's through `super`, and both
live on the same instance:

```ts
class $Report {
  get rows() {
    return shallowRef<Row[]>([]);
  }
  get stats() {
    return computed(() => this.summarize()); // expensive scan: memoize
  }
  summarize(): Stats {
    /* ... */
  }
}

class $YearReport extends $Report {
  get stats() {
    return computed(() => this.withTotals(super.stats.value));
  }
  withTotals(stats: Stats): Stats {
    /* ... */
  }
}
```

This works because of how the cache is keyed: when `Reactive()` processes
the prototype chain, each `(prototype, key)` pair gets its **own cache
symbol** on the instance. `$Report`'s `stats` and `$YearReport`'s `stats`
are different cells — the child's cached computed and the `super` computed
it reads coexist instead of overwriting each other. No configuration; it's
structural.

## Files, cycles, hot reload — solved underneath

Cross-file hierarchies are the normal case, and the namespace pattern makes
them boring:

- **Every file calls `Reactive()` on its own class — safely.** The transform
  is idempotent: when `TaxedProduct.ts` processes its chain, `$SaleProduct`
  and `$Product` are already done and get skipped. Any load order produces
  the identical result.
- **Hot reload never desyncs.** Editing `SaleProduct.ts` re-runs only that
  file's `Reactive()` call; ancestors keep their processed prototypes and
  live instances keep their state ([HMR](/guide/hmr)).
- **Import cycles are solved fundamentally, not managed.** Hierarchies grow
  into webs — products reference carts, carts create products — and webs
  eventually close into cycles. Under the namespace pattern every
  cross-module reference lives in a getter or method body: code that runs at
  **first access**, when every module in the cycle finished loading long
  ago. The immunity is structural, in any load order — not an
  import-ordering discipline you have to maintain
  ([Circular imports: immune by construction](/guide/modules#circular-imports-immune-by-construction)).

## One difference from native JS

ivue follows **native JS** accessor semantics: a setter-only accessor on a
child shadows an inherited getter. So *splitting* a `get` on one level and a
`set` on another (which some engines merge into one computed) does **not**
merge in ivue.

In ivue you don't need to split — writable derived state is one getter
returning a writable computed:

```ts
class $Thermostat {
  get celsius() {
    return ref(20);
  }
  get fahrenheit() {
    return computed({
      get: () => this.celsius.value * 9 / 5 + 32,
      set: (fahrenheit: number) => {
        this.celsius.value = ((fahrenheit - 32) * 5) / 9;
      },
    });
  }
}
```

Everything else — overrides, `super`, reactivity through the chain — matches
native class semantics exactly.
