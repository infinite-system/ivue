<script setup lang="ts">
import { ivue } from '../../lib/ivue';
import { Item } from './Item';
import { ref, watch } from 'vue';

const numItems = ref(100000);
const items = ref<InstanceType<typeof Item>[]>([]);
const initTime = ref(0);

const createItems = () => {
  const startTime = performance.now();
  const newItems = [];
  for (let i = 0; i < numItems.value; i++) {
    newItems.push(ivue(Item, { id: i }));
  }
  items.value = newItems;
  initTime.value = performance.now() - startTime;
  console.log(`ivue v1 init time: ${initTime.value.toFixed(2)}ms`);
};

document.title = 'ivue · v1 Benchmark';
watch(numItems, createItems, { immediate: true });
</script>

<template>
  <section class="space-y-8">
    <header class="space-y-2">
      <div
        class="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
        ivue.ts · reactive() proxy engine
      </div>
      <h1 class="text-3xl font-extrabold tracking-tight text-white">ivue v1 Benchmark</h1>
      <p class="max-w-2xl text-sm leading-relaxed text-slate-400">
        The v1 engine wraps every instance in Vue <code class="text-emerald-300">reactive()</code>
        and eagerly converts getters to computeds. Pure-class ergonomics (no
        <code class="text-emerald-300">.value</code>), at a higher per-instance cost.
      </p>
    </header>

    <div class="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur">
      <label class="text-xs uppercase tracking-wider text-slate-400">Instance count</label>
      <input
        type="number"
        v-model.number="numItems"
        class="mt-2 w-full rounded-lg bg-slate-900/60 px-3 py-2 text-white ring-1 ring-white/15 focus:outline-none focus:ring-emerald-400/50"
      />
      <div class="mt-4 flex items-baseline gap-2">
        <span class="text-4xl font-extrabold tabular-nums text-emerald-300">{{ initTime.toFixed(2) }}</span>
        <span class="text-sm text-slate-400">ms to create</span>
        <span class="ml-2 font-semibold text-white">{{ items.length.toLocaleString() }}</span>
        <span class="text-sm text-slate-400">instances</span>
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
            <span class="text-slate-500">#{{ item.id }}</span>
            · w {{ item.width.toFixed(1) }}
            · A {{ item.area.toFixed(1) }}
          </div>
          <button
            class="rounded-md bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500"
            @click="item.update"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
