<script setup lang="ts">
/**
 * The demo app's class/composable primitive benchmark, ported into the
 * docs. The model — InteractiveBox, a three-level Reactive() hierarchy
 * with a hosted composable — is imported dynamically on first run from
 * the playground's `benchmarks` example, unchanged; only this chrome lives here. Nothing
 * executes at build or on page load.
 */
import { ref } from 'vue';
import DemoBox from './DemoBox.vue';

const INSTANCE_COUNT = 100_000;
const CALL_COUNT = 200_000;

const creationMs = ref<number | null>(null);
const methodMs = ref<number | null>(null);
const isRunning = ref(false);

async function runBench() {
  isRunning.value = true;
  await new Promise((resolve) => setTimeout(resolve, 30)); // let the button paint
  const { InteractiveBox } = await import(
    '@examples/benchmarks/model/InteractiveBox'
  );

  // 1. creation — instances retained in an array, nothing elidable
  const instances = new Array(INSTANCE_COUNT);
  const creationStart = performance.now();
  for (let i = 0; i < INSTANCE_COUNT; i++) {
    instances[i] = new InteractiveBox.Class({ id: i });
  }
  creationMs.value = performance.now() - creationStart;
  let alive = 0;
  for (let i = 0; i < INSTANCE_COUNT; i += 997) if (instances[i]) alive++;
  if (alive < 0) throw new Error('unreachable');

  // 2. method dispatch — one instance, a prototype-bound method, N calls
  const benchmarkInstance = instances[0];
  const methodStart = performance.now();
  for (let i = 0; i < CALL_COUNT; i++) {
    benchmarkInstance.calculatePhysics();
  }
  methodMs.value = performance.now() - methodStart;
  isRunning.value = false;
}
</script>

<template>
  <DemoBox
    title="Creation & method dispatch — the primitives"
    note="InteractiveBox is a three-level Reactive() hierarchy hosting a composable. Creation stays plain-object cheap because nothing materializes until first access; the method benchmark hammers a prototype-bound method with reactive reads inside."
  >
    <div class="d-vals">
      <div>
        <div class="d-k">create {{ INSTANCE_COUNT.toLocaleString() }} instances</div>
        <div class="d-n grad">{{ creationMs === null ? '—' : creationMs.toFixed(1) + ' ms' }}</div>
      </div>
      <div>
        <div class="d-k">{{ CALL_COUNT.toLocaleString() }} method calls</div>
        <div class="d-n">{{ methodMs === null ? '—' : methodMs.toFixed(1) + ' ms' }}</div>
      </div>
    </div>
    <div class="d-row">
      <button class="d-btn primary" type="button" :disabled="isRunning" @click="runBench">
        {{ isRunning ? 'Running…' : creationMs === null ? 'Run the benchmark' : 'Run again' }}
      </button>
    </div>
  </DemoBox>
</template>
