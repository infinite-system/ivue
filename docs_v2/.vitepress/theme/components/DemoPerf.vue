<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import DemoBox from './DemoBox.vue';

class $V2 {
  get w() {
    return ref(1);
  }
  get h() {
    return ref(2);
  }
  get area() {
    return this.w.value * this.h.value;
  }
}
const V2 = Reactive($V2);

class Plain {
  w = 1;
  h = 2;
  get area() {
    return this.w * this.h;
  }
}
const useBox = () => {
  const w = ref(1);
  const h = ref(2);
  const area = computed(() => w.value * h.value);
  return { w, h, area };
};

const N = 100_000;
const v2ms = ref<number | null>(null);
const reactiveMs = ref<number | null>(null);
const composableMs = ref<number | null>(null);
const running = ref(false);

function bench(fn: () => void): number {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

async function run() {
  running.value = true;
  v2ms.value = reactiveMs.value = composableMs.value = null;
  // let the button paint before blocking
  await new Promise((r) => setTimeout(r, 30));
  let sink: any;
  v2ms.value = bench(() => {
    for (let i = 0; i < N; i++) sink = new V2();
  });
  await new Promise((r) => setTimeout(r, 30));
  reactiveMs.value = bench(() => {
    for (let i = 0; i < N; i++) sink = reactive(new Plain());
  });
  await new Promise((r) => setTimeout(r, 30));
  composableMs.value = bench(() => {
    for (let i = 0; i < N; i++) sink = useBox();
  });
  void sink;
  running.value = false;
}

const fmt = (v: number | null) => (v === null ? '·' : `${v.toFixed(1)} ms`);
const ratio = (v: number | null) =>
  v === null || v2ms.value === null || v2ms.value === 0
    ? ''
    : `${(v / v2ms.value).toFixed(0)}× slower`;
</script>

<template>
  <DemoBox
    title="Create 100,000 instances, in your browser"
    note="Same shape for all three: two state values and a derived area. Numbers depend on your machine. The ratio is the point."
  >
    <div class="d-vals">
      <div>
        <div class="d-k">v2 &middot; new Class()</div>
        <div class="d-n grad">{{ fmt(v2ms) }}</div>
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
        {{ running ? 'Running…' : v2ms === null ? 'Run the benchmark' : 'Run again' }}
      </button>
    </div>
  </DemoBox>
</template>
