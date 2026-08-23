---
title: Inheritance & super
description: A real three-file hierarchy under the namespace pattern — plain-getter chains through super, same-name computeds that never collide, a receipt built level by level, and import cycles solved by construction.
relatedPosts: [inheritance-exile, circular-imports-dissolved]
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
  export let Class = Reactive($Class); // reactive — you `new` this
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
  export let Class = Reactive($Class);
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
  export let Class = Reactive($Class);
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
[playground on GitHub](https://github.com/infinite-system/ivue/tree/main/examples/playground)
as `Product.ts`, `SaleProduct.ts` and `TaxedProduct.ts` and are imported the
same way you would in an app.

## The same chain, cached at every level

The first hierarchy deliberately chooses plain getters because its arithmetic
is cheap. When a derivation is expensive enough to memoize, inheritance keeps
the same native shape: every level returns a `computed()`, and the child reads
the parent's cached cell through `super.total.value`.

::: code-group
<<< ../../examples/playground/src/examples/inheritance/ComputedProduct.ts [ComputedProduct.ts]
<<< ../../examples/playground/src/examples/inheritance/ComputedSaleProduct.ts [ComputedSaleProduct.ts]
<<< ../../examples/playground/src/examples/inheritance/ComputedTaxedProduct.ts [ComputedTaxedProduct.ts]
:::

The deepest instance now contains **three different computeds named `total`**:

```ts
const product = new ComputedTaxedProduct.Class();

product.baseTotal          // 48.00 — ComputedProduct.total
product.discountedTotal    // 38.40 — ComputedSaleProduct.total
product.total.value        // 42.24 — ComputedTaxedProduct.total
```

Each `(prototype, key)` pair receives its own cache symbol. The base,
discounted, and taxed cells coexist on the same object; `super.total.value`
selects the parent cell instead of resolving back to the child's override.
Changing price invalidates all three stages, changing discount invalidates the
last two, and changing tax invalidates only the final stage.

<DemoComputedInheritance />

Use the plain-getter version for cheap derivations and this computed version
when caching has measured value. The inheritance guarantee is identical; only
the cost model changes.

## Each level is a complete class

A middle class isn't scaffolding — it's a usable reactive class of its own:

```ts
const saleProduct = new SaleProduct.Class();

saleProduct.total     // 38.40 — discounted, never taxed
saleProduct.receipt() // two lines, not four
```

## Files and cycles — solved underneath

Cross-file hierarchies are the normal case, and the namespace pattern makes
them boring:

- **Every file calls `Reactive()` on its own class — safely.** The transform
  is idempotent: when `TaxedProduct.ts` processes its chain, `$SaleProduct`
  and `$Product` are already done and get skipped. Any load order produces
  the identical result.
- **Script edits rebuild coherently.** Vite and Vue reconstruct the affected
  owner from the newly evaluated hierarchy. Development uses the same
  `Reactive()` execution path as production ([Development & HMR](/guide/hmr)).
- **Import cycles are solved fundamentally, not managed.** Hierarchies grow
  into webs — products reference carts, carts create products — and webs
  eventually close into cycles. Under the namespace pattern every
  cross-module reference lives in a getter or method body: code that runs at
  **first access**, when every module in the cycle finished loading long
  ago. The immunity is structural, in any load order — not an
  import-ordering discipline you have to maintain
  ([Circular references resolve by construction](/guide/modules#circular-references-resolve-by-construction)).

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
