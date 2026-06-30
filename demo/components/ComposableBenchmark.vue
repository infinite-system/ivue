<script setup lang="ts">
import { ref, watch } from 'vue';
import { useItem } from './useItem';

const numItems = ref(100000);
const items = ref<ReturnType<typeof useItem>[]>([]);
const initTime = ref(0);

const numFuncRuns = ref(200000);
const funcRunTime = ref(0);

const { funcTest } = useItem({ id: 1 });

const createItems = () => {
  const startTime = performance.now();
  const newItems = [];
  for (let i = 0; i < numItems.value; i++) {
    newItems.push(useItem({ id: i }));
  }
  items.value = newItems;
  initTime.value = performance.now() - startTime;
  console.log(`Composable init time: ${initTime.value.toFixed(2)}ms`);
};

const runFuncTest = () => {
  const startTime = performance.now();
  for (let i = 0, j = numFuncRuns.value; i < j; i++) funcTest();
  funcRunTime.value = performance.now() - startTime;
};

document.title = 'Native Composable Benchmark';
watch(numItems, createItems, { immediate: true });
watch(numFuncRuns, runFuncTest, { immediate: true });
</script>

<template>
  <section class="space-y-8">
    <header class="space-y-2">
      <div
        class="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/30"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
        Native Vue 3 · hand-written composable
      </div>
      <h1 class="text-3xl font-extrabold tracking-tight text-white">Native Composable Benchmark</h1>
      <p class="max-w-2xl text-sm leading-relaxed text-slate-400">
        The idiomatic baseline: a factory that eagerly creates
        <code class="text-sky-300">ref()</code> and <code class="text-sky-300">computed()</code>
        per instance. Fast on first access, but every instance pays full setup up front.
      </p>
    </header>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div class="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur">
        <label class="text-xs uppercase tracking-wider text-slate-400">Instance count</label>
        <input
          type="number"
          v-model.number="numItems"
          class="mt-2 w-full rounded-lg bg-slate-900/60 px-3 py-2 text-white ring-1 ring-white/15 focus:outline-none focus:ring-sky-400/50"
        />
        <div class="mt-4 flex items-baseline gap-2">
          <span class="text-4xl font-extrabold tabular-nums text-sky-300">{{ initTime.toFixed(2) }}</span>
          <span class="text-sm text-slate-400">ms · {{ items.length.toLocaleString() }} instances</span>
        </div>
      </div>

      <div class="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur">
        <label class="text-xs uppercase tracking-wider text-slate-400">Function calls</label>
        <input
          type="number"
          v-model.number="numFuncRuns"
          class="mt-2 w-full rounded-lg bg-slate-900/60 px-3 py-2 text-white ring-1 ring-white/15 focus:outline-none focus:ring-sky-400/50"
        />
        <div class="mt-4 flex items-center gap-3">
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-extrabold tabular-nums text-sky-300">{{ funcRunTime.toFixed(2) }}</span>
            <span class="text-sm text-slate-400">ms</span>
          </div>
          <button
            class="ml-auto rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-600"
            @click="runFuncTest"
          >
            Re-run
          </button>
        </div>
      </div>
    </div>

    <div>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Sample (first 10)</h2>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div
          v-for="item in items.slice(0, 10)"
          :key="item.id"
          class="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
        >
          <div class="font-mono text-sm text-slate-200">
            w {{ item.width.toFixed(1) }} · A {{ item.area.toFixed(1) }}
          </div>
          <button
            class="rounded-md bg-sky-500/90 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-500"
            @click="item.update"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
