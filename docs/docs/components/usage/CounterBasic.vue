<script setup lang="ts">
import { ivue, iref } from 'ivue';

class Counter {
  count = iref(0);
  increment() {
    this.count++;
  }
}

const counter = ivue(Counter);
</script>
<template>
  <button @click="() => counter.increment()">
    Count: {{ counter.count }}
  </button>
</template>
