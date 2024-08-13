<script setup lang="ts">
import { ref, watch } from 'vue';
import { ivue } from 'ivue';

class Counter {
  init() {
    /** Note that we use this.count as a reactive prop in the watch() function */
    watch(() => this.count, (newCount) => {
      if (newCount === 5) {
        alert('You already clicked 5 times!');
      }
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
  Count: {{ counter.count }} (Click 5 times to get an alert)
</template>
