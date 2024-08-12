<script lang="ts" setup>
import { ref } from 'vue';
import { ivue } from 'ivue';

interface CounterProps {
  initialCount: number;
}

interface CounterEmits {
  (e: 'increment', count: number): void;
}

const props = defineProps<CounterProps>();
const emit = defineEmits<CounterEmits>();

class Counter {
  constructor(public props: CounterProps, public emit: CounterEmits) {
    this.count = this.props.initialCount;
  }
  count = ref(0) as unknown as number;
  increment() {
    this.count++;
    this.emit('increment', this.count);
  }
}

/**
 * NOTICE that: ivue(ClassName, ...args) uses TypeScript to infer 
 * the correct argument types that you need to pass to the constructor.
 */
const counter = ivue(Counter, props, emit);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">Increment</a>
  Count: {{ counter.count }}
</template>
