<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useItem } from './useItem';

const numItems = ref(1000000);
const items = ref<ReturnType<typeof useItem>[]>([]);
const initTime = ref(0);


const numFuncRuns = ref(1_000_000);
const funcRunTime = ref(0);


const a = useItem({ id: 1 });
const { funcTest } = a;
// The benchmark function
const createItems = () => {
  const startTime = performance.now();
  const newItems = [];
  for (let i = 0; i < numItems.value; i++) {
    // Create N instances by calling the composable function
    newItems.push(useItem({ id: i }));
  }
  items.value = newItems;
  initTime.value = performance.now() - startTime;

  console.log(`Composable init time: ${initTime.value.toFixed(2)}ms`);
};

document.title = 'Composable Benchmark';

// Re-run the benchmark when the number changes
watch(numItems, createItems, { immediate: true });


const runFuncTest = () => {
  const startTime = performance.now();
  for (let i = 0, j = numFuncRuns.value; i < j; i++) {
    funcTest();
  }
  funcRunTime.value = performance.now() - startTime;
  console.log(`Func test time: ${funcRunTime.value.toFixed(2)}ms`);
};
watch(numFuncRuns, runFuncTest, { immediate: true });
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-blue-600">Legacy Composable Benchmark</h1>

    <div>
      <label for="numItems" class="block text-sm font-medium text-gray-700"
        >Number of Instances:</label
      >
      <input
        type="number"
        v-model.number="numItems"
        id="numItems"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
    </div>

    <div class="text-lg">
      Created
      <strong class="text-blue-600">{{ items.length }}</strong> instances in
      <strong class="text-blue-600">{{ initTime.toFixed(2) }}ms</strong>
    </div>

    <div class="text-lg">
      Func Test: Ran<br />
      <button
        @click="runFuncTest"
        class="ml-2 rounded bg-blue-500 px-2 py-1 text-xs text-white"
      >
        Run Func Test
      </button>
      <strong class="text-blue-600">{{ numFuncRuns }}</strong> function calls in
      <strong class="text-blue-600">{{ funcRunTime.toFixed(2) }}ms</strong>
    </div>
    <p class="text-sm text-gray-600">
      Open your browser's memory profiler and compare!
    </p>

    <!-- Render a few items to ensure reactivity works -->
    <div class="mt-4 space-y-2">
      <h2 class="text-xl font-semibold">Sample (first 10):</h2>
      <div
        v-for="item in items.slice(0, 10)"
        :key="item.id"
        class="p-2 border rounded-md bg-gray-50"
      >
        {{ item.width }}
        | Area: {{ item.area.toFixed(2) }}
        | Area2: {{ item.area2.toFixed(2) }}
        | Area3: {{ item.area3.toFixed(2) }}
        <button
          @click="item.update"
          class="ml-2 rounded bg-blue-500 px-2 py-1 text-xs text-white"
        >
          Update
        </button>
      </div>
    </div>
  </div>
</template>
