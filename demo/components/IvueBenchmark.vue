<script setup lang="ts">
import { ivue, iref } from '../../lib/ivue';
import { Item } from './Item';
import { ref, watch } from 'vue';

// --- ivue Class Definition ---
// This is the equivalent of a "composable"

// --- End of Class ---

const numItems = ref(1000000);
const items = ref<InstanceType<typeof Item>[]>([]);
const initTime = ref(0);

// The benchmark function
const createItems = () => {
  const startTime = performance.now();
  const newItems = [];
  for (let i = 0; i < numItems.value; i++) {
    // Create N instances of the ivue class
    newItems.push(ivue(Item, { id: i }));
  }
  items.value = newItems;
  initTime.value = performance.now() - startTime;

  console.log(`ivue init time: ${initTime.value.toFixed(2)}ms`);
};

document.title = 'ivue Benchmark';

// Re-run the benchmark when the number changes
watch(numItems, createItems, { immediate: true });
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-green-600">ivue Benchmark</h1>

    <div>
      <label for="numItems" class="block text-sm font-medium text-gray-700"
        >Number of Instances:</label
      >
      <input
        type="number"
        v-model.number="numItems"
        id="numItems"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
      />
    </div>

    <div class="text-lg">
      Created
      <strong class="text-green-600">{{ items.length }}</strong> instances in
      <strong class="text-green-600">{{ initTime.toFixed(2) }}ms</strong>
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
         ID: {{ item.id }} | Width: {{ item.width.toFixed(2) }} 
         <!-- bigObject: -->
        <!-- <div style="width: 150px; height: 26px; overflow: hidden">{{ item.bigObject }}</div> -->
        | Area: {{ item.area.toFixed(2) }}
        | Area2: {{ item.area2.toFixed(2) }}
        | Area3: {{ item.area3.toFixed(2) }}
        <button
          @click="item.update"
          class="ml-2 rounded bg-green-500 px-2 py-1 text-xs text-white"
        >
          Update
        </button>
      </div>
    </div>
  </div>
</template>
