<script setup lang="ts">
import { watch } from 'vue';
import { ivue, iref } from 'ivue';

class Counter {
  init() {
    /** Note that we use this.count as a reactive prop in the watch() function */
    watch(
      () => this.count,
      (newCount) => {
        if (newCount === 5) {
          alert('You already clicked 5 times!');
        }
      }
    );
  }
  count = iref(0);
  increment() {
    this.count++;
  }
}

const counter = ivue(Counter);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">
    Increment
  </a><br />
  Count: {{ counter.count }} (Click 5 times to get an alert)
</template>
