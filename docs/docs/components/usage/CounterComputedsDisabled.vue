<script setup lang="ts">
import { ivue, iref } from 'ivue';

class Counter {
  /**
   * Use static ivue property to disable computed 
   * behavior for certain getters.
   */
  static ivue = {
    doubleCount: false // doubleCount is a regular getter now
  }
  count = iref(0);
  increment() {
    this.count++;
  }
  get doubleCount() {
    return this.count * 2;
  }
  get quadCount() {
    return this.doubleCount * 2;
  }
}

const counter = ivue(Counter);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">Increment</a>
  Count: {{ counter.count }} <br />
  Double Count: {{ counter.doubleCount }} <br />
  Quad Count: {{ counter.quadCount }} <br />
</template>
