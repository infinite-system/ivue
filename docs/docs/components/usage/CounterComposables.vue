<script setup lang="ts">
import { useMouse, usePointer } from '@vueuse/core';
import { ivue, iref, iuse } from 'ivue';

class Counter {
  count = iref(0);
  increment() {
    this.count++;
  }
  mouse = iuse(useMouse);
  pointer = iuse(usePointer);
}

const counter = ivue(Counter);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">
    Increment
  </a>
  Count: {{ counter.count }} <br />
  <br />
  Mouse: <br />
  X: {{ counter.mouse.x }} <br />
  Y: {{ counter.mouse.y }} <br />
  <br />
  Pointer: <br />
  X: {{ counter.pointer.x }} <br />
  Y: {{ counter.pointer.y }} <br />
</template>
