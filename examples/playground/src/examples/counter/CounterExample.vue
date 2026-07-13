<script setup lang="ts">
import { Counter } from './Counter';

const counter = new Counter.Class();

// the state destructure
const {
  // state refs
  count,
} = counter;
</script>

<template>
  <div class="pane">
    <p class="note">
      double is a plain getter, not a computed(). It re-derives whenever the
      component renders.
    </p>
    <div class="vals">
      <div>
        <div class="k">count</div>
        <div class="n">{{ count }}</div>
      </div>
      <div>
        <div class="k">double · plain getter</div>
        <div class="n grad">{{ counter.double }}</div>
      </div>
    </div>
    <div class="row">
      <button class="btn primary" type="button" @click="counter.increment()">
        +1
      </button>
      <button class="btn" type="button" @click="counter.reset()">Reset</button>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>
