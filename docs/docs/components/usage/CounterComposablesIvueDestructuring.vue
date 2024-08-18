<script setup lang="ts">
import { CustomMouse } from './classes/CustomMouse';

import { ivue, iref, iuse } from 'ivue';

class Counter {
  count = iref(0);

  increment() {
    this.count++;
  }

  // x, y are Refs that will be unwrapped and destructured into this class
  x: CustomMouse['x']; // Unwrapped Ref<number> becomes -> number
  y: CustomMouse['y']; // Unwrapped Ref<number> becomes -> number
  total: CustomMouse['total']; // Unwrapped Ref<number> becomes -> number

  constructor() {
    ({
      x: this.x,
      y: this.y,
      total: this.total,
    } = iuse(CustomMouse, 5));
  }
}

const counter = ivue(Counter);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">Increment</a>
  Count: {{ counter.count }} <br />
  Mouse X: {{ counter.x }}, Y: {{ counter.y }}
  <br />
  Total (computed): {{ counter.total }}
  <br />
</template>
