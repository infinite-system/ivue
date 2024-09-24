<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ivue, iref, iuse } from 'ivue';

class Counter {
  constructor(public span?: HTMLElement) {
    // ❌ Do not do this in the constructor() because this.span 
    // still refers to this.span.value here:
    // onMounted(() => { 
    //   (this.span as HTMLElement /*❌*/).innerHTML = 'Initial span text!';
    // });
  }
  init() {
    // ✅ Do this inside init() because this.span (.value) is now
    // flattened & (this) is now reactive():
    onMounted(() => {
      (this.span as HTMLElement/*✅*/).innerHTML = 'Initial span text!';
    });
  }
  count = iref(0);
  increment() {
    this.count++;
    (this.span as HTMLElement).innerHTML = String(this.count + 1);
  }
}

const span = ref<HTMLElement>();

const counter = ivue(
  Counter,
  iuse(span)
);

defineExpose<Counter>(counter);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">Increment</a><br />
  Count: {{ counter.count }} <br />
  <span ref="span"></span>
</template>
