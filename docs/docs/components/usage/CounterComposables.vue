<script setup lang="ts">
import { useMouse } from '@vueuse/core';
import { ivue, iref, iuse } from '../../../../src/index';

class Counter {
  count = iref(0);
  increment() {
    this.count++;
  }
  mouse = iuse(useMouse());
}

const counter = ivue(Counter);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">Increment</a>
  Count: {{ counter.count }} <br />
  Mouse: X: {{ counter.mouse.x }}, Y: {{ counter.mouse.y }}
</template>
