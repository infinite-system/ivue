// SaleProduct.ts — level 2: applies a discount to whatever the parent says.
import { Reactive } from '../../ivue';
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
