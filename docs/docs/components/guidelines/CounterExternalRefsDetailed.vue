<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ivue } from 'ivue';

type SpanRef = HTMLElement | null;

class Counter {
  constructor(public span: SpanRef) {
    // Do not do this in the constructor() because this.span 
    // still refers to this.span.value here:
    // onMounted(() => { 
    //   (this.span as HTMLElement /*❌*/).innerHTML = 'Initial span text!';
    // });
  }
  init() {
    // Do this inside init() because this.span (.value) is now
    // flattened & (this) is now reactive():
    onMounted(() => {
      (this.span as HTMLElement/*✅*/).innerHTML = 'Initial span text!';
    });
  }
  count = ref(0) as unknown as number;
  increment() {
    this.count++;
    (this.span as HTMLElement).innerHTML = String(this.count + 1);
  }
}

const span = ref<SpanRef>();
const counter = ivue(
  Counter,
  span as unknown as SpanRef /** Unwrap Ref Manually */
);

defineExpose<Counter>(counter);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">Increment</a>
  Count: {{ counter.count }} <br />
  <span ref="span"></span>
</template>
