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
  <a href="javascript:void(0)" @click="() => counter.increment()">Increment</a>
  Count: {{ counter.count }}
</template>
