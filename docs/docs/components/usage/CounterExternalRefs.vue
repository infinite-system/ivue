<script setup lang="ts">
import { ref } from 'vue';
import { ivue, iref, iuse } from 'ivue';

type SpanRef = HTMLElement | null;

class Counter {
  constructor(public span: SpanRef) {}
  count = iref(0);
  increment() {
    this.count++;
    (this.span as HTMLElement).innerHTML = String(this.count + 1);
  }
}

const span = ref<SpanRef>(null);
const counter = ivue(Counter, iuse(span));

defineExpose<Counter>(counter);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">Increment</a>
  Count: {{ counter.count }} 
  <span ref="span"></span>
</template>
