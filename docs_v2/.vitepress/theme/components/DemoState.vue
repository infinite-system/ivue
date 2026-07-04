<script setup lang="ts">
import { ref } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import DemoBox from './DemoBox.vue';

class $Box {
  get width() {
    return ref(120);
  }
  get height() {
    return ref(80);
  }
  // Plain derived getter: re-derives on render, costs nothing per instance.
  get area() {
    return this.width.value * this.height.value;
  }
  randomize() {
    this.width.value = 40 + Math.round(Math.random() * 200);
    this.height.value = 40 + Math.round(Math.random() * 160);
  }
}
const Box = Reactive($Box);
const b: any = new Box();
</script>

<template>
  <DemoBox
    title="Refs behind getters, derived by a plain getter"
    note="width and height are refs cached per instance. area is a plain getter that reads them, so it stays current with zero allocation."
  >
    <div class="d-vals">
      <div>
        <div class="d-k">width</div>
        <div class="d-n">{{ b.width.value }}</div>
      </div>
      <div>
        <div class="d-k">height</div>
        <div class="d-n">{{ b.height.value }}</div>
      </div>
      <div>
        <div class="d-k">area &middot; plain getter</div>
        <div class="d-n grad">{{ b.area.toLocaleString() }}</div>
      </div>
    </div>
    <div class="d-row">
      <input
        class="d-slider"
        type="range"
        min="40"
        max="240"
        v-model.number="b.width.value"
        aria-label="width"
      />
      <input
        class="d-slider"
        type="range"
        min="40"
        max="200"
        v-model.number="b.height.value"
        aria-label="height"
      />
      <button class="d-btn" type="button" @click="b.randomize">Randomize</button>
    </div>
  </DemoBox>
</template>
