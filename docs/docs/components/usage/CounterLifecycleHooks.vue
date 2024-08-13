<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ivue } from 'ivue';

class Counter {
  init() {
    onMounted(() => {
      this.count = 100;
    });
  }
  count = ref(0) as unknown as number;
  increment() {
    this.count++;
  }
}

const counter = ivue(Counter);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">Increment</a>
  Count: {{ counter.count }} (onMounted we set it to 100)
</template>
