// ComputedTaxedProduct.ts — level 3: caches tax over the middle-level cell.
import { computed, ref } from 'vue';
import { Reactive } from '../../ivue';
import { ComputedSaleProduct } from './ComputedSaleProduct';

class $ComputedTaxedProduct extends ComputedSaleProduct.$Class {

  get taxRate() {
    return ref(0.1);
  }

  // computed: stable-handle — caches tax over the middle-level cell
  override get total() {
    return computed(() => this.computeTaxedTotal());
  }

  get discountedTotal() {
    return super.total.value;
  }

  computeTaxedTotal() {
    return super.total.value * (1 + this.taxRate.value);
  }

  discountedTotalCell() {
    return super.total;
  }
}

export namespace ComputedTaxedProduct {
  export const $Class = $ComputedTaxedProduct;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
