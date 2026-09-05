// HeroCounter.ts — the landing hero's live counter: the real engine, not a
// mock. This file ships the same `Reactive()` the library does.
import { ref } from 'vue';
import { Reactive } from '../../../../lib/Reactive';

class $HeroCounter {
  get count() {
    return ref(0);
  }

  // Derived value: a plain getter. No computed() for simple math.
  get double() {
    return this.count.value * 2;
  }

  increment() {
    this.count.value++;
  }

  decrement() {
    this.count.value--;
  }

  reset() {
    this.count.value = 0;
  }
}

export namespace HeroCounter {
  export const $Class = $HeroCounter; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
