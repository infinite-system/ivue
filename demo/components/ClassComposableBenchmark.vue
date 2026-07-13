<script setup lang="ts">
import { ref, watch } from 'vue';
import { InteractiveBox } from '../../examples/playground/src/examples/benchmarks/model/InteractiveBox';

// --- Benchmark Configuration ---
const numItems = ref(100000);
const numFuncRuns = ref(200000);

const items = ref<Array<InteractiveBox.Instance>>([]);
const initTime = ref(0);
const funcRunTime = ref(0);

// A single standalone instance for the method benchmark
const benchmarkInstance = new InteractiveBox.Class({ id: 9999 });

/** 1. Instantiation Benchmark — N plain class instances (no proxy). */
const createItems = () => {
  const startTime = performance.now();
  const newItems = new Array(numItems.value);
  for (let i = 0; i < numItems.value; i++) {
    newItems[i] = new InteractiveBox.Class({ id: i });
  }
  items.value = newItems;
  initTime.value = performance.now() - startTime;
  console.log(`Reactive v2 init: ${initTime.value.toFixed(2)}ms for ${numItems.value} items`);
};

/** 2. Method Execution Benchmark — prototype-bound method, N times. */
const runPhysicsTest = () => {
  const startTime = performance.now();
  const limit = numFuncRuns.value;
  for (let i = 0; i < limit; i++) {
    benchmarkInstance.calculatePhysics();
  }
  funcRunTime.value = performance.now() - startTime;
};

watch(numItems, createItems, { immediate: true });
watch(numFuncRuns, runPhysicsTest, { immediate: true });

document.title = 'ivue · Reactive v2 Benchmark';
</script>

<template>
  <section class="space-y-8">
    <header class="space-y-2">
      <div
        class="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-400/30"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
        Reactive.ts · deep inheritance + composables
      </div>
      <h1 class="text-3xl font-extrabold tracking-tight text-white">
        Reactive v2 Benchmark
      </h1>
      <p class="max-w-2xl text-sm leading-relaxed text-slate-400">
        Each item is a 3-level class (<code class="text-indigo-300">BaseElement → Container →
        InteractiveBox</code>) built with <code class="text-indigo-300">Reactive()</code>.
        Instances are plain objects — refs/computeds materialize lazily on first access.
      </p>
    </header>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <!-- Instantiation -->
      <div class="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur">
        <label class="text-xs uppercase tracking-wider text-slate-400">Instance count</label>
        <input
          type="number"
          v-model.number="numItems"
          class="mt-2 w-full rounded-lg bg-slate-900/60 px-3 py-2 text-white ring-1 ring-white/15 focus:outline-none focus:ring-indigo-400/50"
        />
        <div class="mt-4 flex items-baseline gap-2">
          <span class="text-4xl font-extrabold tabular-nums text-emerald-300">{{ initTime.toFixed(2) }}</span>
          <span class="text-sm text-slate-400">ms</span>
        </div>
        <div class="text-sm text-slate-400">
          created <span class="font-semibold text-white">{{ items.length.toLocaleString() }}</span> instances
        </div>
      </div>

      <!-- Method execution -->
      <div class="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur">
        <label class="text-xs uppercase tracking-wider text-slate-400">Physics calls</label>
        <input
          type="number"
          v-model.number="numFuncRuns"
          class="mt-2 w-full rounded-lg bg-slate-900/60 px-3 py-2 text-white ring-1 ring-white/15 focus:outline-none focus:ring-indigo-400/50"
        />
        <div class="mt-4 flex items-center gap-3">
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-extrabold tabular-nums text-emerald-300">{{ funcRunTime.toFixed(2) }}</span>
            <span class="text-sm text-slate-400">ms</span>
          </div>
          <button
            class="ml-auto rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600"
            @click="runPhysicsTest"
          >
            Re-run
          </button>
        </div>
      </div>
    </div>

    <!-- Live inspector -->
    <div>
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
        Live inspector (first 5)
      </h2>
      <div class="grid grid-cols-1 gap-3">
        <div
          v-for="item in items.slice(0, 5)"
          :key="item.id"
          class="rounded-xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur transition hover:ring-indigo-400/30"
        >
          <div class="flex items-center justify-between">
            <span class="rounded bg-black/30 px-2 py-1 font-mono text-xs text-slate-300">#{{ item.id }}</span>
            <button
              class="rounded-md bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500"
              @click="item.refreshState()"
            >
              Randomize
            </button>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div>
              <div class="text-[11px] text-slate-500">Mouse (composable)</div>
              <div class="font-mono text-slate-200">{{ item.mouseX }} / {{ item.mouseY }}</div>
            </div>
            <div>
              <div class="text-[11px] text-slate-500">Geometry (ref)</div>
              <div class="font-mono text-slate-200">{{ item.width }}×{{ item.height }}</div>
            </div>
            <div>
              <div class="text-[11px] text-slate-500">Area (computed)</div>
              <div class="font-mono text-slate-200">{{ item.area }}</div>
            </div>
            <div>
              <div class="text-[11px] text-slate-500">Inheritance chain</div>
              <div class="truncate font-mono text-slate-200" :title="item.typeChain">{{ item.typeChain }}</div>
            </div>
          </div>
          <div class="mt-3 break-all rounded-lg bg-black/20 p-2 font-mono text-[11px] text-indigo-300">
            {{ item.diagnosticSummary }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
