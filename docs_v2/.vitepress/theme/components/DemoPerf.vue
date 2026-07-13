<script setup lang="ts">
import { ref } from 'vue';
import DemoBox from './DemoBox.vue';
import {
  benchIvue,
  benchReactive,
  benchComposable,
} from '@examples/benchmarks/creationBench';

const ivueMs = ref<number | null>(null);
const reactiveMs = ref<number | null>(null);
const composableMs = ref<number | null>(null);
const running = ref(false);

async function run() {
  running.value = true;
  ivueMs.value = reactiveMs.value = composableMs.value = null;
  // let the button paint before blocking
  await new Promise((resolve) => setTimeout(resolve, 30));
  ivueMs.value = benchIvue();
  await new Promise((resolve) => setTimeout(resolve, 30));
  reactiveMs.value = benchReactive();
  await new Promise((resolve) => setTimeout(resolve, 30));
  composableMs.value = benchComposable();
  running.value = false;
}

const fmt = (v: number | null) => (v === null ? '·' : `${v.toFixed(1)} ms`);
const ratio = (v: number | null) =>
  v === null || ivueMs.value === null || ivueMs.value === 0
    ? ''
    : `${(v / ivueMs.value).toFixed(1)}× slower`;
</script>

<template>
  <DemoBox
    title="Create 100,000 instances, in your browser"
    note="Same shape for all three: two state values and a derived area. Numbers depend on your machine. The ratio is the point."
  >
    <div class="d-vals">
      <div>
        <div class="d-k">ivue &middot; new Class()</div>
        <div class="d-n grad">{{ fmt(ivueMs) }}</div>
      </div>
      <div>
        <div class="d-k">reactive(new X()) <span v-if="reactiveMs !== null">&middot; {{ ratio(reactiveMs) }}</span></div>
        <div class="d-n">{{ fmt(reactiveMs) }}</div>
      </div>
      <div>
        <div class="d-k">composable factory <span v-if="composableMs !== null">&middot; {{ ratio(composableMs) }}</span></div>
        <div class="d-n">{{ fmt(composableMs) }}</div>
      </div>
    </div>
    <div class="d-row">
      <button class="d-btn primary" type="button" :disabled="running" @click="run">
        {{ running ? 'Running…' : ivueMs === null ? 'Run the benchmark' : 'Run again' }}
      </button>
    </div>
  </DemoBox>
</template>
