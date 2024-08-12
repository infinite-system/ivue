<script setup lang="ts">
import { ref } from 'vue';
import { ivue } from 'ivue';

class Counter {
  count = ref(0) as unknown as number;
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
