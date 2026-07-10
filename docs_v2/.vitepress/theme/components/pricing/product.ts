// product.ts — level 1: knows its title and price.
import { Reactive } from '../../../../../lib/Reactive';
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
  export const $Class = $Product;
  export const Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
