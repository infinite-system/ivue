<script setup lang="ts">
import { onMounted } from 'vue';
import { ivue, iref } from 'ivue';

class Counter {
  init() {
    onMounted(() => {
      this.count = 100;
    });
  }
  count = iref(0);
  increment() {
    this.count++;
  }
}

const counter = ivue(Counter);
</script>
<template>
  Count: {{ counter.count }} (onMounted we set it to 100)<br />
  <a href="javascript:void(0)" @click="() => counter.increment()">
    Increment
  </a>
</template>
