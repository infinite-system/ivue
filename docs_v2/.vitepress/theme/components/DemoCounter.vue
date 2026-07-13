<script setup lang="ts">
import { ref } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import DemoBox from './DemoBox.vue';

class $Counter {
  get count() {
    return ref(0);
  }
  // Derived value: a plain getter. No computed() needed for simple math.
  get double() {
    return this.count.value * 2;
  }
  increment() {
    this.count.value++;
  }
  reset() {
    this.count.value = 0;
  }
}
const Counter = Reactive($Counter);
const counter: any = new Counter();
// the state destructure
const { count } = counter;
</script>

<template>
  <DemoBox
    title="Your first class, running"
    note="double is a plain getter, not a computed(). It re-derives whenever the component renders."
  >
    <div class="d-vals">
      <div>
        <div class="d-k">count</div>
        <div class="d-n">{{ count }}</div>
      </div>
      <div>
        <div class="d-k">double &middot; plain getter</div>
        <div class="d-n grad">{{ counter.double }}</div>
      </div>
    </div>
    <div class="d-row">
      <button class="d-btn primary" type="button" @click="counter.increment">+1</button>
      <button class="d-btn" type="button" @click="counter.reset">Reset</button>
    </div>
  </DemoBox>
</template>
