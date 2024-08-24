<script setup lang="ts">
import { CustomMouse } from './classes/CustomMouse';

import { ivue, iref } from 'ivue';

class Counter {
  count = iref(0);

  increment() {
    this.count++;
  }

  /**
   * 'x', 'y', 'total' are Refs that will be unwrapped to their bare raw types and destructured into the class.
   * Even though unwrapped (de-Refed), they will maintain their behavior as Refs and thus will maintain reactivity
   * and at the same time get destructured into this class root level scope because
   * Vue 3's `reactive()` Proxy will be able to resolve those Refs internally.
   */
  x: CustomMouse['x']; // Unwrapped Ref<number> becomes -> number
  y: CustomMouse['y']; // Unwrapped Ref<number> becomes -> number
  total: CustomMouse['total']; // Unwrapped ComputedRef<number> becomes -> number
  sum: CustomMouse['sum']; // Function remains a function

  constructor() {
    ({
      x: this.x,
      y: this.y,
      sum: this.sum,
      total: this.total,
    } = ivue(CustomMouse, 5).toRefs(true));
  }
}

const counter = ivue(Counter);
</script>
<template>
  <a href="javascript:void(0)" @click="() => counter.increment()">
    Increment
  </a>
  Count: {{ counter.count }} <br />
  Mouse X: {{ counter.x }}, Y: {{ counter.y }}
  <br />
  Total (computed): {{ counter.total }}
  <br />
  <button class="button" @click="() => counter.sum()">
    Click This Big Sum Button To Total X + Y
  </button>
</template>
