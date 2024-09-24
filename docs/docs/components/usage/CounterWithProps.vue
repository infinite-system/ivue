<script setup lang="ts">
import { ivue, iref } from 'ivue';

interface CounterProps {
  initialCount: number;
}
const props = defineProps<CounterProps>();

class Counter {
  constructor(public props: CounterProps) {
    this.count = this.props.initialCount;
  }
  count = iref(0);
  increment() {
    this.count++;
  }
}

/**
 * NOTICE that: ivue(ClassName, ...args) uses TypeScript to infer
 * the correct argument types that you need to pass to the constructor.
 */
const counter = ivue(Counter, props);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">
    Increment
  </a><br />
  Count: {{ counter.count }}
</template>
