<script setup lang="ts">
import { ivue } from 'ivue';
import { ref } from 'vue';

/** 
 * See that only 'count', 'increment' properties are picked 
 * for the define expose interface. 
 */
export type CounterExposed = Pick<Counter, 'count' | 'increment'>;

class Counter {
  count = ref(0) as unknown as number;
  increment() {
    this.count++;
  }
  decrement() {
    this.count--;
  }
}

const counter = ivue(Counter);

defineExpose<CounterExposed>(counter);
</script>
<template>Count: {{ counter.count }}</template>
