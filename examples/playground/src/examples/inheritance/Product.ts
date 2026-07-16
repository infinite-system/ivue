// Product.ts — level 1: knows its title and price.
import { Reactive } from '../../ivue';
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
