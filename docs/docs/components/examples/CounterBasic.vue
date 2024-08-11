<script lang="ts" setup>
import { ref } from 'vue';
import { ivue } from 'ivue';

class Counter {
  count = ref(0) as unknown as number;
  increment() {
    this.count++;
  }
}

const counter = ivue(Counter);
</script>
<template>
  <a href="javascript:void" @click="() => counter.increment()">Increment</a>
  Count: {{ counter.count }}
</template>
