// ComputedProduct.ts — level 1: memoizes the base total.
import { computed, ref } from 'vue';
import { Reactive } from '../../ivue';

class $ComputedProduct {
  get price() {
    return ref(48);
  }

  get total() {
    return computed(() => this.price.value);
  }
}

export namespace ComputedProduct {
  export const $Class = $ComputedProduct;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
