// Box.ts — the ivue arm of the creation benchmark: the same three-member
// shape the other arms mirror (two state values, one derived area).
import { ref } from 'vue';
import { Reactive } from '../../ivue';

class $Box {
  get w() {
    return ref(1);
  }
  get h() {
    return ref(2);
  }
  get area() {
    return this.w.value * this.h.value;
  }
}

export namespace Box {
  export const $Class = $Box; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}
