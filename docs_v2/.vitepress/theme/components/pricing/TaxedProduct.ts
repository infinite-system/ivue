// TaxedProduct.ts — level 3: adds tax on top of the discounted total.
import { Reactive } from '../../../../../lib/Reactive';
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
