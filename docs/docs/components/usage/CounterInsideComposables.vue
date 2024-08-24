<script setup lang="ts">
import { ivue, iref } from 'ivue';

class Counter {
  count = iref(0);
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
  <a href="javascript:void(0)" @click="increment">
    Increment
  </a>
  Count: {{ count }} <br />
</template>
