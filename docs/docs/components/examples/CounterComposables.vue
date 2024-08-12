<script lang="ts" setup>
import { ref } from 'vue';
import { ivue, UnwrapComposable } from 'ivue';
import { useMouse } from '@vueuse/core';

class Counter {
  count = ref(0) as unknown as number;
  increment() {
    this.count++;
  }
  mouse = useMouse() as unknown as UnwrapComposable<typeof useMouse>
}

const counter = ivue(Counter);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">Increment</a>
  Count: {{ counter.count }} <br />
  Mouse: X: {{ counter.mouse.x }}, Y: {{ counter.mouse.y }}
</template>
