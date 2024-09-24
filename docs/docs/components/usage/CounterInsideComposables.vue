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
  return ivue(Counter).toRefs();
}

const { count, increment } = useCounter();
</script>
<template>
  <button @click="() => increment()">
    Count: {{ count }}
  </button>
</template>
