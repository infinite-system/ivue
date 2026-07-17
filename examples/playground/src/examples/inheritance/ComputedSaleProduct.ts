// ComputedSaleProduct.ts — level 2: caches its refinement of the parent cell.
import { computed, ref } from 'vue';
import { Reactive } from '../../ivue';
import { ComputedProduct } from './ComputedProduct';

class $ComputedSaleProduct extends ComputedProduct.$Class {
  get discount() {
    return ref(0.2);
  }

  get total() {
    return computed(() => super.total.value * (1 - this.discount.value));
  }

  get baseTotal() {
    return super.total.value;
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
