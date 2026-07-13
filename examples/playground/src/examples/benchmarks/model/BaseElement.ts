import { computed as $, ref } from 'vue';
import { Reactive } from '../../../ivue';

class $BaseElement {
  // A simple reactive state for the base element
  get opacity() {
    return ref(1.0);
  }

  get tag() {
    return ref('div');
  }

  // A computed property that will be overridden by children
  get diagnosticSummary() {
    return $(() => `[Base: ${this.tag.value} (Op: ${this.opacity.value})]`);
  }

  // A basic update method
  refreshState() {
    this.opacity.value = parseFloat(Math.random().toFixed(2));
  }

  // A getter to test static inheritance chains
  get typeChain() {
    return 'BaseElement';
  }
}

export namespace BaseElement {
  export const $Class = $BaseElement; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}