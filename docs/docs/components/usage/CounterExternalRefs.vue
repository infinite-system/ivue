<script setup lang="ts">
import { ref } from 'vue';
import { ivue } from 'ivue';

type SpanRef = HTMLElement | null;

class Counter {
  constructor(public span: SpanRef) {}
  count = ref(0) as unknown as number;
  increment() {
    this.count++;
    (this.span as HTMLElement).innerHTML = String(this.count + 1);
  }
}

const span = ref<SpanRef>();
const counter = ivue(Counter, span as unknown as SpanRef /** Unwrap Ref Manually */);

defineExpose<Counter>(counter);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">Increment</a>
  Count: {{ counter.count }} 
  <span ref="span"></span>
</template>
