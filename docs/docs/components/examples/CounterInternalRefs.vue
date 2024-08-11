<script lang="ts" setup>
import { ref } from 'vue';
import { ivue } from 'ivue';

class Counter {
  count = ref(0) as unknown as number;
  span = ref(null) as unknown as HTMLElement | null;
  increment() {
    this.count++;
    (this.span as HTMLElement).innerHTML = String(this.count + 1);
  }
}

const counter = ivue(Counter);
const { span } = counter.toRefs(['span']);
/**
 * Or you can use `const { span } = counter.toRefs();`
 * but `const { span } = counter.toRefs(['span']);` is more performant
 * because we are only looping through 1 property instead of all of them.
 */ 
</script>
<template>
  <a href="javascript:void" @click="() => counter.increment()">Increment</a>
  Count: {{ counter.count }}
  <span ref="span"></span>
</template>
