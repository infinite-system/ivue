<script setup lang="ts">
/**
 * The flyweight grid (examples/playground, flyweight-grid), embedded live in the docs.
 *
 * The ENTIRE app is imported dynamically inside the click handler — model,
 * page class, grid chrome, and the fast-formula-parser it pulls in.
 * `vitepress build` (SSR) never executes any of it, and readers who don't
 * click never download a byte. The imported component is the sketch's own
 * FlyweightGridApp.vue — the exact code the RESULTS.md numbers were
 * measured with; only this gate lives in the docs.
 */
import { ref, shallowRef, type Component } from 'vue';
import DemoBox from '../DemoBox.vue';

const gridApp = shallowRef<Component | null>(null);
const isLoading = ref(false);
const loadError = ref('');

async function loadGrid() {
  isLoading.value = true;
  loadError.value = '';
  try {
    const module = await import(
      '@examples/flyweight-grid/FlyweightGridApp.vue'
    );
    gridApp.value = module.default;
  } catch (error) {
    loadError.value = String(error);
  }
  isLoading.value = false;
}
</script>

<template>
  <DemoBox
    title="The flyweight grid — 20,000,000 cells"
    note="Ground truth in columnar typed arrays, disposable cell facades per render, a sparse reactive overlay that materializes per observation and evicts with the viewport. ~55% real Excel-syntax formulas. Everything costs proportional to what's observed — never to what exists."
  >
    <div v-if="!gridApp" class="fwl-gate">
      <p class="fwl-copy">
        20 columns × 1,000,000 rows, fully reactive at 4.7 bytes per cell.
        Nothing downloads until you click — the model code and the formula
        parser load on demand, then one more click creates all 20,000,000
        cells in your browser.
      </p>
      <button class="d-btn primary" type="button" :disabled="isLoading" @click="loadGrid">
        {{ isLoading ? 'Loading the code…' : 'Load the flyweight grid' }}
      </button>
      <p v-if="loadError" class="fwl-error">{{ loadError }}</p>
    </div>
    <div v-else class="fw-embed">
      <component :is="gridApp" />
    </div>
  </DemoBox>
</template>

<style scoped>
.fwl-gate {
  padding: 8px 0;
}
.fwl-copy {
  margin: 0 0 14px;
  font-size: 13.5px;
  line-height: 1.65;
  color: #8b95b5;
}
.fwl-error {
  margin-top: 10px;
  font-size: 12px;
  color: #f87171;
}
/* the sketch app carries its own page chrome — DemoBox already provides it */
.fw-embed :deep(.fw-page header) {
  display: none;
}
.fw-embed :deep(.fw-page) {
  padding: 0;
  max-width: none;
}
</style>
