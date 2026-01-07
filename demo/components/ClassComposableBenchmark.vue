<script setup lang="ts">
import { ref, watch } from 'vue';
import { InteractiveBox } from './InteractiveBox';

// --- Benchmark Configuration ---
const numItems = ref(1000000); // 1 Million instances
const numFuncRuns = ref(1000000); // 1 Million function calls

const items = ref<Array<InteractiveBox.Instance>>([]);
const initTime = ref(0);
const funcRunTime = ref(0);

// Create a single standalone instance for function benchmarking
const benchmarkInstance = new InteractiveBox.Class({ id: 9999 });

/**
 * 1. Instantiation Benchmark
 * Creates 'N' Class instances to test memory and init speed.
 */
const createItems = () => {
  const startTime = performance.now();
  
  // Use a temporary array to avoid Vue reactivity overhead during the loop
  const newItems = new Array(numItems.value);
  
  for (let i = 0; i < numItems.value; i++) {
    newItems[i] = new InteractiveBox.Class({ id: i });
  }
  
  items.value = newItems;
  initTime.value = performance.now() - startTime;

  console.log('Sample Item:', newItems[0]);
  console.log(`Composable Init: ${initTime.value.toFixed(2)}ms for ${numItems.value} items`);
};

/**
 * 2. Method Execution Benchmark
 * Runs a math-heavy method 'N' times to test prototype lookup speed.
 */
const runPhysicsTest = () => {
  const startTime = performance.now();
  const limit = numFuncRuns.value;
  
  for (let i = 0; i < limit; i++) {
    benchmarkInstance.calculatePhysics();
  }
  
  funcRunTime.value = performance.now() - startTime;
  console.log(`Physics Test: ${funcRunTime.value.toFixed(2)}ms for ${limit} runs`);
};

// Triggers
watch(numItems, createItems, { immediate: true });
watch(numFuncRuns, runPhysicsTest, { immediate: true });

document.title = 'Class Reactivity Benchmark';
</script>

<template>
  <div class="p-6 space-y-6 max-w-4xl mx-auto font-sans text-slate-800">
    
    <div class="border-b pb-4">
      <h1 class="text-3xl font-bold text-indigo-600">Reactivity Benchmark</h1>
      <p class="text-slate-500 mt-1">Testing Deep Inheritance & Reactive Classes</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg">
      
      <div>
        <label class="block text-sm font-semibold text-slate-700 mb-2">Instance Count</label>
        <input
          type="number"
          v-model.number="numItems"
          class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
        />
        <div class="mt-3 text-sm">
          Created <span class="font-mono font-bold text-indigo-600">{{ items.length }}</span> objects in 
          <span class="font-mono font-bold text-green-600">{{ initTime.toFixed(2) }}ms</span>
        </div>
      </div>

      <div>
        <label class="block text-sm font-semibold text-slate-700 mb-2">Physics Calculations</label>
        <div class="flex gap-2">
          <button
            @click="runPhysicsTest"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Run Benchmark
          </button>
        </div>
        <div class="mt-3 text-sm">
          Ran <span class="font-mono font-bold text-indigo-600">{{ numFuncRuns }}</span> ops in 
          <span class="font-mono font-bold text-green-600">{{ funcRunTime.toFixed(2) }}ms</span>
        </div>
      </div>
    </div>

    <p class="text-xs text-gray-500 italic">
      * Check your browser's Performance Monitor to see memory usage.
    </p>

    <div class="space-y-4">
      <h2 class="text-xl font-semibold border-b pb-2">Live Inspector (First 5)</h2>
      
      <div
        v-for="item in items.slice(0, 5)"
        :key="item.id"
        class="flex flex-col gap-2 p-4 border border-slate-200 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow"
      >
        <div class="flex justify-between items-center">
          <span class="font-mono text-xs bg-slate-100 px-2 py-1 rounded">ID: {{ item.id }}</span>
          <button
            @click="item.refreshState()"
            class="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded transition-colors"
          >
            Randomize State
          </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
          <div>
            <span class="text-gray-500 text-xs block">Mouse (Composable)</span>
            X: {{ item.mouseX }} / Y: {{ item.mouseY }}
          </div>
          <div>
            <span class="text-gray-500 text-xs block">Geometry (Ref)</span>
            {{ item.width }}w &times; {{ item.height }}h
          </div>
          <div>
            <span class="text-gray-500 text-xs block">Area (Computed)</span>
            {{ item.area }} px²
          </div>
          <div>
            <span class="text-gray-500 text-xs block">Inheritance Chain</span>
            <span class="text-xs text-slate-600 truncate block" :title="item.typeChain">
              {{ item.typeChain }}
            </span>
          </div>
        </div>

        <div class="mt-2 p-2 bg-slate-50 rounded text-xs font-mono text-slate-600 break-all">
          <strong class="text-indigo-600">Deep Diagnostic:</strong> {{ item.diagnosticSummary }}
        </div>
      </div>
    </div>
  </div>
</template>