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
const ivueMs = ref<number | null>(null);
const reactiveMs = ref<number | null>(null);
const composableMs = ref<number | null>(null);
const running = ref(false);

// Every instance is retained in a pre-allocated array and touched after
// timing — the JIT cannot elide the allocations (a discarded `sink = ...`
// loop gets optimized away and reports fantasy numbers like 0.0 ms).
function bench(make: () => unknown): number {
  const instances = new Array(N);
  const t0 = performance.now();
  for (let i = 0; i < N; i++) instances[i] = make();
  const elapsed = performance.now() - t0;
  let alive = 0;
  for (let i = 0; i < N; i += 997) if (instances[i]) alive++;
  if (alive < 0) throw new Error('unreachable');
  return elapsed;
}

async function run() {
  running.value = true;
  ivueMs.value = reactiveMs.value = composableMs.value = null;
  // let the button paint before blocking
  await new Promise((resolve) => setTimeout(resolve, 30));
  ivueMs.value = bench(() => new V2());
  await new Promise((resolve) => setTimeout(resolve, 30));
  reactiveMs.value = bench(() => reactive(new Plain()));
  await new Promise((resolve) => setTimeout(resolve, 30));
  composableMs.value = bench(() => useBox());
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
