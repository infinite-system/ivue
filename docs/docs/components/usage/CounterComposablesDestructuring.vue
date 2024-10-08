<script setup lang="ts">
// @include: useCustomMouse
// ---cut---
import { ivue, iuse, iref, type Use } from 'ivue';
import { useCustomMouse } from '@/components/usage/functions/useCustomMouse';

/**
 * Use the ivue Utility Type: Use<typeof YourComposableFunctionName>
 * to get he resulting unwrapped composable properties and functions.
 */
type UseCustomMouse = Use<typeof useCustomMouse>;

class Counter {
  count = iref(0);

  increment() {
    this.count++;
  }

  /**
   * 'x', 'y', 'sum', 'total' are Refs that will be unwrapped to their bare raw types and destructured into the class.
   * Even though unwrapped (de-Refed), they will maintain their behavior as Refs and thus will maintain reactivity
   * and at the same time get destructured into this class root level scope because
   * Vue 3's `reactive()` Proxy will be able to resolve those Refs internally.
   */
  x: UseCustomMouse['x']; // Unwrapped Ref<number> becomes -> number
  y: UseCustomMouse['y']; // Unwrapped Ref<number> becomes -> number

  sum: UseCustomMouse['sum']; // 'sum' method that will be destructured into this class on construct()
  total: UseCustomMouse['total']; // 'total' computed Ref that will also be destructured into this class on construct()

  constructor() {
    ({
      x: this.x,
      y: this.y,
      sum: this.sum,
      total: this.total,
    } = iuse(useCustomMouse, 5));
  }
}

const counter = ivue(Counter);
</script>
<template>
  Count: {{ counter.count }} <br />
  <a href="javascript:void(0)" @click="() => counter.increment()">
    Increment
  </a><br />
  Mouse X: {{ counter.x }}, Y: {{ counter.y }}
  <br />
  Total (computed): {{ counter.total }}
  <br />
  <button class="button" @click="() => counter.sum()">
    Click This Big Sum Button To Total X + Y
  </button>
</template>
