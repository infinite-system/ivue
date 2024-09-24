<script setup lang="ts">
import { CustomMouse } from './classes/CustomMouse';

import { ivue, iref } from 'ivue';

class Counter {
  count = iref(0);

  increment() {
    this.count++;
  }

  mouse = ivue(CustomMouse, 5);
}

const counter = ivue(Counter);
</script>
<template>
  Count: {{ counter.count }} <br />
  <a href="javascript:void(0)" @click="() => counter.increment()">
    Increment
  </a><br />
  Mouse X: {{ counter.mouse.x }}, Y: {{ counter.mouse.y }}
  <br />
  Total (computed): {{ counter.mouse.total }}
  <br />
  <button class="button" @click="() => counter.mouse.sum()">
    Click This Big Sum Button To Total X + Y
  </button>
</template>
