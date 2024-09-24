<script setup lang="ts">
import { ivue, iref } from 'ivue';

class Counter {
  count = iref(0);
  span = iref<HTMLElement>();
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
  Count: {{ counter.count }} <span ref="span"></span><br />
  <a href="javascript:void(0)" @click="() => counter.increment()">
    Increment
  </a>
</template>
