<script setup lang="ts">
import { ref } from 'vue';
import { ivue, iref, iuse } from 'ivue';

class Counter {
  constructor(public span?: HTMLElement) {}
  count = iref(0);
  increment() {
    this.count++;
    (this.span as HTMLElement).innerHTML = String(this.count + 1);
  }
}

const span = ref<HTMLElement>();
const counter = ivue(Counter, iuse(span));

defineExpose<Counter>(counter);
</script>
<template>
  <button @click="() => counter.increment()">
    Count: {{ counter.count }} + 1 = <span ref="span"></span>
  </button>
</template>
