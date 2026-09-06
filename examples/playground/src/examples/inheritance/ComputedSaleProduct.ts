// ComputedSaleProduct.ts — level 2: caches its refinement of the parent cell.
import { computed, ref } from 'vue';
import { Reactive } from '../../ivue';
import { ComputedProduct } from './ComputedProduct';

class $ComputedSaleProduct extends ComputedProduct.$Class {

  get discount() {
    return ref(0.2);
  }

  // computed: stable-handle — caches its refinement of the parent cell
  override get total() {
    return computed(() => this.computeDiscountedTotal());
  }

  get baseTotal() {
    return super.total.value;
  }

  computeDiscountedTotal() {
    return super.total.value * (1 - this.discount.value);
  }

  baseTotalCell() {
    return super.total;
  }
}

export namespace ComputedSaleProduct {
  export const $Class = $ComputedSaleProduct;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
