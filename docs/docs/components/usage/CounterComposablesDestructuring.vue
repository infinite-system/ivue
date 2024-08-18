<script setup lang="ts">
import { useCustomMouse } from './functions/useCustomMouse';

import { ivue, iuse, iref, type UseComposable } from 'ivue';

/**
 * Use the ivue Utility Type: UseComposable<typeof YourComposableFunctionName>
 * to get he resulting unwrapped composable properties and functions.
 */
type UseMouse = UseComposable<typeof useCustomMouse>;

class Counter {
  count = iref(0);

  increment() {
    this.count++;
  }

  // x, y are Refs that will be unwrapped and destructured into this class
  x: UseMouse['x']; // Unwrapped Ref<number> becomes -> number
  y: UseMouse['y']; // Unwrapped Ref<number> becomes -> number
  
  sum: UseMouse['sum']; // 'sum' method that will be destructured into this class on construct()
  total: UseMouse['total'];  // 'total' computed Ref that will also be destructured into this class on construct()

  constructor() {
    ({
      x: this.x,
      y: this.y,
      sum: this.sum,
      total: this.total
    } = iuse(useCustomMouse()));
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
  <button class="button" @click="() => counter.sum()">Click This Big Sum Button To Total X + Y</button>
</template>
