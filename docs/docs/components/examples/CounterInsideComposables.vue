<script setup lang="ts">
import { ref } from 'vue';
import { ivue } from 'ivue';

class Counter {
  count = ref(0) as unknown as number;
  increment() {
    this.count++;
  }
}

function useCounter() {
  /** Convert ivue Counter to a composable with .toRefs() */
  const { count, increment } = ivue(Counter).toRefs();

  return {
    count,
    increment,
  };
}

const { count, increment } = useCounter();
</script>
<template>
  <a href="javascript:void(0)" @click="increment">Increment</a>
  Count: {{ count }} <br />
</template>
