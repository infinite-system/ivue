<script setup lang="ts">
import { ivue, iref } from 'ivue';

/** 
 * See that only 'count', 'increment' properties are picked 
 * for the define expose interface. 
 */
export type CounterExposed = Pick<Counter, 'count' | 'increment'>;

class Counter {
  count = iref(0);
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
