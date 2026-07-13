// Counter.ts — the first class: one ref, one plain getter, two methods.
import { ref } from 'vue';
import { Reactive } from '../../ivue';

class $Counter {
  get count() {
    return ref(0);
  }

  // Derived value: a plain getter. No computed() needed for simple math.
  get double() {
    return this.count.value * 2;
  }

  increment() {
    this.count.value++;
  }

  reset() {
    this.count.value = 0;
  }
}

export namespace Counter {
  export const $Class = $Counter; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
