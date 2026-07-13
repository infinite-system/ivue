<script setup lang="ts">
import { ref } from 'vue';
import {
  INSTANCE_COUNT,
  benchIvue,
  benchReactive,
  benchComposable,
} from './creationBench';

const ivueMs = ref<number | null>(null);
const reactiveMs = ref<number | null>(null);
const composableMs = ref<number | null>(null);
const running = ref(false);

const CALL_COUNT = 200_000;
const boxCreationMs = ref<number | null>(null);
const methodMs = ref<number | null>(null);
const boxRunning = ref(false);

async function runCreation() {
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

async function runInteractiveBox() {
  boxRunning.value = true;
  await new Promise((resolve) => setTimeout(resolve, 30));
  const { InteractiveBox } = await import('./model/InteractiveBox');

  // 1. creation — instances retained in an array, nothing elidable
  const instances = new Array(INSTANCE_COUNT);
  const creationStart = performance.now();
  for (let index = 0; index < INSTANCE_COUNT; index++) {
    instances[index] = new InteractiveBox.Class({ id: index });
  }
  boxCreationMs.value = performance.now() - creationStart;
  let alive = 0;
  for (let index = 0; index < INSTANCE_COUNT; index += 997) {
    if (instances[index]) alive++;
  }
  if (alive < 0) throw new Error('unreachable');

  // 2. method dispatch — one instance, a prototype-bound method, N calls
  const benchmarkInstance = instances[0];
  const methodStart = performance.now();
  for (let index = 0; index < CALL_COUNT; index++) {
    benchmarkInstance.calculatePhysics();
  }
  methodMs.value = performance.now() - methodStart;
  boxRunning.value = false;
}

const fmt = (value: number | null) =>
  value === null ? '—' : `${value.toFixed(1)} ms`;
const ratio = (value: number | null) =>
  value === null || ivueMs.value === null || ivueMs.value === 0
    ? ''
    : `${(value / ivueMs.value).toFixed(1)}× slower`;
</script>

<template>
  <div class="pane">
    <p class="note">
      Same shape for all three: two state values and a derived area. Numbers
      depend on your machine — the ratio is the point. Every instance is
      retained and touched after timing so the JIT cannot elide the work.
    </p>
    <div class="vals">
      <div>
        <div class="k">ivue · new Class()</div>
        <div class="n grad">{{ fmt(ivueMs) }}</div>
      </div>
      <div>
        <div class="k">
          reactive(new X())
          <span v-if="reactiveMs !== null">· {{ ratio(reactiveMs) }}</span>
        </div>
        <div class="n">{{ fmt(reactiveMs) }}</div>
      </div>
      <div>
        <div class="k">
          composable factory
          <span v-if="composableMs !== null">· {{ ratio(composableMs) }}</span>
        </div>
        <div class="n">{{ fmt(composableMs) }}</div>
      </div>
    </div>
    <div class="row">
      <button
        class="btn primary"
        type="button"
        :disabled="running"
        @click="runCreation"
      >
        {{
          running
            ? 'Running…'
            : ivueMs === null
              ? `Create ${INSTANCE_COUNT.toLocaleString()} instances`
              : 'Run again'
        }}
      </button>
    </div>

    <p class="note" style="margin-top: 28px">
      InteractiveBox is a three-level Reactive() hierarchy hosting a
      composable. Creation stays plain-object cheap because nothing
      materializes until first access; the method benchmark hammers a
      prototype-bound method with reactive reads inside.
    </p>
    <div class="vals">
      <div>
        <div class="k">
          create {{ INSTANCE_COUNT.toLocaleString() }} InteractiveBoxes
        </div>
        <div class="n grad">{{ fmt(boxCreationMs) }}</div>
      </div>
      <div>
        <div class="k">{{ CALL_COUNT.toLocaleString() }} method calls</div>
        <div class="n">{{ fmt(methodMs) }}</div>
      </div>
    </div>
    <div class="row">
      <button
        class="btn primary"
        type="button"
        :disabled="boxRunning"
        @click="runInteractiveBox"
      >
        {{
          boxRunning
            ? 'Running…'
            : boxCreationMs === null
              ? 'Run the hierarchy benchmark'
              : 'Run again'
        }}
      </button>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>
