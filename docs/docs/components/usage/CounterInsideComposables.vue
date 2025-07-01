<script setup lang="ts">
// @filename: node_modules/@types/ivue/index.d.ts
// @include: ivue
// ---cut---
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
